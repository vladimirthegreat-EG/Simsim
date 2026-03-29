"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { TrendingUp } from "lucide-react";

interface WaterfallItem {
  name: string;
  value: number;
  type: "positive" | "negative" | "total";
}

interface WaterfallChartProps {
  items: WaterfallItem[];
  title?: string;
  description?: string;
  height?: number;
}

const COLORS = {
  positive: "#22c55e",
  negative: "#ef4444",
  total: "#3b82f6",
};

function formatCurrency(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

export function WaterfallChart({
  items,
  title = "Revenue Waterfall",
  description = "Breakdown of revenue and cost components",
  height = 300,
}: WaterfallChartProps) {
  // Build waterfall data: each bar floats from cumulative base
  let cumulative = 0;
  const data = items.map((item) => {
    if (item.type === "total") {
      const result = { name: item.name, base: 0, value: item.value, fill: COLORS.total };
      cumulative = item.value;
      return result;
    }
    const base = cumulative;
    cumulative += item.value;
    return {
      name: item.name,
      base: item.value >= 0 ? base : cumulative,
      value: Math.abs(item.value),
      fill: item.value >= 0 ? COLORS.positive : COLORS.negative,
    };
  });

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-slate-400 text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => formatCurrency(v)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={((value: number) => [formatCurrency(value), "Amount"]) as never}
            />
            <ReferenceLine y={0} stroke="#475569" />
            {/* Invisible base bar */}
            <Bar dataKey="base" stackId="waterfall" fill="transparent" />
            {/* Visible value bar */}
            <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
