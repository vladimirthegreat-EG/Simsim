/**
 * L2 Property Tests — Monotonicity & Boundedness of SIMSIM Formulas
 *
 * Property 1: Higher product quality => higher market share (all else equal)
 * Property 2: Factory output is non-negative for any valid inputs
 * Property 3: Brand decay is monotone without investment, never negative
 * Property 4: EPS is finite for any non-zero sharesIssued
 */
import { describe, it, expect } from "vitest";

import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { SimulationInput } from "@/engine/core/SimulationEngine";
import { MarketSimulator } from "@/engine/market/MarketSimulator";
import { MarketingModule } from "@/engine/modules/MarketingModule";
import {
  calculateLineOutput,
  getUnderstaffingRatio,
} from "@/engine/modules/ProductionLineManager";
import { CONSTANTS } from "@/engine/types";
import type { Segment } from "@/engine/types/factory";
import type { TeamState } from "@/engine/types/state";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  createGamePreset,
} from "@/engine/testkit/scenarioGenerator";
import { safeNumber } from "@/engine/utils";
import {
  createTestState,
  createTestMachine,
} from "@/engine/__tests__/unit/testHelpers";

// ============================================
// Seeded pseudo-random helper (Mulberry32)
// ============================================

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================
// Property 1 — Higher quality => higher market share
// ============================================

describe("Property 1: Higher product quality => higher market share", () => {
  const SEGMENTS: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

  for (let seed = 1; seed <= 10; seed++) {
    it(`seed=${seed}: team with quality=90 beats team with quality=60 in all segments`, () => {
      const rng = mulberry32(seed * 7919);

      // Build two identical team states using quick preset
      const { teamState: stateA } = createGamePreset("quick");
      const { teamState: stateB } = createGamePreset("quick");

      // Set round so quality expectations are stable
      const round = Math.floor(rng() * 5) + 1;
      stateA.round = round;
      stateB.round = round;

      // Make all products identical except quality
      for (const product of stateA.products) {
        product.quality = 90;
      }
      for (const product of stateB.products) {
        product.quality = 60;
      }

      // Ensure identical brand, ESG, features, price
      stateA.brandValue = 0.5;
      stateB.brandValue = 0.5;
      stateA.esgScore = 100;
      stateB.esgScore = 100;

      const marketState = createMinimalMarketState();

      const input: SimulationInput = {
        roundNumber: round,
        teams: [
          { id: "team-A", state: stateA, decisions: {} },
          { id: "team-B", state: stateB, decisions: {} },
        ],
        marketState,
        matchSeed: `quality-prop-seed-${seed}`,
      };

      const output = SimulationEngine.processRound(input);
      const resultA = output.results.find(r => r.teamId === "team-A")!;
      const resultB = output.results.find(r => r.teamId === "team-B")!;

      // Check market positions: team A should have higher total score in every segment
      // where both teams have a product
      for (const segment of SEGMENTS) {
        const posA = output.marketPositions.find(
          p => p.teamId === "team-A" && p.segment === segment
        );
        const posB = output.marketPositions.find(
          p => p.teamId === "team-B" && p.segment === segment
        );

        if (posA && posB && posA.product && posB.product) {
          expect(posA.qualityScore).toBeGreaterThan(posB.qualityScore);
          expect(posA.totalScore).toBeGreaterThan(posB.totalScore);
          expect(posA.marketShare).toBeGreaterThan(posB.marketShare);
        }
      }
    });
  }
});

// ============================================
// Property 2 — Factory output is non-negative
// ============================================

describe("Property 2: Factory output non-negative for any valid inputs", () => {
  for (let seed = 1; seed <= 20; seed++) {
    it(`seed=${seed}: calculateLineOutput() >= 0 for random efficiency and workforce`, () => {
      const rng = mulberry32(seed * 6271);

      const state = createTestState();
      const line = state.factories[0].productionLines[0];
      line.status = "active";
      line.productId = "prod-1";
      line.segment = "General";

      // Random efficiency in [0, 1]
      const efficiency = rng();

      // Random workforce: 0 to 200
      const workers = Math.floor(rng() * 201);
      const engineers = Math.floor(rng() * 20);
      const supervisors = Math.floor(rng() * 10);

      line.targetOutput = Math.floor(rng() * 20000) + 1;
      line.assignedWorkers = workers;
      line.assignedEngineers = engineers;
      line.assignedSupervisors = supervisors;

      // Set up a machine so machine capacity exists
      const machineCapacity = Math.floor(rng() * 30000) + 1;
      const m1 = createTestMachine("assembly_line", "factory-1", `m-${seed}`, machineCapacity);
      m1.assignedLineId = line.id;
      state.machineryStates = {
        "factory-1": {
          machines: [m1],
          totalCapacity: machineCapacity,
          totalMaintenanceCost: 0,
          totalOperatingCost: 0,
          averageHealth: 100,
        },
      };
      line.assignedMachines = [m1.id];

      const result = calculateLineOutput(state, line, efficiency);

      expect(result.projectedOutput).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.projectedOutput)).toBe(true);
      expect(Number.isNaN(result.projectedOutput)).toBe(false);
    });
  }
});

