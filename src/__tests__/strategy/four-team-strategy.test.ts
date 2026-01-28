/**
 * Four-Team Strategy Differentiation Test
 *
 * This test runs 4 teams with distinctly different strategies for 4 rounds
 * to demonstrate strategy differentiation in the simulation engine.
 *
 * Strategies:
 * 1. Marketing Heavy - Big marketing spend, brand focus
 * 2. R&D Focused - Innovation and quality investment
 * 3. Cost Cutter - Efficiency investment, minimal spending
 * 4. Balanced - Middle-ground approach across all areas
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput } from "@/engine/core/SimulationEngine";
import type { TeamState, MarketState, AllDecisions, Segment } from "@/engine/types";

// ============================================
// HELPERS
// ============================================

function createInitialTeamState(overrides: Partial<TeamState> = {}): TeamState {
  return SimulationEngine.createInitialTeamState(overrides);
}

function createInitialMarketState(): MarketState {
  return {
    roundNumber: 1,
    economicConditions: {
      gdp: 2.5,
      inflation: 2.0,
      consumerConfidence: 75,
      unemploymentRate: 4.5,
    },
    fxRates: {
      "EUR/USD": 1.10,
      "GBP/USD": 1.27,
      "JPY/USD": 0.0067,
      "CNY/USD": 0.14,
    },
    fxVolatility: 0.15,
    interestRates: {
      federalRate: 5.0,
      tenYearBond: 4.5,
      corporateBond: 6.0,
    },
    demandBySegment: {
      Budget: { totalDemand: 500000, priceRange: { min: 100, max: 300 }, growthRate: 0.02 },
      General: { totalDemand: 400000, priceRange: { min: 300, max: 600 }, growthRate: 0.03 },
      Enthusiast: { totalDemand: 200000, priceRange: { min: 600, max: 1000 }, growthRate: 0.04 },
      Professional: { totalDemand: 100000, priceRange: { min: 1000, max: 1500 }, growthRate: 0.02 },
      "Active Lifestyle": { totalDemand: 150000, priceRange: { min: 400, max: 800 }, growthRate: 0.05 },
    },
    marketPressures: {
      priceCompetition: 0.5,
      qualityExpectations: 0.6,
      sustainabilityPremium: 0.3,
    },
  };
}

// ============================================
// STRATEGY DECISION GENERATORS
// ============================================

type StrategyType = "marketing-heavy" | "rd-focused" | "cost-cutter" | "balanced";

function generateDecisions(
  strategy: StrategyType,
  state: TeamState,
  round: number
): AllDecisions {
  const factoryId = state.factories[0]?.id || "factory-1";
  const productId = state.products[0]?.id || "main-product";

  switch (strategy) {
    case "marketing-heavy":
      // Heavy marketing investment, brand building
      return {
        factory: {
          efficiencyInvestments: {
            [factoryId]: {
              workers: 500_000,
              supervisors: 300_000,
              engineers: 400_000,
              machinery: 500_000,
              factory: 500_000,
            },
          },
        },
        hr: {
          salaryMultiplierChanges: {
            workers: 1.0,
            engineers: 1.05,
            supervisors: 1.0,
          },
        },
        finance: {
          treasuryBillsIssue: 0,
          corporateBondsIssue: round === 1 ? 15_000_000 : 0,
          dividendPerShare: 0,
          sharesBuyback: 0,
        },
        marketing: {
          advertisingBudget: {
            Budget: 3_000_000,
            General: 3_500_000,
            Enthusiast: 2_000_000,
            Professional: 1_500_000,
            "Active Lifestyle": 2_000_000,
          },
          brandingInvestment: 5_000_000, // Heavy brand investment
        },
        rd: {
          rdBudget: 2_000_000,
          productImprovements: [
            { productId, featuresIncrease: 3 },
          ],
        },
      };

    case "rd-focused":
      // Heavy R&D investment, quality focus
      return {
        factory: {
          efficiencyInvestments: {
            [factoryId]: {
              workers: 800_000,
              supervisors: 500_000,
              engineers: 1_500_000, // More engineers
              machinery: 800_000,
              factory: 800_000,
            },
          },
        },
        hr: {
          salaryMultiplierChanges: {
            workers: 1.1,
            engineers: 1.3, // Pay engineers well
            supervisors: 1.1,
          },
          trainingPrograms: [
            { role: "engineer" as const, programType: "innovation" },
          ],
        },
        finance: {
          treasuryBillsIssue: 0,
          corporateBondsIssue: round === 1 ? 12_000_000 : 0,
          dividendPerShare: 0,
          sharesBuyback: 0,
        },
        marketing: {
          advertisingBudget: {
            Budget: 1_000_000,
            General: 1_500_000,
            Enthusiast: 2_000_000,
            Professional: 2_500_000,
            "Active Lifestyle": 1_000_000,
          },
          brandingInvestment: 1_500_000,
        },
        rd: {
          rdBudget: 10_000_000,
          productImprovements: [
            { productId, qualityIncrease: 5 }, // Heavy R&D
          ],
        },
      };

    case "cost-cutter":
      // Minimal spending, efficiency focus
      return {
        factory: {
          efficiencyInvestments: {
            [factoryId]: {
              workers: 2_000_000, // Heavy efficiency investment
              supervisors: 800_000,
              engineers: 800_000,
              machinery: 2_500_000, // Automate
              factory: 2_000_000,
            },
          },
        },
        hr: {
          salaryMultiplierChanges: {
            workers: 0.9, // Lower salaries
            engineers: 0.95,
            supervisors: 0.9,
          },
        },
        finance: {
          treasuryBillsIssue: 0,
          corporateBondsIssue: round === 1 ? 8_000_000 : 0,
          dividendPerShare: 0,
          sharesBuyback: 0,
        },
        marketing: {
          advertisingBudget: {
            Budget: 1_500_000,
            General: 1_200_000,
            Enthusiast: 500_000,
            Professional: 300_000,
            "Active Lifestyle": 500_000,
          },
          brandingInvestment: 500_000, // Minimal branding
        },
        rd: {
          rdBudget: 1_500_000,
          productImprovements: [
            { productId },
          ],
        },
      };

    case "balanced":
      // Middle-ground across all areas
      return {
        factory: {
          efficiencyInvestments: {
            [factoryId]: {
              workers: 1_000_000,
              supervisors: 600_000,
              engineers: 1_000_000,
              machinery: 1_000_000,
              factory: 1_000_000,
            },
          },
        },
        hr: {
          salaryMultiplierChanges: {
            workers: 1.0,
            engineers: 1.1,
            supervisors: 1.0,
          },
        },
        finance: {
          treasuryBillsIssue: 0,
          corporateBondsIssue: round === 1 ? 10_000_000 : 0,
          dividendPerShare: 0,
          sharesBuyback: 0,
        },
        marketing: {
          advertisingBudget: {
            Budget: 1_500_000,
            General: 1_800_000,
            Enthusiast: 1_200_000,
            Professional: 1_000_000,
            "Active Lifestyle": 1_000_000,
          },
          brandingInvestment: 2_000_000,
        },
        rd: {
          rdBudget: 5_000_000,
          productImprovements: [
            { productId, qualityIncrease: 3 },
          ],
        },
      };
  }
}

// ============================================
// TESTS
// ============================================

describe("Four-Team Strategy Differentiation (4 Rounds)", () => {
  interface TeamData {
    id: string;
    name: string;
    strategy: StrategyType;
    state: TeamState;
    revenueHistory: number[];
    netIncomeHistory: number[];
    marketShareHistory: number[];
    rankHistory: number[];
  }

  it("should show differentiated results for 4 different strategies over 4 rounds", () => {
    // Initialize 4 teams - all start with IDENTICAL state
    const teams: TeamData[] = [
      {
        id: "team-marketing",
        name: "Marketing Heavy",
        strategy: "marketing-heavy",
        state: createInitialTeamState(),
        revenueHistory: [],
        netIncomeHistory: [],
        marketShareHistory: [],
        rankHistory: [],
      },
      {
        id: "team-rd",
        name: "R&D Focused",
        strategy: "rd-focused",
        state: createInitialTeamState(),
        revenueHistory: [],
        netIncomeHistory: [],
        marketShareHistory: [],
        rankHistory: [],
      },
      {
        id: "team-cost",
        name: "Cost Cutter",
        strategy: "cost-cutter",
        state: createInitialTeamState(),
        revenueHistory: [],
        netIncomeHistory: [],
        marketShareHistory: [],
        rankHistory: [],
      },
      {
        id: "team-balanced",
        name: "Balanced",
        strategy: "balanced",
        state: createInitialTeamState(),
        revenueHistory: [],
        netIncomeHistory: [],
        marketShareHistory: [],
        rankHistory: [],
      },
    ];

    let marketState = createInitialMarketState();

    // Run 4 rounds
    for (let round = 1; round <= 4; round++) {
      const input: SimulationInput = {
        roundNumber: round,
        teams: teams.map(team => ({
          id: team.id,
          state: team.state,
          decisions: generateDecisions(team.strategy, team.state, round),
        })),
        marketState,
      };

      const results = SimulationEngine.processRound(input);

      // Update team states and track history
      for (const result of results.results) {
        const team = teams.find(t => t.id === result.teamId)!;
        team.state = result.newState;
        team.revenueHistory.push(result.newState.revenue);
        team.netIncomeHistory.push(result.newState.netIncome);

        // Calculate total market share
        const totalMarketShare = Object.values(result.marketShareBySegment || {})
          .reduce((sum, share) => sum + share, 0);
        team.marketShareHistory.push(totalMarketShare);

        const ranking = results.rankings.find(r => r.teamId === result.teamId)!;
        team.rankHistory.push(ranking.rank);
      }

      marketState = results.newMarketState;
    }

    // ============================================
    // OUTPUT RESULTS TABLE
    // ============================================

    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║           4-TEAM STRATEGY DIFFERENTIATION TEST - FINAL RESULTS (4 ROUNDS)             ║");
    console.log("╠════════════════════════════════════════════════════════════════════════════════════════╣");
    console.log("║  Team              │  Strategy         │   Revenue   │  Net Income │ Mkt Share │ Rank ║");
    console.log("╠════════════════════════════════════════════════════════════════════════════════════════╣");

    // Sort by rank for display
    const sortedTeams = [...teams].sort((a, b) => {
      const aRank = a.rankHistory[a.rankHistory.length - 1];
      const bRank = b.rankHistory[b.rankHistory.length - 1];
      return aRank - bRank;
    });

    for (const team of sortedTeams) {
      const revenue = team.state.revenue;
      const netIncome = team.state.netIncome;
      const marketShare = team.marketShareHistory[team.marketShareHistory.length - 1] || 0;
      const rank = team.rankHistory[team.rankHistory.length - 1];

      const formatCurrency = (n: number) => {
        if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
        if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
        return `$${n.toFixed(0)}`;
      };

      const teamName = team.name.padEnd(18);
      const strategyName = team.strategy.padEnd(17);
      const revStr = formatCurrency(revenue).padStart(11);
      const incomeStr = formatCurrency(netIncome).padStart(11);
      const shareStr = `${(marketShare * 100).toFixed(1)}%`.padStart(9);
      const rankStr = `#${rank}`.padStart(4);

      console.log(`║  ${teamName} │  ${strategyName} │ ${revStr} │ ${incomeStr} │ ${shareStr} │ ${rankStr} ║`);
    }

    console.log("╚════════════════════════════════════════════════════════════════════════════════════════╝");
    console.log("\n");

    // Round-by-round breakdown
    console.log("Round-by-Round Revenue Progress:");
    console.log("─".repeat(70));
    for (const team of sortedTeams) {
      const progress = team.revenueHistory.map((r, i) =>
        `R${i + 1}: $${(r / 1_000_000).toFixed(1)}M`
      ).join(" → ");
      console.log(`${team.name}: ${progress}`);
    }
    console.log("\n");

    // Rank changes
    console.log("Rank History:");
    console.log("─".repeat(70));
    for (const team of sortedTeams) {
      const ranks = team.rankHistory.join(" → ");
      console.log(`${team.name}: ${ranks}`);
    }
    console.log("\n");

    // ============================================
    // ASSERTIONS
    // ============================================

    // All teams should have positive revenue after 4 rounds
    for (const team of teams) {
      expect(team.state.revenue).toBeGreaterThan(0);
    }

    // Check for strategy differentiation - revenues should differ
    const revenues = teams.map(t => t.state.revenue);
    const maxRevenue = Math.max(...revenues);
    const minRevenue = Math.min(...revenues);
    const spread = maxRevenue / minRevenue;

    console.log(`Revenue Spread: ${spread.toFixed(2)}x (${minRevenue > 0 ? 'valid' : 'invalid'})`);

    // There should be SOME differentiation (spread > 1.0)
    expect(spread).toBeGreaterThan(1.0);

    // But not extreme (all strategies should be viable)
    expect(spread).toBeLessThan(10);

    // ============================================
    // ANSWER USER'S QUESTIONS
    // ============================================

    console.log("═".repeat(70));
    console.log("STRATEGY DIFFERENTIATION ANALYSIS:");
    console.log("═".repeat(70));

    // Q1: Do different strategies lead to meaningfully different outcomes?
    const q1Answer = spread > 1.2
      ? "YES - Different strategies produce meaningfully different outcomes"
      : "MINIMAL - Strategies produce similar results";
    console.log(`\n1. Do different strategies lead to different outcomes?`);
    console.log(`   ${q1Answer}`);
    console.log(`   Revenue spread: ${spread.toFixed(2)}x`);

    // Q2: Is any strategy clearly dominant?
    const winner = sortedTeams[0];
    const runnerUp = sortedTeams[1];
    const winMargin = (winner.state.revenue - runnerUp.state.revenue) / runnerUp.state.revenue;
    const q2Answer = winMargin > 0.5
      ? `YES - ${winner.name} dominates with ${(winMargin * 100).toFixed(0)}% lead`
      : `NO - Competition is balanced (${(winMargin * 100).toFixed(0)}% margin)`;
    console.log(`\n2. Is any strategy clearly dominant?`);
    console.log(`   ${q2Answer}`);

    // Q3: Are all strategies viable?
    const allPositiveIncome = teams.every(t => t.state.netIncome > 0);
    const lowestRevShare = minRevenue / (revenues.reduce((a, b) => a + b, 0));
    const q3Answer = allPositiveIncome && lowestRevShare > 0.1
      ? "YES - All strategies generate positive income and meaningful revenue"
      : "MIXED - Some strategies may not be viable";
    console.log(`\n3. Are all strategies viable?`);
    console.log(`   ${q3Answer}`);
    console.log(`   Lowest revenue share: ${(lowestRevShare * 100).toFixed(1)}%`);

    console.log("\n" + "═".repeat(70));
  });
});
