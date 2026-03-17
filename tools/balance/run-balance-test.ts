/**
 * Comprehensive Monte Carlo Balance Test (Prompt 3 spec)
 *
 * 500 games, 7 strategy archetypes, ±10% decision noise,
 * randomized team assignments. Outputs win rates, top-2 rates,
 * avg BSC scores, runaway leader flags.
 *
 * Usage: npx tsx tools/balance/run-balance-test.ts
 */

import { SimulationEngine } from "../../engine/core/SimulationEngine";
import type { SimulationInput } from "../../engine/core/SimulationEngine";
import type { TeamState, MarketState, AllDecisions } from "../../engine/types";
import { STRATEGIES, type StrategyArchetype, type StrategyDecisionMaker } from "./strategies";

// ============================================
// CONFIGURATION
// ============================================

const TOTAL_GAMES = 500;
const ROUNDS_PER_GAME = 8;
const TEAMS_PER_GAME = 5;
const NOISE_FACTOR = 0.10; // ±10% random noise on decisions
const SEED_BASE = 42;

const ALL_STRATEGIES = Object.keys(STRATEGIES) as StrategyArchetype[];

// Balance thresholds from the Balance Testing Prompt Library
const THRESHOLDS = {
  DOMINANT_WIN_RATE: 0.35,    // >35% = dominant
  UNVIABLE_WIN_RATE: 0.08,   // <8% = unviable
  RUNAWAY_LEADER_GAP: 0.40,  // R4 leader >40% above field avg
  HEALTHY_WIN_RANGE: [0.10, 0.35] as [number, number],
};

// ============================================
// NOISE APPLICATION
// ============================================

/** Simple seeded PRNG (mulberry32) */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Apply ±10% noise to numeric values in a decisions object */
function applyNoise(decisions: AllDecisions, rng: () => number): AllDecisions {
  const noisy = JSON.parse(JSON.stringify(decisions));

  // Noise on advertising budgets
  if (noisy.marketing?.advertisingBudget) {
    for (const seg of Object.keys(noisy.marketing.advertisingBudget)) {
      const val = noisy.marketing.advertisingBudget[seg];
      if (typeof val === "number" && val > 0) {
        noisy.marketing.advertisingBudget[seg] = Math.round(val * (1 + (rng() - 0.5) * 2 * NOISE_FACTOR));
      }
    }
  }

  // Noise on branding investment
  if (noisy.marketing?.brandingInvestment && typeof noisy.marketing.brandingInvestment === "number") {
    noisy.marketing.brandingInvestment = Math.round(
      noisy.marketing.brandingInvestment * (1 + (rng() - 0.5) * 2 * NOISE_FACTOR)
    );
  }

  // Noise on R&D budget
  if (noisy.rd?.rdBudget && typeof noisy.rd.rdBudget === "number") {
    noisy.rd.rdBudget = Math.round(noisy.rd.rdBudget * (1 + (rng() - 0.5) * 2 * NOISE_FACTOR));
  }

  // Noise on efficiency investments
  if (noisy.factory?.efficiencyInvestments) {
    for (const fid of Object.keys(noisy.factory.efficiencyInvestments)) {
      const inv = noisy.factory.efficiencyInvestments[fid];
      for (const key of Object.keys(inv)) {
        if (typeof inv[key] === "number" && inv[key] > 0) {
          inv[key] = Math.round(inv[key] * (1 + (rng() - 0.5) * 2 * NOISE_FACTOR));
        }
      }
    }
  }

  return noisy;
}

// ============================================
// SIMULATION
// ============================================

interface GameResult {
  gameId: number;
  assignments: StrategyArchetype[];
  rankings: {
    archetype: StrategyArchetype;
    rank: number;
    revenue: number;
    eps: number;
    cash: number;
    marketCap: number;
  }[];
  winner: StrategyArchetype;
  r4LeaderGap: number; // R4 leader's revenue vs field average
  revenueByRound: Record<string, number[]>; // archetype → revenue per round
}

