"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, AlertTriangle, Trophy, Star, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamState } from "@/engine/types/state";

interface CompetitorRanking {
  teamName: string;
  rank: number;
  marketShare: number;
  revenue: number;
  isCurrentTeam?: boolean;
}

interface RoundResultsModalProps {
  state: TeamState;
  previousState: TeamState | null;
  currentRound: number;
  teamName: string;
  competitorRankings: CompetitorRanking[];
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

function calcDelta(current: number, previous: number): { percent: number; direction: "up" | "down" | "flat" } {
  if (previous === 0) return { percent: 0, direction: "flat" };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { percent: pct, direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

function DeltaBadge({ current, previous, isCurrency }: { current: number; previous: number; isCurrency?: boolean }) {
  const { percent, direction } = calcDelta(current, previous);
  if (direction === "flat") return null;

  const isUp = direction === "up";
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
      isUp ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
    )}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? "+" : ""}{percent.toFixed(1)}%
    </span>
  );
}

export function RoundResultsModal({
  state,
  previousState,
  currentRound,
  teamName,
  competitorRankings,
  onClose,
}: RoundResultsModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  // Calculate total market share
  const totalMarketShare = state.marketShare
    ? Object.values(state.marketShare).reduce((a, b) => a + b, 0) /
      Math.max(1, Object.keys(state.marketShare).length)
    : 0;

  const prevTotalMarketShare = previousState?.marketShare
    ? Object.values(previousState.marketShare).reduce((a, b) => a + b, 0) /
      Math.max(1, Object.keys(previousState.marketShare).length)
    : 0;

  // Current rank
  const currentRank = competitorRankings.find((r) => r.isCurrentTeam)?.rank ?? 0;

  // Key changes: metrics that changed more than 10%
  const keyChanges: { label: string; current: number; previous: number; isCurrency?: boolean }[] = [];
  if (previousState) {
    const checks = [
      { label: "Revenue", current: state.revenue, previous: previousState.revenue, isCurrency: true },
      { label: "Net Income", current: state.netIncome, previous: previousState.netIncome, isCurrency: true },
      { label: "Cash", current: state.cash, previous: previousState.cash, isCurrency: true },
      { label: "Brand Value", current: state.brandValue, previous: previousState.brandValue },
      { label: "ESG Score", current: state.esgScore, previous: previousState.esgScore },
      { label: "Market Share", current: totalMarketShare, previous: prevTotalMarketShare },
    ];
    for (const c of checks) {
      if (c.previous === 0) continue;
      const pct = Math.abs((c.current - c.previous) / Math.abs(c.previous)) * 100;
      if (pct > 10) keyChanges.push(c);
    }
  }

  // Best selling product
  const bestProduct = state.products
    ?.filter((p) => p.developmentStatus === "launched")
    .sort((a, b) => (b.price * (b.quality || 1)) - (a.price * (a.quality || 1)))[0];

  // Warning alerts
  const warnings: string[] = [];
  if (state.cash < 500_000) warnings.push("Low cash reserves - consider raising capital");
  if (state.workforce?.averageMorale !== undefined && state.workforce.averageMorale < 40)
    warnings.push("Low employee morale - risk of turnover");
  if (state.materials && state.materials.inventory.some((m) => m.quantity < 10))
    warnings.push("Material shortage detected - check supply chain");

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200",
        isVisible ? "bg-black/70 backdrop-blur-sm" : "bg-black/0"
      )}
      onClick={handleClose}
    >
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-600/50 bg-slate-800 shadow-2xl transition-all duration-200",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-800 border-b border-slate-700 px-6 py-4 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">Round {currentRound} Results</h2>
            <p className="text-sm text-slate-400">{teamName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Core Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-700/50 border border-slate-600/30">
              <p className="text-xs text-slate-400 mb-1">Revenue</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(state.revenue)}</p>
              {previousState && (
                <DeltaBadge current={state.revenue} previous={previousState.revenue} isCurrency />
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-700/50 border border-slate-600/30">
              <p className="text-xs text-slate-400 mb-1">Net Income</p>
              <p className={cn(
                "text-lg font-bold",
                state.netIncome >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {formatCurrency(state.netIncome)}
              </p>
              {previousState && (
                <DeltaBadge current={state.netIncome} previous={previousState.netIncome} isCurrency />
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-700/50 border border-slate-600/30">
              <p className="text-xs text-slate-400 mb-1">Market Share</p>
              <p className="text-lg font-bold text-blue-400">{(totalMarketShare * 100).toFixed(1)}%</p>
              {currentRank > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                  <Trophy className="w-3 h-3" />
                  Rank #{currentRank}
                </span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-700/50 border border-slate-600/30">
              <p className="text-xs text-slate-400 mb-1">Cash</p>
              <p className="text-lg font-bold text-white">{formatCurrency(state.cash)}</p>
              {previousState && (
                <DeltaBadge current={state.cash} previous={previousState.cash} isCurrency />
              )}
            </div>
          </div>

          {/* Key Changes (>10% shift) */}
          {keyChanges.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                <Star className="w-4 h-4" />
                Key Changes
              </h3>
              <div className="space-y-1.5">
                {keyChanges.map((change) => {
                  const { percent, direction } = calcDelta(change.current, change.previous);
                  const isUp = direction === "up";
                  return (
                    <div
                      key={change.label}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm",
                        isUp ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                      )}
                    >
                      <span className="text-slate-300">{change.label}</span>
                      <span className={cn("font-medium", isUp ? "text-emerald-400" : "text-red-400")}>
                        {isUp ? <TrendingUp className="w-3.5 h-3.5 inline mr-1" /> : <TrendingDown className="w-3.5 h-3.5 inline mr-1" />}
                        {isUp ? "+" : ""}{percent.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Product */}
          {bestProduct && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <h3 className="text-sm font-semibold text-purple-400 mb-1 flex items-center gap-1.5">
                <Star className="w-4 h-4" />
                Top Product
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{bestProduct.name}</p>
                  <p className="text-xs text-slate-400">{bestProduct.segment} segment</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-300">Q{bestProduct.quality} / ${bestProduct.price}</p>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((warning, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-200">{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 px-6 py-4 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Continue to next round
          </button>
        </div>
      </div>
    </div>
  );
}
