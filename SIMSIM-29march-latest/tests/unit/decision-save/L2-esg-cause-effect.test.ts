/**
 * L2 — Cause-and-Effect Validity Tests
 *
 * Verifies that the engine's core formulas produce correct causal relationships:
 *   1. R&D investment -> better product quality & tech unlocks
 *   2. ESG score tier -> revenue bonus/penalty
 *   3. Marketing (branding) investment -> brand value growth that compounds
 *
 * All tests use SimulationEngine.processRound() end-to-end.
 */

import { describe, it, expect } from "vitest";
import {
  SimulationEngine,
  type SimulationInput,
} from "@/engine/core/SimulationEngine";
import type { AllDecisions } from "@/engine/types/decisions";
import type { TeamState } from "@/engine/types/state";
import type { MarketState } from "@/engine/types/market";
import { CONSTANTS } from "@/engine/types";

// ============================================
// HELPERS
// ============================================

/** Deterministic seed for reproducibility across test runs. */
const SEED = "L2-cause-effect-seed";

/** Create a fresh initial team state with optional overrides. */
function makeTeamState(overrides?: Partial<TeamState>): TeamState {
  return SimulationEngine.createInitialTeamState(overrides);
}

/** Create the default market state. */
function makeMarketState(): MarketState {
  return SimulationEngine.createInitialMarketState();
}

/** Minimal decisions — no spending. */
function emptyDecisions(): AllDecisions {
  return {
    factory: {},
    hr: {},
    rd: {},
    marketing: {},
    finance: {},
  };
}

/**
 * Run N rounds sequentially for a single team, feeding the output state
 * of round N as the input state for round N+1.
 *
 * Returns the final TeamState and all intermediate RoundResults.
 */
function runRounds(
  initialState: TeamState,
  decisionsFn: (round: number) => AllDecisions,
  rounds: number,
  teamId: string = "team-1",
): { finalState: TeamState; results: ReturnType<typeof SimulationEngine.processRound>[] } {
  let state = initialState;
  let market = makeMarketState();
  const allOutputs: ReturnType<typeof SimulationEngine.processRound>[] = [];

  for (let r = 1; r <= rounds; r++) {
    const input: SimulationInput = {
      roundNumber: r,
      teams: [{ id: teamId, state, decisions: decisionsFn(r) }],
      marketState: market,
      matchSeed: SEED,
    };
    const output = SimulationEngine.processRound(input);
    allOutputs.push(output);

    // Advance state for next round
    const teamResult = output.results.find((res) => res.teamId === teamId);
    state = teamResult!.newState;
    market = output.newMarketState;
  }

  return { finalState: state, results: allOutputs };
}

/**
 * Run a single round with multiple teams competing in the same market.
 */
function runMultiTeamRound(
  teams: Array<{ id: string; state: TeamState; decisions: AllDecisions }>,
  roundNumber: number = 1,
): ReturnType<typeof SimulationEngine.processRound> {
  const input: SimulationInput = {
    roundNumber,
    teams,
    marketState: makeMarketState(),
    matchSeed: SEED,
  };
  return SimulationEngine.processRound(input);
}

// ============================================
// TEST 1 — R&D investment leads to better products
// ============================================

