"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AchievementBadge } from "./AchievementBadge";
import {
  EXTENDED_TIER_CONFIG,
  CATEGORY_CONFIG,
  ExtendedAchievement,
  ExtendedAchievementProgress,
  isInfamyAchievement,
  isSecretAchievement,
} from "@/engine/achievements";
import {
  Lock,
  Trophy,
  Skull,
  Eye,
  CheckCircle,
} from "lucide-react";

interface AchievementCardProps {
  achievement: ExtendedAchievement;
  earned?: boolean;
  earnedAt?: Date;
  earnedRound?: number;
  progress?: ExtendedAchievementProgress;
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export function AchievementCard({
  achievement,
  earned = false,
  earnedAt,
  earnedRound,
  progress,
  showProgress = true,
  compact = false,
  className,
  onClick,
}: AchievementCardProps) {
  const tierConfig = EXTENDED_TIER_CONFIG[achievement.tier];
  const categoryConfig = CATEGORY_CONFIG[achievement.category];
  const isInfamy = isInfamyAchievement(achievement);
  const isSecret = isSecretAchievement(achievement);

  // For secret achievements that aren't earned, show locked state
  const isLocked = isSecret && !earned;

  const getIcon = () => {
    if (isLocked) return <Lock className="w-5 h-5" />;
    if (earned) return <CheckCircle className="w-5 h-5" />;
    if (isInfamy) return <Skull className="w-5 h-5" />;
    if (isSecret) return <Eye className="w-5 h-5" />;
    return <Trophy className="w-5 h-5" />;
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all",
          earned
            ? "bg-slate-800/80 border-slate-600"
            : isLocked
            ? "bg-slate-900/50 border-slate-800 opacity-60"
            : "bg-slate-800/50 border-slate-700",
          onClick && "cursor-pointer hover:border-slate-500",
          className
        )}
        onClick={onClick}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            earned ? tierConfig.bgColor : "bg-slate-700/50",
            earned ? tierConfig.color : "text-slate-500"
          )}
        >
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium truncate",
                earned ? "text-white" : "text-slate-400"
              )}
            >
              {isLocked ? "???" : achievement.name}
            </span>
            <AchievementBadge tier={achievement.tier} size="sm" />
          </div>
          <p className="text-xs text-slate-500 truncate">
            {isLocked ? "Secret achievement" : achievement.description}
          </p>
        </div>
        {earned && (
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "transition-all overflow-hidden",
        earned
          ? cn("border-2", tierConfig.borderColor, "bg-slate-800/90")
          : isLocked
          ? "bg-slate-900/50 border-slate-800 opacity-70"
          : "bg-slate-800/50 border-slate-700 hover:border-slate-600",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Gradient header */}
      <div
        className={cn(
          "h-1",
          earned ? tierConfig.bgColor : "bg-slate-700"
        )}
      />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              earned ? tierConfig.bgColor : "bg-slate-700/50",
              earned ? tierConfig.color : "text-slate-500"
            )}
          >
            <span className="text-2xl">{tierConfig.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle
                className={cn(
                  "text-lg",
                  earned ? "text-white" : "text-slate-400"
                )}
              >
                {isLocked ? "???" : achievement.name}
              </CardTitle>
              <AchievementBadge tier={achievement.tier} size="sm" showPoints />
            </div>
            <CardDescription className="mt-1">
              {isLocked
                ? "Complete a secret condition to unlock this achievement"
                : achievement.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Flavor text */}
        {!isLocked && achievement.flavor && (
          <p className="text-sm text-slate-400 italic border-l-2 border-slate-600 pl-3">
            "{achievement.flavor}"
          </p>
        )}

        {/* Category tag */}
        <div className="flex items-center gap-2 text-xs">
          <span className={cn("font-medium", categoryConfig.color)}>
            {categoryConfig.name}
          </span>
          {earned && earnedRound !== undefined && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">Earned in Round {earnedRound}</span>
            </>
          )}
          {earned && earnedAt && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">
                {new Date(earnedAt).toLocaleDateString()}
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && !earned && progress && progress.percentComplete < 100 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Progress</span>
              <span className="text-slate-400">
                {Math.round(progress.percentComplete)}%
              </span>
            </div>
            <Progress
              value={progress.percentComplete}
              className="h-1.5 bg-slate-700"
            />
          </div>
        )}

        {/* Points earned indicator */}
        {earned && (
          <div
            className={cn(
              "inline-flex items-center gap-1 text-sm font-medium",
              isInfamy ? "text-red-400" : "text-emerald-400"
            )}
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              {isInfamy ? "" : "+"}
              {tierConfig.points} points
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AchievementCard;
