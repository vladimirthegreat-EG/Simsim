/**
 * L4: State Immutability & Cross-Team Isolation Tests
 *
 * Verifies that:
 * 1. processRound does NOT mutate input TeamState (cash, factories.length)
 * 2. Cross-team data is isolated (no teamA data leaks into teamB output)
 * 3. ProductionLine assignment decisions flow through correctly
 * 4. Warehouse build decisions create the expected warehouse in output state
 */
import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../../../engine/core/SimulationEngine";
import type { SimulationInput } from "../../../engine/core/SimulationEngine";
import type { AllDecisions } from "../../../engine/types/decisions";
import type { TeamState } from "../../../engine/types/state";
import type { MarketState } from "../../../engine/types/market";
import {
  createMinimalTeamState,
  createMinimalMarketState,
} from "../../../engine/testkit/scenarioGenerator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: {
  teams: SimulationInput["teams"];
  marketState?: MarketState;
  roundNumber?: number;
  matchSeed?: string;
}): SimulationInput {
  return {
    roundNumber: overrides.roundNumber ?? 1,
    teams: overrides.teams,
    marketState: overrides.marketState ?? createMinimalMarketState(),
    matchSeed: overrides.matchSeed ?? "test-isolation",
  };
}

// ---------------------------------------------------------------------------
// Test 1 — Input state immutability
// ---------------------------------------------------------------------------

describe("L4: Input state immutability", () => {
  it("processRound must NOT mutate the original TeamState (cash, factories.length)", () => {
    const state = SimulationEngine.createInitialTeamState();

    // Snapshot values BEFORE processing
    const originalCash = state.cash;
    const originalFactories = state.factories.length;

    const input = makeInput({
      teams: [{ id: "t1", state, decisions: {} }],
      matchSeed: "immut",
    });

    SimulationEngine.processRound(input);

    // The input state MUST remain unchanged
    expect(state.cash).toBe(originalCash);
    expect(state.factories.length).toBe(originalFactories);
  });

  it("processRound must NOT mutate products array length", () => {
    const state = SimulationEngine.createInitialTeamState();
    const originalProductsLength = state.products.length;

    SimulationEngine.processRound(
      makeInput({
        teams: [{ id: "t1", state, decisions: {} }],
        matchSeed: "immut-products",
      }),
    );

    expect(state.products.length).toBe(originalProductsLength);
  });

  it("processRound must NOT mutate employees array length", () => {
    const state = SimulationEngine.createInitialTeamState();
    const originalEmployeesLength = state.employees.length;

    SimulationEngine.processRound(
      makeInput({
        teams: [{ id: "t1", state, decisions: {} }],
        matchSeed: "immut-employees",
      }),
    );

    expect(state.employees.length).toBe(originalEmployeesLength);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Cross-team isolation
// ---------------------------------------------------------------------------

describe("L4: Cross-team isolation", () => {
  it("teamA output must not contain any teamB-specific data", () => {
    const stateA = createMinimalTeamState();
    const stateB = createMinimalTeamState();

    const decisionsA: AllDecisions = {
      marketing: { brandingInvestment: 1_000_000 },
    };
    const decisionsB: AllDecisions = {
      rd: { rdBudget: 5_000_000 },
    };

    const input = makeInput({
      teams: [
        { id: "team-alpha", state: stateA, decisions: decisionsA },
        { id: "team-beta", state: stateB, decisions: decisionsB },
      ],
      matchSeed: "isolation-seed",
    });

    const output = SimulationEngine.processRound(input);

    // Find each team's result
    const resultA = output.results.find((r) => r.teamId === "team-alpha");
    const resultB = output.results.find((r) => r.teamId === "team-beta");

    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();

    // Stringify each result and verify no cross-contamination of team IDs
    const resultAJson = JSON.stringify(resultA);
    const resultBJson = JSON.stringify(resultB);

    // teamA output must NOT mention teamB's ID
    expect(resultAJson).not.toContain('"team-beta"');
    // teamB output must NOT mention teamA's ID
    expect(resultBJson).not.toContain('"team-alpha"');
  });

  it("teamA and teamB outputs are independent objects", () => {
    const stateA = createMinimalTeamState();
    const stateB = createMinimalTeamState();

    const input = makeInput({
      teams: [
        { id: "team-1", state: stateA, decisions: {} },
        { id: "team-2", state: stateB, decisions: {} },
      ],
      matchSeed: "independence-seed",
    });

    const output = SimulationEngine.processRound(input);

    const resultA = output.results.find((r) => r.teamId === "team-1")!;
    const resultB = output.results.find((r) => r.teamId === "team-2")!;

    // Output newState objects must be distinct references
    expect(resultA.newState).not.toBe(resultB.newState);

    // Mutating one output state must not affect the other
    resultA.newState.cash += 999_999;
    expect(resultB.newState.cash).not.toBe(resultA.newState.cash);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — ProductionLine decision flows through
// ---------------------------------------------------------------------------

describe("L4: ProductionLine assignment decision flows through", () => {
  it("assigns a product to a production line via productionLineDecisions.assignments", () => {
    const state = createMinimalTeamState();

    // Preconditions: the state must have at least one factory, one line, and one product
    expect(state.factories.length).toBeGreaterThan(0);
    expect(state.factories[0].productionLines.length).toBeGreaterThan(0);
    expect(state.products.length).toBeGreaterThan(0);

    const targetLineId = state.factories[0].productionLines[0].id;
    const targetProductId = state.products[0].id;

    const decisions: AllDecisions = {
      factory: {
        productionLineDecisions: {
          assignments: [
            { lineId: targetLineId, productId: targetProductId },
          ],
        },
      },
    };

    const input = makeInput({
      teams: [{ id: "t1", state, decisions }],
      matchSeed: "line-assignment",
    });

    const output = SimulationEngine.processRound(input);
    const result = output.results.find((r) => r.teamId === "t1")!;

    // The output state's first production line should have the assigned product
    const outputLine = result.newState.factories[0].productionLines.find(
      (l) => l.id === targetLineId,
    );
    expect(outputLine).toBeDefined();
    expect(outputLine!.productId).toBe(targetProductId);
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Warehouse decision creates warehouse
// ---------------------------------------------------------------------------

describe("L4: Warehouse build decision creates warehouse", () => {
  it("builds a tier 2 warehouse for the first factory", () => {
    const state = createMinimalTeamState();

    // Precondition: at least one factory
    expect(state.factories.length).toBeGreaterThan(0);

    const factoryId = state.factories[0].id;

    const decisions: AllDecisions = {
      factory: {
        warehouseDecisions: {
          build: [{ factoryId, tier: 2 }],
        },
      },
    };

    const input = makeInput({
      teams: [{ id: "t1", state, decisions }],
      matchSeed: "warehouse-build",
    });

    const output = SimulationEngine.processRound(input);
    const result = output.results.find((r) => r.teamId === "t1")!;

    // The output state should have a warehouseState with a tier 2 warehouse
    const warehouseState = result.newState.warehouseState;
    expect(warehouseState).toBeDefined();
    expect(warehouseState!.warehouses).toBeDefined();

    const tier2Warehouse = warehouseState!.warehouses.find(
      (w) => w.tier === 2 && w.factoryId === factoryId,
    );
    expect(tier2Warehouse).toBeDefined();
    expect(tier2Warehouse!.tier).toBe(2);
    expect(tier2Warehouse!.ownership).toBe("built");
  });
});
