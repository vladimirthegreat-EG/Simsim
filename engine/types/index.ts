/**
 * Core types for the Business Simulation Engine
 *
 * This file re-exports all types from domain-specific modules for backward compatibility.
 * Import directly from domain modules for cleaner imports in new code.
 */

// ============================================
// DOMAIN MODULE RE-EXPORTS
// ============================================

// Employee types
export type {
  EmployeeStats,
  EngineerStats,
  SupervisorStats,
  EmployeeRole,
  Employee,
  BenefitsPackage,
  CompanyBenefits,
} from "./employee";

// Factory types
export type {
  Region,
  Segment,
  ProductionLine,
  FactoryUpgrade,
  Factory,
} from "./factory";

// Product types
export type { Product } from "./product";

// Market types
export type {
  MarketConditions,
  FxRates,
  SegmentDemand,
  MarketState,
  DynamicPriceExpectation,
} from "./market";

// State types
export type {
  FinancialState,
  ESGState,
  TeamState,
  StateVersion,
  RubberBandingFactors,
} from "./state";

// Decision types
export type {
  FactoryDecisions,
  HRDecisions,
  FinanceDecisions,
  MarketingDecisions,
  RDDecisions,
  AllDecisions,
} from "./decisions";

// Result types
export type {
  ModuleResult,
  RoundResults,
} from "./results";

// ============================================
// CONSTANTS
// ============================================

import type { FactoryUpgrade, Region, Segment } from "./factory";

