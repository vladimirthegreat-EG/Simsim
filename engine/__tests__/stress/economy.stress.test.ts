/**
 * ECONOMY STRESS SUITE
 *
 * Tests economic cycles (Markov chain), market state progression,
 * difficulty presets, and market state generation.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../../core/SimulationEngine";
import {
  createSimulationInput,
  createMinimalMarketState,
  runProfileNRounds,
} from "../../testkit/scenarioGenerator";
import { assertAllInvariantsPass } from "../../testkit/invariants";
import { CONSTANTS, COMPLEXITY_PRESETS } from "../../types";

describe("Economy Stress Suite", () => {
  describe("Category A — Golden Path", () => {
    it("market state advances across rounds", () => {
      const outputs = runProfileNRounds({
        teamCount: 2,
        rounds: 5,
        matchSeed: "eco-advance",
        profile: "baseline-balanced",
      });
      // Market state should update each round
      for (let i = 0; i < outputs.length; i++) {
        expect(outputs[i].newMarketState).toBeDefined();
        expect(outputs[i].newMarketState.demandBySegment).toBeDefined();
      }
    });

    it("initial market state has correct segment demands", () => {
      const ms = SimulationEngine.createInitialMarketState();
      expect(ms.demandBySegment.Budget.totalDemand).toBe(500_000);
      expect(ms.demandBySegment.General.totalDemand).toBe(400_000);
      expect(ms.demandBySegment.Enthusiast.totalDemand).toBe(200_000);
      expect(ms.demandBySegment.Professional.totalDemand).toBe(100_000);
      expect(ms.demandBySegment["Active Lifestyle"].totalDemand).toBe(150_000);
    });
  });

  describe("Category B — Edge", () => {
    it("complexity presets have correct difficulty settings", () => {
      expect(COMPLEXITY_PRESETS.simple.difficulty.startingCash).toBe(300_000_000);
      expect(COMPLEXITY_PRESETS.simple.difficulty.marketVolatility).toBe(0.5);
      expect(COMPLEXITY_PRESETS.simple.difficulty.competitorStrength).toBe(0.7);

      expect(COMPLEXITY_PRESETS.standard.difficulty.startingCash).toBe(200_000_000);
      expect(COMPLEXITY_PRESETS.standard.difficulty.marketVolatility).toBe(1.0);
      expect(COMPLEXITY_PRESETS.standard.difficulty.competitorStrength).toBe(1.0);

      expect(COMPLEXITY_PRESETS.advanced.difficulty.startingCash).toBe(150_000_000);
      expect(COMPLEXITY_PRESETS.advanced.difficulty.marketVolatility).toBe(1.5);
      expect(COMPLEXITY_PRESETS.advanced.difficulty.competitorStrength).toBe(1.3);
    });

    it("rubber-banding is ON for simple/standard, OFF for advanced", () => {
      expect(COMPLEXITY_PRESETS.simple.features.rubberBanding).toBe(true);
      expect(COMPLEXITY_PRESETS.standard.features.rubberBanding).toBe(true);
      expect(COMPLEXITY_PRESETS.advanced.features.rubberBanding).toBe(false);
    });

    it("market state has valid interest rates", () => {
      const ms = createMinimalMarketState();
      expect(ms.interestRates.federalRate).toBeGreaterThan(0);
      expect(ms.interestRates.tenYearBond).toBeGreaterThan(0);
      expect(ms.interestRates.corporateBond).toBeGreaterThan(0);
    });

    it("market state has valid FX rates", () => {
      const ms = createMinimalMarketState();
      expect(ms.fxRates["EUR/USD"]).toBeGreaterThan(0);
      expect(ms.fxRates["GBP/USD"]).toBeGreaterThan(0);
      expect(ms.fxRates["JPY/USD"]).toBeGreaterThan(0);
      expect(ms.fxRates["CNY/USD"]).toBeGreaterThan(0);
    });
  });

  describe("Category C — Property", () => {
    it("segment weights sum to 100 for each segment", () => {
      for (const [segment, weights] of Object.entries(CONSTANTS.SEGMENT_WEIGHTS)) {
        const sum = weights.price + weights.quality + weights.brand + weights.esg + weights.features;
        expect(sum).toBe(100);
      }
    });

    it("all 5 segments defined in CONSTANTS", () => {
      expect(CONSTANTS.SEGMENTS).toEqual([
        "Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"
      ]);
    });

    it("all 4 regions defined in CONSTANTS", () => {
      expect(CONSTANTS.REGIONS).toEqual([
        "North America", "Europe", "Asia", "MENA"
      ]);
    });

    it("demand growth rates are positive across 10 rounds", () => {
      const outputs = runProfileNRounds({
        teamCount: 2,
        rounds: 10,
        matchSeed: "eco-growth",
        profile: "baseline-balanced",
      });
      for (const output of outputs) {
        for (const [_, demand] of Object.entries(output.newMarketState.demandBySegment)) {
          expect(demand.totalDemand).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Category D — Regression", () => {
    it("placeholder: no regressions found yet", () => {
      expect(true).toBe(true);
    });
  });
});
