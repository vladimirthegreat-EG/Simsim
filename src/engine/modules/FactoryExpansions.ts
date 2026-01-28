/**
 * Factory Module Expansions
 *
 * Additional factory systems for capacity utilization, maintenance,
 * breakdowns, and defect-brand impact.
 *
 * Phase 6: Factory Module Expansions
 */

import type { Factory } from "../types/factory";
import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export interface UtilizationState {
  utilization: number; // 0-1
  burnoutRisk: number; // 0-1, accumulates at >95% utilization
  burnoutLevel: number; // 0-100, current burnout
  overdriveRounds: number; // Consecutive rounds at >95%
}

export interface MaintenanceState {
  preventiveMaintenance: number; // Budget allocated
  emergencyReserve: number; // Budget for breakdowns
  maintenanceBacklog: number; // Deferred maintenance hours
  lastMajorService: number; // Round of last major service
  equipmentAge: number; // Rounds since factory built
  maintenanceEfficiency: number; // 0-1, how well maintained
}

export interface MaintenanceDecisions {
  preventiveMaintenance: number; // Budget for scheduled maintenance
  emergencyReserve: number; // Budget for breakdowns
  upgradeInvestment: number; // Modernization spending
  majorServiceScheduled: boolean;
}

export interface BreakdownEvent {
  id: string;
  factoryId: string;
  severity: "minor" | "moderate" | "major" | "critical";
  productionLoss: number; // 0-1, fraction of production lost
  repairCost: number;
  roundsToRepair: number;
  roundsRemaining: number;
  cause: string;
}

export interface DefectImpact {
  defectRate: number;
  unitsAffected: number;
  brandDamage: number;
  recallRequired: boolean;
  recallCost: number;
  qualityScore: number; // 0-100
}

export interface FactoryHealthResult {
  utilization: UtilizationState;
  maintenance: MaintenanceState;
  activeBreakdowns: BreakdownEvent[];
  newBreakdowns: BreakdownEvent[];
  resolvedBreakdowns: BreakdownEvent[];
  defectImpact: DefectImpact;
  effectiveCapacity: number;
  costImpact: number;
  messages: string[];
  warnings: string[];
}

// ============================================
// CONSTANTS
// ============================================

const BASE_BREAKDOWN_PROBABILITY = 0.03; // 3% per round
const BACKLOG_BREAKDOWN_FACTOR = 0.05; // +5% per 1000 hours backlog
const AGE_BREAKDOWN_FACTOR = 0.02; // +2% per 10 rounds age
const MAINTENANCE_PREVENTION_FACTOR = 0.02; // -2% per $1M maintenance

const UTILIZATION_BURNOUT_THRESHOLD = 0.95;
const BURNOUT_ACCUMULATION_RATE = 0.15; // +15% burnout per round at high utilization
const BURNOUT_DECAY_RATE = 0.05; // -5% burnout per round at normal utilization

const DEFECT_BRAND_DAMAGE_RATE = 0.001; // 0.1% brand damage per 1000 defective units
const RECALL_THRESHOLD = 0.10; // 10% defect rate triggers recall
const RECALL_COST_PER_UNIT = 50; // $50 per defective unit for recall

// ============================================
// ENGINE
// ============================================

export class FactoryExpansions {
  /**
   * Process factory health for a round
   */
  static processFactoryHealth(
    factory: Factory,
    state: TeamState,
    maintenanceDecisions: MaintenanceDecisions,
    previousUtilization: UtilizationState | null,
    previousMaintenance: MaintenanceState | null,
    activeBreakdowns: BreakdownEvent[],
    unitsProduced: number,
    config: EngineConfig,
    ctx: EngineContext
  ): FactoryHealthResult {
    const messages: string[] = [];
    const warnings: string[] = [];

    // Calculate current utilization
    const utilization = this.calculateUtilization(factory, previousUtilization);

    // Process maintenance
    const maintenance = this.processMaintenance(
      factory,
      maintenanceDecisions,
      previousMaintenance
    );

    // Check for new breakdowns
    const { newBreakdowns, resolvedBreakdowns, currentBreakdowns } = this.processBreakdowns(
      factory,
      activeBreakdowns,
      maintenance,
      utilization,
      config,
      ctx
    );

    for (const breakdown of newBreakdowns) {
      warnings.push(`Factory breakdown: ${breakdown.cause} - ${(breakdown.productionLoss * 100).toFixed(0)}% capacity lost`);
    }

    for (const resolved of resolvedBreakdowns) {
      messages.push(`Breakdown resolved: ${resolved.cause}`);
    }

    // Calculate defect impact
    const defectImpact = this.calculateDefectImpact(
      factory,
      unitsProduced,
      utilization,
      state.brandValue
    );

    if (defectImpact.recallRequired) {
      warnings.push(`Product recall required: ${defectImpact.unitsAffected.toLocaleString()} units affected`);
    } else if (defectImpact.defectRate > 0.05) {
      messages.push(`Elevated defect rate: ${(defectImpact.defectRate * 100).toFixed(1)}%`);
    }

    // Calculate effective capacity
    const effectiveCapacity = this.calculateEffectiveCapacity(
      factory,
      currentBreakdowns,
      utilization
    );

    // Calculate cost impact
    const costImpact = this.calculateCostImpact(
      maintenance,
      currentBreakdowns,
      defectImpact
    );

    // Utilization warnings
    if (utilization.utilization > 0.95) {
      warnings.push(`Factory at ${(utilization.utilization * 100).toFixed(0)}% capacity - burnout risk ${(utilization.burnoutRisk * 100).toFixed(0)}%`);
    } else if (utilization.utilization > 0.85) {
      messages.push(`Factory operating at ${(utilization.utilization * 100).toFixed(0)}% capacity`);
    }

    // Maintenance warnings
    if (maintenance.maintenanceBacklog > 500) {
      warnings.push(`Maintenance backlog at ${maintenance.maintenanceBacklog.toFixed(0)} hours - increased breakdown risk`);
    }

    return {
      utilization,
      maintenance,
      activeBreakdowns: currentBreakdowns,
      newBreakdowns,
      resolvedBreakdowns,
      defectImpact,
      effectiveCapacity,
      costImpact,
      messages,
      warnings,
    };
  }

