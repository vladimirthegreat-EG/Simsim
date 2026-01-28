/**
 * Economy Module Exports
 *
 * Includes unit economics, capacity management, and economic cycles.
 */

export { EconomyEngine } from "./EconomyEngine";
export type {
  UnitEconomics,
  UnitEconomicsViolation,
  CapacityState,
  SegmentCapacity,
  CapacityBottleneck,
  InventoryState,
  WorkingCapitalState,
  EconomyResult,
} from "./EconomyEngine";

export { EconomicCycleEngine } from "./EconomicCycle";
export type {
  EconomicState,
  EconomicImpact,
  EconomicForecast,
} from "./EconomicCycle";
