/**
 * HR Module Expansions
 *
 * Additional HR systems for hiring lag, skill clusters,
 * career progression, and team dynamics.
 *
 * Phase 7: HR Module Expansions
 */

import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export type EmployeeRole = "worker" | "engineer" | "supervisor";

export interface SkillCluster {
  execution: number;       // 0-100, day-to-day task performance
  innovation: number;      // 0-100, R&D contribution, process improvement
  reliability: number;     // 0-100, consistency, attendance, quality
  leadership: number;      // 0-100, team influence (supervisors)
  adaptability: number;    // 0-100, change response, new tech adoption
}

export interface ExtendedEmployee {
  id: string;
  role: EmployeeRole;
  name: string;
  skills: SkillCluster;
  morale: number;
  efficiency: number;

  // Career progression
  careerLevel: CareerLevel;
  experiencePoints: number;
  roundsInRole: number;
  promotionEligible: boolean;
  specializations: string[];

  // Hiring/Ramp-up
  rampUpProgress: number;        // 0-100
  rampUpRoundsRemaining: number;
  mentorId: string | null;
  trainingPath: string[];

  // Retention
  turnoverRisk: number;
  loyaltyScore: number;
  compensationSatisfaction: number;
}

export type CareerLevel = "junior" | "mid" | "senior" | "lead" | "principal";

export interface TeamDynamics {
  cohesion: number;           // 0-100, affects collaboration
  conflictLevel: number;      // 0-100, reduces productivity
  innovationSynergy: number;  // Bonus for diverse skills
  communicationScore: number; // 0-100
  knowledgeSharing: number;   // 0-100
}

export interface HiringPipeline {
  positionsOpen: Record<EmployeeRole, number>;
  candidatesInPipeline: PipelineCandidate[];
  averageTimeToHire: number; // Rounds
  hiringBudget: number;
  recruitmentQuality: number; // 0-100
}

export interface PipelineCandidate {
  id: string;
  role: EmployeeRole;
  predictedSkills: Partial<SkillCluster>;
  expectedSalary: number;
  roundsUntilAvailable: number;
  source: "internal" | "external" | "referral" | "agency";
}

export interface CareerProgression {
  promotions: PromotionEvent[];
  blockedPromotions: string[]; // Employee IDs
  careerPathsAvailable: string[];
  successionPlanning: SuccessionPlan[];
}

export interface PromotionEvent {
  employeeId: string;
  fromLevel: CareerLevel;
  toLevel: CareerLevel;
  salaryIncrease: number;
  roundPromoted: number;
}

export interface SuccessionPlan {
  position: string;
  currentHolder: string | null;
  successors: { employeeId: string; readiness: number }[];
}

export interface HRExpansionResult {
  teamDynamics: TeamDynamics;
  hiringPipeline: HiringPipeline;
  careerProgression: CareerProgression;
  newHires: ExtendedEmployee[];
  departures: { employeeId: string; reason: string }[];
  promotions: PromotionEvent[];
  productivityMultiplier: number;
  rdMultiplier: number;
  messages: string[];
  warnings: string[];
}

export interface HRExpansionDecisions {
  hiringBudget: number;
  recruitmentFocus: EmployeeRole | null;
  trainingPrograms: string[];
  promotionDecisions: { employeeId: string; newLevel: CareerLevel }[];
  retentionBonuses: { employeeId: string; amount: number }[];
  teamBuildingInvestment: number;
}

// ============================================
// CONSTANTS
// ============================================

const RAMP_UP_SCHEDULE = [0.3, 0.7, 1.0]; // Productivity per round
const MENTOR_RAMP_UP_BONUS = 1.5;
const ONBOARDING_RAMP_UP_BONUS = 1.3;

const CAREER_LEVEL_THRESHOLDS: Record<CareerLevel, number> = {
  junior: 0,
  mid: 1000,
  senior: 3000,
  lead: 6000,
  principal: 10000,
};

const PROMOTION_MORALE_BOOST = 20;
const PROMOTION_TURNOVER_REDUCTION = 0.3;
const PROMOTION_SALARY_INCREASE = 0.15;
const BLOCKED_PROMOTION_TURNOVER_INCREASE = 0.2;
const BLOCKED_PROMOTION_MORALE_PENALTY = 10;

