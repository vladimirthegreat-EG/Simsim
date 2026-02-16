/**
 * Experience Curve Engine
 *
 * Implements learning curves where cumulative production reduces costs.
 * Based on Wright's Law: cost = initialCost * (cumulativeUnits ^ log2(learningRate))
 *
 * Phase 5: Learning/Experience Curves
 */

import type { Segment } from "../types/factory";
import type { TeamState } from "../types/state";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export interface ExperienceCurveState {
  cumulativeProduction: Record<Segment, number>;
  learningRate: number; // 0.8 = 20% cost reduction per doubling
  currentCostMultiplier: Record<Segment, number>;
  totalCostSavings: number;
  doublings: Record<Segment, number>;
}

export interface LearningModifiers {
  engineerInnovation: number; // From engineer stats
  sixSigmaBonus: number; // From factory upgrades
  productComplexity: number; // From product quality/features
  factoryEfficiency: number; // From factory stats
}

export interface ExperienceResult {
  state: ExperienceCurveState;
  costMultipliers: Record<Segment, number>;
  savingsThisRound: number;
  messages: string[];
  projectedSavings: Record<Segment, number>; // Next 4 rounds
}

// ============================================
// CONSTANTS
// ============================================

const BASE_LEARNING_RATE = 0.85; // 15% cost reduction per doubling
const MIN_COST_MULTIPLIER = 0.5; // Cap at 50% cost reduction
const INITIAL_PRODUCTION = 10000; // Starting production for learning calc

// ============================================
// ENGINE
// ============================================

export class ExperienceCurveEngine {
  /**
   * Calculate current experience curve state
   */
  static calculateExperienceCurve(
    state: TeamState,
    previousExperience: ExperienceCurveState | null,
    productionThisRound: Record<Segment, number>,
    config: EngineConfig
  ): ExperienceResult {
    const messages: string[] = [];
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

    // Get or initialize cumulative production
    const cumulativeProduction: Record<Segment, number> = {} as Record<Segment, number>;
    for (const segment of segments) {
      const previous = previousExperience?.cumulativeProduction[segment] ?? INITIAL_PRODUCTION;
      const thisRound = productionThisRound[segment] ?? 0;
      cumulativeProduction[segment] = previous + thisRound;
    }

    // Calculate learning modifiers
    const modifiers = this.calculateLearningModifiers(state);

    // Calculate effective learning rate
    const effectiveLearningRate = this.calculateEffectiveLearningRate(
      BASE_LEARNING_RATE,
      modifiers
    );

    // Calculate cost multipliers per segment
    const costMultipliers: Record<Segment, number> = {} as Record<Segment, number>;
    const doublings: Record<Segment, number> = {} as Record<Segment, number>;
    const projectedSavings: Record<Segment, number> = {} as Record<Segment, number>;

    for (const segment of segments) {
      const cumulative = cumulativeProduction[segment];
      const doublingsCount = Math.log2(cumulative / INITIAL_PRODUCTION);
      doublings[segment] = doublingsCount;

      // Wright's Law formula
      const rawMultiplier = Math.pow(effectiveLearningRate, doublingsCount);
      costMultipliers[segment] = Math.max(MIN_COST_MULTIPLIER, rawMultiplier);

      // Project savings for next 4 rounds (assuming similar production)
      const avgProduction = productionThisRound[segment] ?? 10000;
      const futureDoubling = Math.log2((cumulative + avgProduction * 4) / INITIAL_PRODUCTION);
      const futureMultiplier = Math.max(MIN_COST_MULTIPLIER, Math.pow(effectiveLearningRate, futureDoubling));
      projectedSavings[segment] = (costMultipliers[segment] - futureMultiplier) * 100;
    }

    // Calculate total cost savings
    const previousMultipliers: Record<Segment, number> =
      (previousExperience?.currentCostMultiplier as Record<Segment, number>) ?? {} as Record<Segment, number>;
    let savingsThisRound = 0;
    for (const segment of segments) {
      const previousMult = previousMultipliers[segment] ?? 1.0;
      const currentMult = costMultipliers[segment];
      const production = productionThisRound[segment] ?? 0;
      const baseCost = this.getBaseCost(segment);
      savingsThisRound += production * baseCost * (previousMult - currentMult);
    }

    const totalCostSavings = (previousExperience?.totalCostSavings ?? 0) + savingsThisRound;

    // Generate messages
    for (const segment of segments) {
      const reduction = (1 - costMultipliers[segment]) * 100;
      if (reduction > 10) {
        messages.push(`${segment}: ${reduction.toFixed(0)}% cost reduction from experience`);
      }
    }

    if (savingsThisRound > 1_000_000) {
      messages.push(`Experience curve saved $${(savingsThisRound / 1_000_000).toFixed(1)}M this round`);
    }

    return {
      state: {
        cumulativeProduction,
        learningRate: effectiveLearningRate,
        currentCostMultiplier: costMultipliers,
        totalCostSavings,
        doublings,
      },
      costMultipliers,
      savingsThisRound,
      messages,
      projectedSavings,
    };
  }

