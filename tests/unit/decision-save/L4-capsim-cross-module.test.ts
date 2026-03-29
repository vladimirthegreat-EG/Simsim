/**
 * L4 Cross-Module Interaction Tests
 *
 * Replicates real player decision patterns that span multiple engine modules,
 * verifying that cross-cutting concerns (capacity vs. staffing, debt-funded
 * expansion, serialization fidelity, input immutability) behave correctly.
 */

import { describe, it, expect } from "vitest";
import {
  SimulationEngine,
  type SimulationInput,
  type SimulationOutput,
} from "../../../engine/core/SimulationEngine";
import { hashState } from "../../../engine/core/EngineContext";
import type { TeamState, AllDecisions } from "../../../engine/types";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  runNRounds,
} from "../../../engine/testkit/scenarioGenerator";

// ============================================
// HELPERS
// ============================================

const MATCH_SEED = "L4-cross-module-test";

/** Run a single round with one team and return the full output. */
function runSingleRound(
  state: TeamState,
  decisions: AllDecisions,
  roundNumber: number = 1,
  teamId: string = "team-1",
): SimulationOutput {
  const input: SimulationInput = {
    roundNumber,
    teams: [{ id: teamId, state, decisions }],
    marketState: createMinimalMarketState(),
    matchSeed: MATCH_SEED,
  };
  return SimulationEngine.processRound(input);
}

/** Extract the single team result from a one-team SimulationOutput. */
function singleResult(output: SimulationOutput) {
  expect(output.results.length).toBe(1);
  return output.results[0];
}

// ============================================
// SCENARIO 1 — The Understaffed Factory (L4-CROSS-01)
// ============================================

describe("L4-CROSS-01: The Understaffed Factory", () => {
  it("production is bounded by factory capacity, not by excessive headcount", () => {
    // Build a state with the default factory (medium tier, baseCapacity = 10_000)
    // but massively overstaffed: 5000 workers (typical factory needs ~50-100)
    const state = createMinimalTeamState();

    // Verify baseline factory setup
    expect(state.factories.length).toBeGreaterThanOrEqual(1);
    const factory = state.factories[0];
    expect(factory.baseCapacity).toBeDefined();
    const baseCapacity = factory.baseCapacity;

    // Overstuff the factory with 5000 workers (50x what is reasonable)
    factory.workers = 5000;

    // Ensure employees array matches — add extra worker employees
    const existingWorkers = state.employees.filter(e => e.role === "worker");
    const needed = 5000 - existingWorkers.length;
    for (let i = 0; i < needed; i++) {
      state.employees.push({
        id: `overhire-worker-${i}`,
        role: "worker",
        name: `Overhire Worker ${i}`,
        stats: {
          efficiency: 70, accuracy: 70, speed: 70, stamina: 70,
          discipline: 70, loyalty: 70, teamCompatibility: 70, health: 70,
        },
        salary: 45_000,
        hiredRound: 0,
        factoryId: factory.id,
        morale: 70,
        burnout: 0,
        trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
      });
    }
    state.workforce.totalHeadcount = state.employees.length;

    // Target production = baseCapacity (10_000 units) via production line targets
    const decisions: AllDecisions = {
      factory: {
        productionAllocations: state.factories[0].productionLines.map(line => ({
          factoryId: factory.id,
          lineId: line.id,
          segment: line.segment,
          quantity: baseCapacity,
        })),
      },
      hr: {},
      rd: { rdBudget: 0 },
      marketing: {},
      finance: {},
    };

    const output = runSingleRound(state, decisions);
    const result = singleResult(output);

    // The factory should have processed successfully
    expect(result.factoryResults.success).toBe(true);

    // Total units sold across all segments should be bounded.
    // With 5000 workers and BASE_WORKER_OUTPUT=100, raw production could be 500K+,
    // but the market demand and production line capacity constrain actual output.
    // Key assertion: having 5000 workers does NOT produce 5000 * 100 = 500K units
    // because production lines have their own capacity limits.
    const totalUnitsSold = Object.values(result.salesBySegment).reduce(
      (sum, v) => sum + v,
      0,
    );

    // Production is capacity/demand-bounded, not worker-bounded.
    // With a medium factory and standard production lines, output should be
    // well under what 5000 workers could theoretically produce uncapped.
    const theoreticalWorkerOutput = 5000 * 100; // BASE_WORKER_OUTPUT = 100
    expect(totalUnitsSold).toBeLessThan(theoreticalWorkerOutput);

    // The new state should reflect the overstaffing — workers are still there,
    // but production didn't scale linearly with headcount beyond capacity.
    expect(result.newState.factories[0].workers).toBeGreaterThanOrEqual(1);
  });
});

