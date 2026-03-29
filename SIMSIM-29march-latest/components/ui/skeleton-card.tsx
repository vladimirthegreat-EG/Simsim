"use client";

import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  lines?: number;
  showHeader?: boolean;
}

export function SkeletonCard({ className, lines = 3, showHeader = true }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-700 bg-slate-800 p-6 animate-pulse",
        className
      )}
    >
      {showHeader && (
        <div className="mb-4">
          <div className="h-5 w-32 bg-slate-700 rounded mb-2" />
          <div className="h-3 w-48 bg-slate-700/50 rounded" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-slate-700 rounded"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-2 border-b border-slate-700">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-slate-700 rounded flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="h-4 bg-slate-700/50 rounded flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonChartProps {
  height?: number;
  className?: string;
}

export function SkeletonChart({ height = 200, className }: SkeletonChartProps) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-800 border border-slate-700 p-4", className)}
      style={{ height }}
    >
      <div className="flex items-end justify-between h-full gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-700 rounded-t flex-1"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

export function SkeletonStats({ count = 4, className }: SkeletonStatsProps) {
  return (
    <div className={cn("grid gap-4", className)} style={{ gridTemplateColumns: `repeat(${Math.min(count, 4)}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-700 bg-slate-800 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-lg" />
            <div className="flex-1">
              <div className="h-3 w-16 bg-slate-700/50 rounded mb-2" />
              <div className="h-6 w-20 bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
