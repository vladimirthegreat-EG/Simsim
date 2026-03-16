/**
 * Strategy Bots v11.0 — Shared foundation, late divergence
 *
 * DESIGN PRINCIPLE:
 *   Rounds 1-4: ALL strategies play IDENTICALLY — build up foundation.
 *     - R1: Hire, invest in factory efficiency, start R&D, advertise all segments
 *     - R2: Buy automation ($75M), continue building
 *     - R3: Build 2nd factory (Asia), start developing new products
 *     - R4: More products, more hiring, keep scaling
 *
 *   Rounds 5+: Strategies DIVERGE with different upgrades, segment focus,
 *     pricing, product portfolios. Differentiation is $2-5M shifts, not
 *     fundamentally different approaches.
 *
 * All strategies advertise in ALL 5 segments, hire throughout, invest in R&D,
 * and build multiple products. No zeroes anywhere.
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

function factoryCount(state: TeamState): number {
  return state.factories?.length || 1;
}

function hasProduct(state: TeamState, name: string): boolean {
  return state.products?.some(p => p.name === name) || false;
}

function tryUpgrade(state: TeamState, upgrade: string, cost: number): Array<{ factoryId: string; upgrade: string }> {
  if (hasUpgrade(state, upgrade)) return [];
  if (state.cash < cost * 1.1) return [];
  return [{ factoryId: fid(state), upgrade }];
}

/** Round-scaling multiplier for spending growth */
function rs(round: number): number {
  if (round <= 2) return 1.0;
  if (round <= 4) return 1.15;
  if (round <= 6) return 1.3;
  return 1.45;
}

// ============================================
// SHARED FOUNDATION (Rounds 1-4)
// All strategies use this identically.
// ============================================

function sharedFoundation(state: TeamState, market: MarketState, round: number): AllDecisions {
  const cash = state.cash;
  const r = rs(round);

  // === FACTORY ===
  const upgrades = [
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 3 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (round >= 3 && factoryCount(state) < 2 && cash > 80_000_000) {
    newFactories.push({ name: "Expansion Plant Asia", region: "Asia" });
  }

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(2_000_000 * r, cash * 0.04),
        machinery: Math.min(3_500_000 * r, cash * 0.07),
        supervisors: Math.min(500_000, cash * 0.01),
        engineers: Math.min(2_000_000 * r, cash * 0.04),
        factory: Math.min(1_000_000, cash * 0.02),
      },
    },
    greenInvestments: {
      [fid(state)]: Math.min(500_000, cash * 0.008),
    },
    upgradePurchases: upgrades,
    newFactories,
    esgInitiatives: {
      ...(round >= 2 ? { executivePayRatio: true } : {}),
      ...(round >= 3 ? { employeeWellness: true } : {}),
      ...(round >= 3 ? { diversityInclusion: true } : {}),
      ...(round >= 4 ? { transparencyReport: true } : {}),
    } as Record<string, unknown>,
  };

  // === HR ===
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      ...(round >= 3 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 4 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
    ],
    benefitChanges: {
      paidTimeOff: 18,
    },
  };

  // === MARKETING ===
  const marketing = {
    advertisingBudget: {
      Budget: Math.min(2_500_000 * r, cash * 0.04),
      General: Math.min(3_500_000 * r, cash * 0.06),
      Enthusiast: Math.min(2_500_000 * r, cash * 0.04),
      Professional: Math.min(2_000_000 * r, cash * 0.035),
      "Active Lifestyle": Math.min(3_000_000 * r, cash * 0.05),
    },
    brandingInvestment: Math.min(3_000_000 * r, cash * 0.05),
    promotions: [] as Array<{ segment: string; discountPercent: number; duration: number }>,
    sponsorships: [] as Array<{ name: string; cost: number; brandImpact: number }>,
    productPricing: [
      { productId: "budget-product", newPrice: 190 },
      { productId: "initial-product", newPrice: 410 },
      { productId: "active-product", newPrice: 540 },
      { productId: "enthusiast-product", newPrice: 760 },
      { productId: "professional-product", newPrice: 1170 },
    ],
  };

  // === R&D ===
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 3 && hasTech(state, "process_optimization")) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
  }
  if (round >= 4 && hasTech(state, "process_optimization")) {
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" });
  }

  const rd = {
    rdBudget: Math.min(10_500_000 * r, cash * 0.25),
    newProducts,
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 2 },
    ],
  };

  // === FINANCE ===
  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 3 ? 0.5 : 0,
  };

  return { factory, hr, marketing, rd, finance } as AllDecisions;
}

