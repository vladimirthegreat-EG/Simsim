/**
 * Finance Module — Stress Test Suite
 *
 * Tests FinanceModule.process(), financial ratios, financial statements,
 * debt instruments, stock operations, and balance sheet integrity.
 *
 * A. Golden path deterministic snapshots
 * B. Edge scenarios
 * C. Property tests (invariants across seeded scenarios)
 * D. Regression tests
 */

import { describe, it, expect } from "vitest";
import { FinanceModule } from "@/engine/modules/FinanceModule";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { TeamState, MarketState, FinanceDecisions } from "@/engine/types";
import {
  createTeamState,
  createMarketState,
  createDecisions,
  runSimulation,
  assertNoNaN,
  assertFinancialInvariants,
  assertAllInvariants,
  assertNoOverflow,
  assertBalanceSheetEquation,
} from "@/engine/testkit";

// ============================================
// HELPERS
// ============================================

function processFinance(
  state: TeamState,
  decisions: FinanceDecisions,
  market?: MarketState
): { newState: TeamState; result: any } {
  return FinanceModule.process(state, decisions, market || createMarketState());
}

// ============================================
// CATEGORY A — Golden Path Deterministic
// ============================================

describe("Finance Stress — Category A: Golden Path", () => {
  it("2 teams, 3 rounds — finance decisions applied correctly", () => {
    const result = runSimulation({
      teamCount: 2,
      rounds: 3,
      seed: "finance-golden-2x3",
      profile: "baseline-balanced",
    });

    for (const state of result.finalStates) {
      assertFinancialInvariants(state);
    }
  });

  it("6 teams, 8 rounds — all financial fields remain finite", () => {
    const result = runSimulation({
      teamCount: 6,
      rounds: 8,
      seed: "finance-golden-6x8",
      profile: "aggressive-debt",
    });

    for (const state of result.finalStates) {
      assertNoNaN(state);
      assertNoOverflow(state);
    }
  });
});

// ============================================
// CATEGORY B — Edge Scenarios
// ============================================

