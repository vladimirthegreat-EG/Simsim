/**
 * L3 Balance Diagnostic Tests v2
 *
 * Three balance invariants:
 *   L3-MKT-01  Marketing dominance cap: maxed marketing <= 2x revenue vs zero marketing
 *   L3-BAL-01  Good play beats passive: optimal strategy wins >= 60% of 20 seeded games
 *   L3-EDGE-01 Zero budget does not crash: all-zero decisions survive 4 rounds without NaN
 */

import { describe, it, expect } from "vitest";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  runNRounds,
  createGamePreset,
} from "@/engine/testkit/scenarioGenerator";
import type { AllDecisions } from "@/engine/types";

// ============================================
// DECISION HELPERS
// ============================================

/** Neutral baseline: modest investment across all modules. */
function baselineDecisions(): AllDecisions {
  return {
    factory: {
      efficiencyInvestments: {},
      productionAllocations: [],
    },
    hr: {},
    rd: {
      rdBudget: 5_000_000,
    },
    marketing: {
      advertisingBudget: {
        Budget: 1_000_000,
        General: 1_500_000,
        Enthusiast: 1_000_000,
        Professional: 500_000,
        "Active Lifestyle": 800_000,
      },
      brandingInvestment: 2_000_000,
    },
    finance: {},
  };
}

/** Marketing maxed: $10M across segments + $5M branding. Other modules = baseline. */
function maxMarketingDecisions(): AllDecisions {
  const base = baselineDecisions();
  return {
    ...base,
    marketing: {
      advertisingBudget: {
        Budget: 2_000_000,
        General: 2_000_000,
        Enthusiast: 2_000_000,
        Professional: 2_000_000,
        "Active Lifestyle": 2_000_000,
      },
      brandingInvestment: 5_000_000,
    },
  };
}

/** Zero marketing: no advertising, no branding. Other modules = baseline. */
function zeroMarketingDecisions(): AllDecisions {
  const base = baselineDecisions();
  return {
    ...base,
    marketing: {
      advertisingBudget: {},
      brandingInvestment: 0,
    },
  };
}

/** Optimal play: R&D $8M + factory efficiency + marketing $5M + salary 1.1x. */
function optimalDecisions(): AllDecisions {
  return {
    factory: {
      efficiencyInvestments: {
        workers: 500_000,
        engineers: 500_000,
        machinery: 1_000_000,
      },
      productionAllocations: [],
    },
    hr: {
      salaryMultiplierChanges: {
        workers: 1.1,
        engineers: 1.1,
        supervisors: 1.1,
      },
    },
    rd: {
      rdBudget: 8_000_000,
    },
    marketing: {
      advertisingBudget: {
        Budget: 1_000_000,
        General: 1_000_000,
        Enthusiast: 1_000_000,
        Professional: 1_000_000,
        "Active Lifestyle": 1_000_000,
      },
      brandingInvestment: 2_000_000,
    },
    finance: {},
  };
}

/** Passive play: zero everything. */
function passiveDecisions(): AllDecisions {
  return {};
}

/** Completely zeroed decisions: all sub-objects present but empty/zero. */
function allZeroDecisions(): AllDecisions {
  return {
    factory: {
      efficiencyInvestments: {},
      productionAllocations: [],
    },
    hr: {},
    rd: {
      rdBudget: 0,
    },
    marketing: {
      advertisingBudget: {},
      brandingInvestment: 0,
    },
    finance: {},
  };
}

// ============================================
// TESTS
// ============================================

