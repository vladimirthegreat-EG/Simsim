"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/section-header";
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
import { NEWS_EVENTS } from "../mockData";

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

// Add timestamps locally (UI concern, not shared data)
const newsWithTimestamps = NEWS_EVENTS.map((event, i) => ({
  ...event,
  timestamp: new Date(Date.now() - (i + 1) * 3600000),
}));

export default function DemoNewsPage() {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredNews = filterType === "all" ? newsWithTimestamps : newsWithTimestamps.filter((item) => item.type === filterType);
  const latestNews = filteredNews.slice(0, 3);
  const olderNews = filteredNews.slice(3);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Market News"
        subtitle="Stay informed about market events, economic shifts, and industry developments"
        icon={<Radio className="h-6 w-6" />}
        iconColor="text-red-400"
      />

      {/* Filter */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <button
              onClick={() => setFilterType("all")}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                filterType === "all" ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              )}
            >
              All News
            </button>
            {Object.entries(EVENT_ICONS).map(([type, Icon]) => {
              const hasNews = newsWithTimestamps.some((item) => item.type === type);
              if (!hasNews) return null;
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                    filterType === type ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
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

      {/* Breaking News */}
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
                <Card key={item.id} className={cn("bg-slate-800 border-2 transition-all hover:scale-[1.01]", colorClasses)}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={cn("p-2 rounded-lg shrink-0", colorClasses.split(" ")[1])}>
                          <Icon className={cn("w-5 h-5", colorClasses.split(" ")[0])} />
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-white text-lg">{item.title}</CardTitle>
                            <Badge className={severity.color}>{severity.label}</Badge>
                          </div>
                          <CardDescription className="text-slate-300">{item.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant="outline" className="border-slate-600 text-slate-400">Round {item.round}</Badge>
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
                        <span className="text-slate-400 text-sm font-medium">Market Impact:</span>
                        {item.effects.map((effect, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={cn("text-xs", effect.modifier > 0 ? "border-green-500 text-green-400" : "border-red-500 text-red-400")}
                          >
                            {effect.target.replace(/_/g, " ")}: {effect.modifier > 0 ? "+" : ""}{(effect.modifier * 100).toFixed(0)}%
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

      {/* Older News */}
      {olderNews.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Previous Reports</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {olderNews.map((item) => {
              const Icon = EVENT_ICONS[item.type] || Radio;
              const colorClasses = EVENT_COLORS[item.type] || EVENT_COLORS.custom;
              const severity = SEVERITY_LABELS[item.severity];

              return (
                <Card key={item.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Icon className={cn("w-4 h-4 mt-1 shrink-0", colorClasses.split(" ")[0])} />
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-white text-sm">{item.title}</CardTitle>
                          <Badge className={cn("text-xs", severity.color)}>{severity.label}</Badge>
                        </div>
                        <CardDescription className="text-slate-400 text-xs">{item.description}</CardDescription>
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <Badge variant="outline" className="text-xs border-slate-600">Round {item.round}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
