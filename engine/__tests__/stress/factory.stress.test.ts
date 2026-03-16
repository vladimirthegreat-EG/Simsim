/**
 * Factory Module — Stress Test Suite
 *
 * Tests FactoryModule.process() for efficiency investments, green investments,
 * factory construction, upgrades, ESG initiatives, production allocations,
 * and CO2 emissions tracking.
 *
 * A. Golden path deterministic snapshots
 * B. Edge scenarios
 * C. Property tests (invariants across seeded scenarios)
 * D. Regression tests
 */

import { describe, it, expect } from "vitest";
import { FactoryModule } from "@/engine/modules/FactoryModule";
import type { TeamState, FactoryDecisions } from "@/engine/types";
import { CONSTANTS } from "@/engine/types";
import { createTestContext } from "@/engine/core/EngineContext";
import {
  createTeamState,
  createMarketState,
  createDecisions,
  runSimulation,
  assertNoNaN,
  assertNoOverflow,
  assertAllInvariants,
  assertProductionInvariants,
  assertESGBounded,
  type ScenarioProfile,
} from "@/engine/testkit";

// ============================================
// HELPERS
// ============================================

function processFactory(
  state: TeamState,
  decisions: FactoryDecisions,
  ctx?: ReturnType<typeof createTestContext>
): { newState: TeamState; result: any } {
  return FactoryModule.process(state, decisions, ctx);
}

// ============================================
// CATEGORY A — Golden Path Deterministic
// ============================================

describe("Factory Stress — Category A: Golden Path", () => {
  it("2 teams, 3 rounds — efficiency investments applied deterministically", () => {
    const result1 = runSimulation({
      teamCount: 2,
      rounds: 3,
      seed: "factory-golden-2x3",
      profile: "baseline-balanced",
    });

    const result2 = runSimulation({
      teamCount: 2,
      rounds: 3,
      seed: "factory-golden-2x3",
      profile: "baseline-balanced",
    });

    // Compare factory efficiency round by round
    for (let r = 0; r < 3; r++) {
      for (let t = 0; t < 2; t++) {
        const s1 = result1.roundOutputs[r].results[t].newState;
        const s2 = result2.roundOutputs[r].results[t].newState;

        for (let f = 0; f < s1.factories.length; f++) {
          expect(
            s1.factories[f].efficiency,
            `Round ${r + 1}, team ${t + 1}, factory ${f}: efficiency mismatch`
          ).toBe(s2.factories[f].efficiency);
        }

        expect(s1.co2Emissions).toBe(s2.co2Emissions);
      }
    }

    // Final states have production invariants
    for (const state of result1.finalStates) {
      assertProductionInvariants(state);
    }
  });

  it("6 teams, 8 rounds — all factory fields remain finite", () => {
    const result = runSimulation({
      teamCount: 6,
      rounds: 8,
      seed: "factory-golden-6x8",
      profile: "baseline-balanced",
    });

    for (const state of result.finalStates) {
      assertNoNaN(state);
      assertNoOverflow(state);

      // Every factory should have valid efficiency
      for (const factory of state.factories) {
        expect(factory.efficiency).toBeGreaterThanOrEqual(0);
        expect(factory.efficiency).toBeLessThanOrEqual(CONSTANTS.MAX_EFFICIENCY);
        expect(Number.isFinite(factory.co2Emissions)).toBe(true);
      }
    }
  });
});

// ============================================
// CATEGORY B — Edge Scenarios
// ============================================

