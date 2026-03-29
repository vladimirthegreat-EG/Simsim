/**
 * L1 Capsim Finance v2 — Certified Formula Tests
 *
 * Independent verification of FinanceModule.process() against Capsim's
 * formula certification protocol. Tests bank loans, buybacks, dividends,
 * and zero-revenue NaN safety using SimulationEngine.createInitialTeamState()
 * as the canonical starting point.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { FinanceModule } from "@/engine/modules/FinanceModule";
import { IncomeStatementEngine } from "@/engine/finance/statements/IncomeStatement";
import { BalanceSheetEngine } from "@/engine/finance/statements/BalanceSheet";
import { CashFlowEngine } from "@/engine/finance/statements/CashFlowStatement";
import { FinancialStatementsEngine } from "@/engine/finance/statements/StatementIntegration";
import {
  fresh_company_state,
  fresh_market_state,
  prepare_state_for_statements,
  CONSTANTS,
} from "../setup";
import type { FinanceDecisions } from "@/engine/types/decisions";
import type { TeamState } from "@/engine/types/state";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run FinanceModule.process without board context (auto-approve path). */
function processFinance(
  state: TeamState,
  decisions: FinanceDecisions,
  marketOverrides?: Record<string, unknown>,
) {
  const market = fresh_market_state(marketOverrides as any);
  return FinanceModule.process(state, decisions, market);
}

/**
 * Recursively walk an object tree and return every numeric leaf
 * with its dot-separated path (e.g. "incomeStatement.revenue.total").
 */
function gatherNumericLeaves(
  obj: unknown,
  prefix = "",
): { path: string; value: number }[] {
  const out: { path: string; value: number }[] = [];
  if (obj === null || obj === undefined) return out;
  if (typeof obj === "number") {
    out.push({ path: prefix, value: obj });
    return out;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out.push(...gatherNumericLeaves(v, prefix ? `${prefix}.${k}` : k));
    }
  }
  return out;
}

