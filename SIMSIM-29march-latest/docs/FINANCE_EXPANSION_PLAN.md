# Finance System Expansion - Implementation Plan

## Executive Summary

This plan transforms the Finance module from basic tracking into a comprehensive financial management simulator covering financial statements, capital structure, investor relations, risk management, and strategic finance decisions.

**Current State:** Basic cash/revenue tracking, simple cost accounting
**Target State:** Full financial statements, capital structure decisions, board interactions, credit ratings, bankruptcy mechanics, and strategic finance tools

**Learning Outcomes:**
- Understanding that profit ≠ cash
- Capital structure decisions and tradeoffs
- Financial health monitoring through ratios
- Strategic finance and investor relations
- Risk management and crisis response
- Working capital management
- Valuation fundamentals

---

## Architecture Overview

### File Structure

```
src/engine/finance/
  FinanceEngine.ts              # Core finance calculations (EXISTS - enhance)

  # New subsystems
  statements/
    IncomeStatement.ts          # Revenue, COGS, expenses, profit
    CashFlowStatement.ts        # Operating, investing, financing flows
    BalanceSheet.ts             # Assets, liabilities, equity
    StatementIntegration.ts     # Tie all statements together

  capital/
    DebtManager.ts              # Loans, bonds, credit lines
    EquityManager.ts            # Share issuance, dilution, investors
    DividendPolicy.ts           # Dividend decisions and impacts
    CreditRating.ts             # Credit rating calculations

  ratios/
    FinancialRatios.ts          # All ratio calculations
    HealthMetrics.ts            # Color-coded health indicators
    BenchmarkData.ts            # Industry benchmarks

  governance/
    BoardInteractions.ts        # Board proposals and voting
    InvestorSentiment.ts        # Sentiment tracking and impacts
    SharePrice.ts               # Stock price simulation

  planning/
    BudgetManager.ts            # Annual budget allocation
    CapexPlanner.ts             # Capital expenditure planning
    ForecastEngine.ts           # Scenario analysis tool

  risk/
    ShockEvents.ts              # Financial shocks and crises
    BankruptcyManager.ts        # Distress and bankruptcy mechanics
    WorkingCapital.ts           # AR, AP, inventory management

  tax/
    TaxCalculator.ts            # Corporate tax calculations
    TaxStrategy.ts              # Tax optimization decisions

  valuation/
    ValuationEngine.ts          # Company valuation models

  types.ts                      # All finance-related types
  index.ts                      # Main exports
```

### State Extensions

```typescript
// src/engine/types/state.ts extensions

interface TeamState {
  // ... existing fields

  // Financial Statements (new)
  financialStatements?: {
    incomeStatement: IncomeStatement;
    cashFlowStatement: CashFlowStatement;
    balanceSheet: BalanceSheet;
    statementHistory: StatementSnapshot[];  // Last 8 rounds
  };

  // Capital Structure (new)
  capitalStructure?: {
    debtInstruments: DebtInstrument[];
    equityPosition: EquityPosition;
    creditRating: CreditRating;
    dividendHistory: DividendPayment[];
  };

  // Governance (new)
  governance?: {
    boardMembers: BoardMember[];
    investorSentiment: number;  // 0-100
    sharePrice: number;
    shareholderExpectations: Expectations;
  };

  // Budget & Planning (new)
  budget?: {
    currentBudget: BudgetAllocation;
    budgetVariance: VarianceAnalysis;
    forecastedPerformance: Forecast[];
  };

  // Working Capital (new)
  workingCapital?: {
    accountsReceivable: ARDetail[];
    accountsPayable: APDetail[];
    inventoryHolding: InventoryValuation;
    cashConversionCycle: number;  // Days
  };

  // Risk & Events (new)
  financialRisk?: {
    activeShocks: FinancialShock[];
    riskScore: number;  // 0-100
    distressLevel: DistressLevel;
    bankruptcyWarnings: Warning[];
  };
}
```

---

## Phase 1: Core Financial Statements (Priority: CRITICAL)

### 1.1 Income Statement Engine

**File:** `src/engine/finance/statements/IncomeStatement.ts`

