/**
 * Strategy Bots v13.0 — Competitively balanced non-uniform human players
 *
 * DESIGN PRINCIPLE:
 *   Each strategy is distinct FROM ROUND 1. No shared foundation.
 *   Real players make messy, varied decisions — different R&D budgets,
 *   hiring priorities, segment focus, and spending patterns every round.
 *
 *   Key features:
 *   - productImprovements on launched products (quality/features increases)
 *   - techUpgrades using merged IDs: bat_1, cam_1, ai_1, dur_1, dsp_1, con_1
 *   - materialTierChoices vary by strategy (premium picks higher tiers)
 *   - Non-identical ad budgets across segments
 *   - Salary adjustments and training programs per archetype
 *   - Round-based variation: spending jitters, shifting priorities
 *
 * BALANCE TARGET: All strategies 10-30% win rate, none above 35% or below 8%.
 *   - All strategies reach 4-5 segments by round 6
 *   - Advertising covers all segments with products
 *   - Spending proportional to strategy identity
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
  return state.factories[0]?.upgrades?.includes(upgrade as any) || false;
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

/** Deterministic per-round jitter: returns a multiplier in [1-amplitude, 1+amplitude] */
function jitter(round: number, seed: number, amplitude: number = 0.15): number {
  // Simple hash-like mixing for deterministic but varied output
  const x = Math.sin(round * 13.7 + seed * 7.3) * 10000;
  const frac = x - Math.floor(x); // 0..1
  return 1 + (frac * 2 - 1) * amplitude;
}

/** Round-scaling multiplier for spending growth — varies slightly per strategy via offset */
function rs(round: number, offset: number = 0): number {
  const base = round + offset * 0.3;
  if (base <= 2) return 1.0;
  if (base <= 4) return 1.1 + (round % 2) * 0.05;
  if (base <= 6) return 1.25 + (round % 3) * 0.05;
  return 1.4 + (round % 2) * 0.1;
}

/** Get product IDs that exist on the team state */
function existingProductIds(state: TeamState): string[] {
  return state.products?.map(p => p.id || p.name) || [];
}

// ============================================
// VOLUME STRATEGY — High output, low prices, broad coverage,
// Assembly Lines for max capacity, hire lots of workers.
// Expands to 5 segments by R5. Competitive ad spend.
// ============================================

export const volumeStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const r = rs(round, 0);
  const j = jitter(round, 1);

  // Factory: volume wants capacity, automation, assembly lines
  const upgrades = [
    ...(round >= 1 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 2 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
    ...(round >= 3 ? tryUpgrade(state, "advancedRobotics", 100_000_000) : []),
    ...(round >= 5 ? tryUpgrade(state, "leanManufacturing", 40_000_000) : []),
    ...(round >= 7 ? tryUpgrade(state, "modularLines", 80_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (round >= 2 && factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Volume Plant Asia", region: "Asia" });
  if (round >= 6 && factoryCount(state) < 3 && cash > 100_000_000)
    newFactories.push({ name: "Volume Plant MENA", region: "MENA" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(3_500_000 * r * j, cash * 0.12),
        machinery: Math.min(4_500_000 * r, cash * 0.15),
        supervisors: Math.min(400_000 * j, cash * 0.02),
        engineers: Math.min(1_500_000 * r, cash * 0.06),
        factory: Math.min(1_200_000 * r, cash * 0.05),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(400_000 * r, cash * 0.006) },
    upgradePurchases: upgrades,
    newFactories,
    materialTierChoices: {
      Budget: 1,
      General: 2,
      "Active Lifestyle": 2,
      Enthusiast: 2,
      Professional: 2,
    } as Record<string, number>,
    esgInitiatives: {
      ...(round >= 1 ? { executivePayRatio: true } : {}),
      ...(round >= 2 ? { employeeWellness: true } : {}),
      ...(round >= 3 ? { diversityInclusion: true } : {}),
      ...(round >= 4 ? { transparencyReport: true } : {}),
      ...(round >= 5 ? { workplaceHealthSafety: true } : {}),
      ...(round >= 7 ? { whistleblowerProtection: true } : {}),
    } as Record<string, unknown>,
  };

  // HR: hire lots of workers — volume needs bodies on the line
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      ...(round >= 2 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 2 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      ...(round >= 3 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
      ...(round >= 3 ? [{ role: "worker", programType: "speed" }] : []),
    ],
    salaryMultiplierChanges: {
      workers: 0.95,   // volume pays below average — commodity labor
      engineers: 1.0,
      supervisors: 0.95,
    },
    benefitChanges: {
      paidTimeOff: 15,
    },
  };

  // Marketing: broad coverage, heavy Budget/General — total ~$13M/round
  const marketing = {
    advertisingBudget: {
      Budget: Math.min(3_200_000 * j, cash * 0.10),
      General: Math.min(3_000_000 * j, cash * 0.09),
      "Active Lifestyle": Math.min(2_200_000 * j, cash * 0.07),
      Enthusiast: Math.min(1_400_000 * j, cash * 0.04),
      Professional: Math.min(1_000_000 * j, cash * 0.03),
    },
    brandingInvestment: Math.min(1_500_000 * j, cash * 0.03),
    promotions: round >= 3 ? [
      { segment: "Budget", discountPercent: 5 + (round % 3), duration: 1 },
      ...(round >= 5 ? [{ segment: "General", discountPercent: 3, duration: 1 }] : []),
    ] : [],
    sponsorships: round >= 4 ? [
      { name: "Budget Retailer Partnership", cost: Math.min(800_000, cash * 0.012), brandImpact: 0.005 },
    ] : [],
    // Volume: competitive prices — slightly below market
    productPricing: [
      { productId: "budget-product", newPrice: 185 },
      { productId: "initial-product", newPrice: 405 },
      { productId: "active-product", newPrice: 535 },
      { productId: "enthusiast-product", newPrice: 750 },
      { productId: "professional-product", newPrice: 1155 },
    ],
  };

  // R&D: expand to 5 segments by round 5-6
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 2) {
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 45, targetFeatures: 35, archetypeId: "long_life_phone" });
  }
  if (round >= 3) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 50, targetFeatures: 45, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 50, targetFeatures: 42, archetypeId: "outdoor_basic" });
  }
  if (round >= 4) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 58, targetFeatures: 52, archetypeId: "camera_phone" });
  }
  if (round >= 5) {
    if (!hasProduct(state, "Business Phone"))
      newProducts.push({ name: "Business Phone", segment: "Professional", targetQuality: 62, targetFeatures: 55, archetypeId: "business_phone" });
    if (!hasProduct(state, "Connected Phone"))
      newProducts.push({ name: "Connected Phone", segment: "General", targetQuality: 48, targetFeatures: 44, archetypeId: "connected_phone" });
  }
  if (round >= 6) {
    if (!hasProduct(state, "Rugged Phone"))
      newProducts.push({ name: "Rugged Phone", segment: "Active Lifestyle", targetQuality: 52, targetFeatures: 48, archetypeId: "rugged_phone" });
  }

  const techUpgrades: string[] = [];
  if (round >= 2 && !hasTech(state, "bat_1")) techUpgrades.push("bat_1");
  if (round >= 3 && !hasTech(state, "dur_1")) techUpgrades.push("dur_1");
  if (round >= 4 && !hasTech(state, "cam_1")) techUpgrades.push("cam_1");
  if (round >= 5 && !hasTech(state, "con_1")) techUpgrades.push("con_1");

  const rd = {
    rdBudget: Math.min((9_000_000 + round * 600_000) * r * j, cash * 0.22),
    newProducts,
    techUpgrades,
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 1 },
      { productId: "active-product", qualityIncrease: 1, featuresIncrease: 1 },
      ...(round >= 4 ? [{ productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 }] : []),
      ...(round >= 5 ? [{ productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 }] : []),
    ],
  };

  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 4 ? 0.3 : 0,
  };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// PREMIUM STRATEGY — High quality, Enthusiast+Professional focus,
