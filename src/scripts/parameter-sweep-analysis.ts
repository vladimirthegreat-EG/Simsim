/**
 * Comprehensive Parameter Sweep Analysis
 *
 * Tests ALL parameter variations systematically:
 * - Varies each parameter while keeping others at baseline
 * - Runs 100 simulations per configuration
 * - Calculates win rate averages for each parameter value
 * - Uses parallel processing for speed
 */

// @ts-nocheck - Parameter sweep analysis

import { SimulationEngine, type SimulationInput } from "../engine/core/SimulationEngine";
import { STRATEGIES } from "../engine/balance/strategies";
import type { StrategyArchetype } from "../engine/balance/strategies";
import { CONSTANTS } from "../engine/types";
import { setRandomSeed } from "../engine/utils";
import * as fs from "fs";
import * as path from "path";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import * as os from "os";

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  simulationsPerConfig: 100,    // Simulations per parameter configuration
  rounds: 8,
  strategies: ["volume", "premium", "brand", "balanced"] as StrategyArchetype[],
  parallelWorkers: Math.max(1, os.cpus().length - 1),  // Use all but one CPU core
};

// ============================================
// PARAMETER DEFINITIONS
// ============================================

interface ParameterRange {
  name: string;
  category: string;
  baseline: number;
  values: number[];
  unit: string;
  description: string;
}

