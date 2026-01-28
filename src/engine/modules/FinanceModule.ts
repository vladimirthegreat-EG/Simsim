/**
 * Finance Module - Handles financial operations, ratios, funding, and board meetings
 */

import {
  FinanceDecisions,
  TeamState,
  ModuleResult,
  MarketState,
  CONSTANTS,
} from "../types";
import { createErrorResult, random } from "../utils";
import { cloneTeamState } from "../utils/stateUtils";

export interface FinancialRatios {
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  debtToEquity: number;
  roe: number;
  roa: number;
  profitMargin: number;
  grossMargin: number;
  operatingMargin: number;
}

export interface RatioHealth {
  status: "green" | "yellow" | "red";
  label: string;
}

export interface BoardProposalResult {
  proposal: string;
  approved: boolean;
  probability: number;
  votesFor: number;
  votesAgainst: number;
  message: string;
}

export class FinanceModule {
  /**
   * Process all finance decisions for a round
   */
  static process(
    state: TeamState,
    decisions: FinanceDecisions,
    marketState: MarketState
  ): { newState: TeamState; result: ModuleResult } {
    try {
      return this.processInternal(state, decisions, marketState);
    } catch (error) {
      return createErrorResult("FinanceModule", error, state);
    }
  }

  /**
   * Internal processing logic
   */
  private static processInternal(
    state: TeamState,
    decisions: FinanceDecisions,
    marketState: MarketState
  ): { newState: TeamState; result: ModuleResult } {
    let newState = cloneTeamState(state);
    let totalCosts = 0;
    let totalRevenue = 0;
    const messages: string[] = [];

    // Process Treasury Bills issuance (PATCH 1: Short-term debt)
    if (decisions.treasuryBillsIssue && decisions.treasuryBillsIssue > 0) {
      newState.cash += decisions.treasuryBillsIssue;
      newState.shortTermDebt += decisions.treasuryBillsIssue;
      newState.totalLiabilities += decisions.treasuryBillsIssue;
      messages.push(`Issued $${(decisions.treasuryBillsIssue / 1_000_000).toFixed(1)}M in Treasury Bills`);
      // -8% investor sentiment (tracked elsewhere)
    }

    // Process Corporate Bonds issuance (PATCH 1: Long-term debt)
    if (decisions.corporateBondsIssue && decisions.corporateBondsIssue > 0) {
      newState.cash += decisions.corporateBondsIssue;
      newState.longTermDebt += decisions.corporateBondsIssue;
      newState.totalLiabilities += decisions.corporateBondsIssue;
      messages.push(`Issued $${(decisions.corporateBondsIssue / 1_000_000).toFixed(1)}M in Corporate Bonds`);
      // -5% investor sentiment (tracked elsewhere)
    }

    // Process bank loan request (PATCH 1: Categorize by term)
    if (decisions.loanRequest && decisions.loanRequest.amount > 0) {
      const { amount, termMonths } = decisions.loanRequest;
      // Interest rate based on market conditions
      const interestRate = marketState.interestRates.corporateBond / 100;
      const interestCost = amount * interestRate * (termMonths / 12);

      newState.cash += amount;
      // PATCH 1: Categorize by term (≤12 months = short-term, >12 = long-term)
      if (termMonths <= 12) {
        newState.shortTermDebt += amount;
      } else {
        newState.longTermDebt += amount;
      }
      newState.totalLiabilities += amount;
      totalCosts += interestCost / 12; // Monthly interest
      messages.push(`Secured $${(amount / 1_000_000).toFixed(1)}M ${termMonths <= 12 ? 'short-term' : 'long-term'} bank loan at ${(interestRate * 100).toFixed(1)}%`);
    }

    // Process stock issuance
    if (decisions.stockIssuance) {
      const { shares, pricePerShare } = decisions.stockIssuance;
      const proceeds = shares * pricePerShare;

      newState.cash += proceeds;
      newState.sharesIssued += shares;
      newState.shareholdersEquity += proceeds;
      // Dilution effect on share price
      newState.sharePrice = newState.marketCap / newState.sharesIssued;
      totalRevenue += proceeds;
      messages.push(`Issued ${shares.toLocaleString()} shares at $${pricePerShare}, raised $${(proceeds / 1_000_000).toFixed(1)}M`);
    }

    // PATCH 2: Enhanced share buyback with PE ratio impact
    if (decisions.sharesBuyback && decisions.sharesBuyback > 0) {
      const buybackAmount = decisions.sharesBuyback;
      const currentSharePrice = newState.sharePrice;
      const sharesToBuy = Math.floor(buybackAmount / currentSharePrice);

      if (newState.cash >= buybackAmount) {
        const oldShares = newState.sharesIssued;
        const oldEPS = newState.eps;

        // Reduce outstanding shares
        newState.sharesIssued = Math.max(1_000_000, newState.sharesIssued - sharesToBuy); // Floor at 1M shares
        newState.cash -= buybackAmount;

        // PATCH 2: Recalculate EPS with fewer shares (earnings concentrated)
        newState.eps = newState.sharesIssued > 0 ? newState.netIncome / newState.sharesIssued : 0;

        // PATCH 2: Share price increases based on EPS improvement
        const epsGrowth = oldEPS > 0 ? (newState.eps - oldEPS) / oldEPS : 0;
        const priceBoost = 1 + Math.min(0.15, epsGrowth * 0.5); // Up to 15% boost
        newState.sharePrice = currentSharePrice * priceBoost;

        // Update market cap
        newState.marketCap = newState.sharePrice * newState.sharesIssued;

        totalCosts += buybackAmount;
        const pctReduction = (sharesToBuy / oldShares) * 100;
        messages.push(
          `Bought back ${sharesToBuy.toLocaleString()} shares (${pctReduction.toFixed(1)}%) for $${(buybackAmount / 1_000_000).toFixed(1)}M. ` +
          `EPS increased ${(epsGrowth * 100).toFixed(1)}% to $${newState.eps.toFixed(2)}`
        );
      } else {
        messages.push("Insufficient funds for share buyback");
      }
    }

    // PATCH 2: Enhanced dividend system with yield tracking
    if (decisions.dividendPerShare && decisions.dividendPerShare > 0) {
      const totalDividends = decisions.dividendPerShare * newState.sharesIssued;

      if (newState.cash >= totalDividends) {
        newState.cash -= totalDividends;
        totalCosts += totalDividends;

        // PATCH 2: Calculate dividend yield for investor signaling
        const dividendYield = (decisions.dividendPerShare / newState.sharePrice) * 100;

        // PATCH 2: Dividends signal financial health, small price boost
        // But excessive dividends (>5% yield) may signal lack of growth opportunities
        let sentimentEffect = "positive";
        if (dividendYield > 5) {
          sentimentEffect = "concern about growth";
          newState.sharePrice *= 0.98; // -2% for high yield concern
        } else if (dividendYield > 2) {
          sentimentEffect = "strong";
          newState.sharePrice *= 1.02; // +2% for healthy dividend
        }

        messages.push(
          `Paid $${decisions.dividendPerShare.toFixed(2)} dividend per share (${dividendYield.toFixed(1)}% yield, total: $${(totalDividends / 1_000_000).toFixed(1)}M). ` +
          `Investor sentiment: ${sentimentEffect}`
        );
      } else {
        messages.push("Insufficient funds for dividend payment");
      }
    }

    // Process economic forecasts (accuracy affects bonuses)
    if (decisions.economicForecast) {
      const accuracy = this.calculateForecastAccuracy(decisions.economicForecast, marketState);
      if (accuracy >= 90) {
        messages.push(`Excellent forecast accuracy (${accuracy.toFixed(0)}%): +5% efficiency bonus`);
        // Bonus would be applied in production calculations
      } else if (accuracy >= 70) {
        messages.push(`Good forecast accuracy (${accuracy.toFixed(0)}%)`);
      } else {
        messages.push(`Poor forecast accuracy (${accuracy.toFixed(0)}%)`);
      }
    }

    // Update EPS
    newState.eps = newState.sharesIssued > 0 ? newState.netIncome / newState.sharesIssued : 0;

    return {
      newState,
      result: {
        success: true,
        changes: {
          debtIssued: (decisions.treasuryBillsIssue || 0) + (decisions.corporateBondsIssue || 0),
          loanAmount: decisions.loanRequest?.amount || 0,
          stockIssued: decisions.stockIssuance?.shares || 0,
          buybackAmount: decisions.sharesBuyback || 0,
          dividendPaid: decisions.dividendPerShare || 0,
        },
        costs: totalCosts,
        revenue: totalRevenue,
        messages,
      },
    };
  }

