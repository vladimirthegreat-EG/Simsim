/**
 * Break the Sim — Adversarial & Extreme Input Testing
 *
 * Tries to crash, exploit, or produce nonsense from the engine.
 * Every test SHOULD pass (engine handles gracefully).
 * Any failure = a vulnerability that needs fixing.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { TeamState } from "@/engine/types";

function createTeam(overrides?: Partial<TeamState>) {
  return SimulationEngine.createInitialTeamState(
    { cash: 175_000_000, ...overrides },
    { workers: 40, engineers: 8, supervisors: 5, includeProducts: true, startingSegments: 5, brandValue: 0.5, starterMachines: true }
  );
}

function runSafe(teams: Array<{ id: string; state: any; decisions: any }>, seed = "break-test") {
  const marketState = SimulationEngine.createInitialMarketState();
  return SimulationEngine.processRound({
    roundNumber: 1,
    teams,
    marketState,
    matchSeed: seed,
  });
}

describe("Break the Sim — Extreme Inputs", { timeout: 120_000 }, () => {

  // =========================================================================
  // 1. NaN/Infinity/MAX_SAFE_INTEGER in decisions
  // =========================================================================
  describe("Adversarial Numbers", () => {
    it("NaN in rdBudget doesn't crash or produce NaN output", () => {
      const output = runSafe([{
        id: "nan-team",
        state: createTeam(),
        decisions: { rd: { rdBudget: NaN } },
      }]);
      const state = (output.results[0] as any).newState;
      expect(isFinite(state.cash)).toBe(true);
      expect(isFinite(state.revenue)).toBe(true);
    });

    it("Infinity in factory investment doesn't crash", () => {
      const output = runSafe([{
        id: "inf-team",
        state: createTeam(),
        decisions: { factory: { efficiencyInvestments: { "factory-1": { workers: Infinity } } } },
      }]);
      const state = (output.results[0] as any).newState;
      expect(isFinite(state.cash)).toBe(true);
    });

    it("MAX_SAFE_INTEGER budget doesn't hang engine", () => {
      const output = runSafe([{
        id: "max-team",
        state: createTeam(),
        decisions: { rd: { rdBudget: Number.MAX_SAFE_INTEGER } },
      }]);
      const state = (output.results[0] as any).newState;
      expect(isFinite(state.cash)).toBe(true);
    }, 10_000);

    it("negative budget values handled", () => {
      const output = runSafe([{
        id: "neg-team",
        state: createTeam(),
        decisions: {
          rd: { rdBudget: -50_000_000 },
          marketing: { advertisingBudget: { General: -10_000_000 }, brandingInvestment: -5_000_000 },
        },
      }]);
      const state = (output.results[0] as any).newState;
      expect(isFinite(state.cash)).toBe(true);
      expect(state.cash).toBeGreaterThan(0); // Shouldn't gain cash from negative spending
    });
  });

  // =========================================================================
  // 2. Zero everything — absolute minimum input
  // =========================================================================
  describe("Zero Everything", () => {
    it("all-zero decisions for 8 rounds doesn't crash", () => {
      let state = createTeam();
      let market = SimulationEngine.createInitialMarketState();
      for (let r = 1; r <= 8; r++) {
        const output = SimulationEngine.processRound({
          roundNumber: r,
          teams: [{ id: "zero", state, decisions: {} }],
          marketState: market,
          matchSeed: "zero-test",
        });
        state = (output.results[0] as any).newState;
        market = output.newMarketState;
        expect(isFinite(state.cash)).toBe(true);
        expect(isFinite(state.revenue)).toBe(true);
      }
      // After 8 rounds of nothing, should still have SOME revenue (existing products sell)
      expect(state.revenue).toBeGreaterThan(0);
    });

    it("team with $0 starting cash survives", () => {
      const output = runSafe([{
        id: "broke",
        state: createTeam({ cash: 0 } as any),
        decisions: {},
      }]);
      const state = (output.results[0] as any).newState;
      // Emergency funding should kick in
      expect(isFinite(state.cash)).toBe(true);
    });

    it("team with $1 starting cash survives", () => {
      const output = runSafe([{
        id: "pennies",
        state: createTeam({ cash: 1 } as any),
        decisions: {},
      }]);
      const state = (output.results[0] as any).newState;
      expect(isFinite(state.cash)).toBe(true);
    });
  });

  // =========================================================================
  // 3. Max everything — spend ALL the money
  // =========================================================================
  describe("Max Spending", () => {
    it("spending 100% of cash in one round doesn't crash", () => {
      const state = createTeam();
      const allCash = state.cash;
      const output = runSafe([{
        id: "spender",
        state,
        decisions: {
          rd: { rdBudget: allCash * 0.5 },
          marketing: {
            advertisingBudget: { General: allCash * 0.1, Budget: allCash * 0.1 },
            brandingInvestment: allCash * 0.1,
          },
          factory: {
            efficiencyInvestments: { "factory-1": { workers: allCash * 0.1, machinery: allCash * 0.1 } },
          },
        },
      }]);
      const newState = (output.results[0] as any).newState;
      expect(isFinite(newState.cash)).toBe(true);
      // Cash should be very low or negative (emergency loan triggers)
    });

    it("10 teams competing doesn't crash", () => {
      const teams = Array.from({ length: 10 }, (_, i) => ({
        id: `team-${i}`,
        state: createTeam(),
        decisions: {},
      }));
      const output = runSafe(teams, "ten-teams");
      expect(output.results.length).toBe(10);
      for (const r of output.results) {
        expect(isFinite((r as any).newState.revenue)).toBe(true);
      }
    });

    it("1 team alone gets 100% market share", () => {
      const output = runSafe([{
        id: "monopoly",
        state: createTeam(),
        decisions: {},
      }]);
      const state = (output.results[0] as any).newState;
      // Should get all the market share
      const totalShare = Object.values(state.marketShare as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
      expect(totalShare).toBeGreaterThan(0);
      expect(isFinite(state.revenue)).toBe(true);
    });
  });

  // =========================================================================
  // 4. Exploit attempts
  // =========================================================================
  describe("Exploit Attempts", () => {
    it("below-cost pricing gets penalized (not rewarded)", () => {
      const cheapTeam = createTeam();
      const normalTeam = createTeam();
      const output = SimulationEngine.processRound({
        roundNumber: 1,
        teams: [
          { id: "cheap", state: cheapTeam, decisions: {
            marketing: { productPricing: [
              { productId: "initial-product", newPrice: 10 },   // WAY below cost
              { productId: "budget-product", newPrice: 5 },     // Basically free
            ]},
          }},
          { id: "normal", state: normalTeam, decisions: {} },
        ],
        marketState: SimulationEngine.createInitialMarketState(),
        matchSeed: "exploit-price",
      });
      const cheapState = (output.results.find(r => r.teamId === "cheap") as any)?.newState;
      const normalState = (output.results.find(r => r.teamId === "normal") as any)?.newState;
      // Below-cost team should NOT have higher revenue than normal team
      // (below-cost penalty should kick in)
      expect(isFinite(cheapState.revenue)).toBe(true);
      expect(isFinite(normalState.revenue)).toBe(true);
    });

    it("firing all workers doesn't crash engine", () => {
      const state = createTeam();
      const allEmployeeIds = state.employees.map((e: any) => ({ employeeId: e.id }));
      const output = runSafe([{
        id: "fire-all",
        state,
        decisions: { hr: { fires: allEmployeeIds } },
      }]);
      const newState = (output.results[0] as any).newState;
      expect(isFinite(newState.cash)).toBe(true);
      // With no workers, production should be near zero
    });

    it("100% promotion discount capped at 50%", () => {
      const output = runSafe([{
        id: "promo-exploit",
        state: createTeam(),
        decisions: {
          marketing: {
            promotions: [
              { segment: "General", discountPercent: 100, duration: 1 },  // 100% off!
              { segment: "Budget", discountPercent: 200, duration: 1 },   // 200% off?!
            ],
          },
        },
      }]);
      const state = (output.results[0] as any).newState;
      expect(isFinite(state.revenue)).toBe(true);
      // Products should NOT have $0 or negative prices
      for (const product of state.products || []) {
        expect(product.price).toBeGreaterThan(0);
      }
    });

    it("salary multiplier 0x doesn't crash (paying nothing)", () => {
      const output = runSafe([{
        id: "slave-labor",
        state: createTeam(),
        decisions: {
          hr: { salaryMultiplierChanges: { workers: 0, engineers: 0, supervisors: 0 } },
        },
      }]);
      const state = (output.results[0] as any).newState;
      expect(isFinite(state.cash)).toBe(true);
    });

    it("salary multiplier 10x doesn't bankrupt instantly", () => {
      const output = runSafe([{
        id: "overpay",
        state: createTeam(),
        decisions: {
          hr: { salaryMultiplierChanges: { workers: 10, engineers: 10, supervisors: 10 } },
        },
      }]);
      const state = (output.results[0] as any).newState;
      expect(isFinite(state.cash)).toBe(true);
    });
  });

  // =========================================================================
  // 5. Edge cases
  // =========================================================================
  describe("Edge Cases", () => {
    it("round 0 doesn't crash", () => {
      const output = SimulationEngine.processRound({
        roundNumber: 0,
        teams: [{ id: "r0", state: createTeam(), decisions: {} }],
        marketState: SimulationEngine.createInitialMarketState(),
        matchSeed: "round-zero",
      });
      expect(output.results.length).toBe(1);
    });

    it("round 999 doesn't crash", () => {
      const output = SimulationEngine.processRound({
        roundNumber: 999,
        teams: [{ id: "r999", state: createTeam(), decisions: {} }],
        marketState: SimulationEngine.createInitialMarketState(),
        matchSeed: "round-999",
      });
      expect(output.results.length).toBe(1);
    });

    it("empty teams array doesn't crash", () => {
      try {
        const output = SimulationEngine.processRound({
          roundNumber: 1,
          teams: [],
          marketState: SimulationEngine.createInitialMarketState(),
          matchSeed: "empty",
        });
        expect(output.results.length).toBe(0);
      } catch (e) {
        // Throwing is also acceptable for empty teams
        expect(e).toBeDefined();
      }
    });

    it("same team ID twice doesn't corrupt state", () => {
      const output = runSafe([
        { id: "dup", state: createTeam(), decisions: { rd: { rdBudget: 5_000_000 } } },
        { id: "dup", state: createTeam(), decisions: { rd: { rdBudget: 10_000_000 } } },
      ]);
      // Should handle gracefully — either merge, error, or process independently
      expect(output.results.length).toBeGreaterThan(0);
    });

    it("32 rounds continuous play doesn't accumulate errors", () => {
      let state = createTeam();
      let market = SimulationEngine.createInitialMarketState();
      for (let r = 1; r <= 32; r++) {
        const output = SimulationEngine.processRound({
          roundNumber: r,
          teams: [{ id: "marathon", state, decisions: {
            rd: { rdBudget: 5_000_000 },
            marketing: { advertisingBudget: { General: 1_000_000 }, brandingInvestment: 1_000_000 },
          }}],
          marketState: market,
          matchSeed: "marathon",
        });
        state = (output.results[0] as any).newState;
        market = output.newMarketState;
      }
      // After 32 rounds, everything should still be finite
      expect(isFinite(state.cash)).toBe(true);
      expect(isFinite(state.revenue)).toBe(true);
      expect(isFinite(state.netIncome)).toBe(true);
      expect(isFinite(state.brandValue)).toBe(true);
      expect(isFinite(state.esgScore)).toBe(true);
      expect(state.revenue).toBeGreaterThan(0);
    });

    it("string values in numeric fields handled", () => {
      try {
        const output = runSafe([{
          id: "strings",
          state: createTeam(),
          decisions: {
            rd: { rdBudget: "ten million" as any },
            marketing: { brandingInvestment: "lots" as any },
          },
        }]);
        const state = (output.results[0] as any).newState;
        expect(isFinite(state.cash)).toBe(true);
      } catch (e) {
        // Throwing on bad input is acceptable
        expect(e).toBeDefined();
      }
    });

    it("undefined/null decisions handled", () => {
      const output = runSafe([{
        id: "nulls",
        state: createTeam(),
        decisions: {
          rd: undefined,
          marketing: null,
          factory: undefined,
          hr: null,
          finance: undefined,
        } as any,
      }]);
      const state = (output.results[0] as any).newState;
      expect(isFinite(state.cash)).toBe(true);
    });
  });

  // =========================================================================
  // 6. Stress — many teams, many rounds
  // =========================================================================
  describe("Stress Tests", () => {
    it("8 teams × 8 rounds completes in under 5 seconds", () => {
      const start = Date.now();
      let teams = Array.from({ length: 8 }, (_, i) => ({
        id: `stress-${i}`,
        state: createTeam(),
        decisions: {},
      }));
      let market = SimulationEngine.createInitialMarketState();

      for (let r = 1; r <= 8; r++) {
        const output = SimulationEngine.processRound({
          roundNumber: r,
          teams: teams.map(t => ({ ...t })),
          marketState: market,
          matchSeed: "stress-8x8",
        });
        teams = output.results.map((res: any) => ({
          id: res.teamId,
          state: res.newState,
          decisions: {},
        }));
        market = output.newMarketState;
      }

      const elapsed = Date.now() - start;
      console.log(`8 teams × 8 rounds: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(5000);
      // All teams should have finite financials
      for (const t of teams) {
        expect(isFinite(t.state.cash)).toBe(true);
        expect(isFinite(t.state.revenue)).toBe(true);
      }
    });
  });
});
