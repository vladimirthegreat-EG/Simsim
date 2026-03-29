"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target } from "lucide-react";

interface SegmentScore {
  segment: string;
  score: number;
  rank: number;
  totalTeams: number;
  marketShare: number;
}

interface CompetitiveScorecardProps {
  scores: SegmentScore[];
  teamName: string;
  overallRank: number;
  totalTeams: number;
}

const SEGMENT_COLORS: Record<string, string> = {
  Budget: "#22c55e",
  General: "#3b82f6",
  Enthusiast: "#8b5cf6",
  Professional: "#f59e0b",
  "Active Lifestyle": "#ec4899",
};

export function CompetitiveScorecard({
  scores,
  teamName,
  overallRank,
  totalTeams,
}: CompetitiveScorecardProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5" />
              Competitive Scorecard
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              {teamName} — per-segment performance
            </CardDescription>
          </div>
          <Badge
            className={
              overallRank === 1
                ? "bg-yellow-500/20 text-yellow-400"
                : overallRank <= 3
                ? "bg-blue-500/20 text-blue-400"
                : "bg-slate-500/20 text-slate-400"
            }
          >
            <Trophy className="w-3 h-3 mr-1" />
            Rank #{overallRank}/{totalTeams}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scores.map((seg) => (
            <div key={seg.segment} className="p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SEGMENT_COLORS[seg.segment] ?? "#64748b" }}
                  />
                  <span className="text-white text-sm font-medium">{seg.segment}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                    #{seg.rank}/{seg.totalTeams}
                  </Badge>
                  <span className="text-slate-400 text-xs">
                    {(seg.marketShare * 100).toFixed(1)}% share
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Progress
                  value={seg.score}
                  className="h-2 flex-1"
                />
                <span
                  className="text-sm font-bold tabular-nums w-10 text-right"
                  style={{ color: SEGMENT_COLORS[seg.segment] ?? "#94a3b8" }}
                >
                  {seg.score.toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
