/**
 * Comprehensive Monte Carlo Analysis - ALL 7 STRATEGIES
 *
 * Tests all possible 4-team combinations from 7 strategies
 * C(7,4) = 35 unique matchups
 *
 * Strategies: volume, premium, brand, automation, balanced, rd-focused, cost-cutter
 */

// @ts-nocheck - Needs updates for current engine interfaces

import { SimulationEngine, type SimulationInput } from "../engine/core/SimulationEngine";
import { STRATEGIES } from "../engine/balance/strategies";
import type { StrategyArchetype } from "../engine/balance/strategies";
import { CONSTANTS } from "../engine/types";
import type { TeamState, MarketState, AllDecisions } from "../engine/types";
import { setRandomSeed } from "../engine/utils";

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  simulationsPerMatchup: 100,  // Simulations per unique 4-team combination
  rounds: 8,
  teamsPerGame: 4,
};

// All 7 strategies
const ALL_STRATEGIES: StrategyArchetype[] = [
  "volume",
  "premium",
  "brand",
  "automation",
  "balanced",
  "rd-focused",
  "cost-cutter",
];

// Generate all C(n,k) combinations
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];

  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);

  return [...withFirst, ...withoutFirst];
}

// ============================================
// SIMULATION RUNNER
// ============================================

interface MatchupResult {
  strategies: StrategyArchetype[];
  winCounts: Record<StrategyArchetype, number>;
  avgRevenues: Record<StrategyArchetype, number>;
  avgBrandValues: Record<StrategyArchetype, number>;
  avgRanks: Record<StrategyArchetype, number>;
}

interface GlobalStats {
  totalWins: Record<StrategyArchetype, number>;
  totalGames: Record<StrategyArchetype, number>;
  allRevenues: Record<StrategyArchetype, number[]>;
  allBrandValues: Record<StrategyArchetype, number[]>;
  allRanks: Record<StrategyArchetype, number[]>;
  matchupResults: MatchupResult[];
}

