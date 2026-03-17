/**
 * Deterministic Scenario Generator for Stress Testing
 *
 * Generates valid SimulationInput objects for all scenario profiles.
 * All randomness flows through Mulberry32 (SeededRNG) for reproducibility.
 */

import { SimulationEngine, type SimulationInput, type SimulationOutput } from "../core/SimulationEngine";
import { createEngineContext, type EngineContext } from "../core/EngineContext";
import { CONSTANTS } from "../types";
import type { TeamState } from "../types/state";
import type { MarketState } from "../types/market";
import type { AllDecisions, FactoryDecisions, HRDecisions, RDDecisions, MarketingDecisions, FinanceDecisions } from "../types/decisions";
import type { Segment, Region } from "../types/factory";

// ============================================
// SCENARIO PROFILES
// ============================================

export type ScenarioProfile =
  | "baseline-balanced"
  | "aggressive-debt"
  | "marketing-overdrive"
  | "under-invested-ops"
  | "RD-patent-rush"
  | "HR-turnover-crisis"
  | "factory-expansion-blitz"
  | "ESG-maximizer"
  | "supply-shock"
  | "tariff-war"
  | "event-heavy"
  | "achievement-hunter"
  | "chaos-monkey"
  | "bankruptcy-spiral"
  | "segment-specialist"
  | "premium-pivot"
  | "empty-decisions"
  | "passive";

// ============================================
// HELPERS
// ============================================

export function createMinimalEngineContext(
  seed: string = "test-seed",
  round: number = 1,
  teamId: string = "team-1"
): EngineContext {
  return createEngineContext(seed, round, teamId);
}

export function createMinimalTeamState(overrides?: Partial<TeamState>): TeamState {
  return SimulationEngine.createInitialTeamState(overrides);
}

export function createMinimalMarketState(overrides?: Partial<MarketState>): MarketState {
  const base = SimulationEngine.createInitialMarketState();
  if (overrides) {
    return { ...base, ...overrides };
  }
  return base;
}

export function createGamePreset(type: "quick" | "standard" | "full"): {
  teamState: TeamState;
  maxRounds: number;
} {
  const presets = {
    quick: { workers: 50, engineers: 8, supervisors: 5, includeProducts: true, startingSegments: 5, brandValue: 0.5, rounds: 16 },
    standard: { workers: 20, engineers: 4, supervisors: 2, includeProducts: true, startingSegments: 2, brandValue: 0.3, rounds: 24 },
    full: { workers: 0, engineers: 0, supervisors: 0, includeProducts: false, startingSegments: 0, brandValue: 0.0, rounds: 32 },
  };
  const p = presets[type];
  return {
    teamState: SimulationEngine.createInitialTeamState(undefined, {
      workers: p.workers,
      engineers: p.engineers,
      supervisors: p.supervisors,
      includeProducts: p.includeProducts,
      startingSegments: p.startingSegments,
      brandValue: p.brandValue,
    }),
    maxRounds: p.rounds,
  };
}

// ============================================
// DECISION GENERATORS
// ============================================

function baselineBalancedDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {
      efficiencyInvestments: {},
      productionAllocations: [],
    },
    hr: {},
    rd: {
      rdBudget: 5_000_000,
    },
    marketing: {
      advertisingBudget: {
        Budget: 1_000_000,
        General: 1_500_000,
        Enthusiast: 1_000_000,
        Professional: 500_000,
        "Active Lifestyle": 800_000,
      },
      brandingInvestment: 2_000_000,
    },
    finance: {},
  };
}

function aggressiveDebtDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {},
    hr: {},
    rd: { rdBudget: 1_000_000 },
    marketing: { advertisingBudget: { General: 500_000 }, brandingInvestment: 500_000 },
    finance: {
      loanRequest: { amount: 50_000_000, termMonths: 24 },
      corporateBondsIssue: 30_000_000,
      treasuryBillsIssue: 20_000_000,
    },
  };
}

function marketingOverdriveDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {},
    hr: {},
    rd: { rdBudget: 1_000_000 },
    marketing: {
      advertisingBudget: {
        Budget: 10_000_000,
        General: 15_000_000,
        Enthusiast: 10_000_000,
        Professional: 5_000_000,
        "Active Lifestyle": 10_000_000,
      },
      brandingInvestment: 10_000_000,
      sponsorships: [
        { name: "National TV Campaign", cost: 35_000_000, brandImpact: 0.045 },
      ],
    },
    finance: {},
  };
}

function underInvestedOpsDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {},
    hr: {},
    rd: { rdBudget: 0 },
    marketing: { advertisingBudget: { General: 500_000 } },
    finance: {},
  };
}

function rdPatentRushDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {},
    hr: {},
    rd: {
      rdBudget: 50_000_000,
      newProducts: [
        { name: "Ultra Phone", segment: "Enthusiast" as Segment, targetQuality: 85, targetFeatures: 80 },
      ],
    },
    marketing: { advertisingBudget: { General: 1_000_000 }, brandingInvestment: 1_000_000 },
    finance: {},
  };
}

function hrTurnoverCrisisDecisions(state: TeamState, _round: number): AllDecisions {
  // Fire a chunk of workers to create crisis
  const workerIds = state.employees.filter(e => e.role === "worker").slice(0, 10).map(e => ({ employeeId: e.id }));
  return {
    factory: {},
    hr: {
      fires: workerIds,
      salaryMultiplierChanges: { workers: 0.5, engineers: 0.5, supervisors: 0.5 },
    },
    rd: { rdBudget: 0 },
    marketing: {},
    finance: {},
  };
}

function factoryExpansionBlitzDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {
      newFactories: [
        { name: "Asia Factory", region: "Asia" as Region },
        { name: "Europe Factory", region: "Europe" as Region },
      ],
      upgradePurchases: [
        { factoryId: _state.factories[0]?.id ?? "factory-1", upgrade: "sixSigma" },
      ],
    },
    hr: {},
    rd: { rdBudget: 2_000_000 },
    marketing: { advertisingBudget: { General: 1_000_000 } },
    finance: {},
  };
}

function esgMaximizerDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {
      esgInitiatives: {
        charitableDonation: 5_000_000,
        communityInvestment: 3_000_000,
        workplaceHealthSafety: true,
        fairWageProgram: true,
        codeOfEthics: true,
        supplierEthicsProgram: true,
        waterConservation: true,
        zeroWasteCommitment: true,
        diversityInclusion: true,
        employeeWellness: true,
        transparencyReport: true,
        whistleblowerProtection: true,
        executivePayRatio: true,
      },
    },
    hr: {},
    rd: { rdBudget: 5_000_000 },
    marketing: { advertisingBudget: { General: 2_000_000 }, brandingInvestment: 2_000_000 },
    finance: {},
  };
}

function bankruptcySpiralDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {
      newFactories: [
        { name: "Expansion 1", region: "North America" as Region },
      ],
      upgradePurchases: [
        { factoryId: _state.factories[0]?.id ?? "factory-1", upgrade: "supplyChain" },
      ],
    },
    hr: {},
    rd: { rdBudget: 40_000_000 },
    marketing: {
      advertisingBudget: {
        Budget: 10_000_000,
        General: 10_000_000,
        Enthusiast: 10_000_000,
        Professional: 10_000_000,
        "Active Lifestyle": 10_000_000,
      },
      brandingInvestment: 10_000_000,
    },
    finance: {
      dividendPerShare: 5,
    },
  };
}

function emptyDecisions(_state: TeamState, _round: number): AllDecisions {
  return {};
}

function segmentSpecialistDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {},
    hr: {},
    rd: {
      rdBudget: 15_000_000,
      productImprovements: _state.products
        .filter(p => p.segment === "Professional")
        .map(p => ({ productId: p.id, qualityIncrease: 5 })),
    },
    marketing: {
      advertisingBudget: { Professional: 10_000_000 },
      brandingInvestment: 5_000_000,
    },
    finance: {},
  };
}

