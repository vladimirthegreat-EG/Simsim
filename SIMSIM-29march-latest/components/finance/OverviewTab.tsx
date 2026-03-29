// ============================================================
// OverviewTab.tsx
// Finance overview dashboard: KPI stat cards, financial ratios,
// balance sheet summary, income statement, cash management
// (available cash, pending payments, net position, cash flow).
// Read-only — no interactive elements.
// ============================================================
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  PiggyBank,
  CreditCard,
} from "lucide-react";
import type { TeamState } from "@/engine/types";

interface OverviewTabProps {
  financials: {
    cash: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netIncome: number;
    totalAssets: number;
    currentAssets: number;
    totalLiabilities: number;
    currentLiabilities: number;
    equity: number;
    eps: number;
    sharesOutstanding: number;
  };
  ratios: {
    currentRatio: number;
    quickRatio: number;
    debtToEquity: number;
    profitMargin: number;
    roe: number;
    roa: number;
  };
  state: TeamState | null;
  currentRound: number;
}

const getRatioStatus = (ratio: string, value: number): { status: string; color: string } => {
  const thresholds: Record<string, { green: number; yellow: number }> = {
    currentRatio: { green: 2.0, yellow: 1.5 },
    quickRatio: { green: 1.5, yellow: 1.0 },
    debtToEquity: { green: 0.5, yellow: 1.0 },
    profitMargin: { green: 0.15, yellow: 0.05 },
  };
  const t = thresholds[ratio];
  if (!t) return { status: "neutral", color: "text-slate-400" };
  if (ratio === "debtToEquity") {
    if (value <= t.green) return { status: "healthy", color: "text-green-400" };
    if (value <= t.yellow) return { status: "warning", color: "text-yellow-400" };
    return { status: "critical", color: "text-red-400" };
  }
  if (value >= t.green) return { status: "healthy", color: "text-green-400" };
  if (value >= t.yellow) return { status: "warning", color: "text-yellow-400" };
  return { status: "critical", color: "text-red-400" };
};

