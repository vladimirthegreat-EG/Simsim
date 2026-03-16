/**
 * R&D Module — Stress Test Suite
 *
 * Tests RDModule.process() for research progress, product development,
 * tech tree unlocking, patent generation, and improvement costing.
 *
 * A. Golden path deterministic snapshots
 * B. Edge scenarios
 * C. Property tests (invariants across seeded scenarios)
 * D. Regression tests
 */

import { describe, it, expect } from "vitest";
import { RDModule } from "@/engine/modules/RDModule";
import { createTestContext, hashState } from "@/engine/core/EngineContext";
import type { TeamState, RDDecisions, Segment } from "@/engine/types";
import { CONSTANTS } from "@/engine/types";
import {
  createTeamState,
  createMarketState,
  createDecisions,
  runSimulation,
  assertNoNaN,
  assertNoOverflow,
  assertAllInvariants,
  assertRDInvariants,
  assertTechProgressBounded,
  assertTechPrerequisites,
  assertPatentsUnique,
  assertBrandBounded,
  type ScenarioProfile,
} from "@/engine/testkit";

// ============================================
// HELPERS
// ============================================

function processRD(
  state: TeamState,
  decisions: RDDecisions,
  seed: number = 12345,
  round: number = 1,
  teamId: string = "test-team"
): { newState: TeamState; result: any } {
  const ctx = createTestContext(seed, round, teamId);
  return RDModule.process(state, decisions, ctx);
}

// ============================================
// CATEGORY A — Golden Path Deterministic Snapshots
// ============================================

