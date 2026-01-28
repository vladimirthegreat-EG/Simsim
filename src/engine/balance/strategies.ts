/**
 * Strategy Bots - Automated decision-making strategies for balance testing
 *
 * Each strategy represents a different approach to playing the game:
 * - Volume: Maximize production and sales volume
 * - Premium: Focus on high-quality, high-margin products
 * - Brand: Heavy investment in marketing and brand building
 * - Automation: Aggressive factory automation investment
 * - Balanced: Moderate investment across all areas
 *
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
 * Volume Strategy: Maximize production and sales volume
 * - Focus on Budget and General segments
 * - Low prices to maximize market share
 * - Moderate quality investment
 */
export const volumeStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cashAvailable = state.cash;
  const decisions: AllDecisions = {};

  // Factory: Invest in worker efficiency for volume
  if (cashAvailable > 5_000_000) {
    decisions.factory = {
      efficiencyInvestments: {
        [state.factories[0]?.id || "factory-1"]: {
          workers: Math.min(2_000_000, cashAvailable * 0.1),
          machinery: Math.min(1_000_000, cashAvailable * 0.05),
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

  // Marketing: Moderate advertising focused on Budget/General
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(3_000_000, cashAvailable * 0.05),
      General: Math.min(2_000_000, cashAvailable * 0.04),
      Enthusiast: 0,
      Professional: 0,
      "Active Lifestyle": 0,
    },
    brandingInvestment: Math.min(1_000_000, cashAvailable * 0.02),
    promotions: [
      { segment: "Budget", discountPercent: 10, duration: 1 },
    ],
    sponsorships: [],
  };

  // R&D: Focus on cost reduction
  decisions.rd = {
    rdBudget: Math.min(2_000_000, cashAvailable * 0.03),
    newProducts: [],
    productImprovements: [],
  };

  return decisions;
};

/**
 * Premium Strategy: Focus on high-quality, high-margin products
 * - Target Professional and Enthusiast segments
 * - High quality investment
 * - Premium pricing
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
          machinery: Math.min(3_000_000, cashAvailable * 0.1),
          supervisors: Math.min(1_000_000, cashAvailable * 0.03),
          engineers: Math.min(2_000_000, cashAvailable * 0.07),
          factory: 0,
        },
      },
      greenInvestments: {},
      upgradePurchases: [],
      newFactories: [],
      esgInitiatives: {},
    };
  }

  // Marketing: Focus on premium segments
  decisions.marketing = {
    advertisingBudget: {
      Budget: 0,
      General: Math.min(1_000_000, cashAvailable * 0.02),
      Enthusiast: Math.min(3_000_000, cashAvailable * 0.05),
      Professional: Math.min(4_000_000, cashAvailable * 0.06),
      "Active Lifestyle": 0,
    },
    brandingInvestment: Math.min(3_000_000, cashAvailable * 0.05),
    promotions: [],
    sponsorships: [],
  };

  // R&D: Heavy investment for quality improvements
  decisions.rd = {
    rdBudget: Math.min(8_000_000, cashAvailable * 0.12),
    newProducts: [],
    productImprovements: [
      { productId: "professional-product", qualityIncrease: 5, featuresIncrease: 3 },
      { productId: "enthusiast-product", qualityIncrease: 3, featuresIncrease: 2 },
    ],
  };

  return decisions;
};

/**
 * Brand Strategy: Heavy investment in marketing and brand building
 * - Maximum advertising spend
 * - Sponsorships and promotions
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

  // Marketing: HEAVY investment
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(4_000_000, cashAvailable * 0.08),
      General: Math.min(5_000_000, cashAvailable * 0.10),
      Enthusiast: Math.min(3_000_000, cashAvailable * 0.06),
      Professional: Math.min(2_000_000, cashAvailable * 0.04),
      "Active Lifestyle": Math.min(2_000_000, cashAvailable * 0.04),
    },
    brandingInvestment: Math.min(8_000_000, cashAvailable * 0.15),
    promotions: [
      { segment: "General", discountPercent: 5, duration: 1 },
    ],
    sponsorships: [
      { name: "Major Sports Event", cost: Math.min(2_000_000, cashAvailable * 0.04), brandImpact: 0.02 },
    ],
  };

  // R&D: Moderate
  decisions.rd = {
    rdBudget: Math.min(3_000_000, cashAvailable * 0.05),
    newProducts: [],
    productImprovements: [],
  };

  return decisions;
};

/**
 * Automation Strategy: Aggressive factory automation investment
 * - Buy automation upgrade early
 * - Reduce labor costs
 * - Scale production
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
          machinery: Math.min(5_000_000, cashAvailable * 0.1),
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

  // Marketing: Moderate
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(1_500_000, cashAvailable * 0.03),
      General: Math.min(2_000_000, cashAvailable * 0.04),
      Enthusiast: Math.min(1_000_000, cashAvailable * 0.02),
      Professional: 0,
      "Active Lifestyle": 0,
    },
    brandingInvestment: Math.min(1_000_000, cashAvailable * 0.02),
    promotions: [],
    sponsorships: [],
  };

  // R&D: Moderate
  decisions.rd = {
    rdBudget: Math.min(3_000_000, cashAvailable * 0.05),
    newProducts: [],
    productImprovements: [],
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
  };

  // R&D: Moderate with improvements
  decisions.rd = {
    rdBudget: Math.min(4_000_000, cashAvailable * 0.07),
    newProducts: [],
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
    ],
  };

  return decisions;
};

/**
 * R&D Focused Strategy: Heavy investment in research and product development
 * - Maximum R&D budget
 * - Continuous product improvements
 * - Patent accumulation
 */
export const rdFocusedStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cashAvailable = state.cash;
  const decisions: AllDecisions = {};

  // Factory: Minimal, focus on engineers
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

  // Marketing: Moderate
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(1_000_000, cashAvailable * 0.02),
      General: Math.min(2_000_000, cashAvailable * 0.04),
      Enthusiast: Math.min(2_000_000, cashAvailable * 0.04),
      Professional: Math.min(1_500_000, cashAvailable * 0.03),
      "Active Lifestyle": 0,
    },
    brandingInvestment: Math.min(1_500_000, cashAvailable * 0.03),
    promotions: [],
    sponsorships: [],
  };

  // R&D: HEAVY investment
  decisions.rd = {
    rdBudget: Math.min(15_000_000, cashAvailable * 0.25),
    newProducts: [],
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 5, featuresIncrease: 5 },
      { productId: "professional-product", qualityIncrease: 3, featuresIncrease: 3 },
      { productId: "enthusiast-product", qualityIncrease: 3, featuresIncrease: 3 },
    ],
  };

  return decisions;
};

/**
 * Cost Cutter Strategy: Minimize expenses, maximize efficiency
 * - Low investment across the board
 * - Focus on cost reduction
 * - Conservative cash management
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

  // Marketing: Minimal, focus on discounts
  decisions.marketing = {
    advertisingBudget: {
      Budget: Math.min(500_000, cashAvailable * 0.01),
      General: Math.min(500_000, cashAvailable * 0.01),
      Enthusiast: 0,
      Professional: 0,
      "Active Lifestyle": 0,
    },
    brandingInvestment: 0,
    promotions: [
      { segment: "Budget", discountPercent: 15, duration: 1 },
      { segment: "General", discountPercent: 10, duration: 1 },
    ],
    sponsorships: [],
  };

  // R&D: Minimal
  decisions.rd = {
    rdBudget: Math.min(1_000_000, cashAvailable * 0.02),
    newProducts: [],
    productImprovements: [],
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
