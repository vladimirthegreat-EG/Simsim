/**
 * Layer 8 — Code Quality: Constants Coverage (CQ-02, CQ-03)
 *
 * Documents the current inline hardcoded values that should eventually
 * move to CONSTANTS. These tests lock the current values so any accidental
 * change is caught.
 */

import { describe, it, expect } from "vitest";
import { MarketSimulator } from "@/engine/market/MarketSimulator";
import { CONSTANTS } from "@/engine/types";

describe("Code Quality — Constants Coverage", () => {
  // ===========================================================================
  // CQ-02: Quality expectations per segment (currently inline in getQualityExpectation)
  // ===========================================================================
  describe("CQ-02: Quality expectations match documented values", () => {
    const expectedValues: Record<string, number> = {
      Budget: 50,
      General: 65,
      Enthusiast: 80,
      Professional: 90,
      "Active Lifestyle": 70,
    };

    for (const [segment, expected] of Object.entries(expectedValues)) {
      it(`${segment} quality expectation = ${expected} (round 1)`, () => {
        const actual = MarketSimulator.getQualityExpectation(segment as any, 1);
        expect(actual).toBe(expected);
      });
    }

    it("quality expectation drifts upward with rounds", () => {
      const round1 = MarketSimulator.getQualityExpectation("General" as any, 1);
      const round5 = MarketSimulator.getQualityExpectation("General" as any, 5);

      // Expectation should increase over rounds (drift = 0.5 per round after round 1)
      expect(round5).toBeGreaterThan(round1);
      expect(round5).toBeCloseTo(round1 + (5 - 1) * 0.5, 1);
    });

    it("quality expectation capped at 100", () => {
      const round100 = MarketSimulator.getQualityExpectation("Budget" as any, 100);
      expect(round100).toBeLessThanOrEqual(100);
    });
  });

  // ===========================================================================
  // CQ-03: Price elasticities per segment (currently inline in calculatePriceElasticity)
  // ===========================================================================
  describe("CQ-03: Price elasticities match documented values", () => {
    const expectedElasticities: Record<string, number> = {
      Budget: 2.5,
      General: 1.8,
      Enthusiast: 1.2,
      Professional: 0.8,
      "Active Lifestyle": 1.5,
    };

    for (const [segment, expected] of Object.entries(expectedElasticities)) {
      it(`${segment} price elasticity = ${expected}`, () => {
        const actual = MarketSimulator.calculatePriceElasticity(segment as any);
        expect(actual).toBe(expected);
      });
    }

    it("Budget is the most price-sensitive segment", () => {
      const budget = MarketSimulator.calculatePriceElasticity("Budget" as any);
      const professional = MarketSimulator.calculatePriceElasticity("Professional" as any);
      expect(budget).toBeGreaterThan(professional);
    });
  });

  // ===========================================================================
  // Segment weights sum validation
  // ===========================================================================
  describe("Segment weights sum to 100 per segment", () => {
    const segments = Object.keys(CONSTANTS.SEGMENT_WEIGHTS) as Array<keyof typeof CONSTANTS.SEGMENT_WEIGHTS>;

    for (const seg of segments) {
      it(`${seg} weights sum to 100`, () => {
        const w = CONSTANTS.SEGMENT_WEIGHTS[seg];
        const sum = w.price + w.quality + w.brand + w.esg + w.features;
        expect(sum).toBe(100);
      });
    }
  });
});
