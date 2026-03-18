/**
 * Market Simulator - Handles market demand, share allocation, and competitive dynamics
 *
 * DETERMINISM: This module uses EngineContext for all randomness.
 */

import {
  TeamState,
  MarketState,
  Segment,
  Product,
  CONSTANTS,
} from "../types";
import type { RubberBandingFactors } from "../types/state";
import type { DynamicPriceExpectation } from "../types/market";
import { cloneMarketState, cloneTeamState } from "../utils/stateUtils";
import type { EngineContext, SeededRNG } from "../core/EngineContext";
import type { CompetitionState, CrowdingState, FirstMoverBonus, BrandErosion, ArmsRaceBonus, MarketEvent } from "../types/competition";
import { calculateCrowdingFactor, FIRST_MOVER_MAX_BONUS, FIRST_MOVER_DECAY_ROUNDS, BRAND_EROSION_SENSITIVITY, ARMS_RACE_BONUS, initializeCompetitionState } from "../types/competition";
import { SEGMENT_FEATURE_PREFERENCES, TECH_FAMILIES, calculateFeatureMatchScore } from "../types/features";
import type { ProductFeatureSet } from "../types/features";
import { getDemandMultiplier } from "@/lib/config/demandCycles";
import { getFactoryBottleneckAnalysis } from "../modules/ProductionLineManager";

/** EMA smoothing factor for dynamic pricing. */
const DYNAMIC_PRICE_EMA_ALPHA = 0.3;

/** Maximum underserved bonus for pricing advantage. */
const UNDERSERVED_PRICE_BONUS = 0.25;

/**
 * Get random number using context RNG
 */
function getRandomValue(ctx?: EngineContext): number {
  if (!ctx) throw new Error("DETERMINISM VIOLATION: MarketSimulator requires EngineContext");
  return ctx.rng.market.next();
}

/**
 * Get random range using context RNG
 */
function getRandomRange(min: number, max: number, ctx?: EngineContext): number {
  return min + getRandomValue(ctx) * (max - min);
}

export interface TeamMarketPosition {
  teamId: string;
  segment: Segment;
  product: Product | null;
  priceScore: number;
  qualityScore: number;
  brandScore: number;
  esgScore: number;
  featureScore: number;
  totalScore: number;
  marketShare: number;
  unitsSold: number;
  revenue: number;
  warrantyCost: number;  // PATCH 5: Warranty cost from defects
}

export interface MarketSimulationResult {
  positions: TeamMarketPosition[];
  totalDemand: Record<Segment, number>;
  marketShares: Record<string, Record<Segment, number>>; // teamId -> segment -> share
  salesByTeam: Record<string, Record<Segment, number>>;
  // PATCH 6: Foreign revenue tracking for FX impact
  revenueByRegion: Record<string, Record<string, number>>; // teamId -> region -> revenue
  revenueByTeam: Record<string, number>;
  rubberBandingApplied: boolean;
  esgEvents: Record<string, { type: "bonus" | "penalty"; amount: number; message: string }>;
  // Competition mechanics (Phase 3)
  competitionData?: {
    crowding: CrowdingState[];
    firstMoverBonuses: FirstMoverBonus[];
    brandErosion: BrandErosion[];
    armsRaceBonuses: ArmsRaceBonus[];
    marketEvents: MarketEvent[];
    updatedCompetitionState: CompetitionState;
  };
}

export class MarketSimulator {
  /**
   * Calculate rubber-banding factors for all teams based on previous round's market shares.
   * v6.0.0: Replaces threshold-based system with continuous, indirect mechanisms.
   *
   * Returns neutral factors (no effect) if:
   * - Round is before RUBBER_BAND_ACTIVATION_ROUND (3)
   * - Only 1 team
   * - Input shares contain NaN/Infinity
   */
  static calculateRubberBandingFactors(
    teams: Array<{ id: string; state: TeamState }>,
    roundNumber: number
  ): Record<string, RubberBandingFactors> {
    const result: Record<string, RubberBandingFactors> = {};
    const neutral: RubberBandingFactors = {
      position: 0,
      costReliefFactor: 0,
      perceptionBonus: 0,
      brandDecayMultiplier: 1.0,
      qualityExpectationBoost: 0,
    };

    // Pre-activation: all neutral
    if (roundNumber < CONSTANTS.RUBBER_BAND_ACTIVATION_ROUND) {
      for (const team of teams) {
        result[team.id] = { ...neutral };
      }
      return result;
    }

    const numTeams = teams.length;

    // Solo team: always at average
    if (numTeams <= 1) {
      for (const team of teams) {
        result[team.id] = { ...neutral };
      }
      return result;
    }

    const globalAvgShare = 1 / numTeams;

    // Calculate each team's average share across segments they participate in
    for (const team of teams) {
      const shares = team.state.marketShare || {};
      const shareValues = Object.values(shares).filter(
        (v): v is number => typeof v === "number" && isFinite(v) && !isNaN(v)
      );

      // EXPLOIT-04: Teams with no market presence get no rubber-banding benefits
      // Prevents tanking exploit (withdraw → collect cost relief → re-enter)
      if (shareValues.length === 0) {
        result[team.id] = { ...neutral };
        continue;
      }

      // Also require active participation: at least 1 segment with meaningful share
      const activeSegments = shareValues.filter(s => s > 0.001).length;
      if (activeSegments === 0) {
        // Team has market share data but negligible presence — no benefits
        result[team.id] = { ...neutral };
        continue;
      }

      const teamAvgShare = shareValues.reduce((sum, s) => sum + s, 0) / shareValues.length;

      // Guard against NaN from calculation
      if (!isFinite(teamAvgShare)) {
        result[team.id] = { ...neutral };
        continue;
      }

      const position = (teamAvgShare - globalAvgShare) / globalAvgShare;

      let costReliefFactor = 0;
      let perceptionBonus = 0;
      let brandDecayMultiplier = 1.0;
      let qualityExpectationBoost = 0;

      if (position < 0) {
        // Trailing team: Mechanism A (cost relief) + Mechanism B (perception boost)
        const rawRelief = Math.abs(position);
        costReliefFactor = Math.tanh(rawRelief * CONSTANTS.RB_COST_RELIEF_SENSITIVITY)
          * CONSTANTS.RB_MAX_COST_RELIEF;
        perceptionBonus = Math.tanh(rawRelief * CONSTANTS.RB_PERCEPTION_SENSITIVITY)
          * CONSTANTS.RB_MAX_PERCEPTION_BONUS;
      } else if (position > 0) {
        // Leading team: Mechanism C (incumbent drag)
        const rawLead = position;
        const dragFactor = Math.tanh(rawLead * CONSTANTS.RB_DRAG_SENSITIVITY)
          * CONSTANTS.RB_MAX_DRAG;
        brandDecayMultiplier = 1.0 + dragFactor;
        qualityExpectationBoost = dragFactor * CONSTANTS.RB_MAX_QUALITY_EXPECTATION_BOOST;
      }
      // position === 0: all factors remain neutral

      result[team.id] = {
        position,
        costReliefFactor,
        perceptionBonus,
        brandDecayMultiplier,
        qualityExpectationBoost,
      };
    }

    return result;
  }

