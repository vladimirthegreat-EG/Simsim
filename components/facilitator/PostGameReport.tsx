"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Map,
  Award,
  Clock,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { PostGameReport as PostGameReportType } from "@/engine/types/facilitator";

interface PostGameReportProps {
  report: PostGameReportType;
}

type Tab = "journeys" | "concepts" | "achievements" | "timeline" | "whatif";

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "journeys", label: "Team Journeys", icon: <Users className="w-4 h-4" /> },
  { key: "concepts", label: "Concept Map", icon: <Map className="w-4 h-4" /> },
  { key: "achievements", label: "Achievements", icon: <Award className="w-4 h-4" /> },
  { key: "timeline", label: "Market Timeline", icon: <Clock className="w-4 h-4" /> },
  { key: "whatif", label: "What If", icon: <GitBranch className="w-4 h-4" /> },
];

export function PostGameReport({ report }: PostGameReportProps) {
  const [activeTab, setActiveTab] = useState<Tab>("journeys");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // Group timeline entries by round
  const timelineByRound = report.marketTimeline.reduce<Record<number, typeof report.marketTimeline>>(
    (acc, entry) => {
      if (!acc[entry.round]) acc[entry.round] = [];
      acc[entry.round].push(entry);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-bold text-white">Post-Game Report</h2>
      </div>

      {/* Executive Summary */}
      <Card className="bg-purple-900/20 border-purple-500/40">
        <CardHeader>
          <CardTitle className="text-purple-300 text-base">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 text-sm leading-relaxed">{report.executiveSummary}</p>
        </CardContent>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.key
                ? "bg-purple-600 text-white"
                : "bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Team Journeys */}
      {activeTab === "journeys" && (
        <div className="space-y-3">
          {report.teamJourneys.map((tj) => {
            const isOpen = expandedTeam === tj.teamId;
            return (
              <Card key={tj.teamId} className="bg-slate-800 border-slate-700">
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedTeam(isOpen ? null : tj.teamId)}
                >
                  <CardTitle className="text-white flex items-center justify-between text-base">
                    <span>{tj.teamName}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </CardTitle>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-3 text-sm">
                    <Section label="Strategy Arc" color="text-purple-400" text={tj.strategyArc} />
                    <Section label="Key Decisions" color="text-blue-400" text={tj.keyDecisions} />
                    <Section label="Competitive Interactions" color="text-orange-400" text={tj.competitiveInteractions} />
                    <Section label="Learning Summary" color="text-green-400" text={tj.learningSummary} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Concept Map */}
      {activeTab === "concepts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.conceptMap.map((c, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardContent className="pt-5 space-y-2">
                <p className="text-white font-semibold">{c.concept}</p>
                <p className="text-purple-400 text-xs">{c.whereAppeared}</p>
                <p className="text-slate-400 text-sm">{c.whatHappened}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Achievement Analysis */}
      {activeTab === "achievements" && (
        <div className="space-y-4">
          {report.achievementAnalysis.map((ta) => (
            <Card key={ta.teamId} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base">{ta.teamName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Earned badges */}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Earned</p>
                  <div className="flex flex-wrap gap-2">
                    {ta.earned.map((a) => (
                      <Badge key={a.id} className="bg-green-500/20 text-green-400 border-green-500/40">
                        {a.id} (+{a.points})
                      </Badge>
                    ))}
                    {ta.earned.length === 0 && (
                      <span className="text-slate-500 text-sm italic">None earned</span>
                    )}
                  </div>
                </div>
                {/* Missed badges - faded */}
                {ta.missed.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Missed</p>
                    <div className="flex flex-wrap gap-2">
                      {ta.missed.map((m) => (
                        <Badge
                          key={m}
                          variant="outline"
                          className="border-slate-600 text-slate-500 opacity-60"
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-slate-400 text-sm italic">{ta.strategicInsight}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Market Timeline - Grouped by Round */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          {Object.entries(timelineByRound)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([round, entries]) => (
              <div key={round}>
                <h3 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Round {round}
                </h3>
                <div className="relative border-l-2 border-slate-700 ml-4 space-y-3">
                  {entries.map((entry, i) => (
                    <div key={i} className="ml-6 relative">
                      <div className="absolute -left-[1.9rem] top-1 w-3 h-3 rounded-full bg-purple-500 border-2 border-slate-800" />
                      <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs mb-1">
                        {entry.segment}
                      </Badge>
                      <p className="text-slate-200 text-sm">{entry.event}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* What-If Scenarios */}
      {activeTab === "whatif" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.whatIfScenarios.map((s, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  {s.teamName} &mdash; Round {s.decisionRound}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="p-2 rounded bg-slate-700/50">
                  <p className="text-slate-400 text-xs mb-0.5">Actual</p>
                  <p className="text-white">{s.actualDecision}</p>
                </div>
                <div className="p-2 rounded bg-cyan-900/20 border border-cyan-500/20">
                  <p className="text-cyan-400 text-xs mb-0.5">Alternative</p>
                  <p className="text-slate-200">{s.alternativeDecision}</p>
                </div>
                <p className="text-green-400 text-xs font-medium">{s.estimatedImpact}</p>
                <div className="flex items-start gap-1.5 mt-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-slate-500 text-xs italic">{s.caveat}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ label, color, text }: { label: string; color: string; text: string }) {
  return (
    <div>
      <p className={cn("font-medium mb-1", color)}>{label}</p>
      <p className="text-slate-300">{text}</p>
    </div>
  );
}
