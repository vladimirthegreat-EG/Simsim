/**
 * Finance Module Expansions
 *
 * Additional finance systems for debt management, credit rating,
 * investor sentiment, and cash constraints.
 *
 * Phase 10: Finance Module Expansions
 */

import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig, CreditRating } from "../config/schema";

// ============================================
// TYPES
// ============================================

export type DebtInstrumentType = "treasury_bill" | "corporate_bond" | "bank_loan" | "credit_line";
export type CovenantType = "min_current_ratio" | "max_debt_equity" | "min_coverage";
export type CovenantPenalty = "rate_increase" | "acceleration" | "restriction";

export interface DebtInstrument {
  id: string;
  type: DebtInstrumentType;
  principal: number;
  interestRate: number;
  termRounds: number;
  remainingRounds: number;
  covenants: DebtCovenant[];
  drawdownAvailable?: number; // For credit lines
  issuedRound: number;
}

export interface DebtCovenant {
  type: CovenantType;
  threshold: number;
  penalty: CovenantPenalty;
  currentValue?: number;
  inCompliance?: boolean;
}

export interface DebtState {
  instruments: DebtInstrument[];
  totalDebt: number;
  totalInterestExpense: number;
  weightedAverageRate: number;
  debtToEquity: number;
  interestCoverage: number;
  covenantBreaches: CovenantBreach[];
}

export interface CovenantBreach {
  instrumentId: string;
  covenantType: CovenantType;
  requiredValue: number;
  actualValue: number;
  penalty: CovenantPenalty;
  penaltyApplied: string;
}

export interface CreditRatingState {
  rating: CreditRating;
  previousRating: CreditRating;
  factors: CreditRatingFactors;
  outlook: "positive" | "stable" | "negative";
  watchList: boolean;
  interestSpread: number;
}

export interface CreditRatingFactors {
  debtToEquity: number;
  interestCoverage: number;
  currentRatio: number;
  profitability: number;
  cashFlowStability: number;
  score: number;
}

export interface InvestorSentiment {
  overall: number; // 0-100
  factors: {
    growthExpectation: number;
    profitabilityTrend: number;
    volatilityPenalty: number;
    managementTrust: number;
    industryOutlook: number;
    esgScore: number;
  };
  priceMultiplier: number;
  accessToCapital: "restricted" | "normal" | "favorable";
}

export interface CashConstraints {
  availableCash: number;
  availableCredit: number;
  totalLiquidity: number;
  minimumCashRequired: number;
  cashRunwayRounds: number;
  liquidityCrisis: boolean;
}

export interface FinanceExpansionResult {
  debt: DebtState;
  creditRating: CreditRatingState;
  investorSentiment: InvestorSentiment;
  cashConstraints: CashConstraints;
  interestExpense: number;
  debtRepayments: number;
  newDebtIssued: number;
  messages: string[];
  warnings: string[];
}

export interface FinanceExpansionDecisions {
  newDebt: { type: DebtInstrumentType; amount: number; termRounds: number }[];
  debtRepayments: { instrumentId: string; amount: number }[];
  creditLineDrawdown: number;
  dividendAmount: number;
  stockBuybackAmount: number;
}

// ============================================
// CONSTANTS
// ============================================

const BASE_INTEREST_RATES: Record<DebtInstrumentType, number> = {
  treasury_bill: 0.02, // 2%
  corporate_bond: 0.05, // 5%
  bank_loan: 0.06, // 6%
  credit_line: 0.08, // 8%
};

const CREDIT_SPREADS: Record<CreditRating, number> = {
  AAA: 0.000,
  AA: 0.005,
  A: 0.010,
  BBB: 0.020,
  BB: 0.040,
  B: 0.080,
  CCC: 0.150,
  D: Infinity,
};

const SENTIMENT_EFFECTS = {
  highSentiment: { threshold: 70, equityPremium: 0.1, bondSpreadReduction: 0.01 },
  lowSentiment: { threshold: 30, equityDiscount: 0.2, bondSpreadIncrease: 0.02 },
};

// ============================================
// ENGINE
// ============================================

