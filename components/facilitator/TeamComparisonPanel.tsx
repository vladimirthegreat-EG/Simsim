"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { GitCompare } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TeamComparisonPanelProps {
  teams: Array<{
    id: string;
    name: string;
    color: string;
    state: any;
  }>;
}

interface MetricRow {
  label: string;
  key: string;
  accessor: (state: any) => number | string;
  format?: (value: number | string) => string;
}

const formatCurrency = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "N/A";
  if (Math.abs(num) >= 1_000_000_000)
    return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

const formatNumber = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "N/A";
  return num.toLocaleString();
};

const formatPercent = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "N/A";
  return `${num.toFixed(1)}%`;
};

const METRICS: MetricRow[] = [
  {
    label: "Cash",
    key: "cash",
    accessor: (s) => s?.cash ?? 0,
    format: formatCurrency,
  },
  {
    label: "Revenue",
    key: "revenue",
    accessor: (s) => s?.revenue ?? 0,
    format: formatCurrency,
  },
  {
    label: "Net Income",
    key: "netIncome",
    accessor: (s) => s?.netIncome ?? 0,
    format: formatCurrency,
  },
  {
    label: "EPS",
    key: "eps",
    accessor: (s) => s?.eps ?? 0,
    format: (v) => `$${(typeof v === "number" ? v : parseFloat(String(v))).toFixed(2)}`,
  },
  {
    label: "Market Cap",
    key: "marketCap",
    accessor: (s) => s?.marketCap ?? 0,
    format: formatCurrency,
  },
  {
    label: "Brand Value",
    key: "brandValue",
    accessor: (s) => s?.brandValue ?? 0,
    format: formatNumber,
  },
  {
    label: "ESG Score",
    key: "esgScore",
    accessor: (s) => s?.esgScore ?? 0,
    format: formatNumber,
  },
  {
    label: "Total Employees",
    key: "totalEmployees",
    accessor: (s) => s?.workforce?.totalHeadcount ?? 0,
    format: formatNumber,
  },
  {
    label: "Avg Morale",
    key: "avgMorale",
    accessor: (s) => s?.workforce?.averageMorale ?? 0,
    format: formatPercent,
  },
  {
    label: "Factories",
    key: "factories",
    accessor: (s) => s?.factories?.length ?? 0,
    format: formatNumber,
  },
];

const SEGMENTS = [
  "Budget",
  "General",
  "Enthusiast",
  "Professional",
  "Active Lifestyle",
];

export default function TeamComparisonPanel({
  teams,
}: TeamComparisonPanelProps) {
  const [teamAId, setTeamAId] = useState<string>("");
  const [teamBId, setTeamBId] = useState<string>("");

  const teamA = teams.find((t) => t.id === teamAId);
  const teamB = teams.find((t) => t.id === teamBId);

  const chartData = useMemo(() => {
    if (!teamA || !teamB) return [];
    return [
      {
        metric: "Revenue",
        [teamA.name]: teamA.state?.revenue ?? 0,
        [teamB.name]: teamB.state?.revenue ?? 0,
      },
      {
        metric: "Cash",
        [teamA.name]: teamA.state?.cash ?? 0,
        [teamB.name]: teamB.state?.cash ?? 0,
      },
      {
        metric: "Market Cap",
        [teamA.name]: teamA.state?.marketCap ?? 0,
        [teamB.name]: teamB.state?.marketCap ?? 0,
      },
    ];
  }, [teamA, teamB]);

  const getComparisonColor = (valA: number, valB: number, side: "a" | "b") => {
    if (valA === valB) return "text-foreground";
    if (side === "a") return valA > valB ? "text-green-400" : "text-red-400";
    return valB > valA ? "text-green-400" : "text-red-400";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <GitCompare className="h-5 w-5 text-purple-400" />
        <CardTitle>Compare Teams</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Selectors */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={teamAId} onValueChange={setTeamAId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Team A" />
              </SelectTrigger>
              <SelectContent>
                {teams
                  .filter((t) => t.id !== teamBId)
                  .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        {team.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm font-medium text-muted-foreground">vs</span>
          <div className="flex-1">
            <Select value={teamBId} onValueChange={setTeamBId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Team B" />
              </SelectTrigger>
              <SelectContent>
                {teams
                  .filter((t) => t.id !== teamAId)
                  .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        {team.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {teamA && teamB ? (
          <>
            {/* Metrics Comparison Table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-3 bg-muted/50 px-4 py-2 text-sm font-medium">
                <span>Metric</span>
                <span className="text-center">
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1"
                    style={{ backgroundColor: teamA.color }}
                  />
                  {teamA.name}
                </span>
                <span className="text-center">
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1"
                    style={{ backgroundColor: teamB.color }}
                  />
                  {teamB.name}
                </span>
              </div>
              {METRICS.map((metric) => {
                const rawA = metric.accessor(teamA.state);
                const rawB = metric.accessor(teamB.state);
                const numA = typeof rawA === "number" ? rawA : parseFloat(String(rawA));
                const numB = typeof rawB === "number" ? rawB : parseFloat(String(rawB));
                const fmt = metric.format ?? String;

                return (
                  <div
                    key={metric.key}
                    className="grid grid-cols-3 px-4 py-2 text-sm border-t"
                  >
                    <span className="text-muted-foreground">{metric.label}</span>
                    <span
                      className={`text-center font-mono ${getComparisonColor(numA, numB, "a")}`}
                    >
                      {fmt(rawA)}
                    </span>
                    <span
                      className={`text-center font-mono ${getComparisonColor(numA, numB, "b")}`}
                    >
                      {fmt(rawB)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Market Share Breakdown */}
            <div>
              <h4 className="text-sm font-medium mb-2">Market Share by Segment</h4>
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-3 bg-muted/50 px-4 py-2 text-sm font-medium">
                  <span>Segment</span>
                  <span className="text-center">{teamA.name}</span>
                  <span className="text-center">{teamB.name}</span>
                </div>
                {SEGMENTS.map((segment) => {
                  const segKey = segment.toLowerCase().replace(/\s+/g, "");
                  const valA = teamA.state?.marketShare?.[segKey] ?? teamA.state?.marketShare?.[segment] ?? 0;
                  const valB = teamB.state?.marketShare?.[segKey] ?? teamB.state?.marketShare?.[segment] ?? 0;

                  return (
                    <div
                      key={segment}
                      className="grid grid-cols-3 px-4 py-2 text-sm border-t"
                    >
                      <span className="text-muted-foreground">{segment}</span>
                      <span
                        className={`text-center font-mono ${getComparisonColor(valA, valB, "a")}`}
                      >
                        {formatPercent(valA)}
                      </span>
                      <span
                        className={`text-center font-mono ${getComparisonColor(valA, valB, "b")}`}
                      >
                        {formatPercent(valB)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Bar Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3">Key Metrics Comparison</h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="metric"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => formatCurrency(v)}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey={teamA.name}
                      fill={teamA.color}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey={teamB.name}
                      fill={teamB.color}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GitCompare className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">Select two teams to compare</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
