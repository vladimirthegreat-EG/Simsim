/**
 * Customer Satisfaction Engine
 *
 * Tracks customer satisfaction across segments, which affects:
 * - Brand growth/decay rates
 * - Price tolerance (willingness to pay)
 * - Word of mouth (organic market share growth)
 * - Customer retention and loyalty
 *
 * Phase 4: Customer Satisfaction Loop
 */

import type { Segment } from "../types/factory";
import type { TeamState } from "../types/state";

// ============================================
// TYPES
// ============================================

export interface CustomerSatisfaction {
  overall: number;  // 0-100

  components: {
    productQuality: number;       // Product quality vs expectations
    deliveryReliability: number;  // On-time delivery rate
    priceFairness: number;        // Price vs perceived value
    serviceExperience: number;    // Post-sale support quality
    brandTrust: number;           // Historical brand reliability
  };

  // Per-segment satisfaction
  segmentSatisfaction: Record<Segment, SegmentSatisfaction>;

  // Trends
  trend: "improving" | "stable" | "declining";
  momentum: number;  // -1 to 1, rate of change
}

export interface SegmentSatisfaction {
  segment: Segment;
  satisfaction: number;
  expectations: SegmentExpectations;
  gapAnalysis: GapAnalysis;
}

export interface SegmentExpectations {
  qualityExpectation: number;
  priceExpectation: number;
  featureExpectation: number;
  serviceExpectation: number;
}

export interface GapAnalysis {
  qualityGap: number;      // Positive = exceeding expectations
  priceGap: number;        // Positive = better value than expected
  featureGap: number;
  serviceGap: number;
  overallGap: number;
}

export interface SatisfactionImpact {
  brandGrowthModifier: number;
  priceToleranceBonus: number;
  organicGrowth: number;
  churnReduction: number;
  wordOfMouthMultiplier: number;
}

export interface SatisfactionResult {
  satisfaction: CustomerSatisfaction;
  impact: SatisfactionImpact;
  messages: string[];
  recommendations: string[];
}

// ============================================
// ENGINE
// ============================================

export class SatisfactionEngine {
  // Segment expectations (what customers expect)
  private static readonly SEGMENT_EXPECTATIONS: Record<Segment, SegmentExpectations> = {
    Budget: {
      qualityExpectation: 40,
      priceExpectation: 100,  // Very price sensitive
      featureExpectation: 30,
      serviceExpectation: 40,
    },
    General: {
      qualityExpectation: 55,
      priceExpectation: 70,
      featureExpectation: 50,
      serviceExpectation: 55,
    },
    Enthusiast: {
      qualityExpectation: 75,
      priceExpectation: 40,  // Less price sensitive
      featureExpectation: 80,
      serviceExpectation: 65,
    },
    Professional: {
      qualityExpectation: 85,
      priceExpectation: 30,  // Least price sensitive
      featureExpectation: 70,
      serviceExpectation: 80,
    },
    "Active Lifestyle": {
      qualityExpectation: 65,
      priceExpectation: 55,
      featureExpectation: 60,
      serviceExpectation: 60,
    },
  };

  // Component weights for overall satisfaction
  private static readonly COMPONENT_WEIGHTS = {
    productQuality: 0.30,
    deliveryReliability: 0.25,
    priceFairness: 0.20,
    serviceExperience: 0.10,
    brandTrust: 0.15,
  };

  /**
   * Calculate customer satisfaction for a team
   */
  static calculateSatisfaction(
    state: TeamState,
    previousSatisfaction: CustomerSatisfaction | null,
    marketAverages: {
      avgPrice: Record<Segment, number>;
      avgQuality: number;
    }
  ): SatisfactionResult {
    const messages: string[] = [];
    const recommendations: string[] = [];

    // Calculate component scores
    const productQuality = this.calculateProductQualityScore(state, marketAverages.avgQuality);
    const deliveryReliability = this.calculateDeliveryScore(state);
    const priceFairness = this.calculatePriceFairnessScore(state, marketAverages.avgPrice);
    const serviceExperience = this.calculateServiceScore(state);
    const brandTrust = this.calculateBrandTrustScore(state, previousSatisfaction);

    // Calculate per-segment satisfaction
    const segmentSatisfaction = this.calculateSegmentSatisfaction(state, marketAverages);

    // Calculate overall satisfaction
    const overall = this.calculateOverallSatisfaction({
      productQuality,
      deliveryReliability,
      priceFairness,
      serviceExperience,
      brandTrust,
    });

    // Determine trend
    const previousOverall = previousSatisfaction?.overall ?? 50;
    const change = overall - previousOverall;
    const trend = change > 2 ? "improving" : change < -2 ? "declining" : "stable";
    const momentum = Math.min(1, Math.max(-1, change / 10));

    // Create satisfaction object
    const satisfaction: CustomerSatisfaction = {
      overall,
      components: {
        productQuality,
        deliveryReliability,
        priceFairness,
        serviceExperience,
        brandTrust,
      },
      segmentSatisfaction,
      trend,
      momentum,
    };

    // Calculate business impact
    const impact = this.calculateSatisfactionImpact(satisfaction);

    // Generate messages and recommendations
    this.generateFeedback(satisfaction, messages, recommendations);

    return {
      satisfaction,
      impact,
      messages,
      recommendations,
    };
  }