// ============================================
// ENGINE
// ============================================

export class HRExpansions {
  /**
   * Process HR expansions for a round
   */
  static processHRExpansions(
    state: TeamState,
    decisions: HRExpansionDecisions,
    previousDynamics: TeamDynamics | null,
    previousPipeline: HiringPipeline | null,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): HRExpansionResult {
    const messages: string[] = [];
    const warnings: string[] = [];

    // Process team dynamics
    const teamDynamics = this.processTeamDynamics(
      state,
      previousDynamics,
      decisions
    );

    // Process hiring pipeline
    const { pipeline, newHires } = this.processHiringPipeline(
      previousPipeline,
      decisions,
      config,
      ctx
    );

    // Process career progression
    const { careerProgression, promotions, departures } = this.processCareerProgression(
      state,
      decisions,
      round,
      ctx
    );

    // Calculate productivity multipliers
    const productivityMultiplier = this.calculateProductivityMultiplier(teamDynamics);
    const rdMultiplier = this.calculateRDMultiplier(teamDynamics);

    // Generate messages
    if (newHires.length > 0) {
      messages.push(`${newHires.length} new employees onboarded`);
    }

    if (promotions.length > 0) {
      messages.push(`${promotions.length} employees promoted`);
    }

    if (departures.length > 0) {
      const voluntaryDepartures = departures.filter(d => d.reason === "voluntary");
      if (voluntaryDepartures.length > 0) {
        warnings.push(`${voluntaryDepartures.length} employees left voluntarily`);
      }
    }

    if (teamDynamics.conflictLevel > 50) {
      warnings.push(`High team conflict level (${teamDynamics.conflictLevel.toFixed(0)}%) reducing productivity`);
    }

    if (teamDynamics.cohesion < 40) {
      messages.push(`Team cohesion at ${teamDynamics.cohesion.toFixed(0)}% - consider team building`);
    }

    if (careerProgression.blockedPromotions.length > 5) {
      warnings.push(`${careerProgression.blockedPromotions.length} employees blocked from promotion - turnover risk`);
    }

    return {
      teamDynamics,
      hiringPipeline: pipeline,
      careerProgression,
      newHires,
      departures,
      promotions,
      productivityMultiplier,
      rdMultiplier,
      messages,
      warnings,
    };
  }

  /**
   * Process team dynamics
   */
  private static processTeamDynamics(
    state: TeamState,
    previous: TeamDynamics | null,
    decisions: HRExpansionDecisions
  ): TeamDynamics {
    const workforce = state.workforce;

    // Base cohesion from tenure and turnover
    let cohesion = previous?.cohesion ?? 50;
    const turnoverRate = workforce?.turnoverRate ?? 0.1;
    cohesion *= (1 - turnoverRate);

    // Team building investment improves cohesion
    if (decisions.teamBuildingInvestment > 0) {
      const cohesionGain = Math.min(15, decisions.teamBuildingInvestment / 100_000);
      cohesion = Math.min(100, cohesion + cohesionGain);
    }

    // Conflict level based on various factors
    let conflictLevel = previous?.conflictLevel ?? 20;

    // Rapid growth increases conflict
    const totalEmployees = workforce?.totalHeadcount ?? 100;
    const growthRate = 0; // Would compare to previous round
    if (growthRate > 0.2) {
      conflictLevel = Math.min(100, conflictLevel + 10);
    }

    // Natural decay
    conflictLevel = Math.max(0, conflictLevel - 5);

    // Innovation synergy from diverse skills
    const innovationSynergy = 50 + (cohesion - conflictLevel) / 4;

    // Communication score
    const communicationScore = cohesion * 0.7 + (100 - conflictLevel) * 0.3;

    // Knowledge sharing
    const knowledgeSharing = (cohesion + communicationScore) / 2;

    return {
      cohesion: Math.max(0, Math.min(100, cohesion)),
      conflictLevel: Math.max(0, Math.min(100, conflictLevel)),
      innovationSynergy: Math.max(0, Math.min(100, innovationSynergy)),
      communicationScore: Math.max(0, Math.min(100, communicationScore)),
      knowledgeSharing: Math.max(0, Math.min(100, knowledgeSharing)),
    };
  }

