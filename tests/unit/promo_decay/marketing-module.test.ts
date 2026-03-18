/**
 * Unit tests for MarketingModule static calculation methods.
 */

import { MarketingModule } from "@/engine/modules/MarketingModule";
import { CONSTANTS, fresh_company_state } from "../setup";
import type { Segment } from "@/engine/types/factory";

// ---------------------------------------------------------------------------
// calculateAdvertisingImpact
// ---------------------------------------------------------------------------

describe("calculateAdvertisingImpact", () => {
  it("returns base impact for $1M General spend", () => {
    // 1 × 0.0011 × 1.0 × 1.0 = 0.0011
    const impact = MarketingModule.calculateAdvertisingImpact(1_000_000, "General");
    expect(impact).toBeCloseTo(0.0011, 6);
  });

  it("returns linear impact for a full $2M chunk (no decay yet)", () => {
    // First chunk: 2 × 0.0011 × 1.0 = 0.0022
    const impact = MarketingModule.calculateAdvertisingImpact(2_000_000, "General");
    expect(impact).toBeCloseTo(0.0022, 6);
  });

  it("applies 15% decay on the second $2M chunk", () => {
    // Chunk 1 ($2M): 2 × 0.0011 × 1.0 = 0.0022
    // Chunk 2 ($2M): 2 × 0.0011 × 0.85 = 0.00187
    const expected = 0.0022 + 2 * 0.0011 * 0.85;
    const impact = MarketingModule.calculateAdvertisingImpact(4_000_000, "General");
    expect(impact).toBeCloseTo(expected, 6);
  });

  it("Budget multiplier (1.1) yields higher impact than General (1.0)", () => {
    const budget = MarketingModule.calculateAdvertisingImpact(1_000_000, "Budget");
    const general = MarketingModule.calculateAdvertisingImpact(1_000_000, "General");
    expect(budget).toBeGreaterThan(general);
  });

  it("Professional multiplier (0.5) yields lower impact than General (1.0)", () => {
    const pro = MarketingModule.calculateAdvertisingImpact(1_000_000, "Professional");
    const general = MarketingModule.calculateAdvertisingImpact(1_000_000, "General");
    expect(pro).toBeLessThan(general);
  });

  it("exhibits diminishing returns — $10M impact < 10× $1M impact", () => {
    const single = MarketingModule.calculateAdvertisingImpact(1_000_000, "General");
    const bulk = MarketingModule.calculateAdvertisingImpact(10_000_000, "General");
    expect(bulk).toBeLessThan(single * 10);
  });
});

// ---------------------------------------------------------------------------
// calculateBrandingImpact
// ---------------------------------------------------------------------------

describe("calculateBrandingImpact", () => {
  it("returns linear impact for $1M", () => {
    // 1 × 0.003 = 0.003
    const impact = MarketingModule.calculateBrandingImpact(1_000_000);
    expect(impact).toBeCloseTo(0.003, 6);
  });

  it("returns linear impact at the threshold ($2M)", () => {
    // 2 × 0.003 = 0.006
    const impact = MarketingModule.calculateBrandingImpact(2_000_000);
    expect(impact).toBeCloseTo(0.006, 6);
  });

  it("applies logarithmic scaling above $2M", () => {
    // base = 0.006
    // extra = $2M → extraMillions = 2, extraReturn = 0.003 × 1.5 × log2(1 + 2/2) = 0.0045 × log2(2) = 0.0045
    // total = 0.006 + 0.0045 = 0.0105
    const impact = MarketingModule.calculateBrandingImpact(4_000_000);
    expect(impact).toBeCloseTo(0.0105, 6);
  });
});

// ---------------------------------------------------------------------------
// calculateBrandAwarenessBySegment
// ---------------------------------------------------------------------------

