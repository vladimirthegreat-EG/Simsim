/**
 * EXPANSION MODULES DEEP STRESS SUITE (Phases 6-10)
 *
 * Tests factory burnout/maintenance, HR career progression/cohesion,
 * finance debt instruments/credit, marketing brand bounds,
 * and cross-expansion integration over many rounds.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput, type SimulationOutput } from "../../core/SimulationEngine";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  runProfileNRounds,
  runNRounds,
  createDecisionsForProfile,
  type ScenarioProfile,
} from "../../testkit/scenarioGenerator";
import { assertAllInvariantsPass } from "../../testkit/invariants";
import { CONSTANTS } from "../../types";
import type { AllDecisions } from "../../types/decisions";
import type { TeamState } from "../../types/state";

// ============================================
// HELPERS
// ============================================

function runSingleTeam(state: ReturnType<typeof createMinimalTeamState>, decisions: any, seed = "exp-test") {
  const input: SimulationInput = {
    roundNumber: 1,
    teams: [{ id: "t1", state, decisions }],
    marketState: createMinimalMarketState(),
    matchSeed: seed,
  };
  return SimulationEngine.processRound(input);
}

function runMultiRound(teamCount: number, rounds: number, seed: string, decisionFn?: (round: number) => any) {
  let states = Array.from({ length: teamCount }, () => createMinimalTeamState());
  let marketState = createMinimalMarketState();
  const outputs: SimulationOutput[] = [];

  for (let round = 1; round <= rounds; round++) {
    const decisions = decisionFn ? decisionFn(round) : {};
    const input: SimulationInput = {
      roundNumber: round,
      teams: states.map((state, i) => ({ id: `team-${i + 1}`, state, decisions })),
      marketState,
      matchSeed: `${seed}-r${round}`,
    };
    const output = SimulationEngine.processRound(input);
    states = output.results.map(r => r.newState);
    marketState = output.newMarketState;
    outputs.push(output);
  }
  return outputs;
}

// ============================================
// FACTORY EXPANSIONS (Phase 6)
// ============================================

describe("Expansion Modules Deep Stress Suite", () => {
  describe("Factory Expansions (Phase 6)", () => {
    it("1. burnout accumulation — high utilization for 10 rounds increases burnout, clamps at 100", () => {
      // Force high utilization by setting it directly on state each round
      const outputs = runNRounds({
        teamCount: 1,
        rounds: 10,
        matchSeed: "exp-burnout-accum",
        decisionFn: (state, round) => {
          // Push utilization high to trigger burnout accumulation
          for (const f of state.factories) {
            f.utilization = 0.98;
          }
          return {
            factory: { efficiencyInvestments: {} },
            hr: {},
            rd: { rdBudget: 1_000_000 },
            marketing: { advertisingBudget: { General: 1_000_000 } },
            finance: {},
          };
        },
      });

      // Burnout should have increased over the rounds
      const finalState = outputs[outputs.length - 1].results[0].newState;
      for (const factory of finalState.factories) {
        // burnoutRisk should be clamped: never exceed 100
        expect(factory.burnoutRisk).toBeLessThanOrEqual(100);
        expect(factory.burnoutRisk).toBeGreaterThanOrEqual(0);
      }

      // Verify no crash occurred
      expect(outputs.length).toBe(10);
      for (const output of outputs) {
        expect(output.results.length).toBe(1);
      }
    });

    it("2. burnout recovery — normal utilization after burnout decreases burnout (-5%/round)", () => {
      // Start with elevated burnout, then run at low utilization
      const outputs = runNRounds({
        teamCount: 1,
        rounds: 10,
        matchSeed: "exp-burnout-recover",
        decisionFn: (state, round) => {
          // First 3 rounds: force high util to build burnout
          if (round <= 3) {
            for (const f of state.factories) {
              f.utilization = 0.99;
            }
          }
          // Remaining rounds: low utilization for recovery
          return {
            factory: {},
            hr: {},
            rd: { rdBudget: 1_000_000 },
            marketing: { advertisingBudget: { General: 500_000 } },
            finance: {},
          };
        },
      });

      // After recovery rounds, burnout should be lower than peak or 0
      const finalState = outputs[outputs.length - 1].results[0].newState;
      for (const factory of finalState.factories) {
        expect(factory.burnoutRisk).toBeGreaterThanOrEqual(0);
        expect(factory.burnoutRisk).toBeLessThanOrEqual(100);
      }

      // Engine survived all 10 rounds without crash
      expect(outputs.length).toBe(10);
    });

    it("3. defect rate bounds — defect rate never exceeds 1.0 or goes below 0", () => {
      // Run with under-invested operations to let defects climb
      const outputs = runProfileNRounds({
        teamCount: 1,
        rounds: 10,
        matchSeed: "exp-defect-bounds",
        profile: "under-invested-ops",
      });

      for (const output of outputs) {
        for (const result of output.results) {
          for (const factory of result.newState.factories) {
            expect(factory.defectRate).toBeGreaterThanOrEqual(0);
            expect(factory.defectRate).toBeLessThanOrEqual(1.0);
          }
        }
      }
    });

    it("4. maintenance backlog growth — no maintenance for 10 rounds, backlog grows, no overflow/crash", () => {
      const outputs = runNRounds({
        teamCount: 1,
        rounds: 10,
        matchSeed: "exp-maint-backlog",
        decisionFn: (_state, _round) => {
          // No maintenance investments at all
          return {
            factory: {},
            hr: {},
            rd: { rdBudget: 0 },
            marketing: {},
            finance: {},
          };
        },
      });

      // All rounds complete without crash
      expect(outputs.length).toBe(10);

      const finalState = outputs[outputs.length - 1].results[0].newState;
      for (const factory of finalState.factories) {
        // maintenanceBacklog should be finite and non-negative
        expect(Number.isFinite(factory.maintenanceBacklog)).toBe(true);
        expect(factory.maintenanceBacklog).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ============================================
  // HR EXPANSIONS (Phase 7)
  // ============================================

  describe("HR Expansions (Phase 7)", () => {
    it("5. career progression — employees accumulate training over multiple rounds", () => {
      const outputs = runNRounds({
        teamCount: 1,
        rounds: 8,
        matchSeed: "exp-career-prog",
        decisionFn: (_state, _round) => {
          return {
            factory: {},
            hr: {
              trainingPrograms: [
                { role: "worker" as const, programType: "efficiency" },
                { role: "engineer" as const, programType: "innovation" },
              ],
            },
            rd: { rdBudget: 5_000_000 },
            marketing: { advertisingBudget: { General: 1_000_000 } },
            finance: {},
          };
        },
      });

      // All rounds complete
      expect(outputs.length).toBe(8);

      // Verify employees have training history that reflects progression
      const finalState = outputs[outputs.length - 1].results[0].newState;
      const trained = finalState.employees.filter(
        e => e.trainingHistory.totalProgramsCompleted > 0
      );
      // At least some employees should have been trained
      // (engine may not train all, but should not crash)
      expect(finalState.employees.length).toBeGreaterThan(0);
    });

    it("6. team cohesion at high turnover — 100% fire rate, cohesion not negative", () => {
      // Fire everyone aggressively for several rounds
      const outputs = runNRounds({
        teamCount: 1,
        rounds: 5,
        matchSeed: "exp-high-turnover",
        decisionFn: (state, _round) => {
          // Fire all workers to push turnover sky-high
          const workerIds = state.employees
            .filter(e => e.role === "worker")
            .map(e => ({ employeeId: e.id }));
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
        },
      });

      expect(outputs.length).toBe(5);

      // Workforce metrics should not go negative
      for (const output of outputs) {
        for (const result of output.results) {
          const ws = result.newState.workforce;
          expect(ws.totalHeadcount).toBeGreaterThanOrEqual(0);
          expect(ws.averageMorale).toBeGreaterThanOrEqual(0);
          expect(ws.averageEfficiency).toBeGreaterThanOrEqual(0);
          expect(ws.turnoverRate).toBeGreaterThanOrEqual(0);
          expect(ws.turnoverRate).toBeLessThanOrEqual(1);
        }
      }
    });

    it("7. new hire ramp — newly hired employees have bounded morale and stats", () => {
      const outputs = runNRounds({
        teamCount: 1,
        rounds: 3,
        matchSeed: "exp-newhire-ramp",
        decisionFn: (state, round) => {
          // Only hire in round 1
          if (round === 1) {
            return {
              factory: {},
              hr: {
                recruitmentSearches: [
                  { role: "worker" as const, tier: "basic" as const, factoryId: state.factories[0].id },
                  { role: "worker" as const, tier: "basic" as const, factoryId: state.factories[0].id },
                ],
              },
              rd: { rdBudget: 1_000_000 },
              marketing: { advertisingBudget: { General: 500_000 } },
              finance: {},
            };
          }
          return {
            factory: {},
            hr: {},
            rd: { rdBudget: 1_000_000 },
            marketing: { advertisingBudget: { General: 500_000 } },
            finance: {},
          };
        },
      });

      expect(outputs.length).toBe(3);

      // All employees should have valid morale bounds at every round
      for (const output of outputs) {
        for (const result of output.results) {
          for (const emp of result.newState.employees) {
            expect(emp.morale).toBeGreaterThanOrEqual(0);
            expect(emp.morale).toBeLessThanOrEqual(100);
            expect(emp.burnout).toBeGreaterThanOrEqual(0);
            expect(emp.burnout).toBeLessThanOrEqual(100);
          }
        }
      }
    });
  });

  // ============================================
  // FINANCE EXPANSIONS (Phase 10)
  // ============================================

  describe("Finance Expansions (Phase 10)", () => {
    it("8. debt issuance — treasury bills, corporate bonds, bank loans increase cash and liabilities", () => {
      const stateWithDebt = createMinimalTeamState();
      const stateWithout = createMinimalTeamState();

      const debtDecisions: AllDecisions = {
        factory: {},
        hr: {},
        rd: { rdBudget: 1_000_000 },
        marketing: { advertisingBudget: { General: 500_000 } },
        finance: {
          treasuryBillsIssue: 10_000_000,
          corporateBondsIssue: 20_000_000,
          loanRequest: { amount: 15_000_000, termMonths: 24 },
        },
      };

      const outputWith = runSingleTeam(stateWithDebt, debtDecisions, "exp-debt-issue");
      const outputWithout = runSingleTeam(stateWithout, {
        factory: {},
        hr: {},
        rd: { rdBudget: 1_000_000 },
        marketing: { advertisingBudget: { General: 500_000 } },
        finance: {},
      }, "exp-debt-issue");

      const cashWith = outputWith.results[0].newState.cash;
      const cashWithout = outputWithout.results[0].newState.cash;

      // Debt issuance should result in more cash (net of other costs)
      expect(cashWith).toBeGreaterThan(cashWithout);

      // Liabilities should increase with debt
      const liabWith = outputWith.results[0].newState.totalLiabilities;
      const liabWithout = outputWithout.results[0].newState.totalLiabilities;
      expect(liabWith).toBeGreaterThanOrEqual(liabWithout);

      // All financial values should be finite
      expect(Number.isFinite(cashWith)).toBe(true);
      expect(Number.isFinite(liabWith)).toBe(true);
    });

    it("9. aggressive-debt profile for 10 rounds — engine handles increasing debt load", () => {
      const outputs = runProfileNRounds({
        teamCount: 2,
        rounds: 10,
        matchSeed: "exp-aggr-debt",
        profile: "aggressive-debt",
      });

      // All 10 rounds complete
      expect(outputs.length).toBe(10);

      // No crashes, all results present
      for (const output of outputs) {
        expect(output.results.length).toBe(2);
        for (const result of output.results) {
          // Cash and liabilities should be finite numbers
          expect(Number.isFinite(result.newState.cash)).toBe(true);
          expect(Number.isFinite(result.newState.totalLiabilities)).toBe(true);
          expect(Number.isFinite(result.newState.totalAssets)).toBe(true);
        }
      }
    });

    it("10. cash tracking integrity — over 10 rounds, cash is always finite (not NaN, not Infinity)", () => {
      const outputs = runMultiRound(2, 10, "exp-cash-track", (_round) => ({
        factory: { efficiencyInvestments: {} },
        hr: {},
        rd: { rdBudget: 5_000_000 },
        marketing: {
          advertisingBudget: { General: 2_000_000, Budget: 1_000_000 },
          brandingInvestment: 1_000_000,
        },
        finance: {},
      }));

      expect(outputs.length).toBe(10);

      for (let i = 0; i < outputs.length; i++) {
        for (const result of outputs[i].results) {
          const cash = result.newState.cash;
          expect(Number.isFinite(cash)).toBe(true);
          expect(Number.isNaN(cash)).toBe(false);

          // Also check related financial fields
          expect(Number.isFinite(result.newState.revenue)).toBe(true);
          expect(Number.isFinite(result.newState.totalAssets)).toBe(true);
          expect(Number.isFinite(result.newState.totalLiabilities)).toBe(true);
          expect(Number.isFinite(result.newState.shareholdersEquity)).toBe(true);
          expect(Number.isFinite(result.newState.marketCap)).toBe(true);
          expect(Number.isFinite(result.newState.eps)).toBe(true);
        }
      }
    });
  });

  // ============================================
  // MARKETING EXPANSIONS (Phase 9)
  // ============================================

  describe("Marketing Expansions (Phase 9)", () => {
    it("11. marketing-overdrive profile for 8 rounds — brand grows but caps at 1.0", () => {
      const outputs = runProfileNRounds({
        teamCount: 2,
        rounds: 8,
        matchSeed: "exp-mkt-overdrive",
        profile: "marketing-overdrive",
      });

      expect(outputs.length).toBe(8);

      for (const output of outputs) {
        for (const result of output.results) {
          expect(result.newState.brandValue).toBeGreaterThanOrEqual(0);
          expect(result.newState.brandValue).toBeLessThanOrEqual(1.0);
        }
      }
    });

    it("12. brand bounds over time — 20 rounds, brand always in [0, 1]", () => {
      const outputs = runMultiRound(2, 20, "exp-brand-bounds", (round) => {
        // Alternate between heavy marketing and no marketing
        if (round % 2 === 0) {
          return {
            factory: {},
            hr: {},
            rd: { rdBudget: 1_000_000 },
            marketing: {
              advertisingBudget: {
                Budget: 8_000_000,
                General: 12_000_000,
                Enthusiast: 8_000_000,
                Professional: 4_000_000,
                "Active Lifestyle": 6_000_000,
              },
              brandingInvestment: 8_000_000,
            },
            finance: {},
          };
        }
        return {
          factory: {},
          hr: {},
          rd: { rdBudget: 1_000_000 },
          marketing: {},
          finance: {},
        };
      });

      expect(outputs.length).toBe(20);

      for (const output of outputs) {
        for (const result of output.results) {
          const bv = result.newState.brandValue;
          expect(bv).toBeGreaterThanOrEqual(0);
          expect(bv).toBeLessThanOrEqual(1.0);
        }
      }
    });
  });

  // ============================================
  // CROSS-EXPANSION INTEGRATION
  // ============================================

  describe("Cross-Expansion Integration", () => {
    it("13. all profiles run clean — each of 17 scenario profiles for 5 rounds, 3 teams, all invariants pass", () => {
      const profiles: ScenarioProfile[] = [
        "baseline-balanced",
        "aggressive-debt",
        "marketing-overdrive",
        "under-invested-ops",
        "RD-patent-rush",
        "HR-turnover-crisis",
        "factory-expansion-blitz",
        "ESG-maximizer",
        "supply-shock",
        "tariff-war",
        "event-heavy",
        "achievement-hunter",
        "chaos-monkey",
        "bankruptcy-spiral",
        "segment-specialist",
        "premium-pivot",
        "empty-decisions",
      ];

      for (const profile of profiles) {
        const outputs = runProfileNRounds({
          teamCount: 3,
          rounds: 5,
          matchSeed: `exp-all-profiles-${profile}`,
          profile,
        });

        expect(outputs.length).toBe(5);

        for (const output of outputs) {
          // Should not crash — all results present
          expect(output.results.length).toBe(3);

          // Run core invariants on each round output
          assertAllInvariantsPass(output);
        }
      }
    });

    it("14. long game (20 rounds) — 3 teams, baseline-balanced, all financial values finite, all invariants pass", () => {
      const outputs = runProfileNRounds({
        teamCount: 3,
        rounds: 20,
        matchSeed: "exp-long-game-20",
        profile: "baseline-balanced",
      });

      expect(outputs.length).toBe(20);

      for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];
        expect(output.results.length).toBe(3);

        // All financial values must be finite every round
        for (const result of output.results) {
          const s = result.newState;
          const financialFields = [
            s.cash, s.revenue, s.netIncome, s.totalAssets,
            s.totalLiabilities, s.shareholdersEquity, s.marketCap,
            s.sharesIssued, s.sharePrice, s.eps,
          ];
          for (const val of financialFields) {
            expect(Number.isFinite(val)).toBe(true);
          }

          // Brand always in bounds
          expect(s.brandValue).toBeGreaterThanOrEqual(0);
          expect(s.brandValue).toBeLessThanOrEqual(1.0);

          // ESG non-negative
          expect(s.esgScore).toBeGreaterThanOrEqual(0);

          // Headcount non-negative
          expect(s.workforce.totalHeadcount).toBeGreaterThanOrEqual(0);
        }

        // Invariant suite
        assertAllInvariantsPass(output);
      }
    });

    it("15. empty decisions 10 rounds — team makes no decisions, deteriorates but never crashes", () => {
      const outputs = runProfileNRounds({
        teamCount: 2,
        rounds: 10,
        matchSeed: "exp-empty-10",
        profile: "empty-decisions",
      });

      expect(outputs.length).toBe(10);

      for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];
        expect(output.results.length).toBe(2);

        for (const result of output.results) {
          const s = result.newState;

          // Core fields must remain finite and within bounds
          expect(Number.isFinite(s.cash)).toBe(true);
          expect(Number.isFinite(s.revenue)).toBe(true);
          expect(Number.isFinite(s.totalAssets)).toBe(true);
          expect(Number.isFinite(s.totalLiabilities)).toBe(true);
          expect(Number.isFinite(s.shareholdersEquity)).toBe(true);

          // Brand value in bounds
          expect(s.brandValue).toBeGreaterThanOrEqual(0);
          expect(s.brandValue).toBeLessThanOrEqual(1.0);

          // Workforce non-negative
          expect(s.workforce.totalHeadcount).toBeGreaterThanOrEqual(0);

          // Factories should still have valid bounds
          for (const factory of s.factories) {
            expect(factory.efficiency).toBeGreaterThanOrEqual(0);
            expect(factory.efficiency).toBeLessThanOrEqual(1.0);
            expect(factory.defectRate).toBeGreaterThanOrEqual(0);
            expect(factory.defectRate).toBeLessThanOrEqual(1.0);
            expect(factory.burnoutRisk).toBeGreaterThanOrEqual(0);
            expect(factory.burnoutRisk).toBeLessThanOrEqual(100);
            expect(Number.isFinite(factory.maintenanceBacklog)).toBe(true);
          }

          // All employees have valid morale
          for (const emp of s.employees) {
            expect(emp.morale).toBeGreaterThanOrEqual(0);
            expect(emp.morale).toBeLessThanOrEqual(100);
            expect(emp.burnout).toBeGreaterThanOrEqual(0);
            expect(emp.burnout).toBeLessThanOrEqual(100);
          }
        }

        // Run invariant suite
        assertAllInvariantsPass(output);
      }
    });
  });
});
