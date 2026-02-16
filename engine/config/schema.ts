/**
 * Configuration Schema - Type definitions for all engine configuration
 *
 * This file defines the complete type system for externalized configuration.
 * All game balance parameters should be defined here, not hardcoded in modules.
 */

import type { Region, Segment, FactoryUpgrade } from "../types/factory";
import type { EmployeeRole } from "../types/employee";

// ============================================
// CORE CONFIG INTERFACES
// ============================================

export interface EngineConfig {
  version: string;
  schemaVersion: number;

  // Module configs
  factory: FactoryConfig;
  hr: HRConfig;
  marketing: MarketingConfig;
  rd: RDConfig;
  finance: FinanceConfig;
  market: MarketConfig;
  esg: ESGConfig;

  // System configs
  economy: EconomyConfig;
  balance: BalanceConfig;
  difficulty: DifficultyConfig;

  // Initial state
  initialState: InitialStateConfig;
}

// ============================================
// FACTORY CONFIG
// ============================================

export interface FactoryConfig {
  newFactoryCost: number;
  maxProductionLines: number;
  efficiencyPerMillion: number;
  efficiencyDiminishThreshold: number;
  maxEfficiency: number;

  upgradeCosts: Record<FactoryUpgrade, number>;
  regionalCostModifiers: Record<Region, number>;

  // Utilization mechanics (Phase 6 expansion)
  utilizationPenaltyThreshold: number;
  burnoutRiskPerRound: number;
  defectRateIncreaseAtHighUtil: number;
  maintenanceBacklogPerRound: number;

  // Maintenance system
  baseBreakdownProbability: number;
  backlogBreakdownMultiplier: number;
  ageBreakdownMultiplier: number;
  preventiveMaintenanceReduction: number;
}

// ============================================
// HR CONFIG
// ============================================

export interface HRConfig {
  baseSalaries: Record<EmployeeRole, number>;
  maxSalary: number;
  salaryMultiplierMin: number;
  salaryMultiplierMax: number;
  hiringCostMultiplier: number;

  // Turnover
  baseTurnoverRate: number;
  lowMoraleTurnoverIncrease: number;
  burnoutTurnoverIncrease: number;

  // Staffing ratios
  workersPerMachine: number;
  workersPerSupervisor: number;
  engineersPerFactory: number;

  // Output formulas
  baseWorkerOutput: number;
  baseRDPointsPerEngineer: number;

  // Recruitment
  recruitmentCosts: Record<RecruitmentTier, number>;
  recruitmentCandidates: Record<RecruitmentTier, number>;
  recruitmentStatRanges: Record<RecruitmentTier, { min: number; max: number }>;

  // Training
  trainingCosts: Record<EmployeeRole, number>;
  trainingFatigueThreshold: number;
  trainingFatiguePenalty: number;
  trainingCooldownRounds: number;

  // Benefits
  benefitsCosts: BenefitsCostConfig;
  benefitsMoraleImpact: BenefitsImpactConfig;
  benefitsTurnoverReduction: BenefitsImpactConfig;
  benefitsMoraleCap: number;
  benefitsTurnoverReductionCap: number;

  // Hiring pipeline (Phase 7 expansion)
  hiringRampUpRounds: number;
  rampUpProductivity: number[];  // [round1, round2, round3] productivity %
}

export type RecruitmentTier = "basic" | "premium" | "executive";

export interface BenefitsCostConfig {
  healthInsurance: number;
  retirementMatch: number;
  paidTimeOff: number;
  parentalLeave: number;
  stockOptions: number;
  flexibleWork: number;
  professionalDevelopment: number;
}

export interface BenefitsImpactConfig {
  healthInsurance: number;
  retirementMatch: number;
  paidTimeOff: number;
  parentalLeave: number;
  stockOptions: number;
  flexibleWork: number;
  professionalDevelopment: number;
}

// ============================================
// MARKETING CONFIG
// ============================================

export interface MarketingConfig {
  // Advertising
  advertisingBaseImpact: number;
  advertisingChunkSize: number;
  advertisingDecay: number;

  // Branding
  brandingBaseImpact: number;
  brandingLinearThreshold: number;
  brandingLogMultiplier: number;

  // Brand mechanics
  brandDecayRate: number;
  brandMaxGrowthPerRound: number;

  // Sponsorships
  sponsorships: Record<string, SponsorshipConfig>;
}

export interface SponsorshipConfig {
  cost: number;
  brandImpact: number;
  description: string;
}

// ============================================
// R&D CONFIG
// ============================================

export interface RDConfig {
  productDevBaseRounds: number;
  productDevQualityFactor: number;
  productDevEngineerSpeedup: number;
  maxEngineerSpeedup: number;

  // Tech tree (Phase 8 expansion)
  techTreeEnabled: boolean;
  researchSpilloverRate: number;
}

// ============================================
// FINANCE CONFIG
// ============================================

export interface FinanceConfig {
  boardMeetingsPerYear: number;

  // FX
  fxVolatilityMin: number;
  fxVolatilityMax: number;
  fxImpactPerPercent: number;

  // P/E and market cap
  basePEMultiple: number;
  minPEMultiple: number;
  maxPEMultiple: number;
  minMarketCapBookRatio: number;

