import { describe, it, expect } from "vitest";
import {
  convertFactoryDecisions,
  convertHRDecisions,
  convertMarketingDecisions,
  convertFinanceDecisions,
  convertRDDecisions,
} from "@/lib/converters/decisionConverters";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type {
  UIFactoryDecisions,
  UIHRDecisions,
  UIMarketingDecisions,
  UIFinanceDecisions,
  UIRDDecisions,
} from "@/lib/stores/decisionStore";

/**
 * Helper: create a minimal UIFactoryDecisions with overrides.
 */
function makeUIFactory(overrides: Partial<UIFactoryDecisions> = {}): UIFactoryDecisions {
  return {
    efficiencyInvestment: { workers: 0, engineers: 0, equipment: 0 },
    esgInvestment: 0,
    productionAllocations: {},
    upgradePurchases: [],
    newFactories: [],
    ...overrides,
  };
}

/**
 * Helper: create a minimal UIHRDecisions with overrides.
 */
function makeUIHR(overrides: Partial<UIHRDecisions> = {}): UIHRDecisions {
  return {
    hires: [],
    fires: [],
    recruitmentSearches: [],
    salaryAdjustment: 0,
    trainingPrograms: [],
    ...overrides,
  };
}

/**
 * Helper: create a minimal UIMarketingDecisions with overrides.
 */
function makeUIMarketing(overrides: Partial<UIMarketingDecisions> = {}): UIMarketingDecisions {
  return {
    adBudgets: {},
    brandInvestment: 0,
    promotions: [],
    brandActivities: [],
    ...overrides,
  };
}

/**
 * Helper: create a minimal UIFinanceDecisions with overrides.
 */
function makeUIFinance(overrides: Partial<UIFinanceDecisions> = {}): UIFinanceDecisions {
  return {
    issueTBills: 0,
    issueBonds: 0,
    issueShares: null,
    sharesBuyback: 0,
    dividendPerShare: 0,
    fxHedging: {},
    ...overrides,
  };
}

/**
 * Helper: create a minimal UIRDDecisions with overrides.
 */
function makeUIRD(overrides: Partial<UIRDDecisions> = {}): UIRDDecisions {
  return {
    rdInvestment: 0,
    newProducts: [],
    techUpgrades: [],
    ...overrides,
  };
}

// Shared TeamState from the engine's own factory method
const teamState = SimulationEngine.createInitialTeamState();

// ─── 1. convertFactoryDecisions ─────────────────────────────────────────────

describe("convertFactoryDecisions", () => {
  it("A: maps efficiencyInvestment.workers to engine efficiencyInvestments keyed by first factory id", () => {
    const ui = makeUIFactory({
      efficiencyInvestment: { workers: 5_000_000, engineers: 0, equipment: 0 },
    });
    const result = convertFactoryDecisions(ui, teamState);
    const firstFactoryId = teamState.factories[0].id;
    expect(result.efficiencyInvestments[firstFactoryId]).toBeDefined();
    expect(result.efficiencyInvestments[firstFactoryId]!.workers).toBe(5_000_000);
  });

  it("B: assembly_line upgrade goes to machineryDecisions, NOT upgradePurchases", () => {
    const ui = makeUIFactory({
      upgradePurchases: [{ factoryId: "f1", upgradeName: "assembly_line" }],
    });
    const result = convertFactoryDecisions(ui, teamState);
    // Should appear in machineryDecisions
    expect(result.machineryDecisions).toBeDefined();
    expect(result.machineryDecisions!.purchases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factoryId: "f1", machineType: "assembly_line" }),
      ]),
    );
    // Should NOT appear in upgradePurchases
    expect(result.upgradePurchases).toEqual([]);
  });

  it("C: automation upgrade goes to upgradePurchases, NOT machineryDecisions", () => {
    const ui = makeUIFactory({
      upgradePurchases: [{ factoryId: "f1", upgradeName: "automation" }],
    });
    const result = convertFactoryDecisions(ui, teamState);
    // Should appear in upgradePurchases
    expect(result.upgradePurchases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factoryId: "f1", upgrade: "automation" }),
      ]),
    );
    // machineryDecisions should be undefined (no machine purchases)
    expect(result.machineryDecisions).toBeUndefined();
  });

  it("D: warehouseDecisions.build tier passes through", () => {
    const ui = makeUIFactory({
      warehouseDecisions: {
        build: [{ factoryId: "f1", tier: 2 }],
      },
    });
    const result = convertFactoryDecisions(ui, teamState);
    expect(result.warehouseDecisions).toBeDefined();
    expect(result.warehouseDecisions!.build![0].tier).toBe(2);
  });
});

