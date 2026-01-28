/**
 * Monte Carlo Comprehensive Analysis
 *
 * Tests ALL weights and formulas in the simulation engine.
 * Run with: npx tsx scripts/monte-carlo-comprehensive.ts [simulations]
 */

// @ts-nocheck - Needs updates for current engine interfaces

import { SimulationEngine, type SimulationInput } from "../engine/core/SimulationEngine";
import { MarketSimulator } from "../engine/market/MarketSimulator";
import { MarketingModule } from "../engine/modules/MarketingModule";
import { STRATEGIES } from "../engine/balance/strategies";
import { CONSTANTS, type Segment } from "../engine/types";
import type { TeamState, MarketState, AllDecisions } from "../engine/types";
import { setRandomSeed } from "../engine/utils";

// ============================================
// ALL CURRENT PARAMETERS
// ============================================

const ALL_PARAMETERS = {
  // ========== SEGMENT SCORING WEIGHTS ==========
  segmentWeights: {
    "Budget":          { price: 50, quality: 22, brand: 8, esg: 8, features: 12 },
    "General":         { price: 32, quality: 28, brand: 10, esg: 10, features: 20 },
    "Enthusiast":      { price: 20, quality: 40, brand: 10, esg: 10, features: 20 },
    "Professional":    { price: 15, quality: 42, brand: 10, esg: 16, features: 17 },
    "Active Lifestyle": { price: 25, quality: 32, brand: 12, esg: 10, features: 21 },
  },

  // ========== BRAND MECHANICS ==========
  brand: {
    decayRate: CONSTANTS.BRAND_DECAY_RATE,                    // 6.5% per round
    maxGrowthPerRound: CONSTANTS.BRAND_MAX_GROWTH_PER_ROUND,  // 2% max
    scoreFormula: "sqrt(brandValue) * weight",                // Diminishing returns
  },

  // ========== ADVERTISING MECHANICS ==========
  advertising: {
    baseImpact: 0.0015,           // 0.15% per $1M
    chunkSize: 3_000_000,         // $3M chunks for diminishing returns
    effectivenessDecay: 0.4,      // 40% of previous chunk's effectiveness
    segmentMultipliers: {
      "Budget": 1.1,
      "General": 1.0,
      "Enthusiast": 0.75,
      "Professional": 0.5,
      "Active Lifestyle": 0.85,
    },
  },

  // ========== BRANDING MECHANICS ==========
  branding: {
    baseImpact: 0.0025,           // 0.25% per $1M
    linearThreshold: 5_000_000,   // Linear up to $5M
    formula: "linear up to $5M, then log2(1 + excess/5) * 2.5 * baseImpact",
  },

  // ========== SPONSORSHIP ECONOMICS ==========
  sponsorships: [
    { name: "Tech Conference", cost: 7_500_000, brandImpact: 0.012 },
    { name: "Sports Jersey", cost: 22_000_000, brandImpact: 0.03 },
    { name: "Gaming Tournament", cost: 4_500_000, brandImpact: 0.009 },
    { name: "National TV", cost: 35_000_000, brandImpact: 0.045 },
    { name: "Influencer", cost: 3_000_000, brandImpact: 0.006 },
    { name: "Retailer Partnership", cost: 12_000_000, brandImpact: 0.018 },
  ],

  // ========== ESG MECHANICS ==========
  esg: {
    highThreshold: CONSTANTS.ESG_HIGH_THRESHOLD,      // 700+
    midThreshold: CONSTANTS.ESG_MID_THRESHOLD,        // 400-699
    lowThreshold: CONSTANTS.ESG_LOW_THRESHOLD,        // <400
    highBonus: CONSTANTS.ESG_HIGH_BONUS,              // 5%
    midBonus: CONSTANTS.ESG_MID_BONUS,                // 2%
    lowPenaltyMax: CONSTANTS.ESG_LOW_PENALTY_MAX,     // 8%
    lowPenaltyMin: CONSTANTS.ESG_LOW_PENALTY_MIN,     // 1%
  },

  // ========== PRICE FLOOR MECHANICS ==========
  priceFloor: {
    penaltyThreshold: CONSTANTS.PRICE_FLOOR_PENALTY_THRESHOLD, // 15% below min
    maxPenalty: CONSTANTS.PRICE_FLOOR_PENALTY_MAX,             // 30% score reduction
  },

  // ========== RUBBER BANDING ==========
  rubberBanding: {
    trailingBoost: CONSTANTS.RUBBER_BAND_TRAILING_BOOST,   // 15% boost
    leadingPenalty: CONSTANTS.RUBBER_BAND_LEADING_PENALTY, // 8% penalty
    threshold: CONSTANTS.RUBBER_BAND_THRESHOLD,            // 50% of avg
  },

  // ========== MARKET SHARE CALCULATION ==========
  marketShare: {
    softmaxTemperature: 10,
    formula: "exp((score - maxScore) / temperature) / sum(exp(...))",
  },

  // ========== QUALITY SCORING ==========
  quality: {
    expectations: {
      "Budget": 50,
      "General": 65,
      "Enthusiast": 80,
      "Professional": 90,
      "Active Lifestyle": 70,
    },
    bonusFormula: "if ratio > 1: 1 + sqrt(ratio-1) * 0.5, capped at 1.3x",
  },

  // ========== FEATURE SCORING ==========
  features: {
    baseValue: 100,
    bonusFormula: "if ratio > 1: 1 + sqrt(ratio-1) * 0.5, capped at 1.3x",
  },

  // ========== FACTORY EFFICIENCY ==========
  factory: {
    efficiencyPerMillion: CONSTANTS.EFFICIENCY_PER_MILLION,
    diminishThreshold: CONSTANTS.EFFICIENCY_DIMINISH_THRESHOLD,
    maxEfficiency: CONSTANTS.MAX_EFFICIENCY,
  },

  // ========== HR MECHANICS ==========
  hr: {
    baseWorkerOutput: CONSTANTS.BASE_WORKER_OUTPUT,
    baseDefectRate: CONSTANTS.BASE_DEFECT_RATE,
    baseTurnoverRate: CONSTANTS.BASE_TURNOVER_RATE,
    workersPerMachine: CONSTANTS.WORKERS_PER_MACHINE,
  },
};

