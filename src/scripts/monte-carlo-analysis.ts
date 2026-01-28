/**
 * Monte Carlo Parameter Analysis
 *
 * Tests how different weights and variables affect game outcomes.
 * Run with: npx tsx scripts/monte-carlo-analysis.ts
 */

// @ts-nocheck - Needs updates for current engine interfaces

import { SimulationEngine, type SimulationInput } from "../engine/core/SimulationEngine";
import { MarketSimulator } from "../engine/market/MarketSimulator";
import { STRATEGIES, getAvailableStrategies } from "../engine/balance/strategies";
import type { TeamState, MarketState, AllDecisions, Segment } from "../engine/types";
import { setRandomSeed } from "../engine/utils";

// ============================================
// CONFIGURATION
// ============================================

interface MonteCarloConfig {
  simulations: number;
  rounds: number;
  baseSeed: string;
  verbose: boolean;
}

const DEFAULT_CONFIG: MonteCarloConfig = {
  simulations: 100,
  rounds: 8,
  baseSeed: "monte-carlo-test",
  verbose: false,
};

// ============================================
// PARAMETER SETS TO TEST
// ============================================

interface ParameterSet {
  name: string;
  description: string;
  // Segment weight overrides (normally from MarketSimulator.getSegmentWeights)
  segmentWeights?: Partial<Record<Segment, { price: number; quality: number; brand: number; esg: number; features: number }>>;
  // Softmax temperature override
  softmaxTemperature?: number;
  // ESG thresholds
  esgHighThreshold?: number;
  esgMidThreshold?: number;
  // Price floor
  priceFloorPenalty?: number;
}

const PARAMETER_SETS: ParameterSet[] = [
  {
    name: "baseline",
    description: "Current production weights",
  },
  {
    name: "price-heavy",
    description: "Price matters more (60% weight in Budget)",
    segmentWeights: {
      "Budget": { price: 60, quality: 15, brand: 10, esg: 5, features: 10 },
    },
  },
  {
    name: "quality-heavy",
    description: "Quality matters more across all segments",
    segmentWeights: {
      "Budget": { price: 35, quality: 30, brand: 15, esg: 10, features: 10 },
      "General": { price: 25, quality: 35, brand: 20, esg: 10, features: 10 },
      "Professional": { price: 10, quality: 50, brand: 20, esg: 15, features: 5 },
    },
  },
  {
    name: "brand-heavy",
    description: "Brand matters more (30% weight)",
    segmentWeights: {
      "General": { price: 25, quality: 20, brand: 30, esg: 10, features: 15 },
      "Enthusiast": { price: 15, quality: 30, brand: 30, esg: 10, features: 15 },
    },
  },
  {
    name: "esg-heavy",
    description: "ESG matters more (20% weight)",
    segmentWeights: {
      "Professional": { price: 10, quality: 35, brand: 20, esg: 25, features: 10 },
    },
  },
  {
    name: "low-temp",
    description: "Softmax temp 5 (winner takes all)",
    softmaxTemperature: 5,
  },
  {
    name: "high-temp",
    description: "Softmax temp 20 (more equal distribution)",
    softmaxTemperature: 20,
  },
  {
    name: "strict-esg",
    description: "ESG thresholds: high=800, mid=500",
    esgHighThreshold: 800,
    esgMidThreshold: 500,
  },
  {
    name: "lenient-esg",
    description: "ESG thresholds: high=600, mid=300",
    esgHighThreshold: 600,
    esgMidThreshold: 300,
  },
];

// ============================================
// SIMULATION RUNNER
// ============================================

interface SimulationResult {
  winnerId: string;
  winnerStrategy: string;
  revenues: Record<string, number>;
  finalRanks: Record<string, number>;
  bankruptcies: string[];
  revenueSpread: number;
}

