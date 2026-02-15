"use client";

import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader } from "@/components/ui/section-header";
import { trpc } from "@/lib/api/trpc";
import { RoundResultsCard } from "@/components/game/RoundResultsCard";
import { PerformanceHistoryChart } from "@/components/game/PerformanceHistoryChart";
import { TeamRankingsCard } from "@/components/game/TeamRankingsCard";
import { MarketSharePieChart } from "@/components/charts";
import { ESGNotification } from "@/components/game/ESGNotification";
import {
  DollarSign,
  Factory,
  Users,
  Leaf,
  TrendingUp,
  TrendingDown,
  Package,
  Award,
  Target,
  BarChart3,
  Trophy,
  Beaker,
  Clock,
  Building2,
} from "lucide-react";

// Types from engine
interface Employee {
  id: string;
  role: "worker" | "engineer" | "supervisor";
  name: string;
}

interface FactoryData {
  id: string;
  name: string;
  region: string;
  efficiency: number;
  workers: number;
  engineers: number;
  supervisors: number;
  productionLines?: Array<{
    segment: string;
    capacity: number;
  }>;
}

interface Product {
  id: string;
  name: string;
  segment: string;
  quality: number;
  price: number;
  features: number;
  developmentStatus: "in_development" | "ready" | "launched";
  developmentProgress: number;
  roundsRemaining: number;
}

interface TeamStateData {
  cash: number;
  revenue: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  esgScore: number;
  brandValue: number;
  marketShare: Record<string, number>;
  factories: FactoryData[];
  employees: Employee[];
  products: Product[];
  workforce: {
    totalHeadcount: number;
    averageMorale: number;
    averageEfficiency: number;
  };
}

interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default function OverviewPage({ params }: PageProps) {
  const { gameId } = use(params);

  const { data: teamState, isLoading } = trpc.team.getMyState.useQuery();
  const { data: performanceData } = trpc.team.getPerformanceHistory.useQuery(
    undefined,
    { enabled: !!teamState }
  );

  // Parse the team's current state from JSON with proper typing
  const companyState = (typeof teamState?.state === 'string'
    ? JSON.parse(teamState.state)
    : teamState?.state) as TeamStateData | null;

  // Calculate employee counts from the employees array
  const employeeCounts = companyState?.employees?.reduce(
    (acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || { worker: 0, engineer: 0, supervisor: 0 };

  const totalEmployees = companyState?.workforce?.totalHeadcount ||
    companyState?.employees?.length || 0;

  // Calculate factory metrics
  const totalCapacity = companyState?.factories?.reduce((sum, f) => {
    const lineCapacity = f.productionLines?.reduce((lsum, line) => lsum + (line.capacity || 0), 0) || 50000;
    return sum + lineCapacity;
  }, 0) || 0;

  const avgEfficiency = companyState?.factories?.length
    ? companyState.factories.reduce((sum, f) => sum + f.efficiency, 0) / companyState.factories.length
    : 0;

  // Calculate total market share (average across segments)
  const totalMarketShare = companyState?.marketShare
    ? Object.values(companyState.marketShare).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(companyState.marketShare).length)
    : 0;

  // Separate products by status
  const launchedProducts = companyState?.products?.filter(p => p.developmentStatus === "launched") || [];
  const developingProducts = companyState?.products?.filter(p => p.developmentStatus === "in_development") || [];
  const readyProducts = companyState?.products?.filter(p => p.developmentStatus === "ready") || [];

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const currentRound = teamState?.game.currentRound || 1;

  // Real historical data from round results
  const historicalData = performanceData?.history?.length
    ? performanceData.history.map((h: Record<string, unknown>) => ({
        round: h.round as number,
        revenue: (h.revenue as number) || 0,
        netIncome: (h.netIncome as number) || 0,
        cash: (h.cash as number) || (companyState?.cash || 0),
        marketShare: typeof h.marketShare === 'object' && h.marketShare
          ? Object.values(h.marketShare as Record<string, number>).reduce((a, b) => a + b, 0) /
            Math.max(1, Object.keys(h.marketShare as Record<string, number>).length)
          : (h.marketShare as number) || 0,
      }))
    : [];

  // Real rank from most recent round result
  const latestResult = teamState?.recentResults?.[0];
  const latestMetrics = latestResult?.metrics
    ? (typeof latestResult.metrics === 'string' ? JSON.parse(latestResult.metrics) : latestResult.metrics) as Record<string, unknown>
    : null;

  const currentRoundResult = {
    round: currentRound,
    revenue: companyState?.revenue || 0,
    netIncome: companyState?.netIncome || 0,
    marketShare: totalMarketShare,
    rank: latestResult?.rank || 0,
    totalTeams: teamState?.game.teams?.length || 1,
    cashChange: (latestMetrics?.revenue as number) || 0,
    stockPriceChange: 0,
  };

  // Real team rankings from performance history
  const teamRankings = performanceData?.currentRankings?.length
    ? performanceData.currentRankings.map((r: { teamId: string; teamName: string; teamColor: string; rank: number; metrics: Record<string, unknown> }) => {
        const metrics = typeof r.metrics === 'string' ? JSON.parse(r.metrics) : r.metrics;
        const ms = typeof metrics.marketShare === 'object' && metrics.marketShare
          ? Object.values(metrics.marketShare as Record<string, number>).reduce((a, b) => a + b, 0) /
            Math.max(1, Object.keys(metrics.marketShare as Record<string, number>).length)
          : (metrics.marketShare as number) || 0;
        return {
          id: r.teamId,
          name: r.teamName,
          color: r.teamColor,
          rank: r.rank,
          previousRank: r.rank,
          marketShare: ms,
          revenue: (metrics.revenue as number) || 0,
          isCurrentTeam: r.teamId === teamState?.team.id,
        };
      })
    : teamState?.game.teams?.map((t: { id: string; name: string; color: string }) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        rank: 0,
        previousRank: 0,
        marketShare: t.id === teamState.team.id ? totalMarketShare : 0,
        revenue: t.id === teamState.team.id ? (companyState?.revenue || 0) : 0,
        isCurrentTeam: t.id === teamState.team.id,
      })) || [];

  // Market share data for pie chart (real data)
  const marketShareData = teamRankings
    .filter((t) => t.marketShare > 0)
    .map((t) => ({
      name: t.name,
      value: t.marketShare,
      color: t.color,
    }));

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-700 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-700 rounded-xl"></div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-700 rounded-xl"></div>
          <div className="h-64 bg-slate-700 rounded-xl"></div>
        </div>
        <div className="h-48 bg-slate-700 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Overview"
        subtitle={`Round ${currentRound} of ${teamState?.game.maxRounds}`}
        icon={<Building2 className="w-7 h-7" />}
        iconColor="text-blue-400"
        badge={currentRound > 1 && (
          <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1">
            <Trophy className="w-3 h-3 mr-1.5" />
            Rank #{currentRoundResult.rank}
          </Badge>
        )}
      />

      {/* Round Results (only show after round 1) */}
      {currentRound > 1 && (
        <RoundResultsCard
          result={currentRoundResult}
          previousResult={historicalData.length >= 2 ? {
            round: historicalData[historicalData.length - 2].round,
            revenue: historicalData[historicalData.length - 2].revenue,
            netIncome: historicalData[historicalData.length - 2].netIncome,
            marketShare: historicalData[historicalData.length - 2].marketShare,
            rank: 0,
            totalTeams: currentRoundResult.totalTeams,
            cashChange: 0,
            stockPriceChange: 0,
          } : undefined}
        />
      )}

      {/* ESG Notifications */}
      <ESGNotification esgScore={companyState?.esgScore || 0} />

      {/* Key Metrics Grid - Enhanced with StatCard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div data-testid="stat-cash">
          <StatCard
            label="Cash"
            value={formatCurrency(companyState?.cash || 0)}
            icon={<DollarSign className="w-5 h-5" />}
            variant="success"
          />
        </div>
        <div data-testid="stat-factories">
          <StatCard
            label="Factories"
            value={companyState?.factories?.length || 0}
            icon={<Factory className="w-5 h-5" />}
            variant="warning"
          />
        </div>
        <div data-testid="stat-employees">
          <StatCard
            label="Employees"
            value={totalEmployees}
            icon={<Users className="w-5 h-5" />}
            variant="info"
          />
        </div>
        <div data-testid="stat-esg">
          <StatCard
            label="ESG Score"
            value={companyState?.esgScore || 0}
            suffix="/1000"
            icon={<Leaf className="w-5 h-5" />}
            variant="success"
          />
        </div>
      </div>

      {/* Performance Charts & Rankings */}
      <div className="grid md:grid-cols-2 gap-6">
        <PerformanceHistoryChart data={historicalData} metric="financial" />

        {marketShareData.length > 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5" />
                Market Share Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MarketSharePieChart
                data={marketShareData}
                height={250}
                highlightTeam={teamState?.team.name}
              />
            </CardContent>
          </Card>
        ) : (
          <TeamRankingsCard teams={teamRankings} currentTeamId={teamState?.team.id} />
        )}
      </div>

      {/* Team Rankings (if we showed pie chart above) */}
      {marketShareData.length > 0 && (
        <TeamRankingsCard teams={teamRankings} currentTeamId={teamState?.team.id} />
      )}

      {/* Financial Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Financial Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div data-testid="stat-revenue" className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-slate-300">Revenue</span>
              </div>
              <span className="text-white font-medium" data-testid="stat-revenue-value">
                {formatCurrency(companyState?.revenue || 0)}
              </span>
            </div>
            <div data-testid="stat-net-income" className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                {(companyState?.netIncome || 0) >= 0
                  ? <TrendingUp className="w-5 h-5 text-green-400" />
                  : <TrendingDown className="w-5 h-5 text-red-400" />
                }
                <span className="text-slate-300">Net Income</span>
              </div>
              <span data-testid="stat-net-income-value" className={`font-medium ${(companyState?.netIncome || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(companyState?.netIncome || 0)}
              </span>
            </div>
            <div data-testid="stat-total-assets" className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Total Assets</span>
              </div>
              <span className="text-white font-medium" data-testid="stat-total-assets-value">
                {formatCurrency(companyState?.totalAssets || 0)}
              </span>
            </div>
            <div data-testid="stat-total-liabilities" className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Total Liabilities</span>
              </div>
              <span className="text-white font-medium" data-testid="stat-total-liabilities-value">
                {formatCurrency(companyState?.totalLiabilities || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Brand & Market Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <EnhancedProgress
              value={(companyState?.brandValue || 0) * 100}
              variant="gradient"
              size="md"
              showLabel
              showValue
              label="Brand Value"
              formatValue={(v) => `${v.toFixed(0)}%`}
            />
            <EnhancedProgress
              value={avgEfficiency * 100}
              variant="success"
              size="md"
              showLabel
              showValue
              label="Factory Efficiency"
              formatValue={(v) => `${v.toFixed(0)}%`}
            />
            <EnhancedProgress
              value={(companyState?.esgScore || 100) / 10}
              variant="info"
              size="md"
              showLabel
              showValue
              label="ESG Rating"
              formatValue={() => `${companyState?.esgScore || 0} / 1000`}
            />
            <EnhancedProgress
              value={totalMarketShare * 100}
              variant="warning"
              size="md"
              showLabel
              showValue
              label="Market Share"
              formatValue={(v) => `${v.toFixed(1)}%`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Operations Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Factory className="w-5 h-5" />
              Production Capacity
            </CardTitle>
            <CardDescription className="text-slate-400">
              Factory performance overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            {companyState?.factories?.length ? (
              <div className="space-y-3">
                {companyState.factories.map((factory, idx) => (
                  <div key={idx} className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{factory.name}</span>
                      <span className="text-xs text-slate-400">{factory.region}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Efficiency</span>
                      <span className="text-green-400">{(factory.efficiency * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Capacity</span>
                      <span className="text-blue-400">
                        {(factory.productionLines?.reduce((sum, line) => sum + (line.capacity || 0), 0) || 0).toLocaleString()} units
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Factory className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No factories yet</p>
                <p className="text-sm mt-1">Visit Factory to build your first factory</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Capacity</span>
                <span className="text-white font-medium">
                  {totalCapacity.toLocaleString()} units/day
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Portfolio
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your product lineup ({launchedProducts.length} launched, {developingProducts.length} in development)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {launchedProducts.length > 0 ? (
              <div className="space-y-3">
                {launchedProducts.map((product) => (
                  <div key={product.id} className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{product.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-600 rounded text-slate-300">
                        {product.segment}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Quality</span>
                      <span className="text-purple-400">{product.quality}/100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Price</span>
                      <span className="text-green-400">${product.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No products launched yet</p>
                <p className="text-sm mt-1">
                  {developingProducts.length > 0
                    ? `${developingProducts.length} product(s) in development`
                    : "Visit R&D to develop your first product"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workforce Summary */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Workforce Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <div className="text-3xl font-bold text-blue-400">
                {employeeCounts.worker || 0}
              </div>
              <div className="text-slate-400 text-sm">Workers</div>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <div className="text-3xl font-bold text-purple-400">
                {employeeCounts.engineer || 0}
              </div>
              <div className="text-slate-400 text-sm">Engineers</div>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <div className="text-3xl font-bold text-orange-400">
                {employeeCounts.supervisor || 0}
              </div>
              <div className="text-slate-400 text-sm">Supervisors</div>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <div className="text-3xl font-bold text-green-400">
                {companyState?.workforce?.averageMorale?.toFixed(0) || 0}%
              </div>
              <div className="text-slate-400 text-sm">Avg Morale</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products In Development */}
      {(developingProducts.length > 0 || readyProducts.length > 0) && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Beaker className="w-5 h-5" />
              Product Development Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {developingProducts.map((product) => (
                <div key={product.id} className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-600">{product.segment}</Badge>
                      <span className="text-white font-medium">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{product.roundsRemaining} rounds left</span>
                    </div>
                  </div>
                  <EnhancedProgress value={product.developmentProgress} variant="warning" size="sm" />
                  <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>Progress: {product.developmentProgress.toFixed(0)}%</span>
                    <span>Target: Q{product.quality} / F{product.features}</span>
                  </div>
                </div>
              ))}
              {readyProducts.map((product) => (
                <div key={product.id} className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600">{product.segment}</Badge>
                      <span className="text-white font-medium">{product.name}</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                      Ready to Launch
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Quality: {product.quality} | Features: {product.features} | Price: ${product.price}
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
