/**
 * Shared test helpers for Part B unit tests.
 * Reuses existing testkit infrastructure — no reinvention.
 */

import {
  createMinimalTeamState,
  createMinimalMarketState,
  createMinimalEngineContext,
} from "@/engine/testkit/scenarioGenerator";
import { CONSTANTS } from "@/engine/types";
import type { TeamState } from "@/engine/types/state";
import type { MarketState } from "@/engine/types/market";
import type { EngineContext } from "@/engine/core/EngineContext";
import type { Product } from "@/engine/types/product";
import type { Factory, Segment } from "@/engine/types/factory";
import type { Employee, EmployeeStats, EngineerStats, SupervisorStats, EmployeeRole } from "@/engine/types/employee";

// ============================================
// STATE FACTORIES
// ============================================

/**
 * Create a minimal TeamState with sane defaults.
 * Deep-merges overrides onto the initial state.
 */
export function fresh_company_state(overrides?: Partial<TeamState>): TeamState {
  return createMinimalTeamState(overrides);
}

/**
 * Create a minimal MarketState with optional overrides.
 */
export function fresh_market_state(overrides?: Partial<MarketState>): MarketState {
  return createMinimalMarketState(overrides);
}

/**
 * Create an EngineContext for deterministic tests.
 */
export function create_context(
  seed: string = "unit-test-seed",
  round: number = 1,
  teamId: string = "team-test"
): EngineContext {
  return createMinimalEngineContext(seed, round, teamId);
}

// ============================================
// PRODUCT HELPERS
// ============================================

/**
 * Create a product stub with configurable fields.
 */
export function create_product(overrides?: Partial<Product>): Product {
  const segment: Segment = overrides?.segment ?? "General";
  const specs = CONSTANTS.INITIAL_PRODUCT_SPECS[segment];

  return {
    id: overrides?.id ?? `product-test-${segment}`,
    name: overrides?.name ?? `Test ${segment} Phone`,
    segment,
    price: overrides?.price ?? specs.price,
    quality: overrides?.quality ?? specs.quality,
    features: overrides?.features ?? specs.features,
    reliability: overrides?.reliability ?? specs.reliability,
    unitsSold: overrides?.unitsSold ?? 0,
    unitsProduced: overrides?.unitsProduced ?? 0,
    unitCost: overrides?.unitCost ?? CONSTANTS.RAW_MATERIAL_COST_PER_UNIT[segment],
    developmentStatus: overrides?.developmentStatus ?? "launched",
    developmentProgress: overrides?.developmentProgress ?? 100,
    age: overrides?.age ?? 0,
    ...overrides,
  } as Product;
}

// ============================================
// FACTORY HELPERS
// ============================================

/**
 * Create a factory stub with configurable fields.
 */
export function create_factory(overrides?: Partial<Factory>): Factory {
  return {
    id: overrides?.id ?? "factory-test-1",
    name: overrides?.name ?? "Test Factory",
    region: overrides?.region ?? "North America",
    tier: (overrides as any)?.tier ?? "medium",
    maxLines: (overrides as any)?.maxLines ?? 3,
    baseCapacity: (overrides as any)?.baseCapacity ?? 25_000,
    productionLines: overrides?.productionLines ?? [],
    workers: overrides?.workers ?? 50,
    engineers: overrides?.engineers ?? 8,
    supervisors: overrides?.supervisors ?? 4,
    efficiency: overrides?.efficiency ?? CONSTANTS.BASE_FACTORY_EFFICIENCY,
    utilization: overrides?.utilization ?? 0,
    defectRate: overrides?.defectRate ?? CONSTANTS.BASE_DEFECT_RATE,
    materialLevel: overrides?.materialLevel ?? 1,
    shippingCost: overrides?.shippingCost ?? 100_000,
    storageCost: overrides?.storageCost ?? 50_000,
    efficiencyInvestment: overrides?.efficiencyInvestment ?? {
      workers: 0,
      supervisors: 0,
      engineers: 0,
      machinery: 0,
      factory: 0,
    },
    upgrades: overrides?.upgrades ?? [],
    warrantyReduction: overrides?.warrantyReduction ?? 0,
    recallProbability: overrides?.recallProbability ?? CONSTANTS.BASE_RECALL_PROBABILITY,
    stockoutReduction: overrides?.stockoutReduction ?? 0,
    demandSpikeCapture: overrides?.demandSpikeCapture ?? 0,
    costVolatility: overrides?.costVolatility ?? CONSTANTS.BASE_COST_VOLATILITY,
    co2Emissions: overrides?.co2Emissions ?? CONSTANTS.BASE_CO2_EMISSIONS,
    greenInvestment: overrides?.greenInvestment ?? 0,
    burnoutRisk: overrides?.burnoutRisk ?? 0,
    maintenanceBacklog: overrides?.maintenanceBacklog ?? 0,
    ...overrides,
  } as Factory;
}