// ─── 2. convertHRDecisions ──────────────────────────────────────────────────

describe("convertHRDecisions", () => {
  it("A: salaryAdjustment=10 → salaryMultiplierChanges all roles at 1.10", () => {
    const ui = makeUIHR({ salaryAdjustment: 10 });
    const result = convertHRDecisions(ui);
    expect(result.salaryMultiplierChanges).toEqual({
      workers: 1.10,
      engineers: 1.10,
      supervisors: 1.10,
    });
  });

  it("B: salaryAdjustment=0 → salaryMultiplierChanges is undefined", () => {
    const ui = makeUIHR({ salaryAdjustment: 0 });
    const result = convertHRDecisions(ui);
    expect(result.salaryMultiplierChanges).toBeUndefined();
  });
});

// ─── 3. convertMarketingDecisions ───────────────────────────────────────────

describe("convertMarketingDecisions", () => {
  it("A: adBudgets per-channel amounts are summed into advertisingBudget per segment", () => {
    const ui = makeUIMarketing({
      adBudgets: {
        General: { tv: 1_000_000, digital: 2_000_000 },
      },
    });
    const result = convertMarketingDecisions(ui);
    expect(result.advertisingBudget.General).toBe(3_000_000);
  });

  it("B: brandActivities=['celebrity'] → sponsorships with Celebrity Endorsement details", () => {
    const ui = makeUIMarketing({
      brandActivities: ["celebrity"],
    });
    const result = convertMarketingDecisions(ui);
    expect(result.sponsorships).toEqual([
      { name: "Celebrity Endorsement", cost: 15_000_000, brandImpact: 0.10 },
    ]);
  });

  it("C: brandActivities=[] → sponsorships is undefined", () => {
    const ui = makeUIMarketing({ brandActivities: [] });
    const result = convertMarketingDecisions(ui);
    expect(result.sponsorships).toBeUndefined();
  });
});

// ─── 4. convertFinanceDecisions ─────────────────────────────────────────────

describe("convertFinanceDecisions", () => {
  it("A: issueTBills=0 → treasuryBillsIssue is undefined", () => {
    const ui = makeUIFinance({ issueTBills: 0 });
    const result = convertFinanceDecisions(ui);
    expect(result.treasuryBillsIssue).toBeUndefined();
  });

  it("B: issueShares=null → stockIssuance is undefined", () => {
    const ui = makeUIFinance({ issueShares: null });
    const result = convertFinanceDecisions(ui);
    expect(result.stockIssuance).toBeUndefined();
  });

  it("C: issueShares with count and pricePerShare → stockIssuance mapped", () => {
    const ui = makeUIFinance({
      issueShares: { count: 1_000_000, pricePerShare: 55 },
    });
    const result = convertFinanceDecisions(ui);
    expect(result.stockIssuance).toEqual({
      shares: 1_000_000,
      pricePerShare: 55,
    });
  });
});

// ─── 5. convertRDDecisions ──────────────────────────────────────────────────

describe("convertRDDecisions", () => {
  it("A: rdInvestment=8_000_000 → rdBudget=8_000_000", () => {
    const ui = makeUIRD({ rdInvestment: 8_000_000 });
    const result = convertRDDecisions(ui);
    expect(result.rdBudget).toBe(8_000_000);
  });

  it("B: rdInvestment=0 → rdBudget is undefined", () => {
    const ui = makeUIRD({ rdInvestment: 0 });
    const result = convertRDDecisions(ui);
    expect(result.rdBudget).toBeUndefined();
  });
});
