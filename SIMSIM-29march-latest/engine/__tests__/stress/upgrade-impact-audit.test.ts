/**
 * Upgrade & Machinery Impact Audit — Multi-round simulation
 *
 * Two input categories:
 *   1. MACHINERY: production machines (capacity), automation machines (labor reduction), quality machines (defect reduction)
 *   2. FACTORY UPGRADES: automation, advancedRobotics, leanManufacturing, sixSigma, etc.
 *
 * Shows how these compound over 32 rounds with non-linear strategies across 4–6 teams.
 * Each team pursues a different strategy with different purchase timings.
 */
import { describe, it, expect } from "vitest";
import {
  calculateLineOutput,
  getFactoryBottleneckAnalysis,
  getLineMachineCapacity,
  getLineWorkerRequirements,
  getUnderstaffingRatio,
} from "../../modules/ProductionLineManager";
import { FactoryModule } from "../../modules/FactoryModule";
import { CONSTANTS } from "../../types";
import type { TeamState, Factory } from "../../types";
import type { Segment, ProductionLine, FactoryUpgrade } from "../../types/factory";
import { MACHINE_CONFIGS } from "../../machinery/MachineCatalog";
import type { Machine, MachineType } from "../../machinery/types";

// ============================================
// HELPERS
// ============================================

/** Create a fresh team state with proper production lines */
function createTeamState(): TeamState {
  const state: TeamState = {
    version: "1.0.0",
    cash: 500_000_000,
    revenue: 0,
    netIncome: 0,
    totalAssets: 500_000_000,
    totalLiabilities: 0,
    shortTermDebt: 0,
    longTermDebt: 0,
    shareholdersEquity: 500_000_000,
    marketCap: 1_000_000_000,
    sharesIssued: 10_000_000,
    sharePrice: 100,
    eps: 0,
    inventory: {
      finishedGoods: {} as Record<string, number>,
      rawMaterials: {},
      workInProgress: 0,
    },
    cogs: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    materials: { inventory: [], activeOrders: [], totalInventoryValue: 0, holdingCosts: 0, region: "North America" as const },
    tariffs: { activeTariffs: [], totalTariffCost: 0, affectedRoutes: [] },
    factories: [],
    products: [
      { id: "prod-budget", name: "Budget Phone", segment: "Budget" as Segment, price: 150, quality: 40, features: 30, reliability: 60, developmentRound: 0, developmentStatus: "launched" as const, developmentProgress: 100, targetQuality: 40, targetFeatures: 30, roundsRemaining: 0, unitCost: 80 },
      { id: "prod-general", name: "Standard Phone", segment: "General" as Segment, price: 300, quality: 55, features: 50, reliability: 70, developmentRound: 0, developmentStatus: "launched" as const, developmentProgress: 100, targetQuality: 55, targetFeatures: 50, roundsRemaining: 0, unitCost: 150 },
    ],
    employees: [],
    workforce: { totalHeadcount: 0, averageMorale: 75, averageEfficiency: 70, laborCost: 0, turnoverRate: 0.125 },
    brandValue: 0.5,
    marketShare: {},
    rdBudget: 0,
    rdProgress: 0,
    patents: 0,
    esgScore: 100,
    co2Emissions: 1000,
    benefits: {
      package: { healthInsurance: true, retirementMatch: 3, paidTimeOff: 10, parentalLeave: 0, stockOptions: false, flexibleWork: false, professionalDevelopment: false },
      totalAnnualCost: 0, moraleImpact: 0, turnoverReduction: 0, esgContribution: 0,
    },
  } as TeamState;

  // Create a medium factory with 6 lines
  const factory = FactoryModule.createNewFactory("Main Factory", "North America", 0, undefined, "medium");
  factory.workers = 50;
  factory.engineers = 8;
  factory.supervisors = 5;

  // Set up 2 active lines with 1 starter Assembly Line each (matches createInitialTeamState)
  factory.productionLines[0] = {
    id: "line-1", factoryId: factory.id, productId: "prod-budget", segment: "Budget" as Segment,
    targetOutput: 20000, assignedMachines: ["starter-m1"] as string[], assignedWorkers: 25,
    assignedEngineers: 4, assignedSupervisors: 2, status: "active" as const, changeoverRoundsRemaining: 0,
  };
  factory.productionLines[1] = {
    id: "line-2", factoryId: factory.id, productId: "prod-general", segment: "General" as Segment,
    targetOutput: 20000, assignedMachines: ["starter-m2"] as string[], assignedWorkers: 25,
    assignedEngineers: 4, assignedSupervisors: 3, status: "active" as const, changeoverRoundsRemaining: 0,
  };

  state.factories = [factory];

  // Starter machines (1 Assembly Line per line)
  const starterConfig = MACHINE_CONFIGS.find(c => c.type === "assembly_line")!;
  state.machineryStates = {
    [factory.id]: {
      machines: [
        { id: "starter-m1", type: "assembly_line", name: "Phone Assembly Line", factoryId: factory.id, assignedLineId: "line-1", status: "operational", healthPercent: 100, utilizationPercent: 0, purchaseCost: starterConfig.baseCost, currentValue: starterConfig.baseCost, maintenanceCostPerRound: starterConfig.baseMaintenanceCost, operatingCostPerRound: starterConfig.baseOperatingCost, capacityUnits: starterConfig.baseCapacity, efficiencyMultiplier: 1.0, defectRateImpact: 0, purchaseRound: 0, expectedLifespanRounds: 40, ageRounds: 0, roundsSinceLastMaintenance: 0, scheduledMaintenanceRound: null, maintenanceHistory: [], totalMaintenanceSpent: 0, laborReduction: 0, shippingReduction: 0 },
        { id: "starter-m2", type: "assembly_line", name: "Phone Assembly Line", factoryId: factory.id, assignedLineId: "line-2", status: "operational", healthPercent: 100, utilizationPercent: 0, purchaseCost: starterConfig.baseCost, currentValue: starterConfig.baseCost, maintenanceCostPerRound: starterConfig.baseMaintenanceCost, operatingCostPerRound: starterConfig.baseOperatingCost, capacityUnits: starterConfig.baseCapacity, efficiencyMultiplier: 1.0, defectRateImpact: 0, purchaseRound: 0, expectedLifespanRounds: 40, ageRounds: 0, roundsSinceLastMaintenance: 0, scheduledMaintenanceRound: null, maintenanceHistory: [], totalMaintenanceSpent: 0, laborReduction: 0, shippingReduction: 0 },
      ] as any[], totalCapacity: starterConfig.baseCapacity * 2, totalMaintenanceCost: 0, totalOperatingCost: 0, averageHealth: 100 },
  };

  // Create employees
  for (let i = 0; i < 50; i++) {
    state.employees.push({
      id: `worker-${i}`, role: "worker", name: `Worker ${i}`,
      stats: { efficiency: 80, accuracy: 80, speed: 80, stamina: 80, discipline: 80, loyalty: 80, teamCompatibility: 80, health: 80 },
      salary: 45000, hiredRound: 0, factoryId: factory.id, morale: 75, burnout: 0,
      trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
    });
  }

  return state;
}

