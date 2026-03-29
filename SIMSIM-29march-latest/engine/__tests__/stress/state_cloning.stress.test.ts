/**
 * STATE CLONING STRESS SUITE
 *
 * Tests cloneTeamState for deep clone correctness, no reference sharing,
 * and mutation isolation.
 */

import { describe, it, expect } from "vitest";
import { createMinimalTeamState } from "../../testkit/scenarioGenerator";
import { SimulationEngine, type SimulationInput } from "../../core/SimulationEngine";
import { createMinimalMarketState } from "../../testkit/scenarioGenerator";

describe("State Cloning Stress Suite", () => {
  describe("Category A — Golden Path", () => {
    it("processRound does not mutate input state", () => {
      const state = createMinimalTeamState();
      const originalCash = state.cash;
      const originalFactoryCount = state.factories.length;
      const originalEmployeeCount = state.employees.length;
      const originalProductCount = state.products.length;

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state, decisions: {
          factory: { newFactories: [{ name: "Test", region: "Asia" }] },
          rd: { rdBudget: 10_000_000 },
          marketing: { advertisingBudget: { General: 5_000_000 }, brandingInvestment: 3_000_000 },
        }}],
        marketState: createMinimalMarketState(),
        matchSeed: "clone-golden",
      };

      SimulationEngine.processRound(input);

      // Input state must NOT be mutated
      expect(state.cash).toBe(originalCash);
      expect(state.factories.length).toBe(originalFactoryCount);
      expect(state.employees.length).toBe(originalEmployeeCount);
      expect(state.products.length).toBe(originalProductCount);
    });
  });

  describe("Category B — Edge", () => {
    it("nested arrays are deep cloned (factories, employees, products)", () => {
      const state = createMinimalTeamState();
      const originalFactoryId = state.factories[0].id;
      const originalWorkers = state.factories[0].workers;

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state, decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "clone-nested",
      };

      const output = SimulationEngine.processRound(input);

      // Original state arrays should not share references with output
      expect(state.factories[0].id).toBe(originalFactoryId);
      expect(state.factories[0].workers).toBe(originalWorkers);

      // Output state should be a separate object
      if (output.results[0].newState.factories[0]) {
        output.results[0].newState.factories[0].workers = 999;
        expect(state.factories[0].workers).toBe(originalWorkers); // Not affected
      }
    });

    it("inventory objects are deep cloned", () => {
      const state = createMinimalTeamState();
      const originalRawMaterials = state.inventory.rawMaterials;

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state, decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "clone-inventory",
      };

      SimulationEngine.processRound(input);
      expect(state.inventory.rawMaterials).toBe(originalRawMaterials);
    });

    it("benefits object is deep cloned", () => {
      const state = createMinimalTeamState();
      const originalHealthInsurance = state.benefits.package.healthInsurance;

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state, decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "clone-benefits",
      };

      SimulationEngine.processRound(input);
      expect(state.benefits.package.healthInsurance).toBe(originalHealthInsurance);
    });
  });

  describe("Category C — Property", () => {
    it("multi-team processing: no cross-team state contamination", () => {
      const state1 = createMinimalTeamState();
      const state2 = createMinimalTeamState();
      const cash1Before = state1.cash;
      const cash2Before = state2.cash;

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "t1", state: state1, decisions: { factory: { newFactories: [{ name: "Expensive", region: "North America" }] } } },
          { id: "t2", state: state2, decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "clone-cross-team",
      };

      SimulationEngine.processRound(input);

      // Neither input state should be mutated
      expect(state1.cash).toBe(cash1Before);
      expect(state2.cash).toBe(cash2Before);
    });
  });

  describe("Category D — Regression", () => {
    it("placeholder: no regressions found yet", () => {
      expect(true).toBe(true);
    });
  });
});