// ============================================
// SIMULATION FUNCTIONS
// ============================================

interface SimResult {
  winner: string;
  revenues: Record<string, number>;
  brandValues: Record<string, number>;
  margin: number;
}

function runSingleSimulation(
  seed: string,
  strategies: string[],
  rounds: number
): SimResult {
  setRandomSeed(seed);

  const teams = strategies.map((strategy, i) => ({
    id: `team-${i + 1}`,
    state: SimulationEngine.createInitialTeamState(),
    strategy,
    strategyFn: STRATEGIES[strategy as keyof typeof STRATEGIES],
  }));

  let marketState = SimulationEngine.createInitialMarketState();
  const cumulativeRevenue: Record<string, number> = {};

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

    for (const result of output.results) {
      const team = teams.find((t) => t.id === result.teamId);
      if (team) {
        team.state = result.newState;
        cumulativeRevenue[team.id] += result.totalRevenue;
      }
    }

    marketState = output.newMarketState;
  }

  const sorted = teams
    .map((t) => ({
      id: t.id,
      strategy: t.strategy,
      revenue: cumulativeRevenue[t.id],
      brandValue: t.state.brandValue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const margin = sorted.length > 1
    ? (sorted[0].revenue - sorted[1].revenue) / sorted[1].revenue
    : 0;

  const revenues: Record<string, number> = {};
  const brandValues: Record<string, number> = {};
  for (const t of sorted) {
    revenues[t.strategy] = t.revenue;
    brandValues[t.strategy] = t.brandValue;
  }

  return {
    winner: sorted[0].strategy,
    revenues,
    brandValues,
    margin,
  };
}

// ============================================
// MAIN ANALYSIS
// ============================================

async function main(): Promise<void> {
  const simulations = parseInt(process.argv[2]) || 1000;
  const rounds = 8;
  const baseSeed = "comprehensive";

  const strategies = ["volume", "premium", "brand", "balanced"];

  console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║           COMPREHENSIVE MONTE CARLO ANALYSIS - ALL WEIGHTS & FORMULAS         ║");
  console.log("╚════════════════════════════════════════════════════════════════════════════════╝\n");

  // ============================================
  // SECTION 1: ALL CURRENT PARAMETERS
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                    SECTION 1: COMPLETE PARAMETER INVENTORY");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Segment Weights
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                         SEGMENT SCORING WEIGHTS                             │");
  console.log("├─────────────────┬───────┬─────────┬───────┬─────┬──────────┬───────────────┤");
  console.log("│ Segment         │ Price │ Quality │ Brand │ ESG │ Features │ Sum           │");
  console.log("├─────────────────┼───────┼─────────┼───────┼─────┼──────────┼───────────────┤");
  for (const [seg, w] of Object.entries(ALL_PARAMETERS.segmentWeights)) {
    const sum = w.price + w.quality + w.brand + w.esg + w.features;
    console.log(`│ ${seg.padEnd(15)} │ ${w.price.toString().padStart(5)} │ ${w.quality.toString().padStart(7)} │ ${w.brand.toString().padStart(5)} │ ${w.esg.toString().padStart(3)} │ ${w.features.toString().padStart(8)} │ ${sum.toString().padStart(13)} │`);
  }
  console.log("└─────────────────┴───────┴─────────┴───────┴─────┴──────────┴───────────────┘\n");

  // Brand Mechanics
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                           BRAND MECHANICS                                   │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Decay Rate:           ${(ALL_PARAMETERS.brand.decayRate * 100).toFixed(1)}% per round                                    │`);
  console.log(`│ Max Growth/Round:     ${(ALL_PARAMETERS.brand.maxGrowthPerRound * 100).toFixed(1)}% per round                                     │`);
  console.log(`│ Score Formula:        ${ALL_PARAMETERS.brand.scoreFormula.padEnd(50)} │`);
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // Advertising Mechanics
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                         ADVERTISING MECHANICS                               │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Base Impact:          ${(ALL_PARAMETERS.advertising.baseImpact * 100).toFixed(2)}% per $1M                                     │`);
  console.log(`│ Chunk Size:           $${(ALL_PARAMETERS.advertising.chunkSize / 1_000_000).toFixed(0)}M (diminishing returns per chunk)               │`);
  console.log(`│ Effectiveness Decay:  ${(ALL_PARAMETERS.advertising.effectivenessDecay * 100).toFixed(0)}% of previous chunk                             │`);
  console.log("│ Segment Multipliers:                                                        │");
  for (const [seg, mult] of Object.entries(ALL_PARAMETERS.advertising.segmentMultipliers)) {
    console.log(`│   ${seg.padEnd(18)} ${mult.toFixed(2)}x                                             │`);
  }
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // Branding Mechanics
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                          BRANDING MECHANICS                                 │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Base Impact:          ${(ALL_PARAMETERS.branding.baseImpact * 100).toFixed(2)}% per $1M                                     │`);
  console.log(`│ Linear Threshold:     $${(ALL_PARAMETERS.branding.linearThreshold / 1_000_000).toFixed(0)}M                                              │`);
  console.log(`│ Formula:              ${ALL_PARAMETERS.branding.formula.substring(0, 52).padEnd(52)} │`);
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // Sponsorship Economics
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                         SPONSORSHIP ECONOMICS                               │");
  console.log("├────────────────────────┬────────────────┬───────────────┬──────────────────┤");
  console.log("│ Name                   │ Cost           │ Brand Impact  │ ROI ($/1% brand) │");
  console.log("├────────────────────────┼────────────────┼───────────────┼──────────────────┤");
  for (const s of ALL_PARAMETERS.sponsorships) {
    const roi = s.cost / (s.brandImpact * 100);
    console.log(`│ ${s.name.padEnd(22)} │ $${(s.cost / 1_000_000).toFixed(1)}M`.padEnd(19) + `│ ${(s.brandImpact * 100).toFixed(1)}%`.padEnd(16) + `│ $${(roi / 1_000_000).toFixed(2)}M/1%`.padEnd(18) + `│`);
  }
  console.log("└────────────────────────┴────────────────┴───────────────┴──────────────────┘\n");

  // ESG Mechanics
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                            ESG MECHANICS                                    │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ HIGH Tier:   Score ${ALL_PARAMETERS.esg.highThreshold}+   → +${(ALL_PARAMETERS.esg.highBonus * 100).toFixed(0)}% revenue bonus                         │`);
  console.log(`│ MID Tier:    Score ${ALL_PARAMETERS.esg.midThreshold}-${ALL_PARAMETERS.esg.highThreshold - 1} → +${(ALL_PARAMETERS.esg.midBonus * 100).toFixed(0)}% revenue bonus                         │`);
  console.log(`│ LOW Tier:    Score <${ALL_PARAMETERS.esg.lowThreshold}  → ${(ALL_PARAMETERS.esg.lowPenaltyMin * 100).toFixed(0)}-${(ALL_PARAMETERS.esg.lowPenaltyMax * 100).toFixed(0)}% penalty (gradient)                  │`);
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // Price Floor Mechanics
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                         PRICE FLOOR MECHANICS                               │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Penalty Threshold:    ${(ALL_PARAMETERS.priceFloor.penaltyThreshold * 100).toFixed(0)}% below segment minimum                        │`);
  console.log(`│ Maximum Penalty:      ${(ALL_PARAMETERS.priceFloor.maxPenalty * 100).toFixed(0)}% score reduction                                 │`);
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // Rubber Banding
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                          RUBBER BANDING                                     │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Trailing Boost:       +${((ALL_PARAMETERS.rubberBanding.trailingBoost - 1) * 100).toFixed(0)}% for teams below ${(ALL_PARAMETERS.rubberBanding.threshold * 100).toFixed(0)}% of avg share          │`);
  console.log(`│ Leading Penalty:      -${((1 - ALL_PARAMETERS.rubberBanding.leadingPenalty) * 100).toFixed(0)}% for teams above 2x avg share                │`);
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // Market Share Calculation
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                       MARKET SHARE CALCULATION                              │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Softmax Temperature:  ${ALL_PARAMETERS.marketShare.softmaxTemperature}                                                    │`);
  console.log(`│ Formula:              ${ALL_PARAMETERS.marketShare.formula.padEnd(51)} │`);
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // Quality Scoring
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                          QUALITY SCORING                                    │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log("│ Quality Expectations by Segment:                                            │");
  for (const [seg, exp] of Object.entries(ALL_PARAMETERS.quality.expectations)) {
    console.log(`│   ${seg.padEnd(18)} ${exp}                                                 │`);
  }
  console.log(`│ Bonus Formula:        ${ALL_PARAMETERS.quality.bonusFormula.padEnd(51)} │`);
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // Factory Efficiency
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                         FACTORY EFFICIENCY                                  │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Efficiency per $1M:   ${(ALL_PARAMETERS.factory.efficiencyPerMillion * 100).toFixed(0)}%                                                 │`);
  console.log(`│ Diminish Threshold:   $${(ALL_PARAMETERS.factory.diminishThreshold / 1_000_000).toFixed(0)}M                                              │`);
  console.log(`│ Max Efficiency:       ${(ALL_PARAMETERS.factory.maxEfficiency * 100).toFixed(0)}%                                                 │`);
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // HR Mechanics
  console.log("┌─────────────────────────────────────────────────────────────────────────────┐");
  console.log("│                           HR MECHANICS                                      │");
  console.log("├─────────────────────────────────────────────────────────────────────────────┤");
  console.log(`│ Base Worker Output:   ${ALL_PARAMETERS.hr.baseWorkerOutput} units                                            │`);
  console.log(`│ Base Defect Rate:     ${(ALL_PARAMETERS.hr.baseDefectRate * 100).toFixed(0)}%                                                  │`);
  console.log(`│ Base Turnover Rate:   ${(ALL_PARAMETERS.hr.baseTurnoverRate * 100).toFixed(0)}%                                                 │`);
  console.log(`│ Workers per Machine:  ${ALL_PARAMETERS.hr.workersPerMachine}                                                 │`);
  console.log("└─────────────────────────────────────────────────────────────────────────────┘\n");

  // ============================================
  // SECTION 2: RUN SIMULATIONS
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                    SECTION 2: MONTE CARLO SIMULATION");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  console.log(`Running ${simulations} simulations with ${rounds} rounds each...`);
  console.log(`Strategies: ${strategies.join(", ")}\n`);

  const wins: Record<string, number> = {};
  const totalRevenue: Record<string, number> = {};
  const totalMargin: Record<string, number> = {};
  const totalBrandValue: Record<string, number> = {};
  const rankCounts: Record<string, Record<number, number>> = {};
  const roundRevenues: Record<string, number[]> = {};

  for (const strategy of strategies) {
    wins[strategy] = 0;
    totalRevenue[strategy] = 0;
    totalMargin[strategy] = 0;
    totalBrandValue[strategy] = 0;
    rankCounts[strategy] = { 1: 0, 2: 0, 3: 0, 4: 0 };
    roundRevenues[strategy] = [];
  }

  const startTime = Date.now();
  const allResults: SimResult[] = [];

  for (let i = 0; i < simulations; i++) {
    if (i % 100 === 0 && i > 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = i / elapsed;
      const remaining = (simulations - i) / rate;
      console.log(`  Progress: ${i}/${simulations} (${(i/simulations*100).toFixed(1)}%) - ETA: ${remaining.toFixed(0)}s`);
    }

    const seed = `${baseSeed}-${i}`;
    const result = runSingleSimulation(seed, strategies, rounds);
    allResults.push(result);

    wins[result.winner]++;
    totalMargin[result.winner] += result.margin;

    for (const strategy of strategies) {
      totalRevenue[strategy] += result.revenues[strategy];
      totalBrandValue[strategy] += result.brandValues[strategy];
    }

    // Rank tracking
    const sorted = strategies
      .map(s => ({ strategy: s, revenue: result.revenues[s] }))
      .sort((a, b) => b.revenue - a.revenue);
    sorted.forEach((s, idx) => {
      rankCounts[s.strategy][idx + 1]++;
    });
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\nCompleted ${simulations} simulations in ${elapsed.toFixed(1)}s (${(simulations/elapsed).toFixed(0)} sims/sec)\n`);

  // ============================================
  // SECTION 3: RESULTS
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                         SECTION 3: RESULTS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Win Rates
  console.log("WIN RATES:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  const sortedByWins = [...strategies].sort((a, b) => wins[b] - wins[a]);
  for (const strategy of sortedByWins) {
    const winRate = wins[strategy] / simulations;
    const bar = "█".repeat(Math.round(winRate * 50));
    const padding = " ".repeat(50 - bar.length);
    const avgMargin = wins[strategy] > 0 ? totalMargin[strategy] / wins[strategy] : 0;
    console.log(`  ${strategy.padEnd(12)} ${bar}${padding} ${(winRate * 100).toFixed(1)}% (${wins[strategy]} wins, margin: ${(avgMargin * 100).toFixed(2)}%)`);
  }
  console.log("");

  // Rank Distribution
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

  // Average Revenues
  console.log("AVERAGE TOTAL REVENUE (over 8 rounds):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  const maxRevenue = Math.max(...strategies.map(s => totalRevenue[s] / simulations));
  const minRevenue = Math.min(...strategies.map(s => totalRevenue[s] / simulations));
  for (const strategy of strategies) {
    const avgRev = totalRevenue[strategy] / simulations;
    const pctOfMax = (avgRev / maxRevenue) * 100;
    console.log(`  ${strategy.padEnd(12)} $${(avgRev / 1_000_000).toFixed(1)}M (${pctOfMax.toFixed(1)}% of leader)`);
  }
  console.log(`\n  Revenue Spread: ${(maxRevenue / minRevenue).toFixed(3)}x (max/min)`);
  console.log(`  Gap: $${((maxRevenue - minRevenue) / 1_000_000).toFixed(2)}M`);
  console.log("");

  // Average Brand Values
  console.log("AVERAGE FINAL BRAND VALUES (Round 8):");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  for (const strategy of strategies) {
    const avgBrand = totalBrandValue[strategy] / simulations;
    console.log(`  ${strategy.padEnd(12)} ${(avgBrand * 100).toFixed(1)}%`);
  }
  console.log("");

  // ============================================
  // SECTION 4: FORMULA IMPACT ANALYSIS
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                    SECTION 4: FORMULA IMPACT ANALYSIS");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Calculate theoretical impacts
  console.log("THEORETICAL BRAND GROWTH ANALYSIS:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log("Strategy spending patterns (as % of cash):\n");

  const strategySpending = {
    volume: { advertising: 0.09, branding: 0.02, sponsorships: 0 },
    premium: { advertising: 0.13, branding: 0.05, sponsorships: 0 },
    brand: { advertising: 0.32, branding: 0.15, sponsorships: 0.04 },
    balanced: { advertising: 0.14, branding: 0.04, sponsorships: 0 },
  };

  const startingCash = 200_000_000;

  for (const [strategy, spending] of Object.entries(strategySpending)) {
    const adSpend = startingCash * spending.advertising;
    const brandSpend = startingCash * spending.branding;
    const sponsorSpend = startingCash * spending.sponsorships;

    // Calculate advertising impact
    let adImpact = 0;
    let remaining = adSpend / 1_000_000;
    let effectiveness = 1.0;
    while (remaining > 0) {
      const chunk = Math.min(remaining, 3);
      adImpact += chunk * 0.0015 * effectiveness;
      remaining -= chunk;
      effectiveness *= 0.4;
    }

    // Calculate branding impact
    const brandMil = brandSpend / 1_000_000;
    let brandImpact = 0;
    if (brandMil <= 5) {
      brandImpact = brandMil * 0.0025;
    } else {
      brandImpact = 5 * 0.0025 + 0.0025 * 2.5 * Math.log2(1 + (brandMil - 5) / 5);
    }

    // Sponsorship impact (simplified)
    const sponsorImpact = sponsorSpend > 0 ? 0.02 : 0; // Approximate

    const totalGrowth = adImpact + brandImpact + sponsorImpact;
    const cappedGrowth = Math.min(totalGrowth, ALL_PARAMETERS.brand.maxGrowthPerRound);
    const netChange = cappedGrowth - (0.5 * ALL_PARAMETERS.brand.decayRate); // Approx decay from 50% brand

    console.log(`  ${strategy.toUpperCase()}:`);
    console.log(`    Ad Spend: $${(adSpend / 1_000_000).toFixed(1)}M → +${(adImpact * 100).toFixed(3)}% brand`);
    console.log(`    Branding: $${(brandSpend / 1_000_000).toFixed(1)}M → +${(brandImpact * 100).toFixed(3)}% brand`);
    console.log(`    Sponsor:  $${(sponsorSpend / 1_000_000).toFixed(1)}M → +${(sponsorImpact * 100).toFixed(3)}% brand`);
    console.log(`    Total Growth: +${(totalGrowth * 100).toFixed(3)}% (capped: +${(cappedGrowth * 100).toFixed(3)}%)`);
    console.log(`    Net Change: ${netChange >= 0 ? '+' : ''}${(netChange * 100).toFixed(3)}% after decay\n`);
  }

  // ============================================
  // SECTION 5: BALANCE ASSESSMENT
  // ============================================

  console.log("═══════════════════════════════════════════════════════════════════════════════");
  console.log("                     SECTION 5: BALANCE ASSESSMENT");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Diversity score
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
  const dominant = sortedByWins.find(s => wins[s] / simulations > 0.6);

  console.log("BALANCE METRICS:");
  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log(`  Diversity Score:     ${diversityScore.toFixed(3)} (target: >0.7, 1.0 = perfect balance)`);
  console.log(`  Unique Winners:      ${uniqueWinners}/${strategies.length} strategies can win`);
  console.log(`  Revenue Spread:      ${(maxRevenue / minRevenue).toFixed(3)}x (target: 1.5-3.0x)`);
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
    { name: "Leader margin <5%", pass: (totalMargin[sortedByWins[0]] / Math.max(1, wins[sortedByWins[0]])) < 0.05 },
  ];

  for (const check of checks) {
    console.log(`  ${check.pass ? "✅" : "❌"} ${check.name}`);
  }

  const passedChecks = checks.filter(c => c.pass).length;
  console.log(`\n  Overall: ${passedChecks}/${checks.length} checks passed`);

  // ============================================
  // SECTION 6: PARAMETER SENSITIVITY
  // ============================================

  console.log("\n═══════════════════════════════════════════════════════════════════════════════");
  console.log("                    SECTION 6: PARAMETER SENSITIVITY");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  console.log("KEY PARAMETERS AND THEIR EFFECTS:");
  console.log("─────────────────────────────────────────────────────────────────────────────\n");

  console.log("1. BRAND_DECAY_RATE (current: 6.5%)");
  console.log("   ↑ Higher decay → balanced/premium strategies favored");
  console.log("   ↓ Lower decay → brand strategy dominates");
  console.log("   Sweet spot: 5.5-7% based on testing\n");

  console.log("2. BRAND_MAX_GROWTH_PER_ROUND (current: 2%)");
  console.log("   ↑ Higher cap → brand strategy benefits");
  console.log("   ↓ Lower cap → diminishes returns on heavy marketing spend");
  console.log("   Sweet spot: 1.5-2.5%\n");

  console.log("3. SEGMENT BRAND WEIGHTS (current: 8-12%)");
  console.log("   ↑ Higher weights → brand strategy dominates");
  console.log("   ↓ Lower weights → quality/price strategies favored");
  console.log("   Sweet spot: 8-15%\n");

  console.log("4. SOFTMAX TEMPERATURE (current: 10)");
  console.log("   ↑ Higher temp → more equal market share distribution");
  console.log("   ↓ Lower temp → winner-take-all dynamics");
  console.log("   Sweet spot: 8-15 for competitive gameplay\n");

  console.log("5. ADVERTISING EFFECTIVENESS DECAY (current: 40%)");
  console.log("   ↑ Higher decay → heavy ad spend less effective");
  console.log("   ↓ Lower decay → rewards heavy marketing investment");
  console.log("   Sweet spot: 35-50%\n");

  console.log("════════════════════════════════════════════════════════════════════════════════");
  console.log("                              END OF REPORT");
  console.log("════════════════════════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
