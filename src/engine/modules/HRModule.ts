/**
 * HR Module - Handles recruitment, staffing, salaries, training, and turnover
 *
 * DETERMINISM: This module uses EngineContext for all randomness.
 * When context is not provided, falls back to global RNG (which throws if not seeded).
 */

import {
  Employee,
  EmployeeRole,
  EmployeeStats,
  EngineerStats,
  SupervisorStats,
  HRDecisions,
  TeamState,
  ModuleResult,
  CONSTANTS,
  BenefitsPackage,
  CompanyBenefits,
} from "../types";
import { createErrorResult, random, randomInt } from "../utils";
import { cloneTeamState } from "../utils/stateUtils";
import type { EngineContext, SeededRNG } from "../core/EngineContext";

type RecruitmentTier = "basic" | "premium" | "executive";

// Random name generation for candidates
const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Christopher", "Karen", "Daniel", "Lisa", "Matthew", "Nancy",
  "Anthony", "Betty", "Mark", "Margaret", "Donald", "Sandra", "Steven", "Ashley",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
];

/**
 * Get RNG instance - uses context if available, otherwise global (throws if not seeded)
 */
function getRNG(ctx?: EngineContext): SeededRNG | null {
  return ctx?.rng.hr ?? null;
}

/**
 * Get random number using context or global RNG
 */
function getRandomValue(ctx?: EngineContext): number {
  const rng = getRNG(ctx);
  return rng ? rng.next() : random();
}

/**
 * Get random int using context or global RNG
 */
function getRandomInt(min: number, max: number, ctx?: EngineContext): number {
  const rng = getRNG(ctx);
  return rng ? rng.int(min, max) : randomInt(min, max);
}

export class HRModule {
  /**
   * Process all HR decisions for a round
   * @param state Current team state
   * @param decisions HR decisions for this round
   * @param ctx Engine context for deterministic execution (required for production)
   */
  static process(
    state: TeamState,
    decisions: HRDecisions,
    ctx?: EngineContext
  ): { newState: TeamState; result: ModuleResult } {
    try {
      return this.processInternal(state, decisions, ctx);
    } catch (error) {
      return createErrorResult("HRModule", error, state);
    }
  }

  /**
   * Internal processing logic
   */
  private static processInternal(
    state: TeamState,
    decisions: HRDecisions,
    ctx?: EngineContext
  ): { newState: TeamState; result: ModuleResult } {
    let newState = cloneTeamState(state);
    let totalCosts = 0;
    const messages: string[] = [];

    // Process hires
    if (decisions.hires) {
      for (const hire of decisions.hires) {
        // Generate new employee with deterministic ID
        const newEmployee = this.createEmployee(
          hire.role,
          hire.factoryId,
          state.factories[0]?.id || "factory-1",
          ctx
        );
        const hiringCost = newEmployee.salary * CONSTANTS.HIRING_COST_MULTIPLIER;

        if (newState.cash >= hiringCost) {
          newState.employees.push(newEmployee);
          totalCosts += hiringCost;
          messages.push(`Hired ${newEmployee.name} as ${hire.role}`);
        } else {
          messages.push(`Insufficient funds to hire ${hire.role}`);
        }
      }
    }

    // Process fires
    if (decisions.fires) {
      for (const fire of decisions.fires) {
        const index = newState.employees.findIndex(e => e.id === fire.employeeId);
        if (index >= 0) {
          const employee = newState.employees[index];
          // Severance = 1 month salary
          const severanceCost = employee.salary / 12;
          newState.employees.splice(index, 1);
          totalCosts += severanceCost;
          messages.push(`Terminated ${employee.name} (${employee.role})`);
        }
      }
    }

    // Process training programs with fatigue system
    if (decisions.trainingPrograms) {
      for (const program of decisions.trainingPrograms) {
        const cost = CONSTANTS.TRAINING_COSTS[program.role];
        if (newState.cash >= cost) {
          // Apply training effects to all employees of that role
          const affected = newState.employees.filter(e => e.role === program.role);
          let totalImprovement = 0;

          for (const employee of affected) {
            // Calculate training effectiveness with fatigue
            const { effectiveness } = this.calculateTrainingEffectiveness(employee);

            // Base improvement: +5-15% efficiency (deterministic with context)
            const baseImprovement = 5 + getRandomValue(ctx) * 10;
            const actualImprovement = baseImprovement * effectiveness;

            employee.stats.efficiency = Math.min(100, employee.stats.efficiency + actualImprovement);
            totalImprovement += actualImprovement;

            // Update training history
            employee.trainingHistory.programsThisYear += 1;
            employee.trainingHistory.lastTrainingRound = ctx?.roundNumber ?? 0;
            employee.trainingHistory.totalProgramsCompleted += 1;
          }

          totalCosts += cost;
          const avgImprovement = affected.length > 0 ? totalImprovement / affected.length : 0;
          messages.push(`Training program for ${program.role}s completed (${affected.length} employees, avg +${avgImprovement.toFixed(1)}% efficiency)`);
        }
      }
    }

    // Process benefit changes
    if (decisions.benefitChanges) {
      const benefitResult = this.processBenefitChanges(newState, decisions.benefitChanges);
      newState.benefits = benefitResult.newBenefits;
      totalCosts += benefitResult.additionalCost;
      messages.push(...benefitResult.messages);
    }

    // Calculate turnover (deterministic with context)
    const turnoverResult = this.processTurnover(newState, ctx);
    newState = turnoverResult.newState;
    messages.push(...turnoverResult.messages);

    // Update workforce summary
    newState.workforce = this.calculateWorkforceSummary(newState.employees);

    // Calculate and apply labor costs
    const laborCost = this.calculateLaborCost(newState.employees);
    newState.workforce.laborCost = laborCost;
    totalCosts += laborCost;

    // Deduct costs from cash
    newState.cash -= totalCosts;

    return {
      newState,
      result: {
        success: true,
        changes: {
          hired: decisions.hires?.length ?? 0,
          fired: decisions.fires?.length ?? 0,
          trained: decisions.trainingPrograms?.length ?? 0,
          turnover: turnoverResult.departed,
        },
        costs: totalCosts,
        revenue: 0,
        messages,
      },
    };
  }

