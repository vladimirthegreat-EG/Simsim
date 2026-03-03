"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useBudgetSummary } from "@/lib/hooks/useBudgetSummary";
import { CheckCircle2, ChevronDown, ChevronUp, DollarSign } from "lucide-react";

interface BudgetBarProps {
  startingCash: number;
  currentRound: number;
}

function formatMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function BudgetBar({ startingCash, currentRound }: BudgetBarProps) {
  const { modules, remaining } = useBudgetSummary(startingCash);
  const [expanded, setExpanded] = useState(false);

  const remainingPercent = startingCash > 0 ? remaining / startingCash : 1;
  const remainingColor = useMemo(() => {
    if (remaining < 0) return "text-red-400";
    if (remainingPercent < 0.1) return "text-red-400";
    if (remainingPercent < 0.2) return "text-amber-400";
    return "text-emerald-400";
  }, [remaining, remainingPercent]);

  const bgColor = useMemo(() => {
    if (remaining < 0) return "bg-red-500/5 border-red-500/20";
    if (remainingPercent < 0.1) return "bg-red-500/5 border-red-500/20";
    if (remainingPercent < 0.2) return "bg-amber-500/5 border-amber-500/20";
    return "bg-slate-800/80 border-slate-700/50";
  }, [remaining, remainingPercent]);

  return (
    <div className={cn("border-b backdrop-blur-sm transition-colors", bgColor)}>
      {/* Compact row — always visible */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Round {currentRound}</span>
        </div>

        <div className="hidden md:flex items-center gap-1 text-xs text-slate-500 shrink-0">
          <span>{formatMoney(startingCash)}</span>
        </div>

        {/* Module cost chips */}
        <div className="hidden md:flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
          {modules.map((m) => (
            <ModuleChip key={m.module} entry={m} />
          ))}
        </div>

        {/* Remaining — always visible */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <span className="text-xs text-slate-400">Remaining:</span>
          <span className={cn("text-sm font-bold tabular-nums", remainingColor)}>
            {formatMoney(remaining)}
          </span>
        </div>

        {/* Mobile expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="md:hidden p-1 text-slate-400 hover:text-white transition-colors"
          type="button"
          aria-label={expanded ? "Collapse budget" : "Expand budget"}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Mobile expanded view */}
      {expanded && (
        <div className="md:hidden px-4 pb-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Starting Cash</span>
            <span className="text-slate-300 tabular-nums">{formatMoney(startingCash)}</span>
          </div>
          {modules.map((m) => (
            <div key={m.module} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                {m.status === "submitted" && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                <span className={m.status === "pending" ? "text-slate-500" : "text-slate-300"}>
                  {m.label}
                </span>
              </div>
              <span className={cn("tabular-nums", getCostColor(m))}>
                {m.status === "pending" ? "—" : formatCostValue(m.cost)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleChip({ entry }: { entry: { module: string; label: string; cost: number; status: string } }) {
  if (entry.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-700/40 text-slate-500">
        {entry.label}: —
      </span>
    );
  }

  if (entry.status === "estimate") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] tabular-nums bg-cyan-500/10 text-cyan-300">
        {entry.label}: {formatCostValue(entry.cost)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] tabular-nums",
        entry.status === "submitted"
          ? "bg-blue-500/10 text-blue-300"
          : "bg-yellow-500/10 text-yellow-300"
      )}
    >
      {entry.label}: {formatCostValue(entry.cost)}
      {entry.status === "submitted" && <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />}
    </span>
  );
}

function formatCostValue(cost: number): string {
  if (cost === 0) return "$0";
  const prefix = cost > 0 ? "+" : "-";
  return `${prefix}${formatMoney(Math.abs(cost))}`;
}

function getCostColor(m: { cost: number; status: string }): string {
  if (m.status === "pending") return "text-slate-500";
  if (m.cost > 0) return "text-emerald-400";
  if (m.cost < 0) return "text-red-300";
  return "text-slate-400";
}
