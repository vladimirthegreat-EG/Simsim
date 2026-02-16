/**
 * Machinery Module Exports
 *
 * Interactive machinery system for factory management.
 */

// Types
export type {
  MachineType,
  MachineStatus,
  MaintenanceType,
  MachineCategory,
  Machine,
  MaintenanceRecord,
  MachineConfig,
  MachineryDecisions,
  FactoryMachineryState,
  MachineryProcessResult,
  BreakdownEvent,
} from "./types";

export {
  MAINTENANCE_COSTS,
  BREAKDOWN_CONFIG,
  DEPRECIATION_CONFIG,
  getMachineAge,
  getMachineDepreciatedValue,
  isMachineOverdueForMaintenance,
  getMachineHealthStatus,
  getMachineConfigByType,
  getAllMachineTypes,
} from "./types";

// Catalog
export {
  MACHINE_CONFIGS,
  CATEGORY_INFO,
  TOTAL_MACHINE_TYPES,
  getMachinesByCategory,
  getMachineConfig,
  getMachineTypesForSegment,
  calculateTotalCapacity,
  getRecommendedMachines,
  getMachinePurchaseInfo,
} from "./MachineCatalog";

// Engine
export { MachineryEngine } from "./MachineryEngine";
