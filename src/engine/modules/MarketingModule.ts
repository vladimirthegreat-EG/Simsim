/**
 * Marketing Module - Handles advertising, branding, promotions, and brand value
 */

import {
  MarketingDecisions,
  TeamState,
  ModuleResult,
  Segment,
  CONSTANTS,
} from "../types";
import { createErrorResult } from "../utils";
import { cloneTeamState } from "../utils/stateUtils";

export class MarketingModule {
  /**
   * Process all marketing decisions for a round
   */
  static process(
    state: TeamState,
    decisions: MarketingDecisions & {
      // Support alternative decision formats from UI/tests
      marketingBudget?: Array<{
        segment: Segment | string;
        region?: string;
        spend: number;
        campaignType?: string;
      }>;
      positioningStrategy?: string;
    }
  ): { newState: TeamState; result: ModuleResult } {
    try {
      return this.processInternal(state, decisions);
    } catch (error) {
      return createErrorResult("MarketingModule", error, state);
    }
  }

  /**
   * Internal processing logic
   */
  private static processInternal(
    state: TeamState,
    decisions: MarketingDecisions & {
      marketingBudget?: Array<{
        segment: Segment | string;
        region?: string;
        spend: number;
        campaignType?: string;
      }>;
      positioningStrategy?: string;
    }
  ): { newState: TeamState; result: ModuleResult } {
    let newState = cloneTeamState(state);
    let totalCosts = 0;
    const messages: string[] = [];
    const startingBrandValue = state.brandValue;

    // Track total brand growth this round (before applying cap)
    let totalBrandGrowth = 0;

    // Process advertising budget (standard format: advertisingBudget[segment])
    if (decisions.advertisingBudget) {
      for (const [segment, budget] of Object.entries(decisions.advertisingBudget)) {
        if (budget > 0) {
          const brandImpact = this.calculateAdvertisingImpact(budget, segment as Segment);
          totalBrandGrowth += brandImpact;
          totalCosts += budget;
          messages.push(`${segment} advertising: $${(budget / 1_000_000).toFixed(1)}M → +${(brandImpact * 100).toFixed(2)}% brand`);
        }
      }
    }

    // Support alternative format: marketingBudget array
    if (decisions.marketingBudget && Array.isArray(decisions.marketingBudget)) {
      for (const item of decisions.marketingBudget) {
        const segment = item.segment as Segment;
        const budget = item.spend;
        if (budget > 0) {
          const brandImpact = this.calculateAdvertisingImpact(budget, segment);
          totalBrandGrowth += brandImpact;
          totalCosts += budget;
          messages.push(`${segment} advertising: $${(budget / 1_000_000).toFixed(1)}M → +${(brandImpact * 100).toFixed(2)}% brand`);
        }
      }
    }

    // Process branding investment
    if (decisions.brandingInvestment && decisions.brandingInvestment > 0) {
      const investment = decisions.brandingInvestment;
      const brandImpact = this.calculateBrandingImpact(investment);
      totalBrandGrowth += brandImpact;
      totalCosts += investment;
      messages.push(`Branding investment: $${(investment / 1_000_000).toFixed(1)}M → +${(brandImpact * 100).toFixed(2)}% brand`);
    }

    // v3.1.0: Process product pricing decisions
    if (decisions.productPricing) {
      for (const pricing of decisions.productPricing) {
        const product = newState.products.find(p => p.id === pricing.productId);
        if (product && pricing.newPrice > 0) {
          const oldPrice = product.price;
          product.price = pricing.newPrice;
          messages.push(`Repriced ${product.name}: $${oldPrice} → $${pricing.newPrice}`);
        }
      }
    }

    // Process promotions — apply discount directly to product prices for this round
    // v3.1.0: Promotions now actually reduce prices for market scoring
    if (decisions.promotions) {
      for (const promo of decisions.promotions) {
        const segmentProduct = newState.products.find(p => p.segment === promo.segment);
        if (segmentProduct && promo.discountPercent > 0) {
          const discount = promo.discountPercent / 100;
          const oldPrice = segmentProduct.price;
          segmentProduct.price = Math.round(oldPrice * (1 - discount));
          messages.push(`${promo.segment} promotion: ${promo.discountPercent}% off ($${oldPrice} → $${segmentProduct.price})`);
        }
      }
    }

    // Process sponsorships
    if (decisions.sponsorships) {
      for (const sponsorship of decisions.sponsorships) {
        if (newState.cash >= sponsorship.cost) {
          totalBrandGrowth += sponsorship.brandImpact;
          totalCosts += sponsorship.cost;
          messages.push(`Sponsorship: ${sponsorship.name} → +${(sponsorship.brandImpact * 100).toFixed(2)}% brand`);
        } else {
          messages.push(`Insufficient funds for ${sponsorship.name} sponsorship`);
        }
      }
    }

    // Apply brand growth cap (prevents runaway brand dominance from overspending)
    const maxGrowth = CONSTANTS.BRAND_MAX_GROWTH_PER_ROUND;
    const cappedGrowth = Math.min(totalBrandGrowth, maxGrowth);
    if (totalBrandGrowth > maxGrowth) {
      messages.push(`Brand growth capped at ${(maxGrowth * 100).toFixed(1)}% (diminishing returns)`);
    }

    // Apply capped growth
    newState.brandValue = Math.min(1, startingBrandValue + cappedGrowth);

    // Natural brand decay (brands need constant investment)
    // Decay is proportional to current brand value (higher brands decay faster)
    // This prevents runaway brand dominance
    const decayAmount = newState.brandValue * CONSTANTS.BRAND_DECAY_RATE;
    newState.brandValue = Math.max(0, newState.brandValue - decayAmount);

    // Deduct costs from cash
    newState.cash -= totalCosts;

    return {
      newState,
      result: {
        success: true,
        changes: {
          advertisingSpend: Object.values(decisions.advertisingBudget || {}).reduce((sum: number, val) => sum + (val as number), 0),
          brandingSpend: decisions.brandingInvestment || 0,
          promotionsActive: decisions.promotions?.length || 0,
          sponsorshipsSecured: decisions.sponsorships?.length || 0,
          brandValueChange: newState.brandValue - state.brandValue,
        },
        costs: totalCosts,
        revenue: 0,
        messages,
      },
    };
  }

