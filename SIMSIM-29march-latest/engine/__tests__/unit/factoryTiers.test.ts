/**
 * P29: Factory Tier & Production Line Tests
 * Updated: March 26 — tiers rebalanced (small=2, medium=6, large=10 lines)
 */
import { describe, it, expect } from "vitest";
import { FACTORY_TIERS } from "../../types/factory";
import { FactoryModule } from "../../modules/FactoryModule";
import { createTestState, createTestFactory } from "./testHelpers";

describe("Factory Tiers", () => {
  it("Small costs $30M, 2 max lines, 50K capacity", () => {
    expect(FACTORY_TIERS.small.cost).toBe(30_000_000);
    expect(FACTORY_TIERS.small.maxLines).toBe(2);
    expect(FACTORY_TIERS.small.baseCapacity).toBe(50_000);
  });

  it("Medium costs $50M, 6 max lines, 150K capacity", () => {
    expect(FACTORY_TIERS.medium.cost).toBe(50_000_000);
    expect(FACTORY_TIERS.medium.maxLines).toBe(6);
    expect(FACTORY_TIERS.medium.baseCapacity).toBe(150_000);
  });

  it("Large costs $80M, 10 max lines, 250K capacity", () => {
    expect(FACTORY_TIERS.large.cost).toBe(80_000_000);
    expect(FACTORY_TIERS.large.maxLines).toBe(10);
    expect(FACTORY_TIERS.large.baseCapacity).toBe(250_000);
  });

  it("createNewFactory creates correct number of lines per tier", () => {
    const small = FactoryModule.createNewFactory("S", "North America", 0, undefined, "small");
    expect(small.productionLines.length).toBe(2);
    expect(small.tier).toBe("small");
    expect(small.maxLines).toBe(2);
    expect(small.baseCapacity).toBe(50_000);

    const medium = FactoryModule.createNewFactory("M", "Europe", 0, undefined, "medium");
    expect(medium.productionLines.length).toBe(6);

    const large = FactoryModule.createNewFactory("L", "Asia", 0, undefined, "large");
    expect(large.productionLines.length).toBe(10);
  });

  it("existing factories default to Medium tier", () => {
    const factory = FactoryModule.createNewFactory("Default", "North America", 0);
    expect(factory.tier).toBe("medium");
    expect(factory.maxLines).toBe(6);
  });
});

describe("Production Lines", () => {
  it("new line starts idle with no product", () => {
    const factory = createTestFactory("medium");
    for (const line of factory.productionLines) {
      expect(line.status).toBe("idle");
      expect(line.productId).toBeNull();
      expect(line.targetOutput).toBe(0);
    }
  });

  it("factory has correct number of lines based on tier", () => {
    expect(createTestFactory("small").productionLines.length).toBe(2);
    expect(createTestFactory("medium").productionLines.length).toBe(6);
    expect(createTestFactory("large").productionLines.length).toBe(10);
  });

  it("each line has unique ID and correct factoryId", () => {
    const factory = createTestFactory("large", "f1");
    const ids = factory.productionLines.map(l => l.id);
    expect(new Set(ids).size).toBe(10); // all unique
    for (const line of factory.productionLines) {
      expect(line.factoryId).toBe("f1");
    }
  });

  it("lines initialize with zero staff and no machines", () => {
    const factory = createTestFactory("medium");
    for (const line of factory.productionLines) {
      expect(line.assignedWorkers).toBe(0);
      expect(line.assignedEngineers).toBe(0);
      expect(line.assignedSupervisors).toBe(0);
      expect(line.assignedMachines).toEqual([]);
    }
  });
});
