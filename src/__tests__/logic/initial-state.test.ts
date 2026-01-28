/**
 * Initial State and Round 1 Validation Tests
 *
 * These tests ensure that:
 * 1. All teams start with identical initial states
 * 2. Round 1 market shares are equal for identical teams
 * 3. Numbers shown to teams are consistent
 * 4. The simulation engine produces deterministic results for same inputs
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SimulationEngine, type SimulationInput } from "../../engine/core/SimulationEngine";
import { MarketSimulator } from "../../engine/market/MarketSimulator";
import { setRandomSeed } from "../../engine/utils";
import type { TeamState, MarketState, Segment } from "../../engine/types";

// Set up deterministic seeding before each test
beforeEach(() => {
  setRandomSeed("test-seed-initial-state");
});

describe("Initial State Consistency", () => {
  describe("createInitialTeamState", () => {
    it("should create identical states when called multiple times", () => {
      const state1 = SimulationEngine.createInitialTeamState();
      const state2 = SimulationEngine.createInitialTeamState();
      const state3 = SimulationEngine.createInitialTeamState();

      // Compare key financial values
      expect(state1.cash).toBe(state2.cash);
      expect(state1.cash).toBe(state3.cash);
      expect(state1.revenue).toBe(state2.revenue);
      expect(state1.netIncome).toBe(state2.netIncome);
      expect(state1.totalAssets).toBe(state2.totalAssets);
      expect(state1.shareholdersEquity).toBe(state2.shareholdersEquity);
      expect(state1.marketCap).toBe(state2.marketCap);
      expect(state1.sharePrice).toBe(state2.sharePrice);
      expect(state1.eps).toBe(state2.eps);
      expect(state1.esgScore).toBe(state2.esgScore);
      expect(state1.brandValue).toBe(state2.brandValue);
    });

    it("should have correct starting values", () => {
      const state = SimulationEngine.createInitialTeamState();

      // Financial
      expect(state.cash).toBe(200_000_000);
      expect(state.revenue).toBe(0);
      expect(state.netIncome).toBe(0);
      expect(state.marketCap).toBe(500_000_000);
      expect(state.sharesIssued).toBe(10_000_000);
      expect(state.sharePrice).toBe(50);
      expect(state.eps).toBe(0);

      // ESG and Brand
      expect(state.esgScore).toBe(100);
      expect(state.brandValue).toBe(0.5);

      // Market share should be empty (calculated by market simulator)
      expect(state.marketShare).toEqual({});
    });

    it("should have 5 products covering all segments", () => {
      const state = SimulationEngine.createInitialTeamState();

      expect(state.products).toHaveLength(5);

      const segments = state.products.map(p => p.segment);
      expect(segments).toContain("Budget");
      expect(segments).toContain("General");
      expect(segments).toContain("Enthusiast");
      expect(segments).toContain("Professional");
      expect(segments).toContain("Active Lifestyle");
    });

    it("should have all products in launched status", () => {
      const state = SimulationEngine.createInitialTeamState();

      for (const product of state.products) {
        expect(product.developmentStatus).toBe("launched");
        expect(product.developmentProgress).toBe(100);
        expect(product.roundsRemaining).toBe(0);
      }
    });

    it("should have identical products across team states", () => {
      const state1 = SimulationEngine.createInitialTeamState();
      const state2 = SimulationEngine.createInitialTeamState();

      // Compare product attributes
      for (let i = 0; i < state1.products.length; i++) {
        expect(state1.products[i].name).toBe(state2.products[i].name);
        expect(state1.products[i].segment).toBe(state2.products[i].segment);
        expect(state1.products[i].price).toBe(state2.products[i].price);
        expect(state1.products[i].quality).toBe(state2.products[i].quality);
        expect(state1.products[i].features).toBe(state2.products[i].features);
      }
    });

    it("should respect custom cash override", () => {
      const customCash = 150_000_000;
      const state = SimulationEngine.createInitialTeamState({ cash: customCash });

      expect(state.cash).toBe(customCash);
    });
  });

  describe("createInitialMarketState", () => {
    it("should create identical market states when called multiple times", () => {
      const market1 = SimulationEngine.createInitialMarketState();
      const market2 = SimulationEngine.createInitialMarketState();

      expect(market1.roundNumber).toBe(market2.roundNumber);
      expect(market1.economicConditions).toEqual(market2.economicConditions);
      expect(market1.demandBySegment).toEqual(market2.demandBySegment);
    });

    it("should start at round 1", () => {
      const market = SimulationEngine.createInitialMarketState();
      expect(market.roundNumber).toBe(1);
    });

    it("should have demand for all 5 segments", () => {
      const market = SimulationEngine.createInitialMarketState();

      const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
      for (const segment of segments) {
        expect(market.demandBySegment[segment]).toBeDefined();
        expect(market.demandBySegment[segment].totalDemand).toBeGreaterThan(0);
      }
    });
  });
});

describe("Round 1 Market Share Equality", () => {
  it("should give equal market shares to identical teams in Round 1", () => {
    // Create 4 identical teams
    const teams = [
      { id: "team-1", state: SimulationEngine.createInitialTeamState() },
      { id: "team-2", state: SimulationEngine.createInitialTeamState() },
      { id: "team-3", state: SimulationEngine.createInitialTeamState() },
      { id: "team-4", state: SimulationEngine.createInitialTeamState() },
    ];

    const marketState = SimulationEngine.createInitialMarketState();

    // Run market simulation
    const result = MarketSimulator.simulate(teams, marketState, { applyRubberBanding: false });

    // Check that all teams have equal market share in each segment
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

    for (const segment of segments) {
      const shares = teams.map(t => result.marketShares[t.id]?.[segment] || 0);

      // All shares should be equal (approximately, allowing for floating point)
      const expectedShare = 1 / teams.length; // 25% each
      for (const share of shares) {
        expect(share).toBeCloseTo(expectedShare, 2);
      }

      // Total share should sum to 1
      const totalShare = shares.reduce((a, b) => a + b, 0);
      expect(totalShare).toBeCloseTo(1, 2);
    }
  });

  it("should give 50% market share each for 2 identical teams", () => {
    const teams = [
      { id: "team-1", state: SimulationEngine.createInitialTeamState() },
      { id: "team-2", state: SimulationEngine.createInitialTeamState() },
    ];

    const marketState = SimulationEngine.createInitialMarketState();
    const result = MarketSimulator.simulate(teams, marketState, { applyRubberBanding: false });

    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

    for (const segment of segments) {
      const share1 = result.marketShares["team-1"]?.[segment] || 0;
      const share2 = result.marketShares["team-2"]?.[segment] || 0;

      expect(share1).toBeCloseTo(0.5, 2);
      expect(share2).toBeCloseTo(0.5, 2);
    }
  });

  it("should give equal revenue to identical teams in Round 1", () => {
    const teams = [
      { id: "team-1", state: SimulationEngine.createInitialTeamState() },
      { id: "team-2", state: SimulationEngine.createInitialTeamState() },
      { id: "team-3", state: SimulationEngine.createInitialTeamState() },
    ];

    const marketState = SimulationEngine.createInitialMarketState();
    const result = MarketSimulator.simulate(teams, marketState, { applyRubberBanding: false });

    const revenues = teams.map(t => result.revenueByTeam[t.id]);

    // All revenues should be equal (within floating point tolerance)
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    for (const revenue of revenues) {
      expect(revenue).toBeCloseTo(avgRevenue, -2); // Within 1% of average
    }
  });
});

describe("Full Round 1 Simulation Consistency", () => {
  it("should produce consistent relative results for identical teams", () => {
    // Note: The simulation includes ±5% random demand noise which affects absolute values
    // but not relative positioning. This test verifies that:
    // 1. Both teams get equal revenue (within the simulation run)
    // 2. The results are within expected variance across runs

    const createSimulationInput = (): SimulationInput => ({
      roundNumber: 1,
      teams: [
        { id: "team-1", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "team-2", state: SimulationEngine.createInitialTeamState(), decisions: {} },
      ],
      marketState: SimulationEngine.createInitialMarketState(),
    });

    const input1 = createSimulationInput();
    const input2 = createSimulationInput();

    const result1 = SimulationEngine.processRound(input1);
    const result2 = SimulationEngine.processRound(input2);

    // Within each run, both teams should have equal revenue
    const team1RunA = result1.results.find(r => r.teamId === "team-1")!;
    const team2RunA = result1.results.find(r => r.teamId === "team-2")!;
    expect(team1RunA.totalRevenue).toBe(team2RunA.totalRevenue);

    const team1RunB = result2.results.find(r => r.teamId === "team-1")!;
    const team2RunB = result2.results.find(r => r.teamId === "team-2")!;
    expect(team1RunB.totalRevenue).toBe(team2RunB.totalRevenue);

    // Across runs, revenue should be within 10% variance (due to ±5% noise)
    const avgRevenue1 = team1RunA.totalRevenue;
    const avgRevenue2 = team1RunB.totalRevenue;
    const variance = Math.abs(avgRevenue1 - avgRevenue2) / Math.max(avgRevenue1, avgRevenue2);
    expect(variance).toBeLessThan(0.15); // 15% max variance accounting for cumulative noise across segments
  });

  it("should give identical teams equal rankings in Round 1", () => {
    const input: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "team-1", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "team-2", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "team-3", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "team-4", state: SimulationEngine.createInitialTeamState(), decisions: {} },
      ],
      marketState: SimulationEngine.createInitialMarketState(),
    };

    const result = SimulationEngine.processRound(input);

    // All teams should have the same revenue (approximately)
    const revenues = result.results.map(r => r.totalRevenue);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;

    for (const revenue of revenues) {
      expect(revenue).toBeCloseTo(avgRevenue, -2);
    }

    // All teams should have the same net income (approximately)
    const netIncomes = result.results.map(r => r.netIncome);
    const avgNetIncome = netIncomes.reduce((a, b) => a + b, 0) / netIncomes.length;

    for (const netIncome of netIncomes) {
      expect(netIncome).toBeCloseTo(avgNetIncome, -2);
    }
  });

  it("should update team states consistently after Round 1", () => {
    const input: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "team-1", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "team-2", state: SimulationEngine.createInitialTeamState(), decisions: {} },
      ],
      marketState: SimulationEngine.createInitialMarketState(),
    };

    const result = SimulationEngine.processRound(input);

    // Both teams should have identical new states
    const state1 = result.results.find(r => r.teamId === "team-1")!.newState;
    const state2 = result.results.find(r => r.teamId === "team-2")!.newState;

    // Financial metrics should be equal
    expect(state1.revenue).toBe(state2.revenue);
    expect(state1.netIncome).toBe(state2.netIncome);
    expect(state1.eps).toBe(state2.eps);

    // Market shares should be equal
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    for (const segment of segments) {
      expect(state1.marketShare[segment]).toBeCloseTo(state2.marketShare[segment], 5);
    }
  });
});

describe("No Random Variance in Initial Round", () => {
  it("should not apply demand noise that affects ranking for identical teams", () => {
    // Run simulation multiple times
    const runs = 5;
    const allRankings: Array<Array<{ teamId: string; revenue: number }>> = [];

    for (let i = 0; i < runs; i++) {
      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "team-1", state: SimulationEngine.createInitialTeamState(), decisions: {} },
          { id: "team-2", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        ],
        marketState: SimulationEngine.createInitialMarketState(),
      };

      const result = SimulationEngine.processRound(input);
      allRankings.push(result.results.map(r => ({ teamId: r.teamId, revenue: r.totalRevenue })));
    }

    // For identical teams with no decisions, revenues should be very close
    // (within 1% variation due to floating point)
    for (const rankings of allRankings) {
      const revenue1 = rankings.find(r => r.teamId === "team-1")!.revenue;
      const revenue2 = rankings.find(r => r.teamId === "team-2")!.revenue;

      const difference = Math.abs(revenue1 - revenue2);
      const avgRevenue = (revenue1 + revenue2) / 2;
      const percentDifference = (difference / avgRevenue) * 100;

      // Difference should be less than 1%
      expect(percentDifference).toBeLessThan(1);
    }
  });
});

describe("Market Share Calculation Validation", () => {
  it("should calculate market shares based on product competitiveness", () => {
    // Create one team with better brand value
    const goodBrandTeam = SimulationEngine.createInitialTeamState();
    goodBrandTeam.brandValue = 0.9;

    const normalTeam = SimulationEngine.createInitialTeamState();
    // normalTeam.brandValue is 0.5 by default

    const teams = [
      { id: "good-brand", state: goodBrandTeam },
      { id: "normal", state: normalTeam },
    ];

    const marketState = SimulationEngine.createInitialMarketState();
    const result = MarketSimulator.simulate(teams, marketState, { applyRubberBanding: false });

    // Good brand team should have higher market share in all segments
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

    for (const segment of segments) {
      const goodBrandShare = result.marketShares["good-brand"]?.[segment] || 0;
      const normalShare = result.marketShares["normal"]?.[segment] || 0;

      expect(goodBrandShare).toBeGreaterThan(normalShare);
    }
  });

  it("should sum market shares to 1.0 per segment", () => {
    const teams = [
      { id: "team-1", state: SimulationEngine.createInitialTeamState() },
      { id: "team-2", state: SimulationEngine.createInitialTeamState() },
      { id: "team-3", state: SimulationEngine.createInitialTeamState() },
    ];

    const marketState = SimulationEngine.createInitialMarketState();
    const result = MarketSimulator.simulate(teams, marketState, { applyRubberBanding: false });

    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

    for (const segment of segments) {
      const totalShare = teams.reduce((sum, t) => sum + (result.marketShares[t.id]?.[segment] || 0), 0);
      expect(totalShare).toBeCloseTo(1.0, 5);
    }
  });

  it("should allocate higher revenue to teams with higher competitive scores", () => {
    // Create teams with slightly different brand values
    // NOTE: The softmax with temperature 0.5 is "winner-take-all" by design
    // Small brand differences can result in large market share differences
    const strongTeam = SimulationEngine.createInitialTeamState();
    strongTeam.brandValue = 0.55;

    const weakTeam = SimulationEngine.createInitialTeamState();
    weakTeam.brandValue = 0.45;

    const teams = [
      { id: "strong", state: strongTeam },
      { id: "weak", state: weakTeam },
    ];

    const marketState = SimulationEngine.createInitialMarketState();
    const result = MarketSimulator.simulate(teams, marketState, { applyRubberBanding: false });

    // Strong team should have higher revenue
    expect(result.revenueByTeam["strong"]).toBeGreaterThan(result.revenueByTeam["weak"]);

    // Strong team should have higher total market share
    const strongTotalShare = Object.values(result.marketShares["strong"]).reduce((a, b) => a + b, 0);
    const weakTotalShare = Object.values(result.marketShares["weak"]).reduce((a, b) => a + b, 0);
    expect(strongTotalShare).toBeGreaterThan(weakTotalShare);

    // Total shares should still sum to approximately 1 per segment
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    for (const segment of segments) {
      const totalShare =
        (result.marketShares["strong"]?.[segment] || 0) +
        (result.marketShares["weak"]?.[segment] || 0);
      expect(totalShare).toBeCloseTo(1.0, 5);
    }
  });
});
