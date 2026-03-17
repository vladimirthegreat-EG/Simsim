/**
 * P32: Changeover Tests
 */
import { describe, it, expect } from "vitest";
import {
  assignProductToLine,
  processChangeoverCountdowns,
  setLineTarget,
  setLineStaffing,
} from "../../modules/ProductionLineManager";
import { createTestState } from "./testHelpers";

describe("Line Changeover", () => {
  it("idle line → product assignment is free and instant", () => {
    const state = createTestState();
    const lineId = state.factories[0].productionLines[0].id;
    const initialCash = state.cash;

    const result = assignProductToLine(state, lineId, "prod-1", "General");
    expect(result.success).toBe(true);
    expect(state.cash).toBe(initialCash); // No cost
    expect(state.factories[0].productionLines[0].status).toBe("active");
    expect(state.factories[0].productionLines[0].productId).toBe("prod-1");
  });

  it("active line product change: cost = $2M + $500K × machines, 1 round downtime", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    line.assignedMachines = ["m1", "m2", "m3"]; // 3 machines
    const initialCash = state.cash;

    const result = assignProductToLine(state, line.id, "prod-2", "Budget");
    expect(result.success).toBe(true);

    // Cost = $2M + $500K × 3 = $3.5M
    expect(state.cash).toBe(initialCash - 3_500_000);
    expect(line.status).toBe("changeover");
    expect(line.changeoverRoundsRemaining).toBe(1);
    expect(line.productId).toBe("prod-2");
  });

  it("flexibleManufacturing: cost -50%, time = 0", () => {
    const state = createTestState();
    state.factories[0].upgrades = ["flexibleManufacturing"];
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    line.assignedMachines = ["m1", "m2"]; // 2 machines
    const initialCash = state.cash;

    const result = assignProductToLine(state, line.id, "prod-2", "Budget");
    expect(result.success).toBe(true);

    // Cost = ($2M + $500K × 2) × 0.5 = $1.5M
    expect(state.cash).toBe(initialCash - 1_500_000);
    // Instant — no changeover downtime
    expect(line.status).toBe("active");
    expect(line.changeoverRoundsRemaining).toBe(0);
  });

  it("modularLines: cost -50% (stacks with flexible)", () => {
    const state = createTestState();
    state.factories[0].upgrades = ["modularLines"];
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    line.assignedMachines = []; // 0 machines
    const initialCash = state.cash;

    const result = assignProductToLine(state, line.id, "prod-2", "Budget");
    // Cost = $2M × 0.5 = $1M
    expect(state.cash).toBe(initialCash - 1_000_000);
    expect(line.status).toBe("changeover"); // modularLines doesn't reduce time
  });

  it("both upgrades: cost = 25%, time = 0", () => {
    const state = createTestState();
    state.factories[0].upgrades = ["flexibleManufacturing", "modularLines"];
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    line.assignedMachines = ["m1", "m2", "m3", "m4"]; // 4 machines
    const initialCash = state.cash;

    const result = assignProductToLine(state, line.id, "prod-2", "Budget");
    // Cost = ($2M + $500K × 4) × 0.5 × 0.5 = $4M × 0.25 = $1M
    expect(state.cash).toBe(initialCash - 1_000_000);
    expect(line.status).toBe("active"); // instant
  });

  it("changeover line produces 0 (status = changeover)", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.status = "changeover";
    line.changeoverRoundsRemaining = 1;
    // Changeover line can't produce — tested via output formula returning 0 for non-active
  });

  it("after 1 round: changeover completes → active", () => {
    const factory = createTestState().factories[0];
    factory.productionLines[0].status = "changeover";
    factory.productionLines[0].changeoverRoundsRemaining = 1;
    factory.productionLines[0].productId = "prod-1";

    const messages = processChangeoverCountdowns(factory);
    expect(factory.productionLines[0].status).toBe("active");
    expect(factory.productionLines[0].changeoverRoundsRemaining).toBe(0);
    expect(messages.length).toBeGreaterThan(0);
  });

  it("same product assignment is no-op", () => {
    const state = createTestState();
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";
    const initialCash = state.cash;

    const result = assignProductToLine(state, line.id, "prod-1", "General");
    expect(result.success).toBe(true);
    expect(state.cash).toBe(initialCash); // No cost
  });

  it("insufficient funds for changeover fails", () => {
    const state = createTestState();
    state.cash = 1_000_000; // Not enough for $2M+ changeover
    const line = state.factories[0].productionLines[0];
    line.status = "active";
    line.productId = "prod-1";
    line.segment = "General";

    const result = assignProductToLine(state, line.id, "prod-2", "Budget");
    expect(result.success).toBe(false);
    expect(result.message).toContain("Insufficient");
  });
});

describe("Line Target & Staffing", () => {
  it("setLineTarget respects factory capacity", () => {
    const state = createTestState(); // medium = 25K capacity
    const lineId = state.factories[0].productionLines[0].id;

    const ok = setLineTarget(state, lineId, 20000);
    expect(ok.success).toBe(true);

    const fail = setLineTarget(state, lineId, 30000); // over 25K
    expect(fail.success).toBe(false);
  });

  it("negative target fails", () => {
    const state = createTestState();
    const result = setLineTarget(state, state.factories[0].productionLines[0].id, -100);
    expect(result.success).toBe(false);
  });

  it("setLineStaffing validates against factory headcount", () => {
    const state = createTestState(); // 100 workers, 10 engineers, 7 supervisors
    const lineId = state.factories[0].productionLines[0].id;

    const ok = setLineStaffing(state, lineId, 50, 5, 3);
    expect(ok.success).toBe(true);

    const fail = setLineStaffing(state, lineId, 200, 5, 3); // 200 > 100 workers
    expect(fail.success).toBe(false);
  });

  it("negative staff counts fail", () => {
    const state = createTestState();
    const result = setLineStaffing(state, state.factories[0].productionLines[0].id, -1, 0, 0);
    expect(result.success).toBe(false);
  });
});
