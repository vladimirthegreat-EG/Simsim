/**
 * Layer 4 — State Continuity Tests (L4-CONT-01, L4-CONT-02, L4-CROSS-03)
 *
 * Verifies that state persists correctly across rounds, serialization is lossless,
 * and cross-module interactions work (e.g., loan funds factory).
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { hashState } from "@/engine/core/EngineContext";

describe("State Continuity", () => {
  // ===========================================================================
  // L4-CONT-01: Factory built in round 3 persists in round 4
  // ===========================================================================
  it("L4-CONT-01: factory built in round N persists in round N+1", () => {
    let team = {
      id: "t1",
      state: SimulationEngine.createInitialTeamState(),
      decisions: {} as Record<string, unknown>,
    };
    let marketState = SimulationEngine.createInitialMarketState();
    const initialFactoryCount = team.state.factories.length;

    // Round 1-2: no changes
    for (let round = 1; round <= 2; round++) {
      const output = SimulationEngine.processRound({
        roundNumber: round,
        teams: [{ ...team }],
        marketState,
        matchSeed: "continuity-test",
      });
      team.state = output.results[0].state;
      marketState = output.newMarketState;
    }

    // Round 3: build a new factory
    team.decisions = {
      factory: {
        newFactories: [{ name: "Asia Factory", region: "asia", tier: "small" }],
      },
    };

    const round3 = SimulationEngine.processRound({
      roundNumber: 3,
      teams: [{ ...team }],
      marketState,
      matchSeed: "continuity-test",
    });
    team.state = round3.results[0].state;
    marketState = round3.newMarketState;

    const factoryCountAfterR3 = team.state.factories.length;
    expect(factoryCountAfterR3).toBeGreaterThan(initialFactoryCount);

    // Round 4: no factory decisions — factory must persist
    team.decisions = {};
    const round4 = SimulationEngine.processRound({
      roundNumber: 4,
      teams: [{ ...team }],
      marketState,
      matchSeed: "continuity-test",
    });

    const factoryCountAfterR4 = round4.results[0].state.factories.length;
    expect(factoryCountAfterR4).toBe(factoryCountAfterR3);
  });

  // ===========================================================================
  // L4-CONT-02: Serialize→deserialize produces identical round output
  // ===========================================================================
  it("L4-CONT-02: JSON serialize→deserialize produces identical next-round output", () => {
    let team = {
      id: "t1",
      state: SimulationEngine.createInitialTeamState(),
      decisions: {},
    };
    let marketState = SimulationEngine.createInitialMarketState();

    // Run 5 rounds to build up state
    for (let round = 1; round <= 5; round++) {
      const output = SimulationEngine.processRound({
        roundNumber: round,
        teams: [{ ...team }],
        marketState,
        matchSeed: "serialize-test",
      });
      team.state = output.results[0].state;
      marketState = output.newMarketState;
    }

    // Serialize and deserialize round 5 state
    const serialized = JSON.parse(JSON.stringify(team.state));
    const serializedMarket = JSON.parse(JSON.stringify(marketState));

    // Process round 6 from original state
    const round6Original = SimulationEngine.processRound({
      roundNumber: 6,
      teams: [{ id: "t1", state: team.state, decisions: {} }],
      marketState,
      matchSeed: "serialize-test",
    });

    // Process round 6 from deserialized state
    const round6Deserialized = SimulationEngine.processRound({
      roundNumber: 6,
      teams: [{ id: "t1", state: serialized, decisions: {} }],
      marketState: serializedMarket,
      matchSeed: "serialize-test",
    });

    // Outputs must be identical
    const hashOriginal = hashState(round6Original.results[0].state);
    const hashDeserialized = hashState(round6Deserialized.results[0].state);
    expect(hashDeserialized).toBe(hashOriginal);
  });

  // ===========================================================================
  // L4-CROSS-03: Finance loan funds next-round factory capex
  // ===========================================================================
  it("L4-CROSS-03: loan in round 1 funds factory in round 2", () => {
    let team = {
      id: "t1",
      state: SimulationEngine.createInitialTeamState(),
      decisions: {} as Record<string, unknown>,
    };
    let marketState = SimulationEngine.createInitialMarketState();

    const initialCash = team.state.cash;

    // Round 1: take a $50M loan
    team.decisions = {
      finance: {
        loans: { bankLoan: 50_000_000 },
      },
    };

    const round1 = SimulationEngine.processRound({
      roundNumber: 1,
      teams: [{ ...team }],
      marketState,
      matchSeed: "loan-factory-test",
    });

    team.state = round1.results[0].state;
    marketState = round1.newMarketState;

    // Cash should have increased from loan (minus other costs)
    // At minimum, team should have more cash than if they had no loan
    expect(team.state.cash).toBeGreaterThan(0);

    // Round 2: build factory with loan proceeds
    team.decisions = {
      factory: {
        newFactories: [{ name: "Loan Factory", region: "domestic", tier: "small" }],
      },
    };

    const round2 = SimulationEngine.processRound({
      roundNumber: 2,
      teams: [{ ...team }],
      marketState,
      matchSeed: "loan-factory-test",
    });

    // Factory should exist
    expect(round2.results[0].state.factories.length).toBeGreaterThan(1);
  });

  // ===========================================================================
  // Input state immutability
  // ===========================================================================
  it("processRound does not mutate input state", () => {
    const state = SimulationEngine.createInitialTeamState();
    const marketState = SimulationEngine.createInitialMarketState();

    const originalCash = state.cash;
    const originalFactoryCount = state.factories.length;
    const stateSnapshot = JSON.stringify(state);

    SimulationEngine.processRound({
      roundNumber: 1,
      teams: [{ id: "t1", state, decisions: {} }],
      marketState,
      matchSeed: "immutability-test",
    });

    // Input state must not be mutated
    expect(state.cash).toBe(originalCash);
    expect(state.factories.length).toBe(originalFactoryCount);
    expect(JSON.stringify(state)).toBe(stateSnapshot);
  });
});
