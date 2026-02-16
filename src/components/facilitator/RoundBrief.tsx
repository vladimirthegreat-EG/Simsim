"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  TrendingDown,
  Lightbulb,
  Eye,
  Newspaper,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { FacilitatorBrief } from "@/engine/types/facilitator";

interface RoundBriefProps {
  brief: FacilitatorBrief;
}

export function RoundBrief({ brief }: RoundBriefProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Headline */}
      <div className="flex items-center gap-3">
        <Newspaper className="w-6 h-6 text-purple-400" />
        <Badge variant="outline" className="border-purple-500 text-purple-400">
          Round {brief.round} Brief
        </Badge>
      </div>
      <h2 className="text-2xl font-bold text-white leading-snug">{brief.headline}</h2>

      {/* Winner / Loser side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Winner */}
        <Card className="bg-slate-800 border-green-500/50">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5" />
              Round Winner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white font-semibold text-lg mb-1">
              {brief.winnerOfRound.teamName}
            </p>
            <p className="text-slate-400 text-sm">{brief.winnerOfRound.reason}</p>
          </CardContent>
        </Card>

        {/* Loser */}
        <Card className="bg-slate-800 border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2 text-base">
              <TrendingDown className="w-5 h-5" />
              Most Behind
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white font-semibold text-lg mb-1">
              {brief.loserOfRound.teamName}
            </p>
            <p className="text-slate-400 text-sm">{brief.loserOfRound.reason}</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Decisions - Expandable Cards */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Lightbulb className="w-5 h-5 text-blue-400" />
            Key Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {brief.keyDecisions.map((kd, i) => {
              const isOpen = expandedIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setExpandedIdx(isOpen ? null : i)}
                  className={cn(
                    "w-full text-left rounded-lg border transition-all",
                    isOpen
                      ? "bg-slate-700/60 border-blue-500/30"
                      : "bg-slate-700/30 border-slate-700 hover:border-slate-600"
                  )}
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs text-slate-300 font-medium">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-white font-semibold text-sm">{kd.teamName}</span>
                        <span className="text-slate-300 text-sm ml-1.5">{kd.description}</span>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    )}
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-0">
                      <div className="ml-9 p-2 rounded bg-slate-800/50 border border-slate-700">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                          Consequence
                        </p>
                        <p className="text-slate-300 text-sm">{kd.consequence}</p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Concept Spotlight - Purple/Violet special styling */}
      <Card className="bg-purple-900/30 border-purple-500/40">
        <CardHeader>
          <CardTitle className="text-purple-300 flex items-center gap-2 text-base">
            <Lightbulb className="w-5 h-5 text-purple-400" />
            Concept Spotlight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white font-semibold text-lg mb-1">
            {brief.conceptSpotlight.concept}
          </p>
          <p className="text-purple-200/80 text-sm">{brief.conceptSpotlight.explanation}</p>
        </CardContent>
      </Card>

      {/* Look Ahead */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Eye className="w-5 h-5 text-cyan-400" />
            Look Ahead
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 text-sm leading-relaxed">{brief.lookAhead}</p>
        </CardContent>
      </Card>
    </div>
  );
}
