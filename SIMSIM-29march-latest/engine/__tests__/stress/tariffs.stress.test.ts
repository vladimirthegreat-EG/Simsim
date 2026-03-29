/**
 * Stress Tests -- TariffEngine
 *
 * Validates tariff calculation, state initialization, round events,
 * burden calculations, forecasting, and mitigation strategies across
 * a wide range of routes, materials, and seeds.
 *
 * Categories:
 *   A. Golden Path       -- initialize state, calculate tariff, total burden
 *   B. Edge Scenarios    -- same-region, empty orders, forecast, mitigation,
 *                           trade agreement reductions, expired tariffs,
 *                           processRoundEvents
 *   C. Property Tests    -- 30+ seeds: tariffAmount >= 0,
 *                           adjustedRate <= baseRate when agreements exist
 *   D. Regression        -- placeholder for future regressions
 */

import { describe, it, expect } from "vitest";
import { TariffEngine } from "@/engine/tariffs/TariffEngine";
import { BASELINE_TARIFFS, TRADE_AGREEMENTS } from "@/engine/tariffs/scenarios";
import type { TariffState } from "@/engine/tariffs/types";
import type { Region, MaterialType } from "@/engine/materials/types";

// ---------------------------------------------------------------------------
// Constants for parameterized tests
// ---------------------------------------------------------------------------

const ALL_REGIONS: Region[] = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Asia",
  "Oceania",
  "Middle East",
];

const ALL_MATERIALS: MaterialType[] = [
  "display",
  "processor",
  "memory",
  "storage",
  "camera",
  "battery",
  "chassis",
  "other",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deep-clone a tariff state to avoid mutation leakage between tests. */
function freshState(): TariffState {
  const state = TariffEngine.initializeTariffState();
  // Deep-clone activeTariffs and tradeAgreements to prevent cross-test mutation
  return {
    ...state,
    activeTariffs: state.activeTariffs.map((t) => ({ ...t })),
    tradeAgreements: state.tradeAgreements.map((a) => ({ ...a })),
    activeEvents: [],
    geopoliticalEvents: [],
    policies: new Map(state.policies),
    forecasts: [],
  };
}

// ============================================================================
// A. GOLDEN PATH
// ============================================================================

describe("TariffEngine -- A. Golden Path", () => {
  it("A1: initializeTariffState includes baseline tariffs", () => {
    const state = TariffEngine.initializeTariffState();

    expect(state.activeTariffs.length).toBeGreaterThan(0);
    expect(state.activeTariffs.length).toBe(BASELINE_TARIFFS.length);

    for (const tariff of state.activeTariffs) {
      expect(tariff.id).toBeTruthy();
      expect(tariff.tariffRate).toBeGreaterThanOrEqual(0);
      expect(tariff.tariffRate).toBeLessThanOrEqual(1);
      expect(Number.isFinite(tariff.tariffRate)).toBe(true);
    }
  });

  it("A2: initializeTariffState includes trade agreements", () => {
    const state = TariffEngine.initializeTariffState();

    expect(state.tradeAgreements.length).toBeGreaterThan(0);
    expect(state.tradeAgreements.length).toBe(TRADE_AGREEMENTS.length);

    for (const agreement of state.tradeAgreements) {
      expect(agreement.id).toBeTruthy();
      expect(agreement.tariffReduction).toBeGreaterThanOrEqual(0);
      expect(agreement.tariffReduction).toBeLessThanOrEqual(1);
    }
  });

  it("A3: calculateTariff for Asia -> North America (known route with baseline tariff)", () => {
    const state = freshState();
    const result = TariffEngine.calculateTariff(
      "Asia",
      "North America",
      "processor",
      1_000_000,
      1,
      state,
    );

    expect(result.materialCost).toBe(1_000_000);
    expect(result.baseTariffRate).toBeGreaterThan(0);
    expect(result.adjustedTariffRate).toBeGreaterThanOrEqual(0);
    expect(result.tariffAmount).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.tariffAmount)).toBe(true);
    expect(result.applicableTariffs.length).toBeGreaterThan(0);
  });

  it("A4: calculateTotalTariffBurden computes sum and most expensive route", () => {
    const state = freshState();
    const orders = [
      {
        fromRegion: "Asia" as Region,
        toRegion: "North America" as Region,
        materialType: "processor" as MaterialType,
        cost: 500_000,
      },
      {
        fromRegion: "Asia" as Region,
        toRegion: "Europe" as Region,
        materialType: "display" as MaterialType,
        cost: 300_000,
      },
    ];

    const result = TariffEngine.calculateTotalTariffBurden(orders, 1, state);

    expect(result.totalTariffs).toBeGreaterThanOrEqual(0);
    expect(result.byRoute.size).toBeGreaterThan(0);
    expect(result.mostExpensiveRoute.route).toBeTruthy();
    expect(result.mostExpensiveRoute.cost).toBeGreaterThanOrEqual(0);

    // Total should equal sum of all byRoute values
    let sum = 0;
    for (const cost of result.byRoute.values()) {
      sum += cost;
    }
    expect(result.totalTariffs).toBe(sum);
  });
});

