/**
 * R&D Module - Handles research, product development, and innovation
 *
 * DETERMINISM: This module uses EngineContext for all randomness and ID generation.
 */

import {
  RDDecisions,
  TeamState,
  ModuleResult,
  Product,
  Segment,
  EngineerStats,
  CONSTANTS,
} from "../types";
import { createErrorResult, random } from "../utils";
import { cloneTeamState } from "../utils/stateUtils";
import type { EngineContext, SeededRNG } from "../core/EngineContext";
import { getArchetype, getAvailableArchetypes } from "../types/archetypes";
import type { PhoneArchetype } from "../types/archetypes";
import type { ProductFeatureSet } from "../types/features";
import { TECH_FAMILIES, emptyFeatureSet } from "../types/features";
import { RDExpansions } from "./RDExpansions";
import type { TechFamily } from "./RDExpansions";

/**
 * Get RNG instance - uses context if available, otherwise global (throws if not seeded)
 */
function getRNG(ctx?: EngineContext): SeededRNG | null {
  return ctx?.rng.rd ?? null;
}

/**
 * Get random number using context or global RNG
 */
function getRandomValue(ctx?: EngineContext): number {
  const rng = getRNG(ctx);
  return rng ? rng.next() : random();
}

export interface ProductDevelopmentProgress {
  productId: string;
  name: string;
  segment: Segment;
  targetQuality: number;
  targetFeatures: number;
  currentProgress: number; // 0-100
  estimatedRoundsRemaining: number;
}

export class RDModule {
  /**
   * Process all R&D decisions for a round
   * @param state Current team state
   * @param decisions R&D decisions for this round
   * @param ctx Engine context for deterministic execution (required for production)
   */
  static process(
    state: TeamState,
    decisions: RDDecisions,
    ctx?: EngineContext
  ): { newState: TeamState; result: ModuleResult } {
    try {
      return this.processInternal(state, decisions, ctx);
    } catch (error) {
      return createErrorResult("RDModule", error, state);
    }
  }

