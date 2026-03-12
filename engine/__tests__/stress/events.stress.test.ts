/**
 * EVENTS STRESS SUITE
 *
 * Tests the EventEngine and event application in SimulationEngine.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput } from "../../core/SimulationEngine";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  createSimulationInput,
  runProfileNRounds,
} from "../../testkit/scenarioGenerator";
import { assertAllInvariantsPass } from "../../testkit/invariants";

describe("Events Stress Suite", () => {
  describe("Category A — Golden Path", () => {
    it("no events: baseline processes cleanly", () => {
      const input = createSimulationInput({
        teamCount: 3,
        roundNumber: 1,
        matchSeed: "evt-none",
        profile: "baseline-balanced",
      });
      const output = SimulationEngine.processRound(input);
      assertAllInvariantsPass(output);
    });

    it("single event affecting all teams", () => {
      const state = createMinimalTeamState();
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "t1", state: createMinimalTeamState(), decisions: {} },
          { id: "t2", state: createMinimalTeamState(), decisions: {} },
        ],
        marketState: createMinimalMarketState(),
        matchSeed: "evt-all",
        events: [
          {
            type: "crisis",
            title: "Global Recession",
            description: "Economic downturn",
            effects: [{ target: "cash", modifier: -0.05 }],
            targetTeams: "all",
          },
        ],
      };
      const output = SimulationEngine.processRound(input);
      assertAllInvariantsPass(output);
    });
  });

  describe("Category B — Edge", () => {
    it("multiple events stack correctly", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state: createMinimalTeamState(), decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "evt-stack",
        events: [
          {
            type: "crisis", title: "E1", description: "",
            effects: [{ target: "brandValue", modifier: -0.1 }],
            targetTeams: "all",
          },
          {
            type: "crisis", title: "E2", description: "",
            effects: [{ target: "brandValue", modifier: -0.1 }],
            targetTeams: "all",
          },
        ],
      };
      const output = SimulationEngine.processRound(input);
      // Brand should be reduced by both events
      const brandAfter = output.results[0].newState.brandValue;
      expect(brandAfter).toBeLessThan(0.5); // Starting brand 0.5
    });

    it("event with all effect types", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state: createMinimalTeamState(), decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "evt-all-types",
        events: [
          {
            type: "mixed", title: "Complex Event", description: "",
            effects: [
              { target: "efficiency", modifier: -0.1 },
              { target: "morale", modifier: -0.1 },
              { target: "brandValue", modifier: 0.05 },
              { target: "cash", modifier: -0.02 },
              { target: "esgScore", modifier: 50 },
            ],
            targetTeams: "all",
          },
        ],
      };
      const output = SimulationEngine.processRound(input);
      assertAllInvariantsPass(output);
    });

    it("empty events array: no effect", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state: createMinimalTeamState(), decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "evt-empty",
        events: [],
      };
      const output = SimulationEngine.processRound(input);
      assertAllInvariantsPass(output);
    });

    it("event targeting nonexistent team: no crash", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state: createMinimalTeamState(), decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "evt-no-target",
        events: [
          {
            type: "bonus", title: "Ghost", description: "",
            effects: [{ target: "cash", modifier: 0.1 }],
            targetTeams: ["nonexistent-team"],
          },
        ],
      };
      const output = SimulationEngine.processRound(input);
      assertAllInvariantsPass(output);
    });
  });

  describe("Category C — Property", () => {
    it("efficiency event clamps to [0.1, 1]", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state: createMinimalTeamState(), decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "evt-clamp",
        events: [
          {
            type: "crisis", title: "Catastrophe", description: "",
            effects: [{ target: "efficiency", modifier: -0.99 }],
            targetTeams: "all",
          },
        ],
      };
      const output = SimulationEngine.processRound(input);
      for (const f of output.results[0].newState.factories) {
        expect(f.efficiency).toBeGreaterThanOrEqual(0.1);
        expect(f.efficiency).toBeLessThanOrEqual(1);
      }
    });

    it("morale event clamps to [0, 100]", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state: createMinimalTeamState(), decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "evt-morale-clamp",
        events: [
          {
            type: "bonus", title: "Extreme Boost", description: "",
            effects: [{ target: "morale", modifier: 5.0 }],
            targetTeams: "all",
          },
        ],
      };
      const output = SimulationEngine.processRound(input);
      for (const emp of output.results[0].newState.employees) {
        expect(emp.morale).toBeGreaterThanOrEqual(0);
        expect(emp.morale).toBeLessThanOrEqual(100);
      }
    });

    it("brand event clamps to [0, 1]", () => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "t1", state: createMinimalTeamState(), decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: "evt-brand-clamp",
        events: [
          {
            type: "bonus", title: "Brand Boost", description: "",
            effects: [{ target: "brandValue", modifier: 10.0 }],
            targetTeams: "all",
          },
        ],
      };
      const output = SimulationEngine.processRound(input);
      expect(output.results[0].newState.brandValue).toBeLessThanOrEqual(1);
      expect(output.results[0].newState.brandValue).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Category D — Regression", () => {
    it("placeholder: no regressions found yet", () => {
      expect(true).toBe(true);
    });
  });
});