export class FinanceExpansions {
  /**
   * Process finance expansions for a round
   */
  static processFinanceExpansions(
    state: TeamState,
    decisions: FinanceExpansionDecisions,
    previousDebt: DebtState | null,
    previousRating: CreditRatingState | null,
    previousSentiment: InvestorSentiment | null,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): FinanceExpansionResult {
    const messages: string[] = [];
    const warnings: string[] = [];

    // Check if credit ratings are enabled
    if (!config.difficulty.complexity.creditRatings) {
      return this.getSimplifiedResult(state, decisions, round, ctx);
    }

    // Process debt
    const { debt, interestExpense, debtRepayments, newDebtIssued } = this.processDebt(
      state,
      decisions,
      previousDebt,
      round,
      ctx
    );

    // Calculate credit rating
    const creditRating = this.calculateCreditRating(
      state,
      debt,
      previousRating
    );

    // Calculate investor sentiment
    const investorSentiment = this.calculateInvestorSentiment(
      state,
      creditRating,
      previousSentiment
    );

    // Calculate cash constraints
    const cashConstraints = this.calculateCashConstraints(
      state,
      debt,
      creditRating
    );

    // Generate messages
    if (creditRating.rating !== creditRating.previousRating) {
      if (this.ratingValue(creditRating.rating) > this.ratingValue(creditRating.previousRating)) {
        messages.push(`Credit rating upgraded to ${creditRating.rating}`);
      } else {
        warnings.push(`Credit rating downgraded to ${creditRating.rating}`);
      }
    }

    if (creditRating.watchList) {
      warnings.push(`Credit rating on watch for potential downgrade`);
    }

    if (debt.covenantBreaches.length > 0) {
      for (const breach of debt.covenantBreaches) {
        warnings.push(`Covenant breach: ${breach.covenantType} - ${breach.penaltyApplied}`);
      }
    }

    if (cashConstraints.liquidityCrisis) {
      warnings.push(`Liquidity crisis: Cash runway only ${cashConstraints.cashRunwayRounds} rounds`);
    }

    if (investorSentiment.accessToCapital === "restricted") {
      warnings.push(`Limited access to capital markets due to low investor sentiment`);
    }

    if (interestExpense > state.netIncome * 0.3) {
      warnings.push(`Interest expense exceeds 30% of net income`);
    }

    return {
      debt,
      creditRating,
      investorSentiment,
      cashConstraints,
      interestExpense,
      debtRepayments,
      newDebtIssued,
      messages,
      warnings,
    };
  }

  /**
   * Get simplified result when credit ratings disabled
   */
  private static getSimplifiedResult(
    state: TeamState,
    decisions: FinanceExpansionDecisions,
    round: number,
    ctx: EngineContext
  ): FinanceExpansionResult {
    return {
      debt: this.initializeDebtState(),
      creditRating: this.initializeCreditRating(),
      investorSentiment: this.initializeInvestorSentiment(),
      cashConstraints: {
        availableCash: state.cash,
        availableCredit: 100_000_000,
        totalLiquidity: state.cash + 100_000_000,
        minimumCashRequired: 10_000_000,
        cashRunwayRounds: 10,
        liquidityCrisis: false,
      },
      interestExpense: 0,
      debtRepayments: 0,
      newDebtIssued: 0,
      messages: [],
      warnings: [],
    };
  }

