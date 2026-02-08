"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AchievementCard } from "./AchievementCard";
import { AchievementBadge } from "./AchievementBadge";
import {
  ExtendedAchievement,
  ExtendedAchievementCategory,
  ExtendedAchievementTier,
  ExtendedAchievementProgress,
  CATEGORY_CONFIG,
  EXTENDED_TIER_CONFIG,
} from "@/engine/achievements";
import {
  Search,
  Filter,
  Trophy,
  Skull,
  Eye,
  LayoutGrid,
  List,
} from "lucide-react";

interface AchievementGridProps {
  achievements: ExtendedAchievement[];
  earnedIds?: Set<string>;
  earnedData?: Map<string, { earnedAt: Date; earnedRound: number }>;
  progressData?: Map<string, ExtendedAchievementProgress>;
  showFilters?: boolean;
  showSearch?: boolean;
  columns?: 1 | 2 | 3;
  compact?: boolean;
  className?: string;
}

type FilterType = "all" | "earned" | "unearned" | "positive" | "infamy" | "secret";
type SortType = "category" | "tier" | "name" | "progress";

export function AchievementGrid({
  achievements,
  earnedIds = new Set(),
  earnedData = new Map(),
  progressData = new Map(),
  showFilters = true,
  showSearch = true,
  columns = 2,
  compact = false,
  className,
}: AchievementGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterCategory, setFilterCategory] = useState<ExtendedAchievementCategory | "all">("all");
  const [filterTier, setFilterTier] = useState<ExtendedAchievementTier | "all">("all");
  const [sortType, setSortType] = useState<SortType>("category");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    let filtered = [...achievements];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          (a.flavor?.toLowerCase().includes(query) ?? false)
      );
    }

    // Type filter
    switch (filterType) {
      case "earned":
        filtered = filtered.filter((a) => earnedIds.has(a.id));
        break;
      case "unearned":
        filtered = filtered.filter((a) => !earnedIds.has(a.id));
        break;
      case "positive":
        filtered = filtered.filter((a) => !a.isNegative && a.tier !== "infamy");
        break;
      case "infamy":
        filtered = filtered.filter((a) => a.isNegative || a.tier === "infamy");
        break;
      case "secret":
        filtered = filtered.filter((a) => a.hidden || a.tier === "secret");
        break;
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((a) => a.category === filterCategory);
    }

    // Tier filter
    if (filterTier !== "all") {
      filtered = filtered.filter((a) => a.tier === filterTier);
    }

    // Sort
    switch (sortType) {
      case "category":
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "tier":
        const tierOrder = ["platinum", "gold", "silver", "bronze", "secret", "infamy"];
        filtered.sort(
          (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
        );
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "progress":
        filtered.sort((a, b) => {
          const progressA = progressData.get(a.id)?.percentComplete ?? 0;
          const progressB = progressData.get(b.id)?.percentComplete ?? 0;
          return progressB - progressA;
        });
        break;
    }

    return filtered;
  }, [
    achievements,
    searchQuery,
    filterType,
    filterCategory,
    filterTier,
    sortType,
    earnedIds,
    progressData,
  ]);

  // Stats
  const stats = useMemo(() => {
    const earned = achievements.filter((a) => earnedIds.has(a.id)).length;
    const total = achievements.length;
    const points = achievements
      .filter((a) => earnedIds.has(a.id))
      .reduce((sum, a) => sum + EXTENDED_TIER_CONFIG[a.tier].points, 0);

    return { earned, total, points };
  }, [achievements, earnedIds]);

  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats bar */}
      <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-medium">
              {stats.earned}/{stats.total}
            </span>
            <span className="text-slate-400 text-sm">earned</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-bold text-lg",
                stats.points >= 0 ? "text-emerald-400" : "text-red-400"
              )}
            >
              {stats.points > 0 ? "+" : ""}
              {stats.points}
            </span>
            <span className="text-slate-400 text-sm">points</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 rounded-md transition-colors",
              viewMode === "grid"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded-md transition-colors",
              viewMode === "list"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and filters */}
      {(showSearch || showFilters) && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 space-y-4">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search achievements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-slate-600"
                />
              </div>
            )}

            {showFilters && (
              <div className="space-y-3">
                {/* Type filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-slate-400" />
                  {(
                    [
                      { value: "all", label: "All" },
                      { value: "earned", label: "Earned" },
                      { value: "unearned", label: "Unearned" },
                      { value: "positive", label: "Positive", icon: Trophy },
                      { value: "infamy", label: "Infamy", icon: Skull },
                      { value: "secret", label: "Secret", icon: Eye },
                    ] as const
                  ).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setFilterType(value)}
                      className={cn(
                        "px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1",
                        filterType === value
                          ? "bg-purple-600 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      )}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Category filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">Category:</span>
                  <button
                    onClick={() => setFilterCategory("all")}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                      filterCategory === "all"
                        ? "bg-slate-600 text-white"
                        : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    All
                  </button>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() =>
                        setFilterCategory(key as ExtendedAchievementCategory)
                      }
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                        filterCategory === key
                          ? "bg-slate-600 text-white"
                          : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                      )}
                    >
                      {config.name}
                    </button>
                  ))}
                </div>

                {/* Tier filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">Tier:</span>
                  <button
                    onClick={() => setFilterTier("all")}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                      filterTier === "all"
                        ? "bg-slate-600 text-white"
                        : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                    )}
                  >
                    All
                  </button>
                  {Object.entries(EXTENDED_TIER_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() =>
                        setFilterTier(key as ExtendedAchievementTier)
                      }
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium transition-colors flex items-center gap-1",
                        filterTier === key
                          ? cn(config.bgColor, config.color)
                          : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                      )}
                    >
                      <span>{config.icon}</span>
                      {config.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Achievement grid/list */}
      {filteredAchievements.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-12 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-lg font-medium">
              No achievements found
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Try adjusting your filters or search query
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "list" || compact ? (
        <div className="space-y-2">
          {filteredAchievements.map((achievement) => {
            const earned = earnedIds.has(achievement.id);
            const data = earnedData.get(achievement.id);
            const progress = progressData.get(achievement.id);

            return (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                earned={earned}
                earnedAt={data?.earnedAt}
                earnedRound={data?.earnedRound}
                progress={progress}
                compact
              />
            );
          })}
        </div>
      ) : (
        <div className={cn("grid gap-4", columnClasses[columns])}>
          {filteredAchievements.map((achievement) => {
            const earned = earnedIds.has(achievement.id);
            const data = earnedData.get(achievement.id);
            const progress = progressData.get(achievement.id);

            return (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                earned={earned}
                earnedAt={data?.earnedAt}
                earnedRound={data?.earnedRound}
                progress={progress}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AchievementGrid;
