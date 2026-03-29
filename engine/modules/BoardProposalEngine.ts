/**
 * Board Proposal Engine
 *
 * Generates context-aware board proposals each round (max 2: 1 financial + 1 strategic).
 * Proposals are binary yes/no decisions that teach governance concepts.
 * Unique to SIMSIM — Capsim/BSG don't have board governance.
 */

import type { TeamState } from "../types/state";

export interface BoardProposal {
  id: string;
  type: "financial" | "strategic";
  title: string;
  description: string;
  trigger: string; // Why this proposal appeared
  acceptLabel: string;
  declineLabel: string;
  /** Effect when accepted */
  effect: {
    cash?: number; // +/- cash
    debt?: number; // +/- debt
    esg?: number; // +/- ESG score
    rdPoints?: number; // +/- R&D points
    morale?: number; // +/- morale %
    brandValue?: number; // +/- brand
    salaryMultiplier?: number; // salary change (1.05 = +5%)
    newFactory?: boolean;
    dividendPerShare?: number;
    sharesBuyback?: number;
  };
}

export interface BoardProposalDecision {
  proposalId: string;
  accepted: boolean;
}

/**
 * Generate up to 2 context-aware board proposals based on current state.
 * Returns 1 financial + 1 strategic (or fewer if no triggers match).
 */
export function generateBoardProposals(state: TeamState, round: number): BoardProposal[] {
  const proposals: BoardProposal[] = [];

  // === FINANCIAL PROPOSALS (pick highest priority) ===
  const financialProposal = generateFinancialProposal(state, round);
  if (financialProposal) proposals.push(financialProposal);

  // === STRATEGIC PROPOSALS (pick highest priority) ===
  const strategicProposal = generateStrategicProposal(state, round);
  if (strategicProposal) proposals.push(strategicProposal);

  return proposals;
}

function generateFinancialProposal(state: TeamState, round: number): BoardProposal | null {
  const cash = state.cash ?? 0;
  const totalDebt = (state.shortTermDebt ?? 0) + (state.longTermDebt ?? 0);
  const equity = state.shareholdersEquity ?? 1;
  const deRatio = equity > 0 ? totalDebt / equity : 0;
  const revenue = state.revenue ?? 0;
  const netIncome = state.netIncome ?? 0;
  const profitMargin = revenue > 0 ? netIncome / revenue : 0;
  const sharePrice = state.sharePrice ?? 50;
  const sharesIssued = state.sharesIssued ?? 10_000_000;

  // Priority 1: Emergency — cash critically low
  if (cash < 10_000_000) {
    return {
      id: `board-fin-emergency-${round}`,
      type: "financial",
      title: "Emergency Capital Required",
      description: `Cash reserves are critically low at $${(cash / 1_000_000).toFixed(1)}M. The board recommends securing emergency funding to avoid operational disruption.`,
      trigger: "Cash below $10M",
      acceptLabel: "Accept Emergency Loan ($30M at 10% rate)",
      declineLabel: "Decline — Find Other Solutions",
      effect: { cash: 30_000_000, debt: 30_000_000 },
    };
  }

  // Priority 2: High debt — recommend repayment
  if (deRatio > 1.0 && cash > 25_000_000) {
    const repayAmount = Math.min(20_000_000, totalDebt * 0.2);
    return {
      id: `board-fin-debtrepay-${round}`,
      type: "financial",
      title: "Debt Repayment Recommended",
      description: `Debt-to-equity ratio is ${deRatio.toFixed(2)}x (above 1.0x covenant threshold). Board recommends paying down $${(repayAmount / 1_000_000).toFixed(0)}M to improve credit standing.`,
      trigger: `D/E ratio ${deRatio.toFixed(2)}x > 1.0x`,
      acceptLabel: `Pay Down $${(repayAmount / 1_000_000).toFixed(0)}M Debt`,
      declineLabel: "Decline — Keep Cash",
      effect: { cash: -repayAmount, debt: -repayAmount },
    };
  }

  // Priority 3: High profit + idle cash — recommend dividend
  if (profitMargin > 0.12 && cash > 80_000_000) {
    const suggestedDPS = Math.round(Math.min(3.0, (netIncome / sharesIssued) * 0.4) * 100) / 100;
    return {
      id: `board-fin-dividend-${round}`,
      type: "financial",
      title: "Shareholder Dividend Proposed",
      description: `Strong profitability (${(profitMargin * 100).toFixed(1)}% margin) with $${(cash / 1_000_000).toFixed(0)}M cash. Board recommends $${suggestedDPS.toFixed(2)}/share dividend to reward investors.`,
      trigger: "Profit margin > 12%, cash > $80M",
      acceptLabel: `Pay $${suggestedDPS.toFixed(2)}/Share Dividend`,
      declineLabel: "Decline — Retain Earnings",
      effect: { dividendPerShare: suggestedDPS },
    };
  }

  // Priority 4: Strong EPS growth — recommend buyback
  if (profitMargin > 0.08 && cash > 50_000_000 && sharePrice > 30) {
    return {
      id: `board-fin-buyback-${round}`,
      type: "financial",
      title: "Share Buyback Opportunity",
      description: `With healthy profits and $${(cash / 1_000_000).toFixed(0)}M cash, the board recommends a $25M stock buyback to boost EPS and share price.`,
      trigger: "Healthy profits, sufficient cash",
      acceptLabel: "Authorize $25M Buyback",
      declineLabel: "Decline — Preserve Cash",
      effect: { sharesBuyback: 25_000_000 },
    };
  }

  return null; // No financial proposal this round
}

