/**
 * Layer 7 — Skill Ladder Test (L7-SKILL-01, L7-SKILL-02)
 *
 * 4 quality levels × 100 seeded games.
 * Verifies that better decisions produce better outcomes (Spearman ρ > 0.70).
 *
 * Run: npx tsx tools/balance/skill-ladder-test.ts
 */

import { SimulationEngine } from "../../engine/core/SimulationEngine";
import type { TeamState, MarketState } from "../../engine/types";

// =============================================================================
// Strategy Definitions — 4 quality levels
// =============================================================================

type QualityLevel = "OPTIMAL" | "GOOD" | "MIXED" | "POOR";

function getDecisionsForLevel(level: QualityLevel, round: number): Record<string, unknown> {
  switch (level) {
    case "OPTIMAL":
      return {
        factory: { investments: { workerEfficiency: 3_000_000, factoryEfficiency: 2_000_000, engineerEfficiency: 1_000_000 } },
        hr: { salaryMultiplierChanges: { workers: 1.10, engineers: 1.10, supervisors: 1.10 } },
        marketing: { marketingBudget: [{ segment: "General", region: "North America", spend: 3_000_000, campaignType: "awareness" }], positioningStrategy: "balanced" },
        rd: { rdBudgetAllocation: [{ productId: "main-product", budget: 8_000_000, focus: "innovation" }] },
        finance: {},
      };
    case "GOOD":
      return {
        factory: { investments: { workerEfficiency: 2_000_000, factoryEfficiency: 1_000_000 } },
        hr: { salaryMultiplierChanges: { workers: 1.05, engineers: 1.05, supervisors: 1.05 } },
        marketing: { marketingBudget: [{ segment: "General", region: "North America", spend: 2_000_000, campaignType: "awareness" }], positioningStrategy: "balanced" },
        rd: { rdBudgetAllocation: [{ productId: "main-product", budget: 5_000_000, focus: "innovation" }] },
        finance: {},
      };
    case "MIXED":
      // Alternates between OPTIMAL and POOR each round
      return round % 2 === 1
        ? getDecisionsForLevel("OPTIMAL", round)
        : getDecisionsForLevel("POOR", round);
    case "POOR":
      return {
        factory: {},
        hr: { salaryMultiplierChanges: { workers: 0.90, engineers: 0.90, supervisors: 0.90 } },
        marketing: {},
        rd: {},
        finance: {},
      };
  }
}

// =============================================================================
// Spearman Rank Correlation
// =============================================================================

function spearmanCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const rank = (arr: number[]) => {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const ranks = new Array(n);
    for (let i = 0; i < sorted.length; i++) ranks[sorted[i].i] = i + 1;
    return ranks;
  };

  const rx = rank(x);
  const ry = rank(y);

  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = rx[i] - ry[i];
    sumD2 += d * d;
  }

  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

// =============================================================================
// Run Skill Ladder
// =============================================================================

async function runSkillLadder(numGames: number = 100) {
  const LEVELS: QualityLevel[] = ["OPTIMAL", "GOOD", "MIXED", "POOR"];
  const ROUNDS = 8;

  const wins: Record<QualityLevel, number> = { OPTIMAL: 0, GOOD: 0, MIXED: 0, POOR: 0 };
  const placements: Record<QualityLevel, number[]> = { OPTIMAL: [], GOOD: [], MIXED: [], POOR: [] };

  for (let game = 0; game < numGames; game++) {
    const seed = `skill-ladder-${game}`;
    const teams = LEVELS.map(level => ({
      id: `team-${level}`,
      level,
      state: SimulationEngine.createInitialTeamState(),
      decisions: {} as Record<string, unknown>,
    }));

    let marketState = SimulationEngine.createInitialMarketState();

    for (let round = 1; round <= ROUNDS; round++) {
      for (const team of teams) {
        team.decisions = getDecisionsForLevel(team.level, round);
      }

      const output = SimulationEngine.processRound({
        roundNumber: round,
        teams: teams.map(t => ({ id: t.id, state: t.state, decisions: t.decisions })),
        marketState,
        matchSeed: seed,
      });

      for (let i = 0; i < teams.length; i++) {
        teams[i].state = output.results[i].state;
      }
      marketState = output.newMarketState;
    }

    // Rank by final revenue
    const ranked = teams
      .map(t => ({ level: t.level, revenue: t.state.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    ranked.forEach((t, i) => {
      placements[t.level].push(i + 1);
      if (i === 0) wins[t.level]++;
    });
  }

  // Calculate averages
  const avgPlacement: Record<QualityLevel, number> = {} as any;
  for (const level of LEVELS) {
    avgPlacement[level] = placements[level].reduce((a, b) => a + b, 0) / numGames;
  }

  // Spearman correlation: skill level (1=OPTIMAL, 4=POOR) vs avg placement
  const skillLevels = LEVELS.map((_, i) => i + 1); // 1, 2, 3, 4
  const avgPlacements = LEVELS.map(l => avgPlacement[l]);
  const rho = spearmanCorrelation(skillLevels, avgPlacements);

  // Print report
  console.log("\n=== SKILL LADDER RESULTS ===");
  console.log(`Games: ${numGames} | Rounds: ${ROUNDS}`);
  console.log("");
  for (const level of LEVELS) {
    console.log(`  ${level.padEnd(8)}: wins=${wins[level].toString().padStart(3)} (${(wins[level] / numGames * 100).toFixed(1)}%) | avg placement=${avgPlacement[level].toFixed(2)}`);
  }
  console.log("");
  console.log(`Spearman ρ = ${rho.toFixed(3)} (target > 0.70)`);
  console.log(`OPTIMAL wins: ${wins.OPTIMAL}/${numGames} (target ≥ ${Math.floor(numGames * 0.6)})`);
  console.log("");

  // Gate checks
  const passed = rho > 0.70 && wins.OPTIMAL >= numGames * 0.6;
  console.log(passed ? "✅ SKILL LADDER PASSED" : "❌ SKILL LADDER FAILED");

  return { wins, avgPlacement, rho, passed };
}

// Run if called directly
const isDirectRun = typeof process !== "undefined" && process.argv[1]?.includes("skill-ladder");
if (isDirectRun) {
  runSkillLadder(100).then(result => {
    process.exit(result.passed ? 0 : 1);
  });
}

export { runSkillLadder, spearmanCorrelation, getDecisionsForLevel };
