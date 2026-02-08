/**
 * Economy Integrity Engine
 *
 * Enforces unit economics, capacity constraints, and inventory management.
 * Ensures economic realism in the simulation.
 *
 * Phase 2: Economy Integrity Rules
 */

import type { Segment } from "../types/factory";
import type { Product } from "../types/product";
import type { TeamState } from "../types/state";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export interface UnitEconomics {
  product: string;
  segment: Segment;
  price: number;
  unitCost: number;
  contributionMargin: number;
  marginPercent: number;
  isViable: boolean;
  violations: UnitEconomicsViolation[];
}

export interface UnitEconomicsViolation {
  type: "below_cost" | "negative_margin" | "unsustainable_discount";
  severity: "warning" | "critical";
  message: string;
  penalty: number;
}

export interface CapacityState {
  totalCapacity: number;
  usedCapacity: number;
  utilization: number;
  bottlenecks: CapacityBottleneck[];
  bySegment: Record<Segment, SegmentCapacity>;
}

export interface SegmentCapacity {
  allocated: number;
  used: number;
  demand: number;
  unmetDemand: number;
  lostSales: number;
  scarcityPremium: number;
}

export interface CapacityBottleneck {
  resource: "machines" | "workers" | "materials" | "warehouse";
  constrainedAmount: number;
  requiredAmount: number;
  impact: number;
}

export interface InventoryState {
  finishedGoods: Record<Segment, number>;
  rawMaterials: number;
  workInProgress: number;
  totalValue: number;
  holdingCost: number;
  obsolescenceRisk: number;
  daysInventoryOutstanding: number;
}

export interface WorkingCapitalState {
  accountsReceivable: number;
  inventory: number;
  accountsPayable: number;
  workingCapital: number;
  workingCapitalCost: number;
  daysReceivable: number;
  daysPayable: number;
  cashConversionCycle: number;
}

export interface EconomyResult {
  unitEconomics: UnitEconomics[];
  capacity: CapacityState;
  inventory: InventoryState;
  workingCapital: WorkingCapitalState;
  totalPenalties: number;
  messages: string[];
  warnings: string[];
}

// ============================================
// CONSTANTS
// ============================================

const RAW_MATERIAL_COST_PER_UNIT: Record<Segment, number> = {
  Budget: 50,
  General: 100,
  Enthusiast: 200,
  Professional: 350,
  "Active Lifestyle": 150,
};

const LABOR_COST_PER_UNIT = 20;
const OVERHEAD_COST_PER_UNIT = 15;
const INVENTORY_HOLDING_COST_RATE = 0.02; // 2% per round
const OBSOLESCENCE_RATE = 0.05; // 5% value decay per round for old inventory

// ============================================
// ENGINE
// ============================================

export class EconomyEngine {
  /**
   * Calculate unit economics for all products
   */
  static calculateUnitEconomics(
    state: TeamState,
    config: EngineConfig
  ): UnitEconomics[] {
    const products = state.products ?? [];
    const results: UnitEconomics[] = [];

    for (const product of products) {
      const segment = product.segment as Segment;
      const unitCost = this.calculateUnitCost(product, state, config);
      const contributionMargin = product.price - unitCost;
      const marginPercent = product.price > 0 ? contributionMargin / product.price : 0;

      const violations: UnitEconomicsViolation[] = [];

      // Check for below-cost pricing
      if (product.price < unitCost) {
        const lossFraction = (unitCost - product.price) / unitCost;
        violations.push({
          type: "below_cost",
          severity: lossFraction > 0.2 ? "critical" : "warning",
          message: `${product.name} priced ${(lossFraction * 100).toFixed(1)}% below cost`,
          penalty: 0.2 + lossFraction * 0.3, // 20-50% score penalty
        });
      }

      // Check for unsustainably low margins
      if (marginPercent > 0 && marginPercent < 0.1) {
        violations.push({
          type: "unsustainable_discount",
          severity: "warning",
          message: `${product.name} has unsustainably low margin of ${(marginPercent * 100).toFixed(1)}%`,
          penalty: 0.1,
        });
      }

      results.push({
        product: product.name,
        segment,
        price: product.price,
        unitCost,
        contributionMargin,
        marginPercent,
        isViable: violations.length === 0,
        violations,
      });
    }

    return results;
  }

