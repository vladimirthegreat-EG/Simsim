"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  DollarSign,
  Shield,
  Cpu,
  Eye,
  AlertTriangle,
  TrendingUp,
  Activity,
  ChevronDown,
} from "lucide-react";

interface MarketEvent {
  type: string;
  round: number;
  description: string;
  impact: "positive" | "negative" | "neutral";
  teamId?: string;
  segment?: string;
}

interface CompetitiveIntelProps {
  events: MarketEvent[];
  currentRound: number;
}

type FilterTab = "all" | "this_round" | "threats" | "opportunities";

const EVENT_ICONS: Record<string, React.ElementType> = {
  product_launch: Smartphone,
  new_product: Smartphone,
  launch: Smartphone,
  price_change: DollarSign,
  pricing: DollarSign,
  price_war: DollarSign,
  patent: Shield,
  ip: Shield,
  protection: Shield,
  tech: Cpu,
  technology: Cpu,
  innovation: Cpu,
  rd: Cpu,
  research: Cpu,
};

const IMPACT_STYLES: Record<
  string,
  { color: string; bgColor: string; borderColor: string; icon: React.ElementType; label: string }
> = {
  positive: {
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    icon: TrendingUp,
    label: "Opportunity",
  },
  negative: {
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    icon: AlertTriangle,
    label: "Threat",
  },
  neutral: {
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    icon: Activity,
    label: "Info",
  },
};

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All", icon: Eye },
  { key: "this_round", label: "This Round", icon: Activity },
  { key: "threats", label: "Threats", icon: AlertTriangle },
  { key: "opportunities", label: "Opportunities", icon: TrendingUp },
];

function getEventIcon(type: string): React.ElementType {
  // Try exact match first
  if (EVENT_ICONS[type]) return EVENT_ICONS[type];

  // Try partial match
  const lower = type.toLowerCase();
  for (const [key, icon] of Object.entries(EVENT_ICONS)) {
    if (lower.includes(key)) return icon;
  }

  // Default icon
  return Activity;
}

export function CompetitiveIntel({ events, currentRound }: CompetitiveIntelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(
    new Set([currentRound])
  );

  // Sort events by round descending (newest first), then filter
  const filteredEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      if (b.round !== a.round) return b.round - a.round;
      // Within same round, keep original order
      return 0;
    });

    switch (activeFilter) {
      case "this_round":
        return sorted.filter((e) => e.round === currentRound);
      case "threats":
        return sorted.filter((e) => e.impact === "negative");
      case "opportunities":
        return sorted.filter((e) => e.impact === "positive");
      default:
        return sorted;
    }
  }, [events, activeFilter, currentRound]);

  // Group events by round for display
  const groupedByRound = useMemo(() => {
    const groups: Map<number, MarketEvent[]> = new Map();
    for (const event of filteredEvents) {
      const existing = groups.get(event.round) ?? [];
      existing.push(event);
      groups.set(event.round, existing);
    }
    return groups;
  }, [filteredEvents]);

  const toggleRound = (round: number) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) {
        next.delete(round);
      } else {
        next.add(round);
      }
      return next;
    });
  };

  // Count per filter for badges
  const counts = useMemo(() => {
    return {
      all: events.length,
      this_round: events.filter((e) => e.round === currentRound).length,
      threats: events.filter((e) => e.impact === "negative").length,
      opportunities: events.filter((e) => e.impact === "positive").length,
    };
  }, [events, currentRound]);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-cyan-400" />
          Competitive Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTER_TABS.map(({ key, label, icon: TabIcon }) => {
            const isActive = activeFilter === key;
            const count = counts[key];
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-700 hover:text-slate-300"
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {label}
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-cyan-500/30 text-cyan-300"
                        : "bg-slate-600/50 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Event Feed */}
        <div className="max-h-[500px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                No market events to display
              </p>
              <p className="text-slate-600 text-xs mt-1">
                Events will appear as the game progresses
              </p>
            </div>
          ) : (
            Array.from(groupedByRound.entries()).map(
              ([round, roundEvents]) => {
                const isExpanded = expandedRounds.has(round);
                const isCurrentRound = round === currentRound;

                return (
                  <div key={round} className="space-y-1">
                    {/* Round Header */}
                    <button
                      onClick={() => toggleRound(round)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        isCurrentRound
                          ? "bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15"
                          : "bg-slate-700/30 hover:bg-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            isCurrentRound
                              ? "text-cyan-400"
                              : "text-slate-400"
                          }`}
                        >
                          Round {round}
                        </span>
                        {isCurrentRound && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 border text-[10px]">
                            Current
                          </Badge>
                        )}
                        <span className="text-slate-500 text-xs">
                          {roundEvents.length}{" "}
                          {roundEvents.length === 1 ? "event" : "events"}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Round Events */}
                    {isExpanded && (
                      <div className="space-y-1.5 pl-2">
                        {roundEvents.map((event, idx) => {
                          const style = IMPACT_STYLES[event.impact];
                          const Icon = getEventIcon(event.type);
                          const ImpactIcon = style.icon;

                          return (
                            <div
                              key={`${event.round}-${event.type}-${idx}`}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${style.bgColor} ${style.borderColor} hover:brightness-110`}
                            >
                              {/* Event Type Icon */}
                              <div
                                className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800/50`}
                              >
                                <Icon
                                  className={`w-4 h-4 ${style.color}`}
                                />
                              </div>

                              {/* Event Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge
                                    className={`${style.bgColor} ${style.color} border ${style.borderColor} text-[10px]`}
                                  >
                                    <ImpactIcon className="w-2.5 h-2.5 mr-0.5" />
                                    {style.label}
                                  </Badge>
                                  <span className="text-slate-500 text-xs capitalize">
                                    {event.type.replace(/_/g, " ")}
                                  </span>
                                  {event.segment && (
                                    <Badge className="bg-slate-700/50 text-slate-400 border-slate-600/50 border text-[10px]">
                                      {event.segment}
                                    </Badge>
                                  )}
                                  {event.teamId && (
                                    <span className="text-slate-500 text-xs">
                                      by{" "}
                                      <span className="text-slate-400">
                                        {event.teamId}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                  {event.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
            )
          )}
        </div>

        {/* Summary Footer */}
        {events.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-slate-400">
                  {counts.opportunities} Opportunities
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-slate-400">
                  {counts.threats} Threats
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-slate-400">
                  {events.filter((e) => e.impact === "neutral").length} Neutral
                </span>
              </div>
            </div>
            <span className="text-slate-500 text-xs">
              {events.length} total events
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
