/**
 * Strategy Bots v8.0 — Full-spectrum decision-making for balance testing
 *
 * Every strategy uses ALL game systems (factory, HR, finance, marketing, R&D, ESG).
 * Differentiation comes from timing, emphasis, and segment focus — not from
 * ignoring entire systems. This models how real players would play.
 *
 * Core gameplay loop (all strategies):
 *   1. Production capacity (workers + machinery + automation upgrade)
 *   2. R&D budget + product improvements + new archetype products
 *   3. Marketing (ads, branding, pricing, promotions)
 *   4. ESG initiatives (scaled by strategy identity)
 *   5. HR (hiring engineers/workers, training)
 *   6. Finance (dividends for EPS, conservative debt management)
 *
 * Strategy identity determines:
 *   - WHEN to buy automation (round 1-4)
 *   - WHICH segments to focus ads/pricing on
 *   - HOW MUCH to allocate to R&D vs marketing vs factory
 *   - WHICH factory upgrades to buy (sustainability vs efficiency vs quality)
 *   - WHICH new product archetypes to develop
 *   - ESG emphasis (social vs environmental vs governance)
 *
 * BALANCE RULE: No single strategy should win >60% of the time.
 */

import type { TeamState, MarketState, AllDecisions } from "../../engine/types";

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
// HELPERS
// ============================================

function hasUpgrade(state: TeamState, upgrade: string): boolean {
  return state.factories[0]?.upgrades?.includes(upgrade) || false;
}

function fid(state: TeamState): string {
  return state.factories[0]?.id || "factory-1";
}

function hasTech(state: TeamState, tech: string): boolean {
  return state.unlockedTechnologies?.includes(tech) || false;
}

/** Safely try to buy a factory upgrade if affordable and not already owned */
function tryUpgrade(state: TeamState, upgrade: string, cost: number): Array<{ factoryId: string; upgrade: string }> {
  if (hasUpgrade(state, upgrade)) return [];
  if (state.cash < cost * 1.1) return []; // Need 10% buffer
  return [{ factoryId: fid(state), upgrade }];
}

// ============================================
// VOLUME STRATEGY
// ============================================

/**
 * Volume Strategy: Maximum output, lowest prices, Budget/General/Active dominance
 *
 * Identity: "Sell more units than anyone else at the lowest price"
 * - Automation round 1 (production is everything)
 * - Heavy worker/machinery investment for max capacity
 * - advancedRobotics upgrade for +50% capacity (round 4+)
 * - New products: long_life_phone (Budget), outdoor_basic (Active)
 * - ESG: minimal (governance only — executivePayRatio is free)
 * - HR: hire workers aggressively, basic training
 * - Finance: small dividends for EPS
 * - Pricing: aggressive undercut in price-sensitive segments
 */
