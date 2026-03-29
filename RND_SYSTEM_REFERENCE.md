# BIZZSIMSIM V2 — R&D System Complete Reference

> Every function, type, constant, formula, and data flow in the R&D module.

---


---

## FILE: engine/modules/RDModule.ts

```typescript
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
    // v5.2: R&D budget investment reduces aging decay (higher rdBudget = slower decay)
    // This creates the "early R&D compounds" pedagogical effect
    const rdBudgetProtection = decisions.rdBudget
      ? Math.min(0.7, (decisions.rdBudget / 15_000_000) * 0.7) // $15M = 70% decay reduction
      : 0;
    const improvedProductIds = new Set(
      (decisions.productImprovements || []).map(imp => imp.productId)
    );
    for (const product of newState.products) {
      if (product.developmentStatus === "launched") {
        const wasImproved = improvedProductIds.has(product.id);
        const improveFactor = wasImproved ? 0.3 : 1.0;
        const rdProtectionFactor = 1.0 - rdBudgetProtection; // 0.3 to 1.0
        const agingFactor = improveFactor * rdProtectionFactor;
        const qualityDecay = 0.5 * agingFactor;
        const featureDecay = 0.3 * agingFactor;
        product.quality = Math.max(10, product.quality - qualityDecay);
        product.features = Math.max(5, product.features - featureDecay);
        if (!wasImproved && rdBudgetProtection === 0) {
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

    // Check if a production line already exists for this product
    const existingLine = factory.productionLines.find(l => l.productId === product.id);
    if (existingLine) return;

    // Check if there's an idle line we can assign to
    const idleLine = factory.productionLines.find(l => l.status === "idle" && !l.productId);
    if (idleLine) {
      idleLine.productId = product.id;
      idleLine.segment = product.segment as import("../types/factory").Segment;
      idleLine.status = "active";
      const activeCount = Math.max(1, factory.productionLines.filter(l => l.productId).length);
      idleLine.targetOutput = Math.floor((factory.baseCapacity || 25000) / activeCount);
      if (!idleLine.assignedWorkers) idleLine.assignedWorkers = Math.floor((factory.workers || 0) / activeCount);
      if (!idleLine.assignedEngineers) idleLine.assignedEngineers = Math.floor((factory.engineers || 0) / activeCount);
      if (!idleLine.assignedSupervisors) idleLine.assignedSupervisors = Math.floor((factory.supervisors || 0) / activeCount);
      return;
    }

    // Create a new full production line
    const activeCount = Math.max(1, factory.productionLines.filter(l => l.productId).length + 1);
    factory.productionLines.push({
      id: `line-${product.segment.toLowerCase().replace(/\s+/g, "-")}-${factory.productionLines.length + 1}`,
      factoryId: factory.id,
      segment: product.segment as import("../types/factory").Segment,
      productId: product.id,
      targetOutput: Math.floor((factory.baseCapacity || 25000) / activeCount),
      assignedMachines: [],
      assignedWorkers: Math.floor((factory.workers || 0) / activeCount),
      assignedEngineers: Math.floor((factory.engineers || 0) / activeCount),
      assignedSupervisors: Math.floor((factory.supervisors || 0) / activeCount),
      status: "active",
      changeoverRoundsRemaining: 0,
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
```

---

## FILE: engine/modules/RDExpansions.ts

