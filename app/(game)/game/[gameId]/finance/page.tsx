"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { PageHeader } from "@/components/ui/section-header";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/api/trpc";
import { useDecisionStore } from "@/lib/stores/decisionStore";
import { DecisionSubmitBar } from "@/components/game/DecisionSubmitBar";
import { useFeatureFlag } from "@/lib/contexts/ComplexityContext";
import { TeamState } from "@/engine/types";
import { FinancialStatementsComponent } from "@/components/game/FinancialStatements";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Globe,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  PiggyBank,
  CreditCard,
  Landmark,
  BarChart3,
} from "lucide-react";

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

const fundingOptions = [
  {
    type: "loan",
    name: "Bank Loan",
    icon: Building2,
    amounts: [10_000_000, 25_000_000, 50_000_000, 100_000_000],
    rate: 7.5,
    term: 5,
    description: "Traditional bank financing with fixed interest rate",
  },
  {
    type: "bond",
    name: "Corporate Bond",
    icon: FileText,
    amounts: [25_000_000, 50_000_000, 100_000_000, 200_000_000],
    rate: 6.0,
    term: 10,
    description: "Long-term debt financing through bond issuance",
  },
  {
    type: "equity",
    name: "Stock Issuance",
    icon: TrendingUp,
    amounts: [25_000_000, 50_000_000, 100_000_000],
    rate: 0,
    term: 0,
    description: "Raise capital by issuing new shares (dilutes ownership)",
  },
];

const boardProposals = [
  // === EXISTING (5) ===
  {
    id: "dividend",
    name: "Dividend Payment",
    description: "Distribute profits to shareholders",
    status: "available" as const,
    approvalChance: 75,
    category: "financial",
  },
  {
    id: "stock_buyback",
    name: "Stock Buyback",
    description: "Repurchase company shares from the market",
    status: "available" as const,
    approvalChance: 60,
    category: "financial",
  },
  {
    id: "expansion",
    name: "Major Expansion",
    description: "Approve large capital expenditure for growth",
    status: "available" as const,
    approvalChance: 55,
    category: "strategic",
  },
  {
    id: "acquisition",
    name: "Company Acquisition",
    description: "Acquire another company to expand capabilities",
    status: "available" as const,
    approvalChance: 45,
    category: "strategic",
  },
  {
    id: "emergency_capital",
    name: "Emergency Capital",
    description: "Request emergency funding during crisis",
    status: "available" as const,
    approvalChance: 70,
    category: "financial",
  },
  // === STRATEGIC (5 new) ===
  {
    id: "rd_investment",
    name: "R&D Investment",
    description: "Large research and development budget allocation",
    status: "available" as const,
    approvalChance: 55,
    category: "strategic",
  },
  {
    id: "strategic_partnership",
    name: "Strategic Partnership",
    description: "Form joint venture or strategic alliance",
    status: "available" as const,
    approvalChance: 50,
    category: "strategic",
  },
  {
    id: "market_entry",
    name: "New Market Entry",
    description: "Enter a new regional market",
    status: "available" as const,
    approvalChance: 45,
    category: "strategic",
  },
  {
    id: "product_line_discontinue",
    name: "Discontinue Product Line",
    description: "End underperforming product line",
    status: "available" as const,
    approvalChance: 65,
    category: "strategic",
  },
  {
    id: "vertical_integration",
    name: "Vertical Integration",
    description: "Acquire supplier or distributor",
    status: "available" as const,
    approvalChance: 40,
    category: "strategic",
  },
  // === FINANCIAL (3 new) ===
  {
    id: "debt_refinancing",
    name: "Debt Refinancing",
    description: "Restructure existing debt for better terms",
    status: "available" as const,
    approvalChance: 70,
    category: "financial",
  },
  {
    id: "share_split",
    name: "Stock Split",
    description: "Split shares to increase liquidity (2:1 or 3:1)",
    status: "available" as const,
    approvalChance: 60,
    category: "financial",
  },
  {
    id: "capital_allocation",
    name: "Capital Allocation Plan",
    description: "Set investment priorities for next 3 years",
    status: "available" as const,
    approvalChance: 55,
    category: "financial",
  },
  // === CORPORATE (2 new) ===
  {
    id: "executive_compensation",
    name: "Executive Compensation Review",
    description: "Adjust CEO and executive pay packages",
    status: "available" as const,
    approvalChance: 50,
    category: "corporate",
  },
  {
    id: "esg_policy",
    name: "ESG Policy Adoption",
    description: "Formal commitment to environmental and social governance",
    status: "available" as const,
    approvalChance: 65,
    category: "corporate",
  },
];

