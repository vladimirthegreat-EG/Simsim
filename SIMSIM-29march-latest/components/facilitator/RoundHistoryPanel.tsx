"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
  DollarSign,
} from "lucide-react";

interface RoundResult {
  roundNumber: number;
  rankings: Array<{
    teamId: string;
    teamName: string;
    teamColor: string;
    rank: number;
    revenue: number;
    netIncome: number;
    marketShare: number;
    eps: number;
  }>;
  events?: Array<{
    type: string;
    title: string;
  }>;
  processedAt?: Date;
}

interface RoundHistoryPanelProps {
  rounds: RoundResult[];
  currentRound: number;
}

export function RoundHistoryPanel({ rounds, currentRound }: RoundHistoryPanelProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getRankChangeIcon = (currentRank: number, previousRank: number | undefined) => {
    if (previousRank === undefined) return null;
    if (currentRank < previousRank) {
      return <TrendingUp className="w-3 h-3 text-green-400" />;
    } else if (currentRank > previousRank) {
      return <TrendingDown className="w-3 h-3 text-red-400" />;
    }
    return <Minus className="w-3 h-3 text-slate-400" />;
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500";
      case 2:
        return "bg-slate-400";
      case 3:
        return "bg-amber-600";
      default:
        return "bg-slate-600";
    }
  };

  if (rounds.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5" />
            Round History
          </CardTitle>
          <CardDescription className="text-slate-400">
            No rounds have been completed yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Round results will appear here after advancing rounds</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <History className="w-5 h-5" />
          Round History
        </CardTitle>
        <CardDescription className="text-slate-400">
          {rounds.length} completed round{rounds.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {rounds
              .sort((a, b) => b.roundNumber - a.roundNumber)
              .map((round, roundIdx) => {
                const previousRound = rounds.find(
                  (r) => r.roundNumber === round.roundNumber - 1
                );

                return (
                  <div
                    key={round.roundNumber}
                    className="p-4 bg-slate-700/50 rounded-lg"
                  >
                    {/* Round Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-600 text-white">
                          Round {round.roundNumber}
                        </Badge>
                        {round.roundNumber === currentRound - 1 && (
                          <Badge variant="outline" className="border-green-500 text-green-400">
                            Latest
                          </Badge>
                        )}
                      </div>
                      {round.processedAt && (
                        <span className="text-xs text-slate-500">
                          {new Date(round.processedAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Events */}
                    {round.events && round.events.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {round.events.map((event, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs border-yellow-500 text-yellow-400"
                          >
                            {event.title}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Rankings Table */}
                    <div className="space-y-2">
                      {round.rankings
                        .sort((a, b) => a.rank - b.rank)
                        .map((team) => {
                          const previousTeamResult = previousRound?.rankings.find(
                            (r) => r.teamId === team.teamId
                          );

                          return (
                            <div
                              key={team.teamId}
                              className="flex items-center justify-between p-2 bg-slate-800/50 rounded"
                            >
                              <div className="flex items-center gap-3">
                                {/* Rank Badge */}
                                <div className="flex items-center gap-1">
                                  <Badge
                                    className={`${getRankBadgeColor(team.rank)} text-white w-6 h-6 flex items-center justify-center p-0`}
                                  >
                                    {team.rank}
                                  </Badge>
                                  {getRankChangeIcon(team.rank, previousTeamResult?.rank)}
                                </div>

                                {/* Team Info */}
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: team.teamColor }}
                                  />
                                  <span className="text-white font-medium">
                                    {team.teamName}
                                  </span>
                                </div>

                                {team.rank === 1 && (
                                  <Trophy className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>

                              {/* Metrics */}
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-right">
                                  <div className="text-slate-400 text-xs">Revenue</div>
                                  <div className="text-white font-medium">
                                    {formatCurrency(team.revenue)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-slate-400 text-xs">Net Income</div>
                                  <div
                                    className={`font-medium ${
                                      team.netIncome >= 0 ? "text-green-400" : "text-red-400"
                                    }`}
                                  >
                                    {formatCurrency(team.netIncome)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-slate-400 text-xs">Market Share</div>
                                  <div className="text-white font-medium">
                                    {formatPercent(team.marketShare)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-slate-400 text-xs">EPS</div>
                                  <div
                                    className={`font-medium ${
                                      team.eps >= 0 ? "text-green-400" : "text-red-400"
                                    }`}
                                  >
                                    ${team.eps.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
