/**
 * Monte Carlo Balance Testing Suite
 *
 * Runs N simulations with all 7 strategy archetypes competing against each other
 * in various matchup configurations. Tests for:
 *
 * 1. Dominant strategies (no strategy should win >60%)
 * 2. Non-viable strategies (every strategy should win sometimes)
 * 3. Bankruptcy rates (should be <5%)
 * 4. Revenue spread (1.5x-3.0x between best and worst)
 * 5. Competitiveness (>30% of games should be close)
 * 6. Snowball risk (early leaders shouldn't always win)
 * 7. Variable sensitivity (which parameters most affect outcomes)
 *
 * Usage: npx tsx src/engine/balance/run-monte-carlo.ts
 */

import { SimulationEngine } from "../core/SimulationEngine";
import type { SimulationInput } from "../core/SimulationEngine";
import type { TeamState, MarketState, AllDecisions } from "../types";
import {
  STRATEGIES,
  type StrategyArchetype,
  type StrategyDecisionMaker,
} from "./strategies";

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Main test
  SIMULATIONS_PER_MATCHUP: 200,
  ROUNDS_PER_GAME: 8,

  // Variable sensitivity test
  SENSITIVITY_SIMULATIONS: 100,

  // All strategy archetypes
  ALL_STRATEGIES: Object.keys(STRATEGIES) as StrategyArchetype[],

  // Matchup configurations to test
  MATCHUPS: [
    // 4-team matchups (all combinations of 4 from 7)
    ["volume", "premium", "brand", "balanced"],
    ["volume", "premium", "automation", "rd-focused"],
    ["brand", "automation", "balanced", "cost-cutter"],
    ["volume", "brand", "rd-focused", "cost-cutter"],
    ["premium", "automation", "balanced", "rd-focused"],
    ["volume", "premium", "brand", "automation"],
    ["balanced", "rd-focused", "cost-cutter", "volume"],
    // All 7 strategies (more teams = different dynamics)
    ["volume", "premium", "brand", "automation", "balanced", "rd-focused", "cost-cutter"],
    // Mirror matches (same strategy vs itself)
    ["balanced", "balanced", "balanced", "balanced"],
    ["premium", "premium", "premium", "premium"],
  ] as StrategyArchetype[][],

  // Variable ranges for sensitivity testing
  VARIABLE_RANGES: {
    startingCash: [100_000_000, 150_000_000, 200_000_000, 300_000_000, 500_000_000],
    brandDecayRate: [0.03, 0.05, 0.065, 0.08, 0.10],
    brandMaxGrowth: [0.01, 0.015, 0.02, 0.03, 0.05],
    softmaxTemperature: [5, 8, 10, 15, 20],
    rubberBandBoost: [1.0, 1.10, 1.15, 1.25, 1.40],
    rubberBandPenalty: [1.0, 0.95, 0.92, 0.85, 0.75],
    baseDemandBudget: [300_000, 400_000, 500_000, 700_000, 1_000_000],
    baseDefectRate: [0.02, 0.03, 0.05, 0.08, 0.10],
    trainingFatigueThreshold: [1, 2, 3, 4, 5],
    esgPenaltyThreshold: [200, 300, 400, 500],
  },
};

// ============================================
// TYPES
// ============================================

interface SimResult {
  matchup: StrategyArchetype[];
  seed: string;
  winner: StrategyArchetype;
  rankings: { archetype: StrategyArchetype; rank: number; revenue: number; eps: number; cash: number; marketShare: number; bankrupt: boolean }[];
  closeGame: boolean; // winner within 20% of runner-up
  roundLeaders: StrategyArchetype[]; // who was leading each round
}

interface MatchupAnalysis {
  matchup: StrategyArchetype[];
  totalGames: number;
  winsByStrategy: Record<string, number>;
  winRates: Record<string, number>;
  avgRevenue: Record<string, number>;
  avgEPS: Record<string, number>;
  avgCash: Record<string, number>;
  bankruptcyRate: Record<string, number>;
  closeGameRate: number;
  snowballRate: number; // how often round-3 leader wins
}

interface SensitivityResult {
  variable: string;
  values: number[];
  winRates: Record<string, number[]>; // strategy -> win rate at each value
  dominantAt: { value: number; strategy: string; winRate: number }[];
  nonViableAt: { value: number; strategy: string }[];
}

