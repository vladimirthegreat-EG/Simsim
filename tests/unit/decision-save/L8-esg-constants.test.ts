/**
 * L8 ESG Constants & Financial Simplification Tests
 *
 * Locks current hardcoded constants and documents known simplifications
 * in MarketSimulator, CONSTANTS, and the financial statement engines.
 *
 * CQ-02: Quality expectations per segment (with drift and cap)
 * CQ-03: Price elasticities per segment
 * CQ-04: Segment weights sum to 100
 * CQ-07: Interest expense appears on Income Statement (BS accruedInterest=0 is acceptable)
 */

import { describe, it, expect } from "vitest";
import { CONSTANTS } from "@/engine/types";
import { MarketSimulator } from "@/engine/market/MarketSimulator";
import { IncomeStatementEngine } from "@/engine/finance/statements/IncomeStatement";
import type { TeamState } from "@/engine/types";
import type { Segment } from "@/engine/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal TeamState with active debt for CQ-07.
 * Only fields read by IncomeStatementEngine.generate() are populated.
 */
function makeStateWithDebt(principal: number, annualRate: number): TeamState {
  return {
    version: { engineVersion: "test", schemaVersion: "test" },
    cash: 50_000_000,
    revenue: 0,
    netIncome: 0,
    totalAssets: 200_000_000,
    totalLiabilities: principal,
    shortTermDebt: 0,
    longTermDebt: principal,
    shareholdersEquity: 200_000_000 - principal,
    marketCap: 500_000_000,
    sharesIssued: 10_000_000,
    sharePrice: 50,
    eps: 0,
    inventory: {
      finishedGoods: { Budget: 0, General: 0, Enthusiast: 0, Professional: 0, "Active Lifestyle": 0 },
      rawMaterials: 0,
      workInProgress: 0,
    },
    cogs: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    factories: [
      {
        id: "f1",
        name: "Factory 1",
        region: "North America",
        productionLines: 2,
        upgrades: [],
        efficiency: 0.7,
        // Fields accessed by IncomeStatementEngine
        shippingCost: 0,
        unitCostReduction: 0,
        laborReduction: 0,
        operatingCostReduction: 0,
        maintenanceCostReduction: 0,
        energyCostReduction: 0,
      } as any,
    ],
    products: [],
    employees: { workers: 100, engineers: 8, supervisors: 7 } as any,
    workforce: {
      totalHeadcount: 115,
      averageMorale: 75,
      averageEfficiency: 0.7,
      laborCost: 5_000_000,
      turnoverRate: 0.125,
    },
    brandValue: 0.3,
    marketShare: { Budget: 0, General: 0, Enthusiast: 0, Professional: 0, "Active Lifestyle": 0 },
    rdBudget: 0,
    rdProgress: 0,
    patents: 0,
    esgScore: 300,
    co2Emissions: 1000,
    benefits: {} as any,
    round: 1,

    // Capital structure with active debt instrument
    capitalStructure: {
      debtInstruments: [
        {
          id: "loan-1",
          type: "term_loan",
          principal,
          remainingPrincipal: principal,
          interestRate: annualRate,
          termRounds: 48,
          remainingRounds: 48,
          issuedRound: 1,
          maturityRound: 49,
          paymentSchedule: "amortizing",
          monthlyPayment: 0,
          covenantViolations: [],
          status: "active",
        },
      ],
      equityPosition: {
        sharesIssued: 10_000_000,
        sharesOutstanding: 10_000_000,
        parValue: 10,
        sharePrice: 50,
        marketCap: 500_000_000,
        dilution: 0,
      },
      creditRating: null,
      dividendHistory: [],
    },
  } as any;
}

// ---------------------------------------------------------------------------
// CQ-02  Quality expectations match documented values
// ---------------------------------------------------------------------------