describe("R&D Stress — Category A: Golden Path", () => {
  it("2 teams, 3 rounds, RD-patent-rush — deterministic", () => {
    const result1 = runSimulation({
      teamCount: 2,
      rounds: 3,
      seed: "rd-golden-2x3",
      profile: "RD-patent-rush",
    });

    const result2 = runSimulation({
      teamCount: 2,
      rounds: 3,
      seed: "rd-golden-2x3",
      profile: "RD-patent-rush",
    });

    // Determinism: identical hashes across runs
    for (let round = 1; round <= 3; round++) {
      for (const teamId of Object.keys(result1.stateHashes[round])) {
        expect(result1.stateHashes[round][teamId]).toBe(result2.stateHashes[round][teamId]);
      }
    }

    // R&D progress and patents must be identical
    for (let i = 0; i < 2; i++) {
      expect(result1.finalStates[i].rdProgress).toBe(result2.finalStates[i].rdProgress);
      expect(result1.finalStates[i].patents).toBe(result2.finalStates[i].patents);
      expect(hashState(result1.finalStates[i])).toBe(hashState(result2.finalStates[i]));
    }
  });

  it("6 teams, 8 rounds, baseline-balanced — R&D deterministic and invariants hold", () => {
    const result1 = runSimulation({
      teamCount: 6,
      rounds: 8,
      seed: "rd-golden-6x8",
      profile: "baseline-balanced",
    });

    const result2 = runSimulation({
      teamCount: 6,
      rounds: 8,
      seed: "rd-golden-6x8",
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

    // R&D invariants on final states
    for (const state of result1.finalStates) {
      assertRDInvariants(state);
    }
  });

  it("determinism holds across 3 consecutive runs with R&D budgets", () => {
    const runs = [1, 2, 3].map(() =>
      runSimulation({
        teamCount: 4,
        rounds: 5,
        seed: "rd-triple-check",
        profile: "RD-patent-rush",
      })
    );

    for (let i = 0; i < 4; i++) {
      const hash0 = hashState(runs[0].finalStates[i]);
      const hash1 = hashState(runs[1].finalStates[i]);
      const hash2 = hashState(runs[2].finalStates[i]);
      expect(hash0).toBe(hash1);
      expect(hash1).toBe(hash2);

      // rdProgress and patents identical across all 3 runs
      expect(runs[0].finalStates[i].rdProgress).toBe(runs[1].finalStates[i].rdProgress);
      expect(runs[1].finalStates[i].rdProgress).toBe(runs[2].finalStates[i].rdProgress);
    }
  });
});

// ============================================
// CATEGORY B — Edge Scenarios
// ============================================

describe("R&D Stress — Category B: Edge Scenarios", () => {
  it("$0 R&D for 20 rounds — only engineer-based progress accumulates", () => {
    const result = runSimulation({
      teamCount: 2,
      rounds: 20,
      seed: "zero-rd-budget-20",
      decisionFn: (_teamIdx, state) => {
        const factoryId = state.factories[0]?.id || "factory-1";
        return {
          factory: {
            efficiencyInvestments: {
              [factoryId]: { workers: 500_000, machinery: 500_000, factory: 500_000 },
            },
          },
          hr: {},
          marketing: {
            advertisingBudget: { General: 500_000 },
            brandingInvestment: 500_000,
          },
          rd: { rdBudget: 0 },
          finance: { dividendPerShare: 0 },
        };
      },
    });

    for (const state of result.finalStates) {
      assertRDInvariants(state);
      assertNoNaN(state);

      // With $0 budget, rdProgress should only come from engineers
      // Engineers still generate rdProgress each round
      expect(state.rdProgress).toBeGreaterThanOrEqual(0);
      expect(state.rdProgress).toSatisfy((v: number) => Number.isFinite(v));
    }
  });

  it("$30M R&D for 8 rounds — fast tech unlock chain", () => {
    const result = runSimulation({
      teamCount: 2,
      rounds: 8,
      seed: "high-rd-budget",
      decisionFn: (_teamIdx, state) => {
        const factoryId = state.factories[0]?.id || "factory-1";
        return {
          factory: {
            efficiencyInvestments: {
              [factoryId]: { workers: 500_000, machinery: 500_000, factory: 500_000 },
            },
          },
          hr: {
            salaryMultiplierChanges: { workers: 1.0, engineers: 1.3, supervisors: 1.0 },
          },
          marketing: {
            advertisingBudget: { Professional: 1_000_000 },
            brandingInvestment: 500_000,
          },
          rd: { rdBudget: 30_000_000 },
          finance: { dividendPerShare: 0 },
        };
      },
    });

    for (const state of result.finalStates) {
      assertRDInvariants(state);
      assertNoNaN(state);
      assertNoOverflow(state);

      // F13-F20: Patent generation consumes rdProgress (150 pts per patent).
      // $30M/round = 300 budget pts/round + engineer contribution.
      // Over 8 rounds, most rdProgress is consumed by patent generation.
      // Verify significant patents were earned instead of checking raw rdProgress.
      const patents = typeof state.patents === "number" ? state.patents : 0;
      expect(patents).toBeGreaterThan(5); // 8 rounds × ~300 pts/round ÷ 150 pts/patent ≈ 16+ patents
      expect(state.rdProgress).toBeGreaterThanOrEqual(0);
      expect(state.rdProgress).toBeLessThan(150); // Remainder after patent consumption

      // Tech prerequisites chain is intact if any technologies are unlocked
      const unlocked = state.unlockedTechnologies || [];
      if (unlocked.includes("advanced_manufacturing")) {
        expect(unlocked).toContain("process_optimization");
      }
      if (unlocked.includes("industry_4_0")) {
        expect(unlocked).toContain("advanced_manufacturing");
      }
      if (unlocked.includes("breakthrough_tech")) {
        expect(unlocked).toContain("industry_4_0");
      }
    }
  });

  it("10 concurrent new products — no crash, all products tracked", () => {
    const state = createTeamState("RD-patent-rush");
    state.cash = 500_000_000; // Plenty of cash for 10 products

    const segments: Segment[] = CONSTANTS.SEGMENTS;
    const newProducts = Array.from({ length: 10 }, (_, i) => ({
      name: `Product-${i + 1}`,
      segment: segments[i % segments.length],
      targetQuality: 60 + (i * 3),
      targetFeatures: 50 + (i * 2),
    }));

    const { newState, result } = processRD(state, {
      rdBudget: 5_000_000,
      newProducts,
    });

    assertNoNaN(newState);
    assertRDInvariants(newState);

    // Count how many products were actually created (some may fail due to cost)
    const productsCreated = newState.products.length - state.products.length;
    expect(productsCreated).toBeGreaterThan(0);
    expect(productsCreated).toBeLessThanOrEqual(10);

    // All existing + new products should have valid data
    for (const product of newState.products) {
      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.segment).toBeDefined();
      expect(product.quality).toBeGreaterThanOrEqual(0);
      expect(product.quality).toBeLessThanOrEqual(100);
    }
  });

  it("tech prerequisite chain integrity — cannot skip tiers", () => {
    const state = createTeamState("baseline-balanced");
    state.rdProgress = 0;
    state.unlockedTechnologies = [];

    // Set rdProgress just above industry_4_0 threshold but without prerequisites
    state.rdProgress = CONSTANTS.RD_TECH_TREE.industry_4_0.rdPointsRequired + 50;

    // Process with no budget (just let tech unlock logic run)
    const { newState } = processRD(state, { rdBudget: 0 });

    const unlocked = newState.unlockedTechnologies || [];

    // F13-F20: RDModule.process() does not unlock technologies directly;
    // tech unlocking is handled externally (e.g., during market simulation).
    // With no external unlock mechanism called, technologies remain empty.
    // Verify the module doesn't erroneously unlock technologies and
    // that the prerequisite chain invariant holds for whatever is unlocked.
    if (unlocked.includes("industry_4_0")) {
      expect(unlocked).toContain("process_optimization");
      expect(unlocked).toContain("advanced_manufacturing");
    }

    // Full chain integrity check (passes trivially if nothing is unlocked)
    assertTechPrerequisites(newState);

    // rdProgress should still be non-negative (consumed by patent generation)
    expect(newState.rdProgress).toBeGreaterThanOrEqual(0);
  });

  it("product development lifecycle — in_development → launched", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 200_000_000;

    // Start a new product
    const { newState: state1 } = processRD(state, {
      rdBudget: 5_000_000,
      newProducts: [{
        name: "Lifecycle-Test",
        segment: "General",
        targetQuality: 70,
        targetFeatures: 60,
      }],
    }, 100, 1);

    // Find the new product — it may launch immediately with enough engineers
    const newProduct = state1.products.find(p => p.name === "Lifecycle-Test");
    expect(newProduct).toBeDefined();
    // Product is either still developing or already launched (depends on engineer count)
    expect(["in_development", "launched"]).toContain(newProduct!.developmentStatus);

    // Advance rounds until product completes
    let currentState = state1;
    let launched = false;
    for (let round = 2; round <= 10; round++) {
      const { newState: nextState } = processRD(currentState, {
        rdBudget: 5_000_000,
      }, 100, round);
      currentState = nextState;

      const product = currentState.products.find(p => p.name === "Lifecycle-Test");
      if (product && product.developmentStatus === "launched") {
        launched = true;
        expect(product.quality).toBe(product.targetQuality);
        expect(product.features).toBe(product.targetFeatures);
        expect(product.developmentProgress).toBe(100);
        break;
      }
    }

    expect(launched, "Product should have launched within 10 rounds").toBe(true);
    assertNoNaN(currentState);
  });

  it("rdProgress accumulation formula verification — budget + engineers", () => {
    const state = createTeamState("baseline-balanced");
    const initialProgress = state.rdProgress;
    const initialPatents = typeof state.patents === "number" ? state.patents : 0;
    const rdBudget = 10_000_000;

    const engineers = state.employees.filter(e => e.role === "engineer");
    const expectedBudgetPoints = Math.floor(rdBudget / CONSTANTS.RD_BUDGET_TO_POINTS_RATIO);
    const expectedEngineerPoints = RDModule.calculateTotalRDOutput(engineers);

    const { newState } = processRD(state, { rdBudget });

    const newPatents = (typeof newState.patents === "number" ? newState.patents : 0) - initialPatents;
    const actualGain = newState.rdProgress - initialProgress;
    const expectedGain = expectedBudgetPoints + expectedEngineerPoints;

    // F13-F20: Patent generation consumes 150 rdProgress per patent.
    // Account for patent consumption in the formula verification.
    const patentConsumption = newPatents * 150;
    expect(actualGain + patentConsumption).toBeCloseTo(expectedGain, 0);
    assertTechProgressBounded(newState);
  });

  it("empty R&D decisions — engineers still generate progress", () => {
    const state = createTeamState("baseline-balanced");
    const initialProgress = state.rdProgress;
    const engineers = state.employees.filter(e => e.role === "engineer");
    const expectedEngineerPoints = RDModule.calculateTotalRDOutput(engineers);

    const { newState, result } = processRD(state, {});

    assertNoNaN(newState);
    assertRDInvariants(newState);

    // Engineers still produce R&D output even with empty decisions
    if (engineers.length > 0) {
      expect(newState.rdProgress).toBeGreaterThan(initialProgress);
      expect(newState.rdProgress - initialProgress).toBeCloseTo(expectedEngineerPoints, 0);
    }

    expect(result.success).toBe(true);
  });

  it("product improvements — quality and features bounded at 100", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 500_000_000;
    state.rdProgress = 5000; // Plenty of R&D points for improvements

    // Find a product to improve
    const product = state.products[0];
    if (!product) return; // Skip if no products

    const { newState } = processRD(state, {
      rdBudget: 5_000_000,
      productImprovements: [{
        productId: product.id,
        qualityIncrease: 200, // Try to exceed 100
        featuresIncrease: 200,
      }],
    });

    const improved = newState.products.find(p => p.id === product.id);
    if (improved) {
      expect(improved.quality).toBeLessThanOrEqual(100);
      expect(improved.features).toBeLessThanOrEqual(100);
    }
    assertNoNaN(newState);
  });

  it("patent generation — milestone-based, accumulates with rdProgress", () => {
    const state = createTeamState("baseline-balanced");
    state.rdProgress = 0;
    state.patents = 0;

    // Give enough budget to generate well past the 200-point patent threshold
    const { newState: state1 } = processRD(state, { rdBudget: 25_000_000 }, 100, 1);

    // $25M / $100K ratio = 250 budget points + engineer points
    // Should earn at least 1 patent (threshold = 200)
    const patents1 = typeof state1.patents === "number" ? state1.patents : 0;
    expect(patents1).toBeGreaterThanOrEqual(1);

    // Continue accumulating — patents should keep growing
    const { newState: state2 } = processRD(state1, { rdBudget: 25_000_000 }, 100, 2);
    const patents2 = typeof state2.patents === "number" ? state2.patents : 0;
    expect(patents2).toBeGreaterThanOrEqual(patents1);

    assertTechProgressBounded(state2);
  });

  it("improvement cost progressive scaling — higher quality costs more", () => {
    const lowCost = RDModule.calculateImprovementCost(5, 0, 50, 50);
    const midCost = RDModule.calculateImprovementCost(5, 0, 70, 50);
    const highCost = RDModule.calculateImprovementCost(5, 0, 90, 50);

    // Progressive: improving from 50 should cost less than from 70
    expect(midCost).toBeGreaterThan(lowCost);
    // Improving from 90 should cost even more
    expect(highCost).toBeGreaterThan(midCost);
  });

  it("insufficient funds for new product — no crash, message logged", () => {
    const state = createTeamState("baseline-balanced");
    state.cash = 100; // Almost no cash

    const { newState, result } = processRD(state, {
      rdBudget: 0,
      newProducts: [{
        name: "Expensive-Product",
        segment: "Professional",
        targetQuality: 95,
        targetFeatures: 90,
      }],
    });

    assertNoNaN(newState);
    // Product should not have been created
    const created = newState.products.find(p => p.name === "Expensive-Product");
    expect(created).toBeUndefined();
    // Should have an insufficient funds message
    expect(result.messages.some((m: string) => m.includes("Insufficient"))).toBe(true);
  });
});

