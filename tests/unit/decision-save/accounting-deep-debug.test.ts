import { describe, it } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { IncomeStatementEngine } from "@/engine/finance/statements/IncomeStatement";
import { BalanceSheetEngine } from "@/engine/finance/statements/BalanceSheet";
import { CashFlowEngine } from "@/engine/finance/statements/CashFlowStatement";

describe("Accounting Deep Debug", () => {
  it("traces exactly where reconciliation breaks", () => {
    // Run 1 round with 1 team — simplest case
    const state = SimulationEngine.createInitialTeamState(
      { cash: 175_000_000 },
      { workers: 40, engineers: 8, supervisors: 5, includeProducts: true, startingSegments: 2, brandValue: 0.5, starterMachines: true }
    );
    const marketState = SimulationEngine.createInitialMarketState();

    const output = SimulationEngine.processRound({
      roundNumber: 1,
      teams: [{ id: "t1", state, decisions: {} }],
      marketState,
      matchSeed: "accounting-debug",
    });

    const newState = (output.results[0] as any).newState;

    console.log("\n=== STATE AFTER ROUND 1 ===");
    console.log("cash:", newState.cash);
    console.log("revenue:", newState.revenue);
    console.log("netIncome:", newState.netIncome);
    console.log("totalAssets:", newState.totalAssets);
    console.log("totalLiabilities:", newState.totalLiabilities);
    console.log("shareholdersEquity:", newState.shareholdersEquity);
    console.log("A - (L+E):", newState.totalAssets - (newState.totalLiabilities + newState.shareholdersEquity));

    // Now generate statements manually from this state
    console.log("\n=== INCOME STATEMENT ===");
    const is = IncomeStatementEngine.generate(newState, 1);
    console.log("revenue.total:", is.revenue.total);
    console.log("cogs.total:", is.cogs.total);
    console.log("grossProfit:", is.grossProfit);
    console.log("opex.total:", is.operatingExpenses.total);
    console.log("  salaries:", is.operatingExpenses.salaries);
    console.log("  benefits:", is.operatingExpenses.benefits);
    console.log("  marketing:", is.operatingExpenses.marketing);
    console.log("  rd:", is.operatingExpenses.rd);
    console.log("  depreciation:", is.operatingExpenses.depreciation);
    console.log("operatingIncome:", is.operatingIncome);
    console.log("netIncome:", is.netIncome);
    console.log("eps:", is.eps);

    console.log("\n=== BALANCE SHEET ===");
    const bs = BalanceSheetEngine.generate(newState, is, null);
    console.log("ASSETS:");
    console.log("  currentAssets.cash:", bs.assets.currentAssets.cash);
    console.log("  currentAssets.inventory:", bs.assets.currentAssets.inventory);
    console.log("  currentAssets.AR:", bs.assets.currentAssets.accountsReceivable);
    console.log("  currentAssets.total:", bs.assets.currentAssets.total);
    console.log("  nonCurrent.PPE.gross:", bs.assets.nonCurrentAssets.propertyPlantEquipment.gross);
    console.log("  nonCurrent.PPE.depreciation:", bs.assets.nonCurrentAssets.propertyPlantEquipment.accumulatedDepreciation);
    console.log("  nonCurrent.PPE.net:", bs.assets.nonCurrentAssets.propertyPlantEquipment.net);
    console.log("  nonCurrent.intangibles.gross:", bs.assets.nonCurrentAssets.intangibleAssets.gross);
    console.log("  nonCurrent.total:", bs.assets.nonCurrentAssets.total);
    console.log("  TOTAL ASSETS:", bs.assets.total);
    console.log("LIABILITIES:");
    console.log("  current.AP:", bs.liabilities.currentLiabilities.accountsPayable);
    console.log("  current.accrued:", bs.liabilities.currentLiabilities.accruedExpenses);
    console.log("  current.shortTermDebt:", bs.liabilities.currentLiabilities.shortTermDebt);
    console.log("  current.total:", bs.liabilities.currentLiabilities.total);
    console.log("  longTerm.total:", bs.liabilities.longTermLiabilities.total);
    console.log("  TOTAL LIABILITIES:", bs.liabilities.total);
    console.log("EQUITY:");
    console.log("  commonStock:", bs.equity.commonStock);
    console.log("  APIC:", bs.equity.additionalPaidInCapital);
    console.log("  retainedEarnings:", bs.equity.retainedEarnings);
    console.log("  treasuryStock:", bs.equity.treasuryStock);
    console.log("  TOTAL EQUITY:", bs.equity.total);
    console.log("L+E:", bs.liabilities.total + bs.equity.total);
    console.log("DIFF (A - L+E):", bs.assets.total - (bs.liabilities.total + bs.equity.total));

    console.log("\n=== CASH FLOW STATEMENT ===");
    const cf = CashFlowEngine.generate(newState, is, null, bs);
    console.log("operating.netIncome:", cf.operatingActivities.netIncome);
    console.log("operating.depreciation:", cf.operatingActivities.depreciation);
    console.log("operating.netCashFromOps:", cf.operatingActivities.netCashFromOperations);
    console.log("investing.capex:", cf.investingActivities.capitalExpenditures);
    console.log("investing.netCashFromInvesting:", cf.investingActivities.netCashFromInvesting);
    console.log("financing.netCashFromFinancing:", cf.financingActivities.netCashFromFinancing);
    console.log("netCashChange:", cf.netCashChange);
    console.log("beginningCash:", cf.beginningCash);
    console.log("endingCash:", cf.endingCash);
    console.log("BS cash:", bs.assets.currentAssets.cash);
    console.log("State cash:", newState.cash);
    console.log("CF endingCash vs BS cash DIFF:", cf.endingCash - bs.assets.currentAssets.cash);
    console.log("CF endingCash vs State cash DIFF:", cf.endingCash - newState.cash);

    // Check: what does state think vs what BS calculates
    console.log("\n=== STATE vs BS COMPARISON ===");
    console.log("State.totalAssets:", newState.totalAssets, "| BS.totalAssets:", bs.assets.total, "| DIFF:", newState.totalAssets - bs.assets.total);
    console.log("State.totalLiabilities:", newState.totalLiabilities, "| BS.totalLiabilities:", bs.liabilities.total, "| DIFF:", newState.totalLiabilities - bs.liabilities.total);
    console.log("State.shareholdersEquity:", newState.shareholdersEquity, "| BS.equity:", bs.equity.total, "| DIFF:", newState.shareholdersEquity - bs.equity.total);
  });
});
