/**
 * Marketing Module Expansions
 *
 * Additional marketing systems for performance vs brand split,
 * channel mix, and competitive response modeling.
 *
 * Phase 9: Marketing Module Expansions
 */

import type { Segment } from "../types/factory";
import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export type MarketingChannel = "retail" | "digital" | "enterprise" | "carrier";
export type CompetitorActionType = "price_cut" | "marketing_blitz" | "product_launch" | "promotion";

export interface PerformanceMarketing {
  budget: Record<Segment, number>;
  currentBoost: Record<Segment, number>;
  previousBoost: Record<Segment, number>;
  effectiveness: number; // 0-1
}

export interface BrandMarketing {
  budget: Record<Segment, number>;
  equityBySegment: Record<Segment, number>;
  overallEquity: number;
  growthRate: number;
}

export interface ChannelMix {
  allocation: Record<MarketingChannel, number>; // Percentage allocation
  effectiveness: Record<Segment, Record<MarketingChannel, number>>;
  revenue: Record<MarketingChannel, number>;
}

export interface CompetitorAction {
  competitorId: string;
  type: CompetitorActionType;
  segment: Segment;
  intensity: number; // 0-1
  duration: number; // Rounds
  roundsRemaining: number;
}

export interface CompetitorResponse {
  triggeredBy: string; // Player action that triggered response
  action: CompetitorAction;
  predictedImpact: number;
}

export interface MarketingEffectiveness {
  performanceROI: number;
  brandROI: number;
  channelROI: Record<MarketingChannel, number>;
  bestPerformingSegment: Segment;
  recommendations: string[];
}

export interface MarketingExpansionResult {
  performance: PerformanceMarketing;
  brand: BrandMarketing;
  channelMix: ChannelMix;
  competitorActions: CompetitorAction[];
  competitorResponses: CompetitorResponse[];
  effectiveness: MarketingEffectiveness;
  totalRevenueImpact: number;
  totalBrandImpact: number;
  messages: string[];
  warnings: string[];
}

export interface MarketingExpansionDecisions {
  performanceBudget: Record<Segment, number>;
  brandBudget: Record<Segment, number>;
  channelAllocation: Record<MarketingChannel, number>;
  promotions: Promotion[];
  targetCompetitor?: string;
}

export interface Promotion {
  id: string;
  name: string;
  segment: Segment;
  discountPercent: number;
  duration: number; // Rounds
  cost: number;
}

// ============================================
// CONSTANTS
// ============================================

const PERFORMANCE_IMPACT_PER_MILLION = 0.15; // 15% boost per $1M
const PERFORMANCE_MAX_BOOST = 0.5; // Max 50% boost
const PERFORMANCE_DECAY_RATE = 0.7; // Decays to 30% next round

const BRAND_IMPACT_PER_MILLION = 0.005; // 0.5% equity per $1M
const BRAND_LINEAR_THRESHOLD = 5_000_000; // Linear up to $5M

const CHANNEL_EFFECTIVENESS: Record<Segment, Record<MarketingChannel, number>> = {
  Budget: { retail: 1.2, digital: 0.8, enterprise: 0.3, carrier: 1.5 },
  General: { retail: 1.0, digital: 1.0, enterprise: 0.5, carrier: 1.2 },
  Professional: { retail: 0.6, digital: 0.8, enterprise: 1.5, carrier: 0.7 },
  Enthusiast: { retail: 0.8, digital: 1.3, enterprise: 0.4, carrier: 0.9 },
  "Active Lifestyle": { retail: 1.1, digital: 1.0, enterprise: 0.3, carrier: 1.0 },
};

const COMPETITOR_RESPONSE_PROBABILITY = 0.3;
const COMPETITOR_RESPONSE_INTENSITY = 0.7;

// ============================================
// ENGINE
// ============================================

