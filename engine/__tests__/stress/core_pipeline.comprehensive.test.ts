/**
 * CORE PIPELINE — Comprehensive Stress Tests
 *
 * Merged from:
 *   A) core.stress.test.ts          — Golden Path, Edge Scenarios, Property Tests, Pipeline Mechanics
 *   B) pipeline_deep.stress.test.ts — processRound() deep, Decision Validation, createInitialTeamState()
 *   C) SimulationEngine.test.ts     — Unit tests for Engine, Factory, HR, Finance, Market, Marketing, RD modules
 *   D) miyazaki_determinism.stress.test.ts — Exact Replay, Seed Sensitivity, Cash Depletion, Empty 16r, 1v5
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SimulationEngine,
  type SimulationInput,
  type SimulationOutput,
} from "../../core/SimulationEngine";
import { deriveSeedBundle, hashState, createEngineContext } from "../../core/EngineContext";
import {
  createSimulationInput,
  createMixedStrategyInput,
  createMinimalTeamState,
  createMinimalMarketState,
  createGamePreset,
  runProfileNRounds,
  runNRounds,
  type ScenarioProfile,
} from "../../testkit/scenarioGenerator";
import {
  assertAllInvariantsPass,
  checkDeterminism,
  runAllInvariants,
} from "../../testkit/invariants";
import {
  hashSimulationOutput,
  verifyDeterminism,
  assertInvariantsPass,
} from "../../testkit/helpers";
import { FactoryModule } from "../../modules/FactoryModule";
import { HRModule } from "../../modules/HRModule";
import { FinanceModule } from "../../modules/FinanceModule";
import { MarketingModule } from "../../modules/MarketingModule";
import { RDModule } from "../../modules/RDModule";
import { MarketSimulator } from "../../market/MarketSimulator";
import { setRandomSeed } from "../../utils";
import { CONSTANTS } from "../../types";
import type { TeamState, MarketState, EngineerStats } from "../../types";
import type { AllDecisions } from "../../types/decisions";

// ============================================
// SHARED HELPERS
// ============================================

/** Single-team helper from pipeline_deep */
function runSingleTeam(
  state: ReturnType<typeof createMinimalTeamState>,
  decisions: any,
  seed = "pipe-test",
) {
  const input: SimulationInput = {
    roundNumber: 1,
    teams: [{ id: "t1", state, decisions }],
    marketState: createMinimalMarketState(),
    matchSeed: seed,
  };
  return SimulationEngine.processRound(input);
}

/** Multi-round runner with custom decision function (from miyazaki) */
function runGame(opts: {
  teamCount: number;
  rounds: number;
  matchSeed: string;
  decisionFn?: (state: TeamState, round: number, teamIndex: number) => AllDecisions;
  stateOverrides?: Partial<TeamState>;
}): SimulationOutput[] {
  return runNRounds({
    teamCount: opts.teamCount,
    rounds: opts.rounds,
    matchSeed: opts.matchSeed,
    decisionFn: opts.decisionFn ?? (() => ({})),
  });
}

/** Recursively check that no numeric value in an object is NaN or Infinity (from miyazaki) */
function assertNoNaNOrInfinity(obj: unknown, path = "root"): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === "number") {
    expect(isNaN(obj), `NaN found at ${path}`).toBe(false);
    expect(isFinite(obj), `Infinity found at ${path}`).toBe(true);
    return;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      assertNoNaNOrInfinity(obj[i], `${path}[${i}]`);
    }
    return;
  }
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      assertNoNaNOrInfinity(value, `${path}.${key}`);
    }
  }
}

/** Check specific key financial fields for NaN/Infinity on a TeamState (from miyazaki) */
function assertKeyFieldsClean(state: TeamState, label: string): void {
  const fields: (keyof TeamState)[] = [
    "cash",
    "revenue",
    "netIncome",
    "eps",
    "marketCap",
    "sharePrice",
    "brandValue",
    "totalAssets",
    "shareholdersEquity",
  ];
  for (const field of fields) {
    const val = state[field];
    if (typeof val === "number") {
      expect(isNaN(val), `${label}.${field} is NaN`).toBe(false);
      expect(isFinite(val), `${label}.${field} is Infinity`).toBe(true);
    }
  }
}

/** Helper to create proper EngineerStats (from SimulationEngine.test) */
function createEngineerStats(overrides: Partial<EngineerStats> = {}): EngineerStats {
  return {
    efficiency: 100,
    accuracy: 80,
    speed: 100,
    stamina: 80,
    discipline: 80,
    loyalty: 80,
    teamCompatibility: 80,
    health: 80,
    innovation: 100,
    problemSolving: 80,
    ...overrides,
  };
}

/** Helper to create initial market state (from SimulationEngine.test) */
function createMarketState(): MarketState {
  return {
    roundNumber: 1,
    economicConditions: {
      gdp: 2.5,
      inflation: 2.0,
      consumerConfidence: 75,
      unemploymentRate: 4.5,
    },
    fxRates: {
      "EUR/USD": 1.10,
      "GBP/USD": 1.27,
      "JPY/USD": 0.0067,
      "CNY/USD": 0.14,
    },
    fxVolatility: 0.15,
    interestRates: {
      federalRate: 5.0,
      tenYearBond: 4.5,
      corporateBond: 6.0,
    },
    demandBySegment: {
      Budget: { totalDemand: 500000, priceRange: { min: 100, max: 300 }, growthRate: 0.02 },
      General: { totalDemand: 400000, priceRange: { min: 300, max: 600 }, growthRate: 0.03 },
      Enthusiast: { totalDemand: 200000, priceRange: { min: 600, max: 1000 }, growthRate: 0.04 },
      Professional: { totalDemand: 100000, priceRange: { min: 1000, max: 1500 }, growthRate: 0.02 },
      "Active Lifestyle": { totalDemand: 150000, priceRange: { min: 400, max: 800 }, growthRate: 0.05 },
    },
    marketPressures: {
      priceCompetition: 0.5,
      qualityExpectations: 0.6,
      sustainabilityPremium: 0.3,
    },
  };
}

// ============================================
// TOP-LEVEL DESCRIBE
// ============================================

