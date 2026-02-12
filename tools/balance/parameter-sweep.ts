/**
 * Parameter Sweep - Finds optimal balance constants via Monte Carlo
 *
 * Tests combinations of:
 *   - Brand decay rate
 *   - Softmax temperature
 *   - Active Lifestyle brand weight
 *
 * For each combination, runs simulations and scores balance quality.
 * Reports the best combinations ranked by balance score.
 *
 * Usage: npx tsx src/engine/balance/parameter-sweep.ts
 */

import { SimulationEngine } from "../../src/engine/core/SimulationEngine";
import type { SimulationInput } from "../../src/engine/core/SimulationEngine";
import type { TeamState, MarketState } from "../../src/engine/types";
import { CONSTANTS } from "../../src/engine/types";
import {
  STRATEGIES,
  type StrategyArchetype,
  type StrategyDecisionMaker,
} from "./strategies";

// ============================================
// SWEEP CONFIGURATION
// ============================================

const SWEEP = {
  // Parameter ranges to test
  brandDecayRate: [0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.065],
  softmaxTemperature: [3, 4, 5, 6, 7, 8, 10],
  alBrandWeight: [8, 10, 12, 14, 18],

  // Simulation settings (reduced for speed)
  SIMS_PER_COMBO: 20,
  ROUNDS: 8,

  // v4.0.6: 7 matchups — Fano plane complement (balanced incomplete block design)
  // Each strategy appears in exactly 4 matchups. Every PAIR of strategies meets exactly 2 times.
  // This eliminates structural advantage — no strategy faces a dominant opponent 3 times.
  // Mapping: 1=vol 2=pre 3=bra 4=aut 5=bal 6=rd 7=cos
  // Fano complement blocks: {3,5,6,7} {1,4,6,7} {1,2,5,7} {1,2,3,6} {2,3,4,7} {1,3,4,5} {2,4,5,6}
  MATCHUPS: [
    ["brand", "balanced", "rd-focused", "cost-cutter"] as StrategyArchetype[],
    ["volume", "automation", "rd-focused", "cost-cutter"] as StrategyArchetype[],
    ["volume", "premium", "balanced", "cost-cutter"] as StrategyArchetype[],
    ["volume", "premium", "brand", "rd-focused"] as StrategyArchetype[],
    ["premium", "brand", "automation", "cost-cutter"] as StrategyArchetype[],
    ["volume", "brand", "automation", "balanced"] as StrategyArchetype[],
    ["premium", "automation", "balanced", "rd-focused"] as StrategyArchetype[],
  ],
};

// ============================================
// SIMULATION RUNNER (from run-monte-carlo.ts)
// ============================================

function runGame(
  matchup: StrategyArchetype[],
  seed: string,
  rounds: number
): { winner: StrategyArchetype; revenues: Record<string, number>; roundLeaders: StrategyArchetype[] } {
  const teams: { id: string; state: TeamState; archetype: StrategyArchetype; strategy: StrategyDecisionMaker }[] = [];

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
  const roundLeaders: StrategyArchetype[] = [];

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

    for (const result of output.results) {
      const team = teams.find(t => t.id === result.teamId);
      if (team) team.state = result.newState;
    }

    const leader = teams.reduce((best, t) =>
      t.state.revenue > best.state.revenue ? t : best
    );
    roundLeaders.push(leader.archetype);
    marketState = output.newMarketState;
  }

  const sorted = [...teams].sort((a, b) => b.state.revenue - a.state.revenue);
  const revenues: Record<string, number> = {};
  for (const t of teams) revenues[t.archetype] = t.state.revenue;

  return { winner: sorted[0].archetype, revenues, roundLeaders };
}

// ============================================
// BALANCE SCORING
// ============================================

interface ComboResult {
  brandDecay: number;
  temperature: number;
  alBrandWeight: number;
  winRates: Record<string, number>;
  maxWinRate: number;
  viableStrategies: number;  // strategies with >0% win rate
  snowballRate: number;
  revenueSpread: number;     // max/min revenue ratio
  balanceScore: number;      // composite 0-100
}

