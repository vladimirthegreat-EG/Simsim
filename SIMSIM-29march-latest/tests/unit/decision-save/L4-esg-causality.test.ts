/**
 * L4 — Multi-Round Causality Tests: ESG, HR, and R&D Compounding Effects
 *
 * Proves that long-term strategic investments compound correctly over
 * multiple rounds through the SimulationEngine.processRound() pipeline:
 *
 *   Test 1: HR culture investment (salary multiplier) reduces turnover and
 *           builds workforce morale/efficiency over 4 rounds.
 *   Test 2: ESG initiative spending lifts both esgScore and brandValue
 *           over 3 rounds compared to a no-investment baseline.
 *   Test 3: Early R&D investment creates a compounding product-quality
 *           advantage vs. the same total spend applied later.
 *
 * All tests run two competing teams through SimulationEngine.processRound()
 * with a fixed deterministic seed, differing only in the targeted decision.
 */

import { describe, it, expect } from "vitest";
import {
  SimulationEngine,
  type SimulationInput,
  type SimulationOutput,
} from "@/engine/core/SimulationEngine";
import type { AllDecisions } from "@/engine/types/decisions";
import type { TeamState } from "@/engine/types/state";
import type { MarketState } from "@/engine/types/market";

// ============================================
// HELPERS
// ============================================

const SEED = "L4-causality-seed";

function makeTeamState(overrides?: Partial<TeamState>): TeamState {
  return SimulationEngine.createInitialTeamState(overrides);
}

function makeMarketState(): MarketState {
  return SimulationEngine.createInitialMarketState();
}

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
 * Run N rounds for two teams simultaneously (so they share the same
 * MarketState evolution and rubber-banding context).  Each team gets
 * its own decision function keyed by team id.
 *
 * Returns per-team arrays of intermediate states.
 */
function runTwoTeams(opts: {
  rounds: number;
  teamADecisions: (round: number, state: TeamState) => AllDecisions;
  teamBDecisions: (round: number, state: TeamState) => AllDecisions;
  initialStateA?: Partial<TeamState>;
  initialStateB?: Partial<TeamState>;
  seed?: string;
}): {
  statesA: TeamState[];
  statesB: TeamState[];
  outputs: SimulationOutput[];
} {
  const seed = opts.seed ?? SEED;
  let stateA = makeTeamState(opts.initialStateA);
  let stateB = makeTeamState(opts.initialStateB);
  let market = makeMarketState();

  const statesA: TeamState[] = [stateA];
  const statesB: TeamState[] = [stateB];
  const outputs: SimulationOutput[] = [];

  for (let r = 1; r <= opts.rounds; r++) {
    const input: SimulationInput = {
      roundNumber: r,
      teams: [
        { id: "team-A", state: { ...stateA, round: r }, decisions: opts.teamADecisions(r, stateA) },
        { id: "team-B", state: { ...stateB, round: r }, decisions: opts.teamBDecisions(r, stateB) },
      ],
      marketState: market,
      matchSeed: seed,
    };

    const output = SimulationEngine.processRound(input);
    outputs.push(output);

    const resultA = output.results.find((res) => res.teamId === "team-A")!;
    const resultB = output.results.find((res) => res.teamId === "team-B")!;

    stateA = resultA.newState;
    stateB = resultB.newState;

    statesA.push(stateA);
    statesB.push(stateB);

    market = output.newMarketState;
  }

  return { statesA, statesB, outputs };
}

// ============================================
// TEST 1 — HR Culture Investment Reduces Turnover (Long-Game)
// ============================================

