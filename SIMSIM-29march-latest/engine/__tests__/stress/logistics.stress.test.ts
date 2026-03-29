/**
 * Stress Tests -- LogisticsEngine
 *
 * Categories:
 *   A. Golden Path   (3 tests)   -- basic route calculation, compare options
 *   B. Edge Scenarios (8 tests)  -- zero weight/volume, large weight, tracking stages,
 *                                   disruptions, same-region shipping
 *   C. Property Tests (50 seeds) -- seeded route/method combos with try-catch for
 *                                   unavailable routes, plus full simulations
 *   D. Regression     (1 placeholder)
 *
 * Total: ~62 tests
 */

import { describe, it, expect } from "vitest";
import {
  createTeamState,
  createMarketState,
  createDecisions,
  runSimulation,
  assertNoNaN,
  assertAllInvariants,
} from "@/engine/testkit";
import { LogisticsEngine } from "@/engine/logistics/LogisticsEngine";
import type { Region } from "@/engine/materials/types";
import type {
  ShippingMethod,
  LogisticsCalculation,
  LogisticsDisruption,
  ShipmentDelay,
} from "@/engine/logistics/types";

// ---------------------------------------------------------------------------
// Helpers
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

const ALL_METHODS: ShippingMethod[] = ["sea", "air", "land", "rail"];

/**
 * Try to calculate logistics, returning null on route/method errors.
 */
function tryCalcLogistics(
  from: Region,
  to: Region,
  method: ShippingMethod,
  weight: number,
  volume: number,
  productionTime: number,
): LogisticsCalculation | null {
  try {
    return LogisticsEngine.calculateLogistics(from, to, method, weight, volume, productionTime);
  } catch {
    return null;
  }
}

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces the next float in [0, 1).
 */
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===========================================================================
// A. Golden Path
// ===========================================================================

describe("LogisticsEngine -- A. Golden Path", () => {
  it("A-1: Asia -> North America sea shipping returns a valid calculation", () => {
    const calc = LogisticsEngine.calculateLogistics(
      "Asia",
      "North America",
      "sea",
      10,  // 10 tons
      200, // 200 cubic meters
      20,  // 20 days production
    );

    // Basic shape
    expect(calc.shippingMethod).toBe("sea");
    expect(calc.weight).toBe(10);
    expect(calc.volume).toBe(200);
    expect(calc.productionTime).toBe(20);

    // Times must be positive
    expect(calc.shippingTime).toBeGreaterThan(0);
    expect(calc.totalLeadTime).toBeGreaterThan(0);

    // Costs must be non-negative
    expect(calc.shippingCost).toBeGreaterThan(0);
    expect(calc.clearanceCost).toBeGreaterThan(0);
    expect(calc.insuranceCost).toBeGreaterThanOrEqual(0);
    expect(calc.handlingCost).toBeGreaterThanOrEqual(0);
    expect(calc.totalLogisticsCost).toBeGreaterThan(0);

    // Risk
    expect(calc.onTimeProbability).toBeGreaterThan(0);
    expect(calc.onTimeProbability).toBeLessThanOrEqual(1);
    expect(calc.lossRisk).toBeGreaterThanOrEqual(0);
    expect(calc.lossRisk).toBeLessThan(1);
  });

  it("A-2: compareShippingOptions returns sorted results for Europe -> Asia", () => {
    const options = LogisticsEngine.compareShippingOptions(
      "Europe",
      "Asia",
      5,   // tons
      100, // m^3
      10,  // production days
    );

    expect(options.length).toBeGreaterThan(0);

    // Results should be sorted descending by overallScore
    for (let i = 1; i < options.length; i++) {
      expect(options[i - 1].overallScore).toBeGreaterThanOrEqual(options[i].overallScore);
    }

    // Every entry must have the expected shape
    for (const opt of options) {
      expect(ALL_METHODS).toContain(opt.method);
      expect(opt.costEfficiency).toBeGreaterThanOrEqual(0);
      expect(opt.costEfficiency).toBeLessThanOrEqual(100);
      expect(opt.timeEfficiency).toBeGreaterThanOrEqual(0);
      expect(opt.timeEfficiency).toBeLessThanOrEqual(100);
      expect(opt.logistics.totalLogisticsCost).toBeGreaterThan(0);
    }
  });

  it("A-3: air shipping is faster but more expensive than sea for the same route", () => {
    const sea = tryCalcLogistics("Asia", "Europe", "sea", 5, 100, 10);
    const air = tryCalcLogistics("Asia", "Europe", "air", 5, 100, 10);

    // Both methods should be available on this major trade route
    expect(sea).not.toBeNull();
    expect(air).not.toBeNull();

    if (sea && air) {
      expect(air.shippingTime).toBeLessThan(sea.shippingTime);
      expect(air.totalLogisticsCost).toBeGreaterThan(sea.totalLogisticsCost);
    }
  });
});

