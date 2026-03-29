"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  DollarSign,
} from "lucide-react";

interface MetricChange {
  label: string;
  before: number;
  after: number;
  format?: "currency" | "percent" | "number";
}

interface DecisionImpactPanelProps {
  moduleName: string;
  costs: number;
  messages: string[];
  metrics?: MetricChange[];
  cashRemaining?: number;
}

function formatValue(value: number, format?: "currency" | "percent" | "number"): string {
  switch (format) {
    case "currency":
      if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
      if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
}

function getMessageIcon(msg: string) {
  const lower = msg.toLowerCase();
  if (lower.includes("warning") || lower.includes("risk") || lower.includes("penalty") || lower.includes("insufficient"))
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (lower.includes("improved") || lower.includes("success") || lower.includes("purchased") || lower.includes("hired"))
    return <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

export function DecisionImpactPanel({
  moduleName,
  costs,
  messages,
  metrics,
  cashRemaining,
}: DecisionImpactPanelProps) {
  const hasImpact = costs > 0 || messages.length > 0 || (metrics && metrics.length > 0);
  if (!hasImpact) return null;

  return (
    <Card className="bg-slate-800/80 border-slate-700 border-cyan-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-medium text-sm">Impact Preview</span>
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
              {moduleName}
            </Badge>
          </div>
          {costs > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 text-xs">
              <DollarSign className="w-3 h-3 mr-0.5" />
              {formatValue(costs, "currency")} cost
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Metric Changes */}
        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metrics.map((m, i) => {
              const delta = m.after - m.before;
              const isPositive = delta > 0;
              const isNeutral = delta === 0;

              return (
                <div key={i} className="p-2 bg-slate-700/50 rounded-lg">
                  <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">{m.label}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-medium">{formatValue(m.after, m.format)}</span>
                    {!isNeutral && (
                      <span className={`flex items-center text-[10px] ${isPositive ? "text-green-400" : "text-red-400"}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? "+" : ""}{formatValue(delta, m.format)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Engine Messages */}
        {messages.length > 0 && (
          <div className="space-y-1">
            {messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                {getMessageIcon(msg)}
                <span>{msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Cash Remaining */}
        {cashRemaining !== undefined && (
          <div className={`flex items-center justify-between p-2 rounded-lg ${cashRemaining < 0 ? "bg-red-500/10 border border-red-500/30" : "bg-slate-700/30"}`}>
            <span className="text-slate-400 text-xs">Cash Remaining</span>
            <span className={`text-sm font-medium ${cashRemaining < 0 ? "text-red-400" : "text-green-400"}`}>
              {formatValue(cashRemaining, "currency")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