  /**
   * Process debt state
   */
  private static processDebt(
    state: TeamState,
    decisions: FinanceExpansionDecisions,
    previous: DebtState | null,
    round: number,
    ctx: EngineContext
  ): {
    debt: DebtState;
    interestExpense: number;
    debtRepayments: number;
    newDebtIssued: number;
  } {
    const instruments: DebtInstrument[] = previous
      ? [...previous.instruments]
      : [];

    let interestExpense = 0;
    let debtRepayments = 0;
    let newDebtIssued = 0;

    // Process existing instruments
    for (const instrument of instruments) {
      instrument.remainingRounds--;

      // Calculate interest
      const interest = instrument.principal * instrument.interestRate / 4; // Quarterly
      interestExpense += interest;

      // Check for maturity
      if (instrument.remainingRounds <= 0) {
        debtRepayments += instrument.principal;
      }
    }

    // Remove matured instruments
    const activeInstruments = instruments.filter((i) => i.remainingRounds > 0);

    // Process repayments
    for (const { instrumentId, amount } of decisions.debtRepayments) {
      const instrument = activeInstruments.find((i) => i.id === instrumentId);
      if (instrument) {
        const repayAmount = Math.min(amount, instrument.principal);
        instrument.principal -= repayAmount;
        debtRepayments += repayAmount;
      }
    }

    // Remove fully repaid instruments
    const remainingInstruments = activeInstruments.filter((i) => i.principal > 0);

    // Issue new debt
    let debtCounter = 0;
    for (const { type, amount, termRounds } of decisions.newDebt) {
      debtCounter++;
      const newInstrument: DebtInstrument = {
        id: `debt-${type}-${round}-${debtCounter}`,
        type,
        principal: amount,
        interestRate: BASE_INTEREST_RATES[type],
        termRounds,
        remainingRounds: termRounds,
        covenants: this.getDefaultCovenants(type),
        issuedRound: round,
      };

      if (type === "credit_line") {
        newInstrument.drawdownAvailable = amount;
      }

      remainingInstruments.push(newInstrument);
      newDebtIssued += amount;
    }

    // Calculate totals
    const totalDebt = remainingInstruments.reduce((sum, i) => sum + i.principal, 0);
    const weightedAverageRate = totalDebt > 0
      ? remainingInstruments.reduce((sum, i) => sum + i.principal * i.interestRate, 0) / totalDebt
      : 0;

    const equity = state.totalAssets - totalDebt;
    const debtToEquity = equity > 0 ? totalDebt / equity : Infinity;
    const interestCoverage = interestExpense > 0 ? (state.netIncome + interestExpense) / interestExpense : Infinity;

    // Check covenants
    const covenantBreaches: CovenantBreach[] = [];
    for (const instrument of remainingInstruments) {
      for (const covenant of instrument.covenants) {
        const { inCompliance, actualValue } = this.checkCovenant(
          covenant,
          state,
          totalDebt,
          equity
        );
        covenant.currentValue = actualValue;
        covenant.inCompliance = inCompliance;

        if (!inCompliance) {
          covenantBreaches.push({
            instrumentId: instrument.id,
            covenantType: covenant.type,
            requiredValue: covenant.threshold,
            actualValue,
            penalty: covenant.penalty,
            penaltyApplied: this.applyCovenantPenalty(covenant.penalty, instrument),
          });
        }
      }
    }

    return {
      debt: {
        instruments: remainingInstruments,
        totalDebt,
        totalInterestExpense: interestExpense,
        weightedAverageRate,
        debtToEquity,
        interestCoverage,
        covenantBreaches,
      },
      interestExpense,
      debtRepayments,
      newDebtIssued,
    };
  }

  /**
   * Get default covenants for debt type
   */
  private static getDefaultCovenants(type: DebtInstrumentType): DebtCovenant[] {
    switch (type) {
      case "bank_loan":
        return [
          { type: "min_current_ratio", threshold: 1.5, penalty: "rate_increase" },
          { type: "max_debt_equity", threshold: 1.0, penalty: "restriction" },
        ];
      case "corporate_bond":
        return [
          { type: "min_coverage", threshold: 2.0, penalty: "acceleration" },
          { type: "max_debt_equity", threshold: 0.8, penalty: "rate_increase" },
        ];
      default:
        return [];
    }
  }

  /**
   * Check covenant compliance
   */
  private static checkCovenant(
    covenant: DebtCovenant,
    state: TeamState,
    totalDebt: number,
    equity: number
  ): { inCompliance: boolean; actualValue: number } {
    let actualValue: number;

    switch (covenant.type) {
      case "min_current_ratio":
        actualValue = state.totalAssets / totalDebt || Infinity;
        return { inCompliance: actualValue >= covenant.threshold, actualValue };

      case "max_debt_equity":
        actualValue = equity > 0 ? totalDebt / equity : Infinity;
        return { inCompliance: actualValue <= covenant.threshold, actualValue };

      case "min_coverage":
        const interestExpense = totalDebt * 0.05; // Estimate
        actualValue = interestExpense > 0 ? (state.netIncome + interestExpense) / interestExpense : Infinity;
        return { inCompliance: actualValue >= covenant.threshold, actualValue };

      default:
        return { inCompliance: true, actualValue: 0 };
    }
  }