  /**
   * Internal processing logic
   */
  private static processInternal(
    state: TeamState,
    decisions: RDDecisions,
    ctx?: EngineContext
  ): { newState: TeamState; result: ModuleResult } {
    let newState = cloneTeamState(state);
    let totalCosts = 0;
    const messages: string[] = [];

    // Set R&D budget
    if (decisions.rdBudget !== undefined) {
      newState.rdBudget = decisions.rdBudget;
      totalCosts += decisions.rdBudget;
      messages.push(`R&D budget set to $${(decisions.rdBudget / 1_000_000).toFixed(1)}M`);
    }

    // Calculate R&D output from engineers
    const engineers = newState.employees.filter(e => e.role === "engineer");
    const rdOutput = this.calculateTotalRDOutput(engineers);
    newState.rdProgress += rdOutput;
    messages.push(`Engineers generated ${rdOutput.toFixed(0)} R&D points`);

    // v3.1.0: R&D budget also generates rdProgress (Fix: budget was previously wasted)
    // CRIT-01: Cap budget-derived points to prevent R&D dump strategy dominance
    if (decisions.rdBudget && decisions.rdBudget > 0) {
      const rawBudgetPoints = Math.floor(decisions.rdBudget / CONSTANTS.RD_BUDGET_TO_POINTS_RATIO);
      const budgetPoints = Math.min(CONSTANTS.MAX_RD_BUDGET_POINTS_PER_ROUND, rawBudgetPoints);
      newState.rdProgress += budgetPoints;
      if (rawBudgetPoints > budgetPoints) {
        messages.push(`R&D budget generated ${budgetPoints} R&D points (capped; ${rawBudgetPoints - budgetPoints} pts wasted from overspend)`);
      } else {
        messages.push(`R&D budget generated ${budgetPoints} additional R&D points`);
      }
    }

    // Process new product development (now starts in "in_development" status)
    if (decisions.newProducts) {
      for (const productSpec of decisions.newProducts) {
        // Archetype-based product creation (new system)
        if (productSpec.archetypeId) {
          const archetype = getArchetype(productSpec.archetypeId);
          if (!archetype) {
            messages.push(`Unknown archetype: ${productSpec.archetypeId}`);
            continue;
          }

          // Validate tech requirements
          const unlockedTechs = newState.unlockedTechnologies || [];
          const techNodes = RDExpansions.getTechTree().map(n => ({ id: n.id, tier: n.tier }));
          const available = getAvailableArchetypes(unlockedTechs, techNodes);
          if (!available.some(a => a.id === archetype.id)) {
            messages.push(`Cannot build ${archetype.name}: required technologies not unlocked`);
            continue;
          }

          const developmentCost = archetype.baseCost;
          if (newState.cash >= developmentCost) {
            const newProduct = this.createArchetypeProduct(
              productSpec.name,
              archetype,
              unlockedTechs,
              ctx
            );
            newState.products.push(newProduct);
            totalCosts += developmentCost;
            messages.push(`Started development of ${productSpec.name} (${archetype.name}) for ${archetype.primarySegment} segment (${archetype.developmentRounds} rounds)`);
          } else {
            messages.push(`Insufficient funds to develop ${productSpec.name} ($${(developmentCost / 1_000_000).toFixed(0)}M needed)`);
          }
          continue;
        }

        // Legacy product creation (backward compatible)
        const developmentCost = this.calculateDevelopmentCost(productSpec.segment, productSpec.targetQuality);

        if (newState.cash >= developmentCost) {
          // Calculate development time based on quality and engineers
          const engineerCount = newState.employees.filter(e => e.role === "engineer").length;
          const roundsToComplete = this.calculateDevelopmentRounds(
            productSpec.targetQuality,
            engineerCount
          );

          const newProduct = this.createProduct(
            productSpec.name,
            productSpec.segment,
            productSpec.targetQuality,
            productSpec.targetFeatures,
            roundsToComplete,
            ctx
          );
          newState.products.push(newProduct);
          totalCosts += developmentCost;
          messages.push(`Started development of ${productSpec.name} for ${productSpec.segment} segment (${roundsToComplete} rounds to complete)`);
        } else {
          messages.push(`Insufficient funds to develop ${productSpec.name}`);
        }
      }
    }

    // Auto-launch any products stuck in "ready" state from previous rounds
    for (const product of newState.products) {
      if (product.developmentStatus === "ready") {
        product.developmentStatus = "launched";
        messages.push(`${product.name} launched to market!`);
        RDModule.ensureProductionLine(newState, product);
      }
    }

    // Progress existing in-development products
    for (const product of newState.products) {
      if (product.developmentStatus === "in_development") {
        product.roundsRemaining = Math.max(0, product.roundsRemaining - 1);
        product.developmentProgress = Math.min(100, product.developmentProgress + (100 / (product.roundsRemaining + 1)));

        if (product.roundsRemaining === 0) {
          // Development complete - upgrade to full quality
          product.developmentStatus = "launched";
          product.quality = product.targetQuality;
          product.features = product.targetFeatures;
          product.developmentProgress = 100;
          messages.push(`${product.name} development complete! Launched to market.`);
          RDModule.ensureProductionLine(newState, product);
        }
      }
    }

    // Process product improvements
    if (decisions.productImprovements) {
      for (const improvement of decisions.productImprovements) {
        const product = newState.products.find(p => p.id === improvement.productId);
        if (product) {
          const improvementCost = this.calculateImprovementCost(
            improvement.qualityIncrease || 0,
            improvement.featuresIncrease || 0,
            product.quality,    // v4.0.0: Pass current quality for progressive costing
            product.features    // v4.0.0: Pass current features for progressive costing
          );

          // v4.0.0: rdProgress requirement (kept simple - cost scaling handles diminishing returns)
          const rdPointsRequired = (improvement.qualityIncrease || 0) * 10;
          if (newState.cash >= improvementCost && newState.rdProgress >= rdPointsRequired) {
            if (improvement.qualityIncrease) {
              product.quality = Math.min(100, product.quality + improvement.qualityIncrease);
            }
            if (improvement.featuresIncrease) {
              product.features = Math.min(100, product.features + improvement.featuresIncrease);
            }
            newState.rdProgress -= rdPointsRequired;
            totalCosts += improvementCost;
            messages.push(`Improved ${product.name}: Q+${improvement.qualityIncrease || 0}, F+${improvement.featuresIncrease || 0}`);
          } else {
            messages.push(`Cannot improve ${product.name}: insufficient funds or R&D points`);
          }
        }
      }
    }

    // F2 FIX: Product aging — launched products lose quality and features each round
    const improvedProductIds = new Set(
      (decisions.productImprovements || []).map(imp => imp.productId)
    );
    for (const product of newState.products) {
      if (product.developmentStatus === "launched") {
        const wasImproved = improvedProductIds.has(product.id);
        const agingFactor = wasImproved ? 0.3 : 1.0;
        const qualityDecay = 0.5 * agingFactor;
        const featureDecay = 0.3 * agingFactor;
        product.quality = Math.max(10, product.quality - qualityDecay);
        product.features = Math.max(5, product.features - featureDecay);
        if (!wasImproved && agingFactor === 1.0) {
          (product as Record<string, unknown>).age = ((product as Record<string, unknown>).age as number || 0) + 1;
        }
      }
    }

    // Patent generation — milestone-based, non-consuming (rdProgress accumulates freely)
    const patentThreshold = 200;
    const currentPatents = typeof newState.patents === "number" ? newState.patents : 0;
    const totalPatentsEarned = Math.floor(newState.rdProgress / patentThreshold);
    const newPatents = totalPatentsEarned - currentPatents;
    if (newPatents > 0) {
      newState.patents = totalPatentsEarned;
      messages.push(`${newPatents} new patent(s) earned! (Total: ${totalPatentsEarned})`);
    }

    // Auto-unlock technologies based on accumulated rdProgress thresholds
    if (!newState.unlockedTechnologies) {
      newState.unlockedTechnologies = [];
    }
    const techUnlocks: Array<{ id: string; threshold: number; prerequisite?: string }> = [
      { id: "process_optimization", threshold: CONSTANTS.RD_TECH_TREE.process_optimization.rdPointsRequired },
      { id: "advanced_manufacturing", threshold: CONSTANTS.RD_TECH_TREE.advanced_manufacturing.rdPointsRequired, prerequisite: "process_optimization" },
      { id: "industry_4_0", threshold: CONSTANTS.RD_TECH_TREE.industry_4_0.rdPointsRequired, prerequisite: "advanced_manufacturing" },
      { id: "breakthrough_tech", threshold: CONSTANTS.RD_TECH_TREE.breakthrough_tech.rdPointsRequired, prerequisite: "industry_4_0" },
    ];
    for (const tech of techUnlocks) {
      if (newState.unlockedTechnologies.includes(tech.id)) continue;
      if (newState.rdProgress < tech.threshold) continue;
      if (tech.prerequisite && !newState.unlockedTechnologies.includes(tech.prerequisite)) continue;
      newState.unlockedTechnologies.push(tech.id);
      messages.push(`Technology unlocked: ${tech.id.replace(/_/g, " ")}!`);
    }

    // Auto-bridge: legacy tech levels grant corresponding RDExpansion tech nodes
    // process_optimization → Tier 1, advanced_manufacturing → Tier 2,
    // industry_4_0 → Tier 3, breakthrough_tech → Tier 4+5
    const LEGACY_TO_EXPANSION_TIER: Record<string, number[]> = {
      process_optimization: [1],
      advanced_manufacturing: [2],
      industry_4_0: [3],
      breakthrough_tech: [4, 5],
    };
    const allExpansionNodes = RDExpansions.getTechTree();
    for (const [legacyId, expansionTiers] of Object.entries(LEGACY_TO_EXPANSION_TIER)) {
      if (!newState.unlockedTechnologies.includes(legacyId)) continue;
      const nodesToGrant = allExpansionNodes.filter(n => expansionTiers.includes(n.tier));
      for (const node of nodesToGrant) {
        if (!newState.unlockedTechnologies.includes(node.id)) {
          newState.unlockedTechnologies.push(node.id);
        }
      }
    }

    // Research decay: technologies not applied to products decay over time
    if (newState.researchDecayTimers) {
      const unlockedTechs = newState.unlockedTechnologies ?? [];
      const appliedTechIds = new Set(
        newState.products.flatMap(p => p.appliedTechs ?? [])
      );

      for (const techId of unlockedTechs) {
        if (appliedTechIds.has(techId)) {
          // Tech is in use — reset decay timer
          delete newState.researchDecayTimers[techId];
          continue;
        }

        // Increment decay timer
        const current = newState.researchDecayTimers[techId] ?? 0;
        newState.researchDecayTimers[techId] = current + 1;

        // After 6 rounds unused, tech starts losing effectiveness
        const DECAY_THRESHOLD = 6;
        const MAX_DECAY_ROUNDS = 12;
        if (current + 1 >= DECAY_THRESHOLD) {
          const decayRounds = (current + 1) - DECAY_THRESHOLD;
          if (decayRounds === 0) {
            messages.push(`Warning: Technology "${techId}" is starting to decay from disuse. Apply it to a product!`);
          } else if (decayRounds >= MAX_DECAY_ROUNDS) {
            messages.push(`Technology "${techId}" has decayed 50% from disuse.`);
          }
        }
      }
    } else if ((newState.unlockedTechnologies?.length ?? 0) > 0) {
      // Initialize decay timers
      newState.researchDecayTimers = {};
    }

    // Deduct costs from cash
    newState.cash -= totalCosts;

    return {
      newState,
      result: {
        success: true,
        changes: {
          rdBudget: decisions.rdBudget || 0,
          rdPointsGenerated: rdOutput,
          newProductsStarted: decisions.newProducts?.length || 0,
          productsImproved: decisions.productImprovements?.length || 0,
          patentsEarned: (typeof newState.patents === "number" ? newState.patents : 0) - (typeof state.patents === "number" ? state.patents : 0),
        },
        costs: totalCosts,
        revenue: 0,
        messages,
      },
    };
  }