  /**
   * Calculate product quality satisfaction score
   */
  private static calculateProductQualityScore(state: TeamState, marketAvgQuality: number): number {
    const products = state.products ?? [];
    if (products.length === 0) return 50;

    const avgQuality = products.reduce((sum, p) => sum + p.quality, 0) / products.length;
    const qualityVsMarket = avgQuality - marketAvgQuality;

    // Base score 50, adjusted by quality vs market
    return Math.min(100, Math.max(0, 50 + qualityVsMarket));
  }

  /**
   * Calculate delivery reliability score
   */
  private static calculateDeliveryScore(state: TeamState): number {
    // Based on efficiency (used as proxy for capacity utilization) and stockouts
    const utilizationPenalty = (state.factories?.[0]?.efficiency ?? 0.7) > 0.95 ? 15 : 0;

    // Assume delivery reliability based on inventory levels
    const inventoryHealth = state.cash > 50_000_000 ? 20 : state.cash > 20_000_000 ? 10 : 0;

    return Math.min(100, Math.max(0, 70 + inventoryHealth - utilizationPenalty));
  }

  /**
   * Calculate price fairness score
   */
  private static calculatePriceFairnessScore(
    state: TeamState,
    avgPrices: Record<Segment, number>
  ): number {
    const products = state.products ?? [];
    if (products.length === 0) return 50;

    let totalScore = 0;
    let count = 0;

    for (const product of products) {
      const segment = product.segment as Segment;
      const avgPrice = avgPrices[segment] ?? product.price;
      const priceRatio = avgPrice / product.price;

      // Score based on price vs market: lower price = higher satisfaction
      const segmentScore = 50 + (priceRatio - 1) * 50;
      totalScore += Math.min(100, Math.max(0, segmentScore));
      count++;
    }

    return count > 0 ? totalScore / count : 50;
  }

  /**
   * Calculate service experience score
   */
  private static calculateServiceScore(state: TeamState): number {
    // Based on workforce morale and training
    const morale = state.workforce?.averageMorale ?? 70;
    const efficiency = state.workforce?.averageEfficiency ?? 70;

    // Service score combines morale and efficiency
    return Math.min(100, (morale * 0.6 + efficiency * 0.4));
  }

  /**
   * Calculate brand trust score
   */
  private static calculateBrandTrustScore(
    state: TeamState,
    previousSatisfaction: CustomerSatisfaction | null
  ): number {
    const brandValue = state.brandValue;
    const previousBrandTrust = previousSatisfaction?.components.brandTrust ?? 50;

    // Brand trust is combination of brand value and historical satisfaction
    const brandScore = brandValue * 100;
    return (brandScore * 0.5 + previousBrandTrust * 0.5);
  }

  /**
   * Calculate overall satisfaction from components
   */
  private static calculateOverallSatisfaction(components: CustomerSatisfaction["components"]): number {
    const weights = this.COMPONENT_WEIGHTS;
    return (
      components.productQuality * weights.productQuality +
      components.deliveryReliability * weights.deliveryReliability +
      components.priceFairness * weights.priceFairness +
      components.serviceExperience * weights.serviceExperience +
      components.brandTrust * weights.brandTrust
    );
  }

