"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AchievementBadge } from "./AchievementBadge";
import {
  EXTENDED_TIER_CONFIG,
  ExtendedAchievement,
  isInfamyAchievement,
  isSecretAchievement,
} from "@/engine/achievements";
import { X, Trophy, Skull, Eye } from "lucide-react";

interface AchievementToastProps {
  achievement: ExtendedAchievement;
  points: number;
  onClose?: () => void;
  duration?: number;
  className?: string;
}

export function AchievementToast({
  achievement,
  points,
  onClose,
  duration = 5000,
  className,
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const tierConfig = EXTENDED_TIER_CONFIG[achievement.tier];
  const isInfamy = isInfamyAchievement(achievement);
  const isSecret = isSecretAchievement(achievement);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  const getIcon = () => {
    if (isInfamy) return <Skull className="w-6 h-6" />;
    if (isSecret) return <Eye className="w-6 h-6" />;
    return <Trophy className="w-6 h-6" />;
  };

  const getTitle = () => {
    if (isInfamy) return "Infamy Earned!";
    if (isSecret) return "Secret Achievement Unlocked!";
    return "Achievement Unlocked!";
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]",
        "transform transition-all duration-300 ease-out",
        isExiting
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100",
        className
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 shadow-2xl backdrop-blur-sm",
          tierConfig.borderColor,
          isInfamy
            ? "bg-red-950/95"
            : isSecret
            ? "bg-purple-950/95"
            : "bg-slate-900/95"
        )}
      >
        {/* Animated gradient background */}
        <div
          className={cn(
            "absolute inset-0 opacity-20",
            "bg-gradient-to-r",
            isInfamy
              ? "from-red-500 via-red-600 to-red-500"
              : isSecret
              ? "from-purple-500 via-purple-600 to-purple-500"
              : `from-${tierConfig.color.replace("text-", "")} via-transparent to-${tierConfig.color.replace("text-", "")}`,
            "animate-pulse"
          )}
        />

        {/* Content */}
        <div className="relative p-4">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                tierConfig.bgColor,
                tierConfig.color
              )}
            >
              {getIcon()}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                {getTitle()}
              </p>
              <p className="font-bold text-white text-lg">{achievement.name}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-300 text-sm mb-3">
            {achievement.description}
          </p>

          {/* Flavor text */}
          {achievement.flavor && (
            <p className="text-slate-400 text-xs italic mb-3 border-l-2 border-slate-600 pl-2">
              "{achievement.flavor}"
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <AchievementBadge tier={achievement.tier} size="sm" />
            <div
              className={cn(
                "text-sm font-bold",
                isInfamy ? "text-red-400" : "text-emerald-400"
              )}
            >
              {points > 0 ? "+" : ""}
              {points} points
            </div>
          </div>
        </div>

        {/* Progress bar animation */}
        <div className="h-1 bg-slate-800 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              tierConfig.bgColor.replace("/20", "")
            )}
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook for managing achievement toasts
 */
export function useAchievementToasts() {
  const [toasts, setToasts] = useState<
    Array<{ id: string; achievement: ExtendedAchievement; points: number }>
  >([]);

  const showToast = (achievement: ExtendedAchievement, points: number) => {
    const id = `${achievement.id}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, achievement, points }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ transform: `translateY(-${index * 8}px)` }}
        >
          <AchievementToast
            achievement={toast.achievement}
            points={toast.points}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );

  return { showToast, ToastContainer };
}

export default AchievementToast;