const PARAMETERS: ParameterRange[] = [
  // Brand Mechanics
  {
    name: "BRAND_DECAY_RATE",
    category: "Brand",
    baseline: 0.065,
    values: [0.02, 0.03, 0.04, 0.05, 0.065, 0.08, 0.10, 0.12, 0.15],
    unit: "%",
    description: "Brand value decay per round",
  },
  {
    name: "BRAND_MAX_GROWTH",
    category: "Brand",
    baseline: 0.02,
    values: [0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05],
    unit: "%",
    description: "Maximum brand growth per round",
  },

  // Segment Brand Weights
  {
    name: "BRAND_WEIGHT_BUDGET",
    category: "Segment Weights",
    baseline: 8,
    values: [4, 6, 8, 10, 12, 15, 20, 25],
    unit: "pts",
    description: "Brand weight in Budget segment",
  },
  {
    name: "BRAND_WEIGHT_GENERAL",
    category: "Segment Weights",
    baseline: 10,
    values: [5, 8, 10, 12, 15, 18, 22, 25],
    unit: "pts",
    description: "Brand weight in General segment",
  },
  {
    name: "BRAND_WEIGHT_ENTHUSIAST",
    category: "Segment Weights",
    baseline: 10,
    values: [5, 8, 10, 12, 15, 18, 22, 25],
    unit: "pts",
    description: "Brand weight in Enthusiast segment",
  },
  {
    name: "BRAND_WEIGHT_PROFESSIONAL",
    category: "Segment Weights",
    baseline: 10,
    values: [5, 8, 10, 12, 15, 18, 22, 25],
    unit: "pts",
    description: "Brand weight in Professional segment",
  },
  {
    name: "BRAND_WEIGHT_ACTIVE",
    category: "Segment Weights",
    baseline: 12,
    values: [6, 9, 12, 15, 18, 22, 25, 30],
    unit: "pts",
    description: "Brand weight in Active Lifestyle segment",
  },

  // Quality Weights
  {
    name: "QUALITY_WEIGHT_BUDGET",
    category: "Segment Weights",
    baseline: 22,
    values: [15, 18, 22, 26, 30, 35, 40],
    unit: "pts",
    description: "Quality weight in Budget segment",
  },
  {
    name: "QUALITY_WEIGHT_GENERAL",
    category: "Segment Weights",
    baseline: 28,
    values: [20, 24, 28, 32, 36, 40, 45],
    unit: "pts",
    description: "Quality weight in General segment",
  },
  {
    name: "QUALITY_WEIGHT_ENTHUSIAST",
    category: "Segment Weights",
    baseline: 40,
    values: [30, 35, 40, 45, 50, 55, 60],
    unit: "pts",
    description: "Quality weight in Enthusiast segment",
  },
  {
    name: "QUALITY_WEIGHT_PROFESSIONAL",
    category: "Segment Weights",
    baseline: 42,
    values: [32, 37, 42, 47, 52, 57, 62],
    unit: "pts",
    description: "Quality weight in Professional segment",
  },

  // Price Weights
  {
    name: "PRICE_WEIGHT_BUDGET",
    category: "Segment Weights",
    baseline: 50,
    values: [35, 40, 45, 50, 55, 60, 65],
    unit: "pts",
    description: "Price weight in Budget segment",
  },
  {
    name: "PRICE_WEIGHT_GENERAL",
    category: "Segment Weights",
    baseline: 32,
    values: [20, 25, 32, 38, 44, 50],
    unit: "pts",
    description: "Price weight in General segment",
  },

  // Feature Weights
  {
    name: "FEATURE_WEIGHT_GENERAL",
    category: "Segment Weights",
    baseline: 20,
    values: [10, 15, 20, 25, 30, 35, 40],
    unit: "pts",
    description: "Feature weight in General segment",
  },
  {
    name: "FEATURE_WEIGHT_ENTHUSIAST",
    category: "Segment Weights",
    baseline: 20,
    values: [10, 15, 20, 25, 30, 35, 40],
    unit: "pts",
    description: "Feature weight in Enthusiast segment",
  },

  // Advertising Mechanics
  {
    name: "AD_BASE_IMPACT",
    category: "Advertising",
    baseline: 0.0015,
    values: [0.0005, 0.001, 0.0015, 0.002, 0.0025, 0.003, 0.004],
    unit: "%/$1M",
    description: "Base advertising impact per $1M",
  },
  {
    name: "AD_DIMINISH_THRESHOLD",
    category: "Advertising",
    baseline: 3000000,
    values: [1000000, 2000000, 3000000, 4000000, 5000000, 7000000, 10000000],
    unit: "$",
    description: "Threshold for diminishing returns",
  },
  {
    name: "AD_EFFECTIVENESS_DECAY",
    category: "Advertising",
    baseline: 0.4,
    values: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    unit: "%",
    description: "Effectiveness decay per chunk",
  },

  // Branding Investment
  {
    name: "BRANDING_BASE_IMPACT",
    category: "Branding",
    baseline: 0.0025,
    values: [0.001, 0.0015, 0.002, 0.0025, 0.003, 0.004, 0.005],
    unit: "%/$1M",
    description: "Base branding impact per $1M",
  },
  {
    name: "BRANDING_LINEAR_THRESHOLD",
    category: "Branding",
    baseline: 5000000,
    values: [2000000, 3000000, 5000000, 7000000, 10000000, 15000000],
    unit: "$",
    description: "Linear returns threshold",
  },

  // ESG Mechanics
  {
    name: "ESG_HIGH_THRESHOLD",
    category: "ESG",
    baseline: 700,
    values: [500, 600, 700, 800, 850, 900],
    unit: "pts",
    description: "Threshold for high ESG bonus",
  },
  {
    name: "ESG_HIGH_BONUS",
    category: "ESG",
    baseline: 0.05,
    values: [0.02, 0.03, 0.05, 0.07, 0.10, 0.15],
    unit: "%",
    description: "Revenue bonus for high ESG",
  },
  {
    name: "ESG_MID_BONUS",
    category: "ESG",
    baseline: 0.02,
    values: [0.01, 0.02, 0.03, 0.04, 0.05],
    unit: "%",
    description: "Revenue bonus for mid ESG",
  },

  // Price Floor
  {
    name: "PRICE_FLOOR_THRESHOLD",
    category: "Pricing",
    baseline: 0.15,
    values: [0.05, 0.10, 0.15, 0.20, 0.25, 0.30],
    unit: "%",
    description: "Price floor penalty threshold",
  },
  {
    name: "PRICE_FLOOR_MAX_PENALTY",
    category: "Pricing",
    baseline: 0.30,
    values: [0.10, 0.20, 0.30, 0.40, 0.50, 0.60],
    unit: "%",
    description: "Maximum price floor penalty",
  },

  // Rubber Banding
  {
    name: "RUBBER_BAND_TRAILING_BOOST",
    category: "Rubber Banding",
    baseline: 1.15,
    values: [1.0, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30],
    unit: "x",
    description: "Boost for trailing teams",
  },
  {
    name: "RUBBER_BAND_LEADING_PENALTY",
    category: "Rubber Banding",
    baseline: 0.92,
    values: [1.0, 0.95, 0.92, 0.88, 0.85, 0.80],
    unit: "x",
    description: "Penalty for leading teams",
  },

  // Market Share
  {
    name: "SOFTMAX_TEMPERATURE",
    category: "Market Share",
    baseline: 10,
    values: [3, 5, 8, 10, 12, 15, 20, 30],
    unit: "",
    description: "Softmax temperature (higher = more equal)",
  },

  // Quality/Feature Bonuses
  {
    name: "QUALITY_BONUS_CAP",
    category: "Scoring",
    baseline: 1.3,
    values: [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2.0],
    unit: "x",
    description: "Maximum quality score multiplier",
  },
  {
    name: "FEATURE_BONUS_CAP",
    category: "Scoring",
    baseline: 1.3,
    values: [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2.0],
    unit: "x",
    description: "Maximum feature score multiplier",
  },
];