  /**
   * Generate recruitment candidates (deterministic with context)
   */
  static generateCandidates(
    role: EmployeeRole,
    tier: RecruitmentTier,
    count?: number,
    ctx?: EngineContext
  ): Omit<Employee, "id" | "hiredRound" | "factoryId">[] {
    const candidateCount = count ?? CONSTANTS.RECRUITMENT_CANDIDATES[tier];
    const statRange = CONSTANTS.RECRUITMENT_STAT_RANGE[tier];
    const candidates: Omit<Employee, "id" | "hiredRound" | "factoryId">[] = [];

    for (let i = 0; i < candidateCount; i++) {
      const stats = this.generateStats(role, statRange.min, statRange.max, ctx);
      const salary = this.calculateSalary(role, stats);

      candidates.push({
        role,
        name: this.generateName(ctx),
        stats,
        salary,
        morale: 70 + getRandomValue(ctx) * 20, // 70-90
        burnout: 0,
        trainingHistory: {
          programsThisYear: 0,
          lastTrainingRound: 0,
          totalProgramsCompleted: 0,
        },
      });
    }

    return candidates;
  }

  /**
   * Generate random stats within range (deterministic with context)
   */
  static generateStats(
    role: EmployeeRole,
    minStat: number,
    maxStat: number,
    ctx?: EngineContext
  ): EmployeeStats | EngineerStats | SupervisorStats {
    const generateStat = () => Math.round(minStat + getRandomValue(ctx) * (maxStat - minStat));

    const baseStats: EmployeeStats = {
      efficiency: Math.min(100, generateStat()),
      accuracy: Math.min(100, generateStat()),
      speed: Math.min(100, generateStat()),
      stamina: Math.min(100, generateStat()),
      discipline: Math.min(100, generateStat()),
      loyalty: Math.min(100, generateStat()),
      teamCompatibility: Math.min(100, generateStat()),
      health: Math.min(100, generateStat()),
    };

    if (role === "engineer") {
      return {
        ...baseStats,
        innovation: Math.min(100, generateStat()),
        problemSolving: Math.min(100, generateStat()),
      } as EngineerStats;
    }

    if (role === "supervisor") {
      return {
        ...baseStats,
        leadership: Math.min(100, generateStat()),
        tacticalPlanning: Math.min(100, generateStat()),
      } as SupervisorStats;
    }

    return baseStats;
  }

