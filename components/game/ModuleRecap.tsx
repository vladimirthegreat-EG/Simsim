"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Beaker,
  Factory,
  DollarSign,
  Users,
  Megaphone,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import type { TeamState } from "@/engine/types";

// =============================================================================
// Types
// =============================================================================

type ModuleName = "rnd" | "factory" | "finance" | "hr" | "marketing";

interface HistoryEntry {
  round: number;
  [key: string]: unknown;
  stateAfter?: string;
}

interface ModuleRecapProps {
  module: ModuleName;
  currentRound: number;
  state: TeamState | null;
  history: HistoryEntry[];
}

interface MetricDisplay {
  label: string;
  current: number | string;
  previous?: number | string;
  format?: "money" | "percent" | "number" | "string";
  sparkData?: number[];
  higherIsBetter?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatValue(value: number | string, format?: string): string {
  if (typeof value === "string") return value;
  switch (format) {
    case "money": {
      const abs = Math.abs(value);
      if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
      if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      return `$${value.toFixed(0)}`;
    }
    case "percent":
      return `${(typeof value === "number" ? value * 100 : 0).toFixed(1)}%`;
    case "number":
      return Math.round(value).toLocaleString();
    default:
      return String(value);
  }
}

function getDelta(current: number | string, previous?: number | string): number | null {
  if (typeof current !== "number" || typeof previous !== "number") return null;
  return current - previous;
}

function parseState(stateStr: string | undefined): TeamState | null {
  if (!stateStr) return null;
  try {
    return JSON.parse(stateStr) as TeamState;
  } catch {
    return null;
  }
}

const MODULE_ICONS: Record<ModuleName, React.ReactNode> = {
  rnd: <Beaker className="w-4 h-4 text-purple-400" />,
  factory: <Factory className="w-4 h-4 text-orange-400" />,
  finance: <DollarSign className="w-4 h-4 text-green-400" />,
  hr: <Users className="w-4 h-4 text-blue-400" />,
  marketing: <Megaphone className="w-4 h-4 text-pink-400" />,
};

const MODULE_LABELS: Record<ModuleName, string> = {
  rnd: "R&D",
  factory: "Factory",
  finance: "Finance",
  hr: "HR",
  marketing: "Marketing",
};

// =============================================================================
// Metric Extractors per Module
// =============================================================================

function extractMetrics(
  module: ModuleName,
  state: TeamState | null,
  prevState: TeamState | null,
  history: HistoryEntry[]
): MetricDisplay[] {
  if (!state) return [];

  // Build sparkline data from history
  const spark = (key: string): number[] =>
    history.slice(-5).map((h) => {
      const s = parseState(h.stateAfter as string | undefined);
      if (!s) return 0;
      return (s as unknown as Record<string, number>)[key] ?? 0;
    });

  switch (module) {
    case "rnd": {
      const launched = state.products?.filter((p) => p.developmentStatus === "launched").length ?? 0;
      const prevLaunched = prevState?.products?.filter((p) => p.developmentStatus === "launched").length ?? 0;
      const techs = state.unlockedTechnologies?.length ?? 0;
      const prevTechs = prevState?.unlockedTechnologies?.length ?? 0;
      const patents = Array.isArray(state.patents) ? state.patents.length : 0;
      const prevPatents = Array.isArray(prevState?.patents) ? prevState.patents.length : 0;
      return [
        { label: "Products", current: launched, previous: prevLaunched, format: "number", higherIsBetter: true },
        { label: "R&D Budget", current: state.rdBudget ?? 0, previous: prevState?.rdBudget ?? 0, format: "money", sparkData: spark("rdBudget") },
        { label: "Tech Level", current: techs, previous: prevTechs, format: "number", higherIsBetter: true },
        { label: "Patents", current: patents, previous: prevPatents, format: "number", higherIsBetter: true },
      ];
    }

    case "factory": {
      const capacity = state.factories?.reduce((sum, f) =>
        sum + (f.productionLines ?? []).reduce((lsum, l) => lsum + (l.capacity ?? 0), 0), 0) ?? 0;
      const prevCapacity = prevState?.factories?.reduce((sum, f) =>
        sum + (f.productionLines ?? []).reduce((lsum, l) => lsum + (l.capacity ?? 0), 0), 0) ?? 0;
      const efficiency = state.workforce?.averageEfficiency ?? 0;
      const prevEfficiency = prevState?.workforce?.averageEfficiency ?? 0;
      const machines = Object.values(state.machineryStates ?? {}).reduce(
        (sum, ms) => sum + (ms.machines?.length ?? 0), 0);
      const prevMachines = Object.values(prevState?.machineryStates ?? {}).reduce(
        (sum, ms) => sum + (ms.machines?.length ?? 0), 0);
      return [
        { label: "Capacity", current: capacity, previous: prevCapacity, format: "number", higherIsBetter: true },
        { label: "Efficiency", current: efficiency / 100, previous: prevEfficiency / 100, format: "percent", higherIsBetter: true, sparkData: spark("workforce") },
        { label: "Machines", current: machines, previous: prevMachines, format: "number", higherIsBetter: true },
        { label: "Factories", current: state.factories?.length ?? 0, format: "number" },
      ];
    }

    case "finance": {
      const cash = state.cash ?? 0;
      const prevCash = prevState?.cash ?? 0;
      const revenue = state.revenue ?? 0;
      const prevRevenue = prevState?.revenue ?? 0;
      const netIncome = state.netIncome ?? 0;
      const prevNetIncome = prevState?.netIncome ?? 0;
      return [
        { label: "Cash", current: cash, previous: prevCash, format: "money", higherIsBetter: true, sparkData: spark("cash") },
        { label: "Revenue", current: revenue, previous: prevRevenue, format: "money", higherIsBetter: true, sparkData: spark("revenue") },
        { label: "Net Income", current: netIncome, previous: prevNetIncome, format: "money", higherIsBetter: true },
        { label: "EPS", current: state.eps ?? 0, previous: prevState?.eps ?? 0, format: "money", higherIsBetter: true },
      ];
    }

    case "hr": {
      const headcount = state.workforce?.totalHeadcount ?? state.employees?.length ?? 0;
      const prevHeadcount = prevState?.workforce?.totalHeadcount ?? prevState?.employees?.length ?? 0;
      const morale = (state.workforce?.averageMorale ?? 0) / 100;
      const prevMorale = (prevState?.workforce?.averageMorale ?? 0) / 100;
      const turnover = state.workforce?.turnoverRate ?? 0;
      const prevTurnover = prevState?.workforce?.turnoverRate ?? 0;
      return [
        { label: "Headcount", current: headcount, previous: prevHeadcount, format: "number", higherIsBetter: true },
        { label: "Morale", current: morale, previous: prevMorale, format: "percent", higherIsBetter: true },
        { label: "Turnover", current: turnover, previous: prevTurnover, format: "percent", higherIsBetter: false },
        { label: "Labor Cost", current: state.workforce?.laborCost ?? 0, previous: prevState?.workforce?.laborCost ?? 0, format: "money", higherIsBetter: false },
      ];
    }

    case "marketing": {
      const brand = state.brandValue ?? 0;
      const prevBrand = prevState?.brandValue ?? 0;
      const esg = state.esgScore ?? 0;
      const prevEsg = prevState?.esgScore ?? 0;
      const totalShare = Object.values(state.marketShare ?? {}).reduce((s, v) => s + v, 0);
      const prevTotalShare = Object.values(prevState?.marketShare ?? {}).reduce((s, v) => s + v, 0);
      // Get top segment
      const topSegment = Object.entries(state.marketShare ?? {})
        .sort(([, a], [, b]) => b - a)[0];
      return [
        { label: "Brand", current: brand, previous: prevBrand, format: "percent", higherIsBetter: true, sparkData: spark("brandValue") },
        { label: "Total Share", current: totalShare, previous: prevTotalShare, format: "percent", higherIsBetter: true },
        { label: "Top Segment", current: topSegment ? `${topSegment[0]} ${(topSegment[1] * 100).toFixed(1)}%` : "—", format: "string" },
        { label: "ESG Score", current: esg, previous: prevEsg, format: "number", higherIsBetter: true },
      ];
    }
  }
}

// =============================================================================
// Component
// =============================================================================

export function ModuleRecap({ module, currentRound, state, history }: ModuleRecapProps) {
  const [expanded, setExpanded] = useState(false);

  // Get previous round state from history
  const prevState = useMemo(() => {
    if (history.length < 1) return null;
    const sorted = [...history].sort((a, b) => b.round - a.round);
    return parseState(sorted[0]?.stateAfter as string | undefined);
  }, [history]);

  const metrics = useMemo(
    () => extractMetrics(module, state, prevState, history),
    [module, state, prevState, history]
  );

  // Round 1 — no recap data
  if (currentRound <= 1 || metrics.length === 0) return null;

  return (
    <Card className="bg-slate-800/40 border-slate-700/30 mb-3">
      <CardHeader
        className="pb-0 pt-3 px-4 cursor-pointer hover:bg-slate-700/20 rounded-t-lg transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="text-xs font-medium text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {MODULE_ICONS[module]}
            <span>Last Round — {MODULE_LABELS[module]}</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          )}
        </CardTitle>
      </CardHeader>

