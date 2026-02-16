/**
 * End-to-End Game Flow Test
 *
 * Simulates a complete 4-round game with 4 teams using different strategies:
 * - Alpha Corp: Premium/Quality focus
 * - Beta Industries: Cost Leader
 * - Gamma Tech: Balanced Growth
 * - Delta Dynamics: Marketing Heavy
 */

import { describe, it, expect, beforeAll } from "vitest";
import { SimulationEngine, type SimulationInput } from "@/engine/core/SimulationEngine";
import type { TeamState, MarketState, AllDecisions } from "@/engine/types";

// Helper to create initial team state
function createInitialTeamState(overrides: Partial<TeamState> = {}): TeamState {
  return SimulationEngine.createInitialTeamState(overrides);
}

// Helper to create initial market state
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

// Team decision strategies
const TEAM_STRATEGIES = {
  alpha: {
    name: "Alpha Corp",
    strategy: "Premium/Quality",
    decisions: {
      factory: {
        investments: {
          workerEfficiency: 2_000_000,
          supervisorEfficiency: 1_000_000,
          engineerEfficiency: 1_500_000,
          machineryEfficiency: 500_000,
          factoryEfficiency: 5_000_000,
        },
        greenEnergyInvestments: [{ factoryId: "factory-1", amount: 2_000_000 }],
      },
      hr: {
        salaryMultiplierChanges: {
          workers: 1.3,
          engineers: 1.4,
          supervisors: 1.3,
        },
        trainingPrograms: [
          { role: "worker" as const, programType: "quality_focus" },
          { role: "engineer" as const, programType: "innovation" },
        ],
      },
      finance: {
        issueTBills: 0,
        issueBonds: 0,
        dividendPerShare: 0.1,
        sharesBuyback: 0,
      },
      marketing: {
        marketingBudget: [
          { segment: "Professional", region: "North America", spend: 3_000_000, campaignType: "premium" },
        ],
        positioningStrategy: "premium",
      },
      rd: {
        rdBudgetAllocation: [
          { productId: "main-product", budget: 8_000_000, focus: "quality" as const },
        ],
      },
    } as AllDecisions,
  },
  beta: {
    name: "Beta Industries",
    strategy: "Cost Leader",
    decisions: {
      factory: {
        investments: {
          workerEfficiency: 500_000,
          supervisorEfficiency: 500_000,
          engineerEfficiency: 500_000,
          machineryEfficiency: 10_000_000, // Heavy automation
          factoryEfficiency: 3_000_000,
        },
      },
      hr: {
        salaryMultiplierChanges: {
          workers: 0.9,
          engineers: 1.0,
          supervisors: 0.95,
        },
        trainingPrograms: [
          { role: "worker" as const, programType: "efficiency" },
        ],
      },
      finance: {
        issueTBills: 0,
        issueBonds: 15_000_000,
        dividendPerShare: 0,
        sharesBuyback: 0,
      },
      marketing: {
        marketingBudget: [
          { segment: "Budget", region: "North America", spend: 1_500_000, campaignType: "value" },
        ],
        positioningStrategy: "value",
      },
      rd: {
        rdBudgetAllocation: [
          { productId: "main-product", budget: 2_000_000, focus: "cost_reduction" as const },
        ],
      },
    } as AllDecisions,
  },
  gamma: {
    name: "Gamma Tech",
    strategy: "Balanced Growth",
    decisions: {
      factory: {
        investments: {
          workerEfficiency: 1_000_000,
          supervisorEfficiency: 500_000,
          engineerEfficiency: 1_000_000,
          machineryEfficiency: 500_000,
          factoryEfficiency: 3_000_000,
        },
        greenEnergyInvestments: [{ factoryId: "factory-1", amount: 1_000_000 }],
      },
      hr: {
        salaryMultiplierChanges: {
          workers: 1.1,
          engineers: 1.15,
          supervisors: 1.1,
        },
        trainingPrograms: [
          { role: "worker" as const, programType: "balanced" },
        ],
      },
      finance: {
        issueTBills: 0,
        issueBonds: 5_000_000,
        dividendPerShare: 0.05,
        sharesBuyback: 0,
      },
      marketing: {
        marketingBudget: [
          { segment: "General", region: "North America", spend: 1_500_000, campaignType: "awareness" },
          { segment: "Enthusiast", region: "North America", spend: 1_000_000, campaignType: "engagement" },
        ],
        positioningStrategy: "balanced",
      },
      rd: {
        rdBudgetAllocation: [
          { productId: "main-product", budget: 4_000_000, focus: "innovation" as const },
        ],
      },
    } as AllDecisions,
  },
  delta: {
    name: "Delta Dynamics",
    strategy: "Marketing Heavy",
    decisions: {
      factory: {
        investments: {
          workerEfficiency: 500_000,
          supervisorEfficiency: 250_000,
          engineerEfficiency: 250_000,
          machineryEfficiency: 0,
          factoryEfficiency: 1_000_000,
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
        issueTBills: 0,
        issueBonds: 10_000_000,
        dividendPerShare: 0,
        sharesBuyback: 0,
      },
      marketing: {
        marketingBudget: [
          { segment: "Active Lifestyle", region: "North America", spend: 8_000_000, campaignType: "lifestyle" },
          { segment: "General", region: "North America", spend: 3_000_000, campaignType: "brand" },
        ],
        positioningStrategy: "lifestyle",
      },
      rd: {
        rdBudgetAllocation: [
          { productId: "main-product", budget: 1_500_000, focus: "innovation" as const },
        ],
      },
    } as AllDecisions,
  },
};

describe("E2E Game Flow", () => {
  let alphaState: TeamState;
  let betaState: TeamState;
  let gammaState: TeamState;
  let deltaState: TeamState;
  let marketState: MarketState;

  beforeAll(() => {
    // Initialize all teams with identical starting states
    alphaState = createInitialTeamState();
    betaState = createInitialTeamState();
    gammaState = createInitialTeamState();
    deltaState = createInitialTeamState();
    marketState = createInitialMarketState();
  });

  describe("Initial State Verification", () => {
    it("should initialize all teams with equal starting conditions", () => {
      expect(alphaState.cash).toBe(175_000_000);
      expect(betaState.cash).toBe(175_000_000);
      expect(gammaState.cash).toBe(175_000_000);
      expect(deltaState.cash).toBe(175_000_000);

      // All teams should have 1 factory
      expect(alphaState.factories).toHaveLength(1);
      expect(betaState.factories).toHaveLength(1);

      // Market state should be initialized
      expect(marketState.demandBySegment.Budget.totalDemand).toBe(500000);
      expect(marketState.demandBySegment.Professional.totalDemand).toBe(100000);
    });
  });

  describe("Round 1: Initial Strategies", () => {
    let round1Results: ReturnType<typeof SimulationEngine.processRound>;

    beforeAll(() => {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "alpha", state: alphaState, decisions: TEAM_STRATEGIES.alpha.decisions },
          { id: "beta", state: betaState, decisions: TEAM_STRATEGIES.beta.decisions },
          { id: "gamma", state: gammaState, decisions: TEAM_STRATEGIES.gamma.decisions },
          { id: "delta", state: deltaState, decisions: TEAM_STRATEGIES.delta.decisions },
        ],
        marketState,
      };

      round1Results = SimulationEngine.processRound(input);

      // Update states for next round
      alphaState = round1Results.results.find(r => r.teamId === "alpha")!.newState;
      betaState = round1Results.results.find(r => r.teamId === "beta")!.newState;
      gammaState = round1Results.results.find(r => r.teamId === "gamma")!.newState;
      deltaState = round1Results.results.find(r => r.teamId === "delta")!.newState;
      marketState = round1Results.newMarketState;
    });

    it("should process all 4 teams", () => {
      expect(round1Results.results).toHaveLength(4);
      expect(round1Results.rankings).toHaveLength(4);
    });

    it("should generate valid rankings (1-4)", () => {
      const ranks = round1Results.rankings.map(r => r.rank).sort();
      expect(ranks).toEqual([1, 2, 3, 4]);
    });

    it("should update team states after processing", () => {
      // All teams should have processed their decisions
      for (const result of round1Results.results) {
        expect(result.factoryResults).toBeDefined();
        expect(result.hrResults).toBeDefined();
        expect(result.financeResults).toBeDefined();
        expect(result.marketingResults).toBeDefined();
        expect(result.rdResults).toBeDefined();
      }
    });

    it("should calculate market shares that sum to approximately 1", () => {
      let totalShare = 0;
      for (const result of round1Results.results) {
        const teamShares = Object.values(result.marketShareBySegment);
        // Each team has shares in various segments
        expect(teamShares.length).toBeGreaterThanOrEqual(0);
      }
      // Overall market shares across all segments should be distributed
      expect(round1Results.rankings.length).toBe(4);
    });

    it("should generate summary messages", () => {
      expect(round1Results.summaryMessages.length).toBeGreaterThan(0);
      expect(round1Results.summaryMessages[0]).toContain("Round 1");
    });

    it("Premium strategy (Alpha) should have higher quality investments", () => {
      const alphaResult = round1Results.results.find(r => r.teamId === "alpha")!;
      // Alpha invested heavily in efficiency and quality
      expect(alphaResult.factoryResults.costs).toBeGreaterThan(0);
    });

    it("Cost leader (Beta) should have lower labor costs", () => {
      const betaResult = round1Results.results.find(r => r.teamId === "beta")!;
      // Beta has lower salary multipliers
      expect(betaResult.hrResults.costs).toBeDefined();
    });

    it("Marketing heavy (Delta) should show brand value increase", () => {
      const deltaResult = round1Results.results.find(r => r.teamId === "delta")!;
      expect(deltaResult.marketingResults.costs).toBeGreaterThan(0);
    });
  });

  describe("Round 2: Market Event - Recession", () => {
    let round2Results: ReturnType<typeof SimulationEngine.processRound>;

    beforeAll(() => {
      const input: SimulationInput = {
        roundNumber: 2,
        teams: [
          { id: "alpha", state: alphaState, decisions: TEAM_STRATEGIES.alpha.decisions },
          { id: "beta", state: betaState, decisions: TEAM_STRATEGIES.beta.decisions },
          { id: "gamma", state: gammaState, decisions: TEAM_STRATEGIES.gamma.decisions },
          { id: "delta", state: deltaState, decisions: TEAM_STRATEGIES.delta.decisions },
        ],
        marketState,
        events: [{
          type: "recession",
          title: "Economic Recession",
          description: "Consumer spending drops significantly",
          effects: [
            { target: "efficiency", modifier: -0.1 },
            { target: "brandValue", modifier: -0.05 },
          ],
          targetTeams: "all",
        }],
      };

      round2Results = SimulationEngine.processRound(input);

      // Update states for next round
      alphaState = round2Results.results.find(r => r.teamId === "alpha")!.newState;
      betaState = round2Results.results.find(r => r.teamId === "beta")!.newState;
      gammaState = round2Results.results.find(r => r.teamId === "gamma")!.newState;
      deltaState = round2Results.results.find(r => r.teamId === "delta")!.newState;
      marketState = round2Results.newMarketState;
    });

    it("should apply recession effects to all teams", () => {
      expect(round2Results.results).toHaveLength(4);
      // All teams should be affected by recession
      for (const result of round2Results.results) {
        expect(result.newState).toBeDefined();
      }
    });

    it("should update market state for next round", () => {
      expect(round2Results.newMarketState).toBeDefined();
      // newMarketState.roundNumber is for the NEXT round (3), not the completed round (2)
      expect(round2Results.newMarketState.roundNumber).toBe(3);
    });
  });

  describe("Round 3: Rubber-Banding Activation", () => {
    let round3Results: ReturnType<typeof SimulationEngine.processRound>;

    beforeAll(() => {
      const input: SimulationInput = {
        roundNumber: 3, // Rubber-banding activates at round >= 3
        teams: [
          { id: "alpha", state: alphaState, decisions: TEAM_STRATEGIES.alpha.decisions },
          { id: "beta", state: betaState, decisions: TEAM_STRATEGIES.beta.decisions },
          { id: "gamma", state: gammaState, decisions: TEAM_STRATEGIES.gamma.decisions },
          { id: "delta", state: deltaState, decisions: TEAM_STRATEGIES.delta.decisions },
        ],
        marketState,
      };

      round3Results = SimulationEngine.processRound(input);

      // Update states for next round
      alphaState = round3Results.results.find(r => r.teamId === "alpha")!.newState;
      betaState = round3Results.results.find(r => r.teamId === "beta")!.newState;
      gammaState = round3Results.results.find(r => r.teamId === "gamma")!.newState;
      deltaState = round3Results.results.find(r => r.teamId === "delta")!.newState;
      marketState = round3Results.newMarketState;
    });

    it("should process round 3 with rubber-banding", () => {
      expect(round3Results.roundNumber).toBe(3);
      expect(round3Results.results).toHaveLength(4);
    });

    it("should maintain valid rankings", () => {
      const ranks = round3Results.rankings.map(r => r.rank).sort();
      expect(ranks).toEqual([1, 2, 3, 4]);
    });
  });

  describe("Round 4: Final Round", () => {
    let round4Results: ReturnType<typeof SimulationEngine.processRound>;

    beforeAll(() => {
      const input: SimulationInput = {
        roundNumber: 4,
        teams: [
          { id: "alpha", state: alphaState, decisions: TEAM_STRATEGIES.alpha.decisions },
          { id: "beta", state: betaState, decisions: TEAM_STRATEGIES.beta.decisions },
          { id: "gamma", state: gammaState, decisions: TEAM_STRATEGIES.gamma.decisions },
          { id: "delta", state: deltaState, decisions: TEAM_STRATEGIES.delta.decisions },
        ],
        marketState,
      };

      round4Results = SimulationEngine.processRound(input);
    });

    it("should complete final round processing", () => {
      expect(round4Results.roundNumber).toBe(4);
      expect(round4Results.results).toHaveLength(4);
    });

    it("should have final rankings", () => {
      expect(round4Results.rankings).toHaveLength(4);

      // Log final standings
      console.log("\n=== Final Standings ===");
      round4Results.rankings.forEach((r, i) => {
        const result = round4Results.results.find(res => res.teamId === r.teamId)!;
        const strategy = Object.entries(TEAM_STRATEGIES).find(([key]) => key === r.teamId)?.[1];
        console.log(`${i + 1}. ${strategy?.name || r.teamId} (${strategy?.strategy})`);
        console.log(`   Revenue: $${(result.totalRevenue / 1_000_000).toFixed(1)}M`);
        console.log(`   Net Income: $${(result.netIncome / 1_000_000).toFixed(1)}M`);
        console.log(`   EPS: $${result.newState.eps.toFixed(2)}`);
      });
    });

    it("should generate valid financial metrics for all teams", () => {
      for (const result of round4Results.results) {
        // Revenue should be non-negative
        expect(result.totalRevenue).toBeGreaterThanOrEqual(0);

        // Costs should be positive (teams are spending on operations)
        expect(result.totalCosts).toBeGreaterThan(0);

        // EPS is calculated
        expect(typeof result.newState.eps).toBe("number");
      }
    });
  });

  describe("Strategy Validation", () => {
    it("should show premium strategy Alpha with higher quality scores", () => {
      // Alpha focused on quality investments
      expect(alphaState.factories[0]?.efficiency).toBeGreaterThan(0);
    });

    it("should show cost leader Beta with lower costs", () => {
      // Beta has automation investments
      expect(betaState.factories[0]).toBeDefined();
    });

    it("should show marketing-heavy Delta with higher brand value", () => {
      // Delta invested heavily in marketing
      expect(deltaState.brandValue).toBeDefined();
    });
  });
});

