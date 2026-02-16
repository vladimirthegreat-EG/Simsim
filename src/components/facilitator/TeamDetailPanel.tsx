"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Factory,
  Users,
  DollarSign,
  Megaphone,
  Lightbulb,
  Building2,
  TrendingUp,
  Leaf,
  CheckCircle2,
} from "lucide-react";

interface TeamState {
  cash: number;
  revenue: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  shareholdersEquity: number;
  marketCap: number;
  sharesIssued: number;
  sharePrice: number;
  eps: number;
  factories: Array<{
    id: string;
    name: string;
    region: string;
    efficiency: number;
    workers: number;
    supervisors: number;
    engineers: number;
  }>;
  workforce: {
    totalHeadcount: number;
    averageMorale: number;
    averageEfficiency: number;
    laborCost: number;
    turnoverRate: number;
  };
  brandValue: number;
  marketShare: Record<string, number>;
  products: Array<{
    id: string;
    name: string;
    segment: string;
    price: number;
  }>;
  rdBudget: number;
  patents: number;
  esgScore: number;
  co2Emissions: number;
}

interface TeamDetailPanelProps {
  team: {
    id: string;
    name: string;
    color: string;
    currentState: TeamState | null;
    decisions: Array<{
      module: string;
      submittedAt: Date;
    }>;
  };
  isExpanded?: boolean;
  onToggle?: () => void;
}

const MODULES = ["FACTORY", "FINANCE", "HR", "MARKETING", "RD"] as const;

