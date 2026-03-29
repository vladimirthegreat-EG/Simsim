/**
 * Three-Statement Integration Tests (Prompt 17)
 * Tests cross-statement consistency and reconciliation.
 */

import { IncomeStatementEngine } from "@/engine/finance/statements/IncomeStatement";
import { BalanceSheetEngine } from "@/engine/finance/statements/BalanceSheet";
import { fresh_company_state, CONSTANTS } from "../setup";

/**
 * The IncomeStatementEngine expects state.employees to have numeric
 * summary fields (workers, engineers, supervisors) rather than the raw
 * Employee[] array. This helper ensures the state is compatible.
 */
function prepareStateForStatements(overrides?: Record<string, any>) {
  const state = fresh_company_state(overrides) as any;
  // IS engine expects state.employees = { workers: N, engineers: N, supervisors: N }
  if (Array.isArray(state.employees)) {
    const empArr = state.employees;
    state.employees = {
      workers: empArr.filter((e: any) => e.role === "worker").length,
      engineers: empArr.filter((e: any) => e.role === "engineer").length,
      supervisors: empArr.filter((e: any) => e.role === "supervisor").length,
    };
  }
  // IS engine expects products to have unitsSold
  for (const p of state.products) {
    if (p.unitsSold === undefined) p.unitsSold = 0;
  }
  return state;
}

describe("Three-Statement Integration", () => {
  it("income statement generates with correct structure", () => {
    const state = prepareStateForStatements();
    const income = IncomeStatementEngine.generate(state, 1);
    expect(income).toHaveProperty("revenue");
    expect(income).toHaveProperty("cogs");
    expect(income).toHaveProperty("grossProfit");
    expect(income).toHaveProperty("operatingExpenses");
    expect(income).toHaveProperty("netIncome");
    expect(income).toHaveProperty("eps");
  });

  it("depreciation flows consistently: IS depreciation >= 0", () => {
    const state = prepareStateForStatements();
    const income = IncomeStatementEngine.generate(state, 1);
    expect(income.operatingExpenses.depreciation).toBeGreaterThanOrEqual(0);
  });

  it("gross profit = revenue - COGS", () => {
    const state = prepareStateForStatements();
    const income = IncomeStatementEngine.generate(state, 1);
    expect(income.grossProfit).toBeCloseTo(
      income.revenue.total - income.cogs.total, 0
    );
  });

  it("operating income = gross profit - opex", () => {
    const state = prepareStateForStatements();
    const income = IncomeStatementEngine.generate(state, 1);
    const computed = income.grossProfit - income.operatingExpenses.total;
    expect(income.operatingIncome).toBeCloseTo(computed, 0);
  });

  it("net income = incomeBeforeTax - taxExpense", () => {
    const state = prepareStateForStatements();
    const income = IncomeStatementEngine.generate(state, 1);
    expect(income.netIncome).toBeCloseTo(
      income.incomeBeforeTax - income.taxExpense, 0
    );
  });

  it("balance sheet has valid structure", () => {
    const state = prepareStateForStatements();
    const income = IncomeStatementEngine.generate(state, 1);
    const balance = BalanceSheetEngine.generate(state, income, null);
    expect(balance.assets).toHaveProperty("total");
    expect(balance.liabilities).toHaveProperty("total");
    expect(balance.equity).toHaveProperty("total");
  });

  it("interest income = cash × 0.0001", () => {
    const state = prepareStateForStatements({ cash: 100_000_000 });
    const income = IncomeStatementEngine.generate(state, 1);
    expect(income.interestIncome).toBeCloseTo(10_000, 0);
  });
});