function runSimulation(
  seed: string,
  strategyAssignments: Array<{ teamId: string; strategy: string }>,
  rounds: number,
  parameterSet: ParameterSet
): SimulationResult {
  setRandomSeed(seed);

  // Initialize teams
  const teams: Array<{
    id: string;
    state: TeamState;
    strategy: string;
    strategyFn: (state: TeamState, market: MarketState, round: number) => AllDecisions;
  }> = strategyAssignments.map((assignment) => ({
    id: assignment.teamId,
    state: SimulationEngine.createInitialTeamState(),
    strategy: assignment.strategy,
    strategyFn: STRATEGIES[assignment.strategy as keyof typeof STRATEGIES],
  }));

  let marketState = SimulationEngine.createInitialMarketState();
  const cumulativeRevenue: Record<string, number> = {};
  const bankruptcies: string[] = [];

  for (const team of teams) {
    cumulativeRevenue[team.id] = 0;
  }

  // Run rounds
  for (let round = 1; round <= rounds; round++) {
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

    // Update team states and track metrics
    for (const result of output.results) {
      const team = teams.find((t) => t.id === result.teamId);
      if (team) {
        team.state = result.newState;
        cumulativeRevenue[team.id] += result.totalRevenue;

        if (result.newState.cash < 0 && !bankruptcies.includes(team.id)) {
          bankruptcies.push(team.id);
        }
      }
    }

    marketState = output.newMarketState;
  }

  // Calculate final results
  const sortedByRevenue = teams
    .map((t) => ({ id: t.id, strategy: t.strategy, revenue: cumulativeRevenue[t.id] }))
    .sort((a, b) => b.revenue - a.revenue);

  const finalRanks: Record<string, number> = {};
  sortedByRevenue.forEach((t, i) => {
    finalRanks[t.id] = i + 1;
  });

  const maxRevenue = Math.max(...Object.values(cumulativeRevenue));
  const minRevenue = Math.min(...Object.values(cumulativeRevenue));
  const revenueSpread = minRevenue > 0 ? maxRevenue / minRevenue : Infinity;

  return {
    winnerId: sortedByRevenue[0].id,
    winnerStrategy: sortedByRevenue[0].strategy,
    revenues: cumulativeRevenue,
    finalRanks,
    bankruptcies,
    revenueSpread,
  };
}

// ============================================
// MONTE CARLO ANALYSIS
// ============================================

interface AnalysisResult {
  parameterSet: string;
  description: string;
  winRates: Record<string, number>;
  avgRevenue: Record<string, number>;
  avgRevenueSpread: number;
  bankruptcyRate: number;
  dominantStrategy: string | null;
  diversityScore: number;
}

function runMonteCarloAnalysis(
  parameterSet: ParameterSet,
  config: MonteCarloConfig
): AnalysisResult {
  const strategies = ["volume", "premium", "brand", "balanced"];
  const strategyAssignments = strategies.map((strategy, i) => ({
    teamId: `team-${i + 1}`,
    strategy,
  }));

  const wins: Record<string, number> = {};
  const totalRevenue: Record<string, number> = {};
  let totalBankruptcies = 0;
  let totalRevenueSpread = 0;

  for (const strategy of strategies) {
    wins[strategy] = 0;
    totalRevenue[strategy] = 0;
  }

  // Run simulations
  for (let i = 0; i < config.simulations; i++) {
    const seed = `${config.baseSeed}-${parameterSet.name}-${i}`;
    const result = runSimulation(seed, strategyAssignments, config.rounds, parameterSet);

    wins[result.winnerStrategy]++;
    totalBankruptcies += result.bankruptcies.length;
    totalRevenueSpread += result.revenueSpread;

    for (const assignment of strategyAssignments) {
      totalRevenue[assignment.strategy] += result.revenues[assignment.teamId];
    }
  }

  // Calculate metrics
  const winRates: Record<string, number> = {};
  const avgRevenue: Record<string, number> = {};

  for (const strategy of strategies) {
    winRates[strategy] = wins[strategy] / config.simulations;
    avgRevenue[strategy] = totalRevenue[strategy] / config.simulations;
  }

  // Find dominant strategy (>60% win rate)
  const dominantStrategy = Object.entries(winRates).find(([_, rate]) => rate > 0.6)?.[0] || null;

  // Calculate diversity score (entropy-based)
  let entropy = 0;
  for (const rate of Object.values(winRates)) {
    if (rate > 0) {
      entropy -= rate * Math.log2(rate);
    }
  }
  const maxEntropy = Math.log2(strategies.length);
  const diversityScore = maxEntropy > 0 ? entropy / maxEntropy : 0;

  return {
    parameterSet: parameterSet.name,
    description: parameterSet.description,
    winRates,
    avgRevenue,
    avgRevenueSpread: totalRevenueSpread / config.simulations,
    bankruptcyRate: totalBankruptcies / (config.simulations * strategies.length),
    dominantStrategy,
    diversityScore,
  };
}

