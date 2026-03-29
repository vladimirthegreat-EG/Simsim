"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CONSTANTS, type Segment, type TeamState, type MarketState } from "@/engine/types";
import { SEGMENT_PROFILES } from "@/lib/config/segmentProfiles";
import { SEGMENT_PATHWAYS } from "@/lib/config/segmentPathways";
import { ALL_ACHIEVEMENTS } from "@/engine/types/achievements";
import { SEGMENT_DEMAND_CYCLES, getDemandMultiplier } from "@/lib/config/demandCycles";
import { WinConditionMatrix } from "./WinConditionMatrix";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Smartphone,
  Gamepad2,
  Briefcase,
  Activity,
  Trophy,
  Target,
  BarChart3,
  Info,
  ArrowUpRight,
  MapPin,
  Calendar,
  Waves,
  Globe,
  Users,
  Crown,
} from "lucide-react";

const SEGMENT_ICONS: Record<Segment, React.ElementType> = {
  Budget: DollarSign,
  General: Smartphone,
  Enthusiast: Gamepad2,
  Professional: Briefcase,
  "Active Lifestyle": Activity,
};

const SEGMENT_COLORS: Record<Segment, string> = {
  Budget: "text-green-400",
  General: "text-blue-400",
  Enthusiast: "text-purple-400",
  Professional: "text-amber-400",
  "Active Lifestyle": "text-pink-400",
};

const SEGMENT_BG: Record<Segment, string> = {
  Budget: "bg-green-500/10 border-green-500/20",
  General: "bg-blue-500/10 border-blue-500/20",
  Enthusiast: "bg-purple-500/10 border-purple-500/20",
  Professional: "bg-amber-500/10 border-amber-500/20",
  "Active Lifestyle": "bg-pink-500/10 border-pink-500/20",
};

interface CompetitorRanking {
  teamId: string;
  teamName: string;
  teamColor: string;
  rank: number;
  metrics: Record<string, number>;
}

interface MarketIntelligencePanelProps {
  state: TeamState | null;
  marketState?: MarketState | null;
  currentRound: number;
  competitorRankings?: CompetitorRanking[];
  teamId?: string;
  teamHistory?: Array<Record<string, unknown>>;
  marketEvents?: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    severity: string;
    round: number;
    effects?: Record<string, number>;
  }>;
}