// ============================================
// VOLUME STRATEGY (diverges R5+)
// ============================================

/**
 * Volume: From R5 — extra ads in Budget/General/Active, lower prices,
 * more workers, advancedRobotics upgrade, Budget/Active products.
 */
export const volumeStrategy: StrategyDecisionMaker = (state, market, round) => {
  if (round <= 4) return sharedFoundation(state, market, round);

  const cash = state.cash;
  const r = rs(round);

  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...tryUpgrade(state, "continuousImprovement", 30_000_000),
    ...tryUpgrade(state, "advancedRobotics", 100_000_000),
    ...(round >= 7 ? tryUpgrade(state, "leanManufacturing", 40_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Volume Plant Asia", region: "Asia" });
  if (round >= 7 && factoryCount(state) < 3 && cash > 100_000_000)
    newFactories.push({ name: "Volume Plant MENA", region: "MENA" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(3_000_000 * r, cash * 0.12),
        machinery: Math.min(4_000_000 * r, cash * 0.15),
        supervisors: Math.min(500_000, cash * 0.04),
        engineers: Math.min(2_000_000 * r, cash * 0.10),
        factory: Math.min(1_500_000, cash * 0.08),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(500_000, cash * 0.008) },
    upgradePurchases: upgrades,
    newFactories,
    esgInitiatives: {
      executivePayRatio: true,
      employeeWellness: true,
      diversityInclusion: true,
      transparencyReport: true,
      ...(round >= 6 ? { whistleblowerProtection: true } : {}),
    } as Record<string, unknown>,
  };

  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "supervisor", tier: "basic", factoryId: fid(state) },
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
      { role: "worker", programType: "speed" },
    ],
  };

  const marketing = {
    advertisingBudget: {
      Budget: Math.min(7_000_000 * r, cash * 0.20),
      General: Math.min(6_000_000 * r, cash * 0.18),
      Enthusiast: Math.min(2_000_000 * r, cash * 0.08),
      Professional: Math.min(1_500_000 * r, cash * 0.06),
      "Active Lifestyle": Math.min(5_500_000 * r, cash * 0.16),
    },
    brandingInvestment: Math.min(3_000_000 * r, cash * 0.05),
    promotions: [
      { segment: "Budget", discountPercent: 5, duration: 1 },
    ],
    sponsorships: [
      { name: "Budget Retailer Partnership", cost: Math.min(1_500_000, cash * 0.02), brandImpact: 0.008 },
    ],
    productPricing: [
      { productId: "budget-product", newPrice: 185 },
      { productId: "initial-product", newPrice: 405 },
      { productId: "active-product", newPrice: 535 },
      { productId: "enthusiast-product", newPrice: 755 },
      { productId: "professional-product", newPrice: 1165 },
    ],
  };

  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (hasTech(state, "process_optimization")) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" });
    if (!hasProduct(state, "Connected Phone"))
      newProducts.push({ name: "Connected Phone", segment: "General", targetQuality: 54, targetFeatures: 50, archetypeId: "connected_phone" });
  }
  if (hasTech(state, "advanced_manufacturing")) {
    if (!hasProduct(state, "Rugged Phone"))
      newProducts.push({ name: "Rugged Phone", segment: "Active Lifestyle", targetQuality: 62, targetFeatures: 55, archetypeId: "rugged_phone" });
  }

  const rd = {
    rdBudget: Math.min(10_500_000 * r, cash * 0.25),
    newProducts,
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 3, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  const finance: Record<string, unknown> = { dividendPerShare: 0.5 };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// PREMIUM STRATEGY (diverges R5+)
// ============================================

/**
 * Premium: From R5 — qualityLab upgrade, extra Enthusiast/Professional ads,
 * higher prices, quality-focused products, more engineers.
 */
export const premiumStrategy: StrategyDecisionMaker = (state, market, round) => {
  if (round <= 4) return sharedFoundation(state, market, round);

  const cash = state.cash;
  const r = rs(round);

  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...tryUpgrade(state, "continuousImprovement", 30_000_000),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Premium Plant Europe", region: "Europe" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_500_000 * r, cash * 0.08),
        machinery: Math.min(4_000_000 * r, cash * 0.15),
        supervisors: Math.min(800_000, cash * 0.05),
        engineers: Math.min(3_500_000 * r, cash * 0.12),
        factory: Math.min(1_000_000, cash * 0.06),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(1_000_000, cash * 0.05) },
    upgradePurchases: upgrades,
    newFactories,
    esgInitiatives: {
      workplaceHealthSafety: true,
      executivePayRatio: true,
      employeeWellness: true,
      diversityInclusion: true,
      transparencyReport: true,
      ...(round >= 6 ? { humanRightsAudit: true } : {}),
    } as Record<string, unknown>,
  };

  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "supervisor", tier: "basic", factoryId: fid(state) },
    ],
    trainingPrograms: [
      { role: "engineer", programType: "innovation" },
    ],
    benefitChanges: {
      professionalDevelopment: 3_000,
      paidTimeOff: 20,
    },
  };

  const marketing = {
    advertisingBudget: {
      Budget: Math.min(1_500_000 * r, cash * 0.06),
      General: Math.min(2_500_000 * r, cash * 0.10),
      Enthusiast: Math.min(5_000_000 * r, cash * 0.15),
      Professional: Math.min(5_000_000 * r, cash * 0.15),
      "Active Lifestyle": Math.min(2_500_000 * r, cash * 0.10),
    },
    brandingInvestment: Math.min(2_500_000 * r, cash * 0.10),
    promotions: [] as Array<{ segment: string; discountPercent: number; duration: number }>,
    sponsorships: round >= 6 ? [
      { name: "Tech Conference Sponsor", cost: Math.min(1_500_000, cash * 0.02), brandImpact: 0.008 },
    ] : [],
    productPricing: [
      { productId: "budget-product", newPrice: 190 },
      { productId: "initial-product", newPrice: 410 },
      { productId: "active-product", newPrice: 540 },
      { productId: "enthusiast-product", newPrice: 765 },
      { productId: "professional-product", newPrice: 1175 },
    ],
  };

  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (hasTech(state, "process_optimization")) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" });
    if (!hasProduct(state, "Smart Companion"))
      newProducts.push({ name: "Smart Companion", segment: "General", targetQuality: 58, targetFeatures: 55, archetypeId: "smart_companion" });
  }
  if (hasTech(state, "advanced_manufacturing")) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 72, targetFeatures: 68, archetypeId: "camera_phone" });
    if (!hasProduct(state, "Business Phone"))
      newProducts.push({ name: "Business Phone", segment: "Professional", targetQuality: 80, targetFeatures: 75, archetypeId: "business_phone" });
  }

  const rd = {
    rdBudget: Math.min(10_000_000 * r, cash * 0.25),
    newProducts,
    productImprovements: [
      { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 1, featuresIncrease: 1 },
      { productId: "initial-product", qualityIncrease: 1, featuresIncrease: 1 },
      { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  const finance: Record<string, unknown> = { dividendPerShare: 0.5 };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// BRAND STRATEGY (diverges R5+)
// ============================================

/**
 * Brand: From R5 — higher branding, sponsorships, extra General/Active ads,
 * moderate price premium, brand-weighted segment products.
 */
export const brandStrategy: StrategyDecisionMaker = (state, market, round) => {
  if (round <= 4) return sharedFoundation(state, market, round);

  const cash = state.cash;
  const r = rs(round);

  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...tryUpgrade(state, "continuousImprovement", 30_000_000),
    ...(round >= 6 ? tryUpgrade(state, "flexibleManufacturing", 90_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Brand Plant Europe", region: "Europe" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(2_000_000 * r, cash * 0.04),
        machinery: Math.min(3_000_000 * r, cash * 0.06),
        supervisors: Math.min(500_000, cash * 0.01),
        engineers: Math.min(2_000_000 * r, cash * 0.04),
        factory: Math.min(1_000_000, cash * 0.02),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(500_000, cash * 0.008) },
    upgradePurchases: upgrades,
    newFactories,
    esgInitiatives: {
      communityInvestment: Math.min(1_500_000, cash * 0.025),
      executivePayRatio: true,
      employeeWellness: true,
      diversityInclusion: true,
      transparencyReport: true,
      ...(round >= 6 ? { codeOfEthics: true } : {}),
    } as Record<string, unknown>,
  };

  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "supervisor", tier: "basic", factoryId: fid(state) },
    ],
    trainingPrograms: [
      { role: "worker", programType: "teamwork" },
    ],
    benefitChanges: {
      flexibleWork: true,
      paidTimeOff: 20,
    },
  };

  const marketing = {
    advertisingBudget: {
      Budget: Math.min(2_000_000 * r, cash * 0.08),
      General: Math.min(5_500_000 * r, cash * 0.18),
      Enthusiast: Math.min(3_000_000 * r, cash * 0.12),
      Professional: Math.min(2_000_000 * r, cash * 0.08),
      "Active Lifestyle": Math.min(4_500_000 * r, cash * 0.15),
    },
    brandingInvestment: Math.min(6_000_000 * r, cash * 0.18),
    promotions: round >= 7 ? [
      { segment: "General", discountPercent: 5, duration: 1 },
    ] : [],
    sponsorships: [
      { name: "National TV Campaign", cost: Math.min(3_500_000, cash * 0.10), brandImpact: 0.020 },
      ...(round >= 7 ? [{ name: "Influencer Partnership", cost: Math.min(2_000_000, cash * 0.06), brandImpact: 0.008 }] : []),
    ],
    productPricing: [
      { productId: "budget-product", newPrice: 195 },
      { productId: "initial-product", newPrice: 415 },
      { productId: "active-product", newPrice: 545 },
      { productId: "enthusiast-product", newPrice: 765 },
      { productId: "professional-product", newPrice: 1175 },
    ],
  };

  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (hasTech(state, "process_optimization")) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" });
    if (!hasProduct(state, "Smart Companion"))
      newProducts.push({ name: "Smart Companion", segment: "General", targetQuality: 70, targetFeatures: 65, archetypeId: "smart_companion" });
    if (!hasProduct(state, "Cinema Screen"))
      newProducts.push({ name: "Cinema Screen", segment: "General", targetQuality: 55, targetFeatures: 50, archetypeId: "cinema_screen" });
  }
  if (hasTech(state, "advanced_manufacturing")) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 68, targetFeatures: 60, archetypeId: "camera_phone" });
    if (!hasProduct(state, "Rugged Phone"))
      newProducts.push({ name: "Rugged Phone", segment: "Active Lifestyle", targetQuality: 62, targetFeatures: 55, archetypeId: "rugged_phone" });
  }

  const rd = {
    rdBudget: Math.min(10_500_000 * r, cash * 0.25),
    newProducts,
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
      { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  const finance: Record<string, unknown> = { dividendPerShare: 0.5 };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// AUTOMATION STRATEGY (diverges R5+)
// ============================================

/**
 * Automation: From R5 — leanManufacturing + iotIntegration upgrades,
 * extra machinery/factory investment, competitive pricing, efficiency products.
 */
export const automationStrategy: StrategyDecisionMaker = (state, market, round) => {
  if (round <= 4) return sharedFoundation(state, market, round);

  const cash = state.cash;
  const r = rs(round);

  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...tryUpgrade(state, "continuousImprovement", 30_000_000),
    ...tryUpgrade(state, "leanManufacturing", 40_000_000),
    ...tryUpgrade(state, "iotIntegration", 50_000_000),
    ...(round >= 7 ? tryUpgrade(state, "advancedRobotics", 100_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Auto Plant Asia", region: "Asia" });
  if (round >= 7 && factoryCount(state) < 3 && cash > 100_000_000)
    newFactories.push({ name: "Auto Plant MENA", region: "MENA" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_500_000 * r, cash * 0.08),
        machinery: Math.min(8_000_000 * r, cash * 0.25),
        supervisors: Math.min(500_000, cash * 0.04),
        engineers: Math.min(2_000_000 * r, cash * 0.10),
        factory: Math.min(3_500_000 * r, cash * 0.12),
      },
    },
    greenInvestments: {},
    upgradePurchases: upgrades,
    newFactories,
    esgInitiatives: {
      executivePayRatio: true,
      employeeWellness: true,
      diversityInclusion: true,
      transparencyReport: true,
      ...(round >= 6 ? { codeOfEthics: true } : {}),
    } as Record<string, unknown>,
  };

  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "supervisor", tier: "basic", factoryId: fid(state) },
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
    ],
    benefitChanges: {
      professionalDevelopment: 3_000,
      paidTimeOff: 18,
    },
  };

  const marketing = {
    advertisingBudget: {
      Budget: Math.min(3_000_000 * r, cash * 0.12),
      General: Math.min(3_500_000 * r, cash * 0.12),
      Enthusiast: Math.min(3_500_000 * r, cash * 0.12),
      Professional: Math.min(3_000_000 * r, cash * 0.12),
      "Active Lifestyle": Math.min(3_500_000 * r, cash * 0.12),
    },
    brandingInvestment: Math.min(3_000_000 * r, cash * 0.12),
    promotions: [] as Array<{ segment: string; discountPercent: number; duration: number }>,
    sponsorships: [
      { name: "Tech Innovation Award", cost: Math.min(1_500_000, cash * 0.06), brandImpact: 0.008 },
    ],
    productPricing: [
      { productId: "budget-product", newPrice: 190 },
      { productId: "initial-product", newPrice: 410 },
      { productId: "active-product", newPrice: 540 },
      { productId: "enthusiast-product", newPrice: 760 },
      { productId: "professional-product", newPrice: 1170 },
    ],
  };

  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (hasTech(state, "process_optimization")) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" });
  }
  if (hasTech(state, "advanced_manufacturing")) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 70, targetFeatures: 65, archetypeId: "camera_phone" });
    if (!hasProduct(state, "Business Phone"))
      newProducts.push({ name: "Business Phone", segment: "Professional", targetQuality: 75, targetFeatures: 70, archetypeId: "business_phone" });
  }

  const rd = {
    rdBudget: Math.min(10_500_000 * r, cash * 0.25),
    newProducts,
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  const finance: Record<string, unknown> = { dividendPerShare: 0.5 };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// BALANCED STRATEGY (diverges R5+)
// ============================================

/**
 * Balanced: From R5 — even distribution everywhere, broadest product portfolio,
 * solarPanels + waterRecycling for ESG, good benefits.
 */
export const balancedStrategy: StrategyDecisionMaker = (state, market, round) => {
  if (round <= 4) return sharedFoundation(state, market, round);

  const cash = state.cash;
  const r = rs(round);

  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...tryUpgrade(state, "continuousImprovement", 30_000_000),
    ...tryUpgrade(state, "solarPanels", 45_000_000),
    ...(round >= 7 ? tryUpgrade(state, "waterRecycling", 25_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Balanced Plant Europe", region: "Europe" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(2_500_000 * r, cash * 0.10),
        machinery: Math.min(4_000_000 * r, cash * 0.15),
        supervisors: Math.min(800_000, cash * 0.05),
        engineers: Math.min(2_500_000 * r, cash * 0.10),
        factory: Math.min(1_500_000, cash * 0.08),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(2_000_000, cash * 0.08) },
    upgradePurchases: upgrades,
    newFactories,
    esgInitiatives: {
      charitableDonation: Math.min(800_000, cash * 0.012),
      workplaceHealthSafety: true,
      executivePayRatio: true,
      employeeWellness: true,
      diversityInclusion: true,
      transparencyReport: true,
      codeOfEthics: true,
    } as Record<string, unknown>,
  };

  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "supervisor", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
      { role: "engineer", programType: "innovation" },
    ],
    benefitChanges: {
      healthInsurance: 70,
      retirementMatch: 5,
      paidTimeOff: 20,
    },
  };

  const marketing = {
    advertisingBudget: {
      Budget: Math.min(3_500_000 * r, cash * 0.12),
      General: Math.min(4_000_000 * r, cash * 0.15),
      Enthusiast: Math.min(3_500_000 * r, cash * 0.12),
      Professional: Math.min(3_500_000 * r, cash * 0.12),
      "Active Lifestyle": Math.min(3_500_000 * r, cash * 0.12),
    },
    brandingInvestment: Math.min(4_000_000 * r, cash * 0.15),
    promotions: round >= 7 ? [
      { segment: "General", discountPercent: 5, duration: 1 },
    ] : [],
    sponsorships: [
      { name: "Influencer Partnership", cost: Math.min(1_500_000, cash * 0.02), brandImpact: 0.008 },
    ],
    productPricing: [
      { productId: "budget-product", newPrice: 185 },
      { productId: "initial-product", newPrice: 410 },
      { productId: "active-product", newPrice: 540 },
      { productId: "enthusiast-product", newPrice: 760 },
      { productId: "professional-product", newPrice: 1170 },
    ],
  };

  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (hasTech(state, "process_optimization")) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" });
    if (!hasProduct(state, "Smart Companion"))
      newProducts.push({ name: "Smart Companion", segment: "General", targetQuality: 58, targetFeatures: 55, archetypeId: "smart_companion" });
  }
  if (hasTech(state, "advanced_manufacturing")) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 68, targetFeatures: 60, archetypeId: "camera_phone" });
    if (!hasProduct(state, "AI Assistant Phone"))
      newProducts.push({ name: "AI Assistant Phone", segment: "General", targetQuality: 65, targetFeatures: 60, archetypeId: "ai_assistant_phone" });
  }

  const rd = {
    rdBudget: Math.min(10_500_000 * r, cash * 0.25),
    newProducts,
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 2 },
    ],
  };

  const finance: Record<string, unknown> = { dividendPerShare: 0.5 };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// R&D FOCUSED STRATEGY (diverges R5+)
