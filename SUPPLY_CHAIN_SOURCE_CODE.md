# BIZZSIMSIM V2 — Supply Chain Module Complete Source Code

> Every file in the supply chain system.


---

## FILE: engine/materials/BillOfMaterials.ts

```typescript
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
```

---

## FILE: engine/materials/MaterialEngine.ts

```typescript
/**
 * Material Engine
 * Handles material sourcing, inventory, quality tracking, and supplier relationships
 */

import type { Segment } from "../types";
import type {
  Material,
  MaterialInventory,
  MaterialOrder,
  MaterialsState,
  MaterialRequirement,
  MaterialSourcingChoice,
  Supplier,
  MaterialQuality,
  SegmentMaterials,
  Region,
  MaterialType,
  MaterialContract,
  MaterialDisruption
} from "./types";
import {
  REGIONAL_CAPABILITIES,
  DEFAULT_SUPPLIERS,
  getSuppliersForMaterial,
  findBestSupplier
} from "./suppliers";

export class MaterialEngine {
  /**
   * Define material requirements for each phone segment
   */
  static readonly SEGMENT_MATERIAL_REQUIREMENTS: Record<Segment, SegmentMaterials> = {
    Budget: {
      segment: "Budget",
      materials: [
        { type: "display", spec: "LCD_5.5inch", costPerUnit: 15, source: "Asia", qualityRating: 70, leadTime: 25, minimumOrderQuantity: 10000, reliability: 0.85 },
        { type: "processor", spec: "EntryLevel_SoC", costPerUnit: 8, source: "Asia", qualityRating: 65, leadTime: 30, minimumOrderQuantity: 10000, reliability: 0.85 },
        { type: "memory", spec: "4GB_DRAM", costPerUnit: 10, source: "Asia", qualityRating: 70, leadTime: 28, minimumOrderQuantity: 10000, reliability: 0.85 },
        { type: "storage", spec: "64GB_eMMC", costPerUnit: 5, source: "Asia", qualityRating: 68, leadTime: 25, minimumOrderQuantity: 10000, reliability: 0.85 },
        { type: "camera", spec: "Single_13MP", costPerUnit: 6, source: "Asia", qualityRating: 65, leadTime: 26, minimumOrderQuantity: 10000, reliability: 0.85 },
        { type: "battery", spec: "3000mAh", costPerUnit: 4, source: "Asia", qualityRating: 72, leadTime: 24, minimumOrderQuantity: 10000, reliability: 0.85 },
        { type: "chassis", spec: "Plastic", costPerUnit: 3, source: "Asia", qualityRating: 70, leadTime: 22, minimumOrderQuantity: 10000, reliability: 0.85 },
        { type: "other", spec: "BasicComponents", costPerUnit: 9, source: "Asia", qualityRating: 68, leadTime: 23, minimumOrderQuantity: 10000, reliability: 0.85 }
      ],
      totalCost: 60,
      leadTime: 30,
      qualityTier: 1
    },

    General: {
      segment: "General",
      materials: [
        { type: "display", spec: "AMOLED_6.1inch", costPerUnit: 45, source: "Asia", qualityRating: 85, leadTime: 28, minimumOrderQuantity: 8000, reliability: 0.87 },
        { type: "processor", spec: "MidRange_SoC", costPerUnit: 28, source: "Asia", qualityRating: 82, leadTime: 32, minimumOrderQuantity: 8000, reliability: 0.87 },
        { type: "memory", spec: "8GB_LPDDR4", costPerUnit: 22, source: "Asia", qualityRating: 84, leadTime: 30, minimumOrderQuantity: 8000, reliability: 0.87 },
        { type: "storage", spec: "128GB_UFS", costPerUnit: 12, source: "Asia", qualityRating: 83, leadTime: 28, minimumOrderQuantity: 8000, reliability: 0.87 },
        { type: "camera", spec: "Dual_48MP", costPerUnit: 18, source: "Asia", qualityRating: 80, leadTime: 29, minimumOrderQuantity: 8000, reliability: 0.87 },
        { type: "battery", spec: "4000mAh_FastCharge", costPerUnit: 10, source: "Asia", qualityRating: 85, leadTime: 27, minimumOrderQuantity: 8000, reliability: 0.87 },
        { type: "chassis", spec: "Aluminum", costPerUnit: 8, source: "Asia", qualityRating: 82, leadTime: 25, minimumOrderQuantity: 8000, reliability: 0.87 },
        { type: "other", spec: "StandardComponents", costPerUnit: 7, source: "Asia", qualityRating: 81, leadTime: 26, minimumOrderQuantity: 8000, reliability: 0.87 }
      ],
      totalCost: 150,
      leadTime: 32,
      qualityTier: 2
    },

    Enthusiast: {
      segment: "Enthusiast",
      materials: [
        { type: "display", spec: "AMOLED_6.7inch_120Hz", costPerUnit: 110, source: "Asia", qualityRating: 92, leadTime: 32, minimumOrderQuantity: 5000, reliability: 0.88 },
        { type: "processor", spec: "Flagship_SoC", costPerUnit: 85, source: "North America", qualityRating: 96, leadTime: 38, minimumOrderQuantity: 5000, reliability: 0.92 },
        { type: "memory", spec: "12GB_LPDDR5", costPerUnit: 45, source: "North America", qualityRating: 95, leadTime: 36, minimumOrderQuantity: 5000, reliability: 0.92 },
        { type: "storage", spec: "256GB_UFS3.1", costPerUnit: 28, source: "Asia", qualityRating: 90, leadTime: 30, minimumOrderQuantity: 5000, reliability: 0.88 },
        { type: "camera", spec: "Triple_108MP_OIS", costPerUnit: 55, source: "Europe", qualityRating: 94, leadTime: 35, minimumOrderQuantity: 5000, reliability: 0.93 },
        { type: "battery", spec: "5000mAh_SuperFastCharge", costPerUnit: 18, source: "Asia", qualityRating: 88, leadTime: 28, minimumOrderQuantity: 5000, reliability: 0.88 },
        { type: "chassis", spec: "StainlessSteel_Premium", costPerUnit: 22, source: "Europe", qualityRating: 93, leadTime: 34, minimumOrderQuantity: 5000, reliability: 0.93 },
        { type: "other", spec: "PremiumComponents", costPerUnit: 87, source: "Asia", qualityRating: 89, leadTime: 31, minimumOrderQuantity: 5000, reliability: 0.88 }
      ],
      totalCost: 350,
      leadTime: 38,
      qualityTier: 4
    },

    Professional: {
      segment: "Professional",
      materials: [
        { type: "display", spec: "LTPO_6.9inch_ProMotion", costPerUnit: 185, source: "Asia", qualityRating: 98, leadTime: 36, minimumOrderQuantity: 3000, reliability: 0.90 },
        { type: "processor", spec: "UltraFlagship_SoC", costPerUnit: 145, source: "North America", qualityRating: 99, leadTime: 42, minimumOrderQuantity: 3000, reliability: 0.95 },
        { type: "memory", spec: "16GB_LPDDR5X", costPerUnit: 75, source: "North America", qualityRating: 98, leadTime: 40, minimumOrderQuantity: 3000, reliability: 0.95 },
        { type: "storage", spec: "512GB_UFS4.0", costPerUnit: 55, source: "North America", qualityRating: 97, leadTime: 38, minimumOrderQuantity: 3000, reliability: 0.95 },
        { type: "camera", spec: "Quad_200MP_Periscope", costPerUnit: 95, source: "Europe", qualityRating: 97, leadTime: 38, minimumOrderQuantity: 3000, reliability: 0.93 },
        { type: "battery", spec: "6000mAh_UltraFast_Wireless", costPerUnit: 28, source: "Asia", qualityRating: 92, leadTime: 32, minimumOrderQuantity: 3000, reliability: 0.88 },
        { type: "chassis", spec: "Titanium_Ceramic", costPerUnit: 48, source: "Europe", qualityRating: 96, leadTime: 40, minimumOrderQuantity: 3000, reliability: 0.93 },
        { type: "other", spec: "UltraPremiumComponents", costPerUnit: 69, source: "Europe", qualityRating: 95, leadTime: 37, minimumOrderQuantity: 3000, reliability: 0.93 }
      ],
      totalCost: 600,
      leadTime: 42,
      qualityTier: 5
    },

    "Active Lifestyle": {
      segment: "Active Lifestyle",
      materials: [
        { type: "display", spec: "RuggedAMOLED_6.4inch", costPerUnit: 68, source: "Asia", qualityRating: 88, leadTime: 30, minimumOrderQuantity: 6000, reliability: 0.87 },
        { type: "processor", spec: "Efficient_MidRange_SoC", costPerUnit: 38, source: "Asia", qualityRating: 85, leadTime: 33, minimumOrderQuantity: 6000, reliability: 0.87 },
        { type: "memory", spec: "8GB_LPDDR4X", costPerUnit: 24, source: "Asia", qualityRating: 86, leadTime: 31, minimumOrderQuantity: 6000, reliability: 0.87 },
        { type: "storage", spec: "128GB_UFS", costPerUnit: 14, source: "Asia", qualityRating: 84, leadTime: 29, minimumOrderQuantity: 6000, reliability: 0.87 },
        { type: "camera", spec: "Dual_64MP_ActionCam", costPerUnit: 32, source: "Asia", qualityRating: 87, leadTime: 31, minimumOrderQuantity: 6000, reliability: 0.87 },
        { type: "battery", spec: "5500mAh_LongLife", costPerUnit: 16, source: "Asia", qualityRating: 90, leadTime: 28, minimumOrderQuantity: 6000, reliability: 0.87 },
        { type: "chassis", spec: "MilSpec_Aluminum_Waterproof", costPerUnit: 35, source: "Europe", qualityRating: 92, leadTime: 36, minimumOrderQuantity: 6000, reliability: 0.93 },
        { type: "other", spec: "RuggedComponents", costPerUnit: 23, source: "Asia", qualityRating: 86, leadTime: 30, minimumOrderQuantity: 6000, reliability: 0.87 }
      ],
      totalCost: 250,
      leadTime: 36,
      qualityTier: 3
    }
  };

  /**
   * Calculate total material cost for a phone segment
   */
  static calculateMaterialCost(segment: Segment, quantity: number): number {
    const requirements = this.SEGMENT_MATERIAL_REQUIREMENTS[segment];
    return requirements.totalCost * quantity;
  }

  /**
   * Get material requirements for a segment
   */
  static getMaterialRequirements(segment: Segment): SegmentMaterials {
    return this.SEGMENT_MATERIAL_REQUIREMENTS[segment];
  }

  /**
   * Create a material order
   */
  static createMaterialOrder(
    choice: MaterialSourcingChoice,
    round: number,
    destinationRegion: Region
  ): MaterialOrder {
    const supplier = DEFAULT_SUPPLIERS.find(s => s.id === choice.supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${choice.supplierId} not found`);
    }

    const orderId = `order_${round}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Calculate costs and timeline
    const materialCost = choice.quantity * this.getMaterialCostPerUnit(
      choice.materialType,
      choice.spec,
      choice.region
    );

    // Production time varies by supplier and complexity
    const productionTime = Math.ceil(
      20 + (choice.quantity / supplier.monthlyCapacity) * 30 * (1 / supplier.responsiveness)
    );

    // Shipping calculations will be done by LogisticsEngine
    const shippingTime = 25; // Placeholder
    const clearanceTime = 3; // Placeholder
    const inspectionTime = 2;

    const totalLeadTime = productionTime + shippingTime + clearanceTime + inspectionTime;
    const estimatedArrivalRound = round + Math.ceil(totalLeadTime / 30); // Convert days to rounds

    return {
      id: orderId,
      materialType: choice.materialType,
      spec: choice.spec,
      quantity: choice.quantity,
      sourceRegion: choice.region,
      destRegion: destinationRegion,
      supplierName: supplier.name,
      costPerUnit: materialCost / choice.quantity,
      shippingMethod: choice.shippingMethod,

      orderRound: round,
      productionTime,
      shippingTime,
      clearanceTime,
      inspectionTime,
      estimatedArrivalRound,

      materialCost,
      shippingCost: 0, // Will be calculated by LogisticsEngine
      clearanceCost: 0, // Will be calculated
      tariffCost: 0, // Will be calculated by TariffEngine
      totalCost: materialCost, // Will be updated with all costs

      status: "pending",
      currentLocation: `${supplier.name}, ${choice.region}`
    };
  }

  /**
   * Get material cost per unit based on region and material type
   */
  private static getMaterialCostPerUnit(
    materialType: MaterialType,
    spec: string,
    region: Region
  ): number {
    // Find base cost from segment materials
    let baseCost = 0;
    for (const segment of Object.values(this.SEGMENT_MATERIAL_REQUIREMENTS)) {
      const material = segment.materials.find(m => m.type === materialType && m.spec === spec);
      if (material) {
        baseCost = material.costPerUnit;
        break;
      }
    }

    // Apply regional cost multiplier
    const regionalCap = REGIONAL_CAPABILITIES[region];
    return baseCost * regionalCap.costMultiplier;
  }

  /**
   * Process material orders and update inventory
   */
  static processOrders(
    state: MaterialsState,
    currentRound: number
  ): {
    arrivedOrders: MaterialOrder[];
    updatedInventory: MaterialInventory[];
    messages: string[];
  } {
    const arrivedOrders: MaterialOrder[] = [];
    const messages: string[] = [];

    for (const order of state.activeOrders) {
      // Check if order has arrived
      if (order.estimatedArrivalRound <= currentRound && order.status !== "delivered") {
        // Simulate potential delays
        const delayProbability = 1 - (order.shippingMethod === "air" ? 0.95 : 0.85);
        const isDelayed = Math.random() < delayProbability;

        if (isDelayed && !order.delayRounds) {
          order.delayRounds = Math.ceil(Math.random() * 2); // 1-2 round delay
          order.estimatedArrivalRound += order.delayRounds;
          order.status = "delayed";
          messages.push(
            `⚠️ Order ${order.id} delayed: ${order.materialType} from ${order.sourceRegion} - new ETA: Round ${order.estimatedArrivalRound}`
          );
          continue;
        }

        // Order arrives
        order.status = "delivered";
        arrivedOrders.push(order);

        // Add to inventory
        const existingInventory = state.inventory.find(
          inv => inv.materialType === order.materialType && inv.spec === order.spec
        );

        if (existingInventory) {
          // Update existing inventory with weighted average cost
          const totalQuantity = existingInventory.quantity + order.quantity;
          existingInventory.averageCost =
            (existingInventory.averageCost * existingInventory.quantity +
              order.costPerUnit * order.quantity) /
            totalQuantity;
          existingInventory.quantity = totalQuantity;
        } else {
          // Create new inventory entry
          state.inventory.push({
            materialType: order.materialType,
            spec: order.spec,
            quantity: order.quantity,
            averageCost: order.costPerUnit,
            sourceRegion: order.sourceRegion
          });
        }

        messages.push(
          `✅ Received ${order.quantity.toLocaleString()} ${order.materialType} (${order.spec}) from ${order.supplierName}`
        );
      }

      // Update order status based on timeline
      if (order.status === "pending") {
        const daysElapsed = (currentRound - order.orderRound) * 30;
        if (daysElapsed >= order.productionTime + order.shippingTime) {
          order.status = "clearance";
          order.currentLocation = `Customs, ${order.destRegion}`;
        } else if (daysElapsed >= order.productionTime) {
          order.status = "shipping";
          order.currentLocation = `In transit to ${order.destRegion}`;
        } else {
          order.status = "production";
          order.currentLocation = `${order.supplierName}, ${order.sourceRegion}`;
        }
      }
    }

    // Remove delivered orders from active orders
    state.activeOrders = state.activeOrders.filter(o => o.status !== "delivered");

    return {
      arrivedOrders,
      updatedInventory: state.inventory,
      messages
    };
  }

  /**
   * Calculate material quality impact on product
   */
  static calculateMaterialQualityImpact(
    segment: Segment,
    inventory: MaterialInventory[]
  ): {
    overallQuality: number;
    breakdown: MaterialQuality[];
    defectRate: number;
  } {
    const requirements = this.SEGMENT_MATERIAL_REQUIREMENTS[segment];
    const breakdown: MaterialQuality[] = [];
    let weightedQuality = 0;
    let totalDefectRate = 0;

    for (const material of requirements.materials) {
      const inv = inventory.find(
        i => i.materialType === material.type && i.spec === material.spec
      );

      if (inv) {
        // Get supplier quality rating
        const supplier = DEFAULT_SUPPLIERS.find(s => s.region === inv.sourceRegion);
        const qualityScore = supplier?.qualityRating ?? material.qualityRating;
        const defectRate = supplier?.defectRate ?? 0.01;

        // Each material contributes to overall quality
        const contribution = 1 / requirements.materials.length;

        breakdown.push({
          materialType: material.type,
          qualityScore,
          defectRate,
          contribution
        });

        weightedQuality += qualityScore * contribution;
        totalDefectRate += defectRate * contribution;
      } else {
        // Missing material - use default values
        breakdown.push({
          materialType: material.type,
          qualityScore: material.qualityRating,
          defectRate: 0.02,
          contribution: 1 / requirements.materials.length
        });

        weightedQuality += material.qualityRating * (1 / requirements.materials.length);
        totalDefectRate += 0.02 * (1 / requirements.materials.length);
      }
    }

    return {
      overallQuality: weightedQuality,
      breakdown,
      defectRate: totalDefectRate
    };
  }

  /**
   * Calculate holding costs for inventory
   */
  static calculateHoldingCosts(inventory: MaterialInventory[]): number {
    const HOLDING_COST_RATE = 0.02; // 2% per round
    let totalValue = 0;

    for (const inv of inventory) {
      totalValue += inv.quantity * inv.averageCost;
    }

    return totalValue * HOLDING_COST_RATE;
  }

  /**
   * Check if sufficient materials are available for production
   */
  static checkMaterialAvailability(
    segment: Segment,
    quantity: number,
    inventory: MaterialInventory[]
  ): {
    available: boolean;
    missing: { materialType: MaterialType; spec: string; needed: number; have: number }[];
  } {
    const requirements = this.SEGMENT_MATERIAL_REQUIREMENTS[segment];
    const missing: { materialType: MaterialType; spec: string; needed: number; have: number }[] = [];

    for (const material of requirements.materials) {
      const inv = inventory.find(
        i => i.materialType === material.type && i.spec === material.spec
      );

      const needed = quantity;
      const have = inv?.quantity ?? 0;

      if (have < needed) {
        missing.push({
          materialType: material.type,
          spec: material.spec,
          needed,
          have
        });
      }
    }

    return {
      available: missing.length === 0,
      missing
    };
  }

  /**
   * Consume materials for production
   */
  static consumeMaterials(
    segment: Segment,
    quantity: number,
    inventory: MaterialInventory[]
  ): MaterialInventory[] {
    const requirements = this.SEGMENT_MATERIAL_REQUIREMENTS[segment];

    for (const material of requirements.materials) {
      const inv = inventory.find(
        i => i.materialType === material.type && i.spec === material.spec
      );

      if (inv) {
        inv.quantity -= quantity;
        if (inv.quantity < 0) inv.quantity = 0;
      }
    }

    return inventory;
  }

  /**
   * Get recommended material orders based on production forecast
   */
  static getRecommendedOrders(
    segment: Segment,
    forecastedProduction: number,
    currentInventory: MaterialInventory[],
    currentRound: number
  ): MaterialSourcingChoice[] {
    const requirements = this.SEGMENT_MATERIAL_REQUIREMENTS[segment];
    const recommendations: MaterialSourcingChoice[] = [];

    for (const material of requirements.materials) {
      const inv = currentInventory.find(
        i => i.materialType === material.type && i.spec === material.spec
      );

      const currentQuantity = inv?.quantity ?? 0;
      const needed = forecastedProduction * 2; // 2 rounds buffer

      if (currentQuantity < needed) {
        const orderQuantity = needed - currentQuantity;

        // Find best supplier
        const bestSupplier = findBestSupplier(material.type, "cost");
        if (bestSupplier) {
          recommendations.push({
            materialType: material.type,
            spec: material.spec,
            supplierId: bestSupplier.id,
            region: bestSupplier.region,
            quantity: Math.max(orderQuantity, material.minimumOrderQuantity),
            shippingMethod: "sea", // Default to cost-effective
            contractLength: 4 // 4-round contract
          });
        }
      }
    }

    return recommendations;
  }
}
```