function scoreBalance(
  winRates: Record<string, number>,
  snowballRate: number,
  revenueSpread: number
): number {
  let score = 100;

  // Penalize dominant strategies (>40% win rate)
  for (const rate of Object.values(winRates)) {
    if (rate > 0.6) score -= 25;
    else if (rate > 0.4) score -= 10;
    else if (rate > 0.3) score -= 3;
  }

  // Penalize non-viable strategies (0% win rate)
  for (const rate of Object.values(winRates)) {
    if (rate === 0) score -= 12;
    else if (rate < 0.03) score -= 5;
  }

  // Reward viable strategy count
  const viable = Object.values(winRates).filter(r => r > 0).length;
  score += viable * 3; // bonus for each viable strategy

  // Penalize high snowball
  if (snowballRate > 0.8) score -= 15;
  else if (snowballRate > 0.6) score -= 8;
  else if (snowballRate > 0.4) score -= 3;

  // Reward revenue spread (>1.3x is good)
  if (revenueSpread > 1.5) score += 5;
  else if (revenueSpread > 1.3) score += 3;
  else if (revenueSpread < 1.1) score -= 5;

  // Reward balanced win distribution (entropy-like)
  const rates = Object.values(winRates).filter(r => r > 0);
  if (rates.length >= 3) {
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const spread = maxRate - minRate;
    if (spread < 0.3) score += 8;  // tight spread = good
    else if (spread < 0.5) score += 3;
    else score -= 5;  // wide spread = bad
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================
// MAIN SWEEP
// ============================================

async function main() {
  const totalCombos = SWEEP.brandDecayRate.length * SWEEP.softmaxTemperature.length * SWEEP.alBrandWeight.length;
  const totalGames = totalCombos * SWEEP.SIMS_PER_COMBO * SWEEP.MATCHUPS.length;

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║         PARAMETER SWEEP — Balance Optimizer      ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Brand decay rates:    ${SWEEP.brandDecayRate.length} values (${SWEEP.brandDecayRate.join(", ")})`);
  console.log(`║  Softmax temperatures: ${SWEEP.softmaxTemperature.length} values (${SWEEP.softmaxTemperature.join(", ")})`);
  console.log(`║  AL brand weights:     ${SWEEP.alBrandWeight.length} values (${SWEEP.alBrandWeight.join(", ")})`);
  console.log(`║  Total combinations:   ${totalCombos}`);
  console.log(`║  Sims per combo:       ${SWEEP.SIMS_PER_COMBO} × ${SWEEP.MATCHUPS.length} matchups`);
  console.log(`║  Total games:          ${totalGames}`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  const startTime = Date.now();
  const results: ComboResult[] = [];
  let comboIndex = 0;

  // Suppress ALL console output during simulations (financial statement warnings use console.log)
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  for (const brandDecay of SWEEP.brandDecayRate) {
    for (const temperature of SWEEP.softmaxTemperature) {
      for (const alBrandWeight of SWEEP.alBrandWeight) {
        comboIndex++;

        // Set constants for this combination
        (CONSTANTS as any).BRAND_DECAY_RATE = brandDecay;
        (CONSTANTS as any).SOFTMAX_TEMPERATURE = temperature;
        (CONSTANTS as any).SEGMENT_BRAND_WEIGHT_ACTIVE_LIFESTYLE = alBrandWeight;
        // Also update SEGMENT_WEIGHTS for Active Lifestyle brand weight
        if ((CONSTANTS as any).SEGMENT_WEIGHTS) {
          const alWeights = (CONSTANTS as any).SEGMENT_WEIGHTS["Active Lifestyle"];
          const oldBrand = alWeights.brand;
          const diff = alBrandWeight - oldBrand;
          alWeights.brand = alBrandWeight;
          // Compensate by adjusting quality weight to keep sum at 100
          alWeights.quality = Math.max(5, alWeights.quality - diff);
        }

        // Run all matchups
        const allStrategies = new Set<string>();
        const wins: Record<string, number> = {};
        const totalRevenue: Record<string, number> = {};
        const counts: Record<string, number> = {};
        let totalGamesRun = 0;
        let snowballs = 0;

        for (const matchup of SWEEP.MATCHUPS) {
          for (const s of matchup) allStrategies.add(s);

          for (let sim = 0; sim < SWEEP.SIMS_PER_COMBO; sim++) {
            const seed = `sweep-${brandDecay}-${temperature}-${alBrandWeight}-${sim}`;
            const result = runGame(matchup, seed, SWEEP.ROUNDS);

            wins[result.winner] = (wins[result.winner] || 0) + 1;
            totalGamesRun++;

            // Snowball check (round-3 leader wins)
            if (result.roundLeaders.length >= 3 && result.roundLeaders[2] === result.winner) {
              snowballs++;
            }

            for (const [strat, rev] of Object.entries(result.revenues)) {
              totalRevenue[strat] = (totalRevenue[strat] || 0) + rev;
              counts[strat] = (counts[strat] || 0) + 1;
            }
          }
        }

        // Calculate metrics
        const winRates: Record<string, number> = {};
        for (const s of allStrategies) {
          winRates[s] = totalGamesRun > 0 ? (wins[s] || 0) / totalGamesRun : 0;
        }

        const avgRevenues = Object.entries(totalRevenue).map(([s, r]) => r / (counts[s] || 1));
        const maxRev = Math.max(...avgRevenues);
        const minRev = Math.min(...avgRevenues);
        const revenueSpread = minRev > 0 ? maxRev / minRev : 1;
        const snowballRate = totalGamesRun > 0 ? snowballs / totalGamesRun : 0;
        const maxWinRate = Math.max(...Object.values(winRates));
        const viableStrategies = Object.values(winRates).filter(r => r > 0).length;

        const balanceScore = scoreBalance(winRates, snowballRate, revenueSpread);

        results.push({
          brandDecay,
          temperature,
          alBrandWeight,
          winRates,
          maxWinRate,
          viableStrategies,
          snowballRate,
          revenueSpread,
          balanceScore,
        });

        // Progress update every 10 combos
        if (comboIndex % 10 === 0 || comboIndex === totalCombos) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          const pct = ((comboIndex / totalCombos) * 100).toFixed(0);
          process.stdout.write(`\r  [${pct}%] Combo ${comboIndex}/${totalCombos} (${elapsed}s) — Best so far: ${Math.max(...results.map(r => r.balanceScore))}/100  `);
        }
      }
    }
  }

  // Restore all console methods
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;

  console.log("\n");

  // Sort by balance score (descending)
  results.sort((a, b) => b.balanceScore - a.balanceScore);

  // Print top 20 results
  console.log("╔══════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║  TOP 20 PARAMETER COMBINATIONS                                                  ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════╣");
  console.log("║  # │ Score │ Decay │ Temp │ ALBrd │ MaxWR │ Viable │ Snow │ Spread │ Win Rates  ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════╣");

  for (let i = 0; i < Math.min(20, results.length); i++) {
    const r = results[i];
    const winStr = Object.entries(r.winRates)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k.substring(0, 4)}:${(v * 100).toFixed(0)}%`)
      .join(" ");

    console.log(
      `║ ${(i + 1).toString().padStart(2)} │ ${r.balanceScore.toString().padStart(5)} │ ${r.brandDecay.toFixed(3)} │ ${r.temperature.toString().padStart(4)} │ ${r.alBrandWeight.toString().padStart(5)} │ ${(r.maxWinRate * 100).toFixed(0).padStart(5)}% │ ${r.viableStrategies.toString().padStart(6)} │ ${(r.snowballRate * 100).toFixed(0).padStart(4)}% │ ${r.revenueSpread.toFixed(2).padStart(6)} │ ${winStr}`
    );
  }

  console.log("╚══════════════════════════════════════════════════════════════════════════════════╝");

  // Print worst 5 for reference
  console.log("");
  console.log("WORST 5 COMBINATIONS:");
  for (let i = results.length - 1; i >= Math.max(0, results.length - 5); i--) {
    const r = results[i];
    const winStr = Object.entries(r.winRates)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k.substring(0, 4)}:${(v * 100).toFixed(0)}%`)
      .join(" ");
    console.log(
      `  #${results.length - (results.length - 1 - i)} Score=${r.balanceScore} decay=${r.brandDecay} T=${r.temperature} ALB=${r.alBrandWeight} | ${winStr}`
    );
  }

  // Summary statistics
  console.log("");
  console.log("SUMMARY:");
  console.log(`  Total combinations tested: ${results.length}`);
  console.log(`  Best score: ${results[0].balanceScore}/100`);
  console.log(`  Worst score: ${results[results.length - 1].balanceScore}/100`);
  console.log(`  Mean score: ${(results.reduce((s, r) => s + r.balanceScore, 0) / results.length).toFixed(1)}`);
  console.log(`  Combos with score >= 50: ${results.filter(r => r.balanceScore >= 50).length}`);
  console.log(`  Combos with score >= 30: ${results.filter(r => r.balanceScore >= 30).length}`);
  console.log(`  Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // Recommend best parameters
  const best = results[0];
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  RECOMMENDED PARAMETERS:");
  console.log(`    Brand Decay Rate:     ${best.brandDecay} (CONSTANTS.BRAND_DECAY_RATE)`);
  console.log(`    Softmax Temperature:  ${best.temperature} (CONSTANTS.SOFTMAX_TEMPERATURE)`);
  console.log(`    AL Brand Weight:      ${best.alBrandWeight} (CONSTANTS.SEGMENT_BRAND_WEIGHT_ACTIVE_LIFESTYLE)`);
  console.log(`    Balance Score:        ${best.balanceScore}/100`);
  console.log(`    Max Win Rate:         ${(best.maxWinRate * 100).toFixed(1)}%`);
  console.log(`    Viable Strategies:    ${best.viableStrategies}/7`);
  console.log(`    Snowball Rate:        ${(best.snowballRate * 100).toFixed(0)}%`);
  console.log("═══════════════════════════════════════════════════");

  // Save results as JSON
  const fs = await import("fs");
  const outputPath = "parameter-sweep-results.json";
  fs.writeFileSync(outputPath, JSON.stringify({
    config: SWEEP,
    topResults: results.slice(0, 50),
    bestParams: {
      brandDecayRate: best.brandDecay,
      softmaxTemperature: best.temperature,
      alBrandWeight: best.alBrandWeight,
    },
    summary: {
      bestScore: results[0].balanceScore,
      worstScore: results[results.length - 1].balanceScore,
      meanScore: results.reduce((s, r) => s + r.balanceScore, 0) / results.length,
    },
  }, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(err => {
  console.error("Parameter sweep failed:", err);
  process.exit(2);
});
