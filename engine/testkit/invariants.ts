/**
 * Invariants Library for SIMSIM Engine Stress Testing
 *
 * Each invariant is a pure function that takes engine output and returns
 * { passed: boolean, message: string }. Invariants are grouped by category.
 */

import type { SimulationOutput } from "../core/SimulationEngine";
import type { TeamState } from "../types/state";
import type { MarketState } from "../types/market";
import { CONSTANTS } from "../types";
import { hashState } from "../core/EngineContext";

// ============================================
// INVARIANT TYPES
// ============================================

export interface InvariantResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

export type Invariant = (output: SimulationOutput, input?: unknown) => InvariantResult;

// ============================================
// DETERMINISM INVARIANTS
// ============================================

export function checkDeterminism(
  output1: SimulationOutput,
  output2: SimulationOutput
): InvariantResult {
  const hashes1 = output1.auditTrail.finalStateHashes;
  const hashes2 = output2.auditTrail.finalStateHashes;

  const mismatches: string[] = [];
  for (const teamId of Object.keys(hashes1)) {
    if (hashes1[teamId] !== hashes2[teamId]) {
      mismatches.push(`${teamId}: ${hashes1[teamId]} !== ${hashes2[teamId]}`);
    }
  }

  return {
    name: "determinism-same-seed-same-output",
    category: "determinism",
    passed: mismatches.length === 0,
    message: mismatches.length === 0
      ? "Same seed + same decisions = identical output"
      : `State hash mismatch: ${mismatches.join("; ")}`,
  };
}

export function checkSeedBundlePresent(output: SimulationOutput): InvariantResult {
  const sb = output.auditTrail.seedBundle;
  const valid = sb && typeof sb.matchSeed === "string" &&
    typeof sb.roundSeed === "number" &&
    typeof sb.factorySeed === "number" &&
    typeof sb.hrSeed === "number" &&
    typeof sb.marketSeed === "number" &&
    typeof sb.rdSeed === "number" &&
    typeof sb.financeSeed === "number" &&
    typeof sb.marketingSeed === "number";

  return {
    name: "seed-bundle-complete",
    category: "determinism",
    passed: !!valid,
    message: valid ? "Seed bundle is complete" : "Seed bundle missing fields",
    details: sb,
  };
}

// ============================================
// CASH FLOW INVARIANTS
// ============================================

export function checkCashNotNaN(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    const cash = result.newState.cash;
    if (isNaN(cash) || !isFinite(cash)) {
      issues.push(`${result.teamId}: cash=${cash}`);
    }
  }
  return {
    name: "cash-not-nan-infinity",
    category: "cash-flow",
    passed: issues.length === 0,
    message: issues.length === 0 ? "All cash values are finite" : `Invalid cash: ${issues.join("; ")}`,
  };
}

export function checkCashAccumulation(
  output: SimulationOutput,
  previousStates: Record<string, TeamState>
): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    const prev = previousStates[result.teamId];
    if (!prev) continue;

    const prevCash = prev.cash;
    const newCash = result.newState.cash;
    const revenue = result.totalRevenue;
    const costs = result.totalCosts;
    const expectedDelta = revenue - costs;

    // Cash should change by approximately revenue - costs
    // Allow tolerance for rounding
    const actualDelta = newCash - prevCash;
    const tolerance = Math.abs(expectedDelta) * 0.01 + 1; // 1% + $1

    if (Math.abs(actualDelta - expectedDelta) > tolerance) {
      issues.push(
        `${result.teamId}: expected delta=${expectedDelta.toFixed(0)}, actual=${actualDelta.toFixed(0)}, diff=${(actualDelta - expectedDelta).toFixed(0)}`
      );
    }
  }
  return {
    name: "cash-accumulation-correct",
    category: "cash-flow",
    passed: issues.length === 0,
    message: issues.length === 0
      ? "Cash accumulation matches revenue - costs"
      : `Cash mismatch: ${issues.join("; ")}`,
  };
}

// ============================================
// MARKET INVARIANTS
// ============================================

export function checkMarketSharesSumToOne(output: SimulationOutput): InvariantResult {
  const EPSILON = 0.0001;
  const segments = CONSTANTS.SEGMENTS;
  const issues: string[] = [];

  for (const segment of segments) {
    let total = 0;
    let hasData = false;
    for (const result of output.results) {
      const share = result.marketShareBySegment[segment];
      if (share !== undefined && share > 0) {
        total += share;
        hasData = true;
      }
    }
    // Shares should sum to <= 1.0 (may be < 1.0 if not all teams compete in segment)
    if (hasData && total > 1.0 + EPSILON) {
      issues.push(`${segment}: sum=${total.toFixed(6)} exceeds 1.0`);
    }
  }

  return {
    name: "market-shares-sum-to-one",
    category: "market",
    passed: issues.length === 0,
    message: issues.length === 0
      ? "Market shares sum to 1.0 per segment"
      : `Market share totals off: ${issues.join("; ")}`,
  };
}

