import { create } from "zustand";
import { GameModule as GameModuleConst, type GameModuleType } from "@/server/api/shared/constants";

// Re-export const object with its original name for value usage
export { GameModuleConst as GameModuleValues };

// Re-export the type with the name "GameModule" for backward compatibility
// This allows existing code like `module: GameModule` to work without changes
export type GameModule = GameModuleType;

/**
 * UI Decision Types
 *
 * These types are UI-specific versions of the engine decision types.
 * They use simpler types (strings instead of enums) for form handling.
 * The API layer converts these to engine-compatible types.
 */

export interface UIFactoryDecisions {
  efficiencyInvestment: {
    workers: number;
    engineers: number;
    equipment: number;
  };
  esgInvestment: number;
  productionAllocations: Record<string, number>;
  upgradePurchases: Array<{ factoryId: string; upgradeName: string }>;
  newFactories: Array<{ region: string; name: string }>;
}

export interface UIFinanceDecisions {
  issueTBills: number;
  issueBonds: number;
  issueShares: { count: number; pricePerShare: number } | null;
  sharesBuyback: number;
  dividendPerShare: number;
  fxHedging: Record<string, number>;
}

export interface UIHRDecisions {
  hires: Array<{ role: string; candidateId: string }>;
  fires: Array<{ employeeId: string }>;
  recruitmentSearches: Array<{ role: string; tier: string }>;
  salaryAdjustment: number;
  trainingPrograms: Array<{ role: string; programType: string }>;
}

export interface UIMarketingDecisions {
  adBudgets: Record<string, Record<string, number>>;
  brandInvestment: number;
  promotions: Array<{ type: string; intensity: number }>;
}

export interface UIRDDecisions {
  rdInvestment: number;
  newProducts: Array<{
    name: string;
    segment: string;
    qualityTarget: number;
    featuresTarget: number;
    priceTarget: number;
  }>;
  techUpgrades: string[];
}

// Legacy type aliases for backward compatibility
export type FactoryDecisions = UIFactoryDecisions;
export type FinanceDecisions = UIFinanceDecisions;
export type HRDecisions = UIHRDecisions;
export type MarketingDecisions = UIMarketingDecisions;
export type RDDecisions = UIRDDecisions;

export interface ModuleSubmissionStatus {
  isDirty: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isLocked: boolean;
  lastSubmittedAt: Date | null;
  error: string | null;
}

interface DecisionState {
  // Decision data for each module
  factory: FactoryDecisions;
  finance: FinanceDecisions;
  hr: HRDecisions;
  marketing: MarketingDecisions;
  rd: RDDecisions;

  // Submission status for each module
  submissionStatus: Record<GameModule, ModuleSubmissionStatus>;

  // Actions
  setFactoryDecisions: (decisions: Partial<FactoryDecisions>) => void;
  setFinanceDecisions: (decisions: Partial<FinanceDecisions>) => void;
  setHRDecisions: (decisions: Partial<HRDecisions>) => void;
  setMarketingDecisions: (decisions: Partial<MarketingDecisions>) => void;
  setRDDecisions: (decisions: Partial<RDDecisions>) => void;

  markDirty: (module: GameModule) => void;
  setSubmitting: (module: GameModule, isSubmitting: boolean) => void;
  setSubmitted: (module: GameModule, submittedAt: Date) => void;
  setLocked: (module: GameModule, isLocked: boolean) => void;
  setError: (module: GameModule, error: string | null) => void;

  resetModule: (module: GameModule) => void;
  resetAll: () => void;

  // Load from server
  loadFromServer: (serverDecisions: Array<{
    module: GameModule;
    decisions: unknown;
    submittedAt: Date;
    isLocked: boolean;
  }>) => void;
}

const initialFactoryDecisions: FactoryDecisions = {
  efficiencyInvestment: { workers: 0, engineers: 0, equipment: 0 },
  esgInvestment: 0,
  productionAllocations: {
    Budget: 40,
    General: 60,
    Enthusiast: 0,
    Professional: 0,
    "Active Lifestyle": 0,
  },
  upgradePurchases: [],
  newFactories: [],
};

const initialFinanceDecisions: FinanceDecisions = {
  issueTBills: 0,
  issueBonds: 0,
  issueShares: null,
  sharesBuyback: 0,
  dividendPerShare: 0,
  fxHedging: {},
};

const initialHRDecisions: HRDecisions = {
  hires: [],
  fires: [],
  recruitmentSearches: [],
  salaryAdjustment: 0,
  trainingPrograms: [],
};

const initialMarketingDecisions: MarketingDecisions = {
  adBudgets: {},
  brandInvestment: 0,
  promotions: [],
};

const initialRDDecisions: RDDecisions = {
  rdInvestment: 0,
  newProducts: [],
  techUpgrades: [],
};

const createInitialSubmissionStatus = (): ModuleSubmissionStatus => ({
  isDirty: false,
  isSubmitting: false,
  isSubmitted: false,
  isLocked: false,
  lastSubmittedAt: null,
  error: null,
});

const initialSubmissionStatus: Record<GameModule, ModuleSubmissionStatus> = {
  [GameModuleConst.FACTORY]: createInitialSubmissionStatus(),
  [GameModuleConst.FINANCE]: createInitialSubmissionStatus(),
  [GameModuleConst.HR]: createInitialSubmissionStatus(),
  [GameModuleConst.MARKETING]: createInitialSubmissionStatus(),
  [GameModuleConst.RD]: createInitialSubmissionStatus(),
};