function generateStrategicProposal(state: TeamState, round: number): BoardProposal | null {
  const esgScore = state.esgScore ?? 100;
  const brandValue = state.brandValue ?? 0.4;
  const avgMorale = state.workforce?.averageMorale ?? 70;
  const products = state.products ?? [];
  const launchedProducts = products.filter(p => p.developmentStatus === "launched");
  const factories = state.factories ?? [];
  const avgUtilization = factories.length > 0
    ? factories.reduce((sum, f) => sum + (f.utilization ?? 0), 0) / factories.length
    : 0;

  // Priority 1: Very low morale — emergency action
  if (avgMorale < 45) {
    return {
      id: `board-str-morale-${round}`,
      type: "strategic",
      title: "Employee Morale Crisis",
      description: `Average morale is ${avgMorale.toFixed(0)}% — risking mass turnover. Board recommends immediate 5% salary increase to stabilize workforce.`,
      trigger: `Morale ${avgMorale.toFixed(0)}% < 45%`,
      acceptLabel: "Approve 5% Emergency Raise",
      declineLabel: "Decline — Address Later",
      effect: { salaryMultiplier: 1.05, morale: 8 },
    };
  }

  // Priority 2: Low ESG — sustainability push
  if (esgScore < 150 && round >= 3) {
    return {
      id: `board-str-esg-${round}`,
      type: "strategic",
      title: "Sustainability Investment",
      description: `ESG score (${esgScore}) is below industry standards. Board recommends a $5M investment in sustainability initiatives to improve public perception.`,
      trigger: `ESG score ${esgScore} < 150`,
      acceptLabel: "Invest $5M in ESG",
      declineLabel: "Decline — Focus Elsewhere",
      effect: { cash: -5_000_000, esg: 100, brandValue: 0.02 },
    };
  }

  // Priority 3: Factory at capacity — expand
  if (avgUtilization > 0.85 && launchedProducts.length >= 2) {
    return {
      id: `board-str-expand-${round}`,
      type: "strategic",
      title: "Capacity Expansion",
      description: `Factory utilization is at ${(avgUtilization * 100).toFixed(0)}% — nearing capacity limits. Board recommends building a new factory ($50M) to support growth.`,
      trigger: `Utilization ${(avgUtilization * 100).toFixed(0)}% > 85%`,
      acceptLabel: "Build New Factory ($50M)",
      declineLabel: "Decline — Optimize Existing",
      effect: { cash: -50_000_000, newFactory: true },
    };
  }

  // Priority 4: Stale product lineup — R&D push
  const oldProducts = launchedProducts.filter(p => {
    const age = (p as unknown as Record<string, unknown>).age as number ?? 0;
    return age >= 3;
  });
  if (oldProducts.length > 0 && oldProducts.length >= launchedProducts.length * 0.5) {
    return {
      id: `board-str-rd-${round}`,
      type: "strategic",
      title: "Product Line Aging",
      description: `${oldProducts.length} of ${launchedProducts.length} products are aging. Board recommends a $10M R&D boost to accelerate new development.`,
      trigger: "50%+ products aging",
      acceptLabel: "Boost R&D ($10M)",
      declineLabel: "Decline — Current R&D Sufficient",
      effect: { cash: -10_000_000, rdPoints: 100 },
    };
  }

  // Priority 5: Low brand — marketing push
  if (brandValue < 0.3 && round >= 2) {
    return {
      id: `board-str-brand-${round}`,
      type: "strategic",
      title: "Brand Building Initiative",
      description: `Brand value is weak (${(brandValue * 100).toFixed(0)}%). Board recommends a $15M marketing campaign to strengthen market position.`,
      trigger: `Brand value ${(brandValue * 100).toFixed(0)}% < 30%`,
      acceptLabel: "Launch $15M Campaign",
      declineLabel: "Decline — Organic Growth",
      effect: { cash: -15_000_000, brandValue: 0.08 },
    };
  }

  return null; // No strategic proposal this round
}