      {/* Collapsed: inline metric summary */}
      {!expanded && (
        <CardContent className="px-4 pb-3 pt-2">
          <div className="flex items-center gap-4 flex-wrap">
            {metrics.slice(0, 4).map((m) => {
              const delta = getDelta(m.current, m.previous);
              return (
                <div key={m.label} className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500">{m.label}:</span>
                  <span className="text-slate-200 font-medium tabular-nums">
                    {formatValue(m.current, m.format)}
                  </span>
                  {delta !== null && delta !== 0 && (
                    <DeltaBadge delta={delta} format={m.format} higherIsBetter={m.higherIsBetter} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}

      {/* Expanded: detailed grid with sparklines */}
      {expanded && (
        <CardContent className="px-4 pb-3 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map((m) => {
              const delta = getDelta(m.current, m.previous);
              return (
                <div key={m.label} className="p-2 bg-slate-700/30 rounded-lg">
                  <div className="text-[10px] text-slate-500 mb-1">{m.label}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm text-slate-200 font-medium tabular-nums">
                      {formatValue(m.current, m.format)}
                    </span>
                    {delta !== null && delta !== 0 && (
                      <DeltaBadge delta={delta} format={m.format} higherIsBetter={m.higherIsBetter} />
                    )}
                  </div>
                  {m.sparkData && m.sparkData.length > 1 && (
                    <div className="h-6 mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={m.sparkData.map((v, i) => ({ v, i }))}>
                          <YAxis domain={["auto", "auto"]} hide />
                          <Line
                            type="monotone"
                            dataKey="v"
                            stroke="#94a3b8"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// Delta Badge
// =============================================================================

function DeltaBadge({
  delta,
  format,
  higherIsBetter = true,
}: {
  delta: number;
  format?: string;
  higherIsBetter?: boolean;
}) {
  const isPositive = delta > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const colorClass = isGood ? "text-emerald-400" : "text-red-400";
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  let displayDelta: string;
  if (format === "money") {
    const abs = Math.abs(delta);
    if (abs >= 1_000_000) displayDelta = `${delta > 0 ? "+" : ""}${(delta / 1_000_000).toFixed(1)}M`;
    else if (abs >= 1_000) displayDelta = `${delta > 0 ? "+" : ""}${(delta / 1_000).toFixed(0)}K`;
    else displayDelta = `${delta > 0 ? "+" : ""}${delta.toFixed(0)}`;
  } else if (format === "percent") {
    displayDelta = `${delta > 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`;
  } else {
    displayDelta = `${delta > 0 ? "+" : ""}${delta}`;
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] ${colorClass}`}>
      <Icon className="w-2.5 h-2.5" />
      {displayDelta}
    </span>
  );
}
