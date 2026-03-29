/**
 * L3 Balance Diagnostic Tests
 *
 * These tests verify that no single decision lever (e.g. marketing) is
 * over-powered, that good play reliably beats passive play, and that
 * degenerate zero-budget inputs do not crash the engine.
 *
 * Context: Monte Carlo shows premium winning 56.8% and cost-cutter winning
 * 8.4%. These tests codify the balance boundaries that matter most.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput, type SimulationOutput } from "@/engine/core/SimulationEngine";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  runNRounds,
} from "@/engine/testkit/scenarioGenerator";
import type { AllDecisions } from "@/engine/types";

// ============================================
// HELPERS
// ============================================

/**
 * Build a set of "baseline" decisions that represent a neutral position.
 * Every module is present but with modest, non-zero values so that
 * only the lever under test varies between teams.
 */
function baselineDecisions(): AllDecisions {
  return {
    factory: {
      efficiencyInvestments: {},
      productionAllocations: [],
    },
    hr: {},
    rd: {
      rdBudget: 5_000_000,
    },
    marketing: {
      advertisingBudget: {
        Budget: 1_000_000,
        General: 1_500_000,
        Enthusiast: 1_000_000,
        Professional: 500_000,
        "Active Lifestyle": 800_000,
      },
      brandingInvestment: 2_000_000,
    },
    finance: {},
  };
}

/**
 * Marketing-maxed decisions: $10M per segment + $10M branding + sponsorship.
 * All other modules identical to baseline.
 */
function maxMarketingDecisions(): AllDecisions {
  const base = baselineDecisions();
  return {
    ...base,
    marketing: {
      advertisingBudget: {
        Budget: 2_000_000,
        General: 2_000_000,
        Enthusiast: 2_000_000,
        Professional: 2_000_000,
        "Active Lifestyle": 2_000_000,
      },
      brandingInvestment: 10_000_000,
      sponsorships: [
        { name: "National TV Campaign", cost: 35_000_000, brandImpact: 0.045 },
      ],
    },
  };
}

/**
 * Zero-marketing decisions: advertising and branding at zero.
 * All other modules identical to baseline.
 */
function zeroMarketingDecisions(): AllDecisions {
  const base = baselineDecisions();
  return {
    ...base,
    marketing: {
      advertisingBudget: {
        Budget: 0,
        General: 0,
        Enthusiast: 0,
        Professional: 0,
        "Active Lifestyle": 0,
      },
      brandingInvestment: 0,
    },
  };
}

/**
 * "Optimal" decisions — high R&D, factory investment, marketing, salary.
 * Represents a competent player making good choices across all levers.
 */
function optimalDecisions(state: typeof createMinimalTeamState extends (...args: any) => infer R ? R : never): AllDecisions {
  // Moderate spending — sustainable over 8 rounds on $175M starting cash
  // Key: include factory efficiency investment to increase production capacity
  const firstFactoryId = state?.factories?.[0]?.id ?? "factory-1";
  return {
    factory: {
      efficiencyInvestments: {
        [firstFactoryId]: { workers: 1_000_000, engineers: 500_000, machinery: 1_500_000 },
      },
      productionAllocations: [],
    },
    hr: {
      salaryMultiplierChanges: { workers: 1.1, engineers: 1.1, supervisors: 1.1 },
    },
    rd: {
      rdBudget: 8_000_000,
    },
    marketing: {
      advertisingBudget: {
        Budget: 500_000,
        General: 1_500_000,
        Enthusiast: 1_000_000,
        Professional: 1_000_000,
        "Active Lifestyle": 1_000_000,
      },
      brandingInvestment: 2_000_000,
    },
    finance: {},
  };
}

/**
 * "Passive" decisions — everything at zero or default.
 * Represents a player who does not engage with any lever.
 */
function passiveDecisions(): AllDecisions {
  return {
    factory: {},
    hr: {},
    rd: { rdBudget: 0 },
    marketing: {
      advertisingBudget: {
        Budget: 0,
        General: 0,
        Enthusiast: 0,
        Professional: 0,
        "Active Lifestyle": 0,
      },
      brandingInvestment: 0,
    },
    finance: {},
  };
}

/**
 * Completely empty decisions — every field is zero or absent.
 * Used for crash/NaN/undefined boundary testing.
 */