  /**
   * Calculate learning modifiers from team state
   */
  private static calculateLearningModifiers(state: TeamState): LearningModifiers {
    const workforce = state.workforce;
    const factory = state.factories?.[0];
    const products = state.products ?? [];

    // Engineer innovation (approximate using totalHeadcount as some are engineers)
    const totalEmployees = workforce?.totalHeadcount ?? 0;
    const avgInnovation = totalEmployees > 0 ? 70 : 0; // Placeholder - would come from employee stats

    // Six Sigma bonus from factory upgrades
    const sixSigmaBonus = factory?.upgrades?.includes("sixSigma") ? 0.15 : 0;

    // Product complexity (average quality + features)
    const avgQuality = products.length > 0
      ? products.reduce((sum, p) => sum + p.quality, 0) / products.length
      : 50;
    const avgFeatures = products.length > 0
      ? products.reduce((sum, p) => sum + p.features, 0) / products.length
      : 50;
    const productComplexity = (avgQuality + avgFeatures) / 2;

    // Factory efficiency
    const factoryEfficiency = factory?.efficiency ?? 0.7;

    return {
      engineerInnovation: avgInnovation,
      sixSigmaBonus,
      productComplexity,
      factoryEfficiency,
    };
  }

  /**
   * Calculate effective learning rate with modifiers
   */
  private static calculateEffectiveLearningRate(
    baseRate: number,
    modifiers: LearningModifiers
  ): number {
    // Lower learning rate = faster learning (0.8 is better than 0.9)
    let effectiveRate = baseRate;

    // Engineers accelerate learning (up to 10% improvement)
    effectiveRate *= (1 - modifiers.engineerInnovation / 200 * 0.1);

    // Six Sigma improves learning
    effectiveRate *= (1 - modifiers.sixSigmaBonus * 0.5);

    // Complex products learn slower
    effectiveRate *= (1 + (modifiers.productComplexity - 50) / 200 * 0.1);

    // Efficient factories learn faster
    effectiveRate *= (1 - (modifiers.factoryEfficiency - 0.7) * 0.2);

    // Clamp to reasonable bounds
    return Math.min(0.95, Math.max(0.7, effectiveRate));
  }

  /**
   * Get base cost for a segment
   */
  private static getBaseCost(segment: Segment): number {
    const costs: Record<Segment, number> = {
      Budget: 50 + 20 + 15,
      General: 100 + 20 + 15,
      Enthusiast: 200 + 20 + 15,
      Professional: 350 + 20 + 15,
      "Active Lifestyle": 150 + 20 + 15,
    };
    return costs[segment];
  }

  /**
   * Apply technology transfer between similar products
   */
  static applyTechnologyTransfer(
    sourceExperience: ExperienceCurveState,
    targetSegment: Segment,
    sourceSegment: Segment,
    transferRate: number = 0.3 // 30% transfer by default
  ): number {
    if (sourceSegment === targetSegment) {
      return 0; // No self-transfer
    }

    // Calculate experience to transfer
    const sourceProduction = sourceExperience.cumulativeProduction[sourceSegment] ?? 0;
    const transferAmount = sourceProduction * transferRate;

    return transferAmount;
  }

  /**
   * Calculate cross-product learning benefits
   */
  static calculateCrossProductLearning(
    state: ExperienceCurveState,
    newProduct: { segment: Segment; quality: number }
  ): { bonusProduction: number; message: string } {
    // Find products in same segment
    const sameSegmentProduction = state.cumulativeProduction[newProduct.segment] ?? 0;

    // Also check adjacent segments (30% transfer)
    const adjacentSegments = this.getAdjacentSegments(newProduct.segment);
    let adjacentBonus = 0;
    for (const adjacent of adjacentSegments) {
      adjacentBonus += (state.cumulativeProduction[adjacent] ?? 0) * 0.3;
    }

    const bonusProduction = sameSegmentProduction * 0.5 + adjacentBonus;
    const message = bonusProduction > 0
      ? `New product benefits from ${Math.round(bonusProduction).toLocaleString()} units of prior experience`
      : "";

    return { bonusProduction, message };
  }

  /**
   * Get adjacent market segments for learning transfer
   */
  private static getAdjacentSegments(segment: Segment): Segment[] {
    const adjacencyMap: Record<Segment, Segment[]> = {
      Budget: ["General"],
      General: ["Budget", "Active Lifestyle"],
      Enthusiast: ["Professional", "Active Lifestyle"],
      Professional: ["Enthusiast"],
      "Active Lifestyle": ["General", "Enthusiast"],
    };
    return adjacencyMap[segment] ?? [];
  }

  /**
   * Initialize experience curve state for new team
   */
  static initializeState(): ExperienceCurveState {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const cumulativeProduction: Record<Segment, number> = {} as Record<Segment, number>;
    const currentCostMultiplier: Record<Segment, number> = {} as Record<Segment, number>;
    const doublings: Record<Segment, number> = {} as Record<Segment, number>;

    for (const segment of segments) {
      cumulativeProduction[segment] = INITIAL_PRODUCTION;
      currentCostMultiplier[segment] = 1.0;
      doublings[segment] = 0;
    }

    return {
      cumulativeProduction,
      learningRate: BASE_LEARNING_RATE,
      currentCostMultiplier,
      totalCostSavings: 0,
      doublings,
    };
  }
}

// Types are exported with their interface declarations above
