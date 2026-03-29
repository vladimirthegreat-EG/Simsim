/**
 * Core Engine Pipeline — Stress Test Suite
 *
 * Tests the SimulationEngine.processRound() orchestrator for:
 * A. Golden path deterministic snapshots
 * B. Edge scenarios (empty decisions, extreme inputs)
 * C. Property tests (invariants across seeded scenarios)
 * D. Regression tests (added as bugs are discovered)
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput, type SimulationOutput } from "@/engine/core/SimulationEngine";
import { hashState } from "@/engine/core/EngineContext";
import {
  createTeamState,
  createMarketState,
  createDecisions,
  runSimulation,
  hashOutput,
  assertAllInvariants,
  assertDeterminism,
  assertMarketSharesSumToOne,
  assertNoNaN,
  assertNoOverflow,
  type ScenarioProfile,
} from "@/engine/testkit";

// ============================================
// CATEGORY A — Golden Path Deterministic Snapshots
// ============================================

describe("Core Stress — Category A: Golden Path", () => {
  it("2 teams, 3 rounds, baseline-balanced — deterministic", () => {
    const result1 = runSimulation({
      teamCount: 2,
      rounds: 3,
      seed: "golden-path-2x3",
      profile: "baseline-balanced",
    });

    const result2 = runSimulation({
      teamCount: 2,
      rounds: 3,
      seed: "golden-path-2x3",
      profile: "baseline-balanced",
    });

    // Determinism: identical hashes across runs
    for (let round = 1; round <= 3; round++) {
      for (const teamId of Object.keys(result1.stateHashes[round])) {
        expect(result1.stateHashes[round][teamId]).toBe(result2.stateHashes[round][teamId]);
      }
    }

    // Final states are identical
    for (let i = 0; i < 2; i++) {
      expect(hashState(result1.finalStates[i])).toBe(hashState(result2.finalStates[i]));
    }
  });

  it("6 teams, 8 rounds, baseline-balanced — deterministic", () => {
    const result1 = runSimulation({
      teamCount: 6,
      rounds: 8,
      seed: "golden-path-6x8",
      profile: "baseline-balanced",
    });

    const result2 = runSimulation({
      teamCount: 6,
      rounds: 8,
      seed: "golden-path-6x8",
      profile: "baseline-balanced",
    });

    // Compare round-by-round hashes
    for (let round = 1; round <= 8; round++) {
      for (const teamId of Object.keys(result1.stateHashes[round])) {
        expect(
          result1.stateHashes[round][teamId],
          `Hash mismatch at round ${round} for ${teamId}`
        ).toBe(result2.stateHashes[round][teamId]);
      }
    }
  });

  it("determinism holds across 3 consecutive runs", () => {
    const runs = [1, 2, 3].map(() =>
      runSimulation({
        teamCount: 4,
        rounds: 5,
        seed: "triple-check",
        profile: "baseline-balanced",
      })
    );

    // All 3 runs produce identical final state hashes
    for (let i = 0; i < 4; i++) {
      const hash0 = hashState(runs[0].finalStates[i]);
      const hash1 = hashState(runs[1].finalStates[i]);
      const hash2 = hashState(runs[2].finalStates[i]);
      expect(hash0).toBe(hash1);
      expect(hash1).toBe(hash2);
    }
  });
});

// ============================================
// CATEGORY B — Edge Scenarios
// ============================================

describe("Core Stress — Category B: Edge Scenarios", () => {
  it("100-round marathon — 5 teams, no crash, all invariants hold", () => {
    const result = runSimulation({
      teamCount: 5,
      rounds: 100,
      seed: "marathon-100",
      profile: "baseline-balanced",
    });

    // All teams survived 100 rounds
    expect(result.finalStates.length).toBe(5);

    // Invariants hold on final states
    for (const state of result.finalStates) {
      assertAllInvariants(state);
    }

    // Market shares summed correctly on the last round
    const lastOutput = result.roundOutputs[result.roundOutputs.length - 1];
    if (lastOutput.marketPositions) {
      // Build market shares from results
      const shares: Record<string, Record<string, number>> = {};
      for (const r of lastOutput.results) {
        shares[r.teamId] = r.newState.marketShare as Record<string, number>;
      }
      assertMarketSharesSumToOne(shares);
    }
  });

  it("state size does not grow unboundedly over 50 rounds", () => {
    const result = runSimulation({
      teamCount: 3,
      rounds: 50,
      seed: "state-size-check",
      profile: "baseline-balanced",
    });

    // Measure state size per team
    for (const state of result.finalStates) {
      const size = JSON.stringify(state).length;
      // State should be < 75KB per team after 50 rounds (reasonable upper bound)
      // Raised from 50KB after factory tiers + production lines added more state fields
      expect(size, `State size ${size} bytes exceeds 75KB limit`).toBeLessThan(75_000);
    }
  });

  it("empty decisions — all modules handle gracefully", () => {
    const result = runSimulation({
      teamCount: 3,
      rounds: 3,
      seed: "empty-decisions",
      decisionFn: () => ({}),
    });

    // Should not crash, all teams have valid state
    for (const state of result.finalStates) {
      assertNoNaN(state);
      assertNoOverflow(state);
    }
  });

  it("null/undefined in optional decision fields — no crash", () => {
    const result = runSimulation({
      teamCount: 2,
      rounds: 3,
      seed: "null-decisions",
      decisionFn: () => ({
        factory: {},
        hr: {},
        marketing: {},
        rd: {},
        finance: {},
      }),
    });

    for (const state of result.finalStates) {
      assertNoNaN(state);
    }
  });

  it("round-trip serialization produces identical processRound output", () => {
    // Run once
    const team = createTeamState("baseline-balanced");
    const market = createMarketState();
    const decisions = createDecisions("baseline-balanced", team);

    const input: SimulationInput = {
      roundNumber: 1,
      teams: [{ id: "serialize-test", state: team, decisions }],
      marketState: market,
      matchSeed: "serialize-test",
    };

    const output1 = SimulationEngine.processRound(input);

    // Serialize and deserialize state, run again
    const serializedTeam = JSON.parse(JSON.stringify(team));
    const serializedMarket = JSON.parse(JSON.stringify(market));
    const serializedDecisions = JSON.parse(JSON.stringify(decisions));

    const input2: SimulationInput = {
      roundNumber: 1,
      teams: [{ id: "serialize-test", state: serializedTeam, decisions: serializedDecisions }],
      marketState: serializedMarket,
      matchSeed: "serialize-test",
    };

    const output2 = SimulationEngine.processRound(input2);

    assertDeterminism(output1, output2);
  });

  it("team processing order does not affect results", () => {
    const teamA = createTeamState("baseline-balanced");
    const teamB = createTeamState("RD-patent-rush");
    const market = createMarketState();

    // Order 1: A then B
    const input1: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "team-a", state: teamA, decisions: createDecisions("baseline-balanced", teamA) },
        { id: "team-b", state: teamB, decisions: createDecisions("RD-patent-rush", teamB) },
      ],
      marketState: market,
      matchSeed: "order-test",
    };

    // Order 2: B then A
    const input2: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "team-b", state: JSON.parse(JSON.stringify(teamB)), decisions: createDecisions("RD-patent-rush", teamB) },
        { id: "team-a", state: JSON.parse(JSON.stringify(teamA)), decisions: createDecisions("baseline-balanced", teamA) },
      ],
      marketState: JSON.parse(JSON.stringify(market)),
      matchSeed: "order-test",
    };

    const output1 = SimulationEngine.processRound(input1);
    const output2 = SimulationEngine.processRound(input2);

    // Compare same team across both outputs
    const teamAResult1 = output1.results.find(r => r.teamId === "team-a")!;
    const teamAResult2 = output2.results.find(r => r.teamId === "team-a")!;

    expect(teamAResult1.newState.cash).toBe(teamAResult2.newState.cash);
    expect(teamAResult1.newState.revenue).toBe(teamAResult2.newState.revenue);
    expect(teamAResult1.newState.rdProgress).toBe(teamAResult2.newState.rdProgress);
  });

  it("audit trail populated correctly", () => {
    const result = runSimulation({
      teamCount: 2,
      rounds: 1,
      seed: "audit-trail",
      profile: "baseline-balanced",
    });

    const output = result.roundOutputs[0];
    expect(output.auditTrail).toBeDefined();
    expect(output.auditTrail.seedBundle).toBeDefined();
    expect(output.auditTrail.seedBundle.matchSeed).toBe("audit-trail");
    expect(output.auditTrail.finalStateHashes).toBeDefined();
    expect(Object.keys(output.auditTrail.finalStateHashes).length).toBe(2);
    expect(output.auditTrail.engineVersion).toBeDefined();
  });
});

// ============================================
// CATEGORY C — Property Tests (Seeded)
// ============================================

describe("Core Stress — Category C: Property Tests", () => {
  const profiles: ScenarioProfile[] = [
    "baseline-balanced",
    "aggressive-debt",
    "marketing-overdrive",
    "under-invested-ops",
    "RD-patent-rush",
    "HR-turnover-crisis",
    "passive",
  ];

  for (let seed = 0; seed < 50; seed++) {
    const profile = profiles[seed % profiles.length];

    it(`seed ${seed}, profile ${profile} — all invariants hold after 3 rounds`, () => {
      const result = runSimulation({
        teamCount: 3,
        rounds: 3,
        seed: `property-${seed}`,
        profile,
      });

      for (const state of result.finalStates) {
        assertAllInvariants(state);
      }
    });
  }
});

// ============================================
// CATEGORY D — Regression Tests
// ============================================

describe("Core Stress — Category D: Regression", () => {
  // Placeholder: regression tests added as bugs are discovered
  it("regression placeholder — framework operational", () => {
    expect(true).toBe(true);
  });
});