  /**
   * Calculate advertising impact on brand value
   * Diminishing returns on spending
   *
   * v2.1.0: Reduced base impact and added steeper diminishing returns
   * to prevent brand strategy dominance.
   */
  static calculateAdvertisingImpact(budget: number, segment: Segment): number {
    // Base: $1M = 0.15% brand increase (reduced from 0.25%)
    // Diminishing returns: effectiveness drops by 60% every $3M (steeper than before)
    const millions = budget / 1_000_000;

    // Segment multipliers (premium segments are harder to penetrate)
    const segmentMultipliers: Record<Segment, number> = {
      "Budget": 1.1,
      "General": 1.0,
      "Enthusiast": 0.75,
      "Professional": 0.5,
      "Active Lifestyle": 0.85,
    };

    const multiplier = segmentMultipliers[segment];
    const baseImpact = 0.0015; // 0.15% per $1M (reduced from 0.25%)

    // Apply diminishing returns more aggressively
    let totalImpact = 0;
    let remaining = millions;
    let currentEffectiveness = 1.0;

    while (remaining > 0) {
      const chunk = Math.min(remaining, 3); // Smaller chunks (3M vs 5M)
      totalImpact += chunk * baseImpact * currentEffectiveness * multiplier;
      remaining -= chunk;
      currentEffectiveness *= 0.4; // Drop to 40% effectiveness for next chunk (was 50%)
    }

    return totalImpact;
  }

  /**
   * Calculate branding investment impact
   * More efficient than advertising for long-term brand building
   *
   * v2.1.0: Added diminishing returns curve and reduced base impact
   * to prevent brand strategy dominance.
   */
  static calculateBrandingImpact(investment: number): number {
    const millions = investment / 1_000_000;
    // Reduced from 0.4% to 0.25% per $1M with diminishing returns
    const baseImpact = 0.0025; // 0.25% per $1M

    // Apply logarithmic diminishing returns
    // First $5M is most effective, then drops off
    if (millions <= 5) {
      return millions * baseImpact;
    }

    // Beyond $5M: use logarithmic scaling
    const baseReturn = 5 * baseImpact;
    const extraMillions = millions - 5;
    // Each doubling of extra investment only adds 50% more benefit
    const extraReturn = baseImpact * 2.5 * Math.log2(1 + extraMillions / 5);

    return baseReturn + extraReturn;
  }

