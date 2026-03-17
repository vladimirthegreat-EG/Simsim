/**
 * Unit tests for RDModule static calculation methods.
 */

import { RDModule } from "@/engine/modules/RDModule";
import {
  create_employee,
  create_context,
  fresh_company_state,
  CONSTANTS,
} from "../setup";

// ---------------------------------------------------------------------------
// calculateTotalRDOutput
// ---------------------------------------------------------------------------

describe("calculateTotalRDOutput", () => {
  // NOTE: The code uses (stats.innovation || 50), so innovation=0 falls back to 50.
  // innovationBonus = 1 + 50/200 = 1.25 when innovation is 0.

  it("one engineer with perfect stats and innovation=100 yields 22.5", () => {
    const eng = create_employee("engineer", { efficiency: 100, speed: 100, innovation: 100 });
    eng.burnout = 0;
    expect(RDModule.calculateTotalRDOutput([eng])).toBeCloseTo(22.5);
  });

  it("one engineer with perfect stats and innovation=0 yields 18.75 (fallback to 50)", () => {
    const eng = create_employee("engineer", { efficiency: 100, speed: 100, innovation: 0 });
    eng.burnout = 0;
    // innovation || 50 => 50; bonus = 1 + 50/200 = 1.25; 15 × 1.0 × 1.0 × 1.25 × 1.0 = 18.75
    expect(RDModule.calculateTotalRDOutput([eng])).toBeCloseTo(18.75);
  });

  it("zero engineers returns 0", () => {
    expect(RDModule.calculateTotalRDOutput([])).toBe(0);
  });

  it("three engineers sum their individual outputs", () => {
    const eng1 = create_employee("engineer", { efficiency: 100, speed: 100, innovation: 100 });
    eng1.burnout = 0;
    const eng2 = create_employee("engineer", { efficiency: 50, speed: 50, innovation: 100 });
    eng2.burnout = 0;
    const eng3 = create_employee("engineer", { efficiency: 100, speed: 100, innovation: 200 });
    eng3.burnout = 0;

    // eng1: 15 × 1.0 × 1.0 × 1.5 × 1.0 = 22.5
    // eng2: 15 × 0.5 × 0.5 × 1.5 × 1.0 = 5.625
    // eng3: 15 × 1.0 × 1.0 × (1 + 200/200) × 1.0 = 15 × 2.0 = 30
    const expected = 22.5 + 5.625 + 30;
    expect(RDModule.calculateTotalRDOutput([eng1, eng2, eng3])).toBeCloseTo(expected);
  });

  it("burnout reduces output: burnout=100 halves output", () => {
    const eng = create_employee("engineer", { efficiency: 100, speed: 100, innovation: 100 });
    eng.burnout = 100;
    // 15 × 1.0 × 1.0 × 1.5 × (1 - 100/200) = 22.5 × 0.5 = 11.25
    expect(RDModule.calculateTotalRDOutput([eng])).toBeCloseTo(11.25);
  });
});

// ---------------------------------------------------------------------------
// calculateDevelopmentCost
// ---------------------------------------------------------------------------

describe("calculateDevelopmentCost", () => {
  it("General segment at quality 50 costs $10M", () => {
    // multiplier = 1 + (50-50)/50 = 1.0
    expect(RDModule.calculateDevelopmentCost("General", 50)).toBe(10_000_000);
  });

  it("General segment at quality 100 costs $20M", () => {
    // multiplier = 1 + (100-50)/50 = 2.0
    expect(RDModule.calculateDevelopmentCost("General", 100)).toBe(20_000_000);
  });

  it("Professional segment at quality 75 costs $52.5M", () => {
    // multiplier = 1 + (75-50)/50 = 1.5; 35M × 1.5 = 52.5M
    expect(RDModule.calculateDevelopmentCost("Professional", 75)).toBe(52_500_000);
  });

  it("Budget segment at quality 50 costs $5M", () => {
    expect(RDModule.calculateDevelopmentCost("Budget", 50)).toBe(5_000_000);
  });

  it("Enthusiast segment at quality 75 costs $30M", () => {
    // 20M × 1.5 = 30M
    expect(RDModule.calculateDevelopmentCost("Enthusiast", 75)).toBe(30_000_000);
  });
});

// ---------------------------------------------------------------------------
// calculateImprovementCost
// ---------------------------------------------------------------------------

