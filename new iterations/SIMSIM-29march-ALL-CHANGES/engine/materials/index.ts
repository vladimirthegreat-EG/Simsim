/**
 * Materials System Module
 * Exports all materials-related types, data, and utilities
 */

export * from "./types";
export * from "./suppliers";
export { MaterialEngine } from "./MaterialEngine";
export { MaterialIntegration } from "./MaterialIntegration";
export { FinanceIntegration } from "./FinanceIntegration";
export { generateBOM, aggregateProductionRequirements, calculateSupplierQualityImpact } from "./BillOfMaterials";
export type { BOMEntry, BOMOutput, AggregatedBOM, AggregatedBOMEntry, SupplierOption } from "./BillOfMaterials";