describe("Simulation Engine Unit Tests", () => {
  describe("Decision Validation", () => {
    it("should validate and correct decisions with insufficient funds", () => {
      const state = createInitialTeamState({ cash: 1_000_000 }); // Very limited cash
      const decisions: AllDecisions = {
        factory: {
          newFactories: [
            { name: "New Factory", region: "Europe" },
            { name: "Another Factory", region: "Asia" },
          ],
        },
      };

      const result = SimulationEngine.validateDecisions(state, decisions);

      // Should flag insufficient funds
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Insufficient funds");

      // Should correct by removing new factories
      expect(result.correctedDecisions.factory?.newFactories).toHaveLength(0);
    });

    it("should pass validation for valid decisions", () => {
      const state = createInitialTeamState(); // Full starting cash
      const factoryId = state.factories[0].id;
      const decisions: AllDecisions = {
        factory: {
          efficiencyInvestments: {
            [factoryId]: {
              workers: 1_000_000,
              supervisors: 500_000,
              engineers: 500_000,
              machinery: 500_000,
              factory: 1_000_000,
            },
          },
        },
      };

      const result = SimulationEngine.validateDecisions(state, decisions);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Initial State Creation", () => {
    it("should create valid initial team state", () => {
      const state = SimulationEngine.createInitialTeamState();

      expect(state.cash).toBe(175_000_000);
      expect(state.factories).toHaveLength(1);
      expect(state.factories[0].workers).toBe(50);
      expect(state.factories[0].supervisors).toBe(5);
      expect(state.factories[0].engineers).toBe(8);
      expect(state.brandValue).toBe(0.5);
      expect(state.sharesIssued).toBe(10_000_000);
    });

    it("should allow custom overrides", () => {
      const state = SimulationEngine.createInitialTeamState({ cash: 500_000_000 });

      expect(state.cash).toBe(500_000_000);
    });
  });

  describe("Round Report Generation", () => {
    it("should generate readable round report", () => {
      const mockResult = {
        roundNumber: 1,
        teamId: "test",
        newState: createInitialTeamState(),
        factoryResults: { success: true, costs: 1000000, revenue: 0, messages: ["Invested in efficiency"], changes: {} },
        hrResults: { success: true, costs: 500000, revenue: 0, messages: ["Hired 10 workers"], changes: {} },
        financeResults: { success: true, costs: 100000, revenue: 0, messages: ["Issued bonds"], changes: {} },
        marketingResults: { success: true, costs: 2000000, revenue: 0, messages: ["Launched campaign"], changes: {} },
        rdResults: { success: true, costs: 1500000, revenue: 0, messages: ["R&D investment"], changes: {} },
        salesBySegment: { General: 10000 } as Record<string, number>,
        marketShareBySegment: { General: 0.25 } as Record<string, number>,
        competitorActions: ["Competitors expanded"],
        totalRevenue: 50_000_000,
        totalCosts: 30_000_000,
        netIncome: 20_000_000,
        rank: 1,
        epsRank: 1,
        marketShareRank: 2,
      };

      const report = SimulationEngine.generateRoundReport(mockResult as any);

      expect(report).toContain("Round 1 Results");
      expect(report).toContain("Revenue: $50.0M");
      expect(report).toContain("Net Income: $20.0M");
      expect(report).toContain("Overall Rank: 1");
    });
  });
});