function zeroBudgetDecisions(): AllDecisions {
  return {
    factory: {
      efficiencyInvestments: {},
    },
    hr: {
      salaryMultiplierChanges: { workers: 0, engineers: 0, supervisors: 0 },
    },
    rd: {
      rdBudget: 0,
    },
    marketing: {
      advertisingBudget: {
        Budget: 0,
        General: 0,
        Enthusiast: 0,
        Professional: 0,
        "Active Lifestyle": 0,
      },
      brandingInvestment: 0,
    },
    finance: {},
  };
}

/**
 * Deep-check a value for NaN or undefined, recursing into objects and arrays.
 */
// Fields that are legitimately undefined (not bugs)
const ALLOWED_UNDEFINED = new Set([
  "previousFinancialStatements",  // undefined on round 1 (no previous)
  "eps",                           // undefined when sharesOutstanding === 0
  "featureSet",                    // optional product field
  "qualityGrade",                  // optional product field
  "archetypeId",                   // optional product field
  "targetQuality",                 // optional on existing products
  "targetFeatures",                // optional on existing products
  "roundsRemaining",               // optional development field
  "reliability",                    // optional product field
  "config",                         // optional engine config
  "facilitatorBrief",               // optional round output
  "techTree",                       // optional expansion feature
  "rdPlatforms",                    // optional expansion feature
  "experienceCurve",                // optional expansion feature
  "factoryExpansion",               // optional expansion feature
  "hrExpansion",                    // optional expansion feature
  "marketingExpansion",             // optional expansion feature
  "machineryStates",                // optional machinery feature
  "warehouseState",                 // optional warehouse feature
  "unlockedTechnologies",           // optional tech feature
  "patentRegistry",                 // optional patent feature
  "capitalStructure",               // optional finance feature
]);

function hasNaNOrUndefined(obj: unknown, path = ""): string[] {
  const issues: string[] = [];
  if (obj === undefined) {
    // Check if this is a known-allowed undefined field
    const fieldName = path.split(".").pop() || "";
    if (ALLOWED_UNDEFINED.has(fieldName)) return issues;
    issues.push(`undefined at ${path}`);
    return issues;
  }
  if (typeof obj === "number" && Number.isNaN(obj)) {
    issues.push(`NaN at ${path}`);
    return issues;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      issues.push(...hasNaNOrUndefined(item, `${path}[${i}]`));
    });
  } else if (obj !== null && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      issues.push(...hasNaNOrUndefined(value, `${path}.${key}`));
    }
  }
  return issues;
}

// ============================================
// TESTS
// ============================================

