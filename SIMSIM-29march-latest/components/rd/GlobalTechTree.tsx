"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CONSTANTS } from "@/engine/types";
import { CheckCircle2, Lock, Loader2, Beaker, Sparkles } from "lucide-react";

interface GlobalTechTreeProps {
  unlockedTechs: string[];
  currentRdPoints?: number;
  previousUnlockedTechs?: string[];
}

const TECH_LEVELS = [
  {
    id: "process_optimization",
    level: 1,
    name: CONSTANTS.RD_TECH_TREE.process_optimization.name,
    pointsRequired: CONSTANTS.RD_TECH_TREE.process_optimization.rdPointsRequired,
    cost: CONSTANTS.RD_TECH_TREE.process_optimization.cost,
    description: CONSTANTS.RD_TECH_TREE.process_optimization.description,
  },
  {
    id: "advanced_manufacturing",
    level: 2,
    name: CONSTANTS.RD_TECH_TREE.advanced_manufacturing.name,
    pointsRequired: CONSTANTS.RD_TECH_TREE.advanced_manufacturing.rdPointsRequired,
    cost: CONSTANTS.RD_TECH_TREE.advanced_manufacturing.cost,
    description: CONSTANTS.RD_TECH_TREE.advanced_manufacturing.description,
  },
  {
    id: "industry_4_0",
    level: 3,
    name: CONSTANTS.RD_TECH_TREE.industry_4_0.name,
    pointsRequired: CONSTANTS.RD_TECH_TREE.industry_4_0.rdPointsRequired,
    cost: CONSTANTS.RD_TECH_TREE.industry_4_0.cost,
    description: CONSTANTS.RD_TECH_TREE.industry_4_0.description,
  },
  {
    id: "breakthrough_tech",
    level: 4,
    name: CONSTANTS.RD_TECH_TREE.breakthrough_tech.name,
    pointsRequired: CONSTANTS.RD_TECH_TREE.breakthrough_tech.rdPointsRequired,
    cost: CONSTANTS.RD_TECH_TREE.breakthrough_tech.cost,
    description: CONSTANTS.RD_TECH_TREE.breakthrough_tech.description,
  },
];

export function GlobalTechTree({ unlockedTechs, currentRdPoints = 0, previousUnlockedTechs }: GlobalTechTreeProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Beaker className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-white font-semibold text-base">R&D Tech Levels</h3>
            <p className="text-slate-400 text-sm">
              {Math.floor(currentRdPoints)} R&D points accumulated
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {TECH_LEVELS.map((tech, idx) => {
            const isUnlocked = unlockedTechs.includes(tech.id);
            const prevUnlocked = idx === 0 || unlockedTechs.includes(TECH_LEVELS[idx - 1].id);
            const isNext = !isUnlocked && prevUnlocked;
            const isLocked = !isUnlocked && !isNext;
            const isNewlyUnlocked = isUnlocked && previousUnlockedTechs !== undefined && !previousUnlockedTechs.includes(tech.id);

            const progressPercent = isNext
              ? Math.min(100, (currentRdPoints / tech.pointsRequired) * 100)
              : 0;

            return (
              <div
                key={tech.id}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                  isUnlocked
                    ? isNewlyUnlocked
                      ? "bg-purple-500/15 border-purple-400/50 ring-2 ring-purple-400/30 animate-pulse"
                      : "bg-purple-500/10 border-purple-500/30"
                    : isNext
                    ? "bg-cyan-500/5 border-cyan-500/30"
                    : "bg-slate-700/30 border-slate-700"
                }`}
              >
                {/* Status Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isUnlocked ? "bg-purple-500/20" : isNext ? "bg-cyan-500/20" : "bg-slate-700"
                }`}>
                  {isNewlyUnlocked ? (
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  ) : isUnlocked ? (
                    <CheckCircle2 className="w-5 h-5 text-purple-400" />
                  ) : isNext ? (
                    <Loader2 className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${isUnlocked ? "text-purple-300" : isNext ? "text-white" : "text-slate-500"}`}>
                      Level {tech.level}: {tech.name}
                    </span>
                    {isNewlyUnlocked && (
                      <Badge className="bg-purple-500/30 text-purple-300 text-[10px] animate-pulse">NEW</Badge>
                    )}
                    {isUnlocked && !isNewlyUnlocked && (
                      <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">Unlocked</Badge>
                    )}
                    {isNext && (
                      <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px]">Next</Badge>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${isLocked ? "text-slate-600" : "text-slate-400"}`}>
                    {tech.description}
                  </p>
                  {isNext && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress value={progressPercent} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-cyan-400 shrink-0">
                        {Math.floor(currentRdPoints)}/{tech.pointsRequired}
                      </span>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="text-right shrink-0">
                  <div className={`text-xs ${isUnlocked ? "text-purple-400" : isNext ? "text-cyan-400" : "text-slate-500"}`}>
                    {tech.pointsRequired} pts
                  </div>
                  <div className={`text-[10px] ${isLocked ? "text-slate-600" : "text-slate-400"}`}>
                    ${(tech.cost / 1_000_000).toFixed(0)}M
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
