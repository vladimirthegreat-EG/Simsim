/**
 * Layer 0 — Decision Save Pipeline: Converter Tests (DS-04 through DS-14)
 *
 * Tests the 5 converter functions that bridge UI decisions → Engine decisions.
 * These are the confirmed source of live-play bugs: player sets $5M, engine gets $0.
 * Zero test coverage before this file.
 */

import { describe, it, expect } from "vitest";
import {
  convertFactoryDecisions,
  convertHRDecisions,
  convertFinanceDecisions,
  convertMarketingDecisions,
  convertRDDecisions,
  BRAND_ACTIVITY_MAP,
} from "@/lib/converters/decisionConverters";
import type {
  UIFactoryDecisions,
  UIHRDecisions,
  UIFinanceDecisions,
  UIMarketingDecisions,
  UIRDDecisions,
} from "@/lib/stores/decisionStore";
import type { TeamState } from "@/engine/types";

// Minimal team state with one factory — enough for converter tests
function createMinimalState(): TeamState {
  return {
    factories: [
      {
        id: "f1",
        name: "Main Factory",
        region: "North America",
        workers: 100,
        engineers: 10,
        supervisors: 5,
        capacity: 50000,
        efficiency: 0.7,
        defectRate: 0.06,
        upgrades: [],
        productionLines: [
          { id: "line-1", segment: "General", productId: "initial-product", capacity: 50000, efficiency: 0.7 },
        ],
      },
    ],
    products: [
      { id: "initial-product", name: "Standard Phone", segment: "General", price: 450, quality: 65, features: 50 },
    ],
  } as unknown as TeamState;
}

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

// =============================================================================
// DS-04 through DS-08: convertFactoryDecisions
// =============================================================================