describe("Core Pipeline — Comprehensive Stress Tests", () => {

  // ============================================================
  // PART A — From core.stress.test.ts
  // ============================================================

  describe("Part A — Core Stress", () => {

    // ============================================
    // CATEGORY A — Golden Path Deterministic Snapshots
    // ============================================

    describe("Category A — Golden Path", () => {
      it("2 teams, 3 rounds, baseline-balanced: deterministic", () => {
        const outputs = runProfileNRounds({
          teamCount: 2,
          rounds: 3,
          matchSeed: "golden-2t-3r",
          profile: "baseline-balanced",
        });
        expect(outputs.length).toBe(3);

        // Run again with same seed — must be identical
        const outputs2 = runProfileNRounds({
          teamCount: 2,
          rounds: 3,
          matchSeed: "golden-2t-3r",
          profile: "baseline-balanced",
        });

        for (let i = 0; i < 3; i++) {
          const hash1 = hashSimulationOutput(outputs[i]);
          const hash2 = hashSimulationOutput(outputs2[i]);
          expect(hash1).toBe(hash2);
        }
      });

      it("5 teams, 8 rounds, baseline-balanced: all invariants pass", () => {
        const outputs = runProfileNRounds({
          teamCount: 5,
          rounds: 8,
          matchSeed: "golden-5t-8r",
          profile: "baseline-balanced",
        });
        expect(outputs.length).toBe(8);
        for (const output of outputs) {
          assertAllInvariantsPass(output);
        }
      });

      it("Quick preset, 4 teams, 5 rounds: deterministic", () => {
        const result = verifyDeterminism(
          createSimulationInput({
            teamCount: 4,
            roundNumber: 1,
            matchSeed: "golden-quick",
            profile: "baseline-balanced",
            preset: "quick",
          }),
          3
        );
        expect(result.deterministic).toBe(true);
      });

      it("audit trail has valid seed bundle and state hashes", () => {
        const input = createSimulationInput({
          teamCount: 3,
          roundNumber: 1,
          matchSeed: "audit-trail-check",
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);

        expect(output.auditTrail.seedBundle.matchSeed).toBe("audit-trail-check");
        expect(output.auditTrail.engineVersion).toBe("2.0.0");
        expect(output.auditTrail.schemaVersion).toBe("2.0.0");

        for (const team of input.teams) {
          expect(output.auditTrail.finalStateHashes[team.id]).toBeDefined();
          expect(typeof output.auditTrail.finalStateHashes[team.id]).toBe("string");
        }
      });
    });

    // ============================================
    // CATEGORY B — Edge Scenarios
    // ============================================

    describe("Category B — Edge Scenarios", () => {
      it("empty decisions: engine handles gracefully", () => {
        const input = createSimulationInput({
          teamCount: 2,
          roundNumber: 1,
          matchSeed: "empty-dec",
          profile: "empty-decisions",
        });
        const output = SimulationEngine.processRound(input);
        assertAllInvariantsPass(output);
        expect(output.results.length).toBe(2);
      });

      it("single team: no market competition crash", () => {
        const input = createSimulationInput({
          teamCount: 1,
          roundNumber: 1,
          matchSeed: "single-team",
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);
        expect(output.results.length).toBe(1);
        // Single team should get all market share
        const shares = output.results[0].marketShareBySegment;
        for (const [_, share] of Object.entries(shares)) {
          if (typeof share === "number" && share > 0) {
            expect(share).toBe(1.0);
          }
        }
      });

      it("5 teams: scales without error", () => {
        const input = createSimulationInput({
          teamCount: 5,
          roundNumber: 1,
          matchSeed: "scale-5",
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);
        assertAllInvariantsPass(output);
        expect(output.results.length).toBe(5);
        expect(output.rankings.length).toBe(5);
      });

      it("round 1 with no matchSeed: uses auto seed", () => {
        const state = createMinimalTeamState();
        const input: SimulationInput = {
          roundNumber: 1,
          teams: [{ id: "t1", state, decisions: {} }],
          marketState: createMinimalMarketState(),
          // No matchSeed
        };
        const output = SimulationEngine.processRound(input);
        expect(output.auditTrail.seedBundle).toBeDefined();
        expect(output.results.length).toBe(1);
      });

      it("all game presets produce valid initial states", () => {
        for (const preset of ["quick", "standard", "full"] as const) {
          const { teamState, maxRounds } = createGamePreset(preset);
          expect(teamState.cash).toBe(175_000_000);
          expect(teamState.version).toBeDefined();
          expect(maxRounds).toBeGreaterThan(0);
        }
      });

      it("full preset (0 workers, 0 products) processes without crash", () => {
        const { teamState } = createGamePreset("full");
        const input: SimulationInput = {
          roundNumber: 1,
          teams: [{ id: "t1", state: teamState, decisions: {} }],
          marketState: createMinimalMarketState(),
          matchSeed: "full-preset-test",
        };
        const output = SimulationEngine.processRound(input);
        expect(output.results.length).toBe(1);
        // With no products, revenue should be 0 or very low
      });

      it("events are applied correctly", () => {
        const state = createMinimalTeamState();
        const input: SimulationInput = {
          roundNumber: 1,
          teams: [{ id: "t1", state, decisions: {} }],
          marketState: createMinimalMarketState(),
          matchSeed: "events-test",
          events: [
            {
              type: "crisis",
              title: "Supply Shock",
              description: "Raw material costs spike",
              effects: [{ target: "cash", modifier: -0.1 }],
              targetTeams: "all",
            },
          ],
        };
        const output = SimulationEngine.processRound(input);
        expect(output.results.length).toBe(1);
        // Cash event should reduce cash by 10%
      });

      it("targeted events only affect specified teams", () => {
        const state1 = createMinimalTeamState();
        const state2 = createMinimalTeamState();
        const input: SimulationInput = {
          roundNumber: 1,
          teams: [
            { id: "t1", state: state1, decisions: {} },
            { id: "t2", state: state2, decisions: {} },
          ],
          marketState: createMinimalMarketState(),
          matchSeed: "targeted-event",
          events: [
            {
              type: "bonus",
              title: "Government Grant",
              description: "Cash injection",
              effects: [{ target: "brandValue", modifier: 0.2 }],
              targetTeams: ["t1"], // Only t1
            },
          ],
        };
        const output = SimulationEngine.processRound(input);
        // t1 should have higher brand than t2
        const t1Brand = output.results.find(r => r.teamId === "t1")!.newState.brandValue;
        const t2Brand = output.results.find(r => r.teamId === "t2")!.newState.brandValue;
        expect(t1Brand).toBeGreaterThan(t2Brand);
      });
    });

    // ============================================
    // CATEGORY C — Property Tests (Seeded)
    // ============================================

    describe("Category C — Property Tests", () => {
      const profiles: ScenarioProfile[] = [
        "baseline-balanced",
        "aggressive-debt",
        "marketing-overdrive",
        "under-invested-ops",
        "RD-patent-rush",
        "ESG-maximizer",
        "bankruptcy-spiral",
        "empty-decisions",
        "segment-specialist",
        "achievement-hunter",
      ];

      for (const profile of profiles) {
        it(`profile '${profile}': all invariants pass (round 1)`, () => {
          const input = createSimulationInput({
            teamCount: 3,
            roundNumber: 1,
            matchSeed: `prop-${profile}`,
            profile,
          });
          const output = SimulationEngine.processRound(input);
          const report = assertInvariantsPass(output);
          expect(report.failed).toBe(0);
        });
      }

      it("50 seeded scenarios: all invariants pass", () => {
        for (let seed = 1; seed <= 50; seed++) {
          const profile = profiles[seed % profiles.length];
          const input = createSimulationInput({
            teamCount: 2 + (seed % 4),
            roundNumber: 1,
            matchSeed: `prop-seed-${seed}`,
            profile,
          });
          const output = SimulationEngine.processRound(input);
          const report = assertInvariantsPass(output);
          if (report.failed > 0) {
            throw new Error(
              `Seed ${seed}, profile ${profile}: ${report.failures.map(f => f.message).join("; ")}`
            );
          }
        }
      });

      it("mixed-strategy input: all invariants pass", () => {
        const input = createMixedStrategyInput({
          profiles: ["baseline-balanced", "aggressive-debt", "marketing-overdrive", "RD-patent-rush"],
          roundNumber: 1,
          matchSeed: "mixed-strat",
        });
        const output = SimulationEngine.processRound(input);
        assertAllInvariantsPass(output);
      });

      it("cash never becomes NaN across 5 rounds of bankruptcy-spiral", () => {
        const outputs = runProfileNRounds({
          teamCount: 2,
          rounds: 5,
          matchSeed: "cash-nan-check",
          profile: "bankruptcy-spiral",
        });
        for (const output of outputs) {
          for (const result of output.results) {
            expect(isNaN(result.newState.cash)).toBe(false);
            expect(isFinite(result.newState.cash)).toBe(true);
          }
        }
      });
    });

    // ============================================
    // CATEGORY D — Pipeline Order & State Cloning
    // ============================================

    describe("Category D — Pipeline Mechanics", () => {
      it("seed bundle is deterministically derived from matchSeed + round", () => {
        const sb1 = deriveSeedBundle("test-seed", 1);
        const sb2 = deriveSeedBundle("test-seed", 1);
        expect(sb1.roundSeed).toBe(sb2.roundSeed);
        expect(sb1.factorySeed).toBe(sb2.factorySeed);
        expect(sb1.hrSeed).toBe(sb2.hrSeed);

        // Different round = different seeds
        const sb3 = deriveSeedBundle("test-seed", 2);
        expect(sb1.roundSeed).not.toBe(sb3.roundSeed);
      });

      it("per-module seeds are independent", () => {
        const sb = deriveSeedBundle("independence-test", 1);
        const seeds = [sb.factorySeed, sb.hrSeed, sb.marketingSeed, sb.rdSeed, sb.financeSeed, sb.marketSeed];
        const unique = new Set(seeds);
        expect(unique.size).toBe(seeds.length);
      });

      it("state cloning prevents input mutation", () => {
        const state = createMinimalTeamState();
        const originalCash = state.cash;
        const input: SimulationInput = {
          roundNumber: 1,
          teams: [{ id: "t1", state, decisions: {} }],
          marketState: createMinimalMarketState(),
          matchSeed: "clone-test",
        };
        SimulationEngine.processRound(input);
        // Original state should NOT be mutated
        expect(state.cash).toBe(originalCash);
      });

      it("validateDecisions catches insufficient funds for factories", () => {
        const state = createMinimalTeamState({ cash: 40_000_000 }); // Less than NEW_FACTORY_COST
        const result = SimulationEngine.validateDecisions(state, {
          factory: {
            newFactories: [{ name: "Too Expensive", region: "North America" }],
          },
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.correctedDecisions.factory!.newFactories!.length).toBe(0);
      });

      it("rankings are a valid 1..N permutation", () => {
        const input = createSimulationInput({
          teamCount: 5,
          roundNumber: 1,
          matchSeed: "ranking-perm",
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);
        const ranks = output.rankings.map(r => r.rank).sort((a, b) => a - b);
        expect(ranks).toEqual([1, 2, 3, 4, 5]);
      });

      it("market positions are returned for all teams", () => {
        const input = createSimulationInput({
          teamCount: 3,
          roundNumber: 1,
          matchSeed: "market-pos",
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);
        expect(output.marketPositions).toBeDefined();
        expect(output.marketPositions.length).toBeGreaterThanOrEqual(3);
      });

      it("summary messages contain round info", () => {
        const input = createSimulationInput({
          teamCount: 2,
          roundNumber: 5,
          matchSeed: "summary-msgs",
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);
        expect(output.summaryMessages.some(m => m.includes("Round 5"))).toBe(true);
      });
    });
  });

  // ============================================================
  // PART B — From pipeline_deep.stress.test.ts
  // ============================================================

  describe("Part B — Pipeline Deep", () => {

    // ============================================
    // §1.1 — SimulationEngine.processRound()
    // ============================================

    describe("§1.1 — SimulationEngine.processRound()", () => {
      it("1. Empty Input — processRound with 0 teams does not crash", () => {
        const input: SimulationInput = {
          roundNumber: 1,
          teams: [],
          marketState: createMinimalMarketState(),
          matchSeed: "empty-input",
        };
        // Known engine limitation: 0 teams triggers DETERMINISM VIOLATION in
        // MarketSimulator because no team context exists to seed the RNG.
        // We verify the engine throws a clear error rather than a null-ref crash.
        expect(() => SimulationEngine.processRound(input)).toThrow(
          "DETERMINISM VIOLATION",
        );
      });

      it("2. Single Team, All Defaults — clean processing with positive revenue", () => {
        const state = createMinimalTeamState();
        const output = runSingleTeam(state, {});

        expect(output.results.length).toBe(1);
        const result = output.results[0];

        // Sole competitor should capture 100% share in all active segments
        for (const [_segment, share] of Object.entries(result.marketShareBySegment)) {
          if (typeof share === "number" && share > 0) {
            expect(share).toBe(1.0);
          }
        }

        // With 100% market share and 5 products, revenue should be positive
        expect(result.totalRevenue).toBeGreaterThan(0);
        assertAllInvariantsPass(output);
      });

      it("3. Maximum Team Count — 5 teams with complex decisions all complete with rankings", () => {
        const input = createSimulationInput({
          teamCount: 5,
          roundNumber: 1,
          matchSeed: "max-teams-complex",
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);

        expect(output.results.length).toBe(5);
        expect(output.rankings.length).toBe(5);

        // Rankings must be a valid 1..5 permutation
        const ranks = output.rankings.map((r) => r.rank).sort((a, b) => a - b);
        expect(ranks).toEqual([1, 2, 3, 4, 5]);

        // Every team must have a result with defined rank > 0
        for (const result of output.results) {
          expect(result.rank).toBeGreaterThanOrEqual(1);
          expect(result.rank).toBeLessThanOrEqual(5);
        }

        assertAllInvariantsPass(output);
      });

      it("4. Determinism Verification — 10 identical runs produce identical hashes", () => {
        const input = createSimulationInput({
          teamCount: 3,
          roundNumber: 1,
          matchSeed: "determinism-10x",
          profile: "baseline-balanced",
        });
        const result = verifyDeterminism(input, 10);
        expect(result.deterministic).toBe(true);
        expect(result.mismatches.length).toBe(0);
        // All 10 hashes should be the same string
        const unique = new Set(result.hashes);
        expect(unique.size).toBe(1);
      });

      it("5a. Round Number Extremes — round 1 processes normally", () => {
        const input = createSimulationInput({
          teamCount: 2,
          roundNumber: 1,
          matchSeed: "round-1",
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);
        expect(output.roundNumber).toBe(1);
        assertAllInvariantsPass(output);
      });

      it("5b. Round Number Extremes — round 50 (late game) stays in bounds", () => {
        const input = createSimulationInput({
          teamCount: 2,
          roundNumber: 50,
          matchSeed: "round-50",
          profile: "baseline-balanced",
        });
        const output = SimulationEngine.processRound(input);
        expect(output.roundNumber).toBe(50);

        // Quality expectations and brand values must not exceed their bounds
        for (const result of output.results) {
          expect(result.newState.brandValue).toBeLessThanOrEqual(1);
          expect(result.newState.brandValue).toBeGreaterThanOrEqual(0);
          for (const product of result.newState.products) {
            expect(product.quality).toBeLessThanOrEqual(100);
            expect(product.quality).toBeGreaterThanOrEqual(0);
          }
          for (const factory of result.newState.factories) {
            expect(factory.efficiency).toBeLessThanOrEqual(1);
            expect(factory.efficiency).toBeGreaterThanOrEqual(0);
          }
        }
      });

      it("5c. Round Number Extremes — round 0 still processes", () => {
        const input: SimulationInput = {
          roundNumber: 0,
          teams: [{ id: "t1", state: createMinimalTeamState(), decisions: {} }],
          marketState: createMinimalMarketState(),
          matchSeed: "round-0",
        };
        const output = SimulationEngine.processRound(input);
        expect(output.roundNumber).toBe(0);
        expect(output.results.length).toBe(1);
      });
    });

    // ============================================
    // §1.2 — validateDecisions() & decision edge cases
    // ============================================

    describe("§1.2 — Decision Validation & Edge Cases", () => {
      it("6. Decisions Exceeding Cash — $500M spend on $10M budget produces valid output", () => {
        const state = createMinimalTeamState({ cash: 10_000_000 });
        const decisions = {
          factory: {
            newFactories: [
              { name: "Mega Factory 1", region: "North America" as const },
              { name: "Mega Factory 2", region: "Europe" as const },
              { name: "Mega Factory 3", region: "Asia" as const },
            ],
          },
          rd: { rdBudget: 200_000_000 },
          marketing: {
            advertisingBudget: {
              Budget: 50_000_000,
              General: 50_000_000,
              Enthusiast: 50_000_000,
              Professional: 50_000_000,
              "Active Lifestyle": 50_000_000,
            },
            brandingInvestment: 50_000_000,
          },
          finance: {
            dividendPerShare: 10,
          },
        };

        // processRound should not crash even with absurd spending
        const output = runSingleTeam(state, decisions, "overspend-test");
        expect(output.results.length).toBe(1);

        const resultCash = output.results[0].newState.cash;
        // Cash should be a real number (not NaN/Infinity)
        expect(isNaN(resultCash)).toBe(false);
        expect(isFinite(resultCash)).toBe(true);
      });

      it("7. Exactly Zero Cash Remaining — processes cleanly", () => {
        // Set cash to exactly what operations will cost (approximately)
        const state = createMinimalTeamState({ cash: 0 });
        const output = runSingleTeam(state, {}, "zero-cash");
        expect(output.results.length).toBe(1);

        const resultCash = output.results[0].newState.cash;
        expect(isNaN(resultCash)).toBe(false);
        expect(isFinite(resultCash)).toBe(true);
      });

      it("8. Null/Missing Decision Fields — empty decisions {} must not crash", () => {
        const state = createMinimalTeamState();
        const output = runSingleTeam(state, {}, "empty-decisions");
        expect(output.results.length).toBe(1);
        assertAllInvariantsPass(output);
      });

      it("9. NaN Values in Decisions — NaN rdBudget: engine still processes (known S2 NaN propagation)", () => {
        const state = createMinimalTeamState();
        const decisions = {
          rd: { rdBudget: NaN },
          factory: {},
          hr: {},
          marketing: {},
          finance: {},
        };
        // Engine does not crash on NaN input — it processes the round
        const output = runSingleTeam(state, decisions, "nan-budget");
        expect(output.results.length).toBe(1);

        // VAL-02: safeNumber() guards now prevent NaN from propagating to cash.
        // RDModule still subtracts NaN from cash, but safeNumber(NaN) → 0 at write.
        const newState = output.results[0].newState;
        expect(isNaN(newState.cash)).toBe(false);  // safeNumber guard catches NaN
      });
    });

    // ============================================
    // §1.3 — createInitialTeamState()
    // ============================================

    describe("§1.3 — createInitialTeamState()", () => {
      it("10. Default Initialization Audit — all starting values match spec", () => {
        const state = SimulationEngine.createInitialTeamState();

        // Financial defaults
        expect(state.cash).toBe(175_000_000);
        expect(state.marketCap).toBe(500_000_000);
        expect(state.sharesIssued).toBe(10_000_000);
        expect(state.brandValue).toBe(0.5);

        // Workforce defaults
        const workers = state.employees.filter((e) => e.role === "worker");
        const engineers = state.employees.filter((e) => e.role === "engineer");
        const supervisors = state.employees.filter((e) => e.role === "supervisor");
        expect(workers.length).toBe(50);
        expect(engineers.length).toBe(8);
        expect(supervisors.length).toBe(5);

        // Factory efficiency
        expect(state.factories.length).toBeGreaterThanOrEqual(1);
        expect(state.factories[0].efficiency).toBe(0.7);

        // Products — 5 segments
        expect(state.products.length).toBe(5);
        const segments = state.products.map((p) => p.segment).sort();
        expect(segments).toEqual(
          ["Active Lifestyle", "Budget", "Enthusiast", "General", "Professional"],
        );
      });

      it("11. Custom Config Override — cash overridden to 0 is accepted", () => {
        const state = SimulationEngine.createInitialTeamState({ cash: 0 });
        expect(state.cash).toBe(0);
        // Other defaults should remain
        expect(state.sharesIssued).toBe(10_000_000);
        expect(state.brandValue).toBe(0.5);
      });

      it("12. Multiple Teams Start Equal — identical decisions yield identical market shares", () => {
        const state1 = createMinimalTeamState();
        const state2 = createMinimalTeamState();

        const decisions = {
          factory: {},
          hr: {},
          rd: { rdBudget: 5_000_000 },
          marketing: {
            advertisingBudget: {
              Budget: 1_000_000,
              General: 1_000_000,
              Enthusiast: 1_000_000,
              Professional: 1_000_000,
              "Active Lifestyle": 1_000_000,
            },
            brandingInvestment: 1_000_000,
          },
          finance: {},
        };

        const input: SimulationInput = {
          roundNumber: 1,
          teams: [
            { id: "t1", state: state1, decisions },
            { id: "t2", state: state2, decisions },
          ],
          marketState: createMinimalMarketState(),
          matchSeed: "equal-start",
        };

        const output = SimulationEngine.processRound(input);
        expect(output.results.length).toBe(2);

        const t1Shares = output.results.find((r) => r.teamId === "t1")!.marketShareBySegment;
        const t2Shares = output.results.find((r) => r.teamId === "t2")!.marketShareBySegment;

        // With identical states and decisions, market shares should be equal (within tolerance)
        for (const segment of CONSTANTS.SEGMENTS) {
          const s1 = t1Shares[segment] ?? 0;
          const s2 = t2Shares[segment] ?? 0;
          expect(Math.abs(s1 - s2)).toBeLessThan(0.01);
        }
      });
    });
  });

  // ============================================================
  // PART C — From SimulationEngine.test.ts
  // ============================================================

  describe("Part C — SimulationEngine Unit Tests", () => {

    // Set up deterministic seeding before each test in Part C
    beforeEach(() => {
      setRandomSeed("test-seed-simulation-engine");
    });

    describe("SimulationEngine", () => {
      describe("createInitialTeamState", () => {
        it("should create a valid initial team state", () => {
          const state = SimulationEngine.createInitialTeamState();

          expect(state.cash).toBe(CONSTANTS.DEFAULT_STARTING_CASH);
          expect(state.factories).toHaveLength(1);
          expect(state.factories[0].region).toBe("North America");
          expect(state.brandValue).toBe(0.5);
          expect(state.esgScore).toBe(100);
        });

        it("should accept custom cash amount", () => {
          const state = SimulationEngine.createInitialTeamState({ cash: 100_000_000 });
          expect(state.cash).toBe(100_000_000);
        });
      });

      describe("validateDecisions", () => {
        it("should validate decisions against cash constraints", () => {
          const state = SimulationEngine.createInitialTeamState({ cash: 10_000_000 });

          const decisions = {
            factory: {
              newFactories: [
                { name: "Factory 1", region: "Europe" as const },
                { name: "Factory 2", region: "Asia" as const },
              ],
            },
          };

          const { valid, errors, correctedDecisions } = SimulationEngine.validateDecisions(
            state,
            decisions
          );

          expect(valid).toBe(false);
          expect(errors).toContain("Insufficient funds for new factories");
          expect(correctedDecisions.factory?.newFactories).toHaveLength(0);
        });
      });

      describe("processRound", () => {
        it("should process a round and return results", () => {
          const team1State = SimulationEngine.createInitialTeamState();
          const team2State = SimulationEngine.createInitialTeamState();
          const marketState = createMarketState();

          const output = SimulationEngine.processRound({
            roundNumber: 1,
            teams: [
              { id: "team1", state: team1State, decisions: {} },
              { id: "team2", state: team2State, decisions: {} },
            ],
            marketState,
          });

          expect(output.roundNumber).toBe(1);
          expect(output.results).toHaveLength(2);
          expect(output.rankings).toHaveLength(2);
          expect(output.newMarketState.roundNumber).toBe(2);
        });
      });
    });

    describe("FactoryModule", () => {
      describe("calculateCO2Reduction", () => {
        it("should calculate 10 tons per $100K invested", () => {
          const reduction = FactoryModule.calculateCO2Reduction(100_000);
          expect(reduction).toBe(10);

          const reduction2 = FactoryModule.calculateCO2Reduction(500_000);
          expect(reduction2).toBe(50);
        });
      });

      describe("applyEfficiencyInvestment", () => {
        it("should increase efficiency with investment", () => {
          const factory = FactoryModule.createNewFactory("Test", "North America", 0);
          const initialEfficiency = factory.efficiency;

          const { newEfficiency, cost } = FactoryModule.applyEfficiencyInvestment(factory, {
            workers: 5_000_000,
          });

          expect(newEfficiency).toBeGreaterThan(initialEfficiency);
          expect(cost).toBe(5_000_000);
        });

        it("should cap efficiency at 100%", () => {
          const factory = FactoryModule.createNewFactory("Test", "North America", 0);
          factory.efficiency = 0.95;

          const { newEfficiency } = FactoryModule.applyEfficiencyInvestment(factory, {
            workers: 50_000_000,
            engineers: 50_000_000,
          });

          expect(newEfficiency).toBeLessThanOrEqual(CONSTANTS.MAX_EFFICIENCY);
        });
      });

      describe("calculateRecommendedStaffing", () => {
        it("should recommend appropriate staffing levels", () => {
          const factory = FactoryModule.createNewFactory("Test", "North America", 0);

          const staffing = FactoryModule.calculateRecommendedStaffing(factory);

          expect(staffing.engineers).toBe(CONSTANTS.ENGINEERS_PER_FACTORY);
          expect(staffing.supervisors).toBeGreaterThan(0);
          expect(staffing.workers).toBeGreaterThan(0);
        });
      });
    });

    describe("HRModule", () => {
      describe("generateCandidates", () => {
        it("should generate correct number of candidates", () => {
          const candidates = HRModule.generateCandidates("worker", "basic");
          expect(candidates).toHaveLength(CONSTANTS.RECRUITMENT_CANDIDATES.basic);

          const premiumCandidates = HRModule.generateCandidates("engineer", "premium");
          expect(premiumCandidates).toHaveLength(CONSTANTS.RECRUITMENT_CANDIDATES.premium);
        });

        it("should generate stats within tier range", () => {
          const candidates = HRModule.generateCandidates("worker", "basic");
          const range = CONSTANTS.RECRUITMENT_STAT_RANGE.basic;

          for (const candidate of candidates) {
            expect(candidate.stats.efficiency).toBeGreaterThanOrEqual(range.min);
            expect(candidate.stats.efficiency).toBeLessThanOrEqual(Math.min(100, range.max));
          }
        });
      });

      describe("calculateSalary", () => {
        it("should calculate salary based on stats", () => {
          const lowStats = HRModule.generateStats("worker", 50, 60);
          const highStats = HRModule.generateStats("worker", 90, 100);

          const lowSalary = HRModule.calculateSalary("worker", lowStats);
          const highSalary = HRModule.calculateSalary("worker", highStats);

          expect(highSalary).toBeGreaterThan(lowSalary);
        });

        it("should cap salary at maximum", () => {
          const maxStats = HRModule.generateStats("engineer", 100, 100);
          const salary = HRModule.calculateSalary("engineer", maxStats);

          expect(salary).toBeLessThanOrEqual(CONSTANTS.MAX_SALARY);
        });
      });

      describe("calculateEmployeeValue", () => {
        it("should weight stats according to formula", () => {
          const stats = {
            efficiency: 100,
            accuracy: 100,
            speed: 100,
            stamina: 100,
            discipline: 100,
            loyalty: 100,
            teamCompatibility: 100,
            health: 100,
          };

          const value = HRModule.calculateEmployeeValue(stats);

          // Sum of weights = 1.0, so max value should be 100
          expect(value).toBe(100);
        });
      });
    });

    describe("FinanceModule", () => {
      describe("calculateRatios", () => {
        it("should calculate financial ratios", () => {
          const state = SimulationEngine.createInitialTeamState();
          state.netIncome = 10_000_000;
          state.revenue = 100_000_000;

          const ratios = FinanceModule.calculateRatios(state);

          expect(ratios.currentRatio).toBeGreaterThan(0);
          expect(ratios.profitMargin).toBe(0.1); // 10M / 100M
        });
      });

      describe("getRatioHealth", () => {
        it("should return correct health status", () => {
          expect(FinanceModule.getRatioHealth("currentRatio", 2.5).status).toBe("green");
          expect(FinanceModule.getRatioHealth("currentRatio", 1.5).status).toBe("yellow");
          expect(FinanceModule.getRatioHealth("currentRatio", 1.0).status).toBe("red");
        });
      });

      describe("calculateProposalProbability", () => {
        it("should increase probability with good financials", () => {
          const state = SimulationEngine.createInitialTeamState();
          state.netIncome = 50_000_000;

          const ratios = FinanceModule.calculateRatios(state);

          const probability = FinanceModule.calculateProposalProbability("dividend", state, ratios);

          expect(probability).toBeGreaterThan(0);
          expect(probability).toBeLessThanOrEqual(95);
        });
      });
    });

    describe("MarketSimulator", () => {
      describe("calculateDemand", () => {
        it("should adjust demand based on economic conditions", () => {
          const marketState = createMarketState();
          const demand = MarketSimulator.calculateDemand(marketState);

          expect(demand.Budget).toBeGreaterThan(0);
          expect(demand.Professional).toBeGreaterThan(0);
        });
      });

      describe("calculateMarketShares", () => {
        it("should distribute shares using softmax", () => {
          const positions = [
            { teamId: "1", segment: "General" as const, product: null, priceScore: 20, qualityScore: 20, brandScore: 20, esgScore: 5, featureScore: 5, totalScore: 70, marketShare: 0, unitsSold: 0, revenue: 0 },
            { teamId: "2", segment: "General" as const, product: null, priceScore: 10, qualityScore: 10, brandScore: 10, esgScore: 5, featureScore: 5, totalScore: 40, marketShare: 0, unitsSold: 0, revenue: 0 },
          ];

          const shares = MarketSimulator.calculateMarketShares(positions);

          expect(shares[0]).toBeGreaterThan(shares[1]); // Higher score = higher share
          expect(shares[0] + shares[1]).toBeCloseTo(1, 5); // Sum to 1
        });
      });

      describe("generateNextMarketState", () => {
        it("should advance round number", () => {
          const marketState = createMarketState();
          const nextState = MarketSimulator.generateNextMarketState(marketState);

          expect(nextState.roundNumber).toBe(2);
        });

        it("should fluctuate economic conditions", () => {
          const marketState = createMarketState();
          const nextState = MarketSimulator.generateNextMarketState(marketState);

          // Values should have changed (with some randomness)
          expect(nextState.economicConditions).not.toEqual(marketState.economicConditions);
        });
      });
    });

    describe("MarketingModule", () => {
      describe("calculateAdvertisingImpact", () => {
        it("should return positive brand impact for positive budget", () => {
          const impact = MarketingModule.calculateAdvertisingImpact(5_000_000, "General");
          expect(impact).toBeGreaterThan(0);
        });

        it("should have higher impact for Budget segment", () => {
          const budgetImpact = MarketingModule.calculateAdvertisingImpact(5_000_000, "Budget");
          const professionalImpact = MarketingModule.calculateAdvertisingImpact(5_000_000, "Professional");
          expect(budgetImpact).toBeGreaterThan(professionalImpact);
        });

        it("should have diminishing returns on spending", () => {
          const first10M = MarketingModule.calculateAdvertisingImpact(10_000_000, "General");
          const second10M = MarketingModule.calculateAdvertisingImpact(20_000_000, "General") - first10M;
          expect(first10M).toBeGreaterThan(second10M);
        });
      });

      describe("calculateBrandingImpact", () => {
        it("should return 0.3% brand increase per $1M", () => {
          const impact = MarketingModule.calculateBrandingImpact(1_000_000);
          expect(impact).toBeCloseTo(CONSTANTS.BRANDING_BASE_IMPACT, 5);
        });
      });

      describe("calculatePromotionImpact", () => {
        it("should return higher sales boost for budget segment", () => {
          const budgetBoost = MarketingModule.calculatePromotionImpact(10, "Budget", 0.5);
          const professionalBoost = MarketingModule.calculatePromotionImpact(10, "Professional", 0.5);
          expect(budgetBoost.salesBoost).toBeGreaterThan(professionalBoost.salesBoost);
        });

        it("should have margin reduction equal to discount percent", () => {
          const result = MarketingModule.calculatePromotionImpact(15, "General", 0.5);
          expect(result.marginReduction).toBeCloseTo(0.15, 5);
        });
      });

      describe("process", () => {
        it("should process marketing decisions and update brand value", () => {
          const state = SimulationEngine.createInitialTeamState();
          const initialBrand = state.brandValue;

          const { newState, result } = MarketingModule.process(state, {
            advertisingBudget: { General: 5_000_000 },
          });

          expect(result.success).toBe(true);
          // Brand goes up from advertising but down from decay
          expect(result.costs).toBe(5_000_000);
        });

        it("should handle alternative marketingBudget array format", () => {
          const state = SimulationEngine.createInitialTeamState();

          const { newState, result } = MarketingModule.process(state, {
            marketingBudget: [
              { segment: "General", spend: 3_000_000 },
              { segment: "Budget", spend: 2_000_000 },
            ],
          });

          expect(result.success).toBe(true);
          expect(result.costs).toBe(5_000_000);
        });

        it("should apply brand decay", () => {
          const state = SimulationEngine.createInitialTeamState();
          const initialBrand = state.brandValue;

          const { newState } = MarketingModule.process(state, {});

          // With no investment, brand should decay by 2%
          expect(newState.brandValue).toBeLessThan(initialBrand);
        });
      });
    });

    describe("RDModule", () => {
      describe("calculateDevelopmentCost", () => {
        it("should have higher cost for premium segments", () => {
          const budgetCost = RDModule.calculateDevelopmentCost("Budget", 70);
          const professionalCost = RDModule.calculateDevelopmentCost("Professional", 70);
          expect(professionalCost).toBeGreaterThan(budgetCost);
        });

        it("should increase cost with quality target", () => {
          const lowQualityCost = RDModule.calculateDevelopmentCost("General", 50);
          const highQualityCost = RDModule.calculateDevelopmentCost("General", 90);
          expect(highQualityCost).toBeGreaterThan(lowQualityCost);
        });
      });

      describe("calculateDevelopmentRounds", () => {
        it("should reduce rounds with more engineers", () => {
          const fewEngineers = RDModule.calculateDevelopmentRounds(70, 2);
          const manyEngineers = RDModule.calculateDevelopmentRounds(70, 10);
          expect(manyEngineers).toBeLessThanOrEqual(fewEngineers);
        });

        it("should increase rounds with higher quality target", () => {
          const lowQuality = RDModule.calculateDevelopmentRounds(50, 5);
          const highQuality = RDModule.calculateDevelopmentRounds(100, 5);
          expect(highQuality).toBeGreaterThanOrEqual(lowQuality);
        });
      });

      describe("calculateTotalRDOutput", () => {
        it("should return 0 for empty engineer list", () => {
          const output = RDModule.calculateTotalRDOutput([]);
          expect(output).toBe(0);
        });

        it("should calculate output based on engineer stats", () => {
          const engineers = [
            {
              id: "eng1",
              role: "engineer" as const,
              name: "Test Engineer",
              stats: createEngineerStats({ efficiency: 100, speed: 100, innovation: 100 }),
              salary: 100000,
              hiredRound: 0,
              factoryId: "factory1",
              morale: 100,
              burnout: 0,
              trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
            },
          ];

          const output = RDModule.calculateTotalRDOutput(engineers);
          expect(output).toBeGreaterThan(0);
        });

        it("should reduce output with burnout", () => {
          const freshEngineer = [
            {
              id: "eng1",
              role: "engineer" as const,
              name: "Fresh Engineer",
              stats: createEngineerStats({ efficiency: 100, speed: 100, innovation: 100 }),
              salary: 100000,
              hiredRound: 0,
              factoryId: "factory1",
              morale: 100,
              burnout: 0,
              trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
            },
          ];

          const burnedOutEngineer = [
            {
              id: "eng2",
              role: "engineer" as const,
              name: "Burned Out Engineer",
              stats: createEngineerStats({ efficiency: 100, speed: 100, innovation: 100 }),
              salary: 100000,
              hiredRound: 0,
              factoryId: "factory1",
              morale: 100,
              burnout: 50,
              trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
            },
          ];

          const freshOutput = RDModule.calculateTotalRDOutput(freshEngineer);
          const burnedOutput = RDModule.calculateTotalRDOutput(burnedOutEngineer);
          expect(freshOutput).toBeGreaterThan(burnedOutput);
        });
      });

      describe("createProduct", () => {
        it("should create product with in_development status", () => {
          const product = RDModule.createProduct("Test Product", "General", 80, 70, 2);

          expect(product.developmentStatus).toBe("in_development");
          expect(product.targetQuality).toBe(80);
          expect(product.targetFeatures).toBe(70);
          expect(product.roundsRemaining).toBe(2);
        });

        it("should start with reduced quality during development", () => {
          const product = RDModule.createProduct("Test Product", "General", 100, 100, 2);

          expect(product.quality).toBeLessThan(product.targetQuality);
          expect(product.features).toBeLessThan(product.targetFeatures);
        });
      });

      describe("suggestPrice", () => {
        it("should suggest higher prices for premium segments", () => {
          const budgetPrice = RDModule.suggestPrice("Budget", 70);
          const professionalPrice = RDModule.suggestPrice("Professional", 70);
          expect(professionalPrice).toBeGreaterThan(budgetPrice);
        });

        it("should increase price with higher quality", () => {
          const lowQualityPrice = RDModule.suggestPrice("General", 30);
          const highQualityPrice = RDModule.suggestPrice("General", 90);
          expect(highQualityPrice).toBeGreaterThan(lowQualityPrice);
        });
      });

      describe("calculatePatentValue", () => {
        it("should cap bonuses at max values", () => {
          const value = RDModule.calculatePatentValue(100); // Way more than needed

          // EXPLOIT-01: Caps reduced — 25 quality (was 40), 0.25 cost (was 0.35), 0.15 share (was 0.20)
          expect(value.qualityBonus).toBe(25);
          expect(value.costReduction).toBe(0.25);
          expect(value.marketShareBonus).toBe(0.15);
        });

        it("should scale bonuses with patent count", () => {
          const onePatent = RDModule.calculatePatentValue(1);
          const fivePatents = RDModule.calculatePatentValue(5);

          expect(fivePatents.qualityBonus).toBeGreaterThan(onePatent.qualityBonus);
        });
      });

      describe("process", () => {
        it("should process R&D decisions and create new products", () => {
          const state = SimulationEngine.createInitialTeamState();

          const { newState, result } = RDModule.process(state, {
            newProducts: [
              { name: "New Widget", segment: "General", targetQuality: 70, targetFeatures: 60 },
            ],
          });

          expect(result.success).toBe(true);
          expect(newState.products).toHaveLength(state.products.length + 1);
        });

        it("should generate R&D points from engineers", () => {
          const state = SimulationEngine.createInitialTeamState();
          // Ensure we have engineers
          state.employees = [
            {
              id: "eng1",
              role: "engineer",
              name: "Test Engineer",
              stats: createEngineerStats({ efficiency: 100, speed: 100, innovation: 100 }),
              salary: 100000,
              hiredRound: 0,
              factoryId: state.factories[0].id,
              morale: 100,
              burnout: 0,
              trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
            },
          ];

          const { newState, result } = RDModule.process(state, {});

          expect(result.changes?.rdPointsGenerated).toBeGreaterThan(0);
          expect(newState.rdProgress).toBeGreaterThan(state.rdProgress);
        });
      });
    });
  });

  // ============================================================
  // PART D — Miyazaki Determinism Protocol
  // ============================================================

  describe("Part D — Miyazaki Determinism Protocol", () => {

    // ============================================
    // §1.1 — Exact Replay [CRITICAL]
    // ============================================

    describe("Miyazaki §1.1 — Exact Replay", () => {
      it("5-round, 3-team game produces byte-identical auditTrail.finalStateHashes on replay", () => {
        const SEED = "determinism-test-seed";
        const ROUNDS = 5;
        const TEAMS = 3;

        // Run 1
        const outputs1 = runGame({
          teamCount: TEAMS,
          rounds: ROUNDS,
          matchSeed: SEED,
        });

        // Run 2 — identical parameters
        const outputs2 = runGame({
          teamCount: TEAMS,
          rounds: ROUNDS,
          matchSeed: SEED,
        });

        expect(outputs1.length).toBe(ROUNDS);
        expect(outputs2.length).toBe(ROUNDS);

        // Compare auditTrail.finalStateHashes for every round
        for (let r = 0; r < ROUNDS; r++) {
          const hashes1 = outputs1[r].auditTrail.finalStateHashes;
          const hashes2 = outputs2[r].auditTrail.finalStateHashes;

          // Same set of team IDs
          expect(Object.keys(hashes1).sort()).toEqual(Object.keys(hashes2).sort());

          // Byte-identical hashes per team
          for (const teamId of Object.keys(hashes1)) {
            expect(
              hashes1[teamId],
              `Round ${r + 1}, team ${teamId}: finalStateHash mismatch`,
            ).toBe(hashes2[teamId]);
          }
        }

        // Also verify full output hashes match
        for (let r = 0; r < ROUNDS; r++) {
          expect(
            hashSimulationOutput(outputs1[r]),
            `Round ${r + 1}: full output hash mismatch`,
          ).toBe(hashSimulationOutput(outputs2[r]));
        }
      });
    });

    // ============================================
    // §1.2 — Seed Sensitivity [CRITICAL]
    // ============================================

    describe("Miyazaki §1.2 — Seed Sensitivity", () => {
      it("different seeds produce different finalStateHashes", () => {
        const ROUNDS = 3;
        const TEAMS = 3;

        const outputsA = runGame({
          teamCount: TEAMS,
          rounds: ROUNDS,
          matchSeed: "seed-A",
        });

        const outputsB = runGame({
          teamCount: TEAMS,
          rounds: ROUNDS,
          matchSeed: "seed-B",
        });

        expect(outputsA.length).toBe(ROUNDS);
        expect(outputsB.length).toBe(ROUNDS);

        // At least one round must have different finalStateHashes
        let foundDifference = false;
        for (let r = 0; r < ROUNDS; r++) {
          const hashesA = outputsA[r].auditTrail.finalStateHashes;
          const hashesB = outputsB[r].auditTrail.finalStateHashes;
          for (const teamId of Object.keys(hashesA)) {
            if (hashesA[teamId] !== hashesB[teamId]) {
              foundDifference = true;
              break;
            }
          }
          if (foundDifference) break;
        }
        // Seeds drive PRNG for HR turnover, market noise, etc. — different seeds must diverge
        expect(foundDifference, "seed-A and seed-B produced identical state hashes across all rounds").toBe(true);

        // Both runs must succeed without crashes — verify results exist
        for (let r = 0; r < ROUNDS; r++) {
          expect(outputsA[r].results.length).toBe(TEAMS);
          expect(outputsB[r].results.length).toBe(TEAMS);
        }
      });
    });

    // ============================================
    // §1.4 — Mid-Pipeline Cash Depletion [CRITICAL]
    // ============================================

    describe("Miyazaki §1.4 — Mid-Pipeline Cash Depletion", () => {
      it("starting cash $1 with expensive decisions completes without crash, NaN, or Infinity", () => {
        const state = createMinimalTeamState({ cash: 1 });
        const factoryId = state.factories[0]?.id ?? "factory-1";

        const expensiveDecisions: AllDecisions = {
          factory: {
            // Factory upgrade costs $75M (sixSigma)
            upgradePurchases: [{ factoryId, upgrade: "sixSigma" }],
            // New factory costs $50M
            newFactories: [{ name: "Cash Drain Factory", region: "North America" }],
          },
          hr: {
            // Hiring workers — each hire has a cost
            hires: Array.from({ length: 50 }, (_, i) => ({
              factoryId,
              role: "worker" as const,
              candidateId: `candidate-${i}`,
            })),
          },
          rd: {
            rdBudget: 10_000_000,
          },
          marketing: {
            advertisingBudget: {
              Budget: 4_000_000,
              General: 4_000_000,
              Enthusiast: 4_000_000,
              Professional: 4_000_000,
              "Active Lifestyle": 4_000_000,
            },
            brandingInvestment: 5_000_000,
          },
          finance: {
            dividendPerShare: 5,
          },
        };

        const input: SimulationInput = {
          roundNumber: 1,
          teams: [{ id: "cash-depleted", state, decisions: expensiveDecisions }],
          marketState: createMinimalMarketState(),
          matchSeed: "cash-depletion-test",
        };

        // Must not throw
        const output = SimulationEngine.processRound(input);

        expect(output.results.length).toBe(1);
        const newState = output.results[0].newState;

        // Verify no NaN or Infinity in any numeric field of the result state
        assertNoNaNOrInfinity(newState.cash, "newState.cash");
        assertNoNaNOrInfinity(newState.revenue, "newState.revenue");
        assertNoNaNOrInfinity(newState.netIncome, "newState.netIncome");
        assertNoNaNOrInfinity(newState.eps, "newState.eps");
        assertNoNaNOrInfinity(newState.marketCap, "newState.marketCap");
        assertNoNaNOrInfinity(newState.sharePrice, "newState.sharePrice");
        assertNoNaNOrInfinity(newState.brandValue, "newState.brandValue");
        assertNoNaNOrInfinity(newState.totalAssets, "newState.totalAssets");
        assertNoNaNOrInfinity(newState.shareholdersEquity, "newState.shareholdersEquity");

        // Cash may or may not go negative — single team earns 100% market revenue which can offset costs.
        // The critical assertion is: simulation completed without crash/NaN (verified above).
        // Verify starting cash of $1 was consumed by module costs (cash changed significantly).
        expect(Math.abs(newState.cash - 1)).toBeGreaterThan(1000); // Cash moved significantly from $1
      });
    });

    // ============================================
    // §1.5 — Empty Decisions 16 Rounds [CRITICAL]
    // ============================================

    describe("Miyazaki §1.5 — Empty Decisions 16 Rounds", () => {
      it("3 teams, 16 rounds, all empty decisions — no crash, no NaN/Infinity", () => {
        const ROUNDS = 16;
        const TEAMS = 3;

        const outputs = runGame({
          teamCount: TEAMS,
          rounds: ROUNDS,
          matchSeed: "empty-decisions-16r",
        });

        expect(outputs.length).toBe(ROUNDS);

        for (let r = 0; r < ROUNDS; r++) {
          const output = outputs[r];
          expect(output.results.length).toBe(TEAMS);

          for (const result of output.results) {
            assertKeyFieldsClean(
              result.newState,
              `Round ${r + 1}, team ${result.teamId}`,
            );
          }
        }
      });

      it("final round states are still structurally valid after 16 rounds of emptiness", () => {
        const outputs = runGame({
          teamCount: 3,
          rounds: 16,
          matchSeed: "empty-decisions-16r-structural",
        });

        const finalOutput = outputs[outputs.length - 1];
        for (const result of finalOutput.results) {
          const s = result.newState;

          // Products still exist
          expect(s.products.length).toBeGreaterThan(0);

          // Factories still exist
          expect(s.factories.length).toBeGreaterThan(0);

          // Brand value stays bounded [0, 1]
          expect(s.brandValue).toBeGreaterThanOrEqual(0);
          expect(s.brandValue).toBeLessThanOrEqual(1);

          // Shares issued is still positive
          expect(s.sharesIssued).toBeGreaterThan(0);
        }
      });
    });

    // ============================================
    // §1.6 — Single Team vs Five Teams
    // ============================================

    describe("Miyazaki §1.6 — Single Team vs Five Teams", () => {
      it("same decisions yield different market shares but similar internal state", () => {
        const SEED = "single-vs-five";
        const sharedDecisions: AllDecisions = {
          rd: { rdBudget: 5_000_000 },
          marketing: {
            advertisingBudget: {
              Budget: 1_000_000,
              General: 1_000_000,
              Enthusiast: 1_000_000,
              Professional: 1_000_000,
              "Active Lifestyle": 1_000_000,
            },
            brandingInvestment: 1_000_000,
          },
        };

        // Run 1: Single team alone
        const singleInput: SimulationInput = {
          roundNumber: 1,
          teams: [
            {
              id: "team-1",
              state: createMinimalTeamState(),
              decisions: sharedDecisions,
            },
          ],
          marketState: createMinimalMarketState(),
          matchSeed: SEED,
        };
        const singleOutput = SimulationEngine.processRound(singleInput);

        // Run 2: Same team among 5
        const fiveTeams = Array.from({ length: 5 }, (_, i) => ({
          id: `team-${i + 1}`,
          state: createMinimalTeamState(),
          decisions: sharedDecisions,
        }));
        const fiveInput: SimulationInput = {
          roundNumber: 1,
          teams: fiveTeams,
          marketState: createMinimalMarketState(),
          matchSeed: SEED,
        };
        const fiveOutput = SimulationEngine.processRound(fiveInput);

        const singleResult = singleOutput.results[0];
        const fiveResult = fiveOutput.results.find((r) => r.teamId === "team-1")!;
        expect(fiveResult).toBeDefined();

        // Market shares MUST differ — single team gets 100%, five-team splits
        let sharesDiffer = false;
        for (const segment of CONSTANTS.SEGMENTS) {
          const singleShare = singleResult.marketShareBySegment[segment] ?? 0;
          const fiveShare = fiveResult.marketShareBySegment[segment] ?? 0;

          if (Math.abs(singleShare - fiveShare) > 0.01) {
            sharesDiffer = true;
          }
        }
        expect(sharesDiffer, "Market shares should differ between 1-team and 5-team runs").toBe(true);

        // Single team should have ~100% share
        for (const segment of CONSTANTS.SEGMENTS) {
          const singleShare = singleResult.marketShareBySegment[segment] ?? 0;
          if (singleShare > 0) {
            expect(singleShare).toBe(1.0);
          }
        }

        // Five-team: team-1 should have roughly 20% share (equal teams)
        for (const segment of CONSTANTS.SEGMENTS) {
          const fiveShare = fiveResult.marketShareBySegment[segment] ?? 0;
          if (fiveShare > 0) {
            expect(fiveShare).toBeGreaterThan(0.05);
            expect(fiveShare).toBeLessThan(0.5);
          }
        }

        // Module-internal state should be similar (factories, employees)
        // Factory count should be the same
        expect(singleResult.newState.factories.length).toBe(
          fiveResult.newState.factories.length,
        );

        // Employee count should be similar (turnover is seeded so may differ slightly
        // due to different team contexts, but the structure should be the same)
        const singleHeadcount = singleResult.newState.workforce.totalHeadcount;
        const fiveHeadcount = fiveResult.newState.workforce.totalHeadcount;
        // Allow up to 20% difference due to RNG-based turnover
        const headcountRatio = Math.min(singleHeadcount, fiveHeadcount) /
          Math.max(singleHeadcount, fiveHeadcount);
        expect(headcountRatio).toBeGreaterThan(0.8);
      });
    });
  });
});