describe("calculateBrandAwarenessBySegment", () => {
  const zeroShare: Record<Segment, number> = {
    "Budget": 0, "General": 0, "Enthusiast": 0, "Professional": 0, "Active Lifestyle": 0,
  };
  const zeroAds: Record<Segment, number> = {
    "Budget": 0, "General": 0, "Enthusiast": 0, "Professional": 0, "Active Lifestyle": 0,
  };

  it("returns near-zero awareness with zero brand, ads, and share", () => {
    const awareness = MarketingModule.calculateBrandAwarenessBySegment(0, zeroShare, zeroAds);
    for (const segment of CONSTANTS.SEGMENTS) {
      expect(awareness[segment]).toBeCloseTo(0, 4);
    }
  });

  it("returns 0.5 for all segments when brandValue=1.0, no ads, no share", () => {
    const awareness = MarketingModule.calculateBrandAwarenessBySegment(1.0, zeroShare, zeroAds);
    for (const segment of CONSTANTS.SEGMENTS) {
      expect(awareness[segment]).toBeCloseTo(0.5, 4);
    }
  });

  it("caps awareness at 1.0", () => {
    const highShare: Record<Segment, number> = {
      "Budget": 5, "General": 5, "Enthusiast": 5, "Professional": 5, "Active Lifestyle": 5,
    };
    const awareness = MarketingModule.calculateBrandAwarenessBySegment(1.0, highShare, zeroAds);
    for (const segment of CONSTANTS.SEGMENTS) {
      expect(awareness[segment]).toBeLessThanOrEqual(1.0);
    }
  });
});

// ---------------------------------------------------------------------------
// calculatePromotionImpact
// ---------------------------------------------------------------------------

describe("calculatePromotionImpact", () => {
  it("calculates 10% off Budget at brand=0", () => {
    // salesBoost = min(0.30, 0.1 × 2.5 × 1.0) = 0.25 // POST-FIX: cap was 0.75, now 0.30
    const result = MarketingModule.calculatePromotionImpact(10, "Budget", 0);
    expect(result.salesBoost).toBeCloseTo(0.25);
    expect(result.marginReduction).toBeCloseTo(0.1);
  });

  it("calculates 10% off Professional at brand=0", () => {
    // salesBoost = min(0.30, 0.1 × 0.8 × 1.0) = 0.08 // POST-FIX: cap was 0.75, now 0.30
    const result = MarketingModule.calculatePromotionImpact(10, "Professional", 0);
    expect(result.salesBoost).toBeCloseTo(0.08);
    expect(result.marginReduction).toBeCloseTo(0.1);
  });

  it("caps salesBoost at MAX_PROMOTION_SALES_BOOST (0.30)", () => { // POST-FIX: was 0.75
    // 50% off Budget: 0.5 × 2.5 × 1.0 = 1.25 → capped at 0.30
    const result = MarketingModule.calculatePromotionImpact(50, "Budget", 0);
    expect(result.salesBoost).toBe(0.30); // POST-FIX: was 0.75
  });

  it("factors in brand value", () => {
    // 10% off General, brand=1.0: 0.1 × 1.8 × 2.0 = 0.36 → capped at 0.30
    const result = MarketingModule.calculatePromotionImpact(10, "General", 1.0);
    expect(result.salesBoost).toBeCloseTo(0.30); // POST-FIX: was 0.36, now capped at 0.30
  });
});

// ---------------------------------------------------------------------------
// Brand decay & growth cap (tested via process)
// ---------------------------------------------------------------------------

describe("brand decay and growth cap via process", () => {
  it("decays brand value when no marketing spend is made", () => {
    const state = fresh_company_state({ brandValue: 0.5 });
    const { newState } = MarketingModule.process(state, {
      advertisingBudget: {},
      brandingInvestment: 0,
      promotions: [],
      productPricing: [],
    });

    // Expected: 0.5 - 0.5 × 0.08 = 0.46 // POST-FIX: BRAND_DECAY_RATE was 0.012, now 0.08
    const expectedDecay = 0.5 * CONSTANTS.BRAND_DECAY_RATE;
    expect(newState.brandValue).toBeCloseTo(0.5 - expectedDecay, 4);
  });

  it("caps brand growth at BRAND_MAX_GROWTH_PER_ROUND (0.04)", () => {
    const state = fresh_company_state({ brandValue: 0.3, cash: 500_000_000 });

    // Massive advertising spend to exceed the 4% cap
    const advertisingBudget: Record<string, number> = {};
    for (const seg of CONSTANTS.SEGMENTS) {
      advertisingBudget[seg] = 50_000_000;
    }

    const { newState } = MarketingModule.process(state, {
      advertisingBudget: advertisingBudget as Record<Segment, number>,
      brandingInvestment: 50_000_000,
      promotions: [],
      productPricing: [],
    });

    // Growth capped at 0.04, then decay applied: (0.3 + 0.04) × (1 - 0.08) // POST-FIX: BRAND_DECAY_RATE was 0.012, now 0.08
    const afterGrowth = 0.3 + CONSTANTS.BRAND_MAX_GROWTH_PER_ROUND;
    const afterDecay = afterGrowth - afterGrowth * CONSTANTS.BRAND_DECAY_RATE;
    expect(newState.brandValue).toBeCloseTo(afterDecay, 4);
  });
});
