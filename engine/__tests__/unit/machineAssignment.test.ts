/**
 * P30: Machine Assignment & Sharing Tests
 */
import { describe, it, expect } from "vitest";
import { isSharedMachineType, SHARED_MACHINE_TYPES } from "../../machinery/types";
import {
  assignMachineToLine,
  unassignMachineFromLine,
  getLineMachineCapacity,
  getSharedMachineCapacity,
  calculateSharedBottleneckScaling,
  assignProductToLine,
} from "../../modules/ProductionLineManager";
import { createTestState, createTestMachine } from "./testHelpers";

describe("Machine Sharing Categories", () => {
  it("packaging_system is shared", () => {
    expect(isSharedMachineType("packaging_system")).toBe(true);
  });

  it("quality_scanner is shared", () => {
    expect(isSharedMachineType("quality_scanner")).toBe(true);
  });

  it("testing_rig is shared", () => {
    expect(isSharedMachineType("testing_rig")).toBe(true);
  });

  it("conveyor_system is shared", () => {
    expect(isSharedMachineType("conveyor_system")).toBe(true);
  });

  it("forklift_fleet is shared", () => {
    expect(isSharedMachineType("forklift_fleet")).toBe(true);
  });

  it("assembly_line is NOT shared (line-locked)", () => {
    expect(isSharedMachineType("assembly_line")).toBe(false);
  });

  it("cnc_machine is NOT shared (line-locked)", () => {
    expect(isSharedMachineType("cnc_machine")).toBe(false);
  });

  it("robotic_arm is NOT shared (line-locked)", () => {
    expect(isSharedMachineType("robotic_arm")).toBe(false);
  });

  it("exactly 5 shared machine types", () => {
    expect(SHARED_MACHINE_TYPES.size).toBe(5);
  });
});

describe("Machine Assignment to Lines", () => {
  it("line-locked machine can be assigned to a line", () => {
    const state = createTestState();
    state.machineryStates = {
      "factory-1": {
        machines: [createTestMachine("assembly_line", "factory-1", "m1")],
        totalCapacity: 5000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100,
      },
    };

    const result = assignMachineToLine(state, "m1", "factory-1-line-0");
    expect(result.success).toBe(true);
  });

  it("shared machine cannot be assigned to a line", () => {
    const state = createTestState();
    state.machineryStates = {
      "factory-1": {
        machines: [createTestMachine("packaging_system", "factory-1", "m1")],
        totalCapacity: 0, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100,
      },
    };

    const result = assignMachineToLine(state, "m1", "factory-1-line-0");
    expect(result.success).toBe(false);
    expect(result.message).toContain("shared");
  });

  it("assigning already-assigned machine to different line fails", () => {
    const state = createTestState();
    const machine = createTestMachine("assembly_line", "factory-1", "m1");
    machine.assignedLineId = "factory-1-line-1";
    state.machineryStates = {
      "factory-1": {
        machines: [machine],
        totalCapacity: 5000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100,
      },
    };

    const result = assignMachineToLine(state, "m1", "factory-1-line-0");
    expect(result.success).toBe(false);
    expect(result.message).toContain("already assigned");
  });

  it("machine not in factory fails", () => {
    const state = createTestState();
    state.machineryStates = { "factory-1": { machines: [], totalCapacity: 0, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100 } };

    const result = assignMachineToLine(state, "nonexistent", "factory-1-line-0");
    expect(result.success).toBe(false);
    expect(result.message).toContain("not found");
  });

  it("getLineMachineCapacity returns BOTTLENECK (min) of locked machines on that line", () => {
    const state = createTestState();
    const m1 = createTestMachine("assembly_line", "factory-1", "m1", 5000);
    m1.assignedLineId = "factory-1-line-0";
    const m2 = createTestMachine("cnc_machine", "factory-1", "m2", 3000);
    m2.assignedLineId = "factory-1-line-0";
    const m3 = createTestMachine("assembly_line", "factory-1", "m3", 5000);
    m3.assignedLineId = "factory-1-line-1"; // different line

    state.machineryStates = {
      "factory-1": {
        machines: [m1, m2, m3],
        totalCapacity: 13000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100,
      },
    };

    // Bottleneck: min(5000, 3000) = 3000 (CNC is the bottleneck)
    expect(getLineMachineCapacity(state, "factory-1-line-0")).toBe(3000);
    expect(getLineMachineCapacity(state, "factory-1-line-1")).toBe(5000); // m3 only
  });

  it("getSharedMachineCapacity sums all shared machines factory-wide", () => {
    const state = createTestState();
    state.machineryStates = {
      "factory-1": {
        machines: [
          createTestMachine("packaging_system", "factory-1", "s1", 10000),
          createTestMachine("quality_scanner", "factory-1", "s2", 8000),
          createTestMachine("assembly_line", "factory-1", "m1", 5000), // not shared
        ],
        totalCapacity: 23000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100,
      },
    };

    expect(getSharedMachineCapacity(state, "factory-1")).toBe(18000); // s1 + s2
  });

  it("shared bottleneck scales lines proportionally when over capacity", () => {
    const state = createTestState();
    // Set up lines with targets exceeding shared capacity
    state.factories[0].productionLines[0].status = "active";
    state.factories[0].productionLines[0].productId = "prod-1";
    state.factories[0].productionLines[0].targetOutput = 15000;
    state.factories[0].productionLines[1].status = "active";
    state.factories[0].productionLines[1].productId = "prod-2";
    state.factories[0].productionLines[1].targetOutput = 10000;
    // Total = 25000, shared cap = 20000

    state.machineryStates = {
      "factory-1": {
        machines: [createTestMachine("packaging_system", "factory-1", "s1", 20000)],
        totalCapacity: 20000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100,
      },
    };

    const scales = calculateSharedBottleneckScaling(state, "factory-1");
    const scale = scales["factory-1-line-0"];
    expect(scale).toBeCloseTo(0.8, 1); // 20000/25000 = 0.8
    expect(scales["factory-1-line-1"]).toBeCloseTo(0.8, 1);
  });

  it("no shared bottleneck when under capacity", () => {
    const state = createTestState();
    state.factories[0].productionLines[0].status = "active";
    state.factories[0].productionLines[0].productId = "prod-1";
    state.factories[0].productionLines[0].targetOutput = 5000;

    state.machineryStates = {
      "factory-1": {
        machines: [createTestMachine("packaging_system", "factory-1", "s1", 20000)],
        totalCapacity: 20000, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100,
      },
    };

    const scales = calculateSharedBottleneckScaling(state, "factory-1");
    expect(scales["factory-1-line-0"]).toBe(1.0);
  });
});