```typescript
/**
 * R&D Module Expansions
 *
 * Additional R&D systems for tech trees, platform strategy,
 * risk mechanics, and research spillover.
 *
 * Phase 8: R&D Module Expansions
 */

import type { Segment } from "../types/factory";
import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export type TechFamily = "battery" | "camera" | "ai" | "durability" | "display" | "connectivity";
export type TechTier = 1 | 2 | 3 | 4 | 5;
export type RiskLevel = "conservative" | "moderate" | "aggressive";

export type TechEffectType =
  | "quality_bonus"
  | "feature_unlock"
  | "cost_reduction"
  | "dev_speed"
  | "segment_bonus"
  | "family_bonus"; // Cross-family: grants points in another tech family

export interface TechNode {
  id: string;
  name: string;
  family: TechFamily;
  tier: TechTier;
  /** AND prerequisites - all must be met */
  prerequisites: string[];
  /** OR prerequisite groups - any ONE group must be fully met (optional) */
  prerequisitesOr?: string[][];
  researchCost: number;
  researchRounds: number;
  effects: TechEffect[];
  description: string;
  /** Phone archetypes this node helps unlock */
  unlocksArchetypes?: string[];
  /** Segments that benefit most from this tech */
  bestSegments?: Segment[];
}

export interface TechEffect {
  type: TechEffectType;
  segment?: Segment;
  /** For family_bonus: which family receives the bonus */
  targetFamily?: TechFamily;
  value: number;
}

export interface TechTreeState {
  unlockedTechs: string[];
  activeResearch: ActiveResearch[];
  completedResearch: CompletedResearch[];
  researchPoints: number;
  techLevel: number; // Overall tech level 1-10
}

export interface ActiveResearch {
  techId: string;
  roundsRemaining: number;
  investmentSoFar: number;
  riskLevel: RiskLevel;
  delayedRounds: number;
  costOverrun: number;
}

export interface CompletedResearch {
  techId: string;
  roundCompleted: number;
  totalCost: number;
  hadDelay: boolean;
  hadOverrun: boolean;
}

export interface Platform {
  id: string;
  name: string;
  investmentCost: number;
  developedSegments: Segment[];
  costReduction: number;
  devSpeedBonus: number;
  qualityFloor: number;
  roundCreated: number;
}

export interface PlatformState {
  platforms: Platform[];
  activePlatformId: string | null;
  platformInvestment: number;
}

export interface RDRiskEvent {
  type: "delay" | "cost_overrun" | "breakthrough" | "failure";
  projectId: string;
  magnitude: number;
  message: string;
}

export interface ResearchSpillover {
  sourceProjectId: string;
  targetSegments: Segment[];
  qualityBonus: number;
  featureBonus: number;
}

export interface RDExpansionResult {
  techTree: TechTreeState;
  platforms: PlatformState;
  newTechsUnlocked: TechNode[];
  riskEvents: RDRiskEvent[];
  spillovers: ResearchSpillover[];
  totalRDBonus: number;
  qualityBonusBySegment: Record<Segment, number>;
  messages: string[];
  warnings: string[];
}

export interface RDExpansionDecisions {
  newResearchProjects: { techId: string; riskLevel: RiskLevel }[];
  platformInvestment: number;
  newPlatformSegments: Segment[];
  riskTolerance: RiskLevel;
}

// ============================================
// TECH TREE DEFINITIONS - 54 nodes (9 per family × 6 families, 5 tiers)
// Source: Simsim_Complete_Design_Document.docx Section 2.3
// ============================================

const TECH_TREE: TechNode[] = [
  // =============== BATTERY FAMILY ===============
  { id: "bat_1a", name: "Extended Battery", family: "battery", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Improved battery life technology", unlocksArchetypes: ["long_life_phone", "gaming_phone"], bestSegments: ["Budget", "Active Lifestyle"] },
  { id: "bat_1b", name: "Power Management", family: "battery", tier: 1, prerequisites: [], researchCost: 4_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.03 }], description: "Efficient power management chipset", bestSegments: ["Budget"] },
  { id: "bat_2a", name: "Fast Charging", family: "battery", tier: 2, prerequisites: ["bat_1a"], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "feature_unlock", value: 1 }], description: "Rapid charging capability", unlocksArchetypes: ["fast_charge_pro"], bestSegments: ["General"] },
  { id: "bat_2b", name: "Wireless Charging", family: "battery", tier: 2, prerequisites: ["bat_1b"], researchCost: 7_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 10 }], description: "Qi wireless charging support", bestSegments: ["General"] },
  { id: "bat_3a", name: "Graphene Battery", family: "battery", tier: 3, prerequisites: ["bat_2a"], researchCost: 15_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 20 }, { type: "cost_reduction", value: 0.05 }], description: "Graphene-based battery cells", unlocksArchetypes: ["ultra_endurance"], bestSegments: ["Budget", "Active Lifestyle"] },
  { id: "bat_3b", name: "Solar Charging", family: "battery", tier: 3, prerequisites: ["bat_2b"], researchCost: 12_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.08 }], description: "Integrated solar charging panel", bestSegments: ["Active Lifestyle"] },
  { id: "bat_4a", name: "Solid State Battery", family: "battery", tier: 4, prerequisites: ["bat_3a"], researchCost: 25_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }], description: "Revolutionary solid-state battery", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },
  { id: "bat_4b", name: "Energy Harvesting", family: "battery", tier: 4, prerequisites: ["bat_3b"], researchCost: 20_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "segment_bonus", segment: "Budget", value: 0.10 }], description: "Ambient energy harvesting", unlocksArchetypes: ["peoples_phone"], bestSegments: ["Budget"] },
  { id: "bat_5", name: "Perpetual Power", family: "battery", tier: 5, prerequisites: [], prerequisitesOr: [["bat_4a"], ["bat_4b"]], researchCost: 40_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.08 }, { type: "dev_speed", value: 0.10 }], description: "Near-infinite battery technology", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },

  // =============== CAMERA FAMILY ===============
  { id: "cam_1a", name: "Enhanced Optics", family: "camera", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Improved camera optics and sensor", unlocksArchetypes: ["snapshot_phone", "camera_phone"], bestSegments: ["General", "Enthusiast"] },
  { id: "cam_1b", name: "Wide Angle Lens", family: "camera", tier: 1, prerequisites: [], researchCost: 4_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "General", value: 0.05 }], description: "Ultra-wide angle lens system", bestSegments: ["General"] },
  { id: "cam_2a", name: "Night Vision", family: "camera", tier: 2, prerequisites: ["cam_1a"], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }], description: "Low-light photography enhancement", bestSegments: ["Enthusiast"] },
  { id: "cam_2b", name: "Computational Photography", family: "camera", tier: 2, prerequisites: [], prerequisitesOr: [["cam_1a"], ["cam_1b"]], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "feature_unlock", value: 1 }], description: "AI-powered image processing", unlocksArchetypes: ["camera_phone"], bestSegments: ["Enthusiast"] },
  { id: "cam_3a", name: "8K Video", family: "camera", tier: 3, prerequisites: [], prerequisitesOr: [["cam_2a"], ["cam_2b"]], researchCost: 15_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Enthusiast", value: 0.10 }], description: "8K video recording capability", unlocksArchetypes: ["photo_flagship"], bestSegments: ["Enthusiast"] },
  { id: "cam_3b", name: "3D Depth Sensing", family: "camera", tier: 3, prerequisites: ["cam_2b"], researchCost: 12_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "ai", value: 10 }], description: "3D depth mapping for AR and photography", bestSegments: ["Professional"] },
  { id: "cam_4a", name: "Pro Cinema Suite", family: "camera", tier: 4, prerequisites: ["cam_3a"], researchCost: 25_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Professional", value: 0.12 }], description: "Professional-grade cinema recording", unlocksArchetypes: ["creator_phone"], bestSegments: ["Professional"] },
  { id: "cam_4b", name: "Holographic Capture", family: "camera", tier: 4, prerequisites: ["cam_3b"], researchCost: 22_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "display", value: 10 }], description: "Holographic video capture", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Enthusiast", "Professional"] },
  { id: "cam_5", name: "Quantum Imaging", family: "camera", tier: 5, prerequisites: [], prerequisitesOr: [["cam_4a"], ["cam_4b"]], researchCost: 40_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 15 }], description: "Quantum-enhanced imaging sensor", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },

  // =============== AI FAMILY ===============
  { id: "ai_1a", name: "Smart Assistant", family: "ai", tier: 1, prerequisites: [], researchCost: 5_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Basic AI assistant features", unlocksArchetypes: ["smart_companion", "business_phone"], bestSegments: ["General", "Professional"] },
  { id: "ai_1b", name: "Predictive Text", family: "ai", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }], description: "AI-powered text prediction", bestSegments: ["General"] },
  { id: "ai_2a", name: "On-Device ML", family: "ai", tier: 2, prerequisites: ["ai_1a"], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "dev_speed", value: 0.05 }], description: "On-device machine learning", unlocksArchetypes: ["ai_assistant_phone"], bestSegments: ["Professional"] },
  { id: "ai_2b", name: "Context Awareness", family: "ai", tier: 2, prerequisites: [], prerequisitesOr: [["ai_1a"], ["ai_1b"]], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Professional", value: 0.08 }], description: "Contextual user experience", bestSegments: ["Professional"] },
  { id: "ai_3a", name: "Autonomous Agent", family: "ai", tier: 3, prerequisites: ["ai_2a"], researchCost: 18_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "feature_unlock", value: 1 }], description: "AI agent that handles tasks proactively", unlocksArchetypes: ["ai_powerhouse", "creator_phone"], bestSegments: ["Professional"] },
  { id: "ai_3b", name: "Emotion Recognition", family: "ai", tier: 3, prerequisites: ["ai_2b"], researchCost: 14_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "segment_bonus", segment: "General", value: 0.08 }], description: "Emotional intelligence for UX", bestSegments: ["General"] },
  { id: "ai_4a", name: "Neural Processing Unit", family: "ai", tier: 4, prerequisites: ["ai_3a"], researchCost: 28_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.06 }, { type: "dev_speed", value: 0.08 }], description: "Dedicated neural processing hardware", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Professional"] },
  { id: "ai_4b", name: "Adaptive UX", family: "ai", tier: 4, prerequisites: [], prerequisitesOr: [["ai_3a"], ["ai_3b"]], researchCost: 22_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "battery", value: 5 }, { type: "family_bonus", targetFamily: "camera", value: 5 }, { type: "family_bonus", targetFamily: "durability", value: 5 }, { type: "family_bonus", targetFamily: "display", value: 5 }, { type: "family_bonus", targetFamily: "connectivity", value: 5 }], description: "Adaptive UX that boosts all systems", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },
  { id: "ai_5", name: "Sentient OS", family: "ai", tier: 5, prerequisites: [], prerequisitesOr: [["ai_4a"], ["ai_4b"]], researchCost: 45_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Professional", value: 0.15 }], description: "Fully sentient operating system", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Professional"] },

  // =============== DURABILITY FAMILY ===============
  { id: "dur_1a", name: "Gorilla Glass", family: "durability", tier: 1, prerequisites: [], researchCost: 2_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Enhanced screen durability", unlocksArchetypes: ["outdoor_basic", "rugged_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "dur_1b", name: "Rubber Armor", family: "durability", tier: 1, prerequisites: [], researchCost: 2_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.05 }], description: "Shock-absorbing rubber casing", bestSegments: ["Active Lifestyle"] },
  { id: "dur_2a", name: "IP68 Water Resist", family: "durability", tier: 2, prerequisites: [], prerequisitesOr: [["dur_1a"], ["dur_1b"]], researchCost: 6_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }], description: "IP68 water and dust resistance", unlocksArchetypes: ["rugged_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "dur_2b", name: "Shock Absorption", family: "durability", tier: 2, prerequisites: ["dur_1b"], researchCost: 5_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.03 }], description: "Advanced shock absorption system", bestSegments: ["Active Lifestyle", "Budget"] },
  { id: "dur_3a", name: "MIL-STD Certified", family: "durability", tier: 3, prerequisites: ["dur_2a"], researchCost: 12_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.12 }], description: "MIL-STD-810G certification", unlocksArchetypes: ["adventure_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "dur_3b", name: "Self-Healing Materials", family: "durability", tier: 3, prerequisites: [], prerequisitesOr: [["dur_2a"], ["dur_2b"]], researchCost: 14_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }], description: "Self-repairing polymer coating", bestSegments: ["Active Lifestyle"] },
  { id: "dur_4a", name: "Extreme Environment", family: "durability", tier: 4, prerequisites: ["dur_3a"], researchCost: 20_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.10 }, { type: "segment_bonus", segment: "Professional", value: 0.08 }], description: "Extreme temperature and pressure resistance", unlocksArchetypes: ["explorer_phone"], bestSegments: ["Active Lifestyle", "Professional"] },
  { id: "dur_4b", name: "Titanium Frame", family: "durability", tier: 4, prerequisites: ["dur_3b"], researchCost: 18_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }], description: "Aerospace-grade titanium chassis", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Professional"] },
  { id: "dur_5", name: "Indestructible", family: "durability", tier: 5, prerequisites: [], prerequisitesOr: [["dur_4a"], ["dur_4b"]], researchCost: 35_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.15 }], description: "Virtually indestructible construction", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Active Lifestyle"] },

  // =============== DISPLAY FAMILY ===============
  { id: "dsp_1a", name: "OLED Display", family: "display", tier: 1, prerequisites: [], researchCost: 4_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Premium OLED display", unlocksArchetypes: ["cinema_screen", "gaming_phone"], bestSegments: ["General", "Enthusiast"] },
  { id: "dsp_1b", name: "High Brightness", family: "display", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }], description: "Sunlight-readable high brightness display", bestSegments: ["Active Lifestyle"] },
  { id: "dsp_2a", name: "120Hz Refresh", family: "display", tier: 2, prerequisites: ["dsp_1a"], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Enthusiast", value: 0.08 }], description: "120Hz+ display refresh rate", unlocksArchetypes: ["gaming_phone", "photo_flagship"], bestSegments: ["Enthusiast"] },
  { id: "dsp_2b", name: "Always-On Display", family: "display", tier: 2, prerequisites: [], prerequisitesOr: [["dsp_1a"], ["dsp_1b"]], researchCost: 6_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "battery", value: -5 }], description: "Always-on display (trades battery life)", bestSegments: ["General"] },
  { id: "dsp_3a", name: "Adaptive ProMotion", family: "display", tier: 3, prerequisites: ["dsp_2a"], researchCost: 14_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "family_bonus", targetFamily: "battery", value: 5 }, { type: "cost_reduction", value: 0.04 }], description: "Variable refresh rate display", bestSegments: ["Enthusiast"] },
  { id: "dsp_3b", name: "Under-Display Camera", family: "display", tier: 3, prerequisites: [], prerequisitesOr: [["dsp_2a"], ["dsp_2b"]], researchCost: 12_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "camera", value: 5 }], description: "Camera hidden under the display", bestSegments: ["Enthusiast"] },
  { id: "dsp_4a", name: "Micro-LED", family: "display", tier: 4, prerequisites: ["dsp_3a"], researchCost: 22_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.06 }], description: "Next-generation micro-LED display", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Enthusiast", "Professional"] },
  { id: "dsp_4b", name: "Foldable Display", family: "display", tier: 4, prerequisites: [], prerequisitesOr: [["dsp_3a"], ["dsp_3b"]], researchCost: 28_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "feature_unlock", value: 1 }], description: "Foldable display technology", unlocksArchetypes: ["foldable_phone"], bestSegments: ["Enthusiast"] },
  { id: "dsp_5", name: "Holographic Display", family: "display", tier: 5, prerequisites: [], prerequisitesOr: [["dsp_4a"], ["dsp_4b"]], researchCost: 45_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }], description: "Holographic 3D display", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },

  // =============== CONNECTIVITY FAMILY ===============
  { id: "con_1a", name: "5G Modem", family: "connectivity", tier: 1, prerequisites: [], researchCost: 5_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "5G connectivity", unlocksArchetypes: ["connected_phone", "business_phone"], bestSegments: ["General", "Professional"] },
  { id: "con_1b", name: "WiFi 6", family: "connectivity", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }], description: "WiFi 6 support", bestSegments: ["General"] },
  { id: "con_2a", name: "mmWave 5G", family: "connectivity", tier: 2, prerequisites: ["con_1a"], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Professional", value: 0.08 }], description: "Millimeter wave 5G for ultra speeds", unlocksArchetypes: ["business_phone", "ai_powerhouse"], bestSegments: ["Professional"] },
  { id: "con_2b", name: "WiFi 6E", family: "connectivity", tier: 2, prerequisites: ["con_1b"], researchCost: 6_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "dev_speed", value: 0.03 }], description: "Next-gen WiFi 6E technology", bestSegments: ["General"] },
  { id: "con_3a", name: "Satellite SOS", family: "connectivity", tier: 3, prerequisites: ["con_2a"], researchCost: 18_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.10 }], description: "Emergency satellite connectivity", unlocksArchetypes: ["adventure_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "con_3b", name: "UWB Precision", family: "connectivity", tier: 3, prerequisites: [], prerequisitesOr: [["con_2a"], ["con_2b"]], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 10 }, { type: "feature_unlock", value: 1 }], description: "Ultra-wideband precision location", bestSegments: ["General"] },
  { id: "con_4a", name: "LEO Satellite", family: "connectivity", tier: 4, prerequisites: ["con_3a"], researchCost: 30_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Professional", value: 0.10 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.10 }], description: "Low-earth orbit satellite broadband", unlocksArchetypes: ["explorer_phone"], bestSegments: ["Professional", "Active Lifestyle"] },
  { id: "con_4b", name: "Mesh Networking", family: "connectivity", tier: 4, prerequisites: ["con_3b"], researchCost: 15_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Budget", value: 0.08 }], description: "Peer-to-peer mesh networking", unlocksArchetypes: ["peoples_phone"], bestSegments: ["Budget"] },
  { id: "con_5", name: "Quantum Communication", family: "connectivity", tier: 5, prerequisites: [], prerequisitesOr: [["con_4a"], ["con_4b"]], researchCost: 50_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Professional", value: 0.12 }], description: "Quantum-encrypted communication", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Professional"] },
];

// ============================================
// CONSTANTS
// ============================================

const RISK_DELAY_PROBABILITIES: Record<RiskLevel, number> = {
  conservative: 0.05,
  moderate: 0.15,
  aggressive: 0.30,
};

const RISK_OVERRUN_PROBABILITIES: Record<RiskLevel, number> = {
  conservative: 0.05,
  moderate: 0.20,
  aggressive: 0.40,
};

const PLATFORM_BASE_COST = 50_000_000;
const PLATFORM_COST_REDUCTION = 0.25; // 25% savings for products on platform
const PLATFORM_DEV_SPEED_BONUS = 0.2; // 20% faster development
const SPILLOVER_RATE = 0.2; // 20% of improvements transfer

// ============================================
// ENGINE
// ============================================

export class RDExpansions {
  /**
   * Process R&D expansions for a round
   */
  static processRDExpansions(
    state: TeamState,
    decisions: RDExpansionDecisions,
    previousTechTree: TechTreeState | null,
    previousPlatforms: PlatformState | null,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): RDExpansionResult {
    const messages: string[] = [];
    const warnings: string[] = [];

    // Check if tech trees are enabled
    if (!config.difficulty.complexity.techTrees) {
      return this.getDisabledResult();
    }

    // Process tech tree
    const { techTree, newTechs, riskEvents } = this.processTechTree(
      previousTechTree,
      decisions,
      round,
      config,
      ctx
    );

    // Process platforms
    const platforms = this.processPlatforms(
      previousPlatforms,
      decisions,
      round
    );

    // Calculate spillovers
    const spillovers = this.calculateSpillovers(newTechs, state);

    // Calculate bonuses
    const { totalRDBonus, qualityBonusBySegment } = this.calculateBonuses(
      techTree,
      platforms
    );

    // Generate messages
    for (const tech of newTechs) {
      messages.push(`Research completed: ${tech.name}`);
    }

    for (const event of riskEvents) {
      if (event.type === "delay") {
        warnings.push(event.message);
      } else if (event.type === "cost_overrun") {
        warnings.push(event.message);
      } else if (event.type === "breakthrough") {
        messages.push(event.message);
      }
    }

    if (techTree.activeResearch.length > 0) {
      const projectNames = techTree.activeResearch
        .map((r) => TECH_TREE.find((t) => t.id === r.techId)?.name)
        .filter(Boolean)
        .join(", ");
      messages.push(`Active research: ${projectNames}`);
    }

    return {
      techTree,
      platforms,
      newTechsUnlocked: newTechs,
      riskEvents,
      spillovers,
      totalRDBonus,
      qualityBonusBySegment,
      messages,
      warnings,
    };
  }

  /**
   * Get result when tech trees are disabled
   */
  private static getDisabledResult(): RDExpansionResult {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const qualityBonusBySegment: Record<Segment, number> = {} as Record<Segment, number>;
    for (const segment of segments) {
      qualityBonusBySegment[segment] = 0;
    }

    return {
      techTree: this.initializeTechTree(),
      platforms: this.initializePlatforms(),
      newTechsUnlocked: [],
      riskEvents: [],
      spillovers: [],
      totalRDBonus: 0,
      qualityBonusBySegment,
      messages: [],
      warnings: [],
    };
  }

  /**
   * Process tech tree research
   */
  private static processTechTree(
    previous: TechTreeState | null,
    decisions: RDExpansionDecisions,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): { techTree: TechTreeState; newTechs: TechNode[]; riskEvents: RDRiskEvent[] } {
    const techTree: TechTreeState = previous
      ? {
          ...previous,
          activeResearch: [...previous.activeResearch],
          completedResearch: [...previous.completedResearch],
          unlockedTechs: [...previous.unlockedTechs],
        }
      : this.initializeTechTree();

    const newTechs: TechNode[] = [];
    const riskEvents: RDRiskEvent[] = [];

    // Process active research
    techTree.activeResearch = techTree.activeResearch.filter((research) => {
      research.roundsRemaining--;

      // Check for risk events
      const delayProb = RISK_DELAY_PROBABILITIES[research.riskLevel];
      if (ctx.rng.rd.chance(delayProb)) {
        research.roundsRemaining++;
        research.delayedRounds++;
        riskEvents.push({
          type: "delay",
          projectId: research.techId,
          magnitude: 1,
          message: `Research delayed: ${TECH_TREE.find((t) => t.id === research.techId)?.name}`,
        });
      }

      const overrunProb = RISK_OVERRUN_PROBABILITIES[research.riskLevel];
      if (ctx.rng.rd.chance(overrunProb)) {
        const tech = TECH_TREE.find((t) => t.id === research.techId);
        const overrunAmount = (tech?.researchCost ?? 0) * ctx.rng.rd.range(0.1, 0.3);
        research.costOverrun += overrunAmount;
        riskEvents.push({
          type: "cost_overrun",
          projectId: research.techId,
          magnitude: overrunAmount,
          message: `Cost overrun: ${tech?.name} (+$${(overrunAmount / 1_000_000).toFixed(1)}M)`,
        });
      }

      // Check for completion
      if (research.roundsRemaining <= 0) {
        const tech = TECH_TREE.find((t) => t.id === research.techId);
        if (tech) {
          newTechs.push(tech);
          techTree.unlockedTechs.push(tech.id);
          techTree.completedResearch.push({
            techId: tech.id,
            roundCompleted: round,
            totalCost: research.investmentSoFar + research.costOverrun,
            hadDelay: research.delayedRounds > 0,
            hadOverrun: research.costOverrun > 0,
          });

          // Update tech level
          techTree.techLevel = Math.min(10, techTree.techLevel + tech.tier * 0.3);
        }
        return false;
      }
      return true;
    });

    // Start new research projects
    for (const { techId, riskLevel } of decisions.newResearchProjects) {
      const tech = TECH_TREE.find((t) => t.id === techId);
      if (!tech) continue;

      // Check AND prerequisites
      const andPrereqsMet = tech.prerequisites.every((p) =>
        techTree.unlockedTechs.includes(p)
      );
      if (!andPrereqsMet) continue;

      // Check OR prerequisites (if defined, at least one group must be fully met)
      if (tech.prerequisitesOr && tech.prerequisitesOr.length > 0) {
        const orPrereqsMet = tech.prerequisitesOr.some((group) =>
          group.every((p) => techTree.unlockedTechs.includes(p))
        );
        if (!orPrereqsMet) continue;
      }

      const prereqsMet = true; // Already validated above

      // Check if already researching or completed
      const alreadyActive = techTree.activeResearch.some((r) => r.techId === techId);
      const alreadyCompleted = techTree.unlockedTechs.includes(techId);
      if (alreadyActive || alreadyCompleted) continue;

      techTree.activeResearch.push({
        techId,
        roundsRemaining: tech.researchRounds,
        investmentSoFar: tech.researchCost,
        riskLevel,
        delayedRounds: 0,
        costOverrun: 0,
      });
    }

    return { techTree, newTechs, riskEvents };
  }

  /**
   * Process platform strategy
   */
  private static processPlatforms(
    previous: PlatformState | null,
    decisions: RDExpansionDecisions,
    round: number
  ): PlatformState {
    const platforms: PlatformState = previous
      ? { ...previous, platforms: [...previous.platforms] }
      : this.initializePlatforms();

    platforms.platformInvestment += decisions.platformInvestment;

    // Create new platform if enough investment
    if (
      platforms.platformInvestment >= PLATFORM_BASE_COST &&
      decisions.newPlatformSegments.length > 0
    ) {
      const newPlatform: Platform = {
        id: `platform_${round}`,
        name: `Platform Gen ${platforms.platforms.length + 1}`,
        investmentCost: PLATFORM_BASE_COST,
        developedSegments: decisions.newPlatformSegments,
        costReduction: PLATFORM_COST_REDUCTION,
        devSpeedBonus: PLATFORM_DEV_SPEED_BONUS,
        qualityFloor: 60,
        roundCreated: round,
      };

      platforms.platforms.push(newPlatform);
      platforms.activePlatformId = newPlatform.id;
      platforms.platformInvestment -= PLATFORM_BASE_COST;
    }

    return platforms;
  }

  /**
   * Calculate research spillovers
   */
  private static calculateSpillovers(
    newTechs: TechNode[],
    state: TeamState
  ): ResearchSpillover[] {
    const spillovers: ResearchSpillover[] = [];

    for (const tech of newTechs) {
      // Find segments that benefit from spillover
      const segmentEffects = tech.effects.filter(
        (e) => e.type === "quality_bonus" || e.type === "segment_bonus"
      );

      if (segmentEffects.length > 0) {
        const targetSegments: Segment[] = segmentEffects
          .filter((e) => e.segment)
          .map((e) => e.segment as Segment);

        if (targetSegments.length === 0) {
          // General improvement spills to adjacent segments
          targetSegments.push("General");
        }

        const qualityBonus =
          segmentEffects
            .filter((e) => e.type === "quality_bonus")
            .reduce((sum, e) => sum + e.value, 0) * SPILLOVER_RATE;

        if (qualityBonus > 0) {
          spillovers.push({
            sourceProjectId: tech.id,
            targetSegments,
            qualityBonus,
            featureBonus: 0,
          });
        }
      }
    }

    return spillovers;
  }

  /**
   * Calculate R&D bonuses from tech tree
   */
  private static calculateBonuses(
    techTree: TechTreeState,
    platforms: PlatformState
  ): { totalRDBonus: number; qualityBonusBySegment: Record<Segment, number> } {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const qualityBonusBySegment: Record<Segment, number> = {} as Record<Segment, number>;

    for (const segment of segments) {
      qualityBonusBySegment[segment] = 0;
    }

    let totalRDBonus = 0;

    // Apply unlocked tech effects
    for (const techId of techTree.unlockedTechs) {
      const tech = TECH_TREE.find((t) => t.id === techId);
      if (!tech) continue;

      for (const effect of tech.effects) {
        if (effect.type === "quality_bonus") {
          if (effect.segment) {
            qualityBonusBySegment[effect.segment] += effect.value;
          } else {
            // Apply to all segments
            for (const segment of segments) {
              qualityBonusBySegment[segment] += effect.value;
            }
          }
        }

        if (effect.type === "dev_speed") {
          totalRDBonus += effect.value * 100;
        }
      }
    }

    // Tech level bonus
    totalRDBonus += techTree.techLevel * 20;

    return { totalRDBonus, qualityBonusBySegment };
  }

  /**
   * Initialize tech tree state
   */
  static initializeTechTree(): TechTreeState {
    return {
      unlockedTechs: [],
      activeResearch: [],
      completedResearch: [],
      researchPoints: 0,
      techLevel: 1,
    };
  }

  /**
   * Initialize platform state
   */
  static initializePlatforms(): PlatformState {
    return {
      platforms: [],
      activePlatformId: null,
      platformInvestment: 0,
    };
  }

  /**
   * Get all available tech nodes
   */
  static getTechTree(): TechNode[] {
    return TECH_TREE;
  }

  /**
   * Get available research options (supports AND + OR prerequisites)
   */
  static getAvailableResearch(unlockedTechs: string[]): TechNode[] {
    return TECH_TREE.filter((tech) => {
      // Not already unlocked
      if (unlockedTechs.includes(tech.id)) return false;

      // AND prerequisites met
      if (!tech.prerequisites.every((p) => unlockedTechs.includes(p))) return false;

      // OR prerequisites met (if defined)
      if (tech.prerequisitesOr && tech.prerequisitesOr.length > 0) {
        const orMet = tech.prerequisitesOr.some((group) =>
          group.every((p) => unlockedTechs.includes(p))
        );
        if (!orMet) return false;
      }

      return true;
    });
  }

  /**
   * Calculate a product's feature set from unlocked technologies.
   * Each tech node contributes to its family based on effects.
   * Tier contribution: +20 per node (from family_bonus or quality_bonus effects).
   */
  static calculateProductFeatureSet(
    unlockedTechs: string[]
  ): Record<TechFamily, number> {
    const families: TechFamily[] = ["battery", "camera", "ai", "durability", "display", "connectivity"];
    const features: Record<TechFamily, number> = {
      battery: 0, camera: 0, ai: 0, durability: 0, display: 0, connectivity: 0,
    };

    for (const techId of unlockedTechs) {
      const tech = TECH_TREE.find((t) => t.id === techId);
      if (!tech) continue;

      // Each unlocked tech contributes to its own family
      // We look at effects for the contribution value
      for (const effect of tech.effects) {
        if (effect.type === "family_bonus" && effect.targetFamily) {
          // Cross-family bonus
          features[effect.targetFamily] = Math.min(100, features[effect.targetFamily] + effect.value);
        }
      }

      // Direct family contribution based on the primary effect value
      // Use the first effect's value or a tier-based default
      const primaryEffect = tech.effects.find(
        (e) => e.type === "quality_bonus" && !e.segment
      );
      const contribution = primaryEffect ? primaryEffect.value : 0;

      // Add the main tech contribution to its own family
      // Note: the TECH_TREE nodes' effects encode the contribution values directly
      // For legacy 18-node tree, we use a generic approach
      features[tech.family] = Math.min(100, features[tech.family] + contribution);
    }

    return features;
  }

  /**
   * Get tech node by ID
   */
  static getTechNode(techId: string): TechNode | undefined {
    return TECH_TREE.find((t) => t.id === techId);
  }
}

```