export const volumeStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const auto = hasUpgrade(state, "automation");

  // === FACTORY ===
  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...(round >= 4 ? tryUpgrade(state, "advancedRobotics", 100_000_000) : []),
    ...(round >= 5 ? tryUpgrade(state, "leanManufacturing", 40_000_000) : []),
  ];

  const postAutoMult = auto ? 0.5 : 1.0;
  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(3_500_000 * postAutoMult, cash * 0.07),
        machinery: Math.min(5_000_000, cash * 0.10),
        supervisors: Math.min(500_000, cash * 0.01),
        engineers: Math.min(1_500_000, cash * 0.03),
        factory: Math.min(1_500_000, cash * 0.03),
      },
    },
    greenInvestments: {},
    upgradePurchases: upgrades,
    newFactories: [] as Array<{ name: string; region: string }>,
    esgInitiatives: {
      // Free ESG points
      ...(round >= 3 ? { executivePayRatio: true } : {}),
      ...(round >= 5 ? { whistleblowerProtection: true } : {}),
    } as Record<string, unknown>,
  };

  // === HR ===
  const hr: Record<string, unknown> = {
    // Hire workers for production capacity
    recruitmentSearches: [
      ...(round <= 4 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 3 ? [{ role: "engineer", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
    ],
  };

  // === MARKETING ===
  const adMult = auto ? 1.4 : 1.0;
  const marketing = {
    advertisingBudget: {
      Budget: Math.min(5_000_000 * adMult, cash * 0.09),
      General: Math.min(4_500_000 * adMult, cash * 0.08),
      Enthusiast: Math.min(1_000_000, cash * 0.02),
      Professional: 0,
      "Active Lifestyle": Math.min(3_500_000 * adMult, cash * 0.06),
    },
    brandingInvestment: Math.min(3_500_000, cash * 0.05),
    promotions: [
      { segment: "Budget", discountPercent: auto ? 10 : 5, duration: 1 },
      ...(auto ? [{ segment: "General", discountPercent: 6, duration: 1 }] : []),
    ],
    sponsorships: round >= 5 ? [
      { name: "Budget Retailer Partnership", cost: Math.min(2_000_000, cash * 0.03), brandImpact: 0.01 },
    ] : [],
    productPricing: auto ? [
      { productId: "budget-product", newPrice: 165 },
      { productId: "initial-product", newPrice: 385 },
      { productId: "active-product", newPrice: 510 },
    ] : [
      { productId: "budget-product", newPrice: 185 },
      { productId: "initial-product", newPrice: 410 },
      { productId: "active-product", newPrice: 540 },
    ],
  };

  // === R&D ===
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  // Develop budget-focused archetype products when tech is available
  if (round >= 3 && hasTech(state, "process_optimization")) {
    const hasLongLife = state.products?.some(p => p.name === "Long Life Phone");
    if (!hasLongLife) {
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
    }
  }
  if (round >= 4 && hasTech(state, "process_optimization")) {
    const hasOutdoor = state.products?.some(p => p.name === "Outdoor Basic");
    if (!hasOutdoor) {
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" });
    }
  }

  const rd = {
    rdBudget: Math.min(11_000_000, cash * 0.13),
    newProducts,
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 3, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 3, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
    ],
  };

  // === FINANCE ===
  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 3 ? 0.5 : 0,
  };

  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// PREMIUM STRATEGY
// ============================================

/**
 * Premium Strategy: Quality/features leadership in high-margin segments
 *
 * Identity: "Best products command the highest prices"
 * - Automation round 3 (quality foundation first)
 * - Heavy R&D + engineers for quality/features scoring
 * - qualityLab upgrade (-50% defects, +30% QA speed)
 * - cleanRoom upgrade (+20% price premium)
 * - New products: camera_phone (Enthusiast), business_phone (Professional)
 * - ESG: workplace safety + community (Professional ESG weight: 17%)
 * - HR: hire engineers aggressively, premium recruitment
 * - Finance: moderate dividends, conservative
 * - Pricing: premium backed by quality — Professional/Enthusiast focus
 */
export const premiumStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const auto = hasUpgrade(state, "automation");

  // === FACTORY ===
  const upgrades = [
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 2 ? tryUpgrade(state, "qualityLab", 60_000_000) : []),
    ...(round >= 5 ? tryUpgrade(state, "cleanRoom", 120_000_000) : []),
    ...(round >= 4 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
  ];

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_500_000, cash * 0.03),
        machinery: Math.min(4_000_000, cash * 0.08),
        supervisors: Math.min(1_500_000, cash * 0.03),
        engineers: Math.min(3_500_000, cash * 0.07),
        factory: Math.min(1_000_000, cash * 0.02),
      },
    },
    greenInvestments: {
      [fid(state)]: Math.min(1_500_000, cash * 0.025),
    },
    upgradePurchases: upgrades,
    newFactories: [] as Array<{ name: string; region: string }>,
    esgInitiatives: {
      workplaceSafety: Math.min(2_500_000, cash * 0.04),
      communityEngagement: Math.min(1_000_000, cash * 0.015),
      ...(round >= 3 ? { diversityInclusion: true } : {}),
      ...(round >= 4 ? { transparencyReport: true } : {}),
      ...(round >= 5 ? { humanRightsAudit: true } : {}),
    } as Record<string, unknown>,
  };

  // === HR ===
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      // Premium recruitment for high-quality engineers
      { role: "engineer", tier: round >= 3 ? "premium" : "basic", factoryId: fid(state) },
      ...(round <= 3 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 4 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "engineer", programType: "innovation" },
      ...(round >= 3 ? [{ role: "worker", programType: "accuracy" }] : []),
    ],
    benefitChanges: {
      professionalDevelopment: Math.min(5_000, cash > 50_000_000 ? 5_000 : 2_000),
    },
  };

  // === MARKETING ===
  const marketing = {
    advertisingBudget: {
      Budget: 0,
      General: Math.min(2_500_000, cash * 0.04),
      Enthusiast: Math.min(5_500_000, cash * 0.09),
      Professional: Math.min(6_500_000, cash * 0.10),
      "Active Lifestyle": Math.min(3_500_000, cash * 0.06),
    },
    brandingInvestment: Math.min(4_500_000, cash * 0.07),
    promotions: [] as Array<{ segment: string; discountPercent: number; duration: number }>,
    sponsorships: [
      ...(round >= 3 ? [{ name: "Tech Conference Sponsor", cost: Math.min(3_500_000, cash * 0.05), brandImpact: 0.015 }] : []),
    ],
    productPricing: [
      { productId: "professional-product", newPrice: 1080 },
      { productId: "enthusiast-product", newPrice: 700 },
      { productId: "active-product", newPrice: 535 },
      { productId: "initial-product", newPrice: 405 },
    ],
  };

  // === R&D ===
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  // Develop premium archetype products
  if (round >= 4 && hasTech(state, "advanced_manufacturing")) {
    const hasCameraPhone = state.products?.some(p => p.name === "Camera Phone");
    if (!hasCameraPhone) {
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 85, targetFeatures: 80, archetypeId: "camera_phone" });
    }
  }
  if (round >= 5 && hasTech(state, "advanced_manufacturing")) {
    const hasBizPhone = state.products?.some(p => p.name === "Business Phone");
    if (!hasBizPhone) {
      newProducts.push({ name: "Business Phone", segment: "Professional", targetQuality: 92, targetFeatures: 88, archetypeId: "business_phone" });
    }
  }

  const rd = {
    rdBudget: Math.min(13_000_000, cash * 0.16),
    newProducts,
    productImprovements: [
      { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 3 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
    ],
  };

  // === FINANCE ===
  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 4 ? 0.75 : 0,
  };

  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// BRAND STRATEGY
