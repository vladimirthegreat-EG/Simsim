"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/section-header";
import { trpc } from "@/lib/api/trpc";
import { useDecisionStore } from "@/lib/stores/decisionStore";
import { DecisionSubmitBar } from "@/components/game/DecisionSubmitBar";
import { DecisionImpactPanel } from "@/components/game/DecisionImpactPanel";
import { WarningBanner } from "@/components/game/WarningBanner";
import { GamePageSkeleton } from "@/components/game/GamePageSkeleton";
import { ModuleRecap } from "@/components/game/ModuleRecap";
import { useFinancePreview } from "@/lib/hooks/useFinancePreview";
import { useCrossModuleWarnings } from "@/lib/hooks/useCrossModuleWarnings";
import { useFeatureFlag } from "@/lib/contexts/ComplexityContext";
import { toast } from "sonner";
import { TeamState } from "@/engine/types";
import {
  DollarSign,
  TrendingUp,
  Building2,
  FileText,
} from "lucide-react";

import { OverviewTab } from "@/components/finance/OverviewTab";
import { DecisionsTab } from "@/components/finance/DecisionsTab";
import { StatementsTab } from "@/components/finance/StatementsTab";
import { BoardProposals } from "@/components/finance/BoardProposals";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

// Default financial data (used when state is not available)
const defaultFinancials = {
  cash: 200_000_000,
  revenue: 0,
  cogs: 0,
  grossProfit: 0,
  operatingExpenses: 5_000_000,
  netIncome: -5_000_000,
  totalAssets: 250_000_000,
  currentAssets: 200_000_000,
  totalLiabilities: 0,
  currentLiabilities: 5_000_000,
  equity: 250_000_000,
  eps: 0,
  sharesOutstanding: 10_000_000,
  dividendPerShare: 0,
  fxPositions: {
    "EUR/USD": { amount: 0, rate: 1.10 },
    "GBP/USD": { amount: 0, rate: 1.27 },
    "JPY/USD": { amount: 0, rate: 0.0067 },
    "CNY/USD": { amount: 0, rate: 0.14 },
  },
};

// Funding options — rates will be overridden by market rates when available
const getBaseFundingOptions = (marketRates?: { federalRate: number; corporateBond: number }) => [
  {
    type: "loan",
    name: "Short-Term Loan",
    icon: Building2,
    amounts: [10_000_000, 25_000_000, 50_000_000, 100_000_000],
    rate: marketRates ? Math.round((marketRates.federalRate + 2.5) * 10) / 10 : 7.5,
    term: 1,
    description: "Short-term financing (T-bills). Repay within 1 year.",
  },
  {
    type: "bond",
    name: "Corporate Bond",
    icon: FileText,
    amounts: [25_000_000, 50_000_000, 100_000_000, 200_000_000],
    rate: marketRates?.corporateBond ?? 6.0,
    term: 10,
    description: "Long-term debt. Board approval required for amounts >$20M.",
  },
  {
    type: "equity",
    name: "Stock Issuance",
    icon: TrendingUp,
    amounts: [25_000_000, 50_000_000, 100_000_000],
    rate: 0,
    term: 0,
    description: "Raise capital by issuing new shares (dilutes ownership).",
  },
];

