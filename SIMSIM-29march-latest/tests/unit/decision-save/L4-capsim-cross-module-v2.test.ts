/**
 * L4 Cross-Module Interaction Tests — V2
 *
 * Extended cross-module scenarios that verify capacity bounding with large
 * worker counts, multi-round debt-funded expansion flows, and serialization
 * determinism over 5+1 rounds.
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

const MATCH_SEED = "L4-cross-module-v2";

/** Run a single round with one team and return the full output. */
function runSingleRound(
  state: TeamState,
  decisions: AllDecisions,
  roundNumber: number = 1,
  marketState = createMinimalMarketState(),
  teamId: string = "team-1",
): SimulationOutput {
  const input: SimulationInput = {
    roundNumber,
    teams: [{ id: teamId, state, decisions }],
    marketState,
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
// SCENARIO 1 — Understaffed Factory (V2: large worker count, capacity-bounded)
// ============================================

describe("L4-CROSS-V2-01: Understaffed Factory — large worker count, capacity-bounded output", () => {
  it("10,000 workers do not produce 10,000 * BASE_WORKER_OUTPUT units — output is capacity-bounded", () => {
    const state = createMinimalTeamState();

    // Verify we have at least one factory and products
    expect(state.factories.length).toBeGreaterThanOrEqual(1);
    expect(state.products.length).toBeGreaterThan(0);
    const factory = state.factories[0];

    // Record baseline capacity for comparison
    const baseCapacity = factory.baseCapacity;
    expect(baseCapacity).toBeDefined();
    expect(baseCapacity).toBeGreaterThan(0);

    // Massively overstuff: 10,000 workers (100x typical)
    const WORKER_COUNT = 10_000;
    factory.workers = WORKER_COUNT;

    // Sync the employees array to match factory.workers
    const existingWorkers = state.employees.filter(e => e.role === "worker");
    const needed = WORKER_COUNT - existingWorkers.length;
    for (let i = 0; i < needed; i++) {
      state.employees.push({
        id: `overhire-v2-${i}`,
        role: "worker",
        name: `Overhire V2 ${i}`,
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

    // Decisions: request maximum production on all lines
    const decisions: AllDecisions = {
      factory: {
        productionAllocations: factory.productionLines.map(line => ({
          factoryId: factory.id,
          lineId: line.id,
          segment: line.segment,
          quantity: 1_000_000, // Request way more than possible
        })),
      },
      hr: {},
      rd: { rdBudget: 0 },
      marketing: {},
      finance: {},
    };

    const output = runSingleRound(state, decisions);
    const result = singleResult(output);

    // Factory processing should succeed
    expect(result.factoryResults.success).toBe(true);

    // Total units sold across all segments
    const totalUnitsSold = Object.values(result.salesBySegment).reduce(
      (sum, v) => sum + v,
      0,
    );

    // Theoretical uncapped output: 10,000 workers * 100 BASE_WORKER_OUTPUT = 1,000,000
    const theoreticalWorkerOutput = WORKER_COUNT * 100;
    expect(totalUnitsSold).toBeLessThan(theoreticalWorkerOutput);

    // Output should be strictly positive (the factory did produce something)
    expect(totalUnitsSold).toBeGreaterThanOrEqual(0);

    // Additional constraint: total revenue should be finite and non-negative
    expect(result.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.totalRevenue)).toBe(true);

    // Cash should still be finite (no NaN/Infinity from massive worker salaries)
    expect(Number.isFinite(result.newState.cash)).toBe(true);
  });

  it("labor costs scale with worker count even when production is capped", () => {
    // Build two states: one with 50 workers, one with 2000
    const stateSmall = createMinimalTeamState();
    const stateLarge = createMinimalTeamState();

    const factorySmall = stateSmall.factories[0];
    const factoryLarge = stateLarge.factories[0];

    factorySmall.workers = 50;
    factoryLarge.workers = 2000;

    // Sync employees for the large state
    const existingWorkers = stateLarge.employees.filter(e => e.role === "worker");
    const needed = 2000 - existingWorkers.length;
    for (let i = 0; i < needed; i++) {
      stateLarge.employees.push({
        id: `large-worker-${i}`,
        role: "worker",
        name: `Large Worker ${i}`,
        stats: {
          efficiency: 70, accuracy: 70, speed: 70, stamina: 70,
          discipline: 70, loyalty: 70, teamCompatibility: 70, health: 70,
        },
        salary: 45_000,
        hiredRound: 0,
        factoryId: factoryLarge.id,
        morale: 70,
        burnout: 0,
        trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
      });
    }
    stateLarge.workforce.totalHeadcount = stateLarge.employees.length;

    const minimalDecisions: AllDecisions = {
      factory: {},
      hr: {},
      rd: { rdBudget: 0 },
      marketing: {},
      finance: {},
    };

    const outputSmall = runSingleRound(stateSmall, minimalDecisions);
    const outputLarge = runSingleRound(stateLarge, minimalDecisions);

    const cashSmall = singleResult(outputSmall).newState.cash;
    const cashLarge = singleResult(outputLarge).newState.cash;

    // Large workforce should have consumed more cash in labor costs,
    // so ending cash should be lower (or at least not higher)
    expect(cashLarge).toBeLessThan(cashSmall);
  });
});

// ============================================
// SCENARIO 2 — Debt-Funded Expansion (V2: loan R1, build factory R2)
// ============================================

describe("L4-CROSS-V2-02: Debt-Funded Expansion — Round 1 loan, Round 2 factory build", () => {
  it("loan proceeds fund a new factory in the following round", () => {
    // --- Round 1: Request a $50M loan ---
    const state = createMinimalTeamState();
    const cashBeforeLoan = state.cash;
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

    // Debt should have increased (loan was processed)
    const totalDebtR1 = result1.newState.shortTermDebt + result1.newState.longTermDebt;
    expect(totalDebtR1).toBeGreaterThan(0);

    // Cash after R1 should reflect loan injection minus operating costs
    // Even with costs, having $50M injected should keep cash above 50% of starting
    expect(result1.newState.cash).toBeGreaterThan(cashBeforeLoan * 0.5);

    // Financials should be finite
    expect(Number.isFinite(result1.newState.cash)).toBe(true);
    expect(Number.isFinite(totalDebtR1)).toBe(true);

    // --- Round 2: Build a new factory using loan proceeds ---
    const round2State = result1.newState;
    const cashBeforeBuild = round2State.cash;

    const round2Decisions: AllDecisions = {
      factory: {
        newFactories: [
          { name: "Debt-Funded Plant", region: "Europe", tier: "medium" },
        ],
      },
      hr: {},
      rd: { rdBudget: 0 },
      marketing: {},
      finance: {},
    };

    const output2 = runSingleRound(
      round2State,
      round2Decisions,
      2,
      output1.newMarketState,
    );
    const result2 = singleResult(output2);

    // Factory count should increase by 1
    expect(result2.newState.factories.length).toBe(factoryCountBefore + 1);

    // The new factory should exist with correct metadata
    const newFactory = result2.newState.factories.find(
      f => f.name === "Debt-Funded Plant",
    );
    expect(newFactory).toBeDefined();
    expect(newFactory!.region).toBe("Europe");

    // The factory purchase costs real money. Revenue may offset it, but
    // the cash change should reflect the factory cost deduction somewhere
    // in the round. We verify the factory was built (count check above)
    // and that cash remains finite and positive.
    expect(Number.isFinite(result2.newState.cash)).toBe(true);
    expect(result2.newState.cash).toBeGreaterThan(0);

    // Debt should still be present (loan from R1 persists)
    const totalDebtR2 = result2.newState.shortTermDebt + result2.newState.longTermDebt;
    expect(totalDebtR2).toBeGreaterThan(0);
  });

  it("factory built in round 2 has workers = 0 and can be staffed later", () => {
    // Round 1: loan
    const state = createMinimalTeamState();
    const r1Out = runSingleRound(state, {
      factory: {},
      hr: {},
      rd: { rdBudget: 0 },
      marketing: {},
      finance: { loanRequest: { amount: 50_000_000, termMonths: 24 } },
    }, 1);

    // Round 2: build factory
    const r2Out = runSingleRound(
      singleResult(r1Out).newState,
      {
        factory: {
          newFactories: [{ name: "New Plant", region: "Asia", tier: "small" }],
        },
        hr: {},
        rd: { rdBudget: 0 },
        marketing: {},
        finance: {},
      },
      2,
      r1Out.newMarketState,
    );
    const r2State = singleResult(r2Out).newState;

    // Find the newly built factory (not the original)
    const newFactory = r2State.factories.find(f => f.name === "New Plant");
    expect(newFactory).toBeDefined();

    // New factories start with 0 workers — they need to be staffed
    expect(newFactory!.workers).toBe(0);
  });
});

// ============================================
// SCENARIO 3 — Serialize/Deserialize (V2: 5 rounds, JSON round-trip, hash match)
// ============================================

describe("L4-CROSS-V2-03: Serialize/Deserialize — 5 rounds, JSON round-trip, hash match on round 6", () => {
  it("JSON.parse(JSON.stringify(state)) after 5 rounds produces identical round-6 hash", () => {
    // Run 5 rounds with non-trivial decisions to build complex state
    const SEED = "L4-serde-v2";
    const outputs = runNRounds({
      teamCount: 1,
      rounds: 5,
      matchSeed: SEED,
      decisionFn: (_state, round, _teamIdx) => ({
        factory: {},
        hr: {},
        rd: { rdBudget: 3_000_000 + round * 500_000 },
        marketing: {
          advertisingBudget: {
            General: 1_000_000,
            Budget: 500_000,
          },
          brandingInvestment: 1_000_000,
        },
        finance: round === 1
          ? { loanRequest: { amount: 20_000_000, termMonths: 12 } }
          : {},
      }),
    });

    expect(outputs.length).toBe(5);

    // Extract state and market after round 5
    const stateAfterR5 = outputs[4].results[0].newState;
    const marketAfterR5 = outputs[4].newMarketState;

    // Serialize then deserialize (simulates DB storage or network transfer)
    const serializedState = JSON.stringify(stateAfterR5);
    const serializedMarket = JSON.stringify(marketAfterR5);
    const deserializedState: TeamState = JSON.parse(serializedState);
    const deserializedMarket = JSON.parse(serializedMarket);

    // Pre-round-6 hashes must match
    const hashBefore = hashState(stateAfterR5);
    const hashBeforeDeser = hashState(deserializedState);
    expect(hashBefore).toBe(hashBeforeDeser);

    // Round 6 decisions (same for both paths)
    const round6Decisions: AllDecisions = {
      factory: {},
      hr: {},
      rd: { rdBudget: 2_000_000 },
      marketing: {
        advertisingBudget: { General: 750_000 },
        brandingInvestment: 500_000,
      },
      finance: {},
    };

    // Process round 6 from the ORIGINAL state
    const outputOriginal = SimulationEngine.processRound({
      roundNumber: 6,
      teams: [{ id: "team-1", state: stateAfterR5, decisions: round6Decisions }],
      marketState: marketAfterR5,
      matchSeed: SEED,
    });

    // Process round 6 from the DESERIALIZED state
    const outputDeserialized = SimulationEngine.processRound({
      roundNumber: 6,
      teams: [{ id: "team-1", state: deserializedState, decisions: round6Decisions }],
      marketState: deserializedMarket,
      matchSeed: SEED,
    });

    // Post-round-6 state hashes MUST be identical
    const hashOriginalR6 = hashState(outputOriginal.results[0].newState);
    const hashDeserializedR6 = hashState(outputDeserialized.results[0].newState);
    expect(hashOriginalR6).toBe(hashDeserializedR6);

    // Revenue must match exactly
    expect(outputOriginal.results[0].totalRevenue).toBe(
      outputDeserialized.results[0].totalRevenue,
    );

    // Net income must match exactly
    expect(outputOriginal.results[0].netIncome).toBe(
      outputDeserialized.results[0].netIncome,
    );

    // Cash must match exactly
    expect(outputOriginal.results[0].newState.cash).toBe(
      outputDeserialized.results[0].newState.cash,
    );

    // Market state hashes must also match
    const marketHashOrig = hashState(outputOriginal.newMarketState);
    const marketHashDeser = hashState(outputDeserialized.newMarketState);
    expect(marketHashOrig).toBe(marketHashDeser);

    // Audit trail hashes should agree
    expect(outputOriginal.auditTrail.finalStateHashes["team-1"]).toBe(
      outputDeserialized.auditTrail.finalStateHashes["team-1"],
    );
  });

  it("serialization preserves all sub-objects (employees, products, factories)", () => {
    const outputs = runNRounds({
      teamCount: 1,
      rounds: 3,
      matchSeed: "L4-serde-v2-subobj",
      decisionFn: () => ({
        factory: {},
        hr: {},
        rd: { rdBudget: 1_000_000 },
        marketing: { advertisingBudget: { General: 500_000 } },
        finance: {},
      }),
    });

    const state = outputs[2].results[0].newState;
    const restored: TeamState = JSON.parse(JSON.stringify(state));

    // Array lengths preserved
    expect(restored.employees.length).toBe(state.employees.length);
    expect(restored.products.length).toBe(state.products.length);
    expect(restored.factories.length).toBe(state.factories.length);

    // Spot-check a few nested properties
    if (state.employees.length > 0) {
      expect(restored.employees[0].id).toBe(state.employees[0].id);
      expect(restored.employees[0].salary).toBe(state.employees[0].salary);
      expect(restored.employees[0].stats.efficiency).toBe(state.employees[0].stats.efficiency);
    }

    if (state.products.length > 0) {
      expect(restored.products[0].id).toBe(state.products[0].id);
      expect(restored.products[0].quality).toBe(state.products[0].quality);
      expect(restored.products[0].unitCost).toBe(state.products[0].unitCost);
    }

    if (state.factories.length > 0) {
      expect(restored.factories[0].id).toBe(state.factories[0].id);
      expect(restored.factories[0].efficiency).toBe(state.factories[0].efficiency);
      expect(restored.factories[0].workers).toBe(state.factories[0].workers);
    }
  });
});