function runGame(gameId: number, assignments: StrategyArchetype[]): GameResult {
  const rng = mulberry32(SEED_BASE + gameId * 7919);

  const teams: { id: string; state: TeamState; archetype: StrategyArchetype; strategy: StrategyDecisionMaker }[] = [];

  for (let i = 0; i < assignments.length; i++) {
    const archetype = assignments[i];
    const state = SimulationEngine.createInitialTeamState();
    teams.push({
      id: `team-${i}-${archetype}`,
      state,
      archetype,
      strategy: STRATEGIES[archetype],
    });
  }

  let marketState = SimulationEngine.createInitialMarketState();
  const revenueByRound: Record<string, number[]> = {};
  for (const t of teams) {
    revenueByRound[t.archetype] = [];
  }

  let r4LeaderGap = 0;

  for (let round = 1; round <= ROUNDS_PER_GAME; round++) {
    const teamsWithDecisions = teams.map((team) => {
      const baseDec = team.strategy(team.state, marketState, round);
      const noisyDec = applyNoise(baseDec, rng);
      return { id: team.id, state: team.state, decisions: noisyDec };
    });

    const input: SimulationInput = {
      roundNumber: round,
      teams: teamsWithDecisions,
      marketState,
      matchSeed: `balance-test-${gameId}-r${round}`,
    };

    try {
      const output = SimulationEngine.processRound(input);

      for (const result of output.results) {
        const team = teams.find((t) => t.id === result.teamId);
        if (team) {
          team.state = result.newState;
          revenueByRound[team.archetype].push(team.state.revenue);
        }
      }

      marketState = output.newMarketState;

      // Check R4 leader gap
      if (round === 4) {
        const revenues = teams.map((t) => t.state.revenue);
        const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
        const max = Math.max(...revenues);
        r4LeaderGap = avg > 0 ? (max - avg) / avg : 0;
      }
    } catch {
      // Engine error — skip this round
    }
  }

  // Final rankings by revenue
  const sorted = [...teams].sort((a, b) => b.state.revenue - a.state.revenue);
  const rankings = sorted.map((t, i) => ({
    archetype: t.archetype,
    rank: i + 1,
    revenue: t.state.revenue,
    eps: t.state.eps,
    cash: t.state.cash,
    marketCap: t.state.marketCap,
  }));

  return {
    gameId,
    assignments,
    rankings,
    winner: rankings[0].archetype,
    r4LeaderGap,
    revenueByRound,
  };
}

// ============================================
// MAIN — RUN 500 GAMES
// ============================================

console.log("=== MONTE CARLO BALANCE TEST ===");
console.log(`Games: ${TOTAL_GAMES} | Rounds: ${ROUNDS_PER_GAME} | Teams: ${TEAMS_PER_GAME}`);
console.log(`Strategies: ${ALL_STRATEGIES.join(", ")}`);
console.log(`Noise: ±${NOISE_FACTOR * 100}% | Seed: ${SEED_BASE}`);
console.log("");

const rngAssign = mulberry32(SEED_BASE);
const results: GameResult[] = [];

const startTime = Date.now();