// ===========================================================================
// B. Edge Scenarios
// ===========================================================================

describe("LogisticsEngine -- B. Edge Scenarios", () => {
  it("B-1: zero weight produces a valid (minimal) calculation", () => {
    const calc = tryCalcLogistics("Asia", "North America", "sea", 0, 200, 10);
    expect(calc).not.toBeNull();
    if (calc) {
      expect(Number.isFinite(calc.totalLogisticsCost)).toBe(true);
      expect(Number.isFinite(calc.shippingTime)).toBe(true);
      expect(calc.handlingCost).toBe(0); // 0 weight * rate = 0
    }
  });

  it("B-2: zero volume produces a valid calculation", () => {
    const calc = tryCalcLogistics("Asia", "North America", "air", 5, 0, 10);
    expect(calc).not.toBeNull();
    if (calc) {
      expect(Number.isFinite(calc.totalLogisticsCost)).toBe(true);
      expect(Number.isFinite(calc.shippingCost)).toBe(true);
    }
  });

  it("B-3: very large weight (100,000 tons) stays finite", () => {
    const calc = tryCalcLogistics("Europe", "Africa", "sea", 100_000, 500_000, 10);
    expect(calc).not.toBeNull();
    if (calc) {
      expect(Number.isFinite(calc.totalLogisticsCost)).toBe(true);
      expect(Number.isFinite(calc.shippingCost)).toBe(true);
      expect(Number.isFinite(calc.handlingCost)).toBe(true);
      expect(calc.totalLogisticsCost).toBeGreaterThan(0);
    }
  });

  it("B-4: trackShipment returns correct status at different progress stages", () => {
    const orderId = "test-order-tracking";
    const from: Region = "Asia";
    const to: Region = "North America";
    const orderRound = 1;
    const arrivalRound = 11; // 10 rounds total
    const delays: ShipmentDelay[] = [];

    // Progress < 0.2 => "origin"
    const atOrigin = LogisticsEngine.trackShipment(orderId, 2, orderRound, arrivalRound, from, to, delays);
    expect(atOrigin.currentStatus).toBe("origin");

    // Progress 0.2-0.7 => "in_transit"
    const inTransit = LogisticsEngine.trackShipment(orderId, 5, orderRound, arrivalRound, from, to, delays);
    expect(inTransit.currentStatus).toBe("in_transit");

    // Progress 0.7-0.9 => "customs"
    const atCustoms = LogisticsEngine.trackShipment(orderId, 9, orderRound, arrivalRound, from, to, delays);
    expect(atCustoms.currentStatus).toBe("customs");

    // Progress 0.9-1.0 => "inspection"
    const inspection = LogisticsEngine.trackShipment(orderId, 10, orderRound, arrivalRound, from, to, delays);
    expect(inspection.currentStatus).toBe("inspection");

    // Progress >= 1.0 => "delivery"
    const delivered = LogisticsEngine.trackShipment(orderId, 12, orderRound, arrivalRound, from, to, delays);
    expect(delivered.currentStatus).toBe("delivery");
  });

  it("B-5: trackShipment includes delay events in the event list", () => {
    const delays: ShipmentDelay[] = [
      { reason: "weather", delayDays: 3, additionalCost: 500, round: 4 },
      { reason: "port_congestion", delayDays: 2, additionalCost: 300, round: 6 },
    ];

    const tracking = LogisticsEngine.trackShipment(
      "delayed-order",
      7,
      1,
      11,
      "Asia",
      "Europe",
      delays,
    );

    // Events should include delay entries
    const delayEvents = tracking.events.filter((e) => e.type === "delayed");
    expect(delayEvents.length).toBe(2);

    // Events should be sorted by round
    for (let i = 1; i < tracking.events.length; i++) {
      expect(tracking.events[i].round).toBeGreaterThanOrEqual(tracking.events[i - 1].round);
    }
  });

  it("B-6: applyDisruption increases costs when route and method match", () => {
    const calc = LogisticsEngine.calculateLogistics(
      "Asia",
      "North America",
      "sea",
      10,
      200,
      10,
    );

    const disruption: LogisticsDisruption = {
      id: "test-disruption",
      type: "port_strike",
      affectedRoutes: [calc.route.id],
      affectedMethods: ["sea"],
      duration: 3,
      delayMultiplier: 1.5,
      costMultiplier: 1.8,
      description: "Port workers on strike",
    };

    const disrupted = LogisticsEngine.applyDisruption(calc, disruption);

    expect(disrupted.shippingCost).toBeGreaterThan(calc.shippingCost);
    expect(disrupted.totalLogisticsCost).toBeGreaterThan(calc.totalLogisticsCost);
    expect(disrupted.shippingTime).toBeGreaterThanOrEqual(calc.shippingTime);
    expect(disrupted.onTimeProbability).toBeLessThan(calc.onTimeProbability);
  });

  it("B-7: applyDisruption does NOT modify calculation when route does not match", () => {
    const calc = LogisticsEngine.calculateLogistics(
      "Asia",
      "North America",
      "sea",
      10,
      200,
      10,
    );

    const disruption: LogisticsDisruption = {
      id: "unrelated-disruption",
      type: "weather",
      affectedRoutes: ["europe_to_africa"], // wrong route
      affectedMethods: ["sea"],
      duration: 2,
      delayMultiplier: 2.0,
      costMultiplier: 2.0,
      description: "Storm in Mediterranean",
    };

    const result = LogisticsEngine.applyDisruption(calc, disruption);
    expect(result.shippingCost).toBe(calc.shippingCost);
    expect(result.totalLogisticsCost).toBe(calc.totalLogisticsCost);
    expect(result.shippingTime).toBe(calc.shippingTime);
  });

  it("B-8: same-region shipping throws (no route defined)", () => {
    for (const region of ALL_REGIONS) {
      expect(() =>
        LogisticsEngine.calculateLogistics(region, region, "land", 5, 50, 10),
      ).toThrow();
    }
  });
});