  /**
   * Ensure a production line exists on the first factory for a product's segment.
   * Called when products transition to "launched" so MarketSimulator can calculate capacity.
   */
  private static ensureProductionLine(state: TeamState, product: Product): void {
    if (state.factories.length === 0) return;
    const factory = state.factories[0];
    if (!factory.productionLines) factory.productionLines = [];
    // Check if a production line already exists for this segment
    const existingLine = factory.productionLines.find(
      l => l.segment === product.segment
    );
    if (existingLine) return;

    factory.productionLines.push({
      id: `line-${product.segment.toLowerCase().replace(/\s+/g, "-")}-${factory.productionLines.length + 1}`,
      segment: product.segment,
      productId: product.id,
      capacity: 50_000,
      efficiency: factory.efficiency || 0.7,
    });
  }

  /**
   * Calculate total R&D output from engineers
   * Formula: 10 base points × efficiency × speed × (1 + innovation/200)
   */
  static calculateTotalRDOutput(engineers: TeamState["employees"]): number {
    let totalOutput = 0;

    for (const engineer of engineers) {
      if (engineer.role === "engineer") {
        const stats = engineer.stats as EngineerStats;
        const basePoints = CONSTANTS.BASE_RD_POINTS_PER_ENGINEER;
        const efficiencyMultiplier = stats.efficiency / 100;
        const speedMultiplier = stats.speed / 100;
        const innovationBonus = 1 + (stats.innovation || 50) / 200;

        // Apply burnout penalty
        const burnoutPenalty = 1 - (engineer.burnout / 200);

        totalOutput += basePoints * efficiencyMultiplier * speedMultiplier * innovationBonus * burnoutPenalty;
      }
    }

    return totalOutput;
  }