// camera/display tech tree, fewer but better products.
// Expands to 4-5 segments by R5.
// ============================================

export const premiumStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const r = rs(round, 1);
  const j = jitter(round, 2);

  const upgrades = [
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 2 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
    ...(round >= 3 ? tryUpgrade(state, "qualityLab", 60_000_000) : []),
    ...(round >= 5 ? tryUpgrade(state, "cleanRoom", 120_000_000) : []),
    ...(round >= 6 ? tryUpgrade(state, "rapidPrototyping", 40_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (round >= 3 && factoryCount(state) < 2 && cash > 90_000_000)
    newFactories.push({ name: "Premium Plant Europe", region: "Europe" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_500_000 * r * j, cash * 0.06),
        machinery: Math.min(4_500_000 * r, cash * 0.14),
        supervisors: Math.min(900_000 * j, cash * 0.04),
        engineers: Math.min(4_000_000 * r, cash * 0.14),
        factory: Math.min(1_000_000 * r, cash * 0.04),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(1_200_000 * r, cash * 0.03) },
    upgradePurchases: upgrades,
    newFactories,
    materialTierChoices: {
      Budget: 2,
      General: 3,
      "Active Lifestyle": 3,
      Enthusiast: 4,
      Professional: 5,
    } as Record<string, number>,
    esgInitiatives: {
      executivePayRatio: true,
      employeeWellness: true,
      ...(round >= 2 ? { diversityInclusion: true } : {}),
      ...(round >= 2 ? { transparencyReport: true } : {}),
      ...(round >= 3 ? { workplaceHealthSafety: true } : {}),
      ...(round >= 4 ? { humanRightsAudit: true } : {}),
      ...(round >= 6 ? { codeOfEthics: true } : {}),
    } as Record<string, unknown>,
  };

  // HR: fewer workers, more engineers, premium salaries
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "engineer", tier: "premium", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      ...(round >= 2 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 4 ? [{ role: "engineer", tier: "premium", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "engineer", programType: "innovation" },
      ...(round >= 3 ? [{ role: "worker", programType: "quality" }] : []),
    ],
    salaryMultiplierChanges: {
      workers: 1.1,     // premium pays above average
      engineers: 1.15,   // top talent for quality
      supervisors: 1.1,
    },
    benefitChanges: {
      professionalDevelopment: 4_000,
      paidTimeOff: 22,
      ...(round >= 3 ? { healthInsurance: 80 } : {}),
    },
  };

  // Marketing: heavy Enthusiast + Professional focus — total ~$14M/round
  const marketing = {
    advertisingBudget: {
      Enthusiast: Math.min(3_400_000 * j, cash * 0.10),
      Professional: Math.min(3_000_000 * j, cash * 0.09),
      General: Math.min(1_800_000 * j, cash * 0.06),
      "Active Lifestyle": Math.min(1_500_000 * j, cash * 0.05),
      Budget: Math.min(1_000_000 * j, cash * 0.03),
    },
    brandingInvestment: Math.min(2_200_000 * j, cash * 0.05),
    promotions: [] as Array<{ segment: string; discountPercent: number; duration: number }>,
    sponsorships: [
      { name: "Luxury Tech Showcase", cost: Math.min(1_200_000 * j, cash * 0.02), brandImpact: 0.008 },
    ],
    // Premium: higher prices justified by quality
    productPricing: [
      { productId: "budget-product", newPrice: 195 },
      { productId: "initial-product", newPrice: 420 },
      { productId: "active-product", newPrice: 550 },
      { productId: "enthusiast-product", newPrice: 780 },
      { productId: "professional-product", newPrice: 1190 },
    ],
  };

  // R&D: quality-focused products, expand to Budget/Active by R4-5
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 2) {
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 60, targetFeatures: 42, archetypeId: "long_life_phone" });
  }
  if (round >= 3) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 85, targetFeatures: 80, archetypeId: "camera_phone" });
  }
  if (round >= 4) {
    if (!hasProduct(state, "Business Phone"))
      newProducts.push({ name: "Business Phone", segment: "Professional", targetQuality: 90, targetFeatures: 85, archetypeId: "business_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 68, targetFeatures: 60, archetypeId: "outdoor_basic" });
  }
  if (round >= 5) {
    if (!hasProduct(state, "Photo Flagship"))
      newProducts.push({ name: "Photo Flagship", segment: "Enthusiast", targetQuality: 95, targetFeatures: 90, archetypeId: "photo_flagship" });
  }
  if (round >= 6) {
    if (!hasProduct(state, "Smart Companion"))
      newProducts.push({ name: "Smart Companion", segment: "General", targetQuality: 75, targetFeatures: 65, archetypeId: "smart_companion" });
  }

  const techUpgrades: string[] = [];
  if (round >= 1 && !hasTech(state, "cam_1")) techUpgrades.push("cam_1");
  if (round >= 2 && !hasTech(state, "dsp_1")) techUpgrades.push("dsp_1");
  if (round >= 4 && !hasTech(state, "ai_1")) techUpgrades.push("ai_1");
  if (round >= 6 && !hasTech(state, "bat_1")) techUpgrades.push("bat_1");

  const rd = {
    rdBudget: Math.min((14_000_000 + round * 1_000_000) * r * j, cash * 0.30),
    newProducts,
    techUpgrades,
    productImprovements: [
      { productId: "enthusiast-product", qualityIncrease: 3, featuresIncrease: 3 },
      { productId: "professional-product", qualityIncrease: 3, featuresIncrease: 3 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 1 },
      ...(round >= 3 ? [{ productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 }] : []),
    ],
  };

  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 3 ? 0.5 + round * 0.1 : 0,
  };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// BRAND STRATEGY — Heavy marketing, brand investment,
// broad segments, moderate quality.
// NERFED: Lower branding caps, fewer sponsorships, slower expansion.
// ============================================

export const brandStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const r = rs(round, 2);
  const j = jitter(round, 3);

  const upgrades = [
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 2 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
    ...(round >= 4 ? tryUpgrade(state, "flexibleManufacturing", 90_000_000) : []),
    ...(round >= 6 ? tryUpgrade(state, "solarPanels", 45_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (round >= 4 && factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Brand Plant Europe", region: "Europe" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(2_000_000 * r * j, cash * 0.07),
        machinery: Math.min(2_800_000 * r, cash * 0.09),
        supervisors: Math.min(500_000 * j, cash * 0.02),
        engineers: Math.min(2_000_000 * r, cash * 0.07),
        factory: Math.min(700_000 * r, cash * 0.025),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(700_000 * r, cash * 0.012) },
    upgradePurchases: upgrades,
    newFactories,
    materialTierChoices: {
      Budget: 2,
      General: 3,
      "Active Lifestyle": 3,
      Enthusiast: 3,
      Professional: 3,
    } as Record<string, number>,
    esgInitiatives: {
      executivePayRatio: true,
      employeeWellness: true,
      diversityInclusion: true,
      ...(round >= 2 ? { transparencyReport: true } : {}),
      ...(round >= 3 ? { communityInvestment: Math.min(1_500_000, cash * 0.025) } : {}),
      ...(round >= 4 ? { workplaceHealthSafety: true } : {}),
      ...(round >= 5 ? { codeOfEthics: true } : {}),
      ...(round >= 6 ? { humanRightsAudit: true } : {}),
    } as Record<string, unknown>,
  };

  // HR: balanced hiring, brand invests in culture/teamwork
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      ...(round >= 2 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 4 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "teamwork" },
      ...(round >= 3 ? [{ role: "supervisor", programType: "leadership" }] : []),
    ],
    salaryMultiplierChanges: {
      workers: 1.05,
      engineers: 1.05,
      supervisors: 1.05,
    },
    benefitChanges: {
      flexibleWork: true,
      paidTimeOff: 20,
      ...(round >= 4 ? { retirementMatch: 4 } : {}),
    },
  };

  // Marketing: brand-focused — lower ads, strong branding + sponsorships — total ~$14M/round
  const marketing = {
    advertisingBudget: {
      General: Math.min(1_800_000 * j, cash * 0.06),
      "Active Lifestyle": Math.min(1_500_000 * j, cash * 0.05),
      Budget: Math.min(1_500_000 * j, cash * 0.05),
      Enthusiast: Math.min(1_500_000 * j, cash * 0.05),
      Professional: Math.min(1_200_000 * j, cash * 0.04),
    },
    brandingInvestment: Math.min(3_500_000 * j, cash * 0.07),
    promotions: round >= 4 ? [
      { segment: "General", discountPercent: 4 + (round % 2), duration: 1 },
      ...(round >= 6 ? [{ segment: "Active Lifestyle", discountPercent: 3, duration: 1 }] : []),
    ] : [],
    sponsorships: [
      ...(round >= 2 ? [{ name: "National TV Campaign", cost: Math.min(1_200_000 * j, cash * 0.02), brandImpact: 0.008 }] : []),
      ...(round >= 4 ? [{ name: "Social Media Influencers", cost: Math.min(800_000, cash * 0.012), brandImpact: 0.005 }] : []),
    ],
    productPricing: [
      { productId: "budget-product", newPrice: 190 },
      { productId: "initial-product", newPrice: 415 },
      { productId: "active-product", newPrice: 545 },
      { productId: "enthusiast-product", newPrice: 770 },
      { productId: "professional-product", newPrice: 1175 },
    ],
  };

  // R&D: broad product portfolio, moderate quality — delayed Professional
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 2) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 58, targetFeatures: 52, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 52, targetFeatures: 40, archetypeId: "long_life_phone" });
  }
  if (round >= 3) {
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 58, targetFeatures: 48, archetypeId: "outdoor_basic" });
    if (!hasProduct(state, "Smart Companion"))
      newProducts.push({ name: "Smart Companion", segment: "General", targetQuality: 62, targetFeatures: 55, archetypeId: "smart_companion" });
  }
  if (round >= 5) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 65, targetFeatures: 58, archetypeId: "camera_phone" });
  }
  if (round >= 6) {
    if (!hasProduct(state, "Cinema Screen"))
      newProducts.push({ name: "Cinema Screen", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "cinema_screen" });
  }
  if (round >= 7) {
    if (!hasProduct(state, "Rugged Phone"))
      newProducts.push({ name: "Rugged Phone", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 52, archetypeId: "rugged_phone" });
  }

  const techUpgrades: string[] = [];
  if (round >= 2 && !hasTech(state, "cam_1")) techUpgrades.push("cam_1");
  if (round >= 3 && !hasTech(state, "dsp_1")) techUpgrades.push("dsp_1");
  if (round >= 4 && !hasTech(state, "dur_1")) techUpgrades.push("dur_1");
  if (round >= 6 && !hasTech(state, "ai_1")) techUpgrades.push("ai_1");

  const rd = {
    rdBudget: Math.min((9_000_000 + round * 500_000) * r * j, cash * 0.20),
    newProducts,
    techUpgrades,
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 1 },
      { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
      { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 3 ? 0.4 : 0,
  };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// AUTOMATION STRATEGY — Factory upgrades, Robotic Arms,
// reduce labor costs, efficiency focus.
// BUFFED: Expands to 5 segments by R5, more ad spend, more products.
// ============================================

export const automationStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const r = rs(round, -1);
  const j = jitter(round, 4);

  // Automation: upgrade-heavy from the start
  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...(round >= 1 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
    ...(round >= 2 ? tryUpgrade(state, "leanManufacturing", 40_000_000) : []),
    ...(round >= 3 ? tryUpgrade(state, "iotIntegration", 50_000_000) : []),
    ...(round >= 5 ? tryUpgrade(state, "advancedRobotics", 100_000_000) : []),
    ...(round >= 6 ? tryUpgrade(state, "digitalTwin", 60_000_000) : []),
    ...(round >= 7 ? tryUpgrade(state, "smartGrid", 55_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (round >= 2 && factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Auto Plant Asia", region: "Asia" });
  if (round >= 6 && factoryCount(state) < 3 && cash > 100_000_000)
    newFactories.push({ name: "Auto Plant MENA", region: "MENA" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_200_000 * r * j, cash * 0.05),
        machinery: Math.min(8_000_000 * r, cash * 0.25),
        supervisors: Math.min(500_000 * j, cash * 0.02),
        engineers: Math.min(2_800_000 * r, cash * 0.10),
        factory: Math.min(4_000_000 * r, cash * 0.14),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(1_500_000 * r, cash * 0.025) },
    upgradePurchases: upgrades,
    newFactories,
    materialTierChoices: {
      Budget: 2,
      General: 2,
      "Active Lifestyle": 3,
      Enthusiast: 3,
      Professional: 3,
    } as Record<string, number>,
    esgInitiatives: {
      executivePayRatio: true,
      ...(round >= 1 ? { workplaceHealthSafety: true } : {}),
      ...(round >= 2 ? { employeeWellness: true } : {}),
      ...(round >= 3 ? { diversityInclusion: true } : {}),
      ...(round >= 4 ? { transparencyReport: true } : {}),
      ...(round >= 5 ? { codeOfEthics: true } : {}),
      ...(round >= 6 ? { charitableDonation: Math.min(500_000, cash * 0.008) } : {}),
    } as Record<string, unknown>,
  };

  // HR: fewer workers (machines replace them), more engineers
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      ...(round >= 3 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 4 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 5 ? [{ role: "engineer", tier: "premium", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
      { role: "engineer", programType: "innovation" },
    ],
    salaryMultiplierChanges: {
      workers: 1.0,
      engineers: 1.1,    // need good engineers for automation
      supervisors: 1.0,
    },
    benefitChanges: {
      professionalDevelopment: 3_000,
      paidTimeOff: 18,
    },
  };

  // Marketing: broad coverage, heavy Budget/General — total ~$13M/round
  const marketing = {
    advertisingBudget: {
      Budget: Math.min(3_000_000 * j, cash * 0.09),
      General: Math.min(2_800_000 * j, cash * 0.08),
      "Active Lifestyle": Math.min(2_000_000 * j, cash * 0.06),
      Enthusiast: Math.min(1_500_000 * j, cash * 0.05),
      Professional: Math.min(1_000_000 * j, cash * 0.03),
    },
    brandingInvestment: Math.min(1_500_000 * j, cash * 0.03),
    promotions: round >= 4 ? [
      { segment: "Budget", discountPercent: 4, duration: 1 },
      { segment: "General", discountPercent: 3, duration: 1 },
    ] : [],
    sponsorships: round >= 4 ? [
      { name: "Tech Innovation Award", cost: Math.min(800_000, cash * 0.012), brandImpact: 0.005 },
    ] : [],
    // Automation: slightly below market — cost advantage from automation
    productPricing: [
      { productId: "budget-product", newPrice: 183 },
      { productId: "initial-product", newPrice: 400 },
      { productId: "active-product", newPrice: 530 },
      { productId: "enthusiast-product", newPrice: 745 },
      { productId: "professional-product", newPrice: 1150 },
    ],
  };

  // R&D: expand to all 5 segments by round 5
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 2) {
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 42, archetypeId: "long_life_phone" });
  }
  if (round >= 3) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 58, targetFeatures: 52, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 58, targetFeatures: 50, archetypeId: "outdoor_basic" });
  }
  if (round >= 4) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 68, targetFeatures: 62, archetypeId: "camera_phone" });
  }
  if (round >= 5) {
    if (!hasProduct(state, "Business Phone"))
      newProducts.push({ name: "Business Phone", segment: "Professional", targetQuality: 72, targetFeatures: 68, archetypeId: "business_phone" });
    if (!hasProduct(state, "Connected Phone"))
      newProducts.push({ name: "Connected Phone", segment: "General", targetQuality: 55, targetFeatures: 50, archetypeId: "connected_phone" });
  }
  if (round >= 6) {
    if (!hasProduct(state, "Rugged Phone"))
      newProducts.push({ name: "Rugged Phone", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 55, archetypeId: "rugged_phone" });
  }

  const techUpgrades: string[] = [];
  if (round >= 2 && !hasTech(state, "bat_1")) techUpgrades.push("bat_1");
  if (round >= 3 && !hasTech(state, "con_1")) techUpgrades.push("con_1");
  if (round >= 4 && !hasTech(state, "cam_1")) techUpgrades.push("cam_1");
  if (round >= 6 && !hasTech(state, "ai_1")) techUpgrades.push("ai_1");

  const rd = {
    rdBudget: Math.min((10_000_000 + round * 700_000) * r * j, cash * 0.24),
    newProducts,
    techUpgrades,
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 1 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 },
      { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 3 ? 0.5 : 0,
  };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// BALANCED STRATEGY — Mix of everything,
