"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Medal,
  ChevronDown,
  ChevronUp,
  Award,
  Star,
} from "lucide-react";

interface RecentUnlock {
  id: string;
  name: string;
  category: string;
  points: number;
  roundUnlocked: number;
}

interface LeaderboardTeam {
  id: string;
  name: string;
  achievementScore: number;
  achievementCount: number;
  recentUnlocks: RecentUnlock[];
}

interface AchievementLeaderboardProps {
  teams: LeaderboardTeam[];
  currentTeamId: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Innovation: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  Market: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  Financial: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  Strategic: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  Milestone: {
    bg: "bg-sky-500/20",
    text: "text-sky-400",
    border: "border-sky-500/30",
  },
  Infamy: {
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  Bad: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/30",
  },
};

function getCategoryStyle(category: string) {
  return (
    CATEGORY_COLORS[category] ?? {
      bg: "bg-slate-500/20",
      text: "text-slate-400",
      border: "border-slate-500/30",
    }
  );
}

function getRankDisplay(rank: number) {
  switch (rank) {
    case 1:
      return {
        icon: <Medal className="w-5 h-5" />,
        color: "text-yellow-400",
        bg: "bg-yellow-500/20",
        border: "border-yellow-500/30",
        label: "1st",
      };
    case 2:
      return {
        icon: <Medal className="w-5 h-5" />,
        color: "text-slate-300",
        bg: "bg-slate-400/20",
        border: "border-slate-400/30",
        label: "2nd",
      };
    case 3:
      return {
        icon: <Medal className="w-5 h-5" />,
        color: "text-orange-400",
        bg: "bg-orange-500/20",
        border: "border-orange-500/30",
        label: "3rd",
      };
    default:
      return {
        icon: <span className="text-sm font-bold">#{rank}</span>,
        color: "text-slate-400",
        bg: "bg-slate-600/20",
        border: "border-slate-600/30",
        label: `${rank}th`,
      };
  }
}

export function AchievementLeaderboard({
  teams,
  currentTeamId,
}: AchievementLeaderboardProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const sortedTeams = [...teams].sort(
    (a, b) => b.achievementScore - a.achievementScore
  );

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId((prev) => (prev === teamId ? null : teamId));
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Achievement Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedTeams.map((team, index) => {
            const rank = index + 1;
            const rankDisplay = getRankDisplay(rank);
            const isCurrentTeam = team.id === currentTeamId;
            const isExpanded = expandedTeamId === team.id;
            const hasUnlocks = team.recentUnlocks.length > 0;

            return (
              <div key={team.id} className="space-y-0">
                {/* Team row */}
                <button
                  type="button"
                  onClick={() => hasUnlocks && toggleExpand(team.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left",
                    isCurrentTeam
                      ? "bg-purple-500/15 border-2 border-purple-500/40"
                      : "bg-slate-700/50 border border-transparent hover:border-slate-600",
                    isExpanded && "rounded-b-none",
                    hasUnlocks && "cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank medal */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
                        rankDisplay.bg,
                        rankDisplay.color,
                        rankDisplay.border
                      )}
                    >
                      {rankDisplay.icon}
                    </div>

                    {/* Team name */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium",
                          isCurrentTeam ? "text-white" : "text-slate-300"
                        )}
                      >
                        {team.name}
                      </span>
                      {isCurrentTeam && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Score and count */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-right">
                        <div className="text-slate-400 text-xs">Score</div>
                        <div className="text-yellow-400 font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {team.achievementScore.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-400 text-xs">Unlocked</div>
                        <div className="text-emerald-400 font-medium flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {team.achievementCount}
                        </div>
                      </div>
                    </div>

                    {/* Expand chevron */}
                    {hasUnlocks && (
                      <div className="text-slate-500">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {/* Expandable recent unlocks */}
                {isExpanded && hasUnlocks && (
                  <div
                    className={cn(
                      "border border-t-0 rounded-b-lg p-3 space-y-2",
                      isCurrentTeam
                        ? "border-purple-500/40 bg-purple-500/5"
                        : "border-slate-700 bg-slate-800/50"
                    )}
                  >
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
                      Recent Unlocks
                    </div>
                    {team.recentUnlocks.map((unlock) => {
                      const catStyle = getCategoryStyle(unlock.category);
                      return (
                        <div
                          key={unlock.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-700/30"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              className={cn(
                                "text-xs border",
                                catStyle.bg,
                                catStyle.text,
                                catStyle.border
                              )}
                            >
                              {unlock.category}
                            </Badge>
                            <span className="text-sm text-slate-300">
                              {unlock.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-yellow-400 font-medium">
                              +{unlock.points} pts
                            </span>
                            <span className="text-slate-500">
                              R{unlock.roundUnlocked}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default AchievementLeaderboard;