  /**
   * Process hiring pipeline
   */
  private static processHiringPipeline(
    previous: HiringPipeline | null,
    decisions: HRExpansionDecisions,
    config: EngineConfig,
    ctx: EngineContext
  ): { pipeline: HiringPipeline; newHires: ExtendedEmployee[] } {
    const pipeline: HiringPipeline = previous
      ? { ...previous, candidatesInPipeline: [...previous.candidatesInPipeline] }
      : this.initializeHiringPipeline();

    pipeline.hiringBudget = decisions.hiringBudget;

    // Update recruitment quality based on budget
    pipeline.recruitmentQuality = Math.min(100, 40 + decisions.hiringBudget / 50_000);

    // Process candidates in pipeline
    const newHires: ExtendedEmployee[] = [];
    pipeline.candidatesInPipeline = pipeline.candidatesInPipeline.filter((candidate) => {
      candidate.roundsUntilAvailable--;
      if (candidate.roundsUntilAvailable <= 0) {
        // Candidate becomes hire
        const employee = this.createEmployee(candidate, ctx);
        newHires.push(employee);
        return false;
      }
      return true;
    });

    // Add new candidates based on hiring focus
    if (decisions.recruitmentFocus && decisions.hiringBudget > 0) {
      const numCandidates = Math.floor(decisions.hiringBudget / 200_000);
      for (let i = 0; i < numCandidates; i++) {
        const candidate = this.generateCandidate(
          decisions.recruitmentFocus,
          pipeline.recruitmentQuality,
          ctx
        );
        pipeline.candidatesInPipeline.push(candidate);
      }
    }

    return { pipeline, newHires };
  }

  /**
   * Process career progression
   */
  private static processCareerProgression(
    state: TeamState,
    decisions: HRExpansionDecisions,
    round: number,
    ctx: EngineContext
  ): {
    careerProgression: CareerProgression;
    promotions: PromotionEvent[];
    departures: { employeeId: string; reason: string }[];
  } {
    const promotions: PromotionEvent[] = [];
    const departures: { employeeId: string; reason: string }[] = [];
    const blockedPromotions: string[] = [];

    // Process promotion decisions
    for (const { employeeId, newLevel } of decisions.promotionDecisions) {
      promotions.push({
        employeeId,
        fromLevel: "mid", // Would need actual previous level
        toLevel: newLevel,
        salaryIncrease: PROMOTION_SALARY_INCREASE,
        roundPromoted: round,
      });
    }

    // Simulate voluntary departures based on turnover
    const workforce = state.workforce;
    const turnoverRate = workforce?.turnoverRate ?? 0.12;
    const totalEmployees = workforce?.totalHeadcount ?? 100;

    const expectedDepartures = Math.floor(totalEmployees * turnoverRate / 12); // Monthly
    for (let i = 0; i < expectedDepartures; i++) {
      departures.push({
        employeeId: `emp_${ctx.rng.hr.int(1, 1000)}`,
        reason: "voluntary",
      });
    }

    return {
      careerProgression: {
        promotions,
        blockedPromotions,
        careerPathsAvailable: ["individual_contributor", "management", "technical_lead"],
        successionPlanning: [],
      },
      promotions,
      departures,
    };
  }

  /**
   * Calculate productivity multiplier from team dynamics
   */
  private static calculateProductivityMultiplier(dynamics: TeamDynamics): number {
    // Base productivity affected by cohesion and conflict
    const cohesionBonus = (dynamics.cohesion - 50) / 200; // ±25%
    const conflictPenalty = dynamics.conflictLevel / 200; // Up to -50%

    return Math.max(0.5, 1 + cohesionBonus - conflictPenalty);
  }

