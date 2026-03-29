"use client";

import { useMemo } from "react";
import type { TeamState } from "@/engine/types";
import { getWorkersRequired, getEngineersRequired, getEmployeeCounts } from "@/lib/utils/stateHelpers";

export interface ModuleWarning {
  severity: "critical" | "warning";
  message: string;
  targetModule?: string;
}

export function useCrossModuleWarnings(
  state: TeamState | null,
  currentModule: string
): ModuleWarning[] {
  return useMemo(() => {
    if (!state) return [];
    const warnings: ModuleWarning[] = [];
    const counts = getEmployeeCounts(state);

    if (currentModule === "factory") {
      // Worker shortfall
      const workersRequired = getWorkersRequired(state);
      if (counts.workers < workersRequired) {
        const shortfall = workersRequired - counts.workers;
        warnings.push({
          severity: "critical",
          message: `Need ${shortfall} more workers. Go to HR.`,
          targetModule: "hr",
        });
      }

      // Engineer shortfall
      const engineersRequired = getEngineersRequired(state);
      if (counts.engineers < engineersRequired) {
        warnings.push({
          severity: "warning",
          message: `Only ${counts.engineers}/${engineersRequired} engineers.`,
          targetModule: "hr",
        });
      }
    }

    if (currentModule === "hr") {
      // Morale check
      const morale = state.workforce?.averageMorale ?? 50;
      if (morale < 40) {
        warnings.push({
          severity: "critical",
          message: "Morale critically low. Risk of strike.",
        });
      }

      // Turnover check
      const turnoverRate = state.workforce?.turnoverRate ?? 0;
      if (turnoverRate > 0.20) {
        const lostNext = Math.round(counts.total * turnoverRate);
        warnings.push({
          severity: "warning",
          message: `Turnover ${(turnoverRate * 100).toFixed(0)}%. Losing ~${lostNext} employees next round.`,
        });
      }
    }

    if (currentModule === "finance") {
      // Cash check
      if ((state.cash ?? 0) < 20_000_000) {
        warnings.push({
          severity: "critical",
          message: "Cash below $20M. Insolvency risk.",
        });
      }

      // Debt check
      const totalLiabilities = ((state as any).debt ?? 0) + ((state as any).loans?.reduce((s: number, l: any) => s + l.amount, 0) ?? 0);
      const totalAssets = (state.cash ?? 0) + (state.factories?.reduce((s: number, f: any) => s + (f.value ?? 0), 0) ?? 0);
      if (totalAssets > 0 && totalLiabilities > totalAssets * 0.7) {
        const ratio = ((totalLiabilities / totalAssets) * 100).toFixed(0);
        warnings.push({
          severity: "warning",
          message: `Debt-to-asset ratio at ${ratio}%.`,
        });
      }
    }

    if (currentModule === "marketing") {
      // Brand check
      if ((state.brandValue ?? 0) < 0.15) {
        warnings.push({
          severity: "warning",
          message: "Brand critically weak.",
        });
      }
    }

    if (currentModule === "rnd" || currentModule === "rd") {
      // R&D budget check
      if ((state.rdBudget ?? 0) < 2_000_000) {
        warnings.push({
          severity: "warning",
          message: "R&D budget very low. Minimal tech progress.",
        });
      }
    }

    return warnings;
  }, [state, currentModule]);
}
