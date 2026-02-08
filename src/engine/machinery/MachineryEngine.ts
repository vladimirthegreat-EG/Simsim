/**
 * Machinery Engine
 *
 * Core logic for machinery management including purchasing, maintenance,
 * breakdowns, and capacity calculations.
 */

import type { EngineContext } from "../core/EngineContext";
import type {
  Machine,
  MachineType,
  MachineStatus,
  MaintenanceType,
  MaintenanceRecord,
  MachineryDecisions,
  FactoryMachineryState,
  MachineryProcessResult,
  BreakdownEvent,
  MachineConfig,
} from "./types";
import {
  MAINTENANCE_COSTS,
  BREAKDOWN_CONFIG,
  getMachineDepreciatedValue,
  getMachineHealthStatus,
} from "./types";
import { getMachineConfig, MACHINE_CONFIGS } from "./MachineCatalog";

// ============================================
// MACHINERY ENGINE
// ============================================

export class MachineryEngine {
  /**
   * Process all machinery decisions for a round
   */
  static process(
    currentMachines: Machine[],
    decisions: MachineryDecisions,
    currentRound: number,
    ctx: EngineContext
  ): MachineryProcessResult {
    const messages: string[] = [];
    const warnings: string[] = [];
    let totalCosts = 0;

    // Clone machines array
    let machines = currentMachines.map(m => ({ ...m, maintenanceHistory: [...m.maintenanceHistory] }));

    // Process purchases
    if (decisions.purchases) {
      for (const purchase of decisions.purchases) {
        for (let i = 0; i < purchase.quantity; i++) {
          const result = this.purchaseMachine(
            purchase.factoryId,
            purchase.machineType,
            currentRound,
            ctx
          );
          if (result.success && result.machine) {
            machines.push(result.machine);
            totalCosts += result.cost;
            messages.push(result.message);
          } else {
            warnings.push(result.message);
          }
        }
      }
    }

    // Process sales
    if (decisions.sales) {
      for (const sale of decisions.sales) {
        const idx = machines.findIndex(m => m.id === sale.machineId);
        if (idx !== -1) {
          const machine = machines[idx];
          const saleValue = getMachineDepreciatedValue(machine);
          totalCosts -= saleValue; // Negative cost = income
          messages.push(`Sold ${machine.name} for $${(saleValue / 1_000_000).toFixed(2)}M`);
          machines.splice(idx, 1);
        }
      }
    }

    // Process offline toggles
    if (decisions.setOffline) {
      for (const offline of decisions.setOffline) {
        const machine = machines.find(m => m.id === offline.machineId);
        if (machine) {
          machine.status = offline.offline ? "offline" : "operational";
          messages.push(`${machine.name} ${offline.offline ? "taken offline" : "brought online"}`);
        }
      }
    }

    // Process scheduled maintenance
    if (decisions.maintenanceSchedules) {
      for (const schedule of decisions.maintenanceSchedules) {
        const machine = machines.find(m => m.id === schedule.machineId);
        if (machine) {
          machine.scheduledMaintenanceRound = schedule.scheduledRound;
          messages.push(`Scheduled ${schedule.type} maintenance for ${machine.name} in round ${schedule.scheduledRound}`);
        }
      }
    }

    // Process immediate maintenance
    const maintenancePerformed: MaintenanceRecord[] = [];
    if (decisions.performMaintenance) {
      for (const maint of decisions.performMaintenance) {
        const machine = machines.find(m => m.id === maint.machineId);
        if (machine) {
          const result = this.performMaintenance(machine, maint.type, currentRound);
          totalCosts += result.cost;
          maintenancePerformed.push(result.record);
          messages.push(result.message);
        }
      }
    }

    // Check for scheduled maintenance this round
    for (const machine of machines) {
      if (machine.scheduledMaintenanceRound === currentRound && machine.status !== "maintenance") {
        const result = this.performMaintenance(machine, "scheduled", currentRound);
        totalCosts += result.cost;
        maintenancePerformed.push(result.record);
        messages.push(`Performed scheduled maintenance on ${machine.name}`);
        machine.scheduledMaintenanceRound = null;
      }
    }

    // Age machines and degrade health
    for (const machine of machines) {
      if (machine.status !== "offline") {
        machine.ageRounds++;
        machine.roundsSinceLastMaintenance++;

        // Health degrades over time
        const degradation = this.calculateHealthDegradation(machine);
        machine.healthPercent = Math.max(0, machine.healthPercent - degradation);

        // Update depreciated value
        machine.currentValue = getMachineDepreciatedValue(machine);
      }
    }

    // Check for breakdowns
    const newBreakdowns: BreakdownEvent[] = [];
    const resolvedBreakdowns: string[] = [];

    for (const machine of machines) {
      if (machine.status === "offline") continue;

      // Check if machine breaks down
      const breakdownRoll = ctx.rng.factory.next();
      const breakdownChance = this.calculateBreakdownChance(machine);

      if (breakdownRoll < breakdownChance) {
        const breakdown = this.createBreakdown(machine, currentRound, ctx);
        newBreakdowns.push(breakdown);
        machine.status = "breakdown";
        machine.healthPercent = Math.max(0, machine.healthPercent - 20);
        warnings.push(`BREAKDOWN: ${machine.name} - ${breakdown.cause}`);
        totalCosts += breakdown.repairCost;
      }

      // Check for machines recovering from breakdown
      if (machine.status === "breakdown") {
        // Simple recovery: 50% chance to recover each round
        if (ctx.rng.factory.next() < 0.5) {
          machine.status = "operational";
          resolvedBreakdowns.push(machine.id);
          messages.push(`${machine.name} repaired and operational`);
        }
      }
    }

    // Health warnings
    for (const machine of machines) {
      if (machine.healthPercent < 20 && machine.status === "operational") {
        warnings.push(`CRITICAL: ${machine.name} health at ${machine.healthPercent.toFixed(0)}%`);
      } else if (machine.healthPercent < 40 && machine.status === "operational") {
        warnings.push(`WARNING: ${machine.name} health low at ${machine.healthPercent.toFixed(0)}%`);
      }
    }

    // Calculate operating costs
    for (const machine of machines) {
      if (machine.status === "operational") {
        totalCosts += machine.operatingCostPerRound + machine.maintenanceCostPerRound;
      } else if (machine.status === "maintenance") {
        totalCosts += machine.maintenanceCostPerRound * 0.5; // Reduced during maintenance
      }
    }

    // Build factory states
    const factoryStates = this.buildFactoryStates(machines, newBreakdowns);

    // Calculate totals
    const totalCapacity = machines
      .filter(m => m.status === "operational")
      .reduce((sum, m) => sum + m.capacityUnits, 0);

    return {
      factoryStates,
      totalCosts,
      totalCapacity,
      newBreakdowns,
      resolvedBreakdowns,
      maintenancePerformed,
      messages,
      warnings,
    };
  }

