"use client";

import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/section-header";
import { trpc } from "@/lib/api/trpc";
import {
  Radio,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Leaf,
  Package,
  Globe,
  DollarSign,
  Clock,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NewsPageProps {
  params: Promise<{ gameId: string }>;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  recession: TrendingDown,
  boom: TrendingUp,
  inflation_spike: DollarSign,
  tech_breakthrough: Zap,
  sustainability_regulation: Leaf,
  supply_chain_crisis: Package,
  currency_crisis: Globe,
  price_war: AlertTriangle,
  custom: Radio,
};

const EVENT_COLORS: Record<string, string> = {
  recession: "text-red-400 bg-red-500/10 border-red-500/50",
  boom: "text-green-400 bg-green-500/10 border-green-500/50",
  inflation_spike: "text-yellow-400 bg-yellow-500/10 border-yellow-500/50",
  tech_breakthrough: "text-blue-400 bg-blue-500/10 border-blue-500/50",
  sustainability_regulation: "text-emerald-400 bg-emerald-500/10 border-emerald-500/50",
  supply_chain_crisis: "text-orange-400 bg-orange-500/10 border-orange-500/50",
  currency_crisis: "text-purple-400 bg-purple-500/10 border-purple-500/50",
  price_war: "text-amber-400 bg-amber-500/10 border-amber-500/50",
  custom: "text-slate-400 bg-slate-500/10 border-slate-500/50",
};

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Low Impact", color: "bg-blue-500/20 text-blue-400" },
  medium: { label: "Medium Impact", color: "bg-yellow-500/20 text-yellow-400" },
  high: { label: "High Impact", color: "bg-orange-500/20 text-orange-400" },
  critical: { label: "Critical", color: "bg-red-500/20 text-red-400" },
};

export default function NewsPage({ params }: NewsPageProps) {
  const { gameId } = use(params);
  const [filterType, setFilterType] = useState<string>("all");

  const { data: newsData, isLoading } = trpc.game.getNews.useQuery({ gameId });

  // Fallback mock news data for demonstration
  const mockNews = [
    {
      id: "1",
      type: "tech_breakthrough",
      title: "AI Revolution Drives Device Demand",
      description:
        "Breakthrough in AI technology creates unprecedented demand for high-performance devices. Enthusiast and professional segments see 25% demand increase.",
      timestamp: new Date(Date.now() - 3600000),
      round: 3,
      severity: "high" as const,
      effects: [
        { target: "demand_enthusiast", modifier: 0.25 },
        { target: "demand_professional", modifier: 0.2 },
      ],
    },
    {
      id: "2",
      type: "supply_chain_crisis",
      title: "Port Congestion Disrupts Global Supply Chains",
      description:
        "Major shipping delays at Asian ports cause component shortages. Lead times increase by 30% and material costs rise.",
      timestamp: new Date(Date.now() - 7200000),
      round: 2,
      severity: "critical" as const,
      effects: [
        { target: "material_cost", modifier: 0.15 },
        { target: "lead_time", modifier: 0.3 },
      ],
    },
    {
      id: "3",
      type: "sustainability_regulation",
      title: "New Carbon Emission Standards",
      description:
        "Government introduces stricter environmental regulations. Companies with strong ESG scores gain competitive advantage.",
      timestamp: new Date(Date.now() - 10800000),
      round: 2,
      severity: "medium" as const,
      effects: [{ target: "esg_importance", modifier: 0.15 }],
    },
    {
      id: "4",
      type: "currency_crisis",
      title: "Dollar Surges Against Asian Currencies",
      description:
        "Rapid currency fluctuations impact international operations. Manufacturing costs in Asia become more competitive.",
      timestamp: new Date(Date.now() - 14400000),
      round: 1,
      severity: "high" as const,
      effects: [{ target: "fx_volatility", modifier: 0.25 }],
    },
    {
      id: "5",
      type: "price_war",
      title: "Major Competitor Slashes Prices",
      description:
        "Leading market player announces aggressive pricing strategy. Budget segment sees intensified competition.",
      timestamp: new Date(Date.now() - 18000000),
      round: 1,
      severity: "medium" as const,
      effects: [
        { target: "price_competition", modifier: 0.2 },
        { target: "demand_budget", modifier: 0.15 },
      ],
    },
  ];

  const news = newsData?.news || mockNews;

  const filteredNews =
    filterType === "all" ? news : news.filter((item) => item.type === filterType);

  const latestNews = filteredNews.slice(0, 3);
  const olderNews = filteredNews.slice(3);

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Market News"
        description="Stay informed about market events, economic shifts, and industry developments"
        icon={Radio}
        iconColor="text-red-400"
      />

      {/* Filter Tabs */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <button
              onClick={() => setFilterType("all")}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                filterType === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              )}
            >
              All News
            </button>
            {Object.entries(EVENT_ICONS).map(([type, Icon]) => {
              const hasNews = news.some((item) => item.type === type);
              if (!hasNews) return null;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                    filterType === type
                      ? "bg-purple-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Latest News Section */}
      {latestNews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="text-xl font-bold text-white">Breaking News</h2>
          </div>
          <div className="grid md:grid-cols-1 gap-4">
            {latestNews.map((item) => {
              const Icon = EVENT_ICONS[item.type] || Radio;
              const colorClasses = EVENT_COLORS[item.type] || EVENT_COLORS.custom;
              const severity = SEVERITY_LABELS[item.severity];

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "bg-slate-800 border-2 transition-all hover:scale-[1.01]",
                    colorClasses
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={cn(
                            "p-2 rounded-lg shrink-0",
                            colorClasses.split(" ")[1]
                          )}
                        >
                          <Icon className={cn("w-5 h-5", colorClasses.split(" ")[0])} />
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-white text-lg">
                              {item.title}
                            </CardTitle>
                            <Badge className={severity.color}>{severity.label}</Badge>
                          </div>
                          <CardDescription className="text-slate-300">
                            {item.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          Round {item.round}
                        </Badge>
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Clock className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {item.effects && item.effects.length > 0 && (
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-slate-400 text-sm font-medium">
                          Market Impact:
                        </span>
                        {item.effects.map((effect, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={cn(
                              "text-xs",
                              effect.modifier > 0
                                ? "border-green-500 text-green-400"
                                : "border-red-500 text-red-400"
                            )}
                          >
                            {effect.target.replace(/_/g, " ")}:{" "}
                            {effect.modifier > 0 ? "+" : ""}
                            {typeof effect.modifier === "number" &&
                            effect.modifier < 1 &&
                            effect.modifier > -1
                              ? `${(effect.modifier * 100).toFixed(0)}%`
                              : effect.modifier}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Older News Section */}
      {olderNews.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Previous Reports</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {olderNews.map((item) => {
              const Icon = EVENT_ICONS[item.type] || Radio;
              const colorClasses = EVENT_COLORS[item.type] || EVENT_COLORS.custom;
              const severity = SEVERITY_LABELS[item.severity];

              return (
                <Card
                  key={item.id}
                  className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Icon className={cn("w-4 h-4 mt-1 shrink-0", colorClasses.split(" ")[0])} />
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-white text-base">
                            {item.title}
                          </CardTitle>
                          <Badge className={cn("text-xs", severity.color)}>
                            {severity.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <Clock className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleString()}
                          <span>•</span>
                          <span>Round {item.round}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredNews.length === 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-12 text-center">
            <Radio className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-lg font-medium">No news available</p>
            <p className="text-slate-500 text-sm mt-2">
              Market events will appear here as they occur
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
