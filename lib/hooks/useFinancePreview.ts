"use client";

import { useMemo } from "react";
import type { TeamState } from "@/engine/types";
import type { MarketState } from "@/engine/types/market";
import type { UIFinanceDecisions } from "@/lib/stores/decisionStore";
import { convertFinanceDecisions } from "@/lib/converters/decisionConverters";
import { FinanceModule } from "@/engine/modules/FinanceModule";

export function useFinancePreview(
  state: TeamState | null,
  decisions: UIFinanceDecisions,
  marketState: MarketState | null
) {
  return useMemo(() => {
    if (!state || !marketState) return { previewState: null, result: null, costs: 0, messages: [] };
    try {
      const engineDecisions = convertFinanceDecisions(decisions);

      // G8: Apply credit rating spread to interest rate for preview
      let effectiveMarketState = marketState;
      const creditSpread = state.financeExpansion?.creditRating?.interestSpread;
      if (creditSpread && creditSpread !== 0) {
        effectiveMarketState = {
          ...marketState,
          interestRates: {
            ...marketState.interestRates,
            corporateBond: marketState.interestRates.corporateBond + creditSpread * 100,
          },
        };
      }

      const { newState, result } = FinanceModule.process(state, engineDecisions, effectiveMarketState);

      // G8: Surface expansion effects as preview messages
      const expansionMessages: string[] = [];
      if (state.financeExpansion?.creditRating) {
        const cr = state.financeExpansion.creditRating;
        expansionMessages.push(`Credit rating: ${cr.rating} (${cr.outlook} outlook)`);
        if (cr.interestSpread > 0) {
          expansionMessages.push(`Credit spread adds +${(cr.interestSpread * 100).toFixed(1)}% to interest rates`);
        }
      }
      if (state.financeExpansion?.investorSentiment) {
        const is = state.financeExpansion.investorSentiment;
        expansionMessages.push(`Investor sentiment: ${is.overall}/100 (${is.accessToCapital} capital access)`);
      }

      return {
        previewState: newState,
        result,
        costs: result.costs,
        messages: [...result.messages, ...expansionMessages],
      };
    } catch {
      return { previewState: null, result: null, costs: 0, messages: [] };
    }
  }, [state, decisions, marketState]);
}