export default function FinancePage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("overview");

  // Feature flags
  const hasDetailedFinancials = useFeatureFlag("detailedFinancials");

  // Get decisions from store
  const { finance, setFinanceDecisions, submissionStatus } = useDecisionStore();
  const router = useRouter();

  // Auto-navigate to HR after successful Finance save
  const prevFinanceSubmittedRef = useRef(submissionStatus.FINANCE?.isSubmitted);
  useEffect(() => {
    const wasSubmitted = prevFinanceSubmittedRef.current;
    const isNowSubmitted = submissionStatus.FINANCE?.isSubmitted;
    prevFinanceSubmittedRef.current = isNowSubmitted;

    if (!wasSubmitted && isNowSubmitted) {
      const basePath = gameId === "demo" ? "/demo" : `/game/${gameId}`;
      toast.info("Finances saved! Head to HR to manage your workforce.", {
        duration: 5000,
      });
      setTimeout(() => {
        router.push(`${basePath}/hr`);
      }, 1500);
    }
  }, [submissionStatus.FINANCE?.isSubmitted, gameId, router]);

  // Decision states (synced with store)
  const [selectedFunding, setSelectedFunding] = useState<{type: string; amount: number} | null>(null);
  const [pendingFunding, setPendingFunding] = useState<{type: string; amount: number} | null>(null);
  const [fxHedging, setFxHedging] = useState(finance.fxHedging);
  const [dividendAmount, setDividendAmount] = useState(finance.dividendPerShare);
  const [boardDecisions, setBoardDecisions] = useState<Record<string, boolean>>({});

  const handleBoardDecision = (proposalId: string, accepted: boolean) => {
    setBoardDecisions(prev => ({ ...prev, [proposalId]: accepted }));
  };

  // Sync store changes to local state (for when decisions are loaded from server)
  useEffect(() => {
    if (JSON.stringify(finance.fxHedging) !== JSON.stringify(fxHedging)) {
      setFxHedging(finance.fxHedging);
    }
  }, [finance.fxHedging]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (finance.dividendPerShare !== dividendAmount) {
      setDividendAmount(finance.dividendPerShare);
    }
  }, [finance.dividendPerShare]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore pending funding from store
  useEffect(() => {
    if (finance.issueTBills > 0 && !pendingFunding) {
      setPendingFunding({ type: 'loan', amount: finance.issueTBills });
    } else if (finance.issueBonds > 0 && !pendingFunding) {
      setPendingFunding({ type: 'bond', amount: finance.issueBonds });
    } else if (finance.issueShares && finance.issueShares.count > 0 && !pendingFunding) {
      setPendingFunding({ type: 'equity', amount: finance.issueShares.count * finance.issueShares.pricePerShare });
    }
  }, [finance.issueTBills, finance.issueBonds, finance.issueShares]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state changes to store
  useEffect(() => {
    setFinanceDecisions({ fxHedging });
  }, [fxHedging, setFinanceDecisions]);

  useEffect(() => {
    setFinanceDecisions({ dividendPerShare: dividendAmount });
  }, [dividendAmount, setFinanceDecisions]);

  // Sync pending funding to store
  useEffect(() => {
    if (pendingFunding) {
      if (pendingFunding.type === 'loan') {
        setFinanceDecisions({ issueTBills: pendingFunding.amount });
      } else if (pendingFunding.type === 'bond') {
        setFinanceDecisions({ issueBonds: pendingFunding.amount });
      } else if (pendingFunding.type === 'equity') {
        const pricePerShare = state?.sharePrice || 50;
        const shareCount = Math.floor(pendingFunding.amount / pricePerShare);
        setFinanceDecisions({ issueShares: { count: shareCount, pricePerShare } });
      }
    }
  }, [pendingFunding, setFinanceDecisions]);

  // Handle request funding
  const handleRequestFunding = () => {
    if (selectedFunding) {
      setPendingFunding(selectedFunding);
      setSelectedFunding(null);
    }
  };

  // Get current decisions for submission
  const getDecisions = useCallback(() => ({
    issueTBills: finance.issueTBills,
    issueBonds: finance.issueBonds,
    issueShares: finance.issueShares,
    sharesBuyback: finance.sharesBuyback,
    dividendPerShare: dividendAmount,
    fxHedging,
  }), [finance, dividendAmount, fxHedging]);

  const { data: teamState, isLoading } = trpc.team.getMyState.useQuery();

  // Parse team state
  const state: TeamState | null = useMemo(() => {
    if (!teamState?.state) return null;
    try {
      return typeof teamState.state === 'string'
        ? JSON.parse(teamState.state) as TeamState
        : teamState.state as TeamState;
    } catch {
      return null;
    }
  }, [teamState?.state]);

  // Parse market state for FX rates
  const marketState = useMemo(() => {
    if (!teamState?.marketState) return null;
    try {
      return typeof teamState.marketState === 'string'
        ? JSON.parse(teamState.marketState)
        : teamState.marketState;
    } catch {
      return null;
    }
  }, [teamState?.marketState]);

  // Cross-module warnings
  const financeWarnings = useCrossModuleWarnings(state, "finance");

  // Preview hook for live impact
  const financePreview = useFinancePreview(state, finance, marketState);

  // Compute financial data from state
  const financials = useMemo(() => {
    if (!state) return defaultFinancials;

    const laborCost = state.workforce?.laborCost || 0;
    const operatingExpenses = laborCost + (state.cogs || 0) * 0.1;
    const grossProfit = (state.revenue || 0) - (state.cogs || 0);

    const fxRates = marketState?.fxRates || defaultFinancials.fxPositions;

    return {
      cash: state.cash || defaultFinancials.cash,
      revenue: state.revenue || 0,
      cogs: state.cogs || 0,
      grossProfit,
      operatingExpenses,
      netIncome: state.netIncome || 0,
      totalAssets: state.totalAssets || defaultFinancials.totalAssets,
      currentAssets: state.cash || defaultFinancials.currentAssets,
      totalLiabilities: state.totalLiabilities || 0,
      currentLiabilities: state.accountsPayable || 0,
      equity: state.shareholdersEquity || defaultFinancials.equity,
      eps: state.eps || 0,
      sharesOutstanding: state.sharesIssued || defaultFinancials.sharesOutstanding,
      dividendPerShare: 0,
      fxPositions: {
        "EUR/USD": { amount: 0, rate: fxRates["EUR/USD"] || 1.10 },
        "GBP/USD": { amount: 0, rate: fxRates["GBP/USD"] || 1.27 },
        "JPY/USD": { amount: 0, rate: fxRates["JPY/USD"] || 0.0067 },
        "CNY/USD": { amount: 0, rate: fxRates["CNY/USD"] || 0.14 },
      },
    };
  }, [state, marketState]);

  // Funding options with real market rates
  const fundingOptions = useMemo(() => {
    return getBaseFundingOptions(marketState?.interestRates);
  }, [marketState?.interestRates]);

  // Compute financial ratios
  const ratios = useMemo(() => {
    const currentRatio = financials.currentLiabilities > 0
      ? financials.currentAssets / financials.currentLiabilities
      : financials.currentAssets > 0 ? 100 : 0;
    const quickRatio = currentRatio;
    const debtToEquity = financials.equity > 0
      ? financials.totalLiabilities / financials.equity
      : 0;
    const profitMargin = financials.revenue > 0
      ? financials.netIncome / financials.revenue
      : 0;
    const roe = financials.equity > 0
      ? financials.netIncome / financials.equity
      : 0;
    const roa = financials.totalAssets > 0
      ? financials.netIncome / financials.totalAssets
      : 0;

    return { currentRatio, quickRatio, debtToEquity, profitMargin, roe, roa };
  }, [financials]);

  if (isLoading) return <GamePageSkeleton statCards={4} sections={2} />;

  const currentRound = teamState?.game?.currentRound ?? 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Finance"
        subtitle="Manage cash flow, funding, FX exposure, and dividends"
        icon={<DollarSign className="w-7 h-7" />}
        iconColor="text-green-400"
      />

      {/* Cross-module warnings */}
      <WarningBanner warnings={financeWarnings} />

      {/* Last round recap */}
      <ModuleRecap module="finance" currentRound={currentRound} state={state} history={[]} />

      {/* Board Proposals — context-aware governance decisions */}
      <BoardProposals
        state={state}
        currentRound={teamState?.game?.currentRound ?? 1}
        boardDecisions={boardDecisions}
        onDecision={handleBoardDecision}
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
            Overview
          </TabsTrigger>
          <TabsTrigger value="decisions" className="data-[state=active]:bg-slate-700">
            Decisions
          </TabsTrigger>
          <TabsTrigger value="statements" className="data-[state=active]:bg-slate-700">
            Statements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            financials={financials}
            ratios={ratios}
            state={state}
            currentRound={currentRound}
          />
        </TabsContent>

        <TabsContent value="decisions" className="space-y-6">
          <DecisionsTab
            finance={finance}
            setFinanceDecisions={setFinanceDecisions}
            state={state}
            fundingOptions={fundingOptions}
            selectedFunding={selectedFunding}
            setSelectedFunding={setSelectedFunding}
            pendingFunding={pendingFunding}
            setPendingFunding={setPendingFunding}
            handleRequestFunding={handleRequestFunding}
            fxHedging={fxHedging}
            setFxHedging={setFxHedging}
            dividendAmount={dividendAmount}
            setDividendAmount={setDividendAmount}
            marketState={marketState}
            financials={financials}
          />
        </TabsContent>

        <TabsContent value="statements" className="space-y-6">
          <StatementsTab
            state={state}
            hasDetailedFinancials={hasDetailedFinancials}
            financials={financials}
          />
        </TabsContent>
      </Tabs>

      {/* Impact preview removed — budget bar at top already shows running cost total */}

      {/* Decision Submit Bar */}
      <DecisionSubmitBar module="FINANCE" getDecisions={getDecisions} />

      {/* Spacer for fixed submit bar */}
      <div className="h-20" />
    </div>
  );
}