```typescript
export interface IncomeStatement {
  round: number;

  // Revenue
  revenue: {
    total: number;
    bySegment: Record<Segment, number>;
    byRegion: Record<Region, number>;
  };

  // Cost of Goods Sold
  cogs: {
    total: number;
    rawMaterials: number;
    directLabor: number;
    manufacturing: number;
    shipping: number;
  };

  grossProfit: number;
  grossMargin: number;  // %

  // Operating Expenses
  operatingExpenses: {
    total: number;
    salaries: number;
    benefits: number;
    marketing: number;
    rd: number;
    maintenance: number;
    facilities: number;
    depreciation: number;
    amortization: number;
    other: number;
  };

  operatingIncome: number;
  operatingMargin: number;  // %

  // Non-Operating Items
  interestExpense: number;
  interestIncome: number;
  otherIncome: number;
  otherExpenses: number;

  // Pre-tax and Taxes
  incomeBeforeTax: number;
  taxExpense: number;
  effectiveTaxRate: number;  // %

  // Net Income
  netIncome: number;
  netMargin: number;  // %

  // Per Share (if applicable)
  eps?: number;  // Earnings per share
}

export class IncomeStatementEngine {
  static generate(state: TeamState, round: number): IncomeStatement {
    // Calculate revenue from market results
    const revenue = this.calculateRevenue(state);

    // Calculate COGS from production
    const cogs = this.calculateCOGS(state);

    // Calculate operating expenses
    const opex = this.calculateOperatingExpenses(state);

    // Calculate taxes
    const taxExpense = this.calculateTaxes(state, revenue.total - cogs.total - opex.total);

    // Build statement
    return {
      round,
      revenue,
      cogs,
      grossProfit: revenue.total - cogs.total,
      grossMargin: ((revenue.total - cogs.total) / revenue.total) * 100,
      operatingExpenses: opex,
      operatingIncome: revenue.total - cogs.total - opex.total,
      operatingMargin: ((revenue.total - cogs.total - opex.total) / revenue.total) * 100,
      interestExpense: this.calculateInterestExpense(state),
      interestIncome: state.cash * 0.001, // 0.1% on cash
      otherIncome: 0,
      otherExpenses: 0,
      incomeBeforeTax: revenue.total - cogs.total - opex.total - this.calculateInterestExpense(state),
      taxExpense,
      effectiveTaxRate: (taxExpense / (revenue.total - cogs.total - opex.total)) * 100,
      netIncome: revenue.total - cogs.total - opex.total - this.calculateInterestExpense(state) - taxExpense,
      netMargin: ((revenue.total - cogs.total - opex.total - taxExpense) / revenue.total) * 100,
    };
  }

  private static calculateCOGS(state: TeamState): COGSBreakdown {
    // Material costs from materials system
    const rawMaterials = state.materials?.holdingCosts || 0;

    // Direct labor from production workers
    const directLabor = state.employees.workers * 45000 / 12;  // Monthly

    // Manufacturing overhead
    const manufacturing = state.factories.length * 100000;  // Fixed overhead per factory

    // Shipping costs from logistics
    const shipping = 0;  // TODO: Track from material orders

    return {
      total: rawMaterials + directLabor + manufacturing + shipping,
      rawMaterials,
      directLabor,
      manufacturing,
      shipping,
    };
  }

  private static calculateOperatingExpenses(state: TeamState): OpexBreakdown {
    // Salaries (engineers, supervisors, overhead)
    const salaries = (
      (state.employees.engineers * 85000 / 12) +
      (state.employees.supervisors * 75000 / 12) +
      (state.employees.workers * 0.1 * 60000 / 12)  // Some overhead workers
    );

    // Benefits
    const benefits = salaries * 0.3;  // 30% of salaries

    // Depreciation
    const depreciation = state.factories.length * 500000 / 120;  // 10-year life, monthly

    return {
      total: salaries + benefits + state.marketingSpend + state.rdSpend + depreciation,
      salaries,
      benefits,
      marketing: state.marketingSpend,
      rd: state.rdSpend,
      maintenance: state.maintenanceSpend || 0,
      facilities: state.factories.length * 50000,  // $50k/factory/month
      depreciation,
      amortization: 0,
      other: 0,
    };
  }
}
```

### 1.2 Cash Flow Statement Engine

**File:** `src/engine/finance/statements/CashFlowStatement.ts`

