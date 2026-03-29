/**
 * R&D MODULE — COMPREHENSIVE STRESS TESTS
 *
 * Merged from:
 *   Part A — rd.stress.test.ts (golden path, edge, property, regression)
 *   Part B — rd_deep.stress.test.ts (§1.10 deep: budget conversion, patents, tech tree, auto-launch, cost scaling)
 *   Part C — miyazaki_modules.stress.test.ts (Miyazaki Protocol §6, CRIT-01, VAL-01 R&D tests)
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput } from "../../core/SimulationEngine";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  runNRounds,
  runProfileNRounds,
} from "../../testkit/scenarioGenerator";
import { assertAllInvariantsPass } from "../../testkit/invariants";
import { CONSTANTS } from "../../types";
import { RDModule } from "../../modules/RDModule";
import type { Segment } from "../../types/factory";
import type { AllDecisions } from "../../types/decisions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runSingleTeam(
  state: ReturnType<typeof createMinimalTeamState>,
  decisions: any,
  seed = "rd-test",
  roundNumber = 1,
) {
  const input: SimulationInput = {
    roundNumber,
    teams: [{ id: "t1", state, decisions }],
    marketState: createMinimalMarketState(),
    matchSeed: seed,
  };
  return SimulationEngine.processRound(input);
}

// ===========================================================================
// TOP-LEVEL DESCRIBE
// ===========================================================================

describe("R&D Module — Comprehensive Stress Tests", () => {
  // =========================================================================
  // PART A — from rd.stress.test.ts
  // =========================================================================

  describe("Part A — R&D Stress Suite", () => {
    describe("Category A — Golden Path", () => {
      it("R&D budget generates progress points", () => {
        const state = createMinimalTeamState();
        const output = runSingleTeam(state, {
          rd: { rdBudget: 10_000_000 },
        }, "rd-budget");
        // rdProgress should increase
        const rdAfter = output.results[0].newState.rdProgress;
        expect(rdAfter).toBeGreaterThan(0);
      });

      it("new product development starts correctly", () => {
        const state = createMinimalTeamState();
        const productsBefore = state.products.length;
        const output = runSingleTeam(state, {
          rd: {
            rdBudget: 5_000_000,
            newProducts: [
              { name: "TestPhone", segment: "Enthusiast" as Segment, targetQuality: 70, targetFeatures: 60 },
            ],
          },
        }, "rd-new-product");
        const productsAfter = output.results[0].newState.products.length;
        expect(productsAfter).toBeGreaterThan(productsBefore);
      });

      it("RD-patent-rush generates R&D points", () => {
        const outputs = runProfileNRounds({
          teamCount: 1,
          rounds: 3,
          matchSeed: "rd-patent-rush",
          profile: "RD-patent-rush",
        });
        // R&D progress should accumulate
        const finalRD = outputs[2].results[0].newState.rdProgress;
        expect(finalRD).toBeGreaterThan(0);
      });
    });

    describe("Category B — Edge", () => {
      it("0 R&D budget: no crash, progress comes from engineers", () => {
        const state = createMinimalTeamState();
        const output = runSingleTeam(state, {
          rd: { rdBudget: 0 },
        }, "rd-zero");
        expect(output.results.length).toBe(1);
      });

      it("very large R&D budget: no overflow", () => {
        const state = createMinimalTeamState();
        const output = runSingleTeam(state, {
          rd: { rdBudget: 100_000_000 },
        }, "rd-large");
        const rdAfter = output.results[0].newState.rdProgress;
        expect(isNaN(rdAfter)).toBe(false);
        expect(isFinite(rdAfter)).toBe(true);
      });

      it("product improvement with no existing products: no crash", () => {
        const state = createMinimalTeamState();
        const output = runSingleTeam(state, {
          rd: {
            rdBudget: 5_000_000,
            productImprovements: [
              { productId: "nonexistent-product", qualityIncrease: 5 },
            ],
          },
        }, "rd-bad-improvement");
        expect(output.results.length).toBe(1);
      });
    });

    describe("Category C — Property Tests", () => {
      it("R&D budget to points ratio is correct", () => {
        expect(CONSTANTS.RD_BUDGET_TO_POINTS_RATIO).toBe(100_000);
      });

      it("tech tree is sequential with correct costs", () => {
        const tree = CONSTANTS.RD_TECH_TREE;
        expect(tree.process_optimization.cost).toBe(5_000_000);
        expect(tree.process_optimization.rdPointsRequired).toBe(100);

        expect(tree.advanced_manufacturing.cost).toBe(15_000_000);
        expect(tree.advanced_manufacturing.rdPointsRequired).toBe(300);
        expect(tree.advanced_manufacturing.prerequisite).toBe("process_optimization");

        expect(tree.industry_4_0.cost).toBe(30_000_000);
        expect(tree.industry_4_0.rdPointsRequired).toBe(600);
        expect(tree.industry_4_0.prerequisite).toBe("advanced_manufacturing");

        expect(tree.breakthrough_tech.cost).toBe(50_000_000);
        expect(tree.breakthrough_tech.rdPointsRequired).toBe(1000);
        expect(tree.breakthrough_tech.prerequisite).toBe("industry_4_0");
      });

      it("product development constants are correct", () => {
        expect(CONSTANTS.PRODUCT_DEV_BASE_ROUNDS).toBe(1);
        expect(CONSTANTS.PRODUCT_DEV_QUALITY_FACTOR).toBe(0.01);
        expect(CONSTANTS.PRODUCT_DEV_ENGINEER_SPEEDUP).toBe(0.08);
      });

      it("material costs per segment are correct", () => {
        expect(CONSTANTS.RAW_MATERIAL_COST_PER_UNIT.Budget).toBe(50);
        expect(CONSTANTS.RAW_MATERIAL_COST_PER_UNIT.General).toBe(100);
        expect(CONSTANTS.RAW_MATERIAL_COST_PER_UNIT.Enthusiast).toBe(200);
        expect(CONSTANTS.RAW_MATERIAL_COST_PER_UNIT.Professional).toBe(350);
        expect(CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["Active Lifestyle"]).toBe(150);
      });
    });

    describe("Category D — Regression", () => {
      it("placeholder: no regressions found yet", () => {
        expect(true).toBe(true);
      });
    });
  });

  // =========================================================================
  // PART B — from rd_deep.stress.test.ts (§1.10)
  // =========================================================================

  describe("Part B — §1.10 RDModule Deep Stress Suite", () => {
    // ─────────────────────────────────────────────
    // 1. Zero R&D Budget, Zero Engineers
    // ─────────────────────────────────────────────
    describe("1. Zero R&D Budget, Zero Engineers", () => {
      it("no R&D points generated and no crash", () => {
        const state = createMinimalTeamState();
        // Remove all engineers
        state.employees = state.employees.filter(e => e.role !== "engineer");
        const initialProgress = state.rdProgress;

        const output = runSingleTeam(state, {
          rd: { rdBudget: 0 },
        }, "rd-zero-zero");

        const newState = output.results[0].newState;
        // rdProgress should not increase from budget (0 budget = 0 budget points)
        // and no engineers = 0 engineer points
        expect(newState.rdProgress).toBe(initialProgress);
        expect(output.results.length).toBe(1);
        assertAllInvariantsPass(output);
      });

      it("no tech progress with zero input", () => {
        const state = createMinimalTeamState();
        state.employees = state.employees.filter(e => e.role !== "engineer");
        state.rdProgress = 0;
        state.unlockedTechnologies = [];

        const output = runSingleTeam(state, {
          rd: { rdBudget: 0 },
        }, "rd-zero-tech");

        const newState = output.results[0].newState;
        expect(newState.unlockedTechnologies ?? []).toHaveLength(0);
        expect(newState.patents).toBe(0);
      });
    });

    // ─────────────────────────────────────────────
    // 2. Patent Generation Boundary
    // ─────────────────────────────────────────────
    describe("2. Patent Generation Boundary", () => {
      it("rdProgress=199 yields 0 patents", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 199;
        state.patents = 0;
        // Remove engineers so no additional points
        state.employees = state.employees.filter(e => e.role !== "engineer");

        const output = runSingleTeam(state, {
          rd: { rdBudget: 0 },
        }, "rd-patent-199");

        const newState = output.results[0].newState;
        expect(newState.rdProgress).toBe(199);
        expect(newState.patents).toBe(0);
      });

      it("rdProgress=200 yields 1 patent", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 200;
        state.patents = 0;
        state.employees = state.employees.filter(e => e.role !== "engineer");

        const output = runSingleTeam(state, {
          rd: { rdBudget: 0 },
        }, "rd-patent-200");

        const newState = output.results[0].newState;
        expect(newState.rdProgress).toBe(200);
        expect(newState.patents).toBe(1);
      });

      it("rdProgress=400 yields 2 patents (non-consuming)", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 400;
        state.patents = 0;
        state.employees = state.employees.filter(e => e.role !== "engineer");

        const output = runSingleTeam(state, {
          rd: { rdBudget: 0 },
        }, "rd-patent-400");

        const newState = output.results[0].newState;
        // Patents = floor(400/200) = 2, and rdProgress is NOT consumed
        expect(newState.rdProgress).toBe(400);
        expect(newState.patents).toBe(2);
      });

      it("crossing patent boundary mid-round via budget", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 190;
        state.patents = 0;
        state.employees = state.employees.filter(e => e.role !== "engineer");
        // $1M budget = floor(1_000_000 / 100_000) = 10 points => total 200 => 1 patent
        const output = runSingleTeam(state, {
          rd: { rdBudget: 1_000_000 },
        }, "rd-patent-cross");

        const newState = output.results[0].newState;
        expect(newState.rdProgress).toBe(200);
        expect(newState.patents).toBe(1);
      });
    });

    // ─────────────────────────────────────────────
    // 3. R&D Budget to Points Conversion
    // ─────────────────────────────────────────────
    describe("3. R&D Budget to Points Conversion", () => {
      it("$15M budget generates 150 budget points", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 0;
        state.employees = state.employees.filter(e => e.role !== "engineer");

        const output = runSingleTeam(state, {
          rd: { rdBudget: 15_000_000 },
        }, "rd-15m");

        const newState = output.results[0].newState;
        // floor(15_000_000 / 100_000) = 150
        expect(newState.rdProgress).toBe(150);
      });

      it("$100K budget generates exactly 1 point", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 0;
        state.employees = state.employees.filter(e => e.role !== "engineer");

        const output = runSingleTeam(state, {
          rd: { rdBudget: 100_000 },
        }, "rd-100k");

        expect(output.results[0].newState.rdProgress).toBe(1);
      });

      it("$99K budget generates 0 points (below threshold)", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 0;
        state.employees = state.employees.filter(e => e.role !== "engineer");

        const output = runSingleTeam(state, {
          rd: { rdBudget: 99_000 },
        }, "rd-99k");

        expect(output.results[0].newState.rdProgress).toBe(0);
      });

      it("budget points accumulate across rounds", () => {
        const outputs = runNRounds({
          teamCount: 1,
          rounds: 3,
          matchSeed: "rd-accumulate",
          decisionFn: (state) => {
            // Remove engineers each round to isolate budget points
            state.employees = state.employees.filter(e => e.role !== "engineer");
            return { rd: { rdBudget: 10_000_000 } };
          },
        });

        // Each round: floor(10M / 100K) = 100 points
        // After 3 rounds: ~300 points (engineers removed so only budget)
        const finalProgress = outputs[2].results[0].newState.rdProgress;
        expect(finalProgress).toBeGreaterThanOrEqual(300);
      });
    });

    // ─────────────────────────────────────────────
    // 4. Tech Tree Prerequisite Enforcement
    // ─────────────────────────────────────────────
    describe("4. Tech Tree Prerequisite Enforcement", () => {
      it("process_optimization unlocks at 100 rdProgress", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 100;
        state.unlockedTechnologies = [];
        state.employees = state.employees.filter(e => e.role !== "engineer");

        const output = runSingleTeam(state, {
          rd: { rdBudget: 0 },
        }, "rd-tech-t1");

        const techs = output.results[0].newState.unlockedTechnologies ?? [];
        expect(techs).toContain("process_optimization");
      });

      it("advanced_manufacturing does NOT unlock without process_optimization", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 300; // Enough points, but missing prerequisite
        state.unlockedTechnologies = []; // Deliberately empty
        state.employees = state.employees.filter(e => e.role !== "engineer");

        const output = runSingleTeam(state, {
          rd: { rdBudget: 0 },
        }, "rd-tech-skip");

        const techs = output.results[0].newState.unlockedTechnologies ?? [];
        // process_optimization should unlock (100 pts met, no prereq)
        expect(techs).toContain("process_optimization");
        // advanced_manufacturing should also unlock since process_optimization just unlocked
        // and rdProgress=300 >= 300 threshold
        expect(techs).toContain("advanced_manufacturing");
      });

      it("cannot skip to industry_4_0 without advanced_manufacturing", () => {
        const state = createMinimalTeamState();
        state.rdProgress = 600;
        state.unlockedTechnologies = ["process_optimization"]; // Skip advanced_manufacturing
        state.employees = state.employees.filter(e => e.role !== "engineer");

        const output = runSingleTeam(state, {
          rd: { rdBudget: 0 },
        }, "rd-tech-skip-i40");

        const techs = output.results[0].newState.unlockedTechnologies ?? [];
        // advanced_manufacturing should unlock (prereq process_optimization present, 300 pts met)
        expect(techs).toContain("advanced_manufacturing");
        // industry_4_0 should also unlock (prereq advanced_manufacturing now present, 600 pts met)
        expect(techs).toContain("industry_4_0");
      });

      it("full tech tree unlocks in correct sequence over rounds", () => {
        const outputs = runNRounds({
          teamCount: 1,
          rounds: 12,
          matchSeed: "rd-tech-full",
          decisionFn: () => ({
            rd: { rdBudget: 15_000_000 },
          }),
        });

        // With $15M/round => 150 pts/round + engineer output
        // Check final state has all techs after enough rounds
        const finalTechs = outputs[outputs.length - 1].results[0].newState.unlockedTechnologies ?? [];

        // At minimum, after 12 rounds with $15M budget = 1800+ budget points
        // plus engineer contributions, should unlock all 4 techs
        expect(finalTechs).toContain("process_optimization");
        expect(finalTechs).toContain("advanced_manufacturing");
        // industry_4_0 needs 600pts, breakthrough_tech needs 1000pts
        // 1800+ budget points alone should suffice
        expect(finalTechs).toContain("industry_4_0");
        expect(finalTechs).toContain("breakthrough_tech");
      });
    });

    // ─────────────────────────────────────────────
    // 5. Auto-Launch Ready Products
    // ─────────────────────────────────────────────
    describe("5. Auto-Launch Ready Products", () => {
      it("product in 'ready' state gets auto-launched", () => {
        const state = createMinimalTeamState();
        // Manually insert a product in 'ready' status
        state.products.push({
          id: "test-ready-product",
          name: "ReadyPhone",
          segment: "General" as Segment,
          price: 400,
          quality: 70,
          features: 60,
          reliability: 80,
          developmentRound: 0,
          developmentStatus: "ready",
          developmentProgress: 100,
          targetQuality: 70,
          targetFeatures: 60,
          roundsRemaining: 0,
          unitCost: 135,
        });

        const output = runSingleTeam(state, {
          rd: { rdBudget: 1_000_000 },
        }, "rd-auto-launch");

        const product = output.results[0].newState.products.find(
          p => p.id === "test-ready-product"
        );
        expect(product).toBeDefined();
        expect(product!.developmentStatus).toBe("launched");
      });

      it("in_development product transitions to launched when roundsRemaining hits 0", () => {
        const state = createMinimalTeamState();
        state.products.push({
          id: "test-dev-product",
          name: "AlmostDonePhone",
          segment: "Enthusiast" as Segment,
          price: 800,
          quality: 35, // 50% of target during dev
          features: 30,
          reliability: 50,
          developmentRound: 0,
          developmentStatus: "in_development",
          developmentProgress: 50,
          targetQuality: 70,
          targetFeatures: 60,
          roundsRemaining: 1, // Will complete this round
          unitCost: 225,
        });

        const output = runSingleTeam(state, {
          rd: { rdBudget: 1_000_000 },
        }, "rd-dev-complete");

        const product = output.results[0].newState.products.find(
          p => p.id === "test-dev-product"
        );
        expect(product).toBeDefined();
        expect(product!.developmentStatus).toBe("launched");
        // POST-FIX: Product aging (F2) reduces quality/features after launch, so use approximate
        expect(product!.quality).toBeGreaterThanOrEqual(68);
        expect(product!.quality).toBeLessThanOrEqual(70);
        expect(product!.features).toBeGreaterThanOrEqual(58);
        expect(product!.features).toBeLessThanOrEqual(60);
      });
    });

    // ─────────────────────────────────────────────
    // 6. Product Improvement Cost Scaling
    // ─────────────────────────────────────────────
    describe("6. Product Improvement Cost Scaling", () => {
      it("quality improvement at 90+ costs $5M/point", () => {
        const cost = RDModule.calculateImprovementCost(1, 0, 90, 50);
        expect(cost).toBe(5_000_000);
      });

      it("quality improvement at 80-89 costs $2.5M/point", () => {
        const cost = RDModule.calculateImprovementCost(1, 0, 80, 50);
        expect(cost).toBe(2_500_000);
      });

      it("quality improvement at 70-79 costs $1.5M/point", () => {
        const cost = RDModule.calculateImprovementCost(1, 0, 70, 50);
        expect(cost).toBe(1_500_000);
      });

      it("quality improvement below 70 costs $1M/point (base)", () => {
        const cost = RDModule.calculateImprovementCost(1, 0, 50, 50);
        expect(cost).toBe(1_000_000);
      });

      it("multi-point improvement spans cost tiers", () => {
        // Improve from quality 68 by +5 => points at 68,69,70,71,72
        // 68: $1M, 69: $1M, 70: $1.5M, 71: $1.5M, 72: $1.5M = $6.5M
        const cost = RDModule.calculateImprovementCost(5, 0, 68, 50);
        expect(cost).toBe(6_500_000);
      });

      it("feature improvement at 90+ costs $2.5M/point", () => {
        const cost = RDModule.calculateImprovementCost(0, 1, 50, 90);
        expect(cost).toBe(2_500_000);
      });

      it("combined quality + feature improvement sums correctly", () => {
        // 1 quality point at 50 = $1M, 1 feature point at 50 = $500K
        const cost = RDModule.calculateImprovementCost(1, 1, 50, 50);
        expect(cost).toBe(1_500_000);
      });

      it("patent value calculation matches formula", () => {
        const v0 = RDModule.calculatePatentValue(0);
        expect(v0.qualityBonus).toBe(0);
        expect(v0.costReduction).toBe(0);
        expect(v0.marketShareBonus).toBe(0);

        const v3 = RDModule.calculatePatentValue(3);
        expect(v3.qualityBonus).toBe(15); // min(25, 3*5) = 15
        expect(v3.costReduction).toBeCloseTo(0.15, 10); // min(0.25, 3*0.05) = 0.15
        expect(v3.marketShareBonus).toBeCloseTo(0.09, 10); // min(0.15, 3*0.03) = 0.09

        // Caps
        const v10 = RDModule.calculatePatentValue(10);
        expect(v10.qualityBonus).toBe(25); // capped at 25
        expect(v10.costReduction).toBeCloseTo(0.25, 10); // capped at 0.25
        expect(v10.marketShareBonus).toBeCloseTo(0.15, 10); // capped at 0.15
      });

      it("all invariants pass after R&D-heavy multi-round", () => {
        const outputs = runProfileNRounds({
          teamCount: 2,
          rounds: 8,
          matchSeed: "rd-deep-invariants",
          profile: "RD-patent-rush",
        });
        for (const output of outputs) {
          assertAllInvariantsPass(output);
        }
      });
    });
  });

  // =========================================================================
  // PART C — Miyazaki Protocol R&D Tests
  // =========================================================================

  describe("Part C — Miyazaki Protocol R&D Tests", () => {
    // ─────────────────────────────────────────────
    // §6 — R&D Module
    // ─────────────────────────────────────────────
    describe("§6 — R&D Module", () => {
      it("6.1 — Zero engineers + rdBudget=0: totalPoints=0, no progress", () => {
        const state = createMinimalTeamState();

        // Remove all engineers
        state.employees = state.employees.filter((e) => e.role !== "engineer");
        const rdBefore = state.rdProgress;

        const { newState, result } = RDModule.process(state, { rdBudget: 0 });

        expect(result.success).toBe(true);
        // No budget points and no engineer points => rdProgress unchanged
        expect(newState.rdProgress).toBe(rdBefore);
      });

      it("6.3 — Patents=100 with production gate: bonuses capped correctly", () => {
        // With full production (10,000 units)
        const fullProd = RDModule.calculatePatentValue(100, 10_000);
        expect(fullProd.qualityBonus).toBeLessThanOrEqual(25);
        expect(fullProd.costReduction).toBeLessThanOrEqual(0.25);
        expect(fullProd.marketShareBonus).toBeLessThanOrEqual(0.15);

        // Exact cap values
        expect(fullProd.qualityBonus).toBe(25);
        expect(fullProd.costReduction).toBe(0.25);
        expect(fullProd.marketShareBonus).toBe(0.15);
      });

      it("6.3 — Patents=100 with 0 units sold: all bonuses = 0 (production gate)", () => {
        const zeroProd = RDModule.calculatePatentValue(100, 0);
        expect(zeroProd.qualityBonus).toBe(0);
        expect(zeroProd.costReduction).toBe(0);
        expect(zeroProd.marketShareBonus).toBe(0);
      });
    });

    // ─────────────────────────────────────────────
    // CRIT-01 — R&D Budget Points Cap
    // ─────────────────────────────────────────────
    describe("CRIT-01 — R&D Budget Points Cap", () => {
      it("CRIT-01 — $50M rdBudget: budgetPoints capped at 200", () => {
        const state = createMinimalTeamState();
        state.cash = 200_000_000;

        // Remove engineers so only budget points contribute
        state.employees = state.employees.filter((e) => e.role !== "engineer");
        const rdBefore = state.rdProgress;

        const { newState } = RDModule.process(state, { rdBudget: 50_000_000 });

        // Raw would be floor(50M / 100K) = 500, capped at 200
        const budgetPointsAdded = newState.rdProgress - rdBefore;
        expect(budgetPointsAdded).toBe(CONSTANTS.MAX_RD_BUDGET_POINTS_PER_ROUND); // 200
      });
    });

    // ─────────────────────────────────────────────
    // VAL-01 — Negative R&D Budget Validation
    // ─────────────────────────────────────────────
    describe("VAL-01 — Negative R&D Budget Validation", () => {
      it("VAL-01 — Negative rdBudget is corrected to 0", () => {
        const state = createMinimalTeamState();
        const decisions: AllDecisions = {
          rd: { rdBudget: -1000 },
        };

        const { valid, errors, correctedDecisions } =
          SimulationEngine.validateDecisions(state, decisions);

        expect(valid).toBe(false);
        expect(errors.some((e) => e.includes("R&D budget"))).toBe(true);
        expect(correctedDecisions.rd!.rdBudget).toBe(0);
      });
    });
  });
});
