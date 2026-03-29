/**
 * Layer 0 — Decision Save Pipeline: DecisionStore Tests (DS-01 through DS-03)
 *
 * Tests the Zustand store that holds draft decisions between page navigations.
 * Verifies that setting one module doesn't clobber another, reset clears all,
 * and budget totals compute correctly across modules.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useDecisionStore } from "@/lib/stores/decisionStore";

describe("decisionStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useDecisionStore.getState().resetAll();
  });

  // ===========================================================================
  // DS-01: Factory draft persists when other modules change
  // ===========================================================================

  it("DS-01: factory draft persists on navigation (setting other modules)", () => {
    const store = useDecisionStore;

    // Player sets factory efficiency investment
    store.getState().setFactoryDecisions({
      efficiencyInvestment: { workers: 5_000_000, engineers: 2_000_000, equipment: 0 },
    });

    // Player navigates to HR and sets salary adjustment
    store.getState().setHRDecisions({
      salaryAdjustment: 10,
    });

    // Player navigates to Marketing and sets brand investment
    store.getState().setMarketingDecisions({
      brandInvestment: 3_000_000,
    });

    // Factory values must still be intact
    const state = store.getState();
    expect(state.factory.efficiencyInvestment.workers).toBe(5_000_000);
    expect(state.factory.efficiencyInvestment.engineers).toBe(2_000_000);

    // HR and Marketing also intact
    expect(state.hr.salaryAdjustment).toBe(10);
    expect(state.marketing.brandInvestment).toBe(3_000_000);
  });

  it("DS-01b: partial factory update merges, does not replace", () => {
    const store = useDecisionStore;

    // Set efficiency investment
    store.getState().setFactoryDecisions({
      efficiencyInvestment: { workers: 5_000_000, engineers: 0, equipment: 0 },
    });

    // Set ESG investment (partial update — should merge, not replace)
    store.getState().setFactoryDecisions({
      esgInvestment: 1_000_000,
    });

    const state = store.getState();
    // Both should be present
    expect(state.factory.efficiencyInvestment.workers).toBe(5_000_000);
    expect(state.factory.esgInvestment).toBe(1_000_000);
  });

  // ===========================================================================
  // DS-02: resetDecisions clears all 5 modules
  // ===========================================================================

  it("DS-02: resetAll clears all 5 modules to initial defaults", () => {
    const store = useDecisionStore;

    // Fill all 5 modules with non-default values
    store.getState().setFactoryDecisions({
      efficiencyInvestment: { workers: 5_000_000, engineers: 2_000_000, equipment: 1_000_000 },
      esgInvestment: 500_000,
    });
    store.getState().setHRDecisions({
      salaryAdjustment: 15,
      hires: [{ role: "worker", candidateId: "c1" }],
    });
    store.getState().setMarketingDecisions({
      brandInvestment: 3_000_000,
      brandActivities: ["celebrity"],
    });
    store.getState().setFinanceDecisions({
      issueTBills: 10_000_000,
      dividendPerShare: 5,
    });
    store.getState().setRDDecisions({
      rdInvestment: 8_000_000,
    });

    // Verify something was set
    expect(store.getState().factory.efficiencyInvestment.workers).toBe(5_000_000);

    // Reset everything
    store.getState().resetAll();

    // Verify all 5 modules are at defaults
    const state = store.getState();

    // Factory
    expect(state.factory.efficiencyInvestment.workers).toBe(0);
    expect(state.factory.efficiencyInvestment.engineers).toBe(0);
    expect(state.factory.efficiencyInvestment.equipment).toBe(0);
    expect(state.factory.esgInvestment).toBe(0);
    expect(state.factory.upgradePurchases).toHaveLength(0);
    expect(state.factory.newFactories).toHaveLength(0);

    // HR
    expect(state.hr.salaryAdjustment).toBe(0);
    expect(state.hr.hires).toHaveLength(0);
    expect(state.hr.fires).toHaveLength(0);
    expect(state.hr.recruitmentSearches).toHaveLength(0);
    expect(state.hr.trainingPrograms).toHaveLength(0);

    // Marketing
    expect(state.marketing.brandInvestment).toBe(0);
    expect(state.marketing.brandActivities).toHaveLength(0);
    expect(state.marketing.promotions).toHaveLength(0);

    // Finance
    expect(state.finance.issueTBills).toBe(0);
    expect(state.finance.issueBonds).toBe(0);
    expect(state.finance.issueShares).toBeNull();
    expect(state.finance.sharesBuyback).toBe(0);
    expect(state.finance.dividendPerShare).toBe(0);

    // R&D
    expect(state.rd.rdInvestment).toBe(0);
    expect(state.rd.newProducts).toHaveLength(0);
    expect(state.rd.techUpgrades).toHaveLength(0);
  });

  it("DS-02b: resetModule clears only the specified module", () => {
    const store = useDecisionStore;

    // Set values in factory and marketing
    store.getState().setFactoryDecisions({
      efficiencyInvestment: { workers: 5_000_000, engineers: 0, equipment: 0 },
    });
    store.getState().setMarketingDecisions({
      brandInvestment: 3_000_000,
    });

    // Reset only factory
    store.getState().resetModule("FACTORY");

    const state = store.getState();
    // Factory should be cleared
    expect(state.factory.efficiencyInvestment.workers).toBe(0);

    // Marketing should be untouched
    expect(state.marketing.brandInvestment).toBe(3_000_000);
  });

  // ===========================================================================
  // DS-03: Total budget computed correctly cross-module
  // ===========================================================================

  it("DS-03: total budget computed correctly across modules", () => {
    const store = useDecisionStore;

    // Factory: $5M efficiency + $1M ESG = $6M
    store.getState().setFactoryDecisions({
      efficiencyInvestment: { workers: 3_000_000, engineers: 1_000_000, equipment: 1_000_000 },
      esgInvestment: 1_000_000,
    });

    // Marketing: $4M brand investment
    store.getState().setMarketingDecisions({
      brandInvestment: 4_000_000,
    });

    // R&D: $8M
    store.getState().setRDDecisions({
      rdInvestment: 8_000_000,
    });

    const state = store.getState();

    // Calculate total budget from store state
    const factoryTotal =
      state.factory.efficiencyInvestment.workers +
      state.factory.efficiencyInvestment.engineers +
      state.factory.efficiencyInvestment.equipment +
      state.factory.esgInvestment;
    const marketingTotal = state.marketing.brandInvestment;
    const rdTotal = state.rd.rdInvestment;
    const total = factoryTotal + marketingTotal + rdTotal;

    expect(factoryTotal).toBe(6_000_000);
    expect(marketingTotal).toBe(4_000_000);
    expect(rdTotal).toBe(8_000_000);
    expect(total).toBe(18_000_000);
  });

  // ===========================================================================
  // Submission status tracking
  // ===========================================================================

  it("setting decisions marks module as dirty", () => {
    const store = useDecisionStore;

    // Initially not dirty
    expect(store.getState().submissionStatus.FACTORY.isDirty).toBe(false);

    // Setting decisions should mark dirty
    store.getState().setFactoryDecisions({
      esgInvestment: 100_000,
    });

    expect(store.getState().submissionStatus.FACTORY.isDirty).toBe(true);

    // Other modules should not be dirty
    expect(store.getState().submissionStatus.HR.isDirty).toBe(false);
    expect(store.getState().submissionStatus.MARKETING.isDirty).toBe(false);
  });

  it("setSubmitted clears dirty flag and records timestamp", () => {
    const store = useDecisionStore;

    // Mark dirty then submitted
    store.getState().setFactoryDecisions({ esgInvestment: 100 });
    expect(store.getState().submissionStatus.FACTORY.isDirty).toBe(true);

    const now = new Date();
    store.getState().setSubmitted("FACTORY", now);

    const status = store.getState().submissionStatus.FACTORY;
    expect(status.isDirty).toBe(false);
    expect(status.isSubmitted).toBe(true);
    expect(status.isSubmitting).toBe(false);
    expect(status.lastSubmittedAt).toBe(now);
    expect(status.error).toBeNull();
  });

  it("setLocked marks module as locked", () => {
    const store = useDecisionStore;

    store.getState().setLocked("FACTORY", true);
    expect(store.getState().submissionStatus.FACTORY.isLocked).toBe(true);

    store.getState().setLocked("FACTORY", false);
    expect(store.getState().submissionStatus.FACTORY.isLocked).toBe(false);
  });

  it("loadFromServer hydrates decisions and status from server data", () => {
    const store = useDecisionStore;
    const submittedAt = new Date("2026-03-18T10:00:00Z");

    store.getState().loadFromServer([
      {
        module: "FACTORY",
        decisions: {
          efficiencyInvestment: { workers: 3_000_000, engineers: 0, equipment: 0 },
          esgInvestment: 500_000,
        },
        submittedAt,
        isLocked: true,
      },
      {
        module: "RD",
        decisions: { rdInvestment: 5_000_000 },
        submittedAt,
        isLocked: false,
      },
    ]);

    const state = store.getState();

    // Factory decisions loaded
    expect(state.factory.efficiencyInvestment.workers).toBe(3_000_000);
    expect(state.factory.esgInvestment).toBe(500_000);
    expect(state.submissionStatus.FACTORY.isSubmitted).toBe(true);
    expect(state.submissionStatus.FACTORY.isLocked).toBe(true);
    expect(state.submissionStatus.FACTORY.lastSubmittedAt).toEqual(submittedAt);

    // R&D decisions loaded
    expect(state.rd.rdInvestment).toBe(5_000_000);
    expect(state.submissionStatus.RD.isSubmitted).toBe(true);
    expect(state.submissionStatus.RD.isLocked).toBe(false);

    // Other modules untouched
    expect(state.submissionStatus.HR.isSubmitted).toBe(false);
  });
});