  /**
   * Calculate all financial ratios (PATCH 1: Use real short-term debt)
   */
  static calculateRatios(state: TeamState): FinancialRatios {
    // PATCH 1: Use actual short-term debt for liquidity ratios
    const currentAssets = state.cash + state.accountsReceivable; // Simplified - would include inventory
    const currentLiabilities = state.shortTermDebt + state.accountsPayable; // Real short-term obligations
    const totalDebt = state.totalLiabilities;

    return {
      // Liquidity Ratios (now use real short-term debt)
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 999,
      quickRatio: currentLiabilities > 0 ? (currentAssets * 0.8) / currentLiabilities : 999, // Exclude inventory
      cashRatio: currentLiabilities > 0 ? state.cash / currentLiabilities : 999,

      // Leverage Ratio
      debtToEquity: state.shareholdersEquity > 0 ? totalDebt / state.shareholdersEquity : 999,

      // Profitability Ratios
      roe: state.shareholdersEquity > 0 ? state.netIncome / state.shareholdersEquity : 0,
      roa: state.totalAssets > 0 ? state.netIncome / state.totalAssets : 0,
      profitMargin: state.revenue > 0 ? state.netIncome / state.revenue : 0,
      grossMargin: state.revenue > 0 ? (state.revenue - state.revenue * 0.6) / state.revenue : 0, // Assume 60% COGS
      operatingMargin: state.revenue > 0 ? (state.netIncome * 1.2) / state.revenue : 0, // Approximate
    };
  }

