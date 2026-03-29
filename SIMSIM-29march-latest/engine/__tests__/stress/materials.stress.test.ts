/**
 * Stress Tests -- MaterialEngine
 *
 * Categories:
 *   A. Golden Path   (3 tests)  -- costs and requirements for every segment
 *   B. Edge Scenarios (10 tests) -- zero/extreme quantities, empty inventories, linearity
 *   C. Property Tests (50 seeds) -- seeded simulation, verify no NaN in final states
 *   D. Regression     (1 placeholder)
 *
 * Total: ~64 tests
 */

import { describe, it, expect } from "vitest";
import {
  createTeamState,
  createMarketState,
  createDecisions,
  runSimulation,
  assertNoNaN,
  assertAllInvariants,
} from "@/engine/testkit";
import { MaterialEngine } from "@/engine/materials/MaterialEngine";
import type { MaterialInventory } from "@/engine/materials/types";
import type { Segment } from "@/engine/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_SEGMENTS: Segment[] = [
  "Budget",
  "General",
  "Enthusiast",
  "Professional",
  "Active Lifestyle",
];

const EXPECTED_TOTAL_COSTS: Record<Segment, number> = {
  Budget: 60,
  General: 150,
  Enthusiast: 350,
  Professional: 600,
  "Active Lifestyle": 250,
};

/**
 * Build a full inventory that satisfies every material for a given segment.
 */
function buildFullInventory(segment: Segment, qty: number): MaterialInventory[] {
  const reqs = MaterialEngine.getMaterialRequirements(segment);
  return reqs.materials.map((m) => ({
    materialType: m.type,
    spec: m.spec,
    quantity: qty,
    averageCost: m.costPerUnit,
    sourceRegion: m.source,
  }));
}

// ===========================================================================
// A. Golden Path
// ===========================================================================

describe("MaterialEngine -- A. Golden Path", () => {
  it("A-1: calculateMaterialCost returns correct total for each segment", () => {
    for (const seg of ALL_SEGMENTS) {
      const cost = MaterialEngine.calculateMaterialCost(seg, 1);
      expect(cost).toBe(EXPECTED_TOTAL_COSTS[seg]);
    }
  });

  it("A-2: getMaterialRequirements returns valid data for every segment", () => {
    for (const seg of ALL_SEGMENTS) {
      const reqs = MaterialEngine.getMaterialRequirements(seg);

      expect(reqs.segment).toBe(seg);
      expect(reqs.materials.length).toBeGreaterThan(0);
      expect(reqs.totalCost).toBeGreaterThan(0);
      expect(reqs.leadTime).toBeGreaterThan(0);
      expect(reqs.qualityTier).toBeGreaterThanOrEqual(1);
      expect(reqs.qualityTier).toBeLessThanOrEqual(5);

      // Every material must have positive costPerUnit and valid type
      for (const mat of reqs.materials) {
        expect(mat.costPerUnit).toBeGreaterThan(0);
        expect(mat.type).toBeTruthy();
        expect(mat.spec).toBeTruthy();
      }
    }
  });

  it("A-3: full inventory makes checkMaterialAvailability return available=true", () => {
    for (const seg of ALL_SEGMENTS) {
      const inv = buildFullInventory(seg, 50_000);
      const result = MaterialEngine.checkMaterialAvailability(seg, 10_000, inv);
      expect(result.available).toBe(true);
      expect(result.missing).toHaveLength(0);
    }
  });
});

// ===========================================================================
// B. Edge Scenarios
// ===========================================================================

