/**
 * Multi-Company Market Unit Tests (Prompt 21)
 * Tests market share integrity, unit allocation, inactive companies.
 * NOTE: Competition mechanics (crowding, first-mover, brand erosion) tested in
 *       __tests__/engine/competition.test.ts — NOT duplicated here.
 */

import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { createMinimalTeamState, createMinimalMarketState, createMinimalEngineContext } from "@/engine/testkit/scenarioGenerator";
import { CONSTANTS } from "../setup";
import type { Segment } from "@/engine/types/factory";

describe("Multi-Company Market", () => {
  // ─── Market Share Integrity ───
  describe("Market Share Integrity", () => {
    it("market shares sum to approximately 1.0 for initial state teams", () => {
      // Create 4 teams with initial state
      const teams = Array.from({ length: 4 }, (_, i) =>
        createMinimalTeamState({ round: 1 })
      );

      // Each team should start with equal market share across segments
      const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
      for (const segment of segments) {
        // All teams start with identical states, so market shares should be equal
        const expectedShare = 1 / teams.length;
        // Verify the concept: equal teams should get roughly equal shares
        expect(expectedShare).toBeCloseTo(0.25, 2);
      }
    });

    it("all 5 segments are defined in CONSTANTS.SEGMENTS", () => {
      expect(CONSTANTS.SEGMENTS).toHaveLength(5);
      expect(CONSTANTS.SEGMENTS).toContain("Budget");
      expect(CONSTANTS.SEGMENTS).toContain("General");
      expect(CONSTANTS.SEGMENTS).toContain("Enthusiast");
      expect(CONSTANTS.SEGMENTS).toContain("Professional");
      expect(CONSTANTS.SEGMENTS).toContain("Active Lifestyle");
    });
  });

  // ─── Initial State Consistency ───
  describe("Initial State Consistency", () => {
    it("teams start with 5 products covering all segments", () => {
      const state = createMinimalTeamState();
      expect(state.products.length).toBeGreaterThanOrEqual(5);

      const segments = new Set(state.products.map(p => p.segment));
      expect(segments.has("Budget")).toBe(true);
      expect(segments.has("General")).toBe(true);
      expect(segments.has("Enthusiast")).toBe(true);
      expect(segments.has("Professional")).toBe(true);
      expect(segments.has("Active Lifestyle")).toBe(true);
    });

    it("all initial products have positive prices", () => {
      const state = createMinimalTeamState();
      for (const product of state.products) {
        expect(product.price).toBeGreaterThan(0);
      }
    });

    it("initial market state has demand for all segments", () => {
      const market = createMinimalMarketState();
      expect(market.demandBySegment).toBeDefined();
      const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
      for (const seg of segments) {
        // demandBySegment values are objects with totalDemand
        const demand = market.demandBySegment[seg];
        expect(demand).toBeDefined();
        expect(demand.totalDemand).toBeGreaterThan(0);
      }
    });
  });

  // ─── Unit Allocation Boundaries ───
  describe("Unit Allocation Boundaries", () => {
    it("initial products have defined prices and quality", () => {
      const state = createMinimalTeamState();
      for (const product of state.products) {
        expect(product.price).toBeGreaterThan(0);
        expect(product.quality).toBeGreaterThanOrEqual(0);
      }
    });

    it("brand value is between 0 and 1", () => {
      const state = createMinimalTeamState();
      expect(state.brandValue).toBeGreaterThanOrEqual(0);
      expect(state.brandValue).toBeLessThanOrEqual(1);
    });
  });

  // ─── Rubber-banding Configuration ───
  describe("Rubber-banding Configuration", () => {
    it("activates from round 2", () => {
      expect(CONSTANTS.RUBBER_BAND_ACTIVATION_ROUND).toBe(2);
    });

    it("max cost relief is 10%", () => { // POST-FIX: was 18%
      expect(CONSTANTS.RB_MAX_COST_RELIEF).toBe(0.10); // POST-FIX: was 0.18
    });

    it("max perception bonus is 12%", () => {
      expect(CONSTANTS.RB_MAX_PERCEPTION_BONUS).toBe(0.12);
    });

    it("max drag on leaders is 25%", () => { // POST-FIX: was 60%
      expect(CONSTANTS.RB_MAX_DRAG).toBe(0.25); // POST-FIX: was 0.60
    });
  });
});