describe("convertFactoryDecisions", () => {
  const state = createMinimalState();

  it("DS-04: efficiency investment maps to correct factory ID", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      efficiencyInvestment: { workers: 5_000_000, engineers: 2_000_000, equipment: 1_000_000 },
    };

    const result = convertFactoryDecisions(ui, state);

    expect(result.efficiencyInvestments["f1"]).toBeDefined();
    expect(result.efficiencyInvestments["f1"].workers).toBe(5_000_000);
    expect(result.efficiencyInvestments["f1"].engineers).toBe(2_000_000);
    expect(result.efficiencyInvestments["f1"].machinery).toBe(1_000_000);
  });

  it("DS-04b: zero efficiency investment produces empty efficiencyInvestments", () => {
    const ui = createEmptyFactoryUI();
    const result = convertFactoryDecisions(ui, state);

    expect(Object.keys(result.efficiencyInvestments)).toHaveLength(0);
  });

  it("DS-05: machine purchase (assembly_line) goes to machineryDecisions, NOT upgradePurchases", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      upgradePurchases: [{ factoryId: "f1", upgradeName: "assembly_line" }],
    };

    const result = convertFactoryDecisions(ui, state);

    // Must be in machineryDecisions
    expect(result.machineryDecisions).toBeDefined();
    expect(result.machineryDecisions!.purchases).toHaveLength(1);
    expect(result.machineryDecisions!.purchases[0].machineType).toBe("assembly_line");
    expect(result.machineryDecisions!.purchases[0].factoryId).toBe("f1");

    // Must NOT be in upgradePurchases
    expect(result.upgradePurchases).toHaveLength(0);
  });

  it("DS-06: factory upgrade (automation) goes to upgradePurchases, NOT machineryDecisions", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      upgradePurchases: [{ factoryId: "f1", upgradeName: "automation" }],
    };

    const result = convertFactoryDecisions(ui, state);

    // Must be in upgradePurchases
    expect(result.upgradePurchases).toHaveLength(1);
    expect(result.upgradePurchases[0].upgrade).toBe("automation");
    expect(result.upgradePurchases[0].factoryId).toBe("f1");

    // Must NOT be in machineryDecisions
    expect(result.machineryDecisions).toBeUndefined();
  });

  it("DS-05+06 combined: mixed machine purchases and factory upgrades separated correctly", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      upgradePurchases: [
        { factoryId: "f1", upgradeName: "assembly_line" },  // machine
        { factoryId: "f1", upgradeName: "automation" },      // upgrade
        { factoryId: "f1", upgradeName: "cnc_machine" },     // machine
        { factoryId: "f1", upgradeName: "cleanRoom" },       // upgrade
      ],
    };

    const result = convertFactoryDecisions(ui, state);

    expect(result.machineryDecisions!.purchases).toHaveLength(2);
    expect(result.machineryDecisions!.purchases.map(p => p.machineType)).toContain("assembly_line");
    expect(result.machineryDecisions!.purchases.map(p => p.machineType)).toContain("cnc_machine");

    expect(result.upgradePurchases).toHaveLength(2);
    expect(result.upgradePurchases.map(u => u.upgrade)).toContain("automation");
    expect(result.upgradePurchases.map(u => u.upgrade)).toContain("cleanRoom");
  });

  it("DS-07: productionLineDecisions pass through unchanged", () => {
    const assignments = [{ lineId: "l1", productId: "p1" }];
    const targets = [{ lineId: "l1", targetOutput: 5000 }];

    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      productionLineDecisions: { assignments, targets },
    };

    const result = convertFactoryDecisions(ui, state);

    expect(result.productionLineDecisions).toBeDefined();
    expect(result.productionLineDecisions!.assignments).toEqual(assignments);
    expect(result.productionLineDecisions!.targets).toEqual(targets);
  });

  it("DS-07b: undefined productionLineDecisions → undefined in output", () => {
    const ui = createEmptyFactoryUI();
    const result = convertFactoryDecisions(ui, state);

    expect(result.productionLineDecisions).toBeUndefined();
  });

  it("DS-08: warehouseDecisions tier cast correctly as number", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      warehouseDecisions: {
        build: [{ factoryId: "f1", tier: 2 }],
        rent: [{ factoryId: "f1", tier: 1 }],
      },
    };

    const result = convertFactoryDecisions(ui, state);

    expect(result.warehouseDecisions).toBeDefined();
    expect(result.warehouseDecisions!.build![0].tier).toBe(2);
    expect(result.warehouseDecisions!.build![0].factoryId).toBe("f1");
    expect(typeof result.warehouseDecisions!.build![0].tier).toBe("number");
    expect(result.warehouseDecisions!.rent![0].tier).toBe(1);
  });

  it("DS-08b: undefined warehouseDecisions → undefined in output", () => {
    const ui = createEmptyFactoryUI();
    const result = convertFactoryDecisions(ui, state);

    expect(result.warehouseDecisions).toBeUndefined();
  });

  it("esgInitiatives pass through when present", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      esgInitiatives: { circularEconomy: true, waterConservation: false },
    };

    const result = convertFactoryDecisions(ui, state);

    expect(result.esgInitiatives).toBeDefined();
    expect(result.esgInitiatives!.circularEconomy).toBe(true);
    expect(result.esgInitiatives!.waterConservation).toBe(false);
  });

  it("productionAllocations with non-zero values map to engine format", () => {
    const ui: UIFactoryDecisions = {
      ...createEmptyFactoryUI(),
      productionAllocations: { General: 60, Budget: 40, Enthusiast: 0 },
    };

    const result = convertFactoryDecisions(ui, state);

    // Only non-zero allocations should be included
    expect(result.productionAllocations.length).toBe(2);
    expect(result.productionAllocations.find(a => a.segment === "General")?.quantity).toBe(60);
    expect(result.productionAllocations.find(a => a.segment === "Budget")?.quantity).toBe(40);
  });
});

// =============================================================================
// DS-09 through DS-10: convertHRDecisions
// =============================================================================