  /**
   * Purchase a new machine
   */
  static purchaseMachine(
    factoryId: string,
    machineType: MachineType,
    currentRound: number,
    ctx: EngineContext
  ): { success: boolean; machine: Machine | null; cost: number; message: string } {
    const config = getMachineConfig(machineType);
    if (!config) {
      return {
        success: false,
        machine: null,
        cost: 0,
        message: `Unknown machine type: ${machineType}`,
      };
    }

    const id = ctx.idGenerator.next("machine");
    const machine: Machine = {
      id,
      type: machineType,
      name: `${config.name} #${id.slice(-4)}`,
      factoryId,

      status: "operational",
      healthPercent: 100,
      utilizationPercent: 0,

      purchaseCost: config.baseCost,
      currentValue: config.baseCost,
      maintenanceCostPerRound: config.baseMaintenanceCost,
      operatingCostPerRound: config.baseOperatingCost,

      capacityUnits: config.baseCapacity,
      efficiencyMultiplier: 1.0,
      defectRateImpact: -config.defectRateReduction,

      purchaseRound: currentRound,
      expectedLifespanRounds: config.expectedLifespan,
      ageRounds: 0,
      roundsSinceLastMaintenance: 0,
      scheduledMaintenanceRound: null,

      maintenanceHistory: [],
      totalMaintenanceSpent: 0,

      laborReduction: config.laborReduction,
      shippingReduction: config.shippingReduction,
      specialtySegments: config.specialtySegments,
    };

    return {
      success: true,
      machine,
      cost: config.baseCost,
      message: `Purchased ${config.name} for $${(config.baseCost / 1_000_000).toFixed(1)}M`,
    };
  }

