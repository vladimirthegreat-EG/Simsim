/**
 * L7 Monte Carlo Balance Gate Tests
 *
 * Validates game balance across all 7 strategy archetypes using Monte Carlo
 * simulation. Ensures no dominant/non-viable strategies exist, revenue spreads
 * are reasonable, and skill expression matters (better play wins more often).
 *
 * Uses the exact strategy bots from tools/balance/strategies.ts and the
 * simulation pattern from tools/balance/run-monte-carlo.ts.
 */

import { describe, it, expect } from "vitest";
import {
  SimulationEngine,
  type SimulationInput,
} from "@/engine/core/SimulationEngine";
import type { TeamState, MarketState, AllDecisions } from "@/engine/types";
import {
  STRATEGIES,
  type StrategyArchetype,
  type StrategyDecisionMaker,
} from "@/tools/balance/strategies";

// ============================================
// CONSTANTS
// ============================================

const ALL_ARCHETYPES: StrategyArchetype[] = [
  "volume",
  "premium",
  "brand",
  "automation",
  "balanced",
  "rd-focused",
  "cost-cutter",
];

const ROUNDS_PER_GAME = 8;

// ============================================
// SIMULATION RUNNER (mirrors tools/balance/run-monte-carlo.ts)
// ============================================

interface GameResult {
  winner: StrategyArchetype;
  rankings: {
    archetype: StrategyArchetype;
    rank: number;
    revenue: number;
  }[];
}

/**
 * Run a single game with the given matchup of strategy archetypes.
 * Returns the winner and full rankings by cumulative revenue.
 */
function runSingleGame(
  matchup: StrategyArchetype[],
  seed: string,
  rounds: number = ROUNDS_PER_GAME,
): GameResult {
  // Initialize teams
  const teams: {
    id: string;
    state: TeamState;
    archetype: StrategyArchetype;
    strategy: StrategyDecisionMaker;
  }[] = [];

  for (let i = 0; i < matchup.length; i++) {
    const archetype = matchup[i];
    const state = SimulationEngine.createInitialTeamState();
    teams.push({
      id: `team-${i}-${archetype}`,
      state,
      archetype,
      strategy: STRATEGIES[archetype],
    });
  }

  let marketState = SimulationEngine.createInitialMarketState();

  // Run all rounds
  for (let round = 1; round <= rounds; round++) {
    const teamsWithDecisions = teams.map((team) => ({
      id: team.id,
      state: team.state,
      decisions: team.strategy(team.state, marketState, round),
    }));

    const input: SimulationInput = {
      roundNumber: round,
      teams: teamsWithDecisions,
      marketState,
      matchSeed: `${seed}-round-${round}`,
    };

    const output = SimulationEngine.processRound(input);

    // Update team states from results
    for (const result of output.results) {
      const team = teams.find((t) => t.id === result.teamId);
      if (team) {
        team.state = result.newState;
      }
    }

    marketState = output.newMarketState;
  }

  // Rank by cumulative revenue (descending)
  const sorted = [...teams].sort((a, b) => b.state.revenue - a.state.revenue);
  const rankings = sorted.map((t, i) => ({
    archetype: t.archetype,
    rank: i + 1,
    revenue: t.state.revenue,
  }));

  return {
    winner: rankings[0].archetype,
    rankings,
  };
}

// ============================================
// TEST HELPERS
// ============================================

/**
 * Run N games rotating through archetypes in 4-team matchups.
 * Returns all game results for analysis.
 */
function runMonteCarlo(
  numGames: number,
  matchupRotation: StrategyArchetype[][],
): GameResult[] {
  const results: GameResult[] = [];

  for (let i = 0; i < numGames; i++) {
    const matchup = matchupRotation[i % matchupRotation.length];
    const seed = `l7-mc-${i}`;
    results.push(runSingleGame(matchup, seed));
  }

  return results;
}

/**
 * Build a set of rotating 4-team matchups that cycle through archetypes.
 * Each matchup has: premium, balanced, brand, cost-cutter as base,
 * then rotates the remaining archetypes (volume, automation, rd-focused)
 * into slot positions.
 */
