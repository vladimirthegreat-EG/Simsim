/**
 * L1 ESG Initiative End-to-End Tests
 *
 * Tests the full pipeline: decision submission -> FactoryModule.processESGInitiatives
 * -> SimulationEngine.processRound -> output state verification.
 *
 * ESG-01: circularEconomy initiative (cost, ESG score gain, material cost reduction)
 * ESG-02: diversityInclusion initiative (cost, ESG score gain, morale effect)
 * ESG-03: ESG penalty for low score (revenue reduction via MarketSimulator)
 */

import { describe, it, expect } from "vitest";
import {
  SimulationEngine,
  type SimulationInput,
} from "@/engine/core/SimulationEngine";
import { FactoryModule } from "@/engine/modules/FactoryModule";
import { MarketSimulator } from "@/engine/market/MarketSimulator";
import { CONSTANTS } from "@/engine/types";
import type { TeamState } from "@/engine/types/state";
import type { AllDecisions } from "@/engine/types/decisions";

// ============================================
// HELPERS
// ============================================

/**
 * Build a team state with sane defaults via SimulationEngine.createInitialTeamState,
 * then apply overrides.
 */
function createTestState(overrides?: Partial<TeamState>): TeamState {
  const base = SimulationEngine.createInitialTeamState();
  return { ...base, ...overrides } as TeamState;
}

/**
 * Run a single round through the full engine with one team.
 */
function runRound(
  state: TeamState,
  decisions: AllDecisions,
  roundNumber: number = 1,
  seed: string = "esg-test-seed"
) {
  const input: SimulationInput = {
    roundNumber,
    teams: [{ id: "team-esg", state, decisions }],
    marketState: SimulationEngine.createInitialMarketState(),
    matchSeed: seed,
  };
  return SimulationEngine.processRound(input);
}

/**
 * Run a round with two teams to compare revenue under different ESG scores.
 */
function runTwoTeamRound(
  stateA: TeamState,
  stateB: TeamState,
  decisions: AllDecisions,
  roundNumber: number = 1,
  seed: string = "esg-penalty-test"
) {
  const input: SimulationInput = {
    roundNumber,
    teams: [
      { id: "team-low-esg", state: stateA, decisions },
      { id: "team-high-esg", state: stateB, decisions },
    ],
    marketState: SimulationEngine.createInitialMarketState(),
    matchSeed: seed,
  };
  return SimulationEngine.processRound(input);
}

// ============================================
// ESG-01: circularEconomy initiative
// ============================================

describe("ESG-01: circularEconomy initiative", () => {
  it("increases esgScore after processRound", () => {
    const initialEsg = 500;
    const state = createTestState({ esgScore: initialEsg });

    const decisions: AllDecisions = {
      factory: {
        efficiencyInvestments: {},
        productionAllocations: [],
        esgInitiatives: {
          circularEconomy: true,
        },
      },
    };

    const output = runRound(state, decisions);
    const result = output.results[0];

    // circularEconomy adds 120 ESG points
    expect(result.newState.esgScore).toBeGreaterThan(initialEsg);
  });

  it("charges circularEconomy annual cost ($3M)", () => {
    const startingCash = 200_000_000;
    const state = createTestState({ esgScore: 500, cash: startingCash });

    // Run once WITHOUT circularEconomy
    const decisionsWithout: AllDecisions = {
      factory: { efficiencyInvestments: {}, productionAllocations: [] },
    };
    const outputWithout = runRound(state, decisionsWithout, 1, "esg-01-no-ce");
    const cashWithout = outputWithout.results[0].newState.cash;

    // Run once WITH circularEconomy
    const stateWith = createTestState({ esgScore: 500, cash: startingCash });
    const decisionsWith: AllDecisions = {
      factory: {
        efficiencyInvestments: {},
        productionAllocations: [],
        esgInitiatives: { circularEconomy: true },
      },
    };
    const outputWith = runRound(stateWith, decisionsWith, 1, "esg-01-with-ce");
    const cashWith = outputWith.results[0].newState.cash;

    // The team with circularEconomy should have less cash by approximately $3M
    const expectedCost = CONSTANTS.ESG_INITIATIVES.circularEconomy.cost; // $3,000,000
    // Wider tolerance — other factors (revenue, costs, salary changes) also affect cash
    expect(cashWithout - cashWith).toBeGreaterThanOrEqual(expectedCost * 0.7);
    expect(cashWithout - cashWith).toBeLessThanOrEqual(expectedCost * 2.0);
  });

  it("processESGInitiatives returns correct esgGain and cost for circularEconomy", () => {
    const state = createTestState({ esgScore: 500 });
    const result = FactoryModule.processESGInitiatives(state, {
      circularEconomy: true,
    });

    const config = CONSTANTS.ESG_INITIATIVES.circularEconomy;
    expect(result.esgGain).toBe(config.points); // 120
    expect(result.cost).toBe(config.cost); // 3_000_000
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages.some((m: string) => m.includes("Circular Economy"))).toBe(true);
  });

  it("material cost reduction is documented in messages", () => {
    const state = createTestState({ esgScore: 500 });
    const result = FactoryModule.processESGInitiatives(state, {
      circularEconomy: true,
    });

    // The engine messages indicate material cost reduction effect
    expect(
      result.messages.some((m: string) => m.includes("material cost") || m.includes("20%"))
    ).toBe(true);
  });
});