```typescript
export interface CashFlowStatement {
  round: number;

  // Operating Activities
  operatingActivities: {
    netIncome: number;

    // Non-cash adjustments
    depreciation: number;
    amortization: number;

    // Working capital changes
    changeInAR: number;  // Accounts Receivable
    changeInInventory: number;
    changeInAP: number;  // Accounts Payable
    changeInAccruedExpenses: number;

    netCashFromOperations: number;
  };

  // Investing Activities
  investingActivities: {
    capitalExpenditures: number;  // Negative
    rdCapitalization: number;  // Negative
    assetSales: number;  // Positive
    netCashFromInvesting: number;
  };

  // Financing Activities
  financingActivities: {
    debtProceeds: number;  // Positive
    debtRepayments: number;  // Negative
    equityProceeds: number;  // Positive
    dividendsPaid: number;  // Negative
    shareRepurchases: number;  // Negative
    netCashFromFinancing: number;
  };

  // Summary
  netCashChange: number;
  beginningCash: number;
  endingCash: number;

  // Free Cash Flow (key metric)
  freeCashFlow: number;  // Operating - CapEx
}

export class CashFlowEngine {
  static generate(
    state: TeamState,
    incomeStatement: IncomeStatement,
    previousBalance: BalanceSheet,
    currentBalance: BalanceSheet
  ): CashFlowStatement {
    // Operating activities
    const operating = {
      netIncome: incomeStatement.netIncome,
      depreciation: incomeStatement.operatingExpenses.depreciation,
      amortization: incomeStatement.operatingExpenses.amortization,
      changeInAR: currentBalance.assets.accountsReceivable - previousBalance.assets.accountsReceivable,
      changeInInventory: currentBalance.assets.inventory - previousBalance.assets.inventory,
      changeInAP: currentBalance.liabilities.accountsPayable - previousBalance.liabilities.accountsPayable,
      changeInAccruedExpenses: 0,
      netCashFromOperations: 0,  // Calculated below
    };

    operating.netCashFromOperations =
      operating.netIncome +
      operating.depreciation +
      operating.amortization -
      operating.changeInAR -
      operating.changeInInventory +
      operating.changeInAP;

    // Investing activities
    const investing = {
      capitalExpenditures: -state.capexThisRound || 0,
      rdCapitalization: -state.rdCapexThisRound || 0,
      assetSales: state.assetSalesThisRound || 0,
      netCashFromInvesting: 0,
    };

    investing.netCashFromInvesting =
      investing.capitalExpenditures +
      investing.rdCapitalization +
      investing.assetSales;

    // Financing activities
    const financing = {
      debtProceeds: state.debtIssuedThisRound || 0,
      debtRepayments: -state.debtRepaidThisRound || 0,
      equityProceeds: state.equityIssuedThisRound || 0,
      dividendsPaid: -state.dividendsPaidThisRound || 0,
      shareRepurchases: -state.sharesRepurchasedThisRound || 0,
      netCashFromFinancing: 0,
    };

    financing.netCashFromFinancing =
      financing.debtProceeds +
      financing.debtRepayments +
      financing.equityProceeds +
      financing.dividendsPaid +
      financing.shareRepurchases;

    const netCashChange =
      operating.netCashFromOperations +
      investing.netCashFromInvesting +
      financing.netCashFromFinancing;

    return {
      round: state.currentRound,
      operatingActivities: operating,
      investingActivities: investing,
      financingActivities: financing,
      netCashChange,
      beginningCash: previousBalance.assets.cash,
      endingCash: currentBalance.assets.cash,
      freeCashFlow: operating.netCashFromOperations + investing.capitalExpenditures,
    };
  }
}
```

### 1.3 Balance Sheet Engine

**File:** `src/engine/finance/statements/BalanceSheet.ts`