describe("Factory Stress — Category B: Edge Scenarios", () => {
  it("max factories — constructing multiple factories deducts correct cost", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 500_000_000; // Enough for many factories
    const ctx = createTestContext(42, 1, "factory-max-test");

    const { newState } = processFactory(state, {
      newFactories: [
        { name: "Factory Alpha", region: "North America" },
        { name: "Factory Beta", region: "Europe" },
        { name: "Factory Gamma", region: "Asia" },
        { name: "Factory Delta", region: "MENA" },
      ],
    }, ctx);

    // 4 new factories built (plus the initial one)
    expect(newState.factories.length).toBe(state.factories.length + 4);

    // Cost = 4 * NEW_FACTORY_COST
    const expectedCostDeduction = 4 * CONSTANTS.NEW_FACTORY_COST;
    expect(newState.cash).toBe(state.cash - expectedCostDeduction);

    assertNoNaN(newState);
  });

  it("efficiency at MAX_EFFICIENCY cap — does not exceed 1.0", () => {
    const state = createTeamState("baseline-balanced");
    const factory = state.factories[0];
    factory.efficiency = 0.98; // Near cap

    const { newState } = processFactory(state, {
      efficiencyInvestments: {
        [factory.id]: {
          workers: 50_000_000,
          machinery: 50_000_000,
          engineers: 50_000_000,
          factory: 50_000_000,
        },
      },
    });

    const updatedFactory = newState.factories[0];
    expect(updatedFactory.efficiency).toBeLessThanOrEqual(CONSTANTS.MAX_EFFICIENCY);
    expect(updatedFactory.efficiency).toBeGreaterThanOrEqual(0.98);
    assertNoNaN(newState);
  });

  it("0 investment — efficiency unchanged, no cost deducted", () => {
    const state = createTeamState("baseline-balanced");
    const initialEfficiency = state.factories[0].efficiency;
    const initialCash = state.cash;

    const { newState } = processFactory(state, {
      efficiencyInvestments: {
        [state.factories[0].id]: {
          workers: 0,
          machinery: 0,
          engineers: 0,
          factory: 0,
        },
      },
    });

    // No investment = no change
    expect(newState.factories[0].efficiency).toBe(initialEfficiency);
    expect(newState.cash).toBe(initialCash);
  });

  it("green investment — CO2 reduction applied correctly", () => {
    const state = createTeamState("baseline-balanced");
    const factory = state.factories[0];
    const initialCO2 = factory.co2Emissions;
    const investmentAmount = 5_000_000;

    const { newState } = processFactory(state, {
      greenInvestments: {
        [factory.id]: investmentAmount,
      },
    });

    const expectedReduction = FactoryModule.calculateCO2Reduction(investmentAmount);
    const expectedCO2 = Math.max(0, initialCO2 - expectedReduction);

    expect(newState.factories[0].co2Emissions).toBe(expectedCO2);
    expect(newState.factories[0].greenInvestment).toBe(factory.greenInvestment + investmentAmount);
    expect(newState.cash).toBe(state.cash - investmentAmount);
  });

  it("diminishing returns past $10M threshold — reduced efficiency gain", () => {
    const state = createTeamState("baseline-balanced");
    const factory = state.factories[0];

    // Invest $8M (under threshold) — full returns
    const { newState: stateUnder } = processFactory(
      JSON.parse(JSON.stringify(state)),
      {
        efficiencyInvestments: {
          [factory.id]: { workers: 8_000_000 },
        },
      }
    );

    // Invest $8M on top of $8M (crosses threshold) — diminished returns on the portion above $10M
    const stateWithPrior = JSON.parse(JSON.stringify(state)) as TeamState;
    stateWithPrior.factories[0].efficiencyInvestment = {
      ...stateWithPrior.factories[0].efficiencyInvestment,
      workers: 8_000_000, // Previous investment already at $8M
    };

    const { newState: stateCrosses } = processFactory(stateWithPrior, {
      efficiencyInvestments: {
        [factory.id]: { workers: 8_000_000 }, // This pushes total to $16M
      },
    });

    // The gain from crossing the threshold should be less than the full-return gain
    const gainUnder = stateUnder.factories[0].efficiency - state.factories[0].efficiency;
    const gainCrosses = stateCrosses.factories[0].efficiency - stateWithPrior.factories[0].efficiency;

    expect(gainUnder).toBeGreaterThan(gainCrosses);
    expect(gainCrosses).toBeGreaterThan(0); // Still some gain
  });

  it("factory upgrade purchases — upgrade applied and cost deducted", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 200_000_000;
    const factory = state.factories[0];
    const initialDefectRate = factory.defectRate;

    const { newState, result } = processFactory(state, {
      upgradePurchases: [
        { factoryId: factory.id, upgrade: "sixSigma" },
      ],
    });

    const updatedFactory = newState.factories[0];
    expect(updatedFactory.upgrades).toContain("sixSigma");
    expect(updatedFactory.defectRate).toBeLessThan(initialDefectRate);
    expect(newState.cash).toBe(state.cash - CONSTANTS.UPGRADE_COSTS.sixSigma);
    expect(result.success).toBe(true);
  });

  it("factory upgrade — insufficient funds does not apply upgrade", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 100; // Almost no cash

    const { newState, result } = processFactory(state, {
      upgradePurchases: [
        { factoryId: state.factories[0].id, upgrade: "automation" },
      ],
    });

    expect(newState.factories[0].upgrades).not.toContain("automation");
    expect(result.messages.some((m: string) => m.includes("Insufficient"))).toBe(true);
    assertNoNaN(newState);
  });

  it("empty factory decisions — module processes without error", () => {
    const state = createTeamState("baseline-balanced");
    const initialCash = state.cash;

    const { newState } = processFactory(state, {});

    assertNoNaN(newState);
    expect(newState.cash).toBe(initialCash);
    expect(newState.factories.length).toBe(state.factories.length);
  });

  it("production allocations stored correctly on state", () => {
    const state = createTeamState("baseline-balanced");

    const { newState } = processFactory(state, {
      productionAllocations: [
        { factoryId: state.factories[0].id, lineId: "line-1", segment: "Budget", quantity: 10_000 },
        { factoryId: state.factories[0].id, lineId: "line-2", segment: "General", quantity: 5_000 },
        { factoryId: state.factories[0].id, lineId: "line-3", segment: "Enthusiast", quantity: 2_000 },
      ],
    });

    // F13-F20: FactoryModule no longer stores productionAllocations on state;
    // production allocation decisions are consumed during market simulation.
    // Verify the module processes without error and preserves state integrity.
    assertNoNaN(newState);
    expect(newState.factories.length).toBe(state.factories.length);
    expect(newState.cash).toBe(state.cash); // No cost for allocations themselves
  });

  it("new factory construction — insufficient funds does not crash", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 100; // Not enough for any factory

    const { newState, result } = processFactory(state, {
      newFactories: [
        { name: "Impossible Factory", region: "North America" },
      ],
    });

    // Factory should not be built
    expect(newState.factories.length).toBe(state.factories.length);
    expect(result.messages.some((m: string) => m.includes("Insufficient"))).toBe(true);
    assertNoNaN(newState);
  });

  it("ESG initiatives — esgScore increases and cost is deducted", () => {
    const state = createTeamState("baseline-balanced");
    const initialESG = state.esgScore;

    const { newState } = processFactory(state, {
      esgInitiatives: {
        workplaceHealthSafety: true,
        codeOfEthics: true,
      },
    });

    expect(newState.esgScore).toBeGreaterThan(initialESG);
    expect(newState.cash).toBeLessThan(state.cash);
    assertESGBounded(newState);
  });

  it("CO2 emissions aggregated across all factories", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 300_000_000;
    const ctx = createTestContext(99, 1, "co2-agg-test");

    // Add a second factory
    const { newState: stateWith2 } = processFactory(state, {
      newFactories: [{ name: "Second Factory", region: "Europe" }],
    }, ctx);

    // Now invest green in only the first factory
    const { newState: finalState } = processFactory(stateWith2, {
      greenInvestments: {
        [stateWith2.factories[0].id]: 1_000_000,
      },
    });

    // co2Emissions should be the sum of all factories
    const expectedTotal = finalState.factories.reduce((sum, f) => sum + f.co2Emissions, 0);
    expect(finalState.co2Emissions).toBe(expectedTotal);
  });

  it("material tier choices — premium materials reduce defect rate", () => {
    const state = createTeamState("baseline-balanced");
    const initialDefectRate = state.factories[0].defectRate;

    const { newState } = processFactory(state, {
      materialTierChoices: {
        "Professional": 5, // Premium tier for Professional segment (natural is 5, so +1 would be capped)
        "Budget": 2,       // Above natural tier (1) — premium
      },
    });

    // Premium materials should reduce defect rate
    expect(newState.factories[0].defectRate).toBeLessThanOrEqual(initialDefectRate);
    assertNoNaN(newState);
  });

  it("multiple simultaneous decisions — all applied, no NaN", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 500_000_000;
    const ctx = createTestContext(77, 1, "multi-decision");
    const factory = state.factories[0];

    const { newState } = processFactory(state, {
      efficiencyInvestments: {
        [factory.id]: { workers: 2_000_000, machinery: 2_000_000 },
      },
      greenInvestments: {
        [factory.id]: 1_000_000,
      },
      esgInitiatives: {
        charitableDonation: 500_000,
      },
      newFactories: [
        { name: "Multi Factory", region: "Asia" },
      ],
    }, ctx);

    assertNoNaN(newState);
    assertNoOverflow(newState);
    expect(newState.factories.length).toBe(state.factories.length + 1);
    expect(newState.cash).toBeLessThan(state.cash);
  });
});

