/**
 * Balance Sheet Engine
 * Generates balance sheets showing assets, liabilities, and equity
 */

import type { TeamState } from "../../types";
import type { BalanceSheet, IncomeStatement } from "../types";

export class BalanceSheetEngine {
  /**
   * Generate complete balance sheet from current state
   */
  static generate(
    state: TeamState,
    incomeStatement: IncomeStatement,
    previousBalance: BalanceSheet | null
  ): BalanceSheet {
    // Calculate assets
    const currentAssets = this.calculateCurrentAssets(state);
    const nonCurrentAssets = this.calculateNonCurrentAssets(state, previousBalance);
    const totalAssets = currentAssets.total + nonCurrentAssets.total;

    // Calculate liabilities
    const currentLiabilities = this.calculateCurrentLiabilities(state);
    const longTermLiabilities = this.calculateLongTermLiabilities(state);
    const totalLiabilities = currentLiabilities.total + longTermLiabilities.total;

    // Calculate equity
    const equity = this.calculateEquity(state, incomeStatement, previousBalance);
    const totalEquity = equity.total;

    // Validation
    const balanceDifference = totalAssets - (totalLiabilities + totalEquity);
    if (Math.abs(balanceDifference) > 0.01) {
      console.warn(
        `Balance sheet does not balance! Assets: ${totalAssets}, L+E: ${totalLiabilities + totalEquity}, Diff: ${balanceDifference}`
      );
    }

    return {
      round: state.currentRound,
      assets: {
        currentAssets,
        nonCurrentAssets,
        total: totalAssets,
      },
      liabilities: {
        currentLiabilities,
        longTermLiabilities,
        total: totalLiabilities,
      },
      equity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    };
  }

  /**
   * Calculate current assets (expected to convert to cash within 1 year)
   */
  private static calculateCurrentAssets(
    state: TeamState
  ): BalanceSheet["assets"]["currentAssets"] {
    // Cash
    const cash = state.cash;

    // Accounts Receivable (30-60 day payment terms)
    // Assume 1/3 of this round's revenue is on credit
    const accountsReceivable = state.accountsReceivable || 0;

    // Inventory
    const inventory = this.calculateInventoryValue(state);

    // Prepaid expenses (insurance, rent paid in advance)
    const prepaidExpenses = state.prepaidExpenses || 0;

    // Short-term investments
    const shortTermInvestments = state.shortTermInvestments || 0;

    const total =
      cash +
      accountsReceivable +
      inventory +
      prepaidExpenses +
      shortTermInvestments;

    return {
      cash,
      accountsReceivable,
      inventory,
      prepaidExpenses,
      shortTermInvestments,
      total,
    };
  }

  /**
   * Calculate non-current assets (long-term assets)
   */
  private static calculateNonCurrentAssets(
    state: TeamState,
    previousBalance: BalanceSheet | null
  ): BalanceSheet["assets"]["nonCurrentAssets"] {
    // Property, Plant & Equipment (PP&E)
    const ppe = this.calculatePPE(state, previousBalance);

    // Intangible assets
    const intangibleAssets = this.calculateIntangibleAssets(state, previousBalance);

    // Long-term investments
    const longTermInvestments = state.longTermInvestments || 0;

    // Goodwill
    const goodwill = state.goodwill || 0;

    const total = ppe.net + intangibleAssets.net + longTermInvestments + goodwill;

    return {
      propertyPlantEquipment: ppe,
      intangibleAssets,
      longTermInvestments,
      goodwill,
      total,
    };
  }