export class MarketingExpansions {
  /**
   * Process marketing expansions for a round
   */
  static processMarketingExpansions(
    state: TeamState,
    decisions: MarketingExpansionDecisions,
    previousPerformance: PerformanceMarketing | null,
    previousBrand: BrandMarketing | null,
    activeCompetitorActions: CompetitorAction[],
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): MarketingExpansionResult {
    const messages: string[] = [];
    const warnings: string[] = [];

    // Process performance marketing
    const performance = this.processPerformanceMarketing(
      decisions.performanceBudget,
      previousPerformance
    );

    // Process brand marketing
    const brand = this.processBrandMarketing(
      decisions.brandBudget,
      previousBrand,
      state.brandValue
    );

    // Process channel mix
    const channelMix = this.processChannelMix(
      decisions.channelAllocation,
      state
    );

    // Process competitor actions
    const { competitorActions, competitorResponses } = this.processCompetitorActions(
      activeCompetitorActions,
      decisions,
      state,
      config,
      ctx
    );

    // Calculate effectiveness
    const effectiveness = this.calculateEffectiveness(
      performance,
      brand,
      channelMix,
      state
    );

    // Calculate total impacts
    const totalRevenueImpact = this.calculateRevenueImpact(
      performance,
      channelMix,
      competitorActions
    );

    const totalBrandImpact = this.calculateBrandImpact(brand);

    // Generate messages
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    for (const segment of segments) {
      if (performance.currentBoost[segment] > 0.1) {
        messages.push(`${segment}: ${(performance.currentBoost[segment] * 100).toFixed(0)}% performance boost`);
      }
    }

    if (brand.growthRate > 0.01) {
      messages.push(`Brand equity growing at ${(brand.growthRate * 100).toFixed(1)}% rate`);
    }

    for (const response of competitorResponses) {
      warnings.push(`Competitor responding with ${response.action.type} in ${response.action.segment}`);
    }

    if (effectiveness.recommendations.length > 0) {
      messages.push(...effectiveness.recommendations.slice(0, 2));
    }

    return {
      performance,
      brand,
      channelMix,
      competitorActions,
      competitorResponses,
      effectiveness,
      totalRevenueImpact,
      totalBrandImpact,
      messages,
      warnings,
    };
  }

  /**
   * Process performance marketing
   */
  private static processPerformanceMarketing(
    budget: Record<Segment, number>,
    previous: PerformanceMarketing | null
  ): PerformanceMarketing {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const currentBoost: Record<Segment, number> = {} as Record<Segment, number>;
    const previousBoost: Record<Segment, number> = {} as Record<Segment, number>;

    for (const segment of segments) {
      // Decay previous boost
      previousBoost[segment] = (previous?.currentBoost[segment] ?? 0) * PERFORMANCE_DECAY_RATE;

      // Calculate new boost
      const segmentBudget = budget[segment] ?? 0;
      const newBoost = Math.min(
        PERFORMANCE_MAX_BOOST,
        (segmentBudget / 1_000_000) * PERFORMANCE_IMPACT_PER_MILLION
      );

      // Total boost is new + decayed previous (capped)
      currentBoost[segment] = Math.min(
        PERFORMANCE_MAX_BOOST,
        newBoost + previousBoost[segment] * 0.3
      );
    }

    const totalBudget = Object.values(budget).reduce((sum, b) => sum + b, 0);
    const effectiveness = totalBudget > 0
      ? Math.min(1, 0.5 + totalBudget / 20_000_000) // Improves with scale
      : 0;

    return {
      budget,
      currentBoost,
      previousBoost,
      effectiveness,
    };
  }

  /**
   * Process brand marketing
   */
  private static processBrandMarketing(
    budget: Record<Segment, number>,
    previous: BrandMarketing | null,
    currentBrandValue: number
  ): BrandMarketing {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const equityBySegment: Record<Segment, number> = {} as Record<Segment, number>;

    let totalGrowth = 0;

    for (const segment of segments) {
      const previousEquity = previous?.equityBySegment[segment] ?? currentBrandValue;
      const segmentBudget = budget[segment] ?? 0;

      // Calculate equity gain
      let equityGain = 0;
      if (segmentBudget <= BRAND_LINEAR_THRESHOLD) {
        equityGain = (segmentBudget / 1_000_000) * BRAND_IMPACT_PER_MILLION;
      } else {
        // Logarithmic above threshold
        const linearPart = (BRAND_LINEAR_THRESHOLD / 1_000_000) * BRAND_IMPACT_PER_MILLION;
        const extraMillions = (segmentBudget - BRAND_LINEAR_THRESHOLD) / 1_000_000;
        const logPart = BRAND_IMPACT_PER_MILLION * 2.5 * Math.log2(1 + extraMillions / 5);
        equityGain = linearPart + logPart;
      }

      equityBySegment[segment] = Math.min(1, previousEquity + equityGain);
      totalGrowth += equityGain;
    }

    const overallEquity = segments.reduce(
      (sum, s) => sum + equityBySegment[s],
      0
    ) / segments.length;

    return {
      budget,
      equityBySegment,
      overallEquity,
      growthRate: totalGrowth / segments.length,
    };
  }