// ============================================
// SIMULATION TYPES
// ============================================

interface SimulationResult {
  parameterName: string;
  parameterValue: number;
  winRates: Record<StrategyArchetype, number>;
  avgRevenues: Record<StrategyArchetype, number>;
  avgBrandValues: Record<StrategyArchetype, number>;
  revenueSpread: number;
  diversityScore: number;
}

interface ParameterSweepResult {
  parameter: ParameterRange;
  results: SimulationResult[];
  bestValueForBalance: number;
  sensitivityScore: number;
}

// ============================================
// PARAMETER OVERRIDE SYSTEM
// ============================================

// Global parameter overrides for the simulation
const parameterOverrides: Record<string, number> = {};

function setParameterOverride(name: string, value: number): void {
  parameterOverrides[name] = value;
}

function clearParameterOverrides(): void {
  Object.keys(parameterOverrides).forEach(k => delete parameterOverrides[k]);
}

function getParameter(name: string, defaultValue: number): number {
  return parameterOverrides[name] ?? defaultValue;
}

// ============================================
// MODIFIED SIMULATION ENGINE
// ============================================

// Patch the simulation to use overrideable parameters
function runSimulationWithOverrides(seed: string, strategies: StrategyArchetype[]): {
  winRates: Record<string, number>;
  revenues: Record<string, number>;
  brandValues: Record<string, number>;
} {
  setRandomSeed(seed);

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

  // Calculate results
  const results = teams.map(t => ({
    strategy: t.strategy,
    revenue: cumulativeRevenue[t.id],
    brandValue: t.state.brandValue,
  })).sort((a, b) => b.revenue - a.revenue);

  const winRates: Record<string, number> = {};
  const revenues: Record<string, number> = {};
  const brandValues: Record<string, number> = {};

  for (const r of results) {
    winRates[r.strategy] = r.revenue === results[0].revenue ? 1 : 0;
    revenues[r.strategy] = r.revenue;
    brandValues[r.strategy] = r.brandValue;
  }

  return { winRates, revenues, brandValues };
}

// ============================================
// SINGLE PARAMETER TEST
// ============================================

