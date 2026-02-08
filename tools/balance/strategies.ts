/**
 * Strategy Bots - Automated decision-making strategies for balance testing
 *
 * Each strategy represents a different approach to playing the game:
 * - Volume: Maximize production via low prices in Budget/General
 * - Premium: High-quality products at premium prices
 * - Brand: Heavy investment in marketing and brand building
 * - Automation: Factory automation → cost savings → price advantage
 * - Balanced: Moderate investment across all areas
 * - R&D Focused: Heavy R&D → quality/feature leadership
 * - Cost Cutter: Minimal spend, aggressive pricing
 *
 * v3.1.0: Strategies now use productPricing and promotions effectively.
 * BALANCE RULE: No single strategy should win >60% of the time.
 */

import type { TeamState, MarketState, AllDecisions } from "../types";

// ============================================
// STRATEGY ARCHETYPES
// ============================================

export type StrategyArchetype =
  | "volume"
  | "premium"
  | "brand"
  | "automation"
  | "balanced"
  | "rd-focused"
  | "cost-cutter";

export type StrategyDecisionMaker = (
  state: TeamState,
  market: MarketState,
  round: number
) => AllDecisions;

export interface StrategyResult {
  archetype: StrategyArchetype;
  decisions: AllDecisions;
}

// ============================================
// STRATEGY IMPLEMENTATIONS
// ============================================

/**
 * Volume Strategy: Maximize market share through low prices
 * - Undercut on Budget and General segments
 * - Moderate quality to stay competitive
 * - High advertising in price-sensitive segments
 */
export const volumeStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cashAvailable = state.cash;
  const decisions: AllDecisions = {};

  // Factory: Invest in workers and machinery for production capacity
  if (cashAvailable > 5_000_000) {
    decisions.factory = {
      efficiencyInvestments: {
        [state.factories[0]?.id || "factory-1"]: {
          workers: Math.min(2_000_000, cashAvailable * 0.08),
          machinery: Math.min(1_500_000, cashAvailable * 0.06),
          supervisors: 0,
          engineers: 0,
          factory: 0,
        },
      },
      greenInvestments: {},
      upgradePurchases: [],
      newFactories: [],
      esgInitiatives: {},
    };
  }

  // Marketing: Aggressive pricing + ads on Budget/General
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(4_000_000, cashAvailable * 0.07),
      General: Math.min(3_000_000, cashAvailable * 0.05),
      Enthusiast: 0,
      Professional: 0,
      "Active Lifestyle": Math.min(1_000_000, cashAvailable * 0.02),
    },
    brandingInvestment: Math.min(1_500_000, cashAvailable * 0.03),
    promotions: [
      { segment: "Budget", discountPercent: 8, duration: 1 },
    ],
    sponsorships: [],
    // v3.1.0: Undercut on Budget and General
    productPricing: [
      { productId: "budget-product", newPrice: 170 },
      { productId: "initial-product", newPrice: 390 },
      { productId: "active-product", newPrice: 530 },
    ],
  };

  // R&D: Moderate — keep products competitive
  decisions.rd = {
    rdBudget: Math.min(3_000_000, cashAvailable * 0.05),
    newProducts: [],
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  return decisions;
};

/**
 * Premium Strategy: Focus on high-quality, high-margin products
 * - Target Professional and Enthusiast segments
 * - Heavy R&D for quality improvements
 * - Premium pricing backed by quality
 */