  /**
   * Calculate capacity utilization
   */
  private static calculateUtilization(
    factory: Factory,
    previous: UtilizationState | null
  ): UtilizationState {
    // Calculate utilization from production lines
    const totalCapacity = factory.productionLines?.reduce(
      (sum, line) => sum + line.capacity,
      0
    ) ?? 100000;
    // Use efficiency as a proxy for utilization (0-1)
    const utilization = Math.min(1, factory.efficiency ?? 0.7);

    // Calculate burnout
    let burnoutRisk = previous?.burnoutRisk ?? 0;
    let burnoutLevel = previous?.burnoutLevel ?? 0;
    let overdriveRounds = previous?.overdriveRounds ?? 0;

    if (utilization > UTILIZATION_BURNOUT_THRESHOLD) {
      burnoutRisk = Math.min(1, burnoutRisk + BURNOUT_ACCUMULATION_RATE);
      burnoutLevel = Math.min(100, burnoutLevel + 10);
      overdriveRounds++;
    } else {
      burnoutRisk = Math.max(0, burnoutRisk - BURNOUT_DECAY_RATE);
      burnoutLevel = Math.max(0, burnoutLevel - 5);
      overdriveRounds = 0;
    }

    return {
      utilization,
      burnoutRisk,
      burnoutLevel,
      overdriveRounds,
    };
  }

  /**
   * Process maintenance state
   */
  private static processMaintenance(
    factory: Factory,
    decisions: MaintenanceDecisions,
    previous: MaintenanceState | null
  ): MaintenanceState {
    const equipmentAge = (previous?.equipmentAge ?? 0) + 1;
    let maintenanceBacklog = previous?.maintenanceBacklog ?? 0;
    let maintenanceEfficiency = previous?.maintenanceEfficiency ?? 0.8;

    // Backlog increases naturally with age and utilization
    const naturalBacklogIncrease = 10 + equipmentAge * 2;
    maintenanceBacklog += naturalBacklogIncrease;

    // Preventive maintenance reduces backlog
    const preventiveReduction = decisions.preventiveMaintenance / 10000; // $10k = 1 hour
    maintenanceBacklog = Math.max(0, maintenanceBacklog - preventiveReduction);

    // Major service clears significant backlog
    let lastMajorService = previous?.lastMajorService ?? 0;
    if (decisions.majorServiceScheduled) {
      maintenanceBacklog *= 0.3; // Reduces backlog by 70%
      maintenanceEfficiency = Math.min(1, maintenanceEfficiency + 0.1);
      lastMajorService = 0; // Reset counter
    } else {
      lastMajorService++;
    }

    // Maintenance efficiency decays without investment
    if (decisions.preventiveMaintenance < 500000) {
      maintenanceEfficiency = Math.max(0.5, maintenanceEfficiency - 0.02);
    }

    // Upgrade investment improves efficiency
    if (decisions.upgradeInvestment > 0) {
      const efficiencyGain = Math.min(0.1, decisions.upgradeInvestment / 10_000_000);
      maintenanceEfficiency = Math.min(1, maintenanceEfficiency + efficiencyGain);
    }

    return {
      preventiveMaintenance: decisions.preventiveMaintenance,
      emergencyReserve: decisions.emergencyReserve,
      maintenanceBacklog,
      lastMajorService,
      equipmentAge,
      maintenanceEfficiency,
    };
  }