  /**
   * Calculate satisfaction per segment
   */
  private static calculateSegmentSatisfaction(
    state: TeamState,
    marketAverages: { avgPrice: Record<Segment, number>; avgQuality: number }
  ): Record<Segment, SegmentSatisfaction> {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const result: Record<Segment, SegmentSatisfaction> = {} as Record<Segment, SegmentSatisfaction>;

    for (const segment of segments) {
      const expectations = this.SEGMENT_EXPECTATIONS[segment];
      const product = state.products?.find(p => p.segment === segment);

      // Calculate gaps
      const qualityGap = (product?.quality ?? 50) - expectations.qualityExpectation;
      const avgPrice = marketAverages.avgPrice[segment] ?? (product?.price ?? 100);
      const priceGap = product ? (avgPrice - product.price) / avgPrice * 100 : 0;
      const featureGap = (product?.features ?? 50) - expectations.featureExpectation;
      const serviceGap = (state.workforce?.averageMorale ?? 70) - expectations.serviceExpectation;

      // Calculate overall gap and satisfaction
      const overallGap = (qualityGap * 0.35 + priceGap * 0.25 + featureGap * 0.25 + serviceGap * 0.15);
      const satisfaction = Math.min(100, Math.max(0, 50 + overallGap));

      result[segment] = {
        segment,
        satisfaction,
        expectations,
        gapAnalysis: {
          qualityGap,
          priceGap,
          featureGap,
          serviceGap,
          overallGap,
        },
      };
    }

    return result;
  }

  /**
   * Calculate business impact of satisfaction
   */
  private static calculateSatisfactionImpact(satisfaction: CustomerSatisfaction): SatisfactionImpact {
    const overall = satisfaction.overall;

    // Brand growth modifier: satisfaction affects brand growth rate
    // -50% to +50% based on satisfaction
    const brandGrowthModifier = (overall - 50) / 100;

    // Price tolerance: high satisfaction allows premium pricing
    // Up to 30% premium acceptance at 100 satisfaction
    const priceToleranceBonus = overall > 70 ? (overall - 70) / 100 : 0;

    // Organic growth: word of mouth drives free market share
    // Up to 2% free share growth at high satisfaction
    const organicGrowth = overall > 60 ? (overall - 60) / 100 * 0.02 : 0;

    // Churn reduction: satisfied customers stay longer
    const churnReduction = Math.max(0, (overall - 50) / 100 * 0.3);

    // Word of mouth multiplier for marketing effectiveness
    const wordOfMouthMultiplier = 0.5 + (overall / 100);

    return {
      brandGrowthModifier,
      priceToleranceBonus,
      organicGrowth,
      churnReduction,
      wordOfMouthMultiplier,
    };
  }

  /**
   * Generate feedback messages and recommendations
   */
  private static generateFeedback(
    satisfaction: CustomerSatisfaction,
    messages: string[],
    recommendations: string[]
  ): void {
    const { overall, components, trend } = satisfaction;

    // Overall satisfaction message
    if (overall >= 80) {
      messages.push(`Excellent customer satisfaction at ${overall.toFixed(0)}%`);
    } else if (overall >= 60) {
      messages.push(`Good customer satisfaction at ${overall.toFixed(0)}%`);
    } else if (overall >= 40) {
      messages.push(`Average customer satisfaction at ${overall.toFixed(0)}%`);
      recommendations.push("Focus on improving weak areas to boost satisfaction");
    } else {
      messages.push(`Poor customer satisfaction at ${overall.toFixed(0)}% - urgent attention needed`);
      recommendations.push("Immediate action required to improve customer experience");
    }

    // Trend message
    if (trend === "improving") {
      messages.push("Customer satisfaction is trending upward");
    } else if (trend === "declining") {
      messages.push("Warning: Customer satisfaction is declining");
      recommendations.push("Investigate causes of satisfaction decline");
    }

    // Component-specific feedback
    if (components.productQuality < 50) {
      recommendations.push("Invest in R&D to improve product quality");
    }
    if (components.deliveryReliability < 50) {
      recommendations.push("Address capacity constraints to improve delivery reliability");
    }
    if (components.priceFairness < 50) {
      recommendations.push("Review pricing strategy - customers perceive poor value");
    }
    if (components.serviceExperience < 50) {
      recommendations.push("Improve workforce morale and training for better service");
    }
    if (components.brandTrust < 50) {
      recommendations.push("Rebuild brand trust through consistent quality and marketing");
    }
  }

  /**
   * Apply satisfaction impact to team state
   */
  static applySatisfactionImpact(
    state: TeamState,
    impact: SatisfactionImpact
  ): TeamState {
    const newState = { ...state };

    // Apply brand growth modifier
    const brandGrowth = state.brandValue * 0.02 * (1 + impact.brandGrowthModifier);
    newState.brandValue = Math.min(1, state.brandValue + brandGrowth);

    // Note: Other impacts (price tolerance, organic growth, churn reduction)
    // are applied in the market simulator and HR module

    return newState;
  }
}

