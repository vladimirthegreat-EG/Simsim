/**
 * Decision types for the Business Simulation Engine
 */

import type { EmployeeRole, EmployeeStats, EngineerStats, SupervisorStats, BenefitsPackage } from "./employee";
import type { Segment, Region, FactoryUpgrade } from "./factory";
import type { MachineryDecisions } from "../machinery/types";

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
  newFactories?: { name: string; region: Region; tier?: import("./factory").FactoryTier }[];
  /** @deprecated Use productionLineDecisions instead */
  productionAllocations?: {
    factoryId: string;
    lineId: string;
    segment: Segment;
    quantity: number;
  }[];
  /** Production line management decisions */
  productionLineDecisions?: {
    /** Assign a product to a line (triggers changeover if different product) */
    assignments?: { lineId: string; productId: string }[];
    /** Set target output for a line */
    targets?: { lineId: string; targetOutput: number }[];
    /** Assign workers to a line */
    staffing?: { lineId: string; workers: number; engineers: number; supervisors: number }[];
    /** Assign line-locked machines to specific lines */
    machineAssignments?: { machineId: string; lineId: string }[];
  };
  /** Warehouse build/rent decisions */
  warehouseDecisions?: {
    build?: { factoryId: string; tier: import("../modules/WarehouseManager").WarehouseTier }[];
    rent?: { factoryId: string; tier: import("../modules/WarehouseManager").WarehouseTier }[];
  };
  esgInitiatives?: ESGInitiatives;
  machineryDecisions?: MachineryDecisions;
  /** Shift mode: single (1x), double (2x output, 1.7x labor), overtime (1.5x output, 1.6x labor) */
  shiftMode?: "single" | "double" | "overtime";
}

// ============================================
// ESG INITIATIVES (Expanded)
// ============================================

export interface ESGInitiatives {
  // === EXISTING (6) ===
  charitableDonation?: number;
  communityInvestment?: number;
  workplaceHealthSafety?: boolean;
  fairWageProgram?: boolean;
  codeOfEthics?: boolean;
  supplierEthicsProgram?: boolean;

  // === ENVIRONMENTAL (6 new) ===
  carbonOffsetProgram?: number;        // $/ton CO2, +ESG per ton offset
  renewableEnergyCertificates?: number; // $, purchase green energy credits
  waterConservation?: boolean;          // $1.5M/year, +80 ESG
  zeroWasteCommitment?: boolean;        // $2M/year, +100 ESG
  circularEconomy?: boolean;            // $3M/year, +120 ESG, -20% material costs
  biodiversityProtection?: number;      // $, habitat restoration funding

  // === SOCIAL (5 new) ===
  diversityInclusion?: boolean;         // $1M/year, +90 ESG, +5% morale
  employeeWellness?: boolean;           // $500K/year, +60 ESG, -10% turnover
  communityEducation?: number;          // $, local education programs
  affordableHousing?: number;           // $, employee housing assistance
  humanRightsAudit?: boolean;           // $800K/year, +70 ESG

  // === GOVERNANCE (3 new) ===
  transparencyReport?: boolean;         // $300K/year, +50 ESG, +investor trust
  whistleblowerProtection?: boolean;    // $200K/year, +40 ESG
  executivePayRatio?: boolean;          // Cap exec pay at 50x avg, +100 ESG
}

// ============================================
// HR DECISIONS
// ============================================

export interface HRDecisions {
  hires?: {
    factoryId: string;
    role: EmployeeRole;
    candidateId: string;
    /** Pre-generated candidate data from recruitment search — skips random generation */
    candidateData?: {
      name: string;
      stats: EmployeeStats | EngineerStats | SupervisorStats;
      salary: number;
    };
  }[];
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
  boardProposals?: BoardProposal[];
  economicForecast?: {
    gdpForecast: number;
    inflationForecast: number;
    fxForecasts: Record<string, number>;
  };
}

// ============================================
// BOARD PROPOSALS (Expanded)
// ============================================

export type BoardProposalType =
  // === EXISTING (5) ===
  | "dividend"           // Dividend payment
  | "expansion"          // Major factory expansion
  | "acquisition"        // Acquire another company
  | "emergency_capital"  // Emergency funding request
  | "stock_buyback"      // Share repurchase program

  // === STRATEGIC (5 new) ===
  | "rd_investment"      // Large R&D budget allocation
  | "strategic_partnership" // Joint venture / partnership
  | "market_entry"       // Enter new regional market
  | "product_line_discontinue" // Kill underperforming product
  | "vertical_integration" // Acquire supplier/distributor

  // === FINANCIAL (3 new) ===
  | "debt_refinancing"   // Restructure existing debt
  | "share_split"        // Stock split (2:1, 3:1, etc.)
  | "capital_allocation" // Set investment priorities

  // === CORPORATE (2 new) ===
  | "executive_compensation" // CEO/executive pay review
  | "esg_policy";        // Adopt formal ESG policy

export interface BoardProposal {
  type: BoardProposalType;
  amount?: number;        // For proposals with monetary values
  details?: string;       // Additional context
  rationale?: string;     // Why this proposal
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
  // v3.1.0: Product pricing decisions - set product prices each round
  productPricing?: { productId: string; newPrice: number }[];
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
    /** Phone archetype ID (new system - undefined = legacy product creation) */
    archetypeId?: string;
  }[];
  productImprovements?: {
    productId: string;
    qualityIncrease?: number;
    featuresIncrease?: number;
  }[];
  discontinueProducts?: string[];
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
  productDiscontinuations?: Array<{ productId: string }>;
}

// Re-export MachineryDecisions for convenience
export type { MachineryDecisions } from "../machinery/types";
