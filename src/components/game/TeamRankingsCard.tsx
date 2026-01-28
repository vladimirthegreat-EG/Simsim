"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TeamRanking {
  id: string;
  name: string;
  color: string;
  rank: number;
  previousRank?: number;
  marketShare: number;
  revenue: number;
  isCurrentTeam?: boolean;
}

interface TeamRankingsCardProps {
  teams: TeamRanking[];
  currentTeamId?: string;
}

export function TeamRankingsCard({ teams, currentTeamId }: TeamRankingsCardProps) {
  const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank);

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const getRankChange = (current: number, previous?: number) => {
    if (previous === undefined) return null;
    const change = previous - current; // Higher previous = improved (lower is better for rank)
    if (change > 0) {
      return (
        <span className="flex items-center text-green-400 text-xs">
          <TrendingUp className="w-3 h-3 mr-0.5" />
          {change}
        </span>
      );
    }
    if (change < 0) {
      return (
        <span className="flex items-center text-red-400 text-xs">
          <TrendingDown className="w-3 h-3 mr-0.5" />
          {Math.abs(change)}
        </span>
      );
    }
    return (
      <span className="flex items-center text-slate-400 text-xs">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case 2:
        return "bg-slate-400/20 text-slate-300 border-slate-400/30";
      case 3:
        return "bg-orange-600/20 text-orange-400 border-orange-500/30";
      default:
        return "bg-slate-600/20 text-slate-400 border-slate-600/30";
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Team Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedTeams.map((team) => {
            const isCurrentTeam = team.id === currentTeamId || team.isCurrentTeam;
            return (
              <div
                key={team.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentTeam
                    ? "bg-blue-500/20 border border-blue-500/30"
                    : "bg-slate-700/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Badge className={`${getRankBadgeStyle(team.rank)} border w-8 justify-center`}>
                    #{team.rank}
                  </Badge>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className={`font-medium ${isCurrentTeam ? "text-white" : "text-slate-300"}`}>
                    {team.name}
                  </span>
                  {isCurrentTeam && (
                    <Badge className="bg-blue-500/20 text-blue-400 text-xs">You</Badge>
                  )}
                  {getRankChange(team.rank, team.previousRank)}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="text-slate-400 text-xs">Share</div>
                    <div className="text-purple-400 font-medium">
                      {(team.marketShare * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-xs">Revenue</div>
                    <div className="text-green-400 font-medium">
                      {formatCurrency(team.revenue)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
