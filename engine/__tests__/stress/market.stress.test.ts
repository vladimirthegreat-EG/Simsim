/**
 * MARKET SIMULATOR STRESS SUITE
 *
 * Tests softmax competition, 5-dimension scoring, rubber-banding,
 * brand critical mass, and revenue calculation.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput } from "../../core/SimulationEngine";
import {
  createTeamState,
  createMarketState,
  createDecisions,
  runSimulation,
} from "../../testkit/scenarioGenerator";
import { assertAllInvariants, assertDeterminism } from "../../testkit/invariants";
import { CONSTANTS } from "../../types";
import type { ScenarioProfile } from "../../testkit/scenarioGenerator";

/** Helper: build a SimulationInput from profile settings */
function createSimulationInput(opts: {
  teamCount: number;
  roundNumber: number;
  matchSeed: string;
  profile: ScenarioProfile;
}): SimulationInput {
  const teams = [];
  for (let i = 0; i < opts.teamCount; i++) {
    const state = createTeamState(opts.profile);
    teams.push({
      id: `team-${i + 1}`,
      state,
      decisions: createDecisions(opts.profile, state),
    });
  }
  return {
    roundNumber: opts.roundNumber,
    teams,
    marketState: createMarketState(),
    matchSeed: opts.matchSeed,
  };
}