export const CONSTANTS = {
  // Factory
  NEW_FACTORY_COST: 50_000_000,
  MAX_PRODUCTION_LINES: 10,
  EFFICIENCY_PER_MILLION: 0.02,
  EFFICIENCY_DIMINISH_THRESHOLD: 10_000_000,
  MAX_EFFICIENCY: 1.0,

  // Upgrades (Expanded: 5 -> 20)
  UPGRADE_COSTS: {
    // Existing (5)
    sixSigma: 75_000_000,
    automation: 75_000_000,
    materialRefinement: 100_000_000,
    supplyChain: 200_000_000,
    warehousing: 100_000_000,
    // Quality & Efficiency (5 new)
    leanManufacturing: 40_000_000,
    digitalTwin: 60_000_000,
    iotIntegration: 50_000_000,
    modularLines: 80_000_000,
    continuousImprovement: 30_000_000,
    // Sustainability (5 new)
    solarPanels: 45_000_000,
    waterRecycling: 25_000_000,
    wasteToEnergy: 35_000_000,
    smartGrid: 55_000_000,
    carbonCapture: 70_000_000,
    // Capacity & Specialization (5 new)
    cleanRoom: 120_000_000,
    rapidPrototyping: 40_000_000,
    advancedRobotics: 100_000_000,
    qualityLab: 60_000_000,
    flexibleManufacturing: 90_000_000,
  } as Record<FactoryUpgrade, number>,

  // HR
  BASE_WORKER_OUTPUT: 100,
  BASE_DEFECT_RATE: 0.06,
  BASE_TURNOVER_RATE: 0.125,
  WORKERS_PER_MACHINE: 2.75,
  WORKERS_PER_SUPERVISOR: 15,
  ENGINEERS_PER_FACTORY: 8,
  BASE_RD_POINTS_PER_ENGINEER: 15,     // v5.1.0 Audit F-04 (was 5 — patents unreachable in 8 rounds)
  RD_BUDGET_TO_POINTS_RATIO: 100_000,  // Sweep v5: $100K per rdProgress point (so $15M → 150 pts)
  MAX_RD_BUDGET_POINTS_PER_ROUND: 200, // CRIT-01: Cap budget-derived R&D points per round (effective cap: $20M)
  MAX_SALARY: 500_000,
  SALARY_MULTIPLIER_MIN: 0.8,
  SALARY_MULTIPLIER_MAX: 2.2,
  HIRING_COST_MULTIPLIER: 0.15,         // v5.1.0 Audit F-09 (was 0.25 — inconsistent with config)

  // Recruitment
  RECRUITMENT_COSTS: {
    basic: 5_000,
    premium: 15_000,
    executive: 50_000,
  },
  RECRUITMENT_CANDIDATES: {
    basic: 4,
    premium: 6,
    executive: 8,
  },
  RECRUITMENT_STAT_RANGE: {
    basic: { min: 70, max: 110 },
    premium: { min: 90, max: 130 },
    executive: { min: 120, max: 160 },
  },

  // Training
  TRAINING_COSTS: {
    worker: 50_000,
    engineer: 75_000,
    supervisor: 100_000,
  },

  // Regional cost modifiers
  REGIONAL_COST_MODIFIER: {
    "North America": 1.0,
    "Europe": 1.0,
    "Asia": 0.85,
    "MENA": 0.90,
  } as Record<Region, number>,

  // Finance
  FX_VOLATILITY_MIN: 0.05,
  FX_VOLATILITY_MAX: 0.15,
  BOARD_MEETINGS_PER_YEAR: 2,

  // ESG (Existing)
  ESG_WORKPLACE_SAFETY_COST: 2_000_000,
  ESG_WORKPLACE_SAFETY_POINTS: 200,
  ESG_CODE_OF_ETHICS_POINTS: 200,
  ESG_FAIR_WAGE_WORKER_POINTS: 220,
  ESG_FAIR_WAGE_SUPERVISOR_POINTS: 40,
  ESG_SUPPLIER_ETHICS_COST_MULTIPLIER: 1.20,

  // ESG Initiatives (Expanded: 6 -> 20) with Tier System
  ESG_INITIATIVES: {
    // Environmental (6 new)
    carbonOffsetProgram: { costPerTon: 20, pointsPer10Tons: 1 },
    renewableEnergyCertificates: { pointsPer10K: 1 },
    waterConservation: { cost: 1_500_000, points: 80, waterCostReduction: 0.20 },
    zeroWasteCommitment: { cost: 2_000_000, points: 100, wasteCostReduction: 0.30 },
    circularEconomy: { cost: 3_000_000, points: 120, materialCostReduction: 0.20 },
    biodiversityProtection: { pointsPer5K: 1 },

    // Social (5 new)
    diversityInclusion: { cost: 1_000_000, points: 90, moraleBonus: 0.05 },
    employeeWellness: { cost: 500_000, points: 60, turnoverReduction: 0.10 },
    communityEducation: { pointsPer2K: 1 },
    affordableHousing: { pointsPer10K: 1, localTurnoverReduction: 0.15 },
    humanRightsAudit: { cost: 800_000, points: 70 },

    // Governance (3 new)
    transparencyReport: { cost: 300_000, points: 50, investorTrustBonus: 0.10 },
    whistleblowerProtection: { cost: 200_000, points: 40, scandalRiskReduction: 0.25 },
    executivePayRatio: { cost: 0, points: 100 },  // No direct cost, limits exec pay
  },

  // ESG Initiative Tiers (unlocked based on ESG score or round)
  ESG_TIERS: {
    // Tier 1: Available from start
    tier1: {
      requiredScore: 0,
      requiredRound: 1,
      initiatives: [
        "charitableDonation",
        "communityInvestment",
        "codeOfEthics",
        "employeeWellness",
        "communityEducation",
      ],
    },
    // Tier 2: ESG score 100+ or round 2+
    tier2: {
      requiredScore: 100,
      requiredRound: 2,
      initiatives: [
        "workplaceHealthSafety",
        "fairWageProgram",
        "carbonOffsetProgram",
        "renewableEnergyCertificates",
        "diversityInclusion",
        "transparencyReport",
      ],
    },
    // Tier 3: ESG score 300+ or round 4+
    tier3: {
      requiredScore: 300,
      requiredRound: 4,
      initiatives: [
        "supplierEthicsProgram",
        "waterConservation",
        "zeroWasteCommitment",
        "humanRightsAudit",
        "whistleblowerProtection",
        "biodiversityProtection",
      ],
    },
    // Tier 4: ESG score 500+ or round 6+
    tier4: {
      requiredScore: 500,
      requiredRound: 6,
      initiatives: [
        "circularEconomy",
        "affordableHousing",
        "executivePayRatio",
      ],
    },
  },

  // Factory Upgrade Tiers with R&D Prerequisites
  UPGRADE_TIERS: {
    // Tier 1: No prerequisites (basic upgrades)
    tier1: {
      rdLevel: 0,
      rdTechRequired: null,
      upgrades: ["sixSigma", "warehousing", "leanManufacturing", "continuousImprovement"],
    },
    // Tier 2: R&D Level 1 required (process improvements)
    tier2: {
      rdLevel: 1,
      rdTechRequired: "process_optimization",
      upgrades: ["automation", "materialRefinement", "modularLines", "waterRecycling", "solarPanels"],
    },
    // Tier 3: R&D Level 2 required (advanced technology)
    tier3: {
      rdLevel: 2,
      rdTechRequired: "advanced_manufacturing",
      upgrades: ["supplyChain", "digitalTwin", "iotIntegration", "wasteToEnergy", "smartGrid", "rapidPrototyping"],
    },
    // Tier 4: R&D Level 3 required (cutting-edge)
    tier4: {
      rdLevel: 3,
      rdTechRequired: "industry_4_0",
      upgrades: ["advancedRobotics", "qualityLab", "carbonCapture", "flexibleManufacturing"],
    },
    // Tier 5: R&D Level 4 required (breakthrough tech)
    tier5: {
      rdLevel: 4,
      rdTechRequired: "breakthrough_tech",
      upgrades: ["cleanRoom"],
    },
  },

  // R&D Technology Tree (prerequisites for upgrades)
  RD_TECH_TREE: {
    process_optimization: {
      name: "Process Optimization",
      cost: 5_000_000,
      rdPointsRequired: 100,
      description: "Systematic approach to improving manufacturing processes",
    },
    advanced_manufacturing: {
      name: "Advanced Manufacturing",
      cost: 15_000_000,
      rdPointsRequired: 300,
      prerequisite: "process_optimization",
      description: "Next-generation manufacturing techniques and systems",
    },
    industry_4_0: {
      name: "Industry 4.0",
      cost: 30_000_000,
      rdPointsRequired: 600,
      prerequisite: "advanced_manufacturing",
      description: "Full digital integration with IoT, AI, and automation",
    },
    breakthrough_tech: {
      name: "Breakthrough Technology",
      cost: 50_000_000,
      rdPointsRequired: 1000,
      prerequisite: "industry_4_0",
      description: "Cutting-edge innovations pushing the boundaries of manufacturing",
    },
  },

  // Market
  SEGMENTS: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] as Segment[],
  REGIONS: ["North America", "Europe", "Asia", "MENA"] as Region[],

  // Training
  TRAINING_FATIGUE_THRESHOLD: 1,        // Programs per year before diminishing returns
  TRAINING_FATIGUE_PENALTY: 0.3,        // 30% effectiveness reduction per extra program
  TRAINING_COOLDOWN_ROUNDS: 2,          // Rounds between training for full effectiveness

  // Benefits
  BENEFITS_COSTS: {
    healthInsurance: 5000,              // Per employee per year per 10 points
    retirementMatch: 3000,              // Per employee per year per 10 points
    paidTimeOff: 200,                   // Per day per employee
    parentalLeave: 1000,                // Per week per employee (amortized)
    stockOptions: 2000,                 // Per employee per year
    flexibleWork: 500,                  // Per employee per year
    professionalDevelopment: 1,         // Direct cost per dollar budgeted
  },
  BENEFITS_MORALE_IMPACT: {
    healthInsurance: 0.15,              // Morale multiplier per 100 points
    retirementMatch: 0.10,
    paidTimeOff: 0.08,
    parentalLeave: 0.05,
    stockOptions: 0.12,
    flexibleWork: 0.08,
    professionalDevelopment: 0.05,
  },
  BENEFITS_TURNOVER_REDUCTION: {
    healthInsurance: 0.10,              // Turnover reduction per 100 points
    retirementMatch: 0.08,
    paidTimeOff: 0.05,
    parentalLeave: 0.03,
    stockOptions: 0.07,
    flexibleWork: 0.04,
    professionalDevelopment: 0.03,
  },

  // Product Development
  PRODUCT_DEV_BASE_ROUNDS: 1,           // Base rounds to develop a product
  PRODUCT_DEV_QUALITY_FACTOR: 0.01,     // Extra rounds per quality point above 50
  PRODUCT_DEV_ENGINEER_SPEEDUP: 0.08,   // Speedup per engineer (max 50%)

  // Inventory & COGS
  INVENTORY_HOLDING_COST: 0.02,         // 2% of value per round
  RAW_MATERIAL_COST_PER_UNIT: {
    "Budget": 50,
    "General": 100,
    "Enthusiast": 200,
    "Professional": 350,
    "Active Lifestyle": 150,
  } as Record<Segment, number>,
  LABOR_COST_PER_UNIT: 20,              // Base labor cost per unit
  OVERHEAD_COST_PER_UNIT: 15,           // Overhead per unit

  // ESG Events - 3-tier gradient system (no dead zone)
  ESG_HIGH_THRESHOLD: 700,              // High tier trigger (700+)
  ESG_MID_THRESHOLD: 400,               // Mid tier trigger (400-699)
  ESG_LOW_THRESHOLD: 400,               // Below this = penalty tier
  ESG_HIGH_BONUS: 0.05,                 // 5% revenue bonus for high ESG
  ESG_MID_BONUS: 0.02,                  // 2% revenue bonus for mid ESG
  ESG_LOW_PENALTY_MAX: 0.08,            // Max 8% penalty at score 0
  ESG_LOW_PENALTY_MIN: 0.01,            // Min 1% penalty at score 399

  // Price Floor - prevent "race to bottom" pricing
  PRICE_FLOOR_PENALTY_THRESHOLD: 0.08,  // 8% below segment minimum = penalty zone
  PRICE_FLOOR_PENALTY_MAX: 0.10,        // Max 10% score reduction at extreme low prices

  // Rubber-banding (catch-up mechanics) — v7.0.0 Strengthened (was too weak: snowball rate 50%)
  // Replaces threshold-based system with three indirect mechanisms
  RUBBER_BAND_ACTIVATION_ROUND: 2,      // Activate from round 2 (was 3 — too late, leaders snowballed)
  // Mechanism A — Cost Relief (trailing teams)
  RB_MAX_COST_RELIEF: 0.18,             // Maximum 18% COGS/hiring cost reduction (was 12%)
  RB_COST_RELIEF_SENSITIVITY: 1.5,      // tanh ramp speed for cost relief
  // Mechanism B — Perception Boost (trailing teams)
  RB_MAX_PERCEPTION_BONUS: 0.12,        // Maximum 12% quality score boost (was 8%)
  RB_PERCEPTION_SENSITIVITY: 1.2,       // tanh ramp speed for perception boost
  // Mechanism C — Incumbent Drag (leading teams)
  RB_MAX_DRAG: 0.60,                    // Maximum 60% acceleration to brand decay + quality expectations (was 50%)
  RB_DRAG_SENSITIVITY: 0.8,             // tanh ramp speed for drag (gentler than relief)
  RB_MAX_QUALITY_EXPECTATION_BOOST: 5.0, // Up to +5 points on quality expectations

  // Brand - Rebalanced (v7.0.0, Monte Carlo balance sweep)
  // Moderate decay — strategies now all invest in brand, so mechanic is less exploitable
  BRAND_DECAY_RATE: 0.012,              // 1.2% brand decay per round (was 0.5%)
  BRAND_MAX_GROWTH_PER_ROUND: 0.04,     // Max 4% brand growth per round (was 6%)

  // v7.0.0: Brand critical mass thresholds (Monte Carlo balance sweep)
  BRAND_CRITICAL_MASS_LOW: 0.15,        // Below this, brand score gets penalty
  BRAND_CRITICAL_MASS_HIGH: 0.60,       // Above this, brand score gets bonus (was 0.55)
  BRAND_LOW_MULTIPLIER: 0.75,           // -25% brand score for weak brands (was 0.7 — less punishing)
  BRAND_HIGH_MULTIPLIER: 1.05,          // +5% brand score for strong brands (was 1.1 — halved)

  // v4.0.0: Balanced flexibility bonus — REMOVED in v5.1.0 (Audit F-01)
  // Generalist performance should emerge from segment weights naturally,
  // not from a hardcoded multiplier that guarantees balanced strategy wins.

  // v5.1.0: Tuning parameters (Audit F-03)
  SOFTMAX_TEMPERATURE: 3,               // Market share allocation sharpness (was 2 — too sharp, amplified small score gaps into dominance)

  // Marketing parameters (wired for sweep)
  ADVERTISING_BASE_IMPACT: 0.0011,      // 0.11% brand per $1M advertising (sweep v5)
  ADVERTISING_CHUNK_SIZE: 2_000_000,    // BAL-05: $2M chunks (was $1M) — wider linear zone before decay
  ADVERTISING_DECAY: 0.15,              // BAL-05: 15% effectiveness drop per chunk (was 20%) — gentler curve
  BRANDING_BASE_IMPACT: 0.003,          // 0.3% brand per $1M branding investment (sweep v5)
  BRANDING_LINEAR_THRESHOLD: 2_000_000, // Linear benefit up to $2M (sweep v5)
  BRANDING_LOG_MULTIPLIER: 1.5,         // Log multiplier for amounts >$2M (sweep v5)

  // Quality/Feature scoring caps
  QUALITY_FEATURE_BONUS_CAP: 1.07,      // Max multiplier for quality/features above expectation (was 1.1 — R&D-focused dominated)
  QUALITY_MARKET_SHARE_BONUS: 0.0011,   // +0.11% market share per quality point (sweep v5)

  // ESG penalty system (PATCH 4: penalty-only, no bonuses)
  ESG_PENALTY_THRESHOLD: 300,           // Below this score = penalty
  ESG_PENALTY_MAX: 0.12,               // 12% max penalty at score 0 (sweep v5)
  ESG_PENALTY_MIN: 0.0133,             // 1.33% min penalty at score threshold-1 (sweep v5)

  // Segment weights (all 5 segments × 5 dimensions)
  SEGMENT_WEIGHTS: {
    "Budget":           { price: 65, quality: 15, brand: 5,  esg: 5,  features: 10 },
    "General":          { price: 28, quality: 23, brand: 17, esg: 10, features: 22 },
    "Enthusiast":       { price: 12, quality: 30, brand: 8,  esg: 5,  features: 45 },
    "Professional":     { price: 18, quality: 35, brand: 10, esg: 17, features: 20 }, // v7.0.0: Price matters more (18 from 15), quality less dominant (35 from 40), brand slightly up (10 from 8)
    "Active Lifestyle": { price: 20, quality: 34, brand: 10, esg: 10, features: 26 },
  } as Record<Segment, { price: number; quality: number; brand: number; esg: number; features: number }>,

  // Initial State Defaults
  DEFAULT_STARTING_CASH: 175_000_000,
  DEFAULT_MARKET_CAP: 500_000_000,
  DEFAULT_SHARES_ISSUED: 10_000_000,
  DEFAULT_RAW_MATERIALS: 5_000_000,
  DEFAULT_LABOR_COST: 5_000_000,

  // Cash enforcement — only the floor trigger, everything else is derived from state
  MINIMUM_CASH_FLOOR: 5_000_000,          // $5M — auto-funding triggers when cash falls below this

  // ============================================
  // HR / EMPLOYEE CONSTANTS
  // ============================================

  BASE_EMPLOYEE_MORALE: 75,                // Starting morale for new hires
  BASE_EMPLOYEE_STAT: 65,                  // Default starting stat value
  LOW_MORALE_THRESHOLD: 50,               // Below this, turnover increases
  LOW_MORALE_TURNOVER_PENALTY: 0.15,      // Extra turnover when morale < threshold
  HIGH_BURNOUT_THRESHOLD: 50,             // Burnout level triggering turnover
  BURNOUT_TURNOVER_PENALTY: 0.10,         // Extra turnover at high burnout
  BURNOUT_RECOVERY_MORALE_THRESHOLD: 50,  // Morale needed to start burnout recovery
  BURNOUT_MORALE_STRESS_MULTIPLIER: 8,    // Burnout increase per morale point below threshold
  BURNOUT_RECOVERY_RATE_DIVISOR: 5,       // Recovery rate: (morale - threshold) / divisor
  EMPLOYEE_VALUE_WEIGHTS: {               // Weighted stat importance for employee value
    efficiency: 0.25,
    accuracy: 0.20,
    speed: 0.15,
    stamina: 0.10,
    discipline: 0.10,
    loyalty: 0.10,
    teamCompatibility: 0.10,
  },
  TRAINING_BASE_IMPROVEMENT: { min: 5, max: 10 }, // Stat improvement range per training
  MORALE_IMPACT_CAP: 0.50,               // Max morale impact from benefits
  TURNOVER_REDUCTION_CAP: 0.40,          // Max turnover reduction from benefits

  // ============================================
  // FINANCE / BOARD CONSTANTS
  // ============================================

  CREDIT_FROZEN_DE_THRESHOLD: 2.0,        // D/E ratio where credit freezes
  BOARD_SATISFACTION_BASELINE: 50,         // Starting board satisfaction score
  BOARD_TOTAL_VOTES: 6,                   // Number of board members voting
  BASE_PE_RATIO: 15,                       // Market average PE ratio
  MIN_PE_RATIO: 5,                         // Floor for PE ratio
  MAX_PE_RATIO: 30,                        // Cap for PE ratio
  PE_GROWTH_PREMIUM_MAX: 10,              // Max PE bonus from EPS growth
  MARKET_CAP_BLEND_ZONE: { low: -0.5, high: 0.5 }, // EPS zone for PE/PS blending
  PRICE_TO_SALES_BASE: 2,                 // Base P/S ratio for market cap
  MARKET_CAP_BOOK_VALUE_FLOOR: 0.5,       // Min market cap = 50% of book value
  MARKET_CAP_ASSETS_FLOOR: 0.3,           // Min market cap = 30% of total assets
  INVESTOR_SENTIMENT_ESG_HIGH: 600,       // ESG score threshold for positive sentiment
  INVESTOR_SENTIMENT_ESG_LOW: 300,        // ESG score threshold for negative sentiment
  INVESTOR_SENTIMENT_ESG_BONUS: 8,        // Sentiment boost for high ESG
  INVESTOR_SENTIMENT_ESG_PENALTY: 10,     // Sentiment penalty for low ESG
  DEBT_COVENANT_DE_THRESHOLD_1: 1.0,      // D/E triggers interest surcharge
  DEBT_COVENANT_DE_THRESHOLD_2: 1.5,      // D/E triggers forced repayment
  COVENANT_INTEREST_SURCHARGE: 0.02,      // 2% surcharge on existing debt
  FORCED_REPAYMENT_CASH_LIMIT: 0.30,      // Max 30% of cash for forced repayment
  FORCED_REPAYMENT_DEBT_PERCENT: 0.10,    // Repay 10% of debt

  // ============================================
  // CASH ENFORCEMENT CONSTANTS
  // ============================================

  CASH_FLOOR_ASSET_RATIO: 0.05,           // Cash floor = 5% of total assets
  AUTO_LOAN_BUFFER: 1.2,                  // Borrow 120% of shortfall
  LOAN_REVENUE_CAPACITY_MULTIPLIER: 2,    // Revenue × 2 = max debt capacity
  LOAN_EQUITY_CAPACITY_MULTIPLIER: 3.0,   // Equity × 3 = max debt capacity
  MAX_DILUTION_PER_ROUND: 0.20,           // Max 20% new shares per round
  STOCK_ISSUE_PRICE_IMPACT_FLOOR: 0.50,   // Min 50% of share price when issuing
  DE_RISK_PREMIUM_RATE: 0.04,             // 4% interest per D/E unit above 0.5
  DE_RISK_PREMIUM_THRESHOLD: 0.5,         // D/E level where risk premium starts
  DISTRESS_PREMIUM_RATE: 0.03,            // 3% extra interest when cash < 0
  MAX_INTEREST_RATE: 0.25,                // Cap interest rate at 25%
  CREDIT_FROZEN_DE_EMERGENCY: 3.0,        // D/E threshold for credit freeze (emergency)

  // ============================================
  // FACTORY / MANUFACTURING CONSTANTS
  // ============================================

  BASE_FACTORY_EFFICIENCY: 0.7,           // Starting efficiency for new factories
  BASE_RECALL_PROBABILITY: 0.05,          // 5% baseline defect-to-recall rate
  BASE_COST_VOLATILITY: 0.15,             // 15% material cost fluctuation range
  BASE_CO2_EMISSIONS: 1000,               // Starting CO2 emissions per factory
  WASTE_RATE_BASE: 0.15,                  // 15% baseline waste rate
  WASTE_EFFICIENCY_REDUCTION: 0.12,       // Up to 12% waste reduction at max efficiency
  WASTE_DISPOSAL_COST_PER_UNIT: 5,        // $5 per wasted unit
  UTILIZATION_PENALTY_THRESHOLD: 0.95,    // >95% utilization triggers burnout
  BURNOUT_RISK_PER_ROUND: 0.10,           // Burnout accumulation at high utilization
  MAINTENANCE_BACKLOG_PER_ROUND: 50,      // Maintenance backlog increase
  DEFECT_RATE_INCREASE_AT_HIGH_UTIL: 0.02, // Defect rate increase at high utilization
  MATERIAL_TIER_COSTS: {                  // Cost per unit by material tier
    1: 50, 2: 100, 3: 150, 4: 200, 5: 350,
  } as Record<number, number>,
  NATURAL_MATERIAL_TIERS: {               // Default material tier by segment
    "Budget": 1, "General": 2, "Enthusiast": 3,
    "Professional": 4, "Active Lifestyle": 3,
  } as Record<string, number>,
  EFFICIENCY_INVESTMENT_MULTIPLIERS: {    // Diminishing returns per investment type
    workers: 0.01, supervisors: 0.015,
    engineers: 0.02, machinery: 0.012, factory: 0.008,
  },

  // ============================================
  // MARKETING CONSTANTS
  // ============================================

  PRICE_ELASTICITY_BY_SEGMENT: {          // Price sensitivity per segment
    "Budget": 2.5, "General": 1.8, "Enthusiast": 1.2,
    "Professional": 0.8, "Active Lifestyle": 1.5,
  } as Record<Segment, number>,
  MAX_PROMOTION_SALES_BOOST: 0.75,        // BAL-03: Cap sales boost at 75%
  ADVERTISING_SEGMENT_MULTIPLIERS: {      // Ad effectiveness by segment
    "Budget": 0.5, "General": 1.0, "Enthusiast": 0.75,
    "Professional": 0.85, "Active Lifestyle": 1.1,
  } as Record<Segment, number>,

  // ============================================
  // R&D CONSTANTS
  // ============================================

  PATENT_UNLOCK_THRESHOLD: 200,           // rdProgress needed for patent (100 base + 100 budget)
  PATENT_QUALITY_BONUS_MAX: 25,           // Max quality bonus from patents
  PATENT_COST_REDUCTION_MAX: 0.25,        // Max cost reduction from patents
  PATENT_SHARE_BONUS_MAX: 0.15,           // Max market share bonus from patents
  PATENT_PRODUCTION_GATE_UNITS: 10_000,   // Min units sold for full patent bonus
  TECH_DECAY_THRESHOLD_ROUNDS: 6,         // Rounds before tech bonuses start decaying
  TECH_MAX_DECAY_ROUNDS: 12,              // Rounds at which tech fully decays
  PRODUCT_DEV_STARTING_RATIO: 0.5,        // Products start at 50% of target quality/features
  QUALITY_MULTIPLIER_BASELINE: 50,        // Quality point baseline for multiplier calc

  // ============================================
  // FX CONSTANTS
  // ============================================

  FX_BASELINE_RATES: {                    // Standard FX rates for major pairs
    "EUR/USD": 1.10,
    "GBP/USD": 1.27,
    "JPY/USD": 0.0067,
    "CNY/USD": 0.14,
  } as Record<string, number>,
  FX_IMPACT_REPORTING_THRESHOLD: 100_000, // Min FX impact ($) before logging

  // ============================================
  // INITIAL STATE DEFAULTS
  // ============================================

  DEFAULT_SHARE_PRICE: 50,                // Starting share price
  DEFAULT_PRODUCT_CAPACITY: 50_000,       // Starting production line capacity
  DEFAULT_BENEFITS_PACKAGE: {             // Starting benefits configuration
    healthInsurance: 50, retirementMatch: 30, paidTimeOff: 15,
    parentalLeave: 6, professionalDevelopment: 1000,
  },
  INITIAL_PRODUCT_SPECS: {                // Starting product specs by segment
    "Budget":           { price: 200, quality: 50, features: 30, reliability: 60 },
    "General":          { price: 450, quality: 65, features: 50, reliability: 70 },
    "Enthusiast":       { price: 800, quality: 80, features: 70, reliability: 75 },
    "Professional":     { price: 1250, quality: 90, features: 85, reliability: 90 },
    "Active Lifestyle": { price: 600, quality: 70, features: 60, reliability: 80 },
  } as Record<Segment, { price: number; quality: number; features: number; reliability: number }>,
} as const;

