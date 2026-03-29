/**
 * L1 Capsim Finance — Certified Formula Tests
 *
 * Tests FinanceModule.process() formulas against expected outcomes,
 * verifying that bank loans, buybacks, dividends, and zero-revenue
 * scenarios produce correct, non-NaN financial state.
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

/** Shortcut: run FinanceModule.process and return the new state + result. */
function runFinance(
  state: TeamState,
  decisions: FinanceDecisions,
  marketOverrides?: Record<string, unknown>,
) {
  const market = fresh_market_state(marketOverrides as any);
  // No ctx → board votes auto-approve (deterministic path)
  return FinanceModule.process(state, decisions, market);
}

/** Recursively collect every numeric leaf from an object. */
function collectNumbers(obj: unknown, path = ""): { path: string; value: number }[] {
  const results: { path: string; value: number }[] = [];
  if (obj === null || obj === undefined) return results;
  if (typeof obj === "number") {
    results.push({ path, value: obj });
    return results;
  }
  if (typeof obj === "object") {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      results.push(...collectNumbers(val, path ? `${path}.${key}` : key));
    }
  }
  return results;
}

// ===========================================================================
describe("FinanceModule — Certified Formula Tests", () => {
  // -----------------------------------------------------------------------
  // Test 1 — Bank loan increases cash AND debt
  // -----------------------------------------------------------------------
  describe("Test 1 — Bank loan increases cash AND debt", () => {
    it("short-term loan (<=12 months) adds to cash and shortTermDebt", () => {
      const state = SimulationEngine.createInitialTeamState();
      const initialCash = state.cash;
      const initialShortTermDebt = state.shortTermDebt;
      const initialTotalLiabilities = state.totalLiabilities;

      const { newState } = runFinance(state, {
        loanRequest: { amount: 10_000_000, termMonths: 12 },
      });

      expect(newState.cash).toBe(initialCash + 10_000_000);
      expect(newState.shortTermDebt).toBe(initialShortTermDebt + 10_000_000);
      expect(newState.totalLiabilities).toBe(initialTotalLiabilities + 10_000_000);
    });

    it("long-term loan (>12 months) adds to cash and longTermDebt", () => {
      const state = SimulationEngine.createInitialTeamState();
      const initialCash = state.cash;
      const initialLongTermDebt = state.longTermDebt;
      const initialTotalLiabilities = state.totalLiabilities;

      const { newState } = runFinance(state, {
        loanRequest: { amount: 10_000_000, termMonths: 36 },
      });

      expect(newState.cash).toBe(initialCash + 10_000_000);
      expect(newState.longTermDebt).toBe(initialLongTermDebt + 10_000_000);
      expect(newState.totalLiabilities).toBe(initialTotalLiabilities + 10_000_000);
    });

    it("totalDebt (short + long) increases by loan amount", () => {
      const state = SimulationEngine.createInitialTeamState();
      const initialTotalDebt = state.shortTermDebt + state.longTermDebt;

      const { newState } = runFinance(state, {
        loanRequest: { amount: 10_000_000, termMonths: 24 },
      });

      const finalTotalDebt = newState.shortTermDebt + newState.longTermDebt;
      expect(finalTotalDebt).toBe(initialTotalDebt + 10_000_000);
    });
  });

  // -----------------------------------------------------------------------
  // Test 2 — Buyback with insufficient funds (must not crash)
  // -----------------------------------------------------------------------
  describe("Test 2 — Buyback with insufficient funds (must not crash)", () => {
    it("does not throw and leaves cash >= 0", () => {
      const state = fresh_company_state({
        cash: 5_000_000,
        sharesIssued: CONSTANTS.DEFAULT_SHARES_ISSUED,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });
      const initialShares = state.sharesIssued;

      // Attempt a buyback larger than available cash
      const { newState, result } = runFinance(state, {
        sharesBuyback: 20_000_000,
      });

      // Should not crash
      expect(result.success).toBe(true);
      // Cash must not go negative
      expect(newState.cash).toBeGreaterThanOrEqual(0);
      // Shares should not have increased (at most stayed same or decreased)
      expect(newState.sharesIssued).toBeLessThanOrEqual(initialShares);
    });

    it("reports insufficient funds message when cash < buyback amount", () => {
      const state = fresh_company_state({
        cash: 5_000_000,
        sharesIssued: CONSTANTS.DEFAULT_SHARES_ISSUED,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });

      const { result } = runFinance(state, {
        sharesBuyback: 20_000_000,
      });

      // Should contain a message about insufficient funds
      const hasInsufficientMsg = result.messages.some(
        (m) => m.toLowerCase().includes("insufficient") || m.toLowerCase().includes("cannot"),
      );
      expect(hasInsufficientMsg).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Test 3 — Dividend reduces retained earnings
  // -----------------------------------------------------------------------
  describe("Test 3 — Dividend reduces cash by totalDividends", () => {
    it("dividendPerShare = 5 with 10M shares costs $50M", () => {
      const shares = 10_000_000;
      const startingCash = 100_000_000;
      const state = fresh_company_state({
        retainedEarnings: 50_000_000,
        sharesIssued: shares,
        cash: startingCash,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });

      const expectedDividendCost = 5 * shares; // 50_000_000

      const { newState } = runFinance(state, {
        dividendPerShare: 5,
      });

      // Cash should decrease by totalDividends
      expect(newState.cash).toBe(startingCash - expectedDividendCost);
    });

    it("dividend is skipped when cash is insufficient", () => {
      const shares = 10_000_000;
      const state = fresh_company_state({
        retainedEarnings: 50_000_000,
        sharesIssued: shares,
        cash: 10_000_000, // Only $10M — not enough for $50M dividend
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });

      const initialCash = state.cash;

      const { newState, result } = runFinance(state, {
        dividendPerShare: 5,
      });

      // Should not pay the dividend (insufficient funds)
      expect(newState.cash).toBe(initialCash);
      const hasInsufficientMsg = result.messages.some(
        (m) => m.toLowerCase().includes("insufficient"),
      );
      expect(hasInsufficientMsg).toBe(true);
    });

    it("dividend cost appears in module result costs", () => {
      const shares = 10_000_000;
      const state = fresh_company_state({
        retainedEarnings: 50_000_000,
        sharesIssued: shares,
        cash: 100_000_000,
        sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
      });

      const expectedDividendCost = 5 * shares; // 50_000_000

      const { result } = runFinance(state, {
        dividendPerShare: 5,
      });

      // The costs field should include the dividend amount
      expect(result.costs).toBeGreaterThanOrEqual(expectedDividendCost);
    });
  });

  // -----------------------------------------------------------------------
  // Test 4 — No NaN on zero revenue
  // -----------------------------------------------------------------------
  describe("Test 4 — No NaN on zero revenue", () => {
    it("FinanceModule.process returns finite values with zero-revenue state", () => {
      // State with no products sold (zero revenue round)
      const state = fresh_company_state({
        revenue: 0,
        netIncome: 0,
        cash: CONSTANTS.DEFAULT_STARTING_CASH,
      });

      const { newState, result } = runFinance(state, {});

      expect(result.success).toBe(true);

      // All numeric fields on newState that we care about must be finite
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
          expect(isFinite(val), `newState.${field} should be finite but was ${val}`).toBe(true);
        }
      }
    });

    it("IncomeStatement has no NaN fields on zero-revenue state", () => {
      const state = prepare_state_for_statements({
        revenue: 0,
        netIncome: 0,
      });

      // Zero out all product sales
      for (const p of state.products) {
        p.unitsSold = 0;
        p.unitsProduced = 0;
      }

      const is = IncomeStatementEngine.generate(state, 1);

      const nums = collectNumbers(is);
      for (const { path, value } of nums) {
        expect(
          isFinite(value),
          `IncomeStatement.${path} should be finite but was ${value}`,
        ).toBe(true);
      }
    });

    it("BalanceSheet has no NaN fields on zero-revenue state", () => {
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

      const nums = collectNumbers(bs);
      for (const { path, value } of nums) {
        expect(
          isFinite(value),
          `BalanceSheet.${path} should be finite but was ${value}`,
        ).toBe(true);
      }
    });

    it("CashFlowStatement has no NaN fields on zero-revenue state", () => {
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

      const nums = collectNumbers(cf);
      for (const { path, value } of nums) {
        expect(
          isFinite(value),
          `CashFlowStatement.${path} should be finite but was ${value}`,
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

      // Check all three statements
      for (const [label, stmt] of [
        ["incomeStatement", statements.incomeStatement],
        ["balanceSheet", statements.balanceSheet],
        ["cashFlowStatement", statements.cashFlowStatement],
      ] as const) {
        const nums = collectNumbers(stmt);
        for (const { path, value } of nums) {
          expect(
            isFinite(value),
            `${label}.${path} should be finite but was ${value}`,
          ).toBe(true);
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // Supplementary: Credit-frozen state blocks new loans
  // -----------------------------------------------------------------------
  describe("Supplementary — Credit freeze blocks debt issuance", () => {
    it("does not issue a loan when D/E > 2.0 (credit frozen)", () => {
      const state = fresh_company_state({
        cash: 50_000_000,
        shortTermDebt: 100_000_000,
        longTermDebt: 100_000_000,
        shareholdersEquity: 50_000_000, // D/E = 200M / 50M = 4.0 >> 2.0
      });
      const initialCash = state.cash;

      const { newState } = runFinance(state, {
        loanRequest: { amount: 10_000_000, termMonths: 12 },
      });

      // Loan should NOT have been issued — cash unchanged (may decrease from covenant penalties)
      expect(newState.shortTermDebt).toBeLessThanOrEqual(state.shortTermDebt);
      // Cash should not have increased from the loan
      // (it may have decreased due to covenant penalties, but not increased)
      expect(newState.cash).toBeLessThanOrEqual(initialCash);
    });
  });
});
