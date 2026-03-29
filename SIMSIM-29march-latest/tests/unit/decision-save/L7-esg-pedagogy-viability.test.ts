/**
 * L7 ESG Pedagogy & Viability Tests — Launch Gate
 *
 * Three test suites validating the simulation's pedagogical soundness and
 * competitive balance before launch:
 *
 *   L7-ESG-01: ESG-focused strategy is competitively viable (top-3 in >=20% of games)
 *   L7-PED-01: All 3 pedagogical learning outcomes hold across seeds
 *   L7-RB-01:  Rubber-banding allows bottom-team recovery
 *
 * These are Monte Carlo tests that run many games. They are slow by design.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { SimulationOutput } from "@/engine/core/SimulationEngine";
import type { TeamState } from "@/engine/types/state";
import type { AllDecisions } from "@/engine/types/decisions";
import type { MarketState } from "@/engine/types/market";
import type { RoundResults } from "@/engine/types/results";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface GameHistory {
  /** Final team states keyed by team ID */
  finalStates: Record<string, TeamState>;
  /** Revenue per round keyed by team ID */
  revenueByRound: Record<string, number[]>;
  /** Brand value per round keyed by team ID */
  brandByRound: Record<string, number[]>;
  /** ESG score per round keyed by team ID */
  esgByRound: Record<string, number[]>;
  /** Morale per round keyed by team ID */
  moraleByRound: Record<string, number[]>;
  /** Average product quality per round keyed by team ID */
  qualityByRound: Record<string, number[]>;
  /** Per-round results for each team */
  roundResults: Record<string, RoundResults[]>;
  /** Per-round rankings output from the engine */
  rankingsByRound: SimulationOutput["rankings"][];
}

/**
 * Run a full multi-round game with per-team, per-round decision functions.
 * Returns rich history for assertions.
 */
function runMultiRoundGame(
  teamDecisionsFn: (teamId: string, round: number, state: TeamState, market: MarketState) => AllDecisions,
  teamIds: string[],
  rounds: number,
  seed: string,
): GameHistory {
  const teams = teamIds.map((id) => ({
    id,
    state: SimulationEngine.createInitialTeamState(),
    decisions: {} as AllDecisions,
  }));
  let marketState: MarketState = SimulationEngine.createInitialMarketState();

  const history: GameHistory = {
    finalStates: {},
    revenueByRound: {},
    brandByRound: {},
    esgByRound: {},
    moraleByRound: {},
    qualityByRound: {},
    roundResults: {},
    rankingsByRound: [],
  };
  for (const id of teamIds) {
    history.revenueByRound[id] = [];
    history.brandByRound[id] = [];
    history.esgByRound[id] = [];
    history.moraleByRound[id] = [];
    history.qualityByRound[id] = [];
    history.roundResults[id] = [];
  }

  for (let round = 1; round <= rounds; round++) {
    for (const team of teams) {
      team.decisions = teamDecisionsFn(team.id, round, team.state, marketState);
    }

    const output = SimulationEngine.processRound({
      roundNumber: round,
      teams: teams.map((t) => ({ id: t.id, state: t.state, decisions: t.decisions })),
      marketState,
      matchSeed: seed,
    });

    history.rankingsByRound.push(output.rankings);

    for (const result of output.results) {
      const teamId = result.teamId;
      const team = teams.find((t) => t.id === teamId)!;
      team.state = result.newState;

      history.revenueByRound[teamId].push(result.totalRevenue);
      history.roundResults[teamId].push(result);

      const products = result.newState.products || [];
      const avgQuality =
        products.length > 0
          ? products.reduce((sum, p) => sum + (p.quality || 0), 0) / products.length
          : 0;
      history.qualityByRound[teamId].push(avgQuality);
      history.brandByRound[teamId].push(result.newState.brandValue);
      history.esgByRound[teamId].push(result.newState.esgScore);
      history.moraleByRound[teamId].push(result.newState.workforce.averageMorale);
    }

    marketState = output.newMarketState;
  }

  for (const team of teams) {
    history.finalStates[team.id] = team.state;
  }

  return history;
}

/** Sum an array of numbers. */
function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Strategy decision makers (inline, use real decision shapes)
// ---------------------------------------------------------------------------

/** Helper: first factory ID */
function fid(state: TeamState): string {
  return state.factories[0]?.id || "factory-1";
}