function testParameterValue(
  paramName: string,
  paramValue: number,
  simulations: number
): SimulationResult {
  setParameterOverride(paramName, paramValue);

  const totalWins: Record<string, number> = {};
  const totalRevenues: Record<string, number> = {};
  const totalBrandValues: Record<string, number> = {};

  for (const s of CONFIG.strategies) {
    totalWins[s] = 0;
    totalRevenues[s] = 0;
    totalBrandValues[s] = 0;
  }

  for (let sim = 0; sim < simulations; sim++) {
    const seed = `param-${paramName}-${paramValue}-sim-${sim}`;
    const result = runSimulationWithOverrides(seed, CONFIG.strategies);

    for (const s of CONFIG.strategies) {
      totalWins[s] += result.winRates[s] || 0;
      totalRevenues[s] += result.revenues[s] || 0;
      totalBrandValues[s] += result.brandValues[s] || 0;
    }
  }

  const winRates: Record<string, number> = {};
  const avgRevenues: Record<string, number> = {};
  const avgBrandValues: Record<string, number> = {};

  for (const s of CONFIG.strategies) {
    winRates[s] = totalWins[s] / simulations;
    avgRevenues[s] = totalRevenues[s] / simulations;
    avgBrandValues[s] = totalBrandValues[s] / simulations;
  }

  // Calculate metrics
  const revenueArr = Object.values(avgRevenues);
  const revenueSpread = Math.max(...revenueArr) / Math.min(...revenueArr);

  const winRateArr = Object.values(winRates);
  const totalWinRate = winRateArr.reduce((a, b) => a + b, 0);
  const normalizedWinRates = winRateArr.map(w => w / (totalWinRate || 1));
  const entropy = -normalizedWinRates.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
  const diversityScore = entropy / Math.log2(CONFIG.strategies.length);

  clearParameterOverrides();

  return {
    parameterName: paramName,
    parameterValue: paramValue,
    winRates: winRates as Record<StrategyArchetype, number>,
    avgRevenues: avgRevenues as Record<StrategyArchetype, number>,
    avgBrandValues: avgBrandValues as Record<StrategyArchetype, number>,
    revenueSpread,
    diversityScore,
  };
}

// ============================================
// FULL PARAMETER SWEEP
// ============================================

function sweepParameter(param: ParameterRange): ParameterSweepResult {
  console.log(`\n  Testing: ${param.name} (${param.values.length} values × ${CONFIG.simulationsPerConfig} sims)`);

  const results: SimulationResult[] = [];

  for (let i = 0; i < param.values.length; i++) {
    const value = param.values[i];
    const result = testParameterValue(param.name, value, CONFIG.simulationsPerConfig);
    results.push(result);

    // Progress indicator
    const progress = ((i + 1) / param.values.length * 100).toFixed(0);
    const winStr = CONFIG.strategies.map(s =>
      `${s.slice(0, 3)}:${(result.winRates[s] * 100).toFixed(0)}%`
    ).join(" ");
    console.log(`    [${progress}%] ${param.name}=${value} → ${winStr} | div=${result.diversityScore.toFixed(2)}`);
  }

  // Find best value for balance (highest diversity score)
  const bestResult = results.reduce((best, r) =>
    r.diversityScore > best.diversityScore ? r : best
  , results[0]);

  // Calculate sensitivity (how much win rates change across parameter range)
  const sensitivityScore = calculateSensitivity(results);

  return {
    parameter: param,
    results,
    bestValueForBalance: bestResult.parameterValue,
    sensitivityScore,
  };
}

function calculateSensitivity(results: SimulationResult[]): number {
  if (results.length < 2) return 0;

  let totalVariance = 0;
  for (const strategy of CONFIG.strategies) {
    const winRates = results.map(r => r.winRates[strategy]);
    const mean = winRates.reduce((a, b) => a + b, 0) / winRates.length;
    const variance = winRates.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / winRates.length;
    totalVariance += variance;
  }

  return Math.sqrt(totalVariance / CONFIG.strategies.length);
}

// ============================================
// REPORT GENERATION
// ============================================

