/**
 * Monte Carlo Full Report - Comprehensive analysis with weight details
 *
 * Run with: npx tsx scripts/monte-carlo-full-report.ts [simulations]
 */

// @ts-nocheck - Needs updates for current engine interfaces

import { SimulationEngine, type SimulationInput } from "../engine/core/SimulationEngine";
import { MarketSimulator } from "../engine/market/MarketSimulator";
import { STRATEGIES } from "../engine/balance/strategies";
import { CONSTANTS, type Segment } from "../engine/types";
import type { TeamState, MarketState, AllDecisions } from "../engine/types";
import { setRandomSeed } from "../engine/utils";

// ============================================
// CURRENT WEIGHTS DOCUMENTATION
// ============================================

// v2.4.0 - Final balance tuning for multi-strategy viability
const CURRENT_SEGMENT_WEIGHTS = {
  "Budget":          { price: 50, quality: 22, brand: 8, esg: 8, features: 12 },
  "General":         { price: 32, quality: 28, brand: 10, esg: 10, features: 20 },
  "Enthusiast":      { price: 20, quality: 40, brand: 10, esg: 10, features: 20 },
  "Professional":    { price: 15, quality: 42, brand: 10, esg: 16, features: 17 },
  "Active Lifestyle": { price: 25, quality: 32, brand: 12, esg: 10, features: 21 },
};

const CURRENT_CONSTANTS = {
  // ESG
  ESG_HIGH_THRESHOLD: CONSTANTS.ESG_HIGH_THRESHOLD,
  ESG_MID_THRESHOLD: CONSTANTS.ESG_MID_THRESHOLD,
  ESG_LOW_THRESHOLD: CONSTANTS.ESG_LOW_THRESHOLD,
  ESG_HIGH_BONUS: CONSTANTS.ESG_HIGH_BONUS,
  ESG_MID_BONUS: CONSTANTS.ESG_MID_BONUS,
  ESG_LOW_PENALTY_MAX: CONSTANTS.ESG_LOW_PENALTY_MAX,
  ESG_LOW_PENALTY_MIN: CONSTANTS.ESG_LOW_PENALTY_MIN,

  // Price Floor
  PRICE_FLOOR_PENALTY_THRESHOLD: CONSTANTS.PRICE_FLOOR_PENALTY_THRESHOLD,
  PRICE_FLOOR_PENALTY_MAX: CONSTANTS.PRICE_FLOOR_PENALTY_MAX,

  // Brand
  BRAND_DECAY_RATE: CONSTANTS.BRAND_DECAY_RATE,
  BRAND_MAX_GROWTH_PER_ROUND: CONSTANTS.BRAND_MAX_GROWTH_PER_ROUND,

  // Rubber Banding
  RUBBER_BAND_TRAILING_BOOST: CONSTANTS.RUBBER_BAND_TRAILING_BOOST,
  RUBBER_BAND_LEADING_PENALTY: CONSTANTS.RUBBER_BAND_LEADING_PENALTY,
  RUBBER_BAND_THRESHOLD: CONSTANTS.RUBBER_BAND_THRESHOLD,

  // Softmax Temperature (hardcoded in MarketSimulator)
  SOFTMAX_TEMPERATURE: 10,
};

// ============================================
// STRATEGY DESCRIPTIONS
// ============================================

const STRATEGY_DETAILS: Record<string, { description: string; focus: string; spendProfile: string }> = {
  volume: {
    description: "Maximize production and sales volume",
    focus: "Budget & General segments, low prices",
    spendProfile: "10% factory workers, 9% marketing (Budget/General), 3% R&D",
  },
  premium: {
    description: "High-quality, high-margin products",
    focus: "Professional & Enthusiast segments",
    spendProfile: "10% machinery, 7% engineers, 11% marketing (premium), 12% R&D",
  },
  brand: {
    description: "Heavy marketing and brand building",
    focus: "All segments via brand value",
    spendProfile: "4% factory, 32% marketing, 15% branding, 4% sponsorships, 5% R&D",
  },
  automation: {
    description: "Aggressive factory automation",
    focus: "Efficiency and scale",
    spendProfile: "Buy automation upgrade early ($80M), then 14% machinery/factory",
  },
  balanced: {
    description: "Moderate investment across all areas",
    focus: "Diversified, steady growth",
    spendProfile: "12% factory, 14% marketing, 4% branding, 7% R&D, 1% ESG",
  },
  "rd-focused": {
    description: "Maximum R&D investment",
    focus: "Product improvements and patents",
    spendProfile: "8% factory (engineers), 13% marketing, 25% R&D",
  },
  "cost-cutter": {
    description: "Minimize expenses",
    focus: "Conservative cash management",
    spendProfile: "2% factory, 2% marketing, 2% R&D, heavy discounts",
  },
};

