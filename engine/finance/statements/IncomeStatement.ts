/**
 * Income Statement Engine
 * Generates complete income statements from game state
 */

import type { TeamState, Segment } from "../../types";
import type { IncomeStatement } from "../types";

export class IncomeStatementEngine {
  /**
   * Generate complete income statement for the current round
   */
  static generate(state: TeamState, round: number): IncomeStatement {
    // Calculate revenue from market results
    const revenue = this.calculateRevenue(state);

    // Calculate COGS from production
    const cogs = this.calculateCOGS(state);

    // Calculate operating expenses
    const opex = this.calculateOperatingExpenses(state);

    // Calculate interest
    const interestExpense = this.calculateInterestExpense(state);
    const interestIncome = state.cash * 0.0001; // 0.01% monthly on cash

    // Calculate pre-tax income
    const incomeBeforeTax =
      revenue.total - cogs.total - opex.total - interestExpense + interestIncome;

    // Calculate taxes
    const taxExpense = this.calculateTaxes(state, incomeBeforeTax);

    // Net income
    const netIncome = incomeBeforeTax - taxExpense;

    // Calculate margins
    const grossProfit = revenue.total - cogs.total;
    const operatingIncome = grossProfit - opex.total;

    // Build statement
    return {
      round,
      revenue,
      cogs,
      grossProfit,
      grossMargin: revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0,
      operatingExpenses: opex,
      operatingIncome,
      operatingMargin: revenue.total > 0 ? (operatingIncome / revenue.total) * 100 : 0,
      interestExpense,
      interestIncome,
      otherIncome: 0,
      otherExpenses: 0,
      incomeBeforeTax,
      taxExpense,
      effectiveTaxRate:
        incomeBeforeTax > 0 ? (taxExpense / incomeBeforeTax) * 100 : 0,
      netIncome,
      netMargin: revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0,
      eps: this.calculateEPS(state, netIncome),
    };
  }

  /**
   * Calculate revenue from market results
   */
  private static calculateRevenue(state: TeamState): IncomeStatement["revenue"] {
    let total = 0;
    const bySegment: Record<Segment, number> = {
      Budget: 0,
      General: 0,
      Enthusiast: 0,
      Professional: 0,
      "Active Lifestyle": 0,
    };

    // Sum up revenue from each segment
    if (state.products) {
      for (const product of state.products) {
        const productRevenue = product.unitsSold * product.price;
        bySegment[product.segment] += productRevenue;
        total += productRevenue;
      }
    }

    return {
      total,
      bySegment,
    };
  }

  /**
   * Calculate Cost of Goods Sold
   */
  private static calculateCOGS(state: TeamState): IncomeStatement["cogs"] {
    // Raw materials from materials system
    const rawMaterials = state.materials?.holdingCosts || 0;

    // Direct labor (production workers only)
    const directLabor = state.employees.workers * (45000 / 12); // Monthly salary

    // Manufacturing overhead (fixed factory costs)
    const manufacturing = state.factories.length * 100000; // $100k per factory per month

    // Shipping costs (simplified - should be tracked from logistics)
    const shipping = 0; // TODO: Integrate with logistics system

    // Other COGS
    const other = 0;

    const total = rawMaterials + directLabor + manufacturing + shipping + other;

    return {
      total,
      rawMaterials,
      directLabor,
      manufacturing,
      shipping,
      other,
    };
  }

  /**
   * Calculate Operating Expenses
   */
  private static calculateOperatingExpenses(
    state: TeamState
  ): IncomeStatement["operatingExpenses"] {
    // Salaries (non-production staff)
    const engineerSalaries = state.employees.engineers * (85000 / 12);
    const supervisorSalaries = state.employees.supervisors * (75000 / 12);
    const overheadStaff = Math.floor(state.employees.workers * 0.1); // 10% overhead
    const overheadSalaries = overheadStaff * (60000 / 12);
    const salaries = engineerSalaries + supervisorSalaries + overheadSalaries;

    // Benefits (30% of salaries)
    const benefits = salaries * 0.3;

    // Marketing spend
    const marketing = state.marketingSpend || 0;

    // R&D spend
    const rd = state.rdSpend || 0;

    // Maintenance
    const maintenance = state.maintenanceSpend || 0;

    // Facilities (rent, utilities, etc)
    const facilities = state.factories.length * 50000; // $50k per factory per month

    // Depreciation (10-year straight line on factories)
    const depreciation = state.factories.length * (50000000 / 120); // $50M cost, 120 months

    // Amortization (capitalized R&D)
    const amortization = 0; // TODO: Implement R&D capitalization

    // Other expenses
    const other = 0;

    const total =
      salaries +
      benefits +
      marketing +
      rd +
      maintenance +
      facilities +
      depreciation +
      amortization +
      other;

    return {
      total,
      salaries,
      benefits,
      marketing,
      rd,
      maintenance,
      facilities,
      depreciation,
      amortization,
      other,
    };
  }

  /**
   * Calculate interest expense from debt
   */
  private static calculateInterestExpense(state: TeamState): number {
    if (!state.capitalStructure?.debtInstruments) return 0;

    let totalInterest = 0;

    for (const debt of state.capitalStructure.debtInstruments) {
      if (debt.status === "active") {
        // Monthly interest
        const monthlyRate = debt.interestRate / 12;
        const interest = debt.remainingPrincipal * monthlyRate;
        totalInterest += interest;
      }
    }

    return totalInterest;
  }

  /**
   * Calculate tax expense
   */
  private static calculateTaxes(state: TeamState, incomeBeforeTax: number): number {
    if (incomeBeforeTax <= 0) return 0;

    // Corporate tax rate (simplified)
    const federalRate = 0.21; // 21% federal corporate tax
    const stateRate = 0.05; // 5% average state tax

    const federalTax = incomeBeforeTax * federalRate;
    const stateTax = incomeBeforeTax * stateRate;

    // TODO: Implement tax deductions, credits, etc.

    return federalTax + stateTax;
  }

  /**
   * Calculate Earnings Per Share
   */
  private static calculateEPS(state: TeamState, netIncome: number): number | undefined {
    if (!state.capitalStructure?.equityPosition) return undefined;

    const sharesOutstanding = state.capitalStructure.equityPosition.sharesOutstanding;

    if (sharesOutstanding === 0) return undefined;

    return netIncome / sharesOutstanding;
  }
}