describe("convertHRDecisions", () => {
  it("DS-09: salaryAdjustment 10% → multiplier 1.10 for all roles", () => {
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

  it("DS-09b: salaryAdjustment -5% → multiplier 0.95 for all roles", () => {
    const ui: UIHRDecisions = {
      ...createEmptyHRUI(),
      salaryAdjustment: -5,
    };

    const result = convertHRDecisions(ui);

    expect(result.salaryMultiplierChanges).toBeDefined();
    expect(result.salaryMultiplierChanges!.workers).toBeCloseTo(0.95);
    expect(result.salaryMultiplierChanges!.engineers).toBeCloseTo(0.95);
    expect(result.salaryMultiplierChanges!.supervisors).toBeCloseTo(0.95);
  });

  it("DS-10: zero salary adjustment → undefined (no field sent to engine)", () => {
    const ui: UIHRDecisions = {
      ...createEmptyHRUI(),
      salaryAdjustment: 0,
    };

    const result = convertHRDecisions(ui);

    expect(result.salaryMultiplierChanges).toBeUndefined();
  });

  it("hires map with correct role and candidateData", () => {
    const ui: UIHRDecisions = {
      ...createEmptyHRUI(),
      hires: [
        {
          role: "worker",
          candidateId: "c1",
          candidateData: { name: "John", stats: { efficiency: 70 }, salary: 50000 },
        },
      ],
    };

    const result = convertHRDecisions(ui);

    expect(result.hires).toHaveLength(1);
    expect(result.hires[0].role).toBe("worker");
    expect(result.hires[0].candidateId).toBe("c1");
    expect(result.hires[0].candidateData?.name).toBe("John");
  });

  it("recruitmentSearches map tier correctly", () => {
    const ui: UIHRDecisions = {
      ...createEmptyHRUI(),
      recruitmentSearches: [{ role: "engineer", tier: "premium" }],
    };

    const result = convertHRDecisions(ui);

    expect(result.recruitmentSearches).toHaveLength(1);
    expect(result.recruitmentSearches[0].role).toBe("engineer");
    expect(result.recruitmentSearches[0].tier).toBe("premium");
  });
});

// =============================================================================
// DS-11 through DS-12: convertMarketingDecisions
// =============================================================================

describe("convertMarketingDecisions", () => {
  it("DS-11: adBudgets channels summed per segment", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      adBudgets: {
        General: { tv: 1_000_000, digital: 2_000_000, print: 500_000 },
        Budget: { digital: 800_000 },
      },
    };

    const result = convertMarketingDecisions(ui);

    expect(result.advertisingBudget.General).toBe(3_500_000);
    expect(result.advertisingBudget.Budget).toBe(800_000);
  });

  it("DS-11b: zero total for a segment → not included in advertisingBudget", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      adBudgets: {
        General: { tv: 0, digital: 0 },
        Budget: { digital: 500_000 },
      },
    };

    const result = convertMarketingDecisions(ui);

    expect(result.advertisingBudget.General).toBeUndefined();
    expect(result.advertisingBudget.Budget).toBe(500_000);
  });

  it("DS-12: brandActivities ['celebrity'] → sponsorships with correct cost and impact", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      brandActivities: ["celebrity"],
    };

    const result = convertMarketingDecisions(ui);

    expect(result.sponsorships).toBeDefined();
    expect(result.sponsorships).toHaveLength(1);
    expect(result.sponsorships![0].cost).toBe(15_000_000);
    expect(result.sponsorships![0].brandImpact).toBe(0.10);
  });

  it("DS-12b: multiple brandActivities map correctly", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      brandActivities: ["celebrity", "sponsorship"],
    };

    const result = convertMarketingDecisions(ui);

    expect(result.sponsorships).toHaveLength(2);
    expect(result.sponsorships![0].cost).toBe(BRAND_ACTIVITY_MAP.celebrity.cost);
    expect(result.sponsorships![1].cost).toBe(BRAND_ACTIVITY_MAP.sponsorship.cost);
  });

  it("DS-12c: empty brandActivities → sponsorships undefined", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      brandActivities: [],
    };

    const result = convertMarketingDecisions(ui);

    expect(result.sponsorships).toBeUndefined();
  });

  it("brandInvestment passes through when non-zero", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      brandInvestment: 3_000_000,
    };

    const result = convertMarketingDecisions(ui);

    expect(result.brandingInvestment).toBe(3_000_000);
  });

  it("zero brandInvestment → undefined", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      brandInvestment: 0,
    };

    const result = convertMarketingDecisions(ui);

    expect(result.brandingInvestment).toBeUndefined();
  });

  it("promotions map type to segment and intensity to discountPercent", () => {
    const ui: UIMarketingDecisions = {
      ...createEmptyMarketingUI(),
      promotions: [{ type: "General", intensity: 15 }],
    };

    const result = convertMarketingDecisions(ui);

    expect(result.promotions).toHaveLength(1);
    expect(result.promotions[0].segment).toBe("General");
    expect(result.promotions[0].discountPercent).toBe(15);
    expect(result.promotions[0].duration).toBe(1);
  });
});