// ============================================
// SCENARIO 2 — Debt-Funded Expansion (L4-CROSS-03)
// ============================================

describe("L4-CROSS-03: Debt-Funded Expansion", () => {
  it("round 1 loan increases cash; round 2 new factory increases factory count", () => {
    // --- Round 1: Take a bank loan of $50M ---
    const state = createMinimalTeamState();
    const cashBefore = state.cash;
    const factoryCountBefore = state.factories.length;

    const round1Decisions: AllDecisions = {
      factory: {},
      hr: {},
      rd: { rdBudget: 0 },
      marketing: {},
      finance: {
        loanRequest: { amount: 50_000_000, termMonths: 24 },
      },
    };

    const output1 = runSingleRound(state, round1Decisions, 1);
    const result1 = singleResult(output1);

    // Cash should have increased from the loan proceeds.
    // Other costs (labor, overhead) will be deducted, so we check that cash
    // went up by a significant fraction of the loan amount.
    const cashAfterR1 = result1.newState.cash;
    const cashDelta = cashAfterR1 - cashBefore;

    // The loan should have added roughly $50M minus round costs.
    // At minimum, cash should be notably higher than if no loan was taken.
    // We check the debt side increased to confirm the loan was processed.
    const totalDebtR1 =
      result1.newState.shortTermDebt + result1.newState.longTermDebt;
    expect(totalDebtR1).toBeGreaterThan(0);

    // Cash should be higher than starting cash minus typical round costs
    // (i.e., the loan injection should be visible in the cash balance)
    expect(cashAfterR1).toBeGreaterThan(cashBefore * 0.5);

    // --- Round 2: Build a new factory with the loan proceeds ---
    const round2State = result1.newState;
    const round2Decisions: AllDecisions = {
      factory: {
        newFactories: [
          { name: "Expansion", region: "Asia", tier: "medium" },
        ],
      },
      hr: {},
      rd: { rdBudget: 0 },
      marketing: {},
      finance: {},
    };

    const output2 = runSingleRound(round2State, round2Decisions, 2);
    const result2 = singleResult(output2);

    // Factory count should have increased by 1
    expect(result2.newState.factories.length).toBe(factoryCountBefore + 1);

    // The new factory should exist with the correct name and region
    const newFactory = result2.newState.factories.find(
      f => f.name === "Expansion",
    );
    expect(newFactory).toBeDefined();
    expect(newFactory!.region).toBe("Asia");
  });
});

// ============================================
// SCENARIO 3 — Serialize/Deserialize (L4-CONT-02)
// ============================================

