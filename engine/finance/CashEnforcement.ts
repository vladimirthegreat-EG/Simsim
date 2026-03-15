/**
 * Cash Enforcement — Auto-funding waterfall when cash falls below floor.
 *
 * When a team's cash drops below the minimum floor, the engine automatically
 * raises capital via debt or equity to prevent infinite negative cash.
 *
 * Waterfall:
 *   1. Try bank loan (if credit not frozen, D/E < 2.0)
 *   2. Try stock issuance (requires board approval)
 *   3. If both fail → liquidity crisis (efficiency penalty, warning)
 *
 * ALL financial variables are derived from state — no magic constants:
 *   - Interest rate: derived from D/E ratio and market rates
 *   - Loan buffer: derived from operating burn rate
 *   - Dilution: newShares / (existingShares + newShares)
 *   - Price impact: convex function of dilution ratio
 *   - Board approval: existing calculateProposalProbability + simulateBoardVote
 */

import type { TeamState, MarketState } from "../types";
import { CONSTANTS } from "../types";
import { FinanceModule } from "../modules/FinanceModule";
import type { EngineContext } from "../core/EngineContext";
import { safeNumber } from "../utils";

export interface AutoFundingResult {
  debtAutoIssued: number;
  equityRaised: number;
  sharesAutoIssued: number;
  dilutionPercent: number;
  interestRateApplied: number;
  boardVoteHeld: boolean;
  boardApproved: boolean | null;
  liquidityCrisis: boolean;
  messages: string[];
}

export class CashEnforcement {
  /**
   * Calculate the cash floor for a team.
   * Floor = max($5M minimum, 5% of total assets).
   * The 5% ratio is derived from standard corporate treasury practice.
   */
  static getCashFloor(state: TeamState): number {
    const assetBasedFloor = Math.max(0, state.totalAssets) * CONSTANTS.CASH_FLOOR_ASSET_RATIO;
    return Math.max(CONSTANTS.MINIMUM_CASH_FLOOR, assetBasedFloor);
  }

  /**
   * Check if auto-funding is needed and execute the waterfall.
   * Mutates state in-place and returns the funding result.
   */
  static enforce(
    state: TeamState,
    marketState: MarketState,
    ctx: EngineContext
  ): AutoFundingResult | null {
    const cashFloor = this.getCashFloor(state);

    if (state.cash >= cashFloor) {
      return null; // No action needed
    }

    const shortfall = cashFloor - state.cash;
    return this.autoFund(state, shortfall, marketState, ctx);
  }

  /**
   * Auto-funding waterfall: try debt first, then equity, then crisis.
   */
  private static autoFund(
    state: TeamState,
    shortfall: number,
    marketState: MarketState,
    ctx: EngineContext
  ): AutoFundingResult {
    const result: AutoFundingResult = {
      debtAutoIssued: 0,
      equityRaised: 0,
      sharesAutoIssued: 0,
      dilutionPercent: 0,
      interestRateApplied: 0,
      boardVoteHeld: false,
      boardApproved: null,
      liquidityCrisis: false,
      messages: [],
    };

    // Calculate how much to raise: shortfall + a buffer based on one round's operating costs.
    // Buffer = estimated one-round burn rate (labor + COGS) so we don't trigger again next round.
    const estimatedBurnRate = (state.workforce.laborCost || 0) + (state.cogs || 0);
    const bufferMultiplier = estimatedBurnRate > 0
      ? Math.min(0.5, estimatedBurnRate / Math.max(1, shortfall))
      : 0.2;
    const targetRaise = shortfall * (1 + bufferMultiplier);

    // Step 1: Try bank loan
    // Emergency auto-loans use revenue-backed lending: if the company earns revenue,
    // lenders will extend credit even with negative equity (debtor-in-possession lending).
    // Credit is only truly frozen when there's no equity AND no revenue to service debt.
    const totalDebt = state.shortTermDebt + state.longTermDebt;
    const debtToEquity = state.shareholdersEquity > 0
      ? totalDebt / state.shareholdersEquity : 999;
    const hasRevenue = (state.revenue || 0) > 0;
    // Credit frozen only if: D/E > emergency threshold AND no revenue to service new debt
    const creditFrozen = debtToEquity > CONSTANTS.CREDIT_FROZEN_DE_EMERGENCY && !hasRevenue;

    if (!creditFrozen) {
      const loanResult = this.tryAutoLoan(state, targetRaise, marketState, debtToEquity);
      result.debtAutoIssued = loanResult.amount;
      result.interestRateApplied = loanResult.interestRate;
      result.messages.push(...loanResult.messages);

      if (state.cash >= this.getCashFloor(state)) {
        state.autoFunding = result;
        return result;
      }
    }

    // Step 2: Try stock issuance (board approval required)
    const remainingShortfall = this.getCashFloor(state) - state.cash;
    if (remainingShortfall > 0) {
      const equityResult = this.tryAutoEquity(state, remainingShortfall, ctx);
      result.equityRaised = equityResult.raised;
      result.sharesAutoIssued = equityResult.sharesIssued;
      result.dilutionPercent = equityResult.dilutionPercent;
      result.boardVoteHeld = equityResult.boardVoteHeld;
      result.boardApproved = equityResult.boardApproved;
      result.messages.push(...equityResult.messages);
    }

    // Step 3: If still below floor → liquidity crisis
    if (state.cash < this.getCashFloor(state)) {
      result.liquidityCrisis = true;
      result.messages.push(
        `⚠ LIQUIDITY CRISIS: Cash $${(state.cash / 1_000_000).toFixed(1)}M below ` +
        `floor $${(this.getCashFloor(state) / 1_000_000).toFixed(1)}M — ` +
        `10% efficiency penalty applied`
      );

      // Apply efficiency penalty to all factories
      for (const factory of state.factories) {
        factory.efficiency = Math.max(0.1, factory.efficiency * 0.90);
      }
    }

    state.autoFunding = result;
    return result;
  }