function achievementHunterDecisions(_state: TeamState, _round: number): AllDecisions {
  return {
    factory: {
      esgInitiatives: {
        charitableDonation: 2_000_000,
        codeOfEthics: true,
        employeeWellness: true,
      },
    },
    hr: {},
    rd: {
      rdBudget: 10_000_000,
      newProducts: [
        { name: `Achievement Product R${_round}`, segment: "Enthusiast" as Segment, targetQuality: 75, targetFeatures: 70 },
      ],
    },
    marketing: {
      advertisingBudget: {
        Budget: 2_000_000,
        General: 3_000_000,
        Enthusiast: 3_000_000,
        Professional: 1_000_000,
        "Active Lifestyle": 2_000_000,
      },
      brandingInvestment: 3_000_000,
      sponsorships: [{ name: "Tech Conference", cost: 7_500_000, brandImpact: 0.012 }],
    },
    finance: {},
  };
}

// ============================================
// PROFILE DISPATCH
// ============================================

const PROFILE_GENERATORS: Record<ScenarioProfile, (state: TeamState, round: number) => AllDecisions> = {
  "baseline-balanced": baselineBalancedDecisions,
  "aggressive-debt": aggressiveDebtDecisions,
  "marketing-overdrive": marketingOverdriveDecisions,
  "under-invested-ops": underInvestedOpsDecisions,
  "RD-patent-rush": rdPatentRushDecisions,
  "HR-turnover-crisis": hrTurnoverCrisisDecisions,
  "factory-expansion-blitz": factoryExpansionBlitzDecisions,
  "ESG-maximizer": esgMaximizerDecisions,
  "supply-shock": underInvestedOpsDecisions, // minimal orders = supply shock
  "tariff-war": baselineBalancedDecisions,    // tariffs are market-level
  "event-heavy": bankruptcySpiralDecisions,   // triggers crisis conditions
  "achievement-hunter": achievementHunterDecisions,
  "chaos-monkey": baselineBalancedDecisions,  // overridden in createChaosDecisions
  "bankruptcy-spiral": bankruptcySpiralDecisions,
  "segment-specialist": segmentSpecialistDecisions,
  "premium-pivot": baselineBalancedDecisions, // handled in multi-round
  "empty-decisions": emptyDecisions,
  "passive": emptyDecisions,           // do-nothing strategy
};

export function createDecisionsForProfile(
  profile: ScenarioProfile,
  state: TeamState,
  round: number
): AllDecisions {
  return PROFILE_GENERATORS[profile](state, round);
}

// ============================================
// SIMULATION INPUT BUILDERS
// ============================================

export function createSimulationInput(opts: {
  teamCount: number;
  roundNumber: number;
  matchSeed: string;
  profile: ScenarioProfile;
  preset?: "quick" | "standard" | "full";
}): SimulationInput {
  const teams: SimulationInput["teams"] = [];
  for (let i = 0; i < opts.teamCount; i++) {
    const teamId = `team-${i + 1}`;
    const presetType = opts.preset ?? "quick";
    const { teamState } = createGamePreset(presetType);
    teamState.round = opts.roundNumber;

    const decisions = createDecisionsForProfile(opts.profile, teamState, opts.roundNumber);
    teams.push({ id: teamId, state: teamState, decisions });
  }

  return {
    roundNumber: opts.roundNumber,
    teams,
    marketState: createMinimalMarketState(),
    matchSeed: opts.matchSeed,
  };
}

export function createMixedStrategyInput(opts: {
  profiles: ScenarioProfile[];
  roundNumber: number;
  matchSeed: string;
  preset?: "quick" | "standard" | "full";
}): SimulationInput {
  const teams: SimulationInput["teams"] = [];
  for (let i = 0; i < opts.profiles.length; i++) {
    const teamId = `team-${i + 1}`;
    const presetType = opts.preset ?? "quick";
    const { teamState } = createGamePreset(presetType);
    teamState.round = opts.roundNumber;

    const decisions = createDecisionsForProfile(opts.profiles[i], teamState, opts.roundNumber);
    teams.push({ id: teamId, state: teamState, decisions });
  }

  return {
    roundNumber: opts.roundNumber,
    teams,
    marketState: createMinimalMarketState(),
    matchSeed: opts.matchSeed,
  };
}

// ============================================
// MULTI-ROUND RUNNER
// ============================================

