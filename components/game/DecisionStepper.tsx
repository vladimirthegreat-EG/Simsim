"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDecisionStore, GameModule } from "@/lib/stores/decisionStore";
import { useBudgetSummary } from "@/lib/hooks/useBudgetSummary";
import { useComplexity } from "@/lib/contexts/ComplexityContext";
import type { GameComplexitySettings } from "@/engine/types";
import {
  CheckCircle2,
  Lightbulb,
  Factory,
  DollarSign,
  Users,
  Megaphone,
  AlertTriangle,
} from "lucide-react";

interface DecisionStepperProps {
  gameId: string;
  startingCash: number;
}

interface StepDef {
  key: GameModule;
  label: string;
  shortLabel: string;
  narrative: string;
  icon: typeof Lightbulb;
  path: string;
  color: string;
}

const STEPS: StepDef[] = [
  { key: "RD", label: "Design", shortLabel: "R&D", narrative: "Design", icon: Lightbulb, path: "/rnd", color: "text-purple-400" },
  { key: "FACTORY", label: "Build", shortLabel: "Factory", narrative: "Build", icon: Factory, path: "/factory", color: "text-orange-400" },
  { key: "HR", label: "Staff", shortLabel: "HR", narrative: "Staff", icon: Users, path: "/hr", color: "text-blue-400" },
  { key: "FINANCE", label: "Fund", shortLabel: "Finance", narrative: "Fund", icon: DollarSign, path: "/finance", color: "text-green-400" },
  { key: "MARKETING", label: "Sell", shortLabel: "Marketing", narrative: "Sell", icon: Megaphone, path: "/marketing", color: "text-pink-400" },
];

// The expected submission order: Design → Build → Staff → Fund → Sell
const STEP_ORDER: GameModule[] = ["RD", "FACTORY", "HR", "FINANCE", "MARKETING"];

function formatCost(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`;
  if (abs === 0) return "";
  return `$${abs.toFixed(0)}`;
}

export function DecisionStepper({ gameId, startingCash }: DecisionStepperProps) {
  const pathname = usePathname();
  const submissionStatus = useDecisionStore((s) => s.submissionStatus);
  const { modules: costModules } = useBudgetSummary(startingCash);
  const basePath = gameId === "demo" ? "/demo" : `/game/${gameId}`;

  // Check for out-of-order navigation
  const currentModuleId = STEPS.find((s) => pathname.startsWith(`${basePath}${s.path}`))?.key ?? null;
  const isOutOfOrder = (() => {
    if (!currentModuleId) return false;
    const currentIdx = STEP_ORDER.indexOf(currentModuleId);
    if (currentIdx < 0) return false;
    // Check if any prior step hasn't been submitted
    for (let i = 0; i < currentIdx; i++) {
      const s = submissionStatus[STEP_ORDER[i]];
      if (!s.isSubmitted) return true;
    }
    return false;
  })();

  // Find the first unsubmitted step for the "Go to X" link
  const firstUnsubmitted = STEP_ORDER.find((k) => !submissionStatus[k].isSubmitted);
  const firstUnsubmittedStep = STEPS.find((s) => s.key === firstUnsubmitted);

  return (
    <div className="border-b border-slate-700/50 bg-slate-800/40">
      {/* Stepper row */}
      <div className="flex items-center justify-center gap-1 px-4 py-2 overflow-x-auto">
        {STEPS.map((step, i) => {
          const status = submissionStatus[step.key];
          const isActive = pathname.startsWith(`${basePath}${step.path}`);
          const costEntry = costModules.find((c) => c.module === step.key);
          const cost = costEntry?.cost ?? 0;

          // Is this step out of order? (submitted before a prior step)
          const isSkipped = (() => {
            if (!status.isSubmitted && !status.isDirty) return false;
            const idx = STEP_ORDER.indexOf(step.key);
            for (let j = 0; j < idx; j++) {
              if (!submissionStatus[STEP_ORDER[j]].isSubmitted) return true;
            }
            return false;
          })();

          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center">
              <Link
                href={`${basePath}${step.path}`}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all text-xs",
                  isActive
                    ? "bg-slate-700 text-white ring-1 ring-slate-500/50"
                    : status?.isSubmitted && !status?.isDirty
                    ? "text-slate-300 hover:bg-slate-700/50"
                    : "text-slate-500 hover:bg-slate-700/30 hover:text-slate-300"
                )}
              >
                {/* Status indicator */}
                {status?.isSubmitted && !status?.isDirty ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : isSkipped ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive && step.color)} />
                )}

                {/* Step label */}
                <span className="hidden sm:inline font-medium">{step.label}</span>
                <span className="sm:hidden font-medium">{step.shortLabel}</span>

                {/* Cost chip */}
                {status?.isSubmitted && cost !== 0 && (
                  <span className={cn(
                    "text-[10px] tabular-nums",
                    cost > 0 ? "text-emerald-400" : "text-slate-400"
                  )}>
                    {cost > 0 ? "+" : "-"}{formatCost(cost)}
                  </span>
                )}
              </Link>

              {/* Arrow separator */}
              {i < STEPS.length - 1 && (
                <span className="text-slate-600 mx-0.5 text-xs hidden sm:inline">&rarr;</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Out-of-order warning banner */}
      {isOutOfOrder && firstUnsubmittedStep && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/20 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-amber-200">
            You haven&apos;t submitted {firstUnsubmittedStep.shortLabel} decisions yet. We recommend completing in order: Design &rarr; Build &rarr; Source &rarr; Staff &rarr; Fund &rarr; Sell.
          </span>
          <Link
            href={`${basePath}${firstUnsubmittedStep.path}`}
            className="text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap ml-auto"
          >
            Go to {firstUnsubmittedStep.shortLabel} &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

// Map GameModule keys to complexity module keys
const MODULE_TO_COMPLEXITY: Record<GameModule, keyof GameComplexitySettings["modules"]> = {
  RD: "rd",
  FACTORY: "factory",
  FINANCE: "finance",
  HR: "hr",
  MARKETING: "marketing",
};

/**
 * Check if all *enabled* modules are submitted (complexity-aware).
 * In Simple mode HR and Finance are disabled, so only RD + FACTORY + MARKETING are checked.
 */
export function useAllModulesSubmitted(): boolean {
  const status = useDecisionStore((s) => s.submissionStatus);
  const { isModuleEnabled } = useComplexity();
  return STEP_ORDER
    .filter((k) => isModuleEnabled(MODULE_TO_COMPLEXITY[k]))
    .every((k) => status[k].isSubmitted);
}