export const useDecisionStore = create<DecisionState>((set) => ({
  factory: initialFactoryDecisions,
  finance: initialFinanceDecisions,
  hr: initialHRDecisions,
  marketing: initialMarketingDecisions,
  rd: initialRDDecisions,
  submissionStatus: initialSubmissionStatus,

  setFactoryDecisions: (decisions) =>
    set((state) => ({
      factory: { ...state.factory, ...decisions },
      submissionStatus: {
        ...state.submissionStatus,
        FACTORY: { ...state.submissionStatus.FACTORY, isDirty: true },
      },
    })),

  setFinanceDecisions: (decisions) =>
    set((state) => ({
      finance: { ...state.finance, ...decisions },
      submissionStatus: {
        ...state.submissionStatus,
        FINANCE: { ...state.submissionStatus.FINANCE, isDirty: true },
      },
    })),

  setHRDecisions: (decisions) =>
    set((state) => ({
      hr: { ...state.hr, ...decisions },
      submissionStatus: {
        ...state.submissionStatus,
        HR: { ...state.submissionStatus.HR, isDirty: true },
      },
    })),

  setMarketingDecisions: (decisions) =>
    set((state) => ({
      marketing: { ...state.marketing, ...decisions },
      submissionStatus: {
        ...state.submissionStatus,
        MARKETING: { ...state.submissionStatus.MARKETING, isDirty: true },
      },
    })),

  setRDDecisions: (decisions) =>
    set((state) => ({
      rd: { ...state.rd, ...decisions },
      submissionStatus: {
        ...state.submissionStatus,
        RD: { ...state.submissionStatus.RD, isDirty: true },
      },
    })),

  markDirty: (module) =>
    set((state) => ({
      submissionStatus: {
        ...state.submissionStatus,
        [module]: { ...state.submissionStatus[module], isDirty: true },
      },
    })),

  setSubmitting: (module, isSubmitting) =>
    set((state) => ({
      submissionStatus: {
        ...state.submissionStatus,
        [module]: { ...state.submissionStatus[module], isSubmitting, error: null },
      },
    })),

  setSubmitted: (module, submittedAt) =>
    set((state) => ({
      submissionStatus: {
        ...state.submissionStatus,
        [module]: {
          ...state.submissionStatus[module],
          isSubmitting: false,
          isSubmitted: true,
          isDirty: false,
          lastSubmittedAt: submittedAt,
          error: null,
        },
      },
    })),

  setLocked: (module, isLocked) =>
    set((state) => ({
      submissionStatus: {
        ...state.submissionStatus,
        [module]: { ...state.submissionStatus[module], isLocked },
      },
    })),

  setError: (module, error) =>
    set((state) => ({
      submissionStatus: {
        ...state.submissionStatus,
        [module]: { ...state.submissionStatus[module], isSubmitting: false, error },
      },
    })),

  resetModule: (module) =>
    set((state) => {
      const initialDecisions: Record<GameModule, FactoryDecisions | FinanceDecisions | HRDecisions | MarketingDecisions | RDDecisions> = {
        [GameModuleConst.FACTORY]: initialFactoryDecisions,
        [GameModuleConst.FINANCE]: initialFinanceDecisions,
        [GameModuleConst.HR]: initialHRDecisions,
        [GameModuleConst.MARKETING]: initialMarketingDecisions,
        [GameModuleConst.RD]: initialRDDecisions,
      };
      return {
        [module.toLowerCase()]: initialDecisions[module],
        submissionStatus: {
          ...state.submissionStatus,
          [module]: createInitialSubmissionStatus(),
        },
      };
    }),

  resetAll: () =>
    set({
      factory: initialFactoryDecisions,
      finance: initialFinanceDecisions,
      hr: initialHRDecisions,
      marketing: initialMarketingDecisions,
      rd: initialRDDecisions,
      submissionStatus: initialSubmissionStatus,
    }),

  loadFromServer: (serverDecisions) =>
    set((state) => {
      let newFactory = state.factory;
      let newFinance = state.finance;
      let newHr = state.hr;
      let newMarketing = state.marketing;
      let newRd = state.rd;
      let newSubmissionStatus = { ...state.submissionStatus };

      for (const decision of serverDecisions) {
        // Update decisions data
        if (decision.decisions) {
          switch (decision.module) {
            case GameModuleConst.FACTORY:
              newFactory = { ...newFactory, ...(decision.decisions as Partial<FactoryDecisions>) };
              break;
            case GameModuleConst.FINANCE:
              newFinance = { ...newFinance, ...(decision.decisions as Partial<FinanceDecisions>) };
              break;
            case GameModuleConst.HR:
              newHr = { ...newHr, ...(decision.decisions as Partial<HRDecisions>) };
              break;
            case GameModuleConst.MARKETING:
              newMarketing = { ...newMarketing, ...(decision.decisions as Partial<MarketingDecisions>) };
              break;
            case GameModuleConst.RD:
              newRd = { ...newRd, ...(decision.decisions as Partial<RDDecisions>) };
              break;
          }
        }

        // Update submission status
        newSubmissionStatus = {
          ...newSubmissionStatus,
          [decision.module]: {
            isDirty: false,
            isSubmitting: false,
            isSubmitted: true,
            isLocked: decision.isLocked,
            lastSubmittedAt: decision.submittedAt,
            error: null,
          },
        };
      }

      return {
        ...state,
        factory: newFactory,
        finance: newFinance,
        hr: newHr,
        marketing: newMarketing,
        rd: newRd,
        submissionStatus: newSubmissionStatus,
      };
    }),
}));