---

## FILE: engine/materials/types.ts

```typescript
/**
 * Material System Type Definitions
 * Defines materials, sourcing, inventory, and quality tracking
 */

import type { Segment } from "../types";

export type MaterialType =
  | "display"
  | "processor"
  | "memory"
  | "storage"
  | "camera"
  | "battery"
  | "chassis"
  | "other";

export type Region =
  | "North America"
  | "South America"
  | "Europe"
  | "Africa"
  | "Asia"
  | "Oceania"
  | "Middle East";

export interface Material {
  type: MaterialType;
  spec: string;
  costPerUnit: number;
  source: Region;
  qualityRating: number; // 0-100
  leadTime: number; // Days
  minimumOrderQuantity: number;
  reliability: number; // 0-1, probability of on-time delivery
}

export interface SegmentMaterials {
  segment: Segment;
  materials: Material[];
  totalCost: number;
  leadTime: number; // Maximum lead time across all materials
  qualityTier: 1 | 2 | 3 | 4 | 5; // 1=Budget, 5=Ultra Premium
}

export interface MaterialInventory {
  materialType: MaterialType;
  spec: string;
  quantity: number;
  averageCost: number;
  sourceRegion: Region;
  arrivalRound?: number; // If in transit
  orderId?: string;
}

export interface MaterialOrder {
  id: string;
  materialType: MaterialType;
  spec: string;
  quantity: number;
  sourceRegion: Region;
  destRegion: Region;
  supplierName: string;
  costPerUnit: number;
  shippingMethod: "sea" | "air" | "land" | "rail";

  // Timeline
  orderRound: number;
  productionTime: number; // Days
  shippingTime: number; // Days
  clearanceTime: number; // Days
  inspectionTime: number; // Days
  estimatedArrivalRound: number;

  // Costs
  materialCost: number;
  shippingCost: number;
  clearanceCost: number;
  tariffCost: number;
  totalCost: number;

  // Status
  status: "pending" | "production" | "shipping" | "clearance" | "delivered" | "delayed" | "cancelled";
  currentLocation?: string;
  delayRounds?: number;
}

export interface RegionalCapabilities {
  region: Region;
  materials: MaterialType[];
  costMultiplier: number; // Base cost adjustment
  qualityRange: [number, number]; // Min and max quality ratings
  leadTimeRange: [number, number]; // Min and max lead time in days
  specialties: string[];
  reliability: number; // 0-1, probability of successful delivery
  politicalStability: number; // 0-1, affects disruption probability
  infrastructureQuality: number; // 0-1, affects shipping costs
  laborCost: number; // Relative labor cost
  tariffFriendly: Region[]; // Regions with low/no tariffs
}

export interface Supplier {
  id: string;
  name: string;
  region: Region;
  materials: MaterialType[];

  // Quality metrics
  qualityRating: number; // 0-100
  defectRate: number; // 0-1
  consistency: number; // 0-1, how consistent quality is

  // Reliability metrics
  onTimeDeliveryRate: number; // 0-1
  responsiveness: number; // 0-1

  // Cost metrics
  costCompetitiveness: number; // 0-1, lower is better
  priceVolatility: number; // 0-1, how much prices fluctuate

  // Capacity
  monthlyCapacity: number; // Units per month
  minimumOrder: number;

  // Contract terms
  paymentTerms: "immediate" | "net30" | "net60" | "net90";
  contractDiscount: number; // 0-1, discount for long-term contract

  // Relationship
  relationshipLevel: number; // 0-100, built over time
  contractedUntilRound?: number;
}

export interface MaterialSourcingChoice {
  materialType: MaterialType;
  spec: string;
  supplierId: string;
  region: Region;
  quantity: number;
  shippingMethod: "sea" | "air" | "land" | "rail";
  contractLength?: number; // Rounds, optional long-term contract
}

export interface MaterialRequirement {
  segment: Segment;
  materialType: MaterialType;
  spec: string;
  quantityPerUnit: number; // How many of this material per phone
  substitutes?: string[]; // Alternative specs that can be used
}

export interface MaterialQuality {
  materialType: MaterialType;
  qualityScore: number; // 0-100
  defectRate: number; // 0-1
  contribution: number; // How much this material contributes to overall product quality
}

export interface MaterialsState {
  inventory: MaterialInventory[];
  activeOrders: MaterialOrder[];
  suppliers: Supplier[];
  contracts: MaterialContract[];
  totalInventoryValue: number;
  holdingCosts: number; // Per round
}

export interface MaterialContract {
  id: string;
  supplierId: string;
  materialType: MaterialType;
  spec: string;
  pricePerUnit: number;
  minimumMonthlyQuantity: number;
  startRound: number;
  endRound: number;
  penaltyForBreaking: number;
  discount: number; // 0-1
}

export interface MaterialDisruption {
  id: string;
  type: "supplier_failure" | "quality_issue" | "shortage" | "contamination" | "geopolitical";
  affectedMaterials: MaterialType[];
  affectedRegions: Region[];
  severity: number; // 0-1
  duration: number; // Rounds
  costImpact: number; // Multiplier
  delayImpact: number; // Additional days
  qualityImpact: number; // Quality reduction
  description: string;
}
```

---

## FILE: engine/materials/suppliers.ts

```typescript
/**
 * Regional Capabilities and Supplier Data
 * Defines what each region can produce and supplier details
 */

import type { Region, RegionalCapabilities, Supplier, MaterialType } from "./types";

export const REGIONAL_CAPABILITIES: Record<Region, RegionalCapabilities> = {
  "North America": {
    region: "North America",
    materials: ["processor", "memory", "storage", "display"],
    costMultiplier: 1.12,
    qualityRange: [95, 100],
    leadTimeRange: [35, 45],
    specialties: [
      "Advanced SoCs",
      "AI chips",
      "High-performance processors",
      "Premium assembly",
      "R&D innovation"
    ],
    reliability: 0.95,
    politicalStability: 0.92,
    infrastructureQuality: 0.95,
    laborCost: 1.4,
    tariffFriendly: ["Europe", "Oceania"]
  },

  "South America": {
    region: "South America",
    materials: ["battery", "chassis", "other"],
    costMultiplier: 0.88,
    qualityRange: [70, 85],
    leadTimeRange: [40, 55],
    specialties: [
      "Lithium extraction",
      "Raw material processing",
      "Basic assembly",
      "Battery components"
    ],
    reliability: 0.75,
    politicalStability: 0.70,
    infrastructureQuality: 0.65,
    laborCost: 0.6,
    tariffFriendly: ["North America"]
  },

  "Europe": {
    region: "Europe",
    materials: ["display", "camera", "processor", "chassis"],
    costMultiplier: 1.08,
    qualityRange: [90, 98],
    leadTimeRange: [30, 40],
    specialties: [
      "Precision engineering",
      "Premium camera optics",
      "Advanced displays",
      "Quality control systems",
      "Eco-friendly manufacturing"
    ],
    reliability: 0.93,
    politicalStability: 0.88,
    infrastructureQuality: 0.92,
    laborCost: 1.2,
    tariffFriendly: ["North America", "Middle East"]
  },

  "Africa": {
    region: "Africa",
    materials: ["battery", "chassis", "other"],
    costMultiplier: 0.80,
    qualityRange: [60, 80],
    leadTimeRange: [45, 60],
    specialties: [
      "Rare earth minerals",
      "Cobalt extraction",
      "Basic manufacturing",
      "Raw material supply"
    ],
    reliability: 0.68,
    politicalStability: 0.62,
    infrastructureQuality: 0.55,
    laborCost: 0.4,
    tariffFriendly: ["Europe", "Middle East"]
  },

  "Asia": {
    region: "Asia",
    materials: ["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"],
    costMultiplier: 0.82,
    qualityRange: [85, 95],
    leadTimeRange: [20, 35],
    specialties: [
      "Complete component ecosystem",
      "High-volume manufacturing",
      "OLED/AMOLED displays",
      "Memory chips",
      "Full assembly services",
      "Rapid scaling capability"
    ],
    reliability: 0.85,
    politicalStability: 0.80,
    infrastructureQuality: 0.88,
    laborCost: 0.5,
    tariffFriendly: ["Oceania", "Middle East"]
  },

  "Oceania": {
    region: "Oceania",
    materials: ["processor", "memory", "camera"],
    costMultiplier: 1.10,
    qualityRange: [88, 95],
    leadTimeRange: [38, 48],
    specialties: [
      "Quality assurance",
      "Testing and certification",
      "Specialized components",
      "Research partnerships"
    ],
    reliability: 0.90,
    politicalStability: 0.95,
    infrastructureQuality: 0.88,
    laborCost: 1.3,
    tariffFriendly: ["Asia", "North America"]
  },

  "Middle East": {
    region: "Middle East",
    materials: ["chassis", "battery", "other"],
    costMultiplier: 0.95,
    qualityRange: [75, 90],
    leadTimeRange: [32, 42],
    specialties: [
      "Strategic logistics hub",
      "Fast shipping routes",
      "Assembly operations",
      "Regional distribution"
    ],
    reliability: 0.78,
    politicalStability: 0.72,
    infrastructureQuality: 0.82,
    laborCost: 0.8,
    tariffFriendly: ["Europe", "Asia", "Africa"]
  }
};

export const DEFAULT_SUPPLIERS: Supplier[] = [
  // North America Suppliers
  {
    id: "na_chipmaster",
    name: "ChipMaster Technologies",
    region: "North America",
    materials: ["processor", "memory"],
    qualityRating: 97,
    defectRate: 0.006,
    consistency: 0.94,
    onTimeDeliveryRate: 0.95,
    responsiveness: 0.92,
    costCompetitiveness: 0.38, // Higher cost
    priceVolatility: 0.08,
    monthlyCapacity: 500000,
    minimumOrder: 10000,
    paymentTerms: "net30",
    contractDiscount: 0.08,
    relationshipLevel: 50
  },
  {
    id: "na_displaypro",
    name: "DisplayPro Inc",
    region: "North America",
    materials: ["display"],
    qualityRating: 95,
    defectRate: 0.009,
    consistency: 0.92,
    onTimeDeliveryRate: 0.94,
    responsiveness: 0.90,
    costCompetitiveness: 0.35,
    priceVolatility: 0.18,
    monthlyCapacity: 300000,
    minimumOrder: 5000,
    paymentTerms: "net30",
    contractDiscount: 0.10,
    relationshipLevel: 50
  },

  // Asia Suppliers
  {
    id: "asia_globaltech",
    name: "GlobalTech Manufacturing",
    region: "Asia",
    materials: ["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"],
    qualityRating: 88,
    defectRate: 0.018,
    consistency: 0.83,
    onTimeDeliveryRate: 0.78,
    responsiveness: 0.85,
    costCompetitiveness: 0.82, // Very competitive pricing
    priceVolatility: 0.18,
    monthlyCapacity: 2000000,
    minimumOrder: 50000,
    paymentTerms: "net60",
    contractDiscount: 0.12,
    relationshipLevel: 50
  },
  {
    id: "asia_oledmaster",
    name: "OLED Master Displays",
    region: "Asia",
    materials: ["display"],
    qualityRating: 93,
    defectRate: 0.012,
    consistency: 0.88,
    onTimeDeliveryRate: 0.82,
    responsiveness: 0.88,
    costCompetitiveness: 0.72,
    priceVolatility: 0.20,
    monthlyCapacity: 800000,
    minimumOrder: 20000,
    paymentTerms: "net45",
    contractDiscount: 0.12,
    relationshipLevel: 50
  },
  {
    id: "asia_powertech",
    name: "PowerTech Batteries",
    region: "Asia",
    materials: ["battery"],
    qualityRating: 87,
    defectRate: 0.02,
    consistency: 0.80,
    onTimeDeliveryRate: 0.80,
    responsiveness: 0.88,
    costCompetitiveness: 0.78,
    priceVolatility: 0.25,
    monthlyCapacity: 1500000,
    minimumOrder: 30000,
    paymentTerms: "net60",
    contractDiscount: 0.18,
    relationshipLevel: 50
  },

  // Europe Suppliers
  {
    id: "eu_precisionoptics",
    name: "Precision Optics GmbH",
    region: "Europe",
    materials: ["camera"],
    qualityRating: 96,
    defectRate: 0.007,
    consistency: 0.93,
    onTimeDeliveryRate: 0.91,
    responsiveness: 0.88,
    costCompetitiveness: 0.42,
    priceVolatility: 0.10,
    monthlyCapacity: 400000,
    minimumOrder: 8000,
    paymentTerms: "net30",
    contractDiscount: 0.07,
    relationshipLevel: 50
  },
  {
    id: "eu_premiumdisplay",
    name: "Premium Display Solutions",
    region: "Europe",
    materials: ["display"],
    qualityRating: 94,
    defectRate: 0.008,
    consistency: 0.91,
    onTimeDeliveryRate: 0.90,
    responsiveness: 0.86,
    costCompetitiveness: 0.40,
    priceVolatility: 0.12,
    monthlyCapacity: 350000,
    minimumOrder: 7000,
    paymentTerms: "net30",
    contractDiscount: 0.09,
    relationshipLevel: 50
  },

  // South America Suppliers
  {
    id: "sa_lithiumcorp",
    name: "LithiumCorp SA",
    region: "South America",
    materials: ["battery"],
    qualityRating: 75,
    defectRate: 0.03,
    consistency: 0.70,
    onTimeDeliveryRate: 0.68,
    responsiveness: 0.65,
    costCompetitiveness: 0.88,
    priceVolatility: 0.32,
    monthlyCapacity: 600000,
    minimumOrder: 25000,
    paymentTerms: "net90",
    contractDiscount: 0.20,
    relationshipLevel: 50
  },
  {
    id: "sa_basicmfg",
    name: "Basic Manufacturing Co",
    region: "South America",
    materials: ["chassis", "other"],
    qualityRating: 72,
    defectRate: 0.035,
    consistency: 0.68,
    onTimeDeliveryRate: 0.66,
    responsiveness: 0.62,
    costCompetitiveness: 0.86,
    priceVolatility: 0.28,
    monthlyCapacity: 800000,
    minimumOrder: 30000,
    paymentTerms: "net90",
    contractDiscount: 0.22,
    relationshipLevel: 50
  },

  // Africa Suppliers
  {
    id: "af_mineralextract",
    name: "African Mineral Extractors",
    region: "Africa",
    materials: ["battery", "other"],
    qualityRating: 68,
    defectRate: 0.04,
    consistency: 0.62,
    onTimeDeliveryRate: 0.60,
    responsiveness: 0.58,
    costCompetitiveness: 0.92,
    priceVolatility: 0.38,
    monthlyCapacity: 500000,
    minimumOrder: 40000,
    paymentTerms: "immediate",
    contractDiscount: 0.25,
    relationshipLevel: 50
  },

  // Oceania Suppliers
  {
    id: "oc_qualitytech",
    name: "Quality Tech Australia",
    region: "Oceania",
    materials: ["processor", "memory", "camera"],
    qualityRating: 92,
    defectRate: 0.011,
    consistency: 0.89,
    onTimeDeliveryRate: 0.88,
    responsiveness: 0.86,
    costCompetitiveness: 0.50,
    priceVolatility: 0.15,
    monthlyCapacity: 250000,
    minimumOrder: 6000,
    paymentTerms: "net30",
    contractDiscount: 0.08,
    relationshipLevel: 50
  },

  // Middle East Suppliers
  {
    id: "me_logisticshub",
    name: "Middle East Logistics Hub",
    region: "Middle East",
    materials: ["chassis", "battery", "other"],
    qualityRating: 80,
    defectRate: 0.022,
    consistency: 0.78,
    onTimeDeliveryRate: 0.85,
    responsiveness: 0.88,
    costCompetitiveness: 0.68,
    priceVolatility: 0.22,
    monthlyCapacity: 700000,
    minimumOrder: 15000,
    paymentTerms: "net45",
    contractDiscount: 0.14,
    relationshipLevel: 50
  }
];

/**
 * Get suppliers for a specific material type
 */
export function getSuppliersForMaterial(materialType: MaterialType): Supplier[] {
  return DEFAULT_SUPPLIERS.filter(s => s.materials.includes(materialType));
}

/**
 * Get suppliers in a specific region
 */
export function getSuppliersInRegion(region: Region): Supplier[] {
  return DEFAULT_SUPPLIERS.filter(s => s.region === region);
}

/**
 * Find best supplier based on criteria
 */
export function findBestSupplier(
  materialType: MaterialType,
  prioritize: "cost" | "quality" | "reliability"
): Supplier | undefined {
  const suppliers = getSuppliersForMaterial(materialType);

  if (suppliers.length === 0) return undefined;

  switch (prioritize) {
    case "cost":
      return suppliers.reduce((best, current) =>
        current.costCompetitiveness > best.costCompetitiveness ? current : best
      );
    case "quality":
      return suppliers.reduce((best, current) =>
        current.qualityRating > best.qualityRating ? current : best
      );
    case "reliability":
      return suppliers.reduce((best, current) =>
        current.onTimeDeliveryRate > best.onTimeDeliveryRate ? current : best
      );
  }
}
```

---

## FILE: engine/materials/index.ts

```typescript
/**
 * Materials System Module
 * Exports all materials-related types, data, and utilities
 */

export * from "./types";
export * from "./suppliers";
export { MaterialEngine } from "./MaterialEngine";
export { MaterialIntegration } from "./MaterialIntegration";
export { FinanceIntegration } from "./FinanceIntegration";
```