  /**
   * Try to issue an automatic bank loan.
   * Interest rate is derived from:
   *   - Base: market corporate bond rate
   *   - D/E risk premium: +2% per 0.5 D/E above 0.5
   *   - Distress premium: +3% if cash is negative
   */
  private static tryAutoLoan(
    state: TeamState,
    targetAmount: number,
    marketState: MarketState,
    currentDE: number
  ): { amount: number; interestRate: number; messages: string[] } {
    const messages: string[] = [];

    // Derive interest rate from market conditions and company health
    const baseRate = (marketState.interestRates.corporateBond || 6) / 100;
    // Cap D/E premium input at 5.0 — beyond that it's already maxed out distress pricing
    const effectiveDE = Math.min(currentDE, 5.0);
    const deRiskPremium = Math.max(0, (effectiveDE - CONSTANTS.DE_RISK_PREMIUM_THRESHOLD)) * CONSTANTS.DE_RISK_PREMIUM_RATE;
    const distressPremium = state.cash < 0 ? CONSTANTS.DISTRESS_PREMIUM_RATE : 0;
    const interestRate = Math.min(CONSTANTS.MAX_INTEREST_RATE, baseRate + deRiskPremium + distressPremium);

    // Cap loan: don't let D/E exceed 3.0 from this loan alone (emergency ceiling)
    // Revenue-bearing teams get additional capacity: lenders consider revenue serviceability
    const revenueCapacity = Math.max(0, (state.revenue || 0) * CONSTANTS.LOAN_REVENUE_CAPACITY_MULTIPLIER);
    const equityCapacity = state.shareholdersEquity > 0
      ? Math.max(0, state.shareholdersEquity * CONSTANTS.LOAN_EQUITY_CAPACITY_MULTIPLIER - (state.shortTermDebt + state.longTermDebt))
      : 0;
    const maxDebtCapacity = Math.max(equityCapacity, revenueCapacity);
    const loanAmount = Math.min(targetAmount, maxDebtCapacity);

    if (loanAmount <= 0) {
      messages.push("Auto-loan skipped: no debt capacity (negative equity, no revenue)");
      return { amount: 0, interestRate, messages };
    }

    // Issue as short-term debt (12-month emergency loan)
    state.cash = safeNumber(state.cash + loanAmount);
    state.shortTermDebt = safeNumber(state.shortTermDebt + loanAmount);
    state.totalLiabilities = safeNumber(state.totalLiabilities + loanAmount);

    // Immediate interest charge for this round (1/12 of annual rate)
    const interestCharge = loanAmount * interestRate / 12;
    state.cash = safeNumber(state.cash - interestCharge);

    messages.push(
      `Auto-loan: $${(loanAmount / 1_000_000).toFixed(1)}M at ${(interestRate * 100).toFixed(1)}% ` +
      `(D/E premium: ${(deRiskPremium * 100).toFixed(1)}%` +
      `${distressPremium > 0 ? ', distress +3%' : ''})`
    );

    return { amount: loanAmount, interestRate, messages };
  }

