/**
 * Supply Chain Manager
 *
 * Unified data layer merging Material ordering and Logistics into one API.
 * Calculates material requirements from production lines, suggests orders,
 * aggregates FX exposure, and provides cost summaries.
 */

import type { TeamState } from "../types/state";
import type { Segment } from "../types/factory";
import { CONSTANTS } from "../types";
import * as WarehouseManager from "./WarehouseManager";
import { getLineMachineCapacity } from "./ProductionLineManager";

// ============================================
// TYPES
// ============================================

export interface MaterialRequirement {
  lineId: string;
  productId: string;
  segment: Segment;
  targetOutput: number;
  materials: {
    type: string;
    qtyNeeded: number;
    estimatedCost: number;
  }[];
  totalMaterialCost: number;
}

export interface SuggestedOrder {
  materialType: string;
  qtyNeeded: number;
  qtyInStock: number;
  qtySuggested: number;   // needed - inStock (player can override)
  estimatedCostPerUnit: number;
  estimatedTotalCost: number;
}

export interface FXExposureEntry {
  currency: string;
  amount: number;
  hedgeCoverage: number;  // 0-1, how much is hedged
}

export interface SupplyChainCostSummary {
  totalMaterialCost: number;
  totalShippingCost: number;
  totalTariffCost: number;
  totalInsuranceCost: number;
  fxImpact: number;
  grandTotal: number;
  perUnitLandedCost: Record<string, number>;  // productId → per-unit cost
}

// ============================================
// SEGMENT MATERIAL COST ESTIMATES
// ============================================

/** Estimated material cost per unit by segment */
const SEGMENT_MATERIAL_COSTS: Record<Segment, number> = {
  "Budget": 60,
  "General": 150,
  "Enthusiast": 350,
  "Professional": 600,
  "Active Lifestyle": 250,
};

/** Standard material types needed per product */
const MATERIAL_TYPES = [
  "display", "processor", "memory", "storage",
  "camera", "battery", "chassis", "other",
];

// ============================================
// MATERIAL REQUIREMENTS
// ============================================

/**
 * Calculate material requirements per production line.
 * Each line's target output determines how much material is needed.
 */
export function calculateMaterialRequirements(
  state: TeamState,
  factoryId: string
): MaterialRequirement[] {
  const factory = state.factories.find(f => f.id === factoryId);
  if (!factory) return [];

  const requirements: MaterialRequirement[] = [];

  for (const line of factory.productionLines) {
    if (line.status !== "active" || !line.productId || !line.segment) continue;

    const segment = line.segment;
    const costPerUnit = SEGMENT_MATERIAL_COSTS[segment] ?? 150;
    const perMaterialCost = costPerUnit / MATERIAL_TYPES.length;

    // Use actual achievable output: min(machine bottleneck, target)
    let machineBottleneck: number;
    try {
      machineBottleneck = getLineMachineCapacity(state, line.id);
    } catch {
      machineBottleneck = 0;
    }
    const achievableOutput = machineBottleneck > 0
      ? Math.min(machineBottleneck, line.targetOutput)
      : line.targetOutput; // Fallback if no machines assigned

    const materials = MATERIAL_TYPES.map(type => ({
      type,
      qtyNeeded: achievableOutput,
      estimatedCost: achievableOutput * perMaterialCost,
    }));

    requirements.push({
      lineId: line.id,
      productId: line.productId,
      segment,
      targetOutput: achievableOutput,
      materials,
      totalMaterialCost: achievableOutput * costPerUnit,
    });
  }

  return requirements;
}

/**
 * Suggest material orders based on requirements minus warehouse inventory.
 * Player can override the suggested quantities.
 */