  /**
   * Calculate development cost for a new product
   */
  static calculateDevelopmentCost(segment: Segment, targetQuality: number): number {
    // Base costs by segment
    const baseCosts: Record<Segment, number> = {
      "Budget": 5_000_000,
      "General": 10_000_000,
      "Enthusiast": 20_000_000,
      "Professional": 35_000_000,
      "Active Lifestyle": 15_000_000,
    };

    const baseCost = baseCosts[segment];

    // Quality multiplier: higher quality = higher cost
    const qualityMultiplier = 1 + (targetQuality - 50) / 50; // 0.5x to 2x

    return Math.round(baseCost * qualityMultiplier);
  }

  /**
   * Calculate improvement cost with diminishing returns at high levels (v4.0.0)
   * Quality/feature improvements become progressively more expensive above 70
   * This prevents R&D-focused strategies from endlessly scaling quality
   */
  static calculateImprovementCost(
    qualityIncrease: number,
    featuresIncrease: number,
    currentQuality: number = 50,
    currentFeatures: number = 50
  ): number {
    // Quality cost: progressive scaling (v4.0.2: steeper thresholds at 70/80/90)
    let qualityCost = 0;
    for (let i = 0; i < qualityIncrease; i++) {
      const level = currentQuality + i;
      let costPerPoint = 1_000_000; // Base: $1M per point
      if (level >= 90) costPerPoint = 5_000_000;
      else if (level >= 80) costPerPoint = 2_500_000;
      else if (level >= 70) costPerPoint = 1_500_000;
      qualityCost += costPerPoint;
    }

    // Feature cost: progressive scaling (same thresholds, half base cost)
    let featuresCost = 0;
    for (let i = 0; i < featuresIncrease; i++) {
      const level = currentFeatures + i;
      let costPerPoint = 500_000; // Base: $500K per point
      if (level >= 90) costPerPoint = 2_500_000;
      else if (level >= 80) costPerPoint = 1_250_000;
      else if (level >= 70) costPerPoint = 750_000;
      featuresCost += costPerPoint;
    }

    return qualityCost + featuresCost;
  }

