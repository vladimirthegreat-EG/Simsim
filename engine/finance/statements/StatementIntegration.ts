/**
 * Financial Statement Integration
 * Ties together Income Statement, Cash Flow Statement, and Balance Sheet
 * Ensures all three statements reconcile and provides validation
 */

import type { TeamState } from "../../types";
import type {
  IncomeStatement,
  CashFlowStatement,
  BalanceSheet,
  FinancialStatements,
  FinancialRatios,
} from "../types";
import { IncomeStatementEngine } from "./IncomeStatement";
import { CashFlowEngine } from "./CashFlowStatement";
import { BalanceSheetEngine } from "./BalanceSheet";

export class FinancialStatementsEngine {
  /**
   * Generate complete set of financial statements
   * Ensures proper sequencing and reconciliation
   */
  static generate(
    state: TeamState,
    previousStatements: FinancialStatements | null
  ): FinancialStatements {
    const round = state.currentRound;

    // Step 1: Generate Income Statement
    // This drives net income which flows to both cash flow and balance sheet
    const incomeStatement = IncomeStatementEngine.generate(state, round);

    // Step 2: Generate Balance Sheet (current period)
    // We need this before cash flow to calculate working capital changes
    const currentBalance = BalanceSheetEngine.generate(
      state,
      incomeStatement,
      previousStatements?.balanceSheet || null
    );

    // Step 3: Generate Cash Flow Statement
    // Uses income statement and balance sheet changes
    const cashFlowStatement = CashFlowEngine.generate(
      state,
      incomeStatement,
      previousStatements?.balanceSheet || null,
      currentBalance
    );

    // Step 4: Validate reconciliation
    const validation = this.validateReconciliation(
      incomeStatement,
      cashFlowStatement,
      currentBalance,
      previousStatements?.balanceSheet || null
    );

    if (!validation.valid) {
      console.error("Financial statements do not reconcile:", validation.errors);
    }

    // Step 5: Calculate financial ratios
    const ratios = this.calculateRatios(
      incomeStatement,
      cashFlowStatement,
      currentBalance,
      state
    );

    return {
      round,
      incomeStatement,
      cashFlowStatement,
      balanceSheet: currentBalance,
      ratios,
      validation,
    };
  }

