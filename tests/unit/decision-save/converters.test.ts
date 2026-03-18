/**
 * Layer 0 — Decision Save Pipeline: Converter Tests (DS-04 through DS-14)
 *
 * Tests all 5 converter functions that bridge UI decisions → Engine decisions.
 * These are P0 critical — converter bugs silently misrepresent player intentions.
 */
import { describe, it, expect } from "vitest";
import {
  convertFactoryDecisions,
  convertHRDecisions,
  convertFinanceDecisions,
  convertMarketingDecisions,
  convertRDDecisions,
} from "@/lib/converters/decisionConverters";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { UIFactoryDecisions, UIHRDecisions, UIFinanceDecisions, UIMarketingDecisions, UIRDDecisions } from "@/lib/stores/decisionStore";

// Create a minimal team state for tests
function createMinimalState() {
  return SimulationEngine.createInitialTeamState();
}

function emptyFactoryUI(): UIFactoryDecisions {
  return {
    efficiencyInvestment: { workers: 0, engineers: 0, equipment: 0 },
    esgInvestment: 0,
    productionAllocations: {},
    upgradePurchases: [],
    newFactories: [],
  };
}

// ============================================
// DS-04: convertFactoryDecisions — efficiency investment
// ============================================
describe("DS-04: convertFactoryDecisions — efficiency investment maps to correct factory", () => {
  it("workers=5M maps to first factory ID", () => {
    const state = createMinimalState();
    const factoryId = state.factories[0].id;
    const ui: UIFactoryDecisions = {
      ...emptyFactoryUI(),
      efficiencyInvestment: { workers: 5_000_000, engineers: 0, equipment: 0 },
    };

    const engine = convertFactoryDecisions(ui, state);
    expect(engine.efficiencyInvestments![factoryId]!.workers).toBe(5_000_000);
  });

  it("equipment maps to machinery field in engine", () => {
    const state = createMinimalState();
    const factoryId = state.factories[0].id;
    const ui: UIFactoryDecisions = {
      ...emptyFactoryUI(),
      efficiencyInvestment: { workers: 0, engineers: 0, equipment: 3_000_000 },
    };

    const engine = convertFactoryDecisions(ui, state);
    expect(engine.efficiencyInvestments![factoryId]!.machinery).toBe(3_000_000);
  });
});

// ============================================
// DS-05: Machine purchase separated from factory upgrade
// ============================================
describe("DS-05: convertFactoryDecisions — machine purchase separated from upgrade", () => {
  it("assembly_line goes to machineryDecisions, NOT upgradePurchases", () => {
    const state = createMinimalState();
    const ui: UIFactoryDecisions = {
      ...emptyFactoryUI(),
      upgradePurchases: [{ factoryId: "f1", upgradeName: "assembly_line" }],
    };

    const engine = convertFactoryDecisions(ui, state);
    expect(engine.machineryDecisions?.purchases?.[0]?.machineType).toBe("assembly_line");
    expect(engine.upgradePurchases?.length ?? 0).toBe(0);
  });
});

// ============================================
// DS-06: Factory upgrade (non-machine) correct path
// ============================================
describe("DS-06: convertFactoryDecisions — factory upgrade correct path", () => {
  it("automation goes to upgradePurchases, NOT machineryDecisions", () => {
    const state = createMinimalState();
    const ui: UIFactoryDecisions = {
      ...emptyFactoryUI(),
      upgradePurchases: [{ factoryId: "f1", upgradeName: "automation" }],
    };

    const engine = convertFactoryDecisions(ui, state);
    expect(engine.upgradePurchases?.[0]?.upgrade).toBe("automation");
    expect(engine.machineryDecisions).toBeUndefined();
  });
});