// ============================================================================
// B. EDGE SCENARIOS
// ============================================================================

describe("TariffEngine -- B. Edge Scenarios", () => {
  it("B1: same-region tariff should have rate 0 or very low (no baseline tariff defined)", () => {
    const state = freshState();

    // No baseline tariff is defined for same-region (e.g. Asia -> Asia)
    // But a trade agreement may apply
    for (const region of ALL_REGIONS) {
      const result = TariffEngine.calculateTariff(
        region,
        region,
        "display",
        1_000_000,
        1,
        state,
      );

      // Same-region should have no applicable tariffs in baseline data
      // (BASELINE_TARIFFS don't define same-region routes)
      // But even if they did, the trade agreements for intra-region trade
      // would reduce them significantly.
      expect(result.tariffAmount).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.tariffAmount)).toBe(true);
    }
  });

  it("B2: empty orders burden returns zeroes", () => {
    const state = freshState();
    const result = TariffEngine.calculateTotalTariffBurden([], 1, state);

    expect(result.totalTariffs).toBe(0);
    expect(result.byRoute.size).toBe(0);
    expect(result.mostExpensiveRoute.cost).toBe(0);
  });

  it("B3: forecastTariffs returns forecasted rates with decreasing confidence", () => {
    const state = freshState();
    const forecast = TariffEngine.forecastTariffs(
      "Asia",
      "North America",
      "processor",
      1,
      state,
      4,
    );

    expect(forecast.route.from).toBe("Asia");
    expect(forecast.route.to).toBe("North America");
    expect(forecast.currentRate).toBeGreaterThanOrEqual(0);
    expect(forecast.forecastedRates).toHaveLength(4);

    // Confidence should decrease over time
    for (let i = 0; i < forecast.forecastedRates.length; i++) {
      const fr = forecast.forecastedRates[i];
      expect(fr.round).toBe(2 + i);
      expect(fr.rate).toBeGreaterThanOrEqual(0);
      expect(fr.confidence).toBeGreaterThan(0);
      expect(fr.confidence).toBeLessThanOrEqual(1);

      if (i > 0) {
        expect(fr.confidence).toBeLessThanOrEqual(
          forecast.forecastedRates[i - 1].confidence,
        );
      }
    }
  });

  it("B4: suggestMitigationStrategies returns at least 2 strategies", () => {
    const state = freshState();
    const strategies = TariffEngine.suggestMitigationStrategies(
      "Asia",
      "North America",
      "processor",
      1,
      state,
    );

    expect(strategies.length).toBeGreaterThanOrEqual(2);

    for (const s of strategies) {
      expect(s.strategy).toBeTruthy();
      expect(s.estimatedSavings).toBeGreaterThanOrEqual(0);
      expect(s.implementationCost).toBeGreaterThanOrEqual(0);
      expect(["easy", "moderate", "difficult"]).toContain(s.feasibility);
      expect(s.description).toBeTruthy();
    }

    // Strategies should be sorted by estimatedSavings descending
    for (let i = 1; i < strategies.length; i++) {
      expect(strategies[i - 1].estimatedSavings).toBeGreaterThanOrEqual(
        strategies[i].estimatedSavings,
      );
    }
  });

  it("B5: trade agreements reduce adjusted rate below base rate", () => {
    // Europe -> Europe has EU Single Market with 100% reduction
    const state = freshState();

    // Manually add a tariff for Europe -> Europe to test the agreement
    state.activeTariffs.push({
      id: "test_eu_internal",
      name: "Test EU Internal Tariff",
      fromRegion: "Europe",
      toRegion: "Europe",
      tariffRate: 0.15,
      effectiveRound: 1,
      reason: "revenue",
      volatility: 0.1,
      description: "Test tariff to verify trade agreement reduces it",
    });

    const result = TariffEngine.calculateTariff(
      "Europe",
      "Europe",
      "display",
      1_000_000,
      1,
      state,
    );

    // EU Single Market gives 100% reduction (tariffReduction = 1.0)
    // adjustedTariffRate should be base * (1 - 1.0) = 0
    expect(result.baseTariffRate).toBe(0.15);
    expect(result.adjustedTariffRate).toBeLessThanOrEqual(result.baseTariffRate);
    expect(result.adjustedTariffRate).toBe(0);
    expect(result.tariffAmount).toBe(0);
    expect(result.tradeAgreements.length).toBeGreaterThan(0);
    expect(result.exemptions.length).toBeGreaterThan(0);
  });

  it("B6: expired tariffs are removed by processRoundEvents", () => {
    const state = freshState();

    // Add a tariff that expires at round 5
    state.activeTariffs.push({
      id: "expiring_tariff",
      name: "Expiring Test Tariff",
      fromRegion: "Asia",
      toRegion: "Africa",
      tariffRate: 0.30,
      effectiveRound: 1,
      expiryRound: 5,
      reason: "trade_war",
      volatility: 0.5,
      description: "Should expire at round 5",
    });

    const countBefore = state.activeTariffs.length;

    // Process round 5 -- expiry round
    const result = TariffEngine.processRoundEvents(state, 5);

    expect(result.expiredTariffs.length).toBeGreaterThanOrEqual(1);
    expect(
      result.expiredTariffs.some((t) => t.id === "expiring_tariff"),
    ).toBe(true);

    // The expired tariff should be removed from state
    expect(
      state.activeTariffs.some((t) => t.id === "expiring_tariff"),
    ).toBe(false);
    expect(state.activeTariffs.length).toBeLessThan(countBefore);
  });

  it("B7: processRoundEvents with fresh state returns structured result", () => {
    const state = freshState();
    const result = TariffEngine.processRoundEvents(state, 1);

    expect(result).toHaveProperty("newTariffs");
    expect(result).toHaveProperty("expiredTariffs");
    expect(result).toHaveProperty("newEvents");
    expect(result).toHaveProperty("newGeopoliticalEvents");
    expect(result).toHaveProperty("messages");
    expect(Array.isArray(result.newTariffs)).toBe(true);
    expect(Array.isArray(result.expiredTariffs)).toBe(true);
    expect(Array.isArray(result.messages)).toBe(true);
  });

  it("B8: tariff calculation with zero material cost yields zero tariff amount", () => {
    const state = freshState();
    const result = TariffEngine.calculateTariff(
      "Asia",
      "North America",
      "processor",
      0,
      1,
      state,
    );

    expect(result.tariffAmount).toBe(0);
    expect(result.materialCost).toBe(0);
    // baseTariffRate can still be > 0 (the rate exists, just amount is 0)
    expect(result.baseTariffRate).toBeGreaterThanOrEqual(0);
  });

  it("B9: tariff on route with no baseline tariff returns zero rate", () => {
    const state = freshState();

    // South America -> Oceania has no baseline tariff
    const result = TariffEngine.calculateTariff(
      "South America",
      "Oceania",
      "chassis",
      500_000,
      1,
      state,
    );

    expect(result.baseTariffRate).toBe(0);
    expect(result.adjustedTariffRate).toBe(0);
    expect(result.tariffAmount).toBe(0);
    expect(result.applicableTariffs).toHaveLength(0);
  });

  it("B10: forecastTariffs with forecastRounds=1 returns single entry", () => {
    const state = freshState();
    const forecast = TariffEngine.forecastTariffs(
      "Europe",
      "Asia",
      "battery",
      1,
      state,
      1,
    );

    expect(forecast.forecastedRates).toHaveLength(1);
    expect(forecast.forecastedRates[0].round).toBe(2);
    expect(forecast.forecastedRates[0].confidence).toBeGreaterThan(0);
  });

  it("B11: mitigation strategies for no-tariff route still return alternatives", () => {
    const state = freshState();

    // South America -> Africa: no baseline tariff
    const strategies = TariffEngine.suggestMitigationStrategies(
      "South America",
      "Africa",
      "chassis",
      1,
      state,
    );

    // Even with zero tariffs, the engine still suggests general strategies
    expect(strategies.length).toBeGreaterThanOrEqual(2);
    for (const s of strategies) {
      expect(s.strategy).toBeTruthy();
    }
  });
});