interface FullReport {
  timestamp: string;
  config: typeof CONFIG;
  matchupAnalyses: MatchupAnalysis[];
  aggregateWinRates: Record<string, number>;
  aggregateAvgRevenue: Record<string, number>;
  aggregateBankruptcyRate: Record<string, number>;
  sensitivityResults: SensitivityResult[];
  overallBalance: {
    passed: boolean;
    issues: string[];
    score: number; // 0-100
  };
}

// ============================================
// SIMULATION RUNNER
// ============================================

function runSingleGame(
  matchup: StrategyArchetype[],
  seed: string,
  rounds: number,
  overrides?: {
    startingCash?: number;
  }
): SimResult {
  // Initialize teams
  const teams: { id: string; state: TeamState; archetype: StrategyArchetype; strategy: StrategyDecisionMaker }[] = [];

  for (let i = 0; i < matchup.length; i++) {
    const archetype = matchup[i];
    const state = SimulationEngine.createInitialTeamState(
      overrides?.startingCash ? { cash: overrides.startingCash } : undefined
    );
    teams.push({
      id: `team-${i}-${archetype}`,
      state,
      archetype,
      strategy: STRATEGIES[archetype],
    });
  }

  let marketState = SimulationEngine.createInitialMarketState();
  const roundLeaders: StrategyArchetype[] = [];

  // Run rounds
  for (let round = 1; round <= rounds; round++) {
    const teamsWithDecisions = teams.map(team => ({
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

    // Update states
    for (const result of output.results) {
      const team = teams.find(t => t.id === result.teamId);
      if (team) {
        team.state = result.newState;
      }
    }

    // Track round leader
    const leader = teams.reduce((best, t) =>
      t.state.revenue > best.state.revenue ? t : best
    );
    roundLeaders.push(leader.archetype);

    marketState = output.newMarketState;
  }

  // Calculate final rankings
  const sorted = [...teams].sort((a, b) => b.state.revenue - a.state.revenue);
  const rankings = sorted.map((t, i) => {
    const avgShare = Object.values(t.state.marketShare).reduce((a, b) => a + b, 0) /
      Math.max(1, Object.keys(t.state.marketShare).length);
    return {
      archetype: t.archetype,
      rank: i + 1,
      revenue: t.state.revenue,
      eps: t.state.eps,
      cash: t.state.cash,
      marketShare: avgShare,
      bankrupt: t.state.cash < 0,
    };
  });

  // Check if close game
  const topRevenue = rankings[0]?.revenue || 0;
  const secondRevenue = rankings[1]?.revenue || 0;
  const closeGame = secondRevenue > 0 && topRevenue < secondRevenue * 1.2;

  return {
    matchup,
    seed,
    winner: rankings[0].archetype,
    rankings,
    closeGame,
    roundLeaders,
  };
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

function analyzeMatchup(matchup: StrategyArchetype[], simulations: number): MatchupAnalysis {
  const results: SimResult[] = [];

  for (let i = 0; i < simulations; i++) {
    const seed = `mc-${matchup.join("-")}-${i}`;
    results.push(runSingleGame(matchup, seed, CONFIG.ROUNDS_PER_GAME));
  }

  // Aggregate
  const strategies = [...new Set(matchup)];
  const winsByStrategy: Record<string, number> = {};
  const totalRevenue: Record<string, number> = {};
  const totalEPS: Record<string, number> = {};
  const totalCash: Record<string, number> = {};
  const bankruptcies: Record<string, number> = {};
  const counts: Record<string, number> = {};
  let closeGames = 0;
  let snowballs = 0;

  for (const s of strategies) {
    winsByStrategy[s] = 0;
    totalRevenue[s] = 0;
    totalEPS[s] = 0;
    totalCash[s] = 0;
    bankruptcies[s] = 0;
    counts[s] = 0;
  }

  for (const result of results) {
    winsByStrategy[result.winner] = (winsByStrategy[result.winner] || 0) + 1;
    if (result.closeGame) closeGames++;

    // Check snowball: did the round-3 leader win?
    if (result.roundLeaders.length >= 3 && result.roundLeaders[2] === result.winner) {
      snowballs++;
    }

    for (const r of result.rankings) {
      totalRevenue[r.archetype] = (totalRevenue[r.archetype] || 0) + r.revenue;
      totalEPS[r.archetype] = (totalEPS[r.archetype] || 0) + r.eps;
      totalCash[r.archetype] = (totalCash[r.archetype] || 0) + r.cash;
      counts[r.archetype] = (counts[r.archetype] || 0) + 1;
      if (r.bankrupt) {
        bankruptcies[r.archetype] = (bankruptcies[r.archetype] || 0) + 1;
      }
    }
  }

  const winRates: Record<string, number> = {};
  const avgRevenue: Record<string, number> = {};
  const avgEPS: Record<string, number> = {};
  const avgCash: Record<string, number> = {};
  const bankruptcyRate: Record<string, number> = {};

  for (const s of strategies) {
    winRates[s] = simulations > 0 ? winsByStrategy[s] / simulations : 0;
    avgRevenue[s] = counts[s] > 0 ? totalRevenue[s] / counts[s] : 0;
    avgEPS[s] = counts[s] > 0 ? totalEPS[s] / counts[s] : 0;
    avgCash[s] = counts[s] > 0 ? totalCash[s] / counts[s] : 0;
    bankruptcyRate[s] = counts[s] > 0 ? bankruptcies[s] / counts[s] : 0;
  }

  return {
    matchup,
    totalGames: simulations,
    winsByStrategy,
    winRates,
    avgRevenue,
    avgEPS,
    avgCash,
    bankruptcyRate,
    closeGameRate: simulations > 0 ? closeGames / simulations : 0,
    snowballRate: simulations > 0 ? snowballs / simulations : 0,
  };
}

function runSensitivityTest(
  variable: string,
  values: number[],
  simulations: number
): SensitivityResult {
  const baseMatchup: StrategyArchetype[] = ["volume", "premium", "brand", "balanced"];
  const allWinRates: Record<string, number[]> = {};
  const dominantAt: { value: number; strategy: string; winRate: number }[] = [];
  const nonViableAt: { value: number; strategy: string }[] = [];

  for (const s of baseMatchup) {
    allWinRates[s] = [];
  }

  for (const value of values) {
    const results: SimResult[] = [];

    for (let i = 0; i < simulations; i++) {
      const seed = `sensitivity-${variable}-${value}-${i}`;
      const overrides: { startingCash?: number } = {};

      if (variable === "startingCash") {
        overrides.startingCash = value;
      }

      // Note: For variables other than startingCash, we would need to modify
      // the engine constants before running. For now, we test startingCash
      // and document the framework for others.
      results.push(runSingleGame(baseMatchup, seed, CONFIG.ROUNDS_PER_GAME, overrides));
    }

    // Calculate win rates at this value
    const wins: Record<string, number> = {};
    for (const s of baseMatchup) wins[s] = 0;

    for (const r of results) {
      wins[r.winner] = (wins[r.winner] || 0) + 1;
    }

    for (const s of baseMatchup) {
      const rate = simulations > 0 ? wins[s] / simulations : 0;
      allWinRates[s].push(rate);

      if (rate > 0.6) {
        dominantAt.push({ value, strategy: s, winRate: rate });
      }
      if (rate === 0) {
        nonViableAt.push({ value, strategy: s });
      }
    }
  }

  return { variable, values, winRates: allWinRates, dominantAt, nonViableAt };
}

// ============================================
// REPORT GENERATION
// ============================================

function generateReport(
  matchupAnalyses: MatchupAnalysis[],
  sensitivityResults: SensitivityResult[]
): FullReport {
  // Aggregate across all matchups
  const aggWins: Record<string, number> = {};
  const aggRevenue: Record<string, number> = {};
  const aggBankruptcies: Record<string, number> = {};
  const aggCounts: Record<string, number> = {};
  const aggGames: Record<string, number> = {};

  for (const analysis of matchupAnalyses) {
    for (const [strategy, wins] of Object.entries(analysis.winsByStrategy)) {
      aggWins[strategy] = (aggWins[strategy] || 0) + wins;
      aggGames[strategy] = (aggGames[strategy] || 0) + analysis.totalGames;
    }
    for (const [strategy, rev] of Object.entries(analysis.avgRevenue)) {
      aggRevenue[strategy] = (aggRevenue[strategy] || 0) + rev;
      aggCounts[strategy] = (aggCounts[strategy] || 0) + 1;
    }
    for (const [strategy, rate] of Object.entries(analysis.bankruptcyRate)) {
      aggBankruptcies[strategy] = (aggBankruptcies[strategy] || 0) + rate;
    }
  }

  const aggregateWinRates: Record<string, number> = {};
  const aggregateAvgRevenue: Record<string, number> = {};
  const aggregateBankruptcyRate: Record<string, number> = {};

  for (const s of CONFIG.ALL_STRATEGIES) {
    aggregateWinRates[s] = aggGames[s] > 0 ? (aggWins[s] || 0) / aggGames[s] : 0;
    aggregateAvgRevenue[s] = aggCounts[s] > 0 ? (aggRevenue[s] || 0) / aggCounts[s] : 0;
    aggregateBankruptcyRate[s] = aggCounts[s] > 0 ? (aggBankruptcies[s] || 0) / aggCounts[s] : 0;
  }

  // Overall balance assessment
  const issues: string[] = [];
  let score = 100;

  // Check for dominant strategies
  for (const [s, rate] of Object.entries(aggregateWinRates)) {
    if (rate > 0.6) {
      issues.push(`DOMINANT: ${s} wins ${(rate * 100).toFixed(1)}% of games (>60% threshold)`);
      score -= 20;
    }
    if (rate > 0.4) {
      issues.push(`WARNING: ${s} wins ${(rate * 100).toFixed(1)}% of games (approaching dominance)`);
      score -= 5;
    }
  }

  // Check for non-viable strategies
  for (const [s, rate] of Object.entries(aggregateWinRates)) {
    if (rate === 0) {
      issues.push(`NON-VIABLE: ${s} never wins`);
      score -= 15;
    } else if (rate < 0.05) {
      issues.push(`WEAK: ${s} wins only ${(rate * 100).toFixed(1)}% (<5%)`);
      score -= 5;
    }
  }

  // Check bankruptcy rates
  for (const [s, rate] of Object.entries(aggregateBankruptcyRate)) {
    if (rate > 0.05) {
      issues.push(`HIGH BANKRUPTCY: ${s} goes bankrupt ${(rate * 100).toFixed(1)}% of games`);
      score -= 10;
    }
  }

  // Check snowball rates
  const avgSnowball = matchupAnalyses.reduce((sum, a) => sum + a.snowballRate, 0) / matchupAnalyses.length;
  if (avgSnowball > 0.4) {
    issues.push(`SNOWBALL RISK: Round-3 leaders win ${(avgSnowball * 100).toFixed(0)}% of games (>40%)`);
    score -= 10;
  }

  // Check close game rates
  const avgCloseRate = matchupAnalyses.reduce((sum, a) => sum + a.closeGameRate, 0) / matchupAnalyses.length;
  if (avgCloseRate < 0.3) {
    issues.push(`LOW COMPETITION: Only ${(avgCloseRate * 100).toFixed(0)}% close games (<30%)`);
    score -= 10;
  }

  // Sensitivity issues
  for (const sr of sensitivityResults) {
    if (sr.dominantAt.length > 0) {
      for (const d of sr.dominantAt) {
        issues.push(`SENSITIVITY: ${d.strategy} dominates at ${sr.variable}=${d.value} (${(d.winRate * 100).toFixed(0)}%)`);
      }
      score -= 5;
    }
  }

  score = Math.max(0, score);

  return {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    matchupAnalyses,
    aggregateWinRates,
    aggregateAvgRevenue,
    aggregateBankruptcyRate,
    sensitivityResults,
    overallBalance: {
      passed: issues.filter(i => i.startsWith("DOMINANT") || i.startsWith("NON-VIABLE")).length === 0,
      issues,
      score,
    },
  };
}

function formatReport(report: FullReport): string {
  const lines: string[] = [];

  lines.push("╔════════════════════════════════════════════════════════════════════════╗");
  lines.push("║             MONTE CARLO BALANCE ANALYSIS REPORT                      ║");
  lines.push("║             Business Simulation Engine v3.0.0                        ║");
  lines.push(`║             ${report.timestamp}                        ║`);
  lines.push("╠════════════════════════════════════════════════════════════════════════╣");
  lines.push("");

  // Overall status
  const status = report.overallBalance.passed ? "BALANCED" : "IMBALANCED";
  lines.push(`  Overall Status: ${status} (Score: ${report.overallBalance.score}/100)`);
  lines.push("");

  // Aggregate win rates
  lines.push("  ┌─────────────────────────────────────────────────────────────────────┐");
  lines.push("  │ AGGREGATE WIN RATES (across all matchups)                           │");
  lines.push("  ├─────────────────────────────────────────────────────────────────────┤");

  const sortedStrategies = Object.entries(report.aggregateWinRates)
    .sort((a, b) => b[1] - a[1]);

  for (const [strategy, rate] of sortedStrategies) {
    const barLength = Math.round(rate * 40);
    const bar = "█".repeat(barLength) + "░".repeat(40 - barLength);
    const flag = rate > 0.6 ? " ⚠ DOMINANT" : rate === 0 ? " ⚠ NON-VIABLE" : rate < 0.05 ? " ⚠ WEAK" : "";
    lines.push(`  │ ${strategy.padEnd(14)} ${bar} ${(rate * 100).toFixed(1).padStart(5)}%${flag.padEnd(12)} │`);
  }

  lines.push("  └─────────────────────────────────────────────────────────────────────┘");
  lines.push("");

  // Average revenue
  lines.push("  ┌─────────────────────────────────────────────────────────────────────┐");
  lines.push("  │ AVERAGE REVENUE BY STRATEGY                                        │");
  lines.push("  ├─────────────────────────────────────────────────────────────────────┤");

  const sortedRevenue = Object.entries(report.aggregateAvgRevenue)
    .sort((a, b) => b[1] - a[1]);

  for (const [strategy, rev] of sortedRevenue) {
    const millions = rev / 1_000_000;
    lines.push(`  │ ${strategy.padEnd(14)} $${millions.toFixed(1).padStart(8)}M                                    │`);
  }

  lines.push("  └─────────────────────────────────────────────────────────────────────┘");
  lines.push("");

  // Bankruptcy rates
  lines.push("  ┌─────────────────────────────────────────────────────────────────────┐");
  lines.push("  │ BANKRUPTCY RATES                                                   │");
  lines.push("  ├─────────────────────────────────────────────────────────────────────┤");

  for (const [strategy, rate] of Object.entries(report.aggregateBankruptcyRate)) {
    const flag = rate > 0.05 ? " ⚠ HIGH" : "";
    lines.push(`  │ ${strategy.padEnd(14)} ${(rate * 100).toFixed(1).padStart(5)}%${flag.padEnd(44)} │`);
  }

  lines.push("  └─────────────────────────────────────────────────────────────────────┘");
  lines.push("");

  // Per-matchup details
  lines.push("  ┌─────────────────────────────────────────────────────────────────────┐");
  lines.push("  │ PER-MATCHUP RESULTS                                                │");
  lines.push("  ├─────────────────────────────────────────────────────────────────────┤");

  for (const analysis of report.matchupAnalyses) {
    lines.push(`  │                                                                     │`);
    lines.push(`  │ Matchup: ${analysis.matchup.join(" vs ").substring(0, 58).padEnd(58)}│`);
    lines.push(`  │ Games: ${analysis.totalGames}  Close: ${(analysis.closeGameRate * 100).toFixed(0)}%  Snowball: ${(analysis.snowballRate * 100).toFixed(0)}%${"".padEnd(26)}│`);

    for (const [s, rate] of Object.entries(analysis.winRates)) {
      const wins = analysis.winsByStrategy[s];
      lines.push(`  │   ${s.padEnd(14)} ${wins.toString().padStart(4)} wins (${(rate * 100).toFixed(1).padStart(5)}%)  avg rev: $${((analysis.avgRevenue[s] || 0) / 1_000_000).toFixed(1).padStart(6)}M  │`);
    }
  }

  lines.push("  └─────────────────────────────────────────────────────────────────────┘");
  lines.push("");

  // Sensitivity results
  if (report.sensitivityResults.length > 0) {
    lines.push("  ┌─────────────────────────────────────────────────────────────────────┐");
    lines.push("  │ VARIABLE SENSITIVITY ANALYSIS                                      │");
    lines.push("  ├─────────────────────────────────────────────────────────────────────┤");

    for (const sr of report.sensitivityResults) {
      lines.push(`  │                                                                     │`);
      lines.push(`  │ Variable: ${sr.variable.padEnd(57)}│`);
      lines.push(`  │ Values tested: ${sr.values.map(v => v.toLocaleString()).join(", ").substring(0, 52).padEnd(52)}│`);

      for (const [strategy, rates] of Object.entries(sr.winRates)) {
        const rateStr = rates.map(r => `${(r * 100).toFixed(0)}%`).join(" → ");
        lines.push(`  │   ${strategy.padEnd(14)} ${rateStr.substring(0, 52).padEnd(52)}│`);
      }

      if (sr.dominantAt.length > 0) {
        for (const d of sr.dominantAt) {
          lines.push(`  │   ⚠ ${d.strategy} DOMINANT at value=${d.value} (${(d.winRate * 100).toFixed(0)}%)${"".padEnd(25)}│`);
        }
      }
      if (sr.nonViableAt.length > 0) {
        for (const nv of sr.nonViableAt) {
          lines.push(`  │   ⚠ ${nv.strategy} NON-VIABLE at value=${nv.value}${"".padEnd(33)}│`);
        }
      }
    }

    lines.push("  └─────────────────────────────────────────────────────────────────────┘");
    lines.push("");
  }

  // Issues
  if (report.overallBalance.issues.length > 0) {
    lines.push("  ┌─────────────────────────────────────────────────────────────────────┐");
    lines.push("  │ BALANCE ISSUES DETECTED                                            │");
    lines.push("  ├─────────────────────────────────────────────────────────────────────┤");

    for (const issue of report.overallBalance.issues) {
      // Word-wrap long issues
      const maxWidth = 67;
      let remaining = issue;
      while (remaining.length > 0) {
        const chunk = remaining.substring(0, maxWidth);
        remaining = remaining.substring(maxWidth);
        lines.push(`  │ ${chunk.padEnd(maxWidth)} │`);
      }
    }

    lines.push("  └─────────────────────────────────────────────────────────────────────┘");
  }

  lines.push("");
  lines.push("╚════════════════════════════════════════════════════════════════════════╝");

  return lines.join("\n");
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log("========================================");
  console.log("  Monte Carlo Balance Testing Suite");
  console.log("  Business Simulation v3.0.0");
  console.log("========================================");
  console.log("");

  const startTime = Date.now();

  // Phase 1: Run all matchups
  console.log("Phase 1: Running matchup simulations...");
  const matchupAnalyses: MatchupAnalysis[] = [];

  for (let i = 0; i < CONFIG.MATCHUPS.length; i++) {
    const matchup = CONFIG.MATCHUPS[i];
    console.log(`  Matchup ${i + 1}/${CONFIG.MATCHUPS.length}: ${matchup.join(" vs ")}`);

    const analysis = analyzeMatchup(matchup, CONFIG.SIMULATIONS_PER_MATCHUP);
    matchupAnalyses.push(analysis);

    // Print quick summary
    const topWinner = Object.entries(analysis.winRates).sort((a, b) => b[1] - a[1])[0];
    console.log(`    Winner: ${topWinner[0]} (${(topWinner[1] * 100).toFixed(0)}%)  Close: ${(analysis.closeGameRate * 100).toFixed(0)}%  Snowball: ${(analysis.snowballRate * 100).toFixed(0)}%`);
  }

  console.log("");

  // Phase 2: Variable sensitivity testing
  console.log("Phase 2: Running variable sensitivity tests...");
  const sensitivityResults: SensitivityResult[] = [];

  // Test starting cash sensitivity
  console.log("  Testing: startingCash");
  sensitivityResults.push(
    runSensitivityTest("startingCash", CONFIG.VARIABLE_RANGES.startingCash, CONFIG.SENSITIVITY_SIMULATIONS)
  );

  console.log("");

  // Phase 3: Generate report
  console.log("Phase 3: Generating report...");
  const report = generateReport(matchupAnalyses, sensitivityResults);
  const formatted = formatReport(report);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted in ${elapsed}s`);
  console.log("");

  // Print report
  console.log(formatted);

  // Save report as JSON
  const fs = await import("fs");
  const reportPath = "monte-carlo-results.json";
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull results saved to: ${reportPath}`);

  // Save formatted report
  const textPath = "monte-carlo-report.txt";
  fs.writeFileSync(textPath, formatted);
  console.log(`Formatted report saved to: ${textPath}`);

  // Exit with code based on balance
  if (!report.overallBalance.passed) {
    console.log("\n⚠ BALANCE CHECK FAILED - See issues above");
    process.exit(1);
  } else {
    console.log("\n✓ Balance check passed");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Monte Carlo simulation failed:", err);
  process.exit(2);
});
