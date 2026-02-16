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