// moderate investments across all areas.
// NERFED: Only 4 segments (no Professional), lower ad caps,
// delayed expansion, reduced branding.
// ============================================

export const balancedStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const r = rs(round, 0.5);
  const j = jitter(round, 5);

  const upgrades = [
    ...(round >= 1 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 4 ? tryUpgrade(state, "solarPanels", 45_000_000) : []),
    ...(round >= 6 ? tryUpgrade(state, "waterRecycling", 25_000_000) : []),
    ...(round >= 7 ? tryUpgrade(state, "leanManufacturing", 40_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (round >= 4 && factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Balanced Plant Europe", region: "Europe" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(2_200_000 * r * j, cash * 0.07),
        machinery: Math.min(3_000_000 * r, cash * 0.10),
        supervisors: Math.min(600_000 * j, cash * 0.025),
        engineers: Math.min(2_200_000 * r, cash * 0.08),
        factory: Math.min(1_000_000 * r, cash * 0.04),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(600_000 * r, cash * 0.012) },
    upgradePurchases: upgrades,
    newFactories,
    materialTierChoices: {
      Budget: 2,
      General: 3,
      "Active Lifestyle": 3,
      Enthusiast: 3,
      Professional: 3,
    } as Record<string, number>,
    esgInitiatives: {
      executivePayRatio: true,
      employeeWellness: true,
      ...(round >= 2 ? { diversityInclusion: true } : {}),
      ...(round >= 3 ? { transparencyReport: true } : {}),
      ...(round >= 4 ? { workplaceHealthSafety: true } : {}),
    } as Record<string, unknown>,
  };

  // HR: balanced hiring, decent benefits
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      ...(round >= 2 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 3 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 5 ? [{ role: "engineer", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
      ...(round >= 3 ? [{ role: "engineer", programType: "innovation" }] : []),
    ],
    salaryMultiplierChanges: {
      workers: 1.0,
      engineers: 1.05,
      supervisors: 1.0,
    },
    benefitChanges: {
      healthInsurance: 70,
      retirementMatch: 4,
      paidTimeOff: 19,
    },
  };

  // Marketing: even spread across all segments — total ~$13M/round
  const marketing = {
    advertisingBudget: {
      General: Math.min(2_400_000 * j, cash * 0.07),
      "Active Lifestyle": Math.min(2_200_000 * j, cash * 0.07),
      Budget: Math.min(2_200_000 * j, cash * 0.07),
      Enthusiast: Math.min(2_000_000 * j, cash * 0.06),
      Professional: Math.min(1_200_000 * j, cash * 0.04),
    },
    brandingInvestment: Math.min(2_000_000 * j, cash * 0.04),
    promotions: round >= 5 ? [
      { segment: "General", discountPercent: 3 + (round % 2), duration: 1 },
    ] : [],
    sponsorships: round >= 5 ? [
      { name: "Community Sponsorship", cost: Math.min(800_000, cash * 0.012), brandImpact: 0.005 },
    ] : [],
    productPricing: [
      { productId: "budget-product", newPrice: 190 },
      { productId: "initial-product", newPrice: 412 },
      { productId: "active-product", newPrice: 540 },
      { productId: "enthusiast-product", newPrice: 760 },
      { productId: "professional-product", newPrice: 1170 },
    ],
  };

  // R&D: 4 segments (Budget, General, Active, Enthusiast), skip Professional
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 2) {
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 52, targetFeatures: 38, archetypeId: "long_life_phone" });
  }
  if (round >= 3) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 58, targetFeatures: 52, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 56, targetFeatures: 48, archetypeId: "outdoor_basic" });
  }
  if (round >= 5) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 65, targetFeatures: 58, archetypeId: "camera_phone" });
  }
  if (round >= 7) {
    if (!hasProduct(state, "AI Assistant Phone"))
      newProducts.push({ name: "AI Assistant Phone", segment: "General", targetQuality: 62, targetFeatures: 56, archetypeId: "ai_assistant_phone" });
  }

  const techUpgrades: string[] = [];
  if (round >= 2 && !hasTech(state, "bat_1")) techUpgrades.push("bat_1");
  if (round >= 3 && !hasTech(state, "cam_1")) techUpgrades.push("cam_1");
  if (round >= 4 && !hasTech(state, "dur_1")) techUpgrades.push("dur_1");
  if (round >= 6 && !hasTech(state, "dsp_1")) techUpgrades.push("dsp_1");

  const rd = {
    rdBudget: Math.min((8_500_000 + round * 400_000) * r * j, cash * 0.20),
    newProducts,
    techUpgrades,
    productImprovements: [
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 1 },
      { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
      { productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 },
      { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 0 },
    ],
  };

  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 3 ? 0.5 : 0,
  };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// R&D FOCUSED STRATEGY — Heavy R&D budget ($20M+),
