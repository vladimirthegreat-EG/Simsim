"use client";

import { Badge } from "@/components/ui/badge";
import { CONSTANTS, type Segment } from "@/engine/types";
import { SEGMENT_PROFILES } from "@/lib/config/segmentProfiles";

interface MiniSegmentCardProps {
  segment: Segment;
  compact?: boolean;
}

export function MiniSegmentCard({ segment, compact }: MiniSegmentCardProps) {
  const profile = SEGMENT_PROFILES[segment];
  const weights = CONSTANTS.SEGMENT_WEIGHTS[segment];

  // Find top scoring factor
  const factors = Object.entries(weights) as [string, number][];
  factors.sort((a, b) => b[1] - a[1]);
  const topFactor = factors[0];

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="text-slate-400">{segment}:</span>
        <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300 py-0">
          {topFactor[0]} ({topFactor[1]}pts)
        </Badge>
      </span>
    );
  }

  return (
    <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-medium text-sm">{segment}</span>
        <span className="text-slate-400 text-xs">{(profile.demandUnits / 1000).toFixed(0)}K units</span>
      </div>
      <div className="text-slate-400 text-xs mb-2">
        ${profile.priceRange.min}-${profile.priceRange.max} | Growth: {(profile.demandGrowthRate * 100).toFixed(0)}%/yr
      </div>
      <div className="flex gap-1 flex-wrap">
        {factors.slice(0, 3).map(([key, val]) => (
          <Badge
            key={key}
            variant="outline"
            className={`text-[10px] py-0 ${key === topFactor[0] ? "border-cyan-500/50 text-cyan-400" : "border-slate-600 text-slate-400"}`}
          >
            {key}: {val}
          </Badge>
        ))}
      </div>
    </div>
  );
}
