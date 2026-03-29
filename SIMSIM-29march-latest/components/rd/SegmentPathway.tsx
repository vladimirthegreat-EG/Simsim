"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEGMENT_PATHWAYS } from "@/lib/config/segmentPathways";
import type { Segment } from "@/engine/types";
import {
  MapPin,
  CheckCircle2,
  ArrowRight,
  Info,
  DollarSign,
  Smartphone,
  Gamepad2,
  Briefcase,
  Activity,
} from "lucide-react";

const SEGMENT_ICONS: Record<Segment, React.ElementType> = {
  Budget: DollarSign,
  General: Smartphone,
  Enthusiast: Gamepad2,
  Professional: Briefcase,
  "Active Lifestyle": Activity,
};

const SEGMENT_COLORS: Record<Segment, string> = {
  Budget: "text-green-400",
  General: "text-blue-400",
  Enthusiast: "text-purple-400",
  Professional: "text-amber-400",
  "Active Lifestyle": "text-pink-400",
};

interface SegmentPathwayProps {
  segment: Segment;
  currentRound: number;
  unlockedTechs?: string[];
}

export function SegmentPathway({ segment, currentRound, unlockedTechs = [] }: SegmentPathwayProps) {
  const pathway = SEGMENT_PATHWAYS[segment];
  if (!pathway) return null;

  const Icon = SEGMENT_ICONS[segment];
  const color = SEGMENT_COLORS[segment];

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <div>
            <h3 className={`font-semibold text-sm ${color}`}>{segment} Pathway</h3>
            <p className="text-slate-400 text-xs">Recommended progression</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {pathway.phases.map((phase, idx) => {
            const roundStart = parseInt(phase.rounds.split("-")[0]);
            const roundEnd = parseInt(phase.rounds.split("-")[1] || phase.rounds.split("-")[0]);
            const isPast = currentRound > roundEnd;
            const isCurrent = currentRound >= roundStart && currentRound <= roundEnd;

            return (
              <div key={idx} className="flex items-start gap-3">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center shrink-0 mt-1">
                  {isPast ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : isCurrent ? (
                    <MapPin className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                  )}
                  {idx < pathway.phases.length - 1 && (
                    <div className={`w-0.5 h-8 mt-1 ${isPast ? "bg-green-500/40" : "bg-slate-700"}`} />
                  )}
                </div>

                {/* Phase content */}
                <div className={`flex-1 p-2 rounded-lg ${isCurrent ? "bg-cyan-500/5 border border-cyan-500/20" : "bg-slate-700/30"}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-medium ${isPast ? "text-slate-500" : "text-white"}`}>
                      {phase.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400 py-0">
                      R{phase.rounds}
                    </Badge>
                  </div>
                  {phase.archetypeName ? (
                    <div className="flex items-center gap-1 text-xs text-cyan-400">
                      <ArrowRight className="w-3 h-3" />
                      {phase.archetypeName}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Build elsewhere first</span>
                  )}
                  <div className="text-[10px] text-slate-500 mt-0.5">{phase.rdTarget}</div>
                  {phase.note && (
                    <div className="flex items-start gap-1 mt-1">
                      <Info className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                      <span className="text-[10px] text-slate-600 leading-tight">{phase.note}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
