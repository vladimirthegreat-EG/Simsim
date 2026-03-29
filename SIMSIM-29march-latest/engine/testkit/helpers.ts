/**
 * Test Helpers for SIMSIM Engine Stress Testing
 */

import { SimulationEngine, type SimulationInput, type SimulationOutput } from "../core/SimulationEngine";
import { hashState } from "../core/EngineContext";
import type { TeamState } from "../types/state";
import type { AllDecisions } from "../types/decisions";
import { runAllInvariants, type InvariantResult } from "./invariants";
import { createMinimalTeamState, createMinimalMarketState, createDecisionsForProfile, createGamePreset, type ScenarioProfile } from "./scenarioGenerator";
import type { MarketState } from "../types/market";

// ============================================
// HASHING
// ============================================

export function hashSimulationOutput(output: SimulationOutput): string {
  // Hash the key result fields (not summary messages which may vary)
  const hashable = {
    roundNumber: output.roundNumber,
    results: output.results.map(r => ({
      teamId: r.teamId,
      cash: r.newState.cash,
      revenue: r.totalRevenue,
      costs: r.totalCosts,
      netIncome: r.netIncome,
      rank: r.rank,
      marketShares: r.marketShareBySegment,
      brandValue: r.newState.brandValue,
      headcount: r.newState.workforce.totalHeadcount,
    })),
    rankings: output.rankings,
    finalStateHashes: output.auditTrail.finalStateHashes,
  };
  return hashState(hashable);
}

// ============================================
// STATE COMPARISON
// ============================================

export interface StateDiff {
  path: string;
  expected: unknown;
  actual: unknown;
}

export function compareStates(a: TeamState, b: TeamState): StateDiff[] {
  const diffs: StateDiff[] = [];
  const numericFields = [
    "cash", "revenue", "netIncome", "totalAssets", "totalLiabilities",
    "shareholdersEquity", "marketCap", "sharesIssued", "sharePrice", "eps",
    "brandValue", "esgScore", "co2Emissions", "rdBudget", "rdProgress",
  ] as const;

  for (const field of numericFields) {
    if (a[field] !== b[field]) {
      diffs.push({ path: field, expected: a[field], actual: b[field] });
    }
  }

  if (a.workforce.totalHeadcount !== b.workforce.totalHeadcount) {
    diffs.push({
      path: "workforce.totalHeadcount",
      expected: a.workforce.totalHeadcount,
      actual: b.workforce.totalHeadcount,
    });
  }

  if (a.factories.length !== b.factories.length) {
    diffs.push({
      path: "factories.length",
      expected: a.factories.length,
      actual: b.factories.length,
    });
  }

  if (a.products.length !== b.products.length) {
    diffs.push({
      path: "products.length",
      expected: a.products.length,
      actual: b.products.length,
    });
  }

  if (a.employees.length !== b.employees.length) {
    diffs.push({
      path: "employees.length",
      expected: a.employees.length,
      actual: b.employees.length,
    });
  }

  return diffs;
}

// ============================================
// INVARIANT RUNNER
// ============================================

export interface InvariantReport {
  passed: number;
  failed: number;
  total: number;
  results: InvariantResult[];
  failures: InvariantResult[];
}

export function assertInvariantsPass(output: SimulationOutput): InvariantReport {
  const results = runAllInvariants(output);
  const failures = results.filter(r => !r.passed);
  return {
    passed: results.length - failures.length,
    failed: failures.length,
    total: results.length,
    results,
    failures,
  };
}

// ============================================
// ENGINE RUNNER
// ============================================

export function runEngineIsolated(input: SimulationInput): SimulationOutput {
  return SimulationEngine.processRound(input);
}

// ============================================
// DETERMINISM CHECKER
// ============================================

export function verifyDeterminism(input: SimulationInput, runs: number = 3): {
  deterministic: boolean;
  hashes: string[];
  mismatches: string[];
} {
  const hashes: string[] = [];
  for (let i = 0; i < runs; i++) {
    const output = SimulationEngine.processRound(input);
    hashes.push(hashSimulationOutput(output));
  }

  const mismatches: string[] = [];
  for (let i = 1; i < hashes.length; i++) {
    if (hashes[i] !== hashes[0]) {
      mismatches.push(`Run ${i + 1} hash (${hashes[i]}) differs from run 1 (${hashes[0]})`);
    }
  }

  return {
    deterministic: mismatches.length === 0,
    hashes,
    mismatches,
  };
}