/**
 * Apply accepted board proposals to team state.
 * Called during round processing in SimulationEngine.
 */
export function applyBoardDecisions(
  state: TeamState,
  decisions: BoardProposalDecision[],
  proposals: BoardProposal[]
): { messages: string[]; costs: number } {
  const messages: string[] = [];
  let costs = 0;

  for (const decision of decisions) {
    if (!decision.accepted) {
      messages.push(`Board proposal "${decision.proposalId}" declined`);
      continue;
    }

    const proposal = proposals.find(p => p.id === decision.proposalId);
    if (!proposal) continue;

    const effect = proposal.effect;

    if (effect.cash) {
      state.cash += effect.cash;
      if (effect.cash < 0) costs += Math.abs(effect.cash);
    }
    if (effect.debt) {
      if (effect.debt > 0) {
        state.shortTermDebt = (state.shortTermDebt ?? 0) + effect.debt;
        state.totalLiabilities += effect.debt;
      } else {
        // Pay down debt — reduce short-term first, then long-term
        let remaining = Math.abs(effect.debt);
        const stDebt = state.shortTermDebt ?? 0;
        const stReduce = Math.min(remaining, stDebt);
        state.shortTermDebt = (state.shortTermDebt ?? 0) - stReduce;
        remaining -= stReduce;
        if (remaining > 0) {
          state.longTermDebt = (state.longTermDebt ?? 0) - remaining;
        }
        state.totalLiabilities -= Math.abs(effect.debt);
      }
    }
    if (effect.esg) state.esgScore = Math.min(1000, (state.esgScore ?? 0) + effect.esg);
    if (effect.rdPoints) state.rdProgress = Math.min(2000, (state.rdProgress ?? 0) + effect.rdPoints);
    if (effect.morale) {
      for (const emp of state.employees ?? []) {
        emp.morale = Math.min(100, Math.max(0, emp.morale + effect.morale));
      }
    }
    if (effect.brandValue) state.brandValue = Math.min(1, Math.max(0, state.brandValue + effect.brandValue));
    if (effect.salaryMultiplier) {
      for (const emp of state.employees ?? []) {
        emp.salary = Math.round(emp.salary * effect.salaryMultiplier);
      }
    }

    messages.push(`Board proposal accepted: ${proposal.title}`);
  }

  return { messages, costs };
}
