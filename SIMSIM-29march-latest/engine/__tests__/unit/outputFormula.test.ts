/**
 * P31: Output Formula & Understaffing Tests
 */
import { describe, it, expect } from "vitest";
import {
  calculateLineOutput,
  getLineWorkerRequirements,
  getUnderstaffingRatio,
} from "../../modules/ProductionLineManager";
import { createTestState, createTestMachine } from "./testHelpers";

describe("Worker Requirements", () => {
  it("calculates required workers from target and efficiency", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.targetOutput = 8000;
    line.assignedMachines = ["m1", "m2", "m3", "m4", "m5", "m6"];

    // getLineWorkerRequirements(line, efficiency, machineCapacity, laborReduction)
    // With no machineCapacity passed, falls back to targetOutput
    const reqs = getLineWorkerRequirements(line, 80);
    // requiredWorkers = ceil(8000 / (5000 * 0.8)) = ceil(2) = 2
    expect(reqs.requiredWorkers).toBe(Math.ceil(8000 / (5000 * 0.8)));
    expect(reqs.requiredEngineers).toBe(Math.ceil(6 / 3)); // 2
  });

  it("requires at least 1 engineer per 3 machines", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.assignedMachines = ["m1"]; // 1 machine
    const reqs1 = getLineWorkerRequirements(line);
    expect(reqs1.requiredEngineers).toBe(1);

    line.assignedMachines = ["m1", "m2", "m3"]; // 3 machines
    const reqs3 = getLineWorkerRequirements(line);
    expect(reqs3.requiredEngineers).toBe(1);

    line.assignedMachines = ["m1", "m2", "m3", "m4"]; // 4 machines
    const reqs4 = getLineWorkerRequirements(line);
    expect(reqs4.requiredEngineers).toBe(2);
  });
});

describe("Understaffing Ratio", () => {
  it("100% staffed = full output (ratio 1.0)", () => {
    expect(getUnderstaffingRatio(100, 100)).toBe(1.0);
  });

  it("110% staffed = still 1.0 (no bonus for overstaffing)", () => {
    expect(getUnderstaffingRatio(110, 100)).toBe(1.0);
  });

  it("90% staffed = 0.90 (linear degradation)", () => {
    expect(getUnderstaffingRatio(90, 100)).toBeCloseTo(0.9, 2);
  });

  it("80% staffed = 0.80 (linear boundary)", () => {
    expect(getUnderstaffingRatio(80, 100)).toBeCloseTo(0.8, 2);
  });

  it("60% staffed = 0.60 × 0.85 (compounding penalty)", () => {
    expect(getUnderstaffingRatio(60, 100)).toBeCloseTo(0.6 * 0.85, 2);
  });

  it("50% staffed = 0.50 × 0.85 (still running but stressed)", () => {
    expect(getUnderstaffingRatio(50, 100)).toBeCloseTo(0.5 * 0.85, 2);
  });

  it("40% staffed = 0 (shutdown — below 50%)", () => {
    expect(getUnderstaffingRatio(40, 100)).toBe(0);
  });

  it("0% staffed = 0 (shutdown)", () => {
    expect(getUnderstaffingRatio(0, 100)).toBe(0);
  });

  it("0 required = ratio 1.0 (no workers needed)", () => {
    expect(getUnderstaffingRatio(0, 0)).toBe(1.0);
  });
});

describe("Output Formula", () => {
  it("idle line produces 0", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0]; // idle
    const result = calculateLineOutput(state, line);
    expect(result.projectedOutput).toBe(0);
    expect(result.bottleneck).toBe("none");
  });

  it("active line output = min(machine, worker, target) × efficiency", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    line.targetOutput = 5000;
    line.assignedWorkers = 100;
    line.assignedEngineers = 2;
    line.assignedSupervisors = 7;

    // Set up machines with 8000 capacity
    const m1 = createTestMachine("assembly_line", "factory-1", "m1", 8000);
    m1.assignedLineId = line.id;
    state.machineryStates = {
      "factory-1": { machines: [m1], totalCapacity: 8000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100 },
    };
    line.assignedMachines = ["m1"];

    const result = calculateLineOutput(state, line, 0.8);
    // min(8000, workerCap, 5000) × 0.8 × staffing
    expect(result.projectedOutput).toBeGreaterThan(0);
    expect(result.projectedOutput).toBeLessThanOrEqual(5000);
  });

  it("machine capacity is bottleneck when lowest", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    line.targetOutput = 10000;
    line.assignedWorkers = 200; // huge worker pool
    line.assignedEngineers = 5;
    line.assignedSupervisors = 15;

    // Small machine capacity
    const m1 = createTestMachine("assembly_line", "factory-1", "m1", 2000);
    m1.assignedLineId = line.id;
    state.machineryStates = {
      "factory-1": { machines: [m1], totalCapacity: 2000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100 },
    };
    line.assignedMachines = ["m1"];

    const result = calculateLineOutput(state, line, 0.8);
    expect(result.bottleneck).toBe("machines");
    expect(result.machineCapacity).toBe(2000);
  });

  it("efficiency layering: bonuses multiply ON TOP of base", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    line.targetOutput = 1000;
    line.assignedWorkers = 50;
    line.assignedEngineers = 2;
    line.assignedSupervisors = 4;

    const m1 = createTestMachine("assembly_line", "factory-1", "m1", 5000);
    m1.assignedLineId = line.id;
    state.machineryStates = {
      "factory-1": { machines: [m1], totalCapacity: 5000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100 },
    };
    line.assignedMachines = ["m1"];

    // Without bonuses
    const resultBase = calculateLineOutput(state, line, 0.8, {});
    // With bonuses
    const resultBonus = calculateLineOutput(state, line, 0.8, {
      trainingBonus: 0.05,
      rdBonus: 0.03,
      modernizationBonus: 0.02,
      esgSocialBonus: 0.05,
    });

    expect(resultBonus.efficiency).toBeGreaterThan(resultBase.efficiency);
    expect(resultBonus.efficiency).toBeCloseTo(0.8 * (1 + 0.05 + 0.03 + 0.02 + 0.05), 4);
  });

  it("shutdown when workers < 50% of required", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    // Need machineCapacity high enough that 10 workers < 50% of required
    // requiredWorkers = ceil(500000 / (5000 * 0.8)) = 125. 10/125 = 8% → shutdown
    line.targetOutput = 500000;
    line.assignedWorkers = 10; // Way too few — 10/125 = 8%
    line.assignedEngineers = 1;
    line.assignedSupervisors = 1;

    const m1 = createTestMachine("assembly_line", "factory-1", "m1", 500000);
    m1.assignedLineId = line.id;
    state.machineryStates = {
      "factory-1": { machines: [m1], totalCapacity: 500000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100 },
    };
    line.assignedMachines = ["m1"];

    const result = calculateLineOutput(state, line, 0.8);
    expect(result.projectedOutput).toBe(0);
    expect(result.bottleneck).toBe("workers");
  });
});
