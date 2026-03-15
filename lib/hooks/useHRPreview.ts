"use client";

import { useMemo } from "react";
import type { TeamState } from "@/engine/types";
import type { UIHRDecisions } from "@/lib/stores/decisionStore";
import { convertHRDecisions } from "@/lib/converters/decisionConverters";
import { HRModule } from "@/engine/modules/HRModule";
import { createEngineContext } from "@/engine/core/EngineContext";

export function useHRPreview(state: TeamState | null, decisions: UIHRDecisions) {
  return useMemo(() => {
    if (!state) return { previewState: null, result: null, costs: 0, messages: [] };
    try {
      const engineDecisions = convertHRDecisions(decisions);
      const ctx = createEngineContext("preview", state.round ?? 1, "preview");
      const { newState, result } = HRModule.process(state, engineDecisions, ctx);

      // G8: Surface expansion effects as preview messages
      const expansionMessages: string[] = [];
      if (state.hrExpansion?.teamDynamics) {
        const td = state.hrExpansion.teamDynamics;
        if (td.conflictLevel > 50) {
          expansionMessages.push(`High team conflict (${td.conflictLevel}/100) — reducing productivity`);
        }
        if (td.cohesion > 70) {
          expansionMessages.push(`Strong team cohesion (${td.cohesion}/100) — boosting efficiency`);
        }
      }
      if (state.hrExpansion?.hiringPipeline) {
        const hp = state.hrExpansion.hiringPipeline;
        const pipelineSize = hp.candidatesInPipeline?.length ?? 0;
        if (pipelineSize > 0) {
          expansionMessages.push(`${pipelineSize} candidate(s) in hiring pipeline`);
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
