"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Circle,
  ArrowUpRight,
  Clock,
  Award,
  User,
  BookOpen,
} from "lucide-react";
import type { ParticipantScorecard as ParticipantScorecardType } from "@/engine/types/facilitator";
import type { AchievementCategory } from "@/engine/types/achievements";

interface ParticipantScorecardProps {
  scorecard: ParticipantScorecardType;
}

const categoryStyle: Record<AchievementCategory, { color: string; bg: string; bar: string }> = {
  Innovation: { color: "text-blue-400", bg: "bg-blue-500/20", bar: "bg-blue-500" },
  Market: { color: "text-green-400", bg: "bg-green-500/20", bar: "bg-green-500" },
  Financial: { color: "text-yellow-400", bg: "bg-yellow-500/20", bar: "bg-yellow-500" },
  Strategic: { color: "text-purple-400", bg: "bg-purple-500/20", bar: "bg-purple-500" },
  Milestone: { color: "text-cyan-400", bg: "bg-cyan-500/20", bar: "bg-cyan-500" },
  Infamy: { color: "text-orange-400", bg: "bg-orange-500/20", bar: "bg-orange-500" },
  Bad: { color: "text-red-400", bg: "bg-red-500/20", bar: "bg-red-500" },
};

export function ParticipantScorecard({ scorecard }: ParticipantScorecardProps) {
  const categories = Object.entries(scorecard.achievementsByCategory) as [
    AchievementCategory,
    number,
  ][];
  const maxCatScore = Math.max(...categories.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      {/* Team Name + Strategy Summary */}
      <Card className="bg-slate-800 border-purple-500/40">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            {scorecard.teamName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 text-sm leading-relaxed">{scorecard.strategySummary}</p>
        </CardContent>
      </Card>

      {/* Strengths & Growth Areas - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {scorecard.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span className="text-slate-200">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2 text-base">
              <ArrowUpRight className="w-5 h-5" />
              Growth Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {scorecard.growthAreas.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-slate-200">{g}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Key Decisions Timeline */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Clock className="w-5 h-5 text-blue-400" />
            Key Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative border-l-2 border-slate-700 ml-3 space-y-4">
            {scorecard.keyDecisionsAndConsequences.map((kd, i) => (
              <div key={i} className="ml-6 relative">
                <div className="absolute -left-[1.9rem] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-800" />
                <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs mb-1">
                  Round {kd.round}
                </Badge>
                <p className="text-slate-100 text-sm font-medium">{kd.decision}</p>
                <p className="text-slate-500 text-xs mt-0.5">{kd.consequence}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievement Badges - Grid */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Award className="w-5 h-5 text-yellow-400" />
            Achievements Earned
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scorecard.achievements.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No achievements earned yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {scorecard.achievements.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col items-center p-3 rounded-lg bg-slate-700/40 border border-slate-700 text-center"
                >
                  <Award className="w-6 h-6 text-yellow-400 mb-1" />
                  <span className="text-slate-200 text-xs font-medium leading-tight">{a.id}</span>
                  <span className="text-yellow-400 text-xs font-semibold mt-0.5">
                    +{a.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements by Category - Progress Bars */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Award className="w-5 h-5 text-purple-400" />
            Achievements by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No category data.</p>
          ) : (
            <div className="space-y-3">
              {categories.map(([cat, count]) => {
                const style = categoryStyle[cat];
                const pct = Math.round((count / maxCatScore) * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-sm font-medium", style.color)}>{cat}</span>
                      <span className="text-slate-400 text-xs">{count} pts</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", style.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Outcomes Checklist */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Learning Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {scorecard.learningOutcomes.map((lo, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {lo.demonstrated ? (
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <span className={lo.demonstrated ? "text-slate-200" : "text-slate-500"}>
                    {lo.concept}
                  </span>
                  {lo.evidence && (
                    <p className="text-slate-500 text-xs mt-0.5 italic">{lo.evidence}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