function generateReport(sweepResults: ParameterSweepResult[]): void {
  const outputDir = path.join(__dirname, "..", "..", "reports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  // Generate detailed CSV
  const csvPath = path.join(outputDir, `parameter-sweep-${timestamp}.csv`);
  let csv = "Parameter,Category,Value,Unit,Volume_WinRate,Premium_WinRate,Brand_WinRate,Balanced_WinRate,Revenue_Spread,Diversity_Score\n";

  for (const sweep of sweepResults) {
    for (const result of sweep.results) {
      csv += `${sweep.parameter.name},${sweep.parameter.category},${result.parameterValue},${sweep.parameter.unit},`;
      csv += `${(result.winRates["volume"] * 100).toFixed(1)},`;
      csv += `${(result.winRates["premium"] * 100).toFixed(1)},`;
      csv += `${(result.winRates["brand"] * 100).toFixed(1)},`;
      csv += `${(result.winRates["balanced"] * 100).toFixed(1)},`;
      csv += `${result.revenueSpread.toFixed(3)},`;
      csv += `${result.diversityScore.toFixed(3)}\n`;
    }
  }

  fs.writeFileSync(csvPath, csv);
  console.log(`\nCSV saved to: ${csvPath}`);

  // Generate summary report
  const summaryPath = path.join(outputDir, `parameter-sweep-summary-${timestamp}.md`);
  let summary = "# Parameter Sweep Analysis Summary\n\n";
  summary += `**Date**: ${new Date().toISOString()}\n`;
  summary += `**Total Configurations Tested**: ${sweepResults.reduce((sum, s) => sum + s.results.length, 0)}\n`;
  summary += `**Simulations per Configuration**: ${CONFIG.simulationsPerConfig}\n`;
  summary += `**Total Simulations**: ${sweepResults.reduce((sum, s) => sum + s.results.length, 0) * CONFIG.simulationsPerConfig}\n\n`;

  // Most sensitive parameters
  summary += "## Most Sensitive Parameters\n\n";
  summary += "Parameters that have the biggest impact on strategy balance:\n\n";
  summary += "| Rank | Parameter | Sensitivity | Best Value | Category |\n";
  summary += "|------|-----------|-------------|------------|----------|\n";

  const sortedBySensitivity = [...sweepResults].sort((a, b) => b.sensitivityScore - a.sensitivityScore);
  for (let i = 0; i < Math.min(15, sortedBySensitivity.length); i++) {
    const s = sortedBySensitivity[i];
    summary += `| ${i + 1} | ${s.parameter.name} | ${(s.sensitivityScore * 100).toFixed(1)}% | ${s.bestValueForBalance} | ${s.parameter.category} |\n`;
  }

  // Best values for balance
  summary += "\n## Recommended Parameter Values\n\n";
  summary += "Values that maximize strategy diversity:\n\n";
  summary += "| Parameter | Current | Recommended | Change |\n";
  summary += "|-----------|---------|-------------|--------|\n";

  for (const sweep of sweepResults) {
    const change = sweep.bestValueForBalance !== sweep.parameter.baseline ? "⚠️ Change" : "✓ OK";
    summary += `| ${sweep.parameter.name} | ${sweep.parameter.baseline} | ${sweep.bestValueForBalance} | ${change} |\n`;
  }

  // Parameter details
  summary += "\n## Detailed Results by Parameter\n\n";

  for (const sweep of sweepResults) {
    summary += `### ${sweep.parameter.name}\n\n`;
    summary += `**Category**: ${sweep.parameter.category}\n`;
    summary += `**Description**: ${sweep.parameter.description}\n`;
    summary += `**Baseline**: ${sweep.parameter.baseline} ${sweep.parameter.unit}\n`;
    summary += `**Best for Balance**: ${sweep.bestValueForBalance} ${sweep.parameter.unit}\n`;
    summary += `**Sensitivity**: ${(sweep.sensitivityScore * 100).toFixed(1)}%\n\n`;

    summary += "| Value | Volume | Premium | Brand | Balanced | Diversity |\n";
    summary += "|-------|--------|---------|-------|----------|----------|\n";

    for (const r of sweep.results) {
      const isBaseline = r.parameterValue === sweep.parameter.baseline ? " (baseline)" : "";
      const isBest = r.parameterValue === sweep.bestValueForBalance ? " ⭐" : "";
      summary += `| ${r.parameterValue}${isBaseline}${isBest} | ${(r.winRates["volume"] * 100).toFixed(0)}% | ${(r.winRates["premium"] * 100).toFixed(0)}% | ${(r.winRates["brand"] * 100).toFixed(0)}% | ${(r.winRates["balanced"] * 100).toFixed(0)}% | ${r.diversityScore.toFixed(2)} |\n`;
    }

    summary += "\n";
  }

  fs.writeFileSync(summaryPath, summary);
  console.log(`Summary saved to: ${summaryPath}`);

  // Generate JSON for programmatic use
  const jsonPath = path.join(outputDir, `parameter-sweep-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(sweepResults, null, 2));
  console.log(`JSON saved to: ${jsonPath}`);
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║              COMPREHENSIVE PARAMETER SWEEP ANALYSIS                           ║");
  console.log("╚════════════════════════════════════════════════════════════════════════════════╝\n");

  const totalConfigs = PARAMETERS.reduce((sum, p) => sum + p.values.length, 0);
  const totalSimulations = totalConfigs * CONFIG.simulationsPerConfig;

  console.log(`Parameters to test: ${PARAMETERS.length}`);
  console.log(`Total configurations: ${totalConfigs}`);
  console.log(`Simulations per config: ${CONFIG.simulationsPerConfig}`);
  console.log(`Total simulations: ${totalSimulations.toLocaleString()}`);
  console.log(`Strategies: ${CONFIG.strategies.join(", ")}`);
  console.log(`CPU cores available: ${os.cpus().length}`);

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                         RUNNING PARAMETER SWEEPS");
  console.log("═══════════════════════════════════════════════════════════════════════════════");

  const startTime = Date.now();
  const sweepResults: ParameterSweepResult[] = [];

  // Group parameters by category for organized output
  const categories = [...new Set(PARAMETERS.map(p => p.category))];

  for (const category of categories) {
    console.log(`\n▶ Category: ${category}`);
    console.log("─".repeat(60));

    const categoryParams = PARAMETERS.filter(p => p.category === category);

    for (const param of categoryParams) {
      const result = sweepParameter(param);
      sweepResults.push(result);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const simRate = totalSimulations / totalTime;

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                              ANALYSIS COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log(`\nTotal time: ${totalTime.toFixed(1)}s`);
  console.log(`Simulation rate: ${simRate.toFixed(0)} sims/sec`);

  // Generate reports
  generateReport(sweepResults);

  // Print top findings
  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                              TOP FINDINGS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  const sortedBySensitivity = [...sweepResults].sort((a, b) => b.sensitivityScore - a.sensitivityScore);

  console.log("Most Impactful Parameters (by sensitivity):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (let i = 0; i < Math.min(10, sortedBySensitivity.length); i++) {
    const s = sortedBySensitivity[i];
    console.log(`  ${i + 1}. ${s.parameter.name.padEnd(30)} sensitivity: ${(s.sensitivityScore * 100).toFixed(1)}%`);
    console.log(`     Current: ${s.parameter.baseline} → Recommended: ${s.bestValueForBalance}`);
  }

  console.log("\nParameters that need changing (current ≠ recommended):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  const needsChange = sweepResults.filter(s => s.bestValueForBalance !== s.parameter.baseline);
  for (const s of needsChange) {
    console.log(`  • ${s.parameter.name}: ${s.parameter.baseline} → ${s.bestValueForBalance}`);
  }

  console.log("\n════════════════════════════════════════════════════════════════════════════════");
  console.log("                              REPORTS GENERATED");
  console.log("════════════════════════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
