"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Building2,
  Globe,
  FileText,
  PiggyBank,
  CreditCard,
  Landmark,
  BarChart3,
} from "lucide-react";
import { fmt, FINANCIALS, FINANCIAL_RATIOS, FX_POSITIONS, FUNDING_OPTIONS, BOARD_PROPOSALS } from "../mockData";

const FUNDING_ICONS: Record<string, React.ElementType> = { loan: Building2, bond: FileText, equity: TrendingUp };

const getRatioStatus = (ratio: string, value: number): { status: string; color: string } => {
  const thresholds: Record<string, { green: number; yellow: number }> = {
    currentRatio: { green: 2.0, yellow: 1.5 },
    quickRatio: { green: 1.5, yellow: 1.0 },
    debtToEquity: { green: 0.5, yellow: 1.0 },
    profitMargin: { green: 0.15, yellow: 0.05 },
    roe: { green: 0.15, yellow: 0.08 },
    roa: { green: 0.08, yellow: 0.03 },
  };
  const t = thresholds[ratio];
  if (!t) return { status: "N/A", color: "text-slate-400" };
  if (ratio === "debtToEquity") {
    if (value <= t.green) return { status: "Healthy", color: "text-green-400" };
    if (value <= t.yellow) return { status: "Moderate", color: "text-yellow-400" };
    return { status: "High Risk", color: "text-red-400" };
  }
  if (value >= t.green) return { status: "Strong", color: "text-green-400" };
  if (value >= t.yellow) return { status: "Moderate", color: "text-yellow-400" };
  return { status: "Weak", color: "text-red-400" };
};

