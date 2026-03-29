/**
 * L3 ESG Pedagogy v2 -- Pedagogical Validity Tests
 *
 * Proves the simulation teaches what it claims to teach:
 *   Learning Outcome 1: Early R&D investment compounds and pays off over 8 rounds
 *   Learning Outcome 2: Ignoring HR (salary cuts) creates compounding losses
 *   Learning Outcome 3: ESG investment creates sustainable brand advantage
 *
 * Methodology:
 *   - Each outcome is tested across 5 independent seeds.
 *   - A "majority" (>=3/5) of seeds must confirm the outcome.
 *   - Factory efficiency investment is included in ALL decisions to prevent
 *     capacity constraints from masking the variable under test.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { TeamState } from "@/engine/types/state";
import type { AllDecisions } from "@/engine/types/decisions";
import type { MarketState } from "@/engine/types/market";
import type { RoundResults } from "@/engine/types/results";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface GameHistory {
  finalStates: Record<string, TeamState>;
  revenueByRound: Record<string, number[]>;
  brandByRound: Record<string, number[]>;
  esgByRound: Record<string, number[]>;
  moraleByRound: Record<string, number[]>;
  roundResults: Record<string, RoundResults[]>;
}

/**
 * Run a multi-round game with per-team, per-round decision functions.
 * Both teams start from identical initial states (quick preset equivalent).
 */