  /**
   * Process channel mix
   */
  private static processChannelMix(
    allocation: Record<MarketingChannel, number>,
    state: TeamState
  ): ChannelMix {
    const channels: MarketingChannel[] = ["retail", "digital", "enterprise", "carrier"];
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

    // Normalize allocation to 100%
    const totalAllocation = Object.values(allocation).reduce((sum, a) => sum + a, 0);
    const normalizedAllocation: Record<MarketingChannel, number> = {} as Record<MarketingChannel, number>;
    for (const channel of channels) {
      normalizedAllocation[channel] = totalAllocation > 0
        ? (allocation[channel] ?? 0) / totalAllocation
        : 0.25;
    }

    // Calculate revenue by channel
    const totalRevenue = state.revenue ?? 0;
    const revenue: Record<MarketingChannel, number> = {} as Record<MarketingChannel, number>;
    for (const channel of channels) {
      revenue[channel] = totalRevenue * normalizedAllocation[channel];
    }

    return {
      allocation: normalizedAllocation,
      effectiveness: CHANNEL_EFFECTIVENESS,
      revenue,
    };
  }

  /**
   * Process competitor actions and responses
   */
  private static processCompetitorActions(
    activeActions: CompetitorAction[],
    decisions: MarketingExpansionDecisions,
    state: TeamState,
    config: EngineConfig,
    ctx: EngineContext
  ): { competitorActions: CompetitorAction[]; competitorResponses: CompetitorResponse[] } {
    const competitorResponses: CompetitorResponse[] = [];

    // Update existing actions
    const competitorActions = activeActions.filter((action) => {
      action.roundsRemaining--;
      return action.roundsRemaining > 0;
    });

    // Check for competitor responses to player actions
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    for (const segment of segments) {
      const performanceBudget = decisions.performanceBudget[segment] ?? 0;
      const brandBudget = decisions.brandBudget[segment] ?? 0;
      const totalSpend = performanceBudget + brandBudget;

      // High spending triggers responses
      if (totalSpend > 5_000_000) {
        const responseProb = COMPETITOR_RESPONSE_PROBABILITY *
          config.difficulty.competition.aiAggressiveness;

        if (ctx.rng.marketing.chance(responseProb)) {
          const responseType = ctx.rng.marketing.pick([
            "price_cut",
            "marketing_blitz",
            "promotion",
          ] as CompetitorActionType[]);

          const action: CompetitorAction = {
            competitorId: `comp_${ctx.rng.marketing.int(1, 4)}`,
            type: responseType,
            segment,
            intensity: COMPETITOR_RESPONSE_INTENSITY * config.difficulty.competition.competitorStrength,
            duration: 2,
            roundsRemaining: 2,
          };

          competitorActions.push(action);
          competitorResponses.push({
            triggeredBy: `High marketing spend in ${segment}`,
            action,
            predictedImpact: -action.intensity * 0.1,
          });
        }
      }
    }

    return { competitorActions, competitorResponses };
  }

