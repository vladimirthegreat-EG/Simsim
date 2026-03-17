/**
 * Shared test helpers for Part C unit tests (new systems).
 */

import { FactoryModule } from "../../modules/FactoryModule";
import { FACTORY_TIERS } from "../../types/factory";
import type { TeamState } from "../../types/state";
import type { Factory, ProductionLine, FactoryTier } from "../../types/factory";
import type { Machine, MachineType } from "../../machinery/types";

/** Create a minimal TeamState for unit tests */
export function createTestState(overrides?: Partial<TeamState>): TeamState {
  const factory = createTestFactory("medium");
  return {
    version: "test",
    cash: 200_000_000,
    revenue: 0,
    netIncome: 0,
    totalAssets: 250_000_000,
    totalLiabilities: 0,
    shortTermDebt: 0,
    longTermDebt: 0,
    shareholdersEquity: 250_000_000,
    marketCap: 500_000_000,
    sharesIssued: 10_000_000,
    sharePrice: 50,
    eps: 0,
    inventory: { Budget: 0, General: 0, Enthusiast: 0, Professional: 0, "Active Lifestyle": 0 },
    cogs: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    factories: [factory],
    products: [
      { id: "prod-1", name: "Phone A", segment: "General", price: 410, quality: 50, features: 50, reliability: 50, developmentRound: 0, developmentProgress: 100, developmentStatus: "launched", productionCost: 200, salesHistory: [], qualityGrade: "B" as const },
      { id: "prod-2", name: "Phone B", segment: "Budget", price: 190, quality: 30, features: 30, reliability: 40, developmentRound: 0, developmentProgress: 100, developmentStatus: "launched", productionCost: 95, salesHistory: [], qualityGrade: "C" as const },
    ],
    employees: [],
    workforce: { totalHeadcount: 120, averageMorale: 70, averageEfficiency: 80, laborCost: 5_000_000, turnoverRate: 0.12 },
    brandValue: 0.3,
    marketShare: { Budget: 0.2, General: 0.2, Enthusiast: 0.2, Professional: 0.2, "Active Lifestyle": 0.2 },
    rdBudget: 5_000_000,
    rdProgress: 0,
    patents: 0,
    esgScore: 0,
    co2Emissions: 1000,
    materialTiers: {},
    round: 1,
    machineryStates: {},
    ...overrides,
  } as TeamState;
}

/** Create a test factory with production lines */
export function createTestFactory(tier: FactoryTier = "medium", id: string = "factory-1"): Factory {
  const config = FACTORY_TIERS[tier];
  const lines: ProductionLine[] = Array.from({ length: config.maxLines }, (_, i) => ({
    id: `${id}-line-${i}`,
    factoryId: id,
    productId: null,
    segment: null,
    targetOutput: 0,
    assignedMachines: [],
    assignedWorkers: 0,
    assignedEngineers: 0,
    assignedSupervisors: 0,
    status: "idle" as const,
    changeoverRoundsRemaining: 0,
  }));

  return {
    id,
    name: "Test Factory",
    region: "North America",
    tier,
    maxLines: config.maxLines,
    baseCapacity: config.baseCapacity,
    productionLines: lines,
    workers: 100,
    engineers: 10,
    supervisors: 7,
    efficiency: 0.8,
    utilization: 0,
    defectRate: 0.06,
    materialLevel: 1,
    shippingCost: 100_000,
    storageCost: 50_000,
    efficiencyInvestment: { workers: 0, supervisors: 0, engineers: 0, machinery: 0, factory: 0 },
    upgrades: [],
    warrantyReduction: 0,
    recallProbability: 0.05,
    stockoutReduction: 0,
    demandSpikeCapture: 0,
    costVolatility: 0.15,
    co2Emissions: 1000,
    greenInvestment: 0,
    burnoutRisk: 0,
    maintenanceBacklog: 0,
  };
}

/** Create a test machine */
export function createTestMachine(
  type: MachineType,
  factoryId: string,
  id: string,
  capacity: number = 5000,
  assignedLineId?: string | null
): Machine {
  return {
    id,
    type,
    name: `Test ${type}`,
    factoryId,
    status: "operational",
    healthPercent: 100,
    utilizationPercent: 0,
    purchaseCost: 5_000_000,
    currentValue: 4_000_000,
    maintenanceCostPerRound: 50_000,
    operatingCostPerRound: 100_000,
    capacityUnits: capacity,
    efficiencyMultiplier: 1.0,
    defectRateImpact: 0,
    purchaseRound: 1,
    expectedLifespanRounds: 40,
    ageRounds: 0,
    roundsSinceLastMaintenance: 0,
    scheduledMaintenanceRound: null,
    maintenanceHistory: [],
    totalMaintenanceSpent: 0,
    assignedLineId: assignedLineId ?? null,
  };
}
