/**
 * Default Configuration Values
 *
 * This file contains the default values for all engine configuration.
 * These values are migrated from the legacy CONSTANTS object in types/index.ts.
 *
 * All numeric values should be documented with their units and design intent.
 */

import type {
  EngineConfig,
  FactoryConfig,
  HRConfig,
  MarketingConfig,
  RDConfig,
  FinanceConfig,
  MarketConfig,
  ESGConfig,
  EconomyConfig,
  BalanceConfig,
  DifficultyConfig,
  InitialStateConfig,
} from "./schema";

// ============================================
// FACTORY DEFAULTS
// ============================================

export const DEFAULT_FACTORY_CONFIG: FactoryConfig = {
  // Core factory costs
  newFactoryCost: 50_000_000,              // $50M to build new factory
  maxProductionLines: 10,                   // Max lines per factory

  // Efficiency mechanics
  efficiencyPerMillion: 0.01,              // 1% efficiency per $1M invested
  efficiencyDiminishThreshold: 10_000_000, // Diminishing returns after $10M
  maxEfficiency: 1.0,                       // 100% max efficiency

  // Upgrade costs
  upgradeCosts: {
    sixSigma: 75_000_000,
    automation: 75_000_000,
    materialRefinement: 100_000_000,
    supplyChain: 200_000_000,
    warehousing: 100_000_000,
  },

  // Regional modifiers (affects labor and operational costs)
  regionalCostModifiers: {
    "North America": 1.00,  // Baseline
    "Europe": 1.00,         // Same as baseline
    "Asia": 0.85,           // 15% cheaper labor
    "MENA": 0.90,           // 10% cheaper labor
  },

  // Utilization mechanics (Phase 6)
  utilizationPenaltyThreshold: 0.95,       // 95% triggers penalties
  burnoutRiskPerRound: 0.15,               // +15% burnout risk per round
  defectRateIncreaseAtHighUtil: 0.02,      // +2% defects at high utilization
  maintenanceBacklogPerRound: 100,         // Hours deferred per round

  // Maintenance system
  baseBreakdownProbability: 0.03,          // 3% base monthly
  backlogBreakdownMultiplier: 0.00005,     // +5% per 1000 hours backlog
  ageBreakdownMultiplier: 0.002,           // +2% per 10 years age
  preventiveMaintenanceReduction: 0.00002, // -2% per $1M maintenance
};

// ============================================
// HR DEFAULTS
// ============================================

export const DEFAULT_HR_CONFIG: HRConfig = {
  // Base salaries by role
  baseSalaries: {
    worker: 45_000,
    engineer: 85_000,
    supervisor: 75_000,
  },
  maxSalary: 500_000,                      // Cap on individual salary
  salaryMultiplierMin: 0.8,                // 0.8x at low stats
  salaryMultiplierMax: 2.2,                // 2.2x at high stats
  hiringCostMultiplier: 0.15,              // 15% of salary as hiring cost

  // Turnover rates
  baseTurnoverRate: 0.12,                  // 12% annual base
  lowMoraleTurnoverIncrease: 0.15,         // +15% annual if morale < 50
  burnoutTurnoverIncrease: 0.10,           // +10% annual if burnout > 50

  // Staffing ratios
  workersPerMachine: 2.5,
  workersPerSupervisor: 15,
  engineersPerFactory: 8,

  // Output formulas
  baseWorkerOutput: 100,                   // Base units per worker per round
  baseRDPointsPerEngineer: 10,             // Base R&D points per engineer

  // Recruitment
  recruitmentCosts: {
    basic: 5_000,
    premium: 15_000,
    executive: 50_000,
  },
  recruitmentCandidates: {
    basic: 3,
    premium: 5,
    executive: 4,
  },
  recruitmentStatRanges: {
    basic: { min: 70, max: 110 },
    premium: { min: 90, max: 130 },
    executive: { min: 120, max: 160 },
  },

  // Training
  trainingCosts: {
    worker: 50_000,
    engineer: 75_000,
    supervisor: 100_000,
  },
  trainingFatigueThreshold: 2,             // Programs per year before fatigue
  trainingFatiguePenalty: 0.2,             // 20% effectiveness reduction per extra
  trainingCooldownRounds: 2,               // Rounds between for full effect

  // Benefits
  benefitsCosts: {
    healthInsurance: 5_000,                // Per employee per year per 10 points
    retirementMatch: 3_000,
    paidTimeOff: 200,                      // Per day per employee
    parentalLeave: 1_000,                  // Per week (amortized)
    stockOptions: 2_000,                   // Per employee per year
    flexibleWork: 500,
    professionalDevelopment: 1,            // Direct cost per dollar
  },
  benefitsMoraleImpact: {
    healthInsurance: 0.15,                 // Per 100 points
    retirementMatch: 0.10,
    paidTimeOff: 0.08,
    parentalLeave: 0.05,
    stockOptions: 0.12,
    flexibleWork: 0.08,
    professionalDevelopment: 0.05,
  },
  benefitsTurnoverReduction: {
    healthInsurance: 0.10,
    retirementMatch: 0.08,
    paidTimeOff: 0.05,
    parentalLeave: 0.03,
    stockOptions: 0.07,
    flexibleWork: 0.04,
    professionalDevelopment: 0.03,
  },
  benefitsMoraleCap: 0.5,                  // 50% max morale bonus
  benefitsTurnoverReductionCap: 0.4,       // 40% max turnover reduction

  // Hiring pipeline (Phase 7)
  hiringRampUpRounds: 2,
  rampUpProductivity: [0.30, 0.70, 1.00],  // 30%, 70%, 100% by round
};

