"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  Bell,
  DollarSign,
  Heart,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import type {
  TeamHealthSummary,
  CompetitiveTension,
} from "@/engine/types/facilitator";

interface FacilitatorDashboardProps {
  teams: TeamHealthSummary[];
  tensions: CompetitiveTension[];
  currentRound: number;
  alerts: string[];
}

const statusConfig = {
  healthy: {
    label: "Healthy",
    badge: "bg-green-500/20 text-green-400 border-green-500/40",
    card: "border-green-500/40",
    dot: "bg-green-500",
  },
  struggling: {
    label: "Struggling",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    card: "border-yellow-500/40",
    dot: "bg-yellow-500",
  },
  critical: {
    label: "Critical",
    badge: "bg-red-500/20 text-red-400 border-red-500/40",
    card: "border-red-500/40",
    dot: "bg-red-500",
  },
} as const;

const severityColor = {
  low: "border-slate-600",
  medium: "border-yellow-500/50",
  high: "border-red-500/50",
} as const;

const tensionLabel: Record<CompetitiveTension["type"], string> = {
  price_war: "Price War",
  head_to_head: "Head to Head",
  patent_blocking: "Patent Block",
  share_battle: "Share Battle",
};

function getGameHealth(teams: TeamHealthSummary[]) {
  if (teams.length === 0) return { label: "No Data", color: "text-slate-400", bg: "bg-slate-700" };
  const critical = teams.filter((t) => t.status === "critical").length;
  const struggling = teams.filter((t) => t.status === "struggling").length;
  if (critical >= 2) return { label: "Critical", color: "text-red-400", bg: "bg-red-500/20" };
  if (critical >= 1 || struggling >= 2) return { label: "Unstable", color: "text-yellow-400", bg: "bg-yellow-500/20" };
  return { label: "Stable", color: "text-green-400", bg: "bg-green-500/20" };
}

export function FacilitatorDashboard({
  teams,
  tensions,
  currentRound,
  alerts,
}: FacilitatorDashboardProps) {
  const health = getGameHealth(teams);

  return (
    <div className="space-y-6">
      {/* Top: Round indicator + game health */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Facilitator Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-purple-500 text-purple-400 text-sm">
            Round {currentRound}
          </Badge>
          <Badge className={cn("border text-sm", health.bg, health.color)}>
            <Heart className="w-3.5 h-3.5 mr-1" />
            {health.label}
          </Badge>
        </div>
      </div>

      {/* Team Health Cards Grid */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Team Health
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map((team) => {
            const cfg = statusConfig[team.status];
            return (
              <Card key={team.teamId} className={cn("bg-slate-800 border", cfg.card)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-semibold text-sm">{team.teamName}</span>
                    <Badge variant="outline" className={cn("text-xs", cfg.badge)}>
                      <span className={cn("w-2 h-2 rounded-full mr-1.5", cfg.dot)} />
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <DollarSign className="w-3 h-3" />
                      <span>Cash:</span>
                      <span className="text-slate-200 font-medium">
                        ${(team.cash / 1_000_000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <DollarSign className="w-3 h-3" />
                      <span>Rev:</span>
                      <span className="text-slate-200 font-medium">
                        ${(team.revenue / 1_000_000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Zap className="w-3 h-3" />
                      <span>Products:</span>
                      <span className="text-slate-200 font-medium">{team.productCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Shield className="w-3 h-3" />
                      <span>Score:</span>
                      <span className="text-yellow-400 font-semibold">{team.achievementScore}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Competitive Tensions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Competitive Tensions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tensions.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No active tensions this round.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tensions.map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-4 bg-slate-700/40",
                    severityColor[t.severity]
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={cn(
                          "w-4 h-4",
                          t.severity === "high"
                            ? "text-red-400"
                            : t.severity === "medium"
                            ? "text-yellow-400"
                            : "text-slate-400"
                        )}
                      />
                      <span className="text-white font-medium text-sm">
                        {t.teamA} vs {t.teamB}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                      {tensionLabel[t.type]}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-xs">
                    {t.segment} segment &mdash; {t.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Feed */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Bell className="w-5 h-5 text-cyan-400" />
            Alert Feed
            {alerts.length > 0 && (
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/40 text-xs ml-1">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No notable events yet.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-700/40 border border-slate-700"
                >
                  <Bell className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                  <span className="text-slate-300 text-sm">{alert}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