  /**
   * Simulate market competition for a round
   * @param teams Teams participating in the market
   * @param marketState Current market state
   * @param options Simulation options
   * @param ctx Engine context for deterministic execution
   */
  static simulate(
    teams: Array<{ id: string; state: TeamState }>,
    marketState: MarketState,
    options?: { applyRubberBanding?: boolean; competitionState?: CompetitionState },
    ctx?: EngineContext
  ): MarketSimulationResult {
    const positions: TeamMarketPosition[] = [];
    const marketShares: Record<string, Record<Segment, number>> = {};
    const salesByTeam: Record<string, Record<Segment, number>> = {};
    const revenueByTeam: Record<string, number> = {};
    // PATCH 6: Foreign revenue tracking
    const revenueByRegion: Record<string, Record<string, number>> = {};

    // Competition state tracking
    const competitionState = options?.competitionState
      ? { ...options.competitionState, firstMoverBonuses: [...options.competitionState.firstMoverBonuses], armsRaceBonuses: [...options.competitionState.armsRaceBonuses], firstCompletions: { ...options.competitionState.firstCompletions } }
      : initializeCompetitionState();
    const crowdingStates: CrowdingState[] = [];
    const newFirstMoverBonuses: FirstMoverBonus[] = [];
    const brandErosionEvents: BrandErosion[] = [];
    const marketEvents: MarketEvent[] = [];

    // Decay existing first-mover bonuses
    competitionState.firstMoverBonuses = competitionState.firstMoverBonuses
      .map(b => ({ ...b, roundsRemaining: b.roundsRemaining - 1 }))
      .filter(b => b.roundsRemaining > 0);

    // Initialize team records
    for (const team of teams) {
      marketShares[team.id] = {} as Record<Segment, number>;
      salesByTeam[team.id] = {} as Record<Segment, number>;
      revenueByTeam[team.id] = 0;
      // PATCH 6: Initialize region revenue tracking
      revenueByRegion[team.id] = {
        "North America": 0,
        "Europe": 0,
        "Asia": 0,
        "MENA": 0,
      };

      for (const segment of CONSTANTS.SEGMENTS) {
        marketShares[team.id][segment] = 0;
        salesByTeam[team.id][segment] = 0;
      }
    }

    // Calculate total demand per segment (adjusted by economic conditions)
    const totalDemand = this.calculateDemand(marketState, ctx);

    // Process each segment
    for (const segment of CONSTANTS.SEGMENTS) {
      const segmentPositions: TeamMarketPosition[] = [];

      // Count products in this segment for crowding calculation
      const productsInSegment = teams.filter(t =>
        t.state.products.some(p => p.segment === segment && p.developmentStatus === "launched")
      ).length;
      const crowdingFactor = calculateCrowdingFactor(productsInSegment);
      crowdingStates.push({ segment, productCount: productsInSegment, crowdingFactor });

      // Calculate scores for each team in this segment
      for (const team of teams) {
        const product = team.state.products.find(p => p.segment === segment);
        const position = this.calculateTeamPosition(
          team.id,
          team.state,
          product || null,
          segment,
          marketState
        );

        // Apply crowding penalty to total score
        if (crowdingFactor < 1.0 && position.totalScore > 0) {
          position.totalScore *= crowdingFactor;
        }

        // Apply first-mover bonus
        const activeFirstMover = competitionState.firstMoverBonuses.find(
          b => b.teamId === team.id && b.segment === segment && b.roundsRemaining > 0
        );
        if (activeFirstMover && position.totalScore > 0) {
          const decayedBonus = activeFirstMover.initialBonus *
            (activeFirstMover.roundsRemaining / FIRST_MOVER_DECAY_ROUNDS);
          position.totalScore *= (1 + decayedBonus);
        }

        // Apply arms race bonus (first team to use a new tech in a product)
        for (const armsBonus of competitionState.armsRaceBonuses) {
          if (armsBonus.teamId === team.id && !armsBonus.bonusUsed && position.product) {
            const appliedTechs = position.product.appliedTechs || [];
            if (appliedTechs.includes(armsBonus.techId)) {
              position.totalScore *= (1 + ARMS_RACE_BONUS);
              armsBonus.bonusUsed = true;
              marketEvents.push({
                type: "tech_completed",
                round: marketState.roundNumber,
                description: `${team.id} gains arms race bonus from ${armsBonus.family} technology`,
                impact: "positive",
                teamId: team.id,
                segment,
              });
            }
          }
        }

        segmentPositions.push(position);
        positions.push(position);
      }

      // Detect first-mover opportunities (underserved segments)
      if (productsInSegment <= 1) {
        const entrant = segmentPositions.find(p => p.product && p.totalScore > 0);
        const alreadyHasBonus = competitionState.firstMoverBonuses.some(
          b => b.segment === segment && b.roundsRemaining > 0
        );
        if (entrant && !alreadyHasBonus) {
          const underservedFactor = productsInSegment === 0 ? 1.0 : 0.5;
          const bonus: FirstMoverBonus = {
            teamId: entrant.teamId,
            segment,
            roundEntered: marketState.roundNumber,
            initialBonus: FIRST_MOVER_MAX_BONUS * underservedFactor,
            roundsRemaining: FIRST_MOVER_DECAY_ROUNDS,
          };
          newFirstMoverBonuses.push(bonus);
          competitionState.firstMoverBonuses.push(bonus);
          marketEvents.push({
            type: "segment_underserved",
            round: marketState.roundNumber,
            description: `${entrant.teamId} gains first-mover advantage in ${segment}`,
            impact: "positive",
            teamId: entrant.teamId,
            segment,
          });
        }
      }

      // Detect crowded segments
      if (crowdingFactor < 1.0) {
        marketEvents.push({
          type: "segment_flooded",
          round: marketState.roundNumber,
          description: `${segment} segment is crowded (${productsInSegment} products, ${((1 - crowdingFactor) * 100).toFixed(0)}% penalty)`,
          impact: "negative",
          segment,
        });
      }

      // Calculate market shares using softmax
      const shares = this.calculateMarketShares(segmentPositions);

      // Allocate sales based on shares, capped by production capacity
      const segmentDemand = totalDemand[segment];

      // First pass: calculate demand and cap by production capacity
      const demandByTeam: Array<{ index: number; demandUnits: number; cappedUnits: number; spareCapacity: number }> = [];
      let totalUnfulfilled = 0;

      for (let i = 0; i < segmentPositions.length; i++) {
        const position = segmentPositions[i];
        const share = shares[i];
        const demandUnits = Math.floor(segmentDemand * share);
        const team = teams.find(t => t.id === position.teamId);
        const allocationPct = team?.state?.productionAllocations?.[segment];
        // Use line-based capacity if configured, else legacy allocation %
        const productionCapacity = team
          ? MarketSimulator.getTeamProductionCapacityFromLines(team.state, segment, allocationPct)
          : 0;
        const cappedUnits = Math.min(demandUnits, productionCapacity);
        const spareCapacity = Math.max(0, productionCapacity - demandUnits);
        totalUnfulfilled += (demandUnits - cappedUnits);
        demandByTeam.push({ index: i, demandUnits, cappedUnits, spareCapacity });
      }

      // Second pass: redistribute unfulfilled demand to teams with spare capacity
      if (totalUnfulfilled > 0) {
        const teamsWithSpare = demandByTeam.filter(t => t.spareCapacity > 0);
        const totalSpare = teamsWithSpare.reduce((s, t) => s + t.spareCapacity, 0);
        if (totalSpare > 0) {
          for (const t of teamsWithSpare) {
            const extraUnits = Math.min(
              Math.floor(totalUnfulfilled * (t.spareCapacity / totalSpare)),
              t.spareCapacity
            );
            t.cappedUnits += extraUnits;
          }
        }
      }

      for (let i = 0; i < segmentPositions.length; i++) {
        const position = segmentPositions[i];
        const share = shares[i];
        const units = demandByTeam[i].cappedUnits;

        position.marketShare = share;
        position.unitsSold = units;
        position.revenue = units * (position.product?.price || 0);

        // PATCH 5: Calculate warranty cost from defects
        // PATCH 6: Track revenue by region for FX impact
        if (position.product && units > 0) {
          const team = teams.find(t => t.id === position.teamId);
          if (team && team.state.factories.length > 0) {
            // Use the first factory (TODO: match factory to product segment)
            const factory = team.state.factories[0];

            // PATCH 5: Warranty cost calculation
            const effectiveDefectRate = factory.defectRate * (1 - factory.warrantyReduction);
            position.warrantyCost = units * effectiveDefectRate * position.product.unitCost;

            // PATCH 6: Track revenue by factory region
            const region = factory.region;
            revenueByRegion[position.teamId][region] += position.revenue;
          } else {
            // No factory - default to North America for revenue tracking
            revenueByRegion[position.teamId]["North America"] += position.revenue;
          }
        }

        marketShares[position.teamId][segment] = share;
        salesByTeam[position.teamId][segment] = units;
        revenueByTeam[position.teamId] += position.revenue;
      }

      // Brand erosion detection: when a competitor has significantly higher score
      const scoredPositions = segmentPositions.filter(p => p.totalScore > 0);
      if (scoredPositions.length >= 2) {
        const sorted = [...scoredPositions].sort((a, b) => b.totalScore - a.totalScore);
        const leader = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
          const trailing = sorted[i];
          const scoreAdvantage = (leader.totalScore - trailing.totalScore) / trailing.totalScore;
          if (scoreAdvantage > 0.2) { // 20% threshold to trigger erosion
            const erosionMultiplier = 1 + scoreAdvantage * BRAND_EROSION_SENSITIVITY;
            brandErosionEvents.push({
              teamId: trailing.teamId,
              segment,
              competitorTeamId: leader.teamId,
              scoreAdvantage,
              erosionMultiplier,
              message: `${trailing.teamId}'s brand erodes in ${segment} (-${((erosionMultiplier - 1) * 100).toFixed(0)}% decay) due to ${leader.teamId}'s stronger product`,
            });
          }
        }
      }
    }

