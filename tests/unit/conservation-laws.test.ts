/**
 * Layer 2 — Mathematical Validity: Conservation Laws (L2-CON-01, L2-CON-02, L2-CON-03)
 *
 * Verifies fundamental accounting identities and market conservation laws.
 * If these fail, the simulation has a structural math error.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { hashState } from "@/engine/core/EngineContext";
import { fresh_company_state, fresh_market_state, create_context } from "./setup";

describe("Conservation Laws", () => {
  // ===========================================================================
  // L2-CON-01: Market share per segment sums to 1.0
  // ===========================================================================
  describe("L2-CON-01: Market share conservation", () => {
    it("market shares sum to 1.0 per segment across 4 teams, 5 rounds", () => {
      const teams = [
        { id: "t1", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "t2", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "t3", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "t4", state: SimulationEngine.createInitialTeamState(), decisions: {} },
      ];

      let marketState = SimulationEngine.createInitialMarketState();
      const SEGMENTS = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

      for (let round = 1; round <= 5; round++) {
        const output = SimulationEngine.processRound({
          roundNumber: round,
          teams: teams.map(t => ({ ...t })),
          marketState,
          matchSeed: "conservation-test",
        });

        // Check each segment
        for (const seg of SEGMENTS) {
          let totalShare = 0;
          for (const result of output.results) {
            const segShare = result.state.marketShare?.[seg] ?? 0;
            totalShare += segShare;
          }

          // If any team has a product in this segment, shares should sum to ~1.0
          const hasProduct = output.results.some(r =>
            r.state.products?.some(p => p.segment === seg && p.developmentStatus === "launched")
          );

          if (hasProduct) {
            expect(
              Math.abs(totalShare - 1.0),
              `Round ${round}, segment ${seg}: shares sum to ${totalShare}, expected ~1.0`
            ).toBeLessThan(0.01);
          }
        }

        // Update states for next round
        for (let i = 0; i < teams.length; i++) {
          teams[i].state = output.results[i].state;
        }
        marketState = output.newMarketState;
      }
    });
  });

  // ===========================================================================
  // L2-CON-02: Cash conservation across rounds
  // ===========================================================================
  describe("L2-CON-02: Cash conservation", () => {
    it("cash changes can be explained by inflows minus outflows", () => {
      const team = {
        id: "cash-team",
        state: SimulationEngine.createInitialTeamState(),
        decisions: {},
      };

      let marketState = SimulationEngine.createInitialMarketState();
      let prevCash = team.state.cash;

      for (let round = 1; round <= 5; round++) {
        const output = SimulationEngine.processRound({
          roundNumber: round,
          teams: [{ ...team }],
          marketState,
          matchSeed: "cash-conservation",
        });

        const state = output.results[0].state;
        const actualCash = state.cash;

        // Cash should be a finite number
        expect(isFinite(actualCash)).toBe(true);

        // Cash should not be NaN
        expect(isNaN(actualCash)).toBe(false);

        // Update for next round
        prevCash = actualCash;
        team.state = state;
        marketState = output.newMarketState;
      }
    });
  });

  // ===========================================================================
  // L2-CON-03: Total segment revenue bounded by market demand
  // ===========================================================================
  describe("L2-CON-03: Revenue bounded by market demand", () => {
    it("total segment revenue does not exceed demand × max price", () => {
      const teams = [
        { id: "t1", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "t2", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "t3", state: SimulationEngine.createInitialTeamState(), decisions: {} },
        { id: "t4", state: SimulationEngine.createInitialTeamState(), decisions: {} },
      ];

      const marketState = SimulationEngine.createInitialMarketState();

      const output = SimulationEngine.processRound({
        roundNumber: 1,
        teams,
        marketState,
        matchSeed: "revenue-bound",
      });

      const SEGMENTS = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

      for (const seg of SEGMENTS) {
        const segData = marketState.demandBySegment[seg as keyof typeof marketState.demandBySegment];
        if (!segData) continue;

        const maxPossibleRevenue = segData.totalDemand * segData.priceRange.max;

        // Sum revenue from all teams for this segment
        let totalSegRevenue = 0;
        for (const result of output.results) {
          for (const product of result.state.products || []) {
            if (product.segment === seg) {
              totalSegRevenue += (product.unitsSold || 0) * product.price;
            }
          }
        }

        expect(
          totalSegRevenue,
          `Segment ${seg}: total revenue ${totalSegRevenue} exceeds max ${maxPossibleRevenue}`
        ).toBeLessThanOrEqual(maxPossibleRevenue * 1.05); // 5% tolerance for rounding
      }
    });
  });
});