describe("MaterialEngine -- B. Edge Scenarios", () => {
  it("B-1: calculateMaterialCost with zero quantity returns 0", () => {
    for (const seg of ALL_SEGMENTS) {
      expect(MaterialEngine.calculateMaterialCost(seg, 0)).toBe(0);
    }
  });

  it("B-2: calculateMaterialCost with very large quantity (10M) is finite", () => {
    for (const seg of ALL_SEGMENTS) {
      const cost = MaterialEngine.calculateMaterialCost(seg, 10_000_000);
      expect(Number.isFinite(cost)).toBe(true);
      expect(cost).toBe(EXPECTED_TOTAL_COSTS[seg] * 10_000_000);
    }
  });

  it("B-3: checkMaterialAvailability with empty inventory marks everything missing", () => {
    const result = MaterialEngine.checkMaterialAvailability("Budget", 100, []);
    expect(result.available).toBe(false);
    // Budget has 8 material types
    const reqs = MaterialEngine.getMaterialRequirements("Budget");
    expect(result.missing).toHaveLength(reqs.materials.length);
    for (const m of result.missing) {
      expect(m.have).toBe(0);
      expect(m.needed).toBe(100);
    }
  });

  it("B-4: consumeMaterials from empty inventory yields all-zero quantities", () => {
    const emptyInv: MaterialInventory[] = [];
    const result = MaterialEngine.consumeMaterials("General", 500, emptyInv);
    // Empty inventory stays empty -- no crash
    expect(result).toHaveLength(0);
  });

  it("B-5: consumeMaterials clamps to zero when quantity exceeds stock", () => {
    const inv = buildFullInventory("Enthusiast", 10);
    const result = MaterialEngine.consumeMaterials("Enthusiast", 100, inv);
    for (const item of result) {
      expect(item.quantity).toBeGreaterThanOrEqual(0);
    }
  });

  it("B-6: calculateMaterialQualityImpact with no matching inventory uses defaults", () => {
    const result = MaterialEngine.calculateMaterialQualityImpact("Professional", []);
    expect(result.overallQuality).toBeGreaterThan(0);
    expect(result.overallQuality).toBeLessThanOrEqual(100);
    expect(result.defectRate).toBeGreaterThan(0);
    expect(result.defectRate).toBeLessThan(1);
    // Breakdown should still have entries for every material
    const reqs = MaterialEngine.getMaterialRequirements("Professional");
    expect(result.breakdown).toHaveLength(reqs.materials.length);
  });

  it("B-7: calculateHoldingCosts on empty inventory returns 0", () => {
    expect(MaterialEngine.calculateHoldingCosts([])).toBe(0);
  });

  it("B-8: calculateHoldingCosts is exactly 2% of total inventory value", () => {
    const inv: MaterialInventory[] = [
      { materialType: "display", spec: "LCD_5.5inch", quantity: 1000, averageCost: 15, sourceRegion: "Asia" },
      { materialType: "processor", spec: "EntryLevel_SoC", quantity: 500, averageCost: 8, sourceRegion: "Asia" },
    ];
    const totalValue = 1000 * 15 + 500 * 8;
    expect(MaterialEngine.calculateHoldingCosts(inv)).toBe(totalValue * 0.02);
  });

  it("B-9: each segment has a unique set of material specs", () => {
    const specSets = ALL_SEGMENTS.map((seg) => {
      const reqs = MaterialEngine.getMaterialRequirements(seg);
      return reqs.materials.map((m) => m.spec).sort().join(",");
    });

    // All spec sets should be distinct from each other
    const uniqueSets = new Set(specSets);
    expect(uniqueSets.size).toBe(ALL_SEGMENTS.length);
  });

  it("B-10: calculateMaterialCost scales linearly with quantity", () => {
    for (const seg of ALL_SEGMENTS) {
      const cost1 = MaterialEngine.calculateMaterialCost(seg, 1);
      const cost10 = MaterialEngine.calculateMaterialCost(seg, 10);
      const cost100 = MaterialEngine.calculateMaterialCost(seg, 100);

      expect(cost10).toBe(cost1 * 10);
      expect(cost100).toBe(cost1 * 100);
    }
  });
});

// ===========================================================================
// C. Property Tests (50 seeds)
// ===========================================================================

describe("MaterialEngine -- C. Property Tests (seeded simulations)", () => {
  for (let seed = 1; seed <= 50; seed++) {
    it(`C-${seed}: seed=${seed} -- simulation produces no NaN and passes all invariants`, () => {
      const result = runSimulation({
        teamCount: 2,
        rounds: 3,
        seed: `material-stress-${seed}`,
        profile: "baseline-balanced",
      });

      for (const state of result.finalStates) {
        assertNoNaN(state);
        assertAllInvariants(state);
      }
    });
  }
});

// ===========================================================================
// D. Regression Placeholders
// ===========================================================================

describe("MaterialEngine -- D. Regression", () => {
  it("D-1: placeholder -- add regression tests as bugs are discovered", () => {
    // This test exists as a reminder / anchor point.
    // When a material-related bug is fixed, add a deterministic repro here.
    expect(true).toBe(true);
  });
});
