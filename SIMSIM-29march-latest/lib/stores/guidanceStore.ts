import { create } from "zustand";

/**
 * First-round guidance - a lightweight hand-holding system
 * that runs AFTER the tutorial completes.
 *
 * Shows a small non-blocking banner guiding users through
 * each module in order: R&D → Factory → Finance → HR → Marketing.
 * Auto-advances when a module's decisions are submitted.
 * Only active during Round 1.
 */

export interface GuidanceStep {
  moduleId: string;
  moduleName: string;
  navLabel: string;
  insideHint: string;
  submitHint: string;
}

const GUIDANCE_STEPS: GuidanceStep[] = [
  {
    moduleId: "rnd",
    moduleName: "R&D",
    navLabel: "Start here! Click R&D to choose your products.",
    insideHint: "Pick a phone archetype and queue it for production, then submit your R&D decisions.",
    submitHint: "Scroll down and press Submit Decisions to lock in your R&D plan.",
  },
  {
    moduleId: "factory",
    moduleName: "Factory",
    navLabel: "Next! Click Factory to set up production.",
    insideHint: "Buy required machinery and set production allocations, then submit your Factory decisions.",
    submitHint: "Scroll down and press Submit Decisions to lock in your Factory plan.",
  },
  {
    moduleId: "finance",
    moduleName: "Finance",
    navLabel: "Now click Finance to review your budget.",
    insideHint: "Check your cash, pricing, and projections, then submit your Finance decisions below.",
    submitHint: "Scroll down and press Submit Decisions to confirm your financials.",
  },
  {
    moduleId: "hr",
    moduleName: "HR",
    navLabel: "Now click HR to manage your workforce.",
    insideHint: "Review your team's morale and headcount, then submit your HR decisions below.",
    submitHint: "Scroll down and press Submit Decisions to confirm your HR plan.",
  },
  {
    moduleId: "marketing",
    moduleName: "Marketing",
    navLabel: "Last one! Click Marketing to promote your products.",
    insideHint: "Set up campaigns and review your brand value, then submit your Marketing decisions below.",
    submitHint: "Scroll down and press Submit Decisions to lock in your marketing strategy.",
  },
];

// Map module nav IDs to decision store module keys
const MODULE_TO_DECISION_KEY: Record<string, string> = {
  factory: "FACTORY",
  finance: "FINANCE",
  hr: "HR",
  marketing: "MARKETING",
  rnd: "RD",
};

interface GuidanceState {
  active: boolean;
  currentStep: number;
  steps: GuidanceStep[];
  /** Has the tutorial finished (trigger for guidance)? */
  tutorialCompleted: boolean;

  /** Called when tutorial finishes */
  onTutorialComplete: () => void;
  /** Called when user navigates to a module page */
  onModuleVisit: (moduleId: string) => void;
  /** Called when a module's decisions are submitted */
  onModuleSubmitted: (decisionKey: string) => void;
  /** Dismiss guidance */
  dismiss: () => void;
  /** Get the decision store key for the current step */
  getCurrentDecisionKey: () => string | null;
}

export const useGuidanceStore = create<GuidanceState>((set, get) => ({
  active: false,
  currentStep: 0,
  steps: GUIDANCE_STEPS,
  tutorialCompleted: false,

  onTutorialComplete: () => {
    set({
      tutorialCompleted: true,
      active: true,
      currentStep: 0,
    });
  },

  onModuleVisit: (_moduleId: string) => {
    // No-op for now; the banner adapts based on current path
  },

  onModuleSubmitted: (decisionKey: string) => {
    const { currentStep, steps } = get();
    if (currentStep >= steps.length) return;

    const currentModule = steps[currentStep];
    const expectedKey = MODULE_TO_DECISION_KEY[currentModule.moduleId];

    if (decisionKey === expectedKey) {
      const nextStep = currentStep + 1;
      if (nextStep >= steps.length) {
        // All done
        set({ active: false, currentStep: nextStep });
      } else {
        set({ currentStep: nextStep });
      }
    }
  },

  dismiss: () => {
    set({ active: false });
  },

  getCurrentDecisionKey: () => {
    const { currentStep, steps } = get();
    if (currentStep >= steps.length) return null;
    return MODULE_TO_DECISION_KEY[steps[currentStep].moduleId] || null;
  },
}));
