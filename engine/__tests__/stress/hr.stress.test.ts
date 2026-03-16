/**
 * HR MODULE STRESS SUITE
 *
 * Tests hiring, turnover, salary, benefits, training fatigue,
 * and recruitment tiers.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput } from "../../core/SimulationEngine";
import {
  createTeamState,
  createMarketState,
  runSimulation,
} from "../../testkit/scenarioGenerator";
import { assertAllInvariants } from "../../testkit/invariants";
import { CONSTANTS } from "../../types";

function runSingleTeam(state: ReturnType<typeof createTeamState>, decisions: any, seed = "hr-test") {
  const input: SimulationInput = {
    roundNumber: 1,
    teams: [{ id: "t1", state, decisions }],
    marketState: createMarketState(),
    matchSeed: seed,
  };
  return SimulationEngine.processRound(input);
}

describe("HR Stress Suite", () => {
  describe("Category A — Golden Path", () => {
    it("HR module processes with empty decisions", () => {
      const output = runSingleTeam(createTeamState(), {});
      expect(output.results[0].hrResults.success).toBe(true);
    });

    it("turnover reduces headcount over rounds", () => {
      const sim = runSimulation({
        teamCount: 1,
        rounds: 5,
        seed: "hr-turnover",
        profile: "passive",
      });
      // With no investment, turnover should reduce headcount
      const initialHeadcount = 50 + 8 + 5; // Quick preset
      const finalHeadcount = sim.roundOutputs[4].results[0].newState.workforce.totalHeadcount;
      expect(finalHeadcount).toBeLessThan(initialHeadcount);
    });
  });

  describe("Category B — Edge", () => {
    it("HR-turnover-crisis: headcount never negative", () => {
      const sim = runSimulation({
        teamCount: 1,
        rounds: 5,
        seed: "hr-crisis",
        profile: "HR-turnover-crisis",
      });
      for (const output of sim.roundOutputs) {
        expect(output.results[0].newState.workforce.totalHeadcount).toBeGreaterThanOrEqual(0);
      }
    });

    it("morale stays in [0, 100]", () => {
      const sim = runSimulation({
        teamCount: 2,
        rounds: 5,
        seed: "hr-morale",
        profile: "HR-turnover-crisis",
      });
      for (const output of sim.roundOutputs) {
        for (const result of output.results) {
          for (const emp of result.newState.employees) {
            expect(emp.morale).toBeGreaterThanOrEqual(0);
            expect(emp.morale).toBeLessThanOrEqual(100);
          }
        }
      }
    });

    it("0 employees: no crash", () => {
      const state = createTeamState();
      state.employees = [];
      state.factories[0].workers = 0;
      state.factories[0].engineers = 0;
      state.factories[0].supervisors = 0;
      state.workforce.totalHeadcount = 0;
      const output = runSingleTeam(state, {}, "hr-zero");
      expect(output.results.length).toBe(1);
    });
  });

  describe("Category C — Property Tests", () => {
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
      expect(CONSTANTS.WORKERS_PER_MACHINE).toBe(2.5);
      expect(CONSTANTS.WORKERS_PER_SUPERVISOR).toBe(15);
      expect(CONSTANTS.BASE_TURNOVER_RATE).toBe(0.12);
      expect(CONSTANTS.BASE_RD_POINTS_PER_ENGINEER).toBe(15); // v5.1.0 Audit F-04: raised from 10 to 15
    });
  });

  describe("Category D — Regression", () => {
    it("placeholder: no regressions found yet", () => {
      expect(true).toBe(true);
    });
  });
});
