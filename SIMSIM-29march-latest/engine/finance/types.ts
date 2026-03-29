/**
 * Finance System Types
 * Complete type definitions for the finance expansion
 */

import type { Segment } from "../types";
import type { Region } from "../materials/types";

// ============================================================================
// Financial Statements
// ============================================================================

export interface IncomeStatement {
  round: number;

  // Revenue
  revenue: {
    total: number;
    bySegment: Record<Segment, number>;
    byRegion?: Record<Region, number>;
  };

  // Cost of Goods Sold
  cogs: {
    total: number;
    rawMaterials: number;
    directLabor: number;
    manufacturing: number;
    shipping: number;
    other: number;
  };

  grossProfit: number;
  grossMargin: number; // %

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
  operatingMargin: number; // %

  // Non-Operating Items
  interestExpense: number;
  interestIncome: number;
  otherIncome: number;
  otherExpenses: number;

  // Pre-tax and Taxes
  incomeBeforeTax: number;
  taxExpense: number;
  effectiveTaxRate: number; // %

  // Net Income
  netIncome: number;
  netMargin: number; // %

  // Per Share (if applicable)
  eps?: number; // Earnings per share
}

export interface CashFlowStatement {
  round: number;

  // Operating Activities
  operatingActivities: {
    netIncome: number;

    // Non-cash adjustments
    depreciation: number;
    amortization: number;

    // Working capital changes
    changeInAR: number; // Accounts Receivable
    changeInInventory: number;
    changeInAP: number; // Accounts Payable
    changeInAccruedExpenses: number;

    netCashFromOperations: number;
  };

  // Investing Activities
  investingActivities: {
    capitalExpenditures: number; // Negative
    rdCapitalization: number; // Negative
    assetSales: number; // Positive
    netCashFromInvesting: number;
  };

  // Financing Activities
  financingActivities: {
    debtProceeds: number; // Positive
    debtRepayments: number; // Negative
    equityProceeds: number; // Positive
    dividendsPaid: number; // Negative
    shareRepurchases: number; // Negative
    netCashFromFinancing: number;
  };

  // Summary
  netCashChange: number;
  beginningCash: number;
  endingCash: number;

  // Free Cash Flow (key metric)
  freeCashFlow: number; // Operating - CapEx
}

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
  balanced: boolean; // Assets = Liabilities + Equity
}

export interface StatementSnapshot {
  round: number;
  incomeStatement: IncomeStatement;
  cashFlowStatement: CashFlowStatement;
  balanceSheet: BalanceSheet;
  timestamp: number;
}

export interface FinancialStatements {
  incomeStatement: IncomeStatement;
  cashFlowStatement: CashFlowStatement;
  balanceSheet: BalanceSheet;
  statementHistory: StatementSnapshot[];
}

// ============================================================================
// Capital Structure
// ============================================================================

export type DebtType =
  | "credit_line"
  | "short_term_loan"
  | "term_loan"
  | "corporate_bond"
  | "emergency_loan";

export type PaymentSchedule = "bullet" | "amortizing" | "interest_only";

export interface DebtInstrument {
  id: string;
  type: DebtType;
  principal: number;
  remainingPrincipal: number;
  interestRate: number; // Annual %
  termRounds: number;
  remainingRounds: number;
  issuedRound: number;
  maturityRound: number;

  // Payment schedule
  paymentSchedule: PaymentSchedule;
  monthlyPayment: number;

  // Covenants
  covenants?: DebtCovenant[];
  covenantViolations: string[];

  // Status
  status: "active" | "paid_off" | "defaulted";
}

export type CovenantType =
  | "min_current_ratio"
  | "max_debt_equity"
  | "min_interest_coverage"
  | "min_net_worth";

export type CovenantPenalty = "rate_increase" | "technical_default" | "acceleration";

export interface DebtCovenant {
  type: CovenantType;
  threshold: number;
  penalty: CovenantPenalty;
  penaltyAmount?: number;
}

export interface DebtProduct {
  name: string;
  maxAmount: number;
  interestRate: number;
  termRounds: number;
  setupFee: number;
  covenants: DebtCovenant[];
}

export interface EquityPosition {
  sharesIssued: number;
  sharesOutstanding: number;
  parValue: number;
  sharePrice: number;
  marketCap: number;
  dilution: number; // % ownership given up
}

export interface DividendPayment {
  round: number;
  amountPerShare: number;
  totalAmount: number;
  payoutRatio: number; // % of earnings
}

export interface CapitalStructure {
  debtInstruments: DebtInstrument[];
  equityPosition: EquityPosition | null;
  creditRating: CreditRatingResult | null;
  dividendHistory: DividendPayment[];
}

// ============================================================================
// Credit Rating
// ============================================================================

export type CreditRating = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D";

export type CreditOutlook = "positive" | "stable" | "negative";

export interface CreditRatingResult {
  rating: CreditRating;
  score: number; // 0-100
  factors: {
    debtToEquity: { score: number; weight: number; value: number };
    interestCoverage: { score: number; weight: number; value: number };
    currentRatio: { score: number; weight: number; value: number };
    profitability: { score: number; weight: number; value: number };
    cashFlowStability: { score: number; weight: number; value: number };
  };
  spreadBps: number; // Basis points above risk-free rate
  outlook: CreditOutlook;
  warnings: string[];
}

