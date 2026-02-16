"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface SegmentInfo {
  totalDemand: number;
  priceRange: { min: number; max: number };
  growthRate: number;
}

interface DynamicPricingInfo {
  expectedPrice: number;
  underservedFactor: number;
  competitorCount: number;
}

interface CrowdingEntry {
  segment: string;
  productCount: number;
  crowdingFactor: number;
}

interface MarketDashboardProps {
  marketShares: Record<string, number>;
  segmentData: Record<string, SegmentInfo>;
  dynamicPricing?: Record<string, DynamicPricingInfo>;
  competitionData?: {
    crowding: CrowdingEntry[];
  };
}

type SortField = "segment" | "share" | "demand" | "growth" | "competition";
type SortDirection = "asc" | "desc";

const SEGMENT_DISPLAY_NAMES: Record<string, string> = {
  budget: "Budget",
  value: "Value",
  midrange: "Mid-Range",
  premium: "Premium",
  luxury: "Luxury",
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatPrice(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

function getCompetitionLevel(productCount: number): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (productCount >= 4) {
    return {
      label: "High",
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/30",
    };
  }
  if (productCount === 3) {
    return {
      label: "Medium",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/30",
    };
  }
  return {
    label: "Low",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/30",
  };
}

export function MarketDashboard({
  marketShares,
  segmentData,
  dynamicPricing,
  competitionData,
}: MarketDashboardProps) {
  const [sortField, setSortField] = useState<SortField>("segment");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const segments = Object.keys(segmentData);

  // Build crowding lookup
  const crowdingMap: Record<string, CrowdingEntry> = {};
  if (competitionData?.crowding) {
    for (const entry of competitionData.crowding) {
      crowdingMap[entry.segment] = entry;
    }
  }

  // Sort segments
  const sortedSegments = [...segments].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "segment":
        cmp = a.localeCompare(b);
        break;
      case "share":
        cmp = (marketShares[a] ?? 0) - (marketShares[b] ?? 0);
        break;
      case "demand":
        cmp = segmentData[a].totalDemand - segmentData[b].totalDemand;
        break;
      case "growth":
        cmp = segmentData[a].growthRate - segmentData[b].growthRate;
        break;
      case "competition":
        cmp =
          (crowdingMap[a]?.productCount ?? 0) -
          (crowdingMap[b]?.productCount ?? 0);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  // Count underserved opportunities
  const underservedSegments = dynamicPricing
    ? Object.entries(dynamicPricing).filter(
        ([, info]) => info.underservedFactor > 1.2
      )
    : [];

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Market Overview
          </CardTitle>
          {underservedSegments.length > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 border">
              <Sparkles className="w-3 h-3 mr-1" />
              {underservedSegments.length} Underserved{" "}
              {underservedSegments.length === 1 ? "Segment" : "Segments"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">Total Segments</div>
            <div className="text-white text-xl font-bold">{segments.length}</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">Avg Market Share</div>
            <div className="text-purple-400 text-xl font-bold">
              {segments.length > 0
                ? (
                    (Object.values(marketShares).reduce((s, v) => s + v, 0) /
                      segments.length) *
                    100
                  ).toFixed(1)
                : "0"}
              %
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">Total Demand</div>
            <div className="text-blue-400 text-xl font-bold">
              {formatCurrency(
                Object.values(segmentData).reduce(
                  (s, d) => s + d.totalDemand,
                  0
                )
              )}
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-slate-400 text-xs mb-1">Avg Growth</div>
            <div className="text-green-400 text-xl font-bold">
              {segments.length > 0
                ? (
                    (Object.values(segmentData).reduce(
                      (s, d) => s + d.growthRate,
                      0
                    ) /
                      segments.length) *
                    100
                  ).toFixed(1)
                : "0"}
              %
            </div>
          </div>
        </div>

        {/* Segment Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th
                  className="text-left text-slate-400 font-medium py-3 px-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("segment")}
                >
                  Segment
                  <SortIcon field="segment" />
                </th>
                <th
                  className="text-right text-slate-400 font-medium py-3 px-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("share")}
                >
                  Your Share
                  <SortIcon field="share" />
                </th>
                <th
                  className="text-right text-slate-400 font-medium py-3 px-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("demand")}
                >
                  Demand
                  <SortIcon field="demand" />
                </th>
                <th className="text-right text-slate-400 font-medium py-3 px-3">
                  Price Range
                </th>
                {dynamicPricing && (
                  <th className="text-right text-slate-400 font-medium py-3 px-3">
                    Expected Price
                  </th>
                )}
                <th
                  className="text-right text-slate-400 font-medium py-3 px-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("growth")}
                >
                  Growth
                  <SortIcon field="growth" />
                </th>
                <th
                  className="text-center text-slate-400 font-medium py-3 px-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("competition")}
                >
                  Competition
                  <SortIcon field="competition" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSegments.map((segment) => {
                const data = segmentData[segment];
                const share = marketShares[segment] ?? 0;
                const pricing = dynamicPricing?.[segment];
                const crowding = crowdingMap[segment];
                const productCount = crowding?.productCount ?? 0;
                const competition = getCompetitionLevel(productCount);
                const isUnderserved =
                  pricing != null && pricing.underservedFactor > 1.2;

                return (
                  <tr
                    key={segment}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                      isUnderserved ? "bg-amber-500/5" : ""
                    }`}
                  >
                    {/* Segment Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {SEGMENT_DISPLAY_NAMES[segment] ?? segment}
                        </span>
                        {isUnderserved && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 border text-[10px] px-1.5">
                            <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                            Opportunity
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Market Share */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-700 rounded-full h-1.5">
                          <div
                            className="bg-purple-500 rounded-full h-1.5 transition-all"
                            style={{ width: `${Math.min(share * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-purple-400 font-medium w-14 text-right">
                          {(share * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Total Demand */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">
                          {formatCurrency(data.totalDemand)}
                        </span>
                      </div>
                    </td>

                    {/* Price Range */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-slate-300">
                        {formatPrice(data.priceRange.min)} -{" "}
                        {formatPrice(data.priceRange.max)}
                      </span>
                    </td>

                    {/* Dynamic Expected Price */}
                    {dynamicPricing && (
                      <td className="py-3 px-3 text-right">
                        {pricing ? (
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span
                              className={
                                isUnderserved
                                  ? "text-amber-400 font-medium"
                                  : "text-slate-300"
                              }
                            >
                              {formatPrice(pricing.expectedPrice)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">--</span>
                        )}
                      </td>
                    )}

                    {/* Growth Rate */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {data.growthRate >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span
                          className={
                            data.growthRate >= 0
                              ? "text-green-400 font-medium"
                              : "text-red-400 font-medium"
                          }
                        >
                          {data.growthRate >= 0 ? "+" : ""}
                          {(data.growthRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Competition Level */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center">
                        <Badge
                          className={`${competition.bgColor} ${competition.color} ${competition.borderColor} border`}
                        >
                          {competition.label}
                          {crowding && (
                            <span className="ml-1 opacity-70">
                              ({productCount})
                            </span>
                          )}
                        </Badge>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Underserved Opportunities Detail */}
        {underservedSegments.length > 0 && (
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm">
                Underserved Market Opportunities
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {underservedSegments.map(([segment, info]) => (
                <div
                  key={segment}
                  className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="text-white font-medium text-sm">
                      {SEGMENT_DISPLAY_NAMES[segment] ?? segment}
                    </span>
                    <div className="text-slate-400 text-xs mt-0.5">
                      Underserved factor:{" "}
                      <span className="text-amber-400">
                        {info.underservedFactor.toFixed(2)}x
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 font-medium text-sm">
                      {formatPrice(info.expectedPrice)}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {info.competitorCount}{" "}
                      {info.competitorCount === 1
                        ? "competitor"
                        : "competitors"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
