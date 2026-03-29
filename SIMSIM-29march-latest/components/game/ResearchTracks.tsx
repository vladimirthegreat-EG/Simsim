"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Cog,
  Store,
  Lightbulb,
  Lock,
  AlertTriangle,
  Beaker,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type TrackId = "process" | "commerce" | "innovation";

interface ResearchTracksProps {
  activeTrack: TrackId | undefined;
  onSelectTrack: (track: TrackId) => void;
  researchDecayTimers?: Record<string, number>;
  disabled?: boolean;
}

// ─── Track Definitions ──────────────────────────────────────────────────────

interface TrackDefinition {
  id: TrackId;
  label: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  color: {
    border: string;
    bg: string;
    bgHover: string;
    text: string;
    iconBg: string;
    iconBgActive: string;
    badgeBg: string;
    badgeText: string;
    ring: string;
  };
}

const TRACKS: TrackDefinition[] = [
  {
    id: "process",
    label: "Process",
    subtitle: "Factory Efficiency",
    description: "Improve production efficiency and reduce waste",
    icon: Cog,
    color: {
      border: "border-orange-500",
      bg: "bg-orange-500/10",
      bgHover: "hover:bg-orange-500/5 hover:border-orange-500/40",
      text: "text-orange-400",
      iconBg: "bg-orange-500/20",
      iconBgActive: "bg-orange-500/30",
      badgeBg: "bg-orange-500/20",
      badgeText: "text-orange-400",
      ring: "ring-orange-500/20",
    },
  },
  {
    id: "commerce",
    label: "Commerce",
    subtitle: "Market Access",
    description: "Unlock new market segments and improve pricing",
    icon: Store,
    color: {
      border: "border-cyan-500",
      bg: "bg-cyan-500/10",
      bgHover: "hover:bg-cyan-500/5 hover:border-cyan-500/40",
      text: "text-cyan-400",
      iconBg: "bg-cyan-500/20",
      iconBgActive: "bg-cyan-500/30",
      badgeBg: "bg-cyan-500/20",
      badgeText: "text-cyan-400",
      ring: "ring-cyan-500/20",
    },
  },
  {
    id: "innovation",
    label: "Innovation",
    subtitle: "New Products",
    description: "Develop new product technologies and features",
    icon: Lightbulb,
    color: {
      border: "border-purple-500",
      bg: "bg-purple-500/10",
      bgHover: "hover:bg-purple-500/5 hover:border-purple-500/40",
      text: "text-purple-400",
      iconBg: "bg-purple-500/20",
      iconBgActive: "bg-purple-500/30",
      badgeBg: "bg-purple-500/20",
      badgeText: "text-purple-400",
      ring: "ring-purple-500/20",
    },
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function ResearchTracks({
  activeTrack,
  onSelectTrack,
  researchDecayTimers,
  disabled = false,
}: ResearchTracksProps) {
  // Check if any decay timer has reached the warning threshold
  function hasDecayWarning(trackId: TrackId): boolean {
    if (!researchDecayTimers) return false;
    const timer = researchDecayTimers[trackId];
    return timer !== undefined && timer >= 6;
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Beaker className="w-5 h-5 text-emerald-400" />
        <h3 className="text-white font-semibold text-lg">Research Tracks</h3>
        {disabled && (
          <Badge className="ml-auto bg-slate-600/50 text-slate-400 gap-1">
            <Lock className="w-3 h-3" />
            Locked
          </Badge>
        )}
      </div>
      <p className="text-slate-400 text-sm">
        Choose one research track to invest in this round. Only one track can be
        active per round.
      </p>

      {/* Track cards */}
      <div className="flex flex-col md:flex-row gap-4">
        {TRACKS.map((track) => {
          const isActive = activeTrack === track.id;
          const Icon = track.icon;
          const showDecayWarning = hasDecayWarning(track.id);

          return (
            <button
              key={track.id}
              type="button"
              onClick={() => !disabled && onSelectTrack(track.id)}
              disabled={disabled}
              className={cn(
                "flex-1 text-left transition-all duration-200 rounded-xl focus:outline-none focus-visible:ring-2",
                disabled && "cursor-not-allowed"
              )}
            >
              <Card
                className={cn(
                  "h-full transition-all duration-200 border-2",
                  // Active state
                  isActive && [
                    track.color.border,
                    track.color.bg,
                    track.color.ring,
                    "ring-2",
                    "shadow-lg",
                  ],
                  // Inactive state
                  !isActive && [
                    "border-slate-700",
                    "bg-slate-800",
                    !disabled && track.color.bgHover,
                    !disabled && "cursor-pointer",
                  ],
                  // Disabled state
                  disabled && "opacity-50"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon circle */}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          isActive
                            ? track.color.iconBgActive
                            : track.color.iconBg
                        )}
                      >
                        {disabled ? (
                          <Lock className="w-5 h-5 text-slate-500" />
                        ) : (
                          <Icon
                            className={cn(
                              "w-5 h-5",
                              isActive ? track.color.text : "text-slate-400"
                            )}
                          />
                        )}
                      </div>

                      {/* Title block */}
                      <div>
                        <CardTitle
                          className={cn(
                            "text-base",
                            isActive ? "text-white" : "text-slate-300"
                          )}
                        >
                          {track.label}
                        </CardTitle>
                        <p
                          className={cn(
                            "text-xs mt-0.5",
                            isActive ? track.color.text : "text-slate-500"
                          )}
                        >
                          {track.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-col items-end gap-1.5">
                      {isActive && (
                        <Badge
                          className={cn(
                            "border-0",
                            track.color.badgeBg,
                            track.color.badgeText
                          )}
                        >
                          Selected
                        </Badge>
                      )}
                      {showDecayWarning && (
                        <Badge className="border-0 bg-amber-500/20 text-amber-400 gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Decay
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p
                    className={cn(
                      "text-sm",
                      isActive ? "text-slate-300" : "text-slate-500"
                    )}
                  >
                    {track.description}
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