  /**
   * Calculate Property, Plant & Equipment value with depreciation
   */
  private static calculatePPE(
    state: TeamState,
    previousBalance: BalanceSheet | null
  ): BalanceSheet["assets"]["nonCurrentAssets"]["propertyPlantEquipment"] {
    // Factory value at cost
    const factoriesAtCost = state.factories.length * 50_000_000; // $50M per factory

    // Production lines at cost
    const productionLinesAtCost = state.factories.reduce(
      (sum, factory) => sum + factory.productionLines * 5_000_000, // $5M per line
      0
    );

    // Equipment at cost (automation, quality equipment)
    const equipmentAtCost =
      (state.factoryUpgrades?.automation ? 75_000_000 : 0) +
      (state.factoryUpgrades?.sixSigma ? 75_000_000 : 0) +
      (state.factoryUpgrades?.materialRefinement ? 100_000_000 : 0) +
      (state.factoryUpgrades?.supplyChain ? 200_000_000 : 0) +
      (state.factoryUpgrades?.warehousing ? 100_000_000 : 0);

    const grossPPE = factoriesAtCost + productionLinesAtCost + equipmentAtCost;

    // Accumulated depreciation (carry forward from previous + this round's depreciation)
    const previousAccumulatedDepreciation =
      previousBalance?.assets.nonCurrentAssets.propertyPlantEquipment
        .accumulatedDepreciation || 0;

    // Monthly depreciation (10-year life, straight-line)
    const monthlyDepreciation = grossPPE / (10 * 12);
    const accumulatedDepreciation =
      previousAccumulatedDepreciation + monthlyDepreciation;

    const netPPE = grossPPE - accumulatedDepreciation;

    return {
      gross: grossPPE,
      accumulatedDepreciation,
      net: netPPE,
    };
  }

  /**
   * Calculate intangible assets (patents, R&D capitalization)
   */
  private static calculateIntangibleAssets(
    state: TeamState,
    previousBalance: BalanceSheet | null
  ): BalanceSheet["assets"]["nonCurrentAssets"]["intangibleAssets"] {
    // Patents and technology
    const patents = state.patents?.length ? state.patents.length * 5_000_000 : 0;

    // Capitalized R&D (if using capitalization instead of expensing)
    const capitalizedRD = state.capitalizedRD || 0;

    // Software and licenses
    const software = state.softwareLicenses || 0;

    const grossIntangibles = patents + capitalizedRD + software;

    // Accumulated amortization (15-year life for patents, 3 years for software)
    const previousAccumulatedAmortization =
      previousBalance?.assets.nonCurrentAssets.intangibleAssets
        .accumulatedAmortization || 0;

    const monthlyAmortization = grossIntangibles / (10 * 12); // Average 10-year life
    const accumulatedAmortization =
      previousAccumulatedAmortization + monthlyAmortization;

    const netIntangibles = grossIntangibles - accumulatedAmortization;

    return {
      gross: grossIntangibles,
      accumulatedAmortization,
      net: netIntangibles,
    };
  }

  /**
   * Calculate inventory value (raw materials + WIP + finished goods)
   */
  private static calculateInventoryValue(state: TeamState): number {
    let totalInventory = 0;

    // Raw materials inventory
    if (state.materials?.inventory) {
      for (const item of state.materials.inventory) {
        totalInventory += item.quantity * item.unitCost;
      }
    }

    // Work in progress (assume 20% of monthly production)
    const monthlyProduction = state.products.reduce(
      (sum, p) => sum + (p.unitsSold || 0),
      0
    );
    const wipUnits = monthlyProduction * 0.2;
    const avgUnitCost = 150; // Average across segments
    totalInventory += wipUnits * avgUnitCost;

    // Finished goods (unsold units from production)
    for (const product of state.products) {
      const unitsProduced = product.unitsProduced || 0;
      const unitsSold = product.unitsSold || 0;
      const unsoldUnits = Math.max(0, unitsProduced - unitsSold);
      const unitCost = product.unitCost || avgUnitCost;
      totalInventory += unsoldUnits * unitCost;
    }

    return totalInventory;
  }

  /**
   * Calculate current liabilities (due within 1 year)
   */
  private static calculateCurrentLiabilities(
    state: TeamState
  ): BalanceSheet["liabilities"]["currentLiabilities"] {
    // Accounts payable (supplier invoices)
    const accountsPayable = state.accountsPayable || 0;

    // Accrued expenses (wages, taxes, interest owed but not yet paid)
    const accruedExpenses = this.calculateAccruedExpenses(state);

    // Short-term debt (current portion of long-term debt + credit line)
    const shortTermDebt = this.calculateShortTermDebt(state);

    // Deferred revenue (advance payments from customers)
    const deferredRevenue = state.deferredRevenue || 0;

    const total =
      accountsPayable + accruedExpenses + shortTermDebt + deferredRevenue;

    return {
      accountsPayable,
      accruedExpenses,
      shortTermDebt,
      deferredRevenue,
      total,
    };
  }

