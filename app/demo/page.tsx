"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader } from "@/components/ui/section-header";
import {
  DollarSign,
  Factory,
  Users,
  Leaf,
  TrendingUp,
  Package,
  Target,
  Clock,
  Building2,
} from "lucide-react";
import { fmt, FINANCIALS, WORKFORCE, FACTORY as FACTORY_DATA, ESG_BRAND, MARKET_SHARE, PRODUCTS } from "./mockData";

export default function DemoOverviewPage() {
  const totalMarketShare = Object.values(MARKET_SHARE).reduce((a, b) => a + b, 0) / Object.keys(MARKET_SHARE).length;
  const totalCapacity = FACTORY_DATA.productionLines.reduce((s, l) => s + l.capacity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Company Overview"
        subtitle="Monitor your company's performance across all departments"
        icon={<Building2 className="h-6 w-6" />}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Cash"
          value={fmt(FINANCIALS.cash)}
          icon={<DollarSign className="w-5 h-5" />}
          trend="up"
          trendValue="+5.2%"
          variant="success"
        />
        <StatCard
          label="Revenue"
          value={fmt(FINANCIALS.revenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
          trendValue="+12.8%"
          variant="info"
        />
        <StatCard
          label="Net Income"
          value={fmt(FINANCIALS.netIncome)}
          icon={<DollarSign className="w-5 h-5" />}
          trend="up"
          trendValue="+8.1%"
          variant="success"
        />
        <StatCard
          label="Market Share"
          value={`${(totalMarketShare * 100).toFixed(1)}%`}
          icon={<Target className="w-5 h-5" />}
          trend="up"
          trendValue="+2.3%"
          variant="purple"
        />
      </div>

      {/* Department Summary */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Factory */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Factory className="w-4 h-4 text-orange-400" />
              Factory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Efficiency</span>
              <span className="text-white font-medium">{(FACTORY_DATA.efficiency * 100).toFixed(0)}%</span>
            </div>
            <EnhancedProgress value={FACTORY_DATA.efficiency * 100} variant="success" size="sm" />
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Capacity</span>
              <span className="text-white font-medium">{(totalCapacity / 1000).toFixed(0)}K units</span>
            </div>
          </CardContent>
        </Card>

        {/* Workforce */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Workforce
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Headcount</span>
              <span className="text-white font-medium">{WORKFORCE.totalHeadcount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Morale</span>
              <span className="text-white font-medium">{WORKFORCE.averageMorale}%</span>
            </div>
            <EnhancedProgress value={WORKFORCE.averageMorale} variant="info" size="sm" />
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Efficiency</span>
              <span className="text-white font-medium">{WORKFORCE.averageEfficiency}%</span>
            </div>
          </CardContent>
        </Card>

        {/* ESG */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Leaf className="w-4 h-4 text-green-400" />
              ESG Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold text-green-400">{ESG_BRAND.esgScore}</div>
            <EnhancedProgress value={ESG_BRAND.esgScore / 10} variant="success" size="sm" />
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Brand Value</span>
              <span className="text-white font-medium">{(ESG_BRAND.brandValue * 100).toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Share Breakdown */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Market Share by Segment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(MARKET_SHARE).map(([segment, share]) => (
              <div key={segment} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{segment}</span>
                  <span className="text-white font-medium">{(share * 100).toFixed(1)}%</span>
                </div>
                <EnhancedProgress value={share * 100} variant="default" size="sm" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Product Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {PRODUCTS.map((product) => (
              <div key={product.id} className="p-3 bg-slate-700/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{product.name}</span>
                  <Badge
                    className={
                      product.status === "launched"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }
                  >
                    {product.status === "launched" ? "Launched" : "In Development"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Segment</span>
                    <p className="text-slate-300">{product.segment}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Quality</span>
                    <p className="text-slate-300">{product.quality}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Price</span>
                    <p className="text-slate-300">${product.price}</p>
                  </div>
                </div>
                {product.status !== "launched" && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-slate-400">{product.developmentProgress}%</span>
                    </div>
                    <EnhancedProgress value={product.developmentProgress} variant="warning" size="sm" />
                    <p className="text-xs text-slate-500 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {product.roundsRemaining} rounds remaining
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