// ============================================
// SIMULATION RUNNER
// ============================================

interface RoundMetrics {
  round: number;
  revenues: Record<string, number>;
  marketShares: Record<string, number>;
  brandValues: Record<string, number>;
  cash: Record<string, number>;
}

interface SimulationResult {
  seed: string;
  winnerId: string;
  winnerStrategy: string;
  finalRevenues: Record<string, number>;
  finalRanks: Record<string, number>;
  roundMetrics: RoundMetrics[];
  marginOfVictory: number;
}

function runSimulation(
  seed: string,
  strategyAssignments: Array<{ teamId: string; strategy: string }>,
  rounds: number
): SimulationResult {
  setRandomSeed(seed);

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
  const roundMetrics: RoundMetrics[] = [];

  for (const team of teams) {
    cumulativeRevenue[team.id] = 0;
  }

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

    const roundRevenues: Record<string, number> = {};
    const roundShares: Record<string, number> = {};
    const roundBrands: Record<string, number> = {};
    const roundCash: Record<string, number> = {};

    for (const result of output.results) {
      const team = teams.find((t) => t.id === result.teamId);
      if (team) {
        team.state = result.newState;
        cumulativeRevenue[team.id] += result.totalRevenue;

        roundRevenues[team.strategy] = result.totalRevenue;
        roundShares[team.strategy] = Object.values(result.newState.marketShare).reduce((a, b) => a + b, 0);
        roundBrands[team.strategy] = result.newState.brandValue;
        roundCash[team.strategy] = result.newState.cash;
      }
    }

    roundMetrics.push({
      round,
      revenues: roundRevenues,
      marketShares: roundShares,
      brandValues: roundBrands,
      cash: roundCash,
    });

    marketState = output.newMarketState;
  }

  const sortedByRevenue = teams
    .map((t) => ({ id: t.id, strategy: t.strategy, revenue: cumulativeRevenue[t.id] }))
    .sort((a, b) => b.revenue - a.revenue);

  const finalRanks: Record<string, number> = {};
  const finalRevenues: Record<string, number> = {};
  sortedByRevenue.forEach((t, i) => {
    finalRanks[t.strategy] = i + 1;
    finalRevenues[t.strategy] = t.revenue;
  });

  const marginOfVictory = sortedByRevenue.length > 1
    ? (sortedByRevenue[0].revenue - sortedByRevenue[1].revenue) / sortedByRevenue[1].revenue
    : 0;

  return {
    seed,
    winnerId: sortedByRevenue[0].id,
    winnerStrategy: sortedByRevenue[0].strategy,
    finalRevenues,
    finalRanks,
    roundMetrics,
    marginOfVictory,
  };
}

// ============================================
// MAIN ANALYSIS
// ============================================

