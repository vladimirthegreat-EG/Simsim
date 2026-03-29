/**
 * L3 Regression Snapshot Tests v2 — Apple-style determinism verification
 *
 * Uses Vitest toMatchSnapshot() to lock down engine output across code changes.
 * Any drift in state hashes or demand figures signals a regression.
 *
 * Snapshot 1: 4-team, 8-round state hash matrix
 * Snapshot 2: Market demand progression (5 rounds, 2 teams)
 * Snapshot 3: Determinism proof — two identical runs produce identical hashes
 */

import { describe, it, expect } from "vitest";
import {
  SimulationEngine,
  type SimulationInput,
  type SimulationOutput,
} from "../../../engine/core/SimulationEngine";
import { hashState } from "../../../engine/core/EngineContext";
import { CONSTANTS } from "../../../engine/types";
import type { TeamState } from "../../../engine/types";
import type { MarketState } from "../../../engine/types";
import type { AllDecisions } from "../../../engine/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create N teams with default initial state and empty decisions. */
function createTeams(count: number): Array<{
  id: string;
  state: TeamState;
  decisions: AllDecisions;
}> {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    state: SimulationEngine.createInitialTeamState(),
    decisions: {} as AllDecisions,
  }));
}

/**
 * Run the simulation for `rounds` rounds, calling processRound sequentially.
 * Returns each round's SimulationOutput so callers can inspect intermediate
 * states and the evolving market.
 */
function runSimulation(
  seed: string,
  teamCount: number,
  rounds: number,
): SimulationOutput[] {
  const teams = createTeams(teamCount);
  let marketState: MarketState = SimulationEngine.createInitialMarketState();
  const outputs: SimulationOutput[] = [];

  for (let round = 1; round <= rounds; round++) {
    const input: SimulationInput = {
      roundNumber: round,
      teams: teams.map((t) => ({
        id: t.id,
        state: t.state,
        decisions: t.decisions,
      })),
      marketState,
      matchSeed: seed,
    };

    const output = SimulationEngine.processRound(input);
    outputs.push(output);

    // Advance state for next round
    for (const result of output.results) {
      const team = teams.find((t) => t.id === result.teamId);
      if (team) {
        team.state = result.newState;
      }
    }
    marketState = output.newMarketState;
  }

  return outputs;
}

// ---------------------------------------------------------------------------
// Snapshot 1 — 4-team 8-round state hash matrix
// ---------------------------------------------------------------------------

describe("Snapshot 1: 4-team 8-round state hash matrix", () => {
  it("produces a deterministic hash matrix that matches the stored snapshot", () => {
    const outputs = runSimulation("regression-v1", 4, 8);

    const teamIds = ["team-1", "team-2", "team-3", "team-4"];
    const hashMatrix: Record<string, string[]> = {};

    for (const teamId of teamIds) {
      hashMatrix[teamId] = [];
      for (let round = 0; round < 8; round++) {
        const result = outputs[round].results.find(
          (r) => r.teamId === teamId,
        );
        expect(result).toBeDefined();
        const hash = hashState(result!.newState);
        hashMatrix[teamId].push(hash);
      }
    }

    expect(hashMatrix).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Snapshot 2 — Market demand progression (5 rounds, 2 teams)
// ---------------------------------------------------------------------------

describe("Snapshot 2: Market demand progression (2 teams)", () => {
  it("produces deterministic demand history that matches the stored snapshot", () => {
    const outputs = runSimulation("regression-v1", 2, 5);
    const segments = CONSTANTS.SEGMENTS;

    const demandHistory: Array<Record<string, number | string>> = [];

    for (let round = 0; round < 5; round++) {
      const entry: Record<string, number | string> = { round: round + 1 };
      const market = outputs[round].newMarketState;
      for (const seg of segments) {
        const segDemand = market.demandBySegment[seg];
        entry[seg] = segDemand.totalDemand;
      }
      demandHistory.push(entry);
    }

    expect(demandHistory).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Snapshot 3 — Determinism proof (two runs, identical hashes)
// ---------------------------------------------------------------------------

describe("Snapshot 3: Determinism — identical runs produce identical hashes", () => {
  it("two runs with same seed yield identical per-round per-team hashes", () => {
    const SEED = "regression-v1";
    const TEAMS = 4;
    const ROUNDS = 8;

    // First run
    const outputsA = runSimulation(SEED, TEAMS, ROUNDS);
    // Second run
    const outputsB = runSimulation(SEED, TEAMS, ROUNDS);

    const hashesA: string[][] = [];
    const hashesB: string[][] = [];

    for (let round = 0; round < ROUNDS; round++) {
      const roundHashesA: string[] = [];
      const roundHashesB: string[] = [];
      for (let t = 0; t < TEAMS; t++) {
        const teamId = `team-${t + 1}`;
        const resultA = outputsA[round].results.find((r) => r.teamId === teamId);
        const resultB = outputsB[round].results.find((r) => r.teamId === teamId);
        expect(resultA).toBeDefined();
        expect(resultB).toBeDefined();
        roundHashesA.push(hashState(resultA!.newState));
        roundHashesB.push(hashState(resultB!.newState));
      }
      hashesA.push(roundHashesA);
      hashesB.push(roundHashesB);
    }

    // Strict equality — if determinism holds, every cell must match
    expect(hashesA).toEqual(hashesB);

    // Also snapshot the matrix so future regressions are caught
    expect(hashesA).toMatchSnapshot();
  });
});
