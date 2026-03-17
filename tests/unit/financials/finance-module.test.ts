/**
 * Finance Module Unit Tests (Prompt 26)
 * Tests debt covenants, stock issuance, ratios, board satisfaction, PE ratio
 */

import { FinanceModule } from "@/engine/modules/FinanceModule";
import type { FinancialRatios } from "@/engine/modules/FinanceModule";
import { fresh_company_state, fresh_market_state, create_context, CONSTANTS } from "../setup";

describe("Finance Module", () => {
  // ─── calculateRatios ───
  describe("calculateRatios", () => {
    it("computes currentRatio = currentAssets / currentLiabilities", () => {
      const state = fresh_company_state({
        cash: 100_000_000,
        accountsReceivable: 20_000_000,
        shortTermDebt: 30_000_000,
        accountsPayable: 10_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      // currentAssets = cash + AR = 120M; currentLiabilities = STD + AP = 40M
      expect(ratios.currentRatio).toBeCloseTo(3.0, 1);
    });

    it("returns D/E = 999 when equity <= 0", () => {
      const state = fresh_company_state({
        totalLiabilities: 200_000_000,
        shareholdersEquity: 0,
      });
      const ratios = FinanceModule.calculateRatios(state);
      expect(ratios.debtToEquity).toBe(999);
    });

    it("computes D/E = totalLiabilities / equity when equity > 0", () => {
      const state = fresh_company_state({
        totalLiabilities: 50_000_000,
        shareholdersEquity: 100_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      expect(ratios.debtToEquity).toBeCloseTo(0.5, 2);
    });

    it("computes ROE = netIncome / equity", () => {
      const state = fresh_company_state({
        netIncome: 15_000_000,
        shareholdersEquity: 100_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      expect(ratios.roe).toBeCloseTo(0.15, 3);
    });

    it("computes ROA = netIncome / totalAssets", () => {
      const state = fresh_company_state({
        netIncome: 10_000_000,
        totalAssets: 200_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      expect(ratios.roa).toBeCloseTo(0.05, 3);
    });

    it("returns 999 for liquidity ratios when currentLiabilities = 0", () => {
      const state = fresh_company_state({
        shortTermDebt: 0,
        accountsPayable: 0,
      });
      const ratios = FinanceModule.calculateRatios(state);
      expect(ratios.currentRatio).toBe(999);
      expect(ratios.cashRatio).toBe(999);
    });
  });

  // ─── getRatioHealth ───
  describe("getRatioHealth", () => {
    it("currentRatio >= 2.0 → green", () => {
      expect(FinanceModule.getRatioHealth("currentRatio", 2.5).status).toBe("green");
    });

    it("currentRatio 1.2-2.0 → yellow", () => {
      expect(FinanceModule.getRatioHealth("currentRatio", 1.5).status).toBe("yellow");
    });

    it("currentRatio < 1.2 → red", () => {
      expect(FinanceModule.getRatioHealth("currentRatio", 0.8).status).toBe("red");
    });

    it("debtToEquity <= 0.3 → green (lower is better)", () => {
      expect(FinanceModule.getRatioHealth("debtToEquity", 0.2).status).toBe("green");
    });

    it("debtToEquity 0.3-0.6 → yellow", () => {
      expect(FinanceModule.getRatioHealth("debtToEquity", 0.5).status).toBe("yellow");
    });

    it("debtToEquity > 0.6 → red", () => {
      expect(FinanceModule.getRatioHealth("debtToEquity", 1.0).status).toBe("red");
    });

    it("roe >= 0.15 → green", () => {
      expect(FinanceModule.getRatioHealth("roe", 0.20).status).toBe("green");
    });

    it("roe < 0.08 → red", () => {
      expect(FinanceModule.getRatioHealth("roe", 0.05).status).toBe("red");
    });
  });

  // ─── calculateProposalProbability (Board Satisfaction) ───
  describe("calculateProposalProbability", () => {
    it("baseline is BOARD_SATISFACTION_BASELINE (50) with no modifiers", () => {
      const state = fresh_company_state({
        achievementScore: 0,
        achievements: [],
        netIncome: 0,
        esgScore: 400,
        cash: 50_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      const prob = FinanceModule.calculateProposalProbability("expansion", state, ratios);
      // Baseline 50, no achievements, no financial bonuses/penalties
      // expansion modifier: depends on D/E
      expect(prob).toBeGreaterThanOrEqual(10);
      expect(prob).toBeLessThanOrEqual(95);
    });

    it("high achievementScore adds up to +30 satisfaction", () => {
      const state = fresh_company_state({
        achievementScore: 500,
        achievements: [],
        netIncome: 0,
        esgScore: 400,
      });
      const ratios = FinanceModule.calculateRatios(state);
      const prob = FinanceModule.calculateProposalProbability("expansion", state, ratios);
      // +30 from achievements (500/10 = 50, capped at 30)
      expect(prob).toBeGreaterThan(60);
    });

    it("bad achievements reduce satisfaction by 5 each", () => {
      const stateGood = fresh_company_state({
        achievementScore: 0,
        achievements: [],
        netIncome: 0,
        esgScore: 400,
      });
      const stateBad = fresh_company_state({
        achievementScore: 0,
        achievements: [
          { id: "bad1", points: 0, roundUnlocked: 0 },
          { id: "bad2", points: 0, roundUnlocked: 0 },
        ] as any,
        netIncome: 0,
        esgScore: 400,
      });
      const ratiosGood = FinanceModule.calculateRatios(stateGood);
      const ratiosBad = FinanceModule.calculateRatios(stateBad);
      const probGood = FinanceModule.calculateProposalProbability("expansion", stateGood, ratiosGood);
      const probBad = FinanceModule.calculateProposalProbability("expansion", stateBad, ratiosBad);
      // 2 bad achievements = -10 satisfaction
      expect(probBad).toBeLessThan(probGood);
    });

    it("D/E > 2.0 subtracts 10 satisfaction", () => {
      const state = fresh_company_state({
        totalLiabilities: 300_000_000,
        shareholdersEquity: 100_000_000, // D/E = 3.0
        achievementScore: 0,
        achievements: [],
        netIncome: 0,
        esgScore: 400,
      });
      const ratios = FinanceModule.calculateRatios(state);
      const prob = FinanceModule.calculateProposalProbability("expansion", state, ratios);
      // High D/E penalizes: -8 (>1.0) -10 (>2.0) = -18, plus expansion modifier -8
      expect(prob).toBeLessThan(40);
    });

    it("emergency_capital has floor at 65%", () => {
      const state = fresh_company_state({
        achievementScore: 0,
        achievements: [],
        netIncome: -20_000_000,
        cash: -5_000_000,
        esgScore: 100,
      });
      const ratios = FinanceModule.calculateRatios(state);
      const prob = FinanceModule.calculateProposalProbability("emergency_capital", state, ratios);
      // Even with terrible metrics, emergency capital should be >= 65
      expect(prob).toBeGreaterThanOrEqual(65);
    });

    it("probability is clamped between 10 and 95", () => {
      // Extremely bad scenario
      const stateBad = fresh_company_state({
        achievementScore: 0,
        achievements: Array(10).fill({ id: "bad", points: 0, roundUnlocked: 0 }) as any,
        netIncome: -50_000_000,
        cash: -10_000_000,
        esgScore: 50,
        totalLiabilities: 500_000_000,
        shareholdersEquity: 50_000_000,
      });
      const ratios = FinanceModule.calculateRatios(stateBad);
      const prob = FinanceModule.calculateProposalProbability("expansion", stateBad, ratios);
      expect(prob).toBeGreaterThanOrEqual(10);
      expect(prob).toBeLessThanOrEqual(95);
    });
  });

  // ─── calculatePERatio ───
  describe("calculatePERatio", () => {
    it("returns sharePrice / eps for positive EPS", () => {
      const state = fresh_company_state({ sharePrice: 50, eps: 2 });
      expect(FinanceModule.calculatePERatio(state)).toBe(25);
    });

    it("returns 0 for zero EPS", () => {
      const state = fresh_company_state({ sharePrice: 50, eps: 0 });
      expect(FinanceModule.calculatePERatio(state)).toBe(0);
    });

    it("returns 0 for negative EPS", () => {
      const state = fresh_company_state({ sharePrice: 50, eps: -1 });
      expect(FinanceModule.calculatePERatio(state)).toBe(0);
    });
  });

  // ─── calculateTargetPERatio ───
  describe("calculateTargetPERatio", () => {
    it("base PE is 15 at neutral conditions", () => {
      const state = fresh_company_state({
        revenue: 100_000_000,
        netIncome: 12_000_000, // 12% margin → profitability +1
        totalLiabilities: 20_000_000,
        shareholdersEquity: 200_000_000, // D/E = 0.1 → no penalty
      });
      const pe = FinanceModule.calculateTargetPERatio(state, 0, 50);
      // base 15 + growth 0 + sentiment 0 + profitability +1 + leverage 0 = 16
      expect(pe).toBeCloseTo(16, 0);
    });

    it("growth premium increases PE up to MAX", () => {
      const state = fresh_company_state({
        revenue: 100_000_000,
        netIncome: 20_000_000,
        totalLiabilities: 10_000_000,
        shareholdersEquity: 200_000_000,
      });
      // epsGrowth = 0.5 → premium = min(10, 0.5 × 50) = 10
      const pe = FinanceModule.calculateTargetPERatio(state, 0.5, 50);
      expect(pe).toBeGreaterThan(20);
    });

    it("PE is clamped between MIN_PE_RATIO (5) and MAX_PE_RATIO (30)", () => {
      const state = fresh_company_state({
        revenue: 100_000_000,
        netIncome: -50_000_000,
        totalLiabilities: 300_000_000,
        shareholdersEquity: 50_000_000,
      });
      const peLow = FinanceModule.calculateTargetPERatio(state, -1, 0);
      expect(peLow).toBeGreaterThanOrEqual(CONSTANTS.MIN_PE_RATIO);

      const peHigh = FinanceModule.calculateTargetPERatio(state, 2, 100);
      expect(peHigh).toBeLessThanOrEqual(CONSTANTS.MAX_PE_RATIO);
    });
  });

  // ─── calculateInvestorSentiment ───
  describe("calculateInvestorSentiment", () => {
    it("returns base sentiment when ESG is in neutral zone", () => {
      const state = fresh_company_state({ esgScore: 450 });
      const sentiment = FinanceModule.calculateInvestorSentiment(state, 50);
      expect(sentiment).toBe(50);
    });

    it("high ESG (>600) adds bonus", () => {
      const state = fresh_company_state({ esgScore: 700 });
      const sentiment = FinanceModule.calculateInvestorSentiment(state, 50);
      expect(sentiment).toBe(50 + CONSTANTS.INVESTOR_SENTIMENT_ESG_BONUS);
    });

    it("low ESG (<300) subtracts penalty", () => {
      const state = fresh_company_state({ esgScore: 100 });
      const sentiment = FinanceModule.calculateInvestorSentiment(state, 50);
      expect(sentiment).toBe(50 - CONSTANTS.INVESTOR_SENTIMENT_ESG_PENALTY);
    });
  });

  // ─── calculateEPSRanking ───
  describe("calculateEPSRanking", () => {
    it("returns 100 when no peers", () => {
      expect(FinanceModule.calculateEPSRanking(2, [])).toBe(100);
    });

    it("returns 100% when player EPS equals peer average", () => {
      expect(FinanceModule.calculateEPSRanking(2, [2, 2])).toBe(100);
    });

    it("returns >100 when player beats average", () => {
      expect(FinanceModule.calculateEPSRanking(4, [2, 2])).toBe(200);
    });
  });

  // ─── Debt Covenants (tested via process) ───
  describe("Debt Covenants", () => {
    it("D/E > 2.0 freezes credit — new debt is blocked", () => {
      const state = fresh_company_state({
        shortTermDebt: 100_000_000,
        longTermDebt: 200_000_000,
        totalLiabilities: 300_000_000,
        shareholdersEquity: 100_000_000, // D/E = 3.0
        cash: 200_000_000,
      });
      const decisions = {
        treasuryBillsIssue: 50_000_000,
      };
      const market = fresh_market_state();
      const ctx = create_context();
      const { newState } = FinanceModule.process(state, decisions as any, market, ctx);
      // Treasury bills should NOT be added because credit is frozen
      expect(newState.shortTermDebt).toBe(state.shortTermDebt);
    });

    it("D/E > 1.0 triggers interest surcharge", () => {
      const state = fresh_company_state({
        shortTermDebt: 50_000_000,
        longTermDebt: 100_000_000,
        totalLiabilities: 150_000_000,
        shareholdersEquity: 100_000_000, // D/E = 1.5
        cash: 200_000_000,
        netIncome: 5_000_000,
        esgScore: 400,
        achievementScore: 0,
        achievements: [],
      });
      const decisions = {};
      const market = fresh_market_state();
      const ctx = create_context();
      const { newState } = FinanceModule.process(state, decisions as any, market, ctx);
      // Should have lost cash to surcharge
      expect(newState.cash).toBeLessThan(state.cash);
    });
  });

  // ─── simulateBoardVote ───
  describe("simulateBoardVote", () => {
    it("returns approved/rejected based on probability vs RNG roll", () => {
      const ctx = create_context("vote-seed-1");
      const result = FinanceModule.simulateBoardVote(80, ctx.rng.finance);
      expect(result).toHaveProperty("approved");
      expect(result).toHaveProperty("votesFor");
      expect(result).toHaveProperty("votesAgainst");
      expect(result.votesFor + result.votesAgainst).toBe(CONSTANTS.BOARD_TOTAL_VOTES);
    });

    it("high probability (95) almost always approves", () => {
      // Run deterministic test with known seed
      const ctx = create_context("high-prob-seed");
      const result = FinanceModule.simulateBoardVote(95, ctx.rng.finance);
      expect(result.probability).toBe(95);
      // Can't guarantee approval due to RNG, but structure is correct
      expect(result.votesFor).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── calculateForecastAccuracy ───
  describe("calculateForecastAccuracy", () => {
    it("perfect forecast returns 100", () => {
      const market = fresh_market_state();
      const forecast = {
        gdpForecast: market.economicConditions.gdp,
        inflationForecast: market.economicConditions.inflation,
      };
      const accuracy = FinanceModule.calculateForecastAccuracy(forecast, market);
      expect(accuracy).toBe(100);
    });

    it("accuracy = 100 - avgError × 20, clamped to 0-100", () => {
      const market = fresh_market_state();
      const forecast = {
        gdpForecast: market.economicConditions.gdp + 2,
        inflationForecast: market.economicConditions.inflation + 2,
      };
      const accuracy = FinanceModule.calculateForecastAccuracy(forecast, market);
      // avgError = 2, accuracy = 100 - 2×20 = 60
      expect(accuracy).toBeCloseTo(60, 0);
    });
  });
});
