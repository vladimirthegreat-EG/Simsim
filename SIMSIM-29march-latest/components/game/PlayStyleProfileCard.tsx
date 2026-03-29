"use client";

import { useTutorialStore } from "@/lib/stores/tutorialStore";
import { getPlayStyleProfile, CHOICE_STYLE_MAP } from "@/lib/utils/playStyleProfile";
import { Settings, Rocket, BarChart3, CheckCircle, AlertTriangle } from "lucide-react";

const STYLE_ICONS = {
  gear: Settings,
  rocket: Rocket,
  chart: BarChart3,
} as const;

const STYLE_COLORS = {
  optimizer: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", accent: "text-emerald-300" },
  expansionist: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", accent: "text-amber-300" },
  analyst: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", accent: "text-cyan-300" },
} as const;

const DECISION_LABELS: Record<string, { label: string; choices: Record<string, string> }> = {
  "full-s2-recipe-choice": {
    label: "Recipe Choice",
    choices: { budget: "Budget Phone", balanced: "Balanced Phone", quality: "Quality Phone" },
  },
  "full-s3-pricing-dilemma": {
    label: "Pricing Strategy",
    choices: { low: "Price Low", market: "Market Rate", high: "Price High" },
  },
  "full-s4-efficiency-choice": {
    label: "Research Focus",
    choices: { efficiency: "Reduce Costs", expansion: "New Product" },
  },
};

export function PlayStyleProfileCard() {
  const choiceHistory = useTutorialStore((s) => s.choiceHistory);
  const derivePlayStyle = useTutorialStore((s) => s.derivePlayStyle);
  const playStyle = useTutorialStore((s) => s.playStyle);

  // Derive if not yet computed
  const style = playStyle ?? derivePlayStyle();
  const profile = getPlayStyleProfile(style);
  const colors = STYLE_COLORS[style];
  const Icon = STYLE_ICONS[profile.icon];

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        <div>
          <div className={`text-[16px] font-bold ${colors.accent}`}>{profile.name}</div>
          <div className="text-[11px] text-slate-400">{profile.tagline}</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[12px] leading-relaxed text-slate-300">{profile.description}</p>

      {/* Decision Summary */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500">Your Decisions</div>
        {Object.entries(DECISION_LABELS).map(([stepId, { label, choices }]) => {
          const choiceId = choiceHistory[stepId];
          const choiceLabel = choiceId ? choices[choiceId] : "Not made";
          const indicatedStyle = choiceId ? CHOICE_STYLE_MAP[stepId]?.[choiceId] : null;

          return (
            <div key={stepId} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{label}:</span>
              <span className="flex items-center gap-1.5">
                <span className="text-white font-medium">{choiceLabel}</span>
                {indicatedStyle && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${STYLE_COLORS[indicatedStyle].bg} ${STYLE_COLORS[indicatedStyle].text}`}>
                    {indicatedStyle}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Strengths & Risks */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-emerald-500">Strengths</div>
          {profile.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300">
              <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>{s}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-amber-500">Risks</div>
          {profile.risks.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300">
              <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Tip */}
      <div className="rounded-lg p-3 bg-slate-800/50 border border-slate-700">
        <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 mb-1">Strategy Tip</div>
        <p className="text-[11px] leading-relaxed text-slate-300">{profile.strategyTip}</p>
      </div>
    </div>
  );
}