function runMatchup(
  strategies: StrategyArchetype[],
  simulations: number
): MatchupResult {
  const winCounts: Record<string, number> = {};
  const totalRevenues: Record<string, number> = {};
  const totalBrandValues: Record<string, number> = {};
  const totalRanks: Record<string, number> = {};

  for (const s of strategies) {
    winCounts[s] = 0;
    totalRevenues[s] = 0;
    totalBrandValues[s] = 0;
    totalRanks[s] = 0;
  }

  for (let sim = 0; sim < simulations; sim++) {
    const seed = `matchup-${strategies.join("-")}-sim-${sim}`;
    setRandomSeed(seed);

    // Initialize teams with strategies
    const teams = strategies.map((strategy, i) => ({
      id: `team-${i + 1}`,
      state: SimulationEngine.createInitialTeamState(),
      strategy,
      strategyFn: STRATEGIES[strategy],
    }));

    let marketState = SimulationEngine.createInitialMarketState();
    const cumulativeRevenue: Record<string, number> = {};
    for (const team of teams) {
      cumulativeRevenue[team.id] = 0;
    }

    // Run simulation
    for (let round = 1; round <= CONFIG.rounds; round++) {
      const teamsWithDecisions = teams.map((team) => ({
        id: team.id,
        state: team.state,
        decisions: team.strategyFn(team.state, marketState, round),
      }));

      const input: SimulationInput = {
        roundNumber: round,
        teams: teamsWithDecisions,
        marketState,
        matchSeed: `${seed}-round-${round}`,
      };

      const output = SimulationEngine.processRound(input);

      for (const result of output.results) {
        const team = teams.find((t) => t.id === result.teamId);
        if (team) {
          team.state = result.newState;
          cumulativeRevenue[team.id] += result.totalRevenue;
        }
      }

      marketState = output.newMarketState;
    }

    // Calculate final results
    const results = teams.map(t => ({
      strategy: t.strategy,
      revenue: cumulativeRevenue[t.id],
      brandValue: t.state.brandValue,
    })).sort((a, b) => b.revenue - a.revenue);

    // Record results
    for (let rank = 0; rank < results.length; rank++) {
      const r = results[rank];
      totalRevenues[r.strategy] += r.revenue;
      totalBrandValues[r.strategy] += r.brandValue;
      totalRanks[r.strategy] += rank + 1;
      if (rank === 0) {
        winCounts[r.strategy]++;
      }
    }
  }

  return {
    strategies,
    winCounts: winCounts as Record<StrategyArchetype, number>,
    avgRevenues: Object.fromEntries(
      strategies.map(s => [s, totalRevenues[s] / simulations])
    ) as Record<StrategyArchetype, number>,
    avgBrandValues: Object.fromEntries(
      strategies.map(s => [s, totalBrandValues[s] / simulations])
    ) as Record<StrategyArchetype, number>,
    avgRanks: Object.fromEntries(
      strategies.map(s => [s, totalRanks[s] / simulations])
    ) as Record<StrategyArchetype, number>,
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║        COMPREHENSIVE MONTE CARLO - ALL 7 STRATEGIES, ALL COMBINATIONS         ║");
  console.log("╚════════════════════════════════════════════════════════════════════════════════╝\n");

  // Generate all 4-team combinations from 7 strategies
  const allMatchups = combinations(ALL_STRATEGIES, CONFIG.teamsPerGame);
  const totalSimulations = allMatchups.length * CONFIG.simulationsPerMatchup;

  console.log(`Strategies: ${ALL_STRATEGIES.join(", ")}`);
  console.log(`Unique 4-team matchups: ${allMatchups.length}`);
  console.log(`Simulations per matchup: ${CONFIG.simulationsPerMatchup}`);
  console.log(`Total simulations: ${totalSimulations}`);
  console.log(`Rounds per game: ${CONFIG.rounds}\n`);

  // Initialize global stats
  const globalStats: GlobalStats = {
    totalWins: {} as Record<StrategyArchetype, number>,
    totalGames: {} as Record<StrategyArchetype, number>,
    allRevenues: {} as Record<StrategyArchetype, number[]>,
    allBrandValues: {} as Record<StrategyArchetype, number[]>,
    allRanks: {} as Record<StrategyArchetype, number[]>,
    matchupResults: [],
  };

  for (const s of ALL_STRATEGIES) {
    globalStats.totalWins[s] = 0;
    globalStats.totalGames[s] = 0;
    globalStats.allRevenues[s] = [];
    globalStats.allBrandValues[s] = [];
    globalStats.allRanks[s] = [];
  }

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                         RUNNING SIMULATIONS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const startTime = Date.now();

  // Run all matchups
  for (let i = 0; i < allMatchups.length; i++) {
    const matchup = allMatchups[i];
    const result = runMatchup(matchup, CONFIG.simulationsPerMatchup);
    globalStats.matchupResults.push(result);

    // Aggregate stats
    for (const s of matchup) {
      globalStats.totalWins[s] += result.winCounts[s];
      globalStats.totalGames[s] += CONFIG.simulationsPerMatchup;
      globalStats.allRevenues[s].push(result.avgRevenues[s]);
      globalStats.allBrandValues[s].push(result.avgBrandValues[s]);
      globalStats.allRanks[s].push(result.avgRanks[s]);
    }

    // Progress
    if ((i + 1) % 5 === 0 || i === allMatchups.length - 1) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) * CONFIG.simulationsPerMatchup / elapsed;
      const eta = (allMatchups.length - i - 1) * CONFIG.simulationsPerMatchup / rate;
      console.log(`  Matchup ${i + 1}/${allMatchups.length} (${((i + 1) / allMatchups.length * 100).toFixed(1)}%) - ${rate.toFixed(0)} sims/sec - ETA: ${eta.toFixed(0)}s`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\nCompleted ${totalSimulations} simulations in ${totalTime.toFixed(1)}s\n`);

  // ============================================
  // RESULTS
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                      SECTION 1: GLOBAL WIN RATES");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const sortedByWinRate = ALL_STRATEGIES
    .map(s => ({
      strategy: s,
      wins: globalStats.totalWins[s],
      games: globalStats.totalGames[s],
      winRate: globalStats.totalWins[s] / globalStats.totalGames[s],
    }))
    .sort((a, b) => b.winRate - a.winRate);

  console.log("Overall Win Rates (across all matchups):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (const s of sortedByWinRate) {
    const bar = "█".repeat(Math.round(s.winRate * 50));
    const spaces = " ".repeat(50 - bar.length);
    console.log(`  ${s.strategy.padEnd(12)} ${bar}${spaces} ${(s.winRate * 100).toFixed(1)}% (${s.wins}/${s.games})`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                      SECTION 2: AVERAGE REVENUES");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const avgRevByStrategy = ALL_STRATEGIES.map(s => ({
    strategy: s,
    avgRevenue: globalStats.allRevenues[s].reduce((a, b) => a + b, 0) / globalStats.allRevenues[s].length,
  })).sort((a, b) => b.avgRevenue - a.avgRevenue);

  const maxRev = avgRevByStrategy[0].avgRevenue;
  console.log("Average Revenue (over 8 rounds):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (const s of avgRevByStrategy) {
    console.log(`  ${s.strategy.padEnd(12)} $${(s.avgRevenue / 1_000_000).toFixed(1)}M (${(s.avgRevenue / maxRev * 100).toFixed(1)}% of leader)`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                      SECTION 3: AVERAGE RANKS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const avgRankByStrategy = ALL_STRATEGIES.map(s => ({
    strategy: s,
    avgRank: globalStats.allRanks[s].reduce((a, b) => a + b, 0) / globalStats.allRanks[s].length,
  })).sort((a, b) => a.avgRank - b.avgRank);

  console.log("Average Rank (1 = best, 4 = worst):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (const s of avgRankByStrategy) {
    const bar = "█".repeat(Math.round((5 - s.avgRank) * 12.5));
    console.log(`  ${s.strategy.padEnd(12)} ${bar} ${s.avgRank.toFixed(2)}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                      SECTION 4: BRAND VALUES");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const avgBrandByStrategy = ALL_STRATEGIES.map(s => ({
    strategy: s,
    avgBrand: globalStats.allBrandValues[s].reduce((a, b) => a + b, 0) / globalStats.allBrandValues[s].length,
  })).sort((a, b) => b.avgBrand - a.avgBrand);

  console.log("Average Final Brand Value (Round 8):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (const s of avgBrandByStrategy) {
    const bar = "█".repeat(Math.round(s.avgBrand * 50));
    console.log(`  ${s.strategy.padEnd(12)} ${bar} ${(s.avgBrand * 100).toFixed(1)}%`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                      SECTION 5: HEAD-TO-HEAD ANALYSIS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Build head-to-head win matrix
  const h2hWins: Record<string, Record<string, number>> = {};
  const h2hGames: Record<string, Record<string, number>> = {};

  for (const s1 of ALL_STRATEGIES) {
    h2hWins[s1] = {};
    h2hGames[s1] = {};
    for (const s2 of ALL_STRATEGIES) {
      h2hWins[s1][s2] = 0;
      h2hGames[s1][s2] = 0;
    }
  }

  // Count head-to-head from matchup results
  for (const result of globalStats.matchupResults) {
    const strategies = result.strategies;
    for (const s1 of strategies) {
      for (const s2 of strategies) {
        if (s1 !== s2) {
          h2hGames[s1][s2] += CONFIG.simulationsPerMatchup;
          // s1 "beats" s2 if s1 has higher revenue
          if (result.avgRevenues[s1] > result.avgRevenues[s2]) {
            h2hWins[s1][s2] += CONFIG.simulationsPerMatchup;
          }
        }
      }
    }
  }

  console.log("Head-to-Head Win Rates (row beats column):");
  console.log("─────────────────────────────────────────────────────────────────────────────");

  // Print header
  const shortNames: Record<string, string> = {
    "volume": "VOL",
    "premium": "PRE",
    "brand": "BRD",
    "automation": "AUT",
    "balanced": "BAL",
    "rd-focused": "R&D",
    "cost-cutter": "CUT",
  };

  console.log("             " + ALL_STRATEGIES.map(s => shortNames[s].padStart(5)).join(" "));
  for (const s1 of ALL_STRATEGIES) {
    const row = ALL_STRATEGIES.map(s2 => {
      if (s1 === s2) return "  -  ";
      const rate = h2hGames[s1][s2] > 0 ? h2hWins[s1][s2] / h2hGames[s1][s2] : 0;
      return `${(rate * 100).toFixed(0)}%`.padStart(5);
    }).join(" ");
    console.log(`  ${shortNames[s1].padEnd(10)} ${row}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                      SECTION 6: MATCHUP DETAILS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Find most competitive matchups (closest win rates)
  const sortedMatchups = [...globalStats.matchupResults].sort((a, b) => {
    const aSpread = Math.max(...Object.values(a.winCounts)) - Math.min(...Object.values(a.winCounts));
    const bSpread = Math.max(...Object.values(b.winCounts)) - Math.min(...Object.values(b.winCounts));
    return aSpread - bSpread;
  });

  console.log("Top 10 Most Competitive Matchups (closest win spread):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (let i = 0; i < Math.min(10, sortedMatchups.length); i++) {
    const m = sortedMatchups[i];
    const winRates = m.strategies.map(s =>
      `${shortNames[s]}:${(m.winCounts[s] / CONFIG.simulationsPerMatchup * 100).toFixed(0)}%`
    ).join(", ");
    console.log(`  ${i + 1}. ${winRates}`);
  }

  console.log("\nTop 10 Most Lopsided Matchups (widest win spread):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (let i = sortedMatchups.length - 1; i >= Math.max(0, sortedMatchups.length - 10); i--) {
    const m = sortedMatchups[i];
    const winRates = m.strategies.map(s =>
      `${shortNames[s]}:${(m.winCounts[s] / CONFIG.simulationsPerMatchup * 100).toFixed(0)}%`
    ).join(", ");
    console.log(`  ${sortedMatchups.length - i}. ${winRates}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                      SECTION 7: BALANCE ASSESSMENT");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Calculate balance metrics
  const winRates = sortedByWinRate.map(s => s.winRate);
  const maxWinRate = Math.max(...winRates);
  const minWinRate = Math.min(...winRates);
  const avgWinRate = winRates.reduce((a, b) => a + b, 0) / winRates.length;

  // Diversity score (entropy-based)
  const normalizedWinRates = winRates.map(w => w / winRates.reduce((a, b) => a + b, 0));
  const entropy = -normalizedWinRates.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
  const maxEntropy = Math.log2(ALL_STRATEGIES.length);
  const diversityScore = entropy / maxEntropy;

  // Viable strategies (can win at least 5% of games they're in)
  const viableStrategies = sortedByWinRate.filter(s => s.winRate >= 0.05).length;

  // Revenue spread
  const revenues = avgRevByStrategy.map(s => s.avgRevenue);
  const revenueSpread = Math.max(...revenues) / Math.min(...revenues);

  console.log("Balance Metrics:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log(`  Max Win Rate:        ${(maxWinRate * 100).toFixed(1)}% (${sortedByWinRate[0].strategy})`);
  console.log(`  Min Win Rate:        ${(minWinRate * 100).toFixed(1)}% (${sortedByWinRate[sortedByWinRate.length - 1].strategy})`);
  console.log(`  Win Rate Spread:     ${(maxWinRate / Math.max(0.01, minWinRate)).toFixed(1)}x`);
  console.log(`  Diversity Score:     ${diversityScore.toFixed(3)} (1.0 = perfect balance)`);
  console.log(`  Viable Strategies:   ${viableStrategies}/7 (win rate >= 5%)`);
  console.log(`  Revenue Spread:      ${revenueSpread.toFixed(2)}x`);

  console.log("\nBalance Checks:");
  console.log("─────────────────────────────────────────────────────────────────────────────");

  const checks = [
    { name: "No dominant strategy (none >60%)", pass: maxWinRate <= 0.60 },
    { name: "Diversity score >0.7", pass: diversityScore > 0.7 },
    { name: "At least 4 viable strategies", pass: viableStrategies >= 4 },
    { name: "Revenue spread <2.0x", pass: revenueSpread < 2.0 },
    { name: "All strategies can win (>0%)", pass: minWinRate > 0 },
  ];

  let passed = 0;
  for (const check of checks) {
    console.log(`  ${check.pass ? "✅" : "❌"} ${check.name}`);
    if (check.pass) passed++;
  }

  console.log(`\n  Overall: ${passed}/${checks.length} checks passed`);

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                      SECTION 8: STRATEGY TIER LIST");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Tier based on win rate
  const tiers: Record<string, StrategyArchetype[]> = {
    "S (>40%)": [],
    "A (25-40%)": [],
    "B (15-25%)": [],
    "C (5-15%)": [],
    "D (<5%)": [],
  };

  for (const s of sortedByWinRate) {
    if (s.winRate > 0.40) tiers["S (>40%)"].push(s.strategy);
    else if (s.winRate > 0.25) tiers["A (25-40%)"].push(s.strategy);
    else if (s.winRate > 0.15) tiers["B (15-25%)"].push(s.strategy);
    else if (s.winRate > 0.05) tiers["C (5-15%)"].push(s.strategy);
    else tiers["D (<5%)"].push(s.strategy);
  }

  console.log("Strategy Tier List:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (const [tier, strategies] of Object.entries(tiers)) {
    if (strategies.length > 0) {
      console.log(`  ${tier.padEnd(12)} ${strategies.join(", ")}`);
    }
  }

  console.log("\n════════════════════════════════════════════════════════════════════════════════");
  console.log("                              END OF REPORT");
  console.log("════════════════════════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
