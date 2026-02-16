import { create } from "zustand";
import { TUTORIAL_STEPS_FULL, TUTORIAL_STEPS_MEDIUM, TUTORIAL_STEPS_LIGHT } from "@/data/tutorialSteps";

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
}

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

  startTutorial: (depth: "light" | "medium" | "full") => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  goToStep: (index: number) => void;
  selectChoice: (choiceId: string) => void;
  selectQuizAnswer: (answerIndex: number) => void;
  completeInteraction: () => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  isActive: false,
  depth: "full",
  currentStep: 0,
  steps: [],
  selectedChoice: null,
  selectedQuizAnswer: null,
  interactionComplete: false,

  startTutorial: (depth) => {
    const steps = depth === "full" ? TUTORIAL_STEPS_FULL
      : depth === "medium" ? TUTORIAL_STEPS_MEDIUM
      : TUTORIAL_STEPS_LIGHT;
    set({
      isActive: true,
      depth,
      currentStep: 0,
      steps,
      selectedChoice: null,
      selectedQuizAnswer: null,
      interactionComplete: false,
    });
  },

  nextStep: () => {
    const { currentStep, steps } = get();
    const step = steps[currentStep];

    // Block advancement if interaction is required but not complete
    if (step?.requiresInteraction && !get().interactionComplete) return;

    if (currentStep >= steps.length - 1) {
      set({ isActive: false, currentStep: 0 });
    } else {
      set({
        currentStep: currentStep + 1,
        selectedChoice: null,
        selectedQuizAnswer: null,
        interactionComplete: false,
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
    set({ isActive: false, currentStep: 0 });
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
    set({ selectedChoice: choiceId, interactionComplete: true });
  },

  selectQuizAnswer: (answerIndex) => {
    const { steps, currentStep } = get();
    const step = steps[currentStep];
    const isCorrect = step?.quiz?.correctIndex === answerIndex;
    set({
      selectedQuizAnswer: answerIndex,
      interactionComplete: isCorrect,
    });
  },

  completeInteraction: () => {
    set({ interactionComplete: true });
  },
}));
