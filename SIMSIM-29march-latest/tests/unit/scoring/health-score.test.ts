/**
 * Scoring & Financial Health Tests (Prompt 27)
 * Tests health scoring, grade assignment, ratio calculations.
 */

import { CONSTANTS, fresh_company_state } from "../setup";
import { FinanceModule } from "@/engine/modules/FinanceModule";

describe("Financial Health Scoring", () => {
  // ─── Ratio Calculations ───
  describe("Key Ratio Formulas", () => {
    it("ROA = netIncome / totalAssets", () => {
      const state = fresh_company_state({
        netIncome: 20_000_000,
        totalAssets: 200_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      expect(ratios.roa).toBeCloseTo(0.10, 3);
    });

    it("ROE = netIncome / equity", () => {
      const state = fresh_company_state({
        netIncome: 30_000_000,
        shareholdersEquity: 200_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      expect(ratios.roe).toBeCloseTo(0.15, 3);
    });

    it("profitMargin = netIncome / revenue", () => {
      const state = fresh_company_state({
        netIncome: 10_000_000,
        revenue: 100_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      expect(ratios.profitMargin).toBeCloseTo(0.10, 3);
    });

    it("debtToEquity = totalLiabilities / equity", () => {
      const state = fresh_company_state({
        totalLiabilities: 60_000_000,
        shareholdersEquity: 200_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      expect(ratios.debtToEquity).toBeCloseTo(0.30, 2);
    });

    it("cashRatio = cash / currentLiabilities", () => {
      const state = fresh_company_state({
        cash: 50_000_000,
        shortTermDebt: 20_000_000,
        accountsPayable: 5_000_000,
      });
      const ratios = FinanceModule.calculateRatios(state);
      // cashRatio = 50M / 25M = 2.0
      expect(ratios.cashRatio).toBeCloseTo(2.0, 1);
    });
  });

  // ─── getRatioHealth Thresholds ───
  describe("Ratio Health Thresholds", () => {
    const healthTests: Array<{
      ratio: keyof ReturnType<typeof FinanceModule.calculateRatios>;
      greenValue: number;
      yellowValue: number;
      redValue: number;
    }> = [
      { ratio: "currentRatio", greenValue: 2.5, yellowValue: 1.5, redValue: 0.8 },
      { ratio: "quickRatio", greenValue: 2.0, yellowValue: 1.2, redValue: 0.5 },
      { ratio: "cashRatio", greenValue: 0.8, yellowValue: 0.3, redValue: 0.1 },
      { ratio: "debtToEquity", greenValue: 0.2, yellowValue: 0.5, redValue: 1.0 },
      { ratio: "roe", greenValue: 0.20, yellowValue: 0.10, redValue: 0.03 },
      { ratio: "roa", greenValue: 0.10, yellowValue: 0.06, redValue: 0.02 },
      { ratio: "profitMargin", greenValue: 0.20, yellowValue: 0.10, redValue: 0.02 },
    ];

    for (const { ratio, greenValue, yellowValue, redValue } of healthTests) {
      it(`${ratio}: green at ${greenValue}`, () => {
        expect(FinanceModule.getRatioHealth(ratio, greenValue).status).toBe("green");
      });

      it(`${ratio}: yellow at ${yellowValue}`, () => {
        expect(FinanceModule.getRatioHealth(ratio, yellowValue).status).toBe("yellow");
      });

      it(`${ratio}: red at ${redValue}`, () => {
        expect(FinanceModule.getRatioHealth(ratio, redValue).status).toBe("red");
      });
    }
  });

  // ─── Financial Constants Validation ───
  describe("Financial Constants", () => {
    it("base PE ratio is 15", () => {
      expect(CONSTANTS.BASE_PE_RATIO).toBe(15);
    });

    it("PE ratio range is [5, 30]", () => {
      expect(CONSTANTS.MIN_PE_RATIO).toBe(5);
      expect(CONSTANTS.MAX_PE_RATIO).toBe(30);
    });

    it("credit frozen at D/E > 2.0", () => {
      expect(CONSTANTS.CREDIT_FROZEN_DE_THRESHOLD).toBe(2.0);
    });

    it("board satisfaction baseline is 50", () => {
      expect(CONSTANTS.BOARD_SATISFACTION_BASELINE).toBe(50);
    });

    it("board has 6 total votes", () => {
      expect(CONSTANTS.BOARD_TOTAL_VOTES).toBe(6);
    });

    it("default starting cash is $175M", () => {
      expect(CONSTANTS.DEFAULT_STARTING_CASH).toBe(175_000_000);
    });

    it("default share price is $50", () => {
      expect(CONSTANTS.DEFAULT_SHARE_PRICE).toBe(50);
    });

    it("default shares issued is 10M", () => {
      expect(CONSTANTS.DEFAULT_SHARES_ISSUED).toBe(10_000_000);
    });
  });
});