// ============================================
// Property 3 — Brand decay is monotone without investment
// ============================================

describe("Property 3: Brand decay is monotone without marketing investment", () => {
  it("brand value strictly decreases each round with zero marketing spend", () => {
    const rounds = 3;
    const brandValues: number[] = [];

    let currentState = createMinimalTeamState();
    currentState.brandValue = 0.5; // Start at a reasonable brand value
    currentState.round = 1;

    for (let round = 1; round <= rounds; round++) {
      // Process marketing with zero spend
      const { newState } = MarketingModule.process(currentState, {
        advertisingBudget: {},
        brandingInvestment: 0,
      });

      brandValues.push(newState.brandValue);
      currentState = newState;
      currentState.round = round + 1;
    }

    // Monotone decreasing: round3 < round2 < round1
    expect(brandValues[0]).toBeLessThan(0.5); // decayed from starting value
    expect(brandValues[1]).toBeLessThan(brandValues[0]);
    expect(brandValues[2]).toBeLessThan(brandValues[1]);

    // Never negative
    for (const bv of brandValues) {
      expect(bv).toBeGreaterThanOrEqual(0);
    }
  });

  it("brand decay is monotone for 10 different starting values", () => {
    const startingValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

    for (const startVal of startingValues) {
      const brandValues: number[] = [startVal];
      let currentState = createMinimalTeamState();
      currentState.brandValue = startVal;
      currentState.round = 1;

      for (let round = 1; round <= 3; round++) {
        const { newState } = MarketingModule.process(currentState, {
          advertisingBudget: {},
          brandingInvestment: 0,
        });

        brandValues.push(newState.brandValue);
        currentState = newState;
        currentState.round = round + 1;
      }

      // Strict monotone decrease for non-zero starting values
      for (let i = 1; i < brandValues.length; i++) {
        expect(brandValues[i]).toBeLessThan(brandValues[i - 1]);
        expect(brandValues[i]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("brand value converges toward zero but never goes negative over many rounds", () => {
    let currentState = createMinimalTeamState();
    currentState.brandValue = 1.0; // Maximum brand
    currentState.round = 1;

    for (let round = 1; round <= 50; round++) {
      const { newState } = MarketingModule.process(currentState, {
        advertisingBudget: {},
        brandingInvestment: 0,
      });

      expect(newState.brandValue).toBeGreaterThanOrEqual(0);
      expect(newState.brandValue).toBeLessThanOrEqual(1);
      expect(newState.brandValue).toBeLessThan(currentState.brandValue);

      currentState = newState;
      currentState.round = round + 1;
    }
  });
});

// ============================================
// Property 4 — EPS is finite for any non-zero sharesIssued
// ============================================

describe("Property 4: EPS is finite for any non-zero sharesIssued", () => {
  const netIncomeValues = [
    0,                    // zero
    1_000_000,            // positive
    -1_000_000,           // negative
    Number.MAX_SAFE_INTEGER / 2, // large positive
    -Number.MAX_SAFE_INTEGER / 2, // large negative
    0.001,                // tiny positive
    -0.001,               // tiny negative
    999_999_999_999,      // billions positive
    -999_999_999_999,     // billions negative
  ];

  const sharesIssuedValues = [
    1,                    // minimum
    100,                  // small
    10_000_000,           // typical
    1_000_000_000,        // large
    0.5,                  // fractional (edge case)
  ];

  for (const netIncome of netIncomeValues) {
    for (const sharesIssued of sharesIssuedValues) {
      it(`EPS is finite: netIncome=${netIncome}, sharesIssued=${sharesIssued}`, () => {
        // Replicate the engine's EPS formula
        const eps = safeNumber(
          sharesIssued > 0 ? netIncome / sharesIssued : 0
        );

        expect(Number.isFinite(eps)).toBe(true);
        expect(Number.isNaN(eps)).toBe(false);
      });
    }
  }

  it("EPS is zero when sharesIssued is zero (guard clause)", () => {
    const eps = safeNumber(0 > 0 ? 100 / 0 : 0);
    expect(eps).toBe(0);
    expect(Number.isFinite(eps)).toBe(true);
  });

  it("EPS computed via processRound is always finite", () => {
    const rng = mulberry32(42);

    for (let trial = 0; trial < 5; trial++) {
      const { teamState } = createGamePreset("quick");
      teamState.round = 1;
      // Randomize netIncome to stress-test
      teamState.netIncome = (rng() - 0.5) * 200_000_000;
      teamState.sharesIssued = Math.max(1, Math.floor(rng() * 50_000_000));

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "team-eps", state: teamState, decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: `eps-finite-${trial}`,
      };

      const output = SimulationEngine.processRound(input);
      const result = output.results[0];
      const eps = result.newState.eps;

      expect(Number.isFinite(eps)).toBe(true);
      expect(Number.isNaN(eps)).toBe(false);
    }
  });
});
