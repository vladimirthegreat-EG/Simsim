/**
 * Demand Calculation Unit Tests (Prompt 16)
 * Tests segment scoring, softmax allocation, demand boundaries.
 * NOTE: Competition mechanics (crowding, first-mover, brand erosion, arms race)
 *       are tested in __tests__/engine/competition.test.ts — NOT duplicated here.
 */

import { CONSTANTS, fresh_company_state, fresh_market_state, create_context, create_product } from "../setup";
import type { Segment } from "@/engine/types/factory";

describe("Demand Calculation", () => {
  // ─── Segment Score Weights ───
  describe("Segment Score Weights", () => {
    it("Budget weights: price 40, quality 22, brand 10, esg 8, features 20", () => { // POST-FIX: updated weights for balance tuning
      const w = CONSTANTS.SEGMENT_WEIGHTS["Budget"];
      expect(w.price).toBe(40); // POST-FIX: was 65
      expect(w.quality).toBe(22); // POST-FIX: was 15
      expect(w.brand).toBe(10); // POST-FIX: was 5
      expect(w.esg).toBe(8); // POST-FIX: was 5
      expect(w.features).toBe(20); // POST-FIX: was 10
    });

    it("Professional weights quality as highest priority", () => {
      const w = CONSTANTS.SEGMENT_WEIGHTS["Professional"];
      expect(w.quality).toBeGreaterThan(w.price);
      expect(w.quality).toBeGreaterThan(w.brand);
      expect(w.quality).toBeGreaterThan(w.esg);
      expect(w.quality).toBeGreaterThan(w.features);
    });

    it("Enthusiast weights features as highest priority", () => {
      const w = CONSTANTS.SEGMENT_WEIGHTS["Enthusiast"];
      expect(w.features).toBeGreaterThan(w.price);
      expect(w.features).toBeGreaterThan(w.quality);
      expect(w.features).toBeGreaterThan(w.brand);
    });

    it("all segment weights sum to 100 (±1) for each segment", () => {
      const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
      for (const seg of segments) {
        const w = CONSTANTS.SEGMENT_WEIGHTS[seg];
        const sum = w.price + w.quality + w.brand + w.esg + w.features;
        expect(sum).toBeGreaterThanOrEqual(99);
        expect(sum).toBeLessThanOrEqual(101);
      }
    });
  });

  // ─── Brand Scoring Constants ───
  describe("Brand Scoring Constants", () => {
    it("BRAND_HIGH_MULTIPLIER gives bonus for strong brands (>0.60)", () => {
      expect(CONSTANTS.BRAND_CRITICAL_MASS_HIGH).toBe(0.60);
      expect(CONSTANTS.BRAND_HIGH_MULTIPLIER).toBe(1.05);
    });

    it("BRAND_LOW_MULTIPLIER penalizes weak brands (<0.15)", () => {
      expect(CONSTANTS.BRAND_CRITICAL_MASS_LOW).toBe(0.15);
      expect(CONSTANTS.BRAND_LOW_MULTIPLIER).toBe(0.75);
    });
  });

  // ─── Quality Scoring Constants ───
  describe("Quality Scoring Constants", () => {
    it("quality score is capped at QUALITY_FEATURE_BONUS_CAP", () => {
      expect(CONSTANTS.QUALITY_FEATURE_BONUS_CAP).toBe(1.15); // POST-FIX: was 1.07
    });
  });

  // ─── Softmax Temperature ───
  describe("Softmax Allocation", () => {
    it("SOFTMAX_TEMPERATURE is set to 1.8 for sharper allocation", () => { // POST-FIX: updated description
      expect(CONSTANTS.SOFTMAX_TEMPERATURE).toBe(1.8); // POST-FIX: was 3
    });
  });

  // ─── ESG Scoring Constants ───
  describe("ESG Scoring", () => {
    it("ESG penalty system: below 300 = penalty, max 12% at score 0", () => {
      expect(CONSTANTS.ESG_PENALTY_THRESHOLD).toBe(300);
      expect(CONSTANTS.ESG_PENALTY_MAX).toBe(0.12);
    });

    it("ESG 3-tier gradient: high >= 700 (+5%), mid 400-699 (+2%), low < 400 (penalty)", () => {
      expect(CONSTANTS.ESG_HIGH_THRESHOLD).toBe(700);
      expect(CONSTANTS.ESG_HIGH_BONUS).toBe(0.05);
      expect(CONSTANTS.ESG_MID_THRESHOLD).toBe(400);
      expect(CONSTANTS.ESG_MID_BONUS).toBe(0.02);
    });
  });

  // ─── Initial Product Specs (used in demand calc) ───
  describe("Initial Product Specs by Segment", () => {
    it("Budget starts at price $200, quality 50", () => {
      const specs = CONSTANTS.INITIAL_PRODUCT_SPECS["Budget"];
      expect(specs.price).toBe(200);
      expect(specs.quality).toBe(50);
    });

    it("Professional starts at price $1250, quality 90", () => {
      const specs = CONSTANTS.INITIAL_PRODUCT_SPECS["Professional"];
      expect(specs.price).toBe(1250);
      expect(specs.quality).toBe(90);
    });

    it("all 5 segments have defined specs", () => {
      const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
      for (const seg of segments) {
        const specs = CONSTANTS.INITIAL_PRODUCT_SPECS[seg];
        expect(specs.price).toBeGreaterThan(0);
        expect(specs.quality).toBeGreaterThanOrEqual(0);
        expect(specs.quality).toBeLessThanOrEqual(100);
      }
    });
  });

  // ─── Demand Boundaries ───
  describe("Demand Boundaries", () => {
    it("raw material costs are positive for all segments", () => {
      const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
      for (const seg of segments) {
        expect(CONSTANTS.RAW_MATERIAL_COST_PER_UNIT[seg]).toBeGreaterThan(0);
      }
    });

    it("material costs scale with segment tier", () => {
      expect(CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["Budget"]).toBeLessThan(
        CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["General"]
      );
      expect(CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["General"]).toBeLessThan(
        CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["Professional"]
      );
    });
  });

  // ─── Price Elasticity ───
  describe("Price Elasticity by Segment", () => {
    it("Budget has highest elasticity (most price-sensitive)", () => {
      expect(CONSTANTS.PRICE_ELASTICITY_BY_SEGMENT["Budget"]).toBe(2.5);
    });

    it("Professional has lowest elasticity (least price-sensitive)", () => {
      expect(CONSTANTS.PRICE_ELASTICITY_BY_SEGMENT["Professional"]).toBe(0.8);
    });

    it("elasticity decreases as segment becomes more premium", () => {
      expect(CONSTANTS.PRICE_ELASTICITY_BY_SEGMENT["Budget"]).toBeGreaterThan(
        CONSTANTS.PRICE_ELASTICITY_BY_SEGMENT["General"]
      );
      expect(CONSTANTS.PRICE_ELASTICITY_BY_SEGMENT["General"]).toBeGreaterThan(
        CONSTANTS.PRICE_ELASTICITY_BY_SEGMENT["Professional"]
      );
    });
  });
});