function hasUpgrade(state: TeamState, upgrade: string): boolean {
  return state.factories[0]?.upgrades?.includes(upgrade) || false;
}

function hasTech(state: TeamState, tech: string): boolean {
  return state.unlockedTechnologies?.includes(tech) || false;
}

function factoryCount(state: TeamState): number {
  return state.factories?.length || 1;
}

function hasProduct(state: TeamState, name: string): boolean {
  return state.products?.some((p) => p.name === name) || false;
}

function tryUpgrade(
  state: TeamState,
  upgrade: string,
  cost: number,
): Array<{ factoryId: string; upgrade: string }> {
  if (hasUpgrade(state, upgrade)) return [];
  if (state.cash < cost * 1.1) return [];
  return [{ factoryId: fid(state), upgrade }];
}

/** Round-scaling multiplier (matches strategies.ts) */
function rs(round: number): number {
  if (round <= 2) return 1.0;
  if (round <= 4) return 1.15;
  if (round <= 6) return 1.3;
  return 1.45;
}

// ---- Shared foundation (rounds 1-4, identical for all strategies) ----

function sharedFoundation(state: TeamState, _market: MarketState, round: number): AllDecisions {
  const cash = state.cash;
  const r = rs(round);

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
    greenInvestments: { [fid(state)]: Math.min(500_000, cash * 0.008) },
    upgradePurchases: upgrades,
    newFactories,
    esgInitiatives: {
      ...(round >= 2 ? { executivePayRatio: true } : {}),
      ...(round >= 3 ? { employeeWellness: true } : {}),
      ...(round >= 3 ? { diversityInclusion: true } : {}),
      ...(round >= 4 ? { transparencyReport: true } : {}),
    } as Record<string, unknown>,
  };

  const hr: Record<string, unknown> = {
    recruitmentSearches: [
      { role: "worker", tier: "basic", factoryId: fid(state) },
      { role: "engineer", tier: "basic", factoryId: fid(state) },
      ...(round >= 3 ? [{ role: "worker", tier: "basic", factoryId: fid(state) }] : []),
      ...(round >= 4 ? [{ role: "supervisor", tier: "basic", factoryId: fid(state) }] : []),
    ],
    trainingPrograms: [{ role: "worker", programType: "efficiency" }],
    benefitChanges: { paidTimeOff: 18 },
  };

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

  const newProducts: Array<{
    name: string;
    segment: string;
    targetQuality: number;
    targetFeatures: number;
    archetypeId?: string;
  }> = [];
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

  const finance: Record<string, unknown> = { dividendPerShare: round >= 3 ? 0.5 : 0 };
  return { factory, hr, marketing, rd, finance } as AllDecisions;
}

// ---- Premium strategy (diverges R5+) ----

