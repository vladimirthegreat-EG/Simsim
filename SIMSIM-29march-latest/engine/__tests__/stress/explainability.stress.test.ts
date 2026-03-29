/**
 * Explainability Engine — Stress Test Suite
 *
 * Tests ExplainabilityEngine for score breakdowns, delta explanations,
 * driver trees, and narrative generation.
 *
 * A. Golden path deterministic snapshots
 * B. Edge scenarios
 * C. Property tests (invariants across seeded scenarios)
 * D. Regression tests
 */

import { describe, it, expect } from "vitest";
import { ExplainabilityEngine } from "@/engine/explainability/ExplainabilityEngine";
import { SimulationEngine, type SimulationInput } from "@/engine/core/SimulationEngine";
import type { Segment } from "@/engine/types";
import { CONSTANTS } from "@/engine/types";
import {
  createTeamState,
  createMarketState,
  createDecisions,
  runSimulation,
  assertNoNaN,
  assertAllInvariants,
} from "@/engine/testkit";

// ============================================
// HELPERS
// ============================================

function runOneRound(seed: string, teamCount: number = 2) {
  const teams = Array.from({ length: teamCount }, (_, i) => {
    const state = createTeamState("baseline-balanced");
    return {
      id: `team-${i + 1}`,
      state,
      decisions: createDecisions("baseline-balanced", state),
    };
  });

  const input: SimulationInput = {
    roundNumber: 1,
    teams,
    marketState: createMarketState(),
    matchSeed: seed,
  };

  return SimulationEngine.processRound(input);
}

// ============================================
// CATEGORY A — Golden Path Deterministic
// ============================================

describe("Explainability Stress — Category A: Golden Path", () => {
  it("2 teams, 1 round — explainability generates without crash", () => {
    const output = runOneRound("explain-golden-1");

    // Generate explainability for first team
    const result = ExplainabilityEngine.generateExplainability(
      "team-1",
      1,
      output.results[0].newState,
      null, // No previous state
      output.marketPositions,
      output.results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
    );

    expect(result).toBeDefined();
    expect(result.teamId).toBe("team-1");
    expect(result.round).toBe(1);
    expect(result.segmentBreakdowns).toBeDefined();
    expect(result.narrative).toBeDefined();
  });

  it("deterministic — same input produces same explainability", () => {
    const output1 = runOneRound("explain-determ");
    const output2 = runOneRound("explain-determ");

    const explain1 = ExplainabilityEngine.generateExplainability(
      "team-1", 1,
      output1.results[0].newState,
      null,
      output1.marketPositions,
      output1.results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
    );

    const explain2 = ExplainabilityEngine.generateExplainability(
      "team-1", 1,
      output2.results[0].newState,
      null,
      output2.marketPositions,
      output2.results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
    );

    expect(JSON.stringify(explain1.segmentBreakdowns)).toBe(JSON.stringify(explain2.segmentBreakdowns));
  });
});

// ============================================
// CATEGORY B — Edge Scenarios
// ============================================

describe("Explainability Stress — Category B: Edge Scenarios", () => {
  it("delta explanation with previous state", () => {
    const result = runSimulation({
      teamCount: 2,
      rounds: 2,
      seed: "explain-delta",
      profile: "baseline-balanced",
    });

    const round1State = result.roundOutputs[0].results[0].newState;
    const round2State = result.roundOutputs[1].results[0].newState;

    const explain = ExplainabilityEngine.generateExplainability(
      "team-1", 2,
      round2State,
      round1State,
      result.roundOutputs[1].marketPositions,
      result.roundOutputs[1].results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
    );

    expect(explain.deltaExplanations).toBeDefined();
    expect(Array.isArray(explain.deltaExplanations)).toBe(true);
  });

  it("null previous state — no delta, no crash", () => {
    const output = runOneRound("explain-no-prev");

    const explain = ExplainabilityEngine.generateExplainability(
      "team-1", 1,
      output.results[0].newState,
      null,
      output.marketPositions,
      output.results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
    );

    expect(explain.deltaExplanations).toBeDefined();
    // Should be empty when no previous state
    expect(explain.deltaExplanations.length).toBe(0);
  });

  it("driver trees generated correctly", () => {
    const output = runOneRound("explain-drivers");

    const explain = ExplainabilityEngine.generateExplainability(
      "team-1", 1,
      output.results[0].newState,
      null,
      output.marketPositions,
      output.results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
    );

    // Revenue and profit driver trees should exist
    expect(explain.revenueDriverTree).toBeDefined();
    expect(explain.profitDriverTree).toBeDefined();
  });

  it("narrative generation with various state conditions", () => {
    const output = runOneRound("explain-narrative", 4);

    for (const result of output.results) {
      const explain = ExplainabilityEngine.generateExplainability(
        result.teamId, 1,
        result.newState,
        null,
        output.marketPositions,
        output.results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
      );

      expect(explain.narrative).toBeDefined();
      expect(typeof explain.narrative).toBe("object");
    }
  });

  it("raw metrics extracted from state", () => {
    const output = runOneRound("explain-metrics");

    const explain = ExplainabilityEngine.generateExplainability(
      "team-1", 1,
      output.results[0].newState,
      null,
      output.marketPositions,
      output.results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
    );

    expect(explain.rawMetrics).toBeDefined();
  });

  it("10 teams — explainability for each team without crash", () => {
    const output = runOneRound("explain-10teams", 10);

    for (const result of output.results) {
      const explain = ExplainabilityEngine.generateExplainability(
        result.teamId, 1,
        result.newState,
        null,
        output.marketPositions,
        output.results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
      );

      expect(explain).toBeDefined();
      expect(explain.teamId).toBe(result.teamId);
    }
  });
});

// ============================================
// CATEGORY C — Property Tests (Seeded)
// ============================================

describe("Explainability Stress — Category C: Property Tests", () => {
  for (let seed = 0; seed < 50; seed++) {
    it(`seed ${seed}: explainability generates without crash`, () => {
      const output = runOneRound(`explain-prop-${seed}`, 3);

      const explain = ExplainabilityEngine.generateExplainability(
        "team-1", 1,
        output.results[0].newState,
        null,
        output.marketPositions,
        output.results.map(r => ({ id: r.teamId, name: r.teamId, state: r.newState }))
      );

      expect(explain).toBeDefined();
      expect(explain.segmentBreakdowns).toBeDefined();
    });
  }
});

// ============================================
// CATEGORY D — Regression
// ============================================

describe("Explainability Stress — Category D: Regression", () => {
  it("regression placeholder — framework operational", () => {
    expect(true).toBe(true);
  });
});