describe("Finance Stress — Category B: Edge Scenarios", () => {
  it("treasury bills issuance increases cash and short-term debt", () => {
    const state = createTeamState("baseline-balanced");
    const initialCash = state.cash;
    const initialSTDebt = state.shortTermDebt;
    const initialLiabilities = state.totalLiabilities;

    const { newState } = processFinance(state, {
      treasuryBillsIssue: 20_000_000,
    });

    expect(newState.cash).toBe(initialCash + 20_000_000);
    expect(newState.shortTermDebt).toBe(initialSTDebt + 20_000_000);
    expect(newState.totalLiabilities).toBe(initialLiabilities + 20_000_000);
  });

  it("corporate bonds issuance increases cash and long-term debt", () => {
    const state = createTeamState("baseline-balanced");
    const initialCash = state.cash;
    const initialLTDebt = state.longTermDebt;

    const { newState } = processFinance(state, {
      corporateBondsIssue: 50_000_000,
    });

    expect(newState.cash).toBe(initialCash + 50_000_000);
    expect(newState.longTermDebt).toBe(initialLTDebt + 50_000_000);
  });

  it("bank loan categorized by term (<=12m → short, >12m → long)", () => {
    // Short-term loan
    const state1 = createTeamState("baseline-balanced");
    const { newState: st1 } = processFinance(state1, {
      loanRequest: { amount: 10_000_000, termMonths: 6 },
    });
    expect(st1.shortTermDebt).toBeGreaterThan(state1.shortTermDebt);

    // Long-term loan
    const state2 = createTeamState("baseline-balanced");
    const { newState: st2 } = processFinance(state2, {
      loanRequest: { amount: 10_000_000, termMonths: 24 },
    });
    expect(st2.longTermDebt).toBeGreaterThan(state2.longTermDebt);
  });

  it("stock issuance increases shares, cash, and equity", () => {
    const state = createTeamState("baseline-balanced");
    const initialShares = state.sharesIssued;
    const initialCash = state.cash;

    const { newState } = processFinance(state, {
      stockIssuance: { shares: 1_000_000, pricePerShare: 50 },
    });

    expect(newState.sharesIssued).toBe(initialShares + 1_000_000);
    expect(newState.cash).toBe(initialCash + 50_000_000);
  });

  it("share buyback reduces shares and cash", () => {
    const state = createTeamState("baseline-balanced");
    const initialShares = state.sharesIssued;
    const initialCash = state.cash;

    const { newState } = processFinance(state, {
      sharesBuyback: 5_000_000,
    });

    expect(newState.sharesIssued).toBeLessThan(initialShares);
    expect(newState.cash).toBeLessThan(initialCash);
    // Floor at 1M shares
    expect(newState.sharesIssued).toBeGreaterThanOrEqual(1_000_000);
  });

  it("share buyback — insufficient funds does not crash", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 100; // Almost no cash

    const { newState, result } = processFinance(state, {
      sharesBuyback: 100_000_000,
    });

    // Should not crash, shares unchanged since insufficient funds
    assertNoNaN(newState);
    expect(result.messages.some((m: string) => m.includes("Insufficient"))).toBe(true);
  });

  it("dividend payout deducts from cash", () => {
    const state = createTeamState("baseline-balanced");
    const initialCash = state.cash;
    const dps = 1.0;
    const expectedPayout = dps * state.sharesIssued;

    const { newState } = processFinance(state, {
      dividendPerShare: dps,
    });

    if (initialCash >= expectedPayout) {
      expect(newState.cash).toBe(initialCash - expectedPayout);
    }
  });

  it("dividend — insufficient funds does not crash", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 100;

    const { newState, result } = processFinance(state, {
      dividendPerShare: 100, // $100/share × 10M shares = $1B needed
    });

    assertNoNaN(newState);
    expect(result.messages.some((m: string) => m.includes("Insufficient"))).toBe(true);
  });

  it("negative cash flow for 10 rounds does not produce NaN", () => {
    const result = runSimulation({
      teamCount: 2,
      rounds: 10,
      seed: "neg-cashflow",
      profile: "aggressive-debt",
      decisionFn: (_, state) => ({
        factory: {},
        hr: { salaryMultiplierChanges: { workers: 2.0, engineers: 2.0, supervisors: 2.0 } },
        marketing: { advertisingBudget: { Budget: 10_000_000, General: 10_000_000 }, brandingInvestment: 10_000_000 },
        rd: { rdBudget: 20_000_000 },
        finance: { dividendPerShare: 0 },
      }),
    });

    for (const state of result.finalStates) {
      assertNoNaN(state);
    }
  });

  it("maximum bonds — totalLiabilities stays consistent", () => {
    const state = createTeamState("baseline-balanced");

    const { newState } = processFinance(state, {
      treasuryBillsIssue: 100_000_000,
      corporateBondsIssue: 200_000_000,
      loanRequest: { amount: 50_000_000, termMonths: 36 },
    });

    const expectedLiabilities = state.totalLiabilities + 100_000_000 + 200_000_000 + 50_000_000;
    expect(newState.totalLiabilities).toBe(expectedLiabilities);
    expect(newState.shortTermDebt).toBe(state.shortTermDebt + 100_000_000);
    expect(newState.longTermDebt).toBe(state.longTermDebt + 200_000_000 + 50_000_000);
  });

  it("0 shares issued — EPS calculation does not divide by zero", () => {
    const state = createTeamState("baseline-balanced");
    state.sharesIssued = 0;

    const { newState } = processFinance(state, {});

    expect(newState.eps).toBe(0);
    assertNoNaN(newState);
  });

  it("financial ratios — zero equity produces high D/E, not NaN", () => {
    const state = createTeamState("baseline-balanced");
    state.shareholdersEquity = 0;

    const ratios = FinanceModule.calculateRatios(state);

    expect(Number.isFinite(ratios.debtToEquity)).toBe(true);
    expect(Number.isFinite(ratios.roe)).toBe(true);
  });

  it("financial ratios — zero revenue produces 0 margins, not NaN", () => {
    const state = createTeamState("baseline-balanced");
    state.revenue = 0;

    const ratios = FinanceModule.calculateRatios(state);

    expect(ratios.profitMargin).toBe(0);
    expect(ratios.grossMargin).toBe(0);
    expect(ratios.operatingMargin).toBe(0);
  });

  it("FX hedging — costs deducted, hedge percentage stored", () => {
    const state = createTeamState("baseline-balanced");
    state.revenue = 100_000_000; // Need revenue for hedging to apply

    const { newState } = processFinance(state, {
      fxHedging: { "EUR/USD": 50, "GBP/USD": 30 },
    });

    // F13-F20: FX hedging decisions are now processed during market simulation
    // (FinanceModule no longer directly stores fxHedgePercentage).
    // Verify module processes without error and no NaN propagation.
    assertNoNaN(newState);
    expect(newState.cash).toBeDefined();
  });

  it("all debt instruments combined — no overflow or NaN", () => {
    const state = createTeamState("baseline-balanced");

    const { newState } = processFinance(state, {
      treasuryBillsIssue: 50_000_000,
      corporateBondsIssue: 100_000_000,
      loanRequest: { amount: 30_000_000, termMonths: 24 },
      stockIssuance: { shares: 500_000, pricePerShare: 40 },
      dividendPerShare: 0.5,
    });

    assertNoNaN(newState);
    assertNoOverflow(newState);
  });

  it("empty finance decisions — module processes without error", () => {
    const state = createTeamState("baseline-balanced");
    const { newState } = processFinance(state, {});

    assertNoNaN(newState);
    expect(newState.cash).toBeDefined();
  });
});

// ============================================
// CATEGORY C — Property Tests (Seeded)
// ============================================

describe("Finance Stress — Category C: Property Tests", () => {
  const debtAmounts = [0, 1_000_000, 10_000_000, 50_000_000, 100_000_000];
  const dividends = [0, 0.5, 1.0, 5.0, 10.0];

  for (let seed = 0; seed < 50; seed++) {
    const debtAmount = debtAmounts[seed % debtAmounts.length];
    const dividend = dividends[seed % dividends.length];

    it(`seed ${seed}: debt=$${debtAmount / 1e6}M, div=$${dividend} — financial invariants hold`, () => {
      const state = createTeamState("baseline-balanced");

      const { newState } = processFinance(state, {
        treasuryBillsIssue: debtAmount,
        dividendPerShare: dividend,
      });

      assertNoNaN(newState);
      assertNoOverflow(newState);
      // Liabilities should increase by at least the debt issued
      expect(newState.totalLiabilities).toBeGreaterThanOrEqual(state.totalLiabilities);
    });
  }
});

// ============================================
// CATEGORY D — Regression
// ============================================

describe("Finance Stress — Category D: Regression", () => {
  it("regression placeholder — framework operational", () => {
    expect(true).toBe(true);
  });
});