  /**
   * Calculate marketing effectiveness metrics
   */
  private static calculateEffectiveness(
    performance: PerformanceMarketing,
    brand: BrandMarketing,
    channelMix: ChannelMix,
    state: TeamState
  ): MarketingEffectiveness {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const channels: MarketingChannel[] = ["retail", "digital", "enterprise", "carrier"];
    const recommendations: string[] = [];

    // Performance ROI
    const totalPerformanceBudget = Object.values(performance.budget).reduce((sum, b) => sum + b, 0);
    const avgBoost = Object.values(performance.currentBoost).reduce((sum, b) => sum + b, 0) / segments.length;
    const performanceROI = totalPerformanceBudget > 0
      ? avgBoost / (totalPerformanceBudget / 10_000_000)
      : 0;

    // Brand ROI
    const totalBrandBudget = Object.values(brand.budget).reduce((sum, b) => sum + b, 0);
    const brandROI = totalBrandBudget > 0
      ? brand.growthRate * 100 / (totalBrandBudget / 10_000_000)
      : 0;

    // Channel ROI (simplified)
    const channelROI: Record<MarketingChannel, number> = {} as Record<MarketingChannel, number>;
    for (const channel of channels) {
      channelROI[channel] = channelMix.revenue[channel] > 0 ? 1.0 : 0;
    }

    // Find best performing segment
    let bestSegment: Segment = "General";
    let bestBoost = 0;
    for (const segment of segments) {
      const boost = performance.currentBoost[segment] + brand.equityBySegment[segment];
      if (boost > bestBoost) {
        bestBoost = boost;
        bestSegment = segment;
      }
    }

    // Generate recommendations
    if (performanceROI < 0.5 && totalPerformanceBudget > 2_000_000) {
      recommendations.push("Consider shifting budget from performance to brand marketing");
    }

    if (brand.growthRate < 0.005 && totalBrandBudget < 3_000_000) {
      recommendations.push("Increase brand marketing investment for long-term growth");
    }

    // Channel recommendations
    const channelAllocationValues = Object.values(channelMix.allocation);
    const maxChannelAlloc = Math.max(...channelAllocationValues);
    if (maxChannelAlloc > 0.5) {
      recommendations.push("Consider diversifying channel mix for broader reach");
    }

    return {
      performanceROI,
      brandROI,
      channelROI,
      bestPerformingSegment: bestSegment,
      recommendations,
    };
  }

  /**
   * Calculate total revenue impact
   */
  private static calculateRevenueImpact(
    performance: PerformanceMarketing,
    channelMix: ChannelMix,
    competitorActions: CompetitorAction[]
  ): number {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

    // Performance boost impact
    let performanceImpact = 0;
    for (const segment of segments) {
      performanceImpact += performance.currentBoost[segment] * 0.2; // 20% of boost translates to revenue
    }
    performanceImpact /= segments.length;

    // Channel effectiveness
    let channelImpact = 0;
    for (const segment of segments) {
      for (const [channel, allocation] of Object.entries(channelMix.allocation)) {
        const effectiveness = channelMix.effectiveness[segment][channel as MarketingChannel];
        channelImpact += allocation * (effectiveness - 1) * 0.1;
      }
    }

    // Competitor action impact
    let competitorImpact = 0;
    for (const action of competitorActions) {
      competitorImpact -= action.intensity * 0.05; // Competitors reduce our revenue
    }

    return 1 + performanceImpact + channelImpact + competitorImpact;
  }

  /**
   * Calculate total brand impact
   */
  private static calculateBrandImpact(brand: BrandMarketing): number {
    return brand.growthRate;
  }

  /**
   * Initialize performance marketing state
   */
  static initializePerformanceMarketing(): PerformanceMarketing {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const empty: Record<Segment, number> = {} as Record<Segment, number>;
    for (const segment of segments) {
      empty[segment] = 0;
    }

    return {
      budget: { ...empty },
      currentBoost: { ...empty },
      previousBoost: { ...empty },
      effectiveness: 0,
    };
  }

  /**
   * Initialize brand marketing state
   */
  static initializeBrandMarketing(initialBrandValue: number): BrandMarketing {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const empty: Record<Segment, number> = {} as Record<Segment, number>;
    const equity: Record<Segment, number> = {} as Record<Segment, number>;
    for (const segment of segments) {
      empty[segment] = 0;
      equity[segment] = initialBrandValue;
    }

    return {
      budget: { ...empty },
      equityBySegment: equity,
      overallEquity: initialBrandValue,
      growthRate: 0,
    };
  }
}