  /**
   * Calculate brand awareness by segment
   */
  static calculateBrandAwarenessBySegment(
    brandValue: number,
    marketShare: Record<Segment, number>,
    advertisingBySegment: Record<Segment, number>
  ): Record<Segment, number> {
    const awareness: Record<Segment, number> = {
      "Budget": 0,
      "General": 0,
      "Enthusiast": 0,
      "Professional": 0,
      "Active Lifestyle": 0,
    };

    for (const segment of CONSTANTS.SEGMENTS) {
      // Base awareness from overall brand
      let segmentAwareness = brandValue * 0.5;

      // Add segment-specific advertising impact
      const adSpend = advertisingBySegment[segment] || 0;
      segmentAwareness += this.calculateAdvertisingImpact(adSpend, segment);

      // Existing market share boosts awareness (word of mouth)
      const share = marketShare[segment] || 0;
      segmentAwareness += share * 0.2;

      awareness[segment] = Math.min(1, segmentAwareness);
    }

    return awareness;
  }

  /**
   * Calculate promotion effectiveness
   */
  static calculatePromotionImpact(
    discountPercent: number,
    segment: Segment,
    brandValue: number
  ): { salesBoost: number; marginReduction: number } {
    // Price elasticity by segment
    const elasticities: Record<Segment, number> = {
      "Budget": 2.5,      // Very price sensitive
      "General": 1.8,
      "Enthusiast": 1.2,
      "Professional": 0.8, // Less price sensitive
      "Active Lifestyle": 1.5,
    };

    const elasticity = elasticities[segment];

    // Sales boost = discount × elasticity × (1 + brand)
    const salesBoost = (discountPercent / 100) * elasticity * (1 + brandValue);

    // Margin reduction is direct
    const marginReduction = discountPercent / 100;

    return { salesBoost, marginReduction };
  }

  /**
   * Calculate sponsorship value
   *
   * v2.1.0: Increased costs ~50% and reduced brand impact ~40%
   * to make sponsorships less dominant as a brand-building strategy.
   */
  static generateSponsorshipOptions(): Array<{
    name: string;
    cost: number;
    brandImpact: number;
    segmentFocus: Segment | "all";
  }> {
    return [
      {
        name: "Tech Conference Sponsor",
        cost: 7_500_000,      // was 5M
        brandImpact: 0.012,   // was 0.02
        segmentFocus: "Professional",
      },
      {
        name: "Sports Team Jersey",
        cost: 22_000_000,     // was 15M
        brandImpact: 0.03,    // was 0.05
        segmentFocus: "Active Lifestyle",
      },
      {
        name: "Gaming Tournament",
        cost: 4_500_000,      // was 3M
        brandImpact: 0.009,   // was 0.015
        segmentFocus: "Enthusiast",
      },
      {
        name: "National TV Campaign",
        cost: 35_000_000,     // was 25M
        brandImpact: 0.045,   // was 0.08
        segmentFocus: "all",
      },
      {
        name: "Influencer Partnership",
        cost: 3_000_000,      // was 2M
        brandImpact: 0.006,   // was 0.01
        segmentFocus: "General",
      },
      {
        name: "Budget Retailer Partnership",
        cost: 12_000_000,     // was 8M
        brandImpact: 0.018,   // was 0.03
        segmentFocus: "Budget",
      },
    ];
  }

  /**
   * Calculate brand contribution to market share
   */
  static calculateBrandMarketShareContribution(
    brandValue: number,
    esgScore: number
  ): number {
    // Brand contributes 20% of market share calculation
    // ESG adds a sustainability premium (up to 10%)
    const brandContribution = brandValue * 0.2;
    const esgContribution = (esgScore / 1000) * 0.1;

    return brandContribution + esgContribution;
  }
}
