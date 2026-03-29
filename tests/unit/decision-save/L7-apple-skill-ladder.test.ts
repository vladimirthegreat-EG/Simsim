/**
 * L7: Skill Ladder Test with Spearman Rank Correlation
 *
 * Validates that the simulation engine rewards higher-quality decisions
 * by running 30 games with 4 teams at different skill levels (OPTIMAL,
 * GOOD, MIXED, POOR) and measuring win rates, average placements, and
 * Spearman rho between skill level and average placement.
 *
 * OPTIMAL: rdBudget=$15M, factory efficiency=$5M, marketing=$5M, salary=1.15x
 * GOOD:    rdBudget=$8M,  factory efficiency=$3M, marketing=$3M, salary=1.10x
 * MIXED:   alternates OPTIMAL and POOR decisions each round
 * POOR:    all zero/minimum decisions, salary=0.90x
 */
import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../../../engine/core/SimulationEngine";
import type { SimulationInput, SimulationOutput } from "../../../engine/core/SimulationEngine";
import type { AllDecisions } from "../../../engine/types/decisions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NUM_GAMES = 30;
const NUM_ROUNDS = 8;
const TEAM_IDS = ["OPTIMAL", "GOOD", "MIXED", "POOR"] as const;
type SkillLevel = (typeof TEAM_IDS)[number];

// Skill levels: 1 = best (OPTIMAL), 4 = worst (POOR)
// For Spearman: lower placement number = better performance
const SKILL_RANK: Record<SkillLevel, number> = {
  OPTIMAL: 1,
  GOOD: 2,
  MIXED: 3,
  POOR: 4,
};

// ---------------------------------------------------------------------------
// Decision Builders
// ---------------------------------------------------------------------------

function getFactoryId(teamId: string): string {
  // The default factory ID from createInitialTeamState
  // SimulationEngine uses FactoryModule.createNewFactory which generates IDs
  // We need to read it from the state at runtime, but for decisions we use
  // a helper that references the first factory
  return ""; // Will be resolved at runtime
}

/**
 * Build OPTIMAL decisions: high investment across all modules
 */
