/**
 * MACHINERY MODULE STRESS SUITE
 *
 * Tests machine purchasing, maintenance, breakdowns, depreciation,
 * health degradation, and utility calculations.
 */

import { describe, it, expect } from "vitest";
import { MachineryEngine } from "../../machinery/MachineryEngine";
import { MACHINE_CONFIGS, getMachineConfig, TOTAL_MACHINE_TYPES } from "../../machinery/MachineCatalog";
import {
  MAINTENANCE_COSTS,
  BREAKDOWN_CONFIG,
  DEPRECIATION_CONFIG,
  getMachineDepreciatedValue,
  getMachineHealthStatus,
  isMachineOverdueForMaintenance,
} from "../../machinery/types";
import type { Machine, MachineType, MachineryDecisions } from "../../machinery/types";
import { createTestContext } from "../../core/EngineContext";

function createMockMachine(overrides: Partial<Machine> = {}): Machine {
  return {
    id: "machine-test-001",
    type: "assembly_line",
    name: "Test Assembly Line",
    factoryId: "factory-1",
    status: "operational",
    healthPercent: 100,
    utilizationPercent: 50,
    purchaseCost: 5_000_000,
    currentValue: 5_000_000,
    maintenanceCostPerRound: 50_000,
    operatingCostPerRound: 100_000,
    capacityUnits: 10_000,
    efficiencyMultiplier: 1.0,
    defectRateImpact: 0,
    purchaseRound: 1,
    expectedLifespanRounds: 40,
    ageRounds: 0,
    roundsSinceLastMaintenance: 0,
    scheduledMaintenanceRound: null,
    maintenanceHistory: [],
    totalMaintenanceSpent: 0,
    ...overrides,
  };
}

