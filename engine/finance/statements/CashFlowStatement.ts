/**
 * Cash Flow Statement Engine
 * Generates cash flow statements showing operating, investing, and financing activities
 */

import type { TeamState } from "../../types";
import type { CashFlowStatement, IncomeStatement, BalanceSheet } from "../types";

export class CashFlowEngine {
  /**
   * Generate complete cash flow statement
   */
  static generate(
    state: TeamState,
    incomeStatement: IncomeStatement,
    previousBalance: BalanceSheet | null,
    currentBalance: BalanceSheet
  ): CashFlowStatement {
    // Operating activities
    const operating = this.calculateOperatingCashFlow(
      incomeStatement,
      previousBalance,
      currentBalance
    );

    // Investing activities
    const investing = this.calculateInvestingCashFlow(state);

    // Financing activities
    const financing = this.calculateFinancingCashFlow(state);

    // Net cash change
    const netCashChange =
      operating.netCashFromOperations +
      investing.netCashFromInvesting +
      financing.netCashFromFinancing;

    // Beginning and ending cash
    const beginningCash = previousBalance?.assets.currentAssets.cash || state.cash - netCashChange;
    const endingCash = state.cash;

    // Free cash flow
    const freeCashFlow =
      operating.netCashFromOperations + investing.capitalExpenditures;

    return {
      round: state.currentRound,
      operatingActivities: operating,
      investingActivities: investing,
      financingActivities: financing,
      netCashChange,
      beginningCash,
      endingCash,
      freeCashFlow,
    };
  }

  /**
   * Calculate operating cash flow
   */
  private static calculateOperatingCashFlow(
    incomeStatement: IncomeStatement,
    previousBalance: BalanceSheet | null,
    currentBalance: BalanceSheet
  ): CashFlowStatement["operatingActivities"] {
    // Start with net income
    const netIncome = incomeStatement.netIncome;

    // Add back non-cash expenses
    const depreciation = incomeStatement.operatingExpenses.depreciation;
    const amortization = incomeStatement.operatingExpenses.amortization;

    // Working capital changes
    const changeInAR = previousBalance
      ? currentBalance.assets.currentAssets.accountsReceivable -
        previousBalance.assets.currentAssets.accountsReceivable
      : 0;

    const changeInInventory = previousBalance
      ? currentBalance.assets.currentAssets.inventory -
        previousBalance.assets.currentAssets.inventory
      : 0;

    const changeInAP = previousBalance
      ? currentBalance.liabilities.currentLiabilities.accountsPayable -
        previousBalance.liabilities.currentLiabilities.accountsPayable
      : 0;

    const changeInAccruedExpenses = 0; // TODO: Implement accrued expenses

    // Net cash from operations
    const netCashFromOperations =
      netIncome +
      depreciation +
      amortization -
      changeInAR -
      changeInInventory +
      changeInAP +
      changeInAccruedExpenses;

    return {
      netIncome,
      depreciation,
      amortization,
      changeInAR,
      changeInInventory,
      changeInAP,
      changeInAccruedExpenses,
      netCashFromOperations,
    };
  }

  /**
   * Calculate investing cash flow
   */
  private static calculateInvestingCashFlow(
    state: TeamState
  ): CashFlowStatement["investingActivities"] {
    // Capital expenditures (negative - cash outflow)
    const capitalExpenditures = -(state.capexThisRound || 0);

    // R&D capitalization (negative - cash outflow)
    const rdCapitalization = -(state.rdCapexThisRound || 0);

    // Asset sales (positive - cash inflow)
    const assetSales = state.assetSalesThisRound || 0;

    const netCashFromInvesting = capitalExpenditures + rdCapitalization + assetSales;

    return {
      capitalExpenditures,
      rdCapitalization,
      assetSales,
      netCashFromInvesting,
    };
  }

  /**
   * Calculate financing cash flow
   */
  private static calculateFinancingCashFlow(
    state: TeamState
  ): CashFlowStatement["financingActivities"] {
    // Debt proceeds (positive - cash inflow)
    const debtProceeds = state.debtIssuedThisRound || 0;

    // Debt repayments (negative - cash outflow)
    const debtRepayments = -(state.debtRepaidThisRound || 0);

    // Equity proceeds (positive - cash inflow)
    const equityProceeds = state.equityIssuedThisRound || 0;

    // Dividends paid (negative - cash outflow)
    const dividendsPaid = -(state.dividendsPaidThisRound || 0);

    // Share repurchases (negative - cash outflow)
    const shareRepurchases = -(state.sharesRepurchasedThisRound || 0);

    const netCashFromFinancing =
      debtProceeds +
      debtRepayments +
      equityProceeds +
      dividendsPaid +
      shareRepurchases;

    return {
      debtProceeds,
      debtRepayments,
      equityProceeds,
      dividendsPaid,
      shareRepurchases,
      netCashFromFinancing,
    };
  }

  /**
   * Validate cash flow statement
   */
  static validate(statement: CashFlowStatement): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if cash reconciles
    const calculatedEndingCash =
      statement.beginningCash + statement.netCashChange;

    if (Math.abs(calculatedEndingCash - statement.endingCash) > 0.01) {
      errors.push(
        `Cash does not reconcile: calculated ${calculatedEndingCash}, actual ${statement.endingCash}`
      );
    }

    // Check if net cash change matches sum of activities
    const sumOfActivities =
      statement.operatingActivities.netCashFromOperations +
      statement.investingActivities.netCashFromInvesting +
      statement.financingActivities.netCashFromFinancing;

    if (Math.abs(sumOfActivities - statement.netCashChange) > 0.01) {
      errors.push("Net cash change does not match sum of activities");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
