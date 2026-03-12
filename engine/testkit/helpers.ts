/**
 * Test Helpers for SIMSIM Engine Stress Testing
 */

import { SimulationEngine, type SimulationInput, type SimulationOutput } from "../core/SimulationEngine";
import { hashState } from "../core/EngineContext";
import type { TeamState } from "../types/state";
import type { AllDecisions } from "../types/decisions";
import { runAllInvariants, type InvariantResult } from "./invariants";

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
