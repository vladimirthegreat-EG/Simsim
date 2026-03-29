/**
 * Capsim-style Converter Tests
 *
 * Tests the 5 converter functions that bridge UI decisions to Engine decisions,
 * using SimulationEngine.createInitialTeamState() for realistic team state
 * instead of hand-crafted minimal stubs.
 */

import { describe, it, expect } from "vitest";
import {
  convertFactoryDecisions,
  convertHRDecisions,
  convertFinanceDecisions,
  convertMarketingDecisions,
  convertRDDecisions,
} from "@/lib/converters/decisionConverters";
import type {
  UIFactoryDecisions,
  UIHRDecisions,
  UIFinanceDecisions,
  UIMarketingDecisions,
  UIRDDecisions,
} from "@/lib/stores/decisionStore";
import { SimulationEngine } from "@/engine/core/SimulationEngine";

// ---------------------------------------------------------------------------
// Helpers: empty UI decision objects matching the store's initial shapes
// ---------------------------------------------------------------------------

function createEmptyFactoryUI(): UIFactoryDecisions {
  return {
    efficiencyInvestment: { workers: 0, engineers: 0, equipment: 0 },
    esgInvestment: 0,
    productionAllocations: {},
    upgradePurchases: [],
    newFactories: [],
  };
}

function createEmptyHRUI(): UIHRDecisions {
  return {
    hires: [],
    fires: [],
    recruitmentSearches: [],
    salaryAdjustment: 0,
    trainingPrograms: [],
  };
}

function createEmptyMarketingUI(): UIMarketingDecisions {
  return {
    adBudgets: {},
    brandInvestment: 0,
    promotions: [],
    brandActivities: [],
  };
}

function createEmptyFinanceUI(): UIFinanceDecisions {
  return {
    issueTBills: 0,
    issueBonds: 0,
    issueShares: null,
    sharesBuyback: 0,
    dividendPerShare: 0,
    fxHedging: {},
  };
}

function createEmptyRDUI(): UIRDDecisions {
  return {
    rdInvestment: 0,
    newProducts: [],
    techUpgrades: [],
  };
}

// ---------------------------------------------------------------------------
// Realistic team state from the engine (used by convertFactoryDecisions)
// ---------------------------------------------------------------------------
const teamState = SimulationEngine.createInitialTeamState();

// =============================================================================
// 1. convertFactoryDecisions
// =============================================================================

describe("convertFactoryDecisions", () => {
  const firstFactoryId = teamState.factories[0].id;

  it("A: efficiencyInvestment.workers=5_000_000 maps to engine keyed by first factory id", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      efficiencyInvestment: { workers: 5_000_000, engineers: 0, equipment: 0 },
    };

    const result = convertFactoryDecisions(ui, teamState);

    expect(result.efficiencyInvestments[firstFactoryId]).toBeDefined();
    expect(result.efficiencyInvestments[firstFactoryId].workers).toBe(5_000_000);
  });

  it("B: upgradePurchases assembly_line goes to machineryDecisions, NOT upgradePurchases", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      upgradePurchases: [{ factoryId: "f1", upgradeName: "assembly_line" }],
    };

    const result = convertFactoryDecisions(ui, teamState);

    // Must be in machineryDecisions
    expect(result.machineryDecisions).toBeDefined();
    expect(result.machineryDecisions!.purchases).toHaveLength(1);
    expect(result.machineryDecisions!.purchases[0].machineType).toBe("assembly_line");
    expect(result.machineryDecisions!.purchases[0].factoryId).toBe("f1");

    // Must NOT appear in upgradePurchases
    expect(result.upgradePurchases).toHaveLength(0);
  });

  it("C: upgradePurchases automation goes to upgradePurchases, NOT machineryDecisions", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      upgradePurchases: [{ factoryId: "f1", upgradeName: "automation" }],
    };

    const result = convertFactoryDecisions(ui, teamState);

    // Must be in upgradePurchases
    expect(result.upgradePurchases).toHaveLength(1);
    expect(result.upgradePurchases[0].upgrade).toBe("automation");
    expect(result.upgradePurchases[0].factoryId).toBe("f1");

    // Must NOT be in machineryDecisions
    expect(result.machineryDecisions).toBeUndefined();
  });

  it("D: warehouseDecisions.build tier is preserved", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      warehouseDecisions: {
        build: [{ factoryId: "f1", tier: 2 }],
      },
    };

    const result = convertFactoryDecisions(ui, teamState);

    expect(result.warehouseDecisions).toBeDefined();
    expect(result.warehouseDecisions!.build).toBeDefined();
    expect(result.warehouseDecisions!.build![0].tier).toBe(2);
    expect(result.warehouseDecisions!.build![0].factoryId).toBe("f1");
  });
});