function runMultiRoundGame(
  teamDecisionsFn: (teamId: string, round: number, state: TeamState) => AllDecisions,
  teamIds: string[],
  rounds: number,
  seed: string,
): GameHistory {
  const teams = teamIds.map((id) => ({
    id,
    state: SimulationEngine.createInitialTeamState(),
    decisions: {} as AllDecisions,
  }));
  let marketState: MarketState = SimulationEngine.createInitialMarketState();

  const history: GameHistory = {
    finalStates: {},
    revenueByRound: {},
    brandByRound: {},
    esgByRound: {},
    moraleByRound: {},
    roundResults: {},
  };
  for (const id of teamIds) {
    history.revenueByRound[id] = [];
    history.brandByRound[id] = [];
    history.esgByRound[id] = [];
    history.moraleByRound[id] = [];
    history.roundResults[id] = [];
  }

  for (let round = 1; round <= rounds; round++) {
    for (const team of teams) {
      team.decisions = teamDecisionsFn(team.id, round, team.state);
    }

    const output = SimulationEngine.processRound({
      roundNumber: round,
      teams: teams.map((t) => ({ id: t.id, state: t.state, decisions: t.decisions })),
      marketState,
      matchSeed: seed,
    });

    for (const result of output.results) {
      const teamId = result.teamId;
      const team = teams.find((t) => t.id === teamId)!;
      team.state = result.newState;

      history.revenueByRound[teamId].push(result.totalRevenue);
      history.roundResults[teamId].push(result);
      history.brandByRound[teamId].push(result.newState.brandValue);
      history.esgByRound[teamId].push(result.newState.esgScore);
      history.moraleByRound[teamId].push(result.newState.workforce.averageMorale);
    }

    marketState = output.newMarketState;
  }

  for (const team of teams) {
    history.finalStates[team.id] = team.state;
  }

  return history;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_SEEDS = [
  "ped-v2-alpha-1",
  "ped-v2-beta-2",
  "ped-v2-gamma-3",
  "ped-v2-delta-4",
  "ped-v2-epsilon-5",
];

const MIN_WIN_RATE = 3; // >=3 out of 5

/**
 * Standard factory efficiency investment included in every decision
 * to ensure capacity constraints do not mask the variable under test.
 */
const FACTORY_EFFICIENCY_BASE = {
  efficiencyInvestments: {
    "factory-1": {
      workers: 500_000,
      supervisors: 250_000,
      engineers: 250_000,
      machinery: 750_000,
      factory: 500_000,
    },
  },
};

// ===========================================================================
// LEARNING OUTCOME 1 -- Early R&D pays off
// ===========================================================================

describe("Learning Outcome 1: Early R&D pays off", { timeout: 120_000 }, () => {
  /**
   * Team A: rdBudget=$10M rounds 1-3, $2M rounds 4-8 + factory efficiency
   * Team B: rdBudget=$2M rounds 1-3, $10M rounds 4-8 + same factory efficiency
   *
   * Early R&D compounds: it protects product quality from aging earlier,
   * generates patents sooner, and unlocks technologies faster. Team A
   * should accumulate more cumulative revenue over 8 rounds.
   */
  it("L3-PED-V2-01: Team A cumulative revenue > Team B in majority of seeds (>=3/5)", () => {
    let earlyWins = 0;

    for (const seed of TEST_SEEDS) {
      const history = runMultiRoundGame(
        (teamId, round) => {
          const isEarly = teamId === "early-rd";
          const rdBudget = isEarly
            ? (round <= 3 ? 10_000_000 : 2_000_000)
            : (round <= 3 ? 2_000_000 : 10_000_000);

          return {
            factory: { ...FACTORY_EFFICIENCY_BASE },
            hr: {},
            rd: { rdBudget },
            marketing: {
              advertisingBudget: { General: 1_000_000 },
              brandingInvestment: 1_000_000,
            },
            finance: {},
          };
        },
        ["early-rd", "late-rd"],
        8,
        seed,
      );

      const earlyTotal = sum(history.revenueByRound["early-rd"]);
      const lateTotal = sum(history.revenueByRound["late-rd"]);

      if (earlyTotal > lateTotal) earlyWins++;
    }

    expect(
      earlyWins,
      `Early R&D won ${earlyWins}/5 seeds (need >= ${MIN_WIN_RATE}). ` +
      `Early investment should compound via quality protection, patents, and tech unlocks.`,
    ).toBeGreaterThanOrEqual(MIN_WIN_RATE);
  });
});

// ===========================================================================
// LEARNING OUTCOME 2 -- Ignoring HR creates compounding losses
// ===========================================================================

describe("Learning Outcome 2: Ignoring HR creates compounding losses", { timeout: 120_000 }, () => {
  /**
   * Team A: salary multiplier 0.85 (cut) every round
   * Team B: salary multiplier 1.10 (raise) every round
   *
   * Salary cuts tank morale, which increases turnover and burnout,
   * which reduces production efficiency and revenue.
   */

  it("L3-PED-V2-02a: Team B morale > Team A morale by round 4 in majority of seeds", () => {
    let moraleWins = 0;

    for (const seed of TEST_SEEDS) {
      const history = runMultiRoundGame(
        (teamId) => {
          const isCutter = teamId === "hr-cutter";
          return {
            factory: { ...FACTORY_EFFICIENCY_BASE },
            hr: {
              salaryMultiplierChanges: {
                workers: isCutter ? 0.85 : 1.10,
                engineers: isCutter ? 0.85 : 1.10,
                supervisors: isCutter ? 0.85 : 1.10,
              },
            },
            rd: { rdBudget: 3_000_000 },
            marketing: {
              advertisingBudget: { General: 1_000_000 },
              brandingInvestment: 1_000_000,
            },
            finance: {},
          };
        },
        ["hr-cutter", "hr-investor"],
        8,
        seed,
      );

      // Round 4 = index 3 in 0-based arrays
      const cutterMoraleR4 = history.moraleByRound["hr-cutter"][3];
      const investorMoraleR4 = history.moraleByRound["hr-investor"][3];

      if (investorMoraleR4 > cutterMoraleR4) moraleWins++;
    }

    expect(
      moraleWins,
      `HR investor morale > cutter morale at round 4 in ${moraleWins}/5 seeds (need >= ${MIN_WIN_RATE}). ` +
      `Salary cuts should compound into morale collapse.`,
    ).toBeGreaterThanOrEqual(MIN_WIN_RATE);
  });

  it("L3-PED-V2-02b: Team B late-game workforce > Team A in majority of seeds (turnover erosion)", () => {
    let headcountWins = 0;

    for (const seed of TEST_SEEDS) {
      const history = runMultiRoundGame(
        (teamId) => {
          const isCutter = teamId === "hr-cutter";
          return {
            factory: { ...FACTORY_EFFICIENCY_BASE },
            hr: {
              salaryMultiplierChanges: {
                workers: isCutter ? 0.85 : 1.10,
                engineers: isCutter ? 0.85 : 1.10,
                supervisors: isCutter ? 0.85 : 1.10,
              },
            },
            rd: { rdBudget: 3_000_000 },
            marketing: {
              advertisingBudget: { General: 1_000_000 },
              brandingInvestment: 1_000_000,
            },
            finance: {},
          };
        },
        ["hr-cutter", "hr-investor"],
        8,
        seed,
      );

      // Compounding salary cuts erode morale which increases turnover,
      // resulting in workforce attrition. The investor retains more people.
      const cutterHeadcount = history.finalStates["hr-cutter"].workforce.totalHeadcount;
      const investorHeadcount = history.finalStates["hr-investor"].workforce.totalHeadcount;

      if (investorHeadcount > cutterHeadcount) headcountWins++;
    }

    expect(
      headcountWins,
      `HR investor headcount > cutter in ${headcountWins}/5 seeds (need >= ${MIN_WIN_RATE}). ` +
      `Compounding morale damage should increase turnover and erode workforce.`,
    ).toBeGreaterThanOrEqual(MIN_WIN_RATE);
  });
});

// ===========================================================================
// LEARNING OUTCOME 3 -- ESG creates brand advantage
// ===========================================================================

describe("Learning Outcome 3: ESG creates brand advantage", { timeout: 120_000 }, () => {
  /**
   * Team A: ESG initiatives active (circularEconomy, diversityInclusion) + factory efficiency
   * Team B: No ESG, same factory efficiency
   *
   * ESG investment boosts esgScore, which feeds into brand value via the
   * ESG->brand link in MarketingModule (esgScore > 300 => brand boost).
   * ESG also contributes to market scoring via segment weights.
   *
   * Note: circularEconomy is Tier 4 (requires round 6+ or ESG 500+).
   * diversityInclusion is Tier 2 (requires round 2+ or ESG 100+).
   * We use employeeWellness (Tier 1) and codeOfEthics (Tier 1) early,
   * then escalate to diversityInclusion from round 2+, and add more
   * initiatives as they unlock.
   */

  it("L3-PED-V2-03a: Team A brandValue > Team B in majority of seeds after 6 rounds", () => {
    let brandWins = 0;

    for (const seed of TEST_SEEDS) {
      const history = runMultiRoundGame(
        (teamId, round) => {
          const isESG = teamId === "esg-team";

          // Build ESG initiatives progressively (respecting tier unlocks)
          const esgInitiatives: Record<string, unknown> = {};
          if (isESG) {
            // Tier 1 (always available): codeOfEthics, employeeWellness, communityEducation
            esgInitiatives.codeOfEthics = true;
            esgInitiatives.employeeWellness = true;
            esgInitiatives.charitableDonation = 2_000_000;
            esgInitiatives.communityInvestment = 1_000_000;

            // Tier 2 (round 2+ or ESG 100+): diversityInclusion, transparencyReport
            if (round >= 2) {
              esgInitiatives.diversityInclusion = true;
              esgInitiatives.transparencyReport = true;
              esgInitiatives.fairWageProgram = true;
              esgInitiatives.workplaceHealthSafety = true;
            }

            // Tier 3 (round 4+ or ESG 300+): waterConservation, zeroWasteCommitment
            if (round >= 4) {
              esgInitiatives.waterConservation = true;
              esgInitiatives.zeroWasteCommitment = true;
              esgInitiatives.whistleblowerProtection = true;
            }

            // Tier 4 (round 6+ or ESG 500+): circularEconomy
            if (round >= 6) {
              esgInitiatives.circularEconomy = true;
              esgInitiatives.executivePayRatio = true;
            }
          }

          return {
            factory: {
              ...FACTORY_EFFICIENCY_BASE,
              ...(isESG ? { esgInitiatives } : {}),
            },
            hr: {},
            rd: { rdBudget: 3_000_000 },
            marketing: {
              advertisingBudget: { General: 1_500_000 },
              brandingInvestment: 2_000_000,
            },
            finance: {},
          };
        },
        ["esg-team", "no-esg-team"],
        6,
        seed,
      );

      const esgBrandFinal = history.brandByRound["esg-team"][5]; // last round index
      const noEsgBrandFinal = history.brandByRound["no-esg-team"][5];

      if (esgBrandFinal > noEsgBrandFinal) brandWins++;
    }

    expect(
      brandWins,
      `ESG team brand > no-ESG team brand after 6 rounds in ${brandWins}/5 seeds (need >= ${MIN_WIN_RATE}). ` +
      `ESG->brand link (MarketingModule: esgScore > 300 => brand boost) should create advantage.`,
    ).toBeGreaterThanOrEqual(MIN_WIN_RATE);
  });

  it("L3-PED-V2-03b: Team A esgScore > Team B throughout all rounds in majority of seeds", () => {
    let esgWins = 0;

    for (const seed of TEST_SEEDS) {
      const history = runMultiRoundGame(
        (teamId, round) => {
          const isESG = teamId === "esg-team";

          const esgInitiatives: Record<string, unknown> = {};
          if (isESG) {
            esgInitiatives.codeOfEthics = true;
            esgInitiatives.employeeWellness = true;
            esgInitiatives.charitableDonation = 2_000_000;
            esgInitiatives.communityInvestment = 1_000_000;

            if (round >= 2) {
              esgInitiatives.diversityInclusion = true;
              esgInitiatives.transparencyReport = true;
              esgInitiatives.fairWageProgram = true;
              esgInitiatives.workplaceHealthSafety = true;
            }

            if (round >= 4) {
              esgInitiatives.waterConservation = true;
              esgInitiatives.zeroWasteCommitment = true;
              esgInitiatives.whistleblowerProtection = true;
            }

            if (round >= 6) {
              esgInitiatives.circularEconomy = true;
              esgInitiatives.executivePayRatio = true;
            }
          }

          return {
            factory: {
              ...FACTORY_EFFICIENCY_BASE,
              ...(isESG ? { esgInitiatives } : {}),
            },
            hr: {},
            rd: { rdBudget: 3_000_000 },
            marketing: {
              advertisingBudget: { General: 1_500_000 },
              brandingInvestment: 2_000_000,
            },
            finance: {},
          };
        },
        ["esg-team", "no-esg-team"],
        6,
        seed,
      );

      // Check that ESG team has higher esgScore in EVERY round
      const esgScores = history.esgByRound["esg-team"];
      const noEsgScores = history.esgByRound["no-esg-team"];
      const esgHigherEveryRound = esgScores.every((s, i) => s > noEsgScores[i]);

      if (esgHigherEveryRound) esgWins++;
    }

    expect(
      esgWins,
      `ESG team esgScore > no-ESG team throughout all 6 rounds in ${esgWins}/5 seeds (need >= ${MIN_WIN_RATE}). ` +
      `Active ESG initiatives should consistently raise ESG score above baseline.`,
    ).toBeGreaterThanOrEqual(MIN_WIN_RATE);
  });
});