  /**
   * Calculate development rounds based on target quality and engineer count
   */
  static calculateDevelopmentRounds(
    targetQuality: number,
    engineerCount: number
  ): number {
    // Base rounds from quality
    const baseRounds = CONSTANTS.PRODUCT_DEV_BASE_ROUNDS;
    const qualityFactor = Math.max(0, targetQuality - 50) * CONSTANTS.PRODUCT_DEV_QUALITY_FACTOR;

    // Engineer speedup (capped at 50%)
    const engineerSpeedup = Math.min(0.5, engineerCount * CONSTANTS.PRODUCT_DEV_ENGINEER_SPEEDUP);

    const totalRounds = (baseRounds + qualityFactor) * (1 - engineerSpeedup);

    return Math.max(1, Math.round(totalRounds));
  }

  /**
   * Create a new product (starts in development)
   * @param name Product name
   * @param segment Target market segment
   * @param targetQuality Target quality (50-100)
   * @param targetFeatures Target features (0-100)
   * @param roundsToComplete Rounds needed to complete development
   * @param ctx Engine context for deterministic ID generation
   */
  static createProduct(
    name: string,
    segment: Segment,
    targetQuality: number,
    targetFeatures: number,
    roundsToComplete: number = 2,
    ctx?: EngineContext
  ): Product {
    // New products start in development with reduced stats
    const startingQuality = Math.round(targetQuality * 0.5);  // 50% of target during dev
    const startingFeatures = Math.round(targetFeatures * 0.5);

    // Calculate unit cost
    const materialCost = CONSTANTS.RAW_MATERIAL_COST_PER_UNIT[segment];
    const laborCost = CONSTANTS.LABOR_COST_PER_UNIT;
    const overheadCost = CONSTANTS.OVERHEAD_COST_PER_UNIT;
    const qualityPremium = (targetQuality - 50) * 0.5;  // Higher quality = higher cost
    const unitCost = materialCost + laborCost + overheadCost + qualityPremium;

    // Deterministic ID generation using context, or fallback pattern
    const id = ctx
      ? ctx.idGenerator.next("product")
      : `prod-r0-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;

    return {
      id,
      name,
      segment,
      price: this.suggestPrice(segment, targetQuality),
      quality: startingQuality,
      features: startingFeatures,
      reliability: 50,  // Low reliability during development
      developmentRound: 0,
      developmentStatus: "in_development",
      developmentProgress: 0,
      targetQuality,
      targetFeatures,
      roundsRemaining: roundsToComplete,
      unitCost,
    };
  }

  /**
   * Create a new product from a phone archetype (new system).
   * Computes featureSet from team's unlocked techs × archetype emphasis multipliers.
   */
  static createArchetypeProduct(
    name: string,
    archetype: PhoneArchetype,
    unlockedTechs: string[],
    ctx?: EngineContext
  ): Product {
    // Calculate base feature set from unlocked techs
    const baseFeatures = RDExpansions.calculateProductFeatureSet(unlockedTechs);

    // Apply archetype emphasis multipliers
    const featureSet: ProductFeatureSet = emptyFeatureSet();
    for (const family of TECH_FAMILIES) {
      const emphasis = archetype.featureEmphasis[family] ?? 1.0;
      featureSet[family] = Math.min(100, Math.round(baseFeatures[family] * emphasis));
    }

    // Compute backward-compatible features score as weighted average
    // using segment preferences (so legacy scoring still works)
    const avgFeature = TECH_FAMILIES.reduce((sum, f) => sum + featureSet[f], 0) / TECH_FAMILIES.length;

    // Quality from archetype base + tech bonus
    const techBonusQuality = Math.min(
      10,
      unlockedTechs.length * 0.5 // Small quality bonus per researched tech
    );
    const quality = Math.min(100, Math.round(archetype.baseQuality + techBonusQuality));

    // Unit cost calculation
    const materialCost = CONSTANTS.RAW_MATERIAL_COST_PER_UNIT[archetype.primarySegment];
    const laborCost = CONSTANTS.LABOR_COST_PER_UNIT;
    const overheadCost = CONSTANTS.OVERHEAD_COST_PER_UNIT;
    const qualityPremium = (quality - 50) * 0.5;
    const unitCost = materialCost + laborCost + overheadCost + qualityPremium;

    // Suggested price from archetype range
    const priceRange = archetype.suggestedPriceRange;
    const qualityFactor = quality / 100;
    const suggestedPrice = Math.round(
      priceRange.min + (priceRange.max - priceRange.min) * qualityFactor
    );

    // Deterministic ID generation
    const id = ctx
      ? ctx.idGenerator.next("product")
      : `prod-r0-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;

    return {
      id,
      name,
      segment: archetype.primarySegment,
      price: suggestedPrice,
      quality: Math.round(quality * 0.5), // 50% during development
      features: Math.round(avgFeature * 0.5),
      reliability: 50,
      developmentRound: 0,
      developmentStatus: "in_development",
      developmentProgress: 0,
      targetQuality: quality,
      targetFeatures: Math.round(avgFeature),
      roundsRemaining: archetype.developmentRounds,
      unitCost,
      // New archetype fields
      archetypeId: archetype.id,
      featureSet,
      appliedTechs: [...unlockedTechs],
    };
  }

