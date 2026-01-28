"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

interface DataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface BarConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface MetricBarChartProps {
  data: DataPoint[];
  bars?: BarConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
  layout?: "horizontal" | "vertical";
  colorByValue?: boolean;
}

export function MetricBarChart({
  data,
  bars,
  height = 300,
  showGrid = true,
  showLegend = false,
  formatValue,
  layout = "horizontal",
  colorByValue = false,
}: MetricBarChartProps) {
  const defaultFormat = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatter = formatValue || defaultFormat;

  // Default single bar config if none provided
  const barConfigs = bars || [{ dataKey: "value", name: "Value", color: "#3b82f6" }];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
        )}
        {layout === "horizontal" ? (
          <>
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#475569" }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#475569" }}
              tickFormatter={formatter}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#475569" }}
              tickFormatter={formatter}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#475569" }}
              width={100}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
          labelStyle={{ color: "#94a3b8" }}
          formatter={(value, name) => [formatter(value as number), name as string]}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            formatter={(value) => <span style={{ color: "#94a3b8" }}>{value}</span>}
          />
        )}
        {barConfigs.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
          >
            {colorByValue &&
              data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || bar.color} />
              ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