// ===========================================================================
// C. Property Tests
// ===========================================================================

describe("LogisticsEngine -- C. Property Tests (seeded route/method combos)", () => {
  // C-1..C-30: Randomised route/method combos
  for (let seed = 1; seed <= 30; seed++) {
    it(`C-${seed}: seed=${seed} -- random route + method produces valid or expected error`, () => {
      const rng = seededRng(seed);

      const fromIdx = Math.floor(rng() * ALL_REGIONS.length);
      const toIdx = Math.floor(rng() * ALL_REGIONS.length);
      const methodIdx = Math.floor(rng() * ALL_METHODS.length);
      const weight = Math.floor(rng() * 1000) + 1;   // 1-1000 tons
      const volume = Math.floor(rng() * 5000) + 1;    // 1-5000 m^3
      const prodTime = Math.floor(rng() * 30);         // 0-29 days

      const from = ALL_REGIONS[fromIdx];
      const to = ALL_REGIONS[toIdx];
      const method = ALL_METHODS[methodIdx];

      const calc = tryCalcLogistics(from, to, method, weight, volume, prodTime);

      if (from === to) {
        // Same region -- no route should exist
        expect(calc).toBeNull();
        return;
      }

      if (calc === null) {
        // Route or method unavailable -- acceptable
        return;
      }

      // If we got a calculation, validate invariants
      expect(Number.isFinite(calc.totalLogisticsCost)).toBe(true);
      expect(Number.isFinite(calc.totalLeadTime)).toBe(true);
      expect(Number.isFinite(calc.onTimeProbability)).toBe(true);
      expect(Number.isFinite(calc.lossRisk)).toBe(true);

      expect(calc.totalLogisticsCost).toBeGreaterThanOrEqual(0);
      expect(calc.totalLeadTime).toBeGreaterThanOrEqual(0);
      expect(calc.onTimeProbability).toBeGreaterThan(0);
      expect(calc.onTimeProbability).toBeLessThanOrEqual(1);
      expect(calc.lossRisk).toBeGreaterThanOrEqual(0);
      expect(calc.lossRisk).toBeLessThan(1);

      // Total cost should be the sum of its parts
      const expectedTotal = calc.shippingCost + calc.clearanceCost + calc.insuranceCost + calc.handlingCost;
      expect(calc.totalLogisticsCost).toBe(expectedTotal);
    });
  }

  // C-31..C-50: Full seeded simulations with invariant checks
  for (let seed = 31; seed <= 50; seed++) {
    it(`C-${seed}: seed=${seed} -- full simulation produces no NaN and passes all invariants`, () => {
      const result = runSimulation({
        teamCount: 2,
        rounds: 3,
        seed: `logistics-stress-${seed}`,
        profile: "baseline-balanced",
      });

      for (const state of result.finalStates) {
        assertNoNaN(state);
        assertAllInvariants(state);
      }
    });
  }
});

// ===========================================================================
// D. Regression Placeholders
// ===========================================================================

describe("LogisticsEngine -- D. Regression", () => {
  it("D-1: placeholder -- add regression tests as bugs are discovered", () => {
    // This test exists as a reminder / anchor point.
    // When a logistics-related bug is fixed, add a deterministic repro here.
    expect(true).toBe(true);
  });
});