describe("calculateImprovementCost", () => {
  it("quality from 60 to 65 (5 pts below 70) costs $5M", () => {
    // 5 points × $1M = $5M
    expect(RDModule.calculateImprovementCost(5, 0, 60, 50)).toBe(5_000_000);
  });

  it("quality from 65 to 75 (crosses 70 boundary) costs $12.5M", () => {
    // levels 65-69: 5 × $1M = $5M; levels 70-74: 5 × $1.5M = $7.5M
    expect(RDModule.calculateImprovementCost(10, 0, 65, 50)).toBe(12_500_000);
  });

  it("quality from 80 to 85 costs $12.5M at $2.5M/pt", () => {
    expect(RDModule.calculateImprovementCost(5, 0, 80, 50)).toBe(12_500_000);
  });

  it("quality from 90 to 95 costs $25M at $5M/pt", () => {
    expect(RDModule.calculateImprovementCost(5, 0, 90, 50)).toBe(25_000_000);
  });

  it("features cost half the quality rate", () => {
    // 5 feature points from 60: 5 × $500K = $2.5M
    expect(RDModule.calculateImprovementCost(0, 5, 50, 60)).toBe(2_500_000);
  });

  it("quality + features costs are additive", () => {
    // quality: 5 pts from 60 → 5 × $1M = $5M
    // features: 5 pts from 60 → 5 × $500K = $2.5M
    expect(RDModule.calculateImprovementCost(5, 5, 60, 60)).toBe(7_500_000);
  });
});

// ---------------------------------------------------------------------------
// calculatePatentValue
// ---------------------------------------------------------------------------

describe("calculatePatentValue", () => {
  it("3 patents with 10000 units sold gives qualityBonus=15", () => {
    const result = RDModule.calculatePatentValue(3, 10_000);
    // min(25, 3×5) × min(1.0, 10000/10000) = 15 × 1.0
    expect(result.qualityBonus).toBe(15);
    expect(result.costReduction).toBeCloseTo(0.15);
    expect(result.marketShareBonus).toBeCloseTo(0.09);
  });

  it("3 patents with 0 units sold gives zero bonuses (EXPLOIT-01 gate)", () => {
    const result = RDModule.calculatePatentValue(3, 0);
    expect(result.qualityBonus).toBe(0);
    expect(result.costReduction).toBe(0);
    expect(result.marketShareBonus).toBe(0);
  });

  it("10 patents with 50000 units sold caps qualityBonus at 25", () => {
    const result = RDModule.calculatePatentValue(10, 50_000);
    // min(25, 10×5) × min(1.0, 50000/10000) = min(25,50) × 1.0 = 25
    expect(result.qualityBonus).toBe(25);
    expect(result.costReduction).toBeCloseTo(0.25); // min(0.25, 10×0.05) = 0.25
    expect(result.marketShareBonus).toBeCloseTo(0.15); // min(0.15, 10×0.03) = 0.15
  });

  it("partial production gate scales bonuses linearly", () => {
    const result = RDModule.calculatePatentValue(3, 5_000);
    // productionGate = 5000/10000 = 0.5
    expect(result.qualityBonus).toBeCloseTo(15 * 0.5);
    expect(result.costReduction).toBeCloseTo(0.15 * 0.5);
    expect(result.marketShareBonus).toBeCloseTo(0.09 * 0.5);
  });
});

// ---------------------------------------------------------------------------
// R&D Budget Points (via process)
// ---------------------------------------------------------------------------

describe("R&D budget points", () => {
  it("$10M budget generates 100 R&D points", () => {
    const state = fresh_company_state();
    state.rdProgress = 0;
    const ctx = create_context();

    const { newState } = RDModule.process(state, { rdBudget: 10_000_000 }, ctx);

    // Budget points: floor(10M / 100K) = 100, plus engineer output
    const engineers = state.employees.filter(e => e.role === "engineer");
    const engineerOutput = RDModule.calculateTotalRDOutput(engineers);
    const budgetPoints = Math.min(200, Math.floor(10_000_000 / 100_000));
    expect(budgetPoints).toBe(100);
    expect(newState.rdProgress).toBeCloseTo(engineerOutput + 100);
  });

  it("$20M budget generates 200 points (capped)", () => {
    const state = fresh_company_state();
    state.rdProgress = 0;
    const ctx = create_context();

    const { newState } = RDModule.process(state, { rdBudget: 20_000_000 }, ctx);

    const engineers = state.employees.filter(e => e.role === "engineer");
    const engineerOutput = RDModule.calculateTotalRDOutput(engineers);
    expect(newState.rdProgress).toBeCloseTo(engineerOutput + 200);
  });

  it("$30M budget still generates only 200 points (excess wasted)", () => {
    const state = fresh_company_state();
    state.rdProgress = 0;
    const ctx = create_context();

    const { newState, result } = RDModule.process(state, { rdBudget: 30_000_000 }, ctx);

    const engineers = state.employees.filter(e => e.role === "engineer");
    const engineerOutput = RDModule.calculateTotalRDOutput(engineers);
    // raw = floor(30M/100K) = 300, capped at 200
    expect(newState.rdProgress).toBeCloseTo(engineerOutput + 200);
    expect(result.messages.some(m => m.includes("wasted"))).toBe(true);
  });
});