// =============================================================================
// DS-13: convertRDDecisions
// =============================================================================

describe("convertRDDecisions", () => {
  it("DS-13a: rdInvestment $8M → engine.rdBudget = 8_000_000", () => {
    const ui: UIRDDecisions = {
      ...createEmptyRDUI(),
      rdInvestment: 8_000_000,
    };

    const result = convertRDDecisions(ui);

    expect(result.rdBudget).toBe(8_000_000);
  });

  it("DS-13b: zero rdInvestment → rdBudget undefined (not 0)", () => {
    const ui: UIRDDecisions = {
      ...createEmptyRDUI(),
      rdInvestment: 0,
    };

    const result = convertRDDecisions(ui);

    expect(result.rdBudget).toBeUndefined();
  });

  it("newProducts map fields correctly", () => {
    const ui: UIRDDecisions = {
      ...createEmptyRDUI(),
      rdInvestment: 5_000_000,
      newProducts: [
        {
          name: "Pro Max",
          segment: "Professional",
          qualityTarget: 95,
          featuresTarget: 90,
          priceTarget: 1200,
          archetypeId: "premium-pro",
        },
      ],
    };

    const result = convertRDDecisions(ui);

    expect(result.newProducts).toHaveLength(1);
    expect(result.newProducts[0].name).toBe("Pro Max");
    expect(result.newProducts[0].segment).toBe("Professional");
    expect(result.newProducts[0].targetQuality).toBe(95);
    expect(result.newProducts[0].targetFeatures).toBe(90);
    expect(result.newProducts[0].archetypeId).toBe("premium-pro");
  });
});

// =============================================================================
// DS-14: convertFinanceDecisions
// =============================================================================

describe("convertFinanceDecisions", () => {
  it("DS-14a: null issueShares → stockIssuance undefined", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      issueShares: null,
    };

    const result = convertFinanceDecisions(ui);

    expect(result.stockIssuance).toBeUndefined();
  });

  it("DS-14b: issueShares with count and pricePerShare → stockIssuance mapped", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      issueShares: { count: 1_000_000, pricePerShare: 55 },
    };

    const result = convertFinanceDecisions(ui);

    expect(result.stockIssuance).toBeDefined();
    expect(result.stockIssuance!.shares).toBe(1_000_000);
    expect(result.stockIssuance!.pricePerShare).toBe(55);
  });

  it("DS-14c: issueTBills = 0 → treasuryBillsIssue undefined (not 0)", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      issueTBills: 0,
    };

    const result = convertFinanceDecisions(ui);

    expect(result.treasuryBillsIssue).toBeUndefined();
  });

  it("DS-14d: issueTBills = 5_000_000 → treasuryBillsIssue = 5_000_000", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      issueTBills: 5_000_000,
    };

    const result = convertFinanceDecisions(ui);

    expect(result.treasuryBillsIssue).toBe(5_000_000);
  });

  it("issueBonds = 0 → corporateBondsIssue undefined", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      issueBonds: 0,
    };

    const result = convertFinanceDecisions(ui);

    expect(result.corporateBondsIssue).toBeUndefined();
  });

  it("sharesBuyback = 0 → sharesBuyback undefined", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      sharesBuyback: 0,
    };

    const result = convertFinanceDecisions(ui);

    expect(result.sharesBuyback).toBeUndefined();
  });

  it("dividendPerShare = 0 → dividendPerShare undefined", () => {
    const ui: UIFinanceDecisions = {
      ...createEmptyFinanceUI(),
      dividendPerShare: 0,
    };

    const result = convertFinanceDecisions(ui);

    expect(result.dividendPerShare).toBeUndefined();
  });
});
