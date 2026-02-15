"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useDecisionStore, GameModuleValues } from "@/lib/stores/decisionStore";

interface WorkflowGuideProps {
  basePath: string;
  gameStatus: string;
}

const WORKFLOW_ITEMS = [
  { module: GameModuleValues.FACTORY, label: "Set Production", path: "/factory", color: "text-orange-400" },
  { module: GameModuleValues.HR, label: "Manage Workforce", path: "/hr", color: "text-blue-400" },
  { module: GameModuleValues.MARKETING, label: "Adjust Marketing", path: "/marketing", color: "text-pink-400" },
  { module: GameModuleValues.FINANCE, label: "Review Finances", path: "/finance", color: "text-green-400" },
  { module: GameModuleValues.RD, label: "Check R&D", path: "/rnd", color: "text-purple-400" },
] as const;

export function WorkflowGuide({ basePath, gameStatus }: WorkflowGuideProps) {
  const [expanded, setExpanded] = useState(true);
  const submissionStatus = useDecisionStore((s) => s.submissionStatus);

  if (gameStatus !== "IN_PROGRESS") return null;

  const submitted = WORKFLOW_ITEMS.filter(
    (item) => submissionStatus[item.module]?.isSubmitted
  ).length;
  const total = WORKFLOW_ITEMS.length;

  return (
    <div className="mx-2 mt-3 rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer"
        type="button"
      >
        <span>
          Round Checklist
          <span className={`ml-1.5 ${submitted === total ? "text-green-400" : "text-cyan-400"}`}>
            {submitted}/{total}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-0.5">
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-slate-700 mb-2 mx-1">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-cyan-500 to-green-500"
              style={{ width: `${(submitted / total) * 100}%` }}
            />
          </div>

          {WORKFLOW_ITEMS.map((item) => {
            const isSubmitted = submissionStatus[item.module]?.isSubmitted;
            return (
              <Link
                key={item.module}
                href={`${basePath}${item.path}`}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                  isSubmitted
                    ? "text-slate-500"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                {isSubmitted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}
                <span className={isSubmitted ? "line-through" : ""}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
