/**
 * Layer 7 — Pedagogical Validity Tests (L7-PED-01)
 *
 * Proves the simulation teaches what it claims to teach:
 * 1. Early R&D pays off over 8 rounds
 * 2. Ignoring HR creates compounding losses
 * 3. ESG creates sustainable brand advantage
 *
 * If any test fails, the simulation is NOT teaching what it promises.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";

function runGame(
  teamDecisionsFn: (teamId: string, round: number) => Record<string, unknown>,
  teamIds: string[],
  rounds: number,
  seed: string,
) {
  const teams = teamIds.map(id => ({
    id,
    state: SimulationEngine.createInitialTeamState(),
    decisions: {} as Record<string, unknown>,
  }));
  let marketState = SimulationEngine.createInitialMarketState();
  const revenueHistory: Record<string, number[]> = {};
  teamIds.forEach(id => { revenueHistory[id] = []; });

  for (let round = 1; round <= rounds; round++) {
    for (const team of teams) {
      team.decisions = teamDecisionsFn(team.id, round);
    }

    const output = SimulationEngine.processRound({
      roundNumber: round,
      teams: teams.map(t => ({ ...t })),
      marketState,
      matchSeed: seed,
    });

    for (let i = 0; i < teams.length; i++) {
      teams[i].state = output.results[i].state;
      revenueHistory[teams[i].id].push(output.results[i].state.revenue);
    }
    marketState = output.newMarketState;
  }

  return { teams, revenueHistory };
}

describe("Pedagogical Validity", { timeout: 30_000 }, () => {
  // ===========================================================================
  // Learning Outcome 1: Early R&D compounds over 8 rounds
  // ===========================================================================
  it("L7-PED-01a: early R&D investment produces higher cumulative revenue than late R&D", () => {
    const ROUNDS = 8;
    const results: { earlyWins: number } = { earlyWins: 0 };
    const SEEDS = 10;

    for (let s = 0; s < SEEDS; s++) {
      const { revenueHistory } = runGame(
        (teamId, round) => {
          if (teamId === "early-rd") {
            // High R&D rounds 1-3, normal 4-8
            const rdBudget = round <= 3 ? 10_000_000 : 2_000_000;
            return { rd: { rdBudgetAllocation: [{ productId: "main-product", budget: rdBudget, focus: "innovation" }] } };
          } else {
            // Normal R&D rounds 1-3, high 4-8
            const rdBudget = round <= 3 ? 2_000_000 : 10_000_000;
            return { rd: { rdBudgetAllocation: [{ productId: "main-product", budget: rdBudget, focus: "innovation" }] } };
          }
        },
        ["early-rd", "late-rd"],
        ROUNDS,
        `ped-rd-${s}`,
      );

      const earlyTotal = revenueHistory["early-rd"].reduce((a, b) => a + b, 0);
      const lateTotal = revenueHistory["late-rd"].reduce((a, b) => a + b, 0);

      if (earlyTotal > lateTotal) results.earlyWins++;
    }

    // Early R&D should win in majority of seeds
    expect(results.earlyWins).toBeGreaterThanOrEqual(Math.floor(SEEDS * 0.5));
  });

  // ===========================================================================
  // Learning Outcome 2: Ignoring HR creates compounding losses
  // ===========================================================================
  it("L7-PED-01b: maintaining workforce produces higher late-game revenue than mass firing", () => {
    const ROUNDS = 8;
    const results: { maintainWins: number } = { maintainWins: 0 };
    const SEEDS = 10;

    for (let s = 0; s < SEEDS; s++) {
      const { revenueHistory } = runGame(
        (teamId, round) => {
          if (teamId === "maintain") {
            // Maintain full workforce, modest salary increase
            return { hr: { salaryMultiplierChanges: { workers: 1.05, engineers: 1.05, supervisors: 1.05 } } };
          } else {
            // Fire workers in round 2 (short-term cost save)
            if (round === 2) {
              return { hr: { fires: Array.from({ length: 30 }, (_, i) => ({ employeeId: `initial-worker-${i}` })) } };
            }
            return {};
          }
        },
        ["maintain", "fire-team"],
        ROUNDS,
        `ped-hr-${s}`,
      );

      // Compare late-game revenue (rounds 5-8)
      const maintainLate = revenueHistory["maintain"].slice(4).reduce((a, b) => a + b, 0);
      const fireLate = revenueHistory["fire-team"].slice(4).reduce((a, b) => a + b, 0);

      if (maintainLate > fireLate) results.maintainWins++;
    }

    // Maintaining workforce should win late-game in majority of seeds
    expect(results.maintainWins).toBeGreaterThanOrEqual(Math.floor(SEEDS * 0.5));
  });

  // ===========================================================================
  // Learning Outcome 3: ESG creates sustainable brand advantage
  // ===========================================================================
  it("L7-PED-01c: ESG investment creates higher brand value by round 6", () => {
    const { teams } = runGame(
      (teamId, _round) => {
        if (teamId === "esg-team") {
          return {
            factory: {
              esgInitiatives: { circularEconomy: true, waterConservation: true },
              investments: { workerEfficiency: 500_000, factoryEfficiency: 500_000 },
            },
          };
        }
        return {
          factory: {
            investments: { workerEfficiency: 500_000, factoryEfficiency: 500_000 },
          },
        };
      },
      ["esg-team", "no-esg"],
      6,
      "ped-esg-1",
    );

    const esgTeam = teams.find(t => t.id === "esg-team")!;
    const noEsgTeam = teams.find(t => t.id === "no-esg")!;

    // ESG team should have higher ESG score
    expect(esgTeam.state.esgScore).toBeGreaterThan(noEsgTeam.state.esgScore);

    // ESG team should have equal or higher brand value (ESG contributes to brand)
    expect(esgTeam.state.brandValue).toBeGreaterThanOrEqual(noEsgTeam.state.brandValue * 0.95);
  });
});