export function OverviewTab({ financials, ratios, state, currentRound }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Empty state for no revenue */}
      {financials.revenue === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-white text-lg font-medium mb-2">No Revenue Yet</h3>
          <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">Submit your first round of decisions to start selling products and generating revenue.</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Cash Balance"
          value={formatCurrency(financials.cash)}
          icon={<Wallet className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(financials.revenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="info"
        />
        <StatCard
          label="Net Income"
          value={formatCurrency(financials.netIncome)}
          icon={financials.netIncome >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          variant={financials.netIncome >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="EPS"
          value={`$${financials.eps.toFixed(2)}`}
          icon={<BarChart3 className="w-5 h-5" />}
          variant="purple"
        />
      </div>

      {/* Credit Rating + Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Credit Rating</div>
          <div className={`text-xl font-bold ${
            ratios.debtToEquity < 0.5 ? "text-green-400" :
            ratios.debtToEquity < 1.0 ? "text-blue-400" :
            ratios.debtToEquity < 1.5 ? "text-amber-400" : "text-red-400"
          }`}>
            {ratios.debtToEquity < 0.3 ? "AAA" : ratios.debtToEquity < 0.5 ? "AA" :
             ratios.debtToEquity < 0.8 ? "A" : ratios.debtToEquity < 1.0 ? "BBB" :
             ratios.debtToEquity < 1.5 ? "BB" : ratios.debtToEquity < 2.0 ? "B" : "CCC"}
          </div>
          <div className="text-slate-500 text-xs">D/E: {ratios.debtToEquity.toFixed(2)}x</div>
        </div>
        <div className="p-3 bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Share Price</div>
          <div className="text-xl font-bold text-white">${(state?.sharePrice ?? 50).toFixed(2)}</div>
          <div className="text-slate-500 text-xs">Mkt Cap: {formatCurrency(state?.marketCap ?? 0)}</div>
        </div>
        <div className="p-3 bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Profit Margin</div>
          <div className={`text-xl font-bold ${ratios.profitMargin > 0 ? "text-green-400" : "text-red-400"}`}>
            {(ratios.profitMargin * 100).toFixed(1)}%
          </div>
          <div className="text-slate-500 text-xs">ROE: {(ratios.roe * 100).toFixed(1)}%</div>
        </div>
        <div className="p-3 bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm rounded-lg">
          <div className="text-slate-400 text-xs mb-1">Current Ratio</div>
          <div className={`text-xl font-bold ${ratios.currentRatio > 2 ? "text-green-400" : ratios.currentRatio > 1 ? "text-blue-400" : "text-red-400"}`}>
            {ratios.currentRatio.toFixed(2)}x
          </div>
          <div className="text-slate-500 text-xs">{ratios.currentRatio > 1 ? "Healthy" : "Liquidity risk"}</div>
        </div>
      </div>

      {/* Financial Ratios + Balance Sheet */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Financial Ratios</CardTitle>
            <CardDescription className="text-slate-400">
              Key liquidity and profitability metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(ratios).map(([key, value]) => {
              const { status, color } = getRatioStatus(key, value);
              const displayName = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase());
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {status === "healthy" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    {status === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                    {status === "critical" && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    {status === "neutral" && <div className="w-4 h-4" />}
                    <span className="text-slate-300">{displayName}</span>
                  </div>
                  <span className={`font-medium ${color}`}>
                    {typeof value === 'number' && value < 1
                      ? `${(value * 100).toFixed(1)}%`
                      : value.toFixed(2)
                    }
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Balance Sheet Summary <HelpTooltip text="Current Ratio above 1.5 is healthy. Debt-to-Equity below 0.5 means conservative financing. Watch cash flow to avoid running out of money." /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Total Assets</span>
                <span className="text-white font-medium">{formatCurrency(financials.totalAssets)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Total Liabilities</span>
                <span className="text-white font-medium">{formatCurrency(financials.totalLiabilities)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-900/30 border border-green-700 rounded-lg">
                <span className="text-green-400">Shareholders' Equity</span>
                <span className="text-green-400 font-medium">{formatCurrency(financials.equity)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Statement */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Income Statement</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Round:</span>
              <select
                className="bg-slate-700 border-slate-600 text-white text-sm rounded px-2 py-1"
                defaultValue="current"
              >
                <option value="current">Current (R{currentRound})</option>
                {Array.from({ length: Math.max(0, currentRound - 1) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Round {i + 1}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between p-3 bg-slate-700/50 rounded-lg">
              <span className="text-slate-300">Revenue</span>
              <span className="text-white">{formatCurrency(financials.revenue)}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg pl-8">
              <span className="text-slate-400">Cost of Goods Sold</span>
              <span className="text-red-400">-{formatCurrency(financials.cogs)}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-700/50 rounded-lg">
              <span className="text-slate-300">Gross Profit</span>
              <span className="text-white">{formatCurrency(financials.grossProfit)}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg pl-8">
              <span className="text-slate-400">Operating Expenses</span>
              <span className="text-red-400">-{formatCurrency(financials.operatingExpenses)}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-700/20 rounded-lg pl-8">
              <span className="text-slate-500">Storage & Warehousing</span>
              <span className="text-slate-400">incl. in OpEx</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-700/20 rounded-lg pl-8">
              <span className="text-slate-500">Inventory Write-Off</span>
              <span className="text-slate-400">incl. in OpEx</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-700/50 rounded-lg border-t-2 border-slate-600">
              <span className="text-white font-medium">Net Income</span>
              <span className={`font-bold ${financials.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(financials.netIncome)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Management */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <PiggyBank className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-slate-400 text-sm">Available Cash</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(financials.cash)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-slate-400 text-sm">Pending Payments</p>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(financials.currentLiabilities)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-slate-400 text-sm">Net Position</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(financials.cash - financials.currentLiabilities)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Projection */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Cash Flow Projection</CardTitle>
          <CardDescription className="text-slate-400">
            Expected inflows and outflows for this round
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
              <h3 className="text-green-400 font-medium mb-3">Inflows</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Product Sales</span>
                  <span className="text-green-400">+{formatCurrency(financials.revenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Accounts Receivable</span>
                  <span className="text-green-400">+{formatCurrency(state?.accountsReceivable || 0)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <h3 className="text-red-400 font-medium mb-3">Outflows</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Salaries & Wages</span>
                  <span className="text-red-400">-{formatCurrency(state?.workforce?.laborCost || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Cost of Goods Sold</span>
                  <span className="text-red-400">-{formatCurrency(financials.cogs)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Accounts Payable</span>
                  <span className="text-red-400">-{formatCurrency(state?.accountsPayable || 0)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-slate-700 rounded-lg">
              <span className="text-white font-medium">Projected End-of-Round Cash</span>
              <span className="text-xl font-bold text-green-400">
                {formatCurrency(financials.cash + financials.revenue - financials.operatingExpenses)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