  /**
   * Apply covenant penalty
   */
  private static applyCovenantPenalty(penalty: CovenantPenalty, instrument: DebtInstrument): string {
    switch (penalty) {
      case "rate_increase":
        instrument.interestRate *= 1.25; // 25% rate increase
        return `Interest rate increased to ${(instrument.interestRate * 100).toFixed(1)}%`;

      case "acceleration":
        instrument.remainingRounds = Math.min(instrument.remainingRounds, 2);
        return `Debt accelerated - due in ${instrument.remainingRounds} rounds`;

      case "restriction":
        return `New borrowing restricted`;

      default:
        return `Penalty applied`;
    }
  }

  /**
   * Calculate credit rating
   */
  private static calculateCreditRating(
    state: TeamState,
    debt: DebtState,
    previous: CreditRatingState | null
  ): CreditRatingState {
    // Calculate factors
    const factors: CreditRatingFactors = {
      debtToEquity: debt.debtToEquity,
      interestCoverage: debt.interestCoverage,
      currentRatio: debt.totalDebt > 0 ? state.totalAssets / debt.totalDebt : 10,
      profitability: state.revenue > 0 ? state.netIncome / state.revenue : 0,
      cashFlowStability: 0.7, // Placeholder
      score: 0,
    };

    // Calculate score
    let score = 100;

    // Debt-to-equity (40% weight)
    if (factors.debtToEquity > 1.5) score -= 40;
    else if (factors.debtToEquity > 1.0) score -= 25;
    else if (factors.debtToEquity > 0.6) score -= 15;
    else if (factors.debtToEquity > 0.3) score -= 5;

    // Interest coverage (30% weight)
    if (factors.interestCoverage < 1.5) score -= 30;
    else if (factors.interestCoverage < 3) score -= 20;
    else if (factors.interestCoverage < 5) score -= 10;

    // Current ratio (15% weight)
    if (factors.currentRatio < 1.0) score -= 15;
    else if (factors.currentRatio < 1.5) score -= 10;
    else if (factors.currentRatio < 2.0) score -= 5;

    // Profitability (15% weight)
    if (factors.profitability < 0) score -= 15;
    else if (factors.profitability < 0.05) score -= 10;
    else if (factors.profitability < 0.10) score -= 5;

    factors.score = score;

    // Determine rating
    let rating: CreditRating;
    if (score >= 90) rating = "AAA";
    else if (score >= 80) rating = "AA";
    else if (score >= 70) rating = "A";
    else if (score >= 60) rating = "BBB";
    else if (score >= 50) rating = "BB";
    else if (score >= 40) rating = "B";
    else if (score >= 20) rating = "CCC";
    else rating = "D";

    // Determine outlook
    const previousScore = previous?.factors.score ?? score;
    let outlook: "positive" | "stable" | "negative";
    if (score > previousScore + 5) outlook = "positive";
    else if (score < previousScore - 5) outlook = "negative";
    else outlook = "stable";

    // Watch list
    const watchList = outlook === "negative" || debt.covenantBreaches.length > 0;

    return {
      rating,
      previousRating: previous?.rating ?? rating,
      factors,
      outlook,
      watchList,
      interestSpread: CREDIT_SPREADS[rating],
    };
  }