  /**
   * Suggest price based on segment and quality
   */
  static suggestPrice(segment: Segment, quality: number): number {
    const basePrices: Record<Segment, { min: number; max: number }> = {
      "Budget": { min: 100, max: 300 },
      "General": { min: 300, max: 600 },
      "Enthusiast": { min: 600, max: 1000 },
      "Professional": { min: 1000, max: 1500 },
      "Active Lifestyle": { min: 400, max: 800 },
    };

    const range = basePrices[segment];
    const qualityFactor = quality / 100;

    return Math.round(range.min + (range.max - range.min) * qualityFactor);
  }

  /**
   * Calculate product competitiveness score
   */
  static calculateProductScore(
    product: Product,
    segmentExpectations: { quality: number; features: number; price: number }
  ): number {
    // Quality score (40% weight)
    const qualityScore = (product.quality / segmentExpectations.quality) * 40;

    // Features score (30% weight)
    const featuresScore = (product.features / segmentExpectations.features) * 30;

    // Price score (30% weight) - lower is better
    const priceRatio = segmentExpectations.price / product.price;
    const priceScore = Math.min(1.5, priceRatio) * 20;

    // Reliability bonus
    const reliabilityBonus = (product.reliability / 100) * 10;

    return qualityScore + featuresScore + priceScore + reliabilityBonus;
  }