// ============================================

/**
 * Brand Strategy: Marketing dominance through brand value compounding
 *
 * Identity: "The brand IS the product — charge more because people trust us"
 * - Automation round 3 (after brand foundation established)
 * - Maximum branding + advertising spend in brand-weighted segments
 * - Sponsorships every round for brand multiplier
 * - New products: smart_companion (General, AI), cinema_screen (General, Display)
 * - ESG: heavy social (communityEngagement, diversityInclusion → brand halo)
 * - HR: moderate, focus on stability (benefits)
 * - Finance: dividends for investor confidence
 * - Pricing: premium justified by brand reputation
 * - Focus: General (brand:17%), Active (10%), Enthusiast (8%)
 */
export const brandStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const auto = hasUpgrade(state, "automation");

  // === FACTORY ===
  const upgrades = [
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 4 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
    ...(round >= 6 ? tryUpgrade(state, "flexibleManufacturing", 90_000_000) : []),
  ];

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(2_000_000, cash * 0.04),
        machinery: Math.min(3_000_000, cash * 0.06),
        supervisors: Math.min(500_000, cash * 0.01),
        engineers: Math.min(2_000_000, cash * 0.04),
        factory: Math.min(1_000_000, cash * 0.02),
      },
    },
    greenInvestments: {
      [fid(state)]: Math.min(500_000, cash * 0.01),
    },
    upgradePurchases: upgrades,
    newFactories: [] as Array<{ name: string; region: string }>,
    esgInitiatives: {
      communityEngagement: Math.min(2_000_000, cash * 0.03),
      charitableDonation: Math.min(1_000_000, cash * 0.015),
      ...(round >= 2 ? { diversityInclusion: true } : {}),
      ...(round >= 3 ? { employeeWellness: true } : {}),
      ...(round >= 4 ? { transparencyReport: true } : {}),
      ...(round >= 5 ? { executivePayRatio: true } : {}),
    } as Record<string, unknown>,
  };

  // === HR ===
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      ...(round >= 2 ? [{ role: "engineer", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "teamwork" },
    ],
    // Good benefits = low turnover = stable brand image
    benefitChanges: {
      flexibleWork: true,
      paidTimeOff: 20,
    },
  };

  // === MARKETING (the core) ===
  const brandMult = round >= 4 ? 1.15 : 1.0;
  const marketing = {
    advertisingBudget: {
      Budget: Math.min(1_500_000, cash * 0.02),
      General: Math.min(5_500_000 * brandMult, cash * 0.12),
      Enthusiast: Math.min(4_500_000 * brandMult, cash * 0.07),
      Professional: Math.min(3_000_000, cash * 0.05),
      "Active Lifestyle": Math.min(5_000_000 * brandMult, cash * 0.10),
    },
    brandingInvestment: Math.min(5_500_000, cash * 0.08),
    promotions: round >= 5 ? [
      { segment: "General", discountPercent: 5, duration: 1 },
    ] : [],
    sponsorships: [
      { name: "National TV Campaign", cost: Math.min(2_500_000, cash * 0.04), brandImpact: 0.025 },
      ...(round >= 4 ? [{ name: "Sports Team Jersey", cost: Math.min(2_500_000, cash * 0.04), brandImpact: 0.015 }] : []),
      ...(round >= 6 ? [{ name: "Influencer Partnership", cost: Math.min(1_000_000, cash * 0.015), brandImpact: 0.005 }] : []),
    ],
    // Moderate premium pricing — brand reputation adds some but not excessive markup
    productPricing: [
      { productId: "initial-product", newPrice: 440 },
      { productId: "active-product", newPrice: 575 },
      { productId: "enthusiast-product", newPrice: 780 },
      { productId: "budget-product", newPrice: 195 },
      { productId: "professional-product", newPrice: 1200 },
    ],
  };

  // === R&D ===
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 3 && hasTech(state, "process_optimization")) {
    const hasSmartCompanion = state.products?.some(p => p.name === "Smart Companion");
    if (!hasSmartCompanion) {
      newProducts.push({ name: "Smart Companion", segment: "General", targetQuality: 70, targetFeatures: 65, archetypeId: "smart_companion" });
    }
  }
  if (round >= 5 && hasTech(state, "advanced_manufacturing")) {
    const hasCinema = state.products?.some(p => p.name === "Cinema Screen");
    if (!hasCinema) {
      newProducts.push({ name: "Cinema Screen", segment: "General", targetQuality: 72, targetFeatures: 60, archetypeId: "cinema_screen" });
    }
  }

  const rd = {
    rdBudget: Math.min(10_000_000, cash * 0.12),
    newProducts,
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 2 },
    ],
  };

  // === FINANCE ===
  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 3 ? 0.6 : 0,
  };

  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// AUTOMATION STRATEGY
