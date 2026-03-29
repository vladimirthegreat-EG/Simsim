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
import { createErrorResult } from "../utils";
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
 * Get random number using context RNG
 */
function getRandomValue(ctx?: EngineContext): number {
  if (!ctx) throw new Error("DETERMINISM VIOLATION: HRModule requires EngineContext");
  return ctx.rng.hr.next();
}

/**
 * Get random int using context RNG
 */
function getRandomInt(min: number, max: number, ctx?: EngineContext): number {
  if (!ctx) throw new Error("DETERMINISM VIOLATION: HRModule requires EngineContext");
  return ctx.rng.hr.int(min, max);
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
        let newEmployee: Employee;

        if (hire.candidateData) {
          // Use pre-generated candidate data from recruitment search
          const id = ctx
            ? ctx.idGenerator.next("employee")
            : `emp-fallback-${Math.floor(performance.now())}`;
          const factoryId = hire.factoryId || state.factories[0]?.id || "factory-1";
          newEmployee = {
            id,
            role: hire.role,
            name: hire.candidateData.name,
            stats: hire.candidateData.stats,
            salary: hire.candidateData.salary,
            hiredRound: ctx?.roundNumber ?? state.round ?? 0,
            factoryId,
            morale: CONSTANTS.BASE_EMPLOYEE_MORALE,
            burnout: 0,
            trainingHistory: {
              programsThisYear: 0,
              lastTrainingRound: 0,
              totalProgramsCompleted: 0,
            },
          };
        } else {
          // Fallback: generate random employee
          newEmployee = this.createEmployee(
            hire.role,
            hire.factoryId,
            state.factories[0]?.id || "factory-1",
            ctx
          );
        }

        // v6.0.0: Rubber-banding Mechanism A — trailing teams get reduced hiring costs
        const costRelief = newState.rubberBanding?.costReliefFactor ?? 0;
        const hiringCost = newEmployee.salary * CONSTANTS.HIRING_COST_MULTIPLIER * (1 - costRelief);

        if (newState.cash >= hiringCost) {
          newState.employees.push(newEmployee);
          totalCosts += hiringCost;
          messages.push(`Hired ${newEmployee.name} as ${hire.role}`);
        } else {
          messages.push(`Insufficient funds to hire ${hire.role}`);
        }
      }
    }

    // FIX #2: Process fires with real employee IDs + survivor morale penalty
    if (decisions.fires && decisions.fires.length > 0) {
      let firedCount = 0;
      const firedRoles: Record<string, number> = {};
      for (const fire of decisions.fires) {
        const index = newState.employees.findIndex(e => e.id === fire.employeeId);
        if (index >= 0) {
          const employee = newState.employees[index];
          const severanceCost = employee.salary / 12;
          firedRoles[employee.role] = (firedRoles[employee.role] || 0) + 1;
          newState.employees.splice(index, 1);
          totalCosts += severanceCost;
          firedCount++;
          messages.push(`Terminated ${employee.name} (${employee.role}), severance: $${Math.round(severanceCost).toLocaleString()}`);
        }
      }
      // FIX #2: Survivor morale penalty — -3 per termination (max -15)
      if (firedCount > 0) {
        const moralePenalty = Math.min(15, firedCount * 3);
        for (const emp of newState.employees) {
          emp.morale = Math.max(0, emp.morale - moralePenalty);
          // FIX #11: Coworker fired → loyalty penalty (-4 same role, -2 others)
          const sameRoleFired = firedRoles[emp.role] || 0;
          const loyaltyPenalty = sameRoleFired * 4 + (firedCount - sameRoleFired) * 2;
          emp.stats.loyalty = Math.max(0, emp.stats.loyalty - loyaltyPenalty);
        }
        // FIX #11: Mass layoff (3+ same round) → additional -5 loyalty company-wide
        if (firedCount >= 3) {
          for (const emp of newState.employees) {
            emp.stats.loyalty = Math.max(0, emp.stats.loyalty - 5);
          }
          messages.push(`Mass layoff! All employees lose additional loyalty (-5)`);
        }
        messages.push(`Survivor impact: morale -${moralePenalty} across remaining ${newState.employees.length} employees`);
      }
    }

    // FIX #4: Per-person training costs + program-specific stat improvements
    const TRAINING_PER_PERSON_COSTS: Record<string, number> = {
      "basic-skills": 500,
      "advanced-tech": 2000,
      "leadership": 5000,
      "safety": 300,
    };
    const TRAINING_STAT_EFFECTS: Record<string, string[]> = {
      "basic-skills": ["efficiency", "speed"],
      "advanced-tech": ["efficiency", "accuracy", "innovation"],
      "leadership": ["leadership"],
      "safety": ["health"],
    };
    const TRAINING_MORALE_PROGRAMS = ["leadership", "safety"];
    const TRAINING_BURNOUT_REDUCTION = ["safety"];

    if (decisions.trainingPrograms) {
      for (const program of decisions.trainingPrograms) {
        // FIX #4: Per-person cost calculation
        const perPersonCost = TRAINING_PER_PERSON_COSTS[program.programType] ?? 500;
        const affected = newState.employees.filter(e => e.role === program.role);
        const totalProgramCost = perPersonCost * affected.length;

        if (newState.cash >= totalProgramCost && affected.length > 0) {
          const statsToImprove = TRAINING_STAT_EFFECTS[program.programType] ?? ["efficiency"];
          const givesMorale = TRAINING_MORALE_PROGRAMS.includes(program.programType);
          const reducesBurnout = TRAINING_BURNOUT_REDUCTION.includes(program.programType);
          let totalImprovement = 0;

          for (const employee of affected) {
            const { effectiveness } = this.calculateTrainingEffectiveness(employee);
            const baseImprovement = CONSTANTS.TRAINING_BASE_IMPROVEMENT.min + getRandomValue(ctx) * (CONSTANTS.TRAINING_BASE_IMPROVEMENT.max - CONSTANTS.TRAINING_BASE_IMPROVEMENT.min);
            const actualImprovement = baseImprovement * effectiveness;

            // FIX #4: Apply improvement to each targeted stat
            for (const stat of statsToImprove) {
              if (stat in employee.stats) {
                (employee.stats as any)[stat] = Math.min(100, (employee.stats as any)[stat] + actualImprovement);
              }
            }
            totalImprovement += actualImprovement;

            // FIX #4: Leadership program boosts morale, Safety reduces burnout
            if (givesMorale) {
              employee.morale = Math.min(100, employee.morale + 5);
            }
            if (reducesBurnout) {
              employee.burnout = Math.max(0, employee.burnout - 10);
            }

            employee.trainingHistory.programsThisYear += 1;
            employee.trainingHistory.lastTrainingRound = ctx?.roundNumber ?? 0;
            employee.trainingHistory.totalProgramsCompleted += 1;

            // FIX #11: Training increases loyalty (+1.5 per program)
            employee.stats.loyalty = Math.min(100, employee.stats.loyalty + 1.5);
          }

          totalCosts += totalProgramCost;
          const avgImprovement = affected.length > 0 ? totalImprovement / affected.length : 0;
          messages.push(`${program.programType} for ${affected.length} ${program.role}s: +${avgImprovement.toFixed(1)}% to ${statsToImprove.join(", ")} (cost: $${(totalProgramCost / 1000).toFixed(0)}K)`);
        } else if (affected.length > 0) {
          messages.push(`Insufficient cash for ${program.programType} ($${(totalProgramCost / 1000).toFixed(0)}K needed, $${((newState.cash) / 1000).toFixed(0)}K available)`);
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

    // FIX #1: Apply benefits morale impact to individual employees
    if (newState.benefits?.moraleImpact && newState.benefits.moraleImpact > 0) {
      const benefitsMoraleBoost = newState.benefits.moraleImpact * 100;
      for (const employee of newState.employees) {
        const currentGap = 100 - employee.morale;
        const effectiveBoost = Math.min(benefitsMoraleBoost, currentGap * 0.3);
        employee.morale = Math.min(100, employee.morale + effectiveBoost);
      }
      // FIX #11: Benefits active = +1.5 loyalty per round
      for (const employee of newState.employees) {
        employee.stats.loyalty = Math.min(100, employee.stats.loyalty + 1.5);
      }
      if (benefitsMoraleBoost > 0) {
        messages.push(`Benefits package boosting morale by up to +${benefitsMoraleBoost.toFixed(0)} points, loyalty +1.5`);
      }
    }

    // Process salary multiplier changes — affects employee salary AND morale
    if (decisions.salaryMultiplierChanges) {
      const smc = decisions.salaryMultiplierChanges;
      const roleToKey: Record<string, string> = { worker: "workers", engineer: "engineers", supervisor: "supervisors" };
      for (const employee of newState.employees) {
        const key = roleToKey[employee.role] || employee.role;
        const multiplier = smc[key as keyof typeof smc];
        if (multiplier !== undefined && multiplier !== 1.0) {
          const oldSalary = employee.salary;
          employee.salary = Math.round(employee.salary * multiplier);
          const salaryChangePercent = (multiplier - 1.0) * 100;
          // FIX #7: Diminishing returns on salary morale impact
          let moraleImpact: number;
          if (salaryChangePercent > 0) {
            const abs = salaryChangePercent;
            const tier1 = Math.min(abs, 5) * 0.3;
            const tier2 = Math.min(Math.max(abs - 5, 0), 5) * 0.21;
            const tier3 = Math.min(Math.max(abs - 10, 0), 5) * 0.15;
            const tier4 = Math.max(abs - 15, 0) * 0.09;
            moraleImpact = tier1 + tier2 + tier3 + tier4;
          } else {
            moraleImpact = salaryChangePercent * 0.4; // Cuts still hit hard
          }
          employee.morale = Math.max(0, Math.min(100, employee.morale + moraleImpact));
          // FIX #11: Salary changes affect loyalty (asymmetric — cuts hurt more)
          const loyaltyChange = salaryChangePercent > 0
            ? salaryChangePercent * 0.3
            : salaryChangePercent * 1.5;
          employee.stats.loyalty = Math.max(0, Math.min(100, employee.stats.loyalty + loyaltyChange));
          totalCosts += (employee.salary - oldSalary) * (1 / 12);
        }
      }
      messages.push(`Salary adjustments applied: workers=${smc.workers ?? 1}x, engineers=${smc.engineers ?? 1}x, supervisors=${smc.supervisors ?? 1}x`);
    }

    // FIX #10: Supervisor leadership → team morale (graduated staffing penalty)
    const supervisors = newState.employees.filter(e => e.role === "supervisor");
    const nonSupervisors = newState.employees.filter(e => e.role !== "supervisor");
    if (supervisors.length > 0 && nonSupervisors.length > 0) {
      const avgLeadership = supervisors.reduce((sum, e) => sum + (e.stats as SupervisorStats).leadership, 0) / supervisors.length;
      const leadershipMoraleEffect = (avgLeadership - 50) / 10; // -5 to +5 per round

      const staffToSupervisorRatio = nonSupervisors.length / supervisors.length;
      let staffingMoralePenalty = 0;
      if (staffToSupervisorRatio <= 12) {
        staffingMoralePenalty = 1;
      } else if (staffToSupervisorRatio <= 15) {
        staffingMoralePenalty = 0;
      } else if (staffToSupervisorRatio <= 20) {
        staffingMoralePenalty = -3;
      } else if (staffToSupervisorRatio <= 25) {
        staffingMoralePenalty = -5;
      } else {
        staffingMoralePenalty = -8;
      }

      for (const employee of nonSupervisors) {
        employee.morale = Math.max(0, Math.min(100, employee.morale + leadershipMoraleEffect + staffingMoralePenalty));
      }
      if (leadershipMoraleEffect !== 0 || staffingMoralePenalty !== 0) {
        messages.push(`Supervisor leadership effect: morale ${leadershipMoraleEffect >= 0 ? '+' : ''}${leadershipMoraleEffect.toFixed(1)}, staffing ratio 1:${staffToSupervisorRatio.toFixed(0)} (${staffingMoralePenalty >= 0 ? '+' : ''}${staffingMoralePenalty} morale)`);
      }
    } else if (nonSupervisors.length > 0 && supervisors.length === 0) {
      for (const employee of nonSupervisors) {
        employee.morale = Math.max(0, employee.morale - 8);
      }
      messages.push(`No supervisors! Team morale suffering (-8 per round)`);
    }

    // BAL-06: Fixed burnout recovery — morale 50+ starts recovery, not 70+
    for (const employee of newState.employees) {
      const moraleStress = employee.morale < CONSTANTS.BURNOUT_RECOVERY_MORALE_THRESHOLD ? (CONSTANTS.BURNOUT_RECOVERY_MORALE_THRESHOLD - employee.morale) / 100 : 0;
      const baseBurnoutGain = 1 + moraleStress * CONSTANTS.BURNOUT_MORALE_STRESS_MULTIPLIER;
      // FIX #5: Stamina reduces burnout accumulation (high stamina = more resilient)
      const staminaResistance = 1 - (employee.stats.stamina / 200); // stamina 100 = 50% reduction
      employee.burnout = Math.min(100, (employee.burnout || 0) + baseBurnoutGain * staminaResistance);

      if (employee.morale > CONSTANTS.BURNOUT_RECOVERY_MORALE_THRESHOLD) {
        const recovery = (employee.morale - CONSTANTS.BURNOUT_RECOVERY_MORALE_THRESHOLD) / CONSTANTS.BURNOUT_RECOVERY_RATE_DIVISOR;
        employee.burnout = Math.max(0, employee.burnout - recovery);
      }
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
      : `emp-fallback-${Math.floor(performance.now())}`;

    return {
      id,
      role,
      name: this.generateName(ctx),
      stats,
      salary: this.calculateSalary(role, stats),
      hiredRound: ctx?.roundNumber ?? 0,
      factoryId: factoryId || defaultFactoryId,
      morale: CONSTANTS.BASE_EMPLOYEE_MORALE,
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
  static calculateWorkerOutput(stats: EmployeeStats, burnout: number = 0, roundsSinceHire: number = 99): number {
    const baseOutput = CONSTANTS.BASE_WORKER_OUTPUT;
    const efficiencyMultiplier = stats.efficiency / 100;
    const speedMultiplier = stats.speed / 100;
    // FIX #3: Burnout reduces worker output (gentle 0-30% penalty)
    const burnoutPenalty = Math.max(0.7, 1 - burnout / 300);
    // FIX #5: Discipline improves output consistency (0-10% bonus at discipline 100)
    const disciplineBonus = 1 + (stats.discipline / 1000);
    // FIX #5: Health affects attendance (low health = ~5-15% absent)
    const healthFactor = 0.85 + (stats.health / 100) * 0.15;
    // FIX #13: New hire ramp-up — 70% output for first 2 rounds, then full
    const rampUpFactor = roundsSinceHire <= 2 ? 0.7 : 1.0;

    return baseOutput * efficiencyMultiplier * speedMultiplier * burnoutPenalty * disciplineBonus * healthFactor * rampUpFactor;
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
  static calculateSupervisorBoost(stats: SupervisorStats, burnout: number = 0): number {
    const baseBoost = 1.0 + stats.leadership / 500;
    // FIX #3: Burnout reduces supervisor effectiveness (gentle 0-30% penalty)
    const burnoutPenalty = Math.max(0.7, 1 - burnout / 300);
    return baseBoost * burnoutPenalty;
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
      if (employee.morale < CONSTANTS.LOW_MORALE_THRESHOLD) {
        turnoverRate += CONSTANTS.LOW_MORALE_TURNOVER_PENALTY / 12; // +15% annual
      }

      // Loyalty adjustment (higher loyalty = lower turnover)
      turnoverRate *= (150 - employee.stats.loyalty) / 100;

      // Burnout adjustment
      if (employee.burnout > CONSTANTS.HIGH_BURNOUT_THRESHOLD) {
        turnoverRate += CONSTANTS.BURNOUT_TURNOVER_PENALTY / 12; // +10% annual if burned out
      }

      // FIX #1: Apply benefits turnover reduction
      if (state.benefits?.turnoverReduction && state.benefits.turnoverReduction > 0) {
        turnoverRate *= (1 - state.benefits.turnoverReduction);
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
    let turnoverRate: number = CONSTANTS.BASE_TURNOVER_RATE;
    if (averageMorale < CONSTANTS.LOW_MORALE_THRESHOLD) turnoverRate += CONSTANTS.LOW_MORALE_TURNOVER_PENALTY;
    turnoverRate *= (150 - Math.min(100, avgLoyalty)) / 100;
    turnoverRate = Math.max(0.02, Math.min(0.50, turnoverRate)); // Floor 2%, ceiling 50%

    return {
      totalHeadcount,
      averageMorale,
      averageEfficiency,
      laborCost,
      turnoverRate,
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
      moraleImpact: Math.min(CONSTANTS.MORALE_IMPACT_CAP, moraleImpact),  // Cap at 50% bonus
      turnoverReduction: Math.min(CONSTANTS.TURNOVER_REDUCTION_CAP, turnoverReduction),  // Cap at 40% reduction
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
