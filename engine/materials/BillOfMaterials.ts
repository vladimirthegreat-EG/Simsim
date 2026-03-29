/**
 * Bill of Materials (BOM) Generator
 *
 * Connects R&D product specs + factory production targets → material requirements.
 * The factory PUSHES requirements to supply chain (players never manually calculate).
 *
 * Flow: R&D (tech unlocks) → Product specs → Factory (production targets) → BOM → Supply Chain
 */

import type { TeamState } from "../types/state";
import type { Product } from "../types/product";
import type { Segment } from "../types/factory";
import type { MaterialType, Region, Supplier } from "./types";
import { MaterialEngine } from "./MaterialEngine";
import { DEFAULT_SUPPLIERS, REGIONAL_CAPABILITIES } from "./suppliers";
import { LogisticsEngine } from "../logistics/LogisticsEngine";
import { TariffEngine } from "../tariffs/TariffEngine";
import { FXEngine } from "../fx/FXEngine";
import type { MarketState } from "../types/market";

// ============================================
// TYPES
// ============================================

export interface BOMEntry {
  materialType: MaterialType;
  spec: string;
  requiredQualityMin: number;
  quantityPerUnit: number;
  baseCostPerUnit: number;
  totalQuantityNeeded: number;
  currentInventory: number;
  shortfall: number;
  eligibleSuppliers: SupplierOption[];
}

export interface SupplierOption {
  supplier: Supplier;
  unitCost: number;
  qualityRating: number;
  leadTimeRounds: number;
  tariffRate: number;
  tariffCostEstimate: number;
  fxMultiplier: number;
  shippingCostEstimate: number;
  totalLandedCostPerUnit: number;
  warnings: string[];
}

export interface BOMOutput {
  lineId: string;
  productName: string;
  segment: string;
  targetOutput: number;
  entries: BOMEntry[];
  totalCostPerUnit: number;
  totalShortfall: number;
}

export interface AggregatedBOM {
  entries: AggregatedBOMEntry[];
  totalEstimatedCost: number;
  shortfallCount: number;
  warnings: string[];
}

export interface AggregatedBOMEntry {
  materialType: MaterialType;
  spec: string;
  totalQuantityNeeded: number;
  currentInventory: number;
  shortfall: number;
  bestLandedCost: number;
  eligibleSuppliers: SupplierOption[];
}

// ============================================
// QUALITY THRESHOLDS BY SEGMENT
// ============================================

const SEGMENT_QUALITY_THRESHOLDS: Record<string, number> = {
  "Budget": 65,
  "General": 78,
  "Active Lifestyle": 82,
  "Enthusiast": 88,
  "Professional": 93,
};

const QUALITY_BELOW_PENALTY: Record<string, number> = {
  "Budget": 0.03,
  "General": 0.04,
  "Active Lifestyle": 0.04,
  "Enthusiast": 0.05,
  "Professional": 0.06,
};

const QUALITY_ABOVE_BONUS_RATE = 0.02;
const QUALITY_ABOVE_BONUS_CAP = 0.15;
const DAYS_PER_ROUND = 90;

// ============================================
// BOM GENERATOR
// ============================================

/**
 * Generate Bill of Materials for a single production line.
 * Uses the product's segment to determine base material specs,
 * then checks team's tech tree for upgraded component requirements.
 */
