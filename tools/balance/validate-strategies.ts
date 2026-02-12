/**
 * Quick Strategy Validation
 *
 * Runs games with current CONSTANTS to verify all 7 strategies are viable.
 * No parameter mutation — just measures win rates with current values.
 *
 * Usage: npx tsx tools/balance/validate-strategies.ts
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

// Fano plane complement matchups (each strategy appears in 4 of 7)
const MATCHUPS: StrategyArchetype[][] = [
  ["brand", "balanced", "rd-focused", "cost-cutter"],
  ["volume", "automation", "rd-focused", "cost-cutter"],
  ["volume", "premium", "balanced", "cost-cutter"],
  ["volume", "premium", "brand", "rd-focused"],
  ["premium", "brand", "automation", "cost-cutter"],
  ["volume", "brand", "automation", "balanced"],
  ["premium", "automation", "balanced", "rd-focused"],
];

const SIMS_PER_MATCHUP = 100;  // 100 sims × 7 matchups = 700 games
const ROUNDS = 8;

function runGame(
  matchup: StrategyArchetype[],
  seed: string,
  rounds: number
): { winner: StrategyArchetype; revenues: Record<string, number> } {
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

    marketState = output.newMarketState;
  }

  const sorted = [...teams].sort((a, b) => b.state.revenue - a.state.revenue);
  const revenues: Record<string, number> = {};
  for (const t of teams) revenues[t.archetype] = t.state.revenue;

  return { winner: sorted[0].archetype, revenues };
}

async function main() {
  const totalGames = SIMS_PER_MATCHUP * MATCHUPS.length;

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║       STRATEGY VALIDATION — Current CONSTANTS    ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Games: ${totalGames} (${SIMS_PER_MATCHUP} sims × ${MATCHUPS.length} matchups × ${ROUNDS} rounds)`);
  console.log(`║  Key params:                                     ║`);
  console.log(`║    SOFTMAX_TEMPERATURE:    ${CONSTANTS.SOFTMAX_TEMPERATURE}`);
  console.log(`║    BRAND_DECAY_RATE:       ${CONSTANTS.BRAND_DECAY_RATE}`);
  console.log(`║    RUBBER_BAND_TRAILING:   ${CONSTANTS.RUBBER_BAND_TRAILING_BOOST}`);
  console.log(`║    RUBBER_BAND_LEADING:    ${CONSTANTS.RUBBER_BAND_LEADING_PENALTY}`);
  console.log(`║    DEFAULT_STARTING_CASH:  $${(CONSTANTS.DEFAULT_STARTING_CASH / 1e6).toFixed(0)}M`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  const startTime = Date.now();

  // Track wins and appearances
  const wins: Record<string, number> = {};
  const appearances: Record<string, number> = {};
  const allStrategies: StrategyArchetype[] = ["volume", "premium", "brand", "automation", "balanced", "rd-focused", "cost-cutter"];

  for (const s of allStrategies) {
    wins[s] = 0;
    appearances[s] = 0;
  }

  let gamesCompleted = 0;

  for (let m = 0; m < MATCHUPS.length; m++) {
    const matchup = MATCHUPS[m];

    for (const s of matchup) {
      appearances[s] += SIMS_PER_MATCHUP;
    }

    const matchupWins: Record<string, number> = {};
    for (let sim = 0; sim < SIMS_PER_MATCHUP; sim++) {
      const seed = `validate-${m}-${sim}`;
      const result = runGame(matchup, seed, ROUNDS);
      wins[result.winner]++;
      matchupWins[result.winner] = (matchupWins[result.winner] || 0) + 1;
      gamesCompleted++;
    }
    // Show per-matchup breakdown
    const mwStr = Object.entries(matchupWins).sort((a, b) => b[1] - a[1]).map(([s, w]) => `${s}:${w}`).join(", ");
    console.log(`  M${m}: [${matchup.join(", ")}] → ${mwStr}`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n  Completed in ${totalTime}s\n`);

  // Display results
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║                    RESULTS                       ║");
  console.log("╠══════════════════════════════════════════════════╣");

  const sortedStrategies = allStrategies.sort((a, b) => {
    const rateA = appearances[a] > 0 ? wins[a] / appearances[a] : 0;
    const rateB = appearances[b] > 0 ? wins[b] / appearances[b] : 0;
    return rateB - rateA;
  });

  let viableCount = 0;
  let maxRate = 0;

  for (const s of sortedStrategies) {
    const rate = appearances[s] > 0 ? wins[s] / appearances[s] : 0;
    const pct = (rate * 100).toFixed(1);
    const bar = "█".repeat(Math.round(rate * 40));
    const status = rate === 0 ? " ❌ NON-VIABLE" : rate > 0.6 ? " ⚠ DOMINANT" : rate < 0.03 ? " ⚠ MARGINAL" : " ✓";

    console.log(`║  ${s.padEnd(14)} ${pct.padStart(5)}% (${String(wins[s]).padStart(3)}/${appearances[s]}) ${bar}${status}`);

    if (rate > 0) viableCount++;
    if (rate > maxRate) maxRate = rate;
  }

  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Viable strategies: ${viableCount}/7${viableCount >= 7 ? " ✓ ALL VIABLE" : viableCount >= 5 ? " ⚠ SOME NON-VIABLE" : " ❌ MANY NON-VIABLE"}`);
  console.log(`║  Max win rate:      ${(maxRate * 100).toFixed(1)}%${maxRate > 0.6 ? " ⚠ DOMINANT" : maxRate <= 0.4 ? " ✓ BALANCED" : " ⚠ HIGH"}`);
  console.log("╚══════════════════════════════════════════════════╝");

  // Pass/fail summary
  console.log("");
  if (viableCount >= 7 && maxRate <= 0.6) {
    console.log("  ✅ PASS: All 7 strategies viable, none dominant");
  } else if (viableCount >= 5 && maxRate <= 0.6) {
    console.log("  ⚠️  PARTIAL PASS: Most strategies viable but some need work");
  } else {
    console.log("  ❌ FAIL: Balance issues detected");
  }
}

main().catch(console.error);
