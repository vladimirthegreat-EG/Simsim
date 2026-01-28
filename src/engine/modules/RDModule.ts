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

    // Process new product development (now starts in "in_development" status)
    if (decisions.newProducts) {
      for (const productSpec of decisions.newProducts) {
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

    // Progress existing in-development products
    for (const product of newState.products) {
      if (product.developmentStatus === "in_development") {
        product.roundsRemaining = Math.max(0, product.roundsRemaining - 1);
        product.developmentProgress = Math.min(100, product.developmentProgress + (100 / (product.roundsRemaining + 1)));

        if (product.roundsRemaining === 0) {
          // Development complete - upgrade to full quality
          product.developmentStatus = "ready";
          product.quality = product.targetQuality;
          product.features = product.targetFeatures;
          product.developmentProgress = 100;
          messages.push(`${product.name} development complete! Ready for launch.`);
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
            improvement.featuresIncrease || 0
          );

          if (newState.cash >= improvementCost && newState.rdProgress >= (improvement.qualityIncrease || 0) * 10) {
            if (improvement.qualityIncrease) {
              product.quality = Math.min(100, product.quality + improvement.qualityIncrease);
            }
            if (improvement.featuresIncrease) {
              product.features = Math.min(100, product.features + improvement.featuresIncrease);
            }
            newState.rdProgress -= (improvement.qualityIncrease || 0) * 10;
            totalCosts += improvementCost;
            messages.push(`Improved ${product.name}: Q+${improvement.qualityIncrease || 0}, F+${improvement.featuresIncrease || 0}`);
          } else {
            messages.push(`Cannot improve ${product.name}: insufficient funds or R&D points`);
          }
        }
      }
    }

    // Patent generation from R&D progress
    if (newState.rdProgress >= 500) {
      newState.patents += 1;
      newState.rdProgress -= 500;
      messages.push(`New patent acquired! (Total: ${newState.patents})`);
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
          patentsEarned: newState.patents - state.patents,
        },
        costs: totalCosts,
        revenue: 0,
        messages,
      },
    };
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
   * Calculate improvement cost
   */
  static calculateImprovementCost(qualityIncrease: number, featuresIncrease: number): number {
    // $1M per quality point, $500K per feature point
    return qualityIncrease * 1_000_000 + featuresIncrease * 500_000;
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

  /**
   * Calculate time to develop a product
   * Base: 6 months, modified by engineer quality and R&D budget
   */
  static calculateDevelopmentTime(
    targetQuality: number,
    engineerCount: number,
    averageEngineerEfficiency: number,
    rdBudget: number
  ): number {
    // Base time: 6 months (2 rounds)
    let baseTime = 2;

    // Higher quality = longer development
    baseTime += Math.floor((targetQuality - 50) / 25);

    // More engineers = faster
    const engineerSpeedup = Math.min(0.5, engineerCount * 0.05);

    // Better engineers = faster
    const efficiencySpeedup = (averageEngineerEfficiency - 50) / 200;

    // Higher budget = faster
    const budgetSpeedup = Math.min(0.3, rdBudget / 50_000_000 * 0.1);

    const totalSpeedup = 1 - engineerSpeedup - efficiencySpeedup - budgetSpeedup;

    return Math.max(1, Math.round(baseTime * Math.max(0.3, totalSpeedup)));
  }

  /**
   * Calculate patent value
   * Patents provide competitive advantage
   */
  static calculatePatentValue(patents: number): {
    qualityBonus: number;
    costReduction: number;
    marketShareBonus: number;
  } {
    return {
      qualityBonus: Math.min(10, patents * 2),      // Up to +10 quality
      costReduction: Math.min(0.15, patents * 0.03), // Up to 15% cost reduction
      marketShareBonus: Math.min(0.05, patents * 0.01), // Up to 5% market share bonus
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