// ============================================
// SENSITIVITY ANALYSIS
// ============================================

interface SensitivityResult {
  parameter: string;
  values: number[];
  winRatesByValue: Record<number, Record<string, number>>;
  optimalValue: number;
  optimalDiversity: number;
}

function runSensitivityAnalysis(
  parameterName: string,
  values: number[],
  config: MonteCarloConfig
): SensitivityResult {
  const strategies = ["volume", "premium", "brand", "balanced"];
  const strategyAssignments = strategies.map((strategy, i) => ({
    teamId: `team-${i + 1}`,
    strategy,
  }));

  const winRatesByValue: Record<number, Record<string, number>> = {};
  let optimalValue = values[0];
  let optimalDiversity = 0;

  for (const value of values) {
    const wins: Record<string, number> = {};
    for (const strategy of strategies) {
      wins[strategy] = 0;
    }

    // Run simulations for this parameter value
    for (let i = 0; i < config.simulations; i++) {
      const seed = `${config.baseSeed}-sensitivity-${parameterName}-${value}-${i}`;
      setRandomSeed(seed);

      const teams = strategyAssignments.map((assignment) => ({
        id: assignment.teamId,
        state: SimulationEngine.createInitialTeamState(),
        strategy: assignment.strategy,
        strategyFn: STRATEGIES[assignment.strategy as keyof typeof STRATEGIES],
      }));

      let marketState = SimulationEngine.createInitialMarketState();
      const cumulativeRevenue: Record<string, number> = {};

      for (const team of teams) {
        cumulativeRevenue[team.id] = 0;
      }

      for (let round = 1; round <= config.rounds; round++) {
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

      // Find winner
      const winner = Object.entries(cumulativeRevenue).sort((a, b) => b[1] - a[1])[0];
      const winnerTeam = strategyAssignments.find((a) => a.teamId === winner[0]);
      if (winnerTeam) {
        wins[winnerTeam.strategy]++;
      }
    }

    // Calculate win rates for this value
    const winRates: Record<string, number> = {};
    for (const strategy of strategies) {
      winRates[strategy] = wins[strategy] / config.simulations;
    }
    winRatesByValue[value] = winRates;

    // Calculate diversity
    let entropy = 0;
    for (const rate of Object.values(winRates)) {
      if (rate > 0) {
        entropy -= rate * Math.log2(rate);
      }
    }
    const diversity = entropy / Math.log2(strategies.length);

    if (diversity > optimalDiversity) {
      optimalDiversity = diversity;
      optimalValue = value;
    }
  }

  return {
    parameter: parameterName,
    values,
    winRatesByValue,
    optimalValue,
    optimalDiversity,
  };
}

// ============================================
// REPORTING
// ============================================

function printAnalysisReport(results: AnalysisResult[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("                    MONTE CARLO PARAMETER ANALYSIS REPORT");
  console.log("=".repeat(80) + "\n");

  for (const result of results) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`Parameter Set: ${result.parameterSet.toUpperCase()}`);
    console.log(`Description: ${result.description}`);
    console.log(`${"─".repeat(60)}`);

    console.log("\nWin Rates:");
    for (const [strategy, rate] of Object.entries(result.winRates)) {
      const bar = "█".repeat(Math.round(rate * 40));
      const padding = " ".repeat(40 - bar.length);
      console.log(`  ${strategy.padEnd(12)} ${bar}${padding} ${(rate * 100).toFixed(1)}%`);
    }

    console.log("\nAverage Revenue:");
    for (const [strategy, revenue] of Object.entries(result.avgRevenue)) {
      console.log(`  ${strategy.padEnd(12)} $${(revenue / 1_000_000).toFixed(1)}M`);
    }

    console.log(`\nMetrics:`);
    console.log(`  Revenue Spread:   ${result.avgRevenueSpread.toFixed(2)}x`);
    console.log(`  Bankruptcy Rate:  ${(result.bankruptcyRate * 100).toFixed(1)}%`);
    console.log(`  Diversity Score:  ${result.diversityScore.toFixed(3)}`);

    if (result.dominantStrategy) {
      console.log(`  ⚠️  DOMINANT: ${result.dominantStrategy} (>60% win rate)`);
    } else {
      console.log(`  ✅ No dominant strategy detected`);
    }
  }

  // Summary comparison
  console.log("\n" + "=".repeat(80));
  console.log("                              SUMMARY COMPARISON");
  console.log("=".repeat(80));
  console.log("\n" + "Parameter Set".padEnd(20) + "Diversity".padEnd(12) + "Spread".padEnd(10) + "Dominant?");
  console.log("-".repeat(60));

  for (const result of results) {
    const dominantFlag = result.dominantStrategy ? `⚠️ ${result.dominantStrategy}` : "✅ None";
    console.log(
      result.parameterSet.padEnd(20) +
      result.diversityScore.toFixed(3).padEnd(12) +
      result.avgRevenueSpread.toFixed(2).padEnd(10) +
      dominantFlag
    );
  }

  // Find best parameters
  const bestByDiversity = results.reduce((a, b) => (a.diversityScore > b.diversityScore ? a : b));
  console.log(`\n🏆 Best for Diversity: ${bestByDiversity.parameterSet} (${bestByDiversity.diversityScore.toFixed(3)})`);
}