function buildOptimalDecisions(factoryId: string, round: number): AllDecisions {
  return {
    factory: {
      efficiencyInvestments: {
        [factoryId]: {
          workers: 2_000_000,
          machinery: 5_000_000,
          supervisors: 500_000,
          engineers: 2_000_000,
          factory: 1_000_000,
        },
      },
      greenInvestments: { [factoryId]: 500_000 },
      upgradePurchases: [],
      newFactories: [],
      esgInitiatives: {
        executivePayRatio: true,
        employeeWellness: true,
        diversityInclusion: true,
        transparencyReport: true,
      },
    },
    hr: {
      recruitmentSearches: [
        { role: "worker" as const, tier: "basic" as const, factoryId },
        { role: "engineer" as const, tier: "basic" as const, factoryId },
        { role: "worker" as const, tier: "basic" as const, factoryId },
      ],
      salaryMultiplierChanges: {
        workers: 1.15,
        engineers: 1.15,
        supervisors: 1.15,
      },
      trainingPrograms: [
        { role: "worker" as const, programType: "efficiency" },
      ],
    },
    marketing: {
      advertisingBudget: {
        Budget: 1_000_000,
        General: 1_500_000,
        Enthusiast: 1_000_000,
        Professional: 800_000,
        "Active Lifestyle": 700_000,
      },
      brandingInvestment: 2_000_000,
      promotions: [],
      productPricing: [
        { productId: "budget-product", newPrice: 190 },
        { productId: "initial-product", newPrice: 410 },
        { productId: "active-product", newPrice: 540 },
        { productId: "enthusiast-product", newPrice: 760 },
        { productId: "professional-product", newPrice: 1170 },
      ],
    },
    rd: {
      rdBudget: 15_000_000,
      newProducts: [],
      productImprovements: [
        { productId: "budget-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "initial-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "active-product", qualityIncrease: 2, featuresIncrease: 2 },
        { productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
      ],
    },
    finance: {
      dividendPerShare: 0.5,
    },
  };
}

/**
 * Build GOOD decisions: moderate investment
 */
function buildGoodDecisions(factoryId: string, round: number): AllDecisions {
  return {
    factory: {
      efficiencyInvestments: {
        [factoryId]: {
          workers: 1_000_000,
          machinery: 3_000_000,
          supervisors: 300_000,
          engineers: 1_000_000,
          factory: 500_000,
        },
      },
      greenInvestments: { [factoryId]: 300_000 },
      upgradePurchases: [],
      newFactories: [],
      esgInitiatives: {
        executivePayRatio: true,
        employeeWellness: true,
      },
    },
    hr: {
      recruitmentSearches: [
        { role: "worker" as const, tier: "basic" as const, factoryId },
        { role: "engineer" as const, tier: "basic" as const, factoryId },
      ],
      salaryMultiplierChanges: {
        workers: 1.10,
        engineers: 1.10,
        supervisors: 1.10,
      },
      trainingPrograms: [
        { role: "worker" as const, programType: "efficiency" },
      ],
    },
    marketing: {
      advertisingBudget: {
        Budget: 600_000,
        General: 1_000_000,
        Enthusiast: 600_000,
        Professional: 500_000,
        "Active Lifestyle": 300_000,
      },
      brandingInvestment: 1_000_000,
      promotions: [],
      productPricing: [
        { productId: "budget-product", newPrice: 195 },
        { productId: "initial-product", newPrice: 420 },
        { productId: "active-product", newPrice: 550 },
        { productId: "enthusiast-product", newPrice: 770 },
        { productId: "professional-product", newPrice: 1180 },
      ],
    },
    rd: {
      rdBudget: 8_000_000,
      newProducts: [],
      productImprovements: [
        { productId: "budget-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "initial-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "active-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "enthusiast-product", qualityIncrease: 1, featuresIncrease: 1 },
        { productId: "professional-product", qualityIncrease: 1, featuresIncrease: 1 },
      ],
    },
    finance: {
      dividendPerShare: 0.3,
    },
  };
}

/**
 * Build POOR decisions: minimal investment, low salary
 */
function buildPoorDecisions(factoryId: string, round: number): AllDecisions {
  return {
    factory: {
      efficiencyInvestments: {
        [factoryId]: {
          workers: 0,
          machinery: 0,
          supervisors: 0,
          engineers: 0,
          factory: 0,
        },
      },
      greenInvestments: {},
      upgradePurchases: [],
      newFactories: [],
      esgInitiatives: {},
    },
    hr: {
      recruitmentSearches: [],
      salaryMultiplierChanges: {
        workers: 0.90,
        engineers: 0.90,
        supervisors: 0.90,
      },
      trainingPrograms: [],
    },
    marketing: {
      advertisingBudget: {
        Budget: 0,
        General: 0,
        Enthusiast: 0,
        Professional: 0,
        "Active Lifestyle": 0,
      },
      brandingInvestment: 0,
      promotions: [],
      productPricing: [],
    },
    rd: {
      rdBudget: 0,
      newProducts: [],
      productImprovements: [],
    },
    finance: {
      dividendPerShare: 0,
    },
  };
}

/**
 * Get decisions for a skill level (MIXED alternates OPTIMAL/POOR per round)
 */
function getDecisions(
  level: SkillLevel,
  factoryId: string,
  round: number,
): AllDecisions {
  switch (level) {
    case "OPTIMAL":
      return buildOptimalDecisions(factoryId, round);
    case "GOOD":
      return buildGoodDecisions(factoryId, round);
    case "MIXED":
      // Alternate: odd rounds = OPTIMAL, even rounds = POOR
      return round % 2 === 1
        ? buildOptimalDecisions(factoryId, round)
        : buildPoorDecisions(factoryId, round);
    case "POOR":
      return buildPoorDecisions(factoryId, round);
  }
}

// ---------------------------------------------------------------------------
// Spearman Rank Correlation (inline implementation)
// ---------------------------------------------------------------------------

/**
 * Compute Spearman rank correlation coefficient between two arrays.
 * Handles tied ranks using the average-rank method.
 */
function spearmanRho(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) {
    throw new Error("Arrays must have equal length >= 2");
  }
  const n = x.length;

  // Convert values to ranks (1-based, average for ties)
  function toRanks(arr: number[]): number[] {
    const indexed = arr.map((val, i) => ({ val, i }));
    indexed.sort((a, b) => a.val - b.val);

    const ranks = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      // Find all tied values
      while (j < n && indexed[j].val === indexed[i].val) {
        j++;
      }
      // Average rank for ties
      const avgRank = (i + 1 + j) / 2;
      for (let k = i; k < j; k++) {
        ranks[indexed[k].i] = avgRank;
      }
      i = j;
    }
    return ranks;
  }

  const rankX = toRanks(x);
  const rankY = toRanks(y);

  // Compute sum of squared differences
  let d2sum = 0;
  for (let i = 0; i < n; i++) {
    const d = rankX[i] - rankY[i];
    d2sum += d * d;
  }

  // Spearman formula: rho = 1 - 6*sum(d^2) / (n*(n^2 - 1))
  const rho = 1 - (6 * d2sum) / (n * (n * n - 1));
  return rho;
}

// ---------------------------------------------------------------------------
// Game Simulation Runner
// ---------------------------------------------------------------------------

interface GameResult {
  /** Final rank (1=best, 4=worst) per team after round 8 */
  placements: Record<SkillLevel, number>;
  /** Which team won (rank 1) */
  winner: SkillLevel;
}