export default function DemoFinancePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Finance"
        subtitle="Manage capital, investments, and financial strategy"
        icon={<DollarSign className="h-6 w-6" />}
        iconColor="text-green-400"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="funding">Funding</TabsTrigger>
          <TabsTrigger value="forex">Forex</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Cash" value={fmt(FINANCIALS.cash)} icon={<Wallet className="w-5 h-5" />} variant="success" trend="up" trendValue="+3.2%" />
            <StatCard label="Revenue" value={fmt(FINANCIALS.revenue)} icon={<TrendingUp className="w-5 h-5" />} variant="info" trend="up" trendValue="+12.8%" />
            <StatCard label="Net Income" value={fmt(FINANCIALS.netIncome)} icon={<DollarSign className="w-5 h-5" />} variant="success" trend="up" trendValue="+8.1%" />
            <StatCard label="EPS" value={`$${FINANCIALS.eps.toFixed(2)}`} icon={<BarChart3 className="w-5 h-5" />} variant="purple" />
          </div>

          {/* Financial Ratios */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Financial Ratios" icon={<BarChart3 className="w-5 h-5" />} iconColor="text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {([
                  { key: "currentRatio", label: "Current Ratio", value: FINANCIAL_RATIOS.currentRatio },
                  { key: "quickRatio", label: "Quick Ratio", value: FINANCIAL_RATIOS.quickRatio },
                  { key: "debtToEquity", label: "Debt to Equity", value: FINANCIAL_RATIOS.debtToEquity },
                  { key: "profitMargin", label: "Profit Margin", value: FINANCIAL_RATIOS.profitMargin },
                  { key: "roe", label: "Return on Equity", value: FINANCIAL_RATIOS.roe },
                  { key: "roa", label: "Return on Assets", value: FINANCIAL_RATIOS.roa },
                ] as const).map((ratio) => {
                  const status = getRatioStatus(ratio.key, ratio.value);
                  return (
                    <div key={ratio.key} className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 text-sm">{ratio.label}</span>
                        <Badge className={`text-xs ${status.color === "text-green-400" ? "bg-green-500/20 text-green-400" : status.color === "text-yellow-400" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                          {status.status}
                        </Badge>
                      </div>
                      <span className={`text-xl font-bold ${status.color}`}>
                        {ratio.key === "profitMargin" || ratio.key === "roe" || ratio.key === "roa"
                          ? `${(ratio.value * 100).toFixed(1)}%`
                          : ratio.value.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Debt Summary */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Capital Structure" icon={<Landmark className="w-5 h-5" />} iconColor="text-purple-400" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400 text-sm">Total Assets</span>
                  <p className="text-white text-xl font-bold">{fmt(FINANCIALS.totalAssets)}</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400 text-sm">Total Liabilities</span>
                  <p className="text-white text-xl font-bold">{fmt(FINANCIALS.totalLiabilities)}</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400 text-sm">Shareholders Equity</span>
                  <p className="text-emerald-400 text-xl font-bold">{fmt(FINANCIALS.equity)}</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400 text-sm">Shares Outstanding</span>
                  <p className="text-white text-xl font-bold">{(FINANCIALS.sharesOutstanding / 1_000_000).toFixed(0)}M</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === STATEMENTS TAB === */}
        <TabsContent value="statements" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Income Statement" icon={<FileText className="w-5 h-5" />} iconColor="text-blue-400" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Revenue", value: FINANCIALS.revenue, bold: true },
                { label: "Cost of Goods Sold", value: -FINANCIALS.cogs },
                { label: "Gross Profit", value: FINANCIALS.grossProfit, bold: true, color: "text-emerald-400" },
                { label: "Operating Expenses", value: -FINANCIALS.operatingExpenses },
                { label: "Net Income", value: FINANCIALS.netIncome, bold: true, color: "text-emerald-400" },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between py-2 ${row.bold ? "border-t border-slate-600 pt-3" : ""}`}>
                  <span className={`text-sm ${row.bold ? "text-white font-medium" : "text-slate-400"}`}>{row.label}</span>
                  <span className={`text-sm font-medium ${row.color || (row.value < 0 ? "text-red-400" : "text-white")}`}>
                    {row.value < 0 ? `-${fmt(Math.abs(row.value))}` : fmt(row.value)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Balance Sheet" icon={<FileText className="w-5 h-5" />} iconColor="text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-white font-medium text-sm mb-3">Assets</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Cash & Equivalents</span>
                    <span className="text-white">{fmt(FINANCIALS.cash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Current Assets</span>
                    <span className="text-white">{fmt(FINANCIALS.currentAssets)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-600 pt-2">
                    <span className="text-white font-medium">Total Assets</span>
                    <span className="text-white font-medium">{fmt(FINANCIALS.totalAssets)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-medium text-sm mb-3">Liabilities & Equity</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Current Liabilities</span>
                    <span className="text-white">{fmt(FINANCIALS.currentLiabilities)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Liabilities</span>
                    <span className="text-white">{fmt(FINANCIALS.totalLiabilities)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-600 pt-2">
                    <span className="text-emerald-400 font-medium">Shareholders Equity</span>
                    <span className="text-emerald-400 font-medium">{fmt(FINANCIALS.equity)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === FUNDING TAB === */}
        <TabsContent value="funding" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Funding Options" icon={<PiggyBank className="w-5 h-5" />} iconColor="text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {FUNDING_OPTIONS.map((option) => {
                  const Icon = FUNDING_ICONS[option.type] || DollarSign;
                  return (
                    <div key={option.type} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <span className="text-white font-medium">{option.name}</span>
                          {option.rate > 0 && <p className="text-slate-400 text-xs">{option.rate}% APR / {option.term}yr</p>}
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm">{option.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Dividend Policy" icon={<CreditCard className="w-5 h-5" />} iconColor="text-amber-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Current Dividend per Share</span>
                <span className="text-white font-medium">${FINANCIALS.dividendPerShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Dividend Payout</span>
                <span className="text-white font-medium">{fmt(FINANCIALS.dividendPerShare * FINANCIALS.sharesOutstanding)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Payout Ratio</span>
                <span className="text-white font-medium">{((FINANCIALS.dividendPerShare * FINANCIALS.sharesOutstanding / FINANCIALS.netIncome) * 100).toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === FOREX TAB === */}
        <TabsContent value="forex" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Foreign Exchange Positions" icon={<Globe className="w-5 h-5" />} iconColor="text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {FX_POSITIONS.map((pos) => (
                  <div key={pos.pair} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-medium">{pos.pair}</span>
                        <p className="text-slate-400 text-xs">Rate: {pos.rate}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-medium">{fmt(pos.exposure)}</span>
                        <p className="text-slate-400 text-xs">exposure</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Hedged</span>
                      <span className="text-white">{(pos.hedged * 100).toFixed(0)}%</span>
                    </div>
                    <EnhancedProgress value={pos.hedged * 100} variant="info" size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === BOARD TAB === */}
        <TabsContent value="board" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Board Proposals" icon={<Landmark className="w-5 h-5" />} iconColor="text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {BOARD_PROPOSALS.map((proposal) => (
                  <div key={proposal.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{proposal.name}</span>
                      <Badge className={
                        proposal.category === "financial" ? "bg-green-500/20 text-green-400" :
                        proposal.category === "strategic" ? "bg-blue-500/20 text-blue-400" :
                        "bg-purple-500/20 text-purple-400"
                      }>
                        {proposal.category}
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{proposal.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs">Approval chance:</span>
                      <EnhancedProgress value={proposal.approvalChance} variant={proposal.approvalChance >= 65 ? "success" : proposal.approvalChance >= 50 ? "warning" : "danger"} size="sm" className="flex-1" />
                      <span className="text-slate-400 text-xs">{proposal.approvalChance}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