  /**
   * Validate that all three statements reconcile
   */
  private static validateReconciliation(
    income: IncomeStatement,
    cashFlow: CashFlowStatement,
    balance: BalanceSheet,
    previousBalance: BalanceSheet | null
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Cash reconciliation: Cash flow change should match balance sheet change
    const balanceSheetCashChange = previousBalance
      ? balance.assets.currentAssets.cash -
        previousBalance.assets.currentAssets.cash
      : balance.assets.currentAssets.cash;

    if (Math.abs(cashFlow.netCashChange - balanceSheetCashChange) > 0.01) {
      errors.push(
        `Cash does not reconcile: Cash Flow shows ${cashFlow.netCashChange}, Balance Sheet shows ${balanceSheetCashChange}`
      );
    }

    // 2. Net income flow: Net income should flow to retained earnings
    const previousRetainedEarnings = previousBalance
      ? previousBalance.equity.retainedEarnings
      : 0;
    const expectedRetainedEarnings =
      previousRetainedEarnings + income.netIncome;

    // Note: This might differ due to dividends, which are tracked separately
    // Just checking that net income is being captured

    // 3. Balance sheet balances
    const balanceValidation = BalanceSheetEngine.validate(balance);
    if (!balanceValidation.valid) {
      errors.push(...balanceValidation.errors);
    }

    // 4. Cash flow statement reconciles
    const cashFlowValidation = CashFlowEngine.validate(cashFlow);
    if (!cashFlowValidation.valid) {
      errors.push(...cashFlowValidation.errors);
    }

    // 5. Operating cash flow starts with net income
    if (cashFlow.operatingActivities.netIncome !== income.netIncome) {
      errors.push(
        `Operating cash flow net income (${cashFlow.operatingActivities.netIncome}) does not match income statement (${income.netIncome})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate comprehensive financial ratios across all statements
   */
  private static calculateRatios(
    income: IncomeStatement,
    cashFlow: CashFlowStatement,
    balance: BalanceSheet,
    state: TeamState
  ): FinancialRatios {
    // Profitability Ratios
    const profitability = {
      grossMargin: income.grossMargin,
      operatingMargin: (income.operatingIncome / income.revenue.total) * 100,
      netMargin: income.netMargin,
      returnOnAssets: (income.netIncome / balance.assets.total) * 100,
      returnOnEquity: (income.netIncome / balance.equity.total) * 100,
      earningsPerShare: income.eps || 0,
    };

    // Liquidity Ratios
    const liquidity = {
      currentRatio:
        balance.assets.currentAssets.total /
        balance.liabilities.currentLiabilities.total,
      quickRatio:
        (balance.assets.currentAssets.total -
          balance.assets.currentAssets.inventory) /
        balance.liabilities.currentLiabilities.total,
      cashRatio:
        balance.assets.currentAssets.cash /
        balance.liabilities.currentLiabilities.total,
      workingCapital: BalanceSheetEngine.calculateWorkingCapital(balance),
    };

    // Leverage Ratios
    const leverage = {
      debtToEquity: balance.liabilities.total / balance.equity.total,
      debtToAssets: balance.liabilities.total / balance.assets.total,
      equityMultiplier: balance.assets.total / balance.equity.total,
      interestCoverage: income.operatingIncome / (income.interestExpense || 1),
    };

    // Efficiency Ratios
    const efficiency = {
      assetTurnover: income.revenue.total / balance.assets.total,
      inventoryTurnover:
        income.cogs.total / balance.assets.currentAssets.inventory || 0,
      receivablesTurnover:
        income.revenue.total / balance.assets.currentAssets.accountsReceivable ||
        0,
      payablesTurnover:
        income.cogs.total /
          balance.liabilities.currentLiabilities.accountsPayable || 0,
    };

    // Cash Flow Ratios
    const cashFlowRatios = {
      operatingCashFlowRatio:
        cashFlow.operatingActivities.netCashFromOperations /
        balance.liabilities.currentLiabilities.total,
      cashFlowToDebtRatio:
        cashFlow.operatingActivities.netCashFromOperations /
        balance.liabilities.total,
      freeCashFlowToEquity: cashFlow.freeCashFlow / balance.equity.total,
      cashConversionRate:
        cashFlow.operatingActivities.netCashFromOperations / income.netIncome,
    };

    // Market Ratios (if shares exist)
    const sharesOutstanding = state.sharesIssued - (state.sharesRepurchased || 0);
    const bookValuePerShare = BalanceSheetEngine.calculateBookValuePerShare(
      balance,
      sharesOutstanding
    );

    const market = {
      bookValuePerShare,
      priceToBook: (state.stockPrice || 0) / bookValuePerShare,
      priceToEarnings: (state.stockPrice || 0) / (income.eps || 1),
      dividendYield: ((state.dividendsPerShare || 0) / (state.stockPrice || 1)) * 100,
    };

    return {
      profitability,
      liquidity,
      leverage,
      efficiency,
      cashFlow: cashFlowRatios,
      market,
    };
  }

  /**
   * Generate financial health score (0-100)
   */
  static calculateFinancialHealthScore(ratios: FinancialRatios): {
    score: number;
    grade: "A" | "B" | "C" | "D" | "F";
    breakdown: {
      profitability: number;
      liquidity: number;
      leverage: number;
      efficiency: number;
      cashFlow: number;
    };
  } {
    // Score each category (0-20 points each)

    // Profitability (20 points)
    let profitabilityScore = 0;
    if (ratios.profitability.returnOnEquity > 20) profitabilityScore += 8;
    else if (ratios.profitability.returnOnEquity > 15) profitabilityScore += 6;
    else if (ratios.profitability.returnOnEquity > 10) profitabilityScore += 4;
    else if (ratios.profitability.returnOnEquity > 5) profitabilityScore += 2;

    if (ratios.profitability.netMargin > 15) profitabilityScore += 6;
    else if (ratios.profitability.netMargin > 10) profitabilityScore += 4;
    else if (ratios.profitability.netMargin > 5) profitabilityScore += 2;

    if (ratios.profitability.operatingMargin > 20) profitabilityScore += 6;
    else if (ratios.profitability.operatingMargin > 15) profitabilityScore += 4;
    else if (ratios.profitability.operatingMargin > 10) profitabilityScore += 2;

    // Liquidity (20 points)
    let liquidityScore = 0;
    if (ratios.liquidity.currentRatio > 2.0) liquidityScore += 8;
    else if (ratios.liquidity.currentRatio > 1.5) liquidityScore += 6;
    else if (ratios.liquidity.currentRatio > 1.2) liquidityScore += 4;
    else if (ratios.liquidity.currentRatio > 1.0) liquidityScore += 2;

    if (ratios.liquidity.quickRatio > 1.5) liquidityScore += 6;
    else if (ratios.liquidity.quickRatio > 1.0) liquidityScore += 4;
    else if (ratios.liquidity.quickRatio > 0.8) liquidityScore += 2;

    if (ratios.liquidity.workingCapital > 50_000_000) liquidityScore += 6;
    else if (ratios.liquidity.workingCapital > 20_000_000) liquidityScore += 4;
    else if (ratios.liquidity.workingCapital > 0) liquidityScore += 2;

    // Leverage (20 points) - lower is better
    let leverageScore = 0;
    if (ratios.leverage.debtToEquity < 0.3) leverageScore += 8;
    else if (ratios.leverage.debtToEquity < 0.6) leverageScore += 6;
    else if (ratios.leverage.debtToEquity < 1.0) leverageScore += 4;
    else if (ratios.leverage.debtToEquity < 1.5) leverageScore += 2;

    if (ratios.leverage.interestCoverage > 10) leverageScore += 6;
    else if (ratios.leverage.interestCoverage > 5) leverageScore += 4;
    else if (ratios.leverage.interestCoverage > 3) leverageScore += 2;

    if (ratios.leverage.debtToAssets < 0.3) leverageScore += 6;
    else if (ratios.leverage.debtToAssets < 0.5) leverageScore += 4;
    else if (ratios.leverage.debtToAssets < 0.7) leverageScore += 2;

    // Efficiency (20 points)
    let efficiencyScore = 0;
    if (ratios.efficiency.assetTurnover > 1.5) efficiencyScore += 7;
    else if (ratios.efficiency.assetTurnover > 1.0) efficiencyScore += 5;
    else if (ratios.efficiency.assetTurnover > 0.7) efficiencyScore += 3;

    if (ratios.efficiency.inventoryTurnover > 12) efficiencyScore += 7;
    else if (ratios.efficiency.inventoryTurnover > 8) efficiencyScore += 5;
    else if (ratios.efficiency.inventoryTurnover > 6) efficiencyScore += 3;

    if (ratios.efficiency.receivablesTurnover > 12) efficiencyScore += 6;
    else if (ratios.efficiency.receivablesTurnover > 8) efficiencyScore += 4;
    else if (ratios.efficiency.receivablesTurnover > 6) efficiencyScore += 2;

    // Cash Flow (20 points)
    let cashFlowScore = 0;
    if (ratios.cashFlow.operatingCashFlowRatio > 0.5) cashFlowScore += 7;
    else if (ratios.cashFlow.operatingCashFlowRatio > 0.3) cashFlowScore += 5;
    else if (ratios.cashFlow.operatingCashFlowRatio > 0.2) cashFlowScore += 3;

    if (ratios.cashFlow.cashConversionRate > 1.2) cashFlowScore += 7;
    else if (ratios.cashFlow.cashConversionRate > 1.0) cashFlowScore += 5;
    else if (ratios.cashFlow.cashConversionRate > 0.8) cashFlowScore += 3;

    if (ratios.cashFlow.freeCashFlowToEquity > 0.15) cashFlowScore += 6;
    else if (ratios.cashFlow.freeCashFlowToEquity > 0.10) cashFlowScore += 4;
    else if (ratios.cashFlow.freeCashFlowToEquity > 0.05) cashFlowScore += 2;

    // Total score
    const totalScore =
      profitabilityScore +
      liquidityScore +
      leverageScore +
      efficiencyScore +
      cashFlowScore;

    // Grade
    let grade: "A" | "B" | "C" | "D" | "F";
    if (totalScore >= 90) grade = "A";
    else if (totalScore >= 80) grade = "B";
    else if (totalScore >= 70) grade = "C";
    else if (totalScore >= 60) grade = "D";
    else grade = "F";

    return {
      score: totalScore,
      grade,
      breakdown: {
        profitability: profitabilityScore,
        liquidity: liquidityScore,
        leverage: leverageScore,
        efficiency: efficiencyScore,
        cashFlow: cashFlowScore,
      },
    };
  }

  /**
   * Generate financial insights and recommendations
   */
  static generateInsights(
    statements: FinancialStatements,
    previousStatements: FinancialStatements | null
  ): {
    strengths: string[];
    concerns: string[];
    recommendations: string[];
  } {
    const strengths: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    const { ratios, incomeStatement, cashFlowStatement, balanceSheet } = statements;

    // Profitability insights
    if (ratios.profitability.returnOnEquity > 20) {
      strengths.push(
        `Excellent ROE of ${ratios.profitability.returnOnEquity.toFixed(1)}% demonstrates strong profitability`
      );
    } else if (ratios.profitability.returnOnEquity < 5) {
      concerns.push(
        `Low ROE of ${ratios.profitability.returnOnEquity.toFixed(1)}% suggests weak returns on shareholder investment`
      );
      recommendations.push("Focus on improving profit margins or reducing assets");
    }

    // Cash vs profit
    const cashConversion = ratios.cashFlow.cashConversionRate;
    if (cashConversion < 0.7) {
      concerns.push(
        `Only ${(cashConversion * 100).toFixed(0)}% of net income is converting to cash - potential working capital issues`
      );
      recommendations.push(
        "Improve accounts receivable collection or reduce inventory buildup"
      );
    } else if (cashConversion > 1.2) {
      strengths.push(
        `Strong cash generation at ${(cashConversion * 100).toFixed(0)}% of net income`
      );
    }

    // Liquidity concerns
    if (ratios.liquidity.currentRatio < 1.0) {
      concerns.push(
        `Current ratio of ${ratios.liquidity.currentRatio.toFixed(2)} below 1.0 - may struggle to meet short-term obligations`
      );
      recommendations.push("Increase cash reserves or reduce short-term liabilities");
    } else if (ratios.liquidity.currentRatio > 3.0) {
      concerns.push(
        `Current ratio of ${ratios.liquidity.currentRatio.toFixed(2)} is very high - may be holding excess cash`
      );
      recommendations.push(
        "Consider investing idle cash in growth opportunities or return to shareholders"
      );
    }

    // Leverage concerns
    if (ratios.leverage.debtToEquity > 1.5) {
      concerns.push(
        `High debt-to-equity ratio of ${ratios.leverage.debtToEquity.toFixed(2)} increases financial risk`
      );
      recommendations.push("Consider reducing debt or raising equity capital");
    } else if (ratios.leverage.debtToEquity < 0.2) {
      strengths.push(
        `Conservative capital structure with D/E of ${ratios.leverage.debtToEquity.toFixed(2)}`
      );
      recommendations.push(
        "Could potentially use more leverage to amplify returns if opportunities exist"
      );
    }

    // Interest coverage
    if (ratios.leverage.interestCoverage < 2.0) {
      concerns.push(
        `Interest coverage of ${ratios.leverage.interestCoverage.toFixed(1)}x is low - earnings barely cover interest`
      );
      recommendations.push(
        "Reduce debt or improve operating income to strengthen debt servicing capacity"
      );
    }

    // Free cash flow
    if (cashFlowStatement.freeCashFlow < 0) {
      concerns.push(
        `Negative free cash flow of $${(-cashFlowStatement.freeCashFlow / 1_000_000).toFixed(1)}M - burning cash`
      );
      recommendations.push(
        "Reduce capital expenditures or improve operating cash flow"
      );
    } else if (cashFlowStatement.freeCashFlow > 50_000_000) {
      strengths.push(
        `Strong free cash flow of $${(cashFlowStatement.freeCashFlow / 1_000_000).toFixed(1)}M provides financial flexibility`
      );
    }

    // Growth trends (if we have previous period)
    if (previousStatements) {
      const revenueGrowth =
        ((incomeStatement.revenue.total -
          previousStatements.incomeStatement.revenue.total) /
          previousStatements.incomeStatement.revenue.total) *
        100;

      if (revenueGrowth > 20) {
        strengths.push(`Strong revenue growth of ${revenueGrowth.toFixed(1)}%`);
      } else if (revenueGrowth < 0) {
        concerns.push(`Revenue declined ${Math.abs(revenueGrowth).toFixed(1)}%`);
        recommendations.push(
          "Investigate causes of revenue decline - market share loss or pricing pressure?"
        );
      }
    }

    // Working capital efficiency
    const workingCapitalRatio =
      ratios.liquidity.workingCapital / incomeStatement.revenue.total;
    if (workingCapitalRatio > 0.3) {
      concerns.push(
        "High working capital relative to revenue - may have cash tied up in operations"
      );
      recommendations.push(
        "Optimize inventory levels and accelerate receivables collection"
      );
    }

    return {
      strengths,
      concerns,
      recommendations,
    };
  }
}
