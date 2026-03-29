"use client";

import { cn } from "@/lib/utils";
import { EXTENDED_TIER_CONFIG, ExtendedAchievementTier } from "@/engine/achievements";

interface AchievementBadgeProps {
  tier: ExtendedAchievementTier;
  size?: "sm" | "md" | "lg";
  showPoints?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-1",
  lg: "text-base px-3 py-1.5",
};

export function AchievementBadge({
  tier,
  size = "md",
  showPoints = false,
  className,
}: AchievementBadgeProps) {
  const config = EXTENDED_TIER_CONFIG[tier];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium border",
        config.bgColor,
        config.color,
        config.borderColor,
        sizeClasses[size],
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{config.name}</span>
      {showPoints && (
        <span className="opacity-75">
          ({config.points > 0 ? "+" : ""}
          {config.points})
        </span>
      )}
    </span>
  );
}

interface AchievementCountBadgeProps {
  count: number;
  total?: number;
  variant?: "default" | "success" | "warning";
  className?: string;
}

export function AchievementCountBadge({
  count,
  total,
  variant = "default",
  className,
}: AchievementCountBadgeProps) {
  const variantClasses = {
    default: "bg-slate-700 text-slate-300 border-slate-600",
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    warning: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full text-xs font-medium px-2 py-0.5 border",
        variantClasses[variant],
        className
      )}
    >
      <span className="text-lg">🏆</span>
      <span>
        {count}
        {total !== undefined && <span className="opacity-60">/{total}</span>}
      </span>
    </span>
  );
}

export default AchievementBadge;
