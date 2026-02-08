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

  // Brand - Rebalanced (v3.1.0, Fix 2.1)
  // Reduced decay so brand strategy can actually build value over time
  BRAND_DECAY_RATE: 0.025,              // 2.5% brand decay per round (was 6.5%)
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