function printSensitivityReport(results: SensitivityResult[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("                    SENSITIVITY ANALYSIS REPORT");
  console.log("=".repeat(80));

  for (const result of results) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`Parameter: ${result.parameter}`);
    console.log(`Optimal Value: ${result.optimalValue} (diversity: ${result.optimalDiversity.toFixed(3)})`);
    console.log(`${"─".repeat(60)}`);

    console.log("\nValue".padEnd(10) + "Volume".padEnd(12) + "Premium".padEnd(12) + "Brand".padEnd(12) + "Balanced");
    console.log("-".repeat(58));

    for (const value of result.values) {
      const rates = result.winRatesByValue[value];
      console.log(
        value.toString().padEnd(10) +
        `${(rates.volume * 100).toFixed(0)}%`.padEnd(12) +
        `${(rates.premium * 100).toFixed(0)}%`.padEnd(12) +
        `${(rates.brand * 100).toFixed(0)}%`.padEnd(12) +
        `${(rates.balanced * 100).toFixed(0)}%`
      );
    }
  }
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const config: MonteCarloConfig = {
    simulations: parseInt(process.argv[2]) || 100,
    rounds: parseInt(process.argv[3]) || 8,
    baseSeed: "monte-carlo-analysis",
    verbose: process.argv.includes("--verbose"),
  };

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║            MONTE CARLO PARAMETER ANALYSIS                      ║");
  console.log("╠════════════════════════════════════════════════════════════════╣");
  console.log(`║  Simulations: ${config.simulations.toString().padEnd(47)}║`);
  console.log(`║  Rounds per sim: ${config.rounds.toString().padEnd(44)}║`);
  console.log(`║  Seed: ${config.baseSeed.padEnd(54)}║`);
  console.log("╚════════════════════════════════════════════════════════════════╝");

  // Run parameter set analysis
  console.log("\nAnalyzing parameter sets...");
  const parameterResults: AnalysisResult[] = [];

  for (const paramSet of PARAMETER_SETS) {
    process.stdout.write(`  Testing ${paramSet.name}...`);
    const result = runMonteCarloAnalysis(paramSet, config);
    parameterResults.push(result);
    console.log(" done");
  }

  printAnalysisReport(parameterResults);

  // Run sensitivity analysis on key parameters
  console.log("\nRunning sensitivity analysis...");

  const sensitivityResults: SensitivityResult[] = [];

  // Softmax temperature sensitivity
  process.stdout.write("  Analyzing softmax temperature...");
  sensitivityResults.push(
    runSensitivityAnalysis("softmax_temperature", [3, 5, 7, 10, 15, 20, 30], config)
  );
  console.log(" done");

  printSensitivityReport(sensitivityResults);

  console.log("\n✅ Analysis complete!\n");
}

main().catch(console.error);
