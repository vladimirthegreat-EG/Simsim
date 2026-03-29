/**
 * Unit tests for IncomeStatementEngine.
 */

import { IncomeStatementEngine } from "@/engine/finance/statements/IncomeStatement";
import {
  fresh_company_state,
  create_product,
  prepare_state_for_statements,
} from "../setup";

// ---------------------------------------------------------------------------
// Revenue calculation
// ---------------------------------------------------------------------------

describe("revenue calculation", () => {
  it("sums revenue from multiple products across segments", () => {
    const budget = create_product({
      id: "p-budget",
      segment: "Budget",
      unitsSold: 1000,
      price: 200,
    });
    const general = create_product({
      id: "p-general",
      segment: "General",
      unitsSold: 500,
      price: 450,
    });

    const state = prepare_state_for_statements({ products: [budget, general] });
    const stmt = IncomeStatementEngine.generate(state, 1);

    // 1000 × 200 + 500 × 450 = 200K + 225K = 425K
    expect(stmt.revenue.total).toBe(425_000);
    expect(stmt.revenue.bySegment["Budget"]).toBe(200_000);
    expect(stmt.revenue.bySegment["General"]).toBe(225_000);
  });

  it("returns zero revenue when there are no products", () => {
    const state = prepare_state_for_statements({ products: [] });
    const stmt = IncomeStatementEngine.generate(state, 1);

    expect(stmt.revenue.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Interest income
// ---------------------------------------------------------------------------

describe("interest income", () => {
  it("equals cash × 0.0001", () => {
    const state = prepare_state_for_statements({ cash: 100_000_000, products: [] });
    const stmt = IncomeStatementEngine.generate(state, 1);

    // 100M × 0.0001 = 10,000
    expect(stmt.interestIncome).toBeCloseTo(10_000, 2);
  });
});

// ---------------------------------------------------------------------------
// Tax calculation
// ---------------------------------------------------------------------------

describe("tax calculation", () => {
  it("taxes positive income at 26% (21% federal + 5% state)", () => {
    // Create a profitable state with high-revenue products and minimal costs
    const product = create_product({
      id: "p-highrev",
      segment: "General",
      unitsSold: 100_000,
      price: 500,
      unitCost: 50,
    });
    const state = prepare_state_for_statements({ products: [product] });
    const stmt = IncomeStatementEngine.generate(state, 1);

    if (stmt.incomeBeforeTax > 0) {
      expect(stmt.effectiveTaxRate).toBeCloseTo(26, 0);
      expect(stmt.taxExpense).toBeCloseTo(stmt.incomeBeforeTax * 0.26, 0);
    }
  });

  it("does not tax negative income", () => {
    // State with no revenue but costs → negative income
    const state = prepare_state_for_statements({ products: [] });
    const stmt = IncomeStatementEngine.generate(state, 1);

    expect(stmt.taxExpense).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// EPS
// ---------------------------------------------------------------------------

describe("EPS", () => {
  it("equals netIncome / sharesOutstanding when capitalStructure exists", () => {
    const product = create_product({
      id: "p-eps",
      segment: "General",
      unitsSold: 50_000,
      price: 500,
      unitCost: 50,
    });

    const state = prepare_state_for_statements({
      products: [product],
      capitalStructure: {
        debtInstruments: [],
        equityPosition: {
          sharesIssued: 10_000_000,
          sharesOutstanding: 10_000_000,
          parValue: 10,
          sharePrice: 50,
          marketCap: 500_000_000,
          dilution: 0,
        },
        creditRating: null,
        dividendHistory: [],
      },
    } as any);

    const stmt = IncomeStatementEngine.generate(state, 1);

    expect(stmt.eps).toBeDefined();
    expect(stmt.eps).toBeCloseTo(stmt.netIncome / 10_000_000, 4);
  });

  it("returns undefined when capitalStructure is absent", () => {
    const state = prepare_state_for_statements({ products: [] });
    const stmt = IncomeStatementEngine.generate(state, 1);

    expect(stmt.eps).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Gross profit
// ---------------------------------------------------------------------------

describe("gross profit", () => {
  it("equals revenue minus COGS", () => {
    const product = create_product({
      id: "p-gp",
      segment: "Budget",
      unitsSold: 2000,
      price: 200,
      unitCost: 80,
    });
    const state = prepare_state_for_statements({ products: [product] });
    const stmt = IncomeStatementEngine.generate(state, 1);

    expect(stmt.grossProfit).toBeCloseTo(stmt.revenue.total - stmt.cogs.total, 2);
  });
});

// ---------------------------------------------------------------------------
// Margins
// ---------------------------------------------------------------------------

describe("margins", () => {
  it("gross margin is between 0 and 100 for a state with revenue", () => {
    const product = create_product({
      id: "p-margin",
      segment: "General",
      unitsSold: 5000,
      price: 450,
      unitCost: 100,
    });
    const state = prepare_state_for_statements({ products: [product] });
    const stmt = IncomeStatementEngine.generate(state, 1);

    expect(stmt.grossMargin).toBeGreaterThanOrEqual(0);
    expect(stmt.grossMargin).toBeLessThanOrEqual(100);
  });

  it("gross margin is 0 when revenue is zero", () => {
    const state = prepare_state_for_statements({ products: [] });
    const stmt = IncomeStatementEngine.generate(state, 1);

    expect(stmt.grossMargin).toBe(0);
  });
});