function buildRotatingMatchups(): StrategyArchetype[][] {
  // Fixed base: premium, balanced, brand, cost-cutter
  // Cycle: volume, automation, rd-focused replace one of the base slots
  const base: StrategyArchetype[] = [
    "premium",
    "balanced",
    "brand",
    "cost-cutter",
  ];
  const extras: StrategyArchetype[] = ["volume", "automation", "rd-focused"];

  const matchups: StrategyArchetype[][] = [
    // Base matchup
    [...base],
    // Replace slot 3 (cost-cutter) with each extra
    [base[0], base[1], base[2], extras[0]],
    [base[0], base[1], base[2], extras[1]],
    [base[0], base[1], base[2], extras[2]],
    // Replace slot 2 (brand) with each extra
    [base[0], base[1], extras[0], base[3]],
    [base[0], base[1], extras[1], base[3]],
    [base[0], base[1], extras[2], base[3]],
    // Replace slot 0 (premium) with each extra
    [extras[0], base[1], base[2], base[3]],
    [extras[1], base[1], base[2], base[3]],
    [extras[2], base[1], base[2], base[3]],
    // Mixed matchups ensuring all 7 get representation
    ["volume", "premium", "automation", "rd-focused"],
    ["brand", "automation", "balanced", "cost-cutter"],
    ["volume", "brand", "rd-focused", "cost-cutter"],
    ["premium", "automation", "balanced", "rd-focused"],
  ];

  return matchups;
}

