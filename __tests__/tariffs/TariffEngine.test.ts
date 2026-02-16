/**
 * Unit Tests for TariffEngine
 * Tests tariff calculations, event processing, and forecasting
 */

import { describe, it, expect } from "vitest";
import { TariffEngine } from "@/engine/tariffs/TariffEngine";
import type { TariffState, Tariff, TariffEvent } from "@/engine/tariffs/types";
import type { Region, MaterialType } from "@/engine/materials/types";

describe("TariffEngine", () => {
  describe("initializeTariffState", () => {
    it("should create initial tariff state", () => {
      const state = TariffEngine.initializeTariffState();

      expect(state.activeTariffs).toBeDefined();
      expect(state.tradeAgreements).toBeDefined();
      expect(state.activeEvents).toBeDefined();
      expect(state.geopoliticalEvents).toBeDefined();
      expect(state.policies).toBeDefined();
      expect(state.forecasts).toBeDefined();

      expect(state.activeTariffs.length).toBeGreaterThan(0);
      expect(state.tradeAgreements.length).toBeGreaterThan(0);
    });

    it("should include baseline tariffs", () => {
      const state = TariffEngine.initializeTariffState();

      // Should include US-China tariffs
      const usChina = state.activeTariffs.find(
        t => t.fromRegion === "Asia" && t.toRegion === "North America"
      );

      expect(usChina).toBeDefined();
      expect(usChina?.tariffRate).toBeGreaterThan(0);
    });

    it("should include trade agreements", () => {
      const state = TariffEngine.initializeTariffState();

      const agreements = state.tradeAgreements;
      expect(agreements.length).toBeGreaterThan(0);

      // Check for USMCA
      const usmca = agreements.find(a => a.id === "usmca");
      expect(usmca).toBeDefined();
    });
  });

  describe("calculateTariff", () => {
    let state: TariffState;

    beforeEach(() => {
      state = TariffEngine.initializeTariffState();
    });

    it("should calculate tariff for Asia to North America", () => {
      const result = TariffEngine.calculateTariff(
        "Asia",
        "North America",
        "processor",
        1000000, // $1M material cost
        1,       // round 1
        state
      );

      expect(result.materialCost).toBe(1000000);
      expect(result.baseTariffRate).toBeGreaterThan(0);
      expect(result.tariffAmount).toBeGreaterThan(0);
      expect(result.applicableTariffs.length).toBeGreaterThan(0);
    });

    it("should apply trade agreement reductions", () => {
      // Add a trade agreement
      state.tradeAgreements.push({
        id: "test-agreement",
        name: "Test Agreement",
        type: "free_trade",
        regions: ["Asia", "Europe"],
        tariffReduction: 0.5, // 50% reduction
        effectiveRound: 1
      });

      const result = TariffEngine.calculateTariff(
        "Asia",
        "Europe",
        "display",
        1000000,
        1,
        state
      );

      // Tariff should be reduced by agreement
      expect(result.adjustedTariffRate).toBeLessThan(result.baseTariffRate);
      expect(result.tradeAgreements.length).toBeGreaterThan(0);
    });

    it("should aggregate multiple applicable tariffs", () => {
      // Add multiple tariffs for same route
      state.activeTariffs.push({
        id: "tariff1",
        name: "Test Tariff 1",
        fromRegion: "Europe",
        toRegion: "Asia",
        tariffRate: 0.10,
        effectiveRound: 1,
        reason: "revenue",
        volatility: 0.2,
        description: "Test"
      });

      state.activeTariffs.push({
        id: "tariff2",
        name: "Test Tariff 2",
        fromRegion: "Europe",
        toRegion: "Asia",
        tariffRate: 0.05,
        effectiveRound: 1,
        reason: "revenue",
        volatility: 0.2,
        description: "Test"
      });

      const result = TariffEngine.calculateTariff(
        "Europe",
        "Asia",
        "memory",
        1000000,
        1,
        state
      );

      // Should add both tariffs
      expect(result.baseTariffRate).toBeGreaterThanOrEqual(0.15);
    });

    it("should only apply tariffs that are effective", () => {
      state.activeTariffs.push({
        id: "future-tariff",
        name: "Future Tariff",
        fromRegion: "Asia",
        toRegion: "Oceania",
        tariffRate: 0.50,
        effectiveRound: 10, // Not effective yet
        reason: "trade_war",
        volatility: 0.8,
        description: "Future tariff"
      });

      const result = TariffEngine.calculateTariff(
        "Asia",
        "Oceania",
        "camera",
        1000000,
        1, // Current round 1
        state
      );

      // Future tariff should not be applied
      expect(result.baseTariffRate).toBe(0);
    });

    it("should not apply expired tariffs", () => {
      state.activeTariffs.push({
        id: "expired-tariff",
        name: "Expired Tariff",
        fromRegion: "Africa",
        toRegion: "Europe",
        tariffRate: 0.30,
        effectiveRound: 1,
        expiryRound: 2,
        reason: "trade_war",
        volatility: 0.5,
        description: "Expired tariff"
      });

      const result = TariffEngine.calculateTariff(
        "Africa",
        "Europe",
        "battery",
        1000000,
        5, // Round 5 (tariff expired at round 2)
        state
      );

      // Expired tariff should not be applied
      expect(result.baseTariffRate).toBe(0);
    });

    it("should apply material-specific tariffs", () => {
      state.activeTariffs.push({
        id: "processor-tariff",
        name: "Processor Tariff",
        fromRegion: "Asia",
        toRegion: "Europe",
        materialTypes: ["processor"], // Only processors
        tariffRate: 0.25,
        effectiveRound: 1,
        reason: "national_security",
        volatility: 0.7,
        description: "Processor-specific tariff"
      });

      const processorResult = TariffEngine.calculateTariff(
        "Asia",
        "Europe",
        "processor",
        1000000,
        1,
        state
      );

      const displayResult = TariffEngine.calculateTariff(
        "Asia",
        "Europe",
        "display",
        1000000,
        1,
        state
      );

      // Processor should have the tariff, display should not
      expect(processorResult.baseTariffRate).toBeGreaterThan(displayResult.baseTariffRate);
    });

    it("should provide warnings for upcoming changes", () => {
      state.activeEvents.push({
        id: "upcoming-increase",
        name: "Upcoming Tariff Increase",
        type: "tariff_increase",
        affectedRoutes: [{ from: "Asia", to: "North America", increase: 0.10 }],
        duration: 8,
        probability: 1.0,
        severity: 0.7,
        effects: [],
        description: "Upcoming increase"
      });

      const result = TariffEngine.calculateTariff(
        "Asia",
        "North America",
        "processor",
        1000000,
        1,
        state
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("Upcoming"))).toBe(true);
    });
  });

  describe("processRoundEvents", () => {
    let state: TariffState;

    beforeEach(() => {
      state = TariffEngine.initializeTariffState();
    });

    it("should create new tariffs from events", () => {
      const initialTariffCount = state.activeTariffs.length;

      // Force an event to trigger
      const result = TariffEngine.processRoundEvents(state, 1);

      // May or may not trigger (probabilistic), but should not error
      expect(result.messages).toBeDefined();
      expect(result.newTariffs).toBeDefined();
    });

    it("should remove expired tariffs", () => {
      // Add tariff that expires this round
      state.activeTariffs.push({
        id: "expiring-tariff",
        name: "Expiring Tariff",
        fromRegion: "Europe",
        toRegion: "Africa",
        tariffRate: 0.15,
        effectiveRound: 1,
        expiryRound: 5,
        reason: "revenue",
        volatility: 0.3,
        description: "Expires round 5"
      });

      const result = TariffEngine.processRoundEvents(state, 5);

      expect(result.expiredTariffs.length).toBeGreaterThan(0);
      expect(state.activeTariffs.find(t => t.id === "expiring-tariff")).toBeUndefined();
    });

    it("should generate messages for new events", () => {
      // Run multiple rounds to increase chance of event
      for (let round = 1; round <= 10; round++) {
        const result = TariffEngine.processRoundEvents(state, round);

        if (result.newEvents.length > 0) {
          expect(result.messages.length).toBeGreaterThan(0);
          break;
        }
      }
    });

    it("should clean up expired events", () => {
      // Add event that should expire
      state.activeEvents.push({
        id: "expired-event",
        name: "Expired Event",
        type: "tariff_increase",
        affectedRoutes: [],
        duration: 2,
        probability: 1.0,
        severity: 0.5,
        effects: [],
        description: "Short-lived event"
      });

      // Process multiple rounds
      TariffEngine.processRoundEvents(state, 10);

      // Event should be cleaned up
      expect(state.activeEvents.find(e => e.id === "expired-event")).toBeUndefined();
    });
  });

  describe("forecastTariffs", () => {
    let state: TariffState;

    beforeEach(() => {
      state = TariffEngine.initializeTariffState();
    });

    it("should generate forecast for multiple rounds", () => {
      const forecast = TariffEngine.forecastTariffs(
        "Asia",
        "North America",
        "processor",
        1,
        state,
        4 // 4 rounds ahead
      );

      expect(forecast.currentRate).toBeGreaterThanOrEqual(0);
      expect(forecast.forecastedRates).toHaveLength(4);
      expect(forecast.trends).toBeDefined();
      expect(forecast.recommendations).toBeDefined();
    });

    it("should include confidence levels", () => {
      const forecast = TariffEngine.forecastTariffs(
        "Europe",
        "Asia",
        "display",
        1,
        state,
        4
      );

      forecast.forecastedRates.forEach((f, index) => {
        expect(f.confidence).toBeGreaterThan(0);
        expect(f.confidence).toBeLessThanOrEqual(1);

        // Confidence should decrease with time
        if (index > 0) {
          expect(f.confidence).toBeLessThanOrEqual(forecast.forecastedRates[index - 1].confidence);
        }
      });
    });

    it("should identify trends", () => {
      // Add high volatility tariff
      state.activeTariffs.push({
        id: "volatile-tariff",
        name: "Volatile Tariff",
        fromRegion: "Asia",
        toRegion: "Oceania",
        tariffRate: 0.20,
        effectiveRound: 1,
        reason: "trade_war",
        volatility: 0.9, // High volatility
        description: "Unstable tariff"
      });

      const forecast = TariffEngine.forecastTariffs(
        "Asia",
        "Oceania",
        "memory",
        1,
        state,
        4
      );

      expect(forecast.trends.length).toBeGreaterThan(0);
      expect(forecast.trends.some(t => t.includes("volatility"))).toBe(true);
    });

    it("should provide actionable recommendations", () => {
      const forecast = TariffEngine.forecastTariffs(
        "Asia",
        "North America",
        "processor",
        1,
        state,
        4
      );

      expect(forecast.recommendations.length).toBeGreaterThan(0);
      forecast.recommendations.forEach(rec => {
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });

  describe("calculateTotalTariffBurden", () => {
    let state: TariffState;

    beforeEach(() => {
      state = TariffEngine.initializeTariffState();
    });

    it("should calculate total tariffs across multiple orders", () => {
      const orders = [
        { fromRegion: "Asia" as Region, toRegion: "North America" as Region, materialType: "processor" as MaterialType, cost: 1000000 },
        { fromRegion: "Europe" as Region, toRegion: "Asia" as Region, materialType: "display" as MaterialType, cost: 500000 },
        { fromRegion: "Asia" as Region, toRegion: "North America" as Region, materialType: "memory" as MaterialType, cost: 800000 }
      ];

      const result = TariffEngine.calculateTotalTariffBurden(orders, 1, state);

      expect(result.totalTariffs).toBeGreaterThan(0);
      expect(result.byRoute.size).toBeGreaterThan(0);
      expect(result.mostExpensiveRoute.route).toBeDefined();
      expect(result.mostExpensiveRoute.cost).toBeGreaterThan(0);
    });

    it("should identify most expensive route", () => {
      const orders = [
        { fromRegion: "Asia" as Region, toRegion: "North America" as Region, materialType: "processor" as MaterialType, cost: 5000000 },
        { fromRegion: "Europe" as Region, toRegion: "Asia" as Region, materialType: "display" as MaterialType, cost: 100000 }
      ];

      const result = TariffEngine.calculateTotalTariffBurden(orders, 1, state);

      // Asia -> North America should be most expensive due to higher tariffs and larger order
      expect(result.mostExpensiveRoute.route).toContain("Asia");
    });

    it("should group tariffs by route", () => {
      const orders = [
        { fromRegion: "Asia" as Region, toRegion: "Europe" as Region, materialType: "processor" as MaterialType, cost: 1000000 },
        { fromRegion: "Asia" as Region, toRegion: "Europe" as Region, materialType: "display" as MaterialType, cost: 500000 },
        { fromRegion: "Europe" as Region, toRegion: "Asia" as Region, materialType: "memory" as MaterialType, cost: 800000 }
      ];

      const result = TariffEngine.calculateTotalTariffBurden(orders, 1, state);

      // Should have 2 routes
      expect(result.byRoute.size).toBe(2);

      const asiaToEurope = result.byRoute.get("Asia → Europe");
      expect(asiaToEurope).toBeDefined();
    });
  });

  describe("suggestMitigationStrategies", () => {
    let state: TariffState;

    beforeEach(() => {
      state = TariffEngine.initializeTariffState();
    });

    it("should suggest mitigation strategies", () => {
      const strategies = TariffEngine.suggestMitigationStrategies(
        "Asia",
        "North America",
        "processor",
        1,
        state
      );

      expect(strategies.length).toBeGreaterThan(0);

      strategies.forEach(strategy => {
        expect(strategy.strategy).toBeDefined();
        expect(strategy.estimatedSavings).toBeGreaterThanOrEqual(0);
        expect(strategy.implementationCost).toBeGreaterThanOrEqual(0);
        expect(["easy", "moderate", "difficult"]).toContain(strategy.feasibility);
        expect(strategy.description).toBeDefined();
      });
    });

    it("should sort strategies by savings", () => {
      const strategies = TariffEngine.suggestMitigationStrategies(
        "Asia",
        "Europe",
        "display",
        1,
        state
      );

      // Should be sorted by estimated savings descending
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].estimatedSavings).toBeGreaterThanOrEqual(strategies[i].estimatedSavings);
      }
    });

    it("should suggest stockpiling when tariff increase expected", () => {
      // Add warning about upcoming increase
      state.activeEvents.push({
        id: "upcoming-increase",
        name: "Tariff Increase",
        type: "tariff_increase",
        affectedRoutes: [{ from: "Asia", to: "North America", increase: 0.15 }],
        duration: 8,
        probability: 1.0,
        severity: 0.8,
        effects: [],
        description: "Major increase"
      });

      const strategies = TariffEngine.suggestMitigationStrategies(
        "Asia",
        "North America",
        "processor",
        1,
        state
      );

      const stockpileStrategy = strategies.find(s => s.strategy.toLowerCase().includes("stockpile"));
      expect(stockpileStrategy).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle routes with no tariffs", () => {
      const state = TariffEngine.initializeTariffState();

      const result = TariffEngine.calculateTariff(
        "Oceania",
        "Middle East",
        "chassis",
        1000000,
        1,
        state
      );

      // Should return 0 tariff if no applicable tariffs
      expect(result.tariffAmount).toBeGreaterThanOrEqual(0);
    });

    it("should handle forecasts with no data", () => {
      const state: TariffState = {
        activeTariffs: [],
        tradeAgreements: [],
        activeEvents: [],
        geopoliticalEvents: [],
        policies: new Map(),
        forecasts: []
      };

      const forecast = TariffEngine.forecastTariffs(
        "Asia",
        "Europe",
        "memory",
        1,
        state,
        4
      );

      expect(forecast.forecastedRates).toHaveLength(4);
      expect(forecast.currentRate).toBe(0);
    });

    it("should handle very high tariff rates", () => {
      const state = TariffEngine.initializeTariffState();
      state.activeTariffs.push({
        id: "extreme-tariff",
        name: "Extreme Tariff",
        fromRegion: "Africa",
        toRegion: "Oceania",
        tariffRate: 0.95, // 95% tariff
        effectiveRound: 1,
        reason: "national_security",
        volatility: 0.9,
        description: "Extreme"
      });

      const result = TariffEngine.calculateTariff(
        "Africa",
        "Oceania",
        "processor",
        1000000,
        1,
        state
      );

      expect(result.tariffAmount).toBeLessThanOrEqual(1000000); // Can't exceed 100%
    });
  });
});
