/**
 * Machinery System Types
 *
 * Interactive machinery management for factories.
 * Allows purchasing machines, tracking health, scheduling maintenance.
 */

// ============================================
// MACHINE TYPES
// ============================================

export type MachineType =
  | "assembly_line"      // General production
  | "cnc_machine"        // Precision manufacturing
  | "robotic_arm"        // Automation
  | "conveyor_system"    // Material handling
  | "quality_scanner"    // Quality control
  | "3d_printer"         // Prototyping/small batch
  | "welding_station"    // Assembly
  | "packaging_system"   // Final stage
  | "injection_molder"   // Plastics
  | "pcb_assembler"      // Electronics
  | "paint_booth"        // Finishing
  | "laser_cutter"       // Precision cutting
  | "testing_rig"        // QA equipment
  | "clean_room_unit"    // High-purity production
  | "forklift_fleet";    // Internal logistics

export type MachineStatus = "operational" | "maintenance" | "breakdown" | "offline";

export type MaintenanceType = "scheduled" | "emergency" | "major_overhaul";

// ============================================
// MACHINE INTERFACES
// ============================================

export interface MaintenanceRecord {
  round: number;
  type: MaintenanceType;
  cost: number;
  healthRestored: number;
  description?: string;
}

export interface Machine {
  id: string;
  type: MachineType;
  name: string;
  factoryId: string;

  // Status
  status: MachineStatus;
  healthPercent: number;        // 0-100
  utilizationPercent: number;   // 0-100

  // Economics
  purchaseCost: number;
  currentValue: number;         // Depreciated value
  maintenanceCostPerRound: number;
  operatingCostPerRound: number;

  // Performance
  capacityUnits: number;        // Production capacity per round
  efficiencyMultiplier: number; // 0.5-1.5
  defectRateImpact: number;     // Affects factory defect rate (-0.05 to +0.05)

  // Lifecycle
  purchaseRound: number;
  expectedLifespanRounds: number;
  ageRounds: number;            // Current age
  roundsSinceLastMaintenance: number;
  scheduledMaintenanceRound: number | null;

  // Maintenance tracking
  maintenanceHistory: MaintenanceRecord[];
  totalMaintenanceSpent: number;

  // Special properties
  laborReduction?: number;      // Reduces worker needs (0-1)
  shippingReduction?: number;   // Reduces shipping costs (0-1)
  specialtySegments?: string[]; // Segments this machine excels at
}

// ============================================
// MACHINE CONFIGURATION
// ============================================

export interface MachineConfig {
  type: MachineType;
  name: string;
  description: string;
  baseCost: number;
  baseCapacity: number;         // Units per round (0 for utility machines)
  baseMaintenanceCost: number;  // Cost per round
  baseOperatingCost: number;    // Cost per round
  expectedLifespan: number;     // Rounds
  maintenanceInterval: number;  // Recommended rounds between maintenance
  defectRateReduction: number;  // Quality machines reduce defects
  laborReduction: number;       // Reduces worker needs
  shippingReduction: number;    // Reduces shipping costs
  specialtySegments: string[];  // Segments with bonuses
  category: MachineCategory;
  icon: string;                 // Lucide icon name
}

export type MachineCategory =
  | "production"        // Main production capacity
  | "quality"           // Quality control
  | "automation"        // Reduces labor
  | "logistics"         // Material handling
  | "specialized";      // Segment-specific

// ============================================
// MACHINERY DECISIONS
// ============================================

export interface MachineryDecisions {
  purchases?: {
    factoryId: string;
    machineType: MachineType;
    quantity: number;
  }[];
  sales?: {
    machineId: string;
  }[];
  maintenanceSchedules?: {
    machineId: string;
    scheduledRound: number;
    type: MaintenanceType;
  }[];
  performMaintenance?: {
    machineId: string;
    type: MaintenanceType;
  }[];
  setOffline?: {
    machineId: string;
    offline: boolean;
  }[];
}

// ============================================
// MACHINERY STATE
// ============================================

export interface FactoryMachineryState {
  machines: Machine[];
  totalCapacity: number;
  totalMaintenanceCost: number;
  totalOperatingCost: number;
  averageHealth: number;
  machinesByType: Record<MachineType, number>;
  breakdownsThisRound: BreakdownEvent[];
  scheduledMaintenanceThisRound: Machine[];
}

export interface BreakdownEvent {
  machineId: string;
  machineName: string;
  factoryId: string;
  severity: "minor" | "moderate" | "major" | "critical";
  cause: string;
  productionLoss: number;       // Fraction of that machine's capacity lost
  repairCost: number;
  roundsToRepair: number;
}

// ============================================
// MACHINERY RESULT
// ============================================

