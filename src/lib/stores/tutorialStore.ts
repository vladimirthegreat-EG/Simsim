import { create } from "zustand";
import { TUTORIAL_STEPS_FULL, TUTORIAL_STEPS_MEDIUM } from "@/data/tutorialSteps";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  /** Which game module/page to navigate to */
  targetPath: string;
  /** Optional tab within the page */
  targetTab?: string;
  tip?: string;
  position: "center" | "top-right" | "bottom-right" | "bottom-center";
}

interface TutorialState {
  isActive: boolean;
  depth: "light" | "medium" | "full";
  currentStep: number;
  steps: TutorialStep[];

  startTutorial: (depth: "medium" | "full") => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  goToStep: (index: number) => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  isActive: false,
  depth: "full",
  currentStep: 0,
  steps: [],

  startTutorial: (depth) => {
    const steps = depth === "full" ? TUTORIAL_STEPS_FULL : TUTORIAL_STEPS_MEDIUM;
    set({
      isActive: true,
      depth,
      currentStep: 0,
      steps,
    });
  },

  nextStep: () => {
    const { currentStep, steps } = get();
    if (currentStep >= steps.length - 1) {
      // Tutorial complete
      set({ isActive: false, currentStep: 0 });
    } else {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  skipTutorial: () => {
    set({ isActive: false, currentStep: 0 });
  },

  goToStep: (index) => {
    const { steps } = get();
    if (index >= 0 && index < steps.length) {
      set({ currentStep: index });
    }
  },
}));
