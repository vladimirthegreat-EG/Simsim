"use client";

import { use, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { AchievementGrid } from "@/components/achievements";
import { trpc } from "@/lib/api/trpc";
import {
  ALL_ACHIEVEMENTS,
  EXTENDED_TIER_CONFIG,
  ACHIEVEMENT_COUNTS_BY_TIER,
  TOTAL_ACHIEVEMENT_COUNT,
  getTotalPossiblePoints,
} from "@/engine/achievements";
import { Trophy, Medal, Star, Award, Skull, Eye, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementsPageProps {
  params: Promise<{ gameId: string }>;
}

export default function AchievementsPage({ params }: AchievementsPageProps) {
  const { gameId } = use(params);

  const { data: session } = trpc.team.checkSession.useQuery();
  const teamData = session?.hasSession ? session.team : undefined;
  const { data: achievementData, isLoading } = trpc.achievement.getTeamAchievements.useQuery(
    { teamId: teamData?.id ?? "" },
    { enabled: !!teamData?.id }
  );
  const { data: leaderboard } = trpc.achievement.getLeaderboard.useQuery({ gameId });

  // Process achievement data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const earned = (achievementData as any)?.earned as Array<{ achievementId: string; earnedAt: Date; earnedRound: number }> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progress = (achievementData as any)?.progress as Array<{ achievementId: string; percentComplete: number }> | undefined;

  const earnedIds = useMemo(() => {
    if (!earned) return new Set<string>();
    return new Set<string>(earned.map((e) => e.achievementId));
  }, [earned]);

  const earnedData = useMemo(() => {
    if (!earned) return new Map<string, { earnedAt: Date; earnedRound: number }>();
    return new Map(earned.map((e) => [e.achievementId, { earnedAt: e.earnedAt, earnedRound: e.earnedRound }] as const));
  }, [earned]);

  const progressData = useMemo(() => {
    if (!progress) return new Map<string, { achievementId: string; percentComplete: number }>();
    return new Map(progress.map((p) => [p.achievementId, p] as const));
  }, [progress]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adata = achievementData as any;
  // Stats
  const stats = useMemo(() => {
    if (!adata) {
      return {
        earned: 0,
        total: TOTAL_ACHIEVEMENT_COUNT,
        points: 0,
        positiveCount: 0,
        infamyCount: 0,
        secretCount: 0,
        percentComplete: 0,
      };
    }

    return {
      earned: adata.stats?.totalEarned ?? 0,
      total: TOTAL_ACHIEVEMENT_COUNT,
      points: adata.team?.achievementPoints ?? 0,
      positiveCount: adata.stats?.positiveCount ?? 0,
      infamyCount: adata.stats?.infamyCount ?? 0,
      secretCount: adata.stats?.secretCount ?? 0,
      percentComplete: adata.stats?.percentComplete ?? 0,
    };
  }, [adata]);

  // Tier breakdown
  const tierBreakdown = useMemo(() => {
    const breakdown: Record<string, { earned: number; total: number }> = {};
    for (const [tier, count] of Object.entries(ACHIEVEMENT_COUNTS_BY_TIER)) {
      const earnedInTier = earned?.filter(
        (e) => {
          const achievement = ALL_ACHIEVEMENTS.find((a) => a.id === e.achievementId);
          return achievement?.tier === tier;
        }
      ).length ?? 0;
      breakdown[tier] = { earned: earnedInTier, total: count };
    }
    return breakdown;
  }, [achievementData]);

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Achievements"
        subtitle="The Ledger of Legends & Losers — Your journey to greatness (or infamy)"
        icon={<Trophy className="h-6 w-6" />}
        iconColor="text-yellow-400"
      />

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Earned"
          value={`${stats.earned}/${stats.total}`}
          icon={<Trophy className="w-5 h-5" />}
          variant="purple"
        />
        <StatCard
          label="Achievement Points"
          value={stats.points}
          prefix={stats.points > 0 ? "+" : ""}
          icon={<Star className="w-5 h-5" />}
          variant={stats.points >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Completion"
          value={`${Math.round(stats.percentComplete)}%`}
          icon={<Target className="w-5 h-5" />}
          variant="info"
        />
        <StatCard
          label="Infamy Count"
          value={stats.infamyCount}
          icon={<Skull className="w-5 h-5" />}
          variant={stats.infamyCount > 0 ? "danger" : "default"}
        />
      </div>

      {/* Tier breakdown */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-400" />
            Tier Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(EXTENDED_TIER_CONFIG).map(([tier, config]) => {
              const data = tierBreakdown[tier] ?? { earned: 0, total: 0 };
              const percent = data.total > 0 ? (data.earned / data.total) * 100 : 0;

              return (
                <div
                  key={tier}
                  className={cn(
                    "p-4 rounded-lg border text-center",
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <div className="text-3xl mb-2">{config.icon}</div>
                  <div className={cn("font-bold", config.color)}>
                    {data.earned}/{data.total}
                  </div>
                  <div className="text-xs text-slate-400">{config.name}</div>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all", config.bgColor.replace("/20", ""))}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 1 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Achievement Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((team: { rank: number; teamId: string; teamName: string; achievementPoints: number; totalEarned: number }, index: number) => (
                <div
                  key={team.teamId}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    team.teamId === teamData?.id
                      ? "bg-purple-500/20 border border-purple-500/50"
                      : "bg-slate-700/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                        index === 0
                          ? "bg-yellow-500/20 text-yellow-400"
                          : index === 1
                          ? "bg-slate-400/20 text-slate-300"
                          : index === 2
                          ? "bg-amber-600/20 text-amber-500"
                          : "bg-slate-600/20 text-slate-400"
                      )}
                    >
                      {team.rank}
                    </div>
                    <div>
                      <div className="font-medium text-white">{team.teamName}</div>
                      <div className="text-xs text-slate-400">
                        {team.totalEarned} achievements
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "font-bold text-lg",
                      team.achievementPoints >= 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {team.achievementPoints > 0 ? "+" : ""}
                    {team.achievementPoints}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          All Achievements
        </h2>
        <AchievementGrid
          achievements={ALL_ACHIEVEMENTS}
          earnedIds={earnedIds}
          earnedData={earnedData}
          progressData={progressData}
          showFilters
          showSearch
          columns={2}
        />
      </div>
    </div>
  );
}