export const premiumStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cashAvailable = state.cash;
  const decisions: AllDecisions = {};

  // Factory: Invest in quality (engineers, machinery)
  if (cashAvailable > 5_000_000) {
    decisions.factory = {
      efficiencyInvestments: {
        [state.factories[0]?.id || "factory-1"]: {
          workers: 0,
          machinery: Math.min(3_000_000, cashAvailable * 0.08),
          supervisors: Math.min(1_000_000, cashAvailable * 0.03),
          engineers: Math.min(2_000_000, cashAvailable * 0.06),
          factory: 0,
        },
      },
      greenInvestments: {},
      upgradePurchases: [],
      newFactories: [],
      esgInitiatives: {},
    };
  }

  // Marketing: Focus on premium segments with premium pricing
  decisions.marketing = {
    advertisingBudget: {
      Budget: 0,
      General: Math.min(1_500_000, cashAvailable * 0.03),
      Enthusiast: Math.min(4_000_000, cashAvailable * 0.07),
      Professional: Math.min(5_000_000, cashAvailable * 0.08),
      "Active Lifestyle": Math.min(2_000_000, cashAvailable * 0.03),
    },
    brandingInvestment: Math.min(3_000_000, cashAvailable * 0.05),
    promotions: [],
    sponsorships: [],
    // v3.1.0: Premium pricing — quality justifies higher prices
    productPricing: [
      { productId: "professional-product", newPrice: 1400 },
      { productId: "enthusiast-product", newPrice: 900 },
      { productId: "active-product", newPrice: 680 },
    ],
  };

  // R&D: Heavy investment for quality improvements
  decisions.rd = {
    rdBudget: Math.min(10_000_000, cashAvailable * 0.15),
    newProducts: [],
    productImprovements: [
      { productId: "professional-product", qualityIncrease: 3, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 3, featuresIncrease: 3 },
      { productId: "active-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  return decisions;
};

/**
 * Brand Strategy: Heavy investment in marketing and brand building
 * - Maximum branding and advertising spend
 * - Sponsorships for brand impact
 * - Moderate product quality
 */
export const brandStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cashAvailable = state.cash;
  const decisions: AllDecisions = {};

  // Factory: Minimal investment
  decisions.factory = {
    efficiencyInvestments: {
      [state.factories[0]?.id || "factory-1"]: {
        workers: Math.min(500_000, cashAvailable * 0.02),
        machinery: Math.min(500_000, cashAvailable * 0.02),
        supervisors: 0,
        engineers: 0,
        factory: 0,
      },
    },
    greenInvestments: {},
    upgradePurchases: [],
    newFactories: [],
    esgInitiatives: {},
  };

  // Marketing: HEAVY investment — brand is the core strategy
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(3_000_000, cashAvailable * 0.06),
      General: Math.min(5_000_000, cashAvailable * 0.10),
      Enthusiast: Math.min(3_000_000, cashAvailable * 0.06),
      Professional: Math.min(2_000_000, cashAvailable * 0.04),
      "Active Lifestyle": Math.min(3_000_000, cashAvailable * 0.06),
    },
    brandingInvestment: Math.min(8_000_000, cashAvailable * 0.15),
    promotions: [],
    sponsorships: [
      { name: "Major Sports Event", cost: Math.min(2_000_000, cashAvailable * 0.04), brandImpact: 0.02 },
    ],
    // Keep standard pricing — brand premium comes from brand value score
    productPricing: [],
  };

  // R&D: Moderate
  decisions.rd = {
    rdBudget: Math.min(3_000_000, cashAvailable * 0.05),
    newProducts: [],
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  return decisions;
};

/**
 * Automation Strategy: Aggressive factory automation investment
 * - Buy automation upgrade early (rounds 1-3)
 * - After automation: use cost savings to undercut on price
 * - Moderate marketing to capture share
 */