// ============================================
// GAME COMPLEXITY SYSTEM
// ============================================

export type ComplexityPreset = "simple" | "standard" | "advanced" | "custom";

export interface GameComplexitySettings {
  preset: ComplexityPreset;

  // Module toggles
  modules: {
    factory: boolean;
    hr: boolean;
    finance: boolean;
    marketing: boolean;
    rd: boolean;
    esg: boolean;
  };

  // Feature toggles
  features: {
    multipleFactories: boolean;
    employeeManagement: boolean;
    detailedFinancials: boolean;
    boardMeetings: boolean;
    marketEvents: boolean;
    rubberBanding: boolean;
    productDevelopmentTimeline: boolean;
    trainingFatigue: boolean;
    benefitsSystem: boolean;
    inventoryManagement: boolean;
  };

  // Automation toggles (for simpler modes)
  automation: {
    autoHire: boolean;
    autoTrain: boolean;
    autoInvest: boolean;
    autoPrice: boolean;
  };

  // Difficulty modifiers
  difficulty: {
    startingCash: number;
    marketVolatility: number;      // 0.5 = half, 1.0 = normal, 2.0 = double
    competitorStrength: number;    // AI competitor aggressiveness
    economicStability: number;     // Reduces random economic events
  };
}

// Preset definitions
export const COMPLEXITY_PRESETS: Record<ComplexityPreset, Omit<GameComplexitySettings, "preset">> = {
  simple: {
    modules: {
      factory: true,
      hr: false,        // Auto-managed
      finance: false,   // Simplified
      marketing: true,
      rd: true,
      esg: false,       // Disabled
    },
    features: {
      multipleFactories: false,
      employeeManagement: false,
      detailedFinancials: false,
      boardMeetings: false,
      marketEvents: false,
      rubberBanding: true,
      productDevelopmentTimeline: false,  // Instant products
      trainingFatigue: false,
      benefitsSystem: false,
      inventoryManagement: false,
    },
    automation: {
      autoHire: true,
      autoTrain: true,
      autoInvest: true,
      autoPrice: false,
    },
    difficulty: {
      startingCash: 300_000_000,  // More starting cash
      marketVolatility: 0.5,
      competitorStrength: 0.7,
      economicStability: 0.8,
    },
  },

  standard: {
    modules: {
      factory: true,
      hr: true,
      finance: true,
      marketing: true,
      rd: true,
      esg: true,
    },
    features: {
      multipleFactories: true,
      employeeManagement: true,
      detailedFinancials: true,
      boardMeetings: true,
      marketEvents: true,
      rubberBanding: true,
      productDevelopmentTimeline: true,
      trainingFatigue: true,
      benefitsSystem: true,
      inventoryManagement: true,
    },
    automation: {
      autoHire: false,
      autoTrain: false,
      autoInvest: false,
      autoPrice: false,
    },
    difficulty: {
      startingCash: 200_000_000,
      marketVolatility: 1.0,
      competitorStrength: 1.0,
      economicStability: 0.5,
    },
  },

  advanced: {
    modules: {
      factory: true,
      hr: true,
      finance: true,
      marketing: true,
      rd: true,
      esg: true,
    },
    features: {
      multipleFactories: true,
      employeeManagement: true,
      detailedFinancials: true,
      boardMeetings: true,
      marketEvents: true,
      rubberBanding: false,  // No catch-up mechanics
      productDevelopmentTimeline: true,
      trainingFatigue: true,
      benefitsSystem: true,
      inventoryManagement: true,
    },
    automation: {
      autoHire: false,
      autoTrain: false,
      autoInvest: false,
      autoPrice: false,
    },
    difficulty: {
      startingCash: 150_000_000,  // Less starting cash
      marketVolatility: 1.5,      // More volatile
      competitorStrength: 1.3,    // Stronger AI
      economicStability: 0.3,     // More random events
    },
  },

  custom: {
    // Custom starts with standard settings, user can modify
    modules: {
      factory: true,
      hr: true,
      finance: true,
      marketing: true,
      rd: true,
      esg: true,
    },
    features: {
      multipleFactories: true,
      employeeManagement: true,
      detailedFinancials: true,
      boardMeetings: true,
      marketEvents: true,
      rubberBanding: true,
      productDevelopmentTimeline: true,
      trainingFatigue: true,
      benefitsSystem: true,
      inventoryManagement: true,
    },
    automation: {
      autoHire: false,
      autoTrain: false,
      autoInvest: false,
      autoPrice: false,
    },
    difficulty: {
      startingCash: 200_000_000,
      marketVolatility: 1.0,
      competitorStrength: 1.0,
      economicStability: 0.5,
    },
  },
};

/**
 * Get complexity settings for a preset
 */
export function getComplexitySettings(preset: ComplexityPreset): GameComplexitySettings {
  return {
    preset,
    ...COMPLEXITY_PRESETS[preset],
  };
}

/**
 * Check if a feature is enabled for given settings
 */
export function isFeatureEnabled(
  settings: GameComplexitySettings,
  feature: keyof GameComplexitySettings["features"]
): boolean {
  return settings.features[feature];
}

/**
 * Check if a module is enabled for given settings
 */
export function isModuleEnabled(
  settings: GameComplexitySettings,
  module: keyof GameComplexitySettings["modules"]
): boolean {
  return settings.modules[module];
}
