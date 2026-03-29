"use client";

import { useMemo } from "react";
import type { TeamState } from "@/engine/types";
import {
  getRdProgressToNextLevel,
  getActiveSegments,
  getOwnedMachineTypes,
  getEmployeeCounts,
  getWorkersRequired,
  getEngineersRequired,
} from "@/lib/utils/stateHelpers";
import { SEGMENT_MACHINERY } from "@/lib/config/machineryPrerequisites";

export function useModuleAttention(state: TeamState | null): Record<string, string | null> {
  return useMemo(() => {
    if (!state) return { factory: null, rnd: null, hr: null, finance: null, marketing: null };

    // Factory: missing required machines
    let factoryMsg: string | null = null;
    const activeSegments = getActiveSegments(state);
    const ownedMachines = new Set(getOwnedMachineTypes(state));
    let missingCount = 0;
    for (const segment of activeSegments) {
      const profile = SEGMENT_MACHINERY[segment];
      if (profile) {
        for (const m of profile.required) {
          if (!ownedMachines.has(m)) missingCount++;
        }
      }
    }
    if (missingCount > 0) {
      factoryMsg = `${missingCount} required machine${missingCount > 1 ? "s" : ""} missing for your segments`;
    }

    // R&D: progress to next level
    let rndMsg: string | null = null;
    const rdProgress = getRdProgressToNextLevel(state);
    if ((rdProgress.estimatedRounds ?? 0) > 3) {
      rndMsg = `R&D Level ${rdProgress.currentLevel} — ~${rdProgress.estimatedRounds} rounds to next. Consider increasing budget.`;
    }

    // HR: critical shortfalls
    let hrMsg: string | null = null;
    const counts = getEmployeeCounts(state);
    const workersReq = getWorkersRequired(state);
    const engineersReq = getEngineersRequired(state);
    const criticals: string[] = [];
    if (counts.workers < workersReq * 0.7) {
      criticals.push(`${workersReq - counts.workers} workers`);
    }
    if (counts.engineers < engineersReq) {
      criticals.push(`${engineersReq - counts.engineers} engineers`);
    }
    if (criticals.length > 0) {
      hrMsg = `Critical shortfall: ${criticals.join(", ")}`;
    }

    return {
      factory: factoryMsg,
      rnd: rndMsg,
      hr: hrMsg,
      finance: null,
      marketing: null,
    };
  }, [state]);
}