function runGame(seed: string): GameResult {
  // Create initial states for each team
  const teamStates: Record<string, ReturnType<typeof SimulationEngine.createInitialTeamState>> = {};
  for (const teamId of TEAM_IDS) {
    teamStates[teamId] = SimulationEngine.createInitialTeamState();
  }

  let marketState = SimulationEngine.createInitialMarketState();

  // Run 8 rounds
  let lastOutput: SimulationOutput | undefined;
  for (let round = 1; round <= NUM_ROUNDS; round++) {
    const teams = TEAM_IDS.map((teamId) => {
      const state = teamStates[teamId];
      const factoryId = state.factories[0]?.id || "factory-1";
      const decisions = getDecisions(teamId, factoryId, round);
      return { id: teamId, state, decisions };
    });

    const input: SimulationInput = {
      roundNumber: round,
      teams,
      marketState,
      matchSeed: seed,
    };

    const output = SimulationEngine.processRound(input);
    lastOutput = output;

    // Update states for next round
    for (const result of output.results) {
      teamStates[result.teamId] = result.newState;
    }
    marketState = output.newMarketState;
  }

  // Extract final rankings from last round
  const placements: Record<string, number> = {};
  if (lastOutput) {
    for (const ranking of lastOutput.rankings) {
      placements[ranking.teamId] = ranking.rank;
    }
  }

  // Find winner (rank 1)
  let winner: SkillLevel = "OPTIMAL";
  for (const teamId of TEAM_IDS) {
    if (placements[teamId] === 1) {
      winner = teamId;
      break;
    }
  }

  return {
    placements: placements as Record<SkillLevel, number>,
    winner,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("L7: Skill Ladder - Spearman rank correlation", () => {
  // Run all 30 games once, share results across assertions
  const gameResults: GameResult[] = [];
  const winCounts: Record<SkillLevel, number> = { OPTIMAL: 0, GOOD: 0, MIXED: 0, POOR: 0 };
  const placementSums: Record<SkillLevel, number> = { OPTIMAL: 0, GOOD: 0, MIXED: 0, POOR: 0 };

  // Pre-compute all games
  for (let i = 0; i < NUM_GAMES; i++) {
    const seed = String(i);
    const result = runGame(seed);
    gameResults.push(result);
    winCounts[result.winner]++;
    for (const teamId of TEAM_IDS) {
      placementSums[teamId] += result.placements[teamId];
    }
  }

  const avgPlacements: Record<SkillLevel, number> = {
    OPTIMAL: placementSums.OPTIMAL / NUM_GAMES,
    GOOD: placementSums.GOOD / NUM_GAMES,
    MIXED: placementSums.MIXED / NUM_GAMES,
    POOR: placementSums.POOR / NUM_GAMES,
  };

  const winRates: Record<SkillLevel, number> = {
    OPTIMAL: winCounts.OPTIMAL / NUM_GAMES,
    GOOD: winCounts.GOOD / NUM_GAMES,
    MIXED: winCounts.MIXED / NUM_GAMES,
    POOR: winCounts.POOR / NUM_GAMES,
  };

  // Compute Spearman rho between skill level (1-4) and average placement (lower = better)
  // We use per-game data: for each game, each team has a skill rank and a placement.
  // Total data points: 4 teams * 30 games = 120 paired observations.
  const skillRanks: number[] = [];
  const placementValues: number[] = [];
  for (const game of gameResults) {
    for (const teamId of TEAM_IDS) {
      skillRanks.push(SKILL_RANK[teamId]);
      placementValues.push(game.placements[teamId]);
    }
  }
  const rho = spearmanRho(skillRanks, placementValues);

  // --- Report ---
  it("should report win rates, average placements, and Spearman rho", () => {
    console.log("\n=== L7 Skill Ladder Results (30 games, 8 rounds each) ===");
    console.log("\nWin rates:");
    for (const level of TEAM_IDS) {
      console.log(`  ${level}: ${(winRates[level] * 100).toFixed(1)}% (${winCounts[level]}/${NUM_GAMES})`);
    }
    console.log("\nAverage placement (1=best, 4=worst):");
    for (const level of TEAM_IDS) {
      console.log(`  ${level}: ${avgPlacements[level].toFixed(2)}`);
    }
    console.log(`\nSpearman rho (skill vs placement): ${rho.toFixed(4)}`);
    console.log("=== End Report ===\n");

    // This test always passes - it just prints the report
    expect(true).toBe(true);
  });

  // --- Assertions ---
  it("Spearman rho between skill level and placement should be > 0.50", () => {
    expect(rho).toBeGreaterThan(0.50);
  });

  it("OPTIMAL should win >= 40% of games", () => {
    expect(winRates.OPTIMAL).toBeGreaterThanOrEqual(0.40);
  });

  it("POOR should win <= 20% of games", () => {
    expect(winRates.POOR).toBeLessThanOrEqual(0.20);
  });
}, 600_000); // 10-minute timeout for 30 games x 8 rounds