// ============================================

/**
 * R&D Focused: From R5 — rapidPrototyping + digitalTwin upgrades,
 * higher R&D budget, most new products, engineer-heavy hiring.
 */
export const rdFocusedStrategy: StrategyDecisionMaker = (state, market, round) => {
  if (round <= 4) return sharedFoundation(state, market, round);

  const cash = state.cash;
  const r = rs(round);

  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...tryUpgrade(state, "continuousImprovement", 30_000_000),
    ...tryUpgrade(state, "solarPanels", 45_000_000),
    ...(round >= 7 ? tryUpgrade(state, "waterRecycling", 25_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "R&D Plant Asia", region: "Asia" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_500_000 * r, cash * 0.08),
        machinery: Math.min(3_500_000 * r, cash * 0.15),
        supervisors: Math.min(500_000, cash * 0.04),
        engineers: Math.min(5_000_000 * r, cash * 0.18),
        factory: Math.min(500_000, cash * 0.04),
      },
    },
    greenInvestments: {},
    upgradePurchases: upgrades,
    newFactories,
    esgInitiatives: {
      workplaceHealthSafety: true,
      executivePayRatio: true,
      employeeWellness: true,
      diversityInclusion: true,
      transparencyReport: true,
    } as Record<string, unknown>,
  };

  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "supervisor", tier: "basic", factoryId: fid(state) },
    ],
    trainingPrograms: [
      { role: "engineer", programType: "innovation" },
    ],
    benefitChanges: {
      professionalDevelopment: 4_000,
    },
  };

  const marketing = {
    advertisingBudget: {
      Budget: Math.min(3_000_000 * r, cash * 0.12),
      General: Math.min(4_000_000 * r, cash * 0.15),
      Enthusiast: Math.min(4_000_000 * r, cash * 0.15),
      Professional: Math.min(3_500_000 * r, cash * 0.12),
      "Active Lifestyle": Math.min(3_500_000 * r, cash * 0.12),
    },
    brandingInvestment: Math.min(3_000_000 * r, cash * 0.12),
    promotions: [] as Array<{ segment: string; discountPercent: number; duration: number }>,
    sponsorships: round >= 6 ? [
      { name: "Gaming Tournament", cost: Math.min(1_500_000, cash * 0.06), brandImpact: 0.008 },
    ] : [],
    productPricing: [
      { productId: "budget-product", newPrice: 190 },
      { productId: "initial-product", newPrice: 410 },
      { productId: "active-product", newPrice: 540 },
      { productId: "enthusiast-product", newPrice: 765 },
      { productId: "professional-product", newPrice: 1175 },
    ],
  };

  // Spread products across all segments — R&D advantage is breadth not depth
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (hasTech(state, "process_optimization")) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" });
  }
  if (hasTech(state, "advanced_manufacturing")) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 68, targetFeatures: 65, archetypeId: "camera_phone" });
    if (!hasProduct(state, "Business Phone"))
      newProducts.push({ name: "Business Phone", segment: "Professional", targetQuality: 75, targetFeatures: 70, archetypeId: "business_phone" });
    if (!hasProduct(state, "Rugged Phone"))
      newProducts.push({ name: "Rugged Phone", segment: "Active Lifestyle", targetQuality: 62, targetFeatures: 55, archetypeId: "rugged_phone" });
  }

  const rd = {
    rdBudget: Math.min(15_000_000 * r, cash * 0.25),
    newProducts,
    productImprovements: [
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
    ],
  };

  const finance: Record<string, unknown> = { dividendPerShare: 0.5 };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// COST CUTTER STRATEGY (diverges R5+)
