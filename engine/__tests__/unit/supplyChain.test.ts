/**
 * P36: Supply Chain Integration Tests
 */
import { describe, it, expect } from "vitest";
import {
  calculateMaterialRequirements,
  suggestMaterialOrders,
  getFXExposure,
  getSupplyChainCostSummary,
} from "../../modules/SupplyChainManager";
import { ensureWarehouseState, storeRawMaterials } from "../../modules/WarehouseManager";
import { createTestState } from "./testHelpers";

describe("Material Requirements", () => {
  it("calculateMaterialRequirements returns correct qty per active line", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    line.targetOutput = 5000;

    const reqs = calculateMaterialRequirements(state, "factory-1");
    expect(reqs.length).toBe(1);
    expect(reqs[0].lineId).toBe(line.id);
    expect(reqs[0].targetOutput).toBe(5000);
    expect(reqs[0].materials.length).toBe(8); // 8 material types
    // Each material needs 5000 units
    for (const mat of reqs[0].materials) {
      expect(mat.qtyNeeded).toBe(5000);
    }
  });

  it("changing target changes requirements proportionally", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";

    line.targetOutput = 1000;
    const reqs1 = calculateMaterialRequirements(state, "factory-1");

    line.targetOutput = 3000;
    const reqs3 = calculateMaterialRequirements(state, "factory-1");

    expect(reqs3[0].totalMaterialCost).toBe(reqs1[0].totalMaterialCost * 3);
  });

  it("idle lines are excluded from requirements", () => {
    const state = createTestState();
    // All lines idle by default
    const reqs = calculateMaterialRequirements(state, "factory-1");
    expect(reqs.length).toBe(0);
  });

  it("multiple active lines each get their own requirements", () => {
    const state = createTestState();
    state.factories[0].productionLines[0].status = "active";
    state.factories[0].productionLines[0].productId = "prod-1";
    state.factories[0].productionLines[0].segment = "General";
    state.factories[0].productionLines[0].targetOutput = 5000;

    state.factories[0].productionLines[1].status = "active";
    state.factories[0].productionLines[1].productId = "prod-2";
    state.factories[0].productionLines[1].segment = "Budget";
    state.factories[0].productionLines[1].targetOutput = 3000;

    const reqs = calculateMaterialRequirements(state, "factory-1");
    expect(reqs.length).toBe(2);
  });
});

describe("Auto-Suggest Orders", () => {
  it("suggestMaterialOrders = requirements - warehouse inventory", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    // Set up active line
    state.factories[0].productionLines[0].status = "active";
    state.factories[0].productionLines[0].productId = "prod-1";
    state.factories[0].productionLines[0].segment = "General";
    state.factories[0].productionLines[0].targetOutput = 1000;

    // Store some materials already
    storeRawMaterials(state, "factory-1", "display", 500, 20, 1);

    const suggestions = suggestMaterialOrders(state, "factory-1");
    const displaySuggestion = suggestions.find(s => s.materialType === "display");

    expect(displaySuggestion).toBeDefined();
    expect(displaySuggestion!.qtyNeeded).toBe(1000);
    expect(displaySuggestion!.qtyInStock).toBe(500);
    expect(displaySuggestion!.qtySuggested).toBe(500); // 1000 - 500
  });

  it("if warehouse has enough: suggested = 0", () => {
    const state = createTestState();
    ensureWarehouseState(state);

    state.factories[0].productionLines[0].status = "active";
    state.factories[0].productionLines[0].productId = "prod-1";
    state.factories[0].productionLines[0].segment = "General";
    state.factories[0].productionLines[0].targetOutput = 100;

    // Store more than needed
    storeRawMaterials(state, "factory-1", "display", 5000, 20, 1);

    const suggestions = suggestMaterialOrders(state, "factory-1");
    const displaySuggestion = suggestions.find(s => s.materialType === "display");

    expect(displaySuggestion!.qtySuggested).toBe(0);
  });
});

describe("FX Exposure", () => {
  it("domestic factory (North America) has no FX exposure", () => {
    const state = createTestState();
    state.factories[0].region = "North America";

    const exposure = getFXExposure(state);
    // Only USD operations — no foreign exposure
    const nonUsd = exposure.filter(e => e.currency !== "USD");
    expect(nonUsd.length).toBe(0);
  });

  it("foreign factory creates FX exposure in that currency", () => {
    const state = createTestState();
    state.factories[0].region = "Asia";

    const exposure = getFXExposure(state);
    const jpyExposure = exposure.find(e => e.currency === "JPY");
    expect(jpyExposure).toBeDefined();
    expect(jpyExposure!.amount).toBeGreaterThan(0);
  });

  it("European factory creates EUR exposure", () => {
    const state = createTestState();
    state.factories[0].region = "Europe";

    const exposure = getFXExposure(state);
    const eurExposure = exposure.find(e => e.currency === "EUR");
    expect(eurExposure).toBeDefined();
    expect(eurExposure!.amount).toBeGreaterThan(0);
  });
});

describe("Cost Summary", () => {
  it("totals match sum of components", () => {
    const state = createTestState();
    state.factories[0].productionLines[0].status = "active";
    state.factories[0].productionLines[0].productId = "prod-1";
    state.factories[0].productionLines[0].segment = "General";
    state.factories[0].productionLines[0].targetOutput = 5000;

    const summary = getSupplyChainCostSummary(state, "factory-1");

    expect(summary.grandTotal).toBeCloseTo(
      summary.totalMaterialCost + summary.totalShippingCost +
      summary.totalTariffCost + summary.totalInsuranceCost + summary.fxImpact,
      0
    );
  });

  it("per-unit landed cost = total / units for each product", () => {
    const state = createTestState();
    state.factories[0].productionLines[0].status = "active";
    state.factories[0].productionLines[0].productId = "prod-1";
    state.factories[0].productionLines[0].segment = "General";
    state.factories[0].productionLines[0].targetOutput = 5000;

    const summary = getSupplyChainCostSummary(state, "factory-1");
    expect(summary.perUnitLandedCost["prod-1"]).toBeDefined();
    expect(summary.perUnitLandedCost["prod-1"]).toBeGreaterThan(0);
    expect(summary.perUnitLandedCost["prod-1"]).toBeCloseTo(summary.grandTotal / 5000, 0);
  });

  it("no active lines = zero costs", () => {
    const state = createTestState();
    const summary = getSupplyChainCostSummary(state, "factory-1");
    expect(summary.totalMaterialCost).toBe(0);
    expect(summary.grandTotal).toBe(0);
  });
});