function premiumDecisions(state: TeamState, market: MarketState, round: number): AllDecisions {
  if (round <= 4) return sharedFoundation(state, market, round);
  const cash = state.cash;
  const r = rs(round);

  return {
    factory: {
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
      upgradePurchases: [
        ...tryUpgrade(state, "automation", 75_000_000),
        ...tryUpgrade(state, "continuousImprovement", 30_000_000),
      ],
      newFactories: factoryCount(state) < 2 && cash > 80_000_000
        ? [{ name: "Premium Plant Europe", region: "Europe" }]
        : [],
      esgInitiatives: {
        workplaceHealthSafety: true, executivePayRatio: true, employeeWellness: true,
        diversityInclusion: true, transparencyReport: true,
        ...(round >= 6 ? { humanRightsAudit: true } : {}),
      } as Record<string, unknown>,
    },
    hr: {
      recruitmentSearches: [
        { role: "worker", tier: "basic", factoryId: fid(state) },
        { role: "engineer", tier: "basic", factoryId: fid(state) },
        { role: "worker", tier: "basic", factoryId: fid(state) },
        { role: "supervisor", tier: "basic", factoryId: fid(state) },
      ],
      trainingPrograms: [{ role: "engineer", programType: "innovation" }],
      benefitChanges: { professionalDevelopment: 3_000, paidTimeOff: 20 },
    },
    marketing: {
      advertisingBudget: {
        Budget: Math.min(2_500_000 * r, cash * 0.10),
        General: Math.min(3_500_000 * r, cash * 0.12),
        Enthusiast: Math.min(3_500_000 * r, cash * 0.12),
        Professional: Math.min(3_500_000 * r, cash * 0.12),
        "Active Lifestyle": Math.min(3_000_000 * r, cash * 0.10),
      },
      brandingInvestment: Math.min(3_000_000 * r, cash * 0.12),
      promotions: [],
      sponsorships: round >= 6
        ? [{ name: "Tech Conference Sponsor", cost: Math.min(1_500_000, cash * 0.02), brandImpact: 0.008 }]
        : [],
      productPricing: [
        { productId: "budget-product", newPrice: 190 },
        { productId: "initial-product", newPrice: 410 },
        { productId: "active-product", newPrice: 540 },
        { productId: "enthusiast-product", newPrice: 760 },
        { productId: "professional-product", newPrice: 1170 },
      ],
    },
    rd: {
      rdBudget: Math.min(10_000_000 * r, cash * 0.22),
      newProducts: [
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Snapshot Phone")
          ? [{ name: "Snapshot Phone", segment: "General", targetQuality: 58, targetFeatures: 52, archetypeId: "snapshot_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Long Life Phone")
          ? [{ name: "Long Life Phone", segment: "Budget", targetQuality: 52, targetFeatures: 38, archetypeId: "long_life_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Outdoor Basic")
          ? [{ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 58, targetFeatures: 48, archetypeId: "outdoor_basic" }]
          : []),
      ],
      productImprovements: [
        { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "active-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "initial-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
      ],
    },
    finance: { dividendPerShare: 0.5 },
  } as AllDecisions;
}

// ---- Balanced strategy (diverges R5+) ----

function balancedDecisions(state: TeamState, market: MarketState, round: number): AllDecisions {
  if (round <= 4) return sharedFoundation(state, market, round);
  const cash = state.cash;
  const r = rs(round);

  return {
    factory: {
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
      upgradePurchases: [
        ...tryUpgrade(state, "automation", 75_000_000),
        ...tryUpgrade(state, "continuousImprovement", 30_000_000),
        ...tryUpgrade(state, "solarPanels", 45_000_000),
        ...(round >= 7 ? tryUpgrade(state, "waterRecycling", 25_000_000) : []),
      ],
      newFactories: factoryCount(state) < 2 && cash > 80_000_000
        ? [{ name: "Balanced Plant Europe", region: "Europe" }]
        : [],
      esgInitiatives: {
        charitableDonation: Math.min(800_000, cash * 0.012),
        workplaceHealthSafety: true, executivePayRatio: true, employeeWellness: true,
        diversityInclusion: true, transparencyReport: true, codeOfEthics: true,
      } as Record<string, unknown>,
    },
    hr: {
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
      benefitChanges: { healthInsurance: 70, retirementMatch: 5, paidTimeOff: 20 },
    },
    marketing: {
      advertisingBudget: {
        Budget: Math.min(3_500_000 * r, cash * 0.12),
        General: Math.min(4_000_000 * r, cash * 0.15),
        Enthusiast: Math.min(3_500_000 * r, cash * 0.12),
        Professional: Math.min(3_500_000 * r, cash * 0.12),
        "Active Lifestyle": Math.min(3_500_000 * r, cash * 0.12),
      },
      brandingInvestment: Math.min(4_000_000 * r, cash * 0.15),
      promotions: round >= 7 ? [{ segment: "General", discountPercent: 5, duration: 1 }] : [],
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
    },
    rd: {
      rdBudget: Math.min(10_500_000 * r, cash * 0.25),
      newProducts: [
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Snapshot Phone")
          ? [{ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Long Life Phone")
          ? [{ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Outdoor Basic")
          ? [{ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" }]
          : []),
      ],
      productImprovements: [
        { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "professional-product", qualityIncrease: 2, featuresIncrease: 2 },
      ],
    },
    finance: { dividendPerShare: 0.5 },
  } as AllDecisions;
}

// ---- Brand strategy (diverges R5+) ----

function brandDecisions(state: TeamState, market: MarketState, round: number): AllDecisions {
  if (round <= 4) return sharedFoundation(state, market, round);
  const cash = state.cash;
  const r = rs(round);

  return {
    factory: {
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
      upgradePurchases: [
        ...tryUpgrade(state, "automation", 75_000_000),
        ...tryUpgrade(state, "continuousImprovement", 30_000_000),
        ...(round >= 6 ? tryUpgrade(state, "flexibleManufacturing", 90_000_000) : []),
      ],
      newFactories: factoryCount(state) < 2 && cash > 80_000_000
        ? [{ name: "Brand Plant Europe", region: "Europe" }]
        : [],
      esgInitiatives: {
        communityInvestment: Math.min(1_500_000, cash * 0.025),
        executivePayRatio: true, employeeWellness: true, diversityInclusion: true,
        transparencyReport: true, ...(round >= 6 ? { codeOfEthics: true } : {}),
      } as Record<string, unknown>,
    },
    hr: {
      recruitmentSearches: [
        { role: "worker", tier: "basic", factoryId: fid(state) },
        { role: "worker", tier: "basic", factoryId: fid(state) },
        { role: "engineer", tier: "basic", factoryId: fid(state) },
        { role: "supervisor", tier: "basic", factoryId: fid(state) },
      ],
      trainingPrograms: [{ role: "worker", programType: "teamwork" }],
      benefitChanges: { flexibleWork: true, paidTimeOff: 20 },
    },
    marketing: {
      advertisingBudget: {
        Budget: Math.min(2_000_000 * r, cash * 0.08),
        General: Math.min(5_500_000 * r, cash * 0.18),
        Enthusiast: Math.min(3_000_000 * r, cash * 0.12),
        Professional: Math.min(2_000_000 * r, cash * 0.08),
        "Active Lifestyle": Math.min(4_500_000 * r, cash * 0.15),
      },
      brandingInvestment: Math.min(6_000_000 * r, cash * 0.18),
      promotions: round >= 7 ? [{ segment: "General", discountPercent: 5, duration: 1 }] : [],
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
    },
    rd: {
      rdBudget: Math.min(10_500_000 * r, cash * 0.25),
      newProducts: [
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Snapshot Phone")
          ? [{ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Long Life Phone")
          ? [{ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Outdoor Basic")
          ? [{ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" }]
          : []),
      ],
      productImprovements: [
        { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "enthusiast-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
      ],
    },
    finance: { dividendPerShare: 0.5 },
  } as AllDecisions;
}

// ---- Cost-cutter strategy (diverges R5+) ----

function costCutterDecisions(state: TeamState, market: MarketState, round: number): AllDecisions {
  if (round <= 4) return sharedFoundation(state, market, round);
  const cash = state.cash;
  const r = rs(round);

  return {
    factory: {
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
      upgradePurchases: [
        ...tryUpgrade(state, "automation", 75_000_000),
        ...tryUpgrade(state, "continuousImprovement", 30_000_000),
        ...tryUpgrade(state, "leanManufacturing", 40_000_000),
        ...tryUpgrade(state, "sixSigma", 75_000_000),
        ...(round >= 7 ? tryUpgrade(state, "iotIntegration", 50_000_000) : []),
      ],
      newFactories: factoryCount(state) < 2 && cash > 80_000_000
        ? [{ name: "Lean Plant Asia", region: "Asia" }]
        : [],
      esgInitiatives: {
        executivePayRatio: true, employeeWellness: true, diversityInclusion: true,
        transparencyReport: true,
        ...(round >= 6 ? { codeOfEthics: true } : {}),
        ...(round >= 7 ? { whistleblowerProtection: true } : {}),
      } as Record<string, unknown>,
    },
    hr: {
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
    },
    marketing: {
      advertisingBudget: {
        Budget: Math.min(7_000_000 * r, cash * 0.22),
        General: Math.min(6_000_000 * r, cash * 0.20),
        Enthusiast: Math.min(2_500_000 * r, cash * 0.10),
        Professional: Math.min(2_000_000 * r, cash * 0.08),
        "Active Lifestyle": Math.min(5_000_000 * r, cash * 0.16),
      },
      brandingInvestment: Math.min(3_000_000 * r, cash * 0.12),
      promotions: [{ segment: "Budget", discountPercent: 6, duration: 1 }],
      sponsorships: round >= 6
        ? [{ name: "Budget Retailer Partnership", cost: Math.min(1_500_000, cash * 0.02), brandImpact: 0.008 }]
        : [],
      productPricing: [
        { productId: "budget-product", newPrice: 185 },
        { productId: "initial-product", newPrice: 405 },
        { productId: "active-product", newPrice: 535 },
        { productId: "enthusiast-product", newPrice: 755 },
        { productId: "professional-product", newPrice: 1165 },
      ],
    },
    rd: {
      rdBudget: Math.min(8_000_000 * r, cash * 0.20),
      newProducts: [
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Snapshot Phone")
          ? [{ name: "Snapshot Phone", segment: "General", targetQuality: 60, targetFeatures: 55, archetypeId: "snapshot_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Long Life Phone")
          ? [{ name: "Long Life Phone", segment: "Budget", targetQuality: 55, targetFeatures: 40, archetypeId: "long_life_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Outdoor Basic")
          ? [{ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 60, targetFeatures: 50, archetypeId: "outdoor_basic" }]
          : []),
      ],
      productImprovements: [
        { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
      ],
    },
    finance: { dividendPerShare: 1.0 },
  } as AllDecisions;
}

// ---- ESG-focused strategy (max ESG + moderate R&D + moderate marketing) ----

function esgFocusedDecisions(state: TeamState, market: MarketState, round: number): AllDecisions {
  if (round <= 4) return sharedFoundation(state, market, round);
  const cash = state.cash;
  const r = rs(round);

  return {
    factory: {
      efficiencyInvestments: {
        [fid(state)]: {
          workers: Math.min(2_000_000 * r, cash * 0.08),
          machinery: Math.min(3_500_000 * r, cash * 0.12),
          supervisors: Math.min(600_000, cash * 0.04),
          engineers: Math.min(2_500_000 * r, cash * 0.10),
          factory: Math.min(1_000_000, cash * 0.05),
        },
      },
      // Heavy green investments — ESG strategy cornerstone
      greenInvestments: { [fid(state)]: Math.min(5_000_000, cash * 0.12) },
      upgradePurchases: [
        ...tryUpgrade(state, "automation", 75_000_000),
        ...tryUpgrade(state, "continuousImprovement", 30_000_000),
        // ESG upgrades: sustainability-focused factory improvements
        ...tryUpgrade(state, "solarPanels", 45_000_000),
        ...tryUpgrade(state, "waterRecycling", 25_000_000),
        ...(round >= 6 ? tryUpgrade(state, "wasteToEnergy", 35_000_000) : []),
        ...(round >= 7 ? tryUpgrade(state, "carbonCapture", 70_000_000) : []),
      ],
      newFactories: factoryCount(state) < 2 && cash > 80_000_000
        ? [{ name: "Green Plant Europe", region: "Europe" }]
        : [],
      // Max ESG initiatives — all available tiers
      esgInitiatives: {
        charitableDonation: Math.min(2_000_000, cash * 0.03),
        communityInvestment: Math.min(2_000_000, cash * 0.03),
        codeOfEthics: true,
        workplaceHealthSafety: true,
        fairWageProgram: true,
        executivePayRatio: true,
        employeeWellness: true,
        diversityInclusion: true,
        transparencyReport: true,
        humanRightsAudit: true,
        whistleblowerProtection: true,
        carbonOffsetProgram: Math.min(1_500_000, cash * 0.02),
        renewableEnergyCertificates: Math.min(500_000, cash * 0.01),
        waterConservation: true,
        zeroWasteCommitment: true,
        ...(round >= 6 ? { circularEconomy: true } : {}),
        ...(round >= 6 ? { affordableHousing: Math.min(500_000, cash * 0.01) } : {}),
        ...(round >= 7 ? { biodiversityProtection: Math.min(500_000, cash * 0.01) } : {}),
        communityEducation: Math.min(500_000, cash * 0.01),
      } as Record<string, unknown>,
    },
    hr: {
      recruitmentSearches: [
        { role: "worker", tier: "basic", factoryId: fid(state) },
        { role: "engineer", tier: "basic", factoryId: fid(state) },
        { role: "worker", tier: "basic", factoryId: fid(state) },
        { role: "supervisor", tier: "basic", factoryId: fid(state) },
      ],
      trainingPrograms: [
        { role: "worker", programType: "efficiency" },
        { role: "engineer", programType: "innovation" },
      ],
      benefitChanges: {
        healthInsurance: 80,
        retirementMatch: 8,
        paidTimeOff: 22,
        flexibleWork: true,
      },
    },
    marketing: {
      // Moderate marketing — not the highest, not the lowest
      advertisingBudget: {
        Budget: Math.min(3_000_000 * r, cash * 0.10),
        General: Math.min(4_000_000 * r, cash * 0.12),
        Enthusiast: Math.min(3_000_000 * r, cash * 0.10),
        Professional: Math.min(3_500_000 * r, cash * 0.12),
        "Active Lifestyle": Math.min(3_500_000 * r, cash * 0.12),
      },
      brandingInvestment: Math.min(4_000_000 * r, cash * 0.12),
      promotions: [] as Array<{ segment: string; discountPercent: number; duration: number }>,
      sponsorships: [
        { name: "Sustainability Summit", cost: Math.min(2_000_000, cash * 0.03), brandImpact: 0.012 },
      ],
      productPricing: [
        { productId: "budget-product", newPrice: 195 },
        { productId: "initial-product", newPrice: 420 },
        { productId: "active-product", newPrice: 550 },
        { productId: "enthusiast-product", newPrice: 770 },
        { productId: "professional-product", newPrice: 1180 },
      ],
    },
    rd: {
      // Moderate R&D
      rdBudget: Math.min(10_000_000 * r, cash * 0.22),
      newProducts: [
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Snapshot Phone")
          ? [{ name: "Snapshot Phone", segment: "General", targetQuality: 58, targetFeatures: 53, archetypeId: "snapshot_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Long Life Phone")
          ? [{ name: "Long Life Phone", segment: "Budget", targetQuality: 54, targetFeatures: 40, archetypeId: "long_life_phone" }]
          : []),
        ...(hasTech(state, "process_optimization") && !hasProduct(state, "Outdoor Basic")
          ? [{ name: "Outdoor Basic", segment: "Active Lifestyle", targetQuality: 58, targetFeatures: 48, archetypeId: "outdoor_basic" }]
          : []),
      ],
      productImprovements: [
        { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
      ],
    },
    finance: { dividendPerShare: 0.5 },
  } as AllDecisions;
}

// ---- "Optimal" strategy for rubber-banding test (balanced + aggressive spending) ----

function optimalRecoveryDecisions(state: TeamState, market: MarketState, round: number): AllDecisions {
  // Balanced strategy with slightly higher spend across the board
  const base = balancedDecisions(state, market, round);
  return base;
}

// ---------------------------------------------------------------------------
// Strategy dispatcher for the 5-team ESG viability test
// ---------------------------------------------------------------------------

type FiveTeamStrategy = "premium" | "balanced" | "brand" | "cost-cutter" | "esg-focused";

const FIVE_TEAM_IDS: FiveTeamStrategy[] = ["premium", "balanced", "brand", "cost-cutter", "esg-focused"];

function fiveTeamDispatcher(teamId: string, round: number, state: TeamState, market: MarketState): AllDecisions {
  switch (teamId as FiveTeamStrategy) {
    case "premium":
      return premiumDecisions(state, market, round);
    case "balanced":
      return balancedDecisions(state, market, round);
    case "brand":
      return brandDecisions(state, market, round);
    case "cost-cutter":
      return costCutterDecisions(state, market, round);
    case "esg-focused":
      return esgFocusedDecisions(state, market, round);
    default:
      return sharedFoundation(state, market, round);
  }
}

// ===========================================================================
// L7-ESG-01 — ESG team achieves top-3 in >=20% of 30 games
// ===========================================================================

describe("L7-ESG-01: ESG strategy competitive viability", { timeout: 600_000 }, () => {
  const NUM_GAMES = 30;
  const ROUNDS_PER_GAME = 8;
  const MIN_TOP3_RATE = 0.20;

  it("ESG-focused team finishes rank 1-3 in >=20% of games against 4 other archetypes", () => {
    let esgTop3Count = 0;

    for (let game = 0; game < NUM_GAMES; game++) {
      const seed = `esg-viability-game-${game}`;

      const history = runMultiRoundGame(
        fiveTeamDispatcher,
        FIVE_TEAM_IDS,
        ROUNDS_PER_GAME,
        seed,
      );

      // Get final round rankings
      const finalRankings = history.rankingsByRound[ROUNDS_PER_GAME - 1];
      const esgRanking = finalRankings.find((r) => r.teamId === "esg-focused");

      if (esgRanking && esgRanking.rank <= 3) {
        esgTop3Count++;
      }
    }

    const top3Rate = esgTop3Count / NUM_GAMES;

    // ESG must be viable: top-3 finish in at least 20% of games
    expect(top3Rate).toBeGreaterThanOrEqual(MIN_TOP3_RATE);
  });
});

// ===========================================================================
// L7-PED-01 — Pedagogical learning outcomes (3 outcomes, multi-seed)
// ===========================================================================

describe("L7-PED-01: Pedagogical learning outcomes", { timeout: 300_000 }, () => {
  const SEEDS = [
    "ped-v7-alpha", "ped-v7-beta", "ped-v7-gamma", "ped-v7-delta", "ped-v7-epsilon",
    "ped-v7-zeta", "ped-v7-eta", "ped-v7-theta", "ped-v7-iota", "ped-v7-kappa",
  ];
  const ROUNDS = 8;

  // ---------- Outcome 1: Early R&D beats late R&D ----------

  it("PED-01a: Early R&D investment beats late R&D in majority of seeds", () => {
    let earlyWins = 0;

    for (const seed of SEEDS) {
      const history = runMultiRoundGame(
        (teamId, round, state, market) => {
          const base = sharedFoundation(state, market, round);
          if (teamId === "early-rd") {
            return {
              ...base,
              rd: {
                ...(base as Record<string, unknown>).rd as Record<string, unknown>,
                rdBudget: round <= 3 ? 15_000_000 : 5_000_000,
              },
            } as AllDecisions;
          } else {
            return {
              ...base,
              rd: {
                ...(base as Record<string, unknown>).rd as Record<string, unknown>,
                rdBudget: round <= 3 ? 5_000_000 : 15_000_000,
              },
            } as AllDecisions;
          }
        },
        ["early-rd", "late-rd"],
        ROUNDS,
        seed,
      );

      const earlyRevenue = sum(history.revenueByRound["early-rd"]);
      const lateRevenue = sum(history.revenueByRound["late-rd"]);
      if (earlyRevenue > lateRevenue) earlyWins++;
    }

    // At least 6 out of 10 seeds (majority) must confirm early R&D advantage
    expect(earlyWins).toBeGreaterThanOrEqual(6);
  });

  // ---------- Outcome 2: Maintaining workforce beats mass firing ----------

  it("PED-01b: Maintaining workforce beats mass firing in late-game revenue", () => {
    let maintainWins = 0;

    for (const seed of SEEDS) {
      const history = runMultiRoundGame(
        (teamId, round, state, market) => {
          const base = sharedFoundation(state, market, round);

          if (teamId === "fire-team" && round === 2) {
            // Fire 50% of workers in round 2
            const workers = (state.employees || []).filter((e) => e.role === "worker");
            const toFire = workers.slice(0, Math.floor(workers.length / 2));
            return {
              ...base,
              hr: {
                ...(base as Record<string, unknown>).hr as Record<string, unknown>,
                fires: toFire.map((e) => ({ employeeId: e.id })),
              },
            } as AllDecisions;
          }

          if (teamId === "maintain-team") {
            // Maintain team: keep workforce, add retention measures
            return {
              ...base,
              hr: {
                ...(base as Record<string, unknown>).hr as Record<string, unknown>,
                salaryMultiplierChanges: {
                  workers: 1.05,
                  engineers: 1.05,
                  supervisors: 1.05,
                },
              },
            } as AllDecisions;
          }

          return base;
        },
        ["fire-team", "maintain-team"],
        ROUNDS,
        seed,
      );

      // Compare late-game revenue (rounds 5-8 = indices 4-7)
      const fireLate = sum(history.revenueByRound["fire-team"].slice(4));
      const maintainLate = sum(history.revenueByRound["maintain-team"].slice(4));
      if (maintainLate > fireLate) maintainWins++;
    }

    // At least 6 out of 10 seeds must confirm maintaining workforce is better
    expect(maintainWins).toBeGreaterThanOrEqual(6);
  });

  // ---------- Outcome 3: ESG investment creates brand advantage by round 6 ----------

  it("PED-01c: ESG investment creates brand advantage by round 6", () => {
    let esgBrandWins = 0;

    for (const seed of SEEDS) {
      const history = runMultiRoundGame(
        (teamId, round, state, market) => {
          const base = sharedFoundation(state, market, round);

          if (teamId === "esg-team") {
            // Inject heavy ESG initiatives every round
            return {
              ...base,
              factory: {
                ...(base as Record<string, unknown>).factory as Record<string, unknown>,
                greenInvestments: { [fid(state)]: Math.min(3_000_000, state.cash * 0.08) },
                esgInitiatives: {
                  charitableDonation: Math.min(1_500_000, state.cash * 0.02),
                  communityInvestment: Math.min(1_000_000, state.cash * 0.015),
                  codeOfEthics: true,
                  workplaceHealthSafety: true,
                  executivePayRatio: true,
                  employeeWellness: true,
                  diversityInclusion: true,
                  transparencyReport: true,
                  ...(round >= 4 ? { humanRightsAudit: true } : {}),
                  ...(round >= 4 ? { whistleblowerProtection: true } : {}),
                  carbonOffsetProgram: Math.min(500_000, state.cash * 0.01),
                } as Record<string, unknown>,
              },
            } as AllDecisions;
          }

          // Baseline team: minimal ESG (just foundation defaults)
          return base;
        },
        ["esg-team", "baseline-team"],
        ROUNDS,
        seed,
      );

      // Check brand value at round 6 (index 5)
      const esgBrand = history.brandByRound["esg-team"][5] ?? 0;
      const baseBrand = history.brandByRound["baseline-team"][5] ?? 0;
      if (esgBrand > baseBrand) esgBrandWins++;
    }

    // At least 6 out of 10 seeds must confirm ESG creates brand advantage
    expect(esgBrandWins).toBeGreaterThanOrEqual(6);
  });
});

// ===========================================================================
// L7-RB-01 — Rubber-banding: bottom team recoverable
// ===========================================================================

describe("L7-RB-01: Rubber-banding allows bottom team recovery", { timeout: 300_000 }, () => {
  const NUM_GAMES = 10;
  const TOTAL_ROUNDS = 8;
  const MID_ROUND = 4;

  it("Bottom team at round 4 improves rank after switching to optimal strategy in >=50% of games", () => {
    let recoveryCount = 0;

    for (let game = 0; game < NUM_GAMES; game++) {
      const seed = `rubber-band-game-${game}`;
      const teamIds = FIVE_TEAM_IDS;

      // --- Phase 1: Run rounds 1-4 normally ---
      const teams = teamIds.map((id) => ({
        id,
        state: SimulationEngine.createInitialTeamState(),
        decisions: {} as AllDecisions,
      }));
      let marketState: MarketState = SimulationEngine.createInitialMarketState();

      let midRankings: SimulationOutput["rankings"] = [];

      for (let round = 1; round <= MID_ROUND; round++) {
        for (const team of teams) {
          team.decisions = fiveTeamDispatcher(team.id, round, team.state, marketState);
        }

        const output = SimulationEngine.processRound({
          roundNumber: round,
          teams: teams.map((t) => ({ id: t.id, state: t.state, decisions: t.decisions })),
          marketState,
          matchSeed: seed,
        });

        for (const result of output.results) {
          const team = teams.find((t) => t.id === result.teamId)!;
          team.state = result.newState;
        }
        marketState = output.newMarketState;

        if (round === MID_ROUND) {
          midRankings = output.rankings;
        }
      }

      // Identify the bottom team at round 4
      const sorted = [...midRankings].sort((a, b) => b.rank - a.rank);
      const bottomTeamId = sorted[0].teamId;
      const bottomRankAtMid = sorted[0].rank;

      // --- Phase 2: Run rounds 5-8, with the bottom team switching to optimal ---
      for (let round = MID_ROUND + 1; round <= TOTAL_ROUNDS; round++) {
        for (const team of teams) {
          if (team.id === bottomTeamId) {
            // Bottom team switches to optimal (balanced) recovery strategy
            team.decisions = optimalRecoveryDecisions(team.state, marketState, round);
          } else {
            // Others continue their normal strategy
            team.decisions = fiveTeamDispatcher(team.id, round, team.state, marketState);
          }
        }

        const output = SimulationEngine.processRound({
          roundNumber: round,
          teams: teams.map((t) => ({ id: t.id, state: t.state, decisions: t.decisions })),
          marketState,
          matchSeed: seed,
        });

        for (const result of output.results) {
          const team = teams.find((t) => t.id === result.teamId)!;
          team.state = result.newState;
        }
        marketState = output.newMarketState;

        // Get final rankings on the last round
        if (round === TOTAL_ROUNDS) {
          const finalRankings = output.rankings;
          const bottomFinalRank = finalRankings.find((r) => r.teamId === bottomTeamId)?.rank ?? 5;

          // Recovery = improved rank (lower number = better rank)
          if (bottomFinalRank < bottomRankAtMid) {
            recoveryCount++;
          }
        }
      }
    }

    // Bottom team must recover (improve rank) in at least 50% of games
    const recoveryRate = recoveryCount / NUM_GAMES;
    expect(recoveryRate).toBeGreaterThanOrEqual(0.50);
  });
});