---

## FILE: engine/modules/PatentEngine.ts

```typescript
/**
 * Patent Engine - Cross-team patent resolution system
 *
 * Processes patent filing, licensing, challenges, and blocking.
 * Called between R&D processing and market simulation so blocking
 * penalties can affect product scores.
 */

import type { TechFamily, TechTier } from "./RDExpansions";
import { RDExpansions } from "./RDExpansions";
import type {
  Patent,
  PatentDecisions,
  PatentResolutionResult,
} from "../types/patents";
import {
  PATENT_FILING_COST,
  PATENT_DURATION,
  PATENT_EXCLUSIVE_BONUS,
  PATENT_BLOCKING_POWER,
  PATENT_CHALLENGE_COST,
  PATENT_CHALLENGE_SUCCESS_RATE,
  PATENT_LICENSE_FEE,
} from "../types/patents";
import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";

// ============================================
// PATENT REGISTRY (shared across teams per game)
// ============================================

export interface PatentRegistry {
  patents: Patent[];
  /** Track which tech has been patented first (first-to-file) */
  filedTechs: Record<string, string>; // techId → ownerTeamId
}

export function initializePatentRegistry(): PatentRegistry {
  return { patents: [], filedTechs: {} };
}

// ============================================
// ENGINE
// ============================================

export class PatentEngine {
  /**
   * Process all patent decisions for all teams in a round.
   * Must be called AFTER R&D processing (so new techs are unlocked)
   * and BEFORE market simulation (so blocking penalties are applied).
   */
  static processRound(
    registry: PatentRegistry,
    teamDecisions: Array<{
      teamId: string;
      state: TeamState;
      decisions: PatentDecisions;
    }>,
    round: number,
    ctx?: EngineContext
  ): { updatedRegistry: PatentRegistry; result: PatentResolutionResult } {
    const updatedRegistry: PatentRegistry = {
      patents: [...registry.patents],
      filedTechs: { ...registry.filedTechs },
    };
    const messages: string[] = [];
    const newPatents: Patent[] = [];
    const expiredPatents: Patent[] = [];
    const challengeResults: PatentResolutionResult["challengeResults"] = [];
    const licensingRevenue: Record<string, number> = {};

    // Initialize revenue tracking
    for (const { teamId } of teamDecisions) {
      licensingRevenue[teamId] = 0;
    }

    // Step 1: Process patent filings (first-to-file wins)
    for (const { teamId, state, decisions } of teamDecisions) {
      if (!decisions.filings) continue;

      for (const filing of decisions.filings) {
        const techNode = RDExpansions.getTechNode(filing.techId);
        if (!techNode) {
          messages.push(`${teamId}: Cannot file patent - unknown tech "${filing.techId}"`);
          continue;
        }

        // Must be Tier 2+
        if (techNode.tier < 2) {
          messages.push(`${teamId}: Cannot file patent on "${techNode.name}" - Tier 1 techs are not patentable`);
          continue;
        }

        // Must have researched the tech
        const unlockedTechs = state.unlockedTechnologies || [];
        if (!unlockedTechs.includes(filing.techId)) {
          messages.push(`${teamId}: Cannot file patent on "${techNode.name}" - tech not researched`);
          continue;
        }

        // First-to-file check
        if (updatedRegistry.filedTechs[filing.techId]) {
          const existingOwner = updatedRegistry.filedTechs[filing.techId];
          messages.push(`${teamId}: Cannot file patent on "${techNode.name}" - already filed by ${existingOwner}`);
          continue;
        }

        // Check filing cost
        const cost = PATENT_FILING_COST[techNode.tier] || PATENT_FILING_COST[2];
        if (state.cash < cost) {
          messages.push(`${teamId}: Cannot afford patent filing for "${techNode.name}" ($${(cost / 1_000_000).toFixed(0)}M)`);
          continue;
        }

        // File the patent
        const patentId = ctx
          ? ctx.idGenerator.next("patent")
          : `pat-${filing.techId}-${round}`;

        const duration = PATENT_DURATION[techNode.tier] || PATENT_DURATION[2];
        const exclusiveBonus = PATENT_EXCLUSIVE_BONUS[techNode.tier] || PATENT_EXCLUSIVE_BONUS[2];
        const blockingPower = PATENT_BLOCKING_POWER[techNode.tier] || PATENT_BLOCKING_POWER[2];
        const licenseFee = PATENT_LICENSE_FEE[techNode.tier] || PATENT_LICENSE_FEE[2];

        const patent: Patent = {
          id: patentId,
          techId: filing.techId,
          family: techNode.family,
          tier: techNode.tier,
          ownerId: teamId,
          roundFiled: round,
          expiresRound: round + duration,
          status: "active",
          licensedTo: [],
          licenseFeePerRound: licenseFee,
          exclusiveBonus,
          blockingPower,
        };

        updatedRegistry.patents.push(patent);
        updatedRegistry.filedTechs[filing.techId] = teamId;
        newPatents.push(patent);

        // Deduct cost from team
        licensingRevenue[teamId] -= cost;
        messages.push(`${teamId} filed patent on "${techNode.name}" ($${(cost / 1_000_000).toFixed(0)}M, expires round ${patent.expiresRound})`);
      }
    }

    // Step 2: Process license requests
    for (const { teamId, decisions } of teamDecisions) {
      if (!decisions.licenseRequests) continue;

      for (const request of decisions.licenseRequests) {
        const patent = updatedRegistry.patents.find(
          p => p.id === request.patentId && p.status === "active"
        );
        if (!patent) {
          messages.push(`${teamId}: Cannot license - patent not found or not active`);
          continue;
        }

        if (patent.ownerId === teamId) {
          messages.push(`${teamId}: Cannot license own patent`);
          continue;
        }

        if (patent.licensedTo.includes(teamId)) {
          messages.push(`${teamId}: Already licensed patent "${patent.id}"`);
          continue;
        }

        // License is granted automatically (no negotiation in v1)
        patent.licensedTo.push(teamId);
        messages.push(`${teamId} licensed patent on "${patent.techId}" from ${patent.ownerId} ($${(patent.licenseFeePerRound / 1_000_000).toFixed(1)}M/round)`);
      }
    }

    // Step 3: Process challenges
    for (const { teamId, state, decisions } of teamDecisions) {
      if (!decisions.challenges) continue;

      for (const challenge of decisions.challenges) {
        const patent = updatedRegistry.patents.find(
          p => p.id === challenge.patentId && p.status === "active"
        );
        if (!patent) {
          messages.push(`${teamId}: Cannot challenge - patent not found`);
          continue;
        }

        if (patent.ownerId === teamId) {
          messages.push(`${teamId}: Cannot challenge own patent`);
          continue;
        }

        if (state.cash < PATENT_CHALLENGE_COST) {
          messages.push(`${teamId}: Cannot afford patent challenge ($${(PATENT_CHALLENGE_COST / 1_000_000).toFixed(0)}M)`);
          continue;
        }

        // Roll for challenge success
        const roll = ctx ? ctx.rng.rd.next() : Math.random();
        const success = roll < PATENT_CHALLENGE_SUCCESS_RATE;

        licensingRevenue[teamId] -= PATENT_CHALLENGE_COST;

        if (success) {
          patent.status = "challenged";
          messages.push(`${teamId} successfully challenged patent "${patent.techId}" - patent invalidated!`);
        } else {
          messages.push(`${teamId} failed to challenge patent "${patent.techId}" - $${(PATENT_CHALLENGE_COST / 1_000_000).toFixed(0)}M wasted`);
        }

        challengeResults.push({
          patentId: patent.id,
          challengerId: teamId,
          success,
          cost: PATENT_CHALLENGE_COST,
        });
      }
    }

    // Step 4: Collect licensing revenue
    for (const patent of updatedRegistry.patents) {
      if (patent.status !== "active") continue;

      for (const licenseeId of patent.licensedTo) {
        licensingRevenue[patent.ownerId] += patent.licenseFeePerRound;
        licensingRevenue[licenseeId] -= patent.licenseFeePerRound;
      }
    }

    // Step 5: Expire old patents
    for (const patent of updatedRegistry.patents) {
      if (patent.status === "active" && round >= patent.expiresRound) {
        patent.status = "expired";
        expiredPatents.push(patent);
        messages.push(`Patent on "${patent.techId}" (${patent.ownerId}) expired`);
      }
    }

    // Step 6: Calculate blocking penalties
    const blockingPenalties: Record<string, Partial<Record<TechFamily, number>>> = {};
    for (const { teamId, state } of teamDecisions) {
      blockingPenalties[teamId] = {};
      const unlockedTechs = state.unlockedTechnologies || [];

      for (const patent of updatedRegistry.patents) {
        if (patent.status !== "active") continue;
        if (patent.ownerId === teamId) continue; // Own patents don't block
        if (patent.licensedTo.includes(teamId)) continue; // Licensed = no block

        // Check if this team uses the patented tech (has it unlocked and in a product)
        if (unlockedTechs.includes(patent.techId)) {
          const currentPenalty = blockingPenalties[teamId][patent.family] || 0;
          blockingPenalties[teamId][patent.family] = Math.min(
            0.30, // Cap at 30% max penalty per family
            currentPenalty + patent.blockingPower
          );
        }
      }
    }

    return {
      updatedRegistry,
      result: {
        newPatents,
        expiredPatents,
        challengeResults,
        licensingRevenue,
        blockingPenalties,
        messages,
      },
    };
  }

  /**
   * Get all active patents for a specific team.
   */
  static getTeamPatents(registry: PatentRegistry, teamId: string): Patent[] {
    return registry.patents.filter(p => p.ownerId === teamId && p.status === "active");
  }

  /**
   * Get all patents blocking a specific team.
   */
  static getBlockingPatents(registry: PatentRegistry, teamId: string): Patent[] {
    return registry.patents.filter(
      p => p.status === "active" && p.ownerId !== teamId && !p.licensedTo.includes(teamId)
    );
  }

  /**
   * Get patentable techs for a team (Tier 2+, researched, not already filed).
   */
  static getPatentableTechs(
    registry: PatentRegistry,
    unlockedTechs: string[]
  ): string[] {
    const techTree = RDExpansions.getTechTree();
    return unlockedTechs.filter(techId => {
      const node = techTree.find(n => n.id === techId);
      if (!node || node.tier < 2) return false;
      return !registry.filedTechs[techId]; // Not already patented
    });
  }
}
```