  /**
   * Process breakdowns
   */
  private static processBreakdowns(
    factory: Factory,
    activeBreakdowns: BreakdownEvent[],
    maintenance: MaintenanceState,
    utilization: UtilizationState,
    config: EngineConfig,
    ctx: EngineContext
  ): {
    newBreakdowns: BreakdownEvent[];
    resolvedBreakdowns: BreakdownEvent[];
    currentBreakdowns: BreakdownEvent[];
  } {
    const newBreakdowns: BreakdownEvent[] = [];
    const resolvedBreakdowns: BreakdownEvent[] = [];

    // Process existing breakdowns
    const currentBreakdowns = activeBreakdowns.filter((b) => {
      if (b.factoryId !== factory.id) return true;

      b.roundsRemaining--;
      if (b.roundsRemaining <= 0) {
        resolvedBreakdowns.push(b);
        return false;
      }
      return true;
    });

    // Calculate breakdown probability
    let breakdownProb = BASE_BREAKDOWN_PROBABILITY;

    // Backlog factor
    breakdownProb += (maintenance.maintenanceBacklog / 1000) * BACKLOG_BREAKDOWN_FACTOR;

    // Age factor
    breakdownProb += (maintenance.equipmentAge / 10) * AGE_BREAKDOWN_FACTOR;

    // Burnout factor
    if (utilization.burnoutLevel > 50) {
      breakdownProb += (utilization.burnoutLevel - 50) / 100 * 0.1;
    }

    // Maintenance prevention
    breakdownProb -= (maintenance.preventiveMaintenance / 1_000_000) * MAINTENANCE_PREVENTION_FACTOR;

    // Maintenance efficiency
    breakdownProb *= (2 - maintenance.maintenanceEfficiency);

    // Apply difficulty multiplier
    breakdownProb *= config.difficulty.disruptions.frequencyMultiplier;

    // Clamp probability
    breakdownProb = Math.max(0.01, Math.min(0.5, breakdownProb));

    // Check for breakdown
    if (ctx.rng.factory.chance(breakdownProb)) {
      const severity = this.determineBreakdownSeverity(
        maintenance,
        utilization,
        config,
        ctx
      );

      const breakdown = this.createBreakdown(
        factory.id,
        severity,
        config,
        ctx
      );

      newBreakdowns.push(breakdown);
      currentBreakdowns.push(breakdown);
    }

    return { newBreakdowns, resolvedBreakdowns, currentBreakdowns };
  }

  /**
   * Determine breakdown severity
   */
  private static determineBreakdownSeverity(
    maintenance: MaintenanceState,
    utilization: UtilizationState,
    config: EngineConfig,
    ctx: EngineContext
  ): "minor" | "moderate" | "major" | "critical" {
    const roll = ctx.rng.factory.next();

    // Base probabilities
    let minorThreshold = 0.5;
    let moderateThreshold = 0.8;
    let majorThreshold = 0.95;

    // Adjust based on maintenance state
    if (maintenance.maintenanceBacklog > 1000) {
      minorThreshold -= 0.1;
      moderateThreshold -= 0.1;
      majorThreshold -= 0.1;
    }

    // Adjust based on burnout
    if (utilization.burnoutLevel > 70) {
      minorThreshold -= 0.15;
      moderateThreshold -= 0.15;
      majorThreshold -= 0.1;
    }

    // Apply difficulty severity multiplier
    const severityMult = config.difficulty.disruptions.severityMultiplier;
    if (severityMult > 1) {
      minorThreshold -= (severityMult - 1) * 0.2;
      moderateThreshold -= (severityMult - 1) * 0.15;
      majorThreshold -= (severityMult - 1) * 0.1;
    }

    if (roll < minorThreshold) return "minor";
    if (roll < moderateThreshold) return "moderate";
    if (roll < majorThreshold) return "major";
    return "critical";
  }

