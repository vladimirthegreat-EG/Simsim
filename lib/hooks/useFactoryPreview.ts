"use client";

import { useMemo } from "react";
import type { TeamState } from "@/engine/types";
import type { UIFactoryDecisions } from "@/lib/stores/decisionStore";
import { convertFactoryDecisions } from "@/lib/converters/decisionConverters";
import { FactoryModule } from "@/engine/modules/FactoryModule";
import { createEngineContext } from "@/engine/core/EngineContext";

export function useFactoryPreview(state: TeamState | null, decisions: UIFactoryDecisions) {
  return useMemo(() => {
    if (!state) return { previewState: null, result: null, costs: 0, messages: [] };
    try {
      const engineDecisions = convertFactoryDecisions(decisions, state);
      const ctx = createEngineContext("preview", state.round ?? 1, "preview");
      const { newState, result } = FactoryModule.process(state, engineDecisions, ctx);

      // G8: Surface expansion effects as preview messages
      const expansionMessages: string[] = [];
      const breakdowns = state.factoryExpansion?.activeBreakdowns ?? [];
      if (breakdowns.length > 0) {
        const penalty = Math.min(50, breakdowns.length * 10);
        expansionMessages.push(`${breakdowns.length} active breakdown(s) reducing production capacity by ${penalty}%`);
      }
      for (const [fId, maint] of Object.entries(state.factoryExpansion?.maintenance ?? {})) {
        if (maint.maintenanceEfficiency < 0.4) {
          expansionMessages.push(`Factory ${fId.slice(0, 6)}: maintenance efficiency ${(maint.maintenanceEfficiency * 100).toFixed(0)}% — high breakdown risk`);
        }
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