export function generateBOM(
  product: Product,
  segment: string,
  targetOutput: number,
  state: TeamState,
  marketState?: MarketState,
): BOMOutput {
  const segmentMaterials = MaterialEngine.SEGMENT_MATERIAL_REQUIREMENTS[
    segment as keyof typeof MaterialEngine.SEGMENT_MATERIAL_REQUIREMENTS
  ];

  if (!segmentMaterials) {
    return {
      lineId: "",
      productName: product.name,
      segment,
      targetOutput,
      entries: [],
      totalCostPerUnit: 0,
      totalShortfall: 0,
    };
  }

  const qualityThreshold = SEGMENT_QUALITY_THRESHOLDS[segment] || 70;
  const teamRegion = (state.materials?.region || "North America") as Region;

  const entries: BOMEntry[] = segmentMaterials.materials.map(mat => {
    const totalNeeded = targetOutput * 1; // 1 unit of each material per product unit
    const currentInv = state.materials?.inventory?.find(
      inv => inv.materialType === mat.type
    )?.quantity || 0;
    const shortfall = Math.max(0, totalNeeded - currentInv);

    // Find eligible suppliers (quality >= segment threshold)
    const eligible = DEFAULT_SUPPLIERS
      .filter(s => s.materials.includes(mat.type) && s.qualityRating >= qualityThreshold)
      .map(supplier => {
        const regionMult = REGIONAL_CAPABILITIES[supplier.region]?.costMultiplier || 1.0;
        const unitCost = mat.costPerUnit * regionMult;

        // Estimate shipping cost per unit
        let shippingPerUnit = 0;
        let leadTimeRounds = 1;
        try {
          const weight = shortfall * 0.0002;
          const volume = shortfall * 0.001;
          const logistics = LogisticsEngine.calculateLogistics(
            supplier.region, teamRegion, "sea",
            Math.max(weight, 0.1), Math.max(volume, 0.1), 0
          );
          shippingPerUnit = shortfall > 0 ? logistics.totalLogisticsCost / shortfall : 0;
          leadTimeRounds = Math.max(1, Math.ceil(logistics.totalLeadTime / DAYS_PER_ROUND));
        } catch {
          shippingPerUnit = unitCost * 0.05; // 5% fallback estimate
        }

        // Estimate tariff
        let tariffRate = 0;
        let tariffCostEst = 0;
        if (state.tariffs) {
          try {
            const tariffCalc = TariffEngine.calculateTariff(
              supplier.region, teamRegion, mat.type,
              unitCost * Math.max(shortfall, 1),
              state.round || 1, state.tariffs
            );
            tariffRate = tariffCalc.adjustedTariffRate;
            tariffCostEst = shortfall > 0 ? tariffCalc.tariffAmount / shortfall : 0;
          } catch {
            tariffRate = 0;
          }
        }

        // FX multiplier
        let fxMult = 1.0;
        if (marketState) {
          try {
            fxMult = FXEngine.getCostMultiplier(supplier.region, marketState);
          } catch {
            fxMult = 1.0;
          }
        }

        const landedCost = (unitCost * fxMult) + shippingPerUnit + tariffCostEst;

        // Warnings
        const warnings: string[] = [];
        if (tariffRate > 0.10) warnings.push(`${Math.round(tariffRate * 100)}% tariff applies`);
        if (supplier.onTimeDeliveryRate < 0.80) warnings.push(`${Math.round((1 - supplier.onTimeDeliveryRate) * 100)}% late delivery risk`);
        if (supplier.qualityRating < qualityThreshold + 5) warnings.push("Quality near minimum threshold");
        if (supplier.minimumOrder > shortfall && shortfall > 0) warnings.push(`MOQ ${supplier.minimumOrder.toLocaleString()} exceeds need`);
        if (fxMult > 1.05) warnings.push(`FX adds ${Math.round((fxMult - 1) * 100)}% to costs`);

        return {
          supplier,
          unitCost,
          qualityRating: supplier.qualityRating,
          leadTimeRounds,
          tariffRate,
          tariffCostEstimate: tariffCostEst,
          fxMultiplier: fxMult,
          shippingCostEstimate: shippingPerUnit,
          totalLandedCostPerUnit: landedCost,
          warnings,
        } satisfies SupplierOption;
      })
      .sort((a, b) => a.totalLandedCostPerUnit - b.totalLandedCostPerUnit);

    return {
      materialType: mat.type,
      spec: mat.spec,
      requiredQualityMin: qualityThreshold,
      quantityPerUnit: 1,
      baseCostPerUnit: mat.costPerUnit,
      totalQuantityNeeded: totalNeeded,
      currentInventory: currentInv,
      shortfall,
      eligibleSuppliers: eligible,
    };
  });

  const totalCostPerUnit = entries.reduce((sum, e) => sum + e.baseCostPerUnit, 0);
  const totalShortfall = entries.reduce((sum, e) => sum + e.shortfall, 0);

  return {
    lineId: "",
    productName: product.name,
    segment,
    targetOutput,
    entries,
    totalCostPerUnit,
    totalShortfall,
  };
}