export function suggestMaterialOrders(
  state: TeamState,
  factoryId: string
): SuggestedOrder[] {
  const requirements = calculateMaterialRequirements(state, factoryId);
  WarehouseManager.ensureWarehouseState(state);

  // Aggregate material needs across all lines
  const totalNeeds: Record<string, { qty: number; costPerUnit: number }> = {};
  for (const req of requirements) {
    for (const mat of req.materials) {
      if (!totalNeeds[mat.type]) {
        totalNeeds[mat.type] = { qty: 0, costPerUnit: 0 };
      }
      totalNeeds[mat.type].qty += mat.qtyNeeded;
      totalNeeds[mat.type].costPerUnit = mat.estimatedCost / Math.max(1, mat.qtyNeeded);
    }
  }

  // Check warehouse inventory
  const warehouses = WarehouseManager.getFactoryWarehouses(state, factoryId);
  const inStock: Record<string, number> = {};
  for (const wh of warehouses) {
    for (const rm of wh.rawMaterials) {
      inStock[rm.materialType] = (inStock[rm.materialType] ?? 0) + rm.qty;
    }
  }

  // Generate suggestions
  const suggestions: SuggestedOrder[] = [];
  for (const [materialType, need] of Object.entries(totalNeeds)) {
    const stock = inStock[materialType] ?? 0;
    const suggested = Math.max(0, need.qty - stock);
    suggestions.push({
      materialType,
      qtyNeeded: need.qty,
      qtyInStock: stock,
      qtySuggested: suggested,
      estimatedCostPerUnit: need.costPerUnit,
      estimatedTotalCost: suggested * need.costPerUnit,
    });
  }

  return suggestions;
}

// ============================================
// FX EXPOSURE
// ============================================

/** Region-to-currency mapping */
const REGION_CURRENCIES: Record<string, string> = {
  "North America": "USD",
  "Europe": "EUR",
  "Asia": "JPY",
  "MENA": "SAR",
};

/**
 * Aggregate FX exposure from all pending orders and factory locations.
 * Orders from foreign regions create FX exposure.
 */
export function getFXExposure(state: TeamState): FXExposureEntry[] {
  const exposure: Record<string, number> = {};

  // Factory regions create natural FX exposure from local costs
  for (const factory of state.factories) {
    const currency = REGION_CURRENCIES[factory.region] ?? "USD";
    if (currency !== "USD") {
      // Approximate local operating costs as FX exposure
      const localCosts = factory.shippingCost + factory.storageCost;
      exposure[currency] = (exposure[currency] ?? 0) + localCosts;
    }
  }

  // Material orders from foreign suppliers create FX exposure
  if (state.materialsState) {
    try {
      const matState = typeof state.materialsState === "string"
        ? JSON.parse(state.materialsState)
        : state.materialsState;

      if (matState?.pendingOrders) {
        for (const order of matState.pendingOrders) {
          const currency = REGION_CURRENCIES[order?.supplierRegion] ?? "USD";
          if (currency !== "USD" && order?.totalCost) {
            exposure[currency] = (exposure[currency] ?? 0) + order.totalCost;
          }
        }
      }
    } catch {
      // materialsState may not be parseable — skip
    }
  }

  // Convert to array with hedge coverage (from finance decisions)
  const fxHedging = state.fxHedging ?? {};
  return Object.entries(exposure).map(([currency, amount]) => ({
    currency,
    amount,
    hedgeCoverage: (fxHedging as Record<string, number>)[currency] ?? 0,
  }));
}

// ============================================
// COST SUMMARY
// ============================================

/**
 * Get comprehensive supply chain cost summary for a factory.
 */
export function getSupplyChainCostSummary(
  state: TeamState,
  factoryId: string
): SupplyChainCostSummary {
  const requirements = calculateMaterialRequirements(state, factoryId);

  const totalMaterialCost = requirements.reduce((sum, r) => sum + r.totalMaterialCost, 0);

  // Estimate shipping and tariff as percentages (simplified)
  const factory = state.factories.find(f => f.id === factoryId);
  const shippingBase = factory?.shippingCost ?? 100_000;
  const totalShippingCost = shippingBase * requirements.length;
  const totalTariffCost = totalMaterialCost * 0.05;  // 5% estimated tariff
  const totalInsuranceCost = totalShippingCost * 0.01;  // 1% insurance

  // FX impact (simplified — difference from hedged vs spot rate)
  const fxExposure = getFXExposure(state);
  const fxImpact = fxExposure.reduce((sum, e) => sum + e.amount * (1 - e.hedgeCoverage) * 0.02, 0);

  const grandTotal = totalMaterialCost + totalShippingCost + totalTariffCost + totalInsuranceCost + fxImpact;

  // Per-unit landed cost by product
  const perUnitLandedCost: Record<string, number> = {};
  for (const req of requirements) {
    if (req.targetOutput > 0) {
      const share = req.totalMaterialCost / Math.max(1, totalMaterialCost);
      perUnitLandedCost[req.productId] = (grandTotal * share) / req.targetOutput;
    }
  }

  return {
    totalMaterialCost,
    totalShippingCost,
    totalTariffCost,
    totalInsuranceCost,
    fxImpact,
    grandTotal,
    perUnitLandedCost,
  };
}