// ============================================

/**
 * Automation Strategy: Rush automation round 1, then efficiency dominance
 *
 * Identity: "Be the factory of the future — lowest cost, highest throughput"
 * - Automation round 1 (the defining move)
 * - Follow up with leanManufacturing, iotIntegration, advancedRobotics
 * - Moderate everything else — pure efficiency play
 * - New products: entry_smartphone (General), connected_phone (General)
 * - ESG: governance-only (free points)
 * - HR: minimal — automation reduces worker needs by 80%
 * - Finance: aggressive dividends from efficiency profits
 * - Pricing: deep undercut backed by 35% cost reduction
 */
export const automationStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const auto = hasUpgrade(state, "automation");

  // === FACTORY ===
  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...(round >= 3 ? tryUpgrade(state, "leanManufacturing", 40_000_000) : []),
    ...(round >= 4 ? tryUpgrade(state, "iotIntegration", 50_000_000) : []),
    ...(round >= 6 ? tryUpgrade(state, "advancedRobotics", 100_000_000) : []),
  ];

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_000_000, cash * 0.02),
        machinery: Math.min(5_000_000, cash * 0.10),
        supervisors: 0,
        engineers: Math.min(1_500_000, cash * 0.03),
        factory: Math.min(2_500_000, cash * 0.05),
      },
    },
    greenInvestments: {},
    upgradePurchases: upgrades,
    newFactories: [] as Array<{ name: string; region: string }>,
    esgInitiatives: {
      ...(round >= 2 ? { executivePayRatio: true } : {}),
      ...(round >= 3 ? { codeOfEthics: true } : {}),
      ...(round >= 4 ? { whistleblowerProtection: true } : {}),
    } as Record<string, unknown>,
  };

  // === HR ===
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      ...(round <= 2 ? [{ role: "engineer", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
    ],
  };

  // === MARKETING ===
  const adMult = auto ? 1.5 : 1.0;
  const marketing = {
    advertisingBudget: {
      Budget: Math.min(4_000_000 * adMult, cash * 0.07),
      General: Math.min(4_500_000 * adMult, cash * 0.08),
      Enthusiast: Math.min(2_500_000, cash * 0.04),
      Professional: Math.min(1_500_000, cash * 0.02),
      "Active Lifestyle": Math.min(3_000_000 * adMult, cash * 0.05),
    },
    brandingInvestment: Math.min(3_500_000, cash * 0.06),
    promotions: auto ? [
      { segment: "General", discountPercent: 8, duration: 1 },
      { segment: "Budget", discountPercent: 7, duration: 1 },
    ] : [],
    sponsorships: [] as Array<{ name: string; cost: number; brandImpact: number }>,
    productPricing: auto ? [
      { productId: "budget-product", newPrice: 155 },
      { productId: "initial-product", newPrice: 365 },
      { productId: "active-product", newPrice: 495 },
    ] : [
      { productId: "budget-product", newPrice: 185 },
      { productId: "initial-product", newPrice: 410 },
      { productId: "active-product", newPrice: 540 },
    ],
  };

  // === R&D ===
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 4 && hasTech(state, "process_optimization")) {
    const hasEntry = state.products?.some(p => p.name === "Entry Smartphone");
    if (!hasEntry) {
      newProducts.push({ name: "Entry Smartphone", segment: "General", targetQuality: 68, targetFeatures: 55, archetypeId: "entry_smartphone" });
    }
  }

  const rd = {
    rdBudget: Math.min(10_000_000, cash * 0.12),
    newProducts,
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 3, featuresIncrease: 2 },
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
    ],
  };

  // === FINANCE ===
  const finance: Record<string, unknown> = {
    dividendPerShare: auto && round >= 3 ? 1.0 : 0,
  };

  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// BALANCED STRATEGY