// ============================================================================
// Financial Ratios
// ============================================================================

export type HealthLevel = "excellent" | "good" | "fair" | "poor" | "critical";

export interface FinancialRatios {
  profitability: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    roa: number; // Return on Assets
    roe: number; // Return on Equity
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
    cashConversionCycle: number; // Days
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

export interface Warning {
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  message: string;
  recommendation?: string;
}

// ============================================================================
// Governance
// ============================================================================

export type BoardRole = "chairman" | "member" | "independent";

export interface BoardMember {
  id: string;
  name: string;
  role: BoardRole;
  votingPower: number;
  bias: {
    conservative: number; // -1 to 1
    growthOriented: number;
    riskTolerance: number;
  };
  satisfaction: number; // 0-100
}

export type ProposalType =
  | "dividend"
  | "capex"
  | "acquisition"
  | "debt_issuance"
  | "equity_issuance"
  | "strategy_change";

export interface BoardProposal {
  id: string;
  type: ProposalType;
  title: string;
  description: string;
  amount?: number;
  requiredApproval: number; // % of board votes

  // Approval factors
  baseApprovalChance: number;
  modifiers: ApprovalModifier[];

  // If approved
  onApproval: (state: any) => void;

  // If rejected
  onRejection: (state: any) => void;
}

export interface ApprovalModifier {
  type: string;
  condition: (state: any) => boolean;
  impact: number; // +/- to approval chance
}

export interface BoardVote {
  member: string;
  vote: "for" | "against";
  reason: string;
}

export interface VoteResult {
  approved: boolean;
  votesFor: number;
  votesAgainst: number;
  votes: BoardVote[];
  message: string;
}

export interface Governance {
  boardMembers: BoardMember[];
  investorSentiment: number; // 0-100
  sharePrice: number;
  shareholderExpectations: Expectations;
}

export interface Expectations {
  targetROE: number;
  targetGrowth: number;
  maxAcceptableDebt: number;
  minDividend: number;
}

// ============================================================================
// Budget & Planning
// ============================================================================

export interface BudgetAllocation {
  round: number;
  marketing: number;
  rd: number;
  capex: number;
  hiring: number;
  sustainability: number;
  maintenance: number;
  total: number;
}

export interface VarianceAnalysis {
  planned: BudgetAllocation;
  actual: BudgetAllocation;
  variances: Record<string, { amount: number; percentage: number }>;
}

export interface Forecast {
  round: number;
  scenario: "pessimistic" | "base" | "optimistic";
  revenue: number;
  expenses: number;
  netIncome: number;
  cashFlow: number;
}

export interface Budget {
  currentBudget: BudgetAllocation;
  budgetVariance: VarianceAnalysis | null;
  forecastedPerformance: Forecast[];
}

// ============================================================================
// Working Capital
// ============================================================================

export interface ARDetail {
  customerId: string;
  amount: number;
  dueDate: number; // Round number
  overdue: boolean;
}

export interface APDetail {
  supplierId: string;
  amount: number;
  dueDate: number;
  earlyPaymentDiscount?: number;
}

export interface InventoryValuation {
  rawMaterials: number;
  workInProgress: number;
  finishedGoods: number;
  total: number;
  turnoverRate: number;
}

export interface WorkingCapital {
  accountsReceivable: ARDetail[];
  accountsPayable: APDetail[];
  inventoryHolding: InventoryValuation;
  cashConversionCycle: number; // Days
  netWorkingCapital: number;
}

// ============================================================================
// Risk & Events
// ============================================================================

export type ShockType =
  | "interest_rate_hike"
  | "currency_fluctuation"
  | "tax_change"
  | "market_crash"
  | "credit_downgrade"
  | "regulatory_change";

export interface FinancialShock {
  id: string;
  type: ShockType;
  severity: number; // 0-1
  duration: number; // Rounds
  impact: ShockImpact;
  description: string;
}

export interface ShockImpact {
  cashFlow?: number; // % change
  debtCost?: number; // % change in interest rates
  revenue?: number; // % change
  valuation?: number; // % change
}

export type DistressLevel = "healthy" | "watch" | "stressed" | "distressed" | "critical";

export interface FinancialRisk {
  activeShocks: FinancialShock[];
  riskScore: number; // 0-100
  distressLevel: DistressLevel;
  bankruptcyWarnings: Warning[];
  altmanZScore?: number; // Bankruptcy prediction
}

// ============================================================================
// Tax
// ============================================================================

export interface TaxCalculation {
  taxableIncome: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRate: number;
  deductions: TaxDeduction[];
  credits: TaxCredit[];
}

export interface TaxDeduction {
  type: string;
  amount: number;
  description: string;
}

export interface TaxCredit {
  type: string;
  amount: number;
  description: string;
}

// ============================================================================
// Valuation
// ============================================================================

export interface CompanyValuation {
  equityValue: number;
  enterpriseValue: number;
  methods: {
    dcf: number;
    multiples: number;
    assetBased: number;
  };
  fairValuePerShare: number;
}

// ============================================================================
// Debt Service Results
// ============================================================================

export interface DebtServiceResult {
  totalInterest: number;
  totalPrincipal: number;
  messages: string[];
}