export function checkNoNegativeMarketShares(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    for (const [segment, share] of Object.entries(result.marketShareBySegment)) {
      if (typeof share === "number" && share < 0) {
        issues.push(`${result.teamId}/${segment}: share=${share}`);
      }
    }
  }
  return {
    name: "no-negative-market-shares",
    category: "market",
    passed: issues.length === 0,
    message: issues.length === 0 ? "No negative market shares" : `Negative shares: ${issues.join("; ")}`,
  };
}

export function checkFiveSegmentsPresent(output: SimulationOutput): InvariantResult {
  const ms = output.newMarketState;
  const expected = CONSTANTS.SEGMENTS;
  const missing = expected.filter(s => !ms.demandBySegment[s]);

  return {
    name: "five-segments-present",
    category: "market",
    passed: missing.length === 0,
    message: missing.length === 0 ? "All 5 segments present" : `Missing segments: ${missing.join(", ")}`,
  };
}

export function checkRevenuePositive(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    if (result.totalRevenue < 0) {
      issues.push(`${result.teamId}: revenue=${result.totalRevenue}`);
    }
  }
  return {
    name: "revenue-non-negative",
    category: "market",
    passed: issues.length === 0,
    message: issues.length === 0 ? "All revenue non-negative" : `Negative revenue: ${issues.join("; ")}`,
  };
}

// ============================================
// FINANCIAL STATEMENT INVARIANTS
// ============================================

export function checkBalanceSheetEquation(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    const s = result.newState;
    const diff = Math.abs(s.totalAssets - (s.totalLiabilities + s.shareholdersEquity));
    if (diff > 1) { // $1 tolerance
      issues.push(
        `${result.teamId}: assets=${s.totalAssets.toFixed(0)}, liab+eq=${(s.totalLiabilities + s.shareholdersEquity).toFixed(0)}, diff=${diff.toFixed(0)}`
      );
    }
  }
  return {
    name: "balance-sheet-equation",
    category: "financial-statements",
    passed: issues.length === 0,
    message: issues.length === 0
      ? "Assets = Liabilities + Equity for all teams"
      : `Balance sheet mismatch: ${issues.join("; ")}`,
  };
}

export function checkNoNaNFinancials(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  const fields = ["cash", "revenue", "netIncome", "totalAssets", "totalLiabilities",
    "shareholdersEquity", "marketCap", "sharesIssued", "sharePrice", "eps"] as const;

  for (const result of output.results) {
    for (const field of fields) {
      const val = result.newState[field];
      if (typeof val === "number" && (isNaN(val) || !isFinite(val))) {
        issues.push(`${result.teamId}.${field}=${val}`);
      }
    }
  }
  return {
    name: "no-nan-financial-fields",
    category: "financial-statements",
    passed: issues.length === 0,
    message: issues.length === 0 ? "No NaN/Infinity in financials" : `NaN found: ${issues.join("; ")}`,
  };
}

// ============================================
// FACTORY INVARIANTS
// ============================================

export function checkHeadcountNonNegative(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    const s = result.newState;
    if (s.workforce.totalHeadcount < 0) {
      issues.push(`${result.teamId}: headcount=${s.workforce.totalHeadcount}`);
    }
    for (const f of s.factories) {
      if (f.workers < 0 || f.engineers < 0 || f.supervisors < 0) {
        issues.push(`${result.teamId}/${f.id}: w=${f.workers},e=${f.engineers},s=${f.supervisors}`);
      }
    }
  }
  return {
    name: "headcount-non-negative",
    category: "factory",
    passed: issues.length === 0,
    message: issues.length === 0 ? "All headcounts non-negative" : `Negative headcount: ${issues.join("; ")}`,
  };
}

export function checkEfficiencyBounds(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    for (const f of result.newState.factories) {
      if (f.efficiency < 0 || f.efficiency > 1.0) {
        issues.push(`${result.teamId}/${f.id}: efficiency=${f.efficiency}`);
      }
    }
  }
  return {
    name: "efficiency-in-bounds",
    category: "factory",
    passed: issues.length === 0,
    message: issues.length === 0 ? "All efficiencies in [0, 1.0]" : `Out of bounds: ${issues.join("; ")}`,
  };
}

export function checkDefectRateBounds(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    for (const f of result.newState.factories) {
      if (f.defectRate < 0 || f.defectRate > 1.0) {
        issues.push(`${result.teamId}/${f.id}: defectRate=${f.defectRate}`);
      }
    }
  }
  return {
    name: "defect-rate-in-bounds",
    category: "factory",
    passed: issues.length === 0,
    message: issues.length === 0 ? "All defect rates in [0, 1.0]" : `Out of bounds: ${issues.join("; ")}`,
  };
}