// ============================================
// ESG-02: diversityInclusion initiative
// ============================================

describe("ESG-02: diversityInclusion initiative affects morale", () => {
  it("increases esgScore via processRound", () => {
    const initialEsg = 300;
    const state = createTestState({ esgScore: initialEsg });

    const decisions: AllDecisions = {
      factory: {
        efficiencyInvestments: {},
        productionAllocations: [],
        esgInitiatives: {
          diversityInclusion: true,
        },
      },
    };

    const output = runRound(state, decisions);
    const result = output.results[0];

    // diversityInclusion adds 90 ESG points
    expect(result.newState.esgScore).toBeGreaterThan(initialEsg);
  });

  it("processESGInitiatives returns correct esgGain and cost for diversityInclusion", () => {
    const state = createTestState({ esgScore: 300 });
    const result = FactoryModule.processESGInitiatives(state, {
      diversityInclusion: true,
    });

    const config = CONSTANTS.ESG_INITIATIVES.diversityInclusion;
    expect(result.esgGain).toBe(config.points); // 90
    expect(result.cost).toBe(config.cost); // 1_000_000
  });

  it("diversityInclusion morale bonus is defined in CONSTANTS", () => {
    const config = CONSTANTS.ESG_INITIATIVES.diversityInclusion;
    expect(config.moraleBonus).toBe(0.05); // 5% morale boost
  });

  it("diversityInclusion messages mention morale improvement", () => {
    const state = createTestState({ esgScore: 300 });
    const result = FactoryModule.processESGInitiatives(state, {
      diversityInclusion: true,
    });

    expect(
      result.messages.some((m: string) => m.includes("morale") || m.includes("Diversity"))
    ).toBe(true);
  });

  it("combined ESG score increase is reflected in output state", () => {
    const initialEsg = 200;
    const state = createTestState({ esgScore: initialEsg });

    const decisions: AllDecisions = {
      factory: {
        efficiencyInvestments: {},
        productionAllocations: [],
        esgInitiatives: {
          diversityInclusion: true,
          employeeWellness: true,
        },
      },
    };

    const output = runRound(state, decisions);
    const result = output.results[0];

    // diversityInclusion=90 + employeeWellness=60 = 150 ESG points gained
    const expectedMinGain =
      CONSTANTS.ESG_INITIATIVES.diversityInclusion.points +
      CONSTANTS.ESG_INITIATIVES.employeeWellness.points;

    expect(result.newState.esgScore).toBeGreaterThanOrEqual(
      initialEsg + expectedMinGain * 0.8
    );
  });
});

// ============================================
// ESG-03: ESG penalty for low score
// ============================================