export function MarketIntelligencePanel({
  state,
  marketState,
  currentRound,
  competitorRankings = [],
  teamId,
  marketEvents = [],
}: MarketIntelligencePanelProps) {
  const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

  // Achievement opportunities
  const achievementOpportunities = useMemo(() => {
    if (!state) return [];
    const earnedIds = new Set((state.achievements ?? []).map((a) => a.id));
    return ALL_ACHIEVEMENTS
      .filter((a) => !earnedIds.has(a.id) && a.category !== "Bad" && a.category !== "Infamy")
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        points: a.points,
      }));
  }, [state]);

  return (
    <div className="space-y-6">
      {/* Section 1: Economic Conditions (Capsim-style market overview) */}
      {marketState?.economicConditions && (
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-white font-semibold text-base">Economic Conditions</h3>
                <p className="text-slate-400 text-sm">Round {currentRound} macro environment</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <EconIndicator
                label="GDP Growth"
                value={`${(marketState.economicConditions.gdp * 100).toFixed(1)}%`}
                trend={marketState.economicConditions.gdp > 0.02 ? "up" : marketState.economicConditions.gdp < 0 ? "down" : "flat"}
              />
              <EconIndicator
                label="Inflation"
                value={`${(marketState.economicConditions.inflation * 100).toFixed(1)}%`}
                trend={marketState.economicConditions.inflation > 0.03 ? "down" : "flat"}
                invertTrend
              />
              <EconIndicator
                label="Consumer Confidence"
                value={`${marketState.economicConditions.consumerConfidence.toFixed(0)}`}
                trend={marketState.economicConditions.consumerConfidence > 60 ? "up" : marketState.economicConditions.consumerConfidence < 40 ? "down" : "flat"}
              />
              <EconIndicator
                label="Unemployment"
                value={`${(marketState.economicConditions.unemploymentRate * 100).toFixed(1)}%`}
                trend={marketState.economicConditions.unemploymentRate > 0.06 ? "down" : "flat"}
                invertTrend
              />
            </div>

            {/* Market Pressures */}
            {marketState.marketPressures && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h4 className="text-slate-400 text-xs font-medium uppercase mb-3">Market Pressures</h4>
                <div className="grid grid-cols-3 gap-4">
                  <PressureBar label="Price Competition" value={marketState.marketPressures.priceCompetition} />
                  <PressureBar label="Quality Expectations" value={marketState.marketPressures.qualityExpectations} />
                  <PressureBar label="Sustainability Premium" value={marketState.marketPressures.sustainabilityPremium} />
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Section 2: Market Events (merged from News page) */}
      {marketEvents.length === 0 && (
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-white text-lg font-medium mb-2">No Market Events Yet</h3>
              <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">Events appear as the game progresses. Check back after each round for new market developments.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {marketEvents.length > 0 && (
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-white font-semibold text-base">Market Events</h3>
                <p className="text-slate-400 text-sm">Recent events affecting the market</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {marketEvents.slice(0, 5).map((event) => (
                <div key={event.id} className={`p-3 rounded-lg border ${
                  event.severity === "critical" ? "border-red-500/30 bg-red-900/10" :
                  event.severity === "high" ? "border-amber-500/30 bg-amber-900/10" :
                  "border-slate-600/30 bg-slate-700/30"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{event.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${
                        event.severity === "critical" ? "text-red-400 border-red-500/30" :
                        event.severity === "high" ? "text-amber-400 border-amber-500/30" :
                        "text-slate-400 border-slate-500/30"
                      }`}>
                        {event.severity}
                      </Badge>
                      <span className="text-slate-500 text-xs">Round {event.round}</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs">{event.description}</p>
                  {event.effects && Object.keys(event.effects).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(event.effects).map(([key, value]) => (
                        <Badge key={key} className={`text-[10px] ${
                          value > 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {key.replace(/_/g, " ")}: {value > 0 ? "+" : ""}{(value * 100).toFixed(0)}%
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Segment Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          Market Segments
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {segments.map((segment) => {
            const profile = SEGMENT_PROFILES[segment];
            const weights = CONSTANTS.SEGMENT_WEIGHTS[segment];
            const Icon = SEGMENT_ICONS[segment];
            const demandData = marketState?.demandBySegment?.[segment];
            const currentDemand = demandData?.totalDemand ?? profile.demandUnits;

            // Find top factor
            const factors = Object.entries(weights) as [string, number][];
            factors.sort((a, b) => b[1] - a[1]);
            const topFactor = factors[0];

            // Player's market share in this segment
            const playerShare = state?.marketShare?.[segment] ?? 0;

            return (
              <Card key={segment} className={`border ${SEGMENT_BG[segment]}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${SEGMENT_COLORS[segment]}`} />
                    <span className={`text-sm font-semibold ${SEGMENT_COLORS[segment]}`}>{segment}</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-1">
                    {(currentDemand / 1000).toFixed(0)}K
                  </div>
                  <div className="text-slate-400 text-xs mb-2">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-green-400" />
                      +{((demandData?.growthRate ?? profile.demandGrowthRate) * 100).toFixed(0)}%/yr
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs mb-2">
                    ${demandData?.priceRange?.min ?? profile.priceRange.min}-${demandData?.priceRange?.max ?? profile.priceRange.max}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[10px] uppercase">Wins on:</span>
                    <Badge variant="outline" className={`text-[10px] py-0 border-slate-600 ${SEGMENT_COLORS[segment]}`}>
                      {topFactor[0]} ({topFactor[1]}pts)
                    </Badge>
                  </div>
                  {playerShare > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Your share</span>
                        <span className="text-white font-medium">{(playerShare * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={playerShare * 100} className="h-1 mt-1" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Section 3: Competitor Rankings (Capsim/BSG-style leaderboard) */}
      {(competitorRankings.length === 0 || currentRound <= 1) && (
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-white text-lg font-medium mb-2">Competitor Data Coming Soon</h3>
              <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">Competitor rankings and performance data will be available after Round 1 results are processed.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {competitorRankings.length > 0 && currentRound > 1 && (
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-400" />
              <div>
                <h3 className="text-white font-semibold text-base">Competitor Rankings</h3>
                <p className="text-slate-400 text-sm">Last round results — all teams</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {competitorRankings
                .sort((a, b) => a.rank - b.rank)
                .map((comp) => {
                  const isYou = comp.teamId === teamId;
                  const revenue = isFinite(comp.metrics.revenue) ? comp.metrics.revenue : 0;
                  const marketShare = isFinite(comp.metrics.marketShare) ? comp.metrics.marketShare : 0;
                  const profitMargin = isFinite(comp.metrics.profitMargin) ? comp.metrics.profitMargin : 0;
                  const brandValue = isFinite(comp.metrics.brandValue) ? comp.metrics.brandValue : 0;

                  return (
                    <div
                      key={comp.teamId}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isYou
                          ? "border-cyan-500/30 bg-cyan-500/5"
                          : "border-slate-700 bg-slate-700/30"
                      }`}
                    >
                      {/* Rank */}
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-700">
                        {comp.rank === 1 ? (
                          <Crown className="w-4 h-4 text-amber-400" />
                        ) : (
                          <span className="text-sm font-bold text-slate-300">#{comp.rank}</span>
                        )}
                      </div>

                      {/* Team name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: comp.teamColor }}
                          />
                          <span className={`text-sm font-medium truncate ${isYou ? "text-cyan-300" : "text-white"}`}>
                            {comp.teamName}
                            {isYou && <span className="text-cyan-500 text-xs ml-1">(You)</span>}
                          </span>
                        </div>
                      </div>

                      {/* Key metrics */}
                      <div className="hidden sm:flex items-center gap-4 text-xs shrink-0">
                        <div className="text-right">
                          <div className="text-slate-500">Revenue</div>
                          <div className="text-white font-medium tabular-nums">
                            ${revenue >= 1_000_000 ? `${(revenue / 1_000_000).toFixed(1)}M` : `${(revenue / 1_000).toFixed(0)}K`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500">Share</div>
                          <div className="text-white font-medium tabular-nums">
                            {(marketShare * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500">Margin</div>
                          <div className={`font-medium tabular-nums ${profitMargin > 0 ? "text-green-400" : "text-red-400"}`}>
                            {(profitMargin * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500">Brand</div>
                          <div className="text-white font-medium tabular-nums">
                            {(brandValue * 100).toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Win Condition Matrix */}
      <WinConditionMatrix />

      {/* Section 6: Segment Pathways */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-white font-semibold text-base">Segment Pathways</h3>
              <p className="text-slate-400 text-sm">Recommended progression for each segment</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {segments.map((segment) => {
              const pathway = SEGMENT_PATHWAYS[segment];
              const Icon = SEGMENT_ICONS[segment];

              return (
                <div key={segment} className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${SEGMENT_COLORS[segment]}`} />
                    <span className={`text-sm font-semibold ${SEGMENT_COLORS[segment]}`}>{segment}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {pathway.phases.map((phase, idx) => {
                      const roundStart = parseInt(phase.rounds.split("-")[0]);
                      const isActive = phase.archetypeId !== null;
                      const isCurrent = currentRound >= roundStart && (idx === pathway.phases.length - 1 || currentRound < parseInt(pathway.phases[idx + 1].rounds.split("-")[0]));

                      return (
                        <div
                          key={idx}
                          className={`flex-shrink-0 p-2.5 rounded-lg border min-w-[180px] ${
                            isCurrent
                              ? "border-cyan-500/40 bg-cyan-500/5"
                              : "border-slate-600/50 bg-slate-700/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white text-xs font-medium">{phase.name}</span>
                            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400 py-0">
                              R{phase.rounds}
                            </Badge>
                          </div>
                          {isActive ? (
                            <div className="text-cyan-400 text-xs font-medium mb-1">{phase.archetypeName}</div>
                          ) : (
                            <div className="text-slate-500 text-xs italic mb-1">Build elsewhere first</div>
                          )}
                          <div className="text-slate-400 text-[10px]">{phase.rdTarget}</div>
                          {phase.note && (
                            <div className="mt-1 flex items-start gap-1">
                              <Info className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                              <span className="text-slate-500 text-[10px] leading-tight">{phase.note}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Demand Cycles & Forecasting */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-white font-semibold text-base">Demand Cycles</h3>
              <p className="text-slate-400 text-sm">Seasonal demand patterns by segment</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {segments.map((segment) => {
              const cycle = SEGMENT_DEMAND_CYCLES[segment];
              const currentMultiplier = getDemandMultiplier(segment, currentRound);
              const nextMultiplier = getDemandMultiplier(segment, currentRound + 1);
              const Icon = SEGMENT_ICONS[segment];
              const trend = nextMultiplier > currentMultiplier ? "rising" : nextMultiplier < currentMultiplier ? "falling" : "stable";

              // Find current cycle label
              const roundInCycle = ((currentRound - 1) % cycle.cycleLength);
              const activeLabel = cycle.points.find((p) => p.roundInCycle === roundInCycle)?.label;

              return (
                <div key={segment} className="flex items-center gap-3 p-2.5 bg-slate-700/30 rounded-lg">
                  <Icon className={`w-4 h-4 ${SEGMENT_COLORS[segment]} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium ${SEGMENT_COLORS[segment]}`}>{segment}</span>
                      {activeLabel && (
                        <Badge variant="outline" className="text-[10px] py-0 border-slate-600 text-teal-400">
                          <Calendar className="w-2.5 h-2.5 mr-1" />
                          {activeLabel}
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-500 text-[10px] truncate">{cycle.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-bold ${
                      currentMultiplier >= 1.1 ? "text-green-400" :
                      currentMultiplier <= 0.9 ? "text-red-400" :
                      "text-slate-300"
                    }`}>
                      {(currentMultiplier * 100).toFixed(0)}%
                    </div>
                    <div className={`text-[10px] flex items-center gap-0.5 justify-end ${
                      trend === "rising" ? "text-green-400" :
                      trend === "falling" ? "text-red-400" :
                      "text-slate-500"
                    }`}>
                      {trend === "rising" ? "↑" : trend === "falling" ? "↓" : "→"} Next: {(nextMultiplier * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 8: Next Round Market Forecast */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-white font-semibold text-base">Next Round Forecast</h3>
              <p className="text-slate-400 text-sm">Estimated demand for Round {currentRound + 1}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {segments.map((segment) => {
              const profile = SEGMENT_PROFILES[segment];
              const demandData = marketState?.demandBySegment?.[segment];
              const currentDemand = demandData?.totalDemand ?? profile.demandUnits;
              const growthRate = demandData?.growthRate ?? profile.demandGrowthRate;
              const nextMultiplier = getDemandMultiplier(segment, currentRound + 1);
              const currentMultiplier = getDemandMultiplier(segment, currentRound);
              const forecastDemand = Math.round(currentDemand * (1 + growthRate) * (nextMultiplier / Math.max(0.01, currentMultiplier)));
              const change = forecastDemand - currentDemand;
              const changePct = currentDemand > 0 ? ((change / currentDemand) * 100).toFixed(1) : "0";
              const Icon = SEGMENT_ICONS[segment];

              return (
                <div key={segment} className={`p-3 rounded-lg border ${SEGMENT_BG[segment]}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className={`w-3.5 h-3.5 ${SEGMENT_COLORS[segment]}`} />
                    <span className={`text-xs font-medium ${SEGMENT_COLORS[segment]}`}>{segment}</span>
                  </div>
                  <div className="text-lg font-bold text-white">{(forecastDemand / 1000).toFixed(0)}K</div>
                  <div className={`text-xs flex items-center gap-1 ${
                    change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-slate-400"
                  }`}>
                    {change > 0 ? "↑" : change < 0 ? "↓" : "→"} {change > 0 ? "+" : ""}{changePct}% vs current
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-slate-500 text-xs mt-3">Forecasts are estimates based on growth rates and seasonal cycles. Actual demand may vary.</p>
        </CardContent>
      </Card>

      {/* Section 9: Achievement Opportunities */}
      {achievementOpportunities.length > 0 && (
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-white font-semibold text-base">Achievement Opportunities</h3>
                <p className="text-slate-400 text-sm">
                  Achievements you can still unlock ({state?.achievementScore ?? 0} points earned)
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {achievementOpportunities.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2.5 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-white text-sm font-medium">{a.name}</span>
                      <p className="text-slate-400 text-xs">{a.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                      {a.category}
                    </Badge>
                    <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                      +{a.points}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Economic indicator mini-card */
function EconIndicator({
  label,
  value,
  trend,
  invertTrend = false,
}: {
  label: string;
  value: string;
  trend: "up" | "down" | "flat";
  invertTrend?: boolean;
}) {
  const isGood = invertTrend ? trend === "down" : trend === "up";
  const isBad = invertTrend ? trend === "up" : trend === "down";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity;

  return (
    <div className="p-3 bg-slate-700/30 rounded-lg">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-white text-lg font-bold">{value}</span>
        <TrendIcon
          className={`w-4 h-4 ${
            isGood ? "text-green-400" : isBad ? "text-red-400" : "text-slate-500"
          }`}
        />
      </div>
    </div>
  );
}

/** Market pressure bar */
function PressureBar({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className={`font-medium ${
          percent > 70 ? "text-red-400" : percent > 40 ? "text-amber-400" : "text-green-400"
        }`}>
          {percent}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-700 rounded-full">
        <div
          className={`h-1.5 rounded-full transition-all ${
            percent > 70 ? "bg-red-500" : percent > 40 ? "bg-amber-500" : "bg-green-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
