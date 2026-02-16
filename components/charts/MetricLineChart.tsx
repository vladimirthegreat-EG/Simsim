"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DataPoint {
  round: number;
  [key: string]: number;
}

interface LineConfig {
  dataKey: string;
  name: string;
  color: string;
  strokeWidth?: number;
}

interface MetricLineChartProps {
  data: DataPoint[];
  lines: LineConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
  yAxisLabel?: string;
}

export function MetricLineChart({
  data,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
  formatValue,
  yAxisLabel,
}: MetricLineChartProps) {
  const defaultFormat = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatter = formatValue || defaultFormat;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
        )}
        <XAxis
          dataKey="round"
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "#475569" }}
          tickFormatter={(value) => `R${value}`}
        />
        <YAxis
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "#475569" }}
          tickFormatter={formatter}
          label={
            yAxisLabel
              ? { value: yAxisLabel, angle: -90, position: "insideLeft", fill: "#94a3b8" }
              : undefined
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
          labelStyle={{ color: "#94a3b8" }}
          labelFormatter={(label) => `Round ${label}`}
          formatter={(value, name) => [formatter(value as number), name as string]}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>}
          />
        )}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={line.strokeWidth || 2}
            dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