async function main(): Promise<void> {
  const simulations = parseInt(process.argv[2]) || 5000;
  const rounds = 8;
  const baseSeed = "full-report";

  const strategies = ["volume", "premium", "brand", "balanced"];
  const strategyAssignments = strategies.map((strategy, i) => ({
    teamId: `team-${i + 1}`,
    strategy,
  }));

  console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║             MONTE CARLO FULL ANALYSIS REPORT (v2.4.0 Balance Patch)           ║");
  console.log("╚════════════════════════════════════════════════════════════════════════════════╝\n");

  // ============================================
  // SECTION 1: CURRENT WEIGHTS
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                         SECTION 1: CURRENT WEIGHTS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  console.log("SEGMENT SCORING WEIGHTS (sum to 100 per segment):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log("Segment          │ Price │ Quality │ Brand │ ESG │ Features");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (const [segment, weights] of Object.entries(CURRENT_SEGMENT_WEIGHTS)) {
    console.log(
      `${segment.padEnd(17)}│ ${weights.price.toString().padEnd(6)}│ ${weights.quality.toString().padEnd(8)}│ ${weights.brand.toString().padEnd(6)}│ ${weights.esg.toString().padEnd(4)}│ ${weights.features}`
    );
  }
  console.log("─────────────────────────────────────────────────────────────────────────────\n");

  console.log("KEY CONSTANTS:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log(`  Softmax Temperature:      ${CURRENT_CONSTANTS.SOFTMAX_TEMPERATURE} (controls winner-take-all intensity)`);
  console.log(`  Brand Decay Rate:         ${(CURRENT_CONSTANTS.BRAND_DECAY_RATE * 100).toFixed(1)}% per round`);
  console.log(`  Brand Max Growth:         ${(CURRENT_CONSTANTS.BRAND_MAX_GROWTH_PER_ROUND * 100).toFixed(1)}% per round`);
  console.log(`  ESG High Threshold:       ${CURRENT_CONSTANTS.ESG_HIGH_THRESHOLD}+ (${(CURRENT_CONSTANTS.ESG_HIGH_BONUS * 100).toFixed(0)}% bonus)`);
  console.log(`  ESG Mid Threshold:        ${CURRENT_CONSTANTS.ESG_MID_THRESHOLD}-${CURRENT_CONSTANTS.ESG_HIGH_THRESHOLD - 1} (${(CURRENT_CONSTANTS.ESG_MID_BONUS * 100).toFixed(0)}% bonus)`);
  console.log(`  ESG Low Penalty:          <${CURRENT_CONSTANTS.ESG_LOW_THRESHOLD} (${(CURRENT_CONSTANTS.ESG_LOW_PENALTY_MIN * 100).toFixed(0)}-${(CURRENT_CONSTANTS.ESG_LOW_PENALTY_MAX * 100).toFixed(0)}% penalty)`);
  console.log(`  Price Floor Threshold:    ${(CURRENT_CONSTANTS.PRICE_FLOOR_PENALTY_THRESHOLD * 100).toFixed(0)}% below segment min`);
  console.log(`  Price Floor Max Penalty:  ${(CURRENT_CONSTANTS.PRICE_FLOOR_PENALTY_MAX * 100).toFixed(0)}% score reduction`);
  console.log(`  Rubber Band Boost:        ${((CURRENT_CONSTANTS.RUBBER_BAND_TRAILING_BOOST - 1) * 100).toFixed(0)}% for trailing teams`);
  console.log(`  Rubber Band Penalty:      ${((1 - CURRENT_CONSTANTS.RUBBER_BAND_LEADING_PENALTY) * 100).toFixed(0)}% for leading teams`);
  console.log("─────────────────────────────────────────────────────────────────────────────\n");

  // ============================================
  // SECTION 2: STRATEGY PROFILES
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                       SECTION 2: STRATEGY PROFILES");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  for (const [name, details] of Object.entries(STRATEGY_DETAILS)) {
    if (strategies.includes(name)) {
      console.log(`${name.toUpperCase()}`);
      console.log(`  Description: ${details.description}`);
      console.log(`  Focus: ${details.focus}`);
      console.log(`  Spend Profile: ${details.spendProfile}`);
      console.log("");
    }
  }

  // ============================================
  // SECTION 3: RUN SIMULATIONS
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                       SECTION 3: SIMULATION RESULTS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  console.log(`Running ${simulations} simulations with ${rounds} rounds each...`);

  const wins: Record<string, number> = {};
  const totalRevenue: Record<string, number> = {};
  const totalMarginOfVictory: Record<string, number> = {};
  const rankCounts: Record<string, Record<number, number>> = {};
  const roundByRoundRevenue: Record<string, number[]> = {};
  const roundByRoundBrand: Record<string, number[]> = {};

  for (const strategy of strategies) {
    wins[strategy] = 0;
    totalRevenue[strategy] = 0;
    totalMarginOfVictory[strategy] = 0;
    rankCounts[strategy] = { 1: 0, 2: 0, 3: 0, 4: 0 };
    roundByRoundRevenue[strategy] = Array(rounds).fill(0);
    roundByRoundBrand[strategy] = Array(rounds).fill(0);
  }

  const startTime = Date.now();

  for (let i = 0; i < simulations; i++) {
    if (i % 500 === 0 && i > 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = i / elapsed;
      const remaining = (simulations - i) / rate;
      console.log(`  Progress: ${i}/${simulations} (${(i/simulations*100).toFixed(1)}%) - ETA: ${remaining.toFixed(0)}s`);
    }

    const seed = `${baseSeed}-${i}`;
    const result = runSimulation(seed, strategyAssignments, rounds);

    wins[result.winnerStrategy]++;
    totalMarginOfVictory[result.winnerStrategy] += result.marginOfVictory;

    for (const strategy of strategies) {
      totalRevenue[strategy] += result.finalRevenues[strategy];
      rankCounts[strategy][result.finalRanks[strategy]]++;

      for (let r = 0; r < rounds; r++) {
        roundByRoundRevenue[strategy][r] += result.roundMetrics[r].revenues[strategy] || 0;
        roundByRoundBrand[strategy][r] += result.roundMetrics[r].brandValues[strategy] || 0;
      }
    }
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\nCompleted ${simulations} simulations in ${elapsed.toFixed(1)}s (${(simulations/elapsed).toFixed(0)} sims/sec)\n`);

  // ============================================
  // RESULTS: WIN RATES
  // ============================================

  console.log("WIN RATES:");
  console.log("─────────────────────────────────────────────────────────────────────────────");

  const sortedByWins = strategies.sort((a, b) => wins[b] - wins[a]);
  for (const strategy of sortedByWins) {
    const winRate = wins[strategy] / simulations;
    const bar = "█".repeat(Math.round(winRate * 50));
    const padding = " ".repeat(50 - bar.length);
    const avgMargin = wins[strategy] > 0 ? totalMarginOfVictory[strategy] / wins[strategy] : 0;
    console.log(`  ${strategy.padEnd(12)} ${bar}${padding} ${(winRate * 100).toFixed(1)}% (${wins[strategy]} wins, avg margin: ${(avgMargin * 100).toFixed(1)}%)`);
  }
  console.log("");

  // Dominant strategy check
  const dominant = sortedByWins.find(s => wins[s] / simulations > 0.6);
  if (dominant) {
    console.log(`  ⚠️  DOMINANT STRATEGY DETECTED: ${dominant} wins ${(wins[dominant]/simulations*100).toFixed(1)}% of games\n`);
  } else {
    console.log(`  ✅ No dominant strategy (none >60%)\n`);
  }

  // ============================================
  // RESULTS: RANK DISTRIBUTION
  // ============================================

  console.log("RANK DISTRIBUTION:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log("Strategy     │ 1st Place │ 2nd Place │ 3rd Place │ 4th Place │ Avg Rank");
  console.log("─────────────────────────────────────────────────────────────────────────────");

  for (const strategy of strategies) {
    const avgRank = (
      rankCounts[strategy][1] * 1 +
      rankCounts[strategy][2] * 2 +
      rankCounts[strategy][3] * 3 +
      rankCounts[strategy][4] * 4
    ) / simulations;

    console.log(
      `${strategy.padEnd(12)} │ ${((rankCounts[strategy][1]/simulations)*100).toFixed(1).padStart(8)}% │ ${((rankCounts[strategy][2]/simulations)*100).toFixed(1).padStart(8)}% │ ${((rankCounts[strategy][3]/simulations)*100).toFixed(1).padStart(8)}% │ ${((rankCounts[strategy][4]/simulations)*100).toFixed(1).padStart(8)}% │ ${avgRank.toFixed(2)}`
    );
  }
  console.log("");

  // ============================================
  // RESULTS: AVERAGE REVENUE
  // ============================================

  console.log("AVERAGE TOTAL REVENUE (over 8 rounds):");
  console.log("─────────────────────────────────────────────────────────────────────────────");

  const maxRevenue = Math.max(...strategies.map(s => totalRevenue[s] / simulations));
  const minRevenue = Math.min(...strategies.map(s => totalRevenue[s] / simulations));

  for (const strategy of strategies) {
    const avgRev = totalRevenue[strategy] / simulations;
    const pctOfMax = (avgRev / maxRevenue) * 100;
    console.log(`  ${strategy.padEnd(12)} $${(avgRev / 1_000_000).toFixed(1)}M (${pctOfMax.toFixed(1)}% of leader)`);
  }
  console.log(`\n  Revenue Spread: ${(maxRevenue / minRevenue).toFixed(2)}x (max/min)\n`);

  // ============================================
  // RESULTS: ROUND-BY-ROUND ANALYSIS
  // ============================================

  console.log("ROUND-BY-ROUND AVERAGE REVENUE:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log("Round │ " + strategies.map(s => s.padEnd(12)).join(" │ "));
  console.log("─────────────────────────────────────────────────────────────────────────────");

  for (let r = 0; r < rounds; r++) {
    const row = strategies.map(s => {
      const avg = roundByRoundRevenue[s][r] / simulations;
      return `$${(avg / 1_000_000).toFixed(1)}M`.padEnd(12);
    });
    console.log(`  ${r + 1}   │ ${row.join(" │ ")}`);
  }
  console.log("");

  console.log("ROUND-BY-ROUND AVERAGE BRAND VALUE:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log("Round │ " + strategies.map(s => s.padEnd(12)).join(" │ "));
  console.log("─────────────────────────────────────────────────────────────────────────────");

  for (let r = 0; r < rounds; r++) {
    const row = strategies.map(s => {
      const avg = roundByRoundBrand[s][r] / simulations;
      return `${(avg * 100).toFixed(1)}%`.padEnd(12);
    });
    console.log(`  ${r + 1}   │ ${row.join(" │ ")}`);
  }
  console.log("");

  // ============================================
  // SECTION 4: BALANCE ASSESSMENT
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                       SECTION 4: BALANCE ASSESSMENT");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Diversity score (entropy-based)
  let entropy = 0;
  for (const strategy of strategies) {
    const rate = wins[strategy] / simulations;
    if (rate > 0) {
      entropy -= rate * Math.log2(rate);
    }
  }
  const maxEntropy = Math.log2(strategies.length);
  const diversityScore = maxEntropy > 0 ? entropy / maxEntropy : 0;

  const uniqueWinners = strategies.filter(s => wins[s] > 0).length;

  console.log("BALANCE METRICS:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log(`  Diversity Score:     ${diversityScore.toFixed(3)} (target: >0.7, 1.0 = perfect balance)`);
  console.log(`  Unique Winners:      ${uniqueWinners}/${strategies.length} strategies can win`);
  console.log(`  Revenue Spread:      ${(maxRevenue / minRevenue).toFixed(2)}x (target: 1.5-3.0x)`);
  console.log(`  Dominant Strategy:   ${dominant || "None"}`);
  console.log("");

  // Pass/Fail checks
  console.log("BALANCE CHECKS:");
  console.log("─────────────────────────────────────────────────────────────────────────────");

  const checks = [
    { name: "No dominant strategy (none >60%)", pass: !dominant },
    { name: "Diversity score >0.7", pass: diversityScore > 0.7 },
    { name: "At least 3 viable strategies", pass: uniqueWinners >= 3 },
    { name: "Revenue spread 1.5-3.0x", pass: maxRevenue/minRevenue >= 1.5 && maxRevenue/minRevenue <= 3.0 },
  ];

  for (const check of checks) {
    console.log(`  ${check.pass ? "✅" : "❌"} ${check.name}`);
  }

  const passedChecks = checks.filter(c => c.pass).length;
  console.log(`\n  Overall: ${passedChecks}/${checks.length} checks passed\n`);

  // ============================================
  // SECTION 5: RECOMMENDATIONS
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                       SECTION 5: RECOMMENDATIONS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  if (dominant) {
    console.log(`ISSUE: ${dominant.toUpperCase()} strategy is dominant\n`);

    if (dominant === "brand") {
      console.log("Suggested fixes for brand dominance:");
      console.log("  1. Increase BRAND_DECAY_RATE from 2% to 4-5% per round");
      console.log("  2. Reduce brand weight in segment scoring (currently 15-25%)");
      console.log("  3. Add diminishing returns to branding investment");
      console.log("  4. Cap maximum brand value growth per round (currently 3%)");
      console.log("  5. Increase cost of sponsorships and marketing");
    } else if (dominant === "premium") {
      console.log("Suggested fixes for premium dominance:");
      console.log("  1. Reduce quality weight in Professional segment");
      console.log("  2. Add quality maintenance costs");
      console.log("  3. Reduce R&D effectiveness");
    } else if (dominant === "volume") {
      console.log("Suggested fixes for volume dominance:");
      console.log("  1. Reduce price weight in Budget segment");
      console.log("  2. Strengthen price floor penalties");
      console.log("  3. Add capacity constraints");
    }
  } else if (diversityScore < 0.7) {
    console.log("ISSUE: Low strategy diversity\n");
    console.log("Suggested fixes:");
    console.log("  1. Increase differentiation between strategies");
    console.log("  2. Add unique advantages for each approach");
    console.log("  3. Create rock-paper-scissors dynamics");
  } else {
    console.log("✅ Game appears reasonably balanced!\n");
    console.log("Consider:");
    console.log("  1. Running more simulations for statistical confidence");
    console.log("  2. Testing additional strategy combinations");
    console.log("  3. Adding player skill variance to strategies");
  }

  console.log("\n════════════════════════════════════════════════════════════════════════════════");
  console.log("                              END OF REPORT");
  console.log("════════════════════════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
