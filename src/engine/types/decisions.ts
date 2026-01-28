/**
 * Decision types for the Business Simulation Engine
 */

import type { EmployeeRole, BenefitsPackage } from "./employee";
import type { Segment, Region, FactoryUpgrade } from "./factory";

// ============================================
// FACTORY DECISIONS
// ============================================

export interface FactoryDecisions {
  efficiencyInvestments?: Record<string, {
    workers?: number;
    supervisors?: number;
    engineers?: number;
    machinery?: number;
    factory?: number;
  }>;
  greenInvestments?: Record<string, number>;
  upgradePurchases?: { factoryId: string; upgrade: FactoryUpgrade }[];
  newFactories?: { name: string; region: Region }[];
  productionAllocations?: {
    factoryId: string;
    lineId: string;
    segment: Segment;
    quantity: number;
  }[];
  esgInitiatives?: {
    charitableDonation?: number;
    communityInvestment?: number;
    workplaceHealthSafety?: boolean;
    fairWageProgram?: boolean;
    codeOfEthics?: boolean;
    supplierEthicsProgram?: boolean;
  };
}

// ============================================
// HR DECISIONS
// ============================================

export interface HRDecisions {
  hires?: { factoryId: string; role: EmployeeRole; candidateId: string }[];
  fires?: { employeeId: string }[];
  recruitmentSearches?: {
    role: EmployeeRole;
    tier: "basic" | "premium" | "executive";
    factoryId: string;
  }[];
  salaryMultiplierChanges?: {
    workers?: number;
    engineers?: number;
    supervisors?: number;
  };
  benefitChanges?: Partial<BenefitsPackage>;
  trainingPrograms?: {
    role: EmployeeRole;
    programType: string;
  }[];
}

// ============================================
// FINANCE DECISIONS
// ============================================

export interface FinanceDecisions {
  treasuryBillsIssue?: number;
  corporateBondsIssue?: number;
  loanRequest?: { amount: number; termMonths: number };
  stockIssuance?: { shares: number; pricePerShare: number };
  sharesBuyback?: number;
  dividendPerShare?: number;
  boardProposals?: string[];
  economicForecast?: {
    gdpForecast: number;
    inflationForecast: number;
    fxForecasts: Record<string, number>;
  };
}

// ============================================
// MARKETING DECISIONS
// ============================================

export interface MarketingDecisions {
  advertisingBudget?: Partial<Record<Segment, number>>;
  brandingInvestment?: number;
  promotions?: {
    segment: Segment;
    discountPercent: number;
    duration: number;
  }[];
  sponsorships?: { name: string; cost: number; brandImpact: number }[];
}

// ============================================
// R&D DECISIONS
// ============================================

export interface RDDecisions {
  rdBudget?: number;
  newProducts?: {
    name: string;
    segment: Segment;
    targetQuality: number;
    targetFeatures: number;
  }[];
  productImprovements?: {
    productId: string;
    qualityIncrease?: number;
    featuresIncrease?: number;
  }[];
}

// ============================================
// COMBINED DECISIONS
// ============================================

export interface AllDecisions {
  factory?: FactoryDecisions;
  hr?: HRDecisions;
  finance?: FinanceDecisions;
  marketing?: MarketingDecisions;
  rd?: RDDecisions;
}
