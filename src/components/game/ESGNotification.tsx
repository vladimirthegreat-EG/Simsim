"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, Award, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { CONSTANTS } from "@/engine/types";

interface ESGNotificationProps {
  esgScore: number;
  previousScore?: number;
  events?: Array<{
    type: "bonus" | "penalty";
    message: string;
    amount: number;
  }>;
}

export function ESGNotification({ esgScore, previousScore, events }: ESGNotificationProps) {
  const isHighPerformer = esgScore >= (CONSTANTS?.ESG_HIGH_THRESHOLD || 800);
  const isLowPerformer = esgScore < (CONSTANTS?.ESG_LOW_THRESHOLD || 300);
  const scoreChange = previousScore ? esgScore - previousScore : 0;

  // Don't show if there's nothing noteworthy
  if (!isHighPerformer && !isLowPerformer && !events?.length && Math.abs(scoreChange) < 50) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* High ESG Performance Banner */}
      {isHighPerformer && (
        <Card className="bg-green-900/30 border-green-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-green-400 font-medium">ESG Excellence</h3>
                  <Badge className="bg-green-600">Score: {esgScore}</Badge>
                </div>
                <p className="text-slate-300 text-sm mt-1">
                  Your company&apos;s outstanding ESG performance has earned recognition!
                  You may receive sustainability awards and investor preference bonuses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low ESG Warning Banner */}
      {isLowPerformer && (
        <Card className="bg-red-900/30 border-red-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-red-400 font-medium">ESG Compliance Warning</h3>
                  <Badge className="bg-red-600">Score: {esgScore}</Badge>
                </div>
                <p className="text-slate-300 text-sm mt-1">
                  Your company&apos;s ESG score is critically low. You risk regulatory penalties,
                  consumer boycotts, and investor divestment. Consider investing in sustainability initiatives.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ESG Events */}
      {events?.map((event, idx) => (
        <Card
          key={idx}
          className={event.type === "bonus"
            ? "bg-green-900/20 border-green-700"
            : "bg-red-900/20 border-red-700"
          }
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {event.type === "bonus" ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={event.type === "bonus" ? "text-green-400" : "text-red-400"}>
                  {event.message}
                </span>
              </div>
              <span className={`font-medium ${event.type === "bonus" ? "text-green-400" : "text-red-400"}`}>
                {event.type === "bonus" ? "+" : ""}{formatCurrency(event.amount)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Significant Score Change */}
      {Math.abs(scoreChange) >= 50 && !isHighPerformer && !isLowPerformer && (
        <Card className={scoreChange > 0 ? "bg-green-900/10 border-green-800" : "bg-yellow-900/10 border-yellow-800"}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Leaf className={`w-4 h-4 ${scoreChange > 0 ? "text-green-400" : "text-yellow-400"}`} />
              <span className="text-slate-300 text-sm">
                ESG Score: {esgScore}
                <span className={`ml-2 ${scoreChange > 0 ? "text-green-400" : "text-yellow-400"}`}>
                  ({scoreChange > 0 ? "+" : ""}{scoreChange} from last round)
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

// Mini version for header/sidebar
export function ESGBadge({ score }: { score: number }) {
  const isHigh = score >= 800;
  const isLow = score < 300;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
      isHigh ? "bg-green-500/20 text-green-400" :
      isLow ? "bg-red-500/20 text-red-400" :
      "bg-slate-700 text-slate-300"
    }`}>
      <Leaf className="w-3 h-3" />
      <span>ESG: {score}</span>
    </div>
  );
}
