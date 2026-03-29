/**
 * Unit tests for CashEnforcement — auto-funding waterfall.
 */

import { CashEnforcement } from "@/engine/finance/CashEnforcement";
import {
  fresh_company_state,
  fresh_market_state,
  create_context,
} from "../setup";

// ---------------------------------------------------------------------------
// getCashFloor
// ---------------------------------------------------------------------------

describe("getCashFloor", () => {
  it("returns $5M minimum when totalAssets = $50M (asset-based floor < minimum)", () => {
    const state = fresh_company_state({ totalAssets: 50_000_000 });
    // 50M × 0.05 = 2.5M → max(5M, 2.5M) = 5M
    expect(CashEnforcement.getCashFloor(state)).toBe(5_000_000);
  });

  it("returns asset-based floor when totalAssets = $200M", () => {
    const state = fresh_company_state({ totalAssets: 200_000_000 });
    // 200M × 0.05 = 10M → max(5M, 10M) = 10M
    expect(CashEnforcement.getCashFloor(state)).toBe(10_000_000);
  });

  it("returns $5M minimum when totalAssets = $0", () => {
    const state = fresh_company_state({ totalAssets: 0 });
    expect(CashEnforcement.getCashFloor(state)).toBe(5_000_000);
  });

  it("returns $25M when totalAssets = $500M", () => {
    const state = fresh_company_state({ totalAssets: 500_000_000 });
    // 500M × 0.05 = 25M → max(5M, 25M) = 25M
    expect(CashEnforcement.getCashFloor(state)).toBe(25_000_000);
  });

  it("treats negative totalAssets as zero → returns $5M minimum", () => {
    const state = fresh_company_state({ totalAssets: -100_000_000 });
    // max(0, -100M) × 0.05 = 0 → max(5M, 0) = 5M
    expect(CashEnforcement.getCashFloor(state)).toBe(5_000_000);
  });
});

// ---------------------------------------------------------------------------
// enforce — no action needed
// ---------------------------------------------------------------------------

describe("enforce", () => {
  it("returns null when cash is well above the floor", () => {
    const state = fresh_company_state({
      cash: 200_000_000,
      totalAssets: 300_000_000,
    });
    const market = fresh_market_state();
    const ctx = create_context();

    // Floor = max(5M, 300M × 0.05) = 15M; cash = 200M > 15M
    const result = CashEnforcement.enforce(state, market, ctx);
    expect(result).toBeNull();
  });

  it("triggers auto-funding when cash is below the floor", () => {
    const state = fresh_company_state({
      cash: 1_000_000,
      totalAssets: 300_000_000,
      // Provide equity so the loan has capacity
      shareholdersEquity: 200_000_000,
      shortTermDebt: 0,
      longTermDebt: 0,
      revenue: 50_000_000,
    });
    const market = fresh_market_state();
    const ctx = create_context();

    // Floor = max(5M, 300M × 0.05) = 15M; cash = 1M < 15M → triggers
    const result = CashEnforcement.enforce(state, market, ctx);
    expect(result).not.toBeNull();
    expect(result!.messages.length).toBeGreaterThan(0);
  });

  it("auto-funding result contains expected fields", () => {
    const state = fresh_company_state({
      cash: 1_000_000,
      totalAssets: 300_000_000,
      shareholdersEquity: 200_000_000,
      shortTermDebt: 0,
      longTermDebt: 0,
      revenue: 50_000_000,
    });
    const market = fresh_market_state();
    const ctx = create_context();

    const result = CashEnforcement.enforce(state, market, ctx)!;
    expect(result).toHaveProperty("debtAutoIssued");
    expect(result).toHaveProperty("equityRaised");
    expect(result).toHaveProperty("sharesAutoIssued");
    expect(result).toHaveProperty("dilutionPercent");
    expect(result).toHaveProperty("interestRateApplied");
    expect(result).toHaveProperty("boardVoteHeld");
    expect(result).toHaveProperty("boardApproved");
    expect(result).toHaveProperty("liquidityCrisis");
    expect(result).toHaveProperty("messages");
  });

  it("issues a loan when credit is available", () => {
    const state = fresh_company_state({
      cash: 1_000_000,
      totalAssets: 300_000_000,
      shareholdersEquity: 200_000_000,
      shortTermDebt: 0,
      longTermDebt: 0,
      revenue: 50_000_000,
    });
    const market = fresh_market_state();
    const ctx = create_context();

    const result = CashEnforcement.enforce(state, market, ctx)!;
    // With positive equity and revenue, a loan should be attempted
    expect(result.debtAutoIssued).toBeGreaterThan(0);
    expect(result.interestRateApplied).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Interest rate calculation
// ---------------------------------------------------------------------------

describe("interest rate in auto-loan", () => {
  it("applies D/E risk premium above 0.5 threshold", () => {
    // D/E = 1.5 → premium = (1.5 - 0.5) × 0.04 = 0.04
    const state = fresh_company_state({
      cash: 1_000_000,
      totalAssets: 300_000_000,
      shareholdersEquity: 100_000_000,
      shortTermDebt: 100_000_000,
      longTermDebt: 50_000_000,
      revenue: 50_000_000,
    });
    const market = fresh_market_state();
    const ctx = create_context();

    const result = CashEnforcement.enforce(state, market, ctx)!;
    // Base rate = 6% (corporateBond default), D/E = 150M/100M = 1.5
    // premium = (1.5 - 0.5) × 0.04 = 0.04, total ≥ 0.06 + 0.04 = 0.10
    expect(result.interestRateApplied).toBeGreaterThanOrEqual(0.10);
  });

  it("applies distress premium when cash is negative", () => {
    const state = fresh_company_state({
      cash: -5_000_000,
      totalAssets: 300_000_000,
      shareholdersEquity: 200_000_000,
      shortTermDebt: 0,
      longTermDebt: 0,
      revenue: 50_000_000,
    });
    const market = fresh_market_state();
    const ctx = create_context();

    const result = CashEnforcement.enforce(state, market, ctx)!;
    // Base = 0.06, D/E ≈ 0 so no D/E premium, distress +0.03 → 0.09
    expect(result.interestRateApplied).toBeGreaterThanOrEqual(0.09);
  });

  it("caps interest rate at 25%", () => {
    // Extreme D/E to push rate above cap
    const state = fresh_company_state({
      cash: -10_000_000,
      totalAssets: 300_000_000,
      shareholdersEquity: 10_000_000,
      shortTermDebt: 40_000_000,
      longTermDebt: 0,
      revenue: 50_000_000,
    });
    const market = fresh_market_state();
    const ctx = create_context();

    const result = CashEnforcement.enforce(state, market, ctx)!;
    expect(result.interestRateApplied).toBeLessThanOrEqual(0.25);
  });
});