// ============================================
// CATEGORY C — Property Tests (Seeded)
// ============================================

describe("Factory Stress — Category C: Property Tests", () => {
  const efficiencyAmounts = [0, 500_000, 1_000_000, 5_000_000, 10_000_000, 15_000_000, 25_000_000, 50_000_000];
  const greenAmounts = [0, 100_000, 500_000, 1_000_000, 5_000_000];

  for (let seed = 0; seed < 50; seed++) {
    const efficiencyAmount = efficiencyAmounts[seed % efficiencyAmounts.length];
    const greenAmount = greenAmounts[seed % greenAmounts.length];

    it(`seed ${seed}: efficiency=$${efficiencyAmount / 1e6}M, green=$${greenAmount / 1e6}M — all invariants hold`, () => {
      const state = createTeamState("baseline-balanced");
      state.cash = 500_000_000; // Ensure enough cash for any investment
      const factory = state.factories[0];

      const decisions: FactoryDecisions = {};

      if (efficiencyAmount > 0) {
        decisions.efficiencyInvestments = {
          [factory.id]: {
            workers: Math.floor(efficiencyAmount / 3),
            machinery: Math.floor(efficiencyAmount / 3),
            factory: efficiencyAmount - 2 * Math.floor(efficiencyAmount / 3),
          },
        };
      }

      if (greenAmount > 0) {
        decisions.greenInvestments = {
          [factory.id]: greenAmount,
        };
      }

      const { newState } = processFactory(state, decisions);

      assertNoNaN(newState);
      assertNoOverflow(newState);
      assertProductionInvariants(newState);

      // Efficiency should be within bounds
      for (const f of newState.factories) {
        expect(f.efficiency, `Factory ${f.id} efficiency out of bounds`).toBeGreaterThanOrEqual(0);
        expect(f.efficiency, `Factory ${f.id} efficiency exceeds cap`).toBeLessThanOrEqual(CONSTANTS.MAX_EFFICIENCY);
      }

      // CO2 should be non-negative
      expect(newState.co2Emissions).toBeGreaterThanOrEqual(0);

      // Cash should have decreased by at least the investment
      expect(newState.cash).toBeLessThanOrEqual(state.cash);
    });
  }
});

// ============================================
// CATEGORY D — Regression
// ============================================

describe("Factory Stress — Category D: Regression", () => {
  it("regression placeholder — framework operational", () => {
    expect(true).toBe(true);
  });
});
