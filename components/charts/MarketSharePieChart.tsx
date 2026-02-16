"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface MarketShareData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface MarketSharePieChartProps {
  data: MarketShareData[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  highlightTeam?: string;
}

export function MarketSharePieChart({
  data,
  height = 300,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 100,
  highlightTeam,
}: MarketSharePieChartProps) {
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, value }) => `${name}: ${(value * 100).toFixed(1)}%`}
          labelLine={{ stroke: "#64748b" }}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              stroke={entry.name === highlightTeam ? "#fff" : "transparent"}
              strokeWidth={entry.name === highlightTeam ? 3 : 0}
              opacity={highlightTeam && entry.name !== highlightTeam ? 0.6 : 1}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
          formatter={(value) => [formatPercent(value as number), "Market Share"]}
        />
        {showLegend && (
          <Legend
            formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
