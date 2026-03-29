// ============================================================
// DecisionsTab.tsx
// All interactive finance decisions in one view:
// 1. Raise Capital (loan/bond/equity cards, amount selector, pending)
// 2. Share Buyback (amount buttons)
// 3. Outstanding Debt (breakdown with D/E ratio + covenant warning)
// 4. Dividend (slider $0-$5/share, payout display)
// 5. FX Hedging (4 currency pair sliders)
// ============================================================
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Building2,
  FileText,
  Globe,
  AlertTriangle,
  Landmark,
} from "lucide-react";
import type { TeamState } from "@/engine/types";

interface FundingOption {
  type: string;
  name: string;
  icon: typeof Building2;
  amounts: number[];
  rate: number;
  term: number;
  description: string;
}

interface DecisionsTabProps {
  finance: {
    issueTBills: number;
    issueBonds: number;
    issueShares: { count: number; pricePerShare: number } | null;
    sharesBuyback: number;
    dividendPerShare: number;
    fxHedging: Record<string, number>;
  };
  setFinanceDecisions: (decisions: Record<string, unknown>) => void;
  state: TeamState | null;
  fundingOptions: FundingOption[];
  selectedFunding: { type: string; amount: number } | null;
  setSelectedFunding: (v: { type: string; amount: number } | null) => void;
  pendingFunding: { type: string; amount: number } | null;
  setPendingFunding: (v: { type: string; amount: number } | null) => void;
  handleRequestFunding: () => void;
  fxHedging: Record<string, number>;
  setFxHedging: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  dividendAmount: number;
  setDividendAmount: (v: number) => void;
  marketState: Record<string, unknown> | null;
  financials: {
    totalLiabilities: number;
    sharesOutstanding: number;
    fxPositions: Record<string, { amount: number; rate: number }>;
  };
}

