"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/api/trpc";
import { useDecisionStore, GameModule } from "@/lib/stores/decisionStore";
import {
  Save,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  DollarSign,
} from "lucide-react";

interface DecisionSubmitBarProps {
  module: GameModule;
  getDecisions: () => Record<string, unknown>;
  disabled?: boolean;
  disabledReason?: string;
}

// Estimate costs for decisions by module
function estimateCosts(module: GameModule, decisions: Record<string, unknown>): number {
  let total = 0;

  switch (module) {
    case "FACTORY":
      // Sum up efficiency investments
      const effInv = decisions.efficiencyInvestment as Record<string, number> | undefined;
      if (effInv) {
        total += Object.values(effInv).reduce((sum, val) => sum + (val || 0), 0);
      }
      // ESG investment
      total += (decisions.esgInvestment as number) || 0;
      break;

    case "HR":
      // Salary adjustment affects costs but not immediate spend
      // Training and recruitment costs
      const trainings = decisions.trainingPrograms as Array<unknown> | undefined;
      if (trainings) {
        total += trainings.length * 500; // Approximate per program
      }
      break;

    case "FINANCE":
      // Dividend payouts
      const dividend = decisions.dividendPerShare as number;
      if (dividend) {
        total += dividend * 10_000_000; // Assuming 10M shares
      }
      break;

    case "MARKETING":
      // Ad budgets
      const adBudgets = decisions.adBudgets as Record<string, Record<string, number>> | undefined;
      if (adBudgets) {
        Object.values(adBudgets).forEach((segment) => {
          Object.values(segment).forEach((budget) => {
            total += budget || 0;
          });
        });
      }
      // Brand investment
      total += (decisions.brandInvestment as number) || 0;
      break;

    case "RD":
      // R&D investment
      total += (decisions.rdInvestment as number) || 0;
      // New products (placeholder costs)
      const newProducts = decisions.newProducts as Array<unknown> | undefined;
      if (newProducts) {
        total += newProducts.length * 10_000_000; // Approximate base cost
      }
      break;
  }

  return total;
}

const moduleTestIds: Record<GameModule, string> = {
  FACTORY: "submit-factory",
  HR: "submit-hr",
  FINANCE: "submit-finance",
  MARKETING: "submit-marketing",
  RD: "submit-rd",
};

export function DecisionSubmitBar({ module, getDecisions, disabled, disabledReason }: DecisionSubmitBarProps) {
  const { submissionStatus, setSubmitting, setSubmitted, setError } = useDecisionStore();
  const status = submissionStatus[module] || {
    isSubmitted: false,
    isLocked: false,
    isDirty: false,
    isSubmitting: false,
    lastSubmittedAt: null,
    error: null
  };

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    try {
      const decisions = getDecisions();
      return estimateCosts(module, decisions);
    } catch {
      return 0;
    }
  }, [getDecisions, module]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const submitMutation = trpc.decision.submit.useMutation({
    onMutate: () => {
      setSubmitting(module, true);
    },
    onSuccess: (data) => {
      setSubmitted(module, data.submittedAt);
    },
    onError: (error) => {
      setError(module, error.message);
    },
  });

  const handleSave = () => {
    const decisions = getDecisions();
    submitMutation.mutate({ module, decisions });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-slate-800 border-t border-slate-700 p-4 z-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Status indicator */}
          {status.isLocked ? (
            <Badge className="bg-green-600 gap-1">
              <Lock className="w-3 h-3" />
              Locked
            </Badge>
          ) : status.isSubmitted ? (
            <Badge className="bg-blue-600 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Saved
            </Badge>
          ) : status.isDirty ? (
            <Badge className="bg-yellow-600 gap-1">
              <AlertCircle className="w-3 h-3" />
              Unsaved Changes
            </Badge>
          ) : (
            <Badge className="bg-slate-600 gap-1">
              <Clock className="w-3 h-3" />
              Not Started
            </Badge>
          )}

          {/* Cost estimate */}
          {estimatedCost > 0 && (
            <div className="flex items-center gap-1 text-slate-300 text-sm">
              <DollarSign className="w-4 h-4 text-yellow-400" />
              <span>Est. Cost: <span className="text-yellow-400 font-medium">{formatCurrency(estimatedCost)}</span></span>
            </div>
          )}

          {/* Last saved time */}
          {status.lastSubmittedAt && (
            <span className="text-slate-400 text-sm hidden md:inline">
              Last saved: {formatTime(status.lastSubmittedAt)}
            </span>
          )}

          {/* Error message */}
          {status.error && (
            <span className="text-red-400 text-sm">{status.error}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Validation warning */}
          {disabled && disabledReason && (
            <span className="text-amber-400 text-sm">{disabledReason}</span>
          )}

          {/* Save button */}
          <Button
            data-testid={moduleTestIds[module]}
            onClick={handleSave}
            disabled={status.isSubmitting || status.isLocked || !status.isDirty || disabled}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            title={disabled ? disabledReason : undefined}
          >
            {status.isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Decisions
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Compact version for inline use
export function DecisionStatus({ module }: { module: GameModule }) {
  const status = useDecisionStore((state) => state.submissionStatus[module]) || {
    isSubmitted: false,
    isLocked: false,
    isDirty: false,
    isSubmitting: false,
    lastSubmittedAt: null,
    error: null
  };

  if (status.isLocked) {
    return (
      <span className="inline-flex items-center gap-1 text-green-400 text-sm">
        <Lock className="w-3 h-3" />
        Locked
      </span>
    );
  }
  if (status.isSubmitted) {
    return (
      <span className="inline-flex items-center gap-1 text-blue-400 text-sm">
        <CheckCircle2 className="w-3 h-3" />
        Saved
      </span>
    );
  }
  if (status.isDirty) {
    return (
      <span className="inline-flex items-center gap-1 text-yellow-400 text-sm">
        <AlertCircle className="w-3 h-3" />
        Unsaved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-500 text-sm">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}