// ============================================
// DS-07: productionLineDecisions pass through
// ============================================
describe("DS-07: convertFactoryDecisions — productionLineDecisions pass through", () => {
  it("assignments pass through unchanged", () => {
    const state = createMinimalState();
    const ui: UIFactoryDecisions = {
      ...emptyFactoryUI(),
      productionLineDecisions: {
        assignments: [{ lineId: "l1", productId: "p1" }],
        targets: [{ lineId: "l1", targetOutput: 5000 }],
      },
    };

    const engine = convertFactoryDecisions(ui, state);
    expect(engine.productionLineDecisions?.assignments?.[0]).toEqual({ lineId: "l1", productId: "p1" });
    expect(engine.productionLineDecisions?.targets?.[0]).toEqual({ lineId: "l1", targetOutput: 5000 });
  });
});

// ============================================
// DS-08: warehouseDecisions tier cast
// ============================================
describe("DS-08: convertFactoryDecisions — warehouseDecisions tier cast", () => {
  it("tier 2 passes through as number", () => {
    const state = createMinimalState();
    const ui: UIFactoryDecisions = {
      ...emptyFactoryUI(),
      warehouseDecisions: {
        build: [{ factoryId: "f1", tier: 2 }],
      },
    };

    const engine = convertFactoryDecisions(ui, state);
    expect(engine.warehouseDecisions?.build?.[0]?.tier).toBe(2);
    expect(typeof engine.warehouseDecisions?.build?.[0]?.tier).toBe("number");
  });
});

// ============================================
// DS-09: convertHRDecisions — salaryAdjustment → multiplier
// ============================================
describe("DS-09: convertHRDecisions — salary adjustment to multiplier", () => {
  it("salaryAdjustment=10 → multipliers 1.10", () => {
    const ui: UIHRDecisions = {
      hires: [],
      fires: [],
      recruitmentSearches: [],
      salaryAdjustment: 10,
      trainingPrograms: [],
      promotions: [],
    };

    const engine = convertHRDecisions(ui);
    expect(engine.salaryMultiplierChanges?.workers).toBeCloseTo(1.10, 2);
    expect(engine.salaryMultiplierChanges?.engineers).toBeCloseTo(1.10, 2);
    expect(engine.salaryMultiplierChanges?.supervisors).toBeCloseTo(1.10, 2);
  });
});

// ============================================
// DS-10: convertHRDecisions — zero salary → undefined
// ============================================
describe("DS-10: convertHRDecisions — zero salary adjustment", () => {
  it("salaryAdjustment=0 → no multiplier field", () => {
    const ui: UIHRDecisions = {
      hires: [],
      fires: [],
      recruitmentSearches: [],
      salaryAdjustment: 0,
      trainingPrograms: [],
      promotions: [],
    };

    const engine = convertHRDecisions(ui);
    expect(engine.salaryMultiplierChanges).toBeUndefined();
  });
});

// ============================================
// DS-11: convertMarketingDecisions — channels summed per segment
// ============================================
describe("DS-11: convertMarketingDecisions — ad channels summed", () => {
  it("tv=1M + digital=2M → General=3M", () => {
    const ui: UIMarketingDecisions = {
      adBudgets: { General: { tv: 1_000_000, digital: 2_000_000, social: 0, print: 0 } },
      brandInvestment: 0,
      brandActivities: [],
      promotions: [],
    };

    const engine = convertMarketingDecisions(ui);
    expect(engine.advertisingBudget?.General).toBe(3_000_000);
  });
});

// ============================================
// DS-12: convertMarketingDecisions — brand activities → sponsorships
// ============================================
describe("DS-12: convertMarketingDecisions — brand activities mapped", () => {
  it("celebrity → sponsorship with cost $15M and impact 0.10", () => {
    const ui: UIMarketingDecisions = {
      adBudgets: {},
      brandInvestment: 0,
      brandActivities: ["celebrity"],
      promotions: [],
    };

    const engine = convertMarketingDecisions(ui);
    expect(engine.sponsorships?.[0]?.cost).toBe(15_000_000);
    expect(engine.sponsorships?.[0]?.brandImpact).toBe(0.10);
    expect(engine.sponsorships?.[0]?.name).toBe("Celebrity Endorsement");
  });

  it("empty brand activities → no sponsorships", () => {
    const ui: UIMarketingDecisions = {
      adBudgets: {},
      brandInvestment: 0,
      brandActivities: [],
      promotions: [],
    };

    const engine = convertMarketingDecisions(ui);
    expect(engine.sponsorships?.length ?? 0).toBe(0);
  });
});