---

## FILE: engine/materials/FinanceIntegration.ts

```typescript
/**
 * Finance Integration for Material System
 * Connects material costs to financial statements and COGS
 */

import type { TeamState } from "../types";
import type { MaterialInventory, MaterialOrder, MaterialsState } from "./types";
import { MaterialEngine } from "./MaterialEngine";

export interface MaterialFinancialImpact {
  // Balance Sheet Impact
  inventoryAsset: number;
  accountsPayable: number;  // Unpaid material orders
  workingCapital: number;

  // Income Statement Impact
  cogs: number;  // Cost of Goods Sold
  materialCosts: number;
  holdingCosts: number;
  tariffExpenses: number;
  shippingExpenses: number;

  // Cash Flow Impact
  cashOutflow: number;  // Payments for materials
  cashInflow: number;   // None for materials

  // Ratios
  inventoryTurnover: number;  // COGS / Avg Inventory
  daysInventoryOutstanding: number;  // 365 / Inventory Turnover
}

export interface COGSBreakdown {
  rawMaterials: number;
  directLabor: number;
  manufacturingOverhead: number;
  shipping: number;
  tariffs: number;
  total: number;
  perUnit: number;
}

/**
 * Finance Integration Layer
 * Bridges materials costs with financial statements
 */
export class FinanceIntegration {
  /**
   * Calculate complete financial impact of materials
   */
  static calculateFinancialImpact(
    materialsState: MaterialsState,
    revenue: number,
    unitsSold: number
  ): MaterialFinancialImpact {
    // Calculate inventory value
    const inventoryAsset = materialsState.totalInventoryValue;

    // Calculate accounts payable (unpaid orders in transit)
    const accountsPayable = materialsState.activeOrders
      .filter(o => o.status !== "delivered")
      .reduce((sum, o) => sum + o.totalCost, 0);

    // Working capital = inventory - payables
    const workingCapital = inventoryAsset - accountsPayable;

    // Calculate COGS from materials consumed
    const materialCosts = this.calculateMaterialCOGS(materialsState.inventory, unitsSold);

    // Holding costs
    const holdingCosts = materialsState.holdingCosts;

    // Tariff and shipping expenses from delivered orders
    const deliveredOrders = materialsState.activeOrders.filter(o => o.status === "delivered");
    const tariffExpenses = deliveredOrders.reduce((sum, o) => sum + o.tariffCost, 0);
    const shippingExpenses = deliveredOrders.reduce((sum, o) => sum + o.shippingCost, 0);

    // Total COGS (materials + holding costs)
    const cogs = materialCosts + holdingCosts;

    // Cash outflow (payments for materials this round)
    const cashOutflow = deliveredOrders.reduce((sum, o) => sum + o.totalCost, 0);

    // Inventory metrics
    const inventoryTurnover = inventoryAsset > 0 ? cogs / inventoryAsset : 0;
    const daysInventoryOutstanding = inventoryTurnover > 0 ? 365 / inventoryTurnover : 0;

    return {
      inventoryAsset,
      accountsPayable,
      workingCapital,
      cogs,
      materialCosts,
      holdingCosts,
      tariffExpenses,
      shippingExpenses,
      cashOutflow,
      cashInflow: 0,
      inventoryTurnover,
      daysInventoryOutstanding
    };
  }

  /**
   * Calculate material component of COGS
   */
  private static calculateMaterialCOGS(
    inventory: MaterialInventory[],
    unitsSold: number
  ): number {
    // Use weighted average cost method
    const totalInventoryValue = inventory.reduce(
      (sum, item) => sum + item.quantity * item.averageCost,
      0
    );

    // Approximate COGS as proportion of inventory consumed
    // In real implementation, this would track actual consumption
    return totalInventoryValue * 0.1; // 10% of inventory value as placeholder
  }

  /**
   * Get complete COGS breakdown
   */
  static getCOGSBreakdown(
    materialsState: MaterialsState,
    laborCosts: number,
    overheadCosts: number,
    unitsSold: number
  ): COGSBreakdown {
    const impact = this.calculateFinancialImpact(materialsState, 0, unitsSold);

    const rawMaterials = impact.materialCosts;
    const shipping = impact.shippingExpenses;
    const tariffs = impact.tariffExpenses;
    const total = rawMaterials + laborCosts + overheadCosts + shipping + tariffs;
    const perUnit = unitsSold > 0 ? total / unitsSold : 0;

    return {
      rawMaterials,
      directLabor: laborCosts,
      manufacturingOverhead: overheadCosts,
      shipping,
      tariffs,
      total,
      perUnit
    };
  }

  /**
   * Update financial statements with material impact
   */
  static updateFinancials(
    state: TeamState,
    materialsState: MaterialsState
  ): TeamState {
    const impact = this.calculateFinancialImpact(
      materialsState,
      state.revenue,
      state.marketShare * 1000000 // Approximate units sold
    );

    return {
      ...state,
      // Update balance sheet
      totalAssets: state.totalAssets + impact.inventoryAsset,
      currentAssets: (state.currentAssets || 0) + impact.inventoryAsset,
      totalLiabilities: state.totalLiabilities + impact.accountsPayable,
      currentLiabilities: (state.currentLiabilities || 0) + impact.accountsPayable,

      // Update cash flow
      cash: state.cash - impact.cashOutflow,

      // Update materials state
      materials: materialsState
    };
  }

  /**
   * Calculate working capital requirements for materials
   */
  static calculateWorkingCapitalNeeds(
    plannedProduction: number,
    averageLeadTime: number,
    costPerUnit: number
  ): {
    workingCapitalRequired: number;
    cashNeeded: number;
    financingNeeded: number;
    recommendation: string;
  } {
    // Working capital = (production * cost per unit) * (lead time / 30 days)
    const workingCapitalRequired = plannedProduction * costPerUnit * (averageLeadTime / 30);

    // Assume 60% can be financed via payables
    const cashNeeded = workingCapitalRequired * 0.4;
    const financingNeeded = workingCapitalRequired * 0.6;

    let recommendation = "";
    if (workingCapitalRequired > 50_000_000) {
      recommendation = "High working capital requirements. Consider negotiating longer payment terms or shorter lead times.";
    } else if (workingCapitalRequired > 20_000_000) {
      recommendation = "Moderate working capital needs. Ensure sufficient credit line availability.";
    } else {
      recommendation = "Working capital requirements are manageable with current cash position.";
    }

    return {
      workingCapitalRequired,
      cashNeeded,
      financingNeeded,
      recommendation
    };
  }

  /**
   * Analyze material cost efficiency
   */
  static analyzeCostEfficiency(
    materialsState: MaterialsState,
    revenue: number,
    targetMargin: number
  ): {
    materialCostPercentage: number;
    marginImpact: number;
    isEfficient: boolean;
    recommendations: string[];
  } {
    const impact = this.calculateFinancialImpact(materialsState, revenue, 1000000);

    const materialCostPercentage = revenue > 0 ? (impact.cogs / revenue) * 100 : 0;
    const marginImpact = materialCostPercentage / 100;
    const isEfficient = materialCostPercentage < 40; // Material costs should be <40% of revenue

    const recommendations: string[] = [];

    if (materialCostPercentage > 50) {
      recommendations.push("⚠️ Material costs exceed 50% of revenue - urgent cost reduction needed");
      recommendations.push("Consider sourcing from lower-cost regions or negotiating bulk discounts");
    } else if (materialCostPercentage > 40) {
      recommendations.push("⚠️ Material costs are high - explore cost optimization opportunities");
    }

    if (impact.tariffExpenses > revenue * 0.05) {
      recommendations.push("⚠️ Tariff costs exceed 5% of revenue - consider alternative sourcing regions");
    }

    if (impact.daysInventoryOutstanding > 60) {
      recommendations.push("⚠️ Inventory turnover is slow - reduce inventory levels or increase production");
    }

    if (impact.inventoryTurnover < 4) {
      recommendations.push("Low inventory turnover - materials may be sitting idle");
    }

    return {
      materialCostPercentage,
      marginImpact,
      isEfficient,
      recommendations
    };
  }

  /**
   * Get financial summary for materials
   */
  static getFinancialSummary(
    materialsState: MaterialsState,
    revenue: number
  ): {
    title: string;
    metrics: Array<{
      label: string;
      value: string;
      status: "good" | "warning" | "critical";
      description: string;
    }>;
  } {
    const impact = this.calculateFinancialImpact(materialsState, revenue, 1000000);
    const efficiency = this.analyzeCostEfficiency(materialsState, revenue, 0.15);

    return {
      title: "Material Financial Summary",
      metrics: [
        {
          label: "Inventory Value",
          value: `$${(impact.inventoryAsset / 1_000_000).toFixed(2)}M`,
          status: impact.inventoryAsset > revenue * 0.3 ? "warning" : "good",
          description: "Total value of materials on hand"
        },
        {
          label: "Material Cost %",
          value: `${efficiency.materialCostPercentage.toFixed(1)}%`,
          status: efficiency.isEfficient ? "good" : "warning",
          description: "Material costs as % of revenue"
        },
        {
          label: "Inventory Turnover",
          value: `${impact.inventoryTurnover.toFixed(1)}x`,
          status: impact.inventoryTurnover >= 4 ? "good" : "warning",
          description: "How fast inventory is used"
        },
        {
          label: "Days Inventory",
          value: `${Math.round(impact.daysInventoryOutstanding)} days`,
          status: impact.daysInventoryOutstanding <= 60 ? "good" : "warning",
          description: "Average time materials sit in inventory"
        },
        {
          label: "Working Capital",
          value: `$${(impact.workingCapital / 1_000_000).toFixed(2)}M`,
          status: impact.workingCapital > 0 ? "good" : "critical",
          description: "Inventory minus payables"
        }
      ]
    };
  }

  /**
   * Calculate break-even analysis with materials
   */
  static calculateBreakEven(
    fixedCosts: number,
    materialCostPerUnit: number,
    laborCostPerUnit: number,
    pricePerUnit: number
  ): {
    breakEvenUnits: number;
    breakEvenRevenue: number;
    contributionMargin: number;
    contributionMarginRatio: number;
  } {
    const variableCostPerUnit = materialCostPerUnit + laborCostPerUnit;
    const contributionMargin = pricePerUnit - variableCostPerUnit;
    const contributionMarginRatio = contributionMargin / pricePerUnit;

    const breakEvenUnits = contributionMargin > 0 ? fixedCosts / contributionMargin : Infinity;
    const breakEvenRevenue = breakEvenUnits * pricePerUnit;

    return {
      breakEvenUnits,
      breakEvenRevenue,
      contributionMargin,
      contributionMarginRatio
    };
  }
}
```

---

## FILE: engine/logistics/LogisticsEngine.ts

```typescript
/**
 * Logistics Engine
 * Handles shipping route calculations, lead times, and logistics costs
 */

import type { Region } from "../materials/types";
import type {
  ShippingMethod,
  ShippingRoute,
  LogisticsCalculation,
  ShipmentTracking,
  ShipmentDelay,
  LogisticsStrategy,
  LogisticsDisruption
} from "./types";
import {
  SHIPPING_ROUTES,
  SHIPPING_METHODS,
  MAJOR_PORTS,
  CLEARANCE_REQUIREMENTS,
  findRoute,
  calculateShippingCost as calcShipCost,
  calculateLeadTime as calcLeadTime
} from "./routes";

export class LogisticsEngine {
  /**
   * Calculate complete logistics for a shipment
   */
  static calculateLogistics(
    fromRegion: Region,
    toRegion: Region,
    shippingMethod: ShippingMethod,
    weight: number, // in tons
    volume: number, // in cubic meters
    productionTime: number // days already spent in production
  ): LogisticsCalculation {
    const route = findRoute(fromRegion, toRegion);

    if (!route) {
      throw new Error(`No route found from ${fromRegion} to ${toRegion}`);
    }

    const methodDetails = SHIPPING_METHODS[shippingMethod];

    // Validate shipping method is available for this route
    if (!route.availableMethods.includes(shippingMethod)) {
      throw new Error(
        `Shipping method ${shippingMethod} not available for route ${fromRegion} to ${toRegion}`
      );
    }

    // Calculate shipping time
    const baseShippingTime = route.baseLeadTime;
    const shippingTime = Math.ceil(baseShippingTime * methodDetails.timeMultiplier);

    // Calculate clearance time
    const clearanceReq = CLEARANCE_REQUIREMENTS.find(
      cr => cr.fromRegion === fromRegion && cr.toRegion === toRegion
    );
    const baseClearanceTime = clearanceReq?.baseProcessingTime ?? 3;
    const inspectionProbability = clearanceReq?.inspectionProbability ?? 0.15;
    const inspectionTime = Math.random() < inspectionProbability ? 2 : 0;
    const clearanceTime = baseClearanceTime + inspectionTime;

    // Total lead time
    const totalLeadTime = productionTime + shippingTime + clearanceTime + inspectionTime;

    // Calculate costs
    const shippingCost = this.calculateShippingCost(route, shippingMethod, weight, volume);
    const clearanceCost = clearanceReq?.baseCost ?? 600;
    const insuranceCost = this.calculateInsuranceCost(shippingCost, shippingMethod);
    const handlingCost = this.calculateHandlingCost(weight, volume, shippingMethod);
    const totalLogisticsCost = shippingCost + clearanceCost + insuranceCost + handlingCost;

    // Calculate risk
    const onTimeProbability = methodDetails.reliability * route.customsEfficiency * (1 - route.congestionLevel * 0.3);
    const delayRisk = Math.ceil((1 - onTimeProbability) * shippingTime * 0.3);
    const lossRisk = (1 - methodDetails.reliability) * 0.05; // 5% max loss risk

    return {
      route,
      shippingMethod,
      weight,
      volume,
      productionTime,
      shippingTime,
      clearanceTime,
      inspectionTime,
      totalLeadTime,
      shippingCost,
      clearanceCost,
      insuranceCost,
      handlingCost,
      totalLogisticsCost,
      onTimeProbability,
      delayRisk,
      lossRisk
    };
  }

  /**
   * Calculate shipping cost based on weight, volume, and method
   */
  private static calculateShippingCost(
    route: ShippingRoute,
    method: ShippingMethod,
    weight: number,
    volume: number
  ): number {
    const methodDetails = SHIPPING_METHODS[method];
    const baseCost = route.baseCost;

    // Use chargeable weight (greater of actual weight or volumetric weight)
    const volumetricWeight = method === "air" ? volume / 6 : volume / 3;
    const chargeableWeight = Math.max(weight, volumetricWeight);

    // Base calculation
    let cost = baseCost * methodDetails.costMultiplier * chargeableWeight;

    // Distance factor
    const distanceFactor = 1 + (route.distance / 10000) * 0.2;
    cost *= distanceFactor;

    // Infrastructure quality affects cost
    cost *= (2 - route.infrastructureQuality);

    // Congestion surcharge
    if (route.congestionLevel > 0.5) {
      cost *= 1 + (route.congestionLevel - 0.5);
    }

    return Math.round(cost);
  }

  /**
   * Calculate insurance cost
   */
  private static calculateInsuranceCost(shippingCost: number, method: ShippingMethod): number {
    const rates = {
      sea: 0.015, // 1.5%
      air: 0.008, // 0.8%
      land: 0.012, // 1.2%
      rail: 0.010 // 1.0%
    };

    return Math.round(shippingCost * rates[method]);
  }

  /**
   * Calculate handling cost
   */
  private static calculateHandlingCost(
    weight: number,
    volume: number,
    method: ShippingMethod
  ): number {
    const handlingRates = {
      sea: 50, // per ton
      air: 120,
      land: 80,
      rail: 60
    };

    return Math.round(weight * handlingRates[method]);
  }

  /**
   * Get optimal shipping method based on strategy
   */
  static getOptimalShippingMethod(
    fromRegion: Region,
    toRegion: Region,
    weight: number,
    volume: number,
    strategy: LogisticsStrategy,
    urgent: boolean = false
  ): ShippingMethod {
    const route = findRoute(fromRegion, toRegion);
    if (!route) return "sea"; // Default

    if (urgent) {
      return strategy.rushOrderMethod;
    }

    // Calculate cost and time for each available method
    const evaluations = route.availableMethods.map(method => {
      const calc = this.calculateLogistics(fromRegion, toRegion, method, weight, volume, 0);
      return {
        method,
        cost: calc.totalLogisticsCost,
        time: calc.totalLeadTime,
        reliability: calc.onTimeProbability
      };
    });

    // Apply strategy thresholds
    const costOptions = evaluations.filter(e => e.cost <= strategy.costThreshold);
    const timeOptions = evaluations.filter(e => e.time <= strategy.timeThreshold);

    // If both constraints can be met, choose the one with best reliability
    const viable = costOptions.filter(c => timeOptions.some(t => t.method === c.method));
    if (viable.length > 0) {
      return viable.reduce((best, current) =>
        current.reliability > best.reliability ? current : best
      ).method;
    }

    // Otherwise, use default strategy
    return strategy.defaultShippingMethod;
  }

  /**
   * Track shipment status
   */
  static trackShipment(
    orderId: string,
    currentRound: number,
    orderRound: number,
    estimatedArrivalRound: number,
    fromRegion: Region,
    toRegion: Region,
    delays: ShipmentDelay[]
  ): ShipmentTracking {
    const roundsElapsed = currentRound - orderRound;
    const totalRounds = estimatedArrivalRound - orderRound;
    const progress = totalRounds > 0 ? roundsElapsed / totalRounds : 0;

    let currentStatus: ShipmentTracking["currentStatus"];
    let currentLocation: string;

    if (progress < 0.2) {
      currentStatus = "origin";
      currentLocation = `Departing ${fromRegion}`;
    } else if (progress < 0.7) {
      currentStatus = "in_transit";
      currentLocation = `En route to ${toRegion}`;
    } else if (progress < 0.9) {
      currentStatus = "customs";
      currentLocation = `Customs clearance in ${toRegion}`;
    } else if (progress < 1.0) {
      currentStatus = "inspection";
      currentLocation = `Final inspection in ${toRegion}`;
    } else {
      currentStatus = "delivery";
      currentLocation = `Delivered to ${toRegion}`;
    }

    // Generate tracking events
    const events = [
      {
        round: orderRound,
        type: "departed" as const,
        location: fromRegion,
        description: `Shipment departed from ${fromRegion}`
      }
    ];

    if (progress >= 0.2) {
      events.push({
        round: orderRound + Math.ceil(totalRounds * 0.2),
        type: "arrived_port" as const,
        location: `Port in ${fromRegion}`,
        description: `Arrived at departure port`
      });
    }

    if (progress >= 0.7) {
      events.push({
        round: orderRound + Math.ceil(totalRounds * 0.7),
        type: "arrived_port" as const,
        location: `Port in ${toRegion}`,
        description: `Arrived at destination port`
      });
    }

    if (progress >= 0.85) {
      events.push({
        round: orderRound + Math.ceil(totalRounds * 0.85),
        type: "cleared_customs" as const,
        location: `${toRegion}`,
        description: `Cleared customs in ${toRegion}`
      });
    }

    // Add delay events
    for (const delay of delays) {
      events.push({
        round: delay.round,
        type: "delayed" as const,
        location: currentLocation,
        description: `Delayed due to ${delay.reason}: +${delay.delayDays} days`
      });
    }

    return {
      orderId,
      currentStatus,
      currentLocation,
      estimatedArrivalRound,
      delays,
      events: events.sort((a, b) => a.round - b.round)
    };
  }

  /**
   * Apply logistics disruption
   */
  static applyDisruption(
    calculation: LogisticsCalculation,
    disruption: LogisticsDisruption
  ): LogisticsCalculation {
    // Check if route is affected
    const routeId = calculation.route.id;
    if (!disruption.affectedRoutes.includes(routeId)) {
      return calculation;
    }

    // Check if method is affected
    if (!disruption.affectedMethods.includes(calculation.shippingMethod)) {
      return calculation;
    }

    // Apply disruption effects
    return {
      ...calculation,
      shippingTime: Math.ceil(calculation.shippingTime * disruption.delayMultiplier),
      totalLeadTime: Math.ceil(calculation.totalLeadTime * disruption.delayMultiplier),
      shippingCost: Math.ceil(calculation.shippingCost * disruption.costMultiplier),
      totalLogisticsCost: Math.ceil(calculation.totalLogisticsCost * disruption.costMultiplier),
      onTimeProbability: calculation.onTimeProbability * 0.5, // Disruption reduces reliability
      delayRisk: calculation.delayRisk + Math.ceil(calculation.shippingTime * (disruption.delayMultiplier - 1))
    };
  }

  /**
   * Compare shipping options
   */
  static compareShippingOptions(
    fromRegion: Region,
    toRegion: Region,
    weight: number,
    volume: number,
    productionTime: number
  ): {
    method: ShippingMethod;
    logistics: LogisticsCalculation;
    costEfficiency: number;
    timeEfficiency: number;
    overallScore: number;
  }[] {
    const route = findRoute(fromRegion, toRegion);
    if (!route) return [];

    const comparisons = route.availableMethods.map(method => {
      const logistics = this.calculateLogistics(
        fromRegion,
        toRegion,
        method,
        weight,
        volume,
        productionTime
      );

      // Calculate efficiency scores (0-100)
      const allCalculations = route.availableMethods.map(m =>
        this.calculateLogistics(fromRegion, toRegion, m, weight, volume, productionTime)
      );

      const minCost = Math.min(...allCalculations.map(c => c.totalLogisticsCost));
      const maxCost = Math.max(...allCalculations.map(c => c.totalLogisticsCost));
      const minTime = Math.min(...allCalculations.map(c => c.totalLeadTime));
      const maxTime = Math.max(...allCalculations.map(c => c.totalLeadTime));

      const costEfficiency = maxCost > minCost
        ? Math.max(0, ((maxCost - logistics.totalLogisticsCost) / (maxCost - minCost)) * 100)
        : 100;

      const timeEfficiency = maxTime > minTime
        ? Math.max(0, ((maxTime - logistics.totalLeadTime) / (maxTime - minTime)) * 100)
        : 100;

      // Overall score: weighted average (60% cost, 40% time)
      const overallScore = costEfficiency * 0.6 + timeEfficiency * 0.4;

      return {
        method,
        logistics,
        costEfficiency,
        timeEfficiency,
        overallScore
      };
    });

    return comparisons.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Get logistics recommendations
   */
  static getRecommendations(
    fromRegion: Region,
    toRegion: Region,
    weight: number,
    volume: number,
    budget: number,
    maxLeadTime: number
  ): {
    recommended: ShippingMethod;
    alternatives: ShippingMethod[];
    reasoning: string;
    warnings: string[];
  } {
    const comparisons = this.compareShippingOptions(fromRegion, toRegion, weight, volume, 0);
    const warnings: string[] = [];

    // Filter by budget and time constraints
    const viable = comparisons.filter(c =>
      c.logistics.totalLogisticsCost <= budget &&
      c.logistics.totalLeadTime <= maxLeadTime
    );

    if (viable.length === 0) {
      warnings.push("No shipping methods meet both budget and time constraints");

      // Relax constraints
      const budgetViable = comparisons.filter(c => c.logistics.totalLogisticsCost <= budget);
      const timeViable = comparisons.filter(c => c.logistics.totalLeadTime <= maxLeadTime);

      if (budgetViable.length > 0) {
        const best = budgetViable[0];
        return {
          recommended: best.method,
          alternatives: budgetViable.slice(1, 3).map(v => v.method),
          reasoning: `Budget constraint met, but delivery will take ${best.logistics.totalLeadTime} days (${best.logistics.totalLeadTime - maxLeadTime} days over target)`,
          warnings
        };
      }

      if (timeViable.length > 0) {
        const best = timeViable[0];
        return {
          recommended: best.method,
          alternatives: timeViable.slice(1, 3).map(v => v.method),
          reasoning: `Time constraint met, but cost is $${best.logistics.totalLogisticsCost.toLocaleString()} ($${(best.logistics.totalLogisticsCost - budget).toLocaleString()} over budget)`,
          warnings
        };
      }

      // Neither constraint can be met
      const best = comparisons[0];
      return {
        recommended: best.method,
        alternatives: comparisons.slice(1, 3).map(c => c.method),
        reasoning: `Best overall option despite exceeding both constraints`,
        warnings: [
          ...warnings,
          `Cost exceeds budget by $${(best.logistics.totalLogisticsCost - budget).toLocaleString()}`,
          `Delivery time exceeds limit by ${best.logistics.totalLeadTime - maxLeadTime} days`
        ]
      };
    }

    // Multiple viable options
    const best = viable[0];
    return {
      recommended: best.method,
      alternatives: viable.slice(1, 3).map(v => v.method),
      reasoning: `Best balance of cost ($${best.logistics.totalLogisticsCost.toLocaleString()}) and time (${best.logistics.totalLeadTime} days) with ${Math.round(best.logistics.onTimeProbability * 100)}% on-time probability`,
      warnings
    };
  }
}
```

