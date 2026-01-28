/**
 * Employee-related types for the Business Simulation Engine
 */

// ============================================
// EMPLOYEE STATS
// ============================================

export interface EmployeeStats {
  efficiency: number;    // 0-100: Overall work output quality
  accuracy: number;      // 0-100: Defect reduction capability
  speed: number;         // 0-100: Production rate multiplier
  stamina: number;       // 0-100: Resistance to burnout
  discipline: number;    // 0-100: Consistency and rule-following
  loyalty: number;       // 0-100: Retention likelihood
  teamCompatibility: number; // 0-100: Collaboration effectiveness
  health: number;        // 0-100: Sick leave probability reduction
}

export interface EngineerStats extends EmployeeStats {
  innovation: number;    // 0-100: R&D output multiplier
  problemSolving: number; // 0-100: Bug reduction capability
}

export interface SupervisorStats extends EmployeeStats {
  leadership: number;    // 0-100: Team productivity boost
  tacticalPlanning: number; // 0-100: Team size optimization
}

export type EmployeeRole = "worker" | "engineer" | "supervisor";

// ============================================
// EMPLOYEE
// ============================================

export interface Employee {
  id: string;
  role: EmployeeRole;
  name: string;
  stats: EmployeeStats | EngineerStats | SupervisorStats;
  salary: number;
  hiredRound: number;
  factoryId: string;
  morale: number;        // 0-100
  burnout: number;       // 0-100

  // Training tracking
  trainingHistory: {
    programsThisYear: number;     // Count of programs in current year
    lastTrainingRound: number;    // Round of last training
    totalProgramsCompleted: number;
  };
}

// ============================================
// BENEFITS SYSTEM
// ============================================

export interface BenefitsPackage {
  healthInsurance: number;       // 0-100 coverage level
  retirementMatch: number;       // 0-100 (percentage match up to limit)
  paidTimeOff: number;           // Days per year
  parentalLeave: number;         // Weeks
  stockOptions: boolean;
  flexibleWork: boolean;
  professionalDevelopment: number; // Annual budget per employee
}

export interface CompanyBenefits {
  package: BenefitsPackage;
  totalAnnualCost: number;
  moraleImpact: number;          // Calculated bonus to morale
  turnoverReduction: number;     // Percentage reduction in turnover
  esgContribution: number;       // ESG points from benefits
}
