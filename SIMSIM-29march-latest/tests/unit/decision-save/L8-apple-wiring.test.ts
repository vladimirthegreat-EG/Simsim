/**
 * L8 Wiring Tests -- Verify that key calculation functions are actually
 * connected to the simulation pipeline and affect output state.
 *
 * CQ-08: calculateStaffingPenalty IS applied (understaffed => lower efficiency)
 * CQ-09: investorSentiment feeds into marketCap (high ESG/income => higher cap)
 * CQ-12: EPS lives in state, not FinanceModule result (v5.1.0 migration)
 */
import { describe, it, expect } from "vitest";

import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { SimulationInput } from "@/engine/core/SimulationEngine";
import { FactoryModule } from "@/engine/modules/FactoryModule";
import { FinanceModule } from "@/engine/modules/FinanceModule";
import { CONSTANTS } from "@/engine/types";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  createGamePreset,
} from "@/engine/testkit/scenarioGenerator";

// ============================================
// CQ-08 -- calculateStaffingPenalty IS applied
// ============================================

describe("CQ-08: calculateStaffingPenalty is applied and measurably affects output", () => {
  it("understaffed factory produces lower workforce efficiency than fully staffed", () => {
    // --- Setup: add machines to factory so staffing penalty applies ---
    // Without machines, calculateRecommendedStaffing returns 0 workers → penalty is always 0
    const addMachines = (state: any) => {
      const factory = state.factories[0];
      // Add machineryStates with 5 operational machines — this triggers worker requirements
      if (!state.machineryStates) state.machineryStates = {};
      state.machineryStates[factory.id] = {
        totalCapacity: 50000,
        machines: Array.from({ length: 5 }, (_, i) => ({
          id: `machine-${i}`,
          type: "assembly_line",
          status: "operational",
          capacity: 10000,
        })),
      };
    };

    // --- Understaffed team: factory needs ~100 workers but only has 20 ---
    const { teamState: understaffedState } = createGamePreset("quick");
    addMachines(understaffedState);
    understaffedState.factories[0].workers = 20;
    understaffedState.factories[0].supervisors = 1;
    understaffedState.factories[0].engineers = 2;

    // --- Fully staffed team: same factory but with full staff ---
    const { teamState: fullyStaffedState } = createGamePreset("quick");
    addMachines(fullyStaffedState);
    const recommended = FactoryModule.calculateRecommendedStaffing(
      fullyStaffedState.factories[0]
    );
    // Use recommended or generous staffing
    fullyStaffedState.factories[0].workers = Math.max(recommended.workers, 100);
    fullyStaffedState.factories[0].supervisors = Math.max(recommended.supervisors, 10);
    fullyStaffedState.factories[0].engineers = Math.max(recommended.engineers, 8);

    // Ensure both teams have identical initial workforce efficiency
    understaffedState.workforce.averageEfficiency = 70;
    fullyStaffedState.workforce.averageEfficiency = 70;

    const marketState = createMinimalMarketState();

    const input: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "understaffed", state: understaffedState, decisions: {} },
        { id: "fullstaff", state: fullyStaffedState, decisions: {} },
      ],
      marketState,
      matchSeed: "cq08-staffing-penalty",
    };

    const output = SimulationEngine.processRound(input);
    const underResult = output.results.find(r => r.teamId === "understaffed")!;
    const fullResult = output.results.find(r => r.teamId === "fullstaff")!;

    expect(underResult).toBeDefined();
    expect(fullResult).toBeDefined();

    // The understaffed team should have lower workforce efficiency
    // because calculateStaffingPenalty reduces averageEfficiency
    expect(underResult.newState.workforce.averageEfficiency)
      .toBeLessThan(fullResult.newState.workforce.averageEfficiency);
  });

  it("calculateStaffingPenalty returns a non-zero penalty for understaffed factory", () => {
    // Direct unit test: verify the function itself produces a measurable penalty
    const { teamState } = createGamePreset("quick");
    const factory = teamState.factories[0];

    const recommended = FactoryModule.calculateRecommendedStaffing(factory);

    // Half the recommended workers, no supervisors
    const actualStaff = {
      workers: Math.floor(recommended.workers / 2),
      engineers: recommended.engineers,
      supervisors: 0,
    };

    const penalty = FactoryModule.calculateStaffingPenalty(factory, actualStaff);

    // Penalty must be a positive number (not just theoretical)
    expect(penalty).toBeGreaterThan(0);
    expect(penalty).toBeLessThanOrEqual(0.25); // Capped at 25%
  });

  it("fully staffed factory has zero staffing penalty", () => {
    const { teamState } = createGamePreset("quick");
    const factory = teamState.factories[0];

    const recommended = FactoryModule.calculateRecommendedStaffing(factory);

    const penalty = FactoryModule.calculateStaffingPenalty(factory, {
      workers: recommended.workers,
      engineers: recommended.engineers,
      supervisors: recommended.supervisors,
    });

    expect(penalty).toBe(0);
  });
});