---

## FILE: engine/types/product.ts

```typescript
/**
 * Product-related types for the Business Simulation Engine
 */

import type { Segment } from "./factory";
import type { ProductFeatureSet } from "./features";

// ============================================
// PRODUCT
// ============================================

/** Quality grade determines pricing multiplier, production time, and market segment access */
export type QualityGrade = "standard" | "premium" | "artisan";

/** Quality grade configuration */
export const QUALITY_GRADE_CONFIG: Record<QualityGrade, {
  label: string;
  priceMultiplier: number;
  productionTimeMultiplier: number;
  minMaterialTier: number;
  description: string;
}> = {
  standard: {
    label: "Standard",
    priceMultiplier: 1.0,
    productionTimeMultiplier: 1.0,
    minMaterialTier: 1,
    description: "Base quality production. Fastest output, standard pricing.",
  },
  premium: {
    label: "Premium",
    priceMultiplier: 1.3,
    productionTimeMultiplier: 1.5,
    minMaterialTier: 3,
    description: "Enhanced materials and QC. 30% price premium, 50% slower production.",
  },
  artisan: {
    label: "Artisan",
    priceMultiplier: 1.6,
    productionTimeMultiplier: 2.0,
    minMaterialTier: 5,
    description: "Hand-finished, top-tier materials. 60% price premium, 2x production time.",
  },
};

export interface Product {
  id: string;
  name: string;
  segment: Segment;
  price: number;
  quality: number;       // 0-100
  features: number;      // 0-100 (backward-compat: computed from featureSet if present)
  reliability: number;   // 0-100
  developmentRound: number;

  // Development timeline
  developmentStatus: "in_development" | "ready" | "launched";
  developmentProgress: number;  // 0-100
  targetQuality: number;        // Final quality when development completes
  targetFeatures: number;       // Final features when development completes
  roundsRemaining: number;      // Rounds until development completes

  // Production costs
  unitCost: number;             // Cost to produce one unit

  // === NEW: Archetype & Feature System ===
  /** Which phone archetype this product is based on (undefined = legacy product) */
  archetypeId?: string;
  /** Detailed 6-axis feature breakdown (undefined = legacy, use features field) */
  featureSet?: ProductFeatureSet;
  /** Which tech IDs were applied when this product was created */
  appliedTechs?: string[];

  // === Quality Grade System ===
  /** Quality grade: standard (default), premium, or artisan */
  qualityGrade?: QualityGrade;
}
```

