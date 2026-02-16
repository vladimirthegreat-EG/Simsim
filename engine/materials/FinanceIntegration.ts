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