export function runNRounds(opts: {
  teamCount: number;
  rounds: number;
  matchSeed: string;
  decisionFn: (state: TeamState, round: number, teamIndex: number) => AllDecisions;
  preset?: "quick" | "standard" | "full";
}): SimulationOutput[] {
  const results: SimulationOutput[] = [];
  const presetType = opts.preset ?? "quick";

  // Initialize team states
  let teamStates: TeamState[] = [];
  for (let i = 0; i < opts.teamCount; i++) {
    const { teamState } = createGamePreset(presetType);
    teamStates.push(teamState);
  }
  let marketState = createMinimalMarketState();

  for (let round = 1; round <= opts.rounds; round++) {
    const teams = teamStates.map((state, i) => ({
      id: `team-${i + 1}`,
      state: { ...state, round },
      decisions: opts.decisionFn(state, round, i),
    }));

    const input: SimulationInput = {
      roundNumber: round,
      teams,
      marketState,
      matchSeed: opts.matchSeed,
    };

    const output = SimulationEngine.processRound(input);
    results.push(output);

    // Update states for next round
    teamStates = output.results.map(r => r.newState);
    marketState = output.newMarketState;
  }

  return results;
}

export function runProfileNRounds(opts: {
  teamCount: number;
  rounds: number;
  matchSeed: string;
  profile: ScenarioProfile;
  preset?: "quick" | "standard" | "full";
}): SimulationOutput[] {
  return runNRounds({
    ...opts,
    decisionFn: (state, round) => createDecisionsForProfile(opts.profile, state, round),
  });
}

// ============================================
// CONVENIENCE ALIASES (used by stress tests that import directly from this file)
// ============================================

import { hashState } from "../core/EngineContext";

/**
 * Create a team state configured for a scenario profile (quick preset).
 */
export function createTeamState(_profile?: ScenarioProfile): TeamState {
  const { teamState } = createGamePreset("quick");
  return teamState;
}

/**
 * Create a default market state.
 */
export function createMarketState(overrides?: Partial<MarketState>): MarketState {
  return createMinimalMarketState(overrides);
}

/**
 * Create decisions for a profile given current team state.
 */
export function createDecisions(profile: ScenarioProfile, state: TeamState, round: number = 1): AllDecisions {
  return createDecisionsForProfile(profile, state, round);
}

/**
 * Run a full multi-round simulation and return tracked state.
 */
export interface SimulationResult {
  finalStates: TeamState[];
  stateHashes: Record<number, Record<string, string>>;
  roundOutputs: SimulationOutput[];
}

export function runSimulation(opts: {
  teamCount: number;
  rounds: number;
  seed: string;
  profile?: ScenarioProfile;
  decisionFn?: (state: TeamState, round: number, teamIndex: number) => AllDecisions;
  preset?: "quick" | "standard" | "full";
}): SimulationResult {
  const presetType = opts.preset ?? "quick";
  const roundOutputs: SimulationOutput[] = [];
  const stateHashes: Record<number, Record<string, string>> = {};

  let teamStates: TeamState[] = [];
  for (let i = 0; i < opts.teamCount; i++) {
    const { teamState } = createGamePreset(presetType);
    teamStates.push(teamState);
  }

  let marketState = createMinimalMarketState();

  for (let round = 1; round <= opts.rounds; round++) {
    const teams: SimulationInput["teams"] = [];
    for (let i = 0; i < opts.teamCount; i++) {
      const teamId = `team-${i + 1}`;
      let decisions: AllDecisions;
      if (opts.decisionFn) {
        decisions = opts.decisionFn(teamStates[i], round, i);
      } else {
        const profile = opts.profile ?? "baseline-balanced";
        decisions = createDecisionsForProfile(profile, teamStates[i], round);
      }
      teams.push({ id: teamId, state: teamStates[i], decisions });
    }

    const input: SimulationInput = {
      roundNumber: round,
      teams,
      marketState,
      matchSeed: opts.seed,
    };

    const output = SimulationEngine.processRound(input);
    roundOutputs.push(output);

    stateHashes[round] = {};
    for (const result of output.results) {
      stateHashes[round][result.teamId] = hashState(result.newState);
    }

    teamStates = output.results.map(r => r.newState);
    if (output.newMarketState) {
      marketState = output.newMarketState;
    }
  }

  return { finalStates: teamStates, stateHashes, roundOutputs };
}