  /**
   * Perform maintenance on a machine
   */
  static performMaintenance(
    machine: Machine,
    type: MaintenanceType,
    currentRound: number
  ): { cost: number; record: MaintenanceRecord; message: string } {
    const config = MAINTENANCE_COSTS[type];
    const cost = machine.maintenanceCostPerRound * config.costMultiplier;

    // Restore health
    const oldHealth = machine.healthPercent;
    machine.healthPercent = Math.min(100, machine.healthPercent + config.healthRestored);

    // Update tracking
    machine.roundsSinceLastMaintenance = 0;
    machine.totalMaintenanceSpent += cost;

    const record: MaintenanceRecord = {
      round: currentRound,
      type,
      cost,
      healthRestored: machine.healthPercent - oldHealth,
      description: config.description,
    };

    machine.maintenanceHistory.push(record);

    // Set status during maintenance
    if (type === "major_overhaul") {
      machine.status = "maintenance";
    }

    return {
      cost,
      record,
      message: `${type} maintenance on ${machine.name}: +${config.healthRestored}% health, $${(cost / 1_000).toFixed(0)}K`,
    };
  }

  /**
   * Calculate health degradation per round
   */
  private static calculateHealthDegradation(machine: Machine): number {
    const machineConfig = getMachineConfig(machine.type);
    if (!machineConfig) return 1;

    let degradation = 1; // Base 1% per round

    // Age factor
    if (machine.ageRounds > machine.expectedLifespanRounds * 0.5) {
      degradation += 0.5; // +0.5% after half life
    }
    if (machine.ageRounds > machine.expectedLifespanRounds * 0.75) {
      degradation += 1; // +1% after 75% life
    }
    if (machine.ageRounds > machine.expectedLifespanRounds) {
      degradation += 2; // +2% past expected life
    }

    // Maintenance factor
    const overdueRounds = machine.roundsSinceLastMaintenance - machineConfig.maintenanceInterval;
    if (overdueRounds > 0) {
      degradation += overdueRounds * 0.5; // +0.5% per overdue round
    }

    // Utilization factor (high utilization = more wear)
    if (machine.utilizationPercent > 90) {
      degradation += 1;
    }

    return degradation;
  }

  /**
   * Calculate breakdown chance
   */
  private static calculateBreakdownChance(machine: Machine): number {
    const config = getMachineConfig(machine.type);
    if (!config) return BREAKDOWN_CONFIG.baseChance;

    let chance = BREAKDOWN_CONFIG.baseChance;

    // Health modifier
    const healthStatus = getMachineHealthStatus(machine.healthPercent);
    const healthMod = BREAKDOWN_CONFIG.healthModifiers[healthStatus as keyof typeof BREAKDOWN_CONFIG.healthModifiers];
    if (healthMod) {
      chance *= healthMod.multiplier;
    }

    // Age modifier
    if (machine.ageRounds > machine.expectedLifespanRounds) {
      const overAge = machine.ageRounds - machine.expectedLifespanRounds;
      chance += overAge * BREAKDOWN_CONFIG.ageMultiplier;
    }

    // Maintenance modifier
    const overdueRounds = machine.roundsSinceLastMaintenance - config.maintenanceInterval;
    if (overdueRounds > 0) {
      chance += overdueRounds * BREAKDOWN_CONFIG.overdueMaintenanceMultiplier;
    }

    // Cap at 50%
    return Math.min(0.5, chance);
  }

  /**
   * Create a breakdown event
   */
  private static createBreakdown(
    machine: Machine,
    currentRound: number,
    ctx: EngineContext
  ): BreakdownEvent {
    // Determine severity
    const roll = ctx.rng.factory.next();
    let severity: "minor" | "moderate" | "major" | "critical";

    const dist = BREAKDOWN_CONFIG.severityDistribution;
    if (roll < dist.minor) {
      severity = "minor";
    } else if (roll < dist.minor + dist.moderate) {
      severity = "moderate";
    } else if (roll < dist.minor + dist.moderate + dist.major) {
      severity = "major";
    } else {
      severity = "critical";
    }

    // Worse health = worse breakdowns
    if (machine.healthPercent < 30 && severity === "minor") {
      severity = "moderate";
    }
    if (machine.healthPercent < 15 && severity !== "critical") {
      severity = "major";
    }

    const impact = BREAKDOWN_CONFIG.severityImpacts[severity];
    const causes = BREAKDOWN_CONFIG.causes[severity];
    const cause = causes[Math.floor(ctx.rng.factory.next() * causes.length)];

    return {
      machineId: machine.id,
      machineName: machine.name,
      factoryId: machine.factoryId,
      severity,
      cause,
      productionLoss: impact.productionLoss,
      repairCost: machine.maintenanceCostPerRound * impact.repairCostMultiplier,
      roundsToRepair: impact.roundsToRepair,
    };
  }