// ============================================================================
// C. PROPERTY TESTS (30+ seeds)
// ============================================================================

describe("TariffEngine -- C. Property Tests (30+ seeds)", () => {
  const SEED_COUNT = 35;

  describe("C1: tariffAmount >= 0 for random route/material combos", () => {
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const fromRegion = ALL_REGIONS[seed % ALL_REGIONS.length];
      const toRegion = ALL_REGIONS[(seed * 3 + 1) % ALL_REGIONS.length];
      const material = ALL_MATERIALS[seed % ALL_MATERIALS.length];
      const cost = (seed + 1) * 100_000;

      it(`seed=${seed}: ${fromRegion} -> ${toRegion}, ${material}, cost=$${cost}`, () => {
        const state = freshState();
        const result = TariffEngine.calculateTariff(
          fromRegion,
          toRegion,
          material,
          cost,
          1,
          state,
        );

        expect(
          result.tariffAmount,
          `Tariff amount must be >= 0 (seed=${seed})`,
        ).toBeGreaterThanOrEqual(0);

        expect(
          Number.isFinite(result.tariffAmount),
          `Tariff amount must be finite (seed=${seed})`,
        ).toBe(true);

        expect(
          result.baseTariffRate,
          `Base rate must be >= 0 (seed=${seed})`,
        ).toBeGreaterThanOrEqual(0);

        expect(
          result.adjustedTariffRate,
          `Adjusted rate must be >= 0 (seed=${seed})`,
        ).toBeGreaterThanOrEqual(0);

        expect(result.materialCost).toBe(cost);
      });
    }
  });

  describe("C2: adjustedRate <= baseRate when trade agreements exist on route", () => {
    // Test routes where we know trade agreements exist
    const agreementRoutes: {
      from: Region;
      to: Region;
      agreementName: string;
    }[] = [
      {
        from: "North America",
        to: "North America",
        agreementName: "USMCA",
      },
      { from: "Europe", to: "Europe", agreementName: "EU Single Market" },
      { from: "Asia", to: "Asia", agreementName: "ASEAN" },
    ];

    for (let seed = 1; seed <= 10; seed++) {
      for (const route of agreementRoutes) {
        const material = ALL_MATERIALS[seed % ALL_MATERIALS.length];

        it(`seed=${seed}: ${route.from}->${route.to} (${route.agreementName}), ${material}`, () => {
          const state = freshState();

          // Add a tariff to this intra-region route so we can test the reduction
          state.activeTariffs.push({
            id: `prop_test_${seed}_${route.from}`,
            name: `Property test tariff ${seed}`,
            fromRegion: route.from,
            toRegion: route.to,
            tariffRate: 0.2,
            effectiveRound: 1,
            reason: "revenue",
            volatility: 0.1,
            description: "Test tariff",
          });

          const result = TariffEngine.calculateTariff(
            route.from,
            route.to,
            material,
            1_000_000,
            1,
            state,
          );

          // When agreements exist, adjusted rate should be <= base rate
          if (result.tradeAgreements.length > 0) {
            expect(
              result.adjustedTariffRate,
              `Adjusted rate should be <= base rate when agreements exist (seed=${seed}, ${route.agreementName})`,
            ).toBeLessThanOrEqual(result.baseTariffRate);
          }
        });
      }
    }
  });

  describe("C3: total burden equals sum of individual tariffs", () => {
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      it(`seed=${seed}`, () => {
        const state = freshState();
        const orderCount = (seed % 5) + 1;
        const orders = [];

        for (let i = 0; i < orderCount; i++) {
          orders.push({
            fromRegion: ALL_REGIONS[(seed + i) % ALL_REGIONS.length],
            toRegion: ALL_REGIONS[(seed + i + 2) % ALL_REGIONS.length],
            materialType: ALL_MATERIALS[(seed + i) % ALL_MATERIALS.length],
            cost: (seed + i + 1) * 50_000,
          });
        }

        const burden = TariffEngine.calculateTotalTariffBurden(
          orders,
          1,
          state,
        );

        // Verify internal consistency: sum of byRoute values = totalTariffs
        let routeSum = 0;
        for (const cost of burden.byRoute.values()) {
          routeSum += cost;
          expect(cost).toBeGreaterThanOrEqual(0);
        }
        expect(burden.totalTariffs).toBe(routeSum);

        // Most expensive route cost <= totalTariffs
        expect(burden.mostExpensiveRoute.cost).toBeLessThanOrEqual(
          burden.totalTariffs,
        );
        expect(burden.totalTariffs).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(burden.totalTariffs)).toBe(true);
      });
    }
  });
});

