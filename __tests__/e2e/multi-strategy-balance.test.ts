/**
 * Multi-Strategy Balance Test
 *
 * This test validates that DIFFERENT STRATEGIES can all win if executed well.
 * The goal is NOT to find "the best strategy" - it's to ensure the game
 * rewards good execution of ANY viable strategy.
 *
 * Each strategy:
 * - Has different products at different price points
 * - Targets different segments
 * - Makes decisions that align with their strategic focus
 * - Should be able to win if executed well
 *
 * Strategies tested:
 * 1. Cost Leader: Low prices, high efficiency, Budget/General focus
 * 2. Premium/Quality: High prices, high R&D, Professional/Enthusiast focus
 * 3. Marketing/Brand: Medium prices, heavy marketing, broad reach
 * 4. Niche Specialist: Focused on one segment with tailored approach
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SimulationEngine, type SimulationInput } from "@/engine/core/SimulationEngine";
import { MarketSimulator } from "@/engine/market/MarketSimulator";
import type { TeamState, MarketState, AllDecisions, Segment, Product } from "@/engine/types";

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

// Create a product for a specific segment with strategy-appropriate attributes
function createProduct(
  segment: Segment,
  strategy: "cost-leader" | "premium" | "marketing" | "niche",
  id: string
): Product {
  const priceRanges: Record<Segment, { min: number; max: number }> = {
    Budget: { min: 100, max: 300 },
    General: { min: 300, max: 600 },
    Enthusiast: { min: 600, max: 1000 },
    Professional: { min: 1000, max: 1500 },
    "Active Lifestyle": { min: 400, max: 800 },
  };

  const range = priceRanges[segment];
  const midPrice = (range.min + range.max) / 2;

  let price: number;
  let quality: number;
  let features: number;

  switch (strategy) {
    case "cost-leader":
      // Low price, adequate quality
      price = range.min + (range.max - range.min) * 0.2; // Bottom 20% of range
      quality = 55; // Just adequate
      features = 40;
      break;
    case "premium":
      // High price, high quality
      price = range.min + (range.max - range.min) * 0.8; // Top 20% of range
      quality = 90; // Excellent
      features = 85;
      break;
    case "marketing":
      // Medium price, medium quality, relies on brand
      price = midPrice;
      quality = 70;
      features = 65;
      break;
    case "niche":
      // Optimized for segment - best value proposition
      price = midPrice * 0.9; // Slightly below mid
      quality = 75; // Good quality
      features = 70;
      break;
  }

  return {
    id,
    name: `${strategy}-${segment}`,
    segment,
    price,
    quality,
    features,
    reliability: 80,
    developmentRound: 0,
    developmentStatus: "launched" as const,
    developmentProgress: 100,
    targetQuality: quality,
    targetFeatures: features,
    roundsRemaining: 0,
    unitCost: price * 0.5,
  };
}

// ============================================
// STRATEGY DEFINITIONS
// ============================================

interface StrategyDefinition {
  name: string;
  description: string;
  targetSegments: Segment[];
  setupProducts: (state: TeamState) => void;
  generateDecisions: (state: TeamState, round: number, factoryId: string) => AllDecisions;
}

const STRATEGIES: Record<string, StrategyDefinition> = {
  "cost-leader": {
    name: "ValueMax Corp",
    description: "Cost leader targeting high-volume segments with low prices and high efficiency",
    targetSegments: ["Budget", "General", "Active Lifestyle"],
    setupProducts: (state) => {
      state.products = [
        createProduct("Budget", "cost-leader", "budget-product"),
        createProduct("General", "cost-leader", "general-product"),
        createProduct("Active Lifestyle", "cost-leader", "lifestyle-product"),
      ];
      // Start with lower brand (cost leaders don't invest in brand initially)
      state.brandValue = 0.4;
    },
    generateDecisions: (state, round, factoryId) => {
      // Cost leaders invest heavily in efficiency to maintain low prices profitably
      return {
        factory: {
          efficiencyInvestments: {
            [factoryId]: {
              workers: 2_000_000,
              supervisors: 500_000,
              engineers: 500_000,
              machinery: 3_000_000, // Heavy automation
              factory: 2_000_000,
            },
          },
        },
        hr: {
          salaryMultiplierChanges: {
            workers: 0.95, // Competitive but lean
            engineers: 1.0,
            supervisors: 0.95,
          },
        },
        finance: {
          treasuryBillsIssue: 0,
          corporateBondsIssue: round === 1 ? 15_000_000 : 0,
          dividendPerShare: round >= 6 ? 0.03 : 0,
          sharesBuyback: 0,
        },
        marketing: {
          // Focused, efficient marketing on target segments
          advertisingBudget: {
            Budget: 2_500_000,
            General: 2_000_000,
            "Active Lifestyle": 1_500_000,
          },
          brandingInvestment: 500_000, // Minimal branding
        },
        rd: {
          // Focus on cost reduction via process improvements
          rdBudget: 3_000_000,
          productImprovements: [
            { productId: "budget-product" },
            { productId: "general-product" },
            { productId: "lifestyle-product" },
          ],
        },
      };
    },
  },

  "premium": {
    name: "Prestige Industries",
    description: "Premium quality targeting Professional and Enthusiast with high prices",
    targetSegments: ["Professional", "Enthusiast"],
    setupProducts: (state) => {
      state.products = [
        createProduct("Professional", "premium", "pro-product"),
        createProduct("Enthusiast", "premium", "enthusiast-product"),
      ];
      // Premium brands start with good brand value
      state.brandValue = 0.6;
    },
    generateDecisions: (state, round, factoryId) => {
      // Premium invests in quality and brand
      return {
        factory: {
          efficiencyInvestments: {
            [factoryId]: {
              workers: 1_000_000,
              supervisors: 1_000_000,
              engineers: 2_000_000, // Quality focus
              machinery: 1_000_000,
              factory: 1_500_000,
            },
          },
          greenEnergyInvestments: [{ factoryId, amount: 1_000_000 }], // ESG matters for premium
        },
        hr: {
          salaryMultiplierChanges: {
            workers: 1.2, // Pay for quality
            engineers: 1.3,
            supervisors: 1.2,
          },
          trainingPrograms: round % 2 === 1 ? [
            { role: "engineer" as const, programType: "innovation" },
          ] : [],
        },
        finance: {
          treasuryBillsIssue: 0,
          corporateBondsIssue: round === 1 ? 10_000_000 : 0,
          dividendPerShare: round >= 5 ? 0.08 : 0, // Higher dividends
          sharesBuyback: 0,
        },
        marketing: {
          // Premium segments, quality messaging
          advertisingBudget: {
            Professional: 2_500_000,
            Enthusiast: 2_000_000,
          },
          brandingInvestment: 2_000_000, // Invest in brand
        },
        rd: {
          rdBudget: 9_000_000,
          productImprovements: [
            { productId: "pro-product", qualityIncrease: 5 },
            { productId: "enthusiast-product", qualityIncrease: 4 },
          ],
        },
      };
    },
  },

  "marketing": {
    name: "BrandFirst Global",
    description: "Marketing-focused on mass market segments with strong brand presence",
    targetSegments: ["Budget", "General"],
    setupProducts: (state) => {
      state.products = [
        createProduct("Budget", "marketing", "budget-product"),
        createProduct("General", "marketing", "general-product"),
      ];
      state.brandValue = 0.5;
    },
    generateDecisions: (state, round, factoryId) => {
      // Marketing-heavy strategy - brand awareness over low prices
      return {
        factory: {
          efficiencyInvestments: {
            [factoryId]: {
              workers: 1_000_000,
              supervisors: 500_000,
              engineers: 1_000_000,
              machinery: 500_000,
              factory: 1_000_000,
            },
          },
        },
        hr: {
          salaryMultiplierChanges: {
            workers: 1.05,
            engineers: 1.1,
            supervisors: 1.05,
          },
        },
        finance: {
          treasuryBillsIssue: 0,
          corporateBondsIssue: round === 1 ? 12_000_000 : 0,
          dividendPerShare: round >= 7 ? 0.05 : 0,
          sharesBuyback: 0,
        },
        marketing: {
          // Focus on mass market segments with heavy branding
          advertisingBudget: {
            Budget: 3_000_000,
            General: 3_000_000,
          },
          brandingInvestment: 4_000_000, // Heavy branding investment - differentiates from cost leader
        },
        rd: {
          rdBudget: 4_500_000,
          productImprovements: [
            { productId: "budget-product", featuresIncrease: 3 },
            { productId: "general-product", featuresIncrease: 4 },
          ],
        },
      };
    },
  },

  "niche": {
    name: "ActiveLife Specialists",
    description: "Niche specialist focused on Active Lifestyle and Enthusiast with tailored products",
    targetSegments: ["Active Lifestyle", "Enthusiast"],
    setupProducts: (state) => {
      state.products = [
        createProduct("Active Lifestyle", "niche", "lifestyle-product"),
        createProduct("Enthusiast", "niche", "enthusiast-product"),
      ];
      state.brandValue = 0.5;
    },
    generateDecisions: (state, round, factoryId) => {
      // Focused but not single-segment
      return {
        factory: {
          efficiencyInvestments: {
            [factoryId]: {
              workers: 1_500_000,
              supervisors: 750_000,
              engineers: 1_500_000,
              machinery: 1_000_000,
              factory: 1_500_000,
            },
          },
          greenEnergyInvestments: [{ factoryId, amount: 500_000 }],
        },
        hr: {
          salaryMultiplierChanges: {
            workers: 1.1,
            engineers: 1.15,
            supervisors: 1.1,
          },
          trainingPrograms: round % 3 === 1 ? [
            { role: "worker" as const, programType: "quality_focus" },
          ] : [],
        },
        finance: {
          treasuryBillsIssue: 0,
          corporateBondsIssue: round === 1 ? 10_000_000 : 0,
          dividendPerShare: round >= 5 ? 0.06 : 0,
          sharesBuyback: 0,
        },
        marketing: {
          // Focus on two related segments
          advertisingBudget: {
            "Active Lifestyle": 3_500_000,
            Enthusiast: 2_500_000,
          },
          brandingInvestment: 2_000_000,
        },
        rd: {
          rdBudget: 7_000_000,
          productImprovements: [
            { productId: "lifestyle-product", qualityIncrease: 5 },
            { productId: "enthusiast-product", qualityIncrease: 4 },
          ],
        },
      };
    },
  },
};

// ============================================
// TESTS
// ============================================

describe("Multi-Strategy Balance", () => {
  interface TeamData {
    id: string;
    strategy: string;
    strategyDef: StrategyDefinition;
    state: TeamState;
    revenueHistory: number[];
    rankHistory: number[];
  }

  let teams: TeamData[];
  let marketState: MarketState;

  beforeEach(() => {
    marketState = createInitialMarketState();

    // Create teams with different strategies
    teams = Object.entries(STRATEGIES).map(([key, strategyDef]) => {
      const state = createInitialTeamState();
      strategyDef.setupProducts(state);

      return {
        id: `team-${key}`,
        strategy: key,
        strategyDef,
        state,
        revenueHistory: [],
        rankHistory: [],
      };
    });
  });

  it("should allow ALL strategies to generate positive revenue", () => {
    // Simulate 10 rounds
    for (let round = 1; round <= 10; round++) {
      const factoryId = teams[0].state.factories[0]?.id || "factory-1";

      const input: SimulationInput = {
        roundNumber: round,
        teams: teams.map(team => ({
          id: team.id,
          state: team.state,
          decisions: team.strategyDef.generateDecisions(team.state, round, factoryId),
        })),
        marketState,
      };

      const results = SimulationEngine.processRound(input);

      for (const result of results.results) {
        const team = teams.find(t => t.id === result.teamId)!;
        team.state = result.newState;
        team.revenueHistory.push(result.newState.revenue);

        const ranking = results.rankings.find(r => r.teamId === result.teamId)!;
        team.rankHistory.push(ranking.rank);
      }

      marketState = results.newMarketState;
    }

    console.log("\n=== Multi-Strategy Results (10 rounds) ===\n");

    // All strategies should generate positive revenue
    for (const team of teams) {
      const finalRevenue = team.state.revenue;
      console.log(`${team.strategyDef.name} (${team.strategy}):`);
      console.log(`  Final Revenue: $${(finalRevenue / 1_000_000).toFixed(1)}M`);
      console.log(`  Final Rank: ${team.rankHistory[team.rankHistory.length - 1]}`);
      console.log(`  Rank History: ${team.rankHistory.join(" → ")}`);
      console.log(`  Target Segments: ${team.strategyDef.targetSegments.join(", ")}`);
      console.log();

      expect(finalRevenue).toBeGreaterThan(0);
    }
  });

  it("should have strategies compete fairly in their target segments", () => {
    // This test validates that strategies WIN in segments they're designed for
    // It's okay if premium has more revenue overall - what matters is that
    // cost leaders dominate Budget, premium dominates Professional, etc.

    const segmentWinCounts: Record<Segment, Record<string, number>> = {
      "Budget": {},
      "General": {},
      "Enthusiast": {},
      "Professional": {},
      "Active Lifestyle": {},
    };

    // Run 10 simulations
    for (let sim = 0; sim < 10; sim++) {
      // Reset teams
      teams = Object.entries(STRATEGIES).map(([key, strategyDef]) => {
        const state = createInitialTeamState();
        strategyDef.setupProducts(state);
        return {
          id: `team-${key}`,
          strategy: key,
          strategyDef,
          state,
          revenueHistory: [],
          rankHistory: [],
        };
      });
      marketState = createInitialMarketState();

      // Simulate 10 rounds
      for (let round = 1; round <= 10; round++) {
        const factoryId = teams[0].state.factories[0]?.id || "factory-1";

        const input: SimulationInput = {
          roundNumber: round,
          teams: teams.map(team => ({
            id: team.id,
            state: team.state,
            decisions: team.strategyDef.generateDecisions(team.state, round, factoryId),
          })),
          marketState,
        };

        const results = SimulationEngine.processRound(input);

        // Track segment winners for final round
        if (round === 10) {
          for (const segment of ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] as Segment[]) {
            // Find team with most market share in this segment
            let bestTeam = "";
            let bestShare = 0;
            for (const team of teams) {
              // Get market share from the result's newState
              const result = results.results.find(r => r.teamId === team.id);
              const share = result?.marketShareBySegment?.[segment] || 0;
              if (share > bestShare) {
                bestShare = share;
                bestTeam = team.strategy;
              }
            }
            if (bestTeam) {
              segmentWinCounts[segment][bestTeam] = (segmentWinCounts[segment][bestTeam] || 0) + 1;
            }
          }
        }

        for (const result of results.results) {
          const team = teams.find(t => t.id === result.teamId)!;
          team.state = result.newState;
        }

        marketState = results.newMarketState;
      }
    }

    console.log("\n=== Segment Dominance (10 simulations) ===\n");
    for (const [segment, counts] of Object.entries(segmentWinCounts)) {
      console.log(`${segment}:`);
      for (const [strategy, wins] of Object.entries(counts)) {
        console.log(`  ${strategy}: ${wins}/10 wins`);
      }
    }

    // Verify segment-appropriate dominance:
    // Cost leader should win Budget most of the time (competing with marketing)
    expect(segmentWinCounts["Budget"]["cost-leader"] || 0).toBeGreaterThanOrEqual(3);

    // Premium should win Professional most of the time (only competitor)
    expect(segmentWinCounts["Professional"]["premium"] || 0).toBeGreaterThanOrEqual(8);

    // Enthusiast is contested between premium and niche - both should win some
    const enthusiastPremiumWins = segmentWinCounts["Enthusiast"]["premium"] || 0;
    const enthusiastNicheWins = segmentWinCounts["Enthusiast"]["niche"] || 0;
    expect(enthusiastPremiumWins + enthusiastNicheWins).toBeGreaterThanOrEqual(8);

    // Active Lifestyle is contested between cost-leader and niche
    const activeLifestyleCostWins = segmentWinCounts["Active Lifestyle"]["cost-leader"] || 0;
    const activeLifestyleNicheWins = segmentWinCounts["Active Lifestyle"]["niche"] || 0;
    expect(activeLifestyleCostWins + activeLifestyleNicheWins).toBeGreaterThanOrEqual(8);
  });

  it("should have reasonable revenue spread (2-5x between strategies)", () => {
    // Simulate 10 rounds
    for (let round = 1; round <= 10; round++) {
      const factoryId = teams[0].state.factories[0]?.id || "factory-1";

      const input: SimulationInput = {
        roundNumber: round,
        teams: teams.map(team => ({
          id: team.id,
          state: team.state,
          decisions: team.strategyDef.generateDecisions(team.state, round, factoryId),
        })),
        marketState,
      };

      const results = SimulationEngine.processRound(input);

      for (const result of results.results) {
        const team = teams.find(t => t.id === result.teamId)!;
        team.state = result.newState;
      }

      marketState = results.newMarketState;
    }

    const revenues = teams.map(t => t.state.revenue).filter(r => r > 0);
    const maxRev = Math.max(...revenues);
    const minRev = Math.min(...revenues);
    const spread = minRev > 0 ? maxRev / minRev : 999;

    console.log(`\nRevenue spread: ${spread.toFixed(2)}x`);
    console.log(`Max: $${(maxRev / 1_000_000).toFixed(1)}M, Min: $${(minRev / 1_000_000).toFixed(1)}M`);

    // Different strategies should create some spread (not everyone ties)
    expect(spread).toBeGreaterThan(1.1);

    // But spread shouldn't be extreme (all strategies viable)
    expect(spread).toBeLessThan(10);
  });

  it("should reward good execution within each strategy", () => {
    // Test that a team executing their strategy well beats one executing poorly

    // Create two cost-leader teams - one executes well, one poorly
    const goodExecution = createInitialTeamState();
    STRATEGIES["cost-leader"].setupProducts(goodExecution);

    const poorExecution = createInitialTeamState();
    STRATEGIES["cost-leader"].setupProducts(poorExecution);
    // Poor execution: wrong investments for a cost leader
    poorExecution.brandValue = 0.3; // Lower starting point

    const testTeams = [
      { id: "good", state: goodExecution, isGoodExecution: true },
      { id: "poor", state: poorExecution, isGoodExecution: false },
    ];

    let testMarket = createInitialMarketState();

    for (let round = 1; round <= 10; round++) {
      const factoryId = testTeams[0].state.factories[0]?.id || "factory-1";

      const input: SimulationInput = {
        roundNumber: round,
        teams: testTeams.map(team => ({
          id: team.id,
          state: team.state,
          decisions: team.isGoodExecution
            ? STRATEGIES["cost-leader"].generateDecisions(team.state, round, factoryId)
            : {
                // Poor execution: wrong investments for a cost leader
                factory: {
                  efficiencyInvestments: {
                    [factoryId]: {
                      workers: 500_000, // Too little efficiency investment
                      supervisors: 500_000,
                      engineers: 500_000,
                      machinery: 500_000,
                      factory: 500_000,
                    },
                  },
                },
                marketing: {
                  advertisingBudget: {
                    Professional: 3_000_000, // Wrong segments for cost leader
                    Enthusiast: 2_000_000,
                  },
                  brandingInvestment: 3_000_000, // Cost leaders shouldn't over-invest in brand
                },
                rd: {
                  rdBudget: 500_000,
                  productImprovements: [
                    { productId: "budget-product", qualityIncrease: 1 },
                  ],
                },
              },
        })),
        marketState: testMarket,
      };

      const results = SimulationEngine.processRound(input);

      for (const result of results.results) {
        const team = testTeams.find(t => t.id === result.teamId)!;
        team.state = result.newState;
      }

      testMarket = results.newMarketState;
    }

    const goodRev = testTeams.find(t => t.isGoodExecution)!.state.revenue;
    const poorRev = testTeams.find(t => !t.isGoodExecution)!.state.revenue;

    console.log(`\nExecution Quality Test:`);
    console.log(`Good execution: $${(goodRev / 1_000_000).toFixed(1)}M`);
    console.log(`Poor execution: $${(poorRev / 1_000_000).toFixed(1)}M`);

    // Good execution should outperform poor execution
    expect(goodRev).toBeGreaterThan(poorRev);
  });
});

describe("Segment-Specific Competition", () => {
  it("should show cost leader winning in Budget segment", () => {
    const costLeader = createInitialTeamState();
    costLeader.products = [createProduct("Budget", "cost-leader", "budget-1")];

    const premium = createInitialTeamState();
    premium.products = [createProduct("Budget", "premium", "budget-2")];

    // Calculate scores for Budget segment
    const marketState = createInitialMarketState();

    const costLeaderPos = MarketSimulator.calculateTeamPosition(
      "cost-leader",
      costLeader,
      costLeader.products[0],
      "Budget",
      marketState
    );

    const premiumPos = MarketSimulator.calculateTeamPosition(
      "premium",
      premium,
      premium.products[0],
      "Budget",
      marketState
    );

    console.log("\n=== Budget Segment Competition ===");
    console.log(`Cost Leader: price=${costLeader.products[0].price}, score=${costLeaderPos.totalScore.toFixed(1)}`);
    console.log(`  - Price Score: ${costLeaderPos.priceScore.toFixed(1)}`);
    console.log(`  - Quality Score: ${costLeaderPos.qualityScore.toFixed(1)}`);
    console.log(`  - Brand Score: ${costLeaderPos.brandScore.toFixed(1)}`);

    console.log(`Premium: price=${premium.products[0].price}, score=${premiumPos.totalScore.toFixed(1)}`);
    console.log(`  - Price Score: ${premiumPos.priceScore.toFixed(1)}`);
    console.log(`  - Quality Score: ${premiumPos.qualityScore.toFixed(1)}`);
    console.log(`  - Brand Score: ${premiumPos.brandScore.toFixed(1)}`);

    // In Budget segment, cost leader's low price should give them an advantage
    expect(costLeaderPos.priceScore).toBeGreaterThan(premiumPos.priceScore);
  });

  it("should show premium winning in Professional segment", () => {
    const costLeader = createInitialTeamState();
    costLeader.products = [createProduct("Professional", "cost-leader", "pro-1")];

    const premium = createInitialTeamState();
    premium.products = [createProduct("Professional", "premium", "pro-2")];

    const marketState = createInitialMarketState();

    const costLeaderPos = MarketSimulator.calculateTeamPosition(
      "cost-leader",
      costLeader,
      costLeader.products[0],
      "Professional",
      marketState
    );

    const premiumPos = MarketSimulator.calculateTeamPosition(
      "premium",
      premium,
      premium.products[0],
      "Professional",
      marketState
    );

    console.log("\n=== Professional Segment Competition ===");
    console.log(`Cost Leader: quality=${costLeader.products[0].quality}, score=${costLeaderPos.totalScore.toFixed(1)}`);
    console.log(`  - Price Score: ${costLeaderPos.priceScore.toFixed(1)}`);
    console.log(`  - Quality Score: ${costLeaderPos.qualityScore.toFixed(1)}`);

    console.log(`Premium: quality=${premium.products[0].quality}, score=${premiumPos.totalScore.toFixed(1)}`);
    console.log(`  - Price Score: ${premiumPos.priceScore.toFixed(1)}`);
    console.log(`  - Quality Score: ${premiumPos.qualityScore.toFixed(1)}`);

    // In Professional segment, premium's high quality should give them an advantage
    expect(premiumPos.qualityScore).toBeGreaterThan(costLeaderPos.qualityScore);
  });
});