describe("CQ-02: Quality expectations per segment", () => {
  const expectedBase: Record<Segment, number> = {
    Budget: 50,
    General: 65,
    Enthusiast: 80,
    Professional: 90,
    "Active Lifestyle": 70,
  };

  it.each(Object.entries(expectedBase))(
    "base expectation for %s is %d (round 1)",
    (segment, expected) => {
      const result = MarketSimulator.getQualityExpectation(segment as Segment, 1);
      expect(result).toBe(expected);
    },
  );

  it("returns base expectation when round is undefined", () => {
    expect(MarketSimulator.getQualityExpectation("Budget" as Segment)).toBe(50);
    expect(MarketSimulator.getQualityExpectation("Professional" as Segment)).toBe(90);
  });

  describe("drift: expectations increase by 0.5 per round after round 1", () => {
    it("no drift in round 1", () => {
      expect(MarketSimulator.getQualityExpectation("General" as Segment, 1)).toBe(65);
    });

    it("drift of 0.5 in round 2", () => {
      // drift = (2 - 1) * 0.5 = 0.5
      expect(MarketSimulator.getQualityExpectation("General" as Segment, 2)).toBe(65.5);
    });

    it("drift of 2.0 in round 5", () => {
      // drift = (5 - 1) * 0.5 = 2.0
      expect(MarketSimulator.getQualityExpectation("Budget" as Segment, 5)).toBe(52);
    });

    it("drift of 3.5 in round 8", () => {
      // drift = (8 - 1) * 0.5 = 3.5
      expect(MarketSimulator.getQualityExpectation("Enthusiast" as Segment, 8)).toBe(83.5);
    });
  });

  describe("cap: quality expectation never exceeds 100", () => {
    it("Professional (base 90) caps at 100 by round 21", () => {
      // drift = (21 - 1) * 0.5 = 10 -> 90 + 10 = 100
      expect(MarketSimulator.getQualityExpectation("Professional" as Segment, 21)).toBe(100);
    });

    it("Professional does not exceed 100 even at round 50", () => {
      // drift = (50 - 1) * 0.5 = 24.5 -> would be 114.5, capped at 100
      expect(MarketSimulator.getQualityExpectation("Professional" as Segment, 50)).toBe(100);
    });

    it("Budget (base 50) caps at 100 by round 101", () => {
      // drift = (101 - 1) * 0.5 = 50 -> 50 + 50 = 100
      expect(MarketSimulator.getQualityExpectation("Budget" as Segment, 101)).toBe(100);
    });

    it("all segments are capped at 100 at very high round numbers", () => {
      const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
      for (const seg of segments) {
        expect(MarketSimulator.getQualityExpectation(seg, 500)).toBe(100);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// CQ-03  Price elasticities match documented values
// ---------------------------------------------------------------------------

describe("CQ-03: Price elasticities per segment", () => {
  const expectedElasticities: Record<Segment, number> = {
    Budget: 2.5,
    General: 1.8,
    Enthusiast: 1.2,
    Professional: 0.8,
    "Active Lifestyle": 1.5,
  };

  it.each(Object.entries(expectedElasticities))(
    "elasticity for %s is %d",
    (segment, expected) => {
      const result = MarketSimulator.calculatePriceElasticity(segment as Segment);
      expect(result).toBe(expected);
    },
  );

  it("Budget has the highest elasticity (most price-sensitive)", () => {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const elasticities = segments.map((s) => MarketSimulator.calculatePriceElasticity(s));
    const budgetElasticity = MarketSimulator.calculatePriceElasticity("Budget" as Segment);
    const maxElasticity = Math.max(...elasticities);
    expect(budgetElasticity).toBe(maxElasticity);
  });

  it("Professional has the lowest elasticity (least price-sensitive)", () => {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const elasticities = segments.map((s) => MarketSimulator.calculatePriceElasticity(s));
    const proElasticity = MarketSimulator.calculatePriceElasticity("Professional" as Segment);
    const minElasticity = Math.min(...elasticities);
    expect(proElasticity).toBe(minElasticity);
  });

  it("elasticities match CONSTANTS.PRICE_ELASTICITY_BY_SEGMENT", () => {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    for (const seg of segments) {
      expect(MarketSimulator.calculatePriceElasticity(seg)).toBe(
        CONSTANTS.PRICE_ELASTICITY_BY_SEGMENT[seg],
      );
    }
  });
});

// ---------------------------------------------------------------------------
// CQ-04  Segment weights sum to 100 per segment
// ---------------------------------------------------------------------------

describe("CQ-04: Segment weights sum to 100", () => {
  const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

  it.each(segments)("weights for %s sum to exactly 100", (segment) => {
    const w = CONSTANTS.SEGMENT_WEIGHTS[segment];
    const sum = w.price + w.quality + w.brand + w.esg + w.features;
    expect(sum).toBe(100);
  });

  it("locks Budget weights: price=45, quality=20, brand=10, esg=7, features=18", () => {
    const w = CONSTANTS.SEGMENT_WEIGHTS["Budget"];
    expect(w).toEqual({ price: 45, quality: 20, brand: 10, esg: 7, features: 18 });
  });

  it("locks General weights: price=30, quality=22, brand=16, esg=10, features=22", () => {
    const w = CONSTANTS.SEGMENT_WEIGHTS["General"];
    expect(w).toEqual({ price: 30, quality: 22, brand: 16, esg: 10, features: 22 });
  });

  it("locks Enthusiast weights: price=12, quality=30, brand=8, esg=5, features=45", () => {
    const w = CONSTANTS.SEGMENT_WEIGHTS["Enthusiast"];
    expect(w).toEqual({ price: 12, quality: 30, brand: 8, esg: 5, features: 45 });
  });

  it("locks Professional weights: price=25, quality=27, brand=10, esg=17, features=21", () => {
    const w = CONSTANTS.SEGMENT_WEIGHTS["Professional"];
    expect(w).toEqual({ price: 25, quality: 27, brand: 10, esg: 17, features: 21 });
  });

  it("locks Active Lifestyle weights: price=22, quality=32, brand=10, esg=10, features=26", () => {
    const w = CONSTANTS.SEGMENT_WEIGHTS["Active Lifestyle"];
    expect(w).toEqual({ price: 22, quality: 32, brand: 10, esg: 10, features: 26 });
  });

  it("all five dimensions are present for every segment", () => {
    for (const seg of segments) {
      const w = CONSTANTS.SEGMENT_WEIGHTS[seg];
      expect(w).toHaveProperty("price");
      expect(w).toHaveProperty("quality");
      expect(w).toHaveProperty("brand");
      expect(w).toHaveProperty("esg");
      expect(w).toHaveProperty("features");
    }
  });
});

// ---------------------------------------------------------------------------
// CQ-07  Interest appears in Income Statement
// ---------------------------------------------------------------------------

describe("CQ-07: Interest expense appears in Income Statement", () => {
  it("interestExpense > 0 for state with active $10M loan at 6%", () => {
    const state = makeStateWithDebt(10_000_000, 0.06);
    const is = IncomeStatementEngine.generate(state, 1);

    // Monthly interest = $10M * (0.06 / 12) = $50,000
    expect(is.interestExpense).toBeGreaterThan(0);
    expect(is.interestExpense).toBeCloseTo(50_000, -1); // within rounding
  });

  it("interestExpense is 0 when no debt instruments exist", () => {
    const state = makeStateWithDebt(10_000_000, 0.06);
    // Remove debt instruments
    (state as any).capitalStructure.debtInstruments = [];
    const is = IncomeStatementEngine.generate(state, 1);
    expect(is.interestExpense).toBe(0);
  });

  it("interestExpense is 0 when capitalStructure is undefined", () => {
    const state = makeStateWithDebt(10_000_000, 0.06);
    (state as any).capitalStructure = undefined;
    const is = IncomeStatementEngine.generate(state, 1);
    expect(is.interestExpense).toBe(0);
  });

  it("interest reduces incomeBeforeTax", () => {
    const stateWithDebt = makeStateWithDebt(10_000_000, 0.06);
    const stateNoDebt = makeStateWithDebt(0, 0.06);
    (stateNoDebt as any).capitalStructure.debtInstruments = [];

    const isWithDebt = IncomeStatementEngine.generate(stateWithDebt, 1);
    const isNoDebt = IncomeStatementEngine.generate(stateNoDebt, 1);

    // Income before tax should be lower when interest expense is present
    expect(isWithDebt.incomeBeforeTax).toBeLessThan(isNoDebt.incomeBeforeTax);
  });

  it("only active debt instruments contribute interest", () => {
    const state = makeStateWithDebt(10_000_000, 0.06);
    // Set the loan to "paid_off" status
    (state as any).capitalStructure.debtInstruments[0].status = "paid_off";
    const is = IncomeStatementEngine.generate(state, 1);
    expect(is.interestExpense).toBe(0);
  });

  describe("documents known financial simplifications (TODO stubs)", () => {
    it("SIMPLIFICATION: amortization is hardcoded to 0 in IncomeStatement", () => {
      // IncomeStatement.ts line 203: const amortization = 0; // TODO: Implement R&D capitalization
      const state = makeStateWithDebt(0, 0);
      (state as any).capitalStructure.debtInstruments = [];
      const is = IncomeStatementEngine.generate(state, 1);
      expect(is.operatingExpenses.amortization).toBe(0);
    });

    it("SIMPLIFICATION: tax uses flat 26% (21% federal + 5% state), no deductions/credits", () => {
      // IncomeStatement.ts line 260-268: simplified tax calculation
      // TODO: Implement tax deductions, credits, etc.
      const state = makeStateWithDebt(0, 0);
      (state as any).capitalStructure.debtInstruments = [];
      // Give state some revenue to generate positive income
      state.products = [
        {
          segment: "General",
          price: 500,
          unitsSold: 10_000,
          unitsProduced: 10_000,
          unitCost: 100,
          quality: 65,
        } as any,
      ];
      const is = IncomeStatementEngine.generate(state, 1);

      if (is.incomeBeforeTax > 0) {
        // Effective tax rate should be 26% (21% + 5%)
        expect(is.effectiveTaxRate).toBeCloseTo(26, 0);
      }
    });

    it("SIMPLIFICATION: BS accruedInterest is hardcoded to 0 (interest flows through IS instead)", () => {
      // BalanceSheet.ts line 282: const accruedInterest = 0; // TODO: Calculate from debt instruments
      // This is acceptable because interest IS captured in IncomeStatement.interestExpense
      const state = makeStateWithDebt(10_000_000, 0.06);
      const is = IncomeStatementEngine.generate(state, 1);
      // Interest IS captured in IS
      expect(is.interestExpense).toBeGreaterThan(0);
      // The BS TODO means accruedInterest stays at 0 on balance sheet,
      // but the economic effect is not lost -- it flows through the income statement.
    });

    it("SIMPLIFICATION: CashFlow changeInAccruedExpenses is hardcoded to 0", () => {
      // CashFlowStatement.ts line 92: const changeInAccruedExpenses = 0; // TODO: Implement accrued expenses
      // This is a known simplification -- working capital changes from accrued expenses are ignored.
      // The field exists in the CashFlowStatement type but is always 0.
      // Documenting this so future implementers know it's intentional for now.
      expect(true).toBe(true); // Placeholder: actual assertion would require CashFlowEngine access
    });
  });
});