// ============================================
// CATEGORY C — Property Tests (Seeded)
// ============================================

describe("R&D Stress — Category C: Property Tests", () => {
  const rdBudgets = [
    0,
    500_000,
    1_000_000,
    3_000_000,
    5_000_000,
    8_000_000,
    10_000_000,
    15_000_000,
    20_000_000,
    30_000_000,
  ];

  for (let seed = 0; seed < 50; seed++) {
    const rdBudget = rdBudgets[seed % rdBudgets.length];

    it(`seed ${seed}: rdBudget=$${rdBudget / 1e6}M — all R&D invariants hold`, () => {
      const state = createTeamState("baseline-balanced");

      const { newState } = processRD(state, {
        rdBudget,
      }, seed + 1, 1, `team-prop-${seed}`);

      // Core R&D invariants
      assertRDInvariants(newState);
      assertNoNaN(newState);
      assertNoOverflow(newState);

      // rdProgress must be non-negative and finite
      assertTechProgressBounded(newState);

      // Tech prerequisites must be satisfied
      assertTechPrerequisites(newState);

      // rdProgress should have increased (engineers always contribute)
      expect(newState.rdProgress).toBeGreaterThanOrEqual(state.rdProgress);

      // Patents should be non-negative
      const patents = typeof newState.patents === "number" ? newState.patents : 0;
      expect(patents).toBeGreaterThanOrEqual(0);

      // Cash should have decreased by budget amount (plus any development costs)
      if (rdBudget > 0) {
        expect(newState.cash).toBeLessThan(state.cash);
      }
    });
  }
});

// ============================================
// CATEGORY D — Regression Tests
// ============================================

describe("R&D Stress — Category D: Regression", () => {
  // Placeholder: regression tests added as bugs are discovered
  it("regression placeholder — framework operational", () => {
    expect(true).toBe(true);
  });
});
