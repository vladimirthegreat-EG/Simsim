"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Factory,
  Package,
  ChevronRight,
} from "lucide-react";

interface ProductionSchedulerProps {
  products: Array<{
    id: string;
    name: string;
    segment: string;
    developmentStatus: "in_development" | "ready" | "launched";
    developmentProgress: number; // 0-100
    roundsRemaining: number;
    qualityGrade?: "standard" | "premium" | "artisan";
  }>;
  factories: Array<{
    id: string;
    name: string;
    efficiency: number;
    utilization: number;
  }>;
  currentRound: number;
  maxRounds: number;
}

const SEGMENT_COLORS: Record<string, { bg: string; bar: string; text: string; border: string }> = {
  Budget: {
    bg: "bg-orange-500/10",
    bar: "bg-orange-500",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  General: {
    bg: "bg-blue-500/10",
    bar: "bg-blue-500",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  Enthusiast: {
    bg: "bg-purple-500/10",
    bar: "bg-purple-500",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  Professional: {
    bg: "bg-emerald-500/10",
    bar: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  "Active Lifestyle": {
    bg: "bg-amber-500/10",
    bar: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
};

const QUALITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  standard: {
    bg: "bg-slate-500/20",
    text: "text-slate-300",
    border: "border-slate-500/30",
  },
  premium: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  artisan: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_development: { label: "In Dev", color: "text-amber-400" },
  ready: { label: "Ready", color: "text-green-400" },
  launched: { label: "Launched", color: "text-cyan-400" },
};

function getSegmentColor(segment: string) {
  return (
    SEGMENT_COLORS[segment] ?? {
      bg: "bg-slate-500/10",
      bar: "bg-slate-500",
      text: "text-slate-400",
      border: "border-slate-500/30",
    }
  );
}

function getUtilizationColor(utilization: number): string {
  if (utilization >= 90) return "bg-red-500";
  if (utilization >= 70) return "bg-amber-500";
  if (utilization >= 40) return "bg-emerald-500";
  return "bg-slate-500";
}

function getUtilizationLabel(utilization: number): string {
  if (utilization >= 90) return "Critical";
  if (utilization >= 70) return "High";
  if (utilization >= 40) return "Normal";
  return "Low";
}

export function ProductionScheduler({
  products,
  factories,
  currentRound,
  maxRounds,
}: ProductionSchedulerProps) {
  const inDevelopment = useMemo(
    () => products.filter((p) => p.developmentStatus === "in_development"),
    [products]
  );

  const readyOrLaunched = useMemo(
    () => products.filter((p) => p.developmentStatus !== "in_development"),
    [products]
  );

  const totalRoundsInTimeline = maxRounds - currentRound + 1;

  const avgUtilization = useMemo(() => {
    if (factories.length === 0) return 0;
    return Math.round(
      factories.reduce((sum, f) => sum + f.utilization, 0) / factories.length
    );
  }, [factories]);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Production Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] border-slate-600 text-slate-400"
            >
              Round {currentRound} / {maxRounds}
            </Badge>
            {factories.length > 0 && (
              <Badge className="bg-slate-700/50 text-slate-300 border border-slate-600/50 text-[10px]">
                <Factory className="w-2.5 h-2.5 mr-0.5" />
                {avgUtilization}% Avg Load
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Timeline Header - round markers */}
        {inDevelopment.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                Development Pipeline
              </span>
              <span className="text-slate-500 text-xs">
                ({inDevelopment.length} active)
              </span>
            </div>

            {/* Round scale */}
            <div className="mb-2 ml-[140px] mr-2">
              <div className="flex justify-between">
                {Array.from({ length: Math.min(totalRoundsInTimeline, 8) }, (_, i) => {
                  const round = currentRound + i;
                  if (round > maxRounds) return null;
                  return (
                    <span
                      key={round}
                      className={`text-[10px] ${
                        round === currentRound
                          ? "text-cyan-400 font-medium"
                          : "text-slate-500"
                      }`}
                    >
                      R{round}
                    </span>
                  );
                })}
              </div>
              <div className="h-px bg-slate-700 mt-1" />
            </div>

            {/* Product timeline bars */}
            <div className="space-y-2">
              {inDevelopment.map((product) => {
                const segmentColor = getSegmentColor(product.segment);
                const completionRound = currentRound + product.roundsRemaining;
                const barWidthPercent = Math.min(
                  (product.roundsRemaining / Math.max(totalRoundsInTimeline, 1)) * 100,
                  100
                );
                const qualityStyle = product.qualityGrade
                  ? QUALITY_STYLES[product.qualityGrade]
                  : null;

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-2 group"
                  >
                    {/* Product label */}
                    <div className="w-[132px] shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Package className={`w-3 h-3 ${segmentColor.text} shrink-0`} />
                        <span className="text-white text-xs font-medium truncate">
                          {product.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 ml-[18px]">
                        <span className={`text-[10px] ${segmentColor.text}`}>
                          {product.segment}
                        </span>
                        {qualityStyle && product.qualityGrade && (
                          <Badge
                            className={`${qualityStyle.bg} ${qualityStyle.text} border ${qualityStyle.border} text-[9px] px-1 py-0`}
                          >
                            {product.qualityGrade}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Timeline bar area */}
                    <div className="flex-1 relative">
                      <div className="h-7 bg-slate-900/50 rounded-md overflow-hidden relative">
                        {/* Progress fill - what's already done */}
                        <div
                          className={`absolute inset-y-0 left-0 ${segmentColor.bar} opacity-40 rounded-l-md`}
                          style={{ width: `${product.developmentProgress}%` }}
                        />
                        {/* Remaining bar - extending from progress to completion */}
                        <div
                          className={`absolute inset-y-0 left-0 border ${segmentColor.border} rounded-md`}
                          style={{ width: `${barWidthPercent}%` }}
                        />
                        {/* Bar content */}
                        <div className="absolute inset-0 flex items-center px-2 justify-between">
                          <span className="text-white text-[10px] font-medium">
                            {product.developmentProgress}%
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-300 text-[10px]">
                              {product.roundsRemaining}r left
                            </span>
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                            <span className={`text-[10px] font-medium ${segmentColor.text}`}>
                              R{completionRound}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state for pipeline */}
        {inDevelopment.length === 0 && (
          <div className="text-center py-6">
            <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No products in development</p>
            <p className="text-slate-600 text-xs mt-0.5">
              Start R&D to queue new products
            </p>
          </div>
        )}

        {/* Ready / Launched products summary */}
        {readyOrLaunched.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                Completed Products
              </span>
              <span className="text-slate-500 text-xs">
                ({readyOrLaunched.length})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {readyOrLaunched.map((product) => {
                const segmentColor = getSegmentColor(product.segment);
                const status = STATUS_LABELS[product.developmentStatus];
                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md ${segmentColor.bg} border ${segmentColor.border}`}
                  >
                    <Package className={`w-3 h-3 ${segmentColor.text} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <span className="text-white text-xs font-medium truncate block">
                        {product.name}
                      </span>
                      <span className={`text-[10px] ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Factory Utilization */}
        {factories.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Factory className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                Factory Utilization
              </span>
            </div>
            <div className="space-y-2">
              {factories.map((factory) => {
                const barColor = getUtilizationColor(factory.utilization);
                const label = getUtilizationLabel(factory.utilization);
                return (
                  <div key={factory.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 text-xs font-medium">
                          {factory.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-600 text-slate-500"
                        >
                          {factory.efficiency}% eff
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] ${
                            factory.utilization >= 90
                              ? "text-red-400"
                              : factory.utilization >= 70
                                ? "text-amber-400"
                                : "text-slate-400"
                          }`}
                        >
                          {label}
                        </span>
                        <span className="text-white text-xs font-medium">
                          {factory.utilization}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${factory.utilization}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer summary */}
        <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            {Object.entries(SEGMENT_COLORS).map(([segment, colors]) => {
              const count = products.filter((p) => p.segment === segment).length;
              if (count === 0) return null;
              return (
                <div key={segment} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${colors.bar}`} />
                  <span className="text-slate-500">
                    {segment} ({count})
                  </span>
                </div>
              );
            })}
          </div>
          <span className="text-slate-500 text-xs">
            {products.length} total products
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