---

## FILE: engine/logistics/routes.ts

```typescript
/**
 * Shipping Routes and Logistics Network Data
 * Defines all possible shipping routes between regions
 */

import type { Region } from "../materials/types";
import type { ShippingRoute, ShippingMethodDetails, Port, ClearanceRequirement } from "./types";

export const SHIPPING_METHODS: Record<string, ShippingMethodDetails> = {
  sea: {
    method: "sea",
    costMultiplier: 1.0,
    timeMultiplier: 1.0,
    reliability: 0.82,
    carbonEmissions: 10,
    minimumVolume: 100, // cubic meters
    description: "Most economical for large shipments, slowest delivery"
  },
  air: {
    method: "air",
    costMultiplier: 3.5,
    timeMultiplier: 0.15,
    reliability: 0.96,
    carbonEmissions: 500,
    minimumVolume: 1,
    description: "Fastest delivery, highest cost, best for urgent orders"
  },
  land: {
    method: "land",
    costMultiplier: 1.8,
    timeMultiplier: 0.5,
    reliability: 0.91,
    carbonEmissions: 60,
    minimumVolume: 10,
    description: "Good for regional shipments, moderate cost and speed"
  },
  rail: {
    method: "rail",
    costMultiplier: 1.4,
    timeMultiplier: 0.6,
    reliability: 0.89,
    carbonEmissions: 30,
    minimumVolume: 50,
    description: "Eco-friendly option, good balance of cost and time"
  }
};

export const MAJOR_PORTS: Port[] = [
  // North America
  { name: "Los Angeles", region: "North America", country: "USA", efficiency: 0.88, capacity: 9500000, avgProcessingTime: 3, fees: 2500 },
  { name: "New York", region: "North America", country: "USA", efficiency: 0.85, capacity: 7000000, avgProcessingTime: 4, fees: 2800 },
  { name: "Vancouver", region: "North America", country: "Canada", efficiency: 0.90, capacity: 3500000, avgProcessingTime: 2, fees: 2200 },

  // South America
  { name: "Santos", region: "South America", country: "Brazil", efficiency: 0.70, capacity: 4300000, avgProcessingTime: 6, fees: 1800 },
  { name: "Buenos Aires", region: "South America", country: "Argentina", efficiency: 0.68, capacity: 1500000, avgProcessingTime: 7, fees: 1600 },
  { name: "Callao", region: "South America", country: "Peru", efficiency: 0.65, capacity: 2200000, avgProcessingTime: 8, fees: 1400 },

  // Europe
  { name: "Rotterdam", region: "Europe", country: "Netherlands", efficiency: 0.95, capacity: 14500000, avgProcessingTime: 2, fees: 3000 },
  { name: "Hamburg", region: "Europe", country: "Germany", efficiency: 0.93, capacity: 8800000, avgProcessingTime: 2, fees: 2900 },
  { name: "Antwerp", region: "Europe", country: "Belgium", efficiency: 0.92, capacity: 11000000, avgProcessingTime: 3, fees: 2700 },

  // Africa
  { name: "Durban", region: "Africa", country: "South Africa", efficiency: 0.65, capacity: 2800000, avgProcessingTime: 9, fees: 1500 },
  { name: "Lagos", region: "Africa", country: "Nigeria", efficiency: 0.55, capacity: 1200000, avgProcessingTime: 12, fees: 1200 },
  { name: "Port Said", region: "Africa", country: "Egypt", efficiency: 0.72, capacity: 3500000, avgProcessingTime: 7, fees: 1700 },

  // Asia
  { name: "Shanghai", region: "Asia", country: "China", efficiency: 0.92, capacity: 43000000, avgProcessingTime: 2, fees: 2000 },
  { name: "Singapore", region: "Asia", country: "Singapore", efficiency: 0.98, capacity: 37000000, avgProcessingTime: 1, fees: 2500 },
  { name: "Busan", region: "Asia", country: "South Korea", efficiency: 0.90, capacity: 21000000, avgProcessingTime: 2, fees: 2200 },
  { name: "Tokyo", region: "Asia", country: "Japan", efficiency: 0.94, capacity: 7600000, avgProcessingTime: 2, fees: 3200 },

  // Oceania
  { name: "Sydney", region: "Oceania", country: "Australia", efficiency: 0.88, capacity: 2600000, avgProcessingTime: 3, fees: 2400 },
  { name: "Melbourne", region: "Oceania", country: "Australia", efficiency: 0.87, capacity: 2800000, avgProcessingTime: 3, fees: 2300 },
  { name: "Auckland", region: "Oceania", country: "New Zealand", efficiency: 0.85, capacity: 900000, avgProcessingTime: 4, fees: 2100 },

  // Middle East
  { name: "Dubai", region: "Middle East", country: "UAE", efficiency: 0.90, capacity: 15000000, avgProcessingTime: 2, fees: 2600 },
  { name: "Jeddah", region: "Middle East", country: "Saudi Arabia", efficiency: 0.78, capacity: 4000000, avgProcessingTime: 5, fees: 2000 },
  { name: "Doha", region: "Middle East", country: "Qatar", efficiency: 0.82, capacity: 2000000, avgProcessingTime: 4, fees: 2200 }
];

export const SHIPPING_ROUTES: ShippingRoute[] = [
  // North America Routes
  {
    id: "na_to_asia",
    fromRegion: "North America",
    toRegion: "Asia",
    availableMethods: ["sea", "air", "rail"],
    baseLeadTime: 25,
    baseCost: 4200,
    distance: 10000,
    majorPorts: ["Los Angeles", "Vancouver", "Shanghai", "Busan"],
    infrastructureQuality: 0.92,
    congestionLevel: 0.40,
    customsEfficiency: 0.85
  },
  {
    id: "na_to_europe",
    fromRegion: "North America",
    toRegion: "Europe",
    availableMethods: ["sea", "air"],
    baseLeadTime: 20,
    baseCost: 3400,
    distance: 7000,
    majorPorts: ["New York", "Rotterdam", "Hamburg"],
    infrastructureQuality: 0.94,
    congestionLevel: 0.35,
    customsEfficiency: 0.90
  },
  {
    id: "na_to_sa",
    fromRegion: "North America",
    toRegion: "South America",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 18,
    baseCost: 2500,
    distance: 6000,
    majorPorts: ["Los Angeles", "Santos", "Buenos Aires"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.30,
    customsEfficiency: 0.70
  },
  {
    id: "na_to_oceania",
    fromRegion: "North America",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 22,
    baseCost: 3200,
    distance: 12000,
    majorPorts: ["Los Angeles", "Sydney", "Auckland"],
    infrastructureQuality: 0.88,
    congestionLevel: 0.25,
    customsEfficiency: 0.88
  },
  {
    id: "na_to_me",
    fromRegion: "North America",
    toRegion: "Middle East",
    availableMethods: ["sea", "air"],
    baseLeadTime: 28,
    baseCost: 3800,
    distance: 11000,
    majorPorts: ["New York", "Dubai", "Jeddah"],
    infrastructureQuality: 0.85,
    congestionLevel: 0.45,
    customsEfficiency: 0.75
  },
  {
    id: "na_to_africa",
    fromRegion: "North America",
    toRegion: "Africa",
    availableMethods: ["sea", "air"],
    baseLeadTime: 30,
    baseCost: 4000,
    distance: 10500,
    majorPorts: ["New York", "Durban", "Lagos"],
    infrastructureQuality: 0.65,
    congestionLevel: 0.55,
    customsEfficiency: 0.60
  },

  // Asia Routes
  {
    id: "asia_to_europe",
    fromRegion: "Asia",
    toRegion: "Europe",
    availableMethods: ["sea", "air", "rail"],
    baseLeadTime: 30,
    baseCost: 3800,
    distance: 11000,
    majorPorts: ["Shanghai", "Singapore", "Rotterdam", "Hamburg"],
    infrastructureQuality: 0.93,
    congestionLevel: 0.50,
    customsEfficiency: 0.88
  },
  {
    id: "asia_to_oceania",
    fromRegion: "Asia",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 15,
    baseCost: 2600,
    distance: 7000,
    majorPorts: ["Shanghai", "Singapore", "Sydney", "Melbourne"],
    infrastructureQuality: 0.90,
    congestionLevel: 0.35,
    customsEfficiency: 0.90
  },
  {
    id: "asia_to_me",
    fromRegion: "Asia",
    toRegion: "Middle East",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 20,
    baseCost: 2800,
    distance: 7500,
    majorPorts: ["Shanghai", "Singapore", "Dubai"],
    infrastructureQuality: 0.88,
    congestionLevel: 0.40,
    customsEfficiency: 0.80
  },
  {
    id: "asia_to_africa",
    fromRegion: "Asia",
    toRegion: "Africa",
    availableMethods: ["sea", "air"],
    baseLeadTime: 25,
    baseCost: 3000,
    distance: 9000,
    majorPorts: ["Singapore", "Durban", "Port Said"],
    infrastructureQuality: 0.70,
    congestionLevel: 0.50,
    customsEfficiency: 0.65
  },
  {
    id: "asia_to_sa",
    fromRegion: "Asia",
    toRegion: "South America",
    availableMethods: ["sea", "air"],
    baseLeadTime: 35,
    baseCost: 4200,
    distance: 18000,
    majorPorts: ["Shanghai", "Santos", "Callao"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.40,
    customsEfficiency: 0.68
  },

  // Europe Routes
  {
    id: "europe_to_africa",
    fromRegion: "Europe",
    toRegion: "Africa",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 12,
    baseCost: 2200,
    distance: 3500,
    majorPorts: ["Rotterdam", "Durban", "Lagos", "Port Said"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.45,
    customsEfficiency: 0.68
  },
  {
    id: "europe_to_me",
    fromRegion: "Europe",
    toRegion: "Middle East",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 15,
    baseCost: 2000,
    distance: 4500,
    majorPorts: ["Rotterdam", "Hamburg", "Dubai", "Jeddah"],
    infrastructureQuality: 0.88,
    congestionLevel: 0.40,
    customsEfficiency: 0.82
  },
  {
    id: "europe_to_oceania",
    fromRegion: "Europe",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 35,
    baseCost: 4500,
    distance: 17000,
    majorPorts: ["Rotterdam", "Sydney", "Melbourne"],
    infrastructureQuality: 0.90,
    congestionLevel: 0.30,
    customsEfficiency: 0.88
  },
  {
    id: "europe_to_sa",
    fromRegion: "Europe",
    toRegion: "South America",
    availableMethods: ["sea", "air"],
    baseLeadTime: 22,
    baseCost: 3200,
    distance: 9000,
    majorPorts: ["Rotterdam", "Hamburg", "Santos", "Buenos Aires"],
    infrastructureQuality: 0.80,
    congestionLevel: 0.35,
    customsEfficiency: 0.72
  },

  // South America Routes
  {
    id: "sa_to_africa",
    fromRegion: "South America",
    toRegion: "Africa",
    availableMethods: ["sea", "air"],
    baseLeadTime: 20,
    baseCost: 2800,
    distance: 6000,
    majorPorts: ["Santos", "Durban", "Lagos"],
    infrastructureQuality: 0.65,
    congestionLevel: 0.40,
    customsEfficiency: 0.62
  },
  {
    id: "sa_to_oceania",
    fromRegion: "South America",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 28,
    baseCost: 3800,
    distance: 12000,
    majorPorts: ["Santos", "Sydney"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.30,
    customsEfficiency: 0.75
  },
  {
    id: "sa_to_me",
    fromRegion: "South America",
    toRegion: "Middle East",
    availableMethods: ["sea", "air"],
    baseLeadTime: 25,
    baseCost: 3500,
    distance: 11000,
    majorPorts: ["Santos", "Dubai"],
    infrastructureQuality: 0.72,
    congestionLevel: 0.40,
    customsEfficiency: 0.70
  },

  // Africa Routes
  {
    id: "africa_to_me",
    fromRegion: "Africa",
    toRegion: "Middle East",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 10,
    baseCost: 1600,
    distance: 4000,
    majorPorts: ["Port Said", "Durban", "Dubai", "Jeddah"],
    infrastructureQuality: 0.72,
    congestionLevel: 0.45,
    customsEfficiency: 0.68
  },
  {
    id: "africa_to_oceania",
    fromRegion: "Africa",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 22,
    baseCost: 3200,
    distance: 10000,
    majorPorts: ["Durban", "Sydney"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.35,
    customsEfficiency: 0.72
  },

  // Middle East Routes
  {
    id: "me_to_oceania",
    fromRegion: "Middle East",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 20,
    baseCost: 3000,
    distance: 9500,
    majorPorts: ["Dubai", "Sydney", "Melbourne"],
    infrastructureQuality: 0.85,
    congestionLevel: 0.35,
    customsEfficiency: 0.80
  },

  // Oceania internal routes (to other regions already covered by reverse)
];

export const CLEARANCE_REQUIREMENTS: ClearanceRequirement[] = [
  // Standard clearance for electronics
  {
    fromRegion: "Asia",
    toRegion: "North America",
    materialTypes: ["processor", "memory", "display"],
    requiredDocuments: ["Commercial Invoice", "Packing List", "Bill of Lading", "Certificate of Origin", "Safety Certification"],
    inspectionProbability: 0.15,
    baseProcessingTime: 3,
    baseCost: 800,
    restrictions: ["Country of origin verification required"]
  },
  {
    fromRegion: "Asia",
    toRegion: "Europe",
    materialTypes: ["processor", "memory", "display"],
    requiredDocuments: ["Commercial Invoice", "Packing List", "Bill of Lading", "CE Certification", "RoHS Compliance"],
    inspectionProbability: 0.20,
    baseProcessingTime: 4,
    baseCost: 900,
    restrictions: ["EU compliance required", "Environmental standards"]
  },
  // Add more clearance requirements for each route and material type combination
  {
    fromRegion: "North America",
    toRegion: "Asia",
    requiredDocuments: ["Commercial Invoice", "Packing List", "Bill of Lading"],
    inspectionProbability: 0.12,
    baseProcessingTime: 2,
    baseCost: 600
  },
  {
    fromRegion: "Europe",
    toRegion: "Africa",
    requiredDocuments: ["Commercial Invoice", "Packing List", "Certificate of Origin"],
    inspectionProbability: 0.25,
    baseProcessingTime: 6,
    baseCost: 500,
    restrictions: ["Import license may be required"]
  },
  {
    fromRegion: "Africa",
    toRegion: "Middle East",
    requiredDocuments: ["Commercial Invoice", "Packing List", "Bill of Lading", "Certificate of Origin"],
    inspectionProbability: 0.30,
    baseProcessingTime: 5,
    baseCost: 450
  }
];

/**
 * Find route between two regions (bidirectional)
 */
export function findRoute(from: Region, to: Region): ShippingRoute | undefined {
  // Try to find route in either direction
  const forwardRoute = SHIPPING_ROUTES.find(r => r.fromRegion === from && r.toRegion === to);
  if (forwardRoute) return forwardRoute;

  // Try reverse direction
  const reverseRoute = SHIPPING_ROUTES.find(r => r.fromRegion === to && r.toRegion === from);
  return reverseRoute;
}

/**
 * Calculate shipping cost for a route
 */
export function calculateShippingCost(
  route: ShippingRoute,
  method: "sea" | "air" | "land" | "rail",
  weight: number
): number {
  const methodDetails = SHIPPING_METHODS[method];
  const baseCost = route.baseCost;
  const methodMultiplier = methodDetails.costMultiplier;
  const weightMultiplier = weight / 1000; // Cost per ton

  return baseCost * methodMultiplier * weightMultiplier;
}

/**
 * Calculate lead time for a shipment
 */
export function calculateLeadTime(
  route: ShippingRoute,
  method: "sea" | "air" | "land" | "rail"
): number {
  const methodDetails = SHIPPING_METHODS[method];
  const baseTime = route.baseLeadTime;
  const methodMultiplier = methodDetails.timeMultiplier;

  return Math.ceil(baseTime * methodMultiplier);
}
```

