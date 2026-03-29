"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

interface NarrativePoint {
  title: string;
  description: string;
  severity?: "info" | "success" | "warning" | "critical";
}

interface RoundNarrative {
  headline: string;
  summary: string;
  keyHighlights: NarrativePoint[];
  concerns: NarrativePoint[];
  recommendations: NarrativePoint[];
}

interface RoundNarrativeCardProps {
  narrative: RoundNarrative | null;
  round: number;
}

export function RoundNarrativeCard({ narrative, round }: RoundNarrativeCardProps) {
  if (!narrative) return null;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-white font-semibold text-base">{narrative.headline}</h3>
            <p className="text-slate-400 text-sm">Round {round} Summary</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-300 text-sm">{narrative.summary}</p>

        {narrative.keyHighlights.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs font-medium uppercase tracking-wider">What Went Well</span>
            </div>
            <ul className="space-y-1.5">
              {narrative.keyHighlights.map((h, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 shrink-0">+</span>
                  <div>
                    <span className="text-white font-medium">{h.title}</span>
                    <span className="text-slate-400"> — {h.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {narrative.concerns.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-xs font-medium uppercase tracking-wider">Watch Out</span>
            </div>
            <ul className="space-y-1.5">
              {narrative.concerns.map((c, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">!</span>
                  <div>
                    <span className="text-white font-medium">{c.title}</span>
                    <span className="text-slate-400"> — {c.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {narrative.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-xs font-medium uppercase tracking-wider">Recommendations</span>
            </div>
            <ul className="space-y-1.5">
              {narrative.recommendations.map((r, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 shrink-0 mt-0.5">
                    {i + 1}
                  </Badge>
                  <div>
                    <span className="text-white font-medium">{r.title}</span>
                    <span className="text-slate-400"> — {r.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