describe("Test 1: R&D investment -> better products", () => {
  const ROUNDS = 3;
  const HIGH_RD_BUDGET = 15_000_000;
  const LOW_RD_BUDGET = 1_000_000;

  it("Team A (high R&D) has higher rdProgress than Team B (low R&D) after 3 rounds", () => {
    const stateA = makeTeamState();
    const stateB = makeTeamState();

    const { finalState: finalA } = runRounds(
      stateA,
      () => ({
        ...emptyDecisions(),
        rd: { rdBudget: HIGH_RD_BUDGET },
      }),
      ROUNDS,
      "team-a",
    );

    const { finalState: finalB } = runRounds(
      stateB,
      () => ({
        ...emptyDecisions(),
        rd: { rdBudget: LOW_RD_BUDGET },
      }),
      ROUNDS,
      "team-b",
    );

    // rdProgress is the engine's "tech level" accumulator.
    // $15M/round => 150 pts/round (capped at 200) + engineer output per round
    // $1M/round  =>  10 pts/round + engineer output per round
    expect(finalA.rdProgress).toBeGreaterThan(finalB.rdProgress);
  });

  it("Team A (high R&D) unlocks more technologies than Team B (low R&D)", () => {
    const stateA = makeTeamState();
    const stateB = makeTeamState();

    const { finalState: finalA } = runRounds(
      stateA,
      () => ({
        ...emptyDecisions(),
        rd: { rdBudget: HIGH_RD_BUDGET },
      }),
      ROUNDS,
      "team-a",
    );

    const { finalState: finalB } = runRounds(
      stateB,
      () => ({
        ...emptyDecisions(),
        rd: { rdBudget: LOW_RD_BUDGET },
      }),
      ROUNDS,
      "team-b",
    );

    const techsA = finalA.unlockedTechnologies?.length ?? 0;
    const techsB = finalB.unlockedTechnologies?.length ?? 0;

    // High R&D should unlock at least one tech; low R&D may unlock none or fewer.
    expect(techsA).toBeGreaterThanOrEqual(techsB);
    // Additionally, high R&D at $15M for 3 rounds should unlock at least
    // process_optimization (threshold 100 rdProgress), since budget alone
    // contributes 150 pts/round.
    expect(techsA).toBeGreaterThan(0);
  });

  it("Team A products have higher quality than Team B after R&D + improvements", () => {
    // Both start identical. Team A invests in R&D AND product improvements.
    // Team B invests minimal R&D and no improvements.
    const stateA = makeTeamState();
    const stateB = makeTeamState();

    // Pick the first launched product to improve
    const productIdToImprove = stateA.products.find(
      (p) => p.developmentStatus === "launched",
    )?.id;

    const { finalState: finalA } = runRounds(
      stateA,
      () => ({
        ...emptyDecisions(),
        rd: {
          rdBudget: HIGH_RD_BUDGET,
          productImprovements: productIdToImprove
            ? [{ productId: productIdToImprove, qualityIncrease: 5, featuresIncrease: 3 }]
            : [],
        },
      }),
      ROUNDS,
      "team-a",
    );

    const { finalState: finalB } = runRounds(
      stateB,
      () => ({
        ...emptyDecisions(),
        rd: { rdBudget: LOW_RD_BUDGET },
      }),
      ROUNDS,
      "team-b",
    );

    // Find matching products
    const productA = finalA.products.find((p) => p.id === productIdToImprove);
    const productB = finalB.products.find((p) => p.id === productIdToImprove);

    expect(productA).toBeDefined();
    expect(productB).toBeDefined();

    // Team A invested in quality improvements; Team B did not.
    // Both products experience aging decay, but Team A's improvements offset it.
    expect(productA!.quality).toBeGreaterThan(productB!.quality);
  });
});

// ============================================
// TEST 2 — ESG score tier affects revenue
// ============================================