  /**
   * Calculate R&D multiplier from team dynamics
   */
  private static calculateRDMultiplier(dynamics: TeamDynamics): number {
    // R&D benefits from innovation synergy and knowledge sharing
    const synergyBonus = dynamics.innovationSynergy / 100 * 0.3; // Up to +30%
    const sharingBonus = dynamics.knowledgeSharing / 100 * 0.2; // Up to +20%

    return 1 + synergyBonus + sharingBonus;
  }

  /**
   * Initialize hiring pipeline
   */
  static initializeHiringPipeline(): HiringPipeline {
    return {
      positionsOpen: { worker: 0, engineer: 0, supervisor: 0 },
      candidatesInPipeline: [],
      averageTimeToHire: 2,
      hiringBudget: 0,
      recruitmentQuality: 50,
    };
  }

  /**
   * Generate a candidate
   */
  private static generateCandidate(
    role: EmployeeRole,
    recruitmentQuality: number,
    ctx: EngineContext
  ): PipelineCandidate {
    const baseSkill = 40 + (recruitmentQuality / 100) * 30;

    return {
      id: `candidate-${role}-${ctx.roundNumber}-${ctx.rng.hr.int(1, 10000)}`,
      role,
      predictedSkills: {
        execution: baseSkill + ctx.rng.hr.gaussian(0, 10),
        innovation: baseSkill + ctx.rng.hr.gaussian(0, 10),
        reliability: baseSkill + ctx.rng.hr.gaussian(0, 10),
      },
      expectedSalary: this.getBaseSalary(role) * (1 + ctx.rng.hr.gaussian(0, 0.1)),
      roundsUntilAvailable: 2,
      source: ctx.rng.hr.pick(["external", "referral", "agency"]),
    };
  }

  /**
   * Create employee from candidate
   */
  private static createEmployee(
    candidate: PipelineCandidate,
    ctx: EngineContext
  ): ExtendedEmployee {
    return {
      id: candidate.id,
      role: candidate.role,
      name: `Employee ${candidate.id.slice(-4)}`,
      skills: {
        execution: candidate.predictedSkills.execution ?? 50,
        innovation: candidate.predictedSkills.innovation ?? 50,
        reliability: candidate.predictedSkills.reliability ?? 50,
        leadership: candidate.role === "supervisor" ? 60 : 30,
        adaptability: 50 + ctx.rng.hr.gaussian(0, 15),
      },
      morale: 70,
      efficiency: 70,
      careerLevel: "junior",
      experiencePoints: 0,
      roundsInRole: 0,
      promotionEligible: false,
      specializations: [],
      rampUpProgress: 0,
      rampUpRoundsRemaining: 2,
      mentorId: null,
      trainingPath: [],
      turnoverRisk: 0.1,
      loyaltyScore: 50,
      compensationSatisfaction: 70,
    };
  }

  /**
   * Get base salary for a role
   */
  private static getBaseSalary(role: EmployeeRole): number {
    const salaries: Record<EmployeeRole, number> = {
      worker: 45_000,
      engineer: 85_000,
      supervisor: 75_000,
    };
    return salaries[role];
  }

  /**
   * Calculate employee effective productivity
   */
  static calculateEmployeeProductivity(employee: ExtendedEmployee): number {
    // Base from skills
    const skillBase = (
      employee.skills.execution * 0.4 +
      employee.skills.reliability * 0.3 +
      employee.skills.adaptability * 0.2 +
      employee.skills.innovation * 0.1
    ) / 100;

    // Morale modifier
    const moraleModifier = employee.morale / 100;

    // Ramp-up modifier
    let rampUpModifier = 1.0;
    if (employee.rampUpRoundsRemaining > 0) {
      const rampUpIndex = 2 - employee.rampUpRoundsRemaining;
      rampUpModifier = RAMP_UP_SCHEDULE[rampUpIndex] ?? 0.3;
      if (employee.mentorId) {
        rampUpModifier *= MENTOR_RAMP_UP_BONUS;
      }
    }

    return skillBase * moraleModifier * rampUpModifier;
  }

  /**
   * Initialize team dynamics
   */
  static initializeTeamDynamics(): TeamDynamics {
    return {
      cohesion: 50,
      conflictLevel: 20,
      innovationSynergy: 50,
      communicationScore: 50,
      knowledgeSharing: 50,
    };
  }
}

