"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureRadarChart } from "./FeatureRadarChart";
import { GitCompare, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeatureScores {
  battery: number;
  camera: number;
  ai: number;
  durability: number;
  display: number;
  connectivity: number;
}

interface ComparisonProduct {
  id: string;
  name: string;
  segment: string;
  price: number;
  quality: number;
  features: number;
  featureSet?: FeatureScores;
  teamId?: string;
  teamName?: string;
  marketShare?: number;
}

interface ProductComparisonProps {
  /** The player's product to compare */
  myProduct: ComparisonProduct;
  /** Competitors' products in same segment, or segment ideal */
  competitors?: ComparisonProduct[];
  /** Segment feature preferences (normalized 0-100) */
  segmentPreferences?: FeatureScores;
  /** Segment name for display */
  segment: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FEATURE_KEYS: (keyof FeatureScores)[] = [
  "battery", "camera", "ai", "durability", "display", "connectivity",
];

const FEATURE_LABELS: Record<keyof FeatureScores, string> = {
  battery: "Battery",
  camera: "Camera",
  ai: "AI",
  durability: "Durability",
  display: "Display",
  connectivity: "Connectivity",
};

function getDelta(mine: number, theirs: number): { value: number; direction: "up" | "down" | "same" } {
  const diff = mine - theirs;
  if (Math.abs(diff) < 2) return { value: 0, direction: "same" };
  return { value: diff, direction: diff > 0 ? "up" : "down" };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProductComparison({
  myProduct,
  competitors = [],
  segmentPreferences,
  segment,
}: ProductComparisonProps) {
  const myFeatures = myProduct.featureSet || {
    battery: myProduct.features,
    camera: myProduct.features,
    ai: myProduct.features,
    durability: myProduct.features,
    display: myProduct.features,
    connectivity: myProduct.features,
  };

  // Pick the top competitor to compare against
  const topCompetitor = useMemo(() => {
    if (competitors.length === 0) return null;
    return competitors.sort((a, b) => (b.marketShare ?? 0) - (a.marketShare ?? 0))[0];
  }, [competitors]);

  const competitorFeatures = topCompetitor?.featureSet || (topCompetitor ? {
    battery: topCompetitor.features,
    camera: topCompetitor.features,
    ai: topCompetitor.features,
    durability: topCompetitor.features,
    display: topCompetitor.features,
    connectivity: topCompetitor.features,
  } : undefined);

  return (
    <Card className="bg-slate-800/80 border-slate-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <GitCompare className="w-5 h-5 text-cyan-400" />
          Product Comparison - {segment}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Radar chart overlay */}
        <div className="flex justify-center">
          <FeatureRadarChart
            features={myFeatures}
            segmentPreferences={segmentPreferences}
            compareFeatures={competitorFeatures}
            size={280}
            label={myProduct.name}
          />
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            Your Product
          </div>
          {segmentPreferences && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              Segment Ideal
            </div>
          )}
          {topCompetitor && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              {topCompetitor.teamName || "Top Competitor"}
            </div>
          )}
        </div>

        {/* Feature-by-feature comparison table */}
        {topCompetitor && (
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 px-2 pb-1 border-b border-slate-700/50">
              <span>Feature</span>
              <span className="text-right">You</span>
              <span className="text-right">{topCompetitor.teamName || "Rival"}</span>
              <span className="text-right">Delta</span>
            </div>
            {FEATURE_KEYS.map((key) => {
              const mine = myFeatures[key];
              const theirs = (competitorFeatures || myFeatures)[key];
              const delta = getDelta(mine, theirs);
              return (
                <div key={key} className="grid grid-cols-4 gap-2 text-sm px-2 py-1 hover:bg-slate-700/30 rounded">
                  <span className="text-slate-300">{FEATURE_LABELS[key]}</span>
                  <span className="text-right text-white font-medium">{mine}</span>
                  <span className="text-right text-slate-400">{theirs}</span>
                  <span className="text-right flex items-center justify-end gap-1">
                    {delta.direction === "up" && (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">+{delta.value}</span>
                      </>
                    )}
                    {delta.direction === "down" && (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-400" />
                        <span className="text-red-400">{delta.value}</span>
                      </>
                    )}
                    {delta.direction === "same" && (
                      <>
                        <Minus className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500">-</span>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Price & share comparison */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-slate-700/40 rounded-lg">
            <div className="text-slate-400 text-xs mb-1">Your Price</div>
            <div className="text-white font-semibold">${myProduct.price}</div>
            {topCompetitor && (
              <div className={`text-xs mt-1 ${
                myProduct.price <= topCompetitor.price ? "text-green-400" : "text-amber-400"
              }`}>
                vs ${topCompetitor.price} ({myProduct.price <= topCompetitor.price ? "cheaper" : "pricier"})
              </div>
            )}
          </div>
          <div className="p-3 bg-slate-700/40 rounded-lg">
            <div className="text-slate-400 text-xs mb-1">Your Share</div>
            <div className="text-white font-semibold">
              {myProduct.marketShare !== undefined ? `${(myProduct.marketShare * 100).toFixed(1)}%` : "-"}
            </div>
            {topCompetitor?.marketShare !== undefined && (
              <div className={`text-xs mt-1 ${
                (myProduct.marketShare ?? 0) >= topCompetitor.marketShare ? "text-green-400" : "text-red-400"
              }`}>
                vs {(topCompetitor.marketShare * 100).toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Competitors list */}
        {competitors.length > 1 && (
          <div className="pt-2 border-t border-slate-700/50">
            <div className="text-xs text-slate-500 mb-2">All competitors in {segment}</div>
            <div className="space-y-1">
              {competitors.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-slate-700/30 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">{c.teamName || c.name}</span>
                    <Badge className="text-[10px] px-1.5 py-0 bg-slate-600/50 text-slate-400 border-none">
                      ${c.price}
                    </Badge>
                  </div>
                  <span className="text-slate-400">
                    {c.marketShare !== undefined ? `${(c.marketShare * 100).toFixed(1)}%` : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