  /**
   * Get health status for a ratio
   */
  static getRatioHealth(ratio: keyof FinancialRatios, value: number): RatioHealth {
    const thresholds: Record<string, { green: number; yellow: number; higherBetter: boolean }> = {
      currentRatio: { green: 2.0, yellow: 1.2, higherBetter: true },
      quickRatio: { green: 1.5, yellow: 1.0, higherBetter: true },
      cashRatio: { green: 0.5, yellow: 0.2, higherBetter: true },
      debtToEquity: { green: 0.3, yellow: 0.6, higherBetter: false },
      roe: { green: 0.15, yellow: 0.08, higherBetter: true },
      roa: { green: 0.08, yellow: 0.04, higherBetter: true },
      profitMargin: { green: 0.15, yellow: 0.05, higherBetter: true },
      grossMargin: { green: 0.4, yellow: 0.25, higherBetter: true },
      operatingMargin: { green: 0.2, yellow: 0.1, higherBetter: true },
    };

    const threshold = thresholds[ratio];
    if (!threshold) {
      return { status: "yellow", label: "Unknown" };
    }

    if (threshold.higherBetter) {
      if (value >= threshold.green) return { status: "green", label: "Healthy" };
      if (value >= threshold.yellow) return { status: "yellow", label: "Caution" };
      return { status: "red", label: "Critical" };
    } else {
      if (value <= threshold.green) return { status: "green", label: "Healthy" };
      if (value <= threshold.yellow) return { status: "yellow", label: "Caution" };
      return { status: "red", label: "Critical" };
    }
  }

  /**
   * Calculate forecast accuracy
   */
  static calculateForecastAccuracy(
    forecast: NonNullable<FinanceDecisions["economicForecast"]>,
    actual: MarketState
  ): number {
    const gdpError = Math.abs(forecast.gdpForecast - actual.economicConditions.gdp);
    const inflationError = Math.abs(forecast.inflationForecast - actual.economicConditions.inflation);

    const avgError = (gdpError + inflationError) / 2;

    // Accuracy = 100 - (avgError × 20), clamped to 0-100
    return Math.max(0, Math.min(100, 100 - avgError * 20));
  }

  /**
   * Calculate board proposal approval probability
   */
  static calculateProposalProbability(
    proposalType: string,
    state: TeamState,
    ratios: FinancialRatios
  ): number {
    let baseProbability = 50;

    // Base adjustments
    if (ratios.roe > 0.15) baseProbability += 10;
    if (ratios.currentRatio > 2.0) baseProbability += 5;
    if (ratios.debtToEquity > 0.6) baseProbability -= 15;

    // PATCH 4: ESG affects board approval (high ESG improves trust)
    if (state.esgScore > 600) {
      baseProbability += 8; // High ESG = better board relations
    } else if (state.esgScore < 300) {
      baseProbability -= 12; // Low ESG = board concerned about reputation risk
    }

    // Proposal-specific adjustments
    switch (proposalType.toLowerCase()) {
      case "dividend":
        if (ratios.roe > 0.12 && ratios.cashRatio > 1.0) baseProbability += 20;
        else baseProbability -= 20;
        break;
      case "expansion":
        if (ratios.debtToEquity < 0.5) baseProbability += 15;
        else baseProbability -= 10;
        break;
      case "acquisition":
        if (state.cash > 100_000_000 && ratios.debtToEquity < 0.4) baseProbability += 10;
        else baseProbability -= 25;
        break;
      case "emergency_capital":
        if (ratios.debtToEquity > 2) baseProbability = 65;
        else baseProbability = 15;
        break;
      case "stock_buyback":
        if (ratios.roe > 0.1 && state.cash > 50_000_000) baseProbability += 15;
        break;
    }

    // Clamp between 10 and 95
    return Math.max(10, Math.min(95, baseProbability));
  }