  /**
   * Calculate accrued expenses
   */
  private static calculateAccruedExpenses(state: TeamState): number {
    // Accrued salaries (assume paid at end of month)
    const monthlySalaries =
      state.employees.workers * (45_000 / 12) +
      state.employees.engineers * (85_000 / 12) +
      state.employees.supervisors * (75_000 / 12);

    // Accrued interest (on outstanding debt)
    const accruedInterest = 0; // TODO: Calculate from debt instruments

    // Accrued taxes
    const accruedTaxes = 0; // Taxes are paid same round in this sim

    return monthlySalaries + accruedInterest + accruedTaxes;
  }

  /**
   * Calculate short-term debt
   */
  private static calculateShortTermDebt(state: TeamState): number {
    let shortTermDebt = 0;

    // Credit line balance
    shortTermDebt += state.creditLineBalance || 0;

    // Current portion of long-term debt (debt due within 12 months)
    if (state.debts) {
      for (const debt of state.debts) {
        if (debt.remainingRounds <= 12) {
          shortTermDebt += debt.principal;
        }
      }
    }

    return shortTermDebt;
  }

  /**
   * Calculate long-term liabilities (due after 1 year)
   */
  private static calculateLongTermLiabilities(
    state: TeamState
  ): BalanceSheet["liabilities"]["longTermLiabilities"] {
    // Long-term debt
    let longTermDebt = 0;
    if (state.debts) {
      for (const debt of state.debts) {
        if (debt.remainingRounds > 12) {
          longTermDebt += debt.principal;
        }
      }
    }

    // Pension liabilities
    const pensionLiabilities = state.pensionLiabilities || 0;

    // Deferred tax liabilities
    const deferredTaxLiabilities = state.deferredTaxLiabilities || 0;

    const total = longTermDebt + pensionLiabilities + deferredTaxLiabilities;

    return {
      longTermDebt,
      pensionLiabilities,
      deferredTaxLiabilities,
      total,
    };
  }

  /**
   * Calculate shareholders' equity
   */
  private static calculateEquity(
    state: TeamState,
    incomeStatement: IncomeStatement,
    previousBalance: BalanceSheet | null
  ): BalanceSheet["equity"] {
    // Common stock (shares issued × par value)
    const commonStock = state.sharesIssued * 10; // $10 par value

    // Additional paid-in capital (amount above par value)
    const additionalPaidInCapital = state.additionalPaidInCapital || 0;

    // Retained earnings (accumulated profits - dividends)
    const previousRetainedEarnings =
      previousBalance?.equity.retainedEarnings || 0;
    const retainedEarnings =
      previousRetainedEarnings +
      incomeStatement.netIncome -
      (state.dividendsPaidThisRound || 0);

    // Treasury stock (shares bought back)
    const treasuryStock = -(state.treasuryStock || 0); // Negative equity

    const total =
      commonStock + additionalPaidInCapital + retainedEarnings + treasuryStock;

    return {
      commonStock,
      additionalPaidInCapital,
      retainedEarnings,
      treasuryStock,
      total,
    };
  }

  /**
   * Validate balance sheet
   */
  static validate(statement: BalanceSheet): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if balance sheet balances
    const difference =
      statement.assets.total - statement.totalLiabilitiesAndEquity;

    if (Math.abs(difference) > 0.01) {
      errors.push(
        `Balance sheet does not balance: Assets ${statement.assets.total} ≠ L+E ${statement.totalLiabilitiesAndEquity} (diff: ${difference})`
      );
    }

    // Check for negative equity (distress signal)
    if (statement.equity.total < 0) {
      errors.push(
        `Negative equity detected: ${statement.equity.total}. Company may be insolvent.`
      );
    }

    // Check current ratio (should be > 1.0 for healthy company)
    const currentRatio =
      statement.assets.currentAssets.total /
      statement.liabilities.currentLiabilities.total;

    if (currentRatio < 1.0) {
      errors.push(
        `Current ratio below 1.0 (${currentRatio.toFixed(2)}). Company may struggle to meet short-term obligations.`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate working capital
   */
  static calculateWorkingCapital(statement: BalanceSheet): number {
    return (
      statement.assets.currentAssets.total -
      statement.liabilities.currentLiabilities.total
    );
  }

  /**
   * Calculate book value per share
   */
  static calculateBookValuePerShare(
    statement: BalanceSheet,
    sharesOutstanding: number
  ): number {
    return statement.equity.total / sharesOutstanding;
  }
}