  // Dead code removed: calculateDevelopmentTime (duplicate of calculateDevelopmentRounds)

  /**
   * Calculate patent value
   * Patents provide competitive advantage
   * EXPLOIT-01: Gate bonuses behind active production — must sell units to benefit
   * @param patents Number of patents held
   * @param unitsSoldLastRound Total units sold last round (0 = no bonuses)
   */
  static calculatePatentValue(patents: number, unitsSoldLastRound: number = 10_000): {
    qualityBonus: number;
    costReduction: number;
    marketShareBonus: number;
  } {
    // v3.1.0: Boosted patent rewards to make R&D strategy viable (Fix 3.1)
    // EXPLOIT-01: Scale bonuses by production — need ≥PATENT_PRODUCTION_GATE_UNITS for full effect
    const productionGate = Math.min(1.0, unitsSoldLastRound / CONSTANTS.PATENT_PRODUCTION_GATE_UNITS);
    return {
      qualityBonus: Math.min(CONSTANTS.PATENT_QUALITY_BONUS_MAX, patents * 5) * productionGate,
      costReduction: Math.min(CONSTANTS.PATENT_COST_REDUCTION_MAX, patents * 0.05) * productionGate,
      marketShareBonus: Math.min(CONSTANTS.PATENT_SHARE_BONUS_MAX, patents * 0.03) * productionGate,
    };
  }

  /**
   * Generate R&D project recommendations
   */
  static generateRecommendations(
    state: TeamState
  ): Array<{
    type: "new_product" | "improvement" | "patent_focus";
    description: string;
    estimatedCost: number;
    estimatedBenefit: string;
  }> {
    const recommendations = [];

    // Check for segment gaps
    for (const segment of CONSTANTS.SEGMENTS) {
      const hasProduct = state.products.some(p => p.segment === segment);
      if (!hasProduct) {
        recommendations.push({
          type: "new_product" as const,
          description: `Develop product for ${segment} segment`,
          estimatedCost: this.calculateDevelopmentCost(segment, 70),
          estimatedBenefit: `Access to ${segment} market`,
        });
      }
    }

    // Check for quality improvements
    for (const product of state.products) {
      if (product.quality < 80) {
        recommendations.push({
          type: "improvement" as const,
          description: `Improve ${product.name} quality`,
          estimatedCost: this.calculateImprovementCost(15, 0),
          estimatedBenefit: "+15 quality, improved market position",
        });
      }
    }

    // Patent accumulation
    if (state.patents < 3) {
      recommendations.push({
        type: "patent_focus" as const,
        description: "Focus on patent development",
        estimatedCost: 10_000_000,
        estimatedBenefit: "Long-term competitive advantage",
      });
    }

    return recommendations;
  }
}