// ============================================

/**
 * Balanced Strategy: Diversified investment across all areas
 *
 * Identity: "No weaknesses — steady, sustainable growth everywhere"
 * - Automation round 3 (after broad foundation)
 * - Even investment across all 5 segments
 * - continuousImprovement + solarPanels upgrades
 * - New products: snapshot_phone (General), outdoor_basic (Active)
 * - ESG: broad portfolio (social + environmental + governance)
 * - HR: balanced hiring, good benefits for retention
 * - Finance: moderate dividends + conservative debt
 * - Pricing: competitive — slightly below market across all segments
 */
export const balancedStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const auto = hasUpgrade(state, "automation");

  // === FACTORY ===
  const upgrades = [
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 2 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
    ...(round >= 5 ? tryUpgrade(state, "solarPanels", 45_000_000) : []),
    ...(round >= 6 ? tryUpgrade(state, "waterRecycling", 25_000_000) : []),
  ];

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(2_000_000, cash * 0.04),
        machinery: Math.min(3_500_000, cash * 0.07),
        supervisors: Math.min(1_000_000, cash * 0.02),
        engineers: Math.min(2_000_000, cash * 0.04),
        factory: Math.min(1_000_000, cash * 0.02),
      },
    },
    greenInvestments: {
      [fid(state)]: Math.min(1_500_000, cash * 0.025),
    },
    upgradePurchases: upgrades,
    newFactories: [] as Array<{ name: string; region: string }>,
    esgInitiatives: {
      charitableDonation: Math.min(800_000, cash * 0.012),
      workplaceSafety: Math.min(1_000_000, cash * 0.015),
      ...(round >= 2 ? { employeeWellness: true } : {}),
      ...(round >= 3 ? { diversityInclusion: true } : {}),
      ...(round >= 3 ? { transparencyReport: true } : {}),
      ...(round >= 4 ? { codeOfEthics: true } : {}),
      ...(round >= 5 ? { executivePayRatio: true } : {}),
    } as Record<string, unknown>,
  };

  // === HR ===
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      ...(round >= 4 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
      ...(round >= 3 ? [{ role: "engineer", programType: "innovation" }] : []),
    ],
    benefitChanges: {
      healthInsurance: 70,
      retirementMatch: 5,
      paidTimeOff: 18,
    },
  };

  // === MARKETING ===
  const marketing = {
    advertisingBudget: {
      Budget: Math.min(3_000_000, cash * 0.05),
      General: Math.min(4_000_000, cash * 0.07),
      Enthusiast: Math.min(3_000_000, cash * 0.05),
      Professional: Math.min(2_500_000, cash * 0.04),
      "Active Lifestyle": Math.min(3_500_000, cash * 0.06),
    },
    brandingInvestment: Math.min(5_000_000, cash * 0.08),
    promotions: round >= 5 ? [
      { segment: "General", discountPercent: 5, duration: 1 },
    ] : [],
    sponsorships: round >= 4 ? [
      { name: "Influencer Partnership", cost: Math.min(1_500_000, cash * 0.02), brandImpact: 0.008 },
    ] : [],
    productPricing: [
      { productId: "budget-product", newPrice: 180 },
      { productId: "initial-product", newPrice: 405 },
      { productId: "active-product", newPrice: 535 },
      { productId: "enthusiast-product", newPrice: 770 },
      { productId: "professional-product", newPrice: 1180 },
    ],
  };

  // === R&D ===
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 3 && hasTech(state, "process_optimization")) {
    const hasSnapshot = state.products?.some(p => p.name === "Snapshot Phone");
    if (!hasSnapshot) {
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 70, targetFeatures: 58, archetypeId: "snapshot_phone" });
    }
  }
  if (round >= 5 && hasTech(state, "process_optimization")) {
    const hasOutdoor = state.products?.some(p => p.name === "Outdoor Basic");
    if (!hasOutdoor) {
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 65, targetFeatures: 55, archetypeId: "outdoor_basic" });
    }
  }

  const rd = {
    rdBudget: Math.min(10_000_000, cash * 0.12),
    newProducts,
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 1 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 1 },
    ],
  };

  // === FINANCE ===
  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 4 ? 0.6 : 0,
  };

  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// R&D FOCUSED STRATEGY