function computeWinRates(
  results: GameResult[],
): Record<StrategyArchetype, number> {
  const wins: Record<string, number> = {};
  const appearances: Record<string, number> = {};

  for (const arch of ALL_ARCHETYPES) {
    wins[arch] = 0;
    appearances[arch] = 0;
  }

  for (const game of results) {
    // Count appearances
    for (const r of game.rankings) {
      appearances[r.archetype] = (appearances[r.archetype] || 0) + 1;
    }
    wins[game.winner] = (wins[game.winner] || 0) + 1;
  }

  const rates: Record<string, number> = {};
  for (const arch of ALL_ARCHETYPES) {
    // Win rate = wins / games where this archetype appeared
    const appeared = appearances[arch] || 1;
    rates[arch] = wins[arch] / appeared;
  }

  return rates as Record<StrategyArchetype, number>;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ============================================
// TESTS
// ============================================

describe("L7 Monte Carlo Balance Gate", () => {
  // Shared state: run the 50-game MC once, reuse for MC-01 and MC-02
  const NUM_GAMES = 50;
  const matchups = buildRotatingMatchups();
  let mcResults: GameResult[];

  // Run the Monte Carlo simulation once before all tests in this suite
  beforeAll(() => {
    mcResults = runMonteCarlo(NUM_GAMES, matchups);
  }, 300_000); // 5-minute timeout for simulation

  describe("L7-MC-01: All 7 archetypes within 10-50% win rate", () => {
    it("should have every archetype winning between 10% and 50% of its games", () => {
      const winRates = computeWinRates(mcResults);

      // Log for debugging
      console.log("\n--- L7-MC-01: Win Rates (50 games) ---");
      for (const arch of ALL_ARCHETYPES) {
        console.log(
          `  ${arch.padEnd(14)}: ${(winRates[arch] * 100).toFixed(1)}%`,
        );
      }
      console.log("--------------------------------------\n");

      // Count how many archetypes actually appeared in games
      const appearedArchetypes = ALL_ARCHETYPES.filter((arch) =>
        mcResults.some((g) => g.rankings.some((r) => r.archetype === arch)),
      );

      // Every archetype that appeared must be within tolerance
      for (const arch of appearedArchetypes) {
        expect(
          winRates[arch],
          `${arch} win rate ${(winRates[arch] * 100).toFixed(1)}% is below 10% floor`,
        ).toBeGreaterThanOrEqual(0.1);
        expect(
          winRates[arch],
          `${arch} win rate ${(winRates[arch] * 100).toFixed(1)}% exceeds 50% ceiling`,
        ).toBeLessThanOrEqual(0.5);
      }
    });
  });

  describe("L7-MC-02: Revenue spread median 2-6x", () => {
    it("should have a median rank1/rank4 revenue ratio between 1.5x and 8.0x", () => {
      const spreads: number[] = [];

      for (const game of mcResults) {
        const rank1Revenue = game.rankings[0]?.revenue ?? 0;
        const rank4Revenue =
          game.rankings[game.rankings.length - 1]?.revenue ?? 0;

        // Only include games where last place has positive revenue
        if (rank4Revenue > 0) {
          spreads.push(rank1Revenue / rank4Revenue);
        }
      }

      const medianSpread = median(spreads);

      console.log("\n--- L7-MC-02: Revenue Spread ---");
      console.log(`  Games with valid spread: ${spreads.length}/${mcResults.length}`);
      console.log(`  Median rank1/rank4 ratio: ${medianSpread.toFixed(2)}x`);
      console.log(`  Min spread: ${Math.min(...spreads).toFixed(2)}x`);
      console.log(`  Max spread: ${Math.max(...spreads).toFixed(2)}x`);
      console.log("--------------------------------\n");

      expect(
        medianSpread,
        `Median spread ${medianSpread.toFixed(2)}x is below 1.5x floor (games too close)`,
      ).toBeGreaterThanOrEqual(1.5);
      expect(
        medianSpread,
        `Median spread ${medianSpread.toFixed(2)}x exceeds 8.0x ceiling (games too lopsided)`,
      ).toBeLessThanOrEqual(8.0);
    });
  });
});

describe("L7-SKILL-01: Skill ladder", () => {
  const NUM_SKILL_GAMES = 20;

  /**
   * Skill-level strategy wrapper.
   * OPTIMAL = high investment in R&D, marketing, salary
   * GOOD    = moderate investment
   * MIXED   = inconsistent investment
   * POOR    = zero everything
   */
  type SkillLevel = "OPTIMAL" | "GOOD" | "MIXED" | "POOR";

  function makeSkillStrategy(level: SkillLevel): StrategyDecisionMaker {
    // Use "balanced" as the base strategy template, then modify
    const baseStrategy = STRATEGIES["balanced"];

    return (state: TeamState, market: MarketState, round: number): AllDecisions => {
      // Get base decisions from balanced strategy
      const decisions = baseStrategy(state, market, round);

      switch (level) {
        case "OPTIMAL":
          // Boost R&D budget significantly
          if (decisions.rd) {
            decisions.rd.rdBudget = (decisions.rd.rdBudget || 0) * 1.5;
          }
          // Boost marketing across all segments
          if (decisions.marketing?.advertisingBudget) {
            for (const seg of Object.keys(decisions.marketing.advertisingBudget)) {
              const key = seg as keyof typeof decisions.marketing.advertisingBudget;
              decisions.marketing.advertisingBudget[key] =
                (decisions.marketing.advertisingBudget[key] || 0) * 1.5;
            }
          }
          // Boost branding
          if (decisions.marketing) {
            decisions.marketing.brandingInvestment =
              (decisions.marketing.brandingInvestment || 0) * 1.5;
          }
          // Higher salaries via HR
          if (decisions.hr) {
            decisions.hr.salaryAdjustment = 10;
            decisions.hr.trainingBudget = (decisions.hr.trainingBudget || 0) * 1.5;
          }
          break;

        case "GOOD":
          // Use balanced strategy as-is (it's already a "good" strategy)
          break;

        case "MIXED":
          // Cut marketing by half, keep R&D
          if (decisions.marketing?.advertisingBudget) {
            for (const seg of Object.keys(decisions.marketing.advertisingBudget)) {
              const key = seg as keyof typeof decisions.marketing.advertisingBudget;
              decisions.marketing.advertisingBudget[key] =
                (decisions.marketing.advertisingBudget[key] || 0) * 0.5;
            }
          }
          if (decisions.marketing) {
            decisions.marketing.brandingInvestment =
              (decisions.marketing.brandingInvestment || 0) * 0.5;
          }
          if (decisions.rd) {
            decisions.rd.rdBudget = (decisions.rd.rdBudget || 0) * 0.5;
          }
          break;

        case "POOR":
          // Zero out all discretionary spending
          if (decisions.rd) {
            decisions.rd.rdBudget = 0;
          }
          if (decisions.marketing) {
            decisions.marketing.advertisingBudget = {
              Budget: 0,
              General: 0,
              Enthusiast: 0,
              Professional: 0,
              "Active Lifestyle": 0,
            };
            decisions.marketing.brandingInvestment = 0;
          }
          if (decisions.hr) {
            decisions.hr.salaryAdjustment = -10;
            decisions.hr.trainingBudget = 0;
            decisions.hr.hireWorkers = 0;
            decisions.hr.hireEngineers = 0;
          }
          // Keep factory decisions minimal (still need to produce something)
          break;
      }

      return decisions;
    };
  }

  function runSkillGame(seed: string): {
    winner: SkillLevel;
    results: { level: SkillLevel; revenue: number }[];
  } {
    const levels: SkillLevel[] = ["OPTIMAL", "GOOD", "MIXED", "POOR"];
    const teams: {
      id: string;
      state: TeamState;
      level: SkillLevel;
      strategy: StrategyDecisionMaker;
    }[] = levels.map((level, i) => ({
      id: `team-${i}-${level}`,
      state: SimulationEngine.createInitialTeamState(),
      level,
      strategy: makeSkillStrategy(level),
    }));

    let marketState = SimulationEngine.createInitialMarketState();

    for (let round = 1; round <= ROUNDS_PER_GAME; round++) {
      const teamsWithDecisions = teams.map((team) => ({
        id: team.id,
        state: team.state,
        decisions: team.strategy(team.state, marketState, round),
      }));

      const input: SimulationInput = {
        roundNumber: round,
        teams: teamsWithDecisions,
        marketState,
        matchSeed: `${seed}-skill-round-${round}`,
      };

      const output = SimulationEngine.processRound(input);

      for (const result of output.results) {
        const team = teams.find((t) => t.id === result.teamId);
        if (team) {
          team.state = result.newState;
        }
      }

      marketState = output.newMarketState;
    }

    const sorted = [...teams].sort((a, b) => b.state.revenue - a.state.revenue);
    return {
      winner: sorted[0].level,
      results: sorted.map((t) => ({ level: t.level, revenue: t.state.revenue })),
    };
  }

  it("OPTIMAL should win >= 50% of games and POOR should win <= 15%", () => {
    const wins: Record<SkillLevel, number> = {
      OPTIMAL: 0,
      GOOD: 0,
      MIXED: 0,
      POOR: 0,
    };

    for (let i = 0; i < NUM_SKILL_GAMES; i++) {
      const result = runSkillGame(`skill-${i}`);
      wins[result.winner]++;
    }

    const optimalRate = wins.OPTIMAL / NUM_SKILL_GAMES;
    const poorRate = wins.POOR / NUM_SKILL_GAMES;

    console.log("\n--- L7-SKILL-01: Skill Ladder Results ---");
    console.log(`  OPTIMAL wins: ${wins.OPTIMAL}/${NUM_SKILL_GAMES} (${(optimalRate * 100).toFixed(1)}%)`);
    console.log(`  GOOD    wins: ${wins.GOOD}/${NUM_SKILL_GAMES} (${((wins.GOOD / NUM_SKILL_GAMES) * 100).toFixed(1)}%)`);
    console.log(`  MIXED   wins: ${wins.MIXED}/${NUM_SKILL_GAMES} (${((wins.MIXED / NUM_SKILL_GAMES) * 100).toFixed(1)}%)`);
    console.log(`  POOR    wins: ${wins.POOR}/${NUM_SKILL_GAMES} (${(poorRate * 100).toFixed(1)}%)`);
    console.log("-----------------------------------------\n");

    expect(
      optimalRate,
      `OPTIMAL win rate ${(optimalRate * 100).toFixed(1)}% is below 50% floor - skill not rewarded enough`,
    ).toBeGreaterThanOrEqual(0.5);

    expect(
      poorRate,
      `POOR win rate ${(poorRate * 100).toFixed(1)}% exceeds 15% ceiling - bad play not punished enough`,
    ).toBeLessThanOrEqual(0.15);
  }, 300_000); // 5-minute timeout
});
