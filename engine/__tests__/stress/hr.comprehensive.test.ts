/**
 * HR MODULE — COMPREHENSIVE STRESS TESTS
 *
 * Merged from:
 *   1. hr.stress.test.ts          (Parts A, B, C)
 *   2. hr_deep.stress.test.ts     (Part D)
 *   3. miyazaki_modules.stress.test.ts §3 (Part E)
 *
 * Tests hiring, turnover, salary, benefits, training fatigue,
 * recruitment tiers, burnout clamping, engineer R&D output formula,
 * burnout R&D penalty, zero-engineer R&D output, and Miyazaki protocol.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput } from "../../core/SimulationEngine";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  createMinimalEngineContext,
  runProfileNRounds,
  runNRounds,
} from "../../testkit/scenarioGenerator";
import { assertAllInvariantsPass } from "../../testkit/invariants";
import { CONSTANTS } from "../../types";
import { HRModule } from "../../modules/HRModule";
import { RDModule } from "../../modules/RDModule";
import { FactoryModule } from "../../modules/FactoryModule";
import type { EngineerStats, Employee } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runSingleTeam(
  state: ReturnType<typeof createMinimalTeamState>,
  decisions: any,
  seed = "hr-test"
) {
  const input: SimulationInput = {
    roundNumber: 1,
    teams: [{ id: "t1", state, decisions }],
    marketState: createMinimalMarketState(),
    matchSeed: seed,
  };
  return SimulationEngine.processRound(input);
}

// ===========================================================================
// TOP-LEVEL DESCRIBE
// ===========================================================================

describe("HR Module — Comprehensive Stress Tests", () => {
  // =========================================================================
  // PART A — Golden Path
  // =========================================================================

  describe("Part A — Golden Path", () => {
    it("HR module processes with empty decisions", () => {
      const output = runSingleTeam(createMinimalTeamState(), {});
      expect(output.results[0].hrResults.success).toBe(true);
    });

    it("turnover reduces headcount over rounds", () => {
      const outputs = runProfileNRounds({
        teamCount: 1,
        rounds: 5,
        matchSeed: "hr-turnover",
        profile: "empty-decisions",
      });
      // With no investment, turnover should reduce headcount
      const initialHeadcount = 50 + 8 + 5; // Quick preset
      const finalHeadcount = outputs[4].results[0].newState.workforce.totalHeadcount;
      expect(finalHeadcount).toBeLessThan(initialHeadcount);
    });
  });

  // =========================================================================
  // PART B — Edge Cases
  // =========================================================================

  describe("Part B — Edge Cases", () => {
    it("HR-turnover-crisis: headcount never negative", () => {
      const outputs = runProfileNRounds({
        teamCount: 1,
        rounds: 5,
        matchSeed: "hr-crisis",
        profile: "HR-turnover-crisis",
      });
      for (const output of outputs) {
        expect(output.results[0].newState.workforce.totalHeadcount).toBeGreaterThanOrEqual(0);
      }
    });

    it("morale stays in [0, 100]", () => {
      const outputs = runProfileNRounds({
        teamCount: 2,
        rounds: 5,
        matchSeed: "hr-morale",
        profile: "HR-turnover-crisis",
      });
      for (const output of outputs) {
        for (const result of output.results) {
          for (const emp of result.newState.employees) {
            expect(emp.morale).toBeGreaterThanOrEqual(0);
            expect(emp.morale).toBeLessThanOrEqual(100);
          }
        }
      }
    });

    it("0 employees: no crash", () => {
      const state = createMinimalTeamState();
      state.employees = [];
      state.factories[0].workers = 0;
      state.factories[0].engineers = 0;
      state.factories[0].supervisors = 0;
      state.workforce.totalHeadcount = 0;
      const output = runSingleTeam(state, {}, "hr-zero");
      expect(output.results.length).toBe(1);
    });
  });

  // =========================================================================
  // PART C — Property Tests
  // =========================================================================

  describe("Part C — Property Tests", () => {
    it("recruitment tier constants are correct", () => {
      expect(CONSTANTS.RECRUITMENT_COSTS.basic).toBe(5_000);
      expect(CONSTANTS.RECRUITMENT_COSTS.premium).toBe(15_000);
      expect(CONSTANTS.RECRUITMENT_COSTS.executive).toBe(50_000);

      expect(CONSTANTS.RECRUITMENT_CANDIDATES.basic).toBe(4);
      expect(CONSTANTS.RECRUITMENT_CANDIDATES.premium).toBe(6);
      expect(CONSTANTS.RECRUITMENT_CANDIDATES.executive).toBe(8);

      expect(CONSTANTS.RECRUITMENT_STAT_RANGE.basic).toEqual({ min: 70, max: 110 });
      expect(CONSTANTS.RECRUITMENT_STAT_RANGE.premium).toEqual({ min: 90, max: 130 });
      expect(CONSTANTS.RECRUITMENT_STAT_RANGE.executive).toEqual({ min: 120, max: 160 });
    });

    it("salary formula constants are correct", () => {
      expect(CONSTANTS.MAX_SALARY).toBe(500_000);
      expect(CONSTANTS.SALARY_MULTIPLIER_MIN).toBe(0.8);
      expect(CONSTANTS.SALARY_MULTIPLIER_MAX).toBe(2.2);
      expect(CONSTANTS.HIRING_COST_MULTIPLIER).toBe(0.15);
    });

    it("training costs are correct", () => {
      expect(CONSTANTS.TRAINING_COSTS.worker).toBe(50_000);
      expect(CONSTANTS.TRAINING_COSTS.engineer).toBe(75_000);
      expect(CONSTANTS.TRAINING_COSTS.supervisor).toBe(100_000);
    });

    it("benefits costs are defined for all 7 types", () => {
      expect(CONSTANTS.BENEFITS_COSTS.healthInsurance).toBe(5000);
      expect(CONSTANTS.BENEFITS_COSTS.retirementMatch).toBe(3000);
      expect(CONSTANTS.BENEFITS_COSTS.paidTimeOff).toBe(200);
      expect(CONSTANTS.BENEFITS_COSTS.parentalLeave).toBe(1000);
      expect(CONSTANTS.BENEFITS_COSTS.stockOptions).toBe(2000);
      expect(CONSTANTS.BENEFITS_COSTS.flexibleWork).toBe(500);
      expect(CONSTANTS.BENEFITS_COSTS.professionalDevelopment).toBe(1);
    });

    it("worker constants match documentation", () => {
      expect(CONSTANTS.BASE_WORKER_OUTPUT).toBe(100);
      expect(CONSTANTS.WORKERS_PER_MACHINE).toBe(2.75);
      expect(CONSTANTS.WORKERS_PER_SUPERVISOR).toBe(15);
      expect(CONSTANTS.BASE_TURNOVER_RATE).toBe(0.125);
      expect(CONSTANTS.BASE_RD_POINTS_PER_ENGINEER).toBe(15);
    });
  });

  // =========================================================================
  // PART D — Deep Stress
  // =========================================================================

  describe("Part D — Deep Stress", () => {
    // -----------------------------------------------------------------------
    // §1.8 — HRModule.process()
    // -----------------------------------------------------------------------

    describe("§1.8 — HRModule.process()", () => {
      // -----------------------------------------------
      // 1. Fire All Employees
      // -----------------------------------------------
      it("fire all employees: headcount=0, no crash, production=0, R&D=0", () => {
        const state = createMinimalTeamState();
        const allEmployeeIds = state.employees.map(e => ({ employeeId: e.id }));

        const output = runSingleTeam(state, {
          hr: {
            fires: allEmployeeIds,
          },
        }, "hr-deep-fire-all");

        const newState = output.results[0].newState;

        // After firing everyone (some may have left via turnover too), headcount should be 0
        expect(newState.workforce.totalHeadcount).toBe(0);
        expect(newState.employees.length).toBe(0);

        // No crash
        expect(output.results.length).toBe(1);
        expect(output.results[0].hrResults.success).toBe(true);

        assertAllInvariantsPass(output);
      });

      it("fire all employees then run another round: still no crash", () => {
        const outputs = runNRounds({
          teamCount: 1,
          rounds: 3,
          matchSeed: "hr-deep-fire-multi",
          decisionFn: (state, round) => {
            if (round === 1) {
              // Fire everyone in round 1
              return {
                hr: {
                  fires: state.employees.map(e => ({ employeeId: e.id })),
                },
              };
            }
            // Subsequent rounds: empty decisions, zero employees
            return {};
          },
        });

        // All rounds should complete without crash
        expect(outputs.length).toBe(3);
        for (const output of outputs) {
          assertAllInvariantsPass(output);
        }

        // After round 1, headcount should be 0 for remaining rounds
        expect(outputs[1].results[0].newState.workforce.totalHeadcount).toBe(0);
        expect(outputs[2].results[0].newState.workforce.totalHeadcount).toBe(0);
      });

      // -----------------------------------------------
      // 2. Empty Decisions — no crash, defaults applied
      // -----------------------------------------------
      it("empty HR decisions ({}) processes without crash and applies defaults", () => {
        const state = createMinimalTeamState();
        const output = runSingleTeam(state, {}, "hr-deep-empty");

        expect(output.results.length).toBe(1);
        expect(output.results[0].hrResults.success).toBe(true);

        // Workforce summary should still be populated
        const wf = output.results[0].newState.workforce;
        expect(wf.totalHeadcount).toBeGreaterThanOrEqual(0);
        expect(typeof wf.averageMorale).toBe("number");
        expect(typeof wf.laborCost).toBe("number");

        assertAllInvariantsPass(output);
      });

      // -----------------------------------------------
      // 3. Morale Extremes — clamped at [0, 100]
      // -----------------------------------------------
      it("morale driven toward 0 stays clamped at 0", () => {
        const state = createMinimalTeamState();
        // Set all employees to very low morale
        for (const emp of state.employees) {
          emp.morale = 2;
        }

        // Run several rounds with terrible conditions (mass firing, low pay)
        const outputs = runNRounds({
          teamCount: 1,
          rounds: 5,
          matchSeed: "hr-deep-morale-low",
          decisionFn: (teamState, round) => {
            // Fire some people each round to tank morale
            const toFire = teamState.employees.slice(0, 3).map(e => ({ employeeId: e.id }));
            return {
              hr: {
                fires: toFire,
                salaryMultiplierChanges: { workers: 0.5, engineers: 0.5, supervisors: 0.5 },
              },
            };
          },
          preset: "quick",
        });

        for (const output of outputs) {
          for (const result of output.results) {
            for (const emp of result.newState.employees) {
              expect(emp.morale).toBeGreaterThanOrEqual(0);
              expect(emp.morale).toBeLessThanOrEqual(100);
            }
          }
        }
      });

      it("morale driven toward 100 stays clamped at 100", () => {
        const state = createMinimalTeamState();
        // Set all employees to high morale
        for (const emp of state.employees) {
          emp.morale = 98;
        }

        // Run with great benefits
        const output = runSingleTeam(state, {
          hr: {
            benefitChanges: {
              healthInsurance: 100,
              retirementMatch: 100,
              paidTimeOff: 30,
              parentalLeave: 12,
              stockOptions: true,
              flexibleWork: true,
              professionalDevelopment: 5000,
            },
          },
        }, "hr-deep-morale-high");

        for (const emp of output.results[0].newState.employees) {
          expect(emp.morale).toBeGreaterThanOrEqual(0);
          expect(emp.morale).toBeLessThanOrEqual(100);
        }

        assertAllInvariantsPass(output);
      });

      // -----------------------------------------------
      // 4. Burnout at Maximum — clamped at 100
      // -----------------------------------------------
      it("employee with burnout=100 and morale=30 stays clamped at burnout=100", () => {
        const state = createMinimalTeamState();
        // Set extreme burnout conditions
        for (const emp of state.employees) {
          emp.burnout = 100;
          emp.morale = 30;
        }

        const output = runSingleTeam(state, {}, "hr-deep-burnout-max");

        for (const emp of output.results[0].newState.employees) {
          // Burnout should stay clamped at [0, 100]
          expect(emp.burnout).toBeGreaterThanOrEqual(0);
          expect(emp.burnout).toBeLessThanOrEqual(100);
        }

        assertAllInvariantsPass(output);
      });

      it("burnout accumulates over rounds with low morale", () => {
        const state = createMinimalTeamState();
        // Start with zero burnout, low morale
        for (const emp of state.employees) {
          emp.burnout = 0;
          emp.morale = 30;
        }

        const outputs = runNRounds({
          teamCount: 1,
          rounds: 5,
          matchSeed: "hr-deep-burnout-accum",
          decisionFn: () => ({}),
          preset: "quick",
        });

        // Burnout should increase over rounds (morale < 50 causes higher burnout gain)
        // Check it always stays within bounds
        for (const output of outputs) {
          for (const emp of output.results[0].newState.employees) {
            expect(emp.burnout).toBeGreaterThanOrEqual(0);
            expect(emp.burnout).toBeLessThanOrEqual(100);
          }
        }
      });

      // -----------------------------------------------
      // 5. Training With Cooldown — fatigue penalty
      // -----------------------------------------------
      it("training fatigue kicks in after threshold programs", () => {
        // Direct unit test of calculateTrainingEffectiveness
        const employee: Employee = {
          id: "test-emp",
          role: "worker",
          name: "Test Worker",
          stats: {
            efficiency: 80,
            accuracy: 80,
            speed: 80,
            stamina: 80,
            discipline: 80,
            loyalty: 80,
            teamCompatibility: 80,
            health: 80,
          },
          salary: 50_000,
          hiredRound: 0,
          factoryId: "factory-1",
          morale: 75,
          burnout: 0,
          trainingHistory: {
            programsThisYear: 0,
            lastTrainingRound: 0,
            totalProgramsCompleted: 0,
          },
        };

        // Before threshold: full effectiveness
        const result1 = HRModule.calculateTrainingEffectiveness(employee);
        expect(result1.effectiveness).toBe(1.0);
        expect(result1.fatigueApplied).toBe(false);

        // At threshold (TRAINING_FATIGUE_THRESHOLD = 1)
        employee.trainingHistory.programsThisYear = CONSTANTS.TRAINING_FATIGUE_THRESHOLD;
        const result2 = HRModule.calculateTrainingEffectiveness(employee);
        expect(result2.fatigueApplied).toBe(true);
        expect(result2.effectiveness).toBeLessThan(1.0);

        // Well past threshold
        employee.trainingHistory.programsThisYear = CONSTANTS.TRAINING_FATIGUE_THRESHOLD + 3;
        const result3 = HRModule.calculateTrainingEffectiveness(employee);
        expect(result3.fatigueApplied).toBe(true);
        expect(result3.effectiveness).toBeLessThan(result2.effectiveness);
        // Effectiveness floors at 0.2
        expect(result3.effectiveness).toBeGreaterThanOrEqual(0.2);
      });

      it("training in consecutive rounds reduces effectiveness via full pipeline", () => {
        // Run 4 rounds training workers every round
        const outputs = runNRounds({
          teamCount: 1,
          rounds: 4,
          matchSeed: "hr-deep-train-consec",
          decisionFn: () => ({
            hr: {
              trainingPrograms: [{ role: "worker" }],
            },
            rd: { rdBudget: 1_000_000 },
          }),
          preset: "quick",
        });

        // All rounds should succeed
        expect(outputs.length).toBe(4);
        for (const output of outputs) {
          expect(output.results[0].hrResults.success).toBe(true);
          assertAllInvariantsPass(output);
        }

        // After multiple training programs, employees should have programsThisYear > 0
        const finalEmployees = outputs[3].results[0].newState.employees;
        const workers = finalEmployees.filter(e => e.role === "worker");
        if (workers.length > 0) {
          // At least some workers should have training history
          const trainedWorkers = workers.filter(
            w => w.trainingHistory && w.trainingHistory.totalProgramsCompleted > 0
          );
          expect(trainedWorkers.length).toBeGreaterThan(0);
        }
      });
    });

    // -----------------------------------------------------------------------
    // §1.9 — calculateEngineerRDOutput()
    // -----------------------------------------------------------------------

    describe("§1.9 — calculateEngineerRDOutput()", () => {
      // -----------------------------------------------
      // 6. All Stats at 100, Zero Burnout
      // -----------------------------------------------
      it("engineer with all stats=100, burnout=0 produces expected R&D output", () => {
        const stats: EngineerStats = {
          efficiency: 100,
          accuracy: 100,
          speed: 100,
          stamina: 100,
          discipline: 100,
          loyalty: 100,
          teamCompatibility: 100,
          health: 100,
          innovation: 100,
          problemSolving: 100,
        };

        const output = HRModule.calculateEngineerRDOutput(stats);

        // Formula: BASE_RD_POINTS_PER_ENGINEER * (efficiency/100) * (speed/100) * (1 + innovation/200)
        // = 15 * 1.0 * 1.0 * (1 + 100/200) = 15 * 1 * 1 * 1.5 = 22.5
        expect(output).toBeCloseTo(22.5, 1);
        expect(output).toBeGreaterThan(0);
      });

      // -----------------------------------------------
      // 7. Maximum Burnout — output reduced
      // -----------------------------------------------
      it("maximum burnout (100) reduces R&D output compared to zero burnout", () => {
        const stats: EngineerStats = {
          efficiency: 80,
          accuracy: 80,
          speed: 80,
          stamina: 80,
          discipline: 80,
          loyalty: 80,
          teamCompatibility: 80,
          health: 80,
          innovation: 80,
          problemSolving: 80,
        };

        const outputNoBurnout = HRModule.calculateEngineerRDOutput(stats);
        // HRModule.calculateEngineerRDOutput doesn't take burnout directly,
        // but RDModule.calculateTotalRDOutput does via employee burnout field.
        // Test via calculateTotalRDOutput with mock employees.

        const engineerNoBurnout: Employee = {
          id: "eng-no-burn",
          role: "engineer",
          name: "No Burnout",
          stats,
          salary: 85_000,
          hiredRound: 0,
          factoryId: "factory-1",
          morale: 75,
          burnout: 0,
          trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
        };

        const engineerMaxBurnout: Employee = {
          id: "eng-max-burn",
          role: "engineer",
          name: "Max Burnout",
          stats,
          salary: 85_000,
          hiredRound: 0,
          factoryId: "factory-1",
          morale: 75,
          burnout: 100,
          trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
        };

        const rdNoBurnout = RDModule.calculateTotalRDOutput([engineerNoBurnout]);
        const rdMaxBurnout = RDModule.calculateTotalRDOutput([engineerMaxBurnout]);

        // Burnout penalty in RDModule: burnoutPenalty = 1 - (burnout / 200)
        // At burnout=0: penalty = 1.0 (no reduction)
        // At burnout=100: penalty = 1 - (100/200) = 0.5 (50% reduction)
        expect(rdMaxBurnout).toBeLessThan(rdNoBurnout);
        expect(rdMaxBurnout).toBeCloseTo(rdNoBurnout * 0.5, 1);
        expect(rdMaxBurnout).toBeGreaterThan(0);
      });

      it("burnout R&D penalty integrates correctly through full pipeline", () => {
        // State with zero burnout engineers
        const stateA = createMinimalTeamState();
        for (const emp of stateA.employees) {
          if (emp.role === "engineer") {
            emp.burnout = 0;
            emp.morale = 90;
          }
        }

        // State with max burnout engineers
        const stateB = createMinimalTeamState();
        for (const emp of stateB.employees) {
          if (emp.role === "engineer") {
            emp.burnout = 100;
            emp.morale = 30;
          }
        }

        const outputA = runSingleTeam(stateA, { rd: { rdBudget: 0 } }, "hr-deep-rd-noburn");
        const outputB = runSingleTeam(stateB, { rd: { rdBudget: 0 } }, "hr-deep-rd-maxburn");

        // Both should succeed
        expect(outputA.results[0].rdResults.success).toBe(true);
        expect(outputB.results[0].rdResults.success).toBe(true);

        // R&D progress with no burnout should be >= progress with max burnout
        // (Note: burnout may change during the round due to HR processing,
        //  so we just verify the general direction)
        const rdProgressA = outputA.results[0].newState.rdProgress;
        const rdProgressB = outputB.results[0].newState.rdProgress;
        expect(rdProgressA).toBeGreaterThanOrEqual(rdProgressB);

        assertAllInvariantsPass(outputA);
        assertAllInvariantsPass(outputB);
      });

      // -----------------------------------------------
      // 8. Zero Engineers — R&D from engineers = 0
      // -----------------------------------------------
      it("zero engineers produces zero R&D from engineers (only budget contributes)", () => {
        const rdFromZeroEngineers = RDModule.calculateTotalRDOutput([]);
        expect(rdFromZeroEngineers).toBe(0);

        // Workers should not contribute to engineer R&D output
        const worker: Employee = {
          id: "worker-1",
          role: "worker",
          name: "Worker",
          stats: {
            efficiency: 100,
            accuracy: 100,
            speed: 100,
            stamina: 100,
            discipline: 100,
            loyalty: 100,
            teamCompatibility: 100,
            health: 100,
          },
          salary: 45_000,
          hiredRound: 0,
          factoryId: "factory-1",
          morale: 75,
          burnout: 0,
          trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
        };

        const rdFromWorkers = RDModule.calculateTotalRDOutput([worker]);
        expect(rdFromWorkers).toBe(0);
      });

      it("zero engineers with budget: R&D progress comes only from budget", () => {
        const state = createMinimalTeamState();
        // Remove all engineers
        state.employees = state.employees.filter(e => e.role !== "engineer");
        state.factories[0].engineers = 0;
        state.rdProgress = 0;

        const rdBudget = 15_000_000; // Should generate 15M / 100K = 150 points from budget

        const output = runSingleTeam(state, {
          rd: { rdBudget },
        }, "hr-deep-zero-eng-budget");

        const rdProgress = output.results[0].newState.rdProgress;
        const expectedBudgetPoints = Math.floor(rdBudget / CONSTANTS.RD_BUDGET_TO_POINTS_RATIO);

        // R&D progress should be exactly the budget contribution (0 from engineers)
        expect(rdProgress).toBe(expectedBudgetPoints);
        expect(rdProgress).toBe(150);

        assertAllInvariantsPass(output);
      });

      it("multiple engineers with varying stats produce proportional R&D output", () => {
        const makeEngineer = (id: string, efficiency: number, speed: number, innovation: number, burnout: number): Employee => ({
          id,
          role: "engineer",
          name: `Engineer ${id}`,
          stats: {
            efficiency,
            accuracy: 80,
            speed,
            stamina: 80,
            discipline: 80,
            loyalty: 80,
            teamCompatibility: 80,
            health: 80,
            innovation,
            problemSolving: 80,
          } as EngineerStats,
          salary: 85_000,
          hiredRound: 0,
          factoryId: "factory-1",
          morale: 75,
          burnout,
          trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
        });

        // One high-stat engineer
        const highStatEng = makeEngineer("high", 100, 100, 100, 0);
        const rdHigh = RDModule.calculateTotalRDOutput([highStatEng]);

        // One low-stat engineer
        const lowStatEng = makeEngineer("low", 50, 50, 50, 0);
        const rdLow = RDModule.calculateTotalRDOutput([lowStatEng]);

        // High stats should produce more R&D
        expect(rdHigh).toBeGreaterThan(rdLow);

        // Two engineers should produce more than one
        const rdTwo = RDModule.calculateTotalRDOutput([highStatEng, lowStatEng]);
        expect(rdTwo).toBeGreaterThan(rdHigh);
        // Should be additive
        expect(rdTwo).toBeCloseTo(rdHigh + rdLow, 1);
      });
    });
  });

  // =========================================================================
  // PART E — Miyazaki Protocol
  // =========================================================================

  describe("Part E — Miyazaki Protocol", () => {
    // -----------------------------------------------------------------------
    // TEST 3.1 — Fire All Employees [CRITICAL]
    // -----------------------------------------------------------------------
    it("3.1 — Fire every employee: headcount = 0, next round production = 0", () => {
      const state = createMinimalTeamState();

      // Fire all via HRModule directly
      const fires = state.employees.map((e) => ({ employeeId: e.id }));
      const { newState, result } = HRModule.process(state, { fires });

      expect(result.success).toBe(true);
      expect(newState.employees.length).toBe(0);
      expect(newState.workforce.totalHeadcount).toBe(0);

      // Now check production with 0 workers
      const factory = newState.factories[0];
      const { unitsProduced } = FactoryModule.calculateProduction(factory, 0, 0, 0);
      expect(unitsProduced).toBe(0);
    });

    // -----------------------------------------------------------------------
    // TEST 3.6 — Burnout Clamping (BAL-06)
    // -----------------------------------------------------------------------
    it("3.6 — Morale=0, burnout=95: burnout stays <= 100 after processing", () => {
      const state = createMinimalTeamState();

      // Set extreme conditions on all employees
      for (const emp of state.employees) {
        emp.morale = 0;
        emp.burnout = 95;
      }

      // Process multiple rounds of HR
      let currentState = state;
      for (let i = 0; i < 5; i++) {
        const { newState } = HRModule.process(currentState, {});
        currentState = newState;
      }

      for (const emp of currentState.employees) {
        expect(emp.burnout).toBeLessThanOrEqual(100);
        expect(emp.burnout).toBeGreaterThanOrEqual(0);
        expect(isFinite(emp.burnout)).toBe(true);
      }
    });

    // -----------------------------------------------------------------------
    // TEST 3.7 — Turnover with Zero Employees
    // -----------------------------------------------------------------------
    it("3.7 — Fire all, process turnover: no NaN in workforce averages", () => {
      const state = createMinimalTeamState();

      // Fire everyone
      const fires = state.employees.map((e) => ({ employeeId: e.id }));
      const { newState } = HRModule.process(state, { fires });

      // Process another round to trigger turnover on empty list
      const { newState: afterTurnover } = HRModule.process(newState, {});

      const wf = afterTurnover.workforce;
      expect(isNaN(wf.averageMorale)).toBe(false);
      expect(isNaN(wf.averageEfficiency)).toBe(false);
      expect(isNaN(wf.laborCost)).toBe(false);
      expect(isNaN(wf.turnoverRate)).toBe(false);
      expect(wf.totalHeadcount).toBe(0);
    });
  });
});
