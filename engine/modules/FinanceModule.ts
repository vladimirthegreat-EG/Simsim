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
import { createErrorResult } from "../utils";
import { cloneTeamState } from "../utils/stateUtils";
import type { EngineContext } from "../core/EngineContext";
import type { SeededRNG } from "../core/EngineContext";

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
    marketState: MarketState,
    ctx?: EngineContext
  ): { newState: TeamState; result: ModuleResult } {
    try {
      return this.processInternal(state, decisions, marketState, ctx);
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
    marketState: MarketState,
    ctx?: EngineContext
  ): { newState: TeamState; result: ModuleResult } {
    let newState = cloneTeamState(state);
    let totalCosts = 0;
    let totalRevenue = 0;
    const messages: string[] = [];

    // EXPLOIT-03: Check if credit is frozen (D/E > 2.0) before allowing new debt
    const currentTotalDebt = newState.shortTermDebt + newState.longTermDebt;
    const currentDE = newState.shareholdersEquity > 0
      ? currentTotalDebt / newState.shareholdersEquity : 999;
    const creditFrozen = currentDE > CONSTANTS.CREDIT_FROZEN_DE_THRESHOLD;

    // Process Treasury Bills issuance (PATCH 1: Short-term debt)
    if (decisions.treasuryBillsIssue && decisions.treasuryBillsIssue > 0 && !creditFrozen) {
      newState.cash += decisions.treasuryBillsIssue;
      newState.shortTermDebt += decisions.treasuryBillsIssue;
      newState.totalLiabilities += decisions.treasuryBillsIssue;
      messages.push(`Issued $${(decisions.treasuryBillsIssue / 1_000_000).toFixed(1)}M in Treasury Bills`);
      // -8% investor sentiment (tracked elsewhere)
    }

    // Process Corporate Bonds issuance (PATCH 1: Long-term debt)
    // Board approval required for large issuances (>$20M)
    if (decisions.corporateBondsIssue && decisions.corporateBondsIssue > 0 && !creditFrozen) {
      let bondApproved = true;
      if (ctx && decisions.corporateBondsIssue > 20_000_000) {
        const ratios = this.calculateRatios(newState);
        const prob = this.calculateProposalProbability("expansion", newState, ratios);
        const vote = this.simulateBoardVote(prob, ctx.rng.finance);
        bondApproved = vote.approved;
        if (!bondApproved) {
          messages.push(`Board rejected $${(decisions.corporateBondsIssue / 1_000_000).toFixed(1)}M bond issuance: ${vote.message}`);
        }
      }
      if (bondApproved) {
        newState.cash += decisions.corporateBondsIssue;
        newState.longTermDebt += decisions.corporateBondsIssue;
        newState.totalLiabilities += decisions.corporateBondsIssue;
        messages.push(`Issued $${(decisions.corporateBondsIssue / 1_000_000).toFixed(1)}M in Corporate Bonds`);
      }
    }

    // Process bank loan request (PATCH 1: Categorize by term)
    if (decisions.loanRequest && decisions.loanRequest.amount > 0 && !creditFrozen) {
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

    // Process stock issuance (requires board approval)
    if (decisions.stockIssuance) {
      const { shares, pricePerShare } = decisions.stockIssuance;
      const ratios = this.calculateRatios(newState);

      // Board approval required for stock issuance
      let boardApproved = true;
      if (ctx) {
        const prob = this.calculateProposalProbability("stock_issuance", newState, ratios);
        const vote = this.simulateBoardVote(prob, ctx.rng.finance);
        boardApproved = vote.approved;
        if (!boardApproved) {
          messages.push(`Board rejected stock issuance: ${vote.message}`);
        }
      }

      if (boardApproved) {
        // Dilution-based price impact: more shares issued relative to float = bigger discount
        const dilutionRatio = shares / (newState.sharesIssued + shares);
        // Supply increase depresses price: price impact scales with dilution squared (convex penalty)
        const priceImpact = 1 - (dilutionRatio * dilutionRatio * 2);
        const effectivePrice = pricePerShare * Math.max(0.5, priceImpact);
        const proceeds = shares * effectivePrice;

        newState.cash += proceeds;
        newState.sharesIssued += shares;
        newState.shareholdersEquity += proceeds;
        // Recalculate share price from market cap and new share count
        newState.sharePrice = newState.marketCap / newState.sharesIssued;
        totalRevenue += proceeds;
        messages.push(
          `Issued ${shares.toLocaleString()} shares at $${effectivePrice.toFixed(2)} ` +
          `(${(dilutionRatio * 100).toFixed(1)}% dilution), raised $${(proceeds / 1_000_000).toFixed(1)}M`
        );
      }
    }

    // PATCH 2: Enhanced share buyback with PE ratio impact
    // CRIT-05: Guard against division by zero and over-purchase
    if (decisions.sharesBuyback && decisions.sharesBuyback > 0) {
      const buybackAmount = decisions.sharesBuyback;
      const currentSharePrice = newState.sharePrice;

      // Board approval required for large buybacks (>$10M)
      let buybackApproved = true;
      if (ctx && buybackAmount > 10_000_000) {
        const ratios = this.calculateRatios(newState);
        const prob = this.calculateProposalProbability("stock_buyback", newState, ratios);
        const vote = this.simulateBoardVote(prob, ctx.rng.finance);
        buybackApproved = vote.approved;
        if (!buybackApproved) {
          messages.push(`Board rejected $${(buybackAmount / 1_000_000).toFixed(1)}M buyback: ${vote.message}`);
        }
      }

      if (!buybackApproved) {
        // Skip buyback
      } else if (currentSharePrice <= 0) {
        // Guard: cannot buy back at zero or negative price
        messages.push("Cannot execute share buyback: share price is $0 or negative");
      } else {
        const rawSharesToBuy = Math.floor(buybackAmount / currentSharePrice);
        // Never buy more shares than would bring us below the 1M floor
        const sharesToBuy = Math.min(rawSharesToBuy, Math.max(0, newState.sharesIssued - 1_000_000));

        if (sharesToBuy <= 0) {
          messages.push("Cannot buy back shares: already at minimum share count");
        } else if (newState.cash >= buybackAmount) {
          const oldShares = newState.sharesIssued;
          const oldEPS = newState.eps;

          // Reduce outstanding shares
          newState.sharesIssued = Math.max(1_000_000, newState.sharesIssued - sharesToBuy);
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
    }

    // PATCH 2: Enhanced dividend system with yield tracking
    if (decisions.dividendPerShare && decisions.dividendPerShare > 0) {
      const totalDividends = decisions.dividendPerShare * newState.sharesIssued;

      if (newState.cash >= totalDividends) {
        newState.cash -= totalDividends;
        totalCosts += totalDividends;

        // PATCH 2: Calculate dividend yield for investor signaling
        const dividendYield = newState.sharePrice > 0
          ? (decisions.dividendPerShare / newState.sharePrice) * 100
          : 0;

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

    // EXPLOIT-03: Debt covenant enforcement — penalize excessive leverage
    const totalDebt = newState.shortTermDebt + newState.longTermDebt;
    const debtToEquity = newState.shareholdersEquity > 0
      ? totalDebt / newState.shareholdersEquity : 999;

    if (debtToEquity > CONSTANTS.DEBT_COVENANT_DE_THRESHOLD_1) {
      // Covenant violation: 50% interest rate surcharge
      const interestSurcharge = totalDebt * CONSTANTS.COVENANT_INTEREST_SURCHARGE * 0.5; // ~1% extra per round
      newState.cash -= interestSurcharge;
      totalCosts += interestSurcharge;
      messages.push(`Debt covenant triggered (D/E ${debtToEquity.toFixed(2)}): $${(interestSurcharge / 1_000_000).toFixed(1)}M interest surcharge`);

      if (debtToEquity > CONSTANTS.DEBT_COVENANT_DE_THRESHOLD_2) {
        // Forced partial repayment: 10% of debt
        const forcedRepayment = Math.min(newState.cash * CONSTANTS.FORCED_REPAYMENT_CASH_LIMIT, totalDebt * CONSTANTS.FORCED_REPAYMENT_DEBT_PERCENT);
        if (forcedRepayment > 0) {
          newState.cash -= forcedRepayment;
          // Reduce long-term debt first
          const ltReduction = Math.min(forcedRepayment, newState.longTermDebt);
          newState.longTermDebt -= ltReduction;
          const stReduction = forcedRepayment - ltReduction;
          newState.shortTermDebt -= stReduction;
          newState.totalLiabilities -= forcedRepayment;
          totalCosts += forcedRepayment;
          messages.push(`Severe covenant violation: forced $${(forcedRepayment / 1_000_000).toFixed(1)}M debt repayment`);
        }
      }

      if (debtToEquity > CONSTANTS.CREDIT_FROZEN_DE_THRESHOLD) {
        // Credit frozen — no new debt instruments available (enforced by blocking above)
        messages.push(`Credit frozen: D/E ratio ${debtToEquity.toFixed(2)} exceeds ${CONSTANTS.CREDIT_FROZEN_DE_THRESHOLD} — no new borrowing allowed`);
      }
    }

    // v5.1.0 Audit F-15: EPS removed — calculated in SimulationEngine after market
    // (FinanceModule runs before market sim, so netIncome is stale here)

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
      // v5.1.0 Audit F-08: Use actual COGS from state instead of 60% approximation
      grossMargin: state.revenue > 0 ? (state.revenue - (state.cogs || state.revenue * 0.6)) / state.revenue : 0,
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
   * Calculate board proposal approval probability.
   *
   * Board satisfaction is driven by:
   *   1. Achievement score (primary — this is the game's win condition)
   *   2. Achievement count and recency (are we earning them?)
   *   3. Absence of "Bad" achievements (shame penalties)
   *   4. Financial health (supporting factor — D/E, cash, profitability)
   *   5. ESG reputation
   *
   * A high-performing team (many achievements, no bad ones, healthy finances)
   * gets easy board approval. A struggling team with bad achievements gets scrutiny.
   */
  static calculateProposalProbability(
    proposalType: string,
    state: TeamState,
    ratios: FinancialRatios
  ): number {
    // ── Board satisfaction score (0-100) ──
    let satisfaction: number = CONSTANTS.BOARD_SATISFACTION_BASELINE; // Neutral baseline

    // 1. Achievement score: +1 satisfaction per 10 achievement points (up to +30)
    const achievementScore = state.achievementScore ?? 0;
    satisfaction += Math.min(30, Math.floor(achievementScore / 10));

    // 2. Achievement count: board likes consistent progress
    const achievements = state.achievements ?? [];
    const positiveCount = achievements.filter(a => a.points > 0).length;
    satisfaction += Math.min(10, positiveCount * 2); // +2 per positive achievement, cap +10

    // 3. Bad achievements: board is displeased by shame events
    const badCount = achievements.filter(a => a.points === 0).length;
    satisfaction -= badCount * 5; // -5 per bad/infamy achievement

    // 4. Recent achievement momentum: any achievement earned this round?
    const currentRound = state.round || 0;
    const recentAchievements = achievements.filter(a => a.roundUnlocked >= currentRound - 1).length;
    if (recentAchievements > 0) satisfaction += 5; // Recent progress boosts confidence

    // 5. Financial health (secondary factors — board still checks the books)
    if (ratios.roe > 0.15) satisfaction += 5;
    if (ratios.currentRatio > 2.0) satisfaction += 3;
    if (ratios.debtToEquity > 1.0) satisfaction -= 8;
    if (ratios.debtToEquity > 2.0) satisfaction -= 10; // Severe leverage concern
    if (state.cash < 0) satisfaction -= 10; // Negative cash is alarming

    // 6. Profitability trend: positive net income = board trust
    if (state.netIncome > 0) satisfaction += 5;
    else if (state.netIncome < -10_000_000) satisfaction -= 8; // Large losses

    // 7. ESG reputation: board cares about public image
    if (state.esgScore > 600) satisfaction += 5;
    else if (state.esgScore < 200) satisfaction -= 8;

    // Clamp satisfaction to 10-95 range
    satisfaction = Math.max(10, Math.min(95, satisfaction));

    // ── Proposal-specific modifier ──
    // Board satisfaction sets the baseline, then specific proposal types shift it
    let modifier = 0;

    switch (proposalType.toLowerCase()) {
      case "dividend":
        // Board approves dividends if company is profitable and has cash
        modifier = (ratios.roe > 0.12 && ratios.cashRatio > 1.0) ? 10 : -15;
        break;
      case "expansion":
        // Board approves growth if debt is manageable
        modifier = ratios.debtToEquity < 0.5 ? 10 : -8;
        break;
      case "acquisition":
        // Board is cautious about acquisitions
        modifier = (state.cash > 100_000_000 && ratios.debtToEquity < 0.4) ? 5 : -20;
        break;
      case "emergency_capital":
        // Emergency funding: boards almost always approve because the alternative is insolvency.
        // Even a skeptical board would rather dilute than let the company collapse.
        // Override: floor at 65%, high-satisfaction boards reach 85%+
        modifier = Math.max(65 - satisfaction, 10); // At minimum +10, pushes low-satisfaction to 65+
        break;
      case "stock_buyback":
        // Board likes buybacks when profitable
        modifier = (ratios.roe > 0.1 && state.cash > 50_000_000) ? 8 : -5;
        break;
      case "stock_issuance":
        // Board approves dilution reluctantly — only if company needs it
        if (ratios.cashRatio < 0.3) modifier += 15; // low cash = approve
        if (ratios.debtToEquity > 1.0) modifier += 8; // high debt = approve equity over more debt
        if (ratios.roe > 0.15) modifier -= 8; // profitable = why dilute?
        break;
    }

    // Final probability = satisfaction + proposal modifier, clamped
    return Math.max(10, Math.min(95, satisfaction + modifier));
  }

  /**
   * Simulate board vote
   */
  static simulateBoardVote(probability: number, rng?: SeededRNG): BoardProposalResult {
    const totalVotes = CONSTANTS.BOARD_TOTAL_VOTES;
    const roll = rng ? rng.next() : Math.random();
    const approved = roll * 100 < probability;

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

  // Dead code removed: calculateFXImpact, calculateForeignRevenueFXImpact (use FXEngine directly)
  // Dead code removed: generateCashFlowStatement (superseded by FinancialStatementsEngine)
  // Dead code removed: canCallBoardMeeting (board votes handled via simulateBoardVote)

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
    let basePE = CONSTANTS.BASE_PE_RATIO; // Market average

    // Growth premium: High-growth companies get higher multiples
    const growthPremium = epsGrowth > 0 ? Math.min(CONSTANTS.PE_GROWTH_PREMIUM_MAX, epsGrowth * 50) : 0;

    // Sentiment adjustment: -10 to +10 PE points
    const sentimentAdjustment = (sentiment - 50) / 5;

    // Profitability adjustment
    const profitMargin = state.revenue > 0 ? state.netIncome / state.revenue : 0;
    const profitabilityBonus = profitMargin > 0.15 ? 3 : profitMargin > 0.10 ? 1 : -2;

    // Leverage penalty
    const debtToEquity = state.shareholdersEquity > 0 ? state.totalLiabilities / state.shareholdersEquity : 999;
    const leveragePenalty = debtToEquity > 1.0 ? -5 : debtToEquity > 0.6 ? -2 : 0;

    const targetPE = basePE + growthPremium + sentimentAdjustment + profitabilityBonus + leveragePenalty;

    // Clamp between MIN_PE_RATIO and MAX_PE_RATIO
    return Math.max(CONSTANTS.MIN_PE_RATIO, Math.min(CONSTANTS.MAX_PE_RATIO, targetPE));
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
    if (state.esgScore > CONSTANTS.INVESTOR_SENTIMENT_ESG_HIGH) {
      sentiment += CONSTANTS.INVESTOR_SENTIMENT_ESG_BONUS; // High ESG = attracts ESG-focused investors
    } else if (state.esgScore < CONSTANTS.INVESTOR_SENTIMENT_ESG_LOW) {
      sentiment -= CONSTANTS.INVESTOR_SENTIMENT_ESG_PENALTY; // Low ESG = reputation risk concerns
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

    // CRIT-03: Blended market cap near EPS=0 to prevent valuation discontinuity
    // Pure PE method for EPS > $0.50, pure P/S for EPS < -$0.50, blend in between
    const priceToSales = Math.max(0.5, CONSTANTS.PRICE_TO_SALES_BASE + (marketSentiment - 50) / 25);
    let newMarketCap: number;

    if (state.eps > CONSTANTS.MARKET_CAP_BLEND_ZONE.high) {
      // Pure PE method
      newMarketCap = state.eps * state.sharesIssued * targetPE;
    } else if (state.eps < CONSTANTS.MARKET_CAP_BLEND_ZONE.low) {
      // Pure P/S method
      newMarketCap = state.revenue * priceToSales;
    } else {
      // Blend zone: [low, high] — smooth transition
      const blend = (state.eps - CONSTANTS.MARKET_CAP_BLEND_ZONE.low) / (CONSTANTS.MARKET_CAP_BLEND_ZONE.high - CONSTANTS.MARKET_CAP_BLEND_ZONE.low); // 0 at low, 1 at high
      const mcPE = Math.max(0.01, state.eps) * state.sharesIssued * targetPE;
      const mcPS = state.revenue * priceToSales;
      newMarketCap = mcPE * blend + mcPS * (1 - blend);
    }

    // Floor at 0.5x book value (asset backing)
    const bookValue = state.totalAssets - state.totalLiabilities;
    const minMarketCap = Math.max(bookValue * CONSTANTS.MARKET_CAP_BOOK_VALUE_FLOOR, state.totalAssets * CONSTANTS.MARKET_CAP_ASSETS_FLOOR);

    return Math.max(minMarketCap, newMarketCap);
  }
}