---

## FILE: engine/logistics/disruptions.ts

```typescript
/**
 * Supply Chain Disruption Events
 *
 * Random logistics events that affect shipping costs, delivery times,
 * and material availability. Uses SeededRNG for deterministic results.
 */

import type { ShippingMethod } from "./types";

export interface LogisticsDisruptionEvent {
  id: string;
  name: string;
  description: string;
  probability: number; // per round
  affectedMethods: ShippingMethod[];
  costMultiplier: number;
  timeMultiplier: number;
  duration: number; // rounds
}

export interface ActiveDisruption extends LogisticsDisruptionEvent {
  triggeredRound: number;
  expiresRound: number;
}

export const LOGISTICS_DISRUPTION_EVENTS: LogisticsDisruptionEvent[] = [
  {
    id: "port_congestion",
    name: "Port Congestion",
    description: "Major port congestion delays sea shipments",
    probability: 0.10,
    affectedMethods: ["sea"],
    costMultiplier: 1.15,
    timeMultiplier: 1.6,
    duration: 2,
  },
  {
    id: "fuel_spike",
    name: "Global Fuel Price Surge",
    description: "Fuel costs spike across all shipping",
    probability: 0.06,
    affectedMethods: ["sea", "air", "land", "rail"],
    costMultiplier: 1.25,
    timeMultiplier: 1.0,
    duration: 3,
  },
  {
    id: "canal_closure",
    name: "Shipping Lane Disruption",
    description: "Key waterway temporarily closed",
    probability: 0.04,
    affectedMethods: ["sea"],
    costMultiplier: 1.40,
    timeMultiplier: 2.0,
    duration: 1,
  },
  {
    id: "customs_strike",
    name: "Customs Workers Strike",
    description: "Clearance delays at major ports",
    probability: 0.05,
    affectedMethods: ["sea", "air", "land", "rail"],
    costMultiplier: 1.08,
    timeMultiplier: 1.3,
    duration: 1,
  },
  {
    id: "natural_disaster",
    name: "Regional Natural Disaster",
    description: "Infrastructure disrupted by natural event",
    probability: 0.03,
    affectedMethods: ["sea", "land", "rail"],
    costMultiplier: 1.50,
    timeMultiplier: 2.5,
    duration: 2,
  },
  {
    id: "component_shortage",
    name: "Global Component Shortage",
    description: "Chip shortage increases processor/memory costs",
    probability: 0.05,
    affectedMethods: [],
    costMultiplier: 1.0,
    timeMultiplier: 1.0,
    duration: 3,
  },
];

/**
 * Check for new disruption events this round.
 * Uses SeededRNG for deterministic results — never Math.random().
 *
 * @param rng - SeededRNG instance with next() and chance() methods
 * @param currentRound - Current round number
 * @param activeDisruptions - Currently active disruptions (to avoid duplicates)
 * @returns Array of newly triggered disruptions
 */
export function checkDisruptions(
  rng: { next: () => number; chance: (p: number) => boolean },
  currentRound: number,
  activeDisruptions: ActiveDisruption[]
): ActiveDisruption[] {
  const newDisruptions: ActiveDisruption[] = [];

  for (const event of LOGISTICS_DISRUPTION_EVENTS) {
    // Don't trigger if the same event is already active
    if (activeDisruptions.some(d => d.id === event.id && d.expiresRound > currentRound)) {
      continue;
    }

    if (rng.chance(event.probability)) {
      newDisruptions.push({
        ...event,
        triggeredRound: currentRound,
        expiresRound: currentRound + event.duration,
      });
    }
  }

  return newDisruptions;
}
```

---

## FILE: engine/logistics/index.ts

```typescript
/**
 * Logistics System Module
 * Exports all logistics-related types, routes, and utilities
 */

export * from "./types";
export * from "./routes";
export { LogisticsEngine } from "./LogisticsEngine";
```

---

## FILE: engine/tariffs/TariffEngine.ts

```typescript
/**
 * Tariff Engine
 * Handles dynamic tariffs, trade policies, and geopolitical events
 */

import type { Region, MaterialType } from "../materials/types";
import type {
  Tariff,
  TariffEvent,
  GeopoliticalEvent,
  TariffCalculation,
  TariffState,
  TradeAgreement,
  TariffScenario,
  TariffForecast,
  TradePolicy
} from "./types";
import {
  BASELINE_TARIFFS,
  TRADE_AGREEMENTS,
  TARIFF_EVENTS,
  GEOPOLITICAL_EVENTS,
  TARIFF_SCENARIOS,
  TRADE_POLICIES,
  shouldTriggerEvent
} from "./scenarios";

export class TariffEngine {
  /**
   * Calculate tariff for a specific shipment
   */
  static calculateTariff(
    fromRegion: Region,
    toRegion: Region,
    materialType: MaterialType,
    materialCost: number,
    currentRound: number,
    state: TariffState
  ): TariffCalculation {
    const applicableTariffs: Tariff[] = [];
    const tradeAgreements: TradeAgreement[] = [];
    const exemptions: string[] = [];
    const warnings: string[] = [];

    // Find all applicable tariffs
    for (const tariff of state.activeTariffs) {
      if (
        tariff.fromRegion === fromRegion &&
        tariff.toRegion === toRegion &&
        (!tariff.materialTypes || tariff.materialTypes.includes(materialType)) &&
        tariff.effectiveRound <= currentRound &&
        (!tariff.expiryRound || tariff.expiryRound >= currentRound)
      ) {
        applicableTariffs.push(tariff);
      }
    }

    // Find applicable trade agreements
    for (const agreement of state.tradeAgreements) {
      if (
        agreement.regions.includes(fromRegion) &&
        agreement.regions.includes(toRegion) &&
        agreement.effectiveRound <= currentRound &&
        (!agreement.expiryRound || agreement.expiryRound >= currentRound)
      ) {
        tradeAgreements.push(agreement);
        exemptions.push(agreement.name);
      }
    }

    // Calculate base tariff rate
    let baseTariffRate = 0;
    for (const tariff of applicableTariffs) {
      baseTariffRate += tariff.tariffRate;

      if (tariff.volatility > 0.7) {
        warnings.push(`High tariff volatility on ${tariff.name} - rate may change`);
      }
    }

    // Apply trade agreement reductions
    let adjustedTariffRate = baseTariffRate;
    for (const agreement of tradeAgreements) {
      adjustedTariffRate *= (1 - agreement.tariffReduction);
    }

    // Calculate tariff amount
    const tariffAmount = Math.round(materialCost * adjustedTariffRate);

    // Check for upcoming events
    for (const event of state.activeEvents) {
      if (event.type === "tariff_increase") {
        for (const route of event.affectedRoutes) {
          if (route.from === fromRegion && route.to === toRegion) {
            warnings.push(`Upcoming tariff increase: ${event.name}`);
          }
        }
      }
    }

    return {
      materialCost,
      applicableTariffs,
      tradeAgreements,
      baseTariffRate,
      adjustedTariffRate,
      tariffAmount,
      exemptions,
      warnings
    };
  }

  /**
   * Process round events and update tariff state
   */
  static processRoundEvents(
    state: TariffState,
    currentRound: number,
    playerState?: any
  ): {
    newTariffs: Tariff[];
    expiredTariffs: Tariff[];
    newEvents: TariffEvent[];
    newGeopoliticalEvents: GeopoliticalEvent[];
    messages: string[];
  } {
    const newTariffs: Tariff[] = [];
    const expiredTariffs: Tariff[] = [];
    const newEvents: TariffEvent[] = [];
    const newGeopoliticalEvents: GeopoliticalEvent[] = [];
    const messages: string[] = [];

    // Check for tariff expirations
    for (const tariff of state.activeTariffs) {
      if (tariff.expiryRound && tariff.expiryRound === currentRound) {
        expiredTariffs.push(tariff);
        messages.push(`📉 Tariff expired: ${tariff.name} (${tariff.fromRegion} → ${tariff.toRegion})`);
      }
    }

    // Remove expired tariffs
    state.activeTariffs = state.activeTariffs.filter(t =>
      !t.expiryRound || t.expiryRound > currentRound
    );

    // Check for new tariff events
    for (const eventTemplate of TARIFF_EVENTS) {
      if (shouldTriggerEvent(eventTemplate, currentRound, playerState)) {
        const eventWithRound = { ...eventTemplate, triggeredRound: currentRound };
        newEvents.push(eventTemplate);
        state.activeEvents.push(eventWithRound as any);

        // Apply event effects
        if (eventTemplate.type === "tariff_increase" || eventTemplate.type === "new_tariff") {
          for (const route of eventTemplate.affectedRoutes) {
            const tariffId = `event_${eventTemplate.id}_${route.from}_${route.to}_${currentRound}`;
            const newTariff: Tariff = {
              id: tariffId,
              name: `${eventTemplate.name} Tariff`,
              fromRegion: route.from,
              toRegion: route.to,
              materialTypes: eventTemplate.materials,
              tariffRate: route.increase ?? 0,
              effectiveRound: currentRound,
              expiryRound: eventTemplate.duration ? currentRound + eventTemplate.duration : undefined,
              reason: this.getReasonFromEventType(eventTemplate.type),
              volatility: eventTemplate.severity,
              description: eventTemplate.description
            };

            state.activeTariffs.push(newTariff);
            newTariffs.push(newTariff);
            messages.push(
              `🚨 New tariff: ${eventTemplate.name} - ${Math.round(newTariff.tariffRate * 100)}% on ${route.from} → ${route.to} ${eventTemplate.materials ? `(${eventTemplate.materials.join(", ")})` : ""}`
            );
          }
        }

        if (eventTemplate.type === "tariff_decrease" || eventTemplate.type === "trade_agreement") {
          for (const route of eventTemplate.affectedRoutes) {
            messages.push(
              `✅ Tariff reduction: ${eventTemplate.name} - ${Math.round((route.decrease ?? 0) * 100)}% reduction on ${route.from} → ${route.to}`
            );

            // Apply reduction to existing tariffs
            for (const tariff of state.activeTariffs) {
              if (tariff.fromRegion === route.from && tariff.toRegion === route.to) {
                tariff.tariffRate *= (1 - (route.decrease ?? 0));
              }
            }
          }
        }

        if (eventTemplate.type === "sanctions" || eventTemplate.type === "embargo") {
          messages.push(
            `⚠️ ${eventTemplate.name}: ${eventTemplate.description}`
          );
        }
      }
    }

    // Check for geopolitical events
    for (const geoEvent of GEOPOLITICAL_EVENTS) {
      if (Math.random() < 0.01) { // 1% chance per round
        newGeopoliticalEvents.push(geoEvent);
        state.geopoliticalEvents.push(geoEvent);
        messages.push(
          `🌍 Geopolitical event: ${geoEvent.name} - ${geoEvent.description}`
        );
      }
    }

    // Check for scenarios (combinations of events)
    for (const scenario of TARIFF_SCENARIOS) {
      if (Math.random() < scenario.probability) {
        messages.push(
          `⚠️ SCENARIO ACTIVE: ${scenario.name} - ${scenario.description}`
        );

        // Trigger all events in scenario
        for (const event of scenario.events) {
          if (!state.activeEvents.some(e => e.id === event.id)) {
            state.activeEvents.push(event);
            newEvents.push(event);
          }
        }

        for (const geoEvent of scenario.geopoliticalEvents) {
          if (!state.geopoliticalEvents.some(e => e.id === geoEvent.id)) {
            state.geopoliticalEvents.push(geoEvent);
            newGeopoliticalEvents.push(geoEvent);
          }
        }
      }
    }

    // Clean up expired events
    state.activeEvents = state.activeEvents.filter((e: any) => {
      if (!e.triggeredRound) {
        // Events without triggeredRound are assumed to be old/expired
        return false;
      }
      const expiryRound = e.triggeredRound + e.duration;
      return currentRound < expiryRound;
    });

    state.geopoliticalEvents = state.geopoliticalEvents.filter(e => {
      const endRound = e.round + e.duration;
      return endRound >= currentRound;
    });

    return {
      newTariffs,
      expiredTariffs,
      newEvents,
      newGeopoliticalEvents,
      messages
    };
  }

  /**
   * Get tariff forecast for a route
   */
  static forecastTariffs(
    fromRegion: Region,
    toRegion: Region,
    materialType: MaterialType,
    currentRound: number,
    state: TariffState,
    forecastRounds: number = 4
  ): TariffForecast {
    const currentTariff = this.calculateTariff(
      fromRegion,
      toRegion,
      materialType,
      100000, // $100k base
      currentRound,
      state
    );

    const forecastedRates = [];
    const trends: string[] = [];

    // Analyze trends
    let increaseProbability = 0;
    let decreaseProbability = 0;

    for (const tariff of currentTariff.applicableTariffs) {
      if (tariff.volatility > 0.7) {
        increaseProbability += 0.2;
        trends.push(`High volatility on ${tariff.name}`);
      }

      if (tariff.reason === "trade_war" || tariff.reason === "retaliatory") {
        increaseProbability += 0.3;
        trends.push(`Ongoing trade tensions`);
      }
    }

    // Check for potential trade agreements
    const policy = state.policies.get(toRegion);
    if (policy?.stance === "free_trade") {
      decreaseProbability += 0.2;
      trends.push(`${toRegion} favors free trade`);
    } else if (policy?.stance === "protectionist") {
      increaseProbability += 0.2;
      trends.push(`${toRegion} has protectionist policies`);
    }

    // Generate forecast
    let forecastRate = currentTariff.adjustedTariffRate;

    for (let round = currentRound + 1; round <= currentRound + forecastRounds; round++) {
      // Apply probabilistic changes
      const change = Math.random();

      if (change < increaseProbability / 10) {
        forecastRate *= 1.05; // 5% increase
      } else if (change < (increaseProbability + decreaseProbability) / 10) {
        forecastRate *= 0.95; // 5% decrease
      }

      const confidence = 1 - ((round - currentRound) / forecastRounds) * 0.5; // Decreasing confidence

      forecastedRates.push({
        round,
        rate: forecastRate,
        confidence,
        factors: this.getForcastFactors(state, fromRegion, toRegion, round)
      });
    }

    const recommendations = this.generateRecommendations(
      currentTariff,
      forecastedRates,
      trends,
      fromRegion,
      toRegion
    );

    return {
      route: { from: fromRegion, to: toRegion },
      currentRate: currentTariff.adjustedTariffRate,
      forecastedRates,
      trends,
      recommendations
    };
  }

  /**
   * Get forecast factors
   */
  private static getForcastFactors(
    state: TariffState,
    fromRegion: Region,
    toRegion: Region,
    round: number
  ): string[] {
    const factors: string[] = [];

    // Check active events
    for (const event of state.activeEvents) {
      if (event.affectedRoutes.some(r => r.from === fromRegion && r.to === toRegion)) {
        factors.push(event.name);
      }
    }

    // Check geopolitical events
    for (const geoEvent of state.geopoliticalEvents) {
      if (
        geoEvent.affectedRegions.includes(fromRegion) ||
        geoEvent.affectedRegions.includes(toRegion)
      ) {
        factors.push(geoEvent.name);
      }
    }

    return factors;
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    current: TariffCalculation,
    forecast: TariffForecast["forecastedRates"],
    trends: string[],
    fromRegion: Region,
    toRegion: Region
  ): string[] {
    const recommendations: string[] = [];

    // Check if tariffs are increasing
    const avgFutureRate = forecast.reduce((sum, f) => sum + f.rate, 0) / forecast.length;

    if (avgFutureRate > current.adjustedTariffRate * 1.1) {
      recommendations.push("⚠️ Tariffs expected to increase - consider stockpiling materials");
      recommendations.push("Consider alternative sourcing regions");
    } else if (avgFutureRate < current.adjustedTariffRate * 0.9) {
      recommendations.push("✅ Tariffs expected to decrease - delay large orders if possible");
    }

    // Check volatility
    const rateStdDev = Math.sqrt(
      forecast.reduce((sum, f) => sum + Math.pow(f.rate - avgFutureRate, 2), 0) / forecast.length
    );

    if (rateStdDev > avgFutureRate * 0.1) {
      recommendations.push("⚠️ High tariff volatility expected - build inventory buffer");
    }

    // Check trade agreements
    if (current.tradeAgreements.length > 0) {
      recommendations.push(`✅ Benefiting from ${current.tradeAgreements[0].name} - maintain this route`);
    }

    // Check for high current tariffs
    if (current.adjustedTariffRate >= 0.25) {
      recommendations.push("⚠️ High current tariffs - explore alternative suppliers");
    }

    return recommendations;
  }

  /**
   * Helper: Convert event type to tariff reason
   */
  private static getReasonFromEventType(eventType: TariffEvent["type"]): Tariff["reason"] {
    switch (eventType) {
      case "tariff_increase":
        return "trade_war";
      case "new_tariff":
        return "protectionism";
      case "sanctions":
        return "retaliatory";
      case "embargo":
        return "national_security";
      default:
        return "revenue";
    }
  }

  /**
   * Initialize tariff state
   */
  static initializeTariffState(): TariffState {
    return {
      activeTariffs: [...BASELINE_TARIFFS],
      tradeAgreements: [...TRADE_AGREEMENTS],
      activeEvents: [],
      geopoliticalEvents: [],
      policies: new Map(TRADE_POLICIES),
      forecasts: []
    };
  }

  /**
   * Get total tariff burden for a team
   */
  static calculateTotalTariffBurden(
    orders: Array<{ fromRegion: Region; toRegion: Region; materialType: MaterialType; cost: number }>,
    currentRound: number,
    state: TariffState
  ): {
    totalTariffs: number;
    byRoute: Map<string, number>;
    mostExpensiveRoute: { route: string; cost: number };
  } {
    const byRoute = new Map<string, number>();
    let totalTariffs = 0;

    for (const order of orders) {
      const tariffCalc = this.calculateTariff(
        order.fromRegion,
        order.toRegion,
        order.materialType,
        order.cost,
        currentRound,
        state
      );

      totalTariffs += tariffCalc.tariffAmount;

      const routeKey = `${order.fromRegion} → ${order.toRegion}`;
      byRoute.set(routeKey, (byRoute.get(routeKey) ?? 0) + tariffCalc.tariffAmount);
    }

    const mostExpensive = Array.from(byRoute.entries()).reduce(
      (max, [route, cost]) => (cost > max.cost ? { route, cost } : max),
      { route: "", cost: 0 }
    );

    return {
      totalTariffs,
      byRoute,
      mostExpensiveRoute: mostExpensive
    };
  }

  /**
   * Suggest tariff mitigation strategies
   */
  static suggestMitigationStrategies(
    fromRegion: Region,
    toRegion: Region,
    materialType: MaterialType,
    currentRound: number,
    state: TariffState
  ): {
    strategy: string;
    estimatedSavings: number;
    implementationCost: number;
    feasibility: "easy" | "moderate" | "difficult";
    description: string;
  }[] {
    const strategies = [];
    const current = this.calculateTariff(fromRegion, toRegion, materialType, 1000000, currentRound, state);

    // Strategy 1: Alternative sourcing
    strategies.push({
      strategy: "Source from trade-agreement region",
      estimatedSavings: current.tariffAmount * 0.7,
      implementationCost: 50000,
      feasibility: "moderate" as const,
      description: "Switch to supplier in a region with favorable trade agreements"
    });

    // Strategy 2: Stockpiling
    if (current.warnings.some(w => w.includes("increase"))) {
      strategies.push({
        strategy: "Stockpile before tariff increase",
        estimatedSavings: current.tariffAmount * 0.3,
        implementationCost: 100000,
        feasibility: "easy" as const,
        description: "Build inventory before anticipated tariff increases"
      });
    }

    // Strategy 3: Lobbying for trade agreement
    strategies.push({
      strategy: "Lobby for trade agreement",
      estimatedSavings: current.tariffAmount * 0.5,
      implementationCost: 500000,
      feasibility: "difficult" as const,
      description: "Political effort to establish or expand trade agreements"
    });

    return strategies.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }
}
```

