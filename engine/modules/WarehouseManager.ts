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
