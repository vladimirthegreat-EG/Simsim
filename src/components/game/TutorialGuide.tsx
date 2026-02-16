"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTutorialStore } from "@/lib/stores/tutorialStore";
import { TutorialSpotlight } from "@/components/game/TutorialSpotlight";
import { GlossaryText } from "@/components/game/GlossaryText";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Lightbulb,
  Target,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface TutorialGuideProps {
  gameId: string;
}

export function TutorialGuide({ gameId }: TutorialGuideProps) {
  const {
    isActive,
    currentStep,
    steps,
    selectedChoice,
    selectedQuizAnswer,
    interactionComplete,
    nextStep,
    prevStep,
    skipTutorial,
    selectChoice,
    selectQuizAnswer,
    completeInteraction,
  } = useTutorialStore();
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
  const canAdvance = !step.requiresInteraction || interactionComplete;

  return (
    <>
      {/* Spotlight overlay */}
      {step.spotlight && (
        <TutorialSpotlight
          selector={step.spotlight}
          active={true}
          padding={8}
        />
      )}

      <div
        className="fixed inset-0 z-50 flex"
        style={{
          background: step.spotlight ? "transparent" : isCenter ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.35)",
          pointerEvents: isCenter ? "auto" : "none",
        }}
      >
        {/* Click-through backdrop */}
        {!isCenter && (
          <div
            className="absolute inset-0"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => {
              if (e.target === e.currentTarget && canAdvance) nextStep();
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
              width: isCenter ? 540 : 420,
              background: "rgb(15 23 42)",
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
            <div className="text-[18px] font-bold text-white">{step.title}</div>

            {/* Description - with glossary tooltips for {{term}} markers */}
            <div className="text-[13px] leading-relaxed text-slate-300 whitespace-pre-line">
              <GlossaryText text={step.description} />
            </div>

            {/* === Interactive: Choice Cards === */}
            {step.interactive === "choice" && step.choices && (
              <div className="space-y-2">
                {step.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => selectChoice(choice.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedChoice === choice.id
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-slate-600 bg-slate-800 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-white">{choice.label}</span>
                      {selectedChoice === choice.id && (
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{choice.description}</p>
                  </button>
                ))}
              </div>
            )}

            {/* === Interactive: Quiz === */}
            {step.interactive === "quiz" && step.quiz && (
              <div className="space-y-2">
                <div className="text-[13px] font-medium text-amber-400">
                  {step.quiz.question}
                </div>
                {step.quiz.options.map((option, idx) => {
                  const isSelected = selectedQuizAnswer === idx;
                  const isCorrect = step.quiz!.correctIndex === idx;
                  const showResult = selectedQuizAnswer !== null;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (selectedQuizAnswer === null) selectQuizAnswer(idx);
                      }}
                      disabled={selectedQuizAnswer !== null}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all text-[12px] ${
                        showResult && isSelected && isCorrect
                          ? "border-green-500 bg-green-500/10 text-green-300"
                          : showResult && isSelected && !isCorrect
                          ? "border-red-500 bg-red-500/10 text-red-300"
                          : showResult && isCorrect
                          ? "border-green-500/50 bg-green-500/5 text-green-400"
                          : "border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        {showResult && isSelected && isCorrect && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
                {selectedQuizAnswer !== null && !interactionComplete && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-300">
                    Not quite! {step.quiz.explanation} Try again.
                    <button
                      className="ml-2 underline text-red-400 bg-transparent border-none cursor-pointer"
                      onClick={() => useTutorialStore.setState({ selectedQuizAnswer: null })}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {interactionComplete && selectedQuizAnswer !== null && (
                  <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-[11px] text-green-300">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Correct! {step.quiz.explanation}
                  </div>
                )}
              </div>
            )}

            {/* === Interactive: Action prompt === */}
            {step.interactive === "action" && !interactionComplete && (
              <Button
                size="sm"
                onClick={completeInteraction}
                className="w-full text-[12px] bg-amber-600 hover:bg-amber-700 text-white"
              >
                Got it - I&apos;ll do this now!
              </Button>
            )}
            {step.interactive === "action" && interactionComplete && (
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-[11px] text-green-300">
                <CheckCircle className="w-3 h-3 inline mr-1" />
                Great! Click Next to continue.
              </div>
            )}

            {/* Objective callout */}
            {step.objective && (
              <div className="rounded-lg p-3 text-[12px] bg-cyan-500/10 border-l-[3px] border-cyan-500 text-slate-200">
                <Target className="w-3 h-3 inline mr-1 text-cyan-400" />
                <span className="font-bold text-cyan-400">Objective: </span>
                <GlossaryText text={step.objective} />
              </div>
            )}

            {/* Tip box */}
            {step.tip && (
              <div className="rounded-lg p-3 text-[12px] bg-amber-500/10 border-l-[3px] border-amber-500 text-slate-300">
                <Lightbulb className="w-3 h-3 inline mr-1 text-amber-400" />
                <span className="font-bold text-amber-400">Tip: </span>
                <GlossaryText text={step.tip} />
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
                disabled={!canAdvance}
                className={`text-[12px] font-bold uppercase tracking-[1px] ${
                  canAdvance
                    ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
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
                        ? "#06b6d4"
                        : i < currentStep
                          ? "rgba(6,182,212,0.4)"
                          : "rgb(51 65 85)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function getPositionStyles(
  position: "center" | "top-right" | "bottom-right" | "bottom-center",
): React.CSSProperties {
  switch (position) {
    case "center":
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    case "top-right":
      return { top: 80, right: 20 };
    case "bottom-right":
      return { bottom: 80, right: 20 };
    case "bottom-center":
      return { bottom: 100, left: "50%", transform: "translateX(-50%)" };
    default:
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
}
