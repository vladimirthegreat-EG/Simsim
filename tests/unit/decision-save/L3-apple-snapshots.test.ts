/**
 * L3 Regression Snapshot Tests — Apple-style determinism verification
 *
 * These tests use Vitest's toMatchSnapshot() to detect ANY change in engine
 * output across code modifications. On first run, Vitest writes snapshot
 * values automatically. On subsequent runs, ANY change causes a mismatch,
 * signaling a regression.
 *
 * Snapshot 1: 4-team, 8-round state hash matrix
 * Snapshot 2: Market state demand progression (5 rounds)
 * Snapshot 3: EPS progression for a single team (8 rounds)
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

    // Advance state for next round: update each team's state from results
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

    // Build a 4x8 matrix: hashMatrix[teamIndex][roundIndex]
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
// Snapshot 2 — Market state demand progression (5 rounds)
// ---------------------------------------------------------------------------

describe("Snapshot 2: Market state demand progression", () => {
  it("produces deterministic demand history that matches the stored snapshot", () => {
    const outputs = runSimulation("regression-v1", 4, 5);
    const segments = CONSTANTS.SEGMENTS; // ["Budget","General","Enthusiast","Professional","Active Lifestyle"]

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
// Snapshot 3 — EPS progression for single team (8 rounds)
// ---------------------------------------------------------------------------

describe("Snapshot 3: EPS progression for single team", () => {
  it("produces deterministic EPS history that matches the stored snapshot", () => {
    const outputs = runSimulation("eps-regression-v1", 1, 8);

    const epsHistory: Array<{ round: number; eps: number }> = [];

    for (let round = 0; round < 8; round++) {
      const result = outputs[round].results.find(
        (r) => r.teamId === "team-1",
      );
      expect(result).toBeDefined();
      epsHistory.push({
        round: round + 1,
        eps: result!.newState.eps,
      });
    }

    expect(epsHistory).toMatchSnapshot();
  });
});