---

## FILE: engine/types/features.ts

```typescript
/**
 * Feature-based demand types for the Business Simulation Engine
 *
 * Products have a 6-axis feature profile (one per tech family).
 * Segments have preference profiles that define what they care about.
 * Market scoring uses the dot product of product features × segment preferences.
 */

import type { TechFamily } from "../modules/RDExpansions";

// ============================================
// PRODUCT FEATURE SET
// ============================================

/** A product's concrete capabilities across the 6 tech families (each 0-100). */
export interface ProductFeatureSet {
  battery: number;
  camera: number;
  ai: number;
  durability: number;
  display: number;
  connectivity: number;
}

// ============================================
// SEGMENT FEATURE PREFERENCES
// ============================================

/** How much each segment values each tech family. Weights sum to 1.0 per segment. */
export interface FeaturePreferenceProfile {
  battery: number;
  camera: number;
  ai: number;
  durability: number;
  display: number;
  connectivity: number;
}

/** All 6 tech family keys for iteration. */
export const TECH_FAMILIES: TechFamily[] = [
  "battery",
  "camera",
  "ai",
  "durability",
  "display",
  "connectivity",
];

/**
 * Segment feature preference profiles (from design doc Section 4.2).
 * Each row sums to 1.0.
 */
export const SEGMENT_FEATURE_PREFERENCES: Record<string, FeaturePreferenceProfile> = {
  Budget: {
    battery: 0.35,
    camera: 0.08,
    ai: 0.05,
    durability: 0.25,
    display: 0.15,
    connectivity: 0.12,
  },
  General: {
    battery: 0.18,
    camera: 0.20,
    ai: 0.15,
    durability: 0.12,
    display: 0.20,
    connectivity: 0.15,
  },
  Enthusiast: {
    battery: 0.08,
    camera: 0.30,
    ai: 0.12,
    durability: 0.05,
    display: 0.30,
    connectivity: 0.15,
  },
  Professional: {
    battery: 0.10,
    camera: 0.12,
    ai: 0.30,
    durability: 0.08,
    display: 0.15,
    connectivity: 0.25,
  },
  "Active Lifestyle": {
    battery: 0.20,
    camera: 0.08,
    ai: 0.05,
    durability: 0.40,
    display: 0.10,
    connectivity: 0.17,
  },
};

// ============================================
// UTILITY
// ============================================

/** Create an empty ProductFeatureSet (all zeros). */
export function emptyFeatureSet(): ProductFeatureSet {
  return { battery: 0, camera: 0, ai: 0, durability: 0, display: 0, connectivity: 0 };
}

/**
 * Calculate feature-match score between a product's features and a segment's preferences.
 * Returns 0.0 to 1.0 where 1.0 = perfect match.
 */
export function calculateFeatureMatchScore(
  productFeatures: ProductFeatureSet,
  segmentPreferences: FeaturePreferenceProfile
): number {
  let score = 0;
  for (const family of TECH_FAMILIES) {
    const capability = productFeatures[family] / 100; // 0-1
    const preference = segmentPreferences[family]; // 0-1
    score += capability * preference;
  }
  return score;
}
```