export const automationStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cashAvailable = state.cash;
  const decisions: AllDecisions = {};
  const factory = state.factories[0];

  // Check if automation upgrade is already purchased
  const hasAutomation = factory?.upgrades?.includes("automation") || false;

  // Factory: Buy automation if not owned, otherwise invest in efficiency
  if (!hasAutomation && cashAvailable > 80_000_000 && round <= 3) {
    decisions.factory = {
      efficiencyInvestments: {},
      greenInvestments: {},
      upgradePurchases: [
        { factoryId: factory?.id || "factory-1", upgrade: "automation" },
      ],
      newFactories: [],
      esgInitiatives: {},
    };
  } else {
    decisions.factory = {
      efficiencyInvestments: {
        [factory?.id || "factory-1"]: {
          workers: 0,
          machinery: Math.min(4_000_000, cashAvailable * 0.08),
          supervisors: 0,
          engineers: 0,
          factory: Math.min(2_000_000, cashAvailable * 0.04),
        },
      },
      greenInvestments: {},
      upgradePurchases: [],
      newFactories: [],
      esgInitiatives: {},
    };
  }

  // Marketing: After automation, invest more in marketing and undercut on price
  const marketingMultiplier = hasAutomation ? 1.5 : 1.0;
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(2_500_000 * marketingMultiplier, cashAvailable * 0.05),
      General: Math.min(3_000_000 * marketingMultiplier, cashAvailable * 0.06),
      Enthusiast: Math.min(1_500_000, cashAvailable * 0.03),
      Professional: 0,
      "Active Lifestyle": Math.min(1_000_000, cashAvailable * 0.02),
    },
    brandingInvestment: Math.min(2_000_000, cashAvailable * 0.04),
    promotions: hasAutomation ? [
      { segment: "General", discountPercent: 8, duration: 1 },
    ] : [],
    sponsorships: [],
    // v3.1.0: After automation, use cost savings for aggressive pricing
    productPricing: hasAutomation ? [
      { productId: "budget-product", newPrice: 165 },
      { productId: "initial-product", newPrice: 380 },
      { productId: "active-product", newPrice: 520 },
    ] : [],
  };

  // R&D: Moderate — keep products competitive
  decisions.rd = {
    rdBudget: Math.min(4_000_000, cashAvailable * 0.06),
    newProducts: [],
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 1, featuresIncrease: 1 },
      { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  return decisions;
};

/**
 * Balanced Strategy: Moderate investment across all areas
 * - Diversified approach
 * - Steady growth
 * - Risk mitigation
 */
export const balancedStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cashAvailable = state.cash;
  const decisions: AllDecisions = {};

  // Factory: Balanced investment
  decisions.factory = {
    efficiencyInvestments: {
      [state.factories[0]?.id || "factory-1"]: {
        workers: Math.min(1_000_000, cashAvailable * 0.03),
        machinery: Math.min(1_500_000, cashAvailable * 0.04),
        supervisors: Math.min(500_000, cashAvailable * 0.015),
        engineers: Math.min(1_000_000, cashAvailable * 0.03),
        factory: Math.min(500_000, cashAvailable * 0.015),
      },
    },
    greenInvestments: {
      [state.factories[0]?.id || "factory-1"]: Math.min(500_000, cashAvailable * 0.01),
    },
    upgradePurchases: [],
    newFactories: [],
    esgInitiatives: {
      charitableDonation: Math.min(200_000, cashAvailable * 0.005),
    },
  };

  // Marketing: Balanced across segments
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(1_500_000, cashAvailable * 0.03),
      General: Math.min(2_000_000, cashAvailable * 0.04),
      Enthusiast: Math.min(1_500_000, cashAvailable * 0.03),
      Professional: Math.min(1_000_000, cashAvailable * 0.02),
      "Active Lifestyle": Math.min(1_000_000, cashAvailable * 0.02),
    },
    brandingInvestment: Math.min(2_000_000, cashAvailable * 0.04),
    promotions: [],
    sponsorships: [],
    productPricing: [], // Keep default pricing
  };

  // R&D: Moderate with improvements across products
  decisions.rd = {
    rdBudget: Math.min(4_000_000, cashAvailable * 0.07),
    newProducts: [],
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  return decisions;
};

/**
 * R&D Focused Strategy: Heavy investment in research and product development
 * - Maximum R&D budget for rdProgress generation
 * - Aggressive product improvements across all segments
 * - Quality/features leadership as competitive advantage
 */