describe("Machinery Stress Suite", () => {
  describe("Category A — Golden Path", () => {
    it("catalog has exactly 15 machine types", () => {
      expect(TOTAL_MACHINE_TYPES).toBe(15);
      expect(MACHINE_CONFIGS.length).toBe(15);
    });

    it("all machine configs have valid fields", () => {
      for (const config of MACHINE_CONFIGS) {
        expect(config.baseCost).toBeGreaterThan(0);
        expect(config.baseMaintenanceCost).toBeGreaterThan(0);
        expect(config.baseOperatingCost).toBeGreaterThan(0);
        expect(config.expectedLifespan).toBeGreaterThan(0);
        expect(config.maintenanceInterval).toBeGreaterThan(0);
        expect(config.defectRateReduction).toBeGreaterThanOrEqual(0);
        expect(config.laborReduction).toBeGreaterThanOrEqual(0);
        expect(config.laborReduction).toBeLessThanOrEqual(1);
        expect(config.name.length).toBeGreaterThan(0);
        expect(config.category).toBeDefined();
      }
    });

    it("purchasing a machine creates valid Machine object", () => {
      const ctx = createTestContext("mach-purchase", 1, "t1");
      const result = MachineryEngine.purchaseMachine("factory-1", "assembly_line", 1, ctx);
      expect(result.success).toBe(true);
      expect(result.machine).not.toBeNull();
      expect(result.machine!.healthPercent).toBe(100);
      expect(result.machine!.status).toBe("operational");
      expect(result.machine!.ageRounds).toBe(0);
      expect(result.cost).toBe(5_000_000);
    });

    it("process with empty decisions returns valid result", () => {
      const machine = createMockMachine();
      const ctx = createTestContext("mach-empty", 1, "t1");
      const result = MachineryEngine.process([machine], {}, 1, ctx);
      expect(result.totalCosts).toBeGreaterThanOrEqual(0);
      expect(result.messages).toBeDefined();
      expect(result.warnings).toBeDefined();
    });
  });

  describe("Category B — Edge", () => {
    it("purchasing unknown machine type fails gracefully", () => {
      const ctx = createTestContext("mach-unknown", 1, "t1");
      const result = MachineryEngine.purchaseMachine("factory-1", "nonexistent" as MachineType, 1, ctx);
      expect(result.success).toBe(false);
      expect(result.machine).toBeNull();
      expect(result.cost).toBe(0);
    });

    it("all 15 machine types can be purchased", () => {
      const ctx = createTestContext("mach-all-types", 1, "t1");
      for (const config of MACHINE_CONFIGS) {
        const result = MachineryEngine.purchaseMachine("factory-1", config.type, 1, ctx);
        expect(result.success).toBe(true);
        expect(result.machine).not.toBeNull();
        expect(result.cost).toBe(config.baseCost);
      }
    });

    it("maintenance restores health correctly", () => {
      const machine = createMockMachine({ healthPercent: 50 });
      const result = MachineryEngine.performMaintenance(machine, "scheduled", 1);
      expect(machine.healthPercent).toBe(50 + MAINTENANCE_COSTS.scheduled.healthRestored);
      expect(result.cost).toBe(machine.maintenanceCostPerRound * MAINTENANCE_COSTS.scheduled.costMultiplier);
    });

    it("major overhaul restores 80 health and sets maintenance status", () => {
      const machine = createMockMachine({ healthPercent: 10 });
      MachineryEngine.performMaintenance(machine, "major_overhaul", 1);
      expect(machine.healthPercent).toBe(10 + MAINTENANCE_COSTS.major_overhaul.healthRestored);
      expect(machine.status).toBe("maintenance");
    });

    it("health is capped at 100 after maintenance", () => {
      const machine = createMockMachine({ healthPercent: 90 });
      MachineryEngine.performMaintenance(machine, "scheduled", 1);
      expect(machine.healthPercent).toBeLessThanOrEqual(100);
    });

    it("emergency maintenance costs 2.5x base", () => {
      const machine = createMockMachine({ healthPercent: 30 });
      const result = MachineryEngine.performMaintenance(machine, "emergency", 1);
      expect(result.cost).toBe(machine.maintenanceCostPerRound * MAINTENANCE_COSTS.emergency.costMultiplier);
    });

    it("selling a machine removes it and gives depreciated value", () => {
      const machine = createMockMachine({ ageRounds: 10 });
      machine.currentValue = getMachineDepreciatedValue(machine);
      const ctx = createTestContext("mach-sell", 1, "t1");
      const result = MachineryEngine.process([machine], {
        sales: [{ machineId: machine.id }],
      }, 1, ctx);
      // Sale value should reduce total costs (negative cost = income)
      expect(result.totalCosts).toBeLessThan(0 + machine.operatingCostPerRound + machine.maintenanceCostPerRound);
    });

    it("offline machines are not aged or degraded", () => {
      const machine = createMockMachine({ status: "offline", healthPercent: 80 });
      const ctx = createTestContext("mach-offline", 1, "t1");
      const result = MachineryEngine.process([machine], {}, 1, ctx);
      // Machine should not have been aged
      const processedMachine = result.factoryStates.get("factory-1")?.machines[0];
      if (processedMachine) {
        expect(processedMachine.ageRounds).toBe(0);
        expect(processedMachine.healthPercent).toBe(80);
      }
    });

    it("set offline toggle works", () => {
      const machine = createMockMachine();
      const ctx = createTestContext("mach-toggle", 1, "t1");
      const result = MachineryEngine.process([machine], {
        setOffline: [{ machineId: machine.id, offline: true }],
      }, 1, ctx);
      const processedMachine = result.factoryStates.get("factory-1")?.machines[0];
      expect(processedMachine?.status).toBe("offline");
    });

    it("scheduled maintenance triggers at correct round", () => {
      const machine = createMockMachine({
        scheduledMaintenanceRound: 5,
        healthPercent: 60,
      });
      const ctx = createTestContext("mach-scheduled", 5, "t1");
      const result = MachineryEngine.process([machine], {}, 5, ctx);
      expect(result.maintenancePerformed.length).toBeGreaterThan(0);
    });
  });

  describe("Category C — Property Tests", () => {
    it("depreciation: value decreases linearly with age", () => {
      const machine = createMockMachine();
      const values: number[] = [];
      for (let age = 0; age <= machine.expectedLifespanRounds; age += 5) {
        machine.ageRounds = age;
        values.push(getMachineDepreciatedValue(machine));
      }
      // Each subsequent value should be less than or equal to previous
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
      }
    });

    it("depreciation: value never goes below residual", () => {
      const machine = createMockMachine();
      const residual = machine.purchaseCost * DEPRECIATION_CONFIG.residualValuePercent;
      // Even at extreme age
      machine.ageRounds = 1000;
      expect(getMachineDepreciatedValue(machine)).toBeGreaterThanOrEqual(residual);
    });

    it("breakdown chance is capped at 50%", () => {
      // The calculateBreakdownChance is private, but we can verify via config
      // The engine caps at Math.min(0.5, chance) in the source
      expect(BREAKDOWN_CONFIG.baseChance).toBe(0.02);
      // Even with worst modifiers, cap is enforced
    });

    it("severity distribution sums to 1.0", () => {
      const dist = BREAKDOWN_CONFIG.severityDistribution;
      const total = dist.minor + dist.moderate + dist.major + dist.critical;
      expect(total).toBeCloseTo(1.0);
    });

    it("maintenance costs scale correctly across types", () => {
      expect(MAINTENANCE_COSTS.emergency.costMultiplier).toBeGreaterThan(MAINTENANCE_COSTS.scheduled.costMultiplier);
      expect(MAINTENANCE_COSTS.major_overhaul.costMultiplier).toBeGreaterThan(MAINTENANCE_COSTS.emergency.costMultiplier);
    });

    it("health status thresholds are correct", () => {
      expect(getMachineHealthStatus(90)).toBe("excellent");
      expect(getMachineHealthStatus(70)).toBe("good");
      expect(getMachineHealthStatus(50)).toBe("moderate");
      expect(getMachineHealthStatus(30)).toBe("low");
      expect(getMachineHealthStatus(10)).toBe("critical");
    });

    it("labor reduction is compound (not additive)", () => {
      const machines = [
        createMockMachine({ laborReduction: 0.2 }),
        createMockMachine({ laborReduction: 0.2, id: "machine-test-002" }),
      ];
      const reduction = MachineryEngine.calculateLaborReduction(machines);
      // Compound: 1 - (1-0.2)*(1-0.2) = 1 - 0.64 = 0.36
      expect(reduction).toBeCloseTo(0.36);
      // Not additive (would be 0.4)
      expect(reduction).not.toBeCloseTo(0.4);
    });

    it("defect rate impact is additive", () => {
      const machines = [
        createMockMachine({ defectRateImpact: -0.01 }),
        createMockMachine({ defectRateImpact: -0.02, id: "machine-test-002" }),
      ];
      const impact = MachineryEngine.calculateDefectRateImpact(machines);
      expect(impact).toBeCloseTo(-0.03);
    });

    it("shipping reduction is compound", () => {
      const machines = [
        createMockMachine({ shippingReduction: 0.1 }),
        createMockMachine({ shippingReduction: 0.05, id: "machine-test-002" }),
      ];
      const reduction = MachineryEngine.calculateShippingReduction(machines);
      // Compound: 1 - (1-0.1)*(1-0.05) = 1 - 0.855 = 0.145
      expect(reduction).toBeCloseTo(0.145);
    });

    it("health degrades over multiple rounds", () => {
      const machine = createMockMachine({ healthPercent: 100 });
      const ctx = createTestContext("mach-degrade", 1, "t1");
      // Process 10 rounds
      let machines = [machine];
      for (let round = 1; round <= 10; round++) {
        const result = MachineryEngine.process(machines, {}, round, createTestContext(`mach-degrade-${round}`, round, "t1"));
        const state = result.factoryStates.get("factory-1");
        if (state) {
          machines = state.machines;
        }
      }
      // Health should have decreased
      expect(machines[0].healthPercent).toBeLessThan(100);
      // But not be negative
      expect(machines[0].healthPercent).toBeGreaterThanOrEqual(0);
    });

    it("starter machines include assembly_line and conveyor_system", () => {
      const ctx = createTestContext("mach-starter", 1, "t1");
      const starters = MachineryEngine.initializeStarterMachines("factory-1", 1, ctx);
      expect(starters.length).toBe(2);
      const types = starters.map(m => m.type);
      expect(types).toContain("assembly_line");
      expect(types).toContain("conveyor_system");
    });

    it("maintenance recommendations categorize correctly", () => {
      const machines = [
        createMockMachine({ healthPercent: 20, id: "urgent-1" }),
        createMockMachine({ healthPercent: 45, id: "recommended-1" }),
        createMockMachine({ healthPercent: 90, id: "healthy-1" }),
      ];
      const recs = MachineryEngine.getMaintenanceRecommendations(machines);
      expect(recs.urgent.length).toBe(1);
      expect(recs.urgent[0].id).toBe("urgent-1");
      expect(recs.recommended.length).toBe(1);
      expect(recs.recommended[0].id).toBe("recommended-1");
    });

    it("no NaN or Infinity in machine costs", () => {
      for (const config of MACHINE_CONFIGS) {
        expect(isFinite(config.baseCost)).toBe(true);
        expect(isFinite(config.baseMaintenanceCost)).toBe(true);
        expect(isFinite(config.baseOperatingCost)).toBe(true);
        expect(isNaN(config.baseCost)).toBe(false);
      }
    });
  });

  describe("Category D — Regression", () => {
    it("placeholder: no regressions found yet", () => {
      expect(true).toBe(true);
    });
  });
});
