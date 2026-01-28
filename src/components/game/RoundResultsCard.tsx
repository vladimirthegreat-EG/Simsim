"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  DollarSign,
  BarChart3,
  Target,
} from "lucide-react";

interface RoundResult {
  round: number;
  revenue: number;
  netIncome: number;
  marketShare: number;
  rank: number;
  totalTeams: number;
  cashChange: number;
  stockPriceChange: number;
}

interface RoundResultsCardProps {
  result: RoundResult;
  previousResult?: RoundResult;
}

export function RoundResultsCard({ result, previousResult }: RoundResultsCardProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getChangeIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="w-4 h-4 text-slate-400" />;
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getChangeColor = (current: number, previous?: number) => {
    if (!previous) return "text-slate-400";
    if (current > previous) return "text-green-400";
    if (current < previous) return "text-red-400";
    return "text-slate-400";
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (rank === 2) return "bg-slate-400/20 text-slate-300 border-slate-400/30";
    if (rank === 3) return "bg-orange-600/20 text-orange-400 border-orange-500/30";
    return "bg-slate-600/20 text-slate-400 border-slate-600/30";
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Round {result.round} Results
          </CardTitle>
          <Badge className={`${getRankBadgeColor(result.rank)} border`}>
            <Trophy className="w-3 h-3 mr-1" />
            Rank #{result.rank} of {result.totalTeams}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Revenue</span>
              {getChangeIcon(result.revenue, previousResult?.revenue)}
            </div>
            <div className="text-xl font-bold text-white">
              {formatCurrency(result.revenue)}
            </div>
            {previousResult && (
              <div className={`text-xs ${getChangeColor(result.revenue, previousResult.revenue)}`}>
                {result.revenue >= previousResult.revenue ? "+" : ""}
                {formatCurrency(result.revenue - previousResult.revenue)}
              </div>
            )}
          </div>

          {/* Net Income */}
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Net Income</span>
              {getChangeIcon(result.netIncome, previousResult?.netIncome)}
            </div>
            <div className={`text-xl font-bold ${result.netIncome >= 0 ? "text-green-400" : "text-red-400"}`}>
              {formatCurrency(result.netIncome)}
            </div>
            {previousResult && (
              <div className={`text-xs ${getChangeColor(result.netIncome, previousResult.netIncome)}`}>
                {result.netIncome >= previousResult.netIncome ? "+" : ""}
                {formatCurrency(result.netIncome - previousResult.netIncome)}
              </div>
            )}
          </div>

          {/* Market Share */}
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Market Share</span>
              {getChangeIcon(result.marketShare, previousResult?.marketShare)}
            </div>
            <div className="text-xl font-bold text-blue-400">
              {formatPercent(result.marketShare)}
            </div>
            {previousResult && (
              <div className={`text-xs ${getChangeColor(result.marketShare, previousResult.marketShare)}`}>
                {result.marketShare >= previousResult.marketShare ? "+" : ""}
                {formatPercent(result.marketShare - previousResult.marketShare)}
              </div>
            )}
          </div>

          {/* Cash Change */}
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-sm">Cash Flow</span>
              <DollarSign className={`w-4 h-4 ${result.cashChange >= 0 ? "text-green-400" : "text-red-400"}`} />
            </div>
            <div className={`text-xl font-bold ${result.cashChange >= 0 ? "text-green-400" : "text-red-400"}`}>
              {result.cashChange >= 0 ? "+" : ""}{formatCurrency(result.cashChange)}
            </div>
            <div className="text-xs text-slate-400">
              This round
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