// tech tree rushing, many products, quality improvements.
// Slight nerf: lower ad budgets in low segments, higher R&D cost.
// ============================================

export const rdFocusedStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const r = rs(round, 1.5);
  const j = jitter(round, 6);

  const upgrades = [
    ...(round >= 1 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
    ...(round >= 2 ? tryUpgrade(state, "automation", 75_000_000) : []),
    ...(round >= 3 ? tryUpgrade(state, "rapidPrototyping", 40_000_000) : []),
    ...(round >= 4 ? tryUpgrade(state, "qualityLab", 60_000_000) : []),
    ...(round >= 5 ? tryUpgrade(state, "digitalTwin", 60_000_000) : []),
    ...(round >= 6 ? tryUpgrade(state, "solarPanels", 45_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (round >= 3 && factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "R&D Plant Asia", region: "Asia" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_500_000 * r * j, cash * 0.06),
        machinery: Math.min(3_000_000 * r, cash * 0.10),
        supervisors: Math.min(500_000 * j, cash * 0.02),
        engineers: Math.min(4_500_000 * r, cash * 0.16),
        factory: Math.min(600_000 * r, cash * 0.02),
      },
    },
    greenInvestments: { [fid(state)]: Math.min(1_000_000 * r, cash * 0.02) },
    upgradePurchases: upgrades,
    newFactories,
    materialTierChoices: {
      Budget: 2,
      General: 3,
      "Active Lifestyle": 3,
      Enthusiast: 4,
      Professional: 4,
    } as Record<string, number>,
    esgInitiatives: {
      executivePayRatio: true,
      employeeWellness: true,
      ...(round >= 2 ? { diversityInclusion: true } : {}),
      ...(round >= 3 ? { transparencyReport: true } : {}),
      ...(round >= 4 ? { workplaceHealthSafety: true } : {}),
      ...(round >= 5 ? { codeOfEthics: true } : {}),
    } as Record<string, unknown>,
  };

  // HR: engineer-heavy hiring, train engineers
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "engineer", tier: "premium", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      ...(round >= 2 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 3 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "engineer", programType: "innovation" },
      { role: "engineer", programType: "efficiency" },
      ...(round >= 4 ? [{ role: "worker", programType: "quality" }] : []),
    ],
    salaryMultiplierChanges: {
      workers: 1.0,
      engineers: 1.15,   // top-dollar for research engineers
      supervisors: 1.05,
    },
    benefitChanges: {
      professionalDevelopment: 5_000,
      paidTimeOff: 20,
    },
  };

  // Marketing: focus on Enthusiast/Professional — total ~$14M/round
  const marketing = {
    advertisingBudget: {
      Enthusiast: Math.min(3_200_000 * j, cash * 0.10),
      Professional: Math.min(2_800_000 * j, cash * 0.08),
      General: Math.min(1_800_000 * j, cash * 0.06),
      "Active Lifestyle": Math.min(1_500_000 * j, cash * 0.05),
      Budget: Math.min(1_000_000 * j, cash * 0.03),
    },
    brandingInvestment: Math.min(2_000_000 * j, cash * 0.04),
    promotions: [] as Array<{ segment: string; discountPercent: number; duration: number }>,
    sponsorships: round >= 4 ? [
      { name: "Tech Innovation Expo", cost: Math.min(1_000_000 * j, cash * 0.015), brandImpact: 0.006 },
    ] : [],
    // R&D-focused: slightly higher prices for tech-heavy products
    productPricing: [
      { productId: "budget-product", newPrice: 192 },
      { productId: "initial-product", newPrice: 418 },
      { productId: "active-product", newPrice: 548 },
      { productId: "enthusiast-product", newPrice: 775 },
      { productId: "professional-product", newPrice: 1185 },
    ],
  };

  // R&D: biggest budget, most products, tech tree rushing
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 1) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 68, targetFeatures: 62, archetypeId: "snapshot_phone" });
  }
  if (round >= 2) {
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 58, targetFeatures: 48, archetypeId: "long_life_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 66, targetFeatures: 58, archetypeId: "outdoor_basic" });
  }
  if (round >= 3) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 82, targetFeatures: 78, archetypeId: "camera_phone" });
    if (!hasProduct(state, "Smart Companion"))
      newProducts.push({ name: "Smart Companion", segment: "General", targetQuality: 72, targetFeatures: 65, archetypeId: "smart_companion" });
  }
  if (round >= 4) {
    if (!hasProduct(state, "Business Phone"))
      newProducts.push({ name: "Business Phone", segment: "Professional", targetQuality: 85, targetFeatures: 80, archetypeId: "business_phone" });
  }
  if (round >= 5) {
    if (!hasProduct(state, "Photo Flagship"))
      newProducts.push({ name: "Photo Flagship", segment: "Enthusiast", targetQuality: 92, targetFeatures: 88, archetypeId: "photo_flagship" });
    if (!hasProduct(state, "AI Assistant Phone"))
      newProducts.push({ name: "AI Assistant Phone", segment: "General", targetQuality: 75, targetFeatures: 70, archetypeId: "ai_assistant_phone" });
  }
  if (round >= 7) {
    if (!hasProduct(state, "Rugged Phone"))
      newProducts.push({ name: "Rugged Phone", segment: "Active Lifestyle", targetQuality: 70, targetFeatures: 62, archetypeId: "rugged_phone" });
  }

  // Rush tech tree: all families early
  const techUpgrades: string[] = [];
  if (round >= 1 && !hasTech(state, "cam_1")) techUpgrades.push("cam_1");
  if (round >= 1 && !hasTech(state, "ai_1")) techUpgrades.push("ai_1");
  if (round >= 2 && !hasTech(state, "dsp_1")) techUpgrades.push("dsp_1");
  if (round >= 2 && !hasTech(state, "bat_1")) techUpgrades.push("bat_1");
  if (round >= 3 && !hasTech(state, "dur_1")) techUpgrades.push("dur_1");
  if (round >= 3 && !hasTech(state, "con_1")) techUpgrades.push("con_1");

  const rd = {
    rdBudget: Math.min((20_000_000 + round * 1_500_000) * r * j, cash * 0.35),
    newProducts,
    techUpgrades,
    productImprovements: [
      { productId: "enthusiast-product", qualityIncrease: 4, featuresIncrease: 3 },
      { productId: "professional-product", qualityIncrease: 3, featuresIncrease: 3 },
      { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
      { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
    ],
  };

  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 5 ? 0.3 : 0,  // R&D-focused reinvests early, pays late
  };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
};

