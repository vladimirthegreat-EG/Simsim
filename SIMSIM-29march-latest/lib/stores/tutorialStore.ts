import { create } from "zustand";
import { TUTORIAL_STEPS_FULL, TUTORIAL_STEPS_MEDIUM, TUTORIAL_STEPS_LIGHT } from "@/data/tutorialSteps";

export type TutorialStage = 1 | 2 | 3 | 4 | 5 | 6;

export const STAGE_NAMES: Record<TutorialStage, string> = {
  1: "Orientation",
  2: "Production Basics",
  3: "Market & Trading",
  4: "Research Loop",
  5: "Guided Sandbox",
  6: "Graduation",
};

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  /** Which game module/page to navigate to */
  targetPath: string;
  /** Optional tab within the page */
  targetTab?: string;
  /** Key game objective highlighted in this step */
  objective?: string;
  tip?: string;
  position: "center" | "top-right" | "bottom-right" | "bottom-center";
  /** Interactive element type: choice cards, action prompt, or quiz */
  interactive?: "choice" | "action" | "quiz";
  /** CSS selector for spotlight highlight overlay */
  spotlight?: string;
  /** Must interact (choose/answer) before proceeding */
  requiresInteraction?: boolean;
  /** Choice options for interactive="choice" */
  choices?: Array<{ id: string; label: string; description: string }>;
  /** Quiz question + answers for interactive="quiz" */
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  /** Which of the 6 tutorial stages this step belongs to (full tutorial only) */
  stage?: TutorialStage;
  /** Whether this step is an exit gate (must complete before next stage unlocks) */
  exitGate?: boolean;
  /** Button label for exit gate (e.g. "Begin Operations") */
  exitGateLabel?: string;
  /** Advisor scaffolding level: 0=full guidance, 1=options shown, 2=silent */
  advisorLevel?: 0 | 1 | 2;
  /** Cross-mechanic callout shown below description (e.g. "Research can improve this") */
  mechanicLink?: string;
}

export type PlayStyle = "optimizer" | "expansionist" | "analyst";

interface TutorialState {
  isActive: boolean;
  depth: "light" | "medium" | "full";
  currentStep: number;
  steps: TutorialStep[];
  /** Selected choice for current interactive step */
  selectedChoice: string | null;
  /** Selected quiz answer index for current step */
  selectedQuizAnswer: number | null;
  /** Whether current interaction has been completed */
  interactionComplete: boolean;
  /** History of choices made across scripted decision points: stepId -> choiceId */
  choiceHistory: Record<string, string>;
  /** Derived play style from the 3 scripted decisions (null until graduation) */
  playStyle: PlayStyle | null;
  /** Timestamps for analytics: stage entry/exit, tutorial start/end */
  tutorialMetrics: {
    startedAt: number | null;
    completedAt: number | null;
    stageTimestamps: Record<number, { entered: number; exited?: number }>;
    quizAttempts: Record<string, number>;
  };

  startTutorial: (depth: "light" | "medium" | "full") => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  goToStep: (index: number) => void;
  selectChoice: (choiceId: string) => void;
  selectQuizAnswer: (answerIndex: number) => void;
  completeInteraction: () => void;
  derivePlayStyle: () => PlayStyle;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  isActive: false,
  depth: "full",
  currentStep: 0,
  steps: [],
  selectedChoice: null,
  selectedQuizAnswer: null,
  interactionComplete: false,
  choiceHistory: {},
  playStyle: null,
  tutorialMetrics: {
    startedAt: null,
    completedAt: null,
    stageTimestamps: {},
    quizAttempts: {},
  },

  startTutorial: (depth) => {
    const steps = depth === "full" ? TUTORIAL_STEPS_FULL
      : depth === "medium" ? TUTORIAL_STEPS_MEDIUM
      : TUTORIAL_STEPS_LIGHT;
    const firstStage = steps[0]?.stage;
    set({
      isActive: true,
      depth,
      currentStep: 0,
      steps,
      selectedChoice: null,
      selectedQuizAnswer: null,
      interactionComplete: false,
      choiceHistory: {},
      playStyle: null,
      tutorialMetrics: {
        startedAt: Date.now(),
        completedAt: null,
        stageTimestamps: firstStage ? { [firstStage]: { entered: Date.now() } } : {},
        quizAttempts: {},
      },
    });
  },