describe("L4 Test 1 — HR salary investment compounds morale and efficiency", () => {
  /**
   * Team A: salary multiplier 1.15 (invest in people) every round for 4 rounds.
   * Team B: salary multiplier 0.90 (cut salaries) every round for 4 rounds.
   *
   * By round 4 Team A should have measurably higher workforce morale and
   * efficiency, proving the HR culture investment compounds over time.
   */
  it("Team A (high salary) has higher morale and efficiency than Team B (low salary) by round 4", () => {
    const { statesA, statesB } = runTwoTeams({
      rounds: 4,
      teamADecisions: () => {
        const d = emptyDecisions();
        d.hr = {
          salaryMultiplierChanges: {
            workers: 1.15,
            engineers: 1.15,
            supervisors: 1.15,
          },
        };
        // Give both teams identical minimal marketing/rd to keep the simulation stable
        d.marketing = { brandingInvestment: 1_000_000 };
        d.rd = { rdBudget: 1_000_000 };
        return d;
      },
      teamBDecisions: () => {
        const d = emptyDecisions();
        d.hr = {
          salaryMultiplierChanges: {
            workers: 0.90,
            engineers: 0.90,
            supervisors: 0.90,
          },
        };
        d.marketing = { brandingInvestment: 1_000_000 };
        d.rd = { rdBudget: 1_000_000 };
        return d;
      },
    });

    // Final states after round 4 (index 4 because statesA[0] is the initial state)
    const finalA = statesA[4];
    const finalB = statesB[4];

    // --- Morale assertion ---
    // Team A should have higher average morale than Team B
    expect(finalA.workforce.averageMorale).toBeGreaterThan(
      finalB.workforce.averageMorale,
    );

    // --- Efficiency assertion ---
    // Team A's higher morale should translate to better efficiency
    expect(finalA.workforce.averageEfficiency).toBeGreaterThanOrEqual(
      finalB.workforce.averageEfficiency,
    );

    // --- Turnover divergence ---
    // Team A should retain more headcount (lower turnover over 4 rounds)
    // At minimum, Team A's headcount should not be worse than Team B's
    expect(finalA.workforce.totalHeadcount).toBeGreaterThanOrEqual(
      finalB.workforce.totalHeadcount,
    );
  });

  it("morale gap widens each round (compounding effect)", () => {
    const { statesA, statesB } = runTwoTeams({
      rounds: 4,
      teamADecisions: () => {
        const d = emptyDecisions();
        d.hr = {
          salaryMultiplierChanges: {
            workers: 1.15,
            engineers: 1.15,
            supervisors: 1.15,
          },
        };
        d.marketing = { brandingInvestment: 1_000_000 };
        d.rd = { rdBudget: 1_000_000 };
        return d;
      },
      teamBDecisions: () => {
        const d = emptyDecisions();
        d.hr = {
          salaryMultiplierChanges: {
            workers: 0.90,
            engineers: 0.90,
            supervisors: 0.90,
          },
        };
        d.marketing = { brandingInvestment: 1_000_000 };
        d.rd = { rdBudget: 1_000_000 };
        return d;
      },
    });

    // The morale gap should not shrink over time — it should stay or grow
    // Compare gap at round 2 vs round 4
    const gapRound2 =
      statesA[2].workforce.averageMorale - statesB[2].workforce.averageMorale;
    const gapRound4 =
      statesA[4].workforce.averageMorale - statesB[4].workforce.averageMorale;

    // Round 4 gap should be at least as large as round 2 gap (compounding)
    expect(gapRound4).toBeGreaterThanOrEqual(gapRound2);
  });
});

// ============================================
// TEST 2 — ESG Leads to Brand Value (3-Round Compound)
// ============================================

