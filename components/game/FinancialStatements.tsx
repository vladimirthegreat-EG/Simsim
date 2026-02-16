"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { FinancialStatements } from "@/engine/finance/types";
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, FileText } from "lucide-react";

interface FinancialStatementsProps {
  statements: FinancialStatements;
  previousStatements?: FinancialStatements;
}

export function FinancialStatementsComponent({ statements, previousStatements }: FinancialStatementsProps) {
  const { incomeStatement, cashFlowStatement, balanceSheet, ratios, validation } = statements;

  // Calculate financial health
  const healthScore = calculateHealthScore(ratios);
  const healthGrade = getHealthGrade(healthScore);
  const healthColor = getHealthColor(healthGrade);

  return (
    <div className="space-y-6">
      {/* Financial Health Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Financial Health Dashboard
            </CardTitle>
            <Badge variant={healthColor as any} className="text-lg px-4 py-2">
              Grade: {healthGrade} ({healthScore}/100)
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <MetricCard
              title="Profitability"
              value={ratios.profitability.netMargin}
              format="percent"
              icon={<DollarSign className="h-4 w-4" />}
              threshold={{ good: 15, warning: 5 }}
            />
            <MetricCard
              title="Liquidity"
              value={ratios.liquidity.currentRatio}
              format="ratio"
              icon={<Activity className="h-4 w-4" />}
              threshold={{ good: 2.0, warning: 1.2 }}
            />
            <MetricCard
              title="Leverage"
              value={ratios.leverage.debtToEquity}
              format="ratio"
              icon={<BarChart3 className="h-4 w-4" />}
              threshold={{ good: 0.3, warning: 0.6 }}
              inverse
            />
            <MetricCard
              title="Efficiency"
              value={ratios.efficiency.assetTurnover}
              format="ratio"
              icon={<TrendingUp className="h-4 w-4" />}
              threshold={{ good: 1.5, warning: 1.0 }}
            />
            <MetricCard
              title="Free Cash Flow"
              value={cashFlowStatement.freeCashFlow}
              format="currency"
              icon={<DollarSign className="h-4 w-4" />}
              threshold={{ good: 50_000_000, warning: 0 }}
            />
          </div>

          {/* Validation Warnings */}
          {!validation.valid && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠️ Financial Statement Warnings:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validation.errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statement Tabs */}
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="income">
            <FileText className="h-4 w-4 mr-2" />
            Income Statement
          </TabsTrigger>
          <TabsTrigger value="cashflow">
            <Activity className="h-4 w-4 mr-2" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="balance">
            <BarChart3 className="h-4 w-4 mr-2" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="ratios">
            <TrendingUp className="h-4 w-4 mr-2" />
            Financial Ratios
          </TabsTrigger>
          <TabsTrigger value="insights">
            <DollarSign className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="space-y-4 mt-4">
          <IncomeStatementCard statement={incomeStatement} previous={previousStatements?.incomeStatement} />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4 mt-4">
          <CashFlowStatementCard statement={cashFlowStatement} previous={previousStatements?.cashFlowStatement} />
        </TabsContent>

        <TabsContent value="balance" className="space-y-4 mt-4">
          <BalanceSheetCard statement={balanceSheet} previous={previousStatements?.balanceSheet} />
        </TabsContent>

        <TabsContent value="ratios" className="space-y-4 mt-4">
          <FinancialRatiosCard ratios={ratios} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-4">
          <FinancialInsightsCard statements={statements} previousStatements={previousStatements} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value: number;
  format: "currency" | "percent" | "ratio";
  icon: React.ReactNode;
  threshold?: { good: number; warning: number };
  inverse?: boolean; // For metrics where lower is better (like debt-to-equity)
}

function MetricCard({ title, value, format, icon, threshold, inverse }: MetricCardProps) {
  const formatted =
    format === "currency"
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : format === "percent"
        ? `${value.toFixed(1)}%`
        : value.toFixed(2);

  let status: "good" | "warning" | "bad" = "good";
  if (threshold) {
    if (inverse) {
      // Lower is better (e.g., debt-to-equity)
      if (value > threshold.warning) status = "bad";
      else if (value > threshold.good) status = "warning";
    } else {
      // Higher is better
      if (value < threshold.warning) status = "bad";
      else if (value < threshold.good) status = "warning";
    }
  }

  const bgColor =
    status === "good" ? "bg-green-50" : status === "warning" ? "bg-yellow-50" : "bg-red-50";
  const textColor =
    status === "good" ? "text-green-700" : status === "warning" ? "text-yellow-700" : "text-red-700";
  const borderColor =
    status === "good" ? "border-green-200" : status === "warning" ? "border-yellow-200" : "border-red-200";

  return (
    <div className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={textColor}>{icon}</div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{formatted}</p>
    </div>
  );
}

// Income Statement Component
function IncomeStatementCard({ statement, previous }: { statement: any; previous?: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Statement - Round {statement.round}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Revenue */}
          <StatementSection title="Revenue">
            <StatementLine
              label="Total Revenue"
              value={statement.revenue.total}
              previous={previous?.revenue.total}
              bold
            />
            <div className="ml-4 space-y-1">
              {Object.entries(statement.revenue.bySegment).map(([segment, value]) => (
                <StatementLine key={segment} label={segment} value={value as number} />
              ))}
            </div>
          </StatementSection>

          {/* COGS */}
          <StatementSection title="Cost of Goods Sold">
            <StatementLine label="Raw Materials" value={statement.cogs.rawMaterials} />
            <StatementLine label="Direct Labor" value={statement.cogs.directLabor} />
            <StatementLine label="Manufacturing" value={statement.cogs.manufacturing} />
            <StatementLine label="Shipping" value={statement.cogs.shipping} />
            <StatementLine label="Other" value={statement.cogs.other} />
            <StatementLine
              label="Total COGS"
              value={statement.cogs.total}
              previous={previous?.cogs.total}
              bold
              negative
            />
          </StatementSection>

          {/* Gross Profit */}
          <StatementLine
            label="Gross Profit"
            value={statement.grossProfit}
            previous={previous?.grossProfit}
            margin={statement.grossMargin}
            bold
            className="text-lg"
          />

          {/* Operating Expenses */}
          <StatementSection title="Operating Expenses">
            <StatementLine label="Salaries" value={statement.operatingExpenses.salaries} negative />
            <StatementLine label="Benefits" value={statement.operatingExpenses.benefits} negative />
            <StatementLine label="Marketing" value={statement.operatingExpenses.marketing} negative />
            <StatementLine label="R&D" value={statement.operatingExpenses.rd} negative />
            <StatementLine label="Depreciation" value={statement.operatingExpenses.depreciation} negative />
            <StatementLine label="Amortization" value={statement.operatingExpenses.amortization} negative />
            <StatementLine label="ESG Programs" value={statement.operatingExpenses.esgPrograms} negative />
            <StatementLine label="General & Admin" value={statement.operatingExpenses.generalAdmin} negative />
            <StatementLine
              label="Total Operating Expenses"
              value={statement.operatingExpenses.total}
              previous={previous?.operatingExpenses.total}
              bold
              negative
            />
          </StatementSection>

          {/* Operating Income */}
          <StatementLine
            label="Operating Income"
            value={statement.operatingIncome}
            previous={previous?.operatingIncome}
            margin={statement.operatingMargin}
            bold
            className="text-lg"
          />

          {/* Interest */}
          <StatementLine label="Interest Expense" value={statement.interestExpense} negative />

          {/* Tax */}
          <StatementLine label="Tax Expense" value={statement.taxExpense} negative />

          {/* Net Income */}
          <div className="pt-4 border-t-2 border-gray-300">
            <StatementLine
              label="Net Income"
              value={statement.netIncome}
              previous={previous?.netIncome}
              margin={statement.netMargin}
              bold
              className="text-xl"
            />
            {statement.eps && (
              <p className="text-sm text-gray-600 mt-2">
                Earnings Per Share: ${statement.eps.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Cash Flow Statement Component
function CashFlowStatementCard({ statement, previous }: { statement: any; previous?: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Statement - Round {statement.round}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Operating Activities */}
          <StatementSection title="Operating Activities">
            <StatementLine label="Net Income" value={statement.operatingActivities.netIncome} />
            <StatementLine label="Depreciation" value={statement.operatingActivities.depreciation} />
            <StatementLine label="Amortization" value={statement.operatingActivities.amortization} />
            <StatementLine label="Change in Accounts Receivable" value={-statement.operatingActivities.changeInAR} />
            <StatementLine label="Change in Inventory" value={-statement.operatingActivities.changeInInventory} />
            <StatementLine label="Change in Accounts Payable" value={statement.operatingActivities.changeInAP} />
            <StatementLine
              label="Net Cash from Operations"
              value={statement.operatingActivities.netCashFromOperations}
              previous={previous?.operatingActivities.netCashFromOperations}
              bold
            />
          </StatementSection>

          {/* Investing Activities */}
          <StatementSection title="Investing Activities">
            <StatementLine label="Capital Expenditures" value={statement.investingActivities.capitalExpenditures} />
            <StatementLine label="R&D Capitalization" value={statement.investingActivities.rdCapitalization} />
            <StatementLine label="Asset Sales" value={statement.investingActivities.assetSales} />
            <StatementLine
              label="Net Cash from Investing"
              value={statement.investingActivities.netCashFromInvesting}
              previous={previous?.investingActivities.netCashFromInvesting}
              bold
            />
          </StatementSection>

          {/* Financing Activities */}
          <StatementSection title="Financing Activities">
            <StatementLine label="Debt Proceeds" value={statement.financingActivities.debtProceeds} />
            <StatementLine label="Debt Repayments" value={statement.financingActivities.debtRepayments} />
            <StatementLine label="Equity Proceeds" value={statement.financingActivities.equityProceeds} />
            <StatementLine label="Dividends Paid" value={statement.financingActivities.dividendsPaid} />
            <StatementLine label="Share Repurchases" value={statement.financingActivities.shareRepurchases} />
            <StatementLine
              label="Net Cash from Financing"
              value={statement.financingActivities.netCashFromFinancing}
              previous={previous?.financingActivities.netCashFromFinancing}
              bold
            />
          </StatementSection>

          {/* Summary */}
          <div className="pt-4 border-t-2 border-gray-300">
            <StatementLine
              label="Net Cash Change"
              value={statement.netCashChange}
              previous={previous?.netCashChange}
              bold
              className="text-lg"
            />
            <StatementLine label="Beginning Cash" value={statement.beginningCash} />
            <StatementLine
              label="Ending Cash"
              value={statement.endingCash}
              previous={previous?.endingCash}
              bold
              className="text-xl"
            />
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-800">Free Cash Flow</p>
              <p className="text-2xl font-bold text-blue-700">
                ${(statement.freeCashFlow / 1_000_000).toFixed(1)}M
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Operating Cash Flow - Capital Expenditures
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Balance Sheet Component
function BalanceSheetCard({ statement, previous }: { statement: any; previous?: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Sheet - Round {statement.round}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Assets</h3>

            <StatementSection title="Current Assets">
              <StatementLine label="Cash" value={statement.assets.currentAssets.cash} />
              <StatementLine label="Accounts Receivable" value={statement.assets.currentAssets.accountsReceivable} />
              <StatementLine label="Inventory" value={statement.assets.currentAssets.inventory} />
              <StatementLine label="Prepaid Expenses" value={statement.assets.currentAssets.prepaidExpenses} />
              <StatementLine label="Short-term Investments" value={statement.assets.currentAssets.shortTermInvestments} />
              <StatementLine
                label="Total Current Assets"
                value={statement.assets.currentAssets.total}
                previous={previous?.assets.currentAssets.total}
                bold
              />
            </StatementSection>

            <StatementSection title="Non-Current Assets">
              <StatementLine label="Property, Plant & Equipment (Net)" value={statement.assets.nonCurrentAssets.propertyPlantEquipment.net} />
              <StatementLine label="Intangible Assets (Net)" value={statement.assets.nonCurrentAssets.intangibleAssets.net} />
              <StatementLine label="Long-term Investments" value={statement.assets.nonCurrentAssets.longTermInvestments} />
              <StatementLine label="Goodwill" value={statement.assets.nonCurrentAssets.goodwill} />
              <StatementLine
                label="Total Non-Current Assets"
                value={statement.assets.nonCurrentAssets.total}
                previous={previous?.assets.nonCurrentAssets.total}
                bold
              />
            </StatementSection>

            <div className="pt-4 border-t-2 border-gray-900">
              <StatementLine
                label="Total Assets"
                value={statement.assets.total}
                previous={previous?.assets.total}
                bold
                className="text-xl"
              />
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Liabilities & Equity</h3>

            <StatementSection title="Current Liabilities">
              <StatementLine label="Accounts Payable" value={statement.liabilities.currentLiabilities.accountsPayable} />
              <StatementLine label="Accrued Expenses" value={statement.liabilities.currentLiabilities.accruedExpenses} />
              <StatementLine label="Short-term Debt" value={statement.liabilities.currentLiabilities.shortTermDebt} />
              <StatementLine label="Deferred Revenue" value={statement.liabilities.currentLiabilities.deferredRevenue} />
              <StatementLine
                label="Total Current Liabilities"
                value={statement.liabilities.currentLiabilities.total}
                previous={previous?.liabilities.currentLiabilities.total}
                bold
              />
            </StatementSection>

            <StatementSection title="Long-Term Liabilities">
              <StatementLine label="Long-term Debt" value={statement.liabilities.longTermLiabilities.longTermDebt} />
              <StatementLine label="Pension Liabilities" value={statement.liabilities.longTermLiabilities.pensionLiabilities} />
              <StatementLine label="Deferred Tax Liabilities" value={statement.liabilities.longTermLiabilities.deferredTaxLiabilities} />
              <StatementLine
                label="Total Long-Term Liabilities"
                value={statement.liabilities.longTermLiabilities.total}
                previous={previous?.liabilities.longTermLiabilities.total}
                bold
              />
            </StatementSection>

            <StatementLine
              label="Total Liabilities"
              value={statement.liabilities.total}
              previous={previous?.liabilities.total}
              bold
              className="text-lg"
            />

            <StatementSection title="Shareholders' Equity">
              <StatementLine label="Common Stock" value={statement.equity.commonStock} />
              <StatementLine label="Additional Paid-in Capital" value={statement.equity.additionalPaidInCapital} />
              <StatementLine label="Retained Earnings" value={statement.equity.retainedEarnings} />
              <StatementLine label="Treasury Stock" value={statement.equity.treasuryStock} />
              <StatementLine
                label="Total Equity"
                value={statement.equity.total}
                previous={previous?.equity.total}
                bold
                className="text-lg"
              />
            </StatementSection>

            <div className="pt-4 border-t-2 border-gray-900">
              <StatementLine
                label="Total Liabilities & Equity"
                value={statement.totalLiabilitiesAndEquity}
                previous={previous?.totalLiabilitiesAndEquity}
                bold
                className="text-xl"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Financial Ratios Component
function FinancialRatiosCard({ ratios }: { ratios: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Profitability */}
      <Card>
        <CardHeader>
          <CardTitle>Profitability Ratios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioLine label="Gross Margin" value={ratios.profitability.grossMargin} format="percent" threshold={{ good: 40, warning: 25 }} />
          <RatioLine label="Operating Margin" value={ratios.profitability.operatingMargin} format="percent" threshold={{ good: 20, warning: 10 }} />
          <RatioLine label="Net Margin" value={ratios.profitability.netMargin} format="percent" threshold={{ good: 15, warning: 5 }} />
          <RatioLine label="Return on Assets (ROA)" value={ratios.profitability.returnOnAssets} format="percent" threshold={{ good: 8, warning: 4 }} />
          <RatioLine label="Return on Equity (ROE)" value={ratios.profitability.returnOnEquity} format="percent" threshold={{ good: 15, warning: 8 }} />
        </CardContent>
      </Card>

      {/* Liquidity */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Ratios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioLine label="Current Ratio" value={ratios.liquidity.currentRatio} format="ratio" threshold={{ good: 2.0, warning: 1.2 }} />
          <RatioLine label="Quick Ratio" value={ratios.liquidity.quickRatio} format="ratio" threshold={{ good: 1.5, warning: 1.0 }} />
          <RatioLine label="Cash Ratio" value={ratios.liquidity.cashRatio} format="ratio" threshold={{ good: 0.5, warning: 0.2 }} />
          <RatioLine label="Working Capital" value={ratios.liquidity.workingCapital} format="currency" threshold={{ good: 50_000_000, warning: 20_000_000 }} />
        </CardContent>
      </Card>

      {/* Leverage */}
      <Card>
        <CardHeader>
          <CardTitle>Leverage Ratios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioLine label="Debt-to-Equity" value={ratios.leverage.debtToEquity} format="ratio" threshold={{ good: 0.3, warning: 0.6 }} inverse />
          <RatioLine label="Debt-to-Assets" value={ratios.leverage.debtToAssets} format="ratio" threshold={{ good: 0.3, warning: 0.5 }} inverse />
          <RatioLine label="Equity Multiplier" value={ratios.leverage.equityMultiplier} format="ratio" />
          <RatioLine label="Interest Coverage" value={ratios.leverage.interestCoverage} format="ratio" threshold={{ good: 10, warning: 3 }} />
        </CardContent>
      </Card>

      {/* Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle>Efficiency Ratios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioLine label="Asset Turnover" value={ratios.efficiency.assetTurnover} format="ratio" threshold={{ good: 1.5, warning: 1.0 }} />
          <RatioLine label="Inventory Turnover" value={ratios.efficiency.inventoryTurnover} format="ratio" threshold={{ good: 12, warning: 6 }} />
          <RatioLine label="Receivables Turnover" value={ratios.efficiency.receivablesTurnover} format="ratio" threshold={{ good: 12, warning: 6 }} />
          <RatioLine label="Payables Turnover" value={ratios.efficiency.payablesTurnover} format="ratio" />
        </CardContent>
      </Card>

      {/* Cash Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Ratios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioLine label="Operating CF Ratio" value={ratios.cashFlow.operatingCashFlowRatio} format="ratio" threshold={{ good: 0.5, warning: 0.3 }} />
          <RatioLine label="Cash Flow to Debt" value={ratios.cashFlow.cashFlowToDebtRatio} format="ratio" threshold={{ good: 0.3, warning: 0.15 }} />
          <RatioLine label="Free CF to Equity" value={ratios.cashFlow.freeCashFlowToEquity} format="ratio" threshold={{ good: 0.15, warning: 0.05 }} />
          <RatioLine label="Cash Conversion Rate" value={ratios.cashFlow.cashConversionRate} format="ratio" threshold={{ good: 1.2, warning: 0.8 }} />
        </CardContent>
      </Card>

      {/* Market */}
      <Card>
        <CardHeader>
          <CardTitle>Market Ratios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RatioLine label="Book Value per Share" value={ratios.market.bookValuePerShare} format="currency" />
          <RatioLine label="Price-to-Book" value={ratios.market.priceToBook} format="ratio" />
          <RatioLine label="Price-to-Earnings (P/E)" value={ratios.market.priceToEarnings} format="ratio" />
          <RatioLine label="Dividend Yield" value={ratios.market.dividendYield} format="percent" />
        </CardContent>
      </Card>
    </div>
  );
}

// Financial Insights Component
function FinancialInsightsCard({ statements, previousStatements }: { statements: any; previousStatements?: any }) {
  // Generate insights (this would come from FinancialStatementsEngine.generateInsights)
  const insights = generateInsights(statements, previousStatements);

  return (
    <div className="space-y-6">
      {/* Strengths */}
      {insights.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Concerns */}
      {insights.concerns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <TrendingDown className="h-5 w-5" />
              Concerns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.concerns.map((concern, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-1">⚠</span>
                  <span className="text-gray-700">{concern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Activity className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components

function StatementSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

interface StatementLineProps {
  label: string;
  value: number;
  previous?: number;
  margin?: number;
  bold?: boolean;
  negative?: boolean;
  className?: string;
}

function StatementLine({ label, value, previous, margin, bold, negative, className }: StatementLineProps) {
  const displayValue = negative ? -Math.abs(value) : value;
  const change = previous !== undefined ? ((value - previous) / Math.abs(previous)) * 100 : null;

  return (
    <div className={`flex items-center justify-between py-1 ${className || ""}`}>
      <span className={bold ? "font-semibold" : ""}>{label}</span>
      <div className="flex items-center gap-3">
        {change !== null && !isNaN(change) && isFinite(change) && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              change > 0 ? "bg-green-100 text-green-700" : change < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        )}
        <span className={bold ? "font-bold" : ""}>
          ${(displayValue / 1_000_000).toFixed(1)}M
        </span>
        {margin !== undefined && (
          <span className="text-sm text-gray-500">({margin.toFixed(1)}%)</span>
        )}
      </div>
    </div>
  );
}

interface RatioLineProps {
  label: string;
  value: number;
  format: "percent" | "ratio" | "currency";
  threshold?: { good: number; warning: number };
  inverse?: boolean;
}

function RatioLine({ label, value, format, threshold, inverse }: RatioLineProps) {
  const formatted =
    format === "currency"
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : format === "percent"
        ? `${value.toFixed(1)}%`
        : value.toFixed(2);

  let status: "good" | "warning" | "bad" | null = null;
  if (threshold) {
    if (inverse) {
      if (value > threshold.warning) status = "bad";
      else if (value > threshold.good) status = "warning";
      else status = "good";
    } else {
      if (value < threshold.warning) status = "bad";
      else if (value < threshold.good) status = "warning";
      else status = "good";
    }
  }

  const statusColor =
    status === "good" ? "text-green-600" : status === "warning" ? "text-yellow-600" : status === "bad" ? "text-red-600" : "";

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`font-semibold ${statusColor || "text-gray-900"}`}>{formatted}</span>
    </div>
  );
}

// Helper Functions

function calculateHealthScore(ratios: any): number {
  let score = 0;

  // Profitability (20 points)
  if (ratios.profitability.returnOnEquity > 20) score += 8;
  else if (ratios.profitability.returnOnEquity > 15) score += 6;
  else if (ratios.profitability.returnOnEquity > 10) score += 4;
  else if (ratios.profitability.returnOnEquity > 5) score += 2;

  if (ratios.profitability.netMargin > 15) score += 6;
  else if (ratios.profitability.netMargin > 10) score += 4;
  else if (ratios.profitability.netMargin > 5) score += 2;

  if (ratios.profitability.operatingMargin > 20) score += 6;
  else if (ratios.profitability.operatingMargin > 15) score += 4;
  else if (ratios.profitability.operatingMargin > 10) score += 2;

  // Liquidity (20 points)
  if (ratios.liquidity.currentRatio > 2.0) score += 8;
  else if (ratios.liquidity.currentRatio > 1.5) score += 6;
  else if (ratios.liquidity.currentRatio > 1.2) score += 4;
  else if (ratios.liquidity.currentRatio > 1.0) score += 2;

  if (ratios.liquidity.quickRatio > 1.5) score += 6;
  else if (ratios.liquidity.quickRatio > 1.0) score += 4;
  else if (ratios.liquidity.quickRatio > 0.8) score += 2;

  if (ratios.liquidity.workingCapital > 50_000_000) score += 6;
  else if (ratios.liquidity.workingCapital > 20_000_000) score += 4;
  else if (ratios.liquidity.workingCapital > 0) score += 2;

  // Leverage (20 points) - lower is better
  if (ratios.leverage.debtToEquity < 0.3) score += 8;
  else if (ratios.leverage.debtToEquity < 0.6) score += 6;
  else if (ratios.leverage.debtToEquity < 1.0) score += 4;
  else if (ratios.leverage.debtToEquity < 1.5) score += 2;

  if (ratios.leverage.interestCoverage > 10) score += 6;
  else if (ratios.leverage.interestCoverage > 5) score += 4;
  else if (ratios.leverage.interestCoverage > 3) score += 2;

  if (ratios.leverage.debtToAssets < 0.3) score += 6;
  else if (ratios.leverage.debtToAssets < 0.5) score += 4;
  else if (ratios.leverage.debtToAssets < 0.7) score += 2;

  // Efficiency (20 points)
  if (ratios.efficiency.assetTurnover > 1.5) score += 7;
  else if (ratios.efficiency.assetTurnover > 1.0) score += 5;
  else if (ratios.efficiency.assetTurnover > 0.7) score += 3;

  if (ratios.efficiency.inventoryTurnover > 12) score += 7;
  else if (ratios.efficiency.inventoryTurnover > 8) score += 5;
  else if (ratios.efficiency.inventoryTurnover > 6) score += 3;

  if (ratios.efficiency.receivablesTurnover > 12) score += 6;
  else if (ratios.efficiency.receivablesTurnover > 8) score += 4;
  else if (ratios.efficiency.receivablesTurnover > 6) score += 2;

  // Cash Flow (20 points)
  if (ratios.cashFlow.operatingCashFlowRatio > 0.5) score += 7;
  else if (ratios.cashFlow.operatingCashFlowRatio > 0.3) score += 5;
  else if (ratios.cashFlow.operatingCashFlowRatio > 0.2) score += 3;

  if (ratios.cashFlow.cashConversionRate > 1.2) score += 7;
  else if (ratios.cashFlow.cashConversionRate > 1.0) score += 5;
  else if (ratios.cashFlow.cashConversionRate > 0.8) score += 3;

  if (ratios.cashFlow.freeCashFlowToEquity > 0.15) score += 6;
  else if (ratios.cashFlow.freeCashFlowToEquity > 0.10) score += 4;
  else if (ratios.cashFlow.freeCashFlowToEquity > 0.05) score += 2;

  return score;
}

function getHealthGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getHealthColor(grade: string): string {
  switch (grade) {
    case "A":
      return "default"; // green
    case "B":
      return "secondary"; // blue
    case "C":
      return "outline"; // yellow
    case "D":
      return "destructive"; // orange
    case "F":
      return "destructive"; // red
    default:
      return "outline";
  }
}

function generateInsights(statements: any, previousStatements?: any) {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const recommendations: string[] = [];

  const { ratios, incomeStatement, cashFlowStatement } = statements;

  // Profitability
  if (ratios.profitability.returnOnEquity > 20) {
    strengths.push(`Excellent ROE of ${ratios.profitability.returnOnEquity.toFixed(1)}% demonstrates strong profitability`);
  } else if (ratios.profitability.returnOnEquity < 5) {
    concerns.push(`Low ROE of ${ratios.profitability.returnOnEquity.toFixed(1)}% suggests weak returns`);
    recommendations.push("Focus on improving profit margins or reducing assets");
  }

  // Cash conversion
  const cashConversion = ratios.cashFlow.cashConversionRate;
  if (cashConversion < 0.7) {
    concerns.push(`Only ${(cashConversion * 100).toFixed(0)}% of net income converting to cash`);
    recommendations.push("Improve accounts receivable collection or reduce inventory buildup");
  } else if (cashConversion > 1.2) {
    strengths.push(`Strong cash generation at ${(cashConversion * 100).toFixed(0)}% of net income`);
  }

  // Liquidity
  if (ratios.liquidity.currentRatio < 1.0) {
    concerns.push(`Current ratio of ${ratios.liquidity.currentRatio.toFixed(2)} below 1.0 - liquidity concerns`);
    recommendations.push("Increase cash reserves or reduce short-term liabilities");
  }

  // Leverage
  if (ratios.leverage.debtToEquity > 1.5) {
    concerns.push(`High debt-to-equity ratio of ${ratios.leverage.debtToEquity.toFixed(2)} increases financial risk`);
    recommendations.push("Consider reducing debt or raising equity capital");
  }

  // Free cash flow
  if (cashFlowStatement.freeCashFlow < 0) {
    concerns.push(`Negative free cash flow of $${(-cashFlowStatement.freeCashFlow / 1_000_000).toFixed(1)}M`);
    recommendations.push("Reduce capital expenditures or improve operating cash flow");
  } else if (cashFlowStatement.freeCashFlow > 50_000_000) {
    strengths.push(`Strong free cash flow of $${(cashFlowStatement.freeCashFlow / 1_000_000).toFixed(1)}M`);
  }

  return { strengths, concerns, recommendations };
}