  /**
   * Create a breakdown event
   */
  private static createBreakdown(
    factoryId: string,
    severity: "minor" | "moderate" | "major" | "critical",
    config: EngineConfig,
    ctx: EngineContext
  ): BreakdownEvent {
    const severityConfig = {
      minor: {
        productionLoss: ctx.rng.factory.range(0.05, 0.15),
        repairCost: ctx.rng.factory.range(100_000, 500_000),
        roundsToRepair: 1,
        causes: ["Minor equipment malfunction", "Sensor calibration issue", "Belt replacement needed"],
      },
      moderate: {
        productionLoss: ctx.rng.factory.range(0.15, 0.30),
        repairCost: ctx.rng.factory.range(500_000, 1_500_000),
        roundsToRepair: 1,
        causes: ["Motor failure", "Conveyor breakdown", "Control system error"],
      },
      major: {
        productionLoss: ctx.rng.factory.range(0.30, 0.50),
        repairCost: ctx.rng.factory.range(1_500_000, 3_000_000),
        roundsToRepair: 2,
        causes: ["Major equipment failure", "Assembly line shutdown", "Power system damage"],
      },
      critical: {
        productionLoss: ctx.rng.factory.range(0.50, 0.80),
        repairCost: ctx.rng.factory.range(3_000_000, 5_000_000),
        roundsToRepair: 3,
        causes: ["Critical system failure", "Fire damage", "Structural damage"],
      },
    };

    const cfg = severityConfig[severity];
    const roundsToRepair = Math.ceil(
      cfg.roundsToRepair * config.difficulty.disruptions.recoveryTimeMultiplier
    );

    return {
      id: `breakdown-${factoryId}-${ctx.roundNumber}`,
      factoryId,
      severity,
      productionLoss: cfg.productionLoss,
      repairCost: cfg.repairCost,
      roundsToRepair,
      roundsRemaining: roundsToRepair,
      cause: ctx.rng.factory.pick(cfg.causes),
    };
  }

  /**
   * Calculate defect impact
   */
  private static calculateDefectImpact(
    factory: Factory,
    unitsProduced: number,
    utilization: UtilizationState,
    currentBrandValue: number
  ): DefectImpact {
    let defectRate = factory.defectRate ?? 0.05;

    // High utilization increases defects
    if (utilization.utilization > 0.95) {
      defectRate += 0.02;
    }

    // Burnout increases defects
    if (utilization.burnoutLevel > 50) {
      defectRate += (utilization.burnoutLevel - 50) / 100 * 0.03;
    }

    // Calculate affected units
    const unitsAffected = Math.floor(unitsProduced * defectRate);

    // Calculate brand damage
    let brandDamage = unitsAffected * DEFECT_BRAND_DAMAGE_RATE / 1000;

    // Check for recall
    const recallRequired = defectRate > RECALL_THRESHOLD;
    let recallCost = 0;

    if (recallRequired) {
      recallCost = unitsAffected * RECALL_COST_PER_UNIT;
      brandDamage *= 3; // Triple damage for recall
    }

    // Quality score (inverse of defect rate)
    const qualityScore = Math.max(0, Math.min(100, (1 - defectRate * 10) * 100));

    return {
      defectRate,
      unitsAffected,
      brandDamage,
      recallRequired,
      recallCost,
      qualityScore,
    };
  }

  /**
   * Calculate effective capacity considering breakdowns
   */
  private static calculateEffectiveCapacity(
    factory: Factory,
    breakdowns: BreakdownEvent[],
    utilization: UtilizationState
  ): number {
    const baseCapacity = factory.productionLines?.reduce(
      (sum, line) => sum + line.capacity,
      0
    ) ?? 100000;

    let effectiveCapacity = baseCapacity;

    // Apply breakdown losses
    const factoryBreakdowns = breakdowns.filter((b) => b.factoryId === factory.id);
    for (const breakdown of factoryBreakdowns) {
      effectiveCapacity *= (1 - breakdown.productionLoss);
    }

    // Burnout reduces efficiency
    if (utilization.burnoutLevel > 30) {
      const burnoutPenalty = (utilization.burnoutLevel - 30) / 100 * 0.2;
      effectiveCapacity *= (1 - burnoutPenalty);
    }

    return Math.floor(effectiveCapacity);
  }

  /**
   * Calculate total cost impact
   */
  private static calculateCostImpact(
    maintenance: MaintenanceState,
    breakdowns: BreakdownEvent[],
    defectImpact: DefectImpact
  ): number {
    let totalCost = 0;

    // Maintenance costs
    totalCost += maintenance.preventiveMaintenance;
    totalCost += maintenance.emergencyReserve;

    // Breakdown repair costs
    for (const breakdown of breakdowns) {
      totalCost += breakdown.repairCost;
    }

    // Recall costs
    if (defectImpact.recallRequired) {
      totalCost += defectImpact.recallCost;
    }

    return totalCost;
  }

  /**
   * Initialize utilization state
   */
  static initializeUtilizationState(): UtilizationState {
    return {
      utilization: 0.7,
      burnoutRisk: 0,
      burnoutLevel: 0,
      overdriveRounds: 0,
    };
  }

  /**
   * Initialize maintenance state
   */
  static initializeMaintenanceState(): MaintenanceState {
    return {
      preventiveMaintenance: 0,
      emergencyReserve: 0,
      maintenanceBacklog: 0,
      lastMajorService: 0,
      equipmentAge: 0,
      maintenanceEfficiency: 0.8,
    };
  }
}

// Types are exported with their interface declarations above