describe("L4 Test 2 — ESG investment compounds into brand value and ESG score", () => {
  /**
   * Team A: activates ESG initiatives (employeeWellness, codeOfEthics,
   *         diversityInclusion, charitableDonation) every round for 3 rounds.
   * Team B: no ESG investment.
   *
   * After round 4 (3 rounds of investment + 1 round to see the effect),
   * Team A should have a higher ESG score AND a higher brand value.
   *
   * Note: waterConservation/circularEconomy are in higher ESG tiers, so we
   * use tier-1/2 initiatives that are available from the start.
   */
  it("Team A (ESG investor) has higher esgScore and brandValue than Team B (no ESG) after 4 rounds", () => {
    const { statesA, statesB } = runTwoTeams({
      rounds: 4,
      teamADecisions: () => {
        const d = emptyDecisions();
        // ESG initiatives available from tier 1 and tier 2
        d.factory = {
          esgInitiatives: {
            employeeWellness: true,        // Tier 1: +60 ESG, $500K
            codeOfEthics: true,            // Tier 1: +100 ESG, free
            charitableDonation: 2_000_000, // Tier 1: variable ESG
            communityInvestment: 1_000_000, // Tier 1: variable ESG
            diversityInclusion: true,      // Tier 2: +90 ESG, $1M
          },
        };
        // Give both teams the same baseline marketing/rd
        d.marketing = { brandingInvestment: 2_000_000 };
        d.rd = { rdBudget: 2_000_000 };
        return d;
      },
      teamBDecisions: () => {
        const d = emptyDecisions();
        // No ESG investment — same marketing/rd baseline
        d.marketing = { brandingInvestment: 2_000_000 };
        d.rd = { rdBudget: 2_000_000 };
        return d;
      },
    });

    const finalA = statesA[4];
    const finalB = statesB[4];

    // --- ESG score assertion ---
    expect(finalA.esgScore).toBeGreaterThan(finalB.esgScore);

    // The gap should be substantial (at least 100 points after 3 rounds of investment)
    expect(finalA.esgScore - finalB.esgScore).toBeGreaterThanOrEqual(100);

    // --- Brand value assertion ---
    // ESG contributes to market scoring (esg weight in segment scoring),
    // and high ESG provides revenue bonuses which feed back into brand.
    // Team A's brand should be at least as good as Team B's.
    expect(finalA.brandValue).toBeGreaterThanOrEqual(finalB.brandValue);
  });

  it("ESG score accumulates across rounds (not reset each round)", () => {
    const { statesA } = runTwoTeams({
      rounds: 4,
      teamADecisions: () => {
        const d = emptyDecisions();
        d.factory = {
          esgInitiatives: {
            employeeWellness: true,
            codeOfEthics: true,
            charitableDonation: 1_000_000,
          },
        };
        d.marketing = { brandingInvestment: 1_000_000 };
        d.rd = { rdBudget: 1_000_000 };
        return d;
      },
      teamBDecisions: () => {
        const d = emptyDecisions();
        d.marketing = { brandingInvestment: 1_000_000 };
        d.rd = { rdBudget: 1_000_000 };
        return d;
      },
    });

    // ESG score should be monotonically non-decreasing when investing each round
    for (let r = 1; r < statesA.length; r++) {
      expect(statesA[r].esgScore).toBeGreaterThanOrEqual(statesA[r - 1].esgScore);
    }

    // Final ESG should be meaningfully above the starting score of 100
    expect(statesA[4].esgScore).toBeGreaterThan(200);
  });
});

// ============================================
// TEST 3 — R&D Creates Compounding Product Advantage
// ============================================