  /**
   * Simulate board vote
   */
  static simulateBoardVote(probability: number): BoardProposalResult {
    const totalVotes = 6;
    const approved = random() * 100 < probability;

    let votesFor: number;
    if (approved) {
      votesFor = Math.ceil(totalVotes * (probability / 100));
    } else {
      votesFor = Math.floor(totalVotes * (probability / 100));
    }

    const votesAgainst = totalVotes - votesFor;

    return {
      proposal: "",
      approved,
      probability,
      votesFor,
      votesAgainst,
      message: approved
        ? `Proposal approved (${votesFor}-${votesAgainst})`
        : `Proposal rejected (${votesFor}-${votesAgainst})`,
    };
  }

  /**
   * Apply FX impact to factory operations (legacy method)
   */
  static calculateFXImpact(
    marketState: MarketState,
    factoryRegion: string
  ): { costImpact: number; message: string } {
    const volatility = marketState.fxVolatility;

    // Random FX movement within volatility range
    const fxChange = (random() - 0.5) * volatility;

    // Impact: $20K per factory per 1% FX change
    const costImpact = fxChange * 20_000;

    let message: string;
    if (fxChange > 0.05) {
      message = `Unfavorable FX movement in ${factoryRegion}: +$${(costImpact / 1000).toFixed(0)}K costs`;
    } else if (fxChange < -0.05) {
      message = `Favorable FX movement in ${factoryRegion}: -$${(Math.abs(costImpact) / 1000).toFixed(0)}K costs`;
    } else {
      message = `Stable FX in ${factoryRegion}`;
    }

    return { costImpact, message };
  }

  /**
   * PATCH 6: Calculate FX impact on foreign revenue
   * Assumes home region is North America, all other regions are foreign
   * @param revenueByRegion Revenue earned in each region
   * @param marketState Current market conditions with FX rates
   * @returns Net FX gain/loss and breakdown messages
   */
  static calculateForeignRevenueFXImpact(
    revenueByRegion: Record<string, number>,
    marketState: MarketState
  ): { fxImpact: number; messages: string[] } {
    const HOME_REGION = "North America";
    const messages: string[] = [];
    let totalFXImpact = 0;

    // FX rates are relative to USD (home currency)
    // Rate > 1.0 = foreign currency stronger = favorable for exports
    // Rate < 1.0 = foreign currency weaker = unfavorable for exports

    for (const [region, revenue] of Object.entries(revenueByRegion)) {
      if (region === HOME_REGION || revenue === 0) continue;

      // Get FX rate for this region
      let fxRate = 1.0;
      if (region === "Europe") fxRate = marketState.fxRates.EUR_USD;
      else if (region === "Asia") fxRate = marketState.fxRates.JPY_USD / 100; // Yen is in hundreds
      else if (region === "MENA") fxRate = 0.98; // Approximate (not in market state)

      // FX impact: (rate - 1.0) × revenue
      // Positive = gain (foreign currency appreciated)
      // Negative = loss (foreign currency depreciated)
      const impact = (fxRate - 1.0) * revenue;
      totalFXImpact += impact;

      if (Math.abs(impact) > 10_000) {
        const direction = impact > 0 ? "gain" : "loss";
        messages.push(
          `FX ${direction} from ${region}: $${(Math.abs(impact) / 1_000_000).toFixed(2)}M ` +
          `(${revenue > 0 ? ((impact / revenue) * 100).toFixed(1) : '0'}% of ${region} revenue)`
        );
      }
    }

    if (messages.length === 0 && totalFXImpact !== 0) {
      messages.push(`Net FX impact: $${(totalFXImpact / 1_000_000).toFixed(2)}M`);
    }

    return { fxImpact: totalFXImpact, messages };
  }

  /**
   * Generate cash flow statement
   */
  static generateCashFlowStatement(
    state: TeamState,
    previousState: TeamState
  ): {
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashFlow: number;
  } {
    // Operating: Revenue - Expenses + Working Capital Changes
    const operatingCashFlow = state.revenue - state.workforce.laborCost;

    // Investing: CapEx and asset purchases (negative)
    const investingCashFlow = -(state.factories.length - previousState.factories.length) * CONSTANTS.NEW_FACTORY_COST;

    // Financing: Debt changes + Equity changes - Dividends
    const debtChange = state.totalLiabilities - previousState.totalLiabilities;
    const equityChange = state.shareholdersEquity - previousState.shareholdersEquity;
    const financingCashFlow = debtChange + equityChange;

    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

    return {
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netCashFlow,
    };
  }