/**
 * Aggregate BOM across all active production lines in a factory.
 * Merges duplicate material needs (e.g., two lines both need processors).
 * Subtracts current inventory to show net shortfall.
 */
export function aggregateProductionRequirements(
  state: TeamState,
  factoryId?: string,
  marketState?: MarketState,
): AggregatedBOM {
  const factories = factoryId
    ? state.factories.filter(f => f.id === factoryId)
    : state.factories;

  const allEntries: BOMEntry[] = [];

  for (const factory of factories) {
    for (const line of factory.productionLines || []) {
      if (line.status !== "active" || !line.productId || line.targetOutput <= 0) continue;

      const product = state.products?.find(p => p.id === line.productId);
      if (!product) continue;

      const segment = (line as any).segment || product.segment;
      if (!segment) continue;

      const bom = generateBOM(product, segment, line.targetOutput, state, marketState);
      allEntries.push(...bom.entries);
    }
  }

  // Merge by materialType
  const merged = new Map<MaterialType, AggregatedBOMEntry>();
  for (const entry of allEntries) {
    const existing = merged.get(entry.materialType);
    if (existing) {
      existing.totalQuantityNeeded += entry.totalQuantityNeeded;
      existing.shortfall = Math.max(0, existing.totalQuantityNeeded - existing.currentInventory);
      // Keep the longer supplier list (union)
      for (const sup of entry.eligibleSuppliers) {
        if (!existing.eligibleSuppliers.find(s => s.supplier.id === sup.supplier.id)) {
          existing.eligibleSuppliers.push(sup);
        }
      }
    } else {
      merged.set(entry.materialType, {
        materialType: entry.materialType,
        spec: entry.spec,
        totalQuantityNeeded: entry.totalQuantityNeeded,
        currentInventory: entry.currentInventory,
        shortfall: entry.shortfall,
        bestLandedCost: entry.eligibleSuppliers[0]?.totalLandedCostPerUnit || entry.baseCostPerUnit,
        eligibleSuppliers: [...entry.eligibleSuppliers],
      });
    }
  }

  const entries = Array.from(merged.values());
  // Re-sort suppliers by landed cost
  for (const entry of entries) {
    entry.eligibleSuppliers.sort((a, b) => a.totalLandedCostPerUnit - b.totalLandedCostPerUnit);
    entry.bestLandedCost = entry.eligibleSuppliers[0]?.totalLandedCostPerUnit || 0;
  }

  const totalEstimatedCost = entries.reduce(
    (sum, e) => sum + e.shortfall * e.bestLandedCost, 0
  );
  const shortfallCount = entries.filter(e => e.shortfall > 0).length;

  const warnings: string[] = [];
  if (shortfallCount === 0) warnings.push("All materials in stock — no orders needed this round");
  for (const entry of entries) {
    if (entry.currentInventory === 0 && entry.totalQuantityNeeded > 0) {
      warnings.push(`🔴 ${entry.materialType}: EMPTY inventory — production will halt without order`);
    } else if (entry.shortfall > 0) {
      warnings.push(`⚠️ ${entry.materialType}: need to order ${entry.shortfall.toLocaleString()} units`);
    }
  }

  return { entries, totalEstimatedCost, shortfallCount, warnings };
}

/**
 * Calculate quality impact of a supplier's quality rating on a segment's products.
 * Returns a multiplier (0.7 to 1.15) that applies to product quality.
 */
export function calculateSupplierQualityImpact(
  supplierQuality: number,
  segment: string,
): number {
  const threshold = SEGMENT_QUALITY_THRESHOLDS[segment] || 70;
  const penaltyRate = QUALITY_BELOW_PENALTY[segment] || 0.04;

  if (supplierQuality < threshold) {
    const pointsBelow = threshold - supplierQuality;
    const penalty = pointsBelow * penaltyRate;
    return Math.max(0.5, 1 - penalty); // floor at 50% quality
  }

  if (supplierQuality > threshold) {
    const pointsAbove = supplierQuality - threshold;
    const bonus = Math.min(pointsAbove * QUALITY_ABOVE_BONUS_RATE, QUALITY_ABOVE_BONUS_CAP);
    return 1 + bonus;
  }

  return 1.0;
}
