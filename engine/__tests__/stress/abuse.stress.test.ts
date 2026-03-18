/**
 * Security / Abuse Cases — Stress Test Suite
 *
 * Tests the engine with adversarial inputs: NaN, Infinity,
 * negative values, extremely large numbers, long strings,
 * and malformed decisions.
 *
 * The engine should either gracefully reject or safely handle
 * all adversarial inputs without crashing or producing NaN.
 *
 * KNOWN DEFECTS:
 * - ABUSE-001 [S0]: NaN in rdBudget causes engine to hang (infinite loop)
 * - ABUSE-002 [S0]: Infinity in advertisingBudget causes engine to hang
 * - ABUSE-003 [S1]: Number.MAX_SAFE_INTEGER as budget causes engine to hang
 *
 * These tests are skipped to prevent CI hangs. They document real bugs
 * that should be fixed with input validation.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput } from "@/engine/core/SimulationEngine";
import {
  createTeamState,
  createMarketState,
  createDecisions,
  runSimulation,
  assertNoNaN,
  assertNoOverflow,
} from "@/engine/testkit";

// ============================================
// HELPERS
// ============================================

function runAbuse(decisions: any, seed: string = "abuse") {
  const state = createTeamState("baseline-balanced");
  const input: SimulationInput = {
    roundNumber: 1,
    teams: [{ id: "abuse-team", state, decisions }],
    marketState: createMarketState(),
    matchSeed: seed,
  };

  return SimulationEngine.processRound(input);
}

// ============================================
// ABUSE CASES — SAFE (do not hang)
// ============================================

describe("Abuse Stress — Adversarial Inputs (Safe)", () => {
  it("negative budget values — engine handles gracefully", () => {
    const output = runAbuse({
      rd: { rdBudget: -10_000_000 },
      marketing: { advertisingBudget: { Budget: -5_000_000 }, brandingInvestment: -1_000_000 },
      finance: { treasuryBillsIssue: -20_000_000 },
      factory: {},
      hr: {},
    }, "abuse-negative");

    expect(output.results.length).toBe(1);
    expect(output.results[0].newState).toBeDefined();
  });

  it("empty string team ID — engine processes", () => {
    const state = createTeamState("baseline-balanced");
    const input: SimulationInput = {
      roundNumber: 1,
      teams: [{ id: "", state, decisions: createDecisions("passive", state) }],
      marketState: createMarketState(),
      matchSeed: "abuse-empty-id",
    };

    const output = SimulationEngine.processRound(input);
    expect(output.results.length).toBe(1);
  });

  it("productionAllocations summing to >100% — no crash", () => {
    const result = runSimulation({
      teamCount: 2,
      rounds: 1,
      seed: "abuse-alloc-over",
      profile: "baseline-balanced",
      teamOverrides: [
        { productionAllocations: { Budget: 60, General: 60, Enthusiast: 60 } },
        {},
      ],
    });

    for (const s of result.finalStates) {
      assertNoNaN(s);
    }
  });

  it("many hire requests in one round — no crash", () => {
    const hires = Array.from({ length: 20 }, (_, i) => ({
      factoryId: "factory-1",
      role: "worker" as const,
      candidateId: `candidate-${i}`,
    }));

    const output = runAbuse({
      hr: { hires },
      factory: {},
      marketing: {},
      rd: {},
      finance: {},
    }, "abuse-mass-hire");

    expect(output.results.length).toBe(1);
  });

  it("negative dividendPerShare — engine handles", () => {
    const output = runAbuse({
      finance: { dividendPerShare: -5 },
      factory: {},
      hr: {},
      marketing: {},
      rd: {},
    }, "abuse-neg-div");

    expect(output.results.length).toBe(1);
  });

  it("negative sharesBuyback — engine handles", () => {
    const output = runAbuse({
      finance: { sharesBuyback: -1_000_000 },
      factory: {},
      hr: {},
      marketing: {},
      rd: {},
    }, "abuse-neg-buyback");

    expect(output.results.length).toBe(1);
  });

  it("several new factories in one round — no crash", () => {
    const newFactories = Array.from({ length: 5 }, (_, i) => ({
      name: `Factory-${i}`,
      region: "North America" as const,
    }));

    const output = runAbuse({
      factory: { newFactories },
      hr: {},
      marketing: {},
      rd: {},
      finance: {},
    }, "abuse-many-factories");

    expect(output.results.length).toBe(1);
  });

  it("product with quality -1 and price 0 — no crash", () => {
    const output = runAbuse({
      rd: {
        newProducts: [{
          name: "Bad Product",
          segment: "Budget" as const,
          targetQuality: -1,
          targetFeatures: -1,
        }],
      },
      factory: {},
      hr: {},
      marketing: {},
      finance: {},
    }, "abuse-bad-product");

    expect(output.results.length).toBe(1);
  });

  it("all fields set to undefined — graceful handling", () => {
    const output = runAbuse({
      factory: undefined,
      hr: undefined,
      marketing: undefined,
      rd: undefined,
      finance: undefined,
    }, "abuse-undefined");

    expect(output.results.length).toBe(1);
  });

  it("completely empty object as decisions — no crash", () => {
    const output = runAbuse({}, "abuse-empty");
    expect(output.results.length).toBe(1);
  });
});

// ============================================
// ABUSE CASES — KNOWN HANGS (skipped)
// ============================================

describe("Abuse Stress — Input Sanitization (Previously Engine Hangs)", () => {
  it("ABUSE-001 [FIXED]: NaN in rdBudget — sanitized to 0, no hang", () => {
    // FIXED: Input sanitization at Step 0.1 replaces NaN with 0
    const output = runAbuse({
      rd: { rdBudget: NaN },
      factory: {},
      hr: {},
      marketing: {},
      finance: {},
    }, "abuse-nan-rd");

    expect(output.results.length).toBe(1);
    // Cash should be finite (no NaN propagation)
    expect(Number.isFinite(output.results[0].newState.cash)).toBe(true);
  });

  it("ABUSE-002 [FIXED]: Infinity in advertisingBudget — clamped, no hang", () => {
    // FIXED: Input sanitization at Step 0.1 clamps Infinity to $1B cap
    const output = runAbuse({
      marketing: { advertisingBudget: { Budget: Infinity } },
      factory: {},
      hr: {},
      rd: {},
      finance: {},
    }, "abuse-inf-ad");

    expect(output.results.length).toBe(1);
    expect(Number.isFinite(output.results[0].newState.cash)).toBe(true);
  });

  it("ABUSE-003 [FIXED]: Number.MAX_SAFE_INTEGER as budget — clamped to $1B, no hang", () => {
    // FIXED: Input sanitization at Step 0.1 clamps to MAX_BUDGET ($1B)
    const output = runAbuse({
      rd: { rdBudget: Number.MAX_SAFE_INTEGER },
      factory: {},
      hr: {},
      marketing: {},
      finance: {},
    }, "abuse-maxint");

    expect(output.results.length).toBe(1);
    expect(Number.isFinite(output.results[0].newState.cash)).toBe(true);
  });
});