    // Apply ESG events (bonuses/penalties)
    const esgEvents: Record<string, { type: "bonus" | "penalty"; amount: number; message: string }> = {};
    for (const team of teams) {
      const esgResult = this.applyESGEvents(team.state.esgScore, revenueByTeam[team.id]);
      if (esgResult) {
        esgEvents[team.id] = esgResult;
        revenueByTeam[team.id] += esgResult.amount;
      }
    }

    // v6.0.0: Old threshold-based rubber-banding REMOVED.
    // Rubber-banding now works through three indirect mechanisms:
    // - Mechanism A (cost relief) applied in COGS calculation
    // - Mechanism B (perception boost) applied in calculateTeamPosition scoring
    // - Mechanism C (incumbent drag) applied in MarketingModule brand decay + quality expectations
    // Factors are pre-calculated at Step 0 of the pipeline and stored on team state.
    const rubberBandingApplied = teams.some(t =>
      t.state.rubberBanding && (
        t.state.rubberBanding.costReliefFactor > 0 ||
        t.state.rubberBanding.perceptionBonus > 0 ||
        t.state.rubberBanding.brandDecayMultiplier > 1.0
      )
    );

    return {
      positions,
      totalDemand,
      marketShares,
      salesByTeam,
      revenueByTeam,
      revenueByRegion,  // PATCH 6: Foreign revenue tracking
      rubberBandingApplied,
      esgEvents,
      competitionData: {
        crowding: crowdingStates,
        firstMoverBonuses: newFirstMoverBonuses,
        brandErosion: brandErosionEvents,
        armsRaceBonuses: competitionState.armsRaceBonuses.filter(b => b.bonusUsed),
        marketEvents,
        updatedCompetitionState: competitionState,
      },
    };
  }

  /**
   * Apply ESG event bonuses or penalties based on score
   *
   * 3-tier gradient system (no dead zone):
   * - HIGH (700+): 5% revenue bonus
   * - MID (400-699): 2% revenue bonus
   * - LOW (<400): 1-8% penalty (gradient based on score)
   */
  // BAL-01: Continuous ESG curve — eliminates step discontinuities
  // Penalty zone: 0-300 (linear from -12% to 0%), Bonus ramp: 300-700 (0% to +5%), Cap at +5%
  static applyESGEvents(
    esgScore: number,
    revenue: number
  ): { type: "bonus" | "penalty"; amount: number; message: string } | null {
    let modifier: number;

    if (esgScore < 300) {
      // Penalty zone: linear from -12% at 0 to 0% at 300
      modifier = -(1 - esgScore / 300) * CONSTANTS.ESG_PENALTY_MAX;
    } else if (esgScore < 700) {
      // Bonus ramp: linear from 0% at 300 to +5% at 700
      modifier = ((esgScore - 300) / 400) * CONSTANTS.ESG_HIGH_BONUS;
    } else {
      // Cap at +5%
      modifier = CONSTANTS.ESG_HIGH_BONUS;
    }

    if (modifier < -0.001) {
      const penalty = revenue * modifier; // negative
      return {
        type: "penalty",
        amount: penalty,
        message: `ESG risk (boycotts/fines): ${(modifier * 100).toFixed(1)}% revenue ($${(Math.abs(penalty) / 1_000_000).toFixed(1)}M)`,
      };
    } else if (modifier > 0.001) {
      const bonus = revenue * modifier;
      return {
        type: "bonus",
        amount: bonus,
        message: `ESG premium: +${(modifier * 100).toFixed(1)}% revenue ($${(bonus / 1_000_000).toFixed(1)}M)`,
      };
    }

    return null;
  }

  /**
   * Calculate market demand adjusted by economic conditions
   * @param marketState Current market state
   * @param ctx Engine context for deterministic random noise
   */
  static calculateDemand(marketState: MarketState, ctx?: EngineContext): Record<Segment, number> {
    const demand: Record<Segment, number> = {} as Record<Segment, number>;

    for (const segment of CONSTANTS.SEGMENTS) {
      const baseData = marketState.demandBySegment[segment];
      let adjustedDemand = baseData.totalDemand;

      // Economic adjustment
      // GDP growth boosts demand
      const gdpMultiplier = 1 + (marketState.economicConditions.gdp / 100);

      // Consumer confidence affects demand
      const confidenceMultiplier = marketState.economicConditions.consumerConfidence / 75;

      // Inflation reduces demand (people buy less)
      const inflationMultiplier = 1 - (marketState.economicConditions.inflation / 100) * 0.5;

      // Apply growth rate
      const growthMultiplier = 1 + baseData.growthRate;

      // Dynamic demand cycle multiplier (seasonal/event-based)
      const cycleMultiplier = getDemandMultiplier(segment, marketState.roundNumber);

      // Random noise (±5%) - deterministic with context
      const noise = 0.95 + getRandomValue(ctx) * 0.1;

      adjustedDemand *= gdpMultiplier * confidenceMultiplier * inflationMultiplier * growthMultiplier * cycleMultiplier * noise;

      demand[segment] = Math.floor(adjustedDemand);
    }

    return demand;
  }

  /**
   * Get segment-specific scoring weights
   * Each segment values price vs quality differently:
   * - Budget: Price is king (50% price, 22% quality)
   * - Professional: Quality is king (15% price, 42% quality)
   * - Others: Balanced
   *
   * v2.3.0: Rebalanced weights for multi-strategy viability.
   * Brand weights 8-12% (was 5-10% in v2.2.0, too low).
   * Brand scores still use sqrt() for diminishing returns.
   */
  static getSegmentWeights(segment: Segment): { price: number; quality: number; brand: number; esg: number; features: number } {
    return CONSTANTS.SEGMENT_WEIGHTS[segment];
  }

  /**
   * Calculate a team's competitive position in a segment
   */
  static calculateTeamPosition(
    teamId: string,
    state: TeamState,
    product: Product | null,
    segment: Segment,
    marketState: MarketState
  ): TeamMarketPosition {
    if (!product) {
      // No product in this segment = zero score
      return {
        teamId,
        segment,
        product: null,
        priceScore: 0,
        qualityScore: 0,
        brandScore: 0,
        esgScore: 0,
        featureScore: 0,
        totalScore: 0,
        marketShare: 0,
        unitsSold: 0,
        revenue: 0,
        warrantyCost: 0,  // PATCH 5
      };
    }

    const segmentData = marketState.demandBySegment[segment];
    const weights = this.getSegmentWeights(segment);

    // EXPLOIT-06: Reject invalid prices — zero or negative prices get zero score
    if (product.price <= 0) {
      return {
        teamId,
        segment,
        product,
        priceScore: 0,
        qualityScore: 0,
        brandScore: 0,
        esgScore: 0,
        featureScore: 0,
        totalScore: 0,
        marketShare: 0,
        unitsSold: 0,
        revenue: 0,
        warrantyCost: 0,
      };
    }

    // Price Score - dynamic pricing when available, legacy otherwise
    const dynamicPrice = marketState.dynamicPricing?.[segment];
    let priceScore: number;

    if (dynamicPrice && dynamicPrice.expectedPrice > 0) {
      // Dynamic pricing: score based on expected price (EMA of actual market prices)
      // priceAdvantage = (expected - actual) / expected, clamped via tanh sigmoid
      const priceAdvantage = (dynamicPrice.expectedPrice - product.price) / dynamicPrice.expectedPrice;
      const sigmoidScore = Math.tanh(priceAdvantage * 2) * 0.5 + 0.5; // 0-1 range

      // Underserved bonus: if segment has few suppliers, pricing above expected is more tolerated
      const underservedBonus = dynamicPrice.underservedFactor * UNDERSERVED_PRICE_BONUS;
      const dynamicPriceScore = Math.min(1.0, sigmoidScore + underservedBonus);

      // Price floor penalty (still applies - prevent dumping below cost)
      let priceFloorMultiplier = 1.0;
      if (product.price < dynamicPrice.priceFloor) {
        const belowFloor = (dynamicPrice.priceFloor - product.price) / dynamicPrice.priceFloor;
        priceFloorMultiplier = Math.max(0.5, 1 - belowFloor);
      }

      priceScore = dynamicPriceScore * weights.price * priceFloorMultiplier;

      // F12 FIX: Price ceiling penalty
      const dynPriceRange = segmentData.priceRange;
      let priceCeilingMultiplier = 1.0;
      if (dynPriceRange && product.price > dynPriceRange.max * 0.90) {
        const ceilingProximity = (product.price - dynPriceRange.max * 0.90) / (dynPriceRange.max * 0.10);
        const ceilingPenalty = Math.min(0.20, ceilingProximity * 0.20);
        priceCeilingMultiplier = 1 - ceilingPenalty;
      }
      priceScore *= priceCeilingMultiplier;
    } else {
      // Legacy static pricing (backward compatible)
      const priceRange = segmentData.priceRange;

      // PATCH 5: Quality-driven price tolerance (up to 20% premium acceptance for Q=100)
      const qualityPriceTolerance = product.quality * 0.002;
      const adjustedMaxPrice = priceRange.max * (1 + qualityPriceTolerance);

      const adjustedRangeWidth = adjustedMaxPrice - priceRange.min;
      const pricePosition = adjustedRangeWidth > 0
        ? Math.max(0, (adjustedMaxPrice - product.price) / adjustedRangeWidth)
        : 0.5;

      let priceScoreMultiplier = 1.0;
      if (product.price < priceRange.min) {
        const priceBelowMin = priceRange.min - product.price;
        const floorThreshold = priceRange.min * CONSTANTS.PRICE_FLOOR_PENALTY_THRESHOLD;
        if (priceBelowMin > floorThreshold) {
          const excessBelow = priceBelowMin - floorThreshold;
          const penaltyScale = Math.min(1, excessBelow / floorThreshold);
          priceScoreMultiplier = 1 - (penaltyScale * CONSTANTS.PRICE_FLOOR_PENALTY_MAX);
        }
      }

      priceScore = Math.min(1, pricePosition) * weights.price * priceScoreMultiplier;

      // F12 FIX: Price ceiling penalty
      let priceCeilingMultiplier = 1.0;
      if (priceRange && product.price > priceRange.max * 0.90) {
        const ceilingProximity = (product.price - priceRange.max * 0.90) / (priceRange.max * 0.10);
        const ceilingPenalty = Math.min(0.20, ceilingProximity * 0.20);
        priceCeilingMultiplier = 1 - ceilingPenalty;
      }
      priceScore *= priceCeilingMultiplier;
    }

    // Quality Score: Product quality vs expectations
    // v2.2.0: Allow exceeding expectations with diminishing returns
    // v6.0.0: Rubber-banding Mechanism C raises expectations for leaders
    const baseQualityExpectation = this.getQualityExpectation(segment, state.round);
    const rbFactors = state.rubberBanding;
    const qualityExpectationBoost = rbFactors?.qualityExpectationBoost ?? 0;
    const qualityExpectation = baseQualityExpectation + qualityExpectationBoost;

    const qualityRatio = product.quality / qualityExpectation;
    // Beyond 1.0, use sqrt for diminishing returns: sqrt(1.2) = 1.095, sqrt(1.5) = 1.22
    // v4.0.2: Cap limits R&D-focused dominance
    // v5.0.0: Soft quality curve — quadratic penalty below 70% of expectation
    // FORMULA-01: Fixed quadratic zone to be continuous at 0.7 boundary
    let qualityMultiplier: number;
    if (qualityRatio >= 1.0) {
      qualityMultiplier = 1.0 + Math.sqrt(qualityRatio - 1) * 0.5; // 50% of excess via sqrt
    } else if (qualityRatio >= 0.7) {
      qualityMultiplier = qualityRatio; // Linear zone: 0.7 at boundary
    } else {
      // Accelerating penalty: quadratic below 70% of expectation
      // Continuous at 0.7: (0.7/0.7)² × 0.7 = 1.0 × 0.7 = 0.7 ✓
      // At 0.35: (0.35/0.7)² × 0.7 = 0.25 × 0.7 = 0.175
      // At 0.0: 0.0
      qualityMultiplier = Math.pow(qualityRatio / 0.7, 2) * 0.7;
    }
    let qualityScore = Math.min(CONSTANTS.QUALITY_FEATURE_BONUS_CAP, qualityMultiplier) * weights.quality;

    // v6.0.0: Rubber-banding Mechanism B — perception boost for trailing teams
    // Additive bonus to quality score, scaled by quality weight
    const perceptionBonus = rbFactors?.perceptionBonus ?? 0;
    if (perceptionBonus > 0) {
      qualityScore += perceptionBonus * weights.quality;
    }

    // Brand Score: Brand value contribution (already 0-1)
    // sqrt() for diminishing returns - high brand values give less incremental benefit
    // v4.0.2: Gentle critical mass - modest bonus for brand investors
    let brandMultiplier = 1.0;
    if (state.brandValue > CONSTANTS.BRAND_CRITICAL_MASS_HIGH) {
      brandMultiplier = CONSTANTS.BRAND_HIGH_MULTIPLIER;
    } else if (state.brandValue < CONSTANTS.BRAND_CRITICAL_MASS_LOW) {
      brandMultiplier = CONSTANTS.BRAND_LOW_MULTIPLIER;
    }
    const brandScore = Math.sqrt(Math.max(0, state.brandValue)) * weights.brand * brandMultiplier; // FORMULA-02: guard sqrt(negative)

    // ESG Score: Sustainability premium (0-1 scale from 0-1000 score)
    // F11 FIX: Diminishing returns above 700
    const rawEsgRatio = state.esgScore / 1000;
    const esgRatio = rawEsgRatio <= 0.7
      ? rawEsgRatio
      : 0.7 + Math.sqrt((rawEsgRatio - 0.7) / 0.3) * 0.17;
    const esgMultiplier = marketState.marketPressures.sustainabilityPremium; // 0.1 to 0.6
    const esgScore = esgRatio * esgMultiplier * weights.esg;

    // Feature Score: Use feature-match scoring if product has featureSet, else legacy
    let featureScore: number;
    const segmentPrefs = SEGMENT_FEATURE_PREFERENCES[segment];
    if (product.featureSet && segmentPrefs) {
      // New system: dot product of product features × segment preferences (0.0 to 1.0)
      const featureMatchScore = calculateFeatureMatchScore(product.featureSet, segmentPrefs);
      // Apply diminishing returns cap same as legacy
      const featureMultiplier = featureMatchScore <= 1.0
        ? featureMatchScore
        : 1.0 + Math.sqrt(featureMatchScore - 1) * 0.5;
      featureScore = Math.min(CONSTANTS.QUALITY_FEATURE_BONUS_CAP, featureMultiplier) * weights.features;
    } else {
      // Legacy fallback: product.features (0-100) normalized to 0-1
      const featureRatio = product.features / 100;
      const featureMultiplier = featureRatio <= 1.0
        ? featureRatio
        : 1.0 + Math.sqrt(featureRatio - 1) * 0.5;
      featureScore = Math.min(CONSTANTS.QUALITY_FEATURE_BONUS_CAP, featureMultiplier) * weights.features;
    }

    // Total score (theoretical max = 100 with all weights summing to 100)
    let totalScore = priceScore + qualityScore + brandScore + esgScore + featureScore;

    // Quality grade bonus: premium/artisan products get a score boost
    const gradeMultiplier = product.qualityGrade === "artisan" ? 1.08
      : product.qualityGrade === "premium" ? 1.04
      : 1.0;
    totalScore *= gradeMultiplier;

    // PATCH 5: Quality market share bonus
    const qualityMarketShareBonus = product.quality * CONSTANTS.QUALITY_MARKET_SHARE_BONUS;
    totalScore += qualityMarketShareBonus;

    // G5: Performance marketing boost — segment-targeted spend improves market scoring
    const perfMarketing = state.marketingExpansion?.performanceMarketing;
    if (perfMarketing) {
      const segmentBoostVal = perfMarketing.currentBoost?.[segment as keyof typeof perfMarketing.currentBoost] ?? 0;
      if (segmentBoostVal > 0) {
        // Performance marketing adds up to 5% score boost per segment, scaled by effectiveness
        const perfBoost = Math.min(0.05, segmentBoostVal * (perfMarketing.effectiveness ?? 0.5));
        totalScore += totalScore * perfBoost;
      }
    }

    return {
      teamId,
      segment,
      product,
      priceScore,
      qualityScore,
      brandScore,
      esgScore,
      featureScore,
      totalScore,
      marketShare: 0, // Calculated later
      unitsSold: 0,
      revenue: 0,
      warrantyCost: 0,  // PATCH 5: Calculated after unitsSold is known
    };
  }

  /**
   * Get quality expectations by segment
   */
  static getQualityExpectation(segment: Segment, round?: number): number {
    const expectations: Record<Segment, number> = {
      "Budget": 50,
      "General": 65,
      "Enthusiast": 80,
      "Professional": 90,
      "Active Lifestyle": 70,
    };
    const base = expectations[segment];
    const drift = round && round > 1 ? (round - 1) * 0.5 : 0;
    return Math.min(base + drift, 100);
  }

  /**
   * Calculate a team's production capacity for a given segment.
   * Capacity = machineCapacity × workerRatio × avgEfficiency × (1 - avgDefectRate)
   * Fallback: workers × BASE_WORKER_OUTPUT if no machines.
   */
  static getTeamProductionCapacity(state: TeamState, segment: Segment, allocationPercent?: number): number {
    // Production capacity is driven by machines + workers. No arbitrary caps.

    // 1. Machine capacity: sum from all operational machines across factories
    let machineCapacity = 0;
    if (state.machineryStates) {
      for (const fm of Object.values(state.machineryStates)) {
        machineCapacity += fm.totalCapacity || 0;
      }
    }

    // 2. Worker-based capacity: workers × BASE_WORKER_OUTPUT (100 units/worker)
    const workers = state.employees.filter(e => e.role === 'worker').length;
    const workerCapacity = workers * CONSTANTS.BASE_WORKER_OUTPUT;

    // Use whichever is the binding constraint: machine capacity or worker capacity
    // If no machines purchased yet, capacity is purely worker-driven
    let rawCapacity: number;
    if (machineCapacity > 0) {
      // With machines: capacity is machine-driven, but constrained by worker staffing
      const totalMachines = Object.values(state.machineryStates!).reduce((sum, fm) =>
        sum + (fm.machines?.filter(m => m.status === 'operational').length || 0), 0);
      const workersNeeded = Math.ceil(totalMachines * CONSTANTS.WORKERS_PER_MACHINE);
      const workerRatio = workersNeeded > 0 ? Math.min(1.0, workers / workersNeeded) : 1.0;
      rawCapacity = machineCapacity * workerRatio;
    } else {
      // No machines: worker-driven production (early game)
      rawCapacity = workerCapacity;
    }

    // Apply user's production allocation percentage (0-100) for this segment
    if (allocationPercent !== undefined && allocationPercent >= 0) {
      rawCapacity = Math.floor(rawCapacity * (allocationPercent / 100));
    }

    // Apply factory efficiency (baseline 0.7) and defect rate (baseline 0.06)
    const avgEfficiency = state.factories.length > 0
      ? state.factories.reduce((sum, f) => sum + f.efficiency, 0) / state.factories.length
      : 0.7;
    const avgDefectRate = state.factories.length > 0
      ? state.factories.reduce((sum, f) => sum + f.defectRate, 0) / state.factories.length
      : 0.06;

    // F1 FIX: Tiered automation (matches FactoryModule)
    let automationMultiplier = 1.0;
    for (const factory of state.factories) {
      if (factory.upgrades.includes("automation")) automationMultiplier = Math.max(automationMultiplier, 1.15);
      if (factory.upgrades.includes("advancedRobotics")) automationMultiplier += 0.15;
      if (factory.upgrades.includes("continuousImprovement")) automationMultiplier += 0.10;
      if (factory.upgrades.includes("leanManufacturing")) automationMultiplier += 0.10;
      if (factory.upgrades.includes("flexibleManufacturing")) automationMultiplier += 0.10;
      break; // Use first factory's upgrades
    }

    // G5: Factory breakdowns reduce production capacity — each active breakdown reduces by 10%
    const activeBreakdowns = state.factoryExpansion?.activeBreakdowns?.length ?? 0;
    const breakdownPenalty = Math.min(0.5, activeBreakdowns * 0.10); // Cap at 50% reduction

    // Final capacity = raw × efficiency × (1 - defects) × automation × (1 - breakdown penalty)
    return Math.floor(rawCapacity * avgEfficiency * (1 - avgDefectRate) * automationMultiplier * (1 - breakdownPenalty));
  }

  /**
   * Calculate production capacity using production lines (new system).
   * Sums projectedOutput from all active lines targeting the given segment.
   * Falls back to legacy getTeamProductionCapacity if no lines are configured.
   */
  static getTeamProductionCapacityFromLines(
    state: TeamState,
    segment: Segment,
    allocationPercent?: number
  ): number {
    // Check if any factory has active configured lines for this segment
    const hasConfiguredLines = state.factories.some(
      f => f.productionLines?.some(l => l.status === "active" && l.segment === segment && l.productId)
    );

    if (!hasConfiguredLines) {
      // Fallback to legacy capacity calculation
      return MarketSimulator.getTeamProductionCapacity(state, segment, allocationPercent);
    }

    let totalCapacity = 0;
    for (const factory of state.factories) {
      try {
        const analysis = getFactoryBottleneckAnalysis(state, factory.id);
        for (const [lineId, result] of Object.entries(analysis)) {
          const line = factory.productionLines?.find(l => l.id === lineId);
          if (line?.segment === segment && (result as { projectedOutput: number }).projectedOutput > 0) {
            totalCapacity += (result as { projectedOutput: number }).projectedOutput;
          }
        }
      } catch {
        // If bottleneck analysis fails, fallback for this factory
        totalCapacity += MarketSimulator.getTeamProductionCapacity(state, segment, allocationPercent) / Math.max(1, state.factories.length);
      }
    }

    // If line-based capacity is 0 (no machines assigned yet), fall back to legacy
    if (totalCapacity === 0) {
      return MarketSimulator.getTeamProductionCapacity(state, segment, allocationPercent);
    }

    return Math.floor(totalCapacity);
  }

  /**
   * Calculate market shares using softmax function
   * This ensures shares sum to 1 and higher scores get more share
   */
  static calculateMarketShares(positions: TeamMarketPosition[]): number[] {
    // Filter out teams with zero scores
    const validPositions = positions.filter(p => p.totalScore > 0);

    if (validPositions.length === 0) {
      // No valid competitors - split equally among all
      return positions.map(() => 1 / positions.length);
    }

    // Softmax with temperature for competition intensity
    const temperature = CONSTANTS.SOFTMAX_TEMPERATURE;

    // Calculate exp(score/temperature) for valid positions
    const maxScore = Math.max(...validPositions.map(p => p.totalScore));
    const expScores = positions.map(p => {
      if (p.totalScore <= 0) return 0;
      // Subtract max for numerical stability
      return Math.exp((p.totalScore - maxScore) / temperature);
    });

    const sumExp = expScores.reduce((sum, exp) => sum + exp, 0);

    if (sumExp === 0) {
      return positions.map(() => 1 / positions.length);
    }

    let shares = expScores.map(exp => exp / sumExp);

    // CRIT-06: Ensure minimum share allocation to prevent downstream division-by-zero
    // when a team gets exactly 0% share (exp underflow)
    const MIN_SHARE = 0.001; // 0.1% minimum per team with a product
    const teamsWithProduct = shares.filter(s => s > 0).length;
    if (teamsWithProduct > 0) {
      shares = shares.map(s => s > 0 ? Math.max(MIN_SHARE, s) : s);
      // Re-normalize so shares sum to 1.0
      const newSum = shares.reduce((a, b) => a + b, 0);
      if (newSum > 0) {
        shares = shares.map(s => s / newSum);
      }
    }

    return shares;
  }

  /**
   * Calculate price elasticity for a segment
   */
  static calculatePriceElasticity(segment: Segment): number {
    const elasticities: Record<Segment, number> = {
      "Budget": 2.5,      // Very price sensitive
      "General": 1.8,
      "Enthusiast": 1.2,
      "Professional": 0.8, // Less price sensitive
      "Active Lifestyle": 1.5,
    };
    return elasticities[segment];
  }

  /**
   * Generate next round's market conditions
   */
  /**
   * Generate the next market state with natural fluctuations
   * @param currentState Current market state
   * @param events Market events to apply
   * @param ctx Engine context for deterministic random fluctuations
   */
  static generateNextMarketState(
    currentState: MarketState,
    events?: Array<{
      type: string;
      title?: string;
      description?: string;
      effects?: Array<{ target: string; modifier: number }>;
      targetTeams?: string[] | "all";
    }>,
    ctx?: EngineContext,
    /** Optional team data for updating dynamic pricing expectations */
    teams?: Array<{ id: string; state: TeamState }>
  ): MarketState {
    const nextState = cloneMarketState(currentState);
    nextState.roundNumber += 1;

    // Natural economic fluctuation (deterministic with context)
    nextState.economicConditions.gdp += (getRandomValue(ctx) - 0.5) * 1;
    nextState.economicConditions.inflation += (getRandomValue(ctx) - 0.5) * 0.5;
    nextState.economicConditions.consumerConfidence += (getRandomValue(ctx) - 0.5) * 5;
    nextState.economicConditions.unemploymentRate += (getRandomValue(ctx) - 0.5) * 0.3;

    // Clamp values
    nextState.economicConditions.gdp = Math.max(-5, Math.min(10, nextState.economicConditions.gdp));
    nextState.economicConditions.inflation = Math.max(0, Math.min(15, nextState.economicConditions.inflation));
    nextState.economicConditions.consumerConfidence = Math.max(20, Math.min(100, nextState.economicConditions.consumerConfidence));
    nextState.economicConditions.unemploymentRate = Math.max(2, Math.min(15, nextState.economicConditions.unemploymentRate));

    // FX rate fluctuation (deterministic with context)
    const fxVolatility = CONSTANTS.FX_VOLATILITY_MIN + getRandomValue(ctx) * (CONSTANTS.FX_VOLATILITY_MAX - CONSTANTS.FX_VOLATILITY_MIN);
    nextState.fxVolatility = fxVolatility;

    for (const pair of Object.keys(nextState.fxRates) as (keyof typeof nextState.fxRates)[]) {
      const change = (getRandomValue(ctx) - 0.5) * fxVolatility;
      nextState.fxRates[pair] *= (1 + change);
    }

    // Interest rate adjustment (follows inflation)
    if (nextState.economicConditions.inflation > 3) {
      nextState.interestRates.federalRate += 0.25;
    } else if (nextState.economicConditions.inflation < 1.5) {
      nextState.interestRates.federalRate -= 0.25;
    }
    nextState.interestRates.federalRate = Math.max(0, Math.min(10, nextState.interestRates.federalRate));
    nextState.interestRates.tenYearBond = nextState.interestRates.federalRate - 0.5;
    nextState.interestRates.corporateBond = nextState.interestRates.federalRate + 1;

    // Demand growth by segment
    for (const segment of CONSTANTS.SEGMENTS) {
      const growthRate = nextState.demandBySegment[segment].growthRate;
      nextState.demandBySegment[segment].totalDemand *= (1 + growthRate);
    }

    // Market pressures evolve (deterministic with context)
    nextState.marketPressures.priceCompetition += (getRandomValue(ctx) - 0.5) * 0.1;
    nextState.marketPressures.qualityExpectations += 0.02; // Quality expectations always rise
    nextState.marketPressures.sustainabilityPremium += 0.01; // ESG becomes more important

    // Clamp pressures
    nextState.marketPressures.priceCompetition = Math.max(0.2, Math.min(0.9, nextState.marketPressures.priceCompetition));
    nextState.marketPressures.qualityExpectations = Math.max(0.3, Math.min(0.95, nextState.marketPressures.qualityExpectations));
    nextState.marketPressures.sustainabilityPremium = Math.max(0.1, Math.min(0.6, nextState.marketPressures.sustainabilityPremium));

    // Update dynamic pricing if team data available
    if (teams) {
      nextState.dynamicPricing = this.updateDynamicPricing(nextState, teams);
    }

    // Apply any special events
    if (events) {
      let stateWithEvents = nextState;
      for (const event of events) {
        stateWithEvents = this.applyMarketEvent(stateWithEvents, event, ctx);
      }
      return stateWithEvents;
    }

    return nextState;
  }

  /**
   * Apply a market event to the state
   * @param state Current market state
   * @param event Event to apply
   * @param ctx Engine context for deterministic random effects
   */
  static applyMarketEvent(
    state: MarketState,
    event: {
      type: string;
      title?: string;
      description?: string;
      effects?: Array<{ target: string; modifier: number }>;
      targetTeams?: string[] | "all";
    },
    ctx?: EngineContext
  ): MarketState {
    const newState = cloneMarketState(state);

    // Apply effects based on event type
    switch (event.type) {
      case "recession":
        newState.economicConditions.gdp -= 2;
        newState.economicConditions.consumerConfidence -= 15;
        newState.economicConditions.unemploymentRate += 1.5;
        // Reduce demand across segments
        for (const segment of CONSTANTS.SEGMENTS) {
          newState.demandBySegment[segment].totalDemand *= 0.85;
        }
        break;

      case "boom":
        newState.economicConditions.gdp += 2;
        newState.economicConditions.consumerConfidence += 10;
        newState.economicConditions.unemploymentRate -= 0.5;
        // Increase demand across segments
        for (const segment of CONSTANTS.SEGMENTS) {
          newState.demandBySegment[segment].totalDemand *= 1.15;
        }
        break;

      case "inflation_spike":
        newState.economicConditions.inflation += 3;
        newState.interestRates.federalRate += 0.75;
        newState.economicConditions.consumerConfidence -= 8;
        break;

      case "tech_breakthrough":
        // Enthusiast and Professional segments grow
        newState.demandBySegment["Enthusiast"].totalDemand *= 1.25;
        newState.demandBySegment["Professional"].totalDemand *= 1.20;
        newState.marketPressures.qualityExpectations += 0.05;
        break;

      case "sustainability_regulation":
        // ESG becomes much more important
        newState.marketPressures.sustainabilityPremium += 0.15;
        break;

      case "price_war":
        // Price competition intensifies
        newState.marketPressures.priceCompetition += 0.2;
        // Budget segment grows
        newState.demandBySegment["Budget"].totalDemand *= 1.15;
        break;

      case "supply_chain_crisis":
        // Reduce all demand slightly
        for (const segment of CONSTANTS.SEGMENTS) {
          newState.demandBySegment[segment].totalDemand *= 0.9;
        }
        break;

      case "currency_crisis":
        // Major FX volatility (deterministic with context)
        newState.fxVolatility = 0.35;
        for (const pair of Object.keys(newState.fxRates) as (keyof typeof newState.fxRates)[]) {
          newState.fxRates[pair] *= (0.85 + getRandomValue(ctx) * 0.3);
        }
        break;

      default:
        // Apply custom effects if provided
        if (event.effects) {
          for (const effect of event.effects) {
            this.applyCustomEffect(newState, effect);
          }
        }
    }

    // Clamp all values
    newState.economicConditions.gdp = Math.max(-10, Math.min(15, newState.economicConditions.gdp));
    newState.economicConditions.inflation = Math.max(0, Math.min(20, newState.economicConditions.inflation));
    newState.economicConditions.consumerConfidence = Math.max(10, Math.min(100, newState.economicConditions.consumerConfidence));
    newState.economicConditions.unemploymentRate = Math.max(1, Math.min(20, newState.economicConditions.unemploymentRate));
    newState.marketPressures.priceCompetition = Math.max(0.1, Math.min(1, newState.marketPressures.priceCompetition));
    newState.marketPressures.qualityExpectations = Math.max(0.2, Math.min(1, newState.marketPressures.qualityExpectations));
    newState.marketPressures.sustainabilityPremium = Math.max(0, Math.min(0.8, newState.marketPressures.sustainabilityPremium));

    return newState;
  }

  /**
   * Apply a custom effect to market state
   */
  private static applyCustomEffect(
    state: MarketState,
    effect: { target: string; modifier: number }
  ): void {
    switch (effect.target) {
      case "gdp":
        state.economicConditions.gdp += effect.modifier;
        break;
      case "inflation":
        state.economicConditions.inflation += effect.modifier;
        break;
      case "consumerConfidence":
        state.economicConditions.consumerConfidence += effect.modifier;
        break;
      case "unemployment":
        state.economicConditions.unemploymentRate += effect.modifier;
        break;
      case "priceCompetition":
        state.marketPressures.priceCompetition *= (1 + effect.modifier);
        break;
      case "sustainabilityPremium":
        state.marketPressures.sustainabilityPremium *= (1 + effect.modifier);
        break;
      case "demand_budget":
        state.demandBySegment["Budget"].totalDemand *= (1 + effect.modifier);
        break;
      case "demand_general":
        state.demandBySegment["General"].totalDemand *= (1 + effect.modifier);
        break;
      case "demand_enthusiast":
        state.demandBySegment["Enthusiast"].totalDemand *= (1 + effect.modifier);
        break;
      case "demand_professional":
        state.demandBySegment["Professional"].totalDemand *= (1 + effect.modifier);
        break;
      case "demand_active":
        state.demandBySegment["Active Lifestyle"].totalDemand *= (1 + effect.modifier);
        break;
    }
  }

  /**
   * Calculate competitor ranking
   */
  static calculateRankings(
    teams: Array<{ id: string; state: TeamState }>,
    marketResult: MarketSimulationResult
  ): Array<{ teamId: string; rank: number; epsRank: number; shareRank: number; achievementRank: number; stockPriceRank?: number; compositeScore?: number }> {
    // Rank by total revenue (20% of BSC)
    const byRevenue = [...teams].sort(
      (a, b) => marketResult.revenueByTeam[b.id] - marketResult.revenueByTeam[a.id]
    );

    // Rank by EPS (20% of BSC)
    const byEPS = [...teams].sort((a, b) => b.state.eps - a.state.eps);

    // Rank by total market share (15% of BSC)
    const totalShares = teams.map(t => ({
      id: t.id,
      totalShare: Object.values(marketResult.marketShares[t.id]).reduce((sum, s) => sum + s, 0),
    }));
    const byShare = [...totalShares].sort((a, b) => b.totalShare - a.totalShare);

    // Rank by achievement score (20% of BSC)
    const byAchievement = [...teams].sort(
      (a, b) => (b.state.achievementScore ?? 0) - (a.state.achievementScore ?? 0)
    );

    // T8 FIX: Rank by stock price (25% of BSC)
    const byStockPrice = [...teams].sort(
      (a, b) => (b.state.sharePrice ?? 0) - (a.state.sharePrice ?? 0)
    );

    // T8 FIX: 5D BSC Composite — lower composite score = better rank
    // Weights: Revenue 25%, Stock Price 10%, EPS 15%, Market Share 25%, Achievements 25%
    // Revenue + market share = 50% of BSC (rewards volume & breadth)
    // EPS + stock price = 25% (rewards profitability but doesn't dominate)
    // Achievements = 25% (rewards strategic milestones)
    const composite = teams.map(team => {
      const revenueRank = byRevenue.findIndex(t => t.id === team.id) + 1;
      const epsRank = byEPS.findIndex(t => t.id === team.id) + 1;
      const shareRank = byShare.findIndex(t => t.id === team.id) + 1;
      const achievementRank = byAchievement.findIndex(t => t.id === team.id) + 1;
      const stockPriceRank = byStockPrice.findIndex(t => t.id === team.id) + 1;
      const compositeScore =
        revenueRank * 0.25 + stockPriceRank * 0.10 + epsRank * 0.15 +
        shareRank * 0.25 + achievementRank * 0.25;
      return { teamId: team.id, compositeScore, revenueRank, epsRank, shareRank, achievementRank, stockPriceRank };
    });
    composite.sort((a, b) => a.compositeScore - b.compositeScore);

    return composite.map((c, idx) => ({
      teamId: c.teamId,
      rank: idx + 1,
      epsRank: c.epsRank,
      shareRank: c.shareRank,
      achievementRank: c.achievementRank,
      stockPriceRank: c.stockPriceRank,
      compositeScore: c.compositeScore,
    }));
  }

  /**
   * Update customer loyalty for a team based on sales performance.
   * Consistent supply builds loyalty; stockouts erode it.
   * Loyalty provides a small pricing premium and insulation against competitor price drops.
   *
   * @param currentLoyalty Current loyalty values (0-100 per segment)
   * @param salesBySegment Units sold this round per segment
   * @param demandBySegment Total demand per segment
   * @returns Updated loyalty values
   */
  static updateCustomerLoyalty(
    currentLoyalty: Record<Segment, number> | undefined,
    salesBySegment: Record<Segment, number>,
    demandBySegment: Record<Segment, number>
  ): Record<Segment, number> {
    const loyalty: Record<Segment, number> = currentLoyalty
      ? { ...currentLoyalty }
      : { "Budget": 50, "General": 50, "Enthusiast": 50, "Professional": 50, "Active Lifestyle": 50 };

    for (const segment of CONSTANTS.SEGMENTS) {
      const sold = salesBySegment[segment] ?? 0;
      const demand = demandBySegment[segment] ?? 1;
      const fulfillmentRate = Math.min(1.0, sold / Math.max(1, demand * 0.1)); // team's share of demand

      if (sold > 0) {
        // Building loyalty: +2 per round with sales, up to +5 for strong fulfillment
        const loyaltyGain = 2 + fulfillmentRate * 3;
        loyalty[segment] = Math.min(100, loyalty[segment] + loyaltyGain);
      } else {
        // Stockout / no product: loyalty decays -5 per round
        loyalty[segment] = Math.max(0, loyalty[segment] - 5);
      }
    }

    return loyalty;
  }

  /**
   * Get loyalty score bonus for market scoring.
   * High loyalty provides a small total score multiplier.
   */
  static getLoyaltyBonus(loyalty: number): number {
    // 0-100 loyalty → 0% to 5% score bonus
    return (loyalty / 100) * 0.05;
  }

  /**
   * Update dynamic price expectations after a round.
   * Uses Exponential Moving Average (EMA) of actual prices.
   * Called after market simulation to prepare next round's expectations.
   */
  static updateDynamicPricing(
    marketState: MarketState,
    teams: Array<{ id: string; state: TeamState }>
  ): Partial<Record<Segment, DynamicPriceExpectation>> {
    const dynamicPricing: Partial<Record<Segment, DynamicPriceExpectation>> = {};
    const previous = marketState.dynamicPricing || {};

    for (const segment of CONSTANTS.SEGMENTS) {
      const segmentData = marketState.demandBySegment[segment];

      // Collect all launched product prices in this segment
      const prices: number[] = [];
      for (const team of teams) {
        for (const product of team.state.products) {
          if (product.segment === segment && product.developmentStatus === "launched") {
            prices.push(product.price);
          }
        }
      }

      const competitorCount = prices.length;
      const avgPrice = competitorCount > 0
        ? prices.reduce((sum, p) => sum + p, 0) / competitorCount
        : (segmentData.priceRange.min + segmentData.priceRange.max) / 2;

      // EMA update
      const prevExpected = previous[segment]?.expectedPrice ?? avgPrice;
      const expectedPrice = prevExpected * (1 - DYNAMIC_PRICE_EMA_ALPHA)
        + avgPrice * DYNAMIC_PRICE_EMA_ALPHA;

      // Underserved factor: fewer competitors = more underserved
      const maxCompetitors = teams.length; // Max = every team has a product
      const underservedFactor = competitorCount === 0
        ? 1.0
        : Math.max(0, 1 - competitorCount / maxCompetitors);

      // Price floor: minimum material + labor cost
      const priceFloor = CONSTANTS.RAW_MATERIAL_COST_PER_UNIT[segment]
        + CONSTANTS.LABOR_COST_PER_UNIT
        + CONSTANTS.OVERHEAD_COST_PER_UNIT;

      // Price ceiling: segment max × inflation adjustment
      const inflationFactor = 1 + (marketState.economicConditions.inflation / 100);
      const priceCeiling = segmentData.priceRange.max * inflationFactor * 1.2;

      dynamicPricing[segment] = {
        expectedPrice,
        underservedFactor,
        competitorCount,
        priceFloor,
        priceCeiling,
      };
    }

    return dynamicPricing;
  }
}