```typescript
export interface BalanceSheet {
  round: number;

  // Assets
  assets: {
    // Current Assets
    currentAssets: {
      cash: number;
      accountsReceivable: number;
      inventory: number;
      prepaidExpenses: number;
      total: number;
    };

    // Non-Current Assets
    nonCurrentAssets: {
      propertyPlantEquipment: {
        cost: number;
        accumulatedDepreciation: number;
        net: number;
      };
      intangibleAssets: {
        rdCapitalization: number;
        patents: number;
        goodwill: number;
        total: number;
      };
      total: number;
    };

    totalAssets: number;
  };

  // Liabilities
  liabilities: {
    // Current Liabilities
    currentLiabilities: {
      accountsPayable: number;
      shortTermDebt: number;
      accruedExpenses: number;
      currentPortionLongTermDebt: number;
      total: number;
    };

    // Non-Current Liabilities
    nonCurrentLiabilities: {
      longTermDebt: number;
      deferredTaxLiabilities: number;
      otherLongTermLiabilities: number;
      total: number;
    };

    totalLiabilities: number;
  };

  // Equity
  equity: {
    commonStock: number;
    additionalPaidInCapital: number;
    retainedEarnings: number;
    treasuryStock: number;
    totalEquity: number;
  };

  // Validation
  totalLiabilitiesAndEquity: number;
  balanced: boolean;  // Assets = Liabilities + Equity
}

export class BalanceSheetEngine {
  static generate(state: TeamState, round: number): BalanceSheet {
    // Assets
    const currentAssets = {
      cash: state.cash,
      accountsReceivable: this.calculateAR(state),
      inventory: state.materials?.totalInventoryValue || 0,
      prepaidExpenses: 0,
      total: 0,
    };
    currentAssets.total =
      currentAssets.cash +
      currentAssets.accountsReceivable +
      currentAssets.inventory +
      currentAssets.prepaidExpenses;

    const ppe = {
      cost: state.factories.length * 50_000_000,  // $50M per factory
      accumulatedDepreciation: state.accumulatedDepreciation || 0,
      net: 0,
    };
    ppe.net = ppe.cost - ppe.accumulatedDepreciation;

    const intangibles = {
      rdCapitalization: state.capitalizedRD || 0,
      patents: state.patents?.length * 1_000_000 || 0,
      goodwill: 0,
      total: 0,
    };
    intangibles.total = intangibles.rdCapitalization + intangibles.patents + intangibles.goodwill;

    const nonCurrentAssets = {
      propertyPlantEquipment: ppe,
      intangibleAssets: intangibles,
      total: ppe.net + intangibles.total,
    };

    const assets = {
      currentAssets,
      nonCurrentAssets,
      totalAssets: currentAssets.total + nonCurrentAssets.total,
    };

    // Liabilities
    const currentLiabilities = {
      accountsPayable: state.accountsPayable || 0,
      shortTermDebt: this.calculateShortTermDebt(state),
      accruedExpenses: 0,
      currentPortionLongTermDebt: this.calculateCurrentPortionLTD(state),
      total: 0,
    };
    currentLiabilities.total =
      currentLiabilities.accountsPayable +
      currentLiabilities.shortTermDebt +
      currentLiabilities.accruedExpenses +
      currentLiabilities.currentPortionLongTermDebt;

    const nonCurrentLiabilities = {
      longTermDebt: this.calculateLongTermDebt(state),
      deferredTaxLiabilities: 0,
      otherLongTermLiabilities: 0,
      total: 0,
    };
    nonCurrentLiabilities.total =
      nonCurrentLiabilities.longTermDebt +
      nonCurrentLiabilities.deferredTaxLiabilities +
      nonCurrentLiabilities.otherLongTermLiabilities;

    const liabilities = {
      currentLiabilities,
      nonCurrentLiabilities,
      totalLiabilities: currentLiabilities.total + nonCurrentLiabilities.total,
    };

    // Equity
    const equity = {
      commonStock: state.sharesIssued * state.parValue || 100_000_000,
      additionalPaidInCapital: state.additionalPaidInCapital || 0,
      retainedEarnings: state.retainedEarnings || 0,
      treasuryStock: -state.treasuryStockValue || 0,
      totalEquity: 0,
    };
    equity.totalEquity =
      equity.commonStock +
      equity.additionalPaidInCapital +
      equity.retainedEarnings +
      equity.treasuryStock;

    const totalLiabilitiesAndEquity = liabilities.totalLiabilities + equity.totalEquity;

    return {
      round,
      assets,
      liabilities,
      equity,
      totalLiabilitiesAndEquity,
      balanced: Math.abs(assets.totalAssets - totalLiabilitiesAndEquity) < 1,  // Allow rounding
    };
  }
}
```

---

## Phase 2: Capital Structure System

### 2.1 Debt Management

**File:** `src/engine/finance/capital/DebtManager.ts`