export function TeamDetailPanel({ team, isExpanded, onToggle }: TeamDetailPanelProps) {
  const state = team.currentState;

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const submittedModules = team.decisions.map((d) => d.module);
  const submissionProgress = (submittedModules.length / MODULES.length) * 100;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
      {onToggle && (
        <div
          className="px-5 py-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full ring-2 ring-offset-1 ring-offset-slate-900"
                style={{ backgroundColor: team.color, boxShadow: `0 0 8px ${team.color}40` }}
              />
              <span className="text-white font-semibold">{team.name}</span>
            </div>
            <Badge
              className={`border-0 text-xs ${
                submissionProgress === 100
                  ? "bg-emerald-500/15 text-emerald-400"
                  : submissionProgress > 0
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {submittedModules.length}/{MODULES.length} submitted
            </Badge>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${submissionProgress}%`, backgroundColor: team.color }}
            />
          </div>
        </div>
      )}

      {isExpanded && state && (
        <div className={onToggle ? "border-t border-slate-800" : ""}>
          <Tabs defaultValue="financial" className="w-full">
            <div className="px-4 pt-4">
              <TabsList className="grid grid-cols-3 sm:grid-cols-5 bg-slate-800/50 border border-slate-700/30 rounded-lg p-0.5 h-auto">
                <TabsTrigger value="financial" className="text-xs data-[state=active]:bg-slate-700 rounded-md py-2 gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span className="hidden sm:inline">Financial</span>
                  <span className="sm:hidden">Fin</span>
                </TabsTrigger>
                <TabsTrigger value="operations" className="text-xs data-[state=active]:bg-slate-700 rounded-md py-2 gap-1">
                  <Factory className="w-3 h-3" />
                  <span className="hidden sm:inline">Operations</span>
                  <span className="sm:hidden">Ops</span>
                </TabsTrigger>
                <TabsTrigger value="workforce" className="text-xs data-[state=active]:bg-slate-700 rounded-md py-2 gap-1">
                  <Users className="w-3 h-3" />
                  <span className="hidden sm:inline">Workforce</span>
                  <span className="sm:hidden">HR</span>
                </TabsTrigger>
                <TabsTrigger value="market" className="text-xs data-[state=active]:bg-slate-700 rounded-md py-2 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span className="hidden sm:inline">Market</span>
                  <span className="sm:hidden">Mkt</span>
                </TabsTrigger>
                <TabsTrigger value="esg" className="text-xs data-[state=active]:bg-slate-700 rounded-md py-2 gap-1">
                  <Leaf className="w-3 h-3" />
                  ESG
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MetricBox label="Cash" value={formatCurrency(state.cash)} icon={DollarSign} />
                  <MetricBox label="Revenue" value={formatCurrency(state.revenue)} icon={TrendingUp} />
                  <MetricBox label="Net Income" value={formatCurrency(state.netIncome)} icon={DollarSign} variant={state.netIncome >= 0 ? "positive" : "negative"} />
                  <MetricBox label="EPS" value={`$${state.eps.toFixed(2)}`} icon={TrendingUp} variant={state.eps >= 0 ? "positive" : "negative"} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MetricBox label="Market Cap" value={formatCurrency(state.marketCap)} icon={Building2} />
                  <MetricBox label="Share Price" value={`$${state.sharePrice.toFixed(2)}`} icon={TrendingUp} />
                  <MetricBox label="Total Assets" value={formatCurrency(state.totalAssets)} icon={DollarSign} />
                  <MetricBox label="Liabilities" value={formatCurrency(state.totalLiabilities)} icon={DollarSign} />
                </div>
              </TabsContent>

              {/* Operations Tab */}
              <TabsContent value="operations" className="space-y-3 mt-0">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {state.factories.length} Factor{state.factories.length !== 1 ? "ies" : "y"}
                </div>
                {state.factories.map((factory) => (
                  <div key={factory.id} className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-white font-medium text-sm">{factory.name}</span>
                      <Badge className="bg-slate-700/50 text-slate-400 border-0 text-xs">
                        {factory.region}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500 text-xs">Efficiency</span>
                        <div className="text-white font-medium">{formatPercent(factory.efficiency)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Workers</span>
                        <div className="text-white font-medium">{factory.workers}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Supervisors</span>
                        <div className="text-white font-medium">{factory.supervisors}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Engineers</span>
                        <div className="text-white font-medium">{factory.engineers}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {state.products.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Products</div>
                    <div className="flex flex-wrap gap-1.5">
                      {state.products.map((product) => (
                        <Badge key={product.id} className="bg-slate-800/60 text-slate-300 border border-slate-700/30 text-xs">
                          {product.name} - {product.segment} (${product.price})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Workforce Tab */}
              <TabsContent value="workforce" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <MetricBox label="Headcount" value={state.workforce.totalHeadcount.toString()} icon={Users} />
                  <MetricBox
                    label="Morale"
                    value={`${state.workforce.averageMorale.toFixed(0)}%`}
                    icon={Users}
                    variant={state.workforce.averageMorale >= 70 ? "positive" : state.workforce.averageMorale >= 50 ? "neutral" : "negative"}
                  />
                  <MetricBox label="Efficiency" value={formatPercent(state.workforce.averageEfficiency)} icon={TrendingUp} />
                  <MetricBox label="Labor Cost" value={formatCurrency(state.workforce.laborCost)} icon={DollarSign} />
                  <MetricBox
                    label="Turnover Rate"
                    value={formatPercent(state.workforce.turnoverRate)}
                    icon={Users}
                    variant={state.workforce.turnoverRate <= 0.1 ? "positive" : state.workforce.turnoverRate <= 0.2 ? "neutral" : "negative"}
                  />
                </div>
              </TabsContent>

              {/* Market Tab */}
              <TabsContent value="market" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-2">
                  <MetricBox label="Brand Value" value={formatPercent(state.brandValue)} icon={Megaphone} />
                  <MetricBox label="R&D Budget" value={formatCurrency(state.rdBudget)} icon={Lightbulb} />
                </div>
                {Object.keys(state.marketShare).length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Market Share by Segment</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(state.marketShare).map(([segment, share]) => (
                        <div key={segment} className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/30">
                          <div className="text-xs text-slate-500">{segment}</div>
                          <div className="text-white font-medium text-sm">{formatPercent(share)}</div>
                          <div className="h-1 bg-slate-700/50 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                              style={{ width: `${share * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ESG Tab */}
              <TabsContent value="esg" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-2">
                  <MetricBox
                    label="ESG Score"
                    value={state.esgScore.toString()}
                    icon={Leaf}
                    variant={state.esgScore >= 80 ? "positive" : state.esgScore >= 50 ? "neutral" : "negative"}
                  />
                  <MetricBox
                    label="CO2 Emissions"
                    value={`${state.co2Emissions.toLocaleString()} tons`}
                    icon={Factory}
                    variant={state.co2Emissions <= 500 ? "positive" : state.co2Emissions <= 1500 ? "neutral" : "negative"}
                  />
                  <MetricBox label="Patents" value={state.patents.toString()} icon={Lightbulb} />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Submission Status */}
          <div className="px-4 pb-4">
            <div className="pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Module Submissions</div>
              <div className="flex flex-wrap gap-1.5">
                {MODULES.map((module) => {
                  const decision = team.decisions.find((d) => d.module === module);
                  return (
                    <Badge
                      key={module}
                      className={`text-xs gap-1 border-0 ${
                        decision
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {decision && <CheckCircle2 className="w-3 h-3" />}
                      {module === "RD" ? "R&D" : module.charAt(0) + module.slice(1).toLowerCase()}
                      {decision && (
                        <span className="opacity-60 ml-0.5">
                          {new Date(decision.submittedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {isExpanded && !state && (
        <div className="px-4 pb-4">
          <div className="text-center py-6 text-slate-500 text-sm">
            Team state not initialized yet. Start the game to see team details.
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for metric boxes
function MetricBox({
  label,
  value,
  icon: Icon,
  variant = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "positive" | "negative" | "neutral";
}) {
  const variantStyles = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    neutral: "text-white",
  };

  return (
    <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
      <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`font-semibold text-sm ${variantStyles[variant]}`}>{value}</div>
    </div>
  );
}
