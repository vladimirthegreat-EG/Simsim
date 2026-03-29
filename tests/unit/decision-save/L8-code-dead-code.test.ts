/**
 * L8 — Code Quality: Dead Code, Edge Values, and Promotion Mechanics
 *
 * CQ-01:  customerSatisfaction flag is dead (no SatisfactionEngine exists)
 * CQ-13a: NaN rdBudget does not hang the engine
 * CQ-13b: Infinity investment does not hang the engine
 * CQ-13c: MAX_SAFE_INTEGER investment does not hang the engine
 * CQ-11:  Promotions work via price change only (no separate promotionBoost multiplier)
 */

import { describe, it, expect } from "vitest";
import {
  SimulationEngine,
  type SimulationInput,
} from "../../../engine/core/SimulationEngine";
import { hashState } from "../../../engine/core/EngineContext";
import { loadConfig } from "../../../engine/config/loader";
import type { EngineConfig } from "../../../engine/config/schema";
import type { AllDecisions } from "../../../engine/types/decisions";
import type { TeamState } from "../../../engine/types";

// ============================================
// SHARED HELPERS
// ============================================

/** Create a single-team SimulationInput with a fixed seed for deterministic comparison. */
function buildInput(
  teamState: ReturnType<typeof SimulationEngine.createInitialTeamState>,
  decisions: AllDecisions,
  config?: EngineConfig,
  matchSeed = "cq-test-seed",
): SimulationInput {
  return {
    roundNumber: 1,
    teams: [{ id: "team-cq", state: teamState, decisions }],
    marketState: SimulationEngine.createInitialMarketState(),
    matchSeed,
    config,
  };
}

/**
 * Check key financial fields for NaN/Infinity on a TeamState.
 * Deliberately excludes rdBudget (which may echo a NaN decision input)
 * and focuses on fields that the engine computes.
 */
const KEY_FINANCIAL_FIELDS: (keyof TeamState)[] = [
  "cash",
  "revenue",
  "netIncome",
  "eps",
  "marketCap",
  "sharePrice",
  "brandValue",
  "totalAssets",
  "shareholdersEquity",
  "totalLiabilities",
  "cogs",
];

function assertKeyFieldsClean(state: TeamState, label: string): void {
  for (const field of KEY_FINANCIAL_FIELDS) {
    const val = state[field];
    if (typeof val === "number") {
      expect(isNaN(val), `${label}.${field} is NaN`).toBe(false);
      expect(isFinite(val), `${label}.${field} is Infinity`).toBe(true);
    }
  }
}

// ============================================
// CQ-01 — customerSatisfaction flag is dead
// ============================================

describe("CQ-01: customerSatisfaction flag is dead code", () => {
  it("processRound output is identical whether customerSatisfaction is true or false", () => {
    /**
     * DOCUMENT: The DifficultyConfig.complexity.customerSatisfaction flag
     * is declared in schema.ts and set in difficulty presets, but no
     * SatisfactionEngine exists. This test proves the flag has zero effect
     * on simulation output. If this test FAILS, the flag IS doing something
     * and the "dead code" label should be removed.
     */
    const baseConfig = loadConfig();

    // Config variant A: customerSatisfaction = true
    const configTrue: EngineConfig = {
      ...structuredClone(baseConfig),
      difficulty: {
        ...structuredClone(baseConfig.difficulty),
        complexity: {
          ...structuredClone(baseConfig.difficulty.complexity),
          customerSatisfaction: true,
        },
      },
    };

    // Config variant B: customerSatisfaction = false
    const configFalse: EngineConfig = {
      ...structuredClone(baseConfig),
      difficulty: {
        ...structuredClone(baseConfig.difficulty),
        complexity: {
          ...structuredClone(baseConfig.difficulty.complexity),
          customerSatisfaction: false,
        },
      },
    };

    const state = SimulationEngine.createInitialTeamState();
    const decisions: AllDecisions = {
      rd: { rdBudget: 5_000_000 },
      marketing: {
        advertisingBudget: { General: 1_000_000 },
        brandingInvestment: 1_000_000,
      },
    };

    const outputTrue = SimulationEngine.processRound(
      buildInput(state, decisions, configTrue),
    );
    const outputFalse = SimulationEngine.processRound(
      buildInput(state, decisions, configFalse),
    );

    // Compare the final team states via hash — they must be identical.
    const hashTrue = hashState(outputTrue.results[0].newState);
    const hashFalse = hashState(outputFalse.results[0].newState);

    expect(hashTrue).toBe(hashFalse);

    // Also compare market-level output hashes
    const marketHashTrue = hashState(outputTrue.newMarketState);
    const marketHashFalse = hashState(outputFalse.newMarketState);
    expect(marketHashTrue).toBe(marketHashFalse);
  });
});

// ============================================
// CQ-13a — NaN rdBudget does not hang engine
// ============================================

describe("CQ-13a: NaN rdBudget does not hang the engine", { timeout: 10_000 }, () => {
  it("engine completes (does not hang) when rdBudget = NaN", () => {
    const state = SimulationEngine.createInitialTeamState();
    const decisions: AllDecisions = {
      rd: { rdBudget: NaN },
    };

    // The engine must either reject or handle gracefully — NOT hang.
    let output: ReturnType<typeof SimulationEngine.processRound> | null = null;
    let threwError = false;

    try {
      output = SimulationEngine.processRound(
        buildInput(state, decisions),
      );
    } catch {
      threwError = true;
    }

    // Either it threw (acceptable) or it completed without NaN contamination
    // in key financial fields. Note: state.rdBudget may echo the NaN input
    // value — that is the decision echo, not engine-computed output.
    if (!threwError && output) {
      const resultState = output.results[0].newState;
      assertKeyFieldsClean(resultState, "NaN-rdBudget-output");
    }
    // If we reach here, the engine did not hang — test passes.
    expect(true).toBe(true);
  });
});

