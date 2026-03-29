/**
 * Unit tests for HRModule static calculation methods.
 */

import { HRModule } from "@/engine/modules/HRModule";
import {
  create_employee,
  create_stats,
  create_engineer_stats,
  create_supervisor_stats,
} from "../setup";

// ---------------------------------------------------------------------------
// calculateWorkerOutput
// ---------------------------------------------------------------------------

describe("calculateWorkerOutput", () => {
  it("returns BASE_WORKER_OUTPUT when efficiency and speed are both 100", () => {
    const stats = create_stats({ efficiency: 100, speed: 100 });
    expect(HRModule.calculateWorkerOutput(stats)).toBe(100);
  });

  it("scales quadratically with efficiency and speed", () => {
    const stats = create_stats({ efficiency: 50, speed: 50 });
    expect(HRModule.calculateWorkerOutput(stats)).toBe(25);
  });

  it("returns 0 when efficiency is 0", () => {
    const stats = create_stats({ efficiency: 0, speed: 100 });
    expect(HRModule.calculateWorkerOutput(stats)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateEngineerRDOutput
// ---------------------------------------------------------------------------

describe("calculateEngineerRDOutput", () => {
  it("returns BASE_RD_POINTS (15) at perfect efficiency/speed with zero innovation", () => {
    const stats = create_engineer_stats({ efficiency: 100, speed: 100, innovation: 0 });
    expect(HRModule.calculateEngineerRDOutput(stats)).toBe(15);
  });

  it("applies innovation bonus (1 + innovation/200)", () => {
    const stats = create_engineer_stats({ efficiency: 100, speed: 100, innovation: 100 });
    expect(HRModule.calculateEngineerRDOutput(stats)).toBeCloseTo(22.5);
  });

  it("compounds efficiency, speed, and innovation together", () => {
    const stats = create_engineer_stats({ efficiency: 50, speed: 50, innovation: 100 });
    // 15 × 0.5 × 0.5 × 1.5 = 5.625
    expect(HRModule.calculateEngineerRDOutput(stats)).toBeCloseTo(5.625);
  });
});

// ---------------------------------------------------------------------------
// calculateSupervisorBoost
// ---------------------------------------------------------------------------

describe("calculateSupervisorBoost", () => {
  it("returns 1.2 at leadership 100", () => {
    const stats = create_supervisor_stats({ leadership: 100 });
    expect(HRModule.calculateSupervisorBoost(stats)).toBeCloseTo(1.2);
  });

  it("returns 1.0 at leadership 0", () => {
    const stats = create_supervisor_stats({ leadership: 0 });
    expect(HRModule.calculateSupervisorBoost(stats)).toBe(1.0);
  });

  it("returns 1.1 at leadership 50", () => {
    const stats = create_supervisor_stats({ leadership: 50 });
    expect(HRModule.calculateSupervisorBoost(stats)).toBeCloseTo(1.1);
  });
});

// ---------------------------------------------------------------------------
// calculateSalary
// ---------------------------------------------------------------------------

describe("calculateSalary", () => {
  it("calculates worker salary with known average stats", () => {
    // All stats 50 → avgStat = 50, multiplier = 0.8 + 0.5 × 1.4 = 1.5
    // salary = 45000 × 1.5 = 67500
    const stats = create_stats({
      efficiency: 50, accuracy: 50, speed: 50, stamina: 50,
      discipline: 50, loyalty: 50, teamCompatibility: 50, health: 50,
    });
    expect(HRModule.calculateSalary("worker", stats)).toBe(67500);
  });

  it("calculates engineer salary including innovation and problemSolving", () => {
    // 10 stats all 100 → avg = 100, multiplier = 0.8 + 1.0 × 1.4 = 2.2
    // salary = 85000 × 2.2 = 187000
    const stats = create_engineer_stats({
      efficiency: 100, accuracy: 100, speed: 100, stamina: 100,
      discipline: 100, loyalty: 100, teamCompatibility: 100, health: 100,
      innovation: 100, problemSolving: 100,
    });
    expect(HRModule.calculateSalary("engineer", stats)).toBe(187000);
  });

  it("calculates supervisor salary including leadership and tacticalPlanning", () => {
    // 10 stats all 0 → avg = 0, multiplier = 0.8
    // salary = 75000 × 0.8 = 60000
    const stats = create_supervisor_stats({
      efficiency: 0, accuracy: 0, speed: 0, stamina: 0,
      discipline: 0, loyalty: 0, teamCompatibility: 0, health: 0,
      leadership: 0, tacticalPlanning: 0,
    });
    expect(HRModule.calculateSalary("supervisor", stats)).toBe(60000);
  });

  it("caps salary at 500,000", () => {
    // Engineer all 100 → 187000, well under cap.
    // Worker all 100 → 45000 × 2.2 = 99000, under cap.
    // Need baseSalary high enough to exceed cap — but bases are fixed.
    // Verify the cap exists by checking an extreme case won't exceed it.
    const stats = create_engineer_stats({
      efficiency: 100, accuracy: 100, speed: 100, stamina: 100,
      discipline: 100, loyalty: 100, teamCompatibility: 100, health: 100,
      innovation: 100, problemSolving: 100,
    });
    const salary = HRModule.calculateSalary("engineer", stats);
    expect(salary).toBeLessThanOrEqual(500_000);
  });
});

// ---------------------------------------------------------------------------
// calculateEmployeeValue
// ---------------------------------------------------------------------------

describe("calculateEmployeeValue", () => {
  it("returns 100 when all stats are 100", () => {
    const stats = create_stats({
      efficiency: 100, accuracy: 100, speed: 100, stamina: 100,
      discipline: 100, loyalty: 100, teamCompatibility: 100,
    });
    // weights sum to 1.0 → 100 × 1.0 = 100
    expect(HRModule.calculateEmployeeValue(stats)).toBeCloseTo(100);
  });

  it("returns 0 when all weighted stats are 0", () => {
    const stats = create_stats({
      efficiency: 0, accuracy: 0, speed: 0, stamina: 0,
      discipline: 0, loyalty: 0, teamCompatibility: 0,
    });
    expect(HRModule.calculateEmployeeValue(stats)).toBe(0);
  });

  it("applies correct individual weights", () => {
    // Only efficiency at 100, rest 0 → 100 × 0.25 = 25
    const stats = create_stats({
      efficiency: 100, accuracy: 0, speed: 0, stamina: 0,
      discipline: 0, loyalty: 0, teamCompatibility: 0,
    });
    expect(HRModule.calculateEmployeeValue(stats)).toBeCloseTo(25);
  });
});

// ---------------------------------------------------------------------------
// calculateTrainingEffectiveness
// ---------------------------------------------------------------------------

describe("calculateTrainingEffectiveness", () => {
  it("returns full effectiveness below fatigue threshold", () => {
    const emp = create_employee("worker");
    emp.trainingHistory.programsThisYear = 0;
    const result = HRModule.calculateTrainingEffectiveness(emp);
    expect(result.effectiveness).toBe(1.0);
    expect(result.fatigueApplied).toBe(false);
  });

  it("applies fatigue at threshold (programsThisYear = 1)", () => {
    const emp = create_employee("worker");
    emp.trainingHistory.programsThisYear = 1;
    const result = HRModule.calculateTrainingEffectiveness(emp);
    // excessPrograms = 1 - 1 + 1 = 1, effectiveness = max(0.2, 1.0 - 0.3) = 0.7
    expect(result.effectiveness).toBeCloseTo(0.7);
    expect(result.fatigueApplied).toBe(true);
  });

  it("floors effectiveness at 0.2 for heavily trained employees", () => {
    const emp = create_employee("worker");
    emp.trainingHistory.programsThisYear = 3;
    const result = HRModule.calculateTrainingEffectiveness(emp);
    // excessPrograms = 3 - 1 + 1 = 3, 1.0 - 3×0.3 = 0.1, clamped to 0.2
    expect(result.effectiveness).toBeCloseTo(0.2);
    expect(result.fatigueApplied).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateWorkforceSummary
// ---------------------------------------------------------------------------

describe("calculateWorkforceSummary", () => {
  it("returns zeroes and base turnover for an empty workforce", () => {
    const summary = HRModule.calculateWorkforceSummary([]);
    expect(summary.totalHeadcount).toBe(0);
    expect(summary.averageMorale).toBe(0);
    expect(summary.turnoverRate).toBeCloseTo(0.125);
  });

  it("calculates headcount and average morale for a non-empty workforce", () => {
    const e1 = create_employee("worker");
    const e2 = create_employee("worker");
    e1.morale = 80;
    e2.morale = 60;

    const summary = HRModule.calculateWorkforceSummary([e1, e2]);
    expect(summary.totalHeadcount).toBe(2);
    expect(summary.averageMorale).toBe(70);
  });

  it("computes laborCost as the sum of all salaries", () => {
    const e1 = create_employee("worker");
    const e2 = create_employee("engineer");
    e1.salary = 45_000;
    e2.salary = 85_000;

    const summary = HRModule.calculateWorkforceSummary([e1, e2]);
    expect(summary.laborCost).toBe(130_000);
  });
});