describe("L3 — CAPSIM Balance Diagnostics", () => {

  // ------------------------------------------
  // L3-MKT-01: Marketing dominance cap
  // ------------------------------------------
  describe("L3-MKT-01 — Marketing dominance cap", () => {
    it("max-marketing team revenue should be at most 2x zero-marketing team revenue after 5 rounds", () => {
      const ROUNDS = 5;
      const SEED = "mkt-dominance-cap";

      const outputs = runNRounds({
        teamCount: 2,
        rounds: ROUNDS,
        matchSeed: SEED,
        decisionFn: (_state, _round, teamIndex) => {
          // Team 0 = max marketing, Team 1 = zero marketing
          return teamIndex === 0 ? maxMarketingDecisions() : zeroMarketingDecisions();
        },
      });

      // Use cumulative revenue across all 5 rounds
      let teamA_revenue = 0;
      let teamB_revenue = 0;
      for (const output of outputs) {
        const resultA = output.results.find(r => r.teamId === "team-1");
        const resultB = output.results.find(r => r.teamId === "team-2");
        expect(resultA).toBeDefined();
        expect(resultB).toBeDefined();
        teamA_revenue += resultA!.newState?.revenue ?? 0;
        teamB_revenue += resultB!.newState?.revenue ?? 0;
      }

      // Guard: both teams must have generated some revenue
      expect(teamA_revenue).toBeGreaterThan(0);
      expect(teamB_revenue).toBeGreaterThan(0);

      const ratio = teamA_revenue / teamB_revenue;

      // If this fails, marketing is over-powered: a team spending only on
      // marketing should not earn more than 2x a team spending nothing on it.
      if (ratio > 2.0) {
        console.warn(
          `Marketing is over-powered. Revenue ratio (max-mkt / zero-mkt) = ${ratio.toFixed(3)}. ` +
          `TeamA=$${(teamA_revenue / 1e6).toFixed(1)}M, TeamB=$${(teamB_revenue / 1e6).toFixed(1)}M`
        );
      }
      expect(ratio).toBeLessThanOrEqual(2.0);
    });
  });

  // ------------------------------------------
  // L3-BAL-01: Good play beats passive in majority of games
  // ------------------------------------------
  describe("L3-BAL-01 — Good play beats passive in majority of games", () => {
    it("optimal strategy should win >= 60% of 20 seeded games (8 rounds each)", () => {
      const GAME_COUNT = 20;
      const ROUNDS_PER_GAME = 8;
      let optimalWins = 0;

      for (let seed = 0; seed < GAME_COUNT; seed++) {
        const outputs = runNRounds({
          teamCount: 2,
          rounds: ROUNDS_PER_GAME,
          matchSeed: String(seed),
          decisionFn: (state, _round, teamIndex) => {
            // Team 0 = optimal, Team 1 = passive
            return teamIndex === 0 ? optimalDecisions(state) : passiveDecisions();
          },
        });

        // Determine winner by cumulative revenue over all rounds
        let optimalRevenue = 0;
        let passiveRevenue = 0;
        for (const output of outputs) {
          const rOpt = output.results.find(r => r.teamId === "team-1");
          const rPas = output.results.find(r => r.teamId === "team-2");
          optimalRevenue += rOpt?.newState?.revenue ?? 0;
          passiveRevenue += rPas?.newState?.revenue ?? 0;
        }

        if (optimalRevenue > passiveRevenue) {
          optimalWins++;
        }
      }

      const winRate = optimalWins / GAME_COUNT;

      if (winRate < 0.60) {
        console.warn(
          `Optimal strategy under-performs. Win rate = ${(winRate * 100).toFixed(1)}% ` +
          `(${optimalWins}/${GAME_COUNT} games). Good decisions should reliably beat passivity.`
        );
      }

      expect(winRate).toBeGreaterThanOrEqual(0.60);
    });
  });

  // ------------------------------------------
  // L3-EDGE-01: Zero budget team does not crash
  // ------------------------------------------
  describe("L3-EDGE-01 — Zero budget team does not crash", () => {
    it("engine processes zero-budget decisions without errors, NaN, or undefined", () => {
      const ROUNDS = 4;
      const SEED = "zero-budget-edge";

      let outputs: SimulationOutput[];

      // The engine must not throw
      expect(() => {
        outputs = runNRounds({
          teamCount: 1,
          rounds: ROUNDS,
          matchSeed: SEED,
          decisionFn: () => zeroBudgetDecisions(),
        });
      }).not.toThrow();

      // Validate outputs exist
      outputs = runNRounds({
        teamCount: 1,
        rounds: ROUNDS,
        matchSeed: SEED,
        decisionFn: () => zeroBudgetDecisions(),
      });

      expect(outputs.length).toBe(ROUNDS);

      for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];

        // Must have exactly one result (one team)
        expect(output.results.length).toBe(1);

        const result = output.results[0];

        // Revenue must be a finite number (can be zero, but not NaN/undefined)
        expect(typeof result.newState?.revenue).toBe("number");
        expect(Number.isFinite(result.newState?.revenue)).toBe(true);

        // newState must not contain NaN or undefined in critical financial fields
        const state = result.newState;
        expect(Number.isFinite(state.cash)).toBe(true);
        expect(Number.isFinite(state.revenue)).toBe(true);

        // Deep scan newState for any NaN or undefined values
        const issues = hasNaNOrUndefined(state, `round-${i + 1}.newState`);
        if (issues.length > 0) {
          console.warn(`Zero-budget state integrity issues:\n${issues.join("\n")}`);
        }
        expect(issues.length).toBe(0);

        // newMarketState must also be clean
        const marketIssues = hasNaNOrUndefined(output.newMarketState, `round-${i + 1}.newMarketState`);
        if (marketIssues.length > 0) {
          console.warn(`Zero-budget market state issues:\n${marketIssues.join("\n")}`);
        }
        expect(marketIssues.length).toBe(0);
      }
    });
  });
});