  /**
   * Calculate investor sentiment
   */
  private static calculateInvestorSentiment(
    state: TeamState,
    creditRating: CreditRatingState,
    previous: InvestorSentiment | null
  ): InvestorSentiment {
    // Calculate factors
    const revenueGrowth = previous ? 0.05 : 0; // Placeholder
    const industryAverage = 0.03;
    const growthExpectation = (revenueGrowth - industryAverage) * 100;

    const currentMargin = state.revenue > 0 ? state.netIncome / state.revenue : 0;
    const previousMargin = previous?.factors.profitabilityTrend ?? currentMargin;
    const profitabilityTrend = (currentMargin - previousMargin) * 50;

    const volatilityPenalty = -10; // Placeholder

    const managementTrust = 60; // Placeholder

    const industryOutlook = 50; // Neutral

    const esgFactor = (state.esgScore ?? 0) / 10;

    // Calculate overall sentiment
    const overall = 50 + growthExpectation + profitabilityTrend +
                    volatilityPenalty + (managementTrust - 50) / 2 +
                    (industryOutlook - 50) / 4 + esgFactor;

    const clampedOverall = Math.max(0, Math.min(100, overall));

    // Calculate price multiplier
    const priceMultiplier = 1 + (clampedOverall - 50) / 100;

    // Determine capital access
    let accessToCapital: "restricted" | "normal" | "favorable";
    if (clampedOverall < 30) accessToCapital = "restricted";
    else if (clampedOverall > 70) accessToCapital = "favorable";
    else accessToCapital = "normal";

    return {
      overall: clampedOverall,
      factors: {
        growthExpectation,
        profitabilityTrend,
        volatilityPenalty,
        managementTrust,
        industryOutlook,
        esgScore: esgFactor,
      },
      priceMultiplier,
      accessToCapital,
    };
  }

  /**
   * Calculate cash constraints
   */
  private static calculateCashConstraints(
    state: TeamState,
    debt: DebtState,
    creditRating: CreditRatingState
  ): CashConstraints {
    const availableCash = state.cash;

    // Available credit from credit lines
    const creditLines = debt.instruments.filter((i) => i.type === "credit_line");
    const availableCredit = creditLines.reduce(
      (sum, cl) => sum + (cl.drawdownAvailable ?? 0),
      0
    );

    const totalLiquidity = availableCash + availableCredit;

    // Minimum cash requirement (operating expenses)
    const operatingExpenses = state.revenue * 0.3; // 30% of revenue
    const minimumCashRequired = operatingExpenses / 4; // One quarter

    // Cash runway
    const burnRate = state.netIncome < 0 ? -state.netIncome : 0;
    const cashRunwayRounds = burnRate > 0
      ? Math.floor(totalLiquidity / burnRate)
      : 20;

    // Liquidity crisis
    const liquidityCrisis = cashRunwayRounds < 2 || availableCash < minimumCashRequired;

    return {
      availableCash,
      availableCredit,
      totalLiquidity,
      minimumCashRequired,
      cashRunwayRounds,
      liquidityCrisis,
    };
  }

  /**
   * Get numeric rating value for comparison
   */
  private static ratingValue(rating: CreditRating): number {
    const values: Record<CreditRating, number> = {
      AAA: 8, AA: 7, A: 6, BBB: 5, BB: 4, B: 3, CCC: 2, D: 1,
    };
    return values[rating];
  }

  /**
   * Initialize debt state
   */
  static initializeDebtState(): DebtState {
    return {
      instruments: [],
      totalDebt: 0,
      totalInterestExpense: 0,
      weightedAverageRate: 0,
      debtToEquity: 0,
      interestCoverage: Infinity,
      covenantBreaches: [],
    };
  }

  /**
   * Initialize credit rating state
   */
  static initializeCreditRating(): CreditRatingState {
    return {
      rating: "BBB",
      previousRating: "BBB",
      factors: {
        debtToEquity: 0.3,
        interestCoverage: 10,
        currentRatio: 2.5,
        profitability: 0.1,
        cashFlowStability: 0.7,
        score: 70,
      },
      outlook: "stable",
      watchList: false,
      interestSpread: CREDIT_SPREADS.BBB,
    };
  }

  /**
   * Initialize investor sentiment
   */
  static initializeInvestorSentiment(): InvestorSentiment {
    return {
      overall: 50,
      factors: {
        growthExpectation: 0,
        profitabilityTrend: 0,
        volatilityPenalty: 0,
        managementTrust: 50,
        industryOutlook: 50,
        esgScore: 0,
      },
      priceMultiplier: 1.0,
      accessToCapital: "normal",
    };
  }
}

// Types are exported with their interface/type declarations above