describe("Test 2: ESG score tier -> revenue impact", () => {
  it("revenue(HIGH ESG) > revenue(MID ESG) > revenue(LOW ESG) in same market", () => {
    // Three teams with identical state except ESG scores.
    // LOW tier: esgScore=200 (below 300 -> penalty zone)
    // MID tier: esgScore=550 (300-700 -> bonus ramp)
    // HIGH tier: esgScore=750 (700+ -> max +5% bonus)
    const baseState = makeTeamState();

    const stateA = { ...makeTeamState(), esgScore: 200 } as TeamState;
    const stateB = { ...makeTeamState(), esgScore: 550 } as TeamState;
    const stateC = { ...makeTeamState(), esgScore: 750 } as TeamState;

    // All teams use the same minimal decisions so the ONLY differentiator is ESG.
    const decisions = emptyDecisions();

    const output = runMultiTeamRound([
      { id: "low-esg", state: stateA, decisions },
      { id: "mid-esg", state: stateB, decisions },
      { id: "high-esg", state: stateC, decisions },
    ]);

    const revenueA = output.results.find((r) => r.teamId === "low-esg")!.totalRevenue;
    const revenueB = output.results.find((r) => r.teamId === "mid-esg")!.totalRevenue;
    const revenueC = output.results.find((r) => r.teamId === "high-esg")!.totalRevenue;

    // ESG affects revenue through two channels:
    //   1. applyESGEvents: direct revenue modifier (penalty below 300, bonus ramp 300-700, cap at 700+)
    //   2. calculateTeamPosition: esgScore contributes to segment scoring via SEGMENT_WEIGHTS.esg
    // Both channels favor higher ESG, so C > B > A.
    expect(revenueC).toBeGreaterThan(revenueB);
    expect(revenueB).toBeGreaterThan(revenueA);
  });

  it("LOW ESG team receives a revenue penalty (score < 300)", () => {
    // A team with esgScore=0 should get the maximum penalty (-12%).
    // Compare against a team at exactly 300 (no penalty, no bonus).
    const stateZero = { ...makeTeamState(), esgScore: 0 } as TeamState;
    const stateThreshold = { ...makeTeamState(), esgScore: 300 } as TeamState;
    const decisions = emptyDecisions();

    const output = runMultiTeamRound([
      { id: "zero-esg", state: stateZero, decisions },
      { id: "threshold-esg", state: stateThreshold, decisions },
    ]);

    const revenueZero = output.results.find((r) => r.teamId === "zero-esg")!.totalRevenue;
    const revenueThreshold = output.results.find((r) => r.teamId === "threshold-esg")!.totalRevenue;

    // Zero ESG gets -12% penalty; 300 gets 0% modifier.
    // Even accounting for the esg dimension in scoring, zero should lag behind.
    expect(revenueThreshold).toBeGreaterThan(revenueZero);
  });

  it("ESG penalty is proportional — esgScore=100 penalized more than esgScore=250", () => {
    const state100 = { ...makeTeamState(), esgScore: 100 } as TeamState;
    const state250 = { ...makeTeamState(), esgScore: 250 } as TeamState;
    const decisions = emptyDecisions();

    const output = runMultiTeamRound([
      { id: "esg-100", state: state100, decisions },
      { id: "esg-250", state: state250, decisions },
    ]);

    const revenue100 = output.results.find((r) => r.teamId === "esg-100")!.totalRevenue;
    const revenue250 = output.results.find((r) => r.teamId === "esg-250")!.totalRevenue;

    // esgScore=100 => penalty = -(1 - 100/300) * 0.12 = -8%
    // esgScore=250 => penalty = -(1 - 250/300) * 0.12 = -0.67%
    // So 250 should have higher revenue.
    expect(revenue250).toBeGreaterThan(revenue100);
  });
});

// ============================================
// TEST 3 — Marketing investment creates brand value
// ============================================

