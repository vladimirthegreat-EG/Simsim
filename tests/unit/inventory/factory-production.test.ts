/**
 * Unit tests for FactoryModule static calculation methods.
 */

import { FactoryModule } from "@/engine/modules/FactoryModule";
import {
  create_factory,
  create_context,
  CONSTANTS,
} from "../setup";

// ---------------------------------------------------------------------------
// applyEfficiencyInvestment
// ---------------------------------------------------------------------------

describe("applyEfficiencyInvestment", () => {
  it("$1M workers on base factory yields 0.01 efficiency gain", () => {
    const factory = create_factory({ efficiency: 0.7 });
    factory.efficiencyInvestment.workers = 0;

    const result = FactoryModule.applyEfficiencyInvestment(factory, { workers: 1_000_000 });

    expect(result.newEfficiency).toBeCloseTo(0.71);
    expect(result.cost).toBe(1_000_000);
  });

  it("$15M workers with no previous investment applies diminishing returns past $10M", () => {
    const factory = create_factory({ efficiency: 0.7 });
    factory.efficiencyInvestment.workers = 0;

    const result = FactoryModule.applyEfficiencyInvestment(factory, { workers: 15_000_000 });

    // first $10M at full: (10) × 0.01 = 0.10
    // next $5M at half:   (5) × 0.01 × 0.5 = 0.025
    // total gain = 0.125
    expect(result.newEfficiency).toBeCloseTo(0.7 + 0.125);
    expect(result.cost).toBe(15_000_000);
  });

  it("efficiency is capped at MAX_EFFICIENCY (1.0)", () => {
    const factory = create_factory({ efficiency: 0.95 });
    factory.efficiencyInvestment.workers = 0;

    const result = FactoryModule.applyEfficiencyInvestment(factory, { workers: 10_000_000 });

    // gain would be 0.10, pushing to 1.05, but capped at 1.0
    expect(result.newEfficiency).toBe(1.0);
  });

  it("cost equals total investment amount", () => {
    const factory = create_factory({ efficiency: 0.7 });
    factory.efficiencyInvestment.workers = 0;
    factory.efficiencyInvestment.engineers = 0;

    const result = FactoryModule.applyEfficiencyInvestment(factory, {
      workers: 2_000_000,
      engineers: 3_000_000,
    });

    expect(result.cost).toBe(5_000_000);
  });

  it("all investment multipliers are applied correctly", () => {
    const factory = create_factory({ efficiency: 0.5 });
    factory.efficiencyInvestment = { workers: 0, supervisors: 0, engineers: 0, machinery: 0, factory: 0 };

    const result = FactoryModule.applyEfficiencyInvestment(factory, {
      workers: 1_000_000,
      supervisors: 1_000_000,
      engineers: 1_000_000,
      machinery: 1_000_000,
      factory: 1_000_000,
    });

    // gains: 0.01 + 0.015 + 0.02 + 0.012 + 0.008 = 0.065
    expect(result.newEfficiency).toBeCloseTo(0.5 + 0.065);
    expect(result.cost).toBe(5_000_000);
  });

  it("fully diminished when previous investment already past threshold", () => {
    const factory = create_factory({ efficiency: 0.7 });
    factory.efficiencyInvestment.workers = 15_000_000; // already past $10M

    const result = FactoryModule.applyEfficiencyInvestment(factory, { workers: 2_000_000 });

    // all at half rate: (2) × 0.01 × 0.5 = 0.01
    expect(result.newEfficiency).toBeCloseTo(0.71);
  });
});

// ---------------------------------------------------------------------------
// calculateCO2Reduction
// ---------------------------------------------------------------------------