  // Ratio thresholds
  ratioThresholds: FinancialRatioThresholds;

  // Board approval base probabilities
  boardProposalProbabilities: BoardProposalProbabilities;

  // Debt effects
  treasuryBillSentimentImpact: number;
  corporateBondSentimentImpact: number;

  // Credit rating (Phase 10 expansion)
  creditSpreads: Record<CreditRating, number>;
}

export interface FinancialRatioThresholds {
  currentRatio: { green: number; yellow: number };
  quickRatio: { green: number; yellow: number };
  cashRatio: { green: number; yellow: number };
  debtToEquity: { green: number; yellow: number };
  roe: { green: number; yellow: number };
  roa: { green: number; yellow: number };
  profitMargin: { green: number; yellow: number };
  grossMargin: { green: number; yellow: number };
  operatingMargin: { green: number; yellow: number };
}

export interface BoardProposalProbabilities {
  base: number;
  roeBonus: number;
  currentRatioBonus: number;
  highDebtPenalty: number;
}

export type CreditRating = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D";

// ============================================
// MARKET CONFIG
// ============================================

export interface MarketConfig {
  segments: Segment[];
  regions: Region[];

  // Segment weights
  segmentWeights: Record<Segment, SegmentWeights>;

  // Softmax
  softmaxTemperature: number;

  // Quality/feature bonuses
  qualityFeatureBonusCap: number;
  qualityFeatureBonusFormula: "sqrt";  // sqrt(ratio - 1) * 0.5

  // Price floor
  priceFloorPenaltyThreshold: number;
  priceFloorPenaltyMax: number;

  // Raw material costs per unit
  rawMaterialCostPerUnit: Record<Segment, number>;
  laborCostPerUnit: number;
  overheadCostPerUnit: number;

  // Inventory
  inventoryHoldingCost: number;
}

export interface SegmentWeights {
  price: number;
  quality: number;
  brand: number;
  esg: number;
  features: number;
}

// ============================================
// ESG CONFIG
// ============================================

export interface ESGConfig {
  highThreshold: number;
  midThreshold: number;
  lowThreshold: number;

  highBonus: number;
  midBonus: number;
  lowPenaltyMax: number;
  lowPenaltyMin: number;

  // ESG initiatives
  workplaceSafetyCost: number;
  workplaceSafetyPoints: number;
  codeOfEthicsPoints: number;
  fairWageWorkerPoints: number;
  fairWageSupervisorPoints: number;
  supplierEthicsCostMultiplier: number;
}

// ============================================
// ECONOMY CONFIG
// ============================================

export interface EconomyConfig {
  // Economic cycle (Phase 12)
  cycleTransitionProbabilities: Record<EconomicPhase, Record<EconomicPhase, number>>;
  demandMultiplierRange: { min: number; max: number };
  inflationRange: { min: number; max: number };
}

export type EconomicPhase = "expansion" | "peak" | "contraction" | "trough";

// ============================================
// BALANCE CONFIG
// ============================================

export interface BalanceConfig {
  // Rubber-banding
  rubberBandTrailingBoost: number;
  rubberBandLeadingPenalty: number;
  rubberBandThreshold: number;
}

// ============================================
// DIFFICULTY CONFIG
// ============================================

export type DifficultyLevel = "sandbox" | "easy" | "normal" | "hard" | "expert" | "nightmare";

export interface DifficultyConfig {
  level: DifficultyLevel;

  // Starting conditions
  starting: {
    cash: number;
    creditLine: number;
    brandValue: number;
    marketShare: number;
    employees: { workers: number; engineers: number; supervisors: number };
  };

  // Economy modifiers
  economy: {
    volatility: number;
    recessionProbability: number;
    inflationRange: [number, number];
    demandGrowthMultiplier: number;
  };

  // Competition modifiers
  competition: {
    aiAggressiveness: number;
    competitorStrength: number;
    newEntrantProbability: number;
    priceWarProbability: number;
  };

  // Disruption modifiers
  disruptions: {
    enabled: boolean;
    frequencyMultiplier: number;
    severityMultiplier: number;
    recoveryTimeMultiplier: number;
    warningTime: number;
  };

  // Event modifiers
  events: {
    crisisFrequency: number;
    crisisSeverity: number;
    opportunityFrequency: number;
    opportunityValue: number;
  };

  // Forgiveness mechanics
  forgiveness: {
    rubberBanding: boolean;
    rubberBandStrength: number;
    bankruptcyProtection: number;
    catchUpMechanics: boolean;
    hintSystem: boolean;
  };

  // Complexity toggles
  complexity: {
    supplyChain: boolean;
    economicCycles: boolean;
    creditRatings: boolean;
    techTrees: boolean;
    customerSatisfaction: boolean;
    competitiveIntelligence: boolean;
  };

  // Scoring adjustments
  scoring: {
    winConditionMultiplier: number;
    penaltyMultiplier: number;
    bonusMultiplier: number;
  };
}

// ============================================
// INITIAL STATE CONFIG
// ============================================

export interface InitialStateConfig {
  startingCash: number;
  marketCap: number;
  sharesIssued: number;
  rawMaterials: number;
  laborCost: number;
}

// ============================================
// HELPER TYPES
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ConfigOverrides = DeepPartial<EngineConfig>;