/** Buy a machine and assign it to a line */
function buyMachine(state: TeamState, factoryId: string, lineId: string, machineType: MachineType, machineId: string): void {
  const config = MACHINE_CONFIGS.find(c => c.type === machineType);
  if (!config) return;

  const machine: any = {
    id: machineId,
    type: machineType,
    name: config.name,
    factoryId,
    assignedLineId: lineId,
    status: "operational",
    health: 100,
    age: 0,
    capacityUnits: config.baseCapacity,
    maintenanceCost: config.baseMaintenanceCost,
    operatingCost: config.baseOperatingCost,
    purchaseCost: config.baseCost,
    purchaseRound: 0,
    lastMaintenanceRound: 0,
    defectRateReduction: config.defectRateReduction,
    laborReduction: config.laborReduction,
  };

  const fms = state.machineryStates![factoryId];
  fms.machines.push(machine);
  fms.totalCapacity = fms.machines.reduce((s: number, m: any) => s + (m.capacityUnits ?? 0), 0);

  // Add to line's assignedMachines
  const factory = state.factories.find(f => f.id === factoryId);
  const line = factory?.productionLines.find(l => l.id === lineId);
  if (line && !line.assignedMachines.includes(machineId)) {
    line.assignedMachines.push(machineId);
  }
}

/** Add workers to factory and distribute to lines */
function addWorkers(state: TeamState, factoryId: string, count: number): void {
  const factory = state.factories.find(f => f.id === factoryId);
  if (!factory) return;
  factory.workers += count;

  for (let i = 0; i < count; i++) {
    state.employees.push({
      id: `hired-worker-${factory.workers + i}`, role: "worker", name: `Hired Worker ${i}`,
      stats: { efficiency: 80, accuracy: 80, speed: 80, stamina: 80, discipline: 80, loyalty: 80, teamCompatibility: 80, health: 80 },
      salary: 45000, hiredRound: 0, factoryId, morale: 75, burnout: 0,
      trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
    });
  }
}

/** Distribute workers evenly across active lines */
function distributeWorkers(state: TeamState, factoryId: string): void {
  const factory = state.factories.find(f => f.id === factoryId);
  if (!factory) return;
  const active = factory.productionLines.filter(l => l.status === "active" && l.productId);
  if (active.length === 0) return;
  const perLine = Math.floor(factory.workers / active.length);
  for (const line of active) {
    line.assignedWorkers = perLine;
  }
}

/** Set target output for a line based on its machine capacity */
function setTargetToMachineCapacity(state: TeamState, lineId: string): void {
  const cap = getLineMachineCapacity(state, lineId);
  for (const f of state.factories) {
    const line = f.productionLines.find(l => l.id === lineId);
    if (line) {
      line.targetOutput = Math.max(cap, line.targetOutput);
    }
  }
}

/** Get total output across all lines in a factory */
function getTotalOutput(state: TeamState, factoryId: string): number {
  const analysis = getFactoryBottleneckAnalysis(state, factoryId);
  return Object.values(analysis).reduce((s, r: any) => s + r.projectedOutput, 0);
}

/** Get per-line breakdown */
function getLineBreakdown(state: TeamState, factoryId: string): Array<{ lineId: string; output: number; bottleneck: string; machCap: number; workerCap: number; staffing: number }> {
  const analysis = getFactoryBottleneckAnalysis(state, factoryId);
  return Object.entries(analysis).map(([lineId, r]: [string, any]) => ({
    lineId,
    output: r.projectedOutput,
    bottleneck: r.bottleneck,
    machCap: r.machineCapacity,
    workerCap: r.workerCapacity,
    staffing: r.staffingRatio,
  }));
}

// ============================================
// MACHINE CATALOG REFERENCE
// ============================================

const PRODUCTION_MACHINES: MachineType[] = ["assembly_line", "injection_molder", "pcb_assembler", "cnc_machine", "welding_station", "paint_booth", "laser_cutter", "packaging_system"];
const AUTOMATION_MACHINES: MachineType[] = ["robotic_arm", "conveyor_system"];
const QUALITY_MACHINES: MachineType[] = ["quality_scanner", "testing_rig"];

// ============================================
// TEAM STRATEGIES (non-linear, different timing)
// ============================================

interface RoundAction {
  round: number;
  machines?: { type: MachineType; line: string; count: number }[];
  workers?: number;
  upgrades?: FactoryUpgrade[];
  targetOverride?: { line: string; target: number }[];
}

interface TeamStrategy {
  name: string;
  description: string;
  actions: RoundAction[];
}

