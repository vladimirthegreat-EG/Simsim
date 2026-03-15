"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/api/trpc";
import { MetricLineChart, MetricBarChart, MarketSharePieChart, WaterfallChart, SegmentRadarChart, CompetitiveScorecard } from "@/components/charts";
import { RoundResultsCard } from "@/components/game/RoundResultsCard";
import { TeamRankingsCard } from "@/components/game/TeamRankingsCard";
import { RoundNarrativeCard } from "@/components/game/RoundNarrativeCard";
import { ModuleResultCard } from "@/components/game/ModuleResultCard";
import { AchievementUnlockedCard } from "@/components/game/AchievementUnlockedCard";
import { TechUnlockCard } from "@/components/game/TechUnlockCard";
import type { TeamState } from "@/engine/types";
import {
  Trophy,
  TrendingUp,
  BarChart3,
  PieChart,
  Clock,
  Target,
  Factory,
  Users,
  DollarSign,
  Package,
  Activity,
  Radar,
} from "lucide-react";

export default function ResultsPage() {
  const { data: teamState, isLoading: isLoadingTeam } = trpc.team.getMyState.useQuery();
  const { data: performanceData, isLoading: isLoadingPerformance } = trpc.team.getPerformanceHistory.useQuery();
  const { data: roundResults } = trpc.team.getRoundResults.useQuery();

  const isLoading = isLoadingTeam || isLoadingPerformance;

  const currentRound = teamState?.game.currentRound || 1;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  // Define type for history data
  interface HistoryDataPoint {
    round: number;
    revenue: number;
    netIncome: number;
    cash: number;
    marketShare: number;
    rank: number;
  }

  // Get history data from real performance data
  const historyData: HistoryDataPoint[] = performanceData?.history?.length
    ? performanceData.history.map((h) => {
        const metrics = h as unknown as Record<string, unknown>;
        const ms = typeof metrics.marketShare === 'object' && metrics.marketShare
          ? Object.values(metrics.marketShare as Record<string, number>).reduce((a, b) => a + b, 0) /
            Math.max(1, Object.keys(metrics.marketShare as Record<string, number>).length)
          : (metrics.marketShare as number) || 0;
        return {
          round: h.round,
          revenue: (metrics.revenue as number) || 0,
          netIncome: (metrics.netIncome as number) || 0,
          cash: (metrics.cash as number) || 0,
          marketShare: ms,
          rank: h.rank,
        };
      })
    : [];

  // Current rankings
  const rankings = performanceData?.currentRankings?.length
    ? performanceData.currentRankings.map((r) => {
        const metrics = typeof r.metrics === 'string' ? JSON.parse(r.metrics) : (r.metrics || {});
        const ms = typeof metrics.marketShare === 'object' && metrics.marketShare
          ? Object.values(metrics.marketShare as Record<string, number>).reduce((a, b) => a + b, 0) /
            Math.max(1, Object.keys(metrics.marketShare as Record<string, number>).length)
          : (metrics.marketShare as number) || 0;
        return {
          id: r.teamId,
          name: r.teamName,
          color: r.teamColor,
          rank: r.rank,
          marketShare: ms,
          revenue: (metrics.revenue as number) || 0,
        };
      })
    : teamState?.game.teams?.map((t: { id: string; name: string; color: string }, idx: number) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        rank: 0,
        marketShare: 0,
        revenue: 0,
        isCurrentTeam: t.id === teamState.team.id,
      })) || [];

  // Market share pie data (only teams with actual share)
  const marketShareData = rankings
    .filter((t) => t.marketShare > 0)
    .map((t) => ({
      name: t.name,
      value: t.marketShare,
      color: t.color,
    }));

  // Round-over-round comparison
  const roundComparison = historyData.map((r, idx) => ({
    name: `R${r.round}`,
    value: r.revenue,
    color: idx === historyData.length - 1 ? "#3b82f6" : "#64748b",
  }));

  // Parse team state for additional analytics
  const state: TeamState | null = useMemo(() => {
    if (!teamState?.state) return null;
    try {
      return typeof teamState.state === 'string'
        ? JSON.parse(teamState.state) as TeamState
        : teamState.state as TeamState;
    } catch {
      return null;
    }
  }, [teamState?.state]);

  // Operational metrics
  const operationalMetrics = useMemo(() => {
    if (!state) return null;

    const totalCapacity = state.factories?.reduce(
      (sum, f) => sum + f.productionLines.reduce((s, l) => s + l.capacity, 0),
      0
    ) || 0;

    const avgEfficiency = state.factories?.length
      ? state.factories.reduce((sum, f) => sum + f.efficiency, 0) / state.factories.length
      : 0;

    const avgDefectRate = state.factories?.length
      ? state.factories.reduce((sum, f) => sum + f.defectRate, 0) / state.factories.length
      : 0;

    const totalEmployees = state.employees?.length || 0;
    const avgMorale = state.workforce?.averageMorale || 0;
    const avgProductivity = state.workforce?.averageEfficiency || 0;

    const launchedProducts = state.products?.filter(
      p => p.developmentStatus === 'launched' || p.developmentStatus === 'ready'
    ).length || 0;

    return {
      totalCapacity,
      avgEfficiency,
      avgDefectRate,
      totalEmployees,
      avgMorale,
      avgProductivity,
      launchedProducts,
      brandValue: state.brandValue || 0,
      patents: state.patents || 0,
    };
  }, [state]);

  // Segment performance
  const segmentPerformance = useMemo(() => {
    if (!state?.marketShare) return [];

    return Object.entries(state.marketShare).map(([segment, share]) => ({
      segment,
      share: share * 100,
      color: segment === 'Budget' ? '#22c55e' :
             segment === 'General' ? '#3b82f6' :
             segment === 'Enthusiast' ? '#8b5cf6' :
             segment === 'Professional' ? '#f59e0b' :
             '#ec4899',
    }));
  }, [state?.marketShare]);

  // Explainability-based chart data
  const explainability = roundResults?.explainability as {
    profitDriverTree?: { waterfallSteps?: { label: string; value: number; type: string }[] };
    segmentBreakdowns?: {
      segment: string;
      scores: Record<string, number>;
      totalScore: number;
      rank: number;
      marketShare: number;
      competitorComparison?: { teamId: string; teamName: string; score: number; rank: number; marketShare: number }[];
    }[];
  } | null;

  const waterfallItems = useMemo(() => {
    const steps = explainability?.profitDriverTree?.waterfallSteps;
    if (!steps?.length) return null;
    return steps.map((s) => ({
      name: s.label,
      value: s.value,
      type: (s.type === "decrease" ? "negative" : s.type === "total" ? "total" : "positive") as "positive" | "negative" | "total",
    }));
  }, [explainability?.profitDriverTree?.waterfallSteps]);

  const radarData = useMemo(() => {
    const breakdowns = explainability?.segmentBreakdowns;
    if (!breakdowns?.length) return null;
    // Average scores across all segments for a single radar
    const dims = ["price", "quality", "brand", "esg", "features"] as const;
    return dims.map((d) => ({
      subject: d.charAt(0).toUpperCase() + d.slice(1),
      value: breakdowns.reduce((sum, b) => sum + (b.scores[d] || 0), 0) / breakdowns.length,
      fullMark: 100,
    }));
  }, [explainability?.segmentBreakdowns]);

  const totalTeamsFromHistory = historyData.length > 0 ? rankings.length : 0;

  const scorecardData = useMemo(() => {
    const breakdowns = explainability?.segmentBreakdowns;
    if (!breakdowns?.length) return null;
    const totalTeamsCount = breakdowns[0]?.competitorComparison?.length
      ? breakdowns[0].competitorComparison.length + 1
      : rankings.length || totalTeamsFromHistory;
    return {
      scores: breakdowns.map((b) => ({
        segment: b.segment,
        score: b.totalScore,
        rank: b.rank,
        totalTeams: totalTeamsCount,
        marketShare: b.marketShare,
      })),
      overallRank: historyData.length > 0 ? historyData[historyData.length - 1].rank : 0,
      totalTeams: totalTeamsCount,
    };
  }, [explainability?.segmentBreakdowns, rankings.length, historyData, totalTeamsFromHistory]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-700 rounded w-1/3"></div>
        <div className="h-32 bg-slate-700 rounded-xl"></div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-700 rounded-xl"></div>
          <div className="h-64 bg-slate-700 rounded-xl"></div>
        </div>
        <div className="h-48 bg-slate-700 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Results</h1>
          <p className="text-slate-400">Track your progress across rounds</p>
        </div>
        <Badge className="bg-slate-700 text-slate-300">
          <Clock className="w-3 h-3 mr-1" />
          Round {currentRound} of {teamState?.game.maxRounds}
        </Badge>
      </div>

      {/* Show message if game just started */}
      {currentRound <= 1 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12">
            <div className="text-center">
              <Target className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Results Yet</h3>
              <p className="text-slate-400">
                Results will appear here after the first round is complete.
                <br />
                Make your decisions and wait for the facilitator to advance the round.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results content (only show if we have history) */}
      {currentRound > 1 && (
        <>
          {/* Latest Round Result */}
          {historyData.length > 0 && (
            <RoundResultsCard
              result={{
                round: historyData[historyData.length - 1].round,
                revenue: historyData[historyData.length - 1].revenue,
                netIncome: historyData[historyData.length - 1].netIncome,
                marketShare: historyData[historyData.length - 1].marketShare,
                rank: historyData[historyData.length - 1].rank,
                totalTeams: rankings.length,
                cashChange: historyData.length > 1
                  ? historyData[historyData.length - 1].cash - historyData[historyData.length - 2].cash
                  : 0,
                stockPriceChange: 0,
              }}
              previousResult={historyData.length > 1 ? {
                round: historyData[historyData.length - 2].round,
                revenue: historyData[historyData.length - 2].revenue,
                netIncome: historyData[historyData.length - 2].netIncome,
                marketShare: historyData[historyData.length - 2].marketShare,
                rank: historyData[historyData.length - 2].rank,
                totalTeams: rankings.length,
                cashChange: 0,
                stockPriceChange: 0,
              } : undefined}
            />
          )}

          {/* Achievement Unlocks */}
          {state?.achievements && state.achievements.length > 0 && roundResults && (
            <AchievementUnlockedCard
              achievements={state.achievements}
              currentRound={roundResults.round}
              totalScore={state.achievementScore}
            />
          )}

          {/* Tech Unlocks */}
          {roundResults?.moduleResults?.rd?.messages?.some((m: string) => m.includes("Technology unlocked")) && (
            <TechUnlockCard
              messages={roundResults.moduleResults.rd.messages.filter((m: string) => m.includes("Technology unlocked"))}
              totalTechsUnlocked={state?.unlockedTechnologies?.length ?? 0}
            />
          )}

          {/* Round Narrative from ExplainabilityEngine */}
          {roundResults?.explainability && (
            <RoundNarrativeCard
              narrative={(roundResults.explainability as { narrative?: { headline: string; summary: string; keyHighlights: { title: string; description: string }[]; concerns: { title: string; description: string }[]; recommendations: { title: string; description: string }[] } })?.narrative ?? null}
              round={roundResults.round}
            />
          )}

          {/* Per-Module Results */}
          {roundResults?.moduleResults && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roundResults.moduleResults.factory?.messages?.length > 0 && (
                <ModuleResultCard
                  moduleId="factory"
                  messages={roundResults.moduleResults.factory.messages}
                  costs={roundResults.moduleResults.factory.costs}
                />
              )}
              {roundResults.moduleResults.hr?.messages?.length > 0 && (
                <ModuleResultCard
                  moduleId="hr"
                  messages={roundResults.moduleResults.hr.messages}
                  costs={roundResults.moduleResults.hr.costs}
                />
              )}
              {roundResults.moduleResults.finance?.messages?.length > 0 && (
                <ModuleResultCard
                  moduleId="finance"
                  messages={roundResults.moduleResults.finance.messages}
                  costs={roundResults.moduleResults.finance.costs}
                />
              )}
              {roundResults.moduleResults.marketing?.messages?.length > 0 && (
                <ModuleResultCard
                  moduleId="marketing"
                  messages={roundResults.moduleResults.marketing.messages}
                  costs={roundResults.moduleResults.marketing.costs}
                />
              )}
              {roundResults.moduleResults.rd?.messages?.length > 0 && (
                <ModuleResultCard
                  moduleId="rd"
                  messages={roundResults.moduleResults.rd.messages}
                  costs={roundResults.moduleResults.rd.costs}
                />
              )}
            </div>
          )}

          {/* Tabbed Chart Views */}
          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="financial" className="data-[state=active]:bg-slate-700">
                <TrendingUp className="w-4 h-4 mr-2" />
                Financial
              </TabsTrigger>
              <TabsTrigger value="market" className="data-[state=active]:bg-slate-700">
                <PieChart className="w-4 h-4 mr-2" />
                Market Share
              </TabsTrigger>
              <TabsTrigger value="operations" className="data-[state=active]:bg-slate-700">
                <Activity className="w-4 h-4 mr-2" />
                Operations
              </TabsTrigger>
              <TabsTrigger value="comparison" className="data-[state=active]:bg-slate-700">
                <BarChart3 className="w-4 h-4 mr-2" />
                Round Comparison
              </TabsTrigger>
              {(waterfallItems || radarData || scorecardData) && (
                <TabsTrigger value="analysis" className="data-[state=active]:bg-slate-700">
                  <Radar className="w-4 h-4 mr-2" />
                  Deep Analysis
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="financial" className="mt-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Financial Performance Over Time
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Track revenue, net income, and cash position across rounds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricLineChart
                    data={historyData.map((d) => ({
                      round: d.round,
                      revenue: d.revenue,
                      netIncome: d.netIncome,
                      cash: d.cash,
                    }))}
                    lines={[
                      { dataKey: "revenue", name: "Revenue", color: "#22c55e" },
                      { dataKey: "netIncome", name: "Net Income", color: "#3b82f6" },
                      { dataKey: "cash", name: "Cash", color: "#f59e0b" },
                    ]}
                    height={350}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="market" className="mt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Current Market Share
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Distribution of market share among teams
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MarketSharePieChart
                      data={marketShareData}
                      height={300}
                      highlightTeam={teamState?.team.name}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Market Share Trend
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Your market share over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MetricLineChart
                      data={historyData.map((d) => ({
                        round: d.round,
                        marketShare: d.marketShare,
                      }))}
                      lines={[
                        { dataKey: "marketShare", name: "Market Share", color: "#8b5cf6" },
                      ]}
                      height={300}
                      formatValue={(v) => `${(v * 100).toFixed(1)}%`}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="operations" className="mt-4">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Production Metrics */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Factory className="w-5 h-5" />
                      Production Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="text-slate-400 text-sm">Total Capacity</div>
                        <div className="text-xl font-bold text-orange-400">
                          {operationalMetrics?.totalCapacity?.toLocaleString() || 0} units
                        </div>
                      </div>
                      <div className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="text-slate-400 text-sm">Products Launched</div>
                        <div className="text-xl font-bold text-purple-400">
                          {operationalMetrics?.launchedProducts || 0}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400 text-sm">Factory Efficiency</span>
                        <span className="text-white text-sm">{((operationalMetrics?.avgEfficiency || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={(operationalMetrics?.avgEfficiency || 0) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400 text-sm">Quality (Defect Rate)</span>
                        <span className={`text-sm ${(operationalMetrics?.avgDefectRate || 0) <= 0.03 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {((operationalMetrics?.avgDefectRate || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={100 - (operationalMetrics?.avgDefectRate || 0) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Workforce Metrics */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Workforce Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="text-slate-400 text-sm">Total Employees</div>
                        <div className="text-xl font-bold text-blue-400">
                          {operationalMetrics?.totalEmployees || 0}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="text-slate-400 text-sm">Patents</div>
                        <div className="text-xl font-bold text-yellow-400">
                          {Array.isArray(operationalMetrics?.patents) ? operationalMetrics.patents.length : (operationalMetrics?.patents || 0)}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400 text-sm">Morale</span>
                        <span className="text-white text-sm">{(operationalMetrics?.avgMorale || 0).toFixed(0)}%</span>
                      </div>
                      <Progress value={operationalMetrics?.avgMorale || 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400 text-sm">Productivity</span>
                        <span className="text-white text-sm">{(operationalMetrics?.avgProductivity || 0).toFixed(0)}%</span>
                      </div>
                      <Progress value={operationalMetrics?.avgProductivity || 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400 text-sm">Brand Value</span>
                        <span className="text-pink-400 text-sm">{((operationalMetrics?.brandValue || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={(operationalMetrics?.brandValue || 0) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Segment Performance */}
                {segmentPerformance.length > 0 && (
                  <Card className="bg-slate-800 border-slate-700 md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Market Share by Segment
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Your market penetration across different customer segments
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {segmentPerformance.map((seg) => (
                          <div key={seg.segment} className="p-3 bg-slate-700/50 rounded-lg">
                            <div className="text-slate-400 text-sm mb-1">{seg.segment}</div>
                            <div
                              className="text-xl font-bold"
                              style={{ color: seg.color }}
                            >
                              {seg.share.toFixed(1)}%
                            </div>
                            <Progress
                              value={seg.share}
                              className="h-1 mt-2"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comparison" className="mt-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Round-by-Round Revenue
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Compare your revenue performance across rounds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricBarChart
                    data={roundComparison}
                    height={350}
                    colorByValue
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {(waterfallItems || radarData || scorecardData) && (
              <TabsContent value="analysis" className="mt-4">
                <div className="space-y-6">
                  {waterfallItems && (
                    <WaterfallChart
                      items={waterfallItems}
                      title="Profit Waterfall"
                      description="Revenue and cost components driving your bottom line"
                      height={350}
                    />
                  )}
                  <div className="grid md:grid-cols-2 gap-6">
                    {radarData && (
                      <SegmentRadarChart
                        data={radarData}
                        title="Average Score Radar"
                        description="Your average scores across market dimensions"
                        height={300}
                      />
                    )}
                    {scorecardData && (
                      <CompetitiveScorecard
                        scores={scorecardData.scores}
                        teamName={teamState?.team.name || "Your Team"}
                        overallRank={scorecardData.overallRank}
                        totalTeams={scorecardData.totalTeams}
                      />
                    )}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Team Rankings */}
          <TeamRankingsCard teams={rankings} currentTeamId={teamState?.team.id} />

          {/* Historical Round Cards */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Round History
              </CardTitle>
              <CardDescription className="text-slate-400">
                Detailed results from each completed round
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...historyData].reverse().map((roundData, idx) => (
                  <div
                    key={roundData.round}
                    className={`p-4 rounded-lg ${
                      idx === 0 ? "bg-blue-500/10 border border-blue-500/30" : "bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            idx === 0
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-slate-600/50 text-slate-400"
                          }
                        >
                          Round {roundData.round}
                        </Badge>
                        {idx === 0 && (
                          <Badge className="bg-green-500/20 text-green-400">Latest</Badge>
                        )}
                      </div>
                      <Badge
                        className={
                          roundData.rank === 1
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-slate-600/50 text-slate-400"
                        }
                      >
                        <Trophy className="w-3 h-3 mr-1" />
                        Rank #{roundData.rank}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Revenue</span>
                        <p className="text-white font-medium">{formatCurrency(roundData.revenue)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Net Income</span>
                        <p className={`font-medium ${roundData.netIncome >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {formatCurrency(roundData.netIncome)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Cash</span>
                        <p className="text-yellow-400 font-medium">{formatCurrency(roundData.cash)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Market Share</span>
                        <p className="text-purple-400 font-medium">
                          {(roundData.marketShare * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
