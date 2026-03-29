"use client";

import { useMemo } from "react";
import type { TeamState } from "@/engine/types";
import type { UIMarketingDecisions } from "@/lib/stores/decisionStore";
import { convertMarketingDecisions } from "@/lib/converters/decisionConverters";
import { MarketingModule } from "@/engine/modules/MarketingModule";

export function useMarketingPreview(state: TeamState | null, decisions: UIMarketingDecisions) {
  return useMemo(() => {
    if (!state) return { previewState: null, result: null, costs: 0, messages: [] };
    try {
      const engineDecisions = convertMarketingDecisions(decisions);
      const { newState, result } = MarketingModule.process(state, engineDecisions);

      // G8: Surface expansion effects as preview messages
      const expansionMessages: string[] = [];
      if (state.marketingExpansion?.performanceMarketing) {
        const pm = state.marketingExpansion.performanceMarketing;
        const activeSegments = Object.entries(pm.currentBoost)
          .filter(([, v]) => v > 0)
          .map(([seg]) => seg);
        if (activeSegments.length > 0) {
          expansionMessages.push(`Performance marketing active in: ${activeSegments.join(", ")}`);
        }
        if (pm.effectiveness < 0.3) {
          expansionMessages.push("Low marketing effectiveness — consider adjusting channel mix");
        }
      }
      if (state.marketingExpansion?.competitorActions?.length) {
        expansionMessages.push(`${state.marketingExpansion.competitorActions.length} competitor action(s) detected`);
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
  }, [state, decisions]);
}