const STRATEGIES: TeamStrategy[] = [
  {
    name: "Cost Leader",
    description: "Heavy production machines early, lean upgrades, minimal automation",
    actions: [
      { round: 1, machines: [{ type: "assembly_line", line: "line-1", count: 2 }, { type: "injection_molder", line: "line-2", count: 1 }], workers: 20 },
      { round: 3, machines: [{ type: "assembly_line", line: "line-1", count: 1 }, { type: "assembly_line", line: "line-2", count: 1 }], workers: 10 },
      { round: 5, upgrades: ["leanManufacturing"], workers: 10 },
      { round: 8, machines: [{ type: "assembly_line", line: "line-1", count: 2 }], upgrades: ["sixSigma"] },
      { round: 12, machines: [{ type: "conveyor_system", line: "line-1", count: 1 }], workers: 20 },
      { round: 16, upgrades: ["continuousImprovement"], workers: 15 },
      { round: 20, machines: [{ type: "assembly_line", line: "line-2", count: 2 }] },
      { round: 24, upgrades: ["supplyChain"], workers: 10 },
      { round: 28, machines: [{ type: "packaging_system", line: "line-1", count: 1 }] },
    ],
  },
  {
    name: "Quality Premium",
    description: "Quality machines + upgrades first, fewer but higher-margin units",
    actions: [
      { round: 1, machines: [{ type: "assembly_line", line: "line-1", count: 1 }, { type: "assembly_line", line: "line-2", count: 1 }], workers: 10 },
      { round: 2, machines: [{ type: "quality_scanner", line: "line-1", count: 1 }, { type: "testing_rig", line: "line-2", count: 1 }] },
      { round: 4, upgrades: ["sixSigma"], machines: [{ type: "pcb_assembler", line: "line-1", count: 1 }] },
      { round: 6, upgrades: ["qualityLab"], workers: 15 },
      { round: 10, machines: [{ type: "cnc_machine", line: "line-2", count: 1 }, { type: "laser_cutter", line: "line-1", count: 1 }] },
      { round: 14, upgrades: ["cleanRoom"], workers: 10 },
      { round: 18, machines: [{ type: "quality_scanner", line: "line-2", count: 1 }], upgrades: ["digitalTwin"] },
      { round: 22, upgrades: ["continuousImprovement"] },
      { round: 26, machines: [{ type: "pcb_assembler", line: "line-2", count: 1 }], workers: 10 },
      { round: 30, upgrades: ["iotIntegration"] },
    ],
  },
  {
    name: "Automation Giant",
    description: "Heavy automation machines + factory automation upgrades, minimal workers",
    actions: [
      { round: 1, machines: [{ type: "assembly_line", line: "line-1", count: 2 }, { type: "assembly_line", line: "line-2", count: 2 }] },
      { round: 3, machines: [{ type: "robotic_arm", line: "line-1", count: 1 }, { type: "conveyor_system", line: "line-2", count: 1 }], upgrades: ["automation"] },
      { round: 5, machines: [{ type: "robotic_arm", line: "line-2", count: 1 }], workers: 10 },
      { round: 8, upgrades: ["advancedRobotics"], machines: [{ type: "conveyor_system", line: "line-1", count: 1 }] },
      { round: 12, upgrades: ["modularLines"], machines: [{ type: "robotic_arm", line: "line-1", count: 1 }] },
      { round: 16, machines: [{ type: "assembly_line", line: "line-1", count: 2 }, { type: "assembly_line", line: "line-2", count: 2 }] },
      { round: 20, upgrades: ["iotIntegration"], workers: 10 },
      { round: 24, machines: [{ type: "conveyor_system", line: "line-1", count: 1 }, { type: "conveyor_system", line: "line-2", count: 1 }] },
      { round: 28, upgrades: ["flexibleManufacturing"] },
    ],
  },
  {
    name: "Growth Machine",
    description: "Aggressive scaling — machines + workers every few rounds",
    actions: [
      { round: 1, machines: [{ type: "assembly_line", line: "line-1", count: 3 }, { type: "assembly_line", line: "line-2", count: 3 }], workers: 30 },
      { round: 3, workers: 20, machines: [{ type: "injection_molder", line: "line-1", count: 1 }] },
      { round: 5, workers: 20, machines: [{ type: "assembly_line", line: "line-1", count: 1 }, { type: "assembly_line", line: "line-2", count: 1 }] },
      { round: 7, workers: 20, upgrades: ["leanManufacturing"] },
      { round: 9, machines: [{ type: "assembly_line", line: "line-1", count: 2 }, { type: "assembly_line", line: "line-2", count: 2 }], workers: 20 },
      { round: 12, upgrades: ["automation"], workers: 15 },
      { round: 15, machines: [{ type: "conveyor_system", line: "line-1", count: 1 }, { type: "conveyor_system", line: "line-2", count: 1 }], workers: 20 },
      { round: 18, upgrades: ["advancedRobotics"], workers: 10 },
      { round: 21, machines: [{ type: "assembly_line", line: "line-1", count: 2 }, { type: "assembly_line", line: "line-2", count: 2 }], workers: 15 },
      { round: 24, upgrades: ["sixSigma"], workers: 10 },
      { round: 28, machines: [{ type: "robotic_arm", line: "line-1", count: 1 }, { type: "robotic_arm", line: "line-2", count: 1 }] },
      { round: 32, upgrades: ["continuousImprovement"] },
    ],
  },
  {
    name: "ESG Pioneer",
    description: "Green upgrades first, steady growth, efficiency focus",
    actions: [
      { round: 1, machines: [{ type: "assembly_line", line: "line-1", count: 1 }, { type: "assembly_line", line: "line-2", count: 1 }], workers: 10 },
      { round: 2, upgrades: ["solarPanels"] },
      { round: 4, upgrades: ["waterRecycling"], workers: 10 },
      { round: 6, machines: [{ type: "assembly_line", line: "line-1", count: 1 }], upgrades: ["wasteToEnergy"] },
      { round: 9, upgrades: ["smartGrid"], workers: 10 },
      { round: 12, upgrades: ["carbonCapture"], machines: [{ type: "assembly_line", line: "line-2", count: 1 }] },
      { round: 15, upgrades: ["leanManufacturing"], workers: 15 },
      { round: 18, machines: [{ type: "conveyor_system", line: "line-1", count: 1 }], workers: 10 },
      { round: 22, upgrades: ["continuousImprovement"] },
      { round: 26, machines: [{ type: "assembly_line", line: "line-1", count: 1 }, { type: "assembly_line", line: "line-2", count: 1 }], workers: 10 },
      { round: 30, upgrades: ["sixSigma"] },
    ],
  },
  {
    name: "Late Bloomer",
    description: "Saves cash for 10 rounds, then explosive investment in rounds 10-20",
    actions: [
      { round: 2, workers: 5 },
      { round: 5, workers: 5 },
      { round: 10, machines: [{ type: "assembly_line", line: "line-1", count: 4 }, { type: "assembly_line", line: "line-2", count: 4 }], workers: 40 },
      { round: 11, upgrades: ["automation", "leanManufacturing"] },
      { round: 13, machines: [{ type: "robotic_arm", line: "line-1", count: 2 }, { type: "conveyor_system", line: "line-2", count: 2 }] },
      { round: 15, upgrades: ["advancedRobotics", "sixSigma"], workers: 20 },
      { round: 18, machines: [{ type: "assembly_line", line: "line-1", count: 2 }, { type: "assembly_line", line: "line-2", count: 2 }] },
      { round: 20, upgrades: ["modularLines", "continuousImprovement"] },
      { round: 24, machines: [{ type: "quality_scanner", line: "line-1", count: 1 }, { type: "testing_rig", line: "line-2", count: 1 }], workers: 10 },
      { round: 28, upgrades: ["digitalTwin"] },
    ],
  },
];