// ===========================================================================
describe("FinanceModule — Certified Formula Tests", () => {
  // -----------------------------------------------------------------------
  // Test 1 — Bank loan increases cash AND debt
  // -----------------------------------------------------------------------
  describe("Test 1 — Bank loan increases cash AND debt", () => {
    it("a $10M bank loan increases cash by $10M", () => {
      const state = SimulationEngine.createInitialTeamState();
      const cashBefore = state.cash;

      const { newState } = processFinance(state, {
        loanRequest: { amount: 10_000_000, termMonths: 12 },
      });

      expect(newState.cash).toBe(cashBefore + 10_000_000);
    });

    it("a $10M short-term loan increases shortTermDebt by $10M", () => {
      const state = SimulationEngine.createInitialTeamState();
      const debtBefore = state.shortTermDebt;

      const { newState } = processFinance(state, {
        loanRequest: { amount: 10_000_000, termMonths: 12 },
      });

      expect(newState.shortTermDebt).toBe(debtBefore + 10_000_000);
    });

    it("a $10M long-term loan increases longTermDebt by $10M", () => {
      const state = SimulationEngine.createInitialTeamState();
      const debtBefore = state.longTermDebt;

      const { newState } = processFinance(state, {
        loanRequest: { amount: 10_000_000, termMonths: 36 },
      });

      expect(newState.longTermDebt).toBe(debtBefore + 10_000_000);
    });

    it("totalLiabilities increases by the loan amount", () => {
      const state = SimulationEngine.createInitialTeamState();
      const liabBefore = state.totalLiabilities;

      const { newState } = processFinance(state, {
        loanRequest: { amount: 10_000_000, termMonths: 24 },
      });

      expect(newState.totalLiabilities).toBe(liabBefore + 10_000_000);
    });

    it("combined short+long debt increases by the exact loan amount", () => {
      const state = SimulationEngine.createInitialTeamState();
      const totalDebtBefore = state.shortTermDebt + state.longTermDebt;

      const { newState } = processFinance(state, {
        loanRequest: { amount: 10_000_000, termMonths: 18 },
      });

      const totalDebtAfter = newState.shortTermDebt + newState.longTermDebt;
      expect(totalDebtAfter).toBe(totalDebtBefore + 10_000_000);
    });
  });

  // -----------------------------------------------------------------------
  // Test 2 — Buyback with insufficient funds (must not crash)
  // -----------------------------------------------------------------------
  describe("Test 2 — Buyback with insufficient funds (must not crash)", () => {
    it("does not throw when buyback exceeds available cash", () => {
      const state = fresh_company_state({
        cash: 5_000_000,
        sharesIssued: CONSTANTS.DEFAULT_SHARES_ISSUED,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });

      // Should not throw
      const { newState, result } = processFinance(state, {
        sharesBuyback: 20_000_000,
      });

      expect(result.success).toBe(true);
    });

    it("cash remains >= 0 after failed buyback", () => {
      const state = fresh_company_state({
        cash: 5_000_000,
        sharesIssued: CONSTANTS.DEFAULT_SHARES_ISSUED,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });

      const { newState } = processFinance(state, {
        sharesBuyback: 20_000_000,
      });

      expect(newState.cash).toBeGreaterThanOrEqual(0);
    });

    it("shares do not increase on a failed buyback", () => {
      const state = fresh_company_state({
        cash: 5_000_000,
        sharesIssued: CONSTANTS.DEFAULT_SHARES_ISSUED,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });
      const sharesBefore = state.sharesIssued;

      const { newState } = processFinance(state, {
        sharesBuyback: 20_000_000,
      });

      expect(newState.sharesIssued).toBeLessThanOrEqual(sharesBefore);
    });

    it("produces an appropriate message when funds are insufficient", () => {
      const state = fresh_company_state({
        cash: 5_000_000,
        sharesIssued: CONSTANTS.DEFAULT_SHARES_ISSUED,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });

      const { result } = processFinance(state, {
        sharesBuyback: 20_000_000,
      });

      const hasMsg = result.messages.some(
        (m) =>
          m.toLowerCase().includes("insufficient") ||
          m.toLowerCase().includes("cannot"),
      );
      expect(hasMsg).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Test 3 — Dividend reduces cash
  // -----------------------------------------------------------------------
  describe("Test 3 — Dividend reduces cash", () => {
    it("paying $5/share with 10M shares reduces cash by $50M", () => {
      const shares = 10_000_000;
      const startCash = 100_000_000;
      const state = fresh_company_state({
        cash: startCash,
        sharesIssued: shares,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });

      const { newState } = processFinance(state, {
        dividendPerShare: 5,
      });

      const expectedCost = 5 * shares; // $50M
      expect(newState.cash).toBe(startCash - expectedCost);
    });

    it("cash strictly decreases after a dividend payment", () => {
      const state = fresh_company_state({
        cash: 200_000_000,
        sharesIssued: 10_000_000,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });
      const cashBefore = state.cash;

      const { newState } = processFinance(state, {
        dividendPerShare: 5,
      });

      expect(newState.cash).toBeLessThan(cashBefore);
    });

    it("dividend is skipped when cash is insufficient", () => {
      const shares = 10_000_000;
      const state = fresh_company_state({
        cash: 10_000_000, // Only $10M, need $50M for $5/share on 10M shares
        sharesIssued: shares,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });
      const cashBefore = state.cash;

      const { newState, result } = processFinance(state, {
        dividendPerShare: 5,
      });

      expect(newState.cash).toBe(cashBefore);
      expect(
        result.messages.some((m) => m.toLowerCase().includes("insufficient")),
      ).toBe(true);
    });

    it("dividend cost is reflected in module result.costs", () => {
      const shares = 10_000_000;
      const state = fresh_company_state({
        cash: 100_000_000,
        sharesIssued: shares,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });

      const { result } = processFinance(state, {
        dividendPerShare: 5,
      });

      expect(result.costs).toBeGreaterThanOrEqual(5 * shares);
    });
  });

  // -----------------------------------------------------------------------
  // Test 4 — No NaN on zero revenue
  // -----------------------------------------------------------------------
  describe("Test 4 — No NaN on zero revenue", () => {
    it("FinanceModule.process returns finite critical fields on zero revenue", () => {
      const state = fresh_company_state({
        revenue: 0,
        netIncome: 0,
        cash: CONSTANTS.DEFAULT_STARTING_CASH,
      });

      const { newState, result } = processFinance(state, {});

      expect(result.success).toBe(true);

      // Every critical financial field must be a finite number
      const criticalFields: (keyof TeamState)[] = [
        "cash",
        "revenue",
        "netIncome",
        "totalAssets",
        "totalLiabilities",
        "shortTermDebt",
        "longTermDebt",
        "shareholdersEquity",
        "marketCap",
        "sharesIssued",
        "sharePrice",
        "eps",
      ];

      for (const field of criticalFields) {
        const val = newState[field];
        if (typeof val === "number") {
          expect(
            isFinite(val),
            `newState.${field} = ${val} is not finite`,
          ).toBe(true);
        }
      }
    });

    it("IncomeStatement contains no NaN on zero-revenue state", () => {
      const state = prepare_state_for_statements({
        revenue: 0,
        netIncome: 0,
      });
      for (const p of state.products) {
        p.unitsSold = 0;
        p.unitsProduced = 0;
      }

      const is = IncomeStatementEngine.generate(state, 1);

      for (const { path, value } of gatherNumericLeaves(is)) {
        expect(
          isFinite(value),
          `IncomeStatement.${path} = ${value} is not finite`,
        ).toBe(true);
      }
    });

    it("BalanceSheet contains no NaN on zero-revenue state", () => {
      const state = prepare_state_for_statements({
        revenue: 0,
        netIncome: 0,
      });
      for (const p of state.products) {
        p.unitsSold = 0;
        p.unitsProduced = 0;
      }

      const is = IncomeStatementEngine.generate(state, 1);
      const bs = BalanceSheetEngine.generate(state, is, null);

      for (const { path, value } of gatherNumericLeaves(bs)) {
        expect(
          isFinite(value),
          `BalanceSheet.${path} = ${value} is not finite`,
        ).toBe(true);
      }
    });

    it("CashFlowStatement contains no NaN on zero-revenue state", () => {
      const state = prepare_state_for_statements({
        revenue: 0,
        netIncome: 0,
      });
      for (const p of state.products) {
        p.unitsSold = 0;
        p.unitsProduced = 0;
      }

      const is = IncomeStatementEngine.generate(state, 1);
      const bs = BalanceSheetEngine.generate(state, is, null);
      const cf = CashFlowEngine.generate(state, is, null, bs);

      for (const { path, value } of gatherNumericLeaves(cf)) {
        expect(
          isFinite(value),
          `CashFlowStatement.${path} = ${value} is not finite`,
        ).toBe(true);
      }
    });

    it("FinancialStatementsEngine.generate produces all-finite statements on zero revenue", () => {
      const state = prepare_state_for_statements({
        revenue: 0,
        netIncome: 0,
        round: 1,
      });
      for (const p of state.products) {
        p.unitsSold = 0;
        p.unitsProduced = 0;
      }

      const statements = FinancialStatementsEngine.generate(state, null);

      for (const [label, stmt] of [
        ["incomeStatement", statements.incomeStatement],
        ["balanceSheet", statements.balanceSheet],
        ["cashFlowStatement", statements.cashFlowStatement],
      ] as const) {
        for (const { path, value } of gatherNumericLeaves(stmt)) {
          expect(
            isFinite(value),
            `${label}.${path} = ${value} is not finite`,
          ).toBe(true);
        }
      }
    });
  });
});