```typescript
export type DebtType = 'credit_line' | 'short_term_loan' | 'term_loan' | 'corporate_bond' | 'emergency_loan';

export interface DebtInstrument {
  id: string;
  type: DebtType;
  principal: number;
  remainingPrincipal: number;
  interestRate: number;  // Annual %
  termRounds: number;
  remainingRounds: number;
  issuedRound: number;
  maturityRound: number;

  // Payment schedule
  paymentSchedule: 'bullet' | 'amortizing' | 'interest_only';
  monthlyPayment: number;

  // Covenants
  covenants?: DebtCovenant[];
  covenantViolations: string[];

  // Status
  status: 'active' | 'paid_off' | 'defaulted';
}

export interface DebtCovenant {
  type: 'min_current_ratio' | 'max_debt_equity' | 'min_interest_coverage' | 'min_net_worth';
  threshold: number;
  penalty: 'rate_increase' | 'technical_default' | 'acceleration';
  penaltyAmount?: number;
}

export const DEBT_PRODUCTS: Record<DebtType, DebtProduct> = {
  credit_line: {
    name: 'Revolving Credit Line',
    maxAmount: 50_000_000,
    interestRate: 0.08,  // 8%
    termRounds: 12,
    setup: 100_000,
    covenants: [
      { type: 'min_current_ratio', threshold: 1.2, penalty: 'rate_increase', penaltyAmount: 0.02 },
    ],
  },
  short_term_loan: {
    name: 'Short-Term Loan',
    maxAmount: 100_000_000,
    interestRate: 0.06,  // 6%
    termRounds: 12,
    setup: 250_000,
    covenants: [],
  },
  term_loan: {
    name: 'Term Loan',
    maxAmount: 200_000_000,
    interestRate: 0.05,  // 5%
    termRounds: 60,  // 5 years
    setup: 500_000,
    covenants: [
      { type: 'max_debt_equity', threshold: 2.0, penalty: 'technical_default' },
      { type: 'min_interest_coverage', threshold: 2.0, penalty: 'acceleration' },
    ],
  },
  corporate_bond: {
    name: 'Corporate Bond',
    maxAmount: 500_000_000,
    interestRate: 0.045,  // 4.5%
    termRounds: 120,  // 10 years
    setup: 2_000_000,
    covenants: [
      { type: 'max_debt_equity', threshold: 1.5, penalty: 'rate_increase', penaltyAmount: 0.015 },
    ],
  },
  emergency_loan: {
    name: 'Emergency Loan',
    maxAmount: 25_000_000,
    interestRate: 0.18,  // 18% (predatory)
    termRounds: 6,
    setup: 0,
    covenants: [],
  },
};

export class DebtManager {
  static issueDebt(
    state: TeamState,
    type: DebtType,
    amount: number
  ): { success: boolean; debt?: DebtInstrument; message: string } {
    const product = DEBT_PRODUCTS[type];

    // Check amount
    if (amount > product.maxAmount) {
      return { success: false, message: `Maximum amount for ${product.name} is ${formatCurrency(product.maxAmount)}` };
    }

    // Check credit rating
    const creditRating = CreditRatingEngine.calculate(state);
    const adjustedRate = this.adjustRateForCreditRating(product.interestRate, creditRating);

    if (creditRating.rating === 'D') {
      return { success: false, message: 'Credit rating too low to issue debt' };
    }

    // Calculate payment
    const monthlyPayment = this.calculatePayment(amount, adjustedRate, product.termRounds);

    const debt: DebtInstrument = {
      id: `debt-${Date.now()}`,
      type,
      principal: amount,
      remainingPrincipal: amount,
      interestRate: adjustedRate,
      termRounds: product.termRounds,
      remainingRounds: product.termRounds,
      issuedRound: state.currentRound,
      maturityRound: state.currentRound + product.termRounds,
      paymentSchedule: type === 'corporate_bond' ? 'bullet' : 'amortizing',
      monthlyPayment,
      covenants: product.covenants,
      covenantViolations: [],
      status: 'active',
    };

    // Add to state
    state.cash += amount - product.setup;
    state.capitalStructure = state.capitalStructure || { debtInstruments: [], equityPosition: null, creditRating: null, dividendHistory: [] };
    state.capitalStructure.debtInstruments.push(debt);

    return { success: true, debt, message: `${product.name} issued successfully` };
  }

  static serviceDebt(state: TeamState, round: number): DebtServiceResult {
    const debts = state.capitalStructure?.debtInstruments || [];
    let totalInterest = 0;
    let totalPrincipal = 0;
    const messages: string[] = [];

    for (const debt of debts) {
      if (debt.status !== 'active') continue;

      // Calculate this round's payment
      const { interest, principal } = this.calculateRoundPayment(debt);

      // Check covenants
      const violations = this.checkCovenants(debt, state);
      if (violations.length > 0) {
        debt.covenantViolations = violations;
        messages.push(`Covenant violation on ${debt.type}: ${violations.join(', ')}`);

        // Apply penalties
        for (const violation of violations) {
          const covenant = debt.covenants?.find(c => c.type === violation);
          if (covenant?.penalty === 'rate_increase') {
            debt.interestRate += covenant.penaltyAmount!;
          } else if (covenant?.penalty === 'acceleration') {
            // Demand immediate repayment
            debt.remainingRounds = 1;
          }
        }
      }

      // Make payment
      if (state.cash < interest + principal) {
        // Can't make payment - default
        debt.status = 'defaulted';
        messages.push(`⚠️ DEFAULTED on ${debt.type} - insufficient cash`);
        // Penalties applied in bankruptcy system
      } else {
        state.cash -= (interest + principal);
        debt.remainingPrincipal -= principal;
        debt.remainingRounds -= 1;

        totalInterest += interest;
        totalPrincipal += principal;

        if (debt.remainingPrincipal <= 0) {
          debt.status = 'paid_off';
          messages.push(`✓ Paid off ${debt.type}`);
        }
      }
    }

    return { totalInterest, totalPrincipal, messages };
  }
}
```