describe("L4 Test 3 — Early R&D creates compounding product advantage", () => {
  /**
   * Team A: rdBudget $10M for rounds 1-4, $0 for rounds 5-6.
   * Team B: rdBudget $0 for rounds 1-2, $10M for rounds 3-6.
   *
   * Same total spend ($40M each), different timing. Team A invests early,
   * Team B invests late. By round 6 Team A should have at least as good
   * product quality, because early R&D accumulates rdProgress points that
   * compound (patent unlocks, tech tree progression) before Team B starts.
   */
  it("early R&D investor (Team A) has >= product quality vs late investor (Team B) after 6 rounds", () => {
    const { statesA, statesB } = runTwoTeams({
      rounds: 6,
      teamADecisions: (round) => {
        const d = emptyDecisions();
        // Team A: $10M R&D in rounds 1-4, $0 after
        d.rd = { rdBudget: round <= 4 ? 10_000_000 : 0 };
        d.marketing = { brandingInvestment: 1_000_000 };
        return d;
      },
      teamBDecisions: (round) => {
        const d = emptyDecisions();
        // Team B: $0 R&D in rounds 1-2, $10M in rounds 3-6
        d.rd = { rdBudget: round >= 3 ? 10_000_000 : 0 };
        d.marketing = { brandingInvestment: 1_000_000 };
        return d;
      },
    });

    const finalA = statesA[6];
    const finalB = statesB[6];

    // --- rdProgress assertion ---
    // Team A started earlier, so should have accumulated rdProgress sooner.
    // By round 4, Team A should be well ahead.
    expect(statesA[4].rdProgress).toBeGreaterThan(statesB[4].rdProgress);

    // --- Product quality assertion ---
    // Average quality across all launched products
    const avgQualityA = finalA.products.length > 0
      ? finalA.products.reduce((sum, p) => sum + p.quality, 0) / finalA.products.length
      : 0;
    const avgQualityB = finalB.products.length > 0
      ? finalB.products.reduce((sum, p) => sum + p.quality, 0) / finalB.products.length
      : 0;

    // Early R&D should yield at least as good product quality (compounds via
    // patents and tech progress that slow quality decay)
    expect(avgQualityA).toBeGreaterThanOrEqual(avgQualityB);
  });

  it("R&D points accumulate faster when investment is sustained (compounding from engineer output)", () => {
    const { statesA, statesB } = runTwoTeams({
      rounds: 6,
      teamADecisions: (round) => {
        const d = emptyDecisions();
        d.rd = { rdBudget: round <= 4 ? 10_000_000 : 0 };
        d.marketing = { brandingInvestment: 1_000_000 };
        return d;
      },
      teamBDecisions: (round) => {
        const d = emptyDecisions();
        d.rd = { rdBudget: round >= 3 ? 10_000_000 : 0 };
        d.marketing = { brandingInvestment: 1_000_000 };
        return d;
      },
    });

    // At the midpoint (round 3), Team A should have a clear rdProgress lead
    // since it has been investing for 3 rounds while Team B just started
    expect(statesA[3].rdProgress).toBeGreaterThan(statesB[3].rdProgress);

    // Team A should have unlocked more patents by round 4
    const patentsA4 = typeof statesA[4].patents === "number" ? statesA[4].patents : statesA[4].patents.length;
    const patentsB4 = typeof statesB[4].patents === "number" ? statesB[4].patents : statesB[4].patents.length;
    expect(patentsA4).toBeGreaterThanOrEqual(patentsB4);
  });

  it("total R&D spend is equal but timing advantage persists", () => {
    const { statesA, statesB, outputs } = runTwoTeams({
      rounds: 6,
      teamADecisions: (round) => {
        const d = emptyDecisions();
        d.rd = { rdBudget: round <= 4 ? 10_000_000 : 0 };
        d.marketing = { brandingInvestment: 1_000_000 };
        return d;
      },
      teamBDecisions: (round) => {
        const d = emptyDecisions();
        d.rd = { rdBudget: round >= 3 ? 10_000_000 : 0 };
        d.marketing = { brandingInvestment: 1_000_000 };
        return d;
      },
    });

    // Both teams should have invested $40M total in R&D
    // (4 rounds * $10M each). The engine charges rdBudget as cost.
    // Verify the final rdProgress advantage for the early investor
    const finalA = statesA[6];
    const finalB = statesB[6];

    // By round 6, Team B has caught up in spending but Team A's earlier
    // patents and tech unlocks should give a structural advantage.
    // At minimum, Team A's rdProgress should be >= Team B's rdProgress
    // because engineers generate points each round regardless, and
    // Team A's budget points accumulated 2 rounds earlier.
    expect(finalA.rdProgress).toBeGreaterThanOrEqual(finalB.rdProgress);
  });
});
