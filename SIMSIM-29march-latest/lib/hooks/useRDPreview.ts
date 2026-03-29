"use client";

import { useMemo } from "react";
import type { TeamState } from "@/engine/types";
import type { UIRDDecisions } from "@/lib/stores/decisionStore";
import { convertRDDecisions } from "@/lib/converters/decisionConverters";
import { RDModule } from "@/engine/modules/RDModule";
import { createEngineContext } from "@/engine/core/EngineContext";

export function useRDPreview(state: TeamState | null, decisions: UIRDDecisions) {
  return useMemo(() => {
    if (!state) return { previewState: null, result: null, costs: 0, messages: [] };
    try {
      const engineDecisions = convertRDDecisions(decisions);
      const ctx = createEngineContext("preview", state.round ?? 1, "preview");
      const { newState, result } = RDModule.process(state, engineDecisions, ctx);

      // G8: Surface expansion effects as preview messages
      const expansionMessages: string[] = [];
      if (state.rdExpansion?.techTree) {
        const tt = state.rdExpansion.techTree;
        const active = tt.activeResearch?.length ?? 0;
        const unlocked = tt.unlockedTechs?.length ?? 0;
        if (active > 0) {
          expansionMessages.push(`${active} active research project(s) in progress`);
        }
        if (unlocked > 0) {
          expansionMessages.push(`${unlocked} technology(s) unlocked — providing quality/cost bonuses`);
        }
      }
      if (state.rdExpansion?.platforms) {
        const platforms = state.rdExpansion.platforms.platforms;
        for (const p of platforms) {
          if (p.costReduction > 0) {
            expansionMessages.push(`Platform "${p.name}" reduces unit cost by ${(p.costReduction * 100).toFixed(0)}% in ${p.developedSegments.join(", ")}`);
          }
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