// =============================================================================
// 2. convertHRDecisions
// =============================================================================

describe("convertHRDecisions", () => {
  it("A: salaryAdjustment=10 produces multiplier 1.10 for all roles", () => {
    const ui: UIHRDecisions = {
      ...createEmptyHRUI(),
      salaryAdjustment: 10,
    };

    const result = convertHRDecisions(ui);

    expect(result.salaryMultiplierChanges).toBeDefined();
    expect(result.salaryMultiplierChanges!.workers).toBeCloseTo(1.10);
    expect(result.salaryMultiplierChanges!.engineers).toBeCloseTo(1.10);
    expect(result.salaryMultiplierChanges!.supervisors).toBeCloseTo(1.10);
  });

  it("B: salaryAdjustment=0 produces undefined salaryMultiplierChanges", () => {
    const ui: UIHRDecisions = {
      ...createEmptyHRUI(),
      salaryAdjustment: 0,
    };

    const result = convertHRDecisions(ui);

    expect(result.salaryMultiplierChanges).toBeUndefined();
  });
});

// =============================================================================
// 3. convertMarketingDecisions
// =============================================================================

describe("convertMarketingDecisions", () => {
  it("A: adBudgets channels summed per segment", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      adBudgets: {
        General: { tv: 1_000_000, digital: 2_000_000 },
      },
    };

    const result = convertMarketingDecisions(ui);

    expect(result.advertisingBudget.General).toBe(3_000_000);
  });

  it("B: brandActivities=['celebrity'] maps to sponsorships with correct metadata", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      brandActivities: ["celebrity"],
    };

    const result = convertMarketingDecisions(ui);

    expect(result.sponsorships).toBeDefined();
    expect(result.sponsorships).toHaveLength(1);
    expect(result.sponsorships![0]).toEqual({
      name: "Celebrity Endorsement",
      cost: 15_000_000,
      brandImpact: 0.10,
    });
  });

  it("C: empty brandActivities produces undefined sponsorships", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      brandActivities: [],
    };

    const result = convertMarketingDecisions(ui);

    expect(result.sponsorships).toBeUndefined();
  });
});

// =============================================================================
// 4. convertFinanceDecisions
// =============================================================================

describe("convertFinanceDecisions", () => {
  it("A: issueTBills=0 produces undefined treasuryBillsIssue", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      issueTBills: 0,
    };

    const result = convertFinanceDecisions(ui);

    expect(result.treasuryBillsIssue).toBeUndefined();
  });

  it("B: issueShares=null produces undefined stockIssuance", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      issueShares: null,
    };

    const result = convertFinanceDecisions(ui);

    expect(result.stockIssuance).toBeUndefined();
  });

  it("C: issueShares with count and pricePerShare maps to stockIssuance", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      issueShares: { count: 1_000_000, pricePerShare: 55 },
    };

    const result = convertFinanceDecisions(ui);

    expect(result.stockIssuance).toBeDefined();
    expect(result.stockIssuance!.shares).toBe(1_000_000);
    expect(result.stockIssuance!.pricePerShare).toBe(55);
  });
});

// =============================================================================
// 5. convertRDDecisions
// =============================================================================

describe("convertRDDecisions", () => {
  it("A: rdInvestment=8_000_000 maps to engine.rdBudget", () => {
    const ui: UIRDDecisions = {
      ...createEmptyRDUI(),
      rdInvestment: 8_000_000,
    };

    const result = convertRDDecisions(ui);

    expect(result.rdBudget).toBe(8_000_000);
  });

  it("B: rdInvestment=0 produces undefined rdBudget", () => {
    const ui: UIRDDecisions = {
      ...createEmptyRDUI(),
      rdInvestment: 0,
    };

    const result = convertRDDecisions(ui);

    expect(result.rdBudget).toBeUndefined();
  });
});