// ============================================

/**
 * Cost Cutter: From R5 — leanManufacturing + sixSigma upgrades,
 * lowest prices, extra Budget/General ads, efficiency products.
 */
export const costCutterStrategy: StrategyDecisionMaker = (state, market, round) => {
  if (round <= 4) return sharedFoundation(state, market, round);

  const cash = state.cash;
  const r = rs(round);

  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...tryUpgrade(state, "continuousImprovement", 30_000_000),
    ...tryUpgrade(state, "leanManufacturing", 40_000_000),
    ...tryUpgrade(state, "sixSigma", 75_000_000),
    ...(round >= 7 ? tryUpgrade(state, "iotIntegration", 50_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Lean Plant Asia", region: "Asia" });
  if (round >= 7 && factoryCount(state) < 3 && cash > 100_000_000)
    newFactories.push({ name: "Lean Plant MENA", region: "MENA" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_500_000 * r, cash * 0.08),
        machinery: Math.min(6_000_000 * r, cash * 0.20),
        supervisors: Math.min(500_000, cash * 0.04),
        engineers: Math.min(1_500_000 * r, cash * 0.08),
        factory: Math.min(2_000_000 * r, cash * 0.10),
      },
    },
    greenInvestments: {},
    upgradePurchases: upgrades,
    newFactories,
    esgInitiatives: {
      executivePayRatio: true,
      employeeWellness: true,
      diversityInclusion: true,
      transparencyReport: true,
      ...(round >= 6 ? { codeOfEthics: true } : {}),
      ...(round >= 7 ? { whistleblowerProtection: true } : {}),
    } as Record<string, unknown>,
  };

  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "supervisor", tier: "basic", factoryId: fid(state) },
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
      { role: "worker", programType: "speed" },
    ],
  };

  const marketing = {
    advertisingBudget: {
      Budget: Math.min(6_500_000 * r, cash * 0.20),
      General: Math.min(5_500_000 * r, cash * 0.18),
      Enthusiast: Math.min(1_500_000 * r, cash * 0.06),
      Professional: Math.min(1_500_000 * r, cash * 0.06),
      "Active Lifestyle": Math.min(4_000_000 * r, cash * 0.15),
    },
    brandingInvestment: Math.min(3_000_000 * r, cash * 0.12),
    promotions: [
      { segment: "Budget", discountPercent: 6, duration: 1 },
    ],
    sponsorships: round >= 6 ? [
      { name: "Budget Retailer Partnership", cost: Math.min(1_500_000, cash * 0.02), brandImpact: 0.008 },
    ] : [],
    productPricing: [
      { productId: "budget-product", newPrice: 185 },
      { productId: "initial-product", newPrice: 405 },
      { productId: "active-product", newPrice: 535 },
      { productId: "enthusiast-product", newPrice: 755 },
      { productId: "professional-product", newPrice: 1165 },
    ],
  };

  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (hasTech(state, "process_optimization")) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" });
    if (!hasProduct(state, "Connected Phone"))
      newProducts.push({ name: "Connected Phone", segment: "General", targetQuality: 54, targetFeatures: 50, archetypeId: "connected_phone" });
  }
  if (hasTech(state, "advanced_manufacturing")) {
    if (!hasProduct(state, "Rugged Phone"))
      newProducts.push({ name: "Rugged Phone", segment: "Active Lifestyle", targetQuality: 62, targetFeatures: 55, archetypeId: "rugged_phone" });
  }

  const rd = {
    rdBudget: Math.min(10_500_000 * r, cash * 0.25),
    newProducts,
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  const finance: Record<string, unknown> = { dividendPerShare: 0.5 };
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

export function getAvailableStrategies(): StrategyArchetype[] {
  return Object.keys(STRATEGIES) as StrategyArchetype[];
}

export function getStrategy(archetype: StrategyArchetype): StrategyDecisionMaker {
  const strategy = STRATEGIES[archetype];
  if (!strategy) {
    throw new Error(`Unknown strategy archetype: ${archetype}`);
  }
  return strategy;
}