  /**
   * Try to issue stock to raise equity.
   * Requires board approval via existing board vote system.
   *
   * Pricing: shares issued at current share price with dilution-based discount.
   * Dilution = newShares / (existingShares + newShares)
   * Price impact = 1 - dilution² × 2 (convex penalty — larger issuances get worse pricing)
   */
  private static tryAutoEquity(
    state: TeamState,
    targetRaise: number,
    ctx: EngineContext
  ): {
    raised: number;
    sharesIssued: number;
    dilutionPercent: number;
    boardVoteHeld: boolean;
    boardApproved: boolean | null;
    messages: string[];
  } {
    const messages: string[] = [];

    // Board approval required
    const ratios = FinanceModule.calculateRatios(state);
    const prob = FinanceModule.calculateProposalProbability("emergency_capital", state, ratios);
    const vote = FinanceModule.simulateBoardVote(prob, ctx.rng.finance);

    if (!vote.approved) {
      messages.push(`Board rejected emergency equity issuance: ${vote.message} (${prob.toFixed(0)}% odds)`);
      return {
        raised: 0, sharesIssued: 0, dilutionPercent: 0,
        boardVoteHeld: true, boardApproved: false, messages,
      };
    }

    // Calculate shares needed at current price with dilution discount
    const currentPrice = Math.max(1, state.sharePrice); // Floor at $1
    const existingShares = state.sharesIssued;

    // Cap dilution: max 20% of existing shares per round
    // Derived: 20% = typical secondary offering ceiling before major shareholder revolt
    const maxNewShares = Math.floor(existingShares * CONSTANTS.MAX_DILUTION_PER_ROUND);

    // Iteratively find share count (price drops as we issue more)
    let bestShares = 0;
    let bestProceeds = 0;

    // Descending search for smallest share count that raises enough
    for (let candidateShares = Math.min(maxNewShares, Math.ceil(targetRaise / currentPrice));
         candidateShares >= 1000;
         candidateShares = Math.floor(candidateShares * 0.8)) {
      const dilutionRatio = candidateShares / (existingShares + candidateShares);
      const priceImpact = Math.max(CONSTANTS.STOCK_ISSUE_PRICE_IMPACT_FLOOR, 1 - dilutionRatio * dilutionRatio * 2);
      const effectivePrice = currentPrice * priceImpact;
      const proceeds = candidateShares * effectivePrice;

      if (proceeds >= targetRaise) {
        // Found a count that raises enough — keep searching for a smaller one
        bestShares = candidateShares;
        bestProceeds = proceeds;
        // Continue loop to find a smaller share count that still suffices
      } else if (proceeds > bestProceeds) {
        // Can't raise enough yet, but track the best we've seen so far
        bestShares = candidateShares;
        bestProceeds = proceeds;
        break; // Smaller counts will raise even less, so stop
      } else {
        break; // Proceeds are shrinking, stop
      }
    }

    // If can't raise enough even with max shares, issue max
    if (bestShares <= 0) {
      bestShares = Math.min(maxNewShares, Math.max(1000, Math.ceil(targetRaise / currentPrice)));
      const dilutionRatio = bestShares / (existingShares + bestShares);
      const priceImpact = Math.max(CONSTANTS.STOCK_ISSUE_PRICE_IMPACT_FLOOR, 1 - dilutionRatio * dilutionRatio * 2);
      bestProceeds = bestShares * currentPrice * priceImpact;
    }

    const dilutionRatio = bestShares / (existingShares + bestShares);
    const dilutionPercent = dilutionRatio * 100;
    const effectivePrice = bestProceeds / bestShares;

    // Apply issuance
    state.cash = safeNumber(state.cash + bestProceeds);
    state.sharesIssued += bestShares;
    state.shareholdersEquity = safeNumber(state.shareholdersEquity + bestProceeds);

    // Update share price based on new share count
    if (state.sharesIssued > 0 && state.marketCap > 0) {
      state.sharePrice = safeNumber(state.marketCap / state.sharesIssued);
    }

    messages.push(
      `Emergency equity: ${bestShares.toLocaleString()} shares at $${effectivePrice.toFixed(2)} ` +
      `(${dilutionPercent.toFixed(1)}% dilution), raised $${(bestProceeds / 1_000_000).toFixed(1)}M ` +
      `(Board: ${vote.votesFor}-${vote.votesAgainst})`
    );

    return {
      raised: bestProceeds,
      sharesIssued: bestShares,
      dilutionPercent,
      boardVoteHeld: true,
      boardApproved: true,
      messages,
    };
  }
}