// ============================================
// DS-13: convertRDDecisions — zero investment → undefined
// ============================================
describe("DS-13: convertRDDecisions — zero investment handling", () => {
  it("rdInvestment=8M → rdBudget=8M", () => {
    const ui: UIRDDecisions = {
      rdInvestment: 8_000_000,
      newProducts: [],
      techUpgrades: [],
    };

    const engine = convertRDDecisions(ui);
    expect(engine.rdBudget).toBe(8_000_000);
  });

  it("rdInvestment=0 → rdBudget undefined", () => {
    const ui: UIRDDecisions = {
      rdInvestment: 0,
      newProducts: [],
      techUpgrades: [],
    };

    const engine = convertRDDecisions(ui);
    expect(engine.rdBudget).toBeUndefined();
  });
});

// ============================================
// DS-14: convertFinanceDecisions — null shares → undefined
// ============================================
describe("DS-14: convertFinanceDecisions — null handling", () => {
  it("issueShares=null → stockIssuance undefined", () => {
    const ui: UIFinanceDecisions = {
      issueTBills: 0,
      issueBonds: 0,
      issueShares: null,
      sharesBuyback: 0,
      dividendPerShare: 0,
    };

    const engine = convertFinanceDecisions(ui);
    expect(engine.stockIssuance).toBeUndefined();
  });

  it("issueShares with values → stockIssuance populated", () => {
    const ui: UIFinanceDecisions = {
      issueTBills: 0,
      issueBonds: 0,
      issueShares: { count: 1_000_000, pricePerShare: 55 },
      sharesBuyback: 0,
      dividendPerShare: 0,
    };

    const engine = convertFinanceDecisions(ui);
    expect(engine.stockIssuance?.shares).toBe(1_000_000);
    expect(engine.stockIssuance?.pricePerShare).toBe(55);
  });

  it("issueTBills=0 → treasuryBillsIssue undefined", () => {
    const ui: UIFinanceDecisions = {
      issueTBills: 0,
      issueBonds: 0,
      issueShares: null,
      sharesBuyback: 0,
      dividendPerShare: 0,
    };

    const engine = convertFinanceDecisions(ui);
    expect(engine.treasuryBillsIssue).toBeUndefined();
  });
});

// ============================================
// DS-EXTRA: Tech upgrades and patents pass through (R&D)
// ============================================
describe("convertRDDecisions — tech and patent passthrough", () => {
  it("techUpgrades pass through to engine", () => {
    const ui: UIRDDecisions = {
      rdInvestment: 5_000_000,
      newProducts: [],
      techUpgrades: ["process_optimization", "advanced_manufacturing"],
    };

    const engine = convertRDDecisions(ui);
    expect(engine.techUpgrades).toEqual(["process_optimization", "advanced_manufacturing"]);
  });

  it("patentFilings pass through to engine", () => {
    const ui: UIRDDecisions = {
      rdInvestment: 5_000_000,
      newProducts: [],
      techUpgrades: [],
      patentFilings: ["tech-1"],
      patentLicenseRequests: ["patent-1"],
      patentChallenges: ["patent-2"],
    };

    const engine = convertRDDecisions(ui);
    expect(engine.patentFilings).toEqual(["tech-1"]);
    expect(engine.patentLicenseRequests).toEqual(["patent-1"]);
    expect(engine.patentChallenges).toEqual(["patent-2"]);
  });

  it("empty arrays → undefined (not empty arrays)", () => {
    const ui: UIRDDecisions = {
      rdInvestment: 0,
      newProducts: [],
      techUpgrades: [],
    };

    const engine = convertRDDecisions(ui);
    expect(engine.techUpgrades).toBeUndefined();
    expect(engine.patentFilings).toBeUndefined();
  });
});