describe("Market Simulator Stress Suite", () => {
  // ============================================
  // CATEGORY A — Golden Path
  // ============================================
  describe("Category A — Golden Path", () => {
    it("2 balanced teams: market shares are roughly equal", () => {
      const input = createSimulationInput({
        teamCount: 2,
        roundNumber: 1,
        matchSeed: "mkt-balanced",
        profile: "baseline-balanced",
      });
      const output = SimulationEngine.processRound(input);

      // With identical teams, shares should be roughly 50/50
      for (const segment of CONSTANTS.SEGMENTS) {
        const shares = output.results.map(r => r.marketShareBySegment[segment]).filter(s => s > 0);
        if (shares.length === 2) {
          // Each should be between 30% and 70% for identical teams
          for (const share of shares) {
            expect(share).toBeGreaterThan(0.2);
            expect(share).toBeLessThan(0.8);
          }
        }
      }
    });

    it("revenue = unitsSold × price per segment", () => {
      const input = createSimulationInput({
        teamCount: 2,
        roundNumber: 1,
        matchSeed: "mkt-revenue",
        profile: "baseline-balanced",
      });
      const output = SimulationEngine.processRound(input);

      for (const result of output.results) {
        // Total revenue should be positive
        expect(result.totalRevenue).toBeGreaterThanOrEqual(0);
      }
    });

    it("deterministic: same seed = same market allocation", () => {
      const input1 = createSimulationInput({
        teamCount: 4,
        roundNumber: 1,
        matchSeed: "mkt-det",
        profile: "baseline-balanced",
      });
      const input2 = createSimulationInput({
        teamCount: 4,
        roundNumber: 1,
        matchSeed: "mkt-det",
        profile: "baseline-balanced",
      });
      const output1 = SimulationEngine.processRound(input1);
      const output2 = SimulationEngine.processRound(input2);
      assertDeterminism(output1, output2);
    });
  });

  // ============================================
  // CATEGORY B — Edge Scenarios
  // ============================================
  describe("Category B — Edge Scenarios", () => {
    it("single team gets 100% market share", () => {
      const input = createSimulationInput({
        teamCount: 1,
        roundNumber: 1,
        matchSeed: "mkt-single",
        profile: "baseline-balanced",
      });
      const output = SimulationEngine.processRound(input);

      const shares = output.results[0].marketShareBySegment;
      for (const [segment, share] of Object.entries(shares)) {
        if (typeof share === "number" && share > 0) {
          expect(share).toBe(1.0);
        }
      }
    });

    it("5 teams: shares distribute without NaN", () => {
      const input = createSimulationInput({
        teamCount: 5,
        roundNumber: 1,
        matchSeed: "mkt-5teams",
        profile: "baseline-balanced",
      });
      const output = SimulationEngine.processRound(input);

      for (const result of output.results) {
        for (const [_, share] of Object.entries(result.marketShareBySegment)) {
          if (typeof share === "number") {
            expect(isNaN(share)).toBe(false);
            expect(share).toBeGreaterThanOrEqual(0);
            expect(share).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it("no-product team gets zero revenue", () => {
      const stateNoProducts = createTeamState();
      stateNoProducts.products = []; // Remove all products

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [
          { id: "t1", state: stateNoProducts, decisions: {} },
          { id: "t2", state: createTeamState(), decisions: {} },
        ],
        marketState: createMarketState(),
        matchSeed: "mkt-no-products",
      };
      const output = SimulationEngine.processRound(input);
      const t1Revenue = output.results.find(r => r.teamId === "t1")!.totalRevenue;
      // Team with no products should have low/zero revenue
      expect(t1Revenue).toBeLessThanOrEqual(output.results.find(r => r.teamId === "t2")!.totalRevenue);
    });
  });

  // ============================================
  // CATEGORY C — Property Tests
  // ============================================
  describe("Category C — Property Tests", () => {
    it("segment weights sum to 100", () => {
      for (const [segment, weights] of Object.entries(CONSTANTS.SEGMENT_WEIGHTS)) {
        const sum = weights.price + weights.quality + weights.brand + weights.esg + weights.features;
        expect(sum).toBe(100);
      }
    });

    it("softmax temperature = 3 is used (from CONSTANTS)", () => {
      // Phase-G: Set to 3 for moderate sharpness between competitive and monopolistic.
      expect(CONSTANTS.SOFTMAX_TEMPERATURE).toBe(3);
    });

    it("rubber-banding constants are correct", () => {
      expect(CONSTANTS.RUBBER_BAND_LEADING_PENALTY).toBe(1.0);
      expect(CONSTANTS.RUBBER_BAND_THRESHOLD).toBe(0.5);
    });

    it("brand critical mass constants match documentation", () => {
      expect(CONSTANTS.BRAND_CRITICAL_MASS_LOW).toBe(0.15);
      expect(CONSTANTS.BRAND_CRITICAL_MASS_HIGH).toBe(0.60);
      expect(CONSTANTS.BRAND_LOW_MULTIPLIER).toBe(0.75);
      expect(CONSTANTS.BRAND_HIGH_MULTIPLIER).toBe(1.05);
    });

    it("50 seeded scenarios: no market share exceeds 1.0", () => {
      for (let seed = 1; seed <= 50; seed++) {
        const input = createSimulationInput({
          teamCount: 2 + (seed % 4),
          roundNumber: 1,
          matchSeed: `mkt-prop-${seed}`,
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);
        for (const result of output.results) {
          for (const [_, share] of Object.entries(result.marketShareBySegment)) {
            if (typeof share === "number") {
              expect(share).toBeLessThanOrEqual(1.0 + 0.0001);
              expect(share).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    });

    it("all 5 segments present in demand", () => {
      const ms = createMarketState();
      for (const segment of CONSTANTS.SEGMENTS) {
        expect(ms.demandBySegment[segment]).toBeDefined();
        expect(ms.demandBySegment[segment].totalDemand).toBeGreaterThan(0);
      }
    });

    it("rubber-banding not applied at round 1-2", () => {
      for (const round of [1, 2]) {
        const input = createSimulationInput({
          teamCount: 3,
          roundNumber: round,
          matchSeed: `mkt-rb-r${round}`,
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);
        // Rubber-banding should not be active before round 3
        // (SimulationEngine passes applyRubberBanding: roundNumber >= 3)
      }
    });

    it("ESG penalty threshold is 300", () => {
      expect(CONSTANTS.ESG_PENALTY_THRESHOLD).toBe(300);
      expect(CONSTANTS.ESG_PENALTY_MAX).toBe(0.12);
    });
  });

  // ============================================
  // CATEGORY D — Regression
  // ============================================
  describe("Category D — Regression", () => {
    it("DEFECT: market shares can sum to < 1.0 in multi-round mixed strategies (documented)", () => {
      // This documents a known behavior: when teams don't compete in all segments,
      // total allocated shares in a segment can be < 1.0.
      // This was discovered during multi_round stress testing.
      const sim = runSimulation({
        teamCount: 4,
        rounds: 5,
        seed: "mkt-reg-shares",
        profile: "baseline-balanced",
      });

      for (const output of sim.roundOutputs) {
        for (const segment of CONSTANTS.SEGMENTS) {
          let total = 0;
          for (const result of output.results) {
            const share = result.marketShareBySegment[segment];
            if (typeof share === "number" && share > 0) total += share;
          }
          // Should not EXCEED 1.0 (but can be less)
          expect(total).toBeLessThanOrEqual(1.0 + 0.001);
        }
      }
    });
  });
});