  /**
   * Calculate unit cost for a product
   */
  private static calculateUnitCost(
    product: Product,
    state: TeamState,
    config: EngineConfig
  ): number {
    const segment = product.segment as Segment;
    const materialCost = RAW_MATERIAL_COST_PER_UNIT[segment];

    // Factor in quality (higher quality = higher material costs)
    const qualityMultiplier = 1 + (product.quality - 50) / 100;

    // Factor in factory efficiency (reduces costs)
    const factoryEfficiency = state.factories?.[0]?.efficiency ?? 0.7;
    const efficiencyMultiplier = 2 - factoryEfficiency; // 0.7 efficiency = 1.3x cost

    // Calculate total unit cost
    const baseCost = materialCost * qualityMultiplier;
    const laborCost = LABOR_COST_PER_UNIT * efficiencyMultiplier;
    const overheadCost = OVERHEAD_COST_PER_UNIT;

    let totalCost = baseCost + laborCost + overheadCost;

    // v3.1.0: Automation reduces total unit cost by 35% (Fix 4.1)
    const factory = state.factories?.[0];
    if (factory?.upgrades?.includes("automation")) {
      totalCost *= (1 - (factory.unitCostReduction ?? 0.35));
    }

    return totalCost;
  }

  /**
   * Calculate capacity state and constraints
   */
  static calculateCapacity(
    state: TeamState,
    demand: Record<Segment, number>,
    config: EngineConfig
  ): CapacityState {
    const factories = state.factories ?? [];
    const workforce = state.workforce;

    // Calculate total production capacity
    let totalMachineCapacity = 0;
    for (const factory of factories) {
      totalMachineCapacity += factory.productionLines.length * 10000; // 10k units per line
    }

    // Worker capacity constraint (using totalHeadcount as proxy for workers)
    const workers = workforce?.totalHeadcount ?? 0;
    const workerCapacity = workers * 100; // 100 units per worker per round

    // Effective capacity is minimum of constraints
    const totalCapacity = Math.min(totalMachineCapacity, workerCapacity);

    // Calculate demand per segment
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const totalDemand = Object.values(demand).reduce((sum, d) => sum + d, 0);
    const usedCapacity = Math.min(totalCapacity, totalDemand);
    const utilization = totalCapacity > 0 ? usedCapacity / totalCapacity : 0;

    // Calculate per-segment capacity allocation
    const bySegment: Record<Segment, SegmentCapacity> = {} as Record<Segment, SegmentCapacity>;
    for (const segment of segments) {
      const segmentDemand = demand[segment] ?? 0;
      const segmentShare = totalDemand > 0 ? segmentDemand / totalDemand : 0;
      const allocated = totalCapacity * segmentShare;
      const used = Math.min(allocated, segmentDemand);
      const unmetDemand = Math.max(0, segmentDemand - allocated);
      const lostSales = unmetDemand;
      const scarcityPremium = unmetDemand > 0 ? 1.05 : 1.0; // 5% premium when scarce

      bySegment[segment] = {
        allocated,
        used,
        demand: segmentDemand,
        unmetDemand,
        lostSales,
        scarcityPremium,
      };
    }

    // Identify bottlenecks
    const bottlenecks: CapacityBottleneck[] = [];

    if (workerCapacity < totalMachineCapacity && workerCapacity < totalDemand) {
      bottlenecks.push({
        resource: "workers",
        constrainedAmount: workerCapacity,
        requiredAmount: Math.min(totalMachineCapacity, totalDemand),
        impact: (Math.min(totalMachineCapacity, totalDemand) - workerCapacity) / totalDemand,
      });
    }

    if (totalMachineCapacity < workerCapacity && totalMachineCapacity < totalDemand) {
      bottlenecks.push({
        resource: "machines",
        constrainedAmount: totalMachineCapacity,
        requiredAmount: Math.min(workerCapacity, totalDemand),
        impact: (Math.min(workerCapacity, totalDemand) - totalMachineCapacity) / totalDemand,
      });
    }

    return {
      totalCapacity,
      usedCapacity,
      utilization,
      bottlenecks,
      bySegment,
    };
  }

  /**
   * Calculate inventory state
   */
  static calculateInventory(
    state: TeamState,
    production: Record<Segment, number>,
    sales: Record<Segment, number>,
    previousInventory: InventoryState | null
  ): InventoryState {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const finishedGoods: Record<Segment, number> = {} as Record<Segment, number>;

    let totalValue = 0;
    for (const segment of segments) {
      const previousStock = previousInventory?.finishedGoods[segment] ?? 0;
      const produced = production[segment] ?? 0;
      const sold = sales[segment] ?? 0;
      const remaining = Math.max(0, previousStock + produced - sold);
      finishedGoods[segment] = remaining;

      // Value at unit cost
      totalValue += remaining * RAW_MATERIAL_COST_PER_UNIT[segment];
    }

    const rawMaterials = state.inventory?.rawMaterials ?? 5_000_000;
    const workInProgress = totalValue * 0.1; // 10% in WIP

    // Calculate holding cost
    const holdingCost = totalValue * INVENTORY_HOLDING_COST_RATE;

    // Calculate obsolescence risk based on inventory age
    const previousValue = previousInventory?.totalValue ?? 0;
    const obsolescenceRisk = previousValue > 0 ? OBSOLESCENCE_RATE : 0;

    // Days inventory outstanding
    const avgDailySales = Object.values(sales).reduce((sum, s) => sum + s, 0) / 90; // 90 days per round
    const daysInventoryOutstanding = avgDailySales > 0 ? totalValue / avgDailySales : 0;

    return {
      finishedGoods,
      rawMaterials,
      workInProgress,
      totalValue: totalValue + rawMaterials + workInProgress,
      holdingCost,
      obsolescenceRisk,
      daysInventoryOutstanding,
    };
  }