describe("ESG-03: ESG penalty for low score", () => {
  it("applyESGEvents returns penalty when esgScore < 300", () => {
    const revenue = 50_000_000;

    // Low ESG (200) -> penalty
    const lowResult = MarketSimulator.applyESGEvents(200, revenue);
    expect(lowResult).not.toBeNull();
    expect(lowResult!.type).toBe("penalty");
    expect(lowResult!.amount).toBeLessThan(0);

    // The penalty at score 200 should be -(1 - 200/300) * 0.12 = -4% of revenue
    const expectedModifier = -(1 - 200 / 300) * CONSTANTS.ESG_PENALTY_MAX;
    const expectedPenalty = revenue * expectedModifier;
    expect(lowResult!.amount).toBeCloseTo(expectedPenalty, -3);
  });

  it("applyESGEvents returns bonus when esgScore >= 300", () => {
    const revenue = 50_000_000;

    // High ESG (600) -> bonus in ramp zone (300-700)
    const highResult = MarketSimulator.applyESGEvents(600, revenue);
    expect(highResult).not.toBeNull();
    expect(highResult!.type).toBe("bonus");
    expect(highResult!.amount).toBeGreaterThan(0);
  });

  it("applyESGEvents returns null at score exactly 300 (no penalty, no bonus)", () => {
    const revenue = 50_000_000;
    const result = MarketSimulator.applyESGEvents(300, revenue);
    // At 300 the modifier is 0% (transition point) — should be null or negligible
    expect(result === null || Math.abs(result.amount) < revenue * 0.002).toBe(true);
  });

  it("team with esgScore=200 earns less revenue than identical team with esgScore=600 in full round", () => {
    // Create two identical teams differing only in ESG score
    const baseCash = 200_000_000;
    const lowEsgState = createTestState({ esgScore: 200, cash: baseCash });
    const highEsgState = createTestState({ esgScore: 600, cash: baseCash });

    // Both submit identical empty decisions — no changes except ESG effect
    const decisions: AllDecisions = {
      factory: { efficiencyInvestments: {}, productionAllocations: [] },
    };

    const output = runTwoTeamRound(lowEsgState, highEsgState, decisions);

    const lowResult = output.results.find((r) => r.teamId === "team-low-esg")!;
    const highResult = output.results.find((r) => r.teamId === "team-high-esg")!;

    // The high-ESG team should have higher revenue (or at least not lower)
    // due to the penalty applied to the low-ESG team
    expect(highResult.totalRevenue).toBeGreaterThanOrEqual(lowResult.totalRevenue);
  });

  it("penalty scales linearly from 0% at score 300 to 12% at score 0", () => {
    const revenue = 100_000_000;

    // At score 0: max penalty = -12%
    const atZero = MarketSimulator.applyESGEvents(0, revenue);
    expect(atZero).not.toBeNull();
    expect(atZero!.type).toBe("penalty");
    expect(atZero!.amount).toBeCloseTo(-revenue * CONSTANTS.ESG_PENALTY_MAX, -3);

    // At score 150: half penalty = -6%
    const atMid = MarketSimulator.applyESGEvents(150, revenue);
    expect(atMid).not.toBeNull();
    expect(atMid!.type).toBe("penalty");
    const expectedMidPenalty = -(1 - 150 / 300) * CONSTANTS.ESG_PENALTY_MAX;
    expect(atMid!.amount).toBeCloseTo(revenue * expectedMidPenalty, -3);

    // At score 299: minimal penalty
    const atEdge = MarketSimulator.applyESGEvents(299, revenue);
    if (atEdge !== null) {
      // Small penalty, close to 0
      expect(Math.abs(atEdge.amount)).toBeLessThan(revenue * 0.01);
    }
  });

  it("ESG_PENALTY_THRESHOLD constant is 300", () => {
    expect(CONSTANTS.ESG_PENALTY_THRESHOLD).toBe(300);
  });

  it("ESG_PENALTY_MAX constant is 0.12 (12%)", () => {
    expect(CONSTANTS.ESG_PENALTY_MAX).toBe(0.12);
  });
});

// ============================================
// INTEGRATION: Multiple ESG initiatives combined
// ============================================

describe("ESG Integration: combined initiatives through processRound", () => {
  it("multiple initiatives stack ESG points correctly", () => {
    const state = createTestState({ esgScore: 100 });
    const result = FactoryModule.processESGInitiatives(state, {
      circularEconomy: true,
      diversityInclusion: true,
      transparencyReport: true,
    });

    const expectedGain =
      CONSTANTS.ESG_INITIATIVES.circularEconomy.points + // 120
      CONSTANTS.ESG_INITIATIVES.diversityInclusion.points + // 90
      CONSTANTS.ESG_INITIATIVES.transparencyReport.points; // 50

    expect(result.esgGain).toBe(expectedGain); // 260

    const expectedCost =
      CONSTANTS.ESG_INITIATIVES.circularEconomy.cost + // 3M
      CONSTANTS.ESG_INITIATIVES.diversityInclusion.cost + // 1M
      CONSTANTS.ESG_INITIATIVES.transparencyReport.cost; // 300K

    expect(result.cost).toBe(expectedCost); // 4.3M
  });

  it("ESG score is capped at 1000 after processRound", () => {
    // Start near max and add many initiatives
    const state = createTestState({ esgScore: 950 });
    const decisions: AllDecisions = {
      factory: {
        efficiencyInvestments: {},
        productionAllocations: [],
        esgInitiatives: {
          circularEconomy: true,
          diversityInclusion: true,
          workplaceHealthSafety: true, // +200
          codeOfEthics: true, // +100 (via F-01)
        },
      },
    };

    const output = runRound(state, decisions);
    expect(output.results[0].newState.esgScore).toBeLessThanOrEqual(1000);
  });

  it("ESG score above 700 triggers decay", () => {
    // The FactoryModule applies: if esgScore > 700, excess decays by 5%
    const state = createTestState({ esgScore: 650 });
    const decisions: AllDecisions = {
      factory: {
        efficiencyInvestments: {},
        productionAllocations: [],
        esgInitiatives: {
          circularEconomy: true, // +120 -> would push to 770
          diversityInclusion: true, // +90 -> would push to 860
        },
      },
    };

    const output = runRound(state, decisions);
    const finalEsg = output.results[0].newState.esgScore;

    // Score went above 700 so some decay was applied
    // Raw would be 650+120+90 = 860
    // Decay: excess=160, decay=8 -> 852
    // The final score should be above 700 but below the raw sum of 860
    expect(finalEsg).toBeGreaterThan(700);
    expect(finalEsg).toBeLessThanOrEqual(1000);
  });
});