### 2.2 Credit Rating System

**File:** `src/engine/finance/capital/CreditRating.ts`

```typescript
export type CreditRating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'D';

export interface CreditRatingResult {
  rating: CreditRating;
  score: number;  // 0-100
  factors: {
    debtToEquity: { score: number; weight: number; value: number };
    interestCoverage: { score: number; weight: number; value: number };
    currentRatio: { score: number; weight: number; value: number };
    profitability: { score: number; weight: number; value: number };
    cashFlowStability: { score: number; weight: number; value: number };
  };
  spreadBps: number;  // Basis points above risk-free rate
  outlook: 'positive' | 'stable' | 'negative';
  warnings: string[];
}

export class CreditRatingEngine {
  static calculate(state: TeamState): CreditRatingResult {
    const ratios = FinancialRatios.calculateAll(state);

    // Factor scores (0-100)
    const factors = {
      debtToEquity: {
        score: this.scoreDebtToEquity(ratios.leverage.debtToEquity),
        weight: 0.30,
        value: ratios.leverage.debtToEquity,
      },
      interestCoverage: {
        score: this.scoreInterestCoverage(ratios.leverage.interestCoverage),
        weight: 0.25,
        value: ratios.leverage.interestCoverage,
      },
      currentRatio: {
        score: this.scoreCurrentRatio(ratios.liquidity.currentRatio),
        weight: 0.20,
        value: ratios.liquidity.currentRatio,
      },
      profitability: {
        score: this.scoreProfitability(ratios.profitability.roe),
        weight: 0.15,
        value: ratios.profitability.roe,
      },
      cashFlowStability: {
        score: this.scoreCashFlowStability(state),
        weight: 0.10,
        value: 0,  // Calculated internally
      },
    };

    // Weighted score
    const score =
      factors.debtToEquity.score * factors.debtToEquity.weight +
      factors.interestCoverage.score * factors.interestCoverage.weight +
      factors.currentRatio.score * factors.currentRatio.weight +
      factors.profitability.score * factors.profitability.weight +
      factors.cashFlowStability.score * factors.cashFlowStability.weight;

    // Convert to rating
    const rating = this.scoreToRating(score);
    const spreadBps = this.ratingToSpread(rating);

    // Determine outlook
    const previousScore = state.previousCreditScore || score;
    const outlook = score > previousScore + 5 ? 'positive' :
                    score < previousScore - 5 ? 'negative' : 'stable';

    // Warnings
    const warnings: string[] = [];
    if (factors.debtToEquity.value > 2.0) warnings.push('High leverage ratio');
    if (factors.interestCoverage.value < 2.0) warnings.push('Low interest coverage');
    if (factors.currentRatio.value < 1.0) warnings.push('Liquidity concerns');

    return { rating, score, factors, spreadBps, outlook, warnings };
  }

  private static scoreToRating(score: number): CreditRating {
    if (score >= 95) return 'AAA';
    if (score >= 90) return 'AA';
    if (score >= 80) return 'A';
    if (score >= 70) return 'BBB';
    if (score >= 60) return 'BB';
    if (score >= 50) return 'B';
    if (score >= 30) return 'CCC';
    return 'D';
  }

  private static ratingToSpread(rating: CreditRating): number {
    const spreads: Record<CreditRating, number> = {
      'AAA': 50,    // 0.5%
      'AA': 75,     // 0.75%
      'A': 100,     // 1.0%
      'BBB': 200,   // 2.0%
      'BB': 400,    // 4.0%
      'B': 800,     // 8.0%
      'CCC': 1500,  // 15.0%
      'D': 10000,   // Unf inanceable
    };
    return spreads[rating];
  }
}
```