export const rdFocusedStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cashAvailable = state.cash;
  const decisions: AllDecisions = {};

  // Factory: Invest in engineers for R&D output
  decisions.factory = {
    efficiencyInvestments: {
      [state.factories[0]?.id || "factory-1"]: {
        workers: 0,
        machinery: Math.min(1_000_000, cashAvailable * 0.02),
        supervisors: 0,
        engineers: Math.min(3_000_000, cashAvailable * 0.06),
        factory: 0,
      },
    },
    greenInvestments: {},
    upgradePurchases: [],
    newFactories: [],
    esgInitiatives: {},
  };

  // Marketing: Moderate ads on segments where quality/features matter most
  decisions.marketing = {
    advertisingBudget: {
      Budget: 0,
      General: Math.min(2_000_000, cashAvailable * 0.04),
      Enthusiast: Math.min(3_000_000, cashAvailable * 0.05),
      Professional: Math.min(2_500_000, cashAvailable * 0.04),
      "Active Lifestyle": Math.min(2_000_000, cashAvailable * 0.03),
    },
    brandingInvestment: Math.min(2_000_000, cashAvailable * 0.04),
    promotions: [],
    sponsorships: [],
    // Slightly premium pricing backed by quality/features
    productPricing: [
      { productId: "enthusiast-product", newPrice: 850 },
      { productId: "professional-product", newPrice: 1350 },
    ],
  };

  // R&D: HEAVY investment — generates rdProgress from budget AND engineers
  decisions.rd = {
    rdBudget: Math.min(15_000_000, cashAvailable * 0.22),
    newProducts: [],
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 3, featuresIncrease: 4 },
      { productId: "enthusiast-product", qualityIncrease: 3, featuresIncrease: 3 },
      { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 3 },
    ],
  };

  return decisions;
};

/**
 * Cost Cutter Strategy: Minimize expenses, aggressive pricing
 * - Lowest prices in Budget/General via undercutting
 * - Heavy promotional discounts
 * - Minimal investment — conserve cash
 */
export const costCutterStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cashAvailable = state.cash;
  const decisions: AllDecisions = {};

  // Factory: Minimal investment
  decisions.factory = {
    efficiencyInvestments: {
      [state.factories[0]?.id || "factory-1"]: {
        workers: Math.min(500_000, cashAvailable * 0.01),
        machinery: Math.min(500_000, cashAvailable * 0.01),
        supervisors: 0,
        engineers: 0,
        factory: 0,
      },
    },
    greenInvestments: {},
    upgradePurchases: [],
    newFactories: [],
    esgInitiatives: {},
  };

  // Marketing: Aggressive pricing + promotions on price-sensitive segments
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(1_500_000, cashAvailable * 0.03),
      General: Math.min(1_500_000, cashAvailable * 0.03),
      Enthusiast: 0,
      Professional: 0,
      "Active Lifestyle": 0,
    },
    brandingInvestment: Math.min(500_000, cashAvailable * 0.01),
    promotions: [
      { segment: "Budget", discountPercent: 12, duration: 1 },
      { segment: "General", discountPercent: 8, duration: 1 },
    ],
    sponsorships: [],
    // v3.1.0: Aggressive undercutting
    productPricing: [
      { productId: "budget-product", newPrice: 155 },
      { productId: "initial-product", newPrice: 370 },
      { productId: "active-product", newPrice: 500 },
    ],
  };

  // R&D: Minimal — just enough to not fall behind
  decisions.rd = {
    rdBudget: Math.min(2_000_000, cashAvailable * 0.03),
    newProducts: [],
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  return decisions;
};

// ============================================
// STRATEGY REGISTRY
// ============================================

export const STRATEGIES: Record<StrategyArchetype, StrategyDecisionMaker> = {
  volume: volumeStrategy,
  premium: premiumStrategy,
  brand: brandStrategy,
  automation: automationStrategy,
  balanced: balancedStrategy,
  "rd-focused": rdFocusedStrategy,
  "cost-cutter": costCutterStrategy,
};

/**
 * Get all available strategy archetypes
 */
export function getAvailableStrategies(): StrategyArchetype[] {
  return Object.keys(STRATEGIES) as StrategyArchetype[];
}

/**
 * Get a strategy by archetype
 */
export function getStrategy(archetype: StrategyArchetype): StrategyDecisionMaker {
  const strategy = STRATEGIES[archetype];
  if (!strategy) {
    throw new Error(`Unknown strategy archetype: ${archetype}`);
  }
  return strategy;
}