export function DecisionsTab({
  finance,
  setFinanceDecisions,
  state,
  fundingOptions,
  selectedFunding,
  setSelectedFunding,
  pendingFunding,
  setPendingFunding,
  handleRequestFunding,
  fxHedging,
  setFxHedging,
  dividendAmount,
  setDividendAmount,
  marketState,
  financials,
}: DecisionsTabProps) {
  return (
    <div className="space-y-6">
      {/* Section 1: Raise Capital */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Raise Capital</CardTitle>
          <CardDescription className="text-slate-400">
            Choose a funding method to raise additional capital
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {fundingOptions.map((option) => (
              <Card
                key={option.type}
                className={`bg-slate-700 border-slate-600 cursor-pointer transition-all ${
                  selectedFunding?.type === option.type ? 'border-green-500 ring-2 ring-green-500/20' : 'hover:border-slate-500'
                }`}
                onClick={() => setSelectedFunding({ type: option.type, amount: option.amounts[0] })}
              >
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-lg">
                    <option.icon className="w-5 h-5" />
                    {option.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm">
                    {option.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {option.rate > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Interest Rate</span>
                        <span className="text-white">{option.rate}%</span>
                      </div>
                    )}
                    {option.term > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Term</span>
                        <span className="text-white">{option.term} years</span>
                      </div>
                    )}
                    {option.type === "equity" && (
                      <div className="text-yellow-400 text-xs mt-2">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        Dilutes existing shareholders
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedFunding && (
            <div className="mt-6 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-white font-medium mb-4">Select Amount</h3>
              <div className="flex gap-3 flex-wrap">
                {fundingOptions
                  .find(o => o.type === selectedFunding.type)
                  ?.amounts.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedFunding.amount === amount ? "default" : "outline"}
                      className={selectedFunding.amount === amount
                        ? "bg-green-600 hover:bg-green-700"
                        : "border-slate-500"
                      }
                      onClick={() => setSelectedFunding({ ...selectedFunding, amount })}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))
                }
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleRequestFunding}
                >
                  Request Funding
                </Button>
              </div>
            </div>
          )}
          {pendingFunding && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 text-sm font-medium mb-2">Pending Funding Request:</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-300 capitalize">
                  {pendingFunding.type} - {formatCurrency(pendingFunding.amount)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 h-6 px-2"
                  onClick={() => {
                    setPendingFunding(null);
                    setFinanceDecisions({
                      issueTBills: 0,
                      issueBonds: 0,
                      issueShares: null,
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Share Buyback */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Share Buyback
          </CardTitle>
          <CardDescription className="text-slate-400">
            Buy back shares to increase EPS and signal confidence. Reduces cash but boosts share price.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 text-sm shrink-0">Buyback Amount:</span>
              <div className="flex gap-2 flex-wrap">
                {[0, 5_000_000, 10_000_000, 25_000_000, 50_000_000].map((amount) => (
                  <Button
                    key={amount}
                    size="sm"
                    variant={finance.sharesBuyback === amount ? "default" : "outline"}
                    className={finance.sharesBuyback === amount ? "bg-blue-600 hover:bg-blue-700" : "border-slate-500"}
                    onClick={() => setFinanceDecisions({ sharesBuyback: amount })}
                  >
                    {amount === 0 ? "None" : `$${(amount / 1_000_000).toFixed(0)}M`}
                  </Button>
                ))}
              </div>
            </div>
            {finance.sharesBuyback > 0 && (
              <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Shares to repurchase</span>
                  <span className="text-white font-medium">
                    {Math.floor(finance.sharesBuyback / (state?.sharePrice || 50)).toLocaleString()} shares
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 mt-1">
                  <span>at price</span>
                  <span className="text-white">${(state?.sharePrice || 50).toFixed(2)}/share</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Outstanding Debt */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Outstanding Debt</CardTitle>
        </CardHeader>
        <CardContent>
          {financials.totalLiabilities === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Landmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No outstanding debt</p>
              <p className="text-sm">Your company is debt-free</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Liabilities</span>
                  <span className="text-white font-medium">{formatCurrency(financials.totalLiabilities)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-xs mb-1">Short-Term Debt</div>
                  <div className="text-amber-400 font-medium">{formatCurrency(state?.shortTermDebt ?? 0)}</div>
                  <div className="text-slate-500 text-xs">T-bills, credit lines</div>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-xs mb-1">Long-Term Debt</div>
                  <div className="text-orange-400 font-medium">{formatCurrency(state?.longTermDebt ?? 0)}</div>
                  <div className="text-slate-500 text-xs">Bonds, long-term loans</div>
                </div>
              </div>
              {state && (state.shortTermDebt ?? 0) + (state.longTermDebt ?? 0) > 0 && state.shareholdersEquity > 0 && (
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Debt-to-Equity Ratio</span>
                    <span className={`font-medium ${
                      ((state.shortTermDebt ?? 0) + (state.longTermDebt ?? 0)) / state.shareholdersEquity > 1.5 ? "text-red-400" :
                      ((state.shortTermDebt ?? 0) + (state.longTermDebt ?? 0)) / state.shareholdersEquity > 1.0 ? "text-amber-400" :
                      "text-green-400"
                    }`}>
                      {(((state.shortTermDebt ?? 0) + (state.longTermDebt ?? 0)) / state.shareholdersEquity).toFixed(2)}x
                    </span>
                  </div>
                  {((state.shortTermDebt ?? 0) + (state.longTermDebt ?? 0)) / state.shareholdersEquity > 1.0 && (
                    <div className="text-xs text-amber-400 mt-1">Warning: Above 1.0x triggers interest surcharge. Above 2.0x freezes new debt.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Dividend */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Dividend Distribution</CardTitle>
          <CardDescription className="text-slate-400">
            Set dividend per share ($0 - $5.00)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Dividend Per Share</span>
                <span className="text-green-400 font-semibold text-lg">
                  ${dividendAmount.toFixed(2)}/share
                </span>
              </div>
              <Slider
                data-testid="slider-dividend"
                value={[dividendAmount * 20]}
                onValueChange={(values) => setDividendAmount(values[0] / 20)}
                max={100}
                step={2}
                variant="success"
              />
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Payout</span>
                <span className="text-white">
                  {formatCurrency(dividendAmount * financials.sharesOutstanding)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-400">Shares Outstanding</span>
                <span className="text-white">{financials.sharesOutstanding.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: FX Hedging */}
      <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg text-sm text-slate-300">
        FX Hedging protects against currency fluctuations when sourcing materials internationally. Lock in exchange rates to avoid surprise cost increases.
      </div>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Currency Exposure
          </CardTitle>
          <CardDescription className="text-slate-400">
            Manage foreign exchange risk from international operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(financials.fxPositions).map(([pair, position]) => (
              <Card key={pair} className="bg-slate-700 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-white font-medium">{pair}</span>
                    <Badge className="bg-slate-600">{position.rate.toFixed(4)}</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Exposure</span>
                      <span className="text-white">{formatCurrency(position.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hedged</span>
                      <span className="text-green-400">{fxHedging[pair] || 0}%</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <label className="text-slate-400 text-xs">Hedge Percentage</label>
                    <Slider
                      data-testid={`slider-fx-${pair.toLowerCase().replace('/', '-')}`}
                      value={[fxHedging[pair] || 0]}
                      onValueChange={(values) => setFxHedging(prev => ({
                        ...prev,
                        [pair]: values[0],
                      }))}
                      max={100}
                      step={5}
                      variant="success"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FX Volatility Alert */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">FX Volatility Alert</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-yellow-400 font-medium">
                  Market Volatility: {(((marketState?.fxVolatility as number) || 0.2) * 100).toFixed(0)}%
                </p>
                <p className="text-slate-400 text-sm">
                  Currency rates may fluctuate significantly between rounds. Consider hedging high-exposure positions.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
