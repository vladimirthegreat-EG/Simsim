/**
 * L4-v2: State Immutability & Cross-Team Isolation Tests (enhanced)
 *
 * Test 1 — Input state immutability via full JSON snapshot before/after processRound
 * Test 2 — Cross-team isolation: two teams, no cross-contamination of IDs in output
 * Test 3 — ProductionLine decision flows through: submit assignment, verify in output
 * Test 4 — Warehouse build decision creates warehouse in output state
 */
import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../../../engine/core/SimulationEngine";
import type { SimulationInput } from "../../../engine/core/SimulationEngine";
import type { AllDecisions } from "../../../engine/types/decisions";
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
    matchSeed: overrides.matchSeed ?? "test-isolation-v2",
  };
}

// ---------------------------------------------------------------------------
// Test 1 — Input state immutability (JSON snapshot comparison)
// ---------------------------------------------------------------------------

describe("L4-v2: Input state immutability via JSON snapshot", () => {
  it("full JSON snapshot of TeamState before/after processRound must match", () => {
    const state = createMinimalTeamState();

    // Take a deep JSON snapshot BEFORE processing
    const snapshotBefore = JSON.stringify(state);

    const input = makeInput({
      teams: [{ id: "t1", state, decisions: {} }],
      matchSeed: "immut-snapshot-v2",
    });

    SimulationEngine.processRound(input);

    // Take a JSON snapshot AFTER processing
    const snapshotAfter = JSON.stringify(state);

    // The input state must be completely unchanged — byte-for-byte identical JSON
    expect(snapshotAfter).toBe(snapshotBefore);
  });

  it("JSON snapshot stability holds even with non-empty decisions", () => {
    const state = createMinimalTeamState();

    const decisions: AllDecisions = {
      factory: {
        newFactories: [{ name: "Snapshot Factory", region: "Europe" }],
      },
      hr: {},
      rd: { rdBudget: 5_000_000 },
      marketing: {
        advertisingBudget: { General: 2_000_000 },
        brandingInvestment: 1_000_000,
      },
      finance: {},
    };

    const snapshotBefore = JSON.stringify(state);

    const input = makeInput({
      teams: [{ id: "t1", state, decisions }],
      matchSeed: "immut-snapshot-decisions-v2",
    });

    SimulationEngine.processRound(input);

    const snapshotAfter = JSON.stringify(state);
    expect(snapshotAfter).toBe(snapshotBefore);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Cross-team isolation
// ---------------------------------------------------------------------------

describe("L4-v2: Cross-team isolation (no cross-contamination of IDs)", () => {
  it("teamA output must not contain teamB ID and vice versa", () => {
    const stateA = createMinimalTeamState();
    const stateB = createMinimalTeamState();

    const decisionsA: AllDecisions = {
      marketing: { brandingInvestment: 1_500_000 },
    };
    const decisionsB: AllDecisions = {
      rd: { rdBudget: 8_000_000 },
    };

    const input = makeInput({
      teams: [
        { id: "team-phoenix", state: stateA, decisions: decisionsA },
        { id: "team-dragon", state: stateB, decisions: decisionsB },
      ],
      matchSeed: "isolation-v2",
    });

    const output = SimulationEngine.processRound(input);

    const resultA = output.results.find((r) => r.teamId === "team-phoenix");
    const resultB = output.results.find((r) => r.teamId === "team-dragon");

    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();

    // Stringify each result and verify no cross-contamination of team IDs
    const resultAJson = JSON.stringify(resultA);
    const resultBJson = JSON.stringify(resultB);

    // teamA output must NOT mention teamB's ID anywhere
    expect(resultAJson).not.toContain('"team-dragon"');
    // teamB output must NOT mention teamA's ID anywhere
    expect(resultBJson).not.toContain('"team-phoenix"');
  });

  it("output newState objects are distinct references and independently mutable", () => {
    const stateA = createMinimalTeamState();
    const stateB = createMinimalTeamState();

    const input = makeInput({
      teams: [
        { id: "team-x", state: stateA, decisions: {} },
        { id: "team-y", state: stateB, decisions: {} },
      ],
      matchSeed: "distinct-refs-v2",
    });

    const output = SimulationEngine.processRound(input);

    const resultX = output.results.find((r) => r.teamId === "team-x")!;
    const resultY = output.results.find((r) => r.teamId === "team-y")!;

    // Must be different object references
    expect(resultX.newState).not.toBe(resultY.newState);

    // Mutating one must not affect the other
    const cashYBefore = resultY.newState.cash;
    resultX.newState.cash += 12_345_678;
    expect(resultY.newState.cash).toBe(cashYBefore);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — ProductionLine decision flows through
// ---------------------------------------------------------------------------

describe("L4-v2: ProductionLine assignment decision flows through", () => {
  it("submitting a line assignment results in the product being assigned in output", () => {
    const state = createMinimalTeamState();

    // Preconditions: state must have at least one factory with a production line, and one product
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
      matchSeed: "line-assignment-v2",
    });

    const output = SimulationEngine.processRound(input);
    const result = output.results.find((r) => r.teamId === "t1")!;

    // The output state's production line should have the assigned product
    const outputLine = result.newState.factories[0].productionLines.find(
      (l) => l.id === targetLineId,
    );
    expect(outputLine).toBeDefined();
    expect(outputLine!.productId).toBe(targetProductId);
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Warehouse build decision creates warehouse in output
// ---------------------------------------------------------------------------

describe("L4-v2: Warehouse build decision creates warehouse", () => {
  it("warehouse build decision for tier 2 creates a tier 2 warehouse in output state", () => {
    const state = createMinimalTeamState();

    // Precondition: at least one factory exists
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
      matchSeed: "warehouse-build-v2",
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