// ============================================
// EMPLOYEE HELPERS
// ============================================

/**
 * Create base employee stats.
 */
export function create_stats(overrides?: Partial<EmployeeStats>): EmployeeStats {
  return {
    efficiency: 70,
    accuracy: 70,
    speed: 70,
    stamina: 70,
    discipline: 70,
    loyalty: 70,
    teamCompatibility: 70,
    health: 70,
    ...overrides,
  };
}

/**
 * Create engineer stats (includes innovation, problemSolving).
 */
export function create_engineer_stats(overrides?: Partial<EngineerStats>): EngineerStats {
  return {
    ...create_stats(overrides),
    innovation: overrides?.innovation ?? 70,
    problemSolving: overrides?.problemSolving ?? 70,
  } as EngineerStats;
}

/**
 * Create supervisor stats (includes leadership, tacticalPlanning).
 */
export function create_supervisor_stats(overrides?: Partial<SupervisorStats>): SupervisorStats {
  return {
    ...create_stats(overrides),
    leadership: overrides?.leadership ?? 70,
    tacticalPlanning: overrides?.tacticalPlanning ?? 70,
  } as SupervisorStats;
}

/**
 * Create a minimal employee stub.
 */
export function create_employee(
  role: EmployeeRole = "worker",
  statsOverrides?: Partial<EmployeeStats | EngineerStats | SupervisorStats>
): Employee {
  let stats: EmployeeStats | EngineerStats | SupervisorStats;

  if (role === "engineer") {
    stats = create_engineer_stats(statsOverrides as Partial<EngineerStats>);
  } else if (role === "supervisor") {
    stats = create_supervisor_stats(statsOverrides as Partial<SupervisorStats>);
  } else {
    stats = create_stats(statsOverrides);
  }

  return {
    id: `emp-test-${role}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    name: `Test ${role}`,
    stats,
    salary: 50_000,
    hiredRound: 1,
    factoryId: "factory-test-1",
    morale: CONSTANTS.BASE_EMPLOYEE_MORALE,
    burnout: 0,
    trainingHistory: {
      programsThisYear: 0,
      lastTrainingRound: 0,
      totalProgramsCompleted: 0,
    },
  };
}

// ============================================
// SEGMENT HELPERS
// ============================================

/**
 * Get segment weight defaults from CONSTANTS.
 */
export function get_segment_defaults(segment: Segment) {
  return {
    weights: CONSTANTS.SEGMENT_WEIGHTS[segment],
    specs: CONSTANTS.INITIAL_PRODUCT_SPECS[segment],
    materialCost: CONSTANTS.RAW_MATERIAL_COST_PER_UNIT[segment],
    elasticity: CONSTANTS.PRICE_ELASTICITY_BY_SEGMENT[segment],
  };
}

// ============================================
// STATEMENT ENGINE HELPERS
// ============================================

/**
 * Prepare state for IncomeStatementEngine / BalanceSheetEngine.
 * The IS engine expects state.employees = { workers: N, engineers: N, supervisors: N }
 * and products to have unitsSold defined.
 */
export function prepare_state_for_statements(overrides?: Partial<TeamState>) {
  const state = fresh_company_state(overrides) as any;
  if (Array.isArray(state.employees)) {
    const empArr = state.employees;
    state.employees = {
      workers: empArr.filter((e: any) => e.role === "worker").length,
      engineers: empArr.filter((e: any) => e.role === "engineer").length,
      supervisors: empArr.filter((e: any) => e.role === "supervisor").length,
    };
  }
  for (const p of state.products) {
    if (p.unitsSold === undefined) p.unitsSold = 0;
  }
  return state;
}

// Re-export CONSTANTS for convenient access in tests
export { CONSTANTS };
