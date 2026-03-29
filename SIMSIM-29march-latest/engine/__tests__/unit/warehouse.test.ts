/**
 * P33: Warehouse Tests
 */
import { describe, it, expect } from "vitest";
import {
  WAREHOUSE_TIERS,
  ensureWarehouseState,
  buildWarehouse,
  rentWarehouse,
  getWarehouseCapacity,
  getWarehouseUtilization,
  storeRawMaterials,
  storeFinishedGoods,
  consumeRawMaterials,
  calculateWarehouseRentCosts,
} from "../../modules/WarehouseManager";
import { createTestState } from "./testHelpers";

describe("Warehouse Tiers", () => {
  it("Tier 0: Factory Floor, 5K free", () => {
    expect(WAREHOUSE_TIERS[0].capacity).toBe(5000);
    expect(WAREHOUSE_TIERS[0].buildCost).toBe(0);
    expect(WAREHOUSE_TIERS[0].rentCostPerRound).toBe(0);
  });

  it("Tier 1: Basic Warehouse, 20K, $5M build / $500K rent", () => {
    expect(WAREHOUSE_TIERS[1].capacity).toBe(20_000);
    expect(WAREHOUSE_TIERS[1].buildCost).toBe(5_000_000);
    expect(WAREHOUSE_TIERS[1].rentCostPerRound).toBe(500_000);
  });

  it("Tier 2: Regional DC, 50K, $15M build / $1.5M rent", () => {
    expect(WAREHOUSE_TIERS[2].capacity).toBe(50_000);
    expect(WAREHOUSE_TIERS[2].buildCost).toBe(15_000_000);
    expect(WAREHOUSE_TIERS[2].rentCostPerRound).toBe(1_500_000);
  });

  it("Tier 3: Automated, 100K, $35M build / $3M rent", () => {
    expect(WAREHOUSE_TIERS[3].capacity).toBe(100_000);
    expect(WAREHOUSE_TIERS[3].buildCost).toBe(35_000_000);
    expect(WAREHOUSE_TIERS[3].rentCostPerRound).toBe(3_000_000);
  });
});

describe("Warehouse Creation", () => {
  it("every factory auto-gets Tier 0 (5K free)", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    const cap = getWarehouseCapacity(state, "factory-1");
    expect(cap).toBe(5000);
    expect(state.warehouseState!.warehouses.length).toBe(1);
    expect(state.warehouseState!.warehouses[0].tier).toBe(0);
    expect(state.warehouseState!.warehouses[0].ownership).toBe("built");
  });

  it("buildWarehouse deducts cost and adds capacity", () => {
    const state = createTestState();
    ensureWarehouseState(state);
    const initialCash = state.cash;

    const result = buildWarehouse(state, "factory-1", 1);
    expect(result.success).toBe(true);
    expect(state.cash).toBe(initialCash - 5_000_000);
    expect(getWarehouseCapacity(state, "factory-1")).toBe(5000 + 20_000); // tier0 + tier1
  });

  it("built warehouse is a fixed asset", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    buildWarehouse(state, "factory-1", 2);
    const wh = state.warehouseState!.warehouses.find(w => w.tier === 2);
    expect(wh!.ownership).toBe("built");
  });

  it("rentWarehouse: available immediately, no asset, recurring expense", () => {
    const state = createTestState();
    ensureWarehouseState(state);
    const initialCash = state.cash;

    const result = rentWarehouse(state, "factory-1", 1);
    expect(result.success).toBe(true);
    expect(state.cash).toBe(initialCash); // No upfront cost
    expect(getWarehouseCapacity(state, "factory-1")).toBe(25_000); // 5K + 20K

    const wh = state.warehouseState!.warehouses.find(w => w.tier === 1);
    expect(wh!.ownership).toBe("rented");
  });

  it("rented warehouse NOT on balance sheet (no asset value)", () => {
    const state = createTestState();
    ensureWarehouseState(state);
    const initialAssets = state.totalAssets;

    rentWarehouse(state, "factory-1", 1);
    expect(state.totalAssets).toBe(initialAssets); // No change
  });

  it("rent cost charged each round", () => {
    const state = createTestState();
    ensureWarehouseState(state);
    rentWarehouse(state, "factory-1", 2); // $1.5M/round

    const cost = calculateWarehouseRentCosts(state);
    expect(cost).toBe(1_500_000);
  });

  it("cannot build Tier 0 (it's free and auto-created)", () => {
    const state = createTestState();
    const result = buildWarehouse(state, "factory-1", 0);
    expect(result.success).toBe(false);
  });

  it("insufficient funds to build fails", () => {
    const state = createTestState();
    state.cash = 1_000_000;
    const result = buildWarehouse(state, "factory-1", 3); // $35M needed
    expect(result.success).toBe(false);
  });
});

describe("Warehouse Storage", () => {
  it("storeRawMaterials increases utilization", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeRawMaterials(state, "factory-1", "display", 1000, 45, 1);
    expect(getWarehouseUtilization(state, "factory-1")).toBe(1000);
  });

  it("storeFinishedGoods increases utilization", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeFinishedGoods(state, "factory-1", "prod-1", 2000, 200, 410, 1);
    expect(getWarehouseUtilization(state, "factory-1")).toBe(2000);
  });

  it("consumeRawMaterials decreases qty", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeRawMaterials(state, "factory-1", "processor", 5000, 120, 1);
    const { consumed, cost } = consumeRawMaterials(state, "factory-1", "processor", 3000);
    expect(consumed).toBe(3000);
    expect(cost).toBe(3000 * 120);
    expect(getWarehouseUtilization(state, "factory-1")).toBe(2000); // 5000 - 3000
  });

  it("cannot consume more than stored", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeRawMaterials(state, "factory-1", "battery", 1000, 30, 1);
    const { consumed } = consumeRawMaterials(state, "factory-1", "battery", 5000);
    expect(consumed).toBe(1000); // Only 1000 available
  });

  it("getWarehouseCapacity sums all tiers for factory", () => {
    const state = createTestState();
    ensureWarehouseState(state);
    buildWarehouse(state, "factory-1", 1);
    rentWarehouse(state, "factory-1", 2);

    // Tier 0 (5K) + Tier 1 (20K) + Tier 2 (50K)
    expect(getWarehouseCapacity(state, "factory-1")).toBe(75_000);
  });
});