// ============================================
// COST CUTTER STRATEGY — Efficiency-focused, low prices,
// maximize margins through cost reduction.
// BUFFED: Expands to 5 segments by R5-6, higher ad spend,
// more products, but still lowest-cost identity.
// ============================================

export const costCutterStrategy: StrategyDecisionMaker = (state, market, round) => {
  const cash = state.cash;
  const r = rs(round, -0.5);
  const j = jitter(round, 7);

  // Cost cutter: only essential upgrades that reduce costs
  const upgrades = [
    ...tryUpgrade(state, "automation", 75_000_000),
    ...(round >= 2 ? tryUpgrade(state, "leanManufacturing", 40_000_000) : []),
    ...(round >= 3 ? tryUpgrade(state, "continuousImprovement", 30_000_000) : []),
    ...(round >= 5 ? tryUpgrade(state, "sixSigma", 75_000_000) : []),
    ...(round >= 7 ? tryUpgrade(state, "iotIntegration", 50_000_000) : []),
  ];

  const newFactories: Array<{ name: string; region: string }> = [];
  if (round >= 3 && factoryCount(state) < 2 && cash > 80_000_000)
    newFactories.push({ name: "Lean Plant Asia", region: "Asia" });
  if (round >= 7 && factoryCount(state) < 3 && cash > 120_000_000)
    newFactories.push({ name: "Lean Plant MENA", region: "MENA" });

  const factory = {
    efficiencyInvestments: {
      [fid(state)]: {
        workers: Math.min(1_200_000 * r * j, cash * 0.05),
        machinery: Math.min(5_500_000 * r, cash * 0.18),
        supervisors: Math.min(350_000 * j, cash * 0.015),
        engineers: Math.min(1_500_000 * r, cash * 0.06),
        factory: Math.min(2_200_000 * r, cash * 0.09),
      },
    },
    greenInvestments: {} as Record<string, number>,  // cost cutter skips green
    upgradePurchases: upgrades,
    newFactories,
    materialTierChoices: {
      Budget: 1,
      General: 1,
      "Active Lifestyle": 2,
      Enthusiast: 2,
      Professional: 2,
    } as Record<string, number>,
    esgInitiatives: {
      // Bare minimum ESG
      executivePayRatio: true,
      ...(round >= 3 ? { employeeWellness: true } : {}),
      ...(round >= 4 ? { diversityInclusion: true } : {}),
      ...(round >= 5 ? { transparencyReport: true } : {}),
      ...(round >= 7 ? { codeOfEthics: true } : {}),
    } as Record<string, unknown>,
  };

  // HR: minimal hiring, bare-bones benefits — but enough to produce
  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "worker", tier: "basic", factoryId: fid(state) },
      ...(round >= 2 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 3 ? [{ role: "engineer", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 4 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [
      { role: "worker", programType: "efficiency" },
      ...(round >= 4 ? [{ role: "worker", programType: "speed" }] : []),
    ],
    salaryMultiplierChanges: {
      workers: 0.9,    // cost cutter pays below market
      engineers: 0.95,
      supervisors: 0.9,
    },
    benefitChanges: {
      paidTimeOff: 14,  // minimum
    },
  };

  // Marketing: lowest total spend — cost cutter identity — total ~$10M/round
  const marketing = {
    advertisingBudget: {
      Budget: Math.min(2_400_000 * j, cash * 0.07),
      General: Math.min(2_200_000 * j, cash * 0.06),
      "Active Lifestyle": Math.min(1_500_000 * j, cash * 0.04),
      Enthusiast: Math.min(1_000_000 * j, cash * 0.03),
      Professional: Math.min(800_000 * j, cash * 0.02),
    },
    brandingInvestment: Math.min(1_000_000 * j, cash * 0.02),
    promotions: round >= 3 ? [
      { segment: "Budget", discountPercent: 5 + (round % 3), duration: 1 },
      ...(round >= 5 ? [{ segment: "General", discountPercent: 3, duration: 1 }] : []),
    ] : [],
    sponsorships: round >= 6 ? [
      { name: "Budget Retailer Partnership", cost: Math.min(600_000, cash * 0.009), brandImpact: 0.004 },
    ] : [],
    // Cost cutter: lowest prices — efficiency is the edge
    productPricing: [
      { productId: "budget-product", newPrice: 180 },
      { productId: "initial-product", newPrice: 395 },
      { productId: "active-product", newPrice: 525 },
      { productId: "enthusiast-product", newPrice: 740 },
      { productId: "professional-product", newPrice: 1140 },
    ],
  };

  // R&D: expand to 5 segments by round 5-6
  const newProducts: Array<{ name: string; segment: string; targetQuality: number; targetFeatures: number; archetypeId?: string }> = [];
  if (round >= 2) {
    if (!hasProduct(state, "Long Life Phone"))
      newProducts.push({ name: "Long Life Phone", segment: "Budget", targetQuality: 48, targetFeatures: 35, archetypeId: "long_life_phone" });
  }
  if (round >= 3) {
    if (!hasProduct(state, "Snapshot Phone"))
      newProducts.push({ name: "Snapshot Phone", segment: "General", targetQuality: 52, targetFeatures: 45, archetypeId: "snapshot_phone" });
    if (!hasProduct(state, "Outdoor Basic"))
      newProducts.push({ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 52, targetFeatures: 44, archetypeId: "outdoor_basic" });
  }
  if (round >= 4) {
    if (!hasProduct(state, "Connected Phone"))
      newProducts.push({ name: "Connected Phone", segment: "General", targetQuality: 48, targetFeatures: 42, archetypeId: "connected_phone" });
  }
  if (round >= 5) {
    if (!hasProduct(state, "Camera Phone"))
      newProducts.push({ name: "Camera Phone", segment: "Enthusiast", targetQuality: 58, targetFeatures: 50, archetypeId: "camera_phone" });
    if (!hasProduct(state, "Business Phone"))
      newProducts.push({ name: "Business Phone", segment: "Professional", targetQuality: 62, targetFeatures: 55, archetypeId: "business_phone" });
  }
  if (round >= 6) {
    if (!hasProduct(state, "Rugged Phone"))
      newProducts.push({ name: "Rugged Phone", segment: "Active Lifestyle", targetQuality: 55, targetFeatures: 48, archetypeId: "rugged_phone" });
  }

  const techUpgrades: string[] = [];
  if (round >= 3 && !hasTech(state, "bat_1")) techUpgrades.push("bat_1");
  if (round >= 4 && !hasTech(state, "dur_1")) techUpgrades.push("dur_1");
  if (round >= 5 && !hasTech(state, "cam_1")) techUpgrades.push("cam_1");
  if (round >= 6 && !hasTech(state, "con_1")) techUpgrades.push("con_1");

  const rd = {
    rdBudget: Math.min((7_500_000 + round * 400_000) * r * j, cash * 0.18),
    newProducts,
    techUpgrades,
    productImprovements: [
      { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 1 },
      { productId: "initial-product", qualityIncrease: 1, featuresIncrease: 1 },
      { productId: "active-product", qualityIncrease: 1, featuresIncrease: 1 },
      ...(round >= 5 ? [{ productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 }] : []),
      ...(round >= 5 ? [{ productId: "professional-product", qualityIncrease: 1, featuresIncrease: 0 }] : []),
    ],
  };

  // Cost-cutter: high dividends — profit extraction focus
  const finance: Record<string, unknown> = {
    dividendPerShare: round >= 2 ? 0.8 + round * 0.1 : 0.3,
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
