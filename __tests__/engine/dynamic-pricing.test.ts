/**
 * Dynamic Pricing Tests
 *
 * Tests EMA-based expected prices, underserved factor, and price scoring mechanics.
 * These test the types and constants; market simulator integration is tested separately.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setRandomSeed } from "../../engine/utils";
import { CONSTANTS } from "../../engine/types";
import type { MarketState } from "../../engine/types";

beforeEach(() => {
  setRandomSeed("test-seed-dynamic-pricing");
});

describe("Dynamic Pricing Mechanics", () => {
  describe("Segment price ranges (from CONSTANTS)", () => {
    it("should have demand data for all 5 segments", () => {
      const segments = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
      for (const segment of segments) {
        expect(CONSTANTS.SEGMENTS).toContain(segment);
      }
    });

    it("should have 5 segments", () => {
      expect(CONSTANTS.SEGMENTS).toHaveLength(5);
    });
  });

  describe("EMA Pricing Logic", () => {
    /**
     * EMA = alpha * currentPrice + (1 - alpha) * previousEMA
     * alpha = 0.3 per design doc
     */
    const EMA_ALPHA = 0.3;

    it("should compute EMA correctly", () => {
      const previousEMA = 400;
      const currentPrice = 350;
      const newEMA = EMA_ALPHA * currentPrice + (1 - EMA_ALPHA) * previousEMA;
      expect(newEMA).toBeCloseTo(385, 0);
    });

    it("should converge to current price over many rounds", () => {
      let ema = 500;
      const target = 300;
      for (let i = 0; i < 50; i++) {
        ema = EMA_ALPHA * target + (1 - EMA_ALPHA) * ema;
      }
      expect(ema).toBeCloseTo(target, 0);
    });

    it("should react faster with higher alpha", () => {
      const prev = 500;
      const current = 300;
      const slowEMA = 0.1 * current + 0.9 * prev; // alpha=0.1
      const fastEMA = 0.5 * current + 0.5 * prev; // alpha=0.5

      expect(fastEMA).toBeLessThan(slowEMA);
      // Faster alpha moves closer to current price
      expect(Math.abs(fastEMA - current)).toBeLessThan(Math.abs(slowEMA - current));
    });
  });

  describe("Price Advantage Scoring", () => {
    /**
     * priceAdvantage = (expectedPrice - price) / expectedPrice
     * Positive = cheaper than expected (good)
     * Negative = more expensive than expected (bad for budget, ok for premium)
     */
    it("should give positive advantage for below-expected pricing", () => {
      const expected = 400;
      const price = 350;
      const advantage = (expected - price) / expected;
      expect(advantage).toBeGreaterThan(0);
      expect(advantage).toBeCloseTo(0.125, 3);
    });

    it("should give negative advantage for above-expected pricing", () => {
      const expected = 400;
      const price = 500;
      const advantage = (expected - price) / expected;
      expect(advantage).toBeLessThan(0);
    });

    it("should give zero advantage when price matches expected", () => {
      const expected = 400;
      const price = 400;
      const advantage = (expected - price) / expected;
      expect(advantage).toBe(0);
    });
  });

  describe("Underserved Factor", () => {
    /**
     * Underserved bonus = up to 25% when fewer products serve a segment.
     * Incentivizes entering gaps in the market.
     */
    it("should give higher bonus for fewer products in segment", () => {
      // Simulate: underserved = totalDemand / (productCount * avgCapacity)
      // Higher ratio = more underserved
      const calcUnderserved = (demand: number, products: number) =>
        products === 0 ? 1.0 : Math.min(1.0, demand / (products * demand * 0.5));

      const bonus0 = calcUnderserved(500000, 0); // No products
      const bonus1 = calcUnderserved(500000, 1); // 1 product
      const bonus5 = calcUnderserved(500000, 5); // 5 products

      expect(bonus0).toBe(1.0);
      expect(bonus1).toBeGreaterThan(bonus5);
    });
  });

  describe("Sigmoid (tanh) Price Scoring", () => {
    /**
     * tanh maps price advantage to a smooth -1 to 1 score.
     * Prevents extreme pricing from giving extreme advantages.
     */
    it("tanh should cap at ~1 for very cheap products", () => {
      const advantage = 0.5; // 50% cheaper
      const score = Math.tanh(advantage * 3); // scale factor
      expect(score).toBeGreaterThan(0.9);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("tanh should cap at ~-1 for very expensive products", () => {
      const advantage = -0.5; // 50% more expensive
      const score = Math.tanh(advantage * 3);
      expect(score).toBeLessThan(-0.9);
      expect(score).toBeGreaterThanOrEqual(-1);
    });

    it("tanh should be ~0 for fair-priced products", () => {
      const score = Math.tanh(0);
      expect(score).toBe(0);
    });

    it("tanh should be symmetric", () => {
      const pos = Math.tanh(0.2 * 3);
      const neg = Math.tanh(-0.2 * 3);
      expect(pos).toBeCloseTo(-neg, 5);
    });
  });

  describe("Price War Detection", () => {
    it("should detect when multiple teams price within 10% of each other", () => {
      const prices = [399, 389, 410, 395];
      const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;
      const threshold = avgPrice * 0.10;

      // Check if all prices are within 10% of average
      const withinThreshold = prices.every(
        (p) => Math.abs(p - avgPrice) <= threshold
      );
      expect(withinThreshold).toBe(true);
    });

    it("should not detect price war with widely spread prices", () => {
      const prices = [200, 500, 800, 1200];
      const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;
      const threshold = avgPrice * 0.10;

      const withinThreshold = prices.every(
        (p) => Math.abs(p - avgPrice) <= threshold
      );
      expect(withinThreshold).toBe(false);
    });
  });
});
