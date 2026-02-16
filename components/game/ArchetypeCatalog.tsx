"use client";

import { useMemo } from "react";
import { Lock, Unlock, Smartphone, Star, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ALL_ARCHETYPES, getAvailableArchetypes } from "@/engine/types/archetypes";
import type { PhoneArchetype } from "@/engine/types/archetypes";
import type { TechNode } from "@/engine/modules/RDExpansions";

// ============================================
// PROPS
// ============================================

interface ArchetypeCatalogProps {
  unlockedTechs: string[];
  allTechNodes: { id: string; tier: number }[];
  onSelectArchetype: (archetypeId: string) => void;
  selectedArchetype?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TIER_LABELS: Record<number, string> = {
  0: "Starter (No tech needed)",
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
  4: "Tier 4",
  5: "Tier 5",
};

const SEGMENT_COLORS: Record<string, string> = {
  Budget: "bg-green-500/20 text-green-400 border-green-500/30",
  General: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Enthusiast: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Professional: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Active Lifestyle": "bg-red-500/20 text-red-400 border-red-500/30",
};

const TIER_BADGE_COLORS: Record<number, string> = {
  0: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  2: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  3: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  4: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  5: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

// ============================================
// COMPONENT
// ============================================

export function ArchetypeCatalog({
  unlockedTechs,
  allTechNodes,
  onSelectArchetype,
  selectedArchetype,
}: ArchetypeCatalogProps) {
  // Compute available archetypes
  const availableIds = useMemo(() => {
    const available = getAvailableArchetypes(unlockedTechs, allTechNodes);
    return new Set(available.map((a) => a.id));
  }, [unlockedTechs, allTechNodes]);

  // Group archetypes by tier
  const groupedByTier = useMemo(() => {
    const groups = new Map<number, PhoneArchetype[]>();
    for (const archetype of ALL_ARCHETYPES) {
      const tier = archetype.tier;
      if (!groups.has(tier)) {
        groups.set(tier, []);
      }
      groups.get(tier)!.push(archetype);
    }
    // Sort by tier number
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, []);

  // Count available per tier
  const availableCountByTier = useMemo(() => {
    const counts: Record<number, { available: number; total: number }> = {};
    for (const [tier, archetypes] of groupedByTier) {
      const available = archetypes.filter((a) => availableIds.has(a.id)).length;
      counts[tier] = { available, total: archetypes.length };
    }
    return counts;
  }, [groupedByTier, availableIds]);

  return (
    <div className="space-y-8">
      {groupedByTier.map(([tier, archetypes]) => {
        const counts = availableCountByTier[tier];
        return (
          <section key={tier}>
            {/* Tier Header */}
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-white">
                {TIER_LABELS[tier] ?? `Tier ${tier}`}
              </h3>
              <Badge
                className={cn(
                  "text-xs border",
                  counts.available === counts.total
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : counts.available > 0
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                )}
              >
                {counts.available}/{counts.total} available
              </Badge>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {archetypes.map((archetype) => (
                <ArchetypeCard
                  key={archetype.id}
                  archetype={archetype}
                  isAvailable={availableIds.has(archetype.id)}
                  isSelected={selectedArchetype === archetype.id}
                  unlockedTechs={unlockedTechs}
                  onSelect={onSelectArchetype}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ============================================
// ARCHETYPE CARD
// ============================================

interface ArchetypeCardProps {
  archetype: PhoneArchetype;
  isAvailable: boolean;
  isSelected: boolean;
  unlockedTechs: string[];
  onSelect: (archetypeId: string) => void;
}

function ArchetypeCard({
  archetype,
  isAvailable,
  isSelected,
  unlockedTechs,
  onSelect,
}: ArchetypeCardProps) {
  const missingTechs = useMemo(() => {
    return archetype.requiredTech.filter((t) => !unlockedTechs.includes(t));
  }, [archetype.requiredTech, unlockedTechs]);

  const segmentColor =
    SEGMENT_COLORS[archetype.primarySegment] ?? SEGMENT_COLORS["General"];
  const tierColor =
    TIER_BADGE_COLORS[archetype.tier] ?? TIER_BADGE_COLORS[0];

  return (
    <button
      type="button"
      onClick={() => isAvailable && onSelect(archetype.id)}
      disabled={!isAvailable}
      className={cn(
        "relative w-full text-left rounded-lg border p-4 transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50",
        // Selected state
        isSelected &&
          "border-purple-500 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.25)]",
        // Available but not selected
        isAvailable &&
          !isSelected &&
          "border-emerald-500/40 bg-slate-800 hover:bg-slate-800/80 hover:border-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.08)] cursor-pointer",
        // Locked state
        !isAvailable &&
          "border-slate-700 bg-slate-800/50 opacity-60 cursor-not-allowed"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isAvailable ? (
            <Unlock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
          )}
          <h4 className="text-sm font-semibold text-white truncate">
            {archetype.name}
          </h4>
        </div>
        {isSelected && (
          <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 mb-3 line-clamp-2">
        {archetype.description}
      </p>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <Badge className={cn("text-[10px] border", segmentColor)}>
          {archetype.primarySegment}
        </Badge>
        <Badge className={cn("text-[10px] border", tierColor)}>
          <Star className="w-2.5 h-2.5" />
          T{archetype.tier}
        </Badge>
      </div>

      {/* Price range */}
      <div className="flex items-center gap-1.5 mb-3">
        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs text-slate-400">
          ${archetype.suggestedPriceRange.min} &ndash; $
          {archetype.suggestedPriceRange.max}
        </span>
      </div>

      {/* Required techs */}
      {archetype.requiredTech.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Required Tech
          </span>
          <div className="flex flex-wrap gap-1.5">
            {archetype.requiredTech.map((techId) => {
              const hasIt = unlockedTechs.includes(techId);
              return (
                <span
                  key={techId}
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono",
                    hasIt
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  )}
                >
                  {hasIt ? (
                    <Unlock className="w-2.5 h-2.5" />
                  ) : (
                    <Lock className="w-2.5 h-2.5" />
                  )}
                  {techId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing tech warning for locked cards */}
      {!isAvailable && missingTechs.length > 0 && (
        <div className="mt-2 text-[10px] text-red-400/80">
          Missing: {missingTechs.join(", ")}
        </div>
      )}

      {/* Starter badge for tier 0 */}
      {archetype.tier === 0 && archetype.requiredTech.length === 0 && (
        <div className="mt-2">
          <span className="text-[10px] text-emerald-400/80 font-medium">
            No tech required -- available from Round 1
          </span>
        </div>
      )}
    </button>
  );
}