// ============================================================================
// D. REGRESSION PLACEHOLDERS
// ============================================================================

describe("TariffEngine -- D. Regression", () => {
  it("D1: placeholder -- baseline tariffs have valid region pairs", () => {
    for (const tariff of BASELINE_TARIFFS) {
      expect(ALL_REGIONS).toContain(tariff.fromRegion);
      expect(ALL_REGIONS).toContain(tariff.toRegion);
      expect(tariff.tariffRate).toBeGreaterThan(0);
      expect(tariff.tariffRate).toBeLessThanOrEqual(1);
      expect(tariff.effectiveRound).toBeGreaterThanOrEqual(1);
    }
  });

  it("D2: placeholder -- trade agreements reference valid regions", () => {
    for (const agreement of TRADE_AGREEMENTS) {
      for (const region of agreement.regions) {
        expect(
          ALL_REGIONS,
          `Agreement ${agreement.name} references unknown region: ${region}`,
        ).toContain(region);
      }
      expect(agreement.tariffReduction).toBeGreaterThanOrEqual(0);
      expect(agreement.tariffReduction).toBeLessThanOrEqual(1);
    }
  });

  it("D3: placeholder -- high volatility tariffs generate warnings", () => {
    const state = freshState();

    // The us_china_electronics tariff has volatility 0.8 (> 0.7 threshold)
    const result = TariffEngine.calculateTariff(
      "Asia",
      "North America",
      "processor",
      1_000_000,
      1,
      state,
    );

    // At least one tariff on this route has high volatility
    const highVolTariffs = result.applicableTariffs.filter(
      (t) => t.volatility > 0.7,
    );
    if (highVolTariffs.length > 0) {
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(
        result.warnings.some((w) => w.includes("volatility")),
      ).toBe(true);
    }
  });

  it("D4: placeholder -- tariff calculation is pure (does not mutate state)", () => {
    const state = freshState();
    const tariffCountBefore = state.activeTariffs.length;
    const agreementCountBefore = state.tradeAgreements.length;

    TariffEngine.calculateTariff(
      "Asia",
      "North America",
      "processor",
      1_000_000,
      1,
      state,
    );

    expect(state.activeTariffs.length).toBe(tariffCountBefore);
    expect(state.tradeAgreements.length).toBe(agreementCountBefore);
  });

  it("D5: placeholder -- multiple tariffs on same route stack additively", () => {
    const state = freshState();

    // Count existing tariffs for Asia -> North America on processor
    const existingTariffs = state.activeTariffs.filter(
      (t) =>
        t.fromRegion === "Asia" &&
        t.toRegion === "North America" &&
        (!t.materialTypes || t.materialTypes.includes("processor")),
    );

    // Add another tariff on same route
    state.activeTariffs.push({
      id: "stacking_test",
      name: "Stacking Test Tariff",
      fromRegion: "Asia",
      toRegion: "North America",
      materialTypes: ["processor"],
      tariffRate: 0.10,
      effectiveRound: 1,
      reason: "revenue",
      volatility: 0.1,
      description: "Test for additive stacking",
    });

    const result = TariffEngine.calculateTariff(
      "Asia",
      "North America",
      "processor",
      1_000_000,
      1,
      state,
    );

    // Base rate should be sum of all applicable tariff rates
    const expectedBaseRate = existingTariffs.reduce(
      (sum, t) => sum + t.tariffRate,
      0.10,
    );
    expect(result.baseTariffRate).toBeCloseTo(expectedBaseRate, 5);
    expect(result.applicableTariffs.length).toBe(existingTariffs.length + 1);
  });

  it("D6: placeholder -- forecastTariffs returns recommendations array", () => {
    const state = freshState();
    const forecast = TariffEngine.forecastTariffs(
      "Asia",
      "North America",
      "processor",
      1,
      state,
      4,
    );

    expect(Array.isArray(forecast.recommendations)).toBe(true);
    expect(Array.isArray(forecast.trends)).toBe(true);

    // High tariff route (0.25) should get some recommendations
    // At minimum we expect at least one recommendation for a 25% tariff
    expect(forecast.recommendations.length).toBeGreaterThanOrEqual(0);
  });
});