---

## FILE: engine/tariffs/types.ts

```typescript
/**
 * Tariff System Type Definitions
 * Defines tariffs, trade policies, and geopolitical events affecting costs
 */

import type { Region } from "../materials/types";
import type { MaterialType } from "../materials/types";

export type TariffReason =
  | "trade_war"
  | "national_security"
  | "anti_dumping"
  | "environmental"
  | "labor_standards"
  | "retaliatory"
  | "protectionism"
  | "revenue";

export type TradeAgreementType =
  | "free_trade"
  | "customs_union"
  | "preferential"
  | "bilateral"
  | "multilateral";

export interface Tariff {
  id: string;
  name: string;
  fromRegion: Region;
  toRegion: Region;
  materialTypes?: MaterialType[]; // If undefined, applies to all materials
  tariffRate: number; // Percentage (0-1)
  effectiveRound: number;
  expiryRound?: number; // If undefined, permanent
  reason: TariffReason;
  volatility: number; // 0-1, how likely it is to change
  description: string;
}

export interface TradeAgreement {
  id: string;
  name: string;
  type: TradeAgreementType;
  regions: Region[];
  tariffReduction: number; // Percentage reduction (0-1)
  effectiveRound: number;
  expiryRound?: number;
  conditions?: string[];
  benefits: string[];
}

export interface TariffEvent {
  id: string;
  name: string;
  type: "tariff_increase" | "tariff_decrease" | "new_tariff" | "trade_agreement" | "sanctions" | "embargo";
  affectedRoutes: TariffRoute[];
  materials?: MaterialType[];
  duration: number; // Rounds
  probability: number; // 0-1, per round
  severity: number; // 0-1
  triggers?: EventTrigger[];
  effects: TariffEffect[];
  description: string;
}

export interface TariffRoute {
  from: Region;
  to: Region;
  increase?: number; // Tariff rate increase
  decrease?: number; // Tariff rate decrease
  multiplier?: number; // Multiplier on existing tariff
}

export interface TariffEffect {
  type: "cost_increase" | "cost_decrease" | "delay" | "restriction" | "ban";
  value: number;
  duration: number; // Rounds
  description: string;
}

export interface EventTrigger {
  type: "market_share" | "revenue" | "production_volume" | "region_dominance" | "political";
  threshold: number;
  region?: Region;
}

export interface TariffCalculation {
  materialCost: number;
  applicableTariffs: Tariff[];
  tradeAgreements: TradeAgreement[];
  baseTariffRate: number;
  adjustedTariffRate: number;
  tariffAmount: number;
  exemptions: string[];
  warnings: string[];
}

export interface GeopoliticalEvent {
  id: string;
  name: string;
  type: "conflict" | "alliance" | "embargo" | "sanctions" | "treaty" | "dispute";
  affectedRegions: Region[];
  round: number;
  duration: number; // Rounds
  severity: "low" | "medium" | "high" | "critical";
  effects: GeopoliticalEffect[];
  description: string;
}

export interface GeopoliticalEffect {
  type: "tariff_change" | "route_closure" | "cost_increase" | "delay_increase" | "quality_impact";
  regions: Region[];
  magnitude: number;
  description: string;
}

export interface TariffMitigation {
  type: "alternative_source" | "stockpile" | "local_production" | "trade_agreement" | "lobbying";
  cost: number;
  effectiveness: number; // 0-1, how much it reduces tariff impact
  implementationTime: number; // Rounds
  description: string;
}

export interface CustomsClassification {
  materialType: MaterialType;
  hsCode: string; // Harmonized System code
  description: string;
  standardTariffRate: number; // Default rate
  sensitivityLevel: "low" | "medium" | "high"; // How likely to face additional scrutiny
}

export interface TariffForecast {
  route: TariffRoute;
  currentRate: number;
  forecastedRates: {
    round: number;
    rate: number;
    confidence: number; // 0-1
    factors: string[];
  }[];
  trends: string[];
  recommendations: string[];
}

export interface TradePolicy {
  region: Region;
  stance: "protectionist" | "free_trade" | "mixed" | "isolationist";
  priorityIndustries: string[];
  restrictedMaterials: MaterialType[];
  incentivizedMaterials: MaterialType[];
  localContentRequirement?: number; // Percentage
}

export interface TariffScenario {
  id: string;
  name: string;
  description: string;
  probability: number; // Per round
  events: TariffEvent[];
  geopoliticalEvents: GeopoliticalEvent[];
  duration: number;
  playerImpact: {
    affectedRoutes: number;
    estimatedCostIncrease: number;
    estimatedDelay: number;
  };
}

export interface TariffState {
  activeTariffs: Tariff[];
  tradeAgreements: TradeAgreement[];
  activeEvents: TariffEvent[];
  geopoliticalEvents: GeopoliticalEvent[];
  policies: Map<Region, TradePolicy>;
  forecasts: TariffForecast[];
}
```

---

## FILE: engine/tariffs/scenarios.ts

```typescript
/**
 * Tariff Scenarios and Events
 * Defines all possible tariff events and geopolitical scenarios
 */

import type { Region } from "../materials/types";
import type {
  TariffEvent,
  GeopoliticalEvent,
  TariffScenario,
  TradeAgreement,
  Tariff,
  TradePolicy
} from "./types";

export const BASELINE_TARIFFS: Tariff[] = [
  // US-China tariffs (ongoing tension)
  {
    id: "us_china_electronics",
    name: "US-China Electronics Tariff",
    fromRegion: "Asia",
    toRegion: "North America",
    materialTypes: ["processor", "display", "memory"],
    tariffRate: 0.18,
    effectiveRound: 1,
    reason: "trade_war",
    volatility: 0.8,
    description: "Trade war tariffs on Chinese electronics"
  },
  {
    id: "china_us_retaliatory",
    name: "China-US Retaliatory Tariff",
    fromRegion: "North America",
    toRegion: "Asia",
    materialTypes: ["processor"],
    tariffRate: 0.15,
    effectiveRound: 1,
    reason: "retaliatory",
    volatility: 0.8,
    description: "Retaliatory tariffs on US semiconductors"
  },

  // Standard tariffs
  {
    id: "standard_electronics",
    name: "Standard Electronics Import Duty",
    fromRegion: "Asia",
    toRegion: "Europe",
    tariffRate: 0.12,
    effectiveRound: 1,
    reason: "revenue",
    volatility: 0.2,
    description: "Standard import duty on electronics"
  },
  {
    id: "africa_development",
    name: "African Development Protection",
    fromRegion: "Asia",
    toRegion: "Africa",
    tariffRate: 0.15,
    effectiveRound: 1,
    reason: "protectionism",
    volatility: 0.4,
    description: "Protective tariffs to support local industry"
  }
];

export const TRADE_AGREEMENTS: TradeAgreement[] = [
  {
    id: "usmca",
    name: "USMCA (North American Trade Agreement)",
    type: "free_trade",
    regions: ["North America"],
    tariffReduction: 0.95, // 95% reduction
    effectiveRound: 1,
    conditions: ["Minimum 75% North American content"],
    benefits: ["Duty-free electronics trade within North America"]
  },
  {
    id: "eu_single_market",
    name: "EU Single Market",
    type: "customs_union",
    regions: ["Europe"],
    tariffReduction: 1.0, // 100% reduction
    effectiveRound: 1,
    conditions: ["EU standards compliance"],
    benefits: ["Free movement of goods within EU"]
  },
  {
    id: "asean",
    name: "ASEAN Free Trade Area",
    type: "free_trade",
    regions: ["Asia"],
    tariffReduction: 0.85,
    effectiveRound: 1,
    conditions: ["Regional origin requirement"],
    benefits: ["Reduced tariffs on intra-Asian trade"]
  },
  {
    id: "gcc",
    name: "Gulf Cooperation Council",
    type: "customs_union",
    regions: ["Middle East"],
    tariffReduction: 1.0,
    effectiveRound: 1,
    conditions: ["GCC member states only"],
    benefits: ["Tariff-free trade among GCC countries"]
  }
];

export const TARIFF_EVENTS: TariffEvent[] = [
  {
    id: "trade_war_escalation",
    name: "US-China Trade War Escalation",
    type: "tariff_increase",
    affectedRoutes: [
      { from: "North America", to: "Asia", increase: 0.25 },
      { from: "Asia", to: "North America", increase: 0.25 }
    ],
    materials: ["processor", "display", "memory", "storage"],
    duration: 8,
    probability: 0.05,
    severity: 0.8,
    effects: [
      {
        type: "cost_increase",
        value: 0.25,
        duration: 8,
        description: "25% tariff increase on electronics"
      },
      {
        type: "delay",
        value: 3,
        duration: 8,
        description: "Additional customs scrutiny causing delays"
      }
    ],
    description: "Escalating trade tensions result in additional tariffs on technology products"
  },

  {
    id: "eu_digital_tax",
    name: "EU Digital Services Tax",
    type: "new_tariff",
    affectedRoutes: [
      { from: "North America", to: "Europe", increase: 0.15 },
      { from: "Asia", to: "Europe", increase: 0.15 }
    ],
    materials: ["processor", "display"],
    duration: 12,
    probability: 0.03,
    severity: 0.5,
    effects: [
      {
        type: "cost_increase",
        value: 0.15,
        duration: 12,
        description: "Digital services tax on tech imports"
      }
    ],
    description: "EU implements digital services tax affecting tech imports"
  },

  {
    id: "usmca_expansion",
    name: "USMCA Benefits Expansion",
    type: "trade_agreement",
    affectedRoutes: [
      { from: "North America", to: "South America", decrease: 0.20 },
      { from: "South America", to: "North America", decrease: 0.20 }
    ],
    duration: 20,
    probability: 0.04,
    severity: 0.3,
    effects: [
      {
        type: "cost_decrease",
        value: 0.20,
        duration: 20,
        description: "Expanded trade benefits with South America"
      }
    ],
    description: "USMCA expands to include South American partners"
  },

  {
    id: "rare_earth_export_restriction",
    name: "Rare Earth Export Restrictions",
    type: "sanctions",
    affectedRoutes: [
      { from: "Africa", to: "Asia", increase: 0.30 },
      { from: "Africa", to: "North America", increase: 0.30 }
    ],
    materials: ["battery"],
    duration: 6,
    probability: 0.06,
    severity: 0.7,
    effects: [
      {
        type: "cost_increase",
        value: 0.30,
        duration: 6,
        description: "Export restrictions on rare earth materials"
      },
      {
        type: "restriction",
        value: 0.5,
        duration: 6,
        description: "Volume restrictions on exports"
      }
    ],
    description: "African nations restrict rare earth mineral exports"
  },

  {
    id: "green_technology_incentive",
    name: "Green Technology Trade Incentive",
    type: "tariff_decrease",
    affectedRoutes: [
      { from: "Europe", to: "Asia", decrease: 0.10 },
      { from: "Europe", to: "North America", decrease: 0.10 }
    ],
    materials: ["battery"],
    duration: 15,
    probability: 0.04,
    severity: 0.2,
    effects: [
      {
        type: "cost_decrease",
        value: 0.10,
        duration: 15,
        description: "Reduced tariffs on eco-friendly battery tech"
      }
    ],
    description: "Incentives for green battery technology imports"
  },

  {
    id: "regional_conflict_sanctions",
    name: "Regional Conflict Sanctions",
    type: "sanctions",
    affectedRoutes: [
      { from: "Middle East", to: "North America", increase: 0.35 },
      { from: "Middle East", to: "Europe", increase: 0.35 },
      { from: "North America", to: "Middle East", increase: 0.25 },
      { from: "Europe", to: "Middle East", increase: 0.25 }
    ],
    duration: 10,
    probability: 0.03,
    severity: 0.9,
    effects: [
      {
        type: "cost_increase",
        value: 0.35,
        duration: 10,
        description: "Sanctions-related tariffs"
      },
      {
        type: "delay",
        value: 5,
        duration: 10,
        description: "Enhanced security screening"
      },
      {
        type: "restriction",
        value: 0.3,
        duration: 10,
        description: "Volume restrictions due to sanctions"
      }
    ],
    description: "Regional conflict triggers international sanctions"
  },

  {
    id: "anti_dumping_investigation",
    name: "Anti-Dumping Investigation",
    type: "new_tariff",
    affectedRoutes: [
      { from: "Asia", to: "North America", increase: 0.40 },
      { from: "Asia", to: "Europe", increase: 0.35 }
    ],
    materials: ["display", "memory"],
    duration: 12,
    probability: 0.04,
    severity: 0.6,
    triggers: [
      { type: "market_share", threshold: 0.4, region: "North America" }
    ],
    effects: [
      {
        type: "cost_increase",
        value: 0.40,
        duration: 12,
        description: "Anti-dumping duties on displays and memory"
      }
    ],
    description: "Anti-dumping investigation results in punitive tariffs"
  },

  {
    id: "free_trade_breakthrough",
    name: "Global Free Trade Breakthrough",
    type: "trade_agreement",
    affectedRoutes: [
      { from: "Asia", to: "Europe", decrease: 0.15 },
      { from: "Asia", to: "Oceania", decrease: 0.20 },
      { from: "Europe", to: "Oceania", decrease: 0.18 }
    ],
    duration: 25,
    probability: 0.02,
    severity: 0.3,
    effects: [
      {
        type: "cost_decrease",
        value: 0.15,
        duration: 25,
        description: "Comprehensive trade agreement reduces tariffs"
      }
    ],
    description: "Major breakthrough in global trade negotiations"
  },

  {
    id: "supply_chain_security_act",
    name: "Supply Chain Security Act",
    type: "new_tariff",
    affectedRoutes: [
      { from: "Asia", to: "North America", increase: 0.20 }
    ],
    materials: ["processor", "memory"],
    duration: 16,
    probability: 0.05,
    severity: 0.7,
    effects: [
      {
        type: "cost_increase",
        value: 0.20,
        duration: 16,
        description: "Security-related tariffs on semiconductors"
      },
      {
        type: "delay",
        value: 4,
        duration: 16,
        description: "Enhanced security verification"
      }
    ],
    description: "National security concerns trigger semiconductor tariffs"
  },

  {
    id: "climate_carbon_border_tax",
    name: "Carbon Border Adjustment",
    type: "new_tariff",
    affectedRoutes: [
      { from: "Asia", to: "Europe", increase: 0.12 },
      { from: "Africa", to: "Europe", increase: 0.10 }
    ],
    duration: 18,
    probability: 0.06,
    severity: 0.4,
    effects: [
      {
        type: "cost_increase",
        value: 0.12,
        duration: 18,
        description: "Carbon border tax on imports"
      }
    ],
    description: "EU implements carbon border adjustment mechanism"
  }
];

export const GEOPOLITICAL_EVENTS: GeopoliticalEvent[] = [
  {
    id: "pandemic_disruption",
    name: "Global Pandemic",
    type: "conflict",
    affectedRegions: ["Asia", "Europe", "North America", "South America", "Africa", "Middle East", "Oceania"],
    round: 0, // Can trigger any round
    duration: 12,
    severity: "critical",
    effects: [
      {
        type: "delay_increase",
        regions: ["Asia", "Europe", "North America", "South America", "Africa", "Middle East", "Oceania"],
        magnitude: 2.0,
        description: "Massive supply chain disruptions"
      },
      {
        type: "cost_increase",
        regions: ["Asia", "Europe", "North America", "South America", "Africa", "Middle East", "Oceania"],
        magnitude: 0.15,
        description: "Increased logistics costs"
      }
    ],
    description: "Global pandemic causes widespread supply chain disruptions"
  },

  {
    id: "strait_closure",
    name: "Strategic Strait Closure",
    type: "conflict",
    affectedRegions: ["Asia", "Europe", "Middle East"],
    round: 0,
    duration: 6,
    severity: "high",
    effects: [
      {
        type: "route_closure",
        regions: ["Asia", "Europe", "Middle East"],
        magnitude: 0.5,
        description: "Major shipping route disrupted"
      },
      {
        type: "cost_increase",
        regions: ["Asia", "Europe"],
        magnitude: 0.40,
        description: "Rerouting costs"
      },
      {
        type: "delay_increase",
        regions: ["Asia", "Europe"],
        magnitude: 1.5,
        description: "Extended shipping routes"
      }
    ],
    description: "Conflict closes strategic shipping strait"
  },

  {
    id: "regional_alliance",
    name: "New Regional Alliance Formation",
    type: "alliance",
    affectedRegions: ["Asia", "Oceania"],
    round: 0,
    duration: 20,
    severity: "low",
    effects: [
      {
        type: "tariff_change",
        regions: ["Asia", "Oceania"],
        magnitude: -0.15,
        description: "Reduced tariffs between allied regions"
      },
      {
        type: "cost_increase",
        regions: ["North America", "Europe"],
        magnitude: 0.08,
        description: "Preferential treatment creates cost disadvantage for others"
      }
    ],
    description: "New trade alliance forms in Asia-Pacific region"
  },

  {
    id: "commodity_crisis",
    name: "Rare Materials Crisis",
    type: "dispute",
    affectedRegions: ["Africa", "Asia"],
    round: 0,
    duration: 8,
    severity: "high",
    effects: [
      {
        type: "cost_increase",
        regions: ["Africa", "Asia"],
        magnitude: 0.50,
        description: "Rare material prices spike"
      },
      {
        type: "quality_impact",
        regions: ["Africa"],
        magnitude: -0.10,
        description: "Rush orders compromise quality"
      }
    ],
    description: "Dispute over rare earth materials causes price surge"
  }
];

export const TARIFF_SCENARIOS: TariffScenario[] = [
  {
    id: "protectionist_wave",
    name: "Global Protectionist Wave",
    description: "Multiple countries adopt protectionist policies simultaneously",
    probability: 0.02,
    events: [
      TARIFF_EVENTS.find(e => e.id === "trade_war_escalation")!,
      TARIFF_EVENTS.find(e => e.id === "anti_dumping_investigation")!,
      TARIFF_EVENTS.find(e => e.id === "supply_chain_security_act")!
    ],
    geopoliticalEvents: [],
    duration: 12,
    playerImpact: {
      affectedRoutes: 8,
      estimatedCostIncrease: 0.35,
      estimatedDelay: 5
    }
  },

  {
    id: "trade_liberalization",
    name: "Trade Liberalization Period",
    description: "Multiple trade agreements reduce global tariffs",
    probability: 0.03,
    events: [
      TARIFF_EVENTS.find(e => e.id === "usmca_expansion")!,
      TARIFF_EVENTS.find(e => e.id === "free_trade_breakthrough")!,
      TARIFF_EVENTS.find(e => e.id === "green_technology_incentive")!
    ],
    geopoliticalEvents: [
      GEOPOLITICAL_EVENTS.find(e => e.id === "regional_alliance")!
    ],
    duration: 20,
    playerImpact: {
      affectedRoutes: 12,
      estimatedCostIncrease: -0.15,
      estimatedDelay: -2
    }
  },

  {
    id: "supply_chain_crisis",
    name: "Global Supply Chain Crisis",
    description: "Multiple disruptions cause widespread supply chain chaos",
    probability: 0.015,
    events: [
      TARIFF_EVENTS.find(e => e.id === "rare_earth_export_restriction")!,
      TARIFF_EVENTS.find(e => e.id === "regional_conflict_sanctions")!
    ],
    geopoliticalEvents: [
      GEOPOLITICAL_EVENTS.find(e => e.id === "pandemic_disruption")!,
      GEOPOLITICAL_EVENTS.find(e => e.id === "commodity_crisis")!
    ],
    duration: 10,
    playerImpact: {
      affectedRoutes: 15,
      estimatedCostIncrease: 0.55,
      estimatedDelay: 12
    }
  }
];

export const TRADE_POLICIES: Map<Region, TradePolicy> = new Map([
  ["North America", {
    region: "North America",
    stance: "mixed",
    priorityIndustries: ["Semiconductors", "Advanced Manufacturing", "AI"],
    restrictedMaterials: ["processor"],
    incentivizedMaterials: ["battery"],
    localContentRequirement: 0.50
  }],
  ["Europe", {
    region: "Europe",
    stance: "free_trade",
    priorityIndustries: ["Green Technology", "Precision Engineering"],
    restrictedMaterials: [],
    incentivizedMaterials: ["battery", "display"],
    localContentRequirement: 0.45
  }],
  ["Asia", {
    region: "Asia",
    stance: "mixed",
    priorityIndustries: ["Electronics", "Manufacturing", "Assembly"],
    restrictedMaterials: [],
    incentivizedMaterials: ["display", "memory", "processor"],
    localContentRequirement: 0.30
  }],
  ["Africa", {
    region: "Africa",
    stance: "protectionist",
    priorityIndustries: ["Mining", "Raw Materials"],
    restrictedMaterials: ["battery", "other"],
    incentivizedMaterials: [],
    localContentRequirement: 0.20
  }],
  ["South America", {
    region: "South America",
    stance: "protectionist",
    priorityIndustries: ["Mining", "Agriculture", "Basic Manufacturing"],
    restrictedMaterials: ["battery"],
    incentivizedMaterials: [],
    localContentRequirement: 0.25
  }],
  ["Middle East", {
    region: "Middle East",
    stance: "free_trade",
    priorityIndustries: ["Logistics", "Trade Hub", "Assembly"],
    restrictedMaterials: [],
    incentivizedMaterials: ["chassis", "battery"],
    localContentRequirement: 0.15
  }],
  ["Oceania", {
    region: "Oceania",
    stance: "free_trade",
    priorityIndustries: ["Quality Assurance", "R&D", "Tech Services"],
    restrictedMaterials: [],
    incentivizedMaterials: ["processor", "camera"],
    localContentRequirement: 0.35
  }]
]);

/**
 * Check if a tariff event should trigger this round
 */
export function shouldTriggerEvent(event: TariffEvent, round: number, playerState?: any): boolean {
  // Base probability check
  if (Math.random() > event.probability) return false;

  // Check triggers if any
  if (event.triggers && event.triggers.length > 0) {
    return event.triggers.some(trigger => {
      if (!playerState) return false;

      switch (trigger.type) {
        case "market_share":
          return playerState.marketShare >= trigger.threshold;
        case "revenue":
          return playerState.revenue >= trigger.threshold;
        case "production_volume":
          return playerState.productionVolume >= trigger.threshold;
        default:
          return false;
      }
    });
  }

  return true;
}
```