// ============================================
// MARKETING DEFAULTS
// ============================================

export const DEFAULT_MARKETING_CONFIG: MarketingConfig = {
  // Advertising
  advertisingBaseImpact: 0.0015,           // 0.15% per $1M
  advertisingChunkSize: 3_000_000,         // $3M chunks
  advertisingDecay: 0.40,                  // 40% decay per chunk

  // Branding
  brandingBaseImpact: 0.0025,              // 0.25% per $1M
  brandingLinearThreshold: 5_000_000,      // Linear up to $5M
  brandingLogMultiplier: 2.5,              // Multiplier for log portion

  // Brand mechanics
  brandDecayRate: 0.020,                   // 2% decay per round (v4.0.6 Fano sweep: 7/7 viable)
  brandMaxGrowthPerRound: 0.06,            // 6% max growth per round (v4: raised from 0.02)

  // Sponsorships
  sponsorships: {
    techConference: {
      cost: 7_500_000,
      brandImpact: 0.012,
      description: "Tech Conference Sponsorship",
    },
    sportsJersey: {
      cost: 22_000_000,
      brandImpact: 0.030,
      description: "Sports Jersey Sponsorship",
    },
    gamingTournament: {
      cost: 4_500_000,
      brandImpact: 0.009,
      description: "Gaming Tournament Sponsorship",
    },
    nationalTV: {
      cost: 35_000_000,
      brandImpact: 0.045,
      description: "National TV Campaign",
    },
    influencer: {
      cost: 3_000_000,
      brandImpact: 0.006,
      description: "Influencer Partnership",
    },
    retailerPartnership: {
      cost: 12_000_000,
      brandImpact: 0.018,
      description: "Retailer Partnership",
    },
  },
};

// ============================================
// R&D DEFAULTS
// ============================================

export const DEFAULT_RD_CONFIG: RDConfig = {
  productDevBaseRounds: 2,                 // Base rounds to develop
  productDevQualityFactor: 0.02,           // Extra rounds per quality above 50
  productDevEngineerSpeedup: 0.05,         // 5% speedup per engineer
  maxEngineerSpeedup: 0.5,                 // Max 50% speedup

  // Tech tree (Phase 8)
  techTreeEnabled: false,                  // Disabled by default
  researchSpilloverRate: 0.2,              // 20% spillover to similar products
};

// ============================================
// FINANCE DEFAULTS
// ============================================