describe("calculateCO2Reduction", () => {
  it("$100K yields 10 tons reduction", () => {
    expect(FactoryModule.calculateCO2Reduction(100_000)).toBe(10);
  });

  it("$500K yields 50 tons reduction", () => {
    expect(FactoryModule.calculateCO2Reduction(500_000)).toBe(50);
  });

  it("$0 yields 0 tons reduction", () => {
    expect(FactoryModule.calculateCO2Reduction(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// applyUpgradeEffects
// ---------------------------------------------------------------------------

describe("applyUpgradeEffects", () => {
  it("sixSigma reduces defectRate by 40%", () => {
    const factory = create_factory({ defectRate: 0.06 });
    FactoryModule.applyUpgradeEffects(factory, "sixSigma");
    expect(factory.defectRate).toBeCloseTo(0.06 * 0.6);
  });

  it("automation sets unitCostReduction to 0.35 and costVolatility × 0.40", () => {
    const factory = create_factory({ costVolatility: 0.15 });
    FactoryModule.applyUpgradeEffects(factory, "automation");
    expect(factory.unitCostReduction).toBe(0.35);
    expect(factory.costVolatility).toBeCloseTo(0.15 * 0.40);
  });

  it("leanManufacturing adds 0.15 efficiency (capped at 1.0) and 0.10 operating cost reduction", () => {
    const factory = create_factory({ efficiency: 0.7 });
    FactoryModule.applyUpgradeEffects(factory, "leanManufacturing");
    expect(factory.efficiency).toBeCloseTo(0.85);
    expect(factory.operatingCostReduction).toBe(0.10);
  });

  it("leanManufacturing caps efficiency at 1.0", () => {
    const factory = create_factory({ efficiency: 0.92 });
    FactoryModule.applyUpgradeEffects(factory, "leanManufacturing");
    expect(factory.efficiency).toBe(1.0);
  });

  it("advancedRobotics multiplies capacity by 1.50 and adds 0.30 labor reduction", () => {
    const factory = create_factory();
    FactoryModule.applyUpgradeEffects(factory, "advancedRobotics");
    expect(factory.capacityMultiplier).toBeCloseTo(1.50);
    expect(factory.laborReduction).toBe(0.30);
  });

  it("qualityLab halves defectRate", () => {
    const factory = create_factory({ defectRate: 0.06 });
    FactoryModule.applyUpgradeEffects(factory, "qualityLab");
    expect(factory.defectRate).toBeCloseTo(0.03);
  });
});

// ---------------------------------------------------------------------------
// Waste Metrics (calculateWasteMetrics)
// ---------------------------------------------------------------------------

describe("calculateWasteMetrics", () => {
  it("waste rate at efficiency 0.7: max(0.02, 0.15 - 0.7×0.12) = 0.066", () => {
    const factory = create_factory({ efficiency: 0.7 });
    const result = FactoryModule.calculateWasteMetrics([factory], { [factory.id]: 10_000 });

    const expectedRate = 0.15 - 0.7 * 0.12; // 0.066
    const expectedWaste = Math.floor(10_000 * expectedRate);
    expect(result.totalWasteUnits).toBe(expectedWaste);
    expect(result.wasteDisposalCost).toBe(expectedWaste * 5);
  });

  it("waste rate at efficiency 1.0: max(0.02, 0.15 - 1.0×0.12) = 0.03", () => {
    const factory = create_factory({ efficiency: 1.0 });
    const result = FactoryModule.calculateWasteMetrics([factory], { [factory.id]: 10_000 });

    const expectedRate = 0.15 - 1.0 * 0.12; // 0.03
    const expectedWaste = Math.floor(10_000 * expectedRate);
    expect(result.totalWasteUnits).toBe(expectedWaste);
    expect(result.wasteDisposalCost).toBe(expectedWaste * 5);
  });

  it("waste rate floors at 0.02 even with very high efficiency", () => {
    // Efficiency of 1.5 would give 0.15 - 1.5*0.12 = -0.03, floored to 0.02
    const factory = create_factory({ efficiency: 1.0 });
    // Even at max efficiency (1.0), 0.15 - 0.12 = 0.03 > 0.02, so let's use a factory
    // with wasteCostReduction to push below the floor
    (factory as any).wasteCostReduction = 0.5; // 0.5 × 0.05 = 0.025 extra reduction
    // wasteRate = max(0.02, 0.15 - 0.12 - 0.025) = max(0.02, 0.005) = 0.02
    const result = FactoryModule.calculateWasteMetrics([factory], { [factory.id]: 10_000 });

    const expectedWaste = Math.floor(10_000 * 0.02);
    expect(result.totalWasteUnits).toBe(expectedWaste);
  });
});

// ---------------------------------------------------------------------------
// createNewFactory
// ---------------------------------------------------------------------------

describe("createNewFactory", () => {
  it("returns factory with correct base values", () => {
    const ctx = create_context();
    const factory = FactoryModule.createNewFactory("Test Plant", "North America", 0, ctx);

    expect(factory.region).toBe("North America");
    expect(factory.efficiency).toBe(CONSTANTS.BASE_FACTORY_EFFICIENCY);
    expect(factory.defectRate).toBe(CONSTANTS.BASE_DEFECT_RATE);
    expect(factory.co2Emissions).toBe(CONSTANTS.BASE_CO2_EMISSIONS);
  });

  it("applies regional cost modifier to shipping cost", () => {
    const ctx = create_context();

    const naFactory = FactoryModule.createNewFactory("NA Plant", "North America", 0, ctx);
    expect(naFactory.shippingCost).toBe(100_000 * 1.0);

    const asiaFactory = FactoryModule.createNewFactory("Asia Plant", "Asia", 1, ctx);
    expect(asiaFactory.shippingCost).toBe(100_000 * 0.85);

    const menaFactory = FactoryModule.createNewFactory("MENA Plant", "MENA", 2, ctx);
    expect(menaFactory.shippingCost).toBe(100_000 * 0.90);
  });

  it("initializes all efficiency investment categories to zero", () => {
    const ctx = create_context();
    const factory = FactoryModule.createNewFactory("New Plant", "Europe", 0, ctx);

    expect(factory.efficiencyInvestment).toEqual({
      workers: 0,
      supervisors: 0,
      engineers: 0,
      machinery: 0,
      factory: 0,
    });
  });

  it("generates deterministic ID when context provided", () => {
    const ctx1 = create_context("seed-a", 1, "team-1");
    const ctx2 = create_context("seed-a", 1, "team-1");

    const f1 = FactoryModule.createNewFactory("Plant", "Europe", 0, ctx1);
    const f2 = FactoryModule.createNewFactory("Plant", "Europe", 0, ctx2);

    expect(f1.id).toBe(f2.id);
  });
});