---

## FILE: engine/tariffs/index.ts

```typescript
/**
 * Tariffs System Module
 * Exports all tariff-related types, scenarios, and utilities
 */

export * from "./types";
export * from "./scenarios";
export { TariffEngine } from "./TariffEngine";
```

---

## FILE: engine/fx/FXEngine.ts

```typescript
/**
 * FX Engine — Applies exchange rate effects to material costs, shipping,
 * and factory operations based on actual source/destination regions.
 *
 * All costs in the engine are denominated in USD (home currency).
 * When sourcing materials or operating factories in foreign regions,
 * the local currency cost is converted to USD via the FX rate.
 *
 * FX rate convention (from MarketState.fxRates):
 *   EUR/USD = 1.10 means €1 = $1.10
 *   CNY/USD = 0.14 means ¥1 = $0.14
 *
 * A rising foreign currency (rate goes up) makes imports MORE expensive.
 * A falling foreign currency (rate goes down) makes imports CHEAPER.
 *
 * The FX multiplier is: currentRate / baselineRate
 *   > 1.0 → foreign currency strengthened → costs up
 *   < 1.0 → foreign currency weakened → costs down
 */

import type { MarketState } from "../types/market";
import { CONSTANTS } from "../types";

// Baseline FX rates — sourced from CONSTANTS for single-source-of-truth
const BASELINE_RATES: Record<string, number> = CONSTANTS.FX_BASELINE_RATES;

// Map supplier/factory regions to their primary currency pair
const REGION_CURRENCY_MAP: Record<string, keyof typeof BASELINE_RATES> = {
  "Europe":        "EUR/USD",
  "Asia":          "CNY/USD",   // Proxy: most Asian manufacturing is CNY-denominated
  "North America": "EUR/USD",   // Home region — no FX effect (handled separately)
  "MENA":          "EUR/USD",   // MENA often transacts in EUR or USD-pegged
  "Middle East":   "EUR/USD",
  "South America": "CNY/USD",   // Proxy: commodity-linked, use CNY as approximation
  "Africa":        "EUR/USD",   // Proxy: many African nations peg to EUR or USD
  "Oceania":       "GBP/USD",   // Proxy: AUD correlates with GBP
};

// Home region where the company is headquartered — no FX effect on domestic costs
const HOME_REGION = "North America";

export class FXEngine {
  /**
   * Get the FX cost multiplier for a source region relative to baseline.
   * Returns 1.0 for home region (no FX effect).
   *
   * Example: If EUR/USD was 1.10 at start and is now 1.21,
   *   multiplier = 1.21 / 1.10 = 1.10 → costs from Europe are 10% higher.
   */
  static getCostMultiplier(sourceRegion: string, marketState: MarketState): number {
    if (sourceRegion === HOME_REGION) return 1.0;

    const pair = REGION_CURRENCY_MAP[sourceRegion];
    if (!pair) return 1.0;

    const currentRate = this.getRate(pair, marketState);
    const baselineRate = BASELINE_RATES[pair];
    if (!baselineRate || baselineRate === 0) return 1.0;

    // Ratio of current to baseline: >1 means foreign currency strengthened (more expensive)
    return currentRate / baselineRate;
  }

  /**
   * Apply FX adjustment to a USD cost based on the source region.
   * Costs originally priced in USD at baseline FX rates get scaled.
   */
  static adjustCost(baseCostUSD: number, sourceRegion: string, marketState: MarketState): number {
    return baseCostUSD * this.getCostMultiplier(sourceRegion, marketState);
  }

  /**
   * Calculate total FX impact on material costs for a segment's bill of materials.
   * Each material has a source region — FX is applied per-material, not averaged.
   *
   * @param materialSources Array of { costUSD, sourceRegion } per material line
   * @param marketState Current market conditions
   * @returns { adjustedTotal, fxImpact, breakdown }
   */
  static calculateMaterialFXImpact(
    materialSources: Array<{ costUSD: number; sourceRegion: string }>,
    marketState: MarketState
  ): { adjustedTotal: number; fxImpact: number; breakdown: string[] } {
    let adjustedTotal = 0;
    let baseTotal = 0;
    const breakdown: string[] = [];

    for (const mat of materialSources) {
      const multiplier = this.getCostMultiplier(mat.sourceRegion, marketState);
      const adjusted = mat.costUSD * multiplier;
      adjustedTotal += adjusted;
      baseTotal += mat.costUSD;

      if (Math.abs(multiplier - 1.0) > 0.02) {
        const pct = ((multiplier - 1) * 100).toFixed(1);
        breakdown.push(
          `${mat.sourceRegion}: ${multiplier > 1 ? '+' : ''}${pct}% FX on $${(mat.costUSD / 1_000_000).toFixed(2)}M`
        );
      }
    }

    return {
      adjustedTotal,
      fxImpact: adjustedTotal - baseTotal,
      breakdown,
    };
  }

  /**
   * Calculate FX impact on factory operating costs (labor, overhead).
   * Factories in foreign regions pay workers in local currency.
   */
  static calculateFactoryFXImpact(
    factoryRegion: string,
    laborCostUSD: number,
    marketState: MarketState
  ): { adjustedLaborCost: number; fxImpact: number; message: string } {
    const multiplier = this.getCostMultiplier(factoryRegion, marketState);
    const adjustedLaborCost = laborCostUSD * multiplier;
    const impact = adjustedLaborCost - laborCostUSD;

    let message = "";
    if (Math.abs(multiplier - 1.0) > 0.01) {
      const direction = multiplier > 1 ? "increased" : "decreased";
      const pct = Math.abs((multiplier - 1) * 100).toFixed(1);
      message = `FX ${direction} ${factoryRegion} labor costs by ${pct}%: $${(Math.abs(impact) / 1_000).toFixed(0)}K`;
    }

    return { adjustedLaborCost, fxImpact: impact, message };
  }

  /**
   * Calculate FX impact on revenue earned in foreign markets.
   * Revenue earned abroad is converted back to USD at current rates.
   * A weakening foreign currency means less USD revenue.
   */
  static calculateRevenueFXImpact(
    revenueByRegion: Record<string, number>,
    marketState: MarketState
  ): { totalFXImpact: number; messages: string[] } {
    const messages: string[] = [];
    let totalFXImpact = 0;

    for (const [region, revenue] of Object.entries(revenueByRegion)) {
      if (region === HOME_REGION || revenue === 0) continue;

      const multiplier = this.getCostMultiplier(region, marketState);
      // FX impact on foreign revenue: when foreign currency strengthens (multiplier > 1),
      // converting foreign revenue to USD yields more. When it weakens, yields less.
      const impact = revenue * (multiplier - 1.0);
      totalFXImpact += impact;

      if (Math.abs(impact) > 10_000) {
        const direction = impact > 0 ? "gain" : "loss";
        messages.push(
          `FX ${direction} from ${region}: $${(Math.abs(impact) / 1_000_000).toFixed(2)}M ` +
          `(${((impact / revenue) * 100).toFixed(1)}% of ${region} revenue)`
        );
      }
    }

    return { totalFXImpact, messages };
  }

  /**
   * Get current FX rate for a pair from market state.
   * Handles the key name format differences (e.g. EUR/USD vs EUR_USD).
   */
  private static getRate(pair: string, marketState: MarketState): number {
    // MarketState uses both formats in different places
    const fxRates = marketState.fxRates as unknown as Record<string, number>;
    // Try both "EUR/USD" and "EUR_USD" formats
    const rate = fxRates[pair] ?? fxRates[pair.replace("/", "_")];
    if (rate !== undefined) return rate;

    // Fallback: try mapping common pair names
    const pairMap: Record<string, string> = {
      "EUR/USD": "EUR_USD",
      "GBP/USD": "GBP_USD",
      "JPY/USD": "JPY_USD",
      "CNY/USD": "CNY_USD",
    };
    const altKey = pairMap[pair];
    if (altKey && fxRates[altKey] !== undefined) return fxRates[altKey];

    // Return baseline if not found
    return BASELINE_RATES[pair] ?? 1.0;
  }
}
```

## FILE: engine/fx/index.ts — NOT FOUND

---

## FILE: engine/modules/SupplyChainManager.ts

```typescript
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

    const materials = MATERIAL_TYPES.map(type => ({
      type,
      qtyNeeded: line.targetOutput,
      estimatedCost: line.targetOutput * perMaterialCost,
    }));

    requirements.push({
      lineId: line.id,
      productId: line.productId,
      segment,
      targetOutput: line.targetOutput,
      materials,
      totalMaterialCost: line.targetOutput * costPerUnit,
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
```

---

## FILE: engine/modules/WarehouseManager.ts