describe("L3 Balance Diagnostics v2", () => {

  // ------------------------------------------
  // L3-MKT-01: Marketing dominance cap
  // ------------------------------------------
  describe("L3-MKT-01 Marketing dominance cap", () => {
    it("maxed marketing revenue <= 2.0x zero-marketing revenue over 5 rounds", () => {
      const outputs = runNRounds({
        teamCount: 2,
        rounds: 5,
        matchSeed: "mkt-dominance-cap-seed",
        preset: "quick",
        decisionFn: (_state, _round, teamIndex) => {
          // Team 0 (team-1): maxed marketing
          // Team 1 (team-2): zero marketing
          return teamIndex === 0
            ? maxMarketingDecisions()
            : zeroMarketingDecisions();
        },
      });

      // Sum revenue across all 5 rounds for each team
      let teamARevenue = 0;
      let teamBRevenue = 0;
      for (const output of outputs) {
        const resultA = output.results.find(r => r.teamId === "team-1")!;
        const resultB = output.results.find(r => r.teamId === "team-2")!;
        teamARevenue += resultA.newState.revenue;
        teamBRevenue += resultB.newState.revenue;
      }

      const ratio = teamBRevenue > 0
        ? teamARevenue / teamBRevenue
        : teamARevenue > 0 ? Infinity : 1;

      console.log(`[L3-MKT-01] Team A (maxed mkt) total revenue: $${(teamARevenue / 1e6).toFixed(2)}M`);
      console.log(`[L3-MKT-01] Team B (zero mkt)  total revenue: $${(teamBRevenue / 1e6).toFixed(2)}M`);
      console.log(`[L3-MKT-01] Ratio: ${ratio.toFixed(3)}`);

      expect(ratio).toBeLessThanOrEqual(2.0);
    });
  });

  // ------------------------------------------
  // L3-BAL-01: Good play beats passive
  // ------------------------------------------
  describe("L3-BAL-01 Good play beats passive", () => {
    it("optimal strategy wins >= 60% of 20 seeded 8-round games", () => {
      let optimalWins = 0;
      const GAME_COUNT = 20;
      const ROUNDS = 8;

      for (let game = 0; game < GAME_COUNT; game++) {
        const seed = `balance-game-${game}`;

        const outputs = runNRounds({
          teamCount: 2,
          rounds: ROUNDS,
          matchSeed: seed,
          preset: "quick",
          decisionFn: (_state, _round, teamIndex) => {
            // Team 0 (team-1): optimal
            // Team 1 (team-2): passive
            return teamIndex === 0
              ? optimalDecisions()
              : passiveDecisions();
          },
        });

        // Use cumulative totalRevenue across all rounds to determine winner.
        // This captures the full impact of investment decisions over time,
        // rather than a single-round snapshot that rubber-banding may distort.
        let optCumulativeRevenue = 0;
        let pasCumulativeRevenue = 0;
        for (const output of outputs) {
          const optResult = output.results.find(r => r.teamId === "team-1")!;
          const pasResult = output.results.find(r => r.teamId === "team-2")!;
          optCumulativeRevenue += optResult.totalRevenue;
          pasCumulativeRevenue += pasResult.totalRevenue;
        }

        // Also capture final total assets as a secondary signal
        const finalOutput = outputs[outputs.length - 1];
        const optFinal = finalOutput.results.find(r => r.teamId === "team-1")!;
        const pasFinal = finalOutput.results.find(r => r.teamId === "team-2")!;

        // Win if cumulative revenue is higher OR total assets are higher
        const revenueWin = optCumulativeRevenue > pasCumulativeRevenue;
        const assetsWin = optFinal.newState.totalAssets > pasFinal.newState.totalAssets;
        if (revenueWin || assetsWin) {
          optimalWins++;
        }

        if (game < 3) {
          console.log(
            `[L3-BAL-01] Game ${game}: ` +
            `optRev=$${(optCumulativeRevenue / 1e6).toFixed(1)}M ` +
            `pasRev=$${(pasCumulativeRevenue / 1e6).toFixed(1)}M ` +
            `optAssets=$${(optFinal.newState.totalAssets / 1e6).toFixed(1)}M ` +
            `pasAssets=$${(pasFinal.newState.totalAssets / 1e6).toFixed(1)}M`
          );
        }
      }

      const winRate = optimalWins / GAME_COUNT;
      console.log(`[L3-BAL-01] Optimal wins: ${optimalWins}/${GAME_COUNT} (${(winRate * 100).toFixed(1)}%)`);

      expect(winRate).toBeGreaterThanOrEqual(0.60);
    });
  });

  // ------------------------------------------
  // L3-EDGE-01: Zero budget does not crash
  // ------------------------------------------
  describe("L3-EDGE-01 Zero budget does not crash", () => {
    it("all-zero decisions survive 4 rounds with no NaN", () => {
      const outputs = runNRounds({
        teamCount: 1,
        rounds: 4,
        matchSeed: "zero-budget-edge",
        preset: "quick",
        decisionFn: () => allZeroDecisions(),
      });

      expect(outputs).toHaveLength(4);

      for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];
        const result = output.results.find(r => r.teamId === "team-1")!;

        // No NaN in key financial fields
        expect(Number.isNaN(result.newState.revenue)).toBe(false);
        expect(Number.isNaN(result.newState.cash)).toBe(false);
        expect(Number.isNaN(result.newState.netIncome)).toBe(false);
        expect(Number.isNaN(result.newState.totalAssets)).toBe(false);
        expect(Number.isNaN(result.newState.eps)).toBe(false);
        expect(Number.isNaN(result.totalRevenue)).toBe(false);
        expect(Number.isNaN(result.totalCosts)).toBe(false);
        expect(Number.isNaN(result.netIncome)).toBe(false);

        // Revenue may legitimately be 0 for zero-budget play
        expect(result.newState.revenue).toBeGreaterThanOrEqual(0);
        expect(result.newState.cash).toBeDefined();

        console.log(
          `[L3-EDGE-01] Round ${i + 1}: ` +
          `revenue=$${(result.newState.revenue / 1e6).toFixed(2)}M, ` +
          `cash=$${(result.newState.cash / 1e6).toFixed(2)}M, ` +
          `netIncome=$${(result.newState.netIncome / 1e6).toFixed(2)}M`
        );
      }
    });
  });
});