// ============================================

/**
 * R&D Focused Strategy: Technology leadership through maximum R&D
 *
 * Identity: "Unlock tech faster than anyone, build superior products"
 * - Automation round 2 (needs process_optimization from R&D budget)
 * - Maximum R&D budget ($15M/round) + heavy engineer hiring
 * - rapidPrototyping upgrade (50% faster R&D)
 * - digitalTwin upgrade (20% maintenance reduction)
 * - New products: gaming_phone (Enthusiast), ai_assistant_phone (General)
 * - ESG: workplace safety + professional development (talent retention)
 * - HR: aggressive engineer recruitment (premium tier)
 * - Finance: minimal dividends (reinvest everything in R&D)
 * - Pricing: premium on quality/feature-heavy segments
 * - Focus: Enthusiast (features:45%), Professional (quality:40%), Active (quality:34%)
 */
export const rdFocusedStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const auto = hasUpgrade(state, "automation");

  // === FACTORY ===
  const upgrades = [
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 3 ? tryUpgrade(state, "rapidPrototyping", 40_000_000) : []),
    ...(round >= 4 ? tryUpgrade(state, "digitalTwin", 60_000_000) : []),
    ...(round >= 5 ? tryUpgrade(state, "qualityLab", 60_000_000) : []),
  ];

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_000_000, cash * 0.02),
        machinery: Math.min(3_500_000, cash * 0.07),
        supervisors: Math.min(500_000, cash * 0.01),
        engineers: Math.min(5_000_000, cash * 0.10),
        factory: Math.min(500_000, cash * 0.01),
      },
    },
    greenInvestments: {},
    upgradePurchases: upgrades,
    newFactories: [] as Array<{ name: string; region: string }>,
    esgInitiatives: {
      workplaceSafety: Math.min(1_500_000, cash * 0.025),
      ...(round >= 3 ? { employeeWellness: true } : {}),
      ...(round >= 4 ? { transparencyReport: true } : {}),
    } as Record<string, unknown>,
  };

  // === HR ===
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      // Aggressive engineer hiring — R&D output scales with engineer count
      { role: "engineer", tier: round >= 3 ? "premium" : "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      ...(round <= 3 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "engineer", programType: "innovation" },
      { role: "engineer", programType: "problemSolving" },
    ],
    benefitChanges: {
      professionalDevelopment: 6_000,
      stockOptions: true,
    },
  };

  // === MARKETING ===
  const marketing = {
    advertisingBudget: {
      Budget: 0,
      General: Math.min(3_000_000, cash * 0.05),
      Enthusiast: Math.min(5_000_000, cash * 0.08),
      Professional: Math.min(5_000_000, cash * 0.08),
      "Active Lifestyle": Math.min(3_500_000, cash * 0.06),
    },
    brandingInvestment: Math.min(3_500_000, cash * 0.05),
    promotions: [] as Array<{ segment: string; discountPercent: number; duration: number }>,
    sponsorships: round >= 4 ? [
      { name: "Gaming Tournament", cost: Math.min(2_000_000, cash * 0.03), brandImpact: 0.01 },
    ] : [],
    // Moderate pricing — reinvest margins into R&D rather than extracting premium
    productPricing: [
      { productId: "enthusiast-product", newPrice: 720 },
      { productId: "professional-product", newPrice: 1100 },
      { productId: "active-product", newPrice: 530 },
      { productId: "initial-product", newPrice: 400 },
    ],
  };

  // === R&D (the core) ===
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  // Develop tech-demanding archetype products
  if (round >= 3 && hasTech(state, "process_optimization")) {
    const hasAI = state.products?.some(p => p.name === "AI Assistant Phone");
    if (!hasAI) {
      newProducts.push({ name: "AI Assistant Phone", segment: "General", targetQuality: 72, targetFeatures: 70, archetypeId: "ai_assistant_phone" });
    }
  }
  if (round >= 5 && hasTech(state, "advanced_manufacturing")) {
    const hasGaming = state.products?.some(p => p.name === "Gaming Phone");
    if (!hasGaming) {
      newProducts.push({ name: "Gaming Phone", segment: "Enthusiast", targetQuality: 82, targetFeatures: 85, archetypeId: "gaming_phone" });
    }
  }

  const rd = {
    rdBudget: Math.min(12_000_000, cash * 0.15),
    newProducts,
    productImprovements: [
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 3 },
      { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 1, featuresIncrease: 2 },
    ],
  };

  // === FINANCE ===
  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 5 ? 0.3 : 0, // Reinvest most in R&D
  };

  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// COST CUTTER STRATEGY
