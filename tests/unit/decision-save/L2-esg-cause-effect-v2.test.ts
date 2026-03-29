/**
 * L2 v2 — Cause-and-Effect Validity Tests (Extended)
 *
 * Three cause-and-effect chains tested end-to-end through SimulationEngine.processRound():
 *   Test 1: R&D investment -> better products (quality + rdProgress)
 *   Test 2: ESG score tier -> revenue ordering (750 > 550 > 200)
 *   Test 3: Marketing branding investment -> compounding brand value advantage
 */

import { describe, it, expect } from "vitest";
import {
  SimulationEngine,
  type SimulationInput,
} from "@/engine/core/SimulationEngine";
import type { AllDecisions } from "@/engine/types/decisions";
import type { TeamState } from "@/engine/types/state";
import type { MarketState } from "@/engine/types/market";

// ============================================
// HELPERS
// ============================================

/** Deterministic seed for reproducibility across test runs. */
const SEED = "L2-cause-effect-v2-seed";

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
 * Returns the final TeamState and all intermediate outputs.
 */
function runRounds(
  initialState: TeamState,
  decisionsFn: (round: number) => AllDecisions,
  rounds: number,
  teamId: string = "team-1",
): { finalState: TeamState; outputs: ReturnType<typeof SimulationEngine.processRound>[] } {
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

  return { finalState: state, outputs: allOutputs };
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
// TEST 1 — R&D investment -> better products
// ============================================

describe("Test 1: R&D investment -> better products", () => {
  const ROUNDS = 3;
  const HIGH_RD_BUDGET = 15_000_000; // $15M/round
  const LOW_RD_BUDGET = 1_000_000;   // $1M/round

  it("Team A ($15M R&D) has higher rdProgress than Team B ($1M) after 3 rounds", () => {
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

    // $15M/round => 150 budget pts/round (capped at 200) + engineer output
    // $1M/round  =>  10 budget pts/round + engineer output
    // Over 3 rounds the gap should be substantial.
    expect(finalA.rdProgress).toBeGreaterThan(finalB.rdProgress);

    // Quantitative: the difference should be at least 3 rounds * (150 - 10) = 420 pts
    // (engineer output is identical for both teams, so it cancels out)
    const minExpectedGap = 3 * (150 - 10);
    expect(finalA.rdProgress - finalB.rdProgress).toBeGreaterThanOrEqual(minExpectedGap);
  });

  it("Team A ($15M R&D) products have higher quality than Team B ($1M) after 3 rounds", () => {
    // Team A invests heavily in R&D AND product improvements.
    // Team B has minimal R&D and no improvements.
    const stateA = makeTeamState();
    const stateB = makeTeamState();

    // Pick the first launched product to improve
    const productId = stateA.products.find(
      (p) => p.developmentStatus === "launched",
    )?.id;

    const { finalState: finalA } = runRounds(
      stateA,
      () => ({
        ...emptyDecisions(),
        rd: {
          rdBudget: HIGH_RD_BUDGET,
          productImprovements: productId
            ? [{ productId, qualityIncrease: 5, featuresIncrease: 3 }]
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

    const productA = finalA.products.find((p) => p.id === productId);
    const productB = finalB.products.find((p) => p.id === productId);

    expect(productA).toBeDefined();
    expect(productB).toBeDefined();

    // Team A invested in quality improvements; Team B did not.
    // Both experience aging decay, but Team A's improvements offset it.
    // Additionally, high rdBudget reduces aging decay via rdBudgetProtection.
    expect(productA!.quality).toBeGreaterThan(productB!.quality);
  });
});

// ============================================
// TEST 2 — ESG score tier affects revenue
// ============================================

describe("Test 2: ESG score tier -> revenue impact", () => {
  it("revenue(esgScore=750) > revenue(esgScore=550) > revenue(esgScore=200)", () => {
    // Three teams with identical state except ESG scores.
    // esgScore=200: penalty zone (below 300)
    // esgScore=550: bonus ramp zone (300-700)
    // esgScore=750: max bonus zone (700+)
    const stateLow = { ...makeTeamState(), esgScore: 200 } as TeamState;
    const stateMid = { ...makeTeamState(), esgScore: 550 } as TeamState;
    const stateHigh = { ...makeTeamState(), esgScore: 750 } as TeamState;

    const decisions = emptyDecisions();

    const output = runMultiTeamRound([
      { id: "low-esg", state: stateLow, decisions },
      { id: "mid-esg", state: stateMid, decisions },
      { id: "high-esg", state: stateHigh, decisions },
    ]);

    const revenueLow = output.results.find((r) => r.teamId === "low-esg")!.totalRevenue;
    const revenueMid = output.results.find((r) => r.teamId === "mid-esg")!.totalRevenue;
    const revenueHigh = output.results.find((r) => r.teamId === "high-esg")!.totalRevenue;

    // ESG affects revenue through two channels:
    //   1. applyESGEvents: direct revenue modifier
    //      - esgScore=200 => penalty: -(1 - 200/300) * 0.12 = -4%
    //      - esgScore=550 => bonus ramp: ((550-300)/400) * 0.05 = +3.125%
    //      - esgScore=750 => max bonus: +5%
    //   2. calculateTeamPosition: esgScore contributes to segment scoring via SEGMENT_WEIGHTS.esg
    //      Higher ESG => higher esg dimension score => more market share => more units sold
    expect(revenueHigh).toBeGreaterThan(revenueMid);
    expect(revenueMid).toBeGreaterThan(revenueLow);
  });

  it("all three teams generate positive revenue (market functions)", () => {
    // Sanity check: even the penalized team should still generate some revenue
    // (ESG penalty is at most -12%, not a market wipeout).
    const stateLow = { ...makeTeamState(), esgScore: 200 } as TeamState;
    const stateMid = { ...makeTeamState(), esgScore: 550 } as TeamState;
    const stateHigh = { ...makeTeamState(), esgScore: 750 } as TeamState;

    const decisions = emptyDecisions();

    const output = runMultiTeamRound([
      { id: "low-esg", state: stateLow, decisions },
      { id: "mid-esg", state: stateMid, decisions },
      { id: "high-esg", state: stateHigh, decisions },
    ]);

    for (const teamId of ["low-esg", "mid-esg", "high-esg"]) {
      const revenue = output.results.find((r) => r.teamId === teamId)!.totalRevenue;
      expect(revenue).toBeGreaterThan(0);
    }
  });
});

// ============================================
// TEST 3 — Marketing creates brand value
// ============================================

describe("Test 3: Marketing (branding) -> brand value growth that compounds", () => {
  const ROUNDS = 3;
  const HIGH_BRANDING = 5_000_000; // $5M/round
  const ZERO_BRANDING = 0;

  it("Team A ($5M branding/round) has higher brandValue than Team B ($0) after 3 rounds", () => {
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

    // Team A invests $5M/round, gaining brand via BRANDING_BASE_IMPACT.
    // Team B invests $0, so brand only decays via BRAND_DECAY_RATE (4%).
    expect(finalA.brandValue).toBeGreaterThan(finalB.brandValue);
  });

  it("brand advantage compounds: round-3 gap > round-1 gap", () => {
    // Track brandValue gap after each round.
    const brandGaps: number[] = [];

    let currentA = makeTeamState();
    let currentB = makeTeamState();
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
    //   - Team A accumulates brand value each round via BRANDING_BASE_IMPACT
    //     ($5M => 0.3% linear from first $2M + log returns on remaining $3M).
    //   - Team B's brand decays each round by BRAND_DECAY_RATE (4%).
    //   - So the gap widens: A grows while B shrinks.
    expect(brandGaps[2]).toBeGreaterThan(brandGaps[0]);

    // Additionally, all gaps should be positive (A always ahead of B).
    for (const gap of brandGaps) {
      expect(gap).toBeGreaterThan(0);
    }
  });

  it("zero branding causes brand decay below starting value", () => {
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
    // BRAND_DECAY_RATE = 0.04, so after 3 rounds: ~0.5 * (1-0.04)^3 ~ 0.442
    expect(finalState.brandValue).toBeLessThan(startingBrand);
    // Should still be positive (decay does not destroy all brand)
    expect(finalState.brandValue).toBeGreaterThan(0);
  });
});