  /**
   * Check if team can call board meeting
   */
  static canCallBoardMeeting(
    meetingsThisYear: number,
    ratios: FinancialRatios
  ): { canCall: boolean; reason: string } {
    // Can always call if in financial distress
    if (ratios.debtToEquity > 1.5) {
      return { canCall: true, reason: "Emergency meeting allowed due to high leverage" };
    }
    if (ratios.cashRatio < 0.5) {
      return { canCall: true, reason: "Emergency meeting allowed due to low cash" };
    }

    // Normal limit: 2 per year
    if (meetingsThisYear >= CONSTANTS.BOARD_MEETINGS_PER_YEAR) {
      return { canCall: false, reason: "Maximum board meetings (2) for this year reached" };
    }

    return { canCall: true, reason: "Regular meeting available" };
  }

  /**
   * Calculate EPS ranking percentile
   */
  static calculateEPSRanking(playerEPS: number, peerEPSs: number[]): number {
    if (peerEPSs.length === 0) return 100;

    const average = peerEPSs.reduce((sum, eps) => sum + eps, 0) / peerEPSs.length;
    if (average === 0) return playerEPS > 0 ? 100 : 50;

    return (playerEPS / average) * 100;
  }

  /**
   * PATCH 2: Calculate Price-to-Earnings (PE) ratio
   * Returns the market's valuation multiple for the company
   */
  static calculatePERatio(state: TeamState): number {
    if (state.eps <= 0) return 0; // No PE ratio for negative earnings
    return state.sharePrice / state.eps;
  }

  /**
   * PATCH 2: Calculate target PE ratio based on company fundamentals
   * This represents what the market "should" value the company at
   */
  static calculateTargetPERatio(
    state: TeamState,
    epsGrowth: number,
    sentiment: number
  ): number {
    let basePE = 15; // Market average

    // Growth premium: High-growth companies get higher multiples
    const growthPremium = epsGrowth > 0 ? Math.min(10, epsGrowth * 50) : 0;

    // Sentiment adjustment: -10 to +10 PE points
    const sentimentAdjustment = (sentiment - 50) / 5;

    // Profitability adjustment
    const profitMargin = state.revenue > 0 ? state.netIncome / state.revenue : 0;
    const profitabilityBonus = profitMargin > 0.15 ? 3 : profitMargin > 0.10 ? 1 : -2;

    // Leverage penalty
    const debtToEquity = state.shareholdersEquity > 0 ? state.totalLiabilities / state.shareholdersEquity : 999;
    const leveragePenalty = debtToEquity > 1.0 ? -5 : debtToEquity > 0.6 ? -2 : 0;

    const targetPE = basePE + growthPremium + sentimentAdjustment + profitabilityBonus + leveragePenalty;

    // Clamp between 5 and 30
    return Math.max(5, Math.min(30, targetPE));
  }

  /**
   * PATCH 4: Calculate investor sentiment including ESG effects
   * Returns sentiment score 0-100 (50 = neutral)
   */
  static calculateInvestorSentiment(
    state: TeamState,
    baseSentiment: number = 50
  ): number {
    let sentiment = baseSentiment;

    // PATCH 4: High ESG improves investor sentiment (ESG investing trend)
    if (state.esgScore > 600) {
      sentiment += 8; // High ESG = attracts ESG-focused investors
    } else if (state.esgScore < 300) {
      sentiment -= 10; // Low ESG = reputation risk concerns
    }

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, sentiment));
  }

  /**
   * PATCH 2: Update market cap based on PE ratio and performance
   */
  static updateMarketCap(
    state: TeamState,
    epsGrowth: number,
    marketSentiment: number
  ): number {
    // PATCH 2: Use target PE ratio calculation
    const targetPE = this.calculateTargetPERatio(state, epsGrowth, marketSentiment);

    // Calculate market cap from PE ratio: Market Cap = EPS × Shares × PE
    let newMarketCap: number;

    if (state.eps > 0) {
      // Positive earnings: use PE multiple
      newMarketCap = state.eps * state.sharesIssued * targetPE;
    } else {
      // Negative earnings: use price-to-sales or book value
      const priceToSales = Math.max(0.5, 2 + (marketSentiment - 50) / 25); // 0.5x to 3.5x sales
      newMarketCap = state.revenue * priceToSales;
    }

    // Floor at 0.5x book value (asset backing)
    const bookValue = state.totalAssets - state.totalLiabilities;
    const minMarketCap = Math.max(bookValue * 0.5, state.totalAssets * 0.3);

    return Math.max(minMarketCap, newMarketCap);
  }
}
