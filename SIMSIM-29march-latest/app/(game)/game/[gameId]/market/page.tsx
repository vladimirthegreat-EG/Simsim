"use client";

import { use, useMemo } from "react";
import { trpc } from "@/lib/api/trpc";
import { MarketIntelligencePanel } from "@/components/market/MarketIntelligencePanel";
import { TeamState, type Segment, type MarketState } from "@/engine/types";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default function MarketPage({ params }: PageProps) {
  const { gameId } = use(params);

  const { data: teamState, isLoading } = trpc.team.getMyState.useQuery();

  // Fetch competitor rankings from performance history
  const { data: perfHistory } = trpc.team.getPerformanceHistory.useQuery(
    undefined,
    { enabled: !!teamState?.game }
  );

  // Fetch market events (merged from News page)
  const { data: newsData } = trpc.game.getNews.useQuery(
    { gameId },
    { enabled: !!gameId }
  );

  const state: TeamState | null = useMemo(() => {
    if (!teamState?.state) return null;
    try {
      return typeof teamState.state === "string"
        ? (JSON.parse(teamState.state) as TeamState)
        : (teamState.state as TeamState);
    } catch {
      return null;
    }
  }, [teamState?.state]);

  const marketState = useMemo(() => {
    if (!teamState?.marketState) return null;
    try {
      const raw = typeof teamState.marketState === "string"
        ? JSON.parse(teamState.marketState)
        : teamState.marketState;
      return raw as MarketState;
    } catch {
      return null;
    }
  }, [teamState?.marketState]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-700 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Market Intelligence</h1>
        <p className="text-slate-400">Understand market segments, competitors, and economic conditions</p>
      </div>

      <MarketIntelligencePanel
        state={state}
        marketState={marketState}
        currentRound={teamState?.game.currentRound ?? 1}
        competitorRankings={perfHistory?.currentRankings ?? []}
        teamId={teamState?.team.id}
        marketEvents={newsData?.news ?? []}
      />
    </div>
  );
}
