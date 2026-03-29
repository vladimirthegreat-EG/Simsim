/**
 * Layer 3 — Regression Snapshots (L3-REGR-01, L3-REGR-02)
 *
 * Captures state hash matrices and market demand progression as inline snapshots.
 * Any engine formula change causes a snapshot diff, flagging regressions.
 *
 * On FIRST RUN: Vitest writes snapshot values automatically.
 * On SUBSEQUENT RUNS: Any change = test failure = regression detected.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { hashState } from "@/engine/core/EngineContext";

describe("Regression Snapshots", { timeout: 30_000 }, () => {
  // ===========================================================================
  // L3-REGR-01: 4-team 8-round state hash matrix
  // ===========================================================================
  it("L3-REGR-01: 4-team 8-round state hash matrix is stable", () => {
    const strategies = ["premium", "costLeader", "brand", "balanced"];
    const teams = strategies.map((s, i) => ({
      id: `team-${s}`,
      state: SimulationEngine.createInitialTeamState(),
      decisions: {},
    }));

    let marketState = SimulationEngine.createInitialMarketState();

    // Build hash matrix: team × round
    const hashMatrix: Record<string, string[]> = {};
    strategies.forEach(s => { hashMatrix[s] = []; });

    for (let round = 1; round <= 8; round++) {
      const output = SimulationEngine.processRound({
        roundNumber: round,
        teams: teams.map(t => ({ ...t })),
        marketState,
        matchSeed: "regression-v1",
      });

      for (let i = 0; i < teams.length; i++) {
        const hash = hashState(output.results[i].newState);
        hashMatrix[strategies[i]].push(hash);
        teams[i].state = output.results[i].newState;
      }
      marketState = output.newMarketState;
    }

    // Snapshot the entire matrix — any formula change breaks this
    expect(hashMatrix).toMatchSnapshot();
  });

  // ===========================================================================
  // L3-REGR-02: Market state demand progression snapshot
  // ===========================================================================
  it("L3-REGR-02: market demand progression is stable across 5 rounds", () => {
    const teams = [
      { id: "t1", state: SimulationEngine.createInitialTeamState(), decisions: {} },
      { id: "t2", state: SimulationEngine.createInitialTeamState(), decisions: {} },
    ];

    let marketState = SimulationEngine.createInitialMarketState();

    const demandHistory: Array<{
      round: number;
      Budget: number;
      General: number;
      Enthusiast: number;
      Professional: number;
      "Active Lifestyle": number;
    }> = [];

    for (let round = 1; round <= 5; round++) {
      const output = SimulationEngine.processRound({
        roundNumber: round,
        teams: teams.map(t => ({ ...t })),
        marketState,
        matchSeed: "regression-v1",
      });

      const demand = output.newMarketState.demandBySegment;
      demandHistory.push({
        round,
        Budget: demand.Budget?.totalDemand ?? 0,
        General: demand.General?.totalDemand ?? 0,
        Enthusiast: demand.Enthusiast?.totalDemand ?? 0,
        Professional: demand.Professional?.totalDemand ?? 0,
        "Active Lifestyle": demand["Active Lifestyle"]?.totalDemand ?? 0,
      });

      for (let i = 0; i < teams.length; i++) {
        teams[i].state = output.results[i].newState;
      }
      marketState = output.newMarketState;
    }

    // Snapshot demand progression
    expect(demandHistory).toMatchSnapshot();
  });

  // ===========================================================================
  // Determinism verification
  // ===========================================================================
  it("same seed produces identical output on two runs", () => {
    const run = () => {
      const teams = [
        { id: "t1", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "t2", state: SimulationEngine.createInitialTeamState(), decisions: {} },
      ];
      const marketState = SimulationEngine.createInitialMarketState();

      const output = SimulationEngine.processRound({
        roundNumber: 1,
        teams,
        marketState,
        matchSeed: "determinism-check",
      });

      return {
        hash0: hashState(output.results[0].newState),
        hash1: hashState(output.results[1].newState),
        marketHash: hashState(output.newMarketState),
      };
    };

    const run1 = run();
    const run2 = run();

    expect(run1.hash0).toBe(run2.hash0);
    expect(run1.hash1).toBe(run2.hash1);
    expect(run1.marketHash).toBe(run2.marketHash);
  });
});