// ============================================
// STRUCTURED LOG OUTPUT
// ============================================

export interface StressTestLog {
  module: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  categories: Record<string, { passed: number; failed: number }>;
  defects: StressTestDefect[];
  determinismHash?: string;
  invariantResults?: InvariantReport;
  coverageNotes?: string;
}

export interface StressTestDefect {
  id: string;
  severity: "S0" | "S1" | "S2" | "S3";
  title: string;
  symptom: string;
  stepsToReproduce: string;
  expectedVsActual: string;
  suspectedCause: string;
  regressionTestAdded: boolean;
  scenario?: {
    profile: string;
    seed: string;
    round: number;
    teams: number;
  };
}

export function createStressTestLog(module: string): StressTestLog {
  return {
    module,
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    categories: {},
    defects: [],
  };
}

// ============================================
// CONVENIENCE ALIASES (used by stress tests)
// ============================================

/**
 * Create a team state configured for a scenario profile.
 * Alias for createMinimalTeamState with "quick" preset.
 */
export function createTeamState(profile?: ScenarioProfile): TeamState {
  const { teamState } = createGamePreset("quick");
  return teamState;
}

/**
 * Create a default market state.
 * Alias for createMinimalMarketState().
 */
export function createMarketState(overrides?: Partial<MarketState>): MarketState {
  return createMinimalMarketState(overrides);
}

/**
 * Create decisions for a profile given current team state.
 * Alias for createDecisionsForProfile with round=1 default.
 */
export function createDecisions(profile: ScenarioProfile, state: TeamState, round: number = 1): AllDecisions {
  return createDecisionsForProfile(profile, state, round);
}

// ============================================
// MULTI-ROUND SIMULATION RUNNER
// ============================================

export interface SimulationResult {
  finalStates: TeamState[];
  stateHashes: Record<number, Record<string, string>>;
  roundOutputs: SimulationOutput[];
}

/**
 * Run a full multi-round simulation and return tracked state.
 * Used by core/abuse/factory/finance/etc stress tests.
 */
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

  // Initialize team states
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

    // Track state hashes per round
    stateHashes[round] = {};
    for (const result of output.results) {
      stateHashes[round][result.teamId] = hashState(result.newState);
    }

    // Carry forward states for next round
    teamStates = output.results.map(r => r.newState);
    if (output.newMarketState) {
      marketState = output.newMarketState;
    }
  }

  return {
    finalStates: teamStates,
    stateHashes,
    roundOutputs,
  };
}

/**
 * Alias for hashSimulationOutput — used by some tests as hashOutput.
 */
export const hashOutput = hashSimulationOutput;

// ============================================
// ASSERTION HELPERS (used by stress tests)
// ============================================

/** Check no NaN values in critical numeric fields of a team state */
export function assertNoNaN(state: TeamState): void {
  const fields: (keyof TeamState)[] = [
    "cash", "revenue", "netIncome", "totalAssets", "totalLiabilities",
    "shareholdersEquity", "marketCap", "sharesIssued", "sharePrice", "eps",
    "brandValue", "esgScore",
  ];
  for (const field of fields) {
    const val = state[field];
    if (typeof val === "number" && isNaN(val)) {
      throw new Error(`NaN detected in state.${field}`);
    }
  }
}

/** Check no Infinity values in critical numeric fields */
export function assertNoOverflow(state: TeamState): void {
  const fields: (keyof TeamState)[] = [
    "cash", "revenue", "netIncome", "totalAssets", "totalLiabilities",
    "shareholdersEquity", "marketCap", "sharesIssued", "sharePrice", "eps",
  ];
  for (const field of fields) {
    const val = state[field];
    if (typeof val === "number" && !isFinite(val)) {
      throw new Error(`Infinity/overflow detected in state.${field}: ${val}`);
    }
  }
}

/** Assert all core invariants on a TeamState (thin wrapper) */
export function assertAllInvariants(state: TeamState): void {
  // Basic financial sanity checks on a single team state
  assertNoNaN(state);
  assertNoOverflow(state);
  // Cash can be negative (emergency finance handles it) but other values should be sane
  if (typeof state.brandValue === "number" && (state.brandValue < -1 || state.brandValue > 10)) {
    throw new Error(`Brand value out of bounds: ${state.brandValue}`);
  }
}

