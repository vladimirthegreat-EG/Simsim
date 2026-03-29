"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Recycle,
  Factory,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface WasteMetrics {
  totalWasteUnits: number;
  wasteDisposalCost: number;
  efficiencyRating: number; // 0-100 percentage
  wasteByFactory: Record<
    string,
    { units: number; cost: number; efficiency: number }
  >;
}

interface FactoryEfficiencyDisplayProps {
  wasteMetrics: WasteMetrics | undefined;
  factories: Array<{ id: string; name: string; efficiency: number }>;
}

function getEfficiencyColor(rating: number) {
  if (rating > 85) return { text: "text-green-400", bg: "bg-green-500", bar: "bg-green-500/80" };
  if (rating >= 60) return { text: "text-amber-400", bg: "bg-amber-500", bar: "bg-amber-500/80" };
  return { text: "text-red-400", bg: "bg-red-500", bar: "bg-red-500/80" };
}

function getEfficiencyLabel(rating: number) {
  if (rating > 85) return "Excellent";
  if (rating >= 60) return "Adequate";
  return "Critical";
}

function formatCost(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatUnits(units: number) {
  if (units >= 1_000_000) return `${(units / 1_000_000).toFixed(1)}M`;
  if (units >= 1_000) return `${(units / 1_000).toFixed(1)}K`;
  return units.toLocaleString();
}

export function FactoryEfficiencyDisplay({
  wasteMetrics,
  factories,
}: FactoryEfficiencyDisplayProps) {
  if (!wasteMetrics) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Recycle className="w-5 h-5 text-green-400" />
            Waste &amp; Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Factory className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No data available</p>
            <p className="text-slate-600 text-xs mt-1">
              Waste metrics will appear once production begins
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallColor = getEfficiencyColor(wasteMetrics.efficiencyRating);
  const overallLabel = getEfficiencyLabel(wasteMetrics.efficiencyRating);

  // Build a lookup from factory id to name
  const factoryNameMap = new Map(factories.map((f) => [f.id, f.name]));

  // Sorted factory entries by efficiency ascending (worst first)
  const factoryEntries = Object.entries(wasteMetrics.wasteByFactory).sort(
    ([, a], [, b]) => a.efficiency - b.efficiency
  );

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Recycle className="w-5 h-5 text-green-400" />
          Waste &amp; Efficiency
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Efficiency Rating */}
        <div className="flex items-center gap-4 p-3 bg-slate-900/60 rounded-lg">
          <div className="text-center">
            <div className={`text-3xl font-bold ${overallColor.text}`}>
              {wasteMetrics.efficiencyRating.toFixed(0)}%
            </div>
            <Badge
              className={`mt-1 ${
                wasteMetrics.efficiencyRating > 85
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : wasteMetrics.efficiencyRating >= 60
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
              } border`}
            >
              {wasteMetrics.efficiencyRating > 85 ? (
                <TrendingUp className="w-3 h-3" />
              ) : wasteMetrics.efficiencyRating < 60 ? (
                <AlertTriangle className="w-3 h-3" />
              ) : null}
              {overallLabel}
            </Badge>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Waste</span>
              <span className="text-white font-medium">
                {formatUnits(wasteMetrics.totalWasteUnits)} units
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Disposal Cost</span>
              <span className="text-white font-medium">
                {formatCost(wasteMetrics.wasteDisposalCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Per-Factory Breakdown */}
        {factoryEntries.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Factory className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-sm font-medium">
                Factory Breakdown
              </span>
            </div>
            <div className="space-y-2">
              {factoryEntries.map(([factoryId, data]) => {
                const name = factoryNameMap.get(factoryId) ?? factoryId;
                const color = getEfficiencyColor(data.efficiency);
                return (
                  <div
                    key={factoryId}
                    className="p-2.5 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-white text-sm font-medium truncate">
                        {name}
                      </span>
                      <span className={`text-sm font-semibold ${color.text}`}>
                        {data.efficiency.toFixed(0)}%
                      </span>
                    </div>
                    {/* Efficiency Bar */}
                    <div className="w-full h-1.5 bg-slate-600 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${color.bar}`}
                        style={{ width: `${Math.min(data.efficiency, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{formatUnits(data.units)} waste units</span>
                      <span>{formatCost(data.cost)} disposal</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