export interface MachineryProcessResult {
  factoryStates: Map<string, FactoryMachineryState>;
  totalCosts: number;
  totalCapacity: number;
  newBreakdowns: BreakdownEvent[];
  resolvedBreakdowns: string[];
  maintenancePerformed: MaintenanceRecord[];
  messages: string[];
  warnings: string[];
}

// ============================================
// MAINTENANCE COSTS
// ============================================

export const MAINTENANCE_COSTS = {
  scheduled: {
    costMultiplier: 1.0,
    healthRestored: 25,
    description: "Routine maintenance",
  },
  emergency: {
    costMultiplier: 2.5,
    healthRestored: 40,
    description: "Emergency repair",
  },
  major_overhaul: {
    costMultiplier: 5.0,
    healthRestored: 80,
    description: "Complete overhaul",
  },
} as const;

// ============================================
// BREAKDOWN PROBABILITIES
// ============================================

export const BREAKDOWN_CONFIG = {
  // Base probability per round
  baseChance: 0.02,           // 2% per round

  // Health modifiers
  healthModifiers: {
    critical: { threshold: 20, multiplier: 5.0 },
    low: { threshold: 40, multiplier: 3.0 },
    moderate: { threshold: 60, multiplier: 1.5 },
    good: { threshold: 80, multiplier: 1.0 },
    excellent: { threshold: 100, multiplier: 0.5 },
  },

  // Age modifiers
  ageMultiplier: 0.005,        // +0.5% per round past expected lifespan

  // Maintenance modifiers
  overdueMaintenanceMultiplier: 0.02, // +2% per round overdue

  // Severity distribution
  severityDistribution: {
    minor: 0.5,
    moderate: 0.3,
    major: 0.15,
    critical: 0.05,
  },

  // Severity impacts
  severityImpacts: {
    minor: {
      productionLoss: 0.1,
      repairCostMultiplier: 0.5,
      roundsToRepair: 0,        // Same round
    },
    moderate: {
      productionLoss: 0.25,
      repairCostMultiplier: 1.0,
      roundsToRepair: 1,
    },
    major: {
      productionLoss: 0.5,
      repairCostMultiplier: 2.0,
      roundsToRepair: 1,
    },
    critical: {
      productionLoss: 1.0,      // Total loss
      repairCostMultiplier: 4.0,
      roundsToRepair: 2,
    },
  },

  // Breakdown causes
  causes: {
    minor: [
      "Sensor malfunction",
      "Belt wear",
      "Calibration drift",
      "Filter clog",
      "Lubricant issue",
    ],
    moderate: [
      "Motor strain",
      "Bearing failure",
      "Electrical fault",
      "Hydraulic leak",
      "Control board error",
    ],
    major: [
      "Drive system failure",
      "Structural damage",
      "Power surge damage",
      "Cooling system failure",
      "Safety shutdown",
    ],
    critical: [
      "Catastrophic failure",
      "Fire damage",
      "Collision damage",
      "Complete motor burnout",
      "Structural collapse",
    ],
  },
} as const;

// ============================================
// DEPRECIATION
// ============================================

export const DEPRECIATION_CONFIG = {
  // Straight-line depreciation
  method: "straight_line" as const,
  residualValuePercent: 0.10,  // 10% salvage value at end of life
  acceleratedFirstYear: 0.20,  // 20% depreciation in first year
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getMachineAge(machine: Machine): number {
  return machine.ageRounds;
}

export function getMachineDepreciatedValue(machine: Machine): number {
  const { purchaseCost, expectedLifespanRounds, ageRounds } = machine;
  const residualValue = purchaseCost * DEPRECIATION_CONFIG.residualValuePercent;

  if (ageRounds >= expectedLifespanRounds) {
    return residualValue;
  }

  const depreciableAmount = purchaseCost - residualValue;
  const depreciationPerRound = depreciableAmount / expectedLifespanRounds;
  const totalDepreciation = depreciationPerRound * ageRounds;

  return Math.max(residualValue, purchaseCost - totalDepreciation);
}

export function isMachineOverdueForMaintenance(machine: Machine, currentRound: number): boolean {
  const config = getMachineConfigByType(machine.type);
  if (!config) return false;

  return machine.roundsSinceLastMaintenance > config.maintenanceInterval;
}

export function getMachineHealthStatus(healthPercent: number): string {
  if (healthPercent >= 80) return "excellent";
  if (healthPercent >= 60) return "good";
  if (healthPercent >= 40) return "moderate";
  if (healthPercent >= 20) return "low";
  return "critical";
}

// Placeholder - will be populated by catalog
let machineConfigMap: Map<MachineType, MachineConfig> = new Map();

export function setMachineConfigs(configs: MachineConfig[]): void {
  machineConfigMap = new Map(configs.map(c => [c.type, c]));
}

export function getMachineConfigByType(type: MachineType): MachineConfig | undefined {
  return machineConfigMap.get(type);
}

export function getAllMachineTypes(): MachineType[] {
  return Array.from(machineConfigMap.keys());
}
