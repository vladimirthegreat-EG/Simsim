"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
import {
  Trophy,
  Medal,
  Star,
  Award,
  Skull,
  Target,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { ACHIEVEMENT_STATS, TIER_BREAKDOWN, ACHIEVEMENTS } from "../mockData";

const tierConfig: Record<string, { name: string; color: string; bg: string }> = {
  bronze: { name: "Bronze", color: "text-orange-400", bg: "bg-orange-500/20" },
  silver: { name: "Silver", color: "text-slate-300", bg: "bg-slate-400/20" },
  gold: { name: "Gold", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  platinum: { name: "Platinum", color: "text-cyan-400", bg: "bg-cyan-500/20" },
  diamond: { name: "Diamond", color: "text-blue-400", bg: "bg-blue-500/20" },
  legendary: { name: "Legendary", color: "text-purple-400", bg: "bg-purple-500/20" },
};

export default function DemoAchievementsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Achievements"
        subtitle="The Ledger of Legends & Losers - Your journey to greatness (or infamy)"
        icon={<Trophy className="h-6 w-6" />}
        iconColor="text-yellow-400"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Earned" value={`${ACHIEVEMENT_STATS.earned}/${ACHIEVEMENT_STATS.total}`} icon={<Trophy className="w-5 h-5" />} variant="purple" />
        <StatCard label="Achievement Points" value={ACHIEVEMENT_STATS.points} prefix="+" icon={<Star className="w-5 h-5" />} variant="success" />
        <StatCard label="Completion" value={`${Math.round(ACHIEVEMENT_STATS.percentComplete)}%`} icon={<Target className="w-5 h-5" />} variant="info" />
        <StatCard label="Infamy Count" value={ACHIEVEMENT_STATS.infamyCount} icon={<Skull className="w-5 h-5" />} variant="danger" />
      </div>

      {/* Tier Progress */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-400" />
            Tier Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TIER_BREAKDOWN.map((item) => {
              const config = tierConfig[item.tier];
              const percent = item.total > 0 ? (item.earned / item.total) * 100 : 0;
              return (
                <div key={item.tier} className={`p-3 rounded-lg border border-slate-600 ${config.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${config.color}`}>{config.name}</span>
                    <span className="text-slate-400 text-xs">{item.earned}/{item.total}</span>
                  </div>
                  <EnhancedProgress value={percent} variant="default" size="sm" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Achievement Grid */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <SectionHeader title="Achievements" icon={<Award className="w-5 h-5" />} iconColor="text-yellow-400" />
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const config = tierConfig[achievement.tier];
              const isInfamy = achievement.category === "infamy";
              return (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border transition-all ${
                    achievement.earned
                      ? isInfamy
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-green-500/10 border-green-500/30"
                      : "bg-slate-700/30 border-slate-600 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {achievement.earned ? (
                        isInfamy ? (
                          <Skull className="w-4 h-4 text-red-400" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        )
                      ) : (
                        <Lock className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="text-white font-medium text-sm">{achievement.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={`text-xs ${config.bg} ${config.color}`}>{config.name}</Badge>
                      <Badge className={`text-xs ${achievement.points > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {achievement.points > 0 ? "+" : ""}{achievement.points}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs">{achievement.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