// ============================================
// TESTS
// ============================================

describe("Upgrade & Machinery Impact Audit", () => {

  // ─────────────────────────────────────────
  // 1. Machine Catalog Reference Table
  // ─────────────────────────────────────────
  describe("Machine catalog reference", () => {
    it("prints all machines with category, capacity, labor reduction, defect reduction", () => {
      console.log("\n╔══════════════════════════════════════════════════════════════════════════════════╗");
      console.log("║                           MACHINE CATALOG REFERENCE                            ║");
      console.log("╠═══════════════════════╦══════════════╦══════════╦══════════╦════════════╦═══════╣");
      console.log("║ Machine               ║ Category     ║ Capacity ║ Labor -% ║ Defect -%  ║ Cost  ║");
      console.log("╠═══════════════════════╬══════════════╬══════════╬══════════╬════════════╬═══════╣");

      for (const config of MACHINE_CONFIGS) {
        const name = config.name.padEnd(21);
        const cat = config.category.padEnd(12);
        const cap = String(config.baseCapacity).padStart(8);
        const labor = `${(config.laborReduction * 100).toFixed(0)}%`.padStart(8);
        const defect = `${(config.defectRateReduction * 100).toFixed(1)}%`.padStart(10);
        const cost = `$${(config.baseCost / 1_000_000).toFixed(1)}M`.padStart(5);
        console.log(`║ ${name} ║ ${cat} ║ ${cap} ║ ${labor} ║ ${defect} ║ ${cost} ║`);
      }
      console.log("╚═══════════════════════╩══════════════╩══════════╩══════════╩════════════╩═══════╝");

      expect(MACHINE_CONFIGS.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────
  // 2. Factory Upgrade Reference Table
  // ─────────────────────────────────────────
  describe("Factory upgrade reference", () => {
    it("prints all upgrades with costs and key effects", () => {
      const upgrades: { name: FactoryUpgrade; cost: number; effect: string }[] = [
        { name: "sixSigma", cost: 40_000_000, effect: "-40% defects, -50% warranty, -75% recall" },
        { name: "automation", cost: 75_000_000, effect: "-35% unit cost, -60% cost volatility" },
        { name: "materialRefinement", cost: 100_000_000, effect: "+1 material level" },
        { name: "supplyChain", cost: 200_000_000, effect: "-70% shipping, -70% stockout" },
        { name: "warehousing", cost: 100_000_000, effect: "-90% storage cost, +90% demand spike capture" },
        { name: "leanManufacturing", cost: 25_000_000, effect: "+15% factory efficiency, -10% operating cost" },
        { name: "digitalTwin", cost: 60_000_000, effect: "-20% maintenance cost, predictive maintenance" },
        { name: "iotIntegration", cost: 50_000_000, effect: "-15% breakdown probability" },
        { name: "modularLines", cost: 80_000_000, effect: "-50% changeover time" },
        { name: "continuousImprovement", cost: 30_000_000, effect: "+1% efficiency per round (compounds)" },
        { name: "solarPanels", cost: 45_000_000, effect: "-40% energy cost, +100 ESG" },
        { name: "waterRecycling", cost: 25_000_000, effect: "-30% water cost, +50 ESG" },
        { name: "wasteToEnergy", cost: 35_000_000, effect: "-20% waste cost, +75 ESG" },
        { name: "smartGrid", cost: 55_000_000, effect: "-25% energy cost, +80 ESG" },
        { name: "carbonCapture", cost: 70_000_000, effect: "-50% CO2, +150 ESG" },
        { name: "cleanRoom", cost: 120_000_000, effect: "+20% Professional price, enables high-purity" },
        { name: "rapidPrototyping", cost: 40_000_000, effect: "-50% R&D prototype time" },
        { name: "advancedRobotics", cost: 100_000_000, effect: "+50% capacity multiplier, -30% labor" },
        { name: "qualityLab", cost: 60_000_000, effect: "-50% defect rate, +30% QA speed" },
        { name: "flexibleManufacturing", cost: 90_000_000, effect: "All segments, -30% changeover" },
      ];

      console.log("\n╔════════════════════════════════════════════════════════════════════════════════════╗");
      console.log("║                            FACTORY UPGRADES REFERENCE                             ║");
      console.log("╠═══════════════════════════╦═══════╦════════════════════════════════════════════════╣");
      console.log("║ Upgrade                   ║ Cost  ║ Effect                                        ║");
      console.log("╠═══════════════════════════╬═══════╬════════════════════════════════════════════════╣");

      for (const u of upgrades) {
        const name = u.name.padEnd(25);
        const cost = `$${(u.cost / 1_000_000).toFixed(0)}M`.padStart(5);
        const effect = u.effect.padEnd(46);
        console.log(`║ ${name} ║ ${cost} ║ ${effect} ║`);
      }
      console.log("╚═══════════════════════════╩═══════╩════════════════════════════════════════════════╝");

      expect(upgrades.length).toBe(20);
    });
  });

  // ─────────────────────────────────────────
  // 3. Starter State Baseline
  // ─────────────────────────────────────────
  describe("Starter state baseline", () => {
    it("shows baseline output with no machines (just workers)", () => {
      const state = createTeamState();
      const factory = state.factories[0];
      const output = getTotalOutput(state, factory.id);
      const breakdown = getLineBreakdown(state, factory.id);

      console.log("\n=== STARTER STATE (no machines) ===");
      console.log(`Workers: ${factory.workers}, Efficiency: ${factory.efficiency}`);
      console.log(`Total Output: ${output.toLocaleString()}`);
      for (const b of breakdown) {
        console.log(`  ${b.lineId}: output=${b.output.toLocaleString()} machCap=${b.machCap} workerCap=${b.workerCap} staffing=${b.staffing.toFixed(2)} bottleneck=${b.bottleneck}`);
      }

      expect(output).toBeGreaterThanOrEqual(0);
    });

    it("shows baseline with 2 assembly lines (starter machines)", () => {
      const state = createTeamState();
      const factory = state.factories[0];

      // Add starter machines: 1 per line
      buyMachine(state, factory.id, "line-1", "assembly_line", "starter-m1");
      buyMachine(state, factory.id, "line-2", "assembly_line", "starter-m2");

      // Set targets to machine capacity
      setTargetToMachineCapacity(state, "line-1");
      setTargetToMachineCapacity(state, "line-2");
      distributeWorkers(state, factory.id);

      const output = getTotalOutput(state, factory.id);
      const breakdown = getLineBreakdown(state, factory.id);

      console.log("\n=== BASELINE (2 assembly lines, 50 workers) ===");
      console.log(`Total Output: ${output.toLocaleString()}`);
      for (const b of breakdown) {
        console.log(`  ${b.lineId}: output=${b.output.toLocaleString()} machCap=${b.machCap} workerCap=${b.workerCap} staffing=${b.staffing.toFixed(2)} bottleneck=${b.bottleneck}`);
      }

      expect(output).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────
  // 4. Machine Type Impact Comparison
  // ─────────────────────────────────────────
  describe("Machine type impact comparison", () => {
    it("compares adding 1 of each production machine type to line-1", () => {
      console.log("\n=== MACHINE TYPE COMPARISON (1 machine on line-1, 25 workers) ===");
      console.log("Machine Type          | Capacity | Line Output | Bottleneck  | Worker Cap | Staffing");
      console.log("─────────────────────────────────────────────────────────────────────────────────────");

      for (const machType of [...PRODUCTION_MACHINES, ...AUTOMATION_MACHINES]) {
        const state = createTeamState();
        const factory = state.factories[0];

        buyMachine(state, factory.id, "line-1", machType, `test-${machType}`);
        const config = MACHINE_CONFIGS.find(c => c.type === machType)!;

        // Set target to max
        const line = factory.productionLines.find(l => l.id === "line-1")!;
        line.targetOutput = Math.max(config.baseCapacity, 5000);

        const analysis = getFactoryBottleneckAnalysis(state, factory.id);
        const r = analysis["line-1"] as any;

        const name = config.name.padEnd(21);
        const cap = String(config.baseCapacity).padStart(8);
        const out = String(r?.projectedOutput ?? 0).padStart(11);
        const bneck = (r?.bottleneck ?? "none").padEnd(11);
        const wcap = String(Math.floor(r?.workerCapacity ?? 0)).padStart(10);
        const stf = (r?.staffingRatio ?? 0).toFixed(2).padStart(8);

        console.log(`${name} | ${cap} | ${out} | ${bneck} | ${wcap} | ${stf}`);
      }

      expect(true).toBe(true);
    });

    it("compares stacking multiple machines on one line", () => {
      console.log("\n=== MACHINE STACKING (assembly_line × N on line-1, 50 workers) ===");
      console.log("Count | Machine Cap | Worker Cap | Output     | Bottleneck | Staffing");
      console.log("──────────────────────────────────────────────────────────────────────");

      for (const count of [1, 2, 3, 4, 6, 8, 10]) {
        const state = createTeamState();
        const factory = state.factories[0];

        for (let i = 0; i < count; i++) {
          buyMachine(state, factory.id, "line-1", "assembly_line", `stack-m${i}`);
        }

        const line = factory.productionLines.find(l => l.id === "line-1")!;
        line.targetOutput = count * 10_000; // Assembly line = 10K each
        line.assignedWorkers = 50; // All workers on this line

        const analysis = getFactoryBottleneckAnalysis(state, factory.id);
        const r = analysis["line-1"] as any;

        const cnt = String(count).padStart(5);
        const mcap = String(r?.machineCapacity ?? 0).padStart(11);
        const wcap = String(Math.floor(r?.workerCapacity ?? 0)).padStart(10);
        const out = String(r?.projectedOutput ?? 0).padStart(10);
        const bneck = (r?.bottleneck ?? "none").padEnd(10);
        const stf = (r?.staffingRatio ?? 0).toFixed(2).padStart(8);

        console.log(`${cnt} | ${mcap} | ${wcap} | ${out} | ${bneck} | ${stf}`);
      }

      expect(true).toBe(true);
    });
  });

  // ─────────────────────────────────────────
  // 5. Upgrade Impact on Output
  // ─────────────────────────────────────────
  describe("Upgrade impact on factory output", () => {
    it("tests each upgrade's effect on production", () => {
      const productionUpgrades: FactoryUpgrade[] = [
        "leanManufacturing", "automation", "advancedRobotics", "sixSigma",
        "qualityLab", "continuousImprovement", "modularLines",
      ];

      console.log("\n=== UPGRADE IMPACT ON PRODUCTION ===");
      console.log("Upgrade                   | Before Eff | After Eff | Before Defect | After Defect | Output Before | Output After");
      console.log("────────────────────────────────────────────────────────────────────────────────────────────────────────────────");

      for (const upgrade of productionUpgrades) {
        // Create baseline
        const state = createTeamState();
        const factory = state.factories[0];

        // Add some machines so we have production
        buyMachine(state, factory.id, "line-1", "assembly_line", "u-m1");
        buyMachine(state, factory.id, "line-1", "assembly_line", "u-m2");
        buyMachine(state, factory.id, "line-2", "assembly_line", "u-m3");
        buyMachine(state, factory.id, "line-2", "assembly_line", "u-m4");
        distributeWorkers(state, factory.id);
        setTargetToMachineCapacity(state, "line-1");
        setTargetToMachineCapacity(state, "line-2");

        const beforeEff = factory.efficiency;
        const beforeDefect = factory.defectRate;
        const beforeOutput = getTotalOutput(state, factory.id);

        // Apply upgrade
        FactoryModule.applyUpgradeEffects(factory, upgrade);
        factory.upgrades.push(upgrade);

        const afterEff = factory.efficiency;
        const afterDefect = factory.defectRate;
        const afterOutput = getTotalOutput(state, factory.id);

        const name = upgrade.padEnd(25);
        const bEff = (beforeEff * 100).toFixed(1).padStart(10);
        const aEff = (afterEff * 100).toFixed(1).padStart(9);
        const bDef = (beforeDefect * 100).toFixed(2).padStart(13);
        const aDef = (afterDefect * 100).toFixed(2).padStart(12);
        const bOut = beforeOutput.toLocaleString().padStart(13);
        const aOut = afterOutput.toLocaleString().padStart(12);

        console.log(`${name} | ${bEff}% | ${aEff}% | ${bDef}% | ${aDef}% | ${bOut} | ${aOut}`);
      }

      expect(true).toBe(true);
    });
  });

  // ─────────────────────────────────────────
  // 6. Multi-Round Strategy Simulation
  // ─────────────────────────────────────────
  describe("Multi-round strategy simulation (32 rounds)", () => {
    const checkpoints = [1, 4, 8, 12, 16, 20, 24, 28, 32];

    for (const strategy of STRATEGIES) {
      it(`${strategy.name}: ${strategy.description}`, () => {
        const state = createTeamState();
        const factory = state.factories[0];
        let machineCounter = 0;
        let totalInvestment = 0;

        console.log(`\n${"═".repeat(80)}`);
        console.log(`  STRATEGY: ${strategy.name}`);
        console.log(`  ${strategy.description}`);
        console.log("═".repeat(80));
        console.log("Round | Workers | Machines | Upgrades       | Machine Cap | Worker Cap | Output     | Bottleneck");
        console.log("──────────────────────────────────────────────────────────────────────────────────────────────────");

        for (let round = 1; round <= 32; round++) {
          // Apply any actions for this round
          const action = strategy.actions.find(a => a.round === round);
          if (action) {
            // Buy machines
            if (action.machines) {
              for (const m of action.machines) {
                const config = MACHINE_CONFIGS.find(c => c.type === m.type);
                for (let i = 0; i < m.count; i++) {
                  buyMachine(state, factory.id, m.line, m.type, `${strategy.name}-m${machineCounter++}`);
                  totalInvestment += config?.baseCost ?? 0;
                }
              }
            }

            // Hire workers
            if (action.workers) {
              addWorkers(state, factory.id, action.workers);
              totalInvestment += action.workers * 45_000; // Approximate hiring cost
            }

            // Apply upgrades
            if (action.upgrades) {
              for (const upgrade of action.upgrades) {
                if (!factory.upgrades.includes(upgrade)) {
                  FactoryModule.applyUpgradeEffects(factory, upgrade);
                  factory.upgrades.push(upgrade);
                  totalInvestment += CONSTANTS.UPGRADE_COSTS[upgrade] ?? 0;
                }
              }
            }

            // Update targets and worker distribution
            distributeWorkers(state, factory.id);
            setTargetToMachineCapacity(state, "line-1");
            setTargetToMachineCapacity(state, "line-2");
          }

          // Apply continuous improvement bonus if enabled
          if (factory.continuousImprovementEnabled && round > 1) {
            factory.continuousImprovementBonus = (factory.continuousImprovementBonus ?? 0) + 0.01;
            factory.efficiency = Math.min(1.0, (factory as any)._baseEfficiency ?? 0.7 + factory.continuousImprovementBonus);
          }
          if (action?.upgrades?.includes("continuousImprovement")) {
            (factory as any)._baseEfficiency = factory.efficiency;
          }

          // Print at checkpoints
          if (checkpoints.includes(round)) {
            const totalMachines = state.machineryStates![factory.id].machines.length;
            const totalMachCap = state.machineryStates![factory.id].machines.reduce((s: number, m: any) => s + (m.capacityUnits ?? 0), 0);
            const activeUpgrades = factory.upgrades.slice(0, 3).join(",") + (factory.upgrades.length > 3 ? `+${factory.upgrades.length - 3}` : "");

            const breakdown = getLineBreakdown(state, factory.id);
            const totalOutput = breakdown.reduce((s, b) => s + b.output, 0);
            const totalWorkerCap = breakdown.reduce((s, b) => s + b.workerCap, 0);
            const primaryBottleneck = breakdown.find(b => b.output > 0)?.bottleneck ?? "none";

            const rd = String(round).padStart(5);
            const wrk = String(factory.workers).padStart(7);
            const mch = String(totalMachines).padStart(8);
            const upg = activeUpgrades.padEnd(14);
            const mcap = totalMachCap.toLocaleString().padStart(11);
            const wcap = Math.floor(totalWorkerCap).toLocaleString().padStart(10);
            const out = totalOutput.toLocaleString().padStart(10);
            const bnk = primaryBottleneck.padEnd(10);

            console.log(`${rd} | ${wrk} | ${mch} | ${upg} | ${mcap} | ${wcap} | ${out} | ${bnk}`);
          }
        }

        // Final summary
        const finalOutput = getTotalOutput(state, factory.id);
        const totalMachines = state.machineryStates![factory.id].machines.length;
        const finalBreakdown = getLineBreakdown(state, factory.id);

        console.log("──────────────────────────────────────────────────────────────────────────────────────────────────");
        console.log(`FINAL: Output=${finalOutput.toLocaleString()}, Machines=${totalMachines}, Workers=${factory.workers}, Upgrades=${factory.upgrades.length}`);
        console.log(`Total Investment: $${(totalInvestment / 1_000_000).toFixed(1)}M`);
        console.log(`Output per $1M invested: ${(finalOutput / (totalInvestment / 1_000_000)).toFixed(0)} units`);
        console.log("Line breakdown:");
        for (const b of finalBreakdown) {
          console.log(`  ${b.lineId}: output=${b.output.toLocaleString()} machCap=${b.machCap.toLocaleString()} workerCap=${b.workerCap.toLocaleString()} staffing=${b.staffing.toFixed(2)} bottleneck=${b.bottleneck}`);
        }

        // Sanity checks
        expect(finalOutput).toBeGreaterThan(0);
        expect(Number.isFinite(finalOutput)).toBe(true);
        expect(totalMachines).toBeGreaterThan(0);
      });
    }
  });

  // ─────────────────────────────────────────
  // 7. Head-to-Head Strategy Comparison
  // ─────────────────────────────────────────
  describe("Head-to-head comparison at rounds 16, 24, 32", () => {
    it("ranks all strategies by output at each checkpoint", () => {
      const checkpoints = [16, 24, 32];
      const results: Record<string, Record<number, { output: number; workers: number; machines: number; upgrades: number; investment: number }>> = {};

      for (const strategy of STRATEGIES) {
        results[strategy.name] = {};
        const state = createTeamState();
        const factory = state.factories[0];
        let machineCounter = 0;
        let totalInvestment = 0;

        for (let round = 1; round <= 32; round++) {
          const action = strategy.actions.find(a => a.round === round);
          if (action) {
            if (action.machines) {
              for (const m of action.machines) {
                const config = MACHINE_CONFIGS.find(c => c.type === m.type);
                for (let i = 0; i < m.count; i++) {
                  buyMachine(state, factory.id, m.line, m.type, `cmp-${strategy.name}-m${machineCounter++}`);
                  totalInvestment += config?.baseCost ?? 0;
                }
              }
            }
            if (action.workers) {
              addWorkers(state, factory.id, action.workers);
              totalInvestment += action.workers * 45_000;
            }
            if (action.upgrades) {
              for (const upgrade of action.upgrades) {
                if (!factory.upgrades.includes(upgrade)) {
                  FactoryModule.applyUpgradeEffects(factory, upgrade);
                  factory.upgrades.push(upgrade);
                  totalInvestment += CONSTANTS.UPGRADE_COSTS[upgrade] ?? 0;
                }
              }
            }
            distributeWorkers(state, factory.id);
            setTargetToMachineCapacity(state, "line-1");
            setTargetToMachineCapacity(state, "line-2");
          }

          if (checkpoints.includes(round)) {
            results[strategy.name][round] = {
              output: getTotalOutput(state, factory.id),
              workers: factory.workers,
              machines: state.machineryStates![factory.id].machines.length,
              upgrades: factory.upgrades.length,
              investment: totalInvestment,
            };
          }
        }
      }

      // Print comparison tables
      for (const cp of checkpoints) {
        const ranked = Object.entries(results)
          .map(([name, rounds]) => ({ name, ...rounds[cp] }))
          .sort((a, b) => b.output - a.output);

        console.log(`\n${"═".repeat(100)}`);
        console.log(`  ROUND ${cp} RANKINGS`);
        console.log("═".repeat(100));
        console.log("Rank | Strategy              | Output      | Workers | Machines | Upgrades | Investment   | Output/$M");
        console.log("─────────────────────────────────────────────────────────────────────────────────────────────────────");

        ranked.forEach((r, i) => {
          const rank = String(i + 1).padStart(4);
          const name = r.name.padEnd(21);
          const out = r.output.toLocaleString().padStart(11);
          const wrk = String(r.workers).padStart(7);
          const mch = String(r.machines).padStart(8);
          const upg = String(r.upgrades).padStart(8);
          const inv = `$${(r.investment / 1_000_000).toFixed(1)}M`.padStart(12);
          const roi = r.investment > 0 ? (r.output / (r.investment / 1_000_000)).toFixed(0).padStart(9) : "N/A".padStart(9);
          console.log(`${rank} | ${name} | ${out} | ${wrk} | ${mch} | ${upg} | ${inv} | ${roi}`);
        });
      }

      // Every strategy should produce some output by round 32
      for (const name of Object.keys(results)) {
        expect(results[name][32].output).toBeGreaterThan(0);
      }
    });
  });

  // ─────────────────────────────────────────
  // 8. Upgrade Stacking Analysis
  // ─────────────────────────────────────────
  describe("Upgrade stacking — cumulative effect", () => {
    it("shows how stacking upgrades compounds efficiency and output", () => {
      const state = createTeamState();
      const factory = state.factories[0];

      // Add machines first
      buyMachine(state, factory.id, "line-1", "assembly_line", "stack-m1");
      buyMachine(state, factory.id, "line-1", "assembly_line", "stack-m2");
      buyMachine(state, factory.id, "line-2", "assembly_line", "stack-m3");
      buyMachine(state, factory.id, "line-2", "assembly_line", "stack-m4");
      distributeWorkers(state, factory.id);
      setTargetToMachineCapacity(state, "line-1");
      setTargetToMachineCapacity(state, "line-2");

      const upgradeOrder: FactoryUpgrade[] = [
        "leanManufacturing",    // +15% efficiency
        "sixSigma",             // -40% defects
        "automation",           // -35% unit cost
        "advancedRobotics",     // +50% capacity, -30% labor
        "qualityLab",           // -50% defects
        "continuousImprovement",// +1%/round efficiency
        "modularLines",         // -50% changeover
        "digitalTwin",          // -20% maintenance
        "iotIntegration",       // -15% breakdown
        "flexibleManufacturing",// all segments, -30% changeover
      ];

      console.log("\n=== UPGRADE STACKING ANALYSIS ===");
      console.log("Upgrade Added             | Efficiency | Defect Rate | Output     | Δ Output | Cumulative Δ");
      console.log("───────────────────────────────────────────────────────────────────────────────────────────");

      const baseOutput = getTotalOutput(state, factory.id);
      let prevOutput = baseOutput;
      console.log(`${"(baseline)".padEnd(25)} | ${(factory.efficiency * 100).toFixed(1).padStart(10)}% | ${(factory.defectRate * 100).toFixed(2).padStart(11)}% | ${baseOutput.toLocaleString().padStart(10)} |          |`);

      for (const upgrade of upgradeOrder) {
        FactoryModule.applyUpgradeEffects(factory, upgrade);
        factory.upgrades.push(upgrade);

        const output = getTotalOutput(state, factory.id);
        const delta = output - prevOutput;
        const cumDelta = output - baseOutput;

        const name = upgrade.padEnd(25);
        const eff = (factory.efficiency * 100).toFixed(1).padStart(10);
        const def = (factory.defectRate * 100).toFixed(2).padStart(11);
        const out = output.toLocaleString().padStart(10);
        const dStr = (delta >= 0 ? "+" : "") + delta.toLocaleString();
        const cStr = (cumDelta >= 0 ? "+" : "") + cumDelta.toLocaleString();

        console.log(`${name} | ${eff}% | ${def}% | ${out} | ${dStr.padStart(8)} | ${cStr.padStart(12)}`);
        prevOutput = output;
      }

      // Stacking should improve output
      const finalOutput = getTotalOutput(state, factory.id);
      expect(finalOutput).toBeGreaterThanOrEqual(baseOutput);
    });
  });

  // ─────────────────────────────────────────
  // 9. Worker-to-Machine Ratio Analysis
  // ─────────────────────────────────────────
  describe("Worker-to-machine ratio analysis", () => {
    it("shows how output changes with different worker counts for fixed machines", () => {
      console.log("\n=== WORKER:MACHINE RATIO (4× assembly_line = 40K machine cap, line-1) ===");
      console.log("Workers | Required | Staffing | Worker Cap | Output     | Bottleneck | Output/Worker");
      console.log("────────────────────────────────────────────────────────────────────────────────────────");

      for (const workerCount of [5, 10, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500]) {
        const state = createTeamState();
        const factory = state.factories[0];

        // 4 assembly lines on line-1
        for (let i = 0; i < 4; i++) {
          buyMachine(state, factory.id, "line-1", "assembly_line", `ratio-m${i}`);
        }

        const line = factory.productionLines.find(l => l.id === "line-1")!;
        line.targetOutput = 40_000;
        line.assignedWorkers = workerCount;
        factory.workers = workerCount;

        const analysis = getFactoryBottleneckAnalysis(state, factory.id);
        const r = analysis["line-1"] as any;

        const reqs = getLineWorkerRequirements(line, 80);

        const wrk = String(workerCount).padStart(7);
        const req = String(reqs.requiredWorkers).padStart(8);
        const stf = (r?.staffingRatio ?? 0).toFixed(2).padStart(8);
        const wcap = Math.floor(r?.workerCapacity ?? 0).toLocaleString().padStart(10);
        const out = (r?.projectedOutput ?? 0).toLocaleString().padStart(10);
        const bnk = (r?.bottleneck ?? "none").padEnd(10);
        const perWorker = workerCount > 0 ? Math.floor((r?.projectedOutput ?? 0) / workerCount).toLocaleString().padStart(13) : "N/A".padStart(13);

        console.log(`${wrk} | ${req} | ${stf} | ${wcap} | ${out} | ${bnk} | ${perWorker}`);
      }

      expect(true).toBe(true);
    });
  });

  // ─────────────────────────────────────────
  // 10. Mixed Machine Portfolio Analysis
  // ─────────────────────────────────────────
  describe("Mixed machine portfolio", () => {
    it("shows impact of production + automation + quality machine mix", () => {
      const portfolios = [
        { name: "Pure Production", machines: [{ type: "assembly_line" as MachineType, count: 4 }] },
        { name: "Prod + Automation", machines: [{ type: "assembly_line" as MachineType, count: 3 }, { type: "robotic_arm" as MachineType, count: 1 }] },
        { name: "Prod + Quality", machines: [{ type: "assembly_line" as MachineType, count: 3 }, { type: "quality_scanner" as MachineType, count: 1 }] },
        { name: "Balanced Mix", machines: [{ type: "assembly_line" as MachineType, count: 2 }, { type: "robotic_arm" as MachineType, count: 1 }, { type: "quality_scanner" as MachineType, count: 1 }] },
        { name: "High Capacity", machines: [{ type: "conveyor_system" as MachineType, count: 2 }, { type: "injection_molder" as MachineType, count: 2 }] },
        { name: "All Automation", machines: [{ type: "robotic_arm" as MachineType, count: 2 }, { type: "conveyor_system" as MachineType, count: 2 }] },
        { name: "Premium Setup", machines: [{ type: "pcb_assembler" as MachineType, count: 2 }, { type: "cnc_machine" as MachineType, count: 1 }, { type: "quality_scanner" as MachineType, count: 1 }] },
      ];

      console.log("\n=== MIXED MACHINE PORTFOLIO (all on line-1, 50 workers) ===");
      console.log("Portfolio            | Total Cap | Total Cost  | Output     | Bottleneck | Labor Red | Defect Red");
      console.log("────────────────────────────────────────────────────────────────────────────────────────────────────");

      for (const portfolio of portfolios) {
        const state = createTeamState();
        const factory = state.factories[0];
        let totalCost = 0;
        let totalLaborRed = 0;
        let totalDefectRed = 0;
        let mIdx = 0;

        for (const m of portfolio.machines) {
          const config = MACHINE_CONFIGS.find(c => c.type === m.type)!;
          for (let i = 0; i < m.count; i++) {
            buyMachine(state, factory.id, "line-1", m.type, `port-${mIdx++}`);
            totalCost += config.baseCost;
            totalLaborRed += config.laborReduction;
            totalDefectRed += config.defectRateReduction;
          }
        }

        const line = factory.productionLines.find(l => l.id === "line-1")!;
        line.assignedWorkers = 50;
        factory.workers = 50;
        const machCap = getLineMachineCapacity(state, "line-1");
        line.targetOutput = Math.max(machCap, 1000);

        const analysis = getFactoryBottleneckAnalysis(state, factory.id);
        const r = analysis["line-1"] as any;

        const name = portfolio.name.padEnd(20);
        const cap = machCap.toLocaleString().padStart(9);
        const cost = `$${(totalCost / 1_000_000).toFixed(1)}M`.padStart(11);
        const out = (r?.projectedOutput ?? 0).toLocaleString().padStart(10);
        const bnk = (r?.bottleneck ?? "none").padEnd(10);
        const lred = `${(totalLaborRed * 100).toFixed(0)}%`.padStart(9);
        const dred = `${(totalDefectRed * 100).toFixed(1)}%`.padStart(10);

        console.log(`${name} | ${cap} | ${cost} | ${out} | ${bnk} | ${lred} | ${dred}`);
      }

      expect(true).toBe(true);
    });
  });
});