---

## Phase 3: Financial Ratios & Health Metrics

**File:** `src/engine/finance/ratios/FinancialRatios.ts`

```typescript
export interface FinancialRatios {
  profitability: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    roa: number;  // Return on Assets
    roe: number;  // Return on Equity
    roic: number; // Return on Invested Capital
  };

  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    workingCapital: number;
  };

  efficiency: {
    assetTurnover: number;
    inventoryTurnover: number;
    receivablesTurnover: number;
    payablesTurnover: number;
    cashConversionCycle: number;  // Days
  };

  leverage: {
    debtToEquity: number;
    debtToAssets: number;
    equityMultiplier: number;
    interestCoverage: number;
    debtServiceCoverage: number;
  };

  valuation: {
    priceToEarnings: number;
    priceToBook: number;
    evToEbitda: number;
    earningsYield: number;
  };

  // Health indicators
  health: {
    overall: HealthLevel;
    categories: Record<string, HealthLevel>;
    warnings: Warning[];
    strengths: string[];
  };
}

export type HealthLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export class FinancialRatios {
  static calculateAll(state: TeamState): FinancialRatios {
    const statements = state.financialStatements!;
    const income = statements.incomeStatement;
    const balance = statements.balanceSheet;
    const cashFlow = statements.cashFlowStatement;

    return {
      profitability: this.calculateProfitability(income, balance),
      liquidity: this.calculateLiquidity(balance),
      efficiency: this.calculateEfficiency(income, balance),
      leverage: this.calculateLeverage(income, balance, cashFlow),
      valuation: this.calculateValuation(state, income),
      health: this.assessHealth(/* all ratios */),
    };
  }

  private static assessHealth(ratios: Partial<FinancialRatios>): HealthAssessment {
    const warnings: Warning[] = [];
    const strengths: string[] = [];

    // Check each category
    const profitabilityHealth = this.assessProfitability(ratios.profitability!);
    const liquidityHealth = this.assessLiquidity(ratios.liquidity!);
    const leverageHealth = this.assessLeverage(ratios.leverage!);

    // Overall health (worst of categories)
    const healthLevels = [profitabilityHealth, liquidityHealth, leverageHealth];
    const overall = healthLevels.reduce((worst, current) =>
      this.healthPriority(current) > this.healthPriority(worst) ? current : worst
    );

    return {
      overall,
      categories: {
        profitability: profitabilityHealth,
        liquidity: liquidityHealth,
        efficiency: 'good',  // Calculated
        leverage: leverageHealth,
      },
      warnings,
      strengths,
    };
  }
}
```

---

## Phase 4: Board & Investor Relations

**File:** `src/engine/finance/governance/BoardInteractions.ts`