---

## FILE: engine/types/patents.ts

```typescript
/**
 * Patent system types for the Business Simulation Engine
 *
 * Patents are filed on specific technologies and create competitive friction:
 * - Exclusive bonuses for the patent holder
 * - Blocking penalties for unlicensed competitors
 * - Licensing revenue streams
 * - Challenges and expiration mechanics
 */

import type { TechFamily, TechTier } from "../modules/RDExpansions";

// ============================================
// PATENT
// ============================================

export type PatentStatus = "active" | "licensed" | "expired" | "challenged";

export interface Patent {
  id: string;
  techId: string; // Which tech this covers
  family: TechFamily;
  tier: TechTier;
  ownerId: string; // Team ID
  roundFiled: number;
  expiresRound: number; // 8-12 rounds after filing

  status: PatentStatus;

  // Licensing
  licensedTo: string[]; // Team IDs that pay for license
  licenseFeePerRound: number; // Revenue per licensee per round

  // Competitive effects
  exclusiveBonus: number; // % bonus to owner's products (5-15%)
  blockingPower: number; // % penalty to unlicensed competitors (5-15%)
}

// ============================================
// PATENT DECISIONS
// ============================================

export interface PatentFilingDecision {
  techId: string;
}

export interface PatentLicenseDecision {
  patentId: string; // Patent to license
  fromTeamId: string; // Owner team
}

export interface PatentChallengeDecision {
  patentId: string; // Patent to challenge
}

export interface PatentDecisions {
  filings?: PatentFilingDecision[];
  licenseRequests?: PatentLicenseDecision[];
  challenges?: PatentChallengeDecision[];
}

// ============================================
// PATENT RESOLUTION RESULTS
// ============================================

export interface PatentResolutionResult {
  /** New patents filed this round */
  newPatents: Patent[];
  /** Patents that expired this round */
  expiredPatents: Patent[];
  /** Patent challenges and their outcomes */
  challengeResults: {
    patentId: string;
    challengerId: string;
    success: boolean;
    cost: number;
  }[];
  /** Licensing revenue per team (positive = earned, negative = paid) */
  licensingRevenue: Record<string, number>;
  /** Blocking penalties applied: teamId → { family → penaltyPercent } */
  blockingPenalties: Record<string, Partial<Record<TechFamily, number>>>;
  /** Human-readable messages */
  messages: string[];
}

// ============================================
// CONSTANTS
// ============================================

/** Cost to file a patent by tier */
export const PATENT_FILING_COST: Record<number, number> = {
  2: 5_000_000,
  3: 8_000_000,
  4: 12_000_000,
  5: 15_000_000,
};

/** Patent duration (rounds) by tier */
export const PATENT_DURATION: Record<number, number> = {
  2: 8,
  3: 10,
  4: 10,
  5: 12,
};

/** Exclusive bonus % by tier */
export const PATENT_EXCLUSIVE_BONUS: Record<number, number> = {
  2: 0.05,
  3: 0.08,
  4: 0.12,
  5: 0.15,
};

/** Blocking power % by tier */
export const PATENT_BLOCKING_POWER: Record<number, number> = {
  2: 0.05,
  3: 0.08,
  4: 0.12,
  5: 0.15,
};

/** Cost to challenge a patent */
export const PATENT_CHALLENGE_COST = 10_000_000;

/** Probability of challenge success */
export const PATENT_CHALLENGE_SUCCESS_RATE = 0.5;

/** Base licensing fee per round by tier */
export const PATENT_LICENSE_FEE: Record<number, number> = {
  2: 1_000_000,
  3: 2_000_000,
  4: 3_000_000,
  5: 4_000_000,
};
```

