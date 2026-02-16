"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTutorialStore } from "@/lib/stores/tutorialStore";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Lightbulb, Target } from "lucide-react";

interface TutorialGuideProps {
  gameId: string;
}

export function TutorialGuide({ gameId }: TutorialGuideProps) {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTutorial } =
    useTutorialStore();
  const router = useRouter();
  const pathname = usePathname();

  const step = steps[currentStep];

  // Auto-navigate to the target path when step changes
  useEffect(() => {
    if (step?.targetPath === undefined) return;
    const basePath = gameId === "demo" ? "/demo" : `/game/${gameId}`;
    const targetUrl = `${basePath}${step.targetPath}`;
    if (pathname !== targetUrl) {
      router.push(targetUrl);
    }
  }, [currentStep, step?.targetPath, gameId, router, pathname]);

  if (!isActive || !step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const isCenter = step.position === "center";
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{
        background: isCenter ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.35)",
        pointerEvents: isCenter ? "auto" : "none",
      }}
    >
      {/* Click-through backdrop dismissal for non-center */}
      {!isCenter && (
        <div
          className="absolute inset-0"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            // Only dismiss if clicking the backdrop, not the card
            if (e.target === e.currentTarget) {
              nextStep();
            }
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className="absolute"
        style={{
          pointerEvents: "auto",
          ...getPositionStyles(step.position),
        }}
      >
        <div
          className="rounded-xl p-5 space-y-3 shadow-2xl border border-slate-600"
          style={{
            width: isCenter ? 520 : 400,
            background: "rgb(15 23 42)", // slate-900
          }}
        >
          {/* Step indicator + progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-cyan-400">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={skipTutorial}
                className="text-[10px] cursor-pointer hover:underline text-slate-400 bg-transparent border-none"
              >
                <X className="w-3 h-3 inline mr-1" />
                Skip Tutorial
              </button>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-slate-700">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-cyan-500 to-cyan-600"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-[18px] font-bold text-white">
            {step.title}
          </div>

          {/* Description */}
          <div className="text-[13px] leading-relaxed text-slate-300">
            {step.description}
          </div>

          {/* Objective callout */}
          {step.objective && (
            <div className="rounded-lg p-3 text-[12px] bg-cyan-500/10 border-l-[3px] border-cyan-500 text-slate-200">
              <Target className="w-3 h-3 inline mr-1 text-cyan-400" />
              <span className="font-bold text-cyan-400">
                Objective:{" "}
              </span>
              {step.objective}
            </div>
          )}

          {/* Tip box */}
          {step.tip && (
            <div className="rounded-lg p-3 text-[12px] bg-amber-500/10 border-l-[3px] border-amber-500 text-slate-300">
              <Lightbulb className="w-3 h-3 inline mr-1 text-amber-400" />
              <span className="font-bold text-amber-400">
                Tip:{" "}
              </span>
              {step.tip}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  className="text-[12px] border-slate-600 text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-3 h-3 mr-1" />
                  Back
                </Button>
              )}
            </div>
            <Button
              size="sm"
              onClick={nextStep}
              className="text-[12px] font-bold uppercase tracking-[1px] bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900"
            >
              {isLast ? "Start Playing!" : "Next"}
              {!isLast && <ChevronRight className="w-3 h-3 ml-1" />}
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1 pt-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === currentStep ? 12 : 6,
                  height: 6,
                  background:
                    i === currentStep
                      ? "#06b6d4" // cyan-500
                      : i < currentStep
                        ? "rgba(6,182,212,0.4)"
                        : "rgb(51 65 85)", // slate-700
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPositionStyles(
  position: "center" | "top-right" | "bottom-right" | "bottom-center",
): React.CSSProperties {
  switch (position) {
    case "center":
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    case "top-right":
      return {
        top: 80,
        right: 20,
      };
    case "bottom-right":
      return {
        bottom: 80,
        right: 20,
      };
    case "bottom-center":
      return {
        bottom: 100,
        left: "50%",
        transform: "translateX(-50%)",
      };
    default:
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
  }
}