// ============================================
// CQ-09 -- investorSentiment feeds into marketCap
// ============================================

describe("CQ-09: investorSentiment feeds into marketCap via processRound", () => {
  it("high ESG + high net income produces higher marketCap than low ESG + negative income", () => {
    // --- Team A: high ESG (800) + high net income ($50M) ---
    const { teamState: stateA } = createGamePreset("quick");
    stateA.esgScore = 800;
    stateA.netIncome = 50_000_000;
    stateA.revenue = 200_000_000;
    stateA.cash = 200_000_000;
    stateA.totalAssets = 400_000_000;
    stateA.shareholdersEquity = 350_000_000;
    stateA.totalLiabilities = 50_000_000;
    stateA.shortTermDebt = 0;
    stateA.longTermDebt = 0;

    // --- Team B: low ESG (100) + negative net income (-$10M) ---
    const { teamState: stateB } = createGamePreset("quick");
    stateB.esgScore = 100;
    stateB.netIncome = -10_000_000;
    stateB.revenue = 50_000_000;
    stateB.cash = 100_000_000;
    stateB.totalAssets = 250_000_000;
    stateB.shareholdersEquity = 200_000_000;
    stateB.totalLiabilities = 50_000_000;
    stateB.shortTermDebt = 0;
    stateB.longTermDebt = 0;

    // Equalize non-sentiment factors
    stateA.sharesIssued = CONSTANTS.DEFAULT_SHARES_ISSUED;
    stateB.sharesIssued = CONSTANTS.DEFAULT_SHARES_ISSUED;
    stateA.brandValue = 0.5;
    stateB.brandValue = 0.5;

    const marketState = createMinimalMarketState();

    const input: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "team-A", state: stateA, decisions: {} },
        { id: "team-B", state: stateB, decisions: {} },
      ],
      marketState,
      matchSeed: "cq09-investor-sentiment",
    };

    const output = SimulationEngine.processRound(input);
    const resultA = output.results.find(r => r.teamId === "team-A")!;
    const resultB = output.results.find(r => r.teamId === "team-B")!;

    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();

    // Team A should have higher market cap due to better sentiment
    expect(resultA.newState.marketCap).toBeGreaterThan(resultB.newState.marketCap);
  });

  it("calculateInvestorSentiment returns higher value for high ESG", () => {
    // Direct unit test: verify the function itself differentiates ESG levels
    const { teamState: highESG } = createGamePreset("quick");
    highESG.esgScore = 800; // Above INVESTOR_SENTIMENT_ESG_HIGH (600)

    const { teamState: lowESG } = createGamePreset("quick");
    lowESG.esgScore = 100; // Below INVESTOR_SENTIMENT_ESG_LOW (300)

    const sentimentHigh = FinanceModule.calculateInvestorSentiment(highESG);
    const sentimentLow = FinanceModule.calculateInvestorSentiment(lowESG);

    // High ESG should produce higher sentiment
    expect(sentimentHigh).toBeGreaterThan(sentimentLow);

    // Verify the actual bonus/penalty values from CONSTANTS
    expect(sentimentHigh).toBe(50 + CONSTANTS.INVESTOR_SENTIMENT_ESG_BONUS); // 58
    expect(sentimentLow).toBe(50 - CONSTANTS.INVESTOR_SENTIMENT_ESG_PENALTY); // 40
  });

  it("investorSentiment flows through updateMarketCap to affect valuation", () => {
    // Verify the wiring: sentiment changes market cap via updateMarketCap
    const { teamState } = createGamePreset("quick");
    teamState.eps = 2.0;
    teamState.netIncome = 50_000_000;
    teamState.revenue = 200_000_000;
    teamState.sharesIssued = CONSTANTS.DEFAULT_SHARES_ISSUED;
    teamState.totalAssets = 400_000_000;
    teamState.totalLiabilities = 50_000_000;
    teamState.shareholdersEquity = 350_000_000;

    // High sentiment (optimistic market)
    const mcHigh = FinanceModule.updateMarketCap(teamState, 0, 80);
    // Low sentiment (pessimistic market)
    const mcLow = FinanceModule.updateMarketCap(teamState, 0, 20);

    expect(mcHigh).toBeGreaterThan(mcLow);
  });
});