export const DEFAULT_FINANCE_CONFIG: FinanceConfig = {
  boardMeetingsPerYear: 2,

  // FX
  fxVolatilityMin: 0.15,
  fxVolatilityMax: 0.25,
  fxImpactPerPercent: 20_000,              // $20K per 1% FX change

  // P/E and market cap
  basePEMultiple: 15,
  minPEMultiple: 5,
  maxPEMultiple: 30,
  minMarketCapBookRatio: 0.5,              // Floor at 0.5x book value

  // Ratio thresholds
  ratioThresholds: {
    currentRatio: { green: 2.0, yellow: 1.2 },
    quickRatio: { green: 1.5, yellow: 1.0 },
    cashRatio: { green: 0.5, yellow: 0.2 },
    debtToEquity: { green: 0.3, yellow: 0.6 },  // Lower is better
    roe: { green: 0.15, yellow: 0.08 },
    roa: { green: 0.08, yellow: 0.04 },
    profitMargin: { green: 0.15, yellow: 0.05 },
    grossMargin: { green: 0.40, yellow: 0.25 },
    operatingMargin: { green: 0.20, yellow: 0.10 },
  },

  // Board approval probabilities
  boardProposalProbabilities: {
    base: 50,                              // 50% base
    roeBonus: 10,                          // +10% if ROE > 15%
    currentRatioBonus: 5,                  // +5% if CR > 2.0
    highDebtPenalty: 15,                   // -15% if D/E > 0.6
  },

  // Debt effects
  treasuryBillSentimentImpact: -0.08,      // -8% investor sentiment
  corporateBondSentimentImpact: -0.05,     // -5% investor sentiment

  // Credit rating spreads (Phase 10)
  creditSpreads: {
    AAA: 0.000,
    AA: 0.005,
    A: 0.010,
    BBB: 0.020,
    BB: 0.040,
    B: 0.080,
    CCC: 0.150,
    D: Infinity,                           // Cannot borrow
  },
};

// ============================================
// MARKET DEFAULTS
// ============================================

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
  segments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"],
  regions: ["North America", "Europe", "Asia", "MENA"],

  // Segment weights (v2.4.0 balanced)
  segmentWeights: {
    Budget:           { price: 65, quality: 15, brand: 5,  esg: 5,  features: 10 },
    General:          { price: 28, quality: 23, brand: 17, esg: 10, features: 22 },
    Enthusiast:       { price: 12, quality: 30, brand: 8,  esg: 5,  features: 45 },
    Professional:     { price: 8,  quality: 48, brand: 7,  esg: 20, features: 17 },
    "Active Lifestyle": { price: 20, quality: 34, brand: 10, esg: 10, features: 26 },
  },

  // Softmax
  softmaxTemperature: 4,                    // v4.0.6 Fano sweep (7/7 viable)

  // Quality/feature bonuses
  qualityFeatureBonusCap: 1.2,             // Max 1.2x multiplier (v4.0.2: reduced to limit R&D compounding)
  qualityFeatureBonusFormula: "sqrt",       // sqrt(ratio - 1) * 0.5

  // Price floor
  priceFloorPenaltyThreshold: 0.15,        // 15% below segment min
  priceFloorPenaltyMax: 0.30,              // Max 30% score reduction

  // Unit costs
  rawMaterialCostPerUnit: {
    Budget: 50,
    General: 100,
    Enthusiast: 200,
    Professional: 350,
    "Active Lifestyle": 150,
  },
  laborCostPerUnit: 20,
  overheadCostPerUnit: 15,

  // Inventory
  inventoryHoldingCost: 0.02,              // 2% per round
};

// ============================================
// ESG DEFAULTS
// ============================================

export const DEFAULT_ESG_CONFIG: ESGConfig = {
  // 3-tier gradient system
  highThreshold: 700,                      // 700+ = high tier
  midThreshold: 400,                       // 400-699 = mid tier
  lowThreshold: 400,                       // <400 = penalty tier

  highBonus: 0.05,                         // +5% revenue bonus
  midBonus: 0.02,                          // +2% revenue bonus
  lowPenaltyMax: 0.08,                     // Max 8% penalty at score 0
  lowPenaltyMin: 0.01,                     // Min 1% penalty at score 399

  // ESG initiatives
  workplaceSafetyCost: 2_000_000,
  workplaceSafetyPoints: 200,
  codeOfEthicsPoints: 200,
  fairWageWorkerPoints: 220,
  fairWageSupervisorPoints: 40,
  supplierEthicsCostMultiplier: 1.20,      // +20% supply costs
};