// ============================================
// CQ-13b — Infinity budget does not hang engine
// ============================================

describe("CQ-13b: Infinity factory investment does not hang the engine", { timeout: 10_000 }, () => {
  it("engine completes (does not hang) when workerEfficiency = Infinity", () => {
    const state = SimulationEngine.createInitialTeamState();
    const decisions: AllDecisions = {
      factory: {
        // Use the alternative "investments" format that maps to the first factory
        investments: {
          workerEfficiency: Infinity,
        },
      } as AllDecisions["factory"],
    };

    let output: ReturnType<typeof SimulationEngine.processRound> | null = null;
    let threwError = false;

    try {
      output = SimulationEngine.processRound(
        buildInput(state, decisions),
      );
    } catch {
      threwError = true;
    }

    // Either threw (acceptable) or completed cleanly.
    if (!threwError && output) {
      const resultState = output.results[0].newState;
      assertKeyFieldsClean(resultState, "Infinity-investment");
    }
    expect(true).toBe(true);
  });
});

// ============================================
// CQ-13c — MAX_SAFE_INTEGER does not hang engine
// ============================================

describe("CQ-13c: MAX_SAFE_INTEGER investment does not hang the engine", { timeout: 10_000 }, () => {
  it("engine completes (does not hang) when workerEfficiency = MAX_SAFE_INTEGER", () => {
    const state = SimulationEngine.createInitialTeamState();
    const decisions: AllDecisions = {
      factory: {
        investments: {
          workerEfficiency: Number.MAX_SAFE_INTEGER,
        },
      } as AllDecisions["factory"],
    };

    let output: ReturnType<typeof SimulationEngine.processRound> | null = null;
    let threwError = false;

    try {
      output = SimulationEngine.processRound(
        buildInput(state, decisions),
      );
    } catch {
      threwError = true;
    }

    if (!threwError && output) {
      const resultState = output.results[0].newState;
      assertKeyFieldsClean(resultState, "MAX_SAFE_INTEGER");
    }
    expect(true).toBe(true);
  });
});

// ============================================
// CQ-11 — Promotions work via price change only
// ============================================

describe("CQ-11: Promotions work via price change only", () => {
  it("a 30% discount promotion lowers the General product price with no separate promotionBoost multiplier", () => {
    /**
     * DOCUMENT: MarketingModule.process() applies promotions by directly
     * mutating product.price (line ~117 in MarketingModule.ts):
     *   segmentProduct.price = Math.round(oldPrice * (1 - discount))
     *
     * There is NO separate "promotionBoost" multiplier passed to the
     * MarketSimulator. The promotion's entire effect flows through the
     * lower price, which the market scoring picks up via price weights.
     *
     * If a promotionBoost multiplier is ever added, Team A's product
     * would gain extra market share beyond what the price drop alone
     * explains, and the assertion below would need updating.
     */

    // ----- Team A: 30% discount promotion on General -----
    const stateA = SimulationEngine.createInitialTeamState();
    const decisionsA: AllDecisions = {
      marketing: {
        promotions: [
          { segment: "General", discountPercent: 30, duration: 1 },
        ],
      },
    };

    // ----- Team B: no promotion, identical otherwise -----
    const stateB = SimulationEngine.createInitialTeamState();
    const decisionsB: AllDecisions = {};

    const input: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "promo-team", state: stateA, decisions: decisionsA },
        { id: "no-promo-team", state: stateB, decisions: decisionsB },
      ],
      marketState: SimulationEngine.createInitialMarketState(),
      matchSeed: "cq11-promo-test",
    };

    const output = SimulationEngine.processRound(input);

    // Find the General product for each team in the results
    const promoResult = output.results.find(r => r.teamId === "promo-team")!;
    const noPromoResult = output.results.find(r => r.teamId === "no-promo-team")!;

    expect(promoResult).toBeDefined();
    expect(noPromoResult).toBeDefined();

    const promoGeneralProduct = promoResult.newState.products.find(
      p => p.segment === "General",
    );
    const noPromoGeneralProduct = noPromoResult.newState.products.find(
      p => p.segment === "General",
    );

    expect(promoGeneralProduct).toBeDefined();
    expect(noPromoGeneralProduct).toBeDefined();

    // The promo team's General product must have a lower price after the 30% discount.
    // Original General price is typically $449 (from CONSTANTS.INITIAL_PRODUCT_SPECS).
    // After 30% discount: Math.round(449 * 0.70) = 314
    expect(promoGeneralProduct!.price).toBeLessThan(noPromoGeneralProduct!.price);

    // Verify the discount is approximately 30% (within rounding tolerance)
    const expectedDiscountedPrice = Math.round(noPromoGeneralProduct!.price * 0.70);
    expect(promoGeneralProduct!.price).toBe(expectedDiscountedPrice);

    // DOCUMENT: There is no separate promotionBoost field on the product or result.
    // The promotion effect is entirely captured by the price change above.
    // Verify no promotionBoost key exists on the product object.
    expect(
      (promoGeneralProduct as unknown as Record<string, unknown>).promotionBoost,
    ).toBeUndefined();
  });
});
