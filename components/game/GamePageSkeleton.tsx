"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface GamePageSkeletonProps {
  /** Number of stat cards in the top row */
  statCards?: number;
  /** Number of content sections below */
  sections?: number;
}

export function GamePageSkeleton({
  statCards = 4,
  sections = 2,
}: GamePageSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: statCards }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Tab bar placeholder */}
      <Skeleton className="h-11 w-full max-w-md rounded-lg" />

      {/* Content sections */}
      {Array.from({ length: sections }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  );
}
