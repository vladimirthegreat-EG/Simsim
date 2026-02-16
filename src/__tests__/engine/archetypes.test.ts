/**
 * Archetype System Tests
 *
 * Tests phone archetype definitions, tech requirements, and availability logic.
 */

import { describe, it, expect } from "vitest";
import {
  ALL_ARCHETYPES,
  getAvailableArchetypes,
} from "../../engine/types/archetypes";
import type { PhoneArchetype } from "../../engine/types/archetypes";
import { RDExpansions } from "../../engine/modules/RDExpansions";

describe("Archetype System", () => {
  describe("ALL_ARCHETYPES", () => {
    it("should have 25 archetypes", () => {
      expect(ALL_ARCHETYPES.length).toBe(25);
    });

    it("should have unique IDs", () => {
      const ids = ALL_ARCHETYPES.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should have archetypes at each tier 0-5", () => {
      const tiers = new Set(ALL_ARCHETYPES.map((a) => a.tier));
      expect(tiers.has(0)).toBe(true);
      expect(tiers.has(1)).toBe(true);
      expect(tiers.has(2)).toBe(true);
      expect(tiers.has(3)).toBe(true);
      // Tier 4/5 combined
      expect(tiers.has(4) || tiers.has(5)).toBe(true);
    });

    it("should have 3 starter archetypes (tier 0)", () => {
      const starters = ALL_ARCHETYPES.filter((a) => a.tier === 0);
      expect(starters.length).toBe(3);
    });

    it("should cover all 5 segments as primary", () => {
      const primarySegments = new Set(ALL_ARCHETYPES.map((a) => a.primarySegment));
      expect(primarySegments.has("Budget")).toBe(true);
      expect(primarySegments.has("General")).toBe(true);
      expect(primarySegments.has("Enthusiast")).toBe(true);
      expect(primarySegments.has("Professional")).toBe(true);
      expect(primarySegments.has("Active Lifestyle")).toBe(true);
    });

    it("each archetype should have a valid price range", () => {
      for (const arch of ALL_ARCHETYPES) {
        expect(arch.suggestedPriceRange.min).toBeGreaterThan(0);
        expect(arch.suggestedPriceRange.max).toBeGreaterThan(arch.suggestedPriceRange.min);
      }
    });

    it("each archetype should have positive base cost and development rounds", () => {
      for (const arch of ALL_ARCHETYPES) {
        expect(arch.baseCost).toBeGreaterThan(0);
        expect(arch.developmentRounds).toBeGreaterThanOrEqual(1);
      }
    });

    it("tier 0 archetypes should require no tech", () => {
      const starters = ALL_ARCHETYPES.filter((a) => a.tier === 0);
      for (const starter of starters) {
        expect(starter.requiredTech).toHaveLength(0);
      }
    });

    it("tier 1+ archetypes should require tech or have special validation", () => {
      const advanced = ALL_ARCHETYPES.filter((a) => a.tier >= 1);
      // ultimate_flagship and quantum_phone use special validation via allTechNodes
      const specialIds = new Set(["ultimate_flagship", "quantum_phone"]);
      for (const arch of advanced) {
        if (specialIds.has(arch.id)) {
          expect(arch.requiredTech.length).toBe(0);
        } else {
          expect(arch.requiredTech.length).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  describe("getAvailableArchetypes", () => {
    it("should return only starter archetypes with no techs (when allTechNodes provided)", () => {
      // Without allTechNodes, special archetypes pass through
      // With allTechNodes, special validation for ultimate_flagship/quantum_phone kicks in
      const techTree = RDExpansions.getTechTree().map((t) => ({ id: t.id, tier: t.tier }));
      const available = getAvailableArchetypes([], techTree);
      expect(available.length).toBe(3); // Only 3 starters
      for (const arch of available) {
        expect(arch.tier).toBe(0);
      }
    });

    it("should unlock tier 1 archetypes with matching techs", () => {
      const available = getAvailableArchetypes(["bat_1a"]);
      const longLife = available.find((a) => a.id === "long_life_phone");
      expect(longLife).toBeDefined();
    });

    it("should not unlock archetypes with missing techs", () => {
      const available = getAvailableArchetypes(["cam_1a"]);
      const longLife = available.find((a) => a.id === "long_life_phone");
      expect(longLife).toBeUndefined();
    });

    it("should unlock tier 2 archetypes requiring multiple techs", () => {
      // gaming_phone requires dsp_2a and bat_1a
      const withBothTechs = getAvailableArchetypes(["dsp_2a", "bat_1a"]);
      const gaming = withBothTechs.find((a) => a.id === "gaming_phone");
      expect(gaming).toBeDefined();

      // Missing one tech
      const withOneTech = getAvailableArchetypes(["dsp_2a"]);
      const gamingMissing = withOneTech.find((a) => a.id === "gaming_phone");
      expect(gamingMissing).toBeUndefined();
    });

    it("should always include starter archetypes regardless of techs", () => {
      const available = getAvailableArchetypes(["bat_1a", "cam_1a", "ai_1a"]);
      const starters = available.filter((a) => a.tier === 0);
      expect(starters.length).toBe(3);
    });

    it("should increase available count as more techs are unlocked", () => {
      const count0 = getAvailableArchetypes([]).length;
      const count1 = getAvailableArchetypes(["bat_1a", "cam_1a"]).length;
      const count2 = getAvailableArchetypes(["bat_1a", "cam_1a", "ai_1a", "dur_1a", "dsp_1a", "con_1a"]).length;

      expect(count1).toBeGreaterThan(count0);
      expect(count2).toBeGreaterThan(count1);
    });
  });

  describe("Feature emphasis", () => {
    it("starter archetypes should have modest or no emphasis", () => {
      const starters = ALL_ARCHETYPES.filter((a) => a.tier === 0);
      for (const starter of starters) {
        const values = Object.values(starter.featureEmphasis);
        for (const v of values) {
          expect(v).toBeLessThanOrEqual(1.5);
        }
      }
    });

    it("higher tier archetypes should have stronger emphasis", () => {
      const tier3Plus = ALL_ARCHETYPES.filter((a) => a.tier >= 3);
      for (const arch of tier3Plus) {
        const values = Object.values(arch.featureEmphasis);
        // At least one strong emphasis
        expect(Math.max(...values, 0)).toBeGreaterThanOrEqual(1.3);
      }
    });
  });

  describe("RDExpansions.calculateProductFeatureSet", () => {
    it("should return all zeros with no techs", () => {
      const features = RDExpansions.calculateProductFeatureSet([]);
      expect(features.battery).toBe(0);
      expect(features.camera).toBe(0);
      expect(features.ai).toBe(0);
      expect(features.durability).toBe(0);
      expect(features.display).toBe(0);
      expect(features.connectivity).toBe(0);
    });

    it("should increase battery when battery techs are unlocked", () => {
      const features = RDExpansions.calculateProductFeatureSet(["bat_1a"]);
      expect(features.battery).toBeGreaterThan(0);
    });

    it("should increase camera when camera techs are unlocked", () => {
      const features = RDExpansions.calculateProductFeatureSet(["cam_1a"]);
      expect(features.camera).toBeGreaterThan(0);
    });

    it("should cap values at 100", () => {
      // Unlock every tech in a family
      const allBatteryTechs = RDExpansions.getTechTree()
        .filter((t) => t.family === "battery")
        .map((t) => t.id);
      const features = RDExpansions.calculateProductFeatureSet(allBatteryTechs);
      expect(features.battery).toBeLessThanOrEqual(100);
    });

    it("should apply cross-family bonuses", () => {
      // cam_3b gives ai +10 via family_bonus
      const features = RDExpansions.calculateProductFeatureSet(["cam_3b"]);
      expect(features.ai).toBeGreaterThan(0);
    });

    it("should increase scores with more techs", () => {
      const f1 = RDExpansions.calculateProductFeatureSet(["bat_1a"]);
      const f2 = RDExpansions.calculateProductFeatureSet(["bat_1a", "bat_2a"]);
      expect(f2.battery).toBeGreaterThan(f1.battery);
    });
  });

  describe("Tech tree", () => {
    it("should have 54 nodes", () => {
      const tree = RDExpansions.getTechTree();
      expect(tree.length).toBe(54);
    });

    it("should have 9 nodes per family", () => {
      const tree = RDExpansions.getTechTree();
      const families = ["battery", "camera", "ai", "durability", "display", "connectivity"];
      for (const family of families) {
        const count = tree.filter((t) => t.family === family).length;
        expect(count).toBe(9);
      }
    });

    it("each family should have nodes across tiers 1-5", () => {
      const tree = RDExpansions.getTechTree();
      const families = ["battery", "camera", "ai", "durability", "display", "connectivity"];
      for (const family of families) {
        const tiers = new Set(tree.filter((t) => t.family === family).map((t) => t.tier));
        for (let tier = 1; tier <= 5; tier++) {
          expect(tiers.has(tier as 1 | 2 | 3 | 4 | 5)).toBe(true);
        }
      }
    });
  });
});