// ============================================

/**
 * Cost Cutter Strategy: Maximum efficiency, minimum waste, lowest prices
 *
 * Identity: "Strip every dollar of waste — then pass the savings to customers"
 * - Automation round 2 (35% cost reduction is the core of this strategy)
 * - leanManufacturing + sixSigma for defect/waste reduction
 * - Focus on Budget (price:65%) and General (price:28%)
 * - New products: long_life_phone (Budget), entry_smartphone (General)
 * - ESG: minimal but strategic (governance for free points)
 * - HR: lean staffing, efficiency-focused training
 * - Finance: conservative, hoard cash, no debt
 * - Pricing: deepest undercuts in market, backed by real cost advantage
 */
export const costCutterStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const auto = hasUpgrade(state, "automation");

  // === FACTORY ===
  const upgrades = [
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 3 ? tryUpgrade(state, "leanManufacturing", 40_000_000) : []),
    ...(round >= 4 ? tryUpgrade(state, "sixSigma", 75_000_000) : []),
    ...(round >= 6 ? tryUpgrade(state, "iotIntegration", 50_000_000) : []),
  ];

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_500_000, cash * 0.03),
        machinery: Math.min(4_000_000, cash * 0.08),
        supervisors: 0,
        engineers: Math.min(1_000_000, cash * 0.02),
        factory: Math.min(1_500_000, cash * 0.03),
      },
    },
    greenInvestments: {},
    upgradePurchases: upgrades,
    newFactories: [] as Array<{ name: string; region: string }>,
    esgInitiatives: {
      ...(round >= 3 ? { executivePayRatio: true } : {}),
      ...(round >= 4 ? { codeOfEthics: true } : {}),
      ...(round >= 5 ? { whistleblowerProtection: true } : {}),
    } as Record<string, unknown>,
  };

  // === HR ===
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      ...(round <= 3 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 3 ? [{ role: "engineer", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
      { role: "worker", programType: "speed" },
    ],
  };

  // === MARKETING ===
  const adMult = auto ? 1.5 : 1.0;
  const marketing = {
    advertisingBudget: {
      Budget: Math.min(5_000_000 * adMult, cash * 0.08),
      General: Math.min(3_500_000 * adMult, cash * 0.06),
      Enthusiast: Math.min(500_000, cash * 0.01),
      Professional: 0,
      "Active Lifestyle": Math.min(2_500_000 * adMult, cash * 0.04),
    },
    brandingInvestment: Math.min(2_000_000, cash * 0.03),
    promotions: auto ? [
      { segment: "Budget", discountPercent: 12, duration: 1 },
      { segment: "General", discountPercent: 8, duration: 1 },
      { segment: "Active Lifestyle", discountPercent: 5, duration: 1 },
    ] : [
      { segment: "Budget", discountPercent: 6, duration: 1 },
    ],
    sponsorships: round >= 5 ? [
      { name: "Budget Retailer Partnership", cost: Math.min(2_000_000, cash * 0.03), brandImpact: 0.01 },
    ] : [],
    // Deepest undercutting — automation + lean + six sigma = massive cost advantage
    productPricing: auto ? [
      { productId: "budget-product", newPrice: 155 },
      { productId: "initial-product", newPrice: 355 },
      { productId: "active-product", newPrice: 490 },
    ] : [
      { productId: "budget-product", newPrice: 175 },
      { productId: "initial-product", newPrice: 395 },
      { productId: "active-product", newPrice: 525 },
    ],
  };

  // === R&D ===
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 4 && hasTech(state, "process_optimization")) {
    const hasLongLife = state.products?.some(p => p.name === "Long Life Phone");
    if (!hasLongLife) {
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
    }
  }

  const rd = {
    rdBudget: Math.min(9_000_000, cash * 0.11),
    newProducts,
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 1 },
    ],
  };

  // === FINANCE ===
  const finance: Record<string, unknown> = {
    dividendPerShare: auto && round >= 4 ? 0.8 : 0,
  };

  return { factory, hr, marketing, rd, finance } as AllDecisions;
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
