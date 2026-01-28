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
} from "./market";

// State types
export type {
  FinancialState,
  ESGState,
  TeamState,
  StateVersion,
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
  EFFICIENCY_PER_MILLION: 0.01,
  EFFICIENCY_DIMINISH_THRESHOLD: 10_000_000,
  MAX_EFFICIENCY: 1.0,

  // Upgrades
  UPGRADE_COSTS: {
    sixSigma: 75_000_000,
    automation: 75_000_000,
    materialRefinement: 100_000_000,
    supplyChain: 200_000_000,
    warehousing: 100_000_000,
  } as Record<FactoryUpgrade, number>,

  // HR
  BASE_WORKER_OUTPUT: 100,
  BASE_DEFECT_RATE: 0.05,
  BASE_TURNOVER_RATE: 0.12,
  WORKERS_PER_MACHINE: 2.5,
  WORKERS_PER_SUPERVISOR: 15,
  ENGINEERS_PER_FACTORY: 8,
  BASE_RD_POINTS_PER_ENGINEER: 10,
  MAX_SALARY: 500_000,
  SALARY_MULTIPLIER_MIN: 0.8,
  SALARY_MULTIPLIER_MAX: 2.2,
  HIRING_COST_MULTIPLIER: 0.15,

  // Recruitment
  RECRUITMENT_COSTS: {
    basic: 5_000,
    premium: 15_000,
    executive: 50_000,
  },
  RECRUITMENT_CANDIDATES: {
    basic: 3,
    premium: 5,
    executive: 4,
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
  FX_VOLATILITY_MIN: 0.15,
  FX_VOLATILITY_MAX: 0.25,
  BOARD_MEETINGS_PER_YEAR: 2,

  // ESG
  ESG_WORKPLACE_SAFETY_COST: 2_000_000,
  ESG_WORKPLACE_SAFETY_POINTS: 200,
  ESG_CODE_OF_ETHICS_POINTS: 200,
  ESG_FAIR_WAGE_WORKER_POINTS: 220,
  ESG_FAIR_WAGE_SUPERVISOR_POINTS: 40,
  ESG_SUPPLIER_ETHICS_COST_MULTIPLIER: 1.20,

  // Market
  SEGMENTS: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] as Segment[],
  REGIONS: ["North America", "Europe", "Asia", "MENA"] as Region[],

  // Training
  TRAINING_FATIGUE_THRESHOLD: 2,        // Programs per year before diminishing returns
  TRAINING_FATIGUE_PENALTY: 0.2,        // 20% effectiveness reduction per extra program
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
  PRODUCT_DEV_BASE_ROUNDS: 2,           // Base rounds to develop a product
  PRODUCT_DEV_QUALITY_FACTOR: 0.02,     // Extra rounds per quality point above 50
  PRODUCT_DEV_ENGINEER_SPEEDUP: 0.05,   // Speedup per engineer (max 50%)

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
  PRICE_FLOOR_PENALTY_THRESHOLD: 0.15,  // 15% below segment minimum = penalty zone
  PRICE_FLOOR_PENALTY_MAX: 0.30,        // Max 30% score reduction at extreme low prices

  // Rubber-banding (catch-up mechanics)
  RUBBER_BAND_TRAILING_BOOST: 1.15,     // Boost for trailing teams
  RUBBER_BAND_LEADING_PENALTY: 0.92,    // Penalty for leading teams
  RUBBER_BAND_THRESHOLD: 0.5,           // Trigger when share < avg * threshold

  // Brand - Tuned for balance (v2.4.0)
  // Fine-tuned decay and growth for competitive balance
  BRAND_DECAY_RATE: 0.065,              // 6.5% brand decay per round
  BRAND_MAX_GROWTH_PER_ROUND: 0.02,     // Max 2% brand growth per round

  // Initial State Defaults
  DEFAULT_STARTING_CASH: 200_000_000,
  DEFAULT_MARKET_CAP: 500_000_000,
  DEFAULT_SHARES_ISSUED: 10_000_000,
  DEFAULT_RAW_MATERIALS: 5_000_000,
  DEFAULT_LABOR_COST: 5_000_000,
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