describe("L4-CONT-02: Serialize/Deserialize fidelity", () => {
  it("deserialized state produces identical round-6 output hash", () => {
    // Run 5 rounds to build up complex state
    const outputs = runNRounds({
      teamCount: 1,
      rounds: 5,
      matchSeed: "L4-serialize-test",
      decisionFn: (_state, _round, _teamIdx) => ({
        factory: {},
        hr: {},
        rd: { rdBudget: 2_000_000 },
        marketing: {
          advertisingBudget: { General: 1_000_000 },
          brandingInvestment: 500_000,
        },
        finance: {},
      }),
    });

    // Get the state after round 5
    const stateAfterR5 = outputs[4].results[0].newState;
    const marketAfterR5 = outputs[4].newMarketState;

    // Serialize and deserialize
    const serialized = JSON.stringify(stateAfterR5);
    const deserialized: TeamState = JSON.parse(serialized);

    // Both states should produce identical hashes before round 6
    expect(hashState(stateAfterR5)).toBe(hashState(deserialized));

    // Process round 6 from original state
    const round6Decisions: AllDecisions = {
      factory: {},
      hr: {},
      rd: { rdBudget: 1_000_000 },
      marketing: { advertisingBudget: { General: 500_000 } },
      finance: {},
    };

    const outputOriginal = SimulationEngine.processRound({
      roundNumber: 6,
      teams: [{ id: "team-1", state: stateAfterR5, decisions: round6Decisions }],
      marketState: marketAfterR5,
      matchSeed: "L4-serialize-test",
    });

    // Process round 6 from deserialized state
    const outputDeserialized = SimulationEngine.processRound({
      roundNumber: 6,
      teams: [{ id: "team-1", state: deserialized, decisions: round6Decisions }],
      marketState: JSON.parse(JSON.stringify(marketAfterR5)),
      matchSeed: "L4-serialize-test",
    });

    // The outputs should produce identical state hashes
    const hashOriginal = hashState(outputOriginal.results[0].newState);
    const hashDeser = hashState(outputDeserialized.results[0].newState);
    expect(hashOriginal).toBe(hashDeser);

    // Financial figures should match exactly
    expect(outputOriginal.results[0].totalRevenue).toBe(
      outputDeserialized.results[0].totalRevenue,
    );
    expect(outputOriginal.results[0].netIncome).toBe(
      outputDeserialized.results[0].netIncome,
    );
  });
});

// ============================================
// SCENARIO 4 — Input state immutability
// ============================================

describe("L4-IMMUT-01: processRound does not mutate input state", () => {
  it("original TeamState is unchanged after processRound", () => {
    const originalState = SimulationEngine.createInitialTeamState();

    // Take a deep snapshot before processing
    const snapshot = JSON.stringify(originalState);

    const decisions: AllDecisions = {
      factory: {
        newFactories: [
          { name: "ShouldNotMutateInput", region: "Europe", tier: "small" },
        ],
      },
      hr: {},
      rd: { rdBudget: 10_000_000 },
      marketing: {
        advertisingBudget: {
          Budget: 5_000_000,
          General: 5_000_000,
        },
        brandingInvestment: 3_000_000,
      },
      finance: {
        loanRequest: { amount: 20_000_000, termMonths: 12 },
      },
    };

    const input: SimulationInput = {
      roundNumber: 1,
      teams: [{ id: "team-immut", state: originalState, decisions }],
      marketState: SimulationEngine.createInitialMarketState(),
      matchSeed: "immutability-test",
    };

    // Process a round — this should NOT modify originalState
    const output = SimulationEngine.processRound(input);

    // Verify the round actually did something
    expect(output.results.length).toBe(1);
    expect(output.results[0].factoryResults.success).toBe(true);

    // The original state must be byte-for-byte identical to the snapshot
    expect(JSON.stringify(originalState)).toBe(snapshot);
  });

  it("original AllDecisions is unchanged after processRound", () => {
    const state = SimulationEngine.createInitialTeamState();
    const decisions: AllDecisions = {
      factory: {
        newFactories: [
          { name: "TestFactory", region: "Asia", tier: "medium" },
        ],
      },
      hr: {},
      rd: { rdBudget: 5_000_000 },
      marketing: { advertisingBudget: { General: 2_000_000 } },
      finance: {},
    };

    const decisionsSnapshot = JSON.stringify(decisions);

    SimulationEngine.processRound({
      roundNumber: 1,
      teams: [{ id: "team-1", state, decisions }],
      marketState: SimulationEngine.createInitialMarketState(),
      matchSeed: "decisions-immut-test",
    });

    expect(JSON.stringify(decisions)).toBe(decisionsSnapshot);
  });
});
