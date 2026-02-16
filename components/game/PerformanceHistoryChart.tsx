"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricLineChart } from "@/components/charts";
import { TrendingUp } from "lucide-react";

interface RoundData {
  round: number;
  revenue: number;
  netIncome: number;
  cash: number;
  marketShare: number;
  [key: string]: number;
}

interface PerformanceHistoryChartProps {
  data: RoundData[];
  metric?: "financial" | "market";
}

export function PerformanceHistoryChart({
  data,
  metric = "financial",
}: PerformanceHistoryChartProps) {
  if (data.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-slate-400">
            No historical data yet. Complete rounds to see your performance.
          </div>
        </CardContent>
      </Card>
    );
  }

  const financialLines = [
    { dataKey: "revenue", name: "Revenue", color: "#22c55e" },
    { dataKey: "netIncome", name: "Net Income", color: "#3b82f6" },
    { dataKey: "cash", name: "Cash", color: "#f59e0b" },
  ];

  const marketLines = [
    { dataKey: "marketShare", name: "Market Share", color: "#8b5cf6" },
  ];

  const formatMarketShare = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {metric === "financial" ? "Financial Performance" : "Market Position"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MetricLineChart
          data={data}
          lines={metric === "financial" ? financialLines : marketLines}
          height={250}
          formatValue={metric === "market" ? formatMarketShare : undefined}
        />
      </CardContent>
    </Card>
  );
}
