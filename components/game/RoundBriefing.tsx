"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Zap,
  ArrowRight,
  BarChart3,
  DollarSign,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";

interface RecentResult {
  roundNumber: number;
  rank: number;
  metrics: unknown;
}

interface RoundBriefingProps {
  gameId: string;
  teamId: string;
  currentRound: number;
  totalTeams: number;
  startingCash: number;
  recentResults: RecentResult[];
  marketState: unknown;
  esgScore?: number;
  brandValue?: number;
}

const STORAGE_KEY = (gameId: string, teamId: string) =>
  `simsim-briefed-${gameId}-${teamId}`;

function formatMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function RoundBriefing({
  gameId,
  teamId,
  currentRound,
  totalTeams,
  startingCash,
  recentResults,
  marketState,
  esgScore = 0,
  brandValue = 0,
}: RoundBriefingProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Check localStorage to see if we should show the briefing
  useEffect(() => {
    try {
      const key = STORAGE_KEY(gameId, teamId);
      const lastBriefed = parseInt(localStorage.getItem(key) ?? "0", 10);
      if (currentRound > lastBriefed) {
        setOpen(true);
      }
    } catch {
      // localStorage not available
    }
  }, [gameId, teamId, currentRound]);

  const handleDismiss = (navigateTo?: string) => {
    try {
      const key = STORAGE_KEY(gameId, teamId);
      localStorage.setItem(key, String(currentRound));
    } catch {
      // localStorage not available
    }
    setOpen(false);
    if (navigateTo) {
      const basePath = gameId === "demo" ? "/demo" : `/game/${gameId}`;
      router.push(`${basePath}${navigateTo}`);
    }
  };

  // Parse last round results
  const lastResult = useMemo(() => {
    if (recentResults.length === 0) return null;
    const sorted = [...recentResults].sort((a, b) => b.roundNumber - a.roundNumber);
    return sorted[0];
  }, [recentResults]);

  const previousResult = useMemo(() => {
    if (recentResults.length < 2) return null;
    const sorted = [...recentResults].sort((a, b) => b.roundNumber - a.roundNumber);
    return sorted[1];
  }, [recentResults]);

  // Extract metrics from last result
  const lastMetrics = useMemo(() => {
    if (!lastResult?.metrics) return null;
    const m = typeof lastResult.metrics === "string"
      ? JSON.parse(lastResult.metrics as string)
      : lastResult.metrics;
    return m as Record<string, number>;
  }, [lastResult]);

  const prevMetrics = useMemo(() => {
    if (!previousResult?.metrics) return null;
    const m = typeof previousResult.metrics === "string"
      ? JSON.parse(previousResult.metrics as string)
      : previousResult.metrics;
    return m as Record<string, number>;
  }, [previousResult]);

  // Extract narrative from explainability data
  const narrative = useMemo(() => {
    if (!lastMetrics) return null;
    const expl = lastMetrics.explainability as unknown as Record<string, unknown> | undefined;
    if (!expl?.narrative) return null;
    const n = expl.narrative as { headline?: string; summary?: string; recommendations?: { title: string; description: string }[] };
    return {
      headline: n.headline ?? null,
      summary: n.summary ?? null,
      topRecommendation: n.recommendations?.[0] ?? null,
    };
  }, [lastMetrics]);

  // Market conditions
  const economicPhase = useMemo(() => {
    if (!marketState) return null;
    const ms = typeof marketState === "string" ? JSON.parse(marketState as string) : marketState;
    return (ms as Record<string, unknown>)?.economicPhase as string | undefined ?? null;
  }, [marketState]);

  // Key warnings
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (startingCash < 30_000_000) w.push("Cash below $30M — be careful with spending.");
    if (esgScore > 0 && esgScore < 300) w.push("ESG score below 300 — revenue penalty active.");
    if (brandValue > 0 && brandValue < 0.15) w.push("Brand below critical mass (0.15) — 30% market penalty.");
    return w;
  }, [startingCash, esgScore, brandValue]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="w-5 h-5 text-amber-400" />
            Round {currentRound} Briefing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {/* Section 1: Last Round Recap */}
            {currentRound > 1 && lastResult && lastMetrics && (
              <motion.div
                key="recap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                  Last Round Recap
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* Rank */}
                  <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                    <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <div className="text-2xl font-bold">#{lastResult.rank}</div>
                    <div className="text-[11px] text-slate-400">of {totalTeams}</div>
                  </div>

                  {/* Revenue */}
                  <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                    <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <div className="text-lg font-bold">
                      {formatMoney(lastMetrics.revenue ?? 0)}
                    </div>
                    {prevMetrics && (
                      <div className="text-[11px] flex items-center justify-center gap-0.5">
                        {(lastMetrics.revenue ?? 0) >= (prevMetrics.revenue ?? 0) ? (
                          <><TrendingUp className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Up</span></>
                        ) : (
                          <><TrendingDown className="w-3 h-3 text-red-400" /><span className="text-red-400">Down</span></>
                        )}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400">Revenue</div>
                  </div>

                  {/* Market Share */}
                  <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                    <BarChart3 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                    <div className="text-lg font-bold">
                      {((lastMetrics.totalMarketShare ?? lastMetrics.marketShare ?? 0) * 100).toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-slate-400">Market Share</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Section 1b: Narrative highlights from last round */}
            {currentRound > 1 && narrative?.headline && (
              <motion.div
                key="narrative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-purple-200">{narrative.headline}</p>
                      {narrative.topRecommendation && (
                        <p className="text-xs text-slate-400">
                          <span className="text-purple-300">Tip:</span> {narrative.topRecommendation.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Section 2: This Round Context */}
            <motion.div
              key="context"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: currentRound > 1 ? 0.2 : 0 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                This Round
              </h3>
              <div className="space-y-2">
                {/* Cash */}
                <div className="flex items-center justify-between p-2.5 bg-slate-700/30 rounded-lg">
                  <span className="text-sm text-slate-300">Starting Cash</span>
                  <span className="text-sm font-bold text-emerald-400">{formatMoney(startingCash)}</span>
                </div>

                {/* Economic Phase */}
                {economicPhase && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-700/30 rounded-lg">
                    <span className="text-sm text-slate-300">Economy</span>
                    <Badge className={getPhaseColor(economicPhase)}>
                      {economicPhase.charAt(0).toUpperCase() + economicPhase.slice(1)}
                    </Badge>
                  </div>
                )}

                {/* Competition */}
                <div className="flex items-center justify-between p-2.5 bg-slate-700/30 rounded-lg">
                  <span className="text-sm text-slate-300">Competing Teams</span>
                  <span className="text-sm font-medium text-slate-200">{totalTeams} teams</span>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="space-y-1.5">
                  {warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-amber-200">{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Section 3: CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: currentRound > 1 ? 0.4 : 0.2 }}
            className="flex flex-col gap-2 pt-2"
          >
            <Button
              onClick={() => handleDismiss("/rnd")}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Start with R&D
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {currentRound > 1 && (
              <Button
                variant="outline"
                onClick={() => handleDismiss("/results")}
                className="w-full border-slate-600 text-slate-300 hover:text-white"
              >
                <Trophy className="w-4 h-4 mr-2" />
                View Full Results
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => handleDismiss("")}
              className="w-full text-slate-400 hover:text-white"
            >
              Skip to overview
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getPhaseColor(phase: string): string {
  switch (phase.toLowerCase()) {
    case "expansion": return "bg-emerald-500/20 text-emerald-400";
    case "peak": return "bg-blue-500/20 text-blue-400";
    case "contraction": return "bg-amber-500/20 text-amber-400";
    case "recession": return "bg-red-500/20 text-red-400";
    case "trough": return "bg-red-500/20 text-red-400";
    case "recovery": return "bg-cyan-500/20 text-cyan-400";
    default: return "bg-slate-500/20 text-slate-400";
  }
}