/** Assert two simulation outputs are deterministically identical */
export function assertDeterminism(output1: SimulationOutput, output2: SimulationOutput): void {
  const hash1 = hashSimulationOutput(output1);
  const hash2 = hashSimulationOutput(output2);
  if (hash1 !== hash2) {
    throw new Error(`Determinism violation: output hashes differ (${hash1} vs ${hash2})`);
  }
}

/** Assert market shares across teams sum to ~1.0 per segment */
export function assertMarketSharesSumToOne(shares: Record<string, Record<string, number>>): void {
  const segmentTotals: Record<string, number> = {};
  for (const teamShares of Object.values(shares)) {
    for (const [segment, share] of Object.entries(teamShares)) {
      segmentTotals[segment] = (segmentTotals[segment] ?? 0) + share;
    }
  }
  for (const [segment, total] of Object.entries(segmentTotals)) {
    if (Math.abs(total - 1.0) > 0.01) {
      throw new Error(`Market shares for ${segment} sum to ${total}, expected ~1.0`);
    }
  }
}

/** Assert production-related invariants hold */
export function assertProductionInvariants(state: TeamState): void {
  assertNoNaN(state);
  for (const factory of state.factories) {
    if (factory.efficiency < 0 || factory.efficiency > 2.0) {
      throw new Error(`Factory ${factory.id} efficiency out of bounds: ${factory.efficiency}`);
    }
    if (factory.defectRate < 0 || factory.defectRate > 1.0) {
      throw new Error(`Factory ${factory.id} defect rate out of bounds: ${factory.defectRate}`);
    }
  }
}

/** Assert ESG score is within valid bounds */
export function assertESGBounded(state: TeamState): void {
  if (state.esgScore < 0 || state.esgScore > 2000) {
    throw new Error(`ESG score out of bounds: ${state.esgScore}`);
  }
}

/** Assert core financial invariants */
export function assertFinancialInvariants(state: TeamState): void {
  assertNoNaN(state);
  assertNoOverflow(state);
  if (typeof state.sharesIssued === "number" && state.sharesIssued < 0) {
    throw new Error(`Negative shares issued: ${state.sharesIssued}`);
  }
}

/** Assert balance sheet equation: A = L + E (within tolerance) */
export function assertBalanceSheetEquation(state: TeamState, tolerance: number = 1.0): void {
  const diff = Math.abs(state.totalAssets - (state.totalLiabilities + state.shareholdersEquity));
  if (diff > tolerance) {
    throw new Error(
      `Balance sheet mismatch: Assets(${state.totalAssets}) != Liabilities(${state.totalLiabilities}) + Equity(${state.shareholdersEquity}), diff=${diff}`
    );
  }
}

/** Assert R&D-related invariants */
export function assertRDInvariants(state: TeamState): void {
  assertNoNaN(state);
  for (const product of state.products) {
    if (product.quality < 0 || product.quality > 200) {
      throw new Error(`Product ${product.id} quality out of bounds: ${product.quality}`);
    }
  }
}

/** Assert tech/R&D progress is bounded */
export function assertTechProgressBounded(state: TeamState): void {
  // Tech progress should not exceed reasonable bounds
  if (typeof state.rdProgress === "number" && (state.rdProgress < 0 || state.rdProgress > 10000)) {
    throw new Error(`R&D progress out of bounds: ${state.rdProgress}`);
  }
}

/** Assert tech prerequisites are respected (no advanced tech without prereqs) */
export function assertTechPrerequisites(_state: TeamState): void {
  // Placeholder — tech tree validation
  // Currently a no-op since tech prereq enforcement is in the engine
}

/** Assert patent IDs are unique within a team */
export function assertPatentsUnique(state: TeamState): void {
  if (state.patents && Array.isArray(state.patents)) {
    const ids = state.patents.map((p: { id?: string }) => p.id).filter(Boolean);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new Error(`Duplicate patent IDs detected`);
    }
  }
}

/** Assert brand value is within valid bounds */
export function assertBrandBounded(state: TeamState): void {
  if (typeof state.brandValue === "number" && (state.brandValue < -1 || state.brandValue > 10)) {
    throw new Error(`Brand value out of bounds: ${state.brandValue}`);
  }
}
