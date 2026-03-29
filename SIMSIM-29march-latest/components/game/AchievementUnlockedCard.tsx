"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Sparkles } from "lucide-react";
import { ALL_ACHIEVEMENTS } from "@/engine/types/achievements";

interface UnlockedAchievementData {
  id: string;
  roundUnlocked: number;
  points: number;
}

interface AchievementUnlockedCardProps {
  achievements: UnlockedAchievementData[];
  currentRound: number;
  totalScore?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Innovation: "bg-purple-500/20 text-purple-400",
  Market: "bg-blue-500/20 text-blue-400",
  Financial: "bg-green-500/20 text-green-400",
  Strategic: "bg-amber-500/20 text-amber-400",
  Milestone: "bg-cyan-500/20 text-cyan-400",
  Infamy: "bg-red-500/20 text-red-400",
  Bad: "bg-slate-500/20 text-slate-400",
};

export function AchievementUnlockedCard({ achievements, currentRound, totalScore }: AchievementUnlockedCardProps) {
  // Filter to achievements unlocked this round
  const newAchievements = achievements.filter(a => a.roundUnlocked === currentRound);
  if (newAchievements.length === 0) return null;

  // Look up full details from ALL_ACHIEVEMENTS
  const enriched = newAchievements.map(a => {
    const def = ALL_ACHIEVEMENTS.find(d => d.id === a.id);
    return {
      ...a,
      name: def?.name ?? a.id,
      description: def?.description ?? "",
      category: def?.category ?? "Strategic",
    };
  });

  const totalNewPoints = enriched.reduce((sum, a) => sum + a.points, 0);

  return (
    <Card className="bg-slate-800 border-slate-700 border-amber-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-white font-semibold text-base">
                {enriched.length === 1 ? "Achievement Unlocked!" : `${enriched.length} Achievements Unlocked!`}
              </h3>
              <p className="text-slate-400 text-sm">
                +{totalNewPoints} points this round
                {totalScore !== undefined && ` (Total: ${totalScore})`}
              </p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {enriched.map((achievement) => (
            <div
              key={achievement.id}
              className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-amber-500/20"
            >
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-white font-medium text-sm">{achievement.name}</span>
                  <p className="text-slate-400 text-xs">{achievement.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={CATEGORY_COLORS[achievement.category] ?? "bg-slate-500/20 text-slate-400"}>
                  {achievement.category}
                </Badge>
                <Badge className="bg-amber-500/20 text-amber-400">
                  +{achievement.points}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