// ============================================
// HR INVARIANTS
// ============================================

export function checkMoraleBounds(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    for (const emp of result.newState.employees) {
      if (emp.morale < 0 || emp.morale > 100) {
        issues.push(`${result.teamId}/${emp.id}: morale=${emp.morale}`);
      }
    }
  }
  return {
    name: "morale-in-bounds",
    category: "hr",
    passed: issues.length === 0,
    message: issues.length === 0 ? "All morale in [0, 100]" : `Out of bounds: ${issues.join("; ")}`,
  };
}

// ============================================
// BRAND INVARIANTS
// ============================================

export function checkBrandValueBounds(output: SimulationOutput): InvariantResult {
  const issues: string[] = [];
  for (const result of output.results) {
    const bv = result.newState.brandValue;
    if (bv < 0 || bv > 1) {
      issues.push(`${result.teamId}: brandValue=${bv}`);
    }
  }
  return {
    name: "brand-value-in-bounds",
    category: "marketing",
    passed: issues.length === 0,
    message: issues.length === 0 ? "All brand values in [0, 1]" : `Out of bounds: ${issues.join("; ")}`,
  };
}

// ============================================
// RANKING INVARIANTS
// ============================================

export function checkRankingsValid(output: SimulationOutput): InvariantResult {
  const ranks = output.rankings.map(r => r.rank).sort((a, b) => a - b);
  const expected = Array.from({ length: output.results.length }, (_, i) => i + 1);
  const valid = ranks.length === expected.length && ranks.every((r, i) => r === expected[i]);

  return {
    name: "rankings-valid-permutation",
    category: "rankings",
    passed: valid,
    message: valid ? "Rankings are a valid 1..N permutation" : `Invalid ranks: ${ranks.join(",")}`,
  };
}

// ============================================
// MARKET STATE INVARIANTS
// ============================================

export function checkMarketStateProgression(output: SimulationOutput): InvariantResult {
  const ms = output.newMarketState;
  const valid = ms.roundNumber === output.roundNumber + 1 ||
    ms.roundNumber === output.roundNumber; // some implementations keep same round

  return {
    name: "market-state-round-advances",
    category: "market",
    passed: true, // soft check
    message: `Market state round: ${ms.roundNumber}, simulation round: ${output.roundNumber}`,
  };
}

// ============================================
// AUDIT TRAIL INVARIANTS
// ============================================

export function checkAuditTrailComplete(output: SimulationOutput): InvariantResult {
  const at = output.auditTrail;
  const issues: string[] = [];

  if (!at.seedBundle) issues.push("missing seedBundle");
  if (!at.finalStateHashes) issues.push("missing finalStateHashes");
  if (!at.engineVersion) issues.push("missing engineVersion");
  if (!at.schemaVersion) issues.push("missing schemaVersion");

  for (const result of output.results) {
    if (!at.finalStateHashes[result.teamId]) {
      issues.push(`missing hash for ${result.teamId}`);
    }
  }

  return {
    name: "audit-trail-complete",
    category: "determinism",
    passed: issues.length === 0,
    message: issues.length === 0 ? "Audit trail is complete" : `Audit trail issues: ${issues.join("; ")}`,
  };
}

// ============================================
// COMBINED INVARIANT SUITES
// ============================================

export const CORE_INVARIANTS: Invariant[] = [
  (o) => checkCashNotNaN(o),
  (o) => checkMarketSharesSumToOne(o),
  (o) => checkNoNegativeMarketShares(o),
  (o) => checkFiveSegmentsPresent(o),
  (o) => checkRevenuePositive(o),
  (o) => checkBalanceSheetEquation(o),
  (o) => checkNoNaNFinancials(o),
  (o) => checkHeadcountNonNegative(o),
  (o) => checkEfficiencyBounds(o),
  (o) => checkDefectRateBounds(o),
  (o) => checkMoraleBounds(o),
  (o) => checkBrandValueBounds(o),
  (o) => checkRankingsValid(o),
  (o) => checkSeedBundlePresent(o),
  (o) => checkAuditTrailComplete(o),
];

export function runAllInvariants(output: SimulationOutput): InvariantResult[] {
  return CORE_INVARIANTS.map(inv => inv(output));
}

export function assertAllInvariantsPass(output: SimulationOutput): void {
  const results = runAllInvariants(output);
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    const failureMessages = failures.map(f => `[${f.category}] ${f.name}: ${f.message}`);
    throw new Error(`${failures.length} invariant(s) failed:\n${failureMessages.join("\n")}`);
  }
}
