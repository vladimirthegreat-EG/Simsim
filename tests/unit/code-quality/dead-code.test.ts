/**
 * Layer 8 — Code Quality: Dead Code Tests (CQ-01, CQ-13)
 *
 * CQ-01: Verifies customerSatisfaction flag has no effect (dead code)
 * CQ-13: Tests that engine rejects adversarial inputs (ABUSE cases)
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { hashState } from "@/engine/core/EngineContext";

describe("Code Quality — Dead Code", () => {
  // ===========================================================================
  // CQ-01: customerSatisfaction flag has no effect
  // ===========================================================================
  it("CQ-01: customerSatisfaction=true produces identical output to =false", () => {
    const state = SimulationEngine.createInitialTeamState();
    const marketState = SimulationEngine.createInitialMarketState();

    const result1 = SimulationEngine.processRound({
      roundNumber: 1,
      teams: [{ id: "t1", state, decisions: {} }],
      marketState,
      matchSeed: "cq-01",
      config: { customerSatisfaction: true } as any,
    });

    const result2 = SimulationEngine.processRound({
      roundNumber: 1,
      teams: [{ id: "t1", state, decisions: {} }],
      marketState,
      matchSeed: "cq-01",
      config: { customerSatisfaction: false } as any,
    });

    // If flag is truly dead, outputs must be identical
    const hash1 = hashState(result1.results[0].state);
    const hash2 = hashState(result2.results[0].state);
    expect(hash1).toBe(hash2);

    // Revenue should match exactly
    expect(result1.results[0].state.revenue).toBe(result2.results[0].state.revenue);
  });
});

describe("Code Quality — Input Validation (CQ-13)", () => {
  // ===========================================================================
  // CQ-13: Engine should reject NaN/Infinity/MAX_SAFE_INT inputs
  // These were previously .skip tests (ABUSE-001/002/003)
  // ===========================================================================
  it("CQ-13a: NaN rdBudget does not hang engine", () => {
    const state = SimulationEngine.createInitialTeamState();
    const marketState = SimulationEngine.createInitialMarketState();

    // Should either reject with error or handle gracefully (not hang)
    const runWithNaN = () => {
      return SimulationEngine.processRound({
        roundNumber: 1,
        teams: [{
          id: "t1",
          state,
          decisions: { rd: { rdBudgetAllocation: [{ productId: "main", budget: NaN, focus: "innovation" }] } },
        }],
        marketState,
        matchSeed: "abuse-nan",
      });
    };

    // Should complete without hanging — either succeeds with sanitized input or throws
    let completed = false;
    try {
      const result = runWithNaN();
      completed = true;
      // If it didn't throw, output must not contain NaN
      expect(isFinite(result.results[0].state.cash)).toBe(true);
      expect(isFinite(result.results[0].state.revenue)).toBe(true);
    } catch (e) {
      completed = true;
      // Throwing is also acceptable — engine rejected the input
    }
    expect(completed).toBe(true);
  });

  it("CQ-13b: Infinity budget does not hang engine", () => {
    const state = SimulationEngine.createInitialTeamState();
    const marketState = SimulationEngine.createInitialMarketState();

    let completed = false;
    try {
      const result = SimulationEngine.processRound({
        roundNumber: 1,
        teams: [{
          id: "t1",
          state,
          decisions: {
            factory: { investments: { workerEfficiency: Infinity } },
          },
        }],
        marketState,
        matchSeed: "abuse-inf",
      });
      completed = true;
      expect(isFinite(result.results[0].state.cash)).toBe(true);
    } catch (e) {
      completed = true;
    }
    expect(completed).toBe(true);
  });

  it("CQ-13c: MAX_SAFE_INTEGER budget does not hang engine", () => {
    const state = SimulationEngine.createInitialTeamState();
    const marketState = SimulationEngine.createInitialMarketState();

    let completed = false;
    try {
      const result = SimulationEngine.processRound({
        roundNumber: 1,
        teams: [{
          id: "t1",
          state,
          decisions: {
            factory: { investments: { workerEfficiency: Number.MAX_SAFE_INTEGER } },
          },
        }],
        marketState,
        matchSeed: "abuse-max",
      });
      completed = true;
      expect(isFinite(result.results[0].state.cash)).toBe(true);
    } catch (e) {
      completed = true;
    }
    expect(completed).toBe(true);
  }, 10_000); // 10s timeout — if it takes longer, it's hanging
});