---

## FILE: engine/types/decisions.ts

```typescript
/**
 * Decision types for the Business Simulation Engine
 */

import type { EmployeeRole, EmployeeStats, EngineerStats, SupervisorStats, BenefitsPackage } from "./employee";
import type { Segment, Region, FactoryUpgrade } from "./factory";
import type { MachineryDecisions } from "../machinery/types";

// ============================================
// FACTORY DECISIONS
// ============================================

export interface FactoryDecisions {
  efficiencyInvestments?: Record<string, {
    workers?: number;
    supervisors?: number;
    engineers?: number;
    machinery?: number;
    factory?: number;
  }>;
  greenInvestments?: Record<string, number>;
  upgradePurchases?: { factoryId: string; upgrade: FactoryUpgrade }[];
  newFactories?: { name: string; region: Region; tier?: import("./factory").FactoryTier }[];
  /** @deprecated Use productionLineDecisions instead */
  productionAllocations?: {
    factoryId: string;
    lineId: string;
    segment: Segment;
    quantity: number;
  }[];
  /** Production line management decisions */
  productionLineDecisions?: {
    /** Assign a product to a line (triggers changeover if different product) */
    assignments?: { lineId: string; productId: string }[];
    /** Set target output for a line */
    targets?: { lineId: string; targetOutput: number }[];
    /** Assign workers to a line */
    staffing?: { lineId: string; workers: number; engineers: number; supervisors: number }[];
    /** Assign line-locked machines to specific lines */
    machineAssignments?: { machineId: string; lineId: string }[];
  };
  /** Warehouse build/rent decisions */
  warehouseDecisions?: {
    build?: { factoryId: string; tier: import("../modules/WarehouseManager").WarehouseTier }[];
    rent?: { factoryId: string; tier: import("../modules/WarehouseManager").WarehouseTier }[];
  };
  esgInitiatives?: ESGInitiatives;
  machineryDecisions?: MachineryDecisions;
}

// ============================================
// ESG INITIATIVES (Expanded)
// ============================================

export interface ESGInitiatives {
  // === EXISTING (6) ===
  charitableDonation?: number;
  communityInvestment?: number;
  workplaceHealthSafety?: boolean;
  fairWageProgram?: boolean;
  codeOfEthics?: boolean;
  supplierEthicsProgram?: boolean;

  // === ENVIRONMENTAL (6 new) ===
  carbonOffsetProgram?: number;        // $/ton CO2, +ESG per ton offset
  renewableEnergyCertificates?: number; // $, purchase green energy credits
  waterConservation?: boolean;          // $1.5M/year, +80 ESG
  zeroWasteCommitment?: boolean;        // $2M/year, +100 ESG
  circularEconomy?: boolean;            // $3M/year, +120 ESG, -20% material costs
  biodiversityProtection?: number;      // $, habitat restoration funding

  // === SOCIAL (5 new) ===
  diversityInclusion?: boolean;         // $1M/year, +90 ESG, +5% morale
  employeeWellness?: boolean;           // $500K/year, +60 ESG, -10% turnover
  communityEducation?: number;          // $, local education programs
  affordableHousing?: number;           // $, employee housing assistance
  humanRightsAudit?: boolean;           // $800K/year, +70 ESG

  // === GOVERNANCE (3 new) ===
  transparencyReport?: boolean;         // $300K/year, +50 ESG, +investor trust
  whistleblowerProtection?: boolean;    // $200K/year, +40 ESG
  executivePayRatio?: boolean;          // Cap exec pay at 50x avg, +100 ESG
}

// ============================================
// HR DECISIONS
// ============================================

export interface HRDecisions {
  hires?: {
    factoryId: string;
    role: EmployeeRole;
    candidateId: string;
    /** Pre-generated candidate data from recruitment search — skips random generation */
    candidateData?: {
      name: string;
      stats: EmployeeStats | EngineerStats | SupervisorStats;
      salary: number;
    };
  }[];
  fires?: { employeeId: string }[];
  recruitmentSearches?: {
    role: EmployeeRole;
    tier: "basic" | "premium" | "executive";
    factoryId: string;
  }[];
  salaryMultiplierChanges?: {
    workers?: number;
    engineers?: number;
    supervisors?: number;
  };
  benefitChanges?: Partial<BenefitsPackage>;
  trainingPrograms?: {
    role: EmployeeRole;
    programType: string;
  }[];
}

// ============================================
// FINANCE DECISIONS
// ============================================

export interface FinanceDecisions {
  treasuryBillsIssue?: number;
  corporateBondsIssue?: number;
  loanRequest?: { amount: number; termMonths: number };
  stockIssuance?: { shares: number; pricePerShare: number };
  sharesBuyback?: number;
  dividendPerShare?: number;
  boardProposals?: BoardProposal[];
  economicForecast?: {
    gdpForecast: number;
    inflationForecast: number;
    fxForecasts: Record<string, number>;
  };
}

// ============================================
// BOARD PROPOSALS (Expanded)
// ============================================

export type BoardProposalType =
  // === EXISTING (5) ===
  | "dividend"           // Dividend payment
  | "expansion"          // Major factory expansion
  | "acquisition"        // Acquire another company
  | "emergency_capital"  // Emergency funding request
  | "stock_buyback"      // Share repurchase program

  // === STRATEGIC (5 new) ===
  | "rd_investment"      // Large R&D budget allocation
  | "strategic_partnership" // Joint venture / partnership
  | "market_entry"       // Enter new regional market
  | "product_line_discontinue" // Kill underperforming product
  | "vertical_integration" // Acquire supplier/distributor

  // === FINANCIAL (3 new) ===
  | "debt_refinancing"   // Restructure existing debt
  | "share_split"        // Stock split (2:1, 3:1, etc.)
  | "capital_allocation" // Set investment priorities

  // === CORPORATE (2 new) ===
  | "executive_compensation" // CEO/executive pay review
  | "esg_policy";        // Adopt formal ESG policy

export interface BoardProposal {
  type: BoardProposalType;
  amount?: number;        // For proposals with monetary values
  details?: string;       // Additional context
  rationale?: string;     // Why this proposal
}

// ============================================
// MARKETING DECISIONS
// ============================================

export interface MarketingDecisions {
  advertisingBudget?: Partial<Record<Segment, number>>;
  brandingInvestment?: number;
  promotions?: {
    segment: Segment;
    discountPercent: number;
    duration: number;
  }[];
  sponsorships?: { name: string; cost: number; brandImpact: number }[];
  // v3.1.0: Product pricing decisions - set product prices each round
  productPricing?: { productId: string; newPrice: number }[];
}

// ============================================
// R&D DECISIONS
// ============================================

export interface RDDecisions {
  rdBudget?: number;
  newProducts?: {
    name: string;
    segment: Segment;
    targetQuality: number;
    targetFeatures: number;
    /** Phone archetype ID (new system - undefined = legacy product creation) */
    archetypeId?: string;
  }[];
  productImprovements?: {
    productId: string;
    qualityIncrease?: number;
    featuresIncrease?: number;
  }[];
}

// ============================================
// COMBINED DECISIONS
// ============================================

export interface AllDecisions {
  factory?: FactoryDecisions;
  hr?: HRDecisions;
  finance?: FinanceDecisions;
  marketing?: MarketingDecisions;
  rd?: RDDecisions;
}

// Re-export MachineryDecisions for convenience
export type { MachineryDecisions } from "../machinery/types";
```