describe("Test 3: Marketing (branding) investment -> brand value growth", () => {
  const ROUNDS = 3;
  const HIGH_BRANDING = 5_000_000;
  const ZERO_BRANDING = 0;

  it("Team A (branding $5M/round) has higher brandValue than Team B ($0) after 3 rounds", () => {
    const stateA = makeTeamState();
    const stateB = makeTeamState();

    const { finalState: finalA } = runRounds(
      stateA,
      () => ({
        ...emptyDecisions(),
        marketing: { brandingInvestment: HIGH_BRANDING },
      }),
      ROUNDS,
      "team-a",
    );

    const { finalState: finalB } = runRounds(
      stateB,
      () => ({
        ...emptyDecisions(),
        marketing: { brandingInvestment: ZERO_BRANDING },
      }),
      ROUNDS,
      "team-b",
    );

    expect(finalA.brandValue).toBeGreaterThan(finalB.brandValue);
  });

  it("brand advantage compounds: round-3 gap > round-1 gap", () => {
    // Track brandValue gap after each round.
    const stateA = makeTeamState();
    const stateB = makeTeamState();

    // Run each team round by round, collecting brand values.
    const brandGaps: number[] = [];

    let currentA = stateA;
    let currentB = stateB;
    let marketA = makeMarketState();
    let marketB = makeMarketState();

    for (let r = 1; r <= ROUNDS; r++) {
      // Team A: invest in branding
      const outA = SimulationEngine.processRound({
        roundNumber: r,
        teams: [
          {
            id: "team-a",
            state: currentA,
            decisions: {
              ...emptyDecisions(),
              marketing: { brandingInvestment: HIGH_BRANDING },
            },
          },
        ],
        marketState: marketA,
        matchSeed: `${SEED}-brand-a`,
      });
      currentA = outA.results.find((res) => res.teamId === "team-a")!.newState;
      marketA = outA.newMarketState;

      // Team B: no branding
      const outB = SimulationEngine.processRound({
        roundNumber: r,
        teams: [
          {
            id: "team-b",
            state: currentB,
            decisions: {
              ...emptyDecisions(),
              marketing: { brandingInvestment: ZERO_BRANDING },
            },
          },
        ],
        marketState: marketB,
        matchSeed: `${SEED}-brand-b`,
      });
      currentB = outB.results.find((res) => res.teamId === "team-b")!.newState;
      marketB = outB.newMarketState;

      brandGaps.push(currentA.brandValue - currentB.brandValue);
    }

    // The gap should grow over time because:
    //   - Team A accumulates brand value each round via BRANDING_BASE_IMPACT.
    //   - Team B's brand decays each round by BRAND_DECAY_RATE (8%).
    //   - So the gap widens: A grows while B shrinks.
    expect(brandGaps[2]).toBeGreaterThan(brandGaps[0]);
  });

  it("zero branding causes brand decay from starting value", () => {
    const state = makeTeamState();
    const startingBrand = state.brandValue; // 0.5

    const { finalState } = runRounds(
      state,
      () => ({
        ...emptyDecisions(),
        marketing: { brandingInvestment: 0 },
      }),
      ROUNDS,
      "team-decay",
    );

    // With zero investment, brand should decay below starting value.
    // BRAND_DECAY_RATE = 0.08, so after 3 rounds: ~0.5 * (1-0.08)^3 = ~0.389
    expect(finalState.brandValue).toBeLessThan(startingBrand);
  });

  it("branding investment has diminishing returns above linear threshold", () => {
    // Compare $2M (at the linear threshold) vs $10M (well above it).
    // The marginal brand growth from $2M->$10M should be less than 5x the $0->$2M growth.
    const stateBase = makeTeamState();
    const stateLow = makeTeamState();
    const stateHigh = makeTeamState();

    const runOnce = (s: TeamState, branding: number, id: string) =>
      SimulationEngine.processRound({
        roundNumber: 1,
        teams: [
          {
            id,
            state: s,
            decisions: {
              ...emptyDecisions(),
              marketing: { brandingInvestment: branding },
            },
          },
        ],
        marketState: makeMarketState(),
        matchSeed: SEED,
      });

    const outBase = runOnce(stateBase, 0, "base");
    const outLow = runOnce(stateLow, 2_000_000, "low");
    const outHigh = runOnce(stateHigh, 10_000_000, "high");

    const brandBase = outBase.results[0].newState.brandValue;
    const brandLow = outLow.results[0].newState.brandValue;
    const brandHigh = outHigh.results[0].newState.brandValue;

    const gainLow = brandLow - brandBase;   // gain from $0 -> $2M
    const gainHigh = brandHigh - brandBase;  // gain from $0 -> $10M

    // $10M is 5x the cost of $2M, but due to log diminishing returns above
    // the linear threshold ($2M), the gain should be less than 5x.
    expect(gainHigh).toBeGreaterThan(gainLow); // More investment = more growth
    expect(gainHigh).toBeLessThan(gainLow * 5); // But sublinear
  });
});
