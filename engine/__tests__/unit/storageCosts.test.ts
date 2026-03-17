/**
 * P34: Storage Costs & Obsolescence Tests
 */
import { describe, it, expect } from "vitest";
import {
  ensureWarehouseState,
  storeRawMaterials,
  storeFinishedGoods,
  calculateStorageCosts,
  getWarehouseCapacity,
  buildWarehouse,
} from "../../modules/WarehouseManager";
import { createTestState } from "./testHelpers";

describe("Storage Costs", () => {
  it("raw material cost: $2 + (material_cost × 0.5%) per unit/round", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    // Store 1000 units at $100/unit
    storeRawMaterials(state, "factory-1", "processor", 1000, 100, 1);

    const result = calculateStorageCosts(state, 1);
    // Per unit = $2 + ($100 × 0.005) = $2.50
    // Total = 1000 × $2.50 = $2,500
    expect(result.rawMaterialStorageCost).toBeCloseTo(2500, 0);
  });

  it("finished goods cost: $3 + (selling_price × 1%) per unit/round", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    // Store 1000 units, selling price $410
    storeFinishedGoods(state, "factory-1", "prod-1", 1000, 200, 410, 1);

    const result = calculateStorageCosts(state, 1);
    // Per unit = $3 + ($410 × 0.01) = $7.10
    // Total = 1000 × $7.10 = $7,100
    expect(result.finishedGoodsStorageCost).toBeCloseTo(7100, 0);
  });

  it("overflow: units beyond capacity cost 2× rate", () => {
    const state = createTestState();
    ensureWarehouseState(state);
    // Tier 0 = 5000 capacity

    // Store 6000 units (1000 overflow)
    storeRawMaterials(state, "factory-1", "display", 6000, 50, 1);

    const result = calculateStorageCosts(state, 1);
    // Per unit normal = $2 + ($50 × 0.005) = $2.25
    // With 2× overflow: 6000 × $2.25 × 2 = $27,000
    expect(result.rawMaterialStorageCost).toBeCloseTo(6000 * 2.25 * 2, 0);
    expect(result.overflowSurcharge).toBeGreaterThan(0);
  });

  it("storage cost appears as operating expense total", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeRawMaterials(state, "factory-1", "chassis", 500, 80, 1);
    storeFinishedGoods(state, "factory-1", "prod-1", 300, 200, 410, 1);

    const result = calculateStorageCosts(state, 1);
    expect(result.totalStorageCost).toBe(result.rawMaterialStorageCost + result.finishedGoodsStorageCost);
    expect(result.totalStorageCost).toBeGreaterThan(0);
  });
});

describe("Finished Goods Obsolescence", () => {
  it("Round 1 unsold: full value (no decay)", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeFinishedGoods(state, "factory-1", "prod-1", 100, 200, 410, 1);
    calculateStorageCosts(state, 1); // same round

    const fg = state.warehouseState!.warehouses[0].finishedGoods[0];
    expect(fg.bookValue).toBe(100 * 200); // full value
  });

  it("Round 2 unsold: ×0.90 (-10%)", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeFinishedGoods(state, "factory-1", "prod-1", 100, 200, 410, 1);
    calculateStorageCosts(state, 3); // 2 rounds later

    const fg = state.warehouseState!.warehouses[0].finishedGoods[0];
    expect(fg.bookValue).toBeCloseTo(100 * 200 * 0.90, 0);
  });

  it("Round 3 unsold: ×0.75 (-25%)", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeFinishedGoods(state, "factory-1", "prod-1", 100, 200, 410, 1);
    calculateStorageCosts(state, 4); // 3 rounds later

    const fg = state.warehouseState!.warehouses[0].finishedGoods[0];
    expect(fg.bookValue).toBeCloseTo(100 * 200 * 0.75, 0);
  });

  it("Round 4 unsold: write-off at 50%, removed from inventory", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeFinishedGoods(state, "factory-1", "prod-1", 100, 200, 410, 1);
    const result = calculateStorageCosts(state, 5); // 4 rounds later

    // Should have write-offs
    expect(result.writeOffs.length).toBe(1);
    expect(result.writeOffs[0].productId).toBe("prod-1");
    expect(result.writeOffs[0].qty).toBe(100);
    expect(result.totalWriteOffValue).toBeGreaterThan(0);

    // Finished goods removed
    expect(state.warehouseState!.warehouses[0].finishedGoods.length).toBe(0);
  });

  it("write-off value = bookValue × 0.5", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeFinishedGoods(state, "factory-1", "prod-1", 100, 200, 410, 1);
    const result = calculateStorageCosts(state, 5);

    // Book value at round 4 write-off = original × 0.5
    expect(result.writeOffs[0].bookValue).toBeCloseTo(100 * 200 * 0.5, 0);
  });
});

describe("Raw Material Decay", () => {
  it("Rounds 1-3: full value", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeRawMaterials(state, "factory-1", "display", 100, 50, 1);
    calculateStorageCosts(state, 3); // age = 2 (still < 4)

    const rm = state.warehouseState!.warehouses[0].rawMaterials[0];
    expect(rm.unitCost).toBe(50); // unchanged
  });

  it("Rounds 4-5: -5% per round", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeRawMaterials(state, "factory-1", "display", 100, 100, 1);
    calculateStorageCosts(state, 5); // age = 4

    const rm = state.warehouseState!.warehouses[0].rawMaterials[0];
    expect(rm.unitCost).toBeCloseTo(100 * 0.95, 1); // -5%
  });

  it("Round 6+: -15% per round", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeRawMaterials(state, "factory-1", "display", 100, 100, 1);
    calculateStorageCosts(state, 7); // age = 6

    const rm = state.warehouseState!.warehouses[0].rawMaterials[0];
    expect(rm.unitCost).toBeCloseTo(100 * 0.85, 1); // -15%
  });
});

describe("Balance Sheet Impact", () => {
  it("inventory at decayed book value after obsolescence", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    storeFinishedGoods(state, "factory-1", "prod-1", 1000, 200, 410, 1);
    calculateStorageCosts(state, 3); // 2 rounds → 0.90

    const fg = state.warehouseState!.warehouses[0].finishedGoods[0];
    expect(fg.bookValue).toBeCloseTo(1000 * 200 * 0.90, 0);
  });
});