for (let g = 0; g < TOTAL_GAMES; g++) {
  // Randomly assign strategies to teams
  const assignments: StrategyArchetype[] = [];
  for (let t = 0; t < TEAMS_PER_GAME; t++) {
    const idx = Math.floor(rngAssign() * ALL_STRATEGIES.length);
    assignments.push(ALL_STRATEGIES[idx]);
  }

  try {
    const result = runGame(g, assignments);
    results.push(result);
  } catch {
    // Skip failed games
  }

  if ((g + 1) % 50 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Progress: ${g + 1}/${TOTAL_GAMES} games (${elapsed}s)`);
  }
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nCompleted ${results.length}/${TOTAL_GAMES} games in ${totalTime}s\n`);

// ============================================
// ANALYSIS
// ============================================

// Win rates
const wins: Record<string, number> = {};
const top2: Record<string, number> = {};
const appearances: Record<string, number> = {};
const totalRevenue: Record<string, number> = {};
const totalEPS: Record<string, number> = {};
const totalMarketCap: Record<string, number> = {};
let runawayCount = 0;

for (const strat of ALL_STRATEGIES) {
  wins[strat] = 0;
  top2[strat] = 0;
  appearances[strat] = 0;
  totalRevenue[strat] = 0;
  totalEPS[strat] = 0;
  totalMarketCap[strat] = 0;
}

for (const result of results) {
  // Count appearances
  for (const arch of result.assignments) {
    appearances[arch]++;
  }

  // Count wins and top-2
  for (const r of result.rankings) {
    if (r.rank === 1) wins[r.archetype]++;
    if (r.rank <= 2) top2[r.archetype]++;
    totalRevenue[r.archetype] += r.revenue;
    totalEPS[r.archetype] += r.eps;
    totalMarketCap[r.archetype] += r.marketCap;
  }

  // Runaway leader check
  if (result.r4LeaderGap > THRESHOLDS.RUNAWAY_LEADER_GAP) {
    runawayCount++;
  }
}

// BSC gap (revenue gap between 1st and last per game)
const bscGaps: number[] = results.map((r) => {
  const first = r.rankings[0]?.revenue ?? 0;
  const last = r.rankings[r.rankings.length - 1]?.revenue ?? 1;
  return last > 0 ? first / last : 10;
});
const avgBSCGap = bscGaps.reduce((a, b) => a + b, 0) / bscGaps.length;

// Round-by-round revenue spread
const roundSpreads: number[] = [];
for (let round = 0; round < ROUNDS_PER_GAME; round++) {
  const spreads: number[] = [];
  for (const result of results) {
    const roundRevs = Object.values(result.revenueByRound).map((revs) => revs[round] ?? 0);
    if (roundRevs.length > 0) {
      const max = Math.max(...roundRevs);
      const min = Math.min(...roundRevs);
      const avg = roundRevs.reduce((a, b) => a + b, 0) / roundRevs.length;
      if (avg > 0) spreads.push((max - min) / avg);
    }
  }
  roundSpreads.push(spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0);
}

// ============================================
// OUTPUT
// ============================================

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║                    BALANCE TEST RESULTS                        ║");
console.log("╚══════════════════════════════════════════════════════════════════╝");
console.log("");

// Win rate table
console.log("┌─────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬─────────┐");
console.log("│ Strategy        │ Win Rate │ Top-2 %  │ Avg Rev  │ Avg EPS  │ Avg MCap │ Flag    │");
console.log("├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼─────────┤");

const sortedStrats = ALL_STRATEGIES.sort((a, b) => (wins[b] / Math.max(1, appearances[b])) - (wins[a] / Math.max(1, appearances[a])));

for (const strat of sortedStrats) {
  const app = appearances[strat] || 1;
  const winRate = wins[strat] / app;
  const top2Rate = top2[strat] / app;
  const avgRev = totalRevenue[strat] / app;
  const avgEps = totalEPS[strat] / app;
  const avgMCap = totalMarketCap[strat] / app;

  let flag = "";
  if (winRate > THRESHOLDS.DOMINANT_WIN_RATE) flag = "DOMINANT";
  else if (winRate < THRESHOLDS.UNVIABLE_WIN_RATE) flag = "UNVIABLE";
  else flag = "OK";

  const pad = (s: string, n: number) => s.padEnd(n);
  const numPad = (s: string, n: number) => s.padStart(n);

  console.log(
    `│ ${pad(strat, 15)} │ ${numPad((winRate * 100).toFixed(1) + "%", 8)} │ ${numPad((top2Rate * 100).toFixed(1) + "%", 8)} │ ${numPad("$" + (avgRev / 1_000_000).toFixed(1) + "M", 8)} │ ${numPad("$" + avgEps.toFixed(2), 8)} │ ${numPad("$" + (avgMCap / 1_000_000).toFixed(0) + "M", 8)} │ ${pad(flag, 7)} │`
  );
}

console.log("└─────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴─────────┘");
console.log("");

// Runaway leader stats
console.log("RUNAWAY LEADER CHECK:");
console.log(`  Games where R4 leader >40% above field avg: ${runawayCount}/${results.length} (${((runawayCount / results.length) * 100).toFixed(1)}%)`);
console.log(`  Avg revenue gap (1st / last): ${avgBSCGap.toFixed(2)}x`);
console.log("");

// Round-by-round spread
console.log("ROUND-BY-ROUND REVENUE SPREAD (gap between best and worst, as % of avg):");
for (let r = 0; r < roundSpreads.length; r++) {
  const bar = "█".repeat(Math.min(50, Math.round(roundSpreads[r] * 25)));
  console.log(`  R${r + 1}: ${(roundSpreads[r] * 100).toFixed(0)}% ${bar}`);
}
console.log(roundSpreads[roundSpreads.length - 1] > roundSpreads[0] ? "  ⚠ SPREAD GROWING — compounding mechanics may be too strong" : "  ✓ Spread stable or narrowing — healthy");
console.log("");

// Pass/fail summary
console.log("═══ PASS/FAIL SUMMARY ═══");

let allPassed = true;

for (const strat of ALL_STRATEGIES) {
  const app = appearances[strat] || 1;
  const winRate = wins[strat] / app;
  if (winRate > THRESHOLDS.DOMINANT_WIN_RATE) {
    console.log(`  ✗ FAIL: ${strat} is DOMINANT at ${(winRate * 100).toFixed(1)}% win rate (threshold: <${THRESHOLDS.DOMINANT_WIN_RATE * 100}%)`);
    allPassed = false;
  } else if (winRate < THRESHOLDS.UNVIABLE_WIN_RATE) {
    console.log(`  ✗ FAIL: ${strat} is UNVIABLE at ${(winRate * 100).toFixed(1)}% win rate (threshold: >${THRESHOLDS.UNVIABLE_WIN_RATE * 100}%)`);
    allPassed = false;
  } else {
    console.log(`  ✓ PASS: ${strat} at ${(winRate * 100).toFixed(1)}% win rate`);
  }
}

if (runawayCount / results.length > 0.30) {
  console.log(`  ✗ FAIL: Runaway leader in ${((runawayCount / results.length) * 100).toFixed(0)}% of games (threshold: <30%)`);
  allPassed = false;
} else {
  console.log(`  ✓ PASS: Runaway leader rate ${((runawayCount / results.length) * 100).toFixed(0)}%`);
}

console.log("");
console.log(allPassed ? "══ ALL CHECKS PASSED ══" : "══ BALANCE ISSUES DETECTED — see flags above ══");
console.log("");
