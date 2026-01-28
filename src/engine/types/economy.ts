/**
 * Economy Types - Unit economics, capacity constraints, inventory management
 *
 * Phase 2: Economy Integrity Rules
 */

import type { Segment } from "./factory";

// ============================================
// UNIT ECONOMICS
// ============================================

export interface UnitEconomics {
  segment: Segment;
  unitCost: number;
  unitPrice: number;
  unitMargin: number;
  marginPercent: number;
  isLossLeader: boolean;
  lossPerUnit: number;
}

export interface UnitEconomicsValidation {
  valid: boolean;
  violations: UnitEconomicsViolation[];
  totalLossExposure: number;
}

export interface UnitEconomicsViolation {
  segment: Segment;
  productId: string;
  price: number;
  cost: number;
  loss: number;
  severity: "warning" | "critical";
  message: string;
}

// ============================================
// CAPACITY CONSTRAINTS
// ============================================

export interface CapacityState {
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  utilizationRate: number;

  // Per-segment allocation
  segmentCapacity: Record<Segment, SegmentCapacity>;

  // Constraints
  isAtCapacity: boolean;
  bottlenecks: CapacityBottleneck[];
}

export interface SegmentCapacity {
  segment: Segment;
  allocated: number;
  produced: number;
  demanded: number;
  lostSales: number;
  fillRate: number;
}

export interface CapacityBottleneck {
  type: "labor" | "machinery" | "materials" | "storage";
  severity: number;
  impact: number;
  description: string;
  resolution: string;
}

export interface CapacityDecision {
  demandFulfillment: "lost_sales" | "backorder" | "premium_pricing";
  backorderPenalty: number;
  premiumPricingMultiplier: number;
}

// ============================================
// INVENTORY MANAGEMENT
// ============================================

export interface InventoryState {
  // Finished goods by segment
  finishedGoods: Record<Segment, number>;

  // Raw materials
  rawMaterials: number;
  rawMaterialValue: number;

  // Work in progress
  workInProgress: number;
  wipValue: number;

  // Costs and metrics
  totalInventoryValue: number;
  holdingCost: number;
  obsolescenceRisk: number;
  daysInventoryOutstanding: number;

  // Working capital
  accountsReceivable: number;
  accountsPayable: number;
  workingCapitalRequirement: number;
  workingCapitalCost: number;
}

export interface InventoryMovement {
  type: "production" | "sale" | "write_off" | "restock";
  segment?: Segment;
  quantity: number;
  value: number;
  round: number;
}

export interface InventoryDecisions {
  targetInventoryDays: number;
  safetyStockMultiplier: number;
  writeOffThreshold: number;
  restockTrigger: number;
}

// ============================================
// WORKING CAPITAL
// ============================================

export interface WorkingCapitalState {
  currentAssets: {
    cash: number;
    accountsReceivable: number;
    inventory: number;
    prepaidExpenses: number;
  };
  currentLiabilities: {
    accountsPayable: number;
    accruedExpenses: number;
    shortTermDebt: number;
    currentPortionLongTermDebt: number;
  };
  netWorkingCapital: number;
  workingCapitalRatio: number;
  cashConversionCycle: number;
}

// ============================================
// COST BREAKDOWN
// ============================================

export interface CostBreakdown {
  segment: Segment;

  // Direct costs
  rawMaterialCost: number;
  directLaborCost: number;
  directOverhead: number;

  // Indirect costs (allocated)
  indirectLaborCost: number;
  factoryOverhead: number;
  qualityControlCost: number;

  // Total
  totalCostPerUnit: number;

  // Experience curve effect
  experienceCurveReduction: number;
  effectiveCostPerUnit: number;
}

// ============================================
// SCARCITY MECHANICS
// ============================================

export interface ScarcityState {
  isScarcityActive: boolean;
  scarcityPremium: number;
  waitlistSize: number;
  customerFrustration: number;
  brandImpact: number;
}

export interface ScarcityEvent {
  round: number;
  segment: Segment;
  demandExcess: number;
  priceAdjustment: number;
  lostRevenue: number;
  satisfactionImpact: number;
}