// ============================================
// ECONOMY DEFAULTS
// ============================================

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  cycleTransitionProbabilities: {
    expansion: { expansion: 0.7, peak: 0.3, contraction: 0, trough: 0 },
    peak: { expansion: 0.1, peak: 0.3, contraction: 0.6, trough: 0 },
    contraction: { expansion: 0, peak: 0, contraction: 0.5, trough: 0.5 },
    trough: { expansion: 0.6, peak: 0, contraction: 0.2, trough: 0.2 },
  },
  demandMultiplierRange: { min: 0.8, max: 1.2 },
  inflationRange: { min: 1, max: 5 },
};

// ============================================
// BALANCE DEFAULTS
// ============================================

export const DEFAULT_BALANCE_CONFIG: BalanceConfig = {
  rubberBandTrailingBoost: 1.15,           // +15% for trailing teams
  rubberBandLeadingPenalty: 0.92,          // -8% for leaders
  rubberBandThreshold: 0.5,                // Trigger when share < avg * 0.5
};

// ============================================
// DIFFICULTY DEFAULTS (Normal)
// ============================================

export const DEFAULT_DIFFICULTY_CONFIG: DifficultyConfig = {
  level: "normal",
  starting: {
    cash: 200_000_000,
    creditLine: 100_000_000,
    brandValue: 0.25,
    marketShare: 0.1,
    employees: { workers: 100, engineers: 12, supervisors: 10 },
  },
  economy: {
    volatility: 1.0,
    recessionProbability: 0.15,
    inflationRange: [1, 5],
    demandGrowthMultiplier: 1.0,
  },
  competition: {
    aiAggressiveness: 0.6,
    competitorStrength: 1.0,
    newEntrantProbability: 0.05,
    priceWarProbability: 0.1,
  },
  disruptions: {
    enabled: true,
    frequencyMultiplier: 1.0,
    severityMultiplier: 1.0,
    recoveryTimeMultiplier: 1.0,
    warningTime: 2,
  },
  events: {
    crisisFrequency: 1.0,
    crisisSeverity: 1.0,
    opportunityFrequency: 1.0,
    opportunityValue: 1.0,
  },
  forgiveness: {
    rubberBanding: true,
    rubberBandStrength: 0.3,
    bankruptcyProtection: 2,
    catchUpMechanics: true,
    hintSystem: false,
  },
  complexity: {
    supplyChain: true,
    economicCycles: true,
    creditRatings: true,
    techTrees: true,
    customerSatisfaction: true,
    competitiveIntelligence: true,
  },
  scoring: {
    winConditionMultiplier: 1.0,
    penaltyMultiplier: 1.0,
    bonusMultiplier: 1.0,
  },
};

// ============================================
// INITIAL STATE DEFAULTS
// ============================================

export const DEFAULT_INITIAL_STATE_CONFIG: InitialStateConfig = {
  startingCash: 200_000_000,
  marketCap: 500_000_000,
  sharesIssued: 10_000_000,
  rawMaterials: 5_000_000,
  laborCost: 5_000_000,
};

// ============================================
// COMPLETE DEFAULT CONFIG
// ============================================

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  version: "3.0.0",
  schemaVersion: 1,

  factory: DEFAULT_FACTORY_CONFIG,
  hr: DEFAULT_HR_CONFIG,
  marketing: DEFAULT_MARKETING_CONFIG,
  rd: DEFAULT_RD_CONFIG,
  finance: DEFAULT_FINANCE_CONFIG,
  market: DEFAULT_MARKET_CONFIG,
  esg: DEFAULT_ESG_CONFIG,
  economy: DEFAULT_ECONOMY_CONFIG,
  balance: DEFAULT_BALANCE_CONFIG,
  difficulty: DEFAULT_DIFFICULTY_CONFIG,
  initialState: DEFAULT_INITIAL_STATE_CONFIG,
};