  /**
   * Calculate working capital state
   */
  static calculateWorkingCapital(
    state: TeamState,
    revenue: number,
    inventory: InventoryState
  ): WorkingCapitalState {
    // Accounts receivable: ~30 days of revenue
    const accountsReceivable = revenue * (30 / 90);

    // Inventory value
    const inventoryValue = inventory.totalValue;

    // Accounts payable: ~45 days of costs
    const costs = revenue * 0.7; // Assume 70% cost ratio
    const accountsPayable = costs * (45 / 90);

    // Working capital calculation
    const workingCapital = accountsReceivable + inventoryValue - accountsPayable;

    // Working capital financing cost (quarterly rate)
    const interestRate = 0.08; // 8% annual
    const workingCapitalCost = Math.max(0, workingCapital) * (interestRate / 4);

    // Days calculations
    const dailyRevenue = revenue / 90;
    const dailyCosts = costs / 90;
    const daysReceivable = dailyRevenue > 0 ? accountsReceivable / dailyRevenue : 30;
    const daysPayable = dailyCosts > 0 ? accountsPayable / dailyCosts : 45;
    const cashConversionCycle = daysReceivable + inventory.daysInventoryOutstanding - daysPayable;

    return {
      accountsReceivable,
      inventory: inventoryValue,
      accountsPayable,
      workingCapital,
      workingCapitalCost,
      daysReceivable,
      daysPayable,
      cashConversionCycle,
    };
  }

  /**
   * Comprehensive economy analysis
   */
  static analyzeEconomy(
    state: TeamState,
    demand: Record<Segment, number>,
    production: Record<Segment, number>,
    sales: Record<Segment, number>,
    revenue: number,
    previousInventory: InventoryState | null,
    config: EngineConfig
  ): EconomyResult {
    const messages: string[] = [];
    const warnings: string[] = [];

    // Calculate all components
    const unitEconomics = this.calculateUnitEconomics(state, config);
    const capacity = this.calculateCapacity(state, demand, config);
    const inventory = this.calculateInventory(state, production, sales, previousInventory);
    const workingCapital = this.calculateWorkingCapital(state, revenue, inventory);

    // Calculate total penalties
    let totalPenalties = 0;
    for (const ue of unitEconomics) {
      for (const violation of ue.violations) {
        totalPenalties += violation.penalty;
        if (violation.severity === "critical") {
          warnings.push(violation.message);
        } else {
          messages.push(violation.message);
        }
      }
    }

    // Capacity warnings
    if (capacity.utilization > 0.95) {
      warnings.push(`Factory operating at ${(capacity.utilization * 100).toFixed(0)}% capacity - risk of burnout and defects`);
    }

    for (const bottleneck of capacity.bottlenecks) {
      warnings.push(`${bottleneck.resource} bottleneck limiting ${(bottleneck.impact * 100).toFixed(0)}% of potential output`);
    }

    // Lost sales warnings
    for (const [segment, data] of Object.entries(capacity.bySegment)) {
      if (data.lostSales > 0) {
        messages.push(`Lost ${data.lostSales.toLocaleString()} unit sales in ${segment} due to capacity constraints`);
      }
    }

    // Working capital warnings
    if (workingCapital.cashConversionCycle > 60) {
      warnings.push(`Cash conversion cycle of ${workingCapital.cashConversionCycle.toFixed(0)} days is straining liquidity`);
    }

    // Inventory warnings
    if (inventory.daysInventoryOutstanding > 45) {
      messages.push(`High inventory levels: ${inventory.daysInventoryOutstanding.toFixed(0)} days of stock on hand`);
    }

    return {
      unitEconomics,
      capacity,
      inventory,
      workingCapital,
      totalPenalties,
      messages,
      warnings,
    };
  }

  /**
   * Apply economic penalties to market score
   */
  static applyEconomicPenalties(
    baseScore: number,
    economyResult: EconomyResult
  ): number {
    let adjustedScore = baseScore;

    // Apply unit economics penalties
    adjustedScore *= (1 - Math.min(0.5, economyResult.totalPenalties));

    // Capacity utilization impacts (burnout affects quality)
    if (economyResult.capacity.utilization > 0.95) {
      const burnoutPenalty = (economyResult.capacity.utilization - 0.95) * 2;
      adjustedScore *= (1 - Math.min(0.1, burnoutPenalty));
    }

    return Math.max(0, adjustedScore);
  }
}

// Types are exported with their interface declarations above