  nextStep: () => {
    const { currentStep, steps, tutorialMetrics } = get();
    const step = steps[currentStep];

    // Block advancement if interaction is required but not complete
    if (step?.requiresInteraction && !get().interactionComplete) return;

    if (currentStep >= steps.length - 1) {
      set({
        isActive: false,
        currentStep: 0,
        tutorialMetrics: { ...tutorialMetrics, completedAt: Date.now() },
      });
    } else {
      const nextStep = steps[currentStep + 1];
      const currentStage = step?.stage;
      const nextStage = nextStep?.stage;
      const updatedMetrics = { ...tutorialMetrics };

      // Track stage transitions
      if (currentStage && nextStage && currentStage !== nextStage) {
        updatedMetrics.stageTimestamps = {
          ...updatedMetrics.stageTimestamps,
          [currentStage]: { ...updatedMetrics.stageTimestamps[currentStage], exited: Date.now() },
          [nextStage]: { entered: Date.now() },
        };
      }

      set({
        currentStep: currentStep + 1,
        selectedChoice: null,
        selectedQuizAnswer: null,
        interactionComplete: false,
        tutorialMetrics: updatedMetrics,
      });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({
        currentStep: currentStep - 1,
        selectedChoice: null,
        selectedQuizAnswer: null,
        interactionComplete: false,
      });
    }
  },

  skipTutorial: () => {
    const { tutorialMetrics } = get();
    set({
      isActive: false,
      currentStep: 0,
      tutorialMetrics: { ...tutorialMetrics, completedAt: Date.now() },
    });
  },

  goToStep: (index) => {
    const { steps } = get();
    if (index >= 0 && index < steps.length) {
      set({
        currentStep: index,
        selectedChoice: null,
        selectedQuizAnswer: null,
        interactionComplete: false,
      });
    }
  },

  selectChoice: (choiceId) => {
    const { steps, currentStep, choiceHistory } = get();
    const step = steps[currentStep];
    set({
      selectedChoice: choiceId,
      interactionComplete: true,
      choiceHistory: step ? { ...choiceHistory, [step.id]: choiceId } : choiceHistory,
    });
  },

  selectQuizAnswer: (answerIndex) => {
    const { steps, currentStep, tutorialMetrics } = get();
    const step = steps[currentStep];
    const isCorrect = step?.quiz?.correctIndex === answerIndex;
    const prevAttempts = step ? (tutorialMetrics.quizAttempts[step.id] ?? 0) : 0;
    set({
      selectedQuizAnswer: answerIndex,
      interactionComplete: isCorrect,
      tutorialMetrics: step ? {
        ...tutorialMetrics,
        quizAttempts: { ...tutorialMetrics.quizAttempts, [step.id]: prevAttempts + 1 },
      } : tutorialMetrics,
    });
  },

  completeInteraction: () => {
    set({ interactionComplete: true });
  },

  derivePlayStyle: () => {
    const { choiceHistory } = get();
    const scores: Record<PlayStyle, number> = { optimizer: 0, expansionist: 0, analyst: 0 };

    // Recipe Choice (Stage 2)
    const recipe = choiceHistory["full-s2-recipe-choice"];
    if (recipe === "budget") scores.optimizer += 1;
    else if (recipe === "quality") scores.optimizer += 1;
    else if (recipe === "balanced") scores.analyst += 1;

    // Pricing Dilemma (Stage 3)
    const pricing = choiceHistory["full-s3-pricing-dilemma"];
    if (pricing === "low") scores.expansionist += 1;
    else if (pricing === "market") scores.analyst += 1;
    else if (pricing === "high") scores.optimizer += 1;

    // Efficiency vs Expansion (Stage 4)
    const research = choiceHistory["full-s4-efficiency-choice"];
    if (research === "efficiency") scores.optimizer += 1;
    else if (research === "expansion") scores.expansionist += 1;

    // Determine winner (tie-break: analyst > optimizer > expansionist)
    let result: PlayStyle = "analyst";
    let maxScore = scores.analyst;
    if (scores.optimizer > maxScore) { result = "optimizer"; maxScore = scores.optimizer; }
    if (scores.expansionist > maxScore) { result = "expansionist"; }

    set({ playStyle: result });
    return result;
  },
}));