  /**
   * Build factory machinery states
   */
  private static buildFactoryStates(
    machines: Machine[],
    newBreakdowns: BreakdownEvent[]
  ): Map<string, FactoryMachineryState> {
    const states = new Map<string, FactoryMachineryState>();

    // Group machines by factory
    const byFactory = new Map<string, Machine[]>();
    for (const machine of machines) {
      const list = byFactory.get(machine.factoryId) ?? [];
      list.push(machine);
      byFactory.set(machine.factoryId, list);
    }

    for (const [factoryId, factoryMachines] of byFactory) {
      const operational = factoryMachines.filter(m => m.status === "operational");

      const machinesByType: Record<string, number> = {};
      for (const machine of factoryMachines) {
        machinesByType[machine.type] = (machinesByType[machine.type] ?? 0) + 1;
      }

      const totalCapacity = operational.reduce((sum, m) => sum + m.capacityUnits, 0);
      const totalMaintenanceCost = factoryMachines.reduce((sum, m) => sum + m.maintenanceCostPerRound, 0);
      const totalOperatingCost = operational.reduce((sum, m) => sum + m.operatingCostPerRound, 0);
      const averageHealth = factoryMachines.length > 0
        ? factoryMachines.reduce((sum, m) => sum + m.healthPercent, 0) / factoryMachines.length
        : 100;

      const factoryBreakdowns = newBreakdowns.filter(b => b.factoryId === factoryId);
      const scheduledMaintenance = factoryMachines.filter(m => m.scheduledMaintenanceRound !== null);

      states.set(factoryId, {
        machines: factoryMachines,
        totalCapacity,
        totalMaintenanceCost,
        totalOperatingCost,
        averageHealth,
        machinesByType: machinesByType as Record<MachineType, number>,
        breakdownsThisRound: factoryBreakdowns,
        scheduledMaintenanceThisRound: scheduledMaintenance,
      });
    }

    return states;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Calculate total labor reduction from machines
   */
  static calculateLaborReduction(machines: Machine[]): number {
    const operational = machines.filter(m => m.status === "operational");
    // Compound reductions (not additive)
    let remaining = 1.0;
    for (const machine of operational) {
      if (machine.laborReduction) {
        remaining *= (1 - machine.laborReduction);
      }
    }
    return 1 - remaining;
  }

  /**
   * Calculate total defect rate impact from machines
   */
  static calculateDefectRateImpact(machines: Machine[]): number {
    const operational = machines.filter(m => m.status === "operational");
    return operational.reduce((sum, m) => sum + (m.defectRateImpact ?? 0), 0);
  }

  /**
   * Calculate total shipping reduction from machines
   */
  static calculateShippingReduction(machines: Machine[]): number {
    const operational = machines.filter(m => m.status === "operational");
    let remaining = 1.0;
    for (const machine of operational) {
      if (machine.shippingReduction) {
        remaining *= (1 - machine.shippingReduction);
      }
    }
    return 1 - remaining;
  }

  /**
   * Get recommended maintenance actions
   */
  static getMaintenanceRecommendations(machines: Machine[]): {
    urgent: Machine[];
    recommended: Machine[];
    scheduled: Machine[];
  } {
    const urgent: Machine[] = [];
    const recommended: Machine[] = [];
    const scheduled: Machine[] = [];

    for (const machine of machines) {
      if (machine.status === "offline") continue;

      const config = getMachineConfig(machine.type);
      if (!config) continue;

      if (machine.healthPercent < 30) {
        urgent.push(machine);
      } else if (machine.healthPercent < 50 ||
                 machine.roundsSinceLastMaintenance > config.maintenanceInterval) {
        recommended.push(machine);
      }

      if (machine.scheduledMaintenanceRound !== null) {
        scheduled.push(machine);
      }
    }

    return { urgent, recommended, scheduled };
  }

  /**
   * Initialize machines for a new factory
   */
  static initializeStarterMachines(
    factoryId: string,
    currentRound: number,
    ctx: EngineContext
  ): Machine[] {
    const machines: Machine[] = [];

    // Every factory starts with a basic assembly line and conveyor
    const starterTypes: MachineType[] = ["assembly_line", "conveyor_system"];

    for (const type of starterTypes) {
      const result = this.purchaseMachine(factoryId, type, currentRound, ctx);
      if (result.success && result.machine) {
        machines.push(result.machine);
      }
    }

    return machines;
  }
}
