"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Target,
  Swords,
  Wallet,
  TrendingUp,
  Scale,
  RefreshCw,
  Globe,
  MessageSquare,
} from "lucide-react";
import type {
  DiscussionGuide as DiscussionGuideType,
  DiscussionCategory,
  DiscussionQuestion,
} from "@/engine/types/facilitator";

interface DiscussionGuideProps {
  guide: DiscussionGuideType;
}

const categoryConfig: Record<
  DiscussionCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  strategic: {
    label: "Strategic Thinking",
    icon: <Target className="w-5 h-5" />,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  competitive: {
    label: "Competitive Dynamics",
    icon: <Swords className="w-5 h-5" />,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  resource: {
    label: "Resource Management",
    icon: <Wallet className="w-5 h-5" />,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  market_signals: {
    label: "Market Signals",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  ethics: {
    label: "Ethics & Responsibility",
    icon: <Scale className="w-5 h-5" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  adaptability: {
    label: "Adaptability",
    icon: <RefreshCw className="w-5 h-5" />,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
  real_world: {
    label: "Real-World Connections",
    icon: <Globe className="w-5 h-5" />,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
  },
};

function groupByCategory(questions: DiscussionQuestion[]) {
  const groups: Partial<Record<DiscussionCategory, DiscussionQuestion[]>> = {};
  for (const q of questions) {
    if (!groups[q.category]) groups[q.category] = [];
    groups[q.category]!.push(q);
  }
  return groups;
}

export function DiscussionGuide({ guide }: DiscussionGuideProps) {
  const grouped = groupByCategory(guide.questions);
  const categories = Object.keys(grouped) as DiscussionCategory[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-bold text-white">Discussion Guide</h2>
      </div>
      <p className="text-slate-400 text-sm">
        Use these questions to facilitate group discussion. Each question includes context
        from the game to ground the conversation.
      </p>

      {/* Category groups */}
      {categories.map((cat) => {
        const config = categoryConfig[cat];
        const questions = grouped[cat]!;
        return (
          <Card
            key={cat}
            className={cn("bg-slate-800 border-slate-700", config.border)}
          >
            <CardHeader>
              <CardTitle className={cn("flex items-center gap-2 text-base", config.color)}>
                {config.icon}
                {config.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg p-3 border",
                      config.bg,
                      config.border
                    )}
                  >
                    <div className="flex gap-3">
                      <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-medium">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-slate-100 text-sm font-semibold">
                          {q.question}
                        </p>
                        <p className="text-slate-500 text-xs mt-1.5 italic">
                          {q.context}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
