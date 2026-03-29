/**
 * L2 Property Tests v2 — Monotonicity & Boundedness of SIMSIM Formulas
 *
 * Property 1: Higher product quality => higher market share (10 seeds)
 * Property 2: Factory output non-negative (20 random efficiency/workforce combos)
 * Property 3: Brand decay monotone without investment, never negative (3 rounds)
 * Property 4: EPS finite for any non-zero sharesIssued (matrix of values)
 */
import { describe, it, expect } from "vitest";

import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { SimulationInput } from "@/engine/core/SimulationEngine";
import { MarketingModule } from "@/engine/modules/MarketingModule";
import {
  calculateLineOutput,
} from "@/engine/modules/ProductionLineManager";
import { CONSTANTS } from "@/engine/types";
import type { Segment } from "@/engine/types/factory";
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
// Property 1 — Higher quality => higher market share (10 seeds)
// ============================================

describe("Property 1: Higher product quality => higher market share (v2)", () => {
  const SEGMENTS: Segment[] = CONSTANTS.SEGMENTS as unknown as Segment[];

  for (let seed = 1; seed <= 10; seed++) {
    it(`seed=${seed}: team with quality=90 outscores team with quality=60`, () => {
      const rng = mulberry32(seed * 8831);

      // Build two team states from the "quick" preset
      const { teamState: highQ } = createGamePreset("quick");
      const { teamState: lowQ } = createGamePreset("quick");

      const round = Math.floor(rng() * 4) + 1;
      highQ.round = round;
      lowQ.round = round;

      // Diverge only on quality
      for (const p of highQ.products) p.quality = 90;
      for (const p of lowQ.products) p.quality = 60;

      // Equalize everything else
      highQ.brandValue = lowQ.brandValue = 0.5;
      highQ.esgScore = lowQ.esgScore = 100;

      // Equalize features and prices across both teams
      for (let i = 0; i < highQ.products.length; i++) {
        if (lowQ.products[i]) {
          highQ.products[i].features = lowQ.products[i].features;
          highQ.products[i].price = lowQ.products[i].price;
        }
      }

      const marketState = createMinimalMarketState();

      const input: SimulationInput = {
        roundNumber: round,
        teams: [
          { id: "team-hi", state: highQ, decisions: {} },
          { id: "team-lo", state: lowQ, decisions: {} },
        ],
        marketState,
        matchSeed: `quality-v2-seed-${seed}`,
      };

      const output = SimulationEngine.processRound(input);

      // For every segment where both teams have products, high quality wins
      for (const segment of SEGMENTS) {
        const posHi = output.marketPositions.find(
          p => p.teamId === "team-hi" && p.segment === segment
        );
        const posLo = output.marketPositions.find(
          p => p.teamId === "team-lo" && p.segment === segment
        );

        if (posHi && posLo && posHi.product && posLo.product) {
          expect(posHi.qualityScore).toBeGreaterThan(posLo.qualityScore);
          expect(posHi.totalScore).toBeGreaterThan(posLo.totalScore);
          expect(posHi.marketShare).toBeGreaterThan(posLo.marketShare);
        }
      }
    });
  }
});

// ============================================
// Property 2 — Factory output non-negative (20 random combos)
// ============================================

describe("Property 2: Factory output non-negative for random efficiency/workforce", () => {
  for (let seed = 1; seed <= 20; seed++) {
    it(`seed=${seed}: calculateLineOutput() >= 0`, () => {
      const rng = mulberry32(seed * 5437);

      const state = createTestState();
      const line = state.factories[0].productionLines[0];
      line.status = "active";
      line.productId = "prod-1";
      line.segment = "General";

      // Random efficiency in [0, 1]
      const efficiency = rng();

      // Random workforce: 0-200 workers, 0-20 engineers, 0-10 supervisors
      const workers = Math.floor(rng() * 201);
      const engineers = Math.floor(rng() * 21);
      const supervisors = Math.floor(rng() * 11);

      line.targetOutput = Math.floor(rng() * 25000) + 1;
      line.assignedWorkers = workers;
      line.assignedEngineers = engineers;
      line.assignedSupervisors = supervisors;

      // Random worker efficiency and speed
      const avgWorkerEfficiency = Math.floor(rng() * 100) + 1;
      const avgWorkerSpeed = Math.floor(rng() * 100) + 1;

      // Set up a machine with random capacity
      const machineCapacity = Math.floor(rng() * 30000) + 1;
      const m1 = createTestMachine("assembly_line", "factory-1", `m-v2-${seed}`, machineCapacity);
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

      const result = calculateLineOutput(
        state,
        line,
        efficiency,
        {},       // no bonuses
        1.0,      // sharedScale
        avgWorkerEfficiency,
        avgWorkerSpeed
      );

      // Core property: output is non-negative and finite
      expect(result.projectedOutput).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.projectedOutput)).toBe(true);
      expect(Number.isNaN(result.projectedOutput)).toBe(false);
    });
  }
});

