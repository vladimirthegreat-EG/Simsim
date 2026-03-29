/**
 * Material Integration with Factory Module
 * Connects material system to production and quality calculations
 */

import type { TeamState, Segment, Factory } from "../types";
import { MaterialEngine, type MaterialInventory, type MaterialsState } from "./MaterialEngine";
import type { MaterialQuality } from "./types";

export interface ProductionConstraints {
  canProduce: boolean;
  maxProduction: number;
  missingMaterials: Array<{
    materialType: string;
    spec: string;
    needed: number;
    have: number;
    shortage: number;
  }>;
  warnings: string[];
}

export interface MaterialProductionResult {
  producedUnits: number;
  materialCosts: number;
  qualityImpact: {
    baseQuality: number;
    materialQualityBonus: number;
    finalQuality: number;
  };
  defectRateAdjustment: number;
  consumedMaterials: MaterialInventory[];
  messages: string[];
}

/**
 * Material Integration Layer
 * Bridges materials system with factory production
 */
export class MaterialIntegration {
  /**
   * Check if production is possible with current material inventory
   */
  static checkProductionConstraints(
    segment: Segment,
    requestedProduction: number,
    inventory: MaterialInventory[]
  ): ProductionConstraints {
    const availability = MaterialEngine.checkMaterialAvailability(
      segment,
      requestedProduction,
      inventory
    );

    const warnings: string[] = [];
    let maxProduction = requestedProduction;

    if (!availability.available) {
      // Calculate max production based on most constrained material
      const constraintRatios = availability.missing.map(m => {
        const ratio = m.have / m.needed;
        return ratio;
      });

      maxProduction = Math.floor(requestedProduction * Math.min(...constraintRatios));

      warnings.push(
        `Insufficient materials for ${requestedProduction.toLocaleString()} units. Maximum: ${maxProduction.toLocaleString()}`
      );
    }

    return {
      canProduce: maxProduction > 0,
      maxProduction,
      missingMaterials: availability.missing.map(m => ({
        ...m,
        shortage: m.needed - m.have
      })),
      warnings
    };
  }

  /**
   * Process material consumption during production
   * Integrates with factory production calculations
   */
  static processProduction(
    segment: Segment,
    productionUnits: number,
    inventory: MaterialInventory[],
    factory: Factory
  ): MaterialProductionResult {
    const messages: string[] = [];

    // Check constraints
    const constraints = this.checkProductionConstraints(segment, productionUnits, inventory);

    if (!constraints.canProduce) {
      return {
        producedUnits: 0,
        materialCosts: 0,
        qualityImpact: { baseQuality: 0, materialQualityBonus: 0, finalQuality: 0 },
        defectRateAdjustment: 0,
        consumedMaterials: inventory,
        messages: ["⚠️ Production halted: Insufficient materials", ...constraints.warnings]
      };
    }

    // Adjust production to available materials
    const actualProduction = Math.min(productionUnits, constraints.maxProduction);

    if (actualProduction < productionUnits) {
      messages.push(
        `⚠️ Production reduced from ${productionUnits.toLocaleString()} to ${actualProduction.toLocaleString()} due to material constraints`
      );
    }

    // Calculate material quality impact
    const qualityAnalysis = MaterialEngine.calculateMaterialQualityImpact(segment, inventory);

    // Calculate material costs
    const requirements = MaterialEngine.getMaterialRequirements(segment);
    const materialCostPerUnit = requirements.totalCost;
    const totalMaterialCosts = materialCostPerUnit * actualProduction;

    // Consume materials from inventory
    const updatedInventory = MaterialEngine.consumeMaterials(segment, actualProduction, inventory);

    // Calculate quality impact
    // Material quality affects final product quality
    // High-quality materials: +10% to +20% quality boost
    // Low-quality materials: -5% to 0% quality penalty
    const materialQualityScore = qualityAnalysis.overallQuality;
    const qualityMultiplier = 0.9 + (materialQualityScore / 100) * 0.3; // 0.9x to 1.2x

    // Factory base quality (from factory efficiency and workers)
    const baseQuality = factory.efficiency * 100; // 70% efficiency = 70 quality

    // Material quality bonus/penalty
    const materialQualityBonus = (qualityMultiplier - 1) * 100;
    const finalQuality = Math.min(100, Math.max(0, baseQuality * qualityMultiplier));

    // Defect rate adjustment from material quality
    // Poor materials increase defects, premium materials reduce defects
    const defectRateAdjustment = (1 - qualityMultiplier) * 0.03; // -0.3% to +0.3%

    messages.push(
      `✅ Produced ${actualProduction.toLocaleString()} ${segment} units`,
      `📦 Material costs: ${(totalMaterialCosts / 1_000_000).toFixed(2)}M`,
      `⭐ Material quality impact: ${materialQualityBonus > 0 ? '+' : ''}${materialQualityBonus.toFixed(1)}% quality`
    );

    return {
      producedUnits: actualProduction,
      materialCosts: totalMaterialCosts,
      qualityImpact: {
        baseQuality,
        materialQualityBonus,
        finalQuality
      },
      defectRateAdjustment,
      consumedMaterials: updatedInventory,
      messages
    };
  }