```typescript
/**
 * Warehouse Manager
 *
 * Manages warehouse tiers (0-3), build vs rent, raw material and finished goods
 * storage, capacity tracking, and warehouse-related costs.
 *
 * Every factory auto-gets Tier 0 (5,000 units free on factory floor).
 */

import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";

// ============================================
// TYPES
// ============================================

export type WarehouseTier = 0 | 1 | 2 | 3;
export type WarehouseOwnership = "built" | "rented";

export interface WarehouseTierConfig {
  name: string;
  capacity: number;
  buildCost: number;
  rentCostPerRound: number;
}

export const WAREHOUSE_TIERS: Record<WarehouseTier, WarehouseTierConfig> = {
  0: { name: "Factory Floor",                capacity: 5_000,   buildCost: 0,          rentCostPerRound: 0 },
  1: { name: "Basic Warehouse",              capacity: 20_000,  buildCost: 5_000_000,  rentCostPerRound: 500_000 },
  2: { name: "Regional Distribution Center", capacity: 50_000,  buildCost: 15_000_000, rentCostPerRound: 1_500_000 },
  3: { name: "Automated Warehouse",          capacity: 100_000, buildCost: 35_000_000, rentCostPerRound: 3_000_000 },
};

export interface RawMaterialStock {
  materialType: string;
  qty: number;
  unitCost: number;
  roundReceived: number;
}

export interface FinishedGoodsStock {
  productId: string;
  qty: number;
  unitCost: number;
  sellingPrice: number;
  roundProduced: number;
  bookValue: number;  // Decays with obsolescence
}

export interface Warehouse {
  id: string;
  factoryId: string;
  tier: WarehouseTier;
  ownership: WarehouseOwnership;
  capacity: number;
  rawMaterials: RawMaterialStock[];
  finishedGoods: FinishedGoodsStock[];
}

export interface WarehouseState {
  warehouses: Warehouse[];
}

// ============================================
// QUERIES
// ============================================

/** Get all warehouses for a factory */
export function getFactoryWarehouses(state: TeamState, factoryId: string): Warehouse[] {
  return (state.warehouseState?.warehouses ?? []).filter(w => w.factoryId === factoryId);
}

/** Get total warehouse capacity for a factory */
export function getWarehouseCapacity(state: TeamState, factoryId: string): number {
  return getFactoryWarehouses(state, factoryId)
    .reduce((sum, w) => sum + w.capacity, 0);
}

/** Get current utilization (raw + finished goods units) */
export function getWarehouseUtilization(state: TeamState, factoryId: string): number {
  const warehouses = getFactoryWarehouses(state, factoryId);
  let total = 0;
  for (const w of warehouses) {
    total += w.rawMaterials.reduce((sum, rm) => sum + rm.qty, 0);
    total += w.finishedGoods.reduce((sum, fg) => sum + fg.qty, 0);
  }
  return total;
}

/** Check if adding units would overflow warehouse capacity */
export function wouldOverflow(state: TeamState, factoryId: string, additionalUnits: number): boolean {
  const capacity = getWarehouseCapacity(state, factoryId);
  const utilization = getWarehouseUtilization(state, factoryId);
  return (utilization + additionalUnits) > capacity;
}

// ============================================
// MUTATIONS
// ============================================

export interface WarehouseOperationResult {
  success: boolean;
  message: string;
  cost?: number;
}

/** Initialize warehouse state if missing, and ensure every factory has Tier 0 */
export function ensureWarehouseState(state: TeamState): void {
  if (!state.warehouseState) {
    state.warehouseState = { warehouses: [] };
  }

  // Auto-create Tier 0 for any factory that doesn't have one
  for (const factory of state.factories) {
    const existing = state.warehouseState.warehouses.filter(w => w.factoryId === factory.id);
    if (existing.length === 0) {
      state.warehouseState.warehouses.push({
        id: `wh-${factory.id}-t0`,
        factoryId: factory.id,
        tier: 0,
        ownership: "built",
        capacity: WAREHOUSE_TIERS[0].capacity,
        rawMaterials: [],
        finishedGoods: [],
      });
    }
  }
}

/**
 * Build a warehouse (pay upfront, available next round, fixed asset on balance sheet).
 */
export function buildWarehouse(
  state: TeamState,
  factoryId: string,
  tier: WarehouseTier,
  ctx?: EngineContext
): WarehouseOperationResult {
  if (tier === 0) {
    return { success: false, message: "Tier 0 (Factory Floor) is free and auto-created" };
  }

  const config = WAREHOUSE_TIERS[tier];

  if (state.cash < config.buildCost) {
    return { success: false, message: `Insufficient funds to build ${config.name} ($${(config.buildCost / 1_000_000).toFixed(0)}M required)` };
  }

  const factory = state.factories.find(f => f.id === factoryId);
  if (!factory) {
    return { success: false, message: `Factory ${factoryId} not found` };
  }

  ensureWarehouseState(state);

  const id = ctx
    ? ctx.idGenerator.next("warehouse")
    : `wh-${factoryId}-t${tier}-${Date.now().toString(36)}`;

  state.cash -= config.buildCost;
  state.totalAssets += config.buildCost; // Fixed asset on balance sheet

  state.warehouseState!.warehouses.push({
    id,
    factoryId,
    tier,
    ownership: "built",
    capacity: config.capacity,
    rawMaterials: [],
    finishedGoods: [],
  });

  return {
    success: true,
    message: `Built ${config.name} at ${factory.name} (+${config.capacity.toLocaleString()} capacity, $${(config.buildCost / 1_000_000).toFixed(0)}M)`,
    cost: config.buildCost,
  };
}

/**
 * Rent a warehouse (available immediately, recurring cost per round, no asset value).
 */
export function rentWarehouse(
  state: TeamState,
  factoryId: string,
  tier: WarehouseTier,
  ctx?: EngineContext
): WarehouseOperationResult {
  if (tier === 0) {
    return { success: false, message: "Tier 0 (Factory Floor) is free and auto-created" };
  }

  const config = WAREHOUSE_TIERS[tier];
  const factory = state.factories.find(f => f.id === factoryId);
  if (!factory) {
    return { success: false, message: `Factory ${factoryId} not found` };
  }

  ensureWarehouseState(state);

  const id = ctx
    ? ctx.idGenerator.next("warehouse")
    : `wh-${factoryId}-t${tier}-rent-${Date.now().toString(36)}`;

  state.warehouseState!.warehouses.push({
    id,
    factoryId,
    tier,
    ownership: "rented",
    capacity: config.capacity,
    rawMaterials: [],
    finishedGoods: [],
  });

  return {
    success: true,
    message: `Rented ${config.name} at ${factory.name} (+${config.capacity.toLocaleString()} capacity, $${(config.rentCostPerRound / 1_000).toFixed(0)}K/round)`,
  };
}

// ============================================
// STORAGE OPERATIONS
// ============================================

/**
 * Store raw materials in the first available warehouse for a factory.
 */
export function storeRawMaterials(
  state: TeamState,
  factoryId: string,
  materialType: string,
  qty: number,
  unitCost: number,
  currentRound: number
): WarehouseOperationResult {
  ensureWarehouseState(state);

  const warehouses = getFactoryWarehouses(state, factoryId);
  if (warehouses.length === 0) {
    return { success: false, message: "No warehouse available" };
  }

  // Store in first warehouse (they share capacity logically)
  const wh = warehouses[0];
  const existing = wh.rawMaterials.find(rm => rm.materialType === materialType);
  if (existing) {
    // Weighted average cost
    const totalQty = existing.qty + qty;
    existing.unitCost = (existing.unitCost * existing.qty + unitCost * qty) / totalQty;
    existing.qty = totalQty;
    existing.roundReceived = currentRound;
  } else {
    wh.rawMaterials.push({ materialType, qty, unitCost, roundReceived: currentRound });
  }

  return { success: true, message: `Stored ${qty} ${materialType}` };
}

/**
 * Store finished goods in warehouse.
 */
export function storeFinishedGoods(
  state: TeamState,
  factoryId: string,
  productId: string,
  qty: number,
  unitCost: number,
  sellingPrice: number,
  currentRound: number
): WarehouseOperationResult {
  ensureWarehouseState(state);

  const warehouses = getFactoryWarehouses(state, factoryId);
  if (warehouses.length === 0) {
    return { success: false, message: "No warehouse available" };
  }

  const wh = warehouses[0];
  const existing = wh.finishedGoods.find(fg => fg.productId === productId);
  if (existing) {
    const totalQty = existing.qty + qty;
    existing.unitCost = (existing.unitCost * existing.qty + unitCost * qty) / totalQty;
    existing.qty = totalQty;
    existing.bookValue = existing.qty * existing.unitCost;
    existing.roundProduced = currentRound;
  } else {
    wh.finishedGoods.push({
      productId, qty, unitCost, sellingPrice, roundProduced: currentRound,
      bookValue: qty * unitCost,
    });
  }

  return { success: true, message: `Stored ${qty} units of ${productId}` };
}

/**
 * Consume raw materials from warehouse for production.
 * Returns the actual qty consumed (may be less if insufficient).
 */
export function consumeRawMaterials(
  state: TeamState,
  factoryId: string,
  materialType: string,
  qty: number
): { consumed: number; cost: number } {
  ensureWarehouseState(state);

  const warehouses = getFactoryWarehouses(state, factoryId);
  for (const wh of warehouses) {
    const stock = wh.rawMaterials.find(rm => rm.materialType === materialType);
    if (stock && stock.qty > 0) {
      const consumed = Math.min(stock.qty, qty);
      const cost = consumed * stock.unitCost;
      stock.qty -= consumed;
      if (stock.qty === 0) {
        wh.rawMaterials = wh.rawMaterials.filter(rm => rm.materialType !== materialType);
      }
      return { consumed, cost };
    }
  }
  return { consumed: 0, cost: 0 };
}

// ============================================
// ROUND PROCESSING
// ============================================

/**
 * Calculate rent costs for all rented warehouses (called during round processing).
 */
export function calculateWarehouseRentCosts(state: TeamState): number {
  if (!state.warehouseState) return 0;

  return state.warehouseState.warehouses
    .filter(w => w.ownership === "rented")
    .reduce((sum, w) => sum + WAREHOUSE_TIERS[w.tier].rentCostPerRound, 0);
}

/**
 * Process warehouse decisions from player input.
 */
export function processWarehouseDecisions(
  state: TeamState,
  decisions: {
    build?: { factoryId: string; tier: WarehouseTier }[];
    rent?: { factoryId: string; tier: WarehouseTier }[];
  },
  ctx?: EngineContext
): { messages: string[]; totalCost: number } {
  const messages: string[] = [];
  let totalCost = 0;

  if (decisions.build) {
    for (const { factoryId, tier } of decisions.build) {
      const result = buildWarehouse(state, factoryId, tier, ctx);
      messages.push(result.message);
      if (result.cost) totalCost += result.cost;
    }
  }

  if (decisions.rent) {
    for (const { factoryId, tier } of decisions.rent) {
      const result = rentWarehouse(state, factoryId, tier, ctx);
      messages.push(result.message);
    }
  }

  return { messages, totalCost };
}

// ============================================
// STORAGE COSTS & OBSOLESCENCE (Prompt 7)
// ============================================

export interface StorageCostResult {
  rawMaterialStorageCost: number;
  finishedGoodsStorageCost: number;
  overflowSurcharge: number;
  totalStorageCost: number;
  writeOffs: { productId: string; qty: number; bookValue: number }[];
  totalWriteOffValue: number;
}

/**
 * Calculate storage costs for all warehouses in all factories.
 *
 * Raw materials:  $2/unit/round + (material_cost × 0.5%)
 * Finished goods: $3/unit/round + (selling_price × 1%)
 * Overflow: 2× the normal rate for units beyond warehouse capacity
 */
export function calculateStorageCosts(
  state: TeamState,
  currentRound: number
): StorageCostResult {
  ensureWarehouseState(state);

  let rawMaterialStorageCost = 0;
  let finishedGoodsStorageCost = 0;
  let overflowSurcharge = 0;
  const writeOffs: StorageCostResult["writeOffs"] = [];
  let totalWriteOffValue = 0;

  for (const factory of state.factories) {
    const capacity = getWarehouseCapacity(state, factory.id);
    const utilization = getWarehouseUtilization(state, factory.id);
    const isOverflow = utilization > capacity;
    const overflowMultiplier = isOverflow ? 2.0 : 1.0;

    const warehouses = getFactoryWarehouses(state, factory.id);
    for (const wh of warehouses) {
      // Raw material storage costs
      for (const rm of wh.rawMaterials) {
        const perUnitCost = 2 + (rm.unitCost * 0.005);
        const cost = rm.qty * perUnitCost * overflowMultiplier;
        rawMaterialStorageCost += cost;
        if (isOverflow) overflowSurcharge += rm.qty * perUnitCost; // The extra 1x

        // Raw material decay
        const age = currentRound - rm.roundReceived;
        if (age >= 6) {
          rm.unitCost *= 0.85; // -15% per round after round 6
        } else if (age >= 4) {
          rm.unitCost *= 0.95; // -5% per round at rounds 4-5
        }
      }

      // Finished goods storage costs and obsolescence
      const toRemove: string[] = [];
      for (const fg of wh.finishedGoods) {
        const perUnitCost = 3 + (fg.sellingPrice * 0.01);
        const cost = fg.qty * perUnitCost * overflowMultiplier;
        finishedGoodsStorageCost += cost;
        if (isOverflow) overflowSurcharge += fg.qty * perUnitCost;

        // Finished goods obsolescence decay
        const age = currentRound - fg.roundProduced;
        if (age >= 4) {
          // Round 4+: write-off at 50%, removed from inventory
          const writeOffValue = fg.bookValue * 0.5;
          writeOffs.push({ productId: fg.productId, qty: fg.qty, bookValue: writeOffValue });
          totalWriteOffValue += writeOffValue;
          toRemove.push(fg.productId);
        } else if (age >= 3) {
          // Round 3: ×0.75 (-25%)
          fg.bookValue = fg.qty * fg.unitCost * 0.75;
        } else if (age >= 2) {
          // Round 2: ×0.90 (-10%)
          fg.bookValue = fg.qty * fg.unitCost * 0.90;
        }
        // Round 1: full value (no change)
      }

      // Remove written-off finished goods
      if (toRemove.length > 0) {
        wh.finishedGoods = wh.finishedGoods.filter(fg => !toRemove.includes(fg.productId));
      }
    }
  }

  return {
    rawMaterialStorageCost,
    finishedGoodsStorageCost,
    overflowSurcharge,
    totalStorageCost: rawMaterialStorageCost + finishedGoodsStorageCost,
    writeOffs,
    totalWriteOffValue,
  };
}
```

---

## FILE: server/api/routers/material.ts

```typescript
/**
 * Material & Supply Chain tRPC Router
 * Handles material orders, inventory, and supplier interactions
 */

import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { MaterialEngine, DEFAULT_SUPPLIERS, type Region, type MaterialType } from "@/engine/materials";
import { LogisticsEngine } from "@/engine/logistics";
import { TariffEngine } from "@/engine/tariffs";
import type { TeamState } from "@/engine/types/state";

export const materialRouter = createTRPCRouter({
  /**
   * Get current materials state for the team
   */
  getMaterialsState: teamProcedure.query(async ({ ctx }) => {
    const state = JSON.parse(ctx.team.currentState as string) as TeamState;

    // Initialize materials state if it doesn't exist
    if (!state.materials) {
      return {
        inventory: [],
        activeOrders: [],
        totalInventoryValue: 0,
        holdingCosts: 0,
        region: "North America" as Region,
      };
    }

    return state.materials;
  }),

  /**
   * Get all available suppliers
   */
  getSuppliers: teamProcedure.query(() => {
    return DEFAULT_SUPPLIERS;
  }),

  /**
   * Get material requirements for a segment
   */
  getMaterialRequirements: teamProcedure
    .input(
      z.object({
        segment: z.enum(["Budget", "General", "Active Lifestyle", "Enthusiast", "Professional"]),
      })
    )
    .query(({ input }) => {
      return MaterialEngine.getMaterialRequirements(input.segment);
    }),

  /**
   * Get recommended orders based on forecast
   */
  getRecommendedOrders: teamProcedure
    .input(
      z.object({
        segment: z.enum(["Budget", "General", "Active Lifestyle", "Enthusiast", "Professional"]),
        forecastedProduction: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const state = JSON.parse(ctx.team.currentState as string) as TeamState;
      const currentRound = ctx.game.currentRound;
      const inventory = state.materials?.inventory || [];

      return MaterialEngine.getRecommendedOrders(
        input.segment,
        input.forecastedProduction,
        inventory,
        currentRound
      );
    }),

  /**
   * Calculate logistics for a potential order
   */
  calculateLogistics: teamProcedure
    .input(
      z.object({
        fromRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        toRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        shippingMethod: z.enum(["sea", "air", "land", "rail"]),
        weight: z.number(),
        volume: z.number(),
        productionTime: z.number(),
      })
    )
    .query(({ input }) => {
      return LogisticsEngine.calculateLogistics(
        input.fromRegion,
        input.toRegion,
        input.shippingMethod,
        input.weight,
        input.volume,
        input.productionTime
      );
    }),

  /**
   * Calculate tariff for a shipment
   */
  calculateTariff: teamProcedure
    .input(
      z.object({
        fromRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        toRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        materialType: z.enum(["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"]),
        materialCost: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const state = JSON.parse(ctx.team.currentState as string) as TeamState;
      const currentRound = ctx.game.currentRound;
      const tariffState = state.tariffs || TariffEngine.initializeTariffState();

      return TariffEngine.calculateTariff(
        input.fromRegion,
        input.toRegion,
        input.materialType,
        input.materialCost,
        currentRound,
        tariffState
      );
    }),

  /**
   * Place a material order
   */
  placeOrder: teamProcedure
    .input(
      z.object({
        materialType: z.enum(["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"]),
        spec: z.string(),
        supplierId: z.string(),
        region: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        quantity: z.number().positive(),
        shippingMethod: z.enum(["sea", "air", "land", "rail"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.game.status !== "IN_PROGRESS") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot place orders when game is not in progress",
        });
      }

      const state = JSON.parse(ctx.team.currentState as string) as TeamState;
      const currentRound = ctx.game.currentRound;
      const teamRegion = state.materials?.region || "North America";

      // Create order
      const order = MaterialEngine.createMaterialOrder(
        {
          materialType: input.materialType as MaterialType,
          spec: input.spec,
          supplierId: input.supplierId,
          region: input.region,
          quantity: input.quantity,
          shippingMethod: input.shippingMethod,
          contractLength: 1,
        },
        currentRound,
        teamRegion
      );

      // 1B FIX: Calculate real shipping + tariff costs using LogisticsEngine and TariffEngine
      try {
        const weight = input.quantity * 0.0002; // tons (phone components)
        const volume = input.quantity * 0.001;  // cubic meters
        const logistics = LogisticsEngine.calculateLogistics(
          input.region,
          teamRegion,
          input.shippingMethod,
          Math.max(weight, 0.1),
          Math.max(volume, 0.1),
          0 // production time
        );
        order.shippingCost = logistics.totalLogisticsCost;

        // Calculate tariffs if tariff state exists
        if (state.tariffs) {
          const tariffCalc = TariffEngine.calculateTariff(
            input.region,
            teamRegion,
            input.materialType,
            order.materialCost,
            currentRound,
            state.tariffs
          );
          order.tariffCost = tariffCalc.tariffAmount;
        }

        // Recalculate total with real costs
        order.totalCost = order.materialCost + (order.shippingCost || 0) + (order.tariffCost || 0);

        // Update ETA based on logistics lead time
        const roundsInTransit = Math.ceil(logistics.totalLeadTime / 90); // 90 days per round
        order.estimatedArrivalRound = currentRound + Math.max(1, roundsInTransit);
      } catch {
        // If logistics/tariff calc fails, order still proceeds with material cost only
      }

      // Check if team has enough cash
      const totalCost = order.totalCost;
      if (state.cash < totalCost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient funds. Order costs $${totalCost.toLocaleString()} but you have $${state.cash.toLocaleString()}`,
        });
      }

      // Initialize materials state if needed
      if (!state.materials) {
        state.materials = {
          inventory: [],
          activeOrders: [],
          totalInventoryValue: 0,
          holdingCosts: 0,
          region: teamRegion,
        };
      }

      // Add order to active orders
      state.materials.activeOrders.push(order);

      // Deduct cash
      state.cash -= totalCost;

      // Update accounts payable
      state.accountsPayable += totalCost;

      // Save updated state
      await ctx.prisma.team.update({
        where: { id: ctx.team.id },
        data: { currentState: JSON.stringify(state) },
      });

      return {
        success: true,
        order,
        message: `Order placed successfully! Materials will arrive in round ${order.estimatedArrivalRound}`,
      };
    }),

  /**
   * Get tariff forecast
   */
  getTariffForecast: teamProcedure
    .input(
      z.object({
        fromRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        toRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        materialType: z.enum(["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"]),
        forecastRounds: z.number().default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      const state = JSON.parse(ctx.team.currentState as string) as TeamState;
      const currentRound = ctx.game.currentRound;
      const tariffState = state.tariffs || TariffEngine.initializeTariffState();

      return TariffEngine.forecastTariffs(
        input.fromRegion,
        input.toRegion,
        input.materialType,
        currentRound,
        tariffState,
        input.forecastRounds
      );
    }),
});
```
