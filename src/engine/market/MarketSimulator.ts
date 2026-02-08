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
import { random, randomRange } from "../utils";
import { cloneMarketState, cloneTeamState } from "../utils/stateUtils";
import type { EngineContext, SeededRNG } from "../core/EngineContext";

/**
 * Get RNG instance - uses context if available, otherwise global (throws if not seeded)
 */
function getRNG(ctx?: EngineContext): SeededRNG | null {
  return ctx?.rng.market ?? null;
}

/**
 * Get random number using context or global RNG
 */
function getRandomValue(ctx?: EngineContext): number {
  const rng = getRNG(ctx);
  return rng ? rng.next() : random();
}

/**
 * Get random range using context or global RNG
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
}

export class MarketSimulator {
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
    options?: { applyRubberBanding?: boolean },
    ctx?: EngineContext
  ): MarketSimulationResult {
    const positions: TeamMarketPosition[] = [];
    const marketShares: Record<string, Record<Segment, number>> = {};
    const salesByTeam: Record<string, Record<Segment, number>> = {};
    const revenueByTeam: Record<string, number> = {};
    // PATCH 6: Foreign revenue tracking
    const revenueByRegion: Record<string, Record<string, number>> = {};

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
        segmentPositions.push(position);
        positions.push(position);
      }

      // Calculate market shares using softmax
      const shares = this.calculateMarketShares(segmentPositions);

      // Allocate sales based on shares
      const segmentDemand = totalDemand[segment];
      for (let i = 0; i < segmentPositions.length; i++) {
        const position = segmentPositions[i];
        const share = shares[i];
        const units = Math.floor(segmentDemand * share);

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

    // Apply rubber-banding if enabled and conditions are met
    let rubberBandingApplied = false;
    if (options?.applyRubberBanding && marketState.roundNumber >= 3) {
      // Create position lookup map for O(1) access
      const positionMap = new Map<string, TeamMarketPosition>();
      for (const pos of positions) {
        positionMap.set(`${pos.teamId}:${pos.segment}`, pos);
      }

      // Get overall market positions for each team
      const teamTotalShares = teams.map(t => {
        const totalShare = Object.values(marketShares[t.id]).reduce((sum, s) => sum + s, 0) / CONSTANTS.SEGMENTS.length;
        return { teamId: t.id, totalShare };
      });

      const avgShare = teamTotalShares.reduce((sum, t) => sum + t.totalShare, 0) / teamTotalShares.length;

      // Check if rubber-banding should be applied
      const needsRubberBanding = teamTotalShares.some(
        t => t.totalShare < avgShare * 0.5 || t.totalShare > avgShare * 2
      );

      if (needsRubberBanding) {
        rubberBandingApplied = true;

        // Adjust shares for trailing/leading teams
        for (const team of teamTotalShares) {
          const multiplier = team.totalShare < avgShare * CONSTANTS.RUBBER_BAND_THRESHOLD
            ? CONSTANTS.RUBBER_BAND_TRAILING_BOOST  // Boost trailing teams
            : team.totalShare > avgShare * 2
              ? CONSTANTS.RUBBER_BAND_LEADING_PENALTY // Penalize leading teams
              : 1.0;

          if (multiplier !== 1.0) {
            for (const segment of CONSTANTS.SEGMENTS) {
              const originalShare = marketShares[team.teamId][segment];
              marketShares[team.teamId][segment] = originalShare * multiplier;

              // Recalculate sales and revenue
              const units = Math.floor(totalDemand[segment] * marketShares[team.teamId][segment]);
              salesByTeam[team.teamId][segment] = units;

              // Find the position and update it (O(1) lookup via Map)
              const pos = positionMap.get(`${team.teamId}:${segment}`);
              if (pos) {
                pos.marketShare = marketShares[team.teamId][segment];
                pos.unitsSold = units;
                pos.revenue = units * (pos.product?.price || 0);
              }
            }

            // Recalculate total revenue for this team
            revenueByTeam[team.teamId] = Object.values(salesByTeam[team.teamId]).reduce((sum, units, idx) => {
              const seg = CONSTANTS.SEGMENTS[idx];
              const pos = positionMap.get(`${team.teamId}:${seg}`);
              return sum + (units * (pos?.product?.price || 0));
            }, 0);
          }
        }
      }
    }

    return {
      positions,
      totalDemand,
      marketShares,
      salesByTeam,
      revenueByTeam,
      revenueByRegion,  // PATCH 6: Foreign revenue tracking
      rubberBandingApplied,
      esgEvents,
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
  // PATCH 4: ESG redesigned as risk mitigation, not revenue bonuses
  static applyESGEvents(
    esgScore: number,
    revenue: number
  ): { type: "bonus" | "penalty"; amount: number; message: string } | null {
    // PATCH 4: Only penalize very low ESG (< 300) - represents actual regulatory/PR disasters
    if (esgScore < 300) {
      // Score 299 = 1% penalty, Score 0 = 8% penalty
      // Linear interpolation: penalty = MAX - (score/300) * (MAX - MIN)
      const MAX_PENALTY = 0.08; // 8%
      const MIN_PENALTY = 0.01; // 1%
      const penaltyRange = MAX_PENALTY - MIN_PENALTY;
      const scoreRatio = esgScore / 300; // 0 to ~1
      const penaltyRate = MAX_PENALTY - (scoreRatio * penaltyRange);
      const penalty = -revenue * penaltyRate;

      return {
        type: "penalty",
        amount: penalty,
        message: `ESG Crisis (boycotts/fines): -${(penaltyRate * 100).toFixed(1)}% revenue ($${(Math.abs(penalty) / 1_000_000).toFixed(1)}M)`,
      };
    }

    // PATCH 4: Mid ESG (300-600) = baseline (no effect)
    // High ESG (> 600) = risk mitigation, better board approval (handled elsewhere)
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

      // Random noise (±5%) - deterministic with context
      const noise = 0.95 + getRandomValue(ctx) * 0.1;

      adjustedDemand *= gdpMultiplier * confidenceMultiplier * inflationMultiplier * growthMultiplier * noise;

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
    const weights: Record<Segment, { price: number; quality: number; brand: number; esg: number; features: number }> = {
      // v3.1.0: Sharpened primary weights to reward specialization (Fix 1.2)
      "Budget":          { price: 65, quality: 15, brand: 5, esg: 5, features: 10 },   // sum=100 — price dominant
      "General":         { price: 30, quality: 25, brand: 15, esg: 10, features: 20 }, // sum=100 — balanced's home segment
      "Enthusiast":      { price: 12, quality: 30, brand: 8, esg: 5, features: 45 },  // sum=100 — features dominant
      "Professional":    { price: 8, quality: 50, brand: 5, esg: 20, features: 17 },  // sum=100 — quality dominant
      "Active Lifestyle": { price: 20, quality: 30, brand: CONSTANTS.SEGMENT_BRAND_WEIGHT_ACTIVE_LIFESTYLE, esg: 10, features: 40 - CONSTANTS.SEGMENT_BRAND_WEIGHT_ACTIVE_LIFESTYLE },// sum=100 — brand tunable
    };
    return weights[segment];
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

    // Price Score: How competitive is the price?
    // Uses price position within segment range (0 at max, 1 at min)
    // This properly rewards low prices: cheaper = higher score
    // BUT: Prices significantly below minimum get penalized (price floor curve)
    // PATCH 5: Quality increases price tolerance
    const priceRange = segmentData.priceRange;
    const rangeWidth = priceRange.max - priceRange.min;

    // PATCH 5: Quality-driven price tolerance (up to 20% premium acceptance for Q=100)
    const qualityPriceTolerance = product.quality * 0.002;  // 0.2 at Q=100
    const adjustedMaxPrice = priceRange.max * (1 + qualityPriceTolerance);

    // pricePosition: 0 (at adjusted max price) to 1 (at min price), can exceed 1 if below min
    const adjustedRangeWidth = adjustedMaxPrice - priceRange.min;
    const pricePosition = adjustedRangeWidth > 0
      ? Math.max(0, (adjustedMaxPrice - product.price) / adjustedRangeWidth)
      : 0.5;

    // Price floor curve: penalize prices far below segment minimum
    // This prevents "race to bottom" pricing strategies
    let priceScoreMultiplier = 1.0;
    if (product.price < priceRange.min) {
      const priceBelowMin = priceRange.min - product.price;
      const floorThreshold = priceRange.min * CONSTANTS.PRICE_FLOOR_PENALTY_THRESHOLD;

      if (priceBelowMin > floorThreshold) {
        // Calculate penalty: scales from 0 to MAX_PENALTY as price goes further below floor
        const excessBelow = priceBelowMin - floorThreshold;
        const penaltyScale = Math.min(1, excessBelow / floorThreshold); // 0-1 as price drops further
        priceScoreMultiplier = 1 - (penaltyScale * CONSTANTS.PRICE_FLOOR_PENALTY_MAX);
      }
    }

    // Cap at 1.0 for prices at or slightly below min, apply floor penalty if too low
    const priceScore = Math.min(1, pricePosition) * weights.price * priceScoreMultiplier;

    // Quality Score: Product quality vs expectations
    // v2.2.0: Allow exceeding expectations with diminishing returns
    // This rewards premium strategies for investing in quality
    const qualityExpectation = this.getQualityExpectation(segment);
    const qualityRatio = product.quality / qualityExpectation;
    // Beyond 1.0, use sqrt for diminishing returns: sqrt(1.2) = 1.095, sqrt(1.5) = 1.22
    const qualityMultiplier = qualityRatio <= 1.0
      ? qualityRatio
      : 1.0 + Math.sqrt(qualityRatio - 1) * 0.5; // 50% of excess via sqrt
    const qualityScore = Math.min(1.3, qualityMultiplier) * weights.quality; // Cap at 1.3x

    // Brand Score: Brand value contribution (already 0-1)
    // v2.2.0: Apply sqrt() for diminishing returns - high brand values give less incremental benefit
    // This prevents brand-focused strategies from dominating
    // sqrt(0.5) = 0.71, sqrt(0.7) = 0.84, sqrt(0.9) = 0.95
    const brandScore = Math.sqrt(state.brandValue) * weights.brand;

    // ESG Score: Sustainability premium (0-1 scale from 0-1000 score)
    const esgRatio = state.esgScore / 1000;
    const esgMultiplier = marketState.marketPressures.sustainabilityPremium; // 0.1 to 0.6
    const esgScore = esgRatio * esgMultiplier * weights.esg;

    // Feature Score: Product features (0-100 normalized to 0-1)
    // v2.2.0: Allow features above 100 to provide bonus (R&D investment reward)
    const featureRatio = product.features / 100;
    const featureMultiplier = featureRatio <= 1.0
      ? featureRatio
      : 1.0 + Math.sqrt(featureRatio - 1) * 0.5; // 50% of excess via sqrt
    const featureScore = Math.min(1.3, featureMultiplier) * weights.features; // Cap at 1.3x

    // Total score (theoretical max = 100 with all weights summing to 100)
    let totalScore = priceScore + qualityScore + brandScore + esgScore + featureScore;

    // PATCH 5: Quality market share bonus (0.1% per quality point)
    const qualityMarketShareBonus = product.quality * 0.001;
    totalScore += qualityMarketShareBonus;

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
  static getQualityExpectation(segment: Segment): number {
    const expectations: Record<Segment, number> = {
      "Budget": 50,
      "General": 65,
      "Enthusiast": 80,
      "Professional": 90,
      "Active Lifestyle": 70,
    };
    return expectations[segment];
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
    // Temperature controls how "winner-take-all" the market is:
    // - Lower temp (e.g., 5) = leader dominates
    // - Higher temp (e.g., 30) = more equal distribution
    // Temperature 10 gives moderate competition:
    // - Close scores (70,65,60,55): ~46%, 28%, 17%, 10%
    // - Clear leader (80,60,55,50): ~79%, 11%, 6%, 4%
    // - Dominant (90,50,45,40): ~97%, 2%, 1%, 1%
    const temperature = CONSTANTS.SOFTMAX_TEMPERATURE; // v3.1.0: Read from CONSTANTS for tuning (Fix 1.1)

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

    return expScores.map(exp => exp / sumExp);
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
    ctx?: EngineContext
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
  ): Array<{ teamId: string; rank: number; epsRank: number; shareRank: number }> {
    // Rank by total revenue
    const byRevenue = [...teams].sort(
      (a, b) => marketResult.revenueByTeam[b.id] - marketResult.revenueByTeam[a.id]
    );

    // Rank by EPS
    const byEPS = [...teams].sort((a, b) => b.state.eps - a.state.eps);

    // Rank by total market share
    const totalShares = teams.map(t => ({
      id: t.id,
      totalShare: Object.values(marketResult.marketShares[t.id]).reduce((sum, s) => sum + s, 0),
    }));
    const byShare = [...totalShares].sort((a, b) => b.totalShare - a.totalShare);

    return teams.map(team => ({
      teamId: team.id,
      rank: byRevenue.findIndex(t => t.id === team.id) + 1,
      epsRank: byEPS.findIndex(t => t.id === team.id) + 1,
      shareRank: byShare.findIndex(t => t.id === team.id) + 1,
    }));
  }
}
