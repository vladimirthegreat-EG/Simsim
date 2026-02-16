"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
import {
  Trophy,
  TrendingUp,
  BarChart3,
  DollarSign,
  Factory,
  Users,
  Package,
  Activity,
  Target,
} from "lucide-react";
import { fmt, FINANCIALS, PERFORMANCE, ROUND_HISTORY, TEAM_RANKINGS, OPERATIONAL_METRICS, AVERAGE_MARKET_SHARE } from "../mockData";

export default function DemoResultsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Results & Rankings"
        subtitle="Track performance, compare with competitors, and analyze trends"
        icon={<Trophy className="h-6 w-6" />}
        iconColor="text-yellow-400"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Current Rank" value={`#${PERFORMANCE.rank}`} icon={<Trophy className="w-5 h-5" />} variant="warning" />
            <StatCard label="Revenue" value={fmt(FINANCIALS.revenue)} icon={<TrendingUp className="w-5 h-5" />} variant="success" trend="up" trendValue="+36%" />
            <StatCard label="Market Share" value={`${(AVERAGE_MARKET_SHARE * 100).toFixed(1)}%`} icon={<Target className="w-5 h-5" />} variant="info" trend="up" trendValue="+3.4%" />
            <StatCard label="Share Price" value={`$${PERFORMANCE.sharePrice.toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} variant="purple" trend="up" trendValue="+12%" />
          </div>

          {/* Round Summary */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Round 3 Summary" icon={<BarChart3 className="w-5 h-5" />} iconColor="text-blue-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Revenue</span>
                    <span className="text-white font-medium">{fmt(FINANCIALS.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Net Income</span>
                    <span className="text-emerald-400 font-medium">{fmt(FINANCIALS.netIncome)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Profit Margin</span>
                    <span className="text-white font-medium">{((FINANCIALS.netIncome / FINANCIALS.revenue) * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Market Share</span>
                    <span className="text-white font-medium">{(AVERAGE_MARKET_SHARE * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Position</span>
                    <span className="text-yellow-400 font-medium">#{PERFORMANCE.rank} of {PERFORMANCE.totalTeams}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Share Price</span>
                    <span className="text-white font-medium">${PERFORMANCE.sharePrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === RANKINGS TAB === */}
        <TabsContent value="rankings" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Team Rankings" icon={<Trophy className="w-5 h-5" />} iconColor="text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {TEAM_RANKINGS.map((team) => (
                  <div
                    key={team.id}
                    className={`p-4 rounded-lg border ${
                      team.isCurrentTeam
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-slate-700/50 border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          team.rank === 1 ? "bg-yellow-500" : team.rank === 2 ? "bg-slate-400" : team.rank === 3 ? "bg-amber-700" : "bg-slate-600"
                        }`}>
                          {team.rank}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                          <span className="text-white font-medium">{team.name}</span>
                          {team.isCurrentTeam && <Badge className="bg-green-500/20 text-green-400 text-xs">You</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <span className="text-slate-500">Market Share</span>
                          <p className="text-white font-medium">{team.marketShare}%</p>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500">Revenue</span>
                          <p className="text-white font-medium">{fmt(team.revenue)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === HISTORY TAB === */}
        <TabsContent value="history" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Performance History" icon={<TrendingUp className="w-5 h-5" />} iconColor="text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ROUND_HISTORY.map((round) => (
                  <div key={round.round} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-blue-500/20 text-blue-400">Round {round.round}</Badge>
                      <Badge className={round.rank <= 2 ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-600 text-slate-300"}>
                        Rank #{round.rank}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Revenue</span>
                        <p className="text-white font-medium">{fmt(round.revenue)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Net Income</span>
                        <p className={`font-medium ${round.netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(round.netIncome)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Cash</span>
                        <p className="text-white font-medium">{fmt(round.cash)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Market Share</span>
                        <p className="text-white font-medium">{round.marketShare}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === OPERATIONAL TAB === */}
        <TabsContent value="operational" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Operational Metrics" icon={<Activity className="w-5 h-5" />} iconColor="text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: Factory, label: "Total Capacity", value: `${(OPERATIONAL_METRICS.totalCapacity / 1000).toFixed(0)}K units`, color: "text-orange-400" },
                  { icon: Activity, label: "Avg Efficiency", value: `${OPERATIONAL_METRICS.avgEfficiency}%`, color: "text-green-400" },
                  { icon: Target, label: "Defect Rate", value: `${OPERATIONAL_METRICS.avgDefectRate}%`, color: "text-yellow-400" },
                  { icon: Users, label: "Total Employees", value: `${OPERATIONAL_METRICS.totalEmployees}`, color: "text-blue-400" },
                  { icon: TrendingUp, label: "Avg Morale", value: `${OPERATIONAL_METRICS.avgMorale}%`, color: "text-purple-400" },
                  { icon: Package, label: "Products Launched", value: `${OPERATIONAL_METRICS.launchedProducts}`, color: "text-cyan-400" },
                  { icon: DollarSign, label: "R&D Budget", value: fmt(OPERATIONAL_METRICS.rdBudget), color: "text-emerald-400" },
                  { icon: Trophy, label: "Brand Value", value: `${OPERATIONAL_METRICS.brandValue}%`, color: "text-pink-400" },
                ].map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div key={metric.label} className="p-3 bg-slate-700/50 rounded-lg flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-slate-600/50 flex items-center justify-center ${metric.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-slate-400 text-sm">{metric.label}</span>
                        <p className="text-white font-bold text-lg">{metric.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
