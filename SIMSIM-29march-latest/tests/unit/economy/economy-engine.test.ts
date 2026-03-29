/**
 * Layer 1/2 — EconomyEngine Isolated Unit Tests (L1-ECO-01, L2-ECO-01)
 *
 * Tests EconomyEngine functions in isolation: unit economics, capacity, inventory.
 * Previously had zero test coverage.
 */

import { describe, it, expect } from "vitest";
import { EconomyEngine } from "@/engine/economy/EconomyEngine";
import { fresh_company_state, create_product, create_factory } from "../setup";

describe("EconomyEngine", () => {
  // ===========================================================================
  // L1-ECO-01: Unit economics calculation
  // ===========================================================================
  describe("calculateUnitEconomics", () => {
    it("identifies viable product with positive margin", () => {
      const state = fresh_company_state({
        products: [
          create_product({ id: "p1", segment: "General", price: 450, unitCost: 200 }),
        ],
      });

      const results = EconomyEngine.calculateUnitEconomics(state);

      expect(results).toHaveLength(1);
      expect(results[0].price).toBe(450);
      expect(results[0].unitCost).toBe(200);
      expect(results[0].contributionMargin).toBe(250);
      expect(results[0].isViable).toBe(true);
      expect(results[0].violations).toHaveLength(0);
    });

    it("flags product priced below cost as violation", () => {
      const state = fresh_company_state({
        products: [
          create_product({ id: "p1", segment: "Budget", price: 50, unitCost: 100 }),
        ],
      });

      const results = EconomyEngine.calculateUnitEconomics(state);

      expect(results[0].contributionMargin).toBeLessThan(0);
      expect(results[0].isViable).toBe(false);
      expect(results[0].violations.length).toBeGreaterThan(0);
      expect(results[0].violations[0].type).toBe("below_cost");
    });
  });

  // ===========================================================================
  // L2-ECO-01: Capacity calculation
  // ===========================================================================
  describe("calculateCapacity", () => {
    it("calculates total capacity from factory state", () => {
      const state = fresh_company_state({
        factories: [
          create_factory({ baseCapacity: 50000, workers: 100, efficiency: 0.8 }),
        ],
      });

      const capacity = EconomyEngine.calculateCapacity(state);

      expect(capacity.totalCapacity).toBeGreaterThan(0);
      expect(capacity.utilization).toBeGreaterThanOrEqual(0);
      expect(capacity.utilization).toBeLessThanOrEqual(1);
    });
  });

  // ===========================================================================
  // calculateUnitCost
  // ===========================================================================
  describe("calculateUnitCost", () => {
    it("returns finite positive cost for launched product", () => {
      const state = fresh_company_state();
      const product = create_product({ segment: "General", price: 450 });

      const cost = EconomyEngine.calculateUnitCost(product, state);

      expect(cost).toBeGreaterThan(0);
      expect(isFinite(cost)).toBe(true);
    });
  });
});
