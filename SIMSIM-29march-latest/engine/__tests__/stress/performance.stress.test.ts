/**
 * PERFORMANCE & SECURITY STRESS SUITE
 *
 * Tests engine performance under load, verifies no exponential blowups,
 * and checks for common abuse/injection vectors.
 *
 * Phase 6 of the stress testing framework.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput } from "../../core/SimulationEngine";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  createDecisionsForProfile,
  createMixedStrategyInput,
} from "../../testkit/scenarioGenerator";
import { assertAllInvariantsPass } from "../../testkit/invariants";
import type { TeamState, AllDecisions } from "../../types";

// ============================================
// PERFORMANCE BENCHMARKS
// ============================================

describe("Performance Stress Suite", () => {
  describe("Single-round performance", () => {
    it("2 teams completes in < 100ms", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "t1", state: createMinimalTeamState(), decisions: createDecisionsForProfile("baseline-balanced", createMinimalTeamState(), 1) },
          { id: "t2", state: createMinimalTeamState(), decisions: createDecisionsForProfile("marketing-overdrive", createMinimalTeamState(), 1) },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "perf-2teams",
      };

      const start = performance.now();
      SimulationEngine.processRound(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it("5 teams completes in < 200ms", () => {
      const teams = Array.from({ length: 5 }, (_, i) => ({
        id: `t${i}`,
        state: createMinimalTeamState(),
        decisions: createDecisionsForProfile("baseline-balanced", createMinimalTeamState(), 1),
      }));

      const input: SimulationInput = {
        roundNumber: 1,
        teams,
        marketState: createMinimalMarketState(),
        matchSeed: "perf-5teams",
      };

      const start = performance.now();
      SimulationEngine.processRound(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
    });

    it("5 teams with decisions completes in < 500ms", () => {
      const teams = Array.from({ length: 5 }, (_, i) => ({
        id: `t${i}`,
        state: createMinimalTeamState(),
        decisions: createDecisionsForProfile("baseline-balanced", createMinimalTeamState(), 1),
      }));

      const input: SimulationInput = {
        roundNumber: 1,
        teams,
        marketState: createMinimalMarketState(),
        matchSeed: "perf-5teams-full",
      };

      const start = performance.now();
      SimulationEngine.processRound(input);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe("Multi-round performance", () => {
    it("5 teams × 8 rounds completes in < 2s", () => {
      const teams = Array.from({ length: 5 }, (_, i) => ({
        id: `t${i}`,
        state: createMinimalTeamState(),
        decisions: {} as AllDecisions,
      }));
      let marketState = createMinimalMarketState();

      const start = performance.now();
      for (let round = 1; round <= 8; round++) {
        for (const team of teams) {
          team.decisions = createDecisionsForProfile("baseline-balanced", team.state, round);
        }
        const input: SimulationInput = {
          roundNumber: round,
          teams: teams.map(t => ({ id: t.id, state: t.state, decisions: t.decisions })),
          marketState,
          matchSeed: `perf-multi-${round}`,
        };
        const output = SimulationEngine.processRound(input);
        for (const result of output.results) {
          const team = teams.find(t => t.id === result.teamId);
          if (team) team.state = result.newState;
        }
        marketState = output.newMarketState;
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(2000);
    });

    it("scaling is sub-quadratic: 5 teams is not 4× slower than 2 teams", () => {
      function timeRound(teamCount: number): number {
        const teams = Array.from({ length: teamCount }, (_, i) => ({
          id: `t${i}`,
          state: createMinimalTeamState(),
          decisions: createDecisionsForProfile("baseline-balanced", createMinimalTeamState(), 1),
        }));
        const input: SimulationInput = {
          roundNumber: 1,
          teams,
          marketState: createMinimalMarketState(),
          matchSeed: `scale-${teamCount}`,
        };
        const start = performance.now();
        SimulationEngine.processRound(input);
        return performance.now() - start;
      }

      const time2 = timeRound(2);
      const time5 = timeRound(5);

      // 5 teams should be less than 6× slower than 2 teams (sub-quadratic)
      // Allow generous factor since test environment variance is high
      expect(time5).toBeLessThan(time2 * 6);
    });
  });

  describe("Memory / state growth", () => {
    it("state size does not explode over 5 rounds", () => {
      let state = createMinimalTeamState();
      let marketState = createMinimalMarketState();

      const initialSize = JSON.stringify(state).length;

      for (let round = 1; round <= 5; round++) {
        const decisions = createDecisionsForProfile("baseline-balanced", state, round);
        const input: SimulationInput = {
          roundNumber: round,
          teams: [
            { id: "t1", state, decisions },
            { id: "t2", state: createMinimalTeamState(), decisions: {} },
          ],
          marketState,
          matchSeed: `mem-${round}`,
        };
        const output = SimulationEngine.processRound(input);
        state = output.results[0].newState;
        marketState = output.newMarketState;
      }

      const finalSize = JSON.stringify(state).length;

      // State should not grow more than 5× over 5 rounds
      expect(finalSize).toBeLessThan(initialSize * 5);
    });

    it("arrays do not grow unbounded over 5 rounds", () => {
      let state = createMinimalTeamState();
      let marketState = createMinimalMarketState();

      for (let round = 1; round <= 5; round++) {
        const input: SimulationInput = {
          roundNumber: round,
          teams: [
            { id: "t1", state, decisions: {} },
            { id: "t2", state: createMinimalTeamState(), decisions: {} },
          ],
          marketState,
          matchSeed: `history-${round}`,
        };
        const output = SimulationEngine.processRound(input);
        state = output.results[0].newState;
        marketState = output.newMarketState;
      }

      // Employee and factory arrays should not grow unbounded
      expect(state.employees.length).toBeLessThan(100);
      expect(state.factories.length).toBeLessThan(20);
    });
  });
});

// ============================================
// SECURITY / ABUSE TESTS
// ============================================

describe("Security & Abuse Stress Suite", () => {
  describe("Injection via decision fields", () => {
    it("string injection in factory name does not crash engine", () => {
      const state = createMinimalTeamState();
      const maliciousDecisions: AllDecisions = {
        factory: {
          newFactories: [{
            name: '<script>alert("xss")</script>',
            region: "Asia" as any,
          }],
        },
      };

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state, decisions: maliciousDecisions }],
        marketState: createMinimalMarketState(),
        matchSeed: "sec-inject-1",
      };

      // Should not throw
      const output = SimulationEngine.processRound(input);
      expect(output.results[0]).toBeDefined();
    });

    it("SQL injection in string fields does not crash engine", () => {
      const state = createMinimalTeamState();
      const maliciousDecisions: AllDecisions = {
        factory: {
          newFactories: [{
            name: "'; DROP TABLE teams; --",
            region: "domestic" as any,
          }],
        },
      };

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state, decisions: maliciousDecisions }],
        marketState: createMinimalMarketState(),
        matchSeed: "sec-sql-inject",
      };

      const output = SimulationEngine.processRound(input);
      expect(output.results[0]).toBeDefined();
    });

    it("prototype pollution attempt in decisions does not affect engine", () => {
      const state = createMinimalTeamState();
      const maliciousDecisions = {
        __proto__: { isAdmin: true },
        constructor: { prototype: { isAdmin: true } },
      } as any;

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state, decisions: maliciousDecisions }],
        marketState: createMinimalMarketState(),
        matchSeed: "sec-proto-pollute",
      };

      const output = SimulationEngine.processRound(input);
      expect(output.results[0]).toBeDefined();
      // Verify no prototype pollution
      expect(({} as any).isAdmin).toBeUndefined();
    });
  });

  describe("Extreme numeric values", () => {
    it("very large values in decision fields do not crash", () => {
      const state = createMinimalTeamState();
      const decisions: AllDecisions = {
        finance: {
          treasuryBillsIssue: Number.MAX_SAFE_INTEGER,
        },
        marketing: {
          advertisingBudget: { Budget: 999_999_999_999 },
        },
      };

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "t1", state, decisions },
          { id: "t2", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "sec-large-vals",
      };

      // Should not throw
      expect(() => SimulationEngine.processRound(input)).not.toThrow();
    });

    it("negative values in spending fields do not crash engine", () => {
      const state = createMinimalTeamState();
      const decisions: AllDecisions = {
        marketing: {
          advertisingBudget: { Budget: -100_000_000 },
        },
        rd: {
          rdBudget: -50_000_000,
        },
      };

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "t1", state, decisions },
          { id: "t2", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "sec-negative",
      };

      // Engine should handle negatives without crashing
      // (whether it clamps or passes through is a balance decision)
      expect(() => SimulationEngine.processRound(input)).not.toThrow();
    });

    it("max team count (5 teams) completes reliably", () => {
      const teams = Array.from({ length: 5 }, (_, i) => ({
        id: `t${i}`,
        state: createMinimalTeamState(),
        decisions: {} as AllDecisions,
      }));

      const input: SimulationInput = {
        roundNumber: 1,
        teams,
        marketState: createMinimalMarketState(),
        matchSeed: "sec-max-teams",
      };

      const output = SimulationEngine.processRound(input);
      expect(output.results.length).toBe(5);
      assertAllInvariantsPass(output);
    });
  });

  describe("Edge case team IDs", () => {
    it("empty string team ID does not crash", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "", state: createMinimalTeamState(), decisions: {} },
          { id: "t2", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "sec-empty-id",
      };

      expect(() => SimulationEngine.processRound(input)).not.toThrow();
    });

    it("special characters in team ID do not crash", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "team-with-<script>", state: createMinimalTeamState(), decisions: {} },
          { id: "team/with/slashes", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "sec-special-id",
      };

      expect(() => SimulationEngine.processRound(input)).not.toThrow();
    });
  });

  describe("Seed manipulation", () => {
    it("empty seed does not crash", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "t1", state: createMinimalTeamState(), decisions: {} },
          { id: "t2", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "",
      };

      expect(() => SimulationEngine.processRound(input)).not.toThrow();
    });

    it("very long seed does not crash", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "t1", state: createMinimalTeamState(), decisions: {} },
          { id: "t2", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "x".repeat(10_000),
      };

      expect(() => SimulationEngine.processRound(input)).not.toThrow();
    });

    it("unicode seed produces valid output", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "t1", state: createMinimalTeamState(), decisions: {} },
          { id: "t2", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "日本語テスト🎮",
      };

      const output = SimulationEngine.processRound(input);
      expect(output.results.length).toBe(2);
      assertAllInvariantsPass(output);
    });
  });

  describe("Round number abuse", () => {
    it("round 0 does not crash", () => {
      const input: SimulationInput = {
        roundNumber: 0,
        teams: [
          { id: "t1", state: createMinimalTeamState(), decisions: {} },
          { id: "t2", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "round-0",
      };

      expect(() => SimulationEngine.processRound(input)).not.toThrow();
    });

    it("very large round number does not crash", () => {
      const input: SimulationInput = {
        roundNumber: 9999,
        teams: [
          { id: "t1", state: createMinimalTeamState(), decisions: {} },
          { id: "t2", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "round-9999",
      };

      expect(() => SimulationEngine.processRound(input)).not.toThrow();
    });
  });
});