  /**
   * Calculate salary based on role and stats
   * Formula: Average stat → salary multiplier (0.8x to 2.2x)
   */
  static calculateSalary(
    role: EmployeeRole,
    stats: EmployeeStats | EngineerStats | SupervisorStats
  ): number {
    const baseSalaries: Record<EmployeeRole, number> = {
      worker: 45_000,
      engineer: 85_000,
      supervisor: 75_000,
    };

    const statValues = Object.values(stats) as number[];
    const averageStat = statValues.reduce((sum, val) => sum + val, 0) / statValues.length;

    // Salary multiplier = 0.8 + (averageStat / 100) × 1.4
    const multiplier = CONSTANTS.SALARY_MULTIPLIER_MIN +
      (averageStat / 100) * (CONSTANTS.SALARY_MULTIPLIER_MAX - CONSTANTS.SALARY_MULTIPLIER_MIN);

    const salary = Math.min(CONSTANTS.MAX_SALARY, Math.round(baseSalaries[role] * multiplier));

    return salary;
  }

  /**
   * Create a new employee with deterministic ID
   */
  static createEmployee(
    role: EmployeeRole,
    factoryId: string,
    defaultFactoryId: string,
    ctx?: EngineContext
  ): Employee {
    const tier: RecruitmentTier = "basic";
    const statRange = CONSTANTS.RECRUITMENT_STAT_RANGE[tier];
    const stats = this.generateStats(role, statRange.min, statRange.max, ctx);

    // Deterministic ID generation using context, or fallback pattern
    const id = ctx
      ? ctx.idGenerator.next("employee")
      : `emp-r0-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;

    return {
      id,
      role,
      name: this.generateName(ctx),
      stats,
      salary: this.calculateSalary(role, stats),
      hiredRound: ctx?.roundNumber ?? 0,
      factoryId: factoryId || defaultFactoryId,
      morale: 75,
      burnout: 0,
      trainingHistory: {
        programsThisYear: 0,
        lastTrainingRound: 0,
        totalProgramsCompleted: 0,
      },
    };
  }

  /**
   * Generate a random name (deterministic with context)
   */
  static generateName(ctx?: EngineContext): string {
    const firstName = FIRST_NAMES[getRandomInt(0, FIRST_NAMES.length - 1, ctx)];
    const lastName = LAST_NAMES[getRandomInt(0, LAST_NAMES.length - 1, ctx)];
    return `${firstName} ${lastName}`;
  }

  /**
   * Calculate worker production output
   * Formula: 100 units × efficiency × speed × shiftConditions
   */
  static calculateWorkerOutput(stats: EmployeeStats): number {
    const baseOutput = CONSTANTS.BASE_WORKER_OUTPUT;
    const efficiencyMultiplier = stats.efficiency / 100;
    const speedMultiplier = stats.speed / 100;

    return baseOutput * efficiencyMultiplier * speedMultiplier;
  }

  /**
   * Calculate engineer R&D output
   * Formula: 10 base points × efficiency × speed × (1 + innovation/200)
   */
  static calculateEngineerRDOutput(stats: EngineerStats): number {
    const basePoints = CONSTANTS.BASE_RD_POINTS_PER_ENGINEER;
    const efficiencyMultiplier = stats.efficiency / 100;
    const speedMultiplier = stats.speed / 100;
    const innovationBonus = 1 + stats.innovation / 200;

    return basePoints * efficiencyMultiplier * speedMultiplier * innovationBonus;
  }

  /**
   * Calculate supervisor team boost
   * Formula: Leadership multiplier = 1.0 + (leadership / 500) [0-20% boost]
   */
  static calculateSupervisorBoost(stats: SupervisorStats): number {
    return 1.0 + stats.leadership / 500;
  }

  /**
   * Process turnover for the round (deterministic with context)
   */
  static processTurnover(
    state: TeamState,
    ctx?: EngineContext
  ): { newState: TeamState; departed: number; messages: string[] } {
    const newState = cloneTeamState(state);
    const messages: string[] = [];
    let departed = 0;

    // Base turnover rate: 12% annually, so ~1% per month
    const monthlyBaseRate = CONSTANTS.BASE_TURNOVER_RATE / 12;

    for (let i = newState.employees.length - 1; i >= 0; i--) {
      const employee = newState.employees[i];
      let turnoverRate = monthlyBaseRate;

      // Morale adjustment
      if (employee.morale < 50) {
        turnoverRate += 0.15 / 12; // +15% annual
      }

      // Loyalty adjustment (higher loyalty = lower turnover)
      turnoverRate *= (150 - employee.stats.loyalty) / 100;

      // Burnout adjustment
      if (employee.burnout > 50) {
        turnoverRate += 0.1 / 12; // +10% annual if burned out
      }

      // Random check (deterministic with context)
      if (getRandomValue(ctx) < turnoverRate) {
        messages.push(`${employee.name} (${employee.role}) has left the company`);
        newState.employees.splice(i, 1);
        departed++;
      }
    }

    return { newState, departed, messages };
  }

  /**
   * Calculate workforce summary statistics
   */
  static calculateWorkforceSummary(employees: Employee[]): TeamState["workforce"] {
    if (employees.length === 0) {
      return {
        totalHeadcount: 0,
        averageMorale: 0,
        averageEfficiency: 0,
        laborCost: 0,
        turnoverRate: CONSTANTS.BASE_TURNOVER_RATE,
      };
    }

    const totalHeadcount = employees.length;
    const averageMorale = employees.reduce((sum, e) => sum + e.morale, 0) / employees.length;
    const averageEfficiency = employees.reduce((sum, e) => sum + e.stats.efficiency, 0) / employees.length;
    const laborCost = employees.reduce((sum, e) => sum + e.salary, 0);

    // Estimate turnover rate based on current workforce morale and loyalty
    const avgLoyalty = employees.reduce((sum, e) => sum + e.stats.loyalty, 0) / employees.length;
    let turnoverRate = CONSTANTS.BASE_TURNOVER_RATE;
    if (averageMorale < 50) turnoverRate += 0.15;
    turnoverRate *= (150 - avgLoyalty) / 100;

    return {
      totalHeadcount,
      averageMorale,
      averageEfficiency,
      laborCost,
      turnoverRate: Math.min(0.5, turnoverRate), // Cap at 50%
    };
  }

  /**
   * Calculate total labor cost
   */
  static calculateLaborCost(employees: Employee[]): number {
    return employees.reduce((sum, e) => sum + e.salary, 0);
  }

  /**
   * Calculate composite employee value score
   * Formula: weighted sum of stats
   */
  static calculateEmployeeValue(stats: EmployeeStats): number {
    const weights = {
      efficiency: 0.25,
      accuracy: 0.20,
      speed: 0.15,
      stamina: 0.10,
      discipline: 0.10,
      loyalty: 0.10,
      teamCompatibility: 0.10,
    };

    return (
      stats.efficiency * weights.efficiency +
      stats.accuracy * weights.accuracy +
      stats.speed * weights.speed +
      stats.stamina * weights.stamina +
      stats.discipline * weights.discipline +
      stats.loyalty * weights.loyalty +
      stats.teamCompatibility * weights.teamCompatibility
    );
  }

  /**
   * Get stat color for UI display
   */
  static getStatColor(value: number): "purple" | "green" | "blue" | "yellow" | "red" {
    if (value >= 90) return "purple";
    if (value >= 80) return "green";
    if (value >= 70) return "blue";
    if (value >= 60) return "yellow";
    return "red";
  }

  /**
   * Calculate training effectiveness with fatigue system
   * Programs beyond threshold have diminishing returns
   */
  static calculateTrainingEffectiveness(employee: Employee): {
    effectiveness: number;
    fatigueApplied: boolean;
  } {
    const programsThisYear = employee.trainingHistory?.programsThisYear ?? 0;
    const threshold = CONSTANTS.TRAINING_FATIGUE_THRESHOLD;
    const penalty = CONSTANTS.TRAINING_FATIGUE_PENALTY;

    if (programsThisYear < threshold) {
      return { effectiveness: 1.0, fatigueApplied: false };
    }

    // Each program beyond threshold reduces effectiveness by penalty amount
    const excessPrograms = programsThisYear - threshold + 1;
    const effectiveness = Math.max(0.2, 1.0 - (excessPrograms * penalty));

    return { effectiveness, fatigueApplied: true };
  }

  /**
   * Process benefit changes and calculate new costs/impacts
   */
  static processBenefitChanges(
    state: TeamState,
    changes: Partial<BenefitsPackage>
  ): {
    newBenefits: CompanyBenefits;
    additionalCost: number;
    messages: string[];
  } {
    const messages: string[] = [];
    const currentPackage = state.benefits?.package ?? {
      healthInsurance: 0,
      retirementMatch: 0,
      paidTimeOff: 10,
      parentalLeave: 0,
      stockOptions: false,
      flexibleWork: false,
      professionalDevelopment: 0,
    };

    // Apply changes
    const newPackage: BenefitsPackage = {
      ...currentPackage,
      ...changes,
    };

    // Calculate costs
    const employeeCount = state.employees.length || 1;
    const costs = CONSTANTS.BENEFITS_COSTS;

    const totalCost =
      (newPackage.healthInsurance / 10) * costs.healthInsurance * employeeCount +
      (newPackage.retirementMatch / 10) * costs.retirementMatch * employeeCount +
      newPackage.paidTimeOff * costs.paidTimeOff * employeeCount +
      newPackage.parentalLeave * costs.parentalLeave * employeeCount +
      (newPackage.stockOptions ? costs.stockOptions * employeeCount : 0) +
      (newPackage.flexibleWork ? costs.flexibleWork * employeeCount : 0) +
      newPackage.professionalDevelopment * costs.professionalDevelopment * employeeCount;

    // Calculate morale impact
    const moraleImpacts = CONSTANTS.BENEFITS_MORALE_IMPACT;
    const moraleImpact =
      (newPackage.healthInsurance / 100) * moraleImpacts.healthInsurance +
      (newPackage.retirementMatch / 100) * moraleImpacts.retirementMatch +
      (newPackage.paidTimeOff / 30) * moraleImpacts.paidTimeOff +
      (newPackage.parentalLeave / 12) * moraleImpacts.parentalLeave +
      (newPackage.stockOptions ? moraleImpacts.stockOptions : 0) +
      (newPackage.flexibleWork ? moraleImpacts.flexibleWork : 0) +
      (newPackage.professionalDevelopment / 5000) * moraleImpacts.professionalDevelopment;

    // Calculate turnover reduction
    const turnoverReductions = CONSTANTS.BENEFITS_TURNOVER_REDUCTION;
    const turnoverReduction =
      (newPackage.healthInsurance / 100) * turnoverReductions.healthInsurance +
      (newPackage.retirementMatch / 100) * turnoverReductions.retirementMatch +
      (newPackage.paidTimeOff / 30) * turnoverReductions.paidTimeOff +
      (newPackage.parentalLeave / 12) * turnoverReductions.parentalLeave +
      (newPackage.stockOptions ? turnoverReductions.stockOptions : 0) +
      (newPackage.flexibleWork ? turnoverReductions.flexibleWork : 0) +
      (newPackage.professionalDevelopment / 5000) * turnoverReductions.professionalDevelopment;

    // ESG contribution from benefits (social responsibility)
    const esgContribution = Math.round(
      (newPackage.healthInsurance / 100) * 50 +
      (newPackage.retirementMatch / 100) * 30 +
      (newPackage.parentalLeave / 12) * 40 +
      (newPackage.stockOptions ? 25 : 0) +
      (newPackage.flexibleWork ? 15 : 0)
    );

    const newBenefits: CompanyBenefits = {
      package: newPackage,
      totalAnnualCost: totalCost,
      moraleImpact: Math.min(0.5, moraleImpact),  // Cap at 50% bonus
      turnoverReduction: Math.min(0.4, turnoverReduction),  // Cap at 40% reduction
      esgContribution,
    };

    // Calculate additional cost vs previous
    const previousCost = state.benefits?.totalAnnualCost ?? 0;
    const additionalCost = Math.max(0, totalCost - previousCost);

    if (Object.keys(changes).length > 0) {
      messages.push(`Benefits package updated. Annual cost: $${(totalCost / 1_000_000).toFixed(1)}M`);
      messages.push(`Morale impact: +${(moraleImpact * 100).toFixed(0)}%, Turnover reduction: -${(turnoverReduction * 100).toFixed(0)}%`);
    }

    return { newBenefits, additionalCost, messages };
  }

  /**
   * Calculate benefits cost per round (annual cost / 4 quarters)
   */
  static calculateBenefitsCostPerRound(benefits: CompanyBenefits): number {
    return benefits.totalAnnualCost / 4;
  }

  /**
   * Calculate employees by factory
   */
  static getEmployeesByFactory(
    employees: Employee[],
    factoryId: string
  ): { workers: Employee[]; engineers: Employee[]; supervisors: Employee[] } {
    const factoryEmployees = employees.filter(e => e.factoryId === factoryId);

    return {
      workers: factoryEmployees.filter(e => e.role === "worker"),
      engineers: factoryEmployees.filter(e => e.role === "engineer"),
      supervisors: factoryEmployees.filter(e => e.role === "supervisor"),
    };
  }
}