export default function FinancePage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("overview");

  // Feature flags
  const hasDetailedFinancials = useFeatureFlag("detailedFinancials");
  const hasBoardMeetings = useFeatureFlag("boardMeetings");

  // Get decisions from store
  const { finance, setFinanceDecisions } = useDecisionStore();

  // Decision states (synced with store)
  const [selectedFunding, setSelectedFunding] = useState<{type: string; amount: number} | null>(null);
  const [pendingFunding, setPendingFunding] = useState<{type: string; amount: number} | null>(null);
  const [pendingBoardProposals, setPendingBoardProposals] = useState<string[]>([]);
  const [fxHedging, setFxHedging] = useState(finance.fxHedging);
  const [dividendAmount, setDividendAmount] = useState(finance.dividendPerShare);

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
        // For equity, we need to specify count and price per share
        // Assuming a fixed price per share of $10 for now
        const pricePerShare = 10;
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

  // Handle board proposal submission
  const handleSubmitProposal = (proposalId: string) => {
    setPendingBoardProposals(prev => [...prev, proposalId]);
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

  const { data: teamState } = trpc.team.getMyState.useQuery();

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

  // Compute financial data from state
  const financials = useMemo(() => {
    if (!state) return defaultFinancials;

    const laborCost = state.workforce?.laborCost || 0;
    const operatingExpenses = laborCost + (state.cogs || 0) * 0.1; // Labor + 10% of COGS as overhead
    const grossProfit = (state.revenue || 0) - (state.cogs || 0);

    // Get FX rates from market state
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

  // Compute financial ratios
  const ratios = useMemo(() => {
    const currentRatio = financials.currentLiabilities > 0
      ? financials.currentAssets / financials.currentLiabilities
      : financials.currentAssets > 0 ? 100 : 0;
    const quickRatio = currentRatio; // Simplified: same as current ratio
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

  const getRatioStatus = (ratio: string, value: number): { status: string; color: string } => {
    const thresholds: Record<string, { green: number; yellow: number }> = {
      currentRatio: { green: 2.0, yellow: 1.5 },
      quickRatio: { green: 1.5, yellow: 1.0 },
      debtToEquity: { green: 0.5, yellow: 1.0 },
      profitMargin: { green: 0.15, yellow: 0.05 },
    };
    const t = thresholds[ratio];
    if (!t) return { status: "neutral", color: "text-slate-400" };
    if (ratio === "debtToEquity") {
      if (value <= t.green) return { status: "healthy", color: "text-green-400" };
      if (value <= t.yellow) return { status: "warning", color: "text-yellow-400" };
      return { status: "critical", color: "text-red-400" };
    }
    if (value >= t.green) return { status: "healthy", color: "text-green-400" };
    if (value >= t.yellow) return { status: "warning", color: "text-yellow-400" };
    return { status: "critical", color: "text-red-400" };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Finance"
        subtitle="Manage cash flow, funding, FX exposure, and board relations"
        icon={<DollarSign className="w-7 h-7" />}
        iconColor="text-green-400"
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
            Overview
          </TabsTrigger>
          <TabsTrigger value="statements" className="data-[state=active]:bg-slate-700">
            Statements
          </TabsTrigger>
          <TabsTrigger value="cash" className="data-[state=active]:bg-slate-700">
            Cash
          </TabsTrigger>
          <TabsTrigger value="funding" className="data-[state=active]:bg-slate-700">
            Funding
          </TabsTrigger>
          <TabsTrigger value="fx" className="data-[state=active]:bg-slate-700">
            FX
          </TabsTrigger>
          <TabsTrigger value="board" className="data-[state=active]:bg-slate-700">
            Board
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-slate-700">
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Cash Balance"
              value={formatCurrency(financials.cash)}
              icon={<Wallet className="w-5 h-5" />}
              variant="success"
            />
            <StatCard
              label="Revenue"
              value={formatCurrency(financials.revenue)}
              icon={<TrendingUp className="w-5 h-5" />}
              variant="info"
            />
            <StatCard
              label="Net Income"
              value={formatCurrency(financials.netIncome)}
              icon={financials.netIncome >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              variant={financials.netIncome >= 0 ? "success" : "danger"}
            />
            <StatCard
              label="EPS"
              value={`$${financials.eps.toFixed(2)}`}
              icon={<BarChart3 className="w-5 h-5" />}
              variant="purple"
            />
          </div>

          {/* Financial Ratios */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Financial Ratios</CardTitle>
                <CardDescription className="text-slate-400">
                  Key liquidity and profitability metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(ratios).map(([key, value]) => {
                  const { status, color } = getRatioStatus(key, value);
                  const displayName = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase());
                  return (
                    <div key={key} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {status === "healthy" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        {status === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                        {status === "critical" && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        {status === "neutral" && <div className="w-4 h-4" />}
                        <span className="text-slate-300">{displayName}</span>
                      </div>
                      <span className={`font-medium ${color}`}>
                        {typeof value === 'number' && value < 1
                          ? `${(value * 100).toFixed(1)}%`
                          : value.toFixed(2)
                        }
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Balance Sheet Summary <HelpTooltip text="Current Ratio above 1.5 is healthy. Debt-to-Equity below 0.5 means conservative financing. Watch cash flow to avoid running out of money." /></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-300">Total Assets</span>
                    <span className="text-white font-medium">{formatCurrency(financials.totalAssets)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-300">Total Liabilities</span>
                    <span className="text-white font-medium">{formatCurrency(financials.totalLiabilities)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-900/30 border border-green-700 rounded-lg">
                    <span className="text-green-400">Shareholders' Equity</span>
                    <span className="text-green-400 font-medium">{formatCurrency(financials.equity)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Income Statement */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Income Statement (This Round)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">Revenue</span>
                  <span className="text-white">{formatCurrency(financials.revenue)}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg pl-8">
                  <span className="text-slate-400">Cost of Goods Sold</span>
                  <span className="text-red-400">-{formatCurrency(financials.cogs)}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">Gross Profit</span>
                  <span className="text-white">{formatCurrency(financials.grossProfit)}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg pl-8">
                  <span className="text-slate-400">Operating Expenses</span>
                  <span className="text-red-400">-{formatCurrency(financials.operatingExpenses)}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-700/50 rounded-lg border-t-2 border-slate-600">
                  <span className="text-white font-medium">Net Income</span>
                  <span className={`font-bold ${financials.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(financials.netIncome)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Statements Tab */}
        <TabsContent value="statements" className="space-y-6">
          {state?.financialStatements ? (
            <FinancialStatementsComponent
              statements={state.financialStatements}
              previousStatements={state.previousFinancialStatements}
            />
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p className="text-slate-400">Financial statements are not available yet.</p>
                <p className="text-slate-500 text-sm mt-2">
                  Complete a round to generate your first financial statements.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cash Management Tab */}
        <TabsContent value="cash" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <PiggyBank className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Available Cash</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(financials.cash)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-red-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Pending Payments</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(financials.currentLiabilities)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Net Position</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(financials.cash - financials.currentLiabilities)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Cash Flow Projection</CardTitle>
              <CardDescription className="text-slate-400">
                Expected inflows and outflows for this round
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                  <h3 className="text-green-400 font-medium mb-3">Inflows</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Product Sales</span>
                      <span className="text-green-400">+{formatCurrency(financials.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Accounts Receivable</span>
                      <span className="text-green-400">+{formatCurrency(state?.accountsReceivable || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                  <h3 className="text-red-400 font-medium mb-3">Outflows</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Salaries & Wages</span>
                      <span className="text-red-400">-{formatCurrency(state?.workforce?.laborCost || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Cost of Goods Sold</span>
                      <span className="text-red-400">-{formatCurrency(financials.cogs)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Accounts Payable</span>
                      <span className="text-red-400">-{formatCurrency(state?.accountsPayable || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-700 rounded-lg">
                  <span className="text-white font-medium">Projected End-of-Round Cash</span>
                  <span className="text-xl font-bold text-green-400">
                    {formatCurrency(financials.cash + financials.revenue - financials.operatingExpenses)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funding Tab */}
        <TabsContent value="funding" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Raise Capital</CardTitle>
              <CardDescription className="text-slate-400">
                Choose a funding method to raise additional capital
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {fundingOptions.map((option) => (
                  <Card
                    key={option.type}
                    className={`bg-slate-700 border-slate-600 cursor-pointer transition-all ${
                      selectedFunding?.type === option.type ? 'border-green-500 ring-2 ring-green-500/20' : 'hover:border-slate-500'
                    }`}
                    onClick={() => setSelectedFunding({ type: option.type, amount: option.amounts[0] })}
                  >
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <option.icon className="w-5 h-5" />
                        {option.name}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        {option.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {option.rate > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Interest Rate</span>
                            <span className="text-white">{option.rate}%</span>
                          </div>
                        )}
                        {option.term > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Term</span>
                            <span className="text-white">{option.term} years</span>
                          </div>
                        )}
                        {option.type === "equity" && (
                          <div className="text-yellow-400 text-xs mt-2">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Dilutes existing shareholders
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedFunding && (
                <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                  <h3 className="text-white font-medium mb-4">Select Amount</h3>
                  <div className="flex gap-3 flex-wrap">
                    {fundingOptions
                      .find(o => o.type === selectedFunding.type)
                      ?.amounts.map((amount) => (
                        <Button
                          key={amount}
                          variant={selectedFunding.amount === amount ? "default" : "outline"}
                          className={selectedFunding.amount === amount
                            ? "bg-green-600 hover:bg-green-700"
                            : "border-slate-500"
                          }
                          onClick={() => setSelectedFunding({ ...selectedFunding, amount })}
                        >
                          {formatCurrency(amount)}
                        </Button>
                      ))
                    }
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleRequestFunding}
                    >
                      Request Funding
                    </Button>
                  </div>
                </div>
              )}
              {pendingFunding && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-green-400 text-sm font-medium mb-2">Pending Funding Request:</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300 capitalize">
                      {pendingFunding.type} - {formatCurrency(pendingFunding.amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 h-6 px-2"
                      onClick={() => {
                        setPendingFunding(null);
                        // Clear from store
                        setFinanceDecisions({
                          issueTBills: 0,
                          issueBonds: 0,
                          issueShares: null
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing Debt */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Outstanding Debt</CardTitle>
            </CardHeader>
            <CardContent>
              {financials.totalLiabilities === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Landmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No outstanding debt</p>
                  <p className="text-sm">Your company is debt-free</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Total Liabilities</span>
                      <span className="text-white font-medium">{formatCurrency(financials.totalLiabilities)}</span>
                    </div>
                    <div className="text-sm text-slate-400">
                      Outstanding debt from operations and financing
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FX Management Tab */}
        <TabsContent value="fx" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Currency Exposure
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage foreign exchange risk from international operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(financials.fxPositions).map(([pair, position]) => (
                  <Card key={pair} className="bg-slate-700 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-white font-medium">{pair}</span>
                        <Badge className="bg-slate-600">{position.rate.toFixed(4)}</Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Exposure</span>
                          <span className="text-white">{formatCurrency(position.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hedged</span>
                          <span className="text-green-400">{fxHedging[pair] || 0}%</span>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <label className="text-slate-400 text-xs">Hedge Percentage</label>
                        <Slider
                          data-testid={`slider-fx-${pair.toLowerCase().replace('/', '-')}`}
                          value={[fxHedging[pair] || 0]}
                          onValueChange={(values) => setFxHedging(prev => ({
                            ...prev,
                            [pair]: values[0]
                          }))}
                          max={100}
                          step={5}
                          variant="success"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">FX Volatility Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-yellow-400 font-medium">
                      Market Volatility: {((marketState?.fxVolatility || 0.2) * 100).toFixed(0)}%
                    </p>
                    <p className="text-slate-400 text-sm">
                      Currency rates may fluctuate significantly between rounds. Consider hedging high-exposure positions.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Board Relations Tab */}
        <TabsContent value="board" className="space-y-6">
          {hasBoardMeetings ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Board Proposals
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Submit proposals to the board for approval. Approval probability depends on company performance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {boardProposals.map((proposal) => (
                    <Card key={proposal.id} className="bg-slate-700 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-medium">{proposal.name}</h3>
                            <p className="text-slate-400 text-sm">{proposal.description}</p>
                          </div>
                          <div className="text-right">
                            {pendingBoardProposals.includes(proposal.id) ? (
                              <Badge className="bg-green-600">Submitted</Badge>
                            ) : proposal.status === "available" ? (
                              <>
                                <div className="text-sm text-slate-400 mb-2">
                                  Approval: <span className="text-green-400">{proposal.approvalChance}%</span>
                                </div>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleSubmitProposal(proposal.id)}
                                >
                                  Submit
                                </Button>
                              </>
                            ) : (
                              <Badge className="bg-slate-600">Unavailable</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p className="text-slate-400">Board meetings are not enabled in this game mode.</p>
                <p className="text-slate-500 text-sm mt-2">Dividends can still be set below.</p>
              </CardContent>
            </Card>
          )}

          {/* Dividend Settings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Dividend Distribution</CardTitle>
              <CardDescription className="text-slate-400">
                Set dividend per share (requires board approval)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Dividend Per Share</span>
                    <span className="text-green-400 font-semibold text-lg">
                      ${dividendAmount.toFixed(2)}/share
                    </span>
                  </div>
                  <Slider
                    data-testid="slider-dividend"
                    value={[dividendAmount * 20]}
                    onValueChange={(values) => setDividendAmount(values[0] / 20)}
                    max={100}
                    step={2}
                    variant="success"
                  />
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Payout</span>
                    <span className="text-white">
                      {formatCurrency(dividendAmount * financials.sharesOutstanding)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">Shares Outstanding</span>
                    <span className="text-white">{financials.sharesOutstanding.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab - Only show if detailed financials enabled */}
        <TabsContent value="reports" className="space-y-6">
          {hasDetailedFinancials ? (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Income Statement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 bg-slate-700/50 rounded">
                        <span className="text-slate-300">Revenue</span>
                        <span className="text-white">{formatCurrency(financials.revenue)}</span>
                      </div>
                      <div className="flex justify-between p-2">
                        <span className="text-slate-400">COGS</span>
                        <span className="text-red-400">({formatCurrency(financials.cogs)})</span>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-700/50 rounded">
                        <span className="text-slate-300">Gross Profit</span>
                        <span className="text-white">{formatCurrency(financials.grossProfit)}</span>
                      </div>
                      <div className="flex justify-between p-2">
                        <span className="text-slate-400">Operating Expenses</span>
                        <span className="text-red-400">({formatCurrency(financials.operatingExpenses)})</span>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-700/50 rounded font-medium">
                        <span className="text-white">Net Income</span>
                        <span className={financials.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatCurrency(financials.netIncome)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Balance Sheet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="text-slate-400 mb-2">Assets</h4>
                        <div className="flex justify-between p-2 bg-slate-700/50 rounded">
                          <span className="text-slate-300">Current Assets</span>
                          <span className="text-white">{formatCurrency(financials.currentAssets)}</span>
                        </div>
                        <div className="flex justify-between p-2">
                          <span className="text-slate-300">Total Assets</span>
                          <span className="text-white font-medium">{formatCurrency(financials.totalAssets)}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-slate-400 mb-2">Liabilities & Equity</h4>
                        <div className="flex justify-between p-2 bg-slate-700/50 rounded">
                          <span className="text-slate-300">Total Liabilities</span>
                          <span className="text-white">{formatCurrency(financials.totalLiabilities)}</span>
                        </div>
                        <div className="flex justify-between p-2">
                          <span className="text-green-400">Shareholders' Equity</span>
                          <span className="text-green-400 font-medium">{formatCurrency(financials.equity)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stock Information */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Stock Information <HelpTooltip text="EPS (Earnings Per Share) = Net Income / Shares Outstanding. Key ranking metric. Issuing stock raises cash but dilutes EPS." /></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                      <p className="text-slate-400 text-sm">Share Price</p>
                      <p className="text-xl font-bold text-white">${(state?.sharePrice || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                      <p className="text-slate-400 text-sm">Market Cap</p>
                      <p className="text-xl font-bold text-blue-400">{formatCurrency(state?.marketCap || 0)}</p>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                      <p className="text-slate-400 text-sm">EPS</p>
                      <p className={`text-xl font-bold ${financials.eps >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${financials.eps.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                      <p className="text-slate-400 text-sm">Shares Outstanding</p>
                      <p className="text-xl font-bold text-white">{(financials.sharesOutstanding / 1_000_000).toFixed(1)}M</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Historical Performance</CardTitle>
                  <CardDescription className="text-slate-400">
                    Financial trends over past rounds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-slate-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No historical data yet</p>
                    <p className="text-sm">Charts will appear after Round 1 completes</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-8 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p className="text-slate-400">Detailed financial reports are not enabled in this game mode.</p>
                <p className="text-slate-500 text-sm mt-2">Basic financial information is shown in the Overview tab.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Decision Submit Bar */}
      <DecisionSubmitBar module="FINANCE" getDecisions={getDecisions} />

      {/* Spacer for fixed submit bar */}
      <div className="h-20" />
    </div>
  );
}