  /**
   * Calculate material holding costs per round
   * Integrates with finance module
   */
  static calculateMaterialCosts(inventory: MaterialInventory[]): {
    inventoryValue: number;
    holdingCosts: number;
    breakdown: Array<{
      materialType: string;
      spec: string;
      quantity: number;
      unitCost: number;
      totalValue: number;
    }>;
  } {
    const breakdown = inventory.map(item => ({
      materialType: item.materialType,
      spec: item.spec,
      quantity: item.quantity,
      unitCost: item.averageCost,
      totalValue: item.quantity * item.averageCost
    }));

    const inventoryValue = breakdown.reduce((sum, item) => sum + item.totalValue, 0);
    const holdingCosts = MaterialEngine.calculateHoldingCosts(inventory);

    return {
      inventoryValue,
      holdingCosts,
      breakdown
    };
  }

  /**
   * Get material requirements forecast for production planning
   * Helps teams plan orders ahead of production
   */
  static forecastMaterialNeeds(
    segment: Segment,
    plannedProduction: number[],  // Array of production by round
    currentInventory: MaterialInventory[],
    currentRound: number
  ): Array<{
    round: number;
    plannedProduction: number;
    requiredMaterials: number;
    currentInventory: number;
    shortage: number;
    recommendedOrder: number;
    orderLeadTime: number;
    orderByRound: number;
  }> {
    const forecast = [];
    const requirements = MaterialEngine.getMaterialRequirements(segment);
    let runningInventory = currentInventory.reduce((sum, inv) => {
      const mat = requirements.materials.find(m => m.type === inv.materialType && m.spec === inv.spec);
      return mat ? sum + inv.quantity : sum;
    }, 0);

    for (let i = 0; i < plannedProduction.length; i++) {
      const round = currentRound + i + 1;
      const production = plannedProduction[i];
      const required = production;
      const shortage = Math.max(0, required - runningInventory);

      // Recommend ordering with buffer (150% of shortage)
      const recommendedOrder = Math.ceil(shortage * 1.5);
      const orderLeadTime = requirements.leadTime;
      const orderByRound = Math.max(currentRound, round - Math.ceil(orderLeadTime / 30));

      forecast.push({
        round,
        plannedProduction: production,
        requiredMaterials: required,
        currentInventory: Math.floor(runningInventory),
        shortage: Math.floor(shortage),
        recommendedOrder,
        orderLeadTime,
        orderByRound
      });

      // Update running inventory
      runningInventory = Math.max(0, runningInventory - required + (i === 0 ? recommendedOrder : 0));
    }

    return forecast;
  }

  /**
   * Get quality breakdown showing material contribution to final product
   */
  static getQualityBreakdown(
    segment: Segment,
    inventory: MaterialInventory[],
    factoryEfficiency: number
  ): {
    factoryQuality: number;
    materialQuality: number;
    combinedQuality: number;
    materialBreakdown: MaterialQuality[];
    recommendations: string[];
  } {
    const qualityAnalysis = MaterialEngine.calculateMaterialQualityImpact(segment, inventory);
    const factoryQuality = factoryEfficiency * 100;
    const materialQualityMultiplier = 0.9 + (qualityAnalysis.overallQuality / 100) * 0.3;
    const combinedQuality = Math.min(100, factoryQuality * materialQualityMultiplier);

    const recommendations: string[] = [];

    // Analyze each material for improvement opportunities
    for (const material of qualityAnalysis.breakdown) {
      if (material.qualityScore < 80) {
        recommendations.push(
          `Consider upgrading ${material.materialType} supplier for better quality (current: ${material.qualityScore}/100)`
        );
      }
      if (material.defectRate > 0.02) {
        recommendations.push(
          `High defect rate on ${material.materialType} (${(material.defectRate * 100).toFixed(2)}%) - may impact brand`
        );
      }
    }

    if (qualityAnalysis.overallQuality < 85) {
      recommendations.push(
        "Overall material quality below premium threshold. Consider sourcing from higher-quality regions."
      );
    }

    return {
      factoryQuality,
      materialQuality: qualityAnalysis.overallQuality,
      combinedQuality,
      materialBreakdown: qualityAnalysis.breakdown,
      recommendations
    };
  }

  /**
   * Check if materials system is initialized for a team
   */
  static isInitialized(state: TeamState): boolean {
    return 'materials' in state && state.materials !== undefined;
  }

  /**
   * Initialize materials state for a team
   */
  static initialize(state: TeamState): TeamState {
    if (!this.isInitialized(state)) {
      return {
        ...state,
        materials: {
          inventory: [],
          activeOrders: [],
          suppliers: [],
          contracts: [],
          totalInventoryValue: 0,
          holdingCosts: 0
        }
      };
    }
    return state;
  }
}