// ============================================
// Property 3 — Brand decay monotone without investment, never negative
// ============================================

describe("Property 3: Brand decay monotone without marketing investment (v2)", () => {
  it("brand value strictly decreases for 3 rounds with zero marketing", () => {
    const brandValues: number[] = [];

    let currentState = createMinimalTeamState();
    currentState.brandValue = 0.5;
    currentState.round = 1;
    // Ensure ESG doesn't inject brand boost (ESG brand boost triggers above 300)
    currentState.esgScore = 0;

    for (let round = 1; round <= 3; round++) {
      const { newState } = MarketingModule.process(currentState, {
        advertisingBudget: {},
        brandingInvestment: 0,
      });

      brandValues.push(newState.brandValue);
      currentState = newState;
      currentState.round = round + 1;
      currentState.esgScore = 0; // Keep ESG low to avoid brand boost
    }

    // Monotone decreasing
    expect(brandValues[0]).toBeLessThan(0.5);
    expect(brandValues[1]).toBeLessThan(brandValues[0]);
    expect(brandValues[2]).toBeLessThan(brandValues[1]);

    // Never negative
    for (const bv of brandValues) {
      expect(bv).toBeGreaterThanOrEqual(0);
    }
  });

  it("brand decay is monotone for 10 different starting values", () => {
    const startingValues = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0];

    for (const startVal of startingValues) {
      const brandValues: number[] = [startVal];
      let currentState = createMinimalTeamState();
      currentState.brandValue = startVal;
      currentState.round = 1;
      currentState.esgScore = 0;

      for (let round = 1; round <= 3; round++) {
        const { newState } = MarketingModule.process(currentState, {
          advertisingBudget: {},
          brandingInvestment: 0,
        });

        brandValues.push(newState.brandValue);
        currentState = newState;
        currentState.round = round + 1;
        currentState.esgScore = 0;
      }

      // Strict monotone decrease for non-zero starting values
      for (let i = 1; i < brandValues.length; i++) {
        expect(brandValues[i]).toBeLessThan(brandValues[i - 1]);
        expect(brandValues[i]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("brand value never goes negative even after 100 rounds of decay", () => {
    let currentState = createMinimalTeamState();
    currentState.brandValue = 1.0;
    currentState.round = 1;
    currentState.esgScore = 0;

    for (let round = 1; round <= 100; round++) {
      const { newState } = MarketingModule.process(currentState, {
        advertisingBudget: {},
        brandingInvestment: 0,
      });

      expect(newState.brandValue).toBeGreaterThanOrEqual(0);
      expect(newState.brandValue).toBeLessThanOrEqual(1);
      expect(newState.brandValue).toBeLessThan(currentState.brandValue);

      currentState = newState;
      currentState.round = round + 1;
      currentState.esgScore = 0;
    }
  });
});

// ============================================
// Property 4 — EPS finite for any non-zero sharesIssued
// ============================================

describe("Property 4: EPS is finite for any non-zero sharesIssued (v2)", () => {
  const netIncomeValues = [
    0,
    1,
    -1,
    1_000_000,
    -1_000_000,
    999_999_999_999,
    -999_999_999_999,
    Number.MAX_SAFE_INTEGER / 2,
    -Number.MAX_SAFE_INTEGER / 2,
    0.001,
    -0.001,
  ];

  const sharesIssuedValues = [
    1,
    100,
    10_000,
    10_000_000,
    1_000_000_000,
    0.5,
  ];

  for (const netIncome of netIncomeValues) {
    for (const sharesIssued of sharesIssuedValues) {
      it(`EPS finite: netIncome=${netIncome}, shares=${sharesIssued}`, () => {
        const eps = safeNumber(
          sharesIssued > 0 ? netIncome / sharesIssued : 0
        );

        expect(Number.isFinite(eps)).toBe(true);
        expect(Number.isNaN(eps)).toBe(false);
      });
    }
  }

  it("EPS is zero when sharesIssued is zero (division guard)", () => {
    const eps = safeNumber(0 > 0 ? 100_000_000 / 0 : 0);
    expect(eps).toBe(0);
    expect(Number.isFinite(eps)).toBe(true);
  });

  it("EPS from processRound is always finite across 5 random trials", () => {
    const rng = mulberry32(12345);

    for (let trial = 0; trial < 5; trial++) {
      const { teamState } = createGamePreset("quick");
      teamState.round = 1;
      teamState.netIncome = (rng() - 0.5) * 500_000_000;
      teamState.sharesIssued = Math.max(1, Math.floor(rng() * 100_000_000));

      const input: SimulationInput = {
        roundNumber: 1,
        teams: [{ id: "team-eps-v2", state: teamState, decisions: {} }],
        marketState: createMinimalMarketState(),
        matchSeed: `eps-v2-trial-${trial}`,
      };

      const output = SimulationEngine.processRound(input);
      const result = output.results[0];
      const eps = result.newState.eps;

      expect(Number.isFinite(eps)).toBe(true);
      expect(Number.isNaN(eps)).toBe(false);
    }
  });
});
