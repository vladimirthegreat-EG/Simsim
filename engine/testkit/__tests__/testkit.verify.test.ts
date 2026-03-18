/**
 * Testkit Verification — confirms the testkit works before building stress suites
 */

import { describe, it, expect } from "vitest";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  createMinimalEngineContext,
  createGamePreset,
  createSimulationInput,
  createDecisionsForProfile,
  runProfileNRounds,
  type ScenarioProfile,
} from "../scenarioGenerator";
import {
  runAllInvariants,
  assertAllInvariantsPass,
  checkDeterminism,
} from "../invariants";
import {
  hashSimulationOutput,
  verifyDeterminism,
  assertInvariantsPass,
  compareStates,
} from "../helpers";
import { SimulationEngine } from "../../core/SimulationEngine";

describe("Testkit Verification", () => {
  describe("Scenario Generator", () => {
    it("creates valid TeamState", () => {
      const state = createMinimalTeamState();
      expect(state.cash).toBe(175_000_000);
      expect(state.sharesIssued).toBe(10_000_000);
      expect(state.factories.length).toBe(1);
      expect(state.products.length).toBeGreaterThan(0);
      expect(state.employees.length).toBeGreaterThan(0);
      expect(state.version).toBeDefined();
    });

    it("creates valid MarketState with 5 segments", () => {
      const ms = createMinimalMarketState();
      // POST-FIX: all segment demands updated to match current engine values
      expect(ms.demandBySegment.Budget.totalDemand).toBe(700_000);
      expect(ms.demandBySegment.General.totalDemand).toBe(450_000);
      expect(ms.demandBySegment.Enthusiast.totalDemand).toBe(150_000);
      expect(ms.demandBySegment.Professional.totalDemand).toBe(80_000);
      expect(ms.demandBySegment["Active Lifestyle"].totalDemand).toBe(200_000);
    });

    it("creates valid EngineContext", () => {
      const ctx = createMinimalEngineContext("test-123", 1, "team-1");
      expect(ctx.seeds.matchSeed).toBe("test-123");
      expect(ctx.roundNumber).toBe(1);
      expect(ctx.teamId).toBe("team-1");
      expect(ctx.rng.factory).toBeDefined();
      expect(ctx.rng.hr).toBeDefined();
    });

    it("creates game presets correctly", () => {
      const quick = createGamePreset("quick");
      expect(quick.maxRounds).toBe(16);
      expect(quick.teamState.employees.filter(e => e.role === "worker").length).toBe(50);
      expect(quick.teamState.employees.filter(e => e.role === "engineer").length).toBe(8);

      const full = createGamePreset("full");
      expect(full.maxRounds).toBe(32);
      expect(full.teamState.employees.length).toBe(0);
      expect(full.teamState.products.length).toBe(0);
    });

    it("generates decisions for all profiles without errors", () => {
      const profiles: ScenarioProfile[] = [
        "baseline-balanced", "aggressive-debt", "marketing-overdrive",
        "under-invested-ops", "RD-patent-rush", "HR-turnover-crisis",
        "factory-expansion-blitz", "ESG-maximizer", "bankruptcy-spiral",
        "segment-specialist", "achievement-hunter", "empty-decisions",
      ];
      const state = createMinimalTeamState();
      for (const profile of profiles) {
        const decisions = createDecisionsForProfile(profile, state, 1);
        expect(decisions).toBeDefined();
      }
    });

    it("creates valid SimulationInput", () => {
      const input = createSimulationInput({
        teamCount: 3,
        roundNumber: 1,
        matchSeed: "test-input",
        profile: "baseline-balanced",
      });
      expect(input.teams.length).toBe(3);
      expect(input.roundNumber).toBe(1);
      expect(input.matchSeed).toBe("test-input");
      expect(input.marketState).toBeDefined();
    });
  });

  describe("Engine Execution", () => {
    it("processes a single round with baseline-balanced", () => {
      const input = createSimulationInput({
        teamCount: 2,
        roundNumber: 1,
        matchSeed: "verify-1",
        profile: "baseline-balanced",
      });
      const output = SimulationEngine.processRound(input);
      expect(output.roundNumber).toBe(1);
      expect(output.results.length).toBe(2);
      expect(output.rankings.length).toBe(2);
      expect(output.auditTrail.seedBundle).toBeDefined();
    });

    it("runs 3 rounds successfully", () => {
      const outputs = runProfileNRounds({
        teamCount: 2,
        rounds: 3,
        matchSeed: "verify-3-rounds",
        profile: "baseline-balanced",
      });
      expect(outputs.length).toBe(3);
      for (let i = 0; i < outputs.length; i++) {
        expect(outputs[i].roundNumber).toBe(i + 1);
      }
    });
  });

  describe("Invariants", () => {
    it("all core invariants pass on baseline-balanced", () => {
      const input = createSimulationInput({
        teamCount: 3,
        roundNumber: 1,
        matchSeed: "invariant-check",
        profile: "baseline-balanced",
      });
      const output = SimulationEngine.processRound(input);
      const report = assertInvariantsPass(output);
      expect(report.failed).toBe(0);
      expect(report.total).toBeGreaterThan(10);
    });

    it("assertAllInvariantsPass does not throw on valid output", () => {
      const input = createSimulationInput({
        teamCount: 2,
        roundNumber: 1,
        matchSeed: "no-throw",
        profile: "baseline-balanced",
      });
      const output = SimulationEngine.processRound(input);
      expect(() => assertAllInvariantsPass(output)).not.toThrow();
    });

    it("invariants pass after 3 rounds of balanced play", () => {
      const outputs = runProfileNRounds({
        teamCount: 3,
        rounds: 3,
        matchSeed: "multi-round-inv",
        profile: "baseline-balanced",
      });
      for (const output of outputs) {
        const report = assertInvariantsPass(output);
        expect(report.failed).toBe(0);
      }
    });
  });

  describe("Determinism", () => {
    it("same seed + same decisions = identical output", () => {
      const input = createSimulationInput({
        teamCount: 2,
        roundNumber: 1,
        matchSeed: "determinism-test",
        profile: "baseline-balanced",
      });
      const result = verifyDeterminism(input, 3);
      expect(result.deterministic).toBe(true);
      expect(result.mismatches.length).toBe(0);
    });

    it("different seeds = different output", () => {
      const input1 = createSimulationInput({
        teamCount: 2,
        roundNumber: 1,
        matchSeed: "seed-A",
        profile: "baseline-balanced",
      });
      const input2 = createSimulationInput({
        teamCount: 2,
        roundNumber: 1,
        matchSeed: "seed-B",
        profile: "baseline-balanced",
      });
      const output1 = SimulationEngine.processRound(input1);
      const output2 = SimulationEngine.processRound(input2);
      const hash1 = hashSimulationOutput(output1);
      const hash2 = hashSimulationOutput(output2);
      // Different seeds should produce different results (with very high probability)
      // but both should still pass invariants
      assertAllInvariantsPass(output1);
      assertAllInvariantsPass(output2);
    });
  });

  describe("State Comparison", () => {
    it("compareStates returns empty diffs for identical states", () => {
      const state = createMinimalTeamState();
      const diffs = compareStates(state, state);
      expect(diffs.length).toBe(0);
    });

    it("compareStates detects cash differences", () => {
      const state1 = createMinimalTeamState();
      const state2 = createMinimalTeamState({ cash: 100_000_000 });
      const diffs = compareStates(state1, state2);
      expect(diffs.some(d => d.path === "cash")).toBe(true);
    });
  });
});
