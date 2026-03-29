// ============================================================
// StatementsTab.tsx
// Financial statements display: full FinancialStatements component,
// stock information card (share price, market cap, EPS, shares outstanding).
// Read-only — no interactive elements.
// ============================================================
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { formatCurrency } from "@/lib/utils";
import { FinancialStatementsComponent } from "@/components/game/FinancialStatements";
import { FileText, BarChart3 } from "lucide-react";
import type { TeamState } from "@/engine/types";

interface StatementsTabProps {
  state: TeamState | null;
  hasDetailedFinancials: boolean;
  financials: {
    eps: number;
    sharesOutstanding: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netIncome: number;
    totalAssets: number;
    currentAssets: number;
    totalLiabilities: number;
    equity: number;
  };
}

export function StatementsTab({ state, hasDetailedFinancials, financials }: StatementsTabProps) {
  return (
    <div className="space-y-6">
      {/* Full Financial Statements */}
      {state?.financialStatements ? (
        <FinancialStatementsComponent
          statements={state.financialStatements}
          previousStatements={state.previousFinancialStatements}
        />
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400">Financial statements are not available yet.</p>
            <p className="text-slate-500 text-sm mt-2">
              Complete a round to generate your first financial statements.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stock Information */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Stock Information <HelpTooltip text="EPS (Earnings Per Share) = Net Income / Shares Outstanding. Key ranking metric. Issuing stock raises cash but dilutes EPS." /></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">Share Price</p>
              <p className="text-xl font-bold text-white">${(state?.sharePrice || 0).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">Market Cap</p>
              <p className="text-xl font-bold text-blue-400">{formatCurrency(state?.marketCap || 0)}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">EPS</p>
              <p className={`text-xl font-bold ${financials.eps >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${financials.eps.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-sm">Shares Outstanding</p>
              <p className="text-xl font-bold text-white">{(financials.sharesOutstanding / 1_000_000).toFixed(1)}M</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Performance (placeholder) */}
      {hasDetailedFinancials && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Historical Performance</CardTitle>
            <CardDescription className="text-slate-400">
              Financial trends over past rounds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No historical data yet</p>
              <p className="text-sm">Charts will appear after Round 1 completes</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