```typescript
export interface BoardProposal {
  id: string;
  type: 'dividend' | 'capex' | 'acquisition' | 'debt_issuance' | 'equity_issuance' | 'strategy_change';
  title: string;
  description: string;
  amount?: number;
  requiredApproval: number;  // % of board votes

  // Approval factors
  baseApprovalChance: number;
  modifiers: ApprovalModifier[];

  // If approved
  onApproval: BoardAction;

  // If rejected
  onRejection: BoardAction;
}

export interface BoardMember {
  id: string;
  name: string;
  role: 'chairman' | 'member' | 'independent';
  votingPower: number;
  bias: {
    conservative: number;  // -1 to 1
    growthOriented: number;
    riskTolerance: number;
  };
  satisfaction: number;  // 0-100
}

export class BoardManager {
  static proposeAction(state: TeamState, proposal: BoardProposal): VoteResult {
    const board = state.governance!.boardMembers;

    // Calculate approval probability
    let approvalChance = proposal.baseApprovalChance;

    for (const modifier of proposal.modifiers) {
      approvalChance += this.evaluateModifier(modifier, state);
    }

    // Vote
    let votesFor = 0;
    let votesAgainst = 0;
    const votes: BoardVote[] = [];

    for (const member of board) {
      const memberApprovalChance = this.adjustForMemberBias(
        approvalChance,
        member,
        proposal.type
      );

      const vote = Math.random() < memberApprovalChance;
      if (vote) {
        votesFor += member.votingPower;
      } else {
        votesAgainst += member.votingPower;
      }

      votes.push({
        member: member.name,
        vote: vote ? 'for' : 'against',
        reason: this.generateReason(member, proposal, vote),
      });
    }

    const approved = votesFor / (votesFor + votesAgainst) >= proposal.requiredApproval;

    // Execute action
    if (approved) {
      proposal.onApproval(state);
    } else {
      proposal.onRejection(state);
    }

    return {
      approved,
      votesFor,
      votesAgainst,
      votes,
      message: approved ?
        `Board approved ${proposal.title}` :
        `Board rejected ${proposal.title}`,
    };
  }
}
```

---

## Implementation Roadmap

### Sprint 1: Core Statements (Week 1-2)
1. Income Statement Engine
2. Cash Flow Statement Engine
3. Balance Sheet Engine
4. Statement Integration
5. UI Components for statement viewing

### Sprint 2: Capital Structure (Week 3-4)
6. Debt Instrument System
7. Credit Rating Engine
8. Equity Management
9. Dividend Policy
10. UI for financing decisions

### Sprint 3: Ratios & Health (Week 5)
11. Financial Ratios Calculator
12. Health Assessment System
13. Dashboard Components
14. Trend Visualization

### Sprint 4: Governance (Week 6-7)
15. Board Interaction System
16. Investor Sentiment Engine
17. Share Price Simulation
18. Proposal UI

### Sprint 5: Planning & Risk (Week 8-9)
19. Budget Manager
20. CapEx Planner
21. Shock Events System
22. Bankruptcy Mechanics

### Sprint 6: Advanced Features (Week 10-11)
23. Working Capital Management
24. Tax System
25. Valuation Engine
26. Forecasting Tool

### Sprint 7: Polish & Integration (Week 12)
27. Financial Dashboard UX
28. Tutorial System
29. Balance Testing
30. Documentation

---

## Success Criteria

### Core Statements
- [ ] All three statements generate correctly
- [ ] Statements balance (Assets = Liabilities + Equity)
- [ ] Cash flow ties to balance sheet cash
- [ ] Net income flows to retained earnings

### Capital Structure
- [ ] Teams can issue 5 types of debt
- [ ] Credit rating updates each round
- [ ] Covenant violations trigger penalties
- [ ] Equity issuance causes dilution

### Ratios & Health
- [ ] 20+ ratios calculate correctly
- [ ] Health indicators update in real-time
- [ ] Color-coded warnings appear
- [ ] Peer comparison works

### Governance
- [ ] Board proposals work
- [ ] Investor sentiment impacts share price
- [ ] Board can reject bad decisions
- [ ] CEO replacement possible

### Integration
- [ ] All systems integrate with SimulationEngine
- [ ] No performance degradation
- [ ] UI is intuitive
- [ ] Mobile-responsive

### Educational Value
- [ ] Students understand profit ≠ cash
- [ ] Students make capital structure decisions
- [ ] Students interpret financial statements
- [ ] Students respond to financial distress

---

## Risk Mitigation

**Complexity Risk:** Start with core statements, add complexity incrementally
**Performance Risk:** Optimize calculations, cache ratios
**Balance Risk:** Extensive testing, validation checks
**Learning Curve Risk:** Tutorials, tooltips, explainers

This is a comprehensive 12-week plan to transform Finance into a world-class financial simulation module.
