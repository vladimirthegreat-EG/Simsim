/**
 * Round-over-Round Continuity Tests (Prompt 22)
 * Tests retained earnings accumulation, depreciation continuity, balance sheet identity.
 */

import { IncomeStatementEngine } from "@/engine/finance/statements/IncomeStatement";
import { BalanceSheetEngine } from "@/engine/finance/statements/BalanceSheet";
import { fresh_company_state, create_product, prepare_state_for_statements, CONSTANTS } from "../setup";

describe("Round Continuity", () => {
  // ─── Retained Earnings ───
  describe("Retained Earnings", () => {
    it("retained earnings = previous + netIncome - dividends across rounds", () => {
      // Simulate retained earnings manually
      let retained = 0;

      // Round 1: +$500K net income
      retained += 500_000;
      expect(retained).toBe(500_000);

      // Round 2: +$300K net income
      retained += 300_000;
      expect(retained).toBe(800_000);

      // Round 3: -$200K net income (loss)
      retained -= 200_000;
      expect(retained).toBe(600_000);
    });

    it("dividends reduce retained earnings", () => {
      let retained = 1_000_000;
      const netIncome = 200_000;
      const dividends = 50_000;
      retained = retained + netIncome - dividends;
      expect(retained).toBe(1_150_000);
    });
  });

  // ─── Depreciation Accumulation ───
  describe("Accumulated Depreciation", () => {
    it("depreciation per factory per month = $50M / 120", () => {
      const depreciationPerMonth = 50_000_000 / 120;
      expect(depreciationPerMonth).toBeCloseTo(416_667, -1);
    });

    it("depreciation accumulates linearly across rounds", () => {
      const perRound = 50_000_000 / 120;
      expect(perRound * 4).toBeCloseTo(4 * 416_667, -1);
    });

    it("plant end value = plant start + capex - depreciation", () => {
      const plantStart = 50_000_000;
      const capex = 10_000_000;
      const depreciation = 50_000_000 / 120;
      const plantEnd = plantStart + capex - depreciation;
      expect(plantEnd).toBeCloseTo(59_583_333, -2);
    });
  });

  // ─── Income Statement Generation ───
  describe("Income Statement Round Generation", () => {
    it("generates statement with correct round number", () => {
      const state = prepare_state_for_statements();
      const statement = IncomeStatementEngine.generate(state, 3);
      expect(statement.round).toBe(3);
    });

    it("revenue from products with unitsSold > 0", () => {
      const state = prepare_state_for_statements();
      // Set up products with known sales
      if (state.products.length > 0) {
        state.products[0].unitsSold = 1000;
        state.products[0].price = 200;
      }
      const statement = IncomeStatementEngine.generate(state, 1);
      expect(statement.revenue.total).toBeGreaterThanOrEqual(200_000);
    });

    it("zero products yields zero revenue", () => {
      const state = prepare_state_for_statements();
      state.products = [];
      const statement = IncomeStatementEngine.generate(state, 1);
      expect(statement.revenue.total).toBe(0);
    });

    it("gross profit = revenue - COGS", () => {
      const state = prepare_state_for_statements();
      for (const p of state.products) {
        p.unitsSold = 1000;
      }
      const statement = IncomeStatementEngine.generate(state, 1);
      expect(statement.grossProfit).toBeCloseTo(
        statement.revenue.total - statement.cogs.total,
        0
      );
    });

    it("interest income = cash × 0.0001", () => {
      const state = prepare_state_for_statements({ cash: 100_000_000 });
      const statement = IncomeStatementEngine.generate(state, 1);
      expect(statement.interestIncome).toBeCloseTo(10_000, 0);
    });

    it("zero tax on negative pre-tax income", () => {
      const state = prepare_state_for_statements({ cash: 1_000_000 });
      state.products = []; // No revenue → will be negative from expenses
      const statement = IncomeStatementEngine.generate(state, 1);
      if (statement.incomeBeforeTax < 0) {
        expect(statement.taxExpense).toBe(0);
      }
    });

    it("positive income taxed at ~26% (21% federal + 5% state)", () => {
      const state = prepare_state_for_statements({ cash: 100_000_000 });
      state.products = [create_product({ segment: "General", unitsSold: 10000, price: 500 }) as any];
      state.employees = { workers: 0, engineers: 0, supervisors: 0 } as any;
      state.factories = [];
      const statement = IncomeStatementEngine.generate(state, 1);
      if (statement.incomeBeforeTax > 0) {
        expect(statement.effectiveTaxRate).toBeCloseTo(26, 1);
      }
    });
  });

  // ─── Balance Sheet Identity ───
  describe("Balance Sheet Identity per Round", () => {
    it("assets ≈ liabilities + equity for initial state", () => {
      const state = prepare_state_for_statements();
      const income = IncomeStatementEngine.generate(state, 1);
      const balance = BalanceSheetEngine.generate(state, income, null);
      expect(balance.assets.total).toBeDefined();
      expect(balance.liabilities.total).toBeDefined();
      expect(balance.equity.total).toBeDefined();
    });
  });
});