// ============================================
// CQ-12 -- EPS lives in state, not FinanceModule result
// ============================================

describe("CQ-12: EPS lives in state (SimulationEngine), not FinanceModule result", () => {
  it("FinanceModule.process() result does NOT contain EPS (moved in v5.1.0)", () => {
    const { teamState } = createGamePreset("quick");
    const marketState = createMinimalMarketState();

    const financeDecisions = {};
    const { result } = FinanceModule.process(
      teamState,
      financeDecisions,
      marketState
    );

    // The result.changes object should NOT contain an 'eps' field
    // EPS was moved to SimulationEngine after market simulation
    expect(result.success).toBe(true);
    expect((result.changes as Record<string, unknown>)).not.toHaveProperty("eps");

    // Also verify the newState from FinanceModule does NOT recalculate EPS
    // (the module may pass through the existing eps value, but it should not
    // be actively recalculating it -- that is SimulationEngine's job)
  });

  it("full processRound produces a defined and finite EPS on output state", () => {
    const { teamState: stateA } = createGamePreset("quick");
    stateA.revenue = 100_000_000;
    stateA.netIncome = 20_000_000;
    stateA.sharesIssued = CONSTANTS.DEFAULT_SHARES_ISSUED;

    const marketState = createMinimalMarketState();

    const input: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "team-eps", state: stateA, decisions: {} },
      ],
      marketState,
      matchSeed: "cq12-eps-in-state",
    };

    const output = SimulationEngine.processRound(input);
    const result = output.results.find(r => r.teamId === "team-eps")!;

    expect(result).toBeDefined();

    // EPS must be defined and finite on the output state
    expect(result.newState.eps).toBeDefined();
    expect(Number.isFinite(result.newState.eps)).toBe(true);
  });

  it("EPS is calculated as netIncome / sharesIssued in engine output", () => {
    const { teamState } = createGamePreset("quick");
    teamState.sharesIssued = 10_000_000;

    const marketState = createMinimalMarketState();

    const input: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "team-eps-calc", state: teamState, decisions: {} },
      ],
      marketState,
      matchSeed: "cq12-eps-formula",
    };

    const output = SimulationEngine.processRound(input);
    const result = output.results.find(r => r.teamId === "team-eps-calc")!;

    // EPS should equal netIncome / sharesIssued
    const expectedEPS = result.newState.netIncome / result.newState.sharesIssued;
    expect(result.newState.eps).toBeCloseTo(expectedEPS, 4);
  });

  it("calculateEPSRanking is wired and produces percentile values", () => {
    // Verify the wiring of calculateEPSRanking
    const playerEPS = 3.0;
    const peerEPSs = [1.0, 2.0, 4.0];

    const percentile = FinanceModule.calculateEPSRanking(playerEPS, peerEPSs);

    // Average peer EPS = (1+2+4)/3 = 2.333
    // Percentile = (3.0 / 2.333) * 100 = ~128.6
    expect(percentile).toBeGreaterThan(100); // Above average
    expect(Number.isFinite(percentile)).toBe(true);

    // Below-average player should get < 100
    const belowAvg = FinanceModule.calculateEPSRanking(1.0, [2.0, 3.0, 4.0]);
    expect(belowAvg).toBeLessThan(100);
  });
});
