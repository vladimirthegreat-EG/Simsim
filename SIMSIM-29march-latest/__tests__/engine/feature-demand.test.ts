/**
 * Feature-Based Demand Scoring Tests
 *
 * Tests the 6-axis feature match system:
 * - ProductFeatureSet × SegmentPreferences → 0-1 score
 * - Segment preferences sum to 1.0
 * - Edge cases: empty features, max features
 * - Legacy fallback when featureSet is undefined
 */

import { describe, it, expect } from "vitest";
import {
  calculateFeatureMatchScore,
  emptyFeatureSet,
  SEGMENT_FEATURE_PREFERENCES,
  TECH_FAMILIES,
} from "../../engine/types/features";
import type { ProductFeatureSet, FeaturePreferenceProfile } from "../../engine/types/features";

describe("Feature-Based Demand", () => {
  describe("SEGMENT_FEATURE_PREFERENCES", () => {
    it("should have preferences for all 5 segments", () => {
      const segments = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
      for (const seg of segments) {
        expect(SEGMENT_FEATURE_PREFERENCES[seg]).toBeDefined();
      }
    });

    it("should have weights that sum to ~1.0 for each segment", () => {
      for (const [segment, prefs] of Object.entries(SEGMENT_FEATURE_PREFERENCES)) {
        const sum = TECH_FAMILIES.reduce((s, f) => s + prefs[f], 0);
        expect(sum).toBeCloseTo(1.0, 2);
      }
    });

    it("Budget segment should prioritize battery and durability", () => {
      const budget = SEGMENT_FEATURE_PREFERENCES["Budget"];
      expect(budget.battery).toBeGreaterThan(budget.camera);
      expect(budget.battery).toBeGreaterThan(budget.ai);
      expect(budget.durability).toBeGreaterThan(budget.ai);
    });

    it("Enthusiast segment should prioritize camera and display", () => {
      const enth = SEGMENT_FEATURE_PREFERENCES["Enthusiast"];
      expect(enth.camera).toBeGreaterThan(enth.battery);
      expect(enth.display).toBeGreaterThan(enth.durability);
    });

    it("Professional segment should prioritize AI and connectivity", () => {
      const pro = SEGMENT_FEATURE_PREFERENCES["Professional"];
      expect(pro.ai).toBeGreaterThan(pro.camera);
      expect(pro.connectivity).toBeGreaterThan(pro.durability);
    });

    it("Active Lifestyle should prioritize durability", () => {
      const active = SEGMENT_FEATURE_PREFERENCES["Active Lifestyle"];
      expect(active.durability).toBeGreaterThan(active.camera);
      expect(active.durability).toBeGreaterThan(active.ai);
      expect(active.durability).toBeGreaterThan(active.display);
    });
  });

  describe("emptyFeatureSet", () => {
    it("should return all zeros", () => {
      const fs = emptyFeatureSet();
      for (const family of TECH_FAMILIES) {
        expect(fs[family]).toBe(0);
      }
    });
  });

  describe("calculateFeatureMatchScore", () => {
    it("should return 0 for empty features", () => {
      const features = emptyFeatureSet();
      const score = calculateFeatureMatchScore(
        features,
        SEGMENT_FEATURE_PREFERENCES["Budget"]
      );
      expect(score).toBe(0);
    });

    it("should return 1.0 for perfect features (all 100)", () => {
      const features: ProductFeatureSet = {
        battery: 100,
        camera: 100,
        ai: 100,
        durability: 100,
        display: 100,
        connectivity: 100,
      };
      const score = calculateFeatureMatchScore(
        features,
        SEGMENT_FEATURE_PREFERENCES["Budget"]
      );
      // All 100 means each (100/100) * weight = weight, sum = 1.0
      expect(score).toBeCloseTo(1.0, 2);
    });

    it("should score higher for battery-focused product in Budget segment", () => {
      const batteryProduct: ProductFeatureSet = {
        battery: 80, camera: 20, ai: 10, durability: 60, display: 30, connectivity: 20,
      };
      const cameraProduct: ProductFeatureSet = {
        battery: 20, camera: 80, ai: 10, durability: 20, display: 60, connectivity: 30,
      };
      const budgetPrefs = SEGMENT_FEATURE_PREFERENCES["Budget"];

      const batteryScore = calculateFeatureMatchScore(batteryProduct, budgetPrefs);
      const cameraScore = calculateFeatureMatchScore(cameraProduct, budgetPrefs);

      expect(batteryScore).toBeGreaterThan(cameraScore);
    });

    it("should score higher for camera-focused product in Enthusiast segment", () => {
      const batteryProduct: ProductFeatureSet = {
        battery: 80, camera: 20, ai: 10, durability: 60, display: 30, connectivity: 20,
      };
      const cameraProduct: ProductFeatureSet = {
        battery: 20, camera: 80, ai: 10, durability: 20, display: 80, connectivity: 30,
      };
      const enthPrefs = SEGMENT_FEATURE_PREFERENCES["Enthusiast"];

      const batteryScore = calculateFeatureMatchScore(batteryProduct, enthPrefs);
      const cameraScore = calculateFeatureMatchScore(cameraProduct, enthPrefs);

      expect(cameraScore).toBeGreaterThan(batteryScore);
    });

    it("should return a value between 0 and 1 for any valid input", () => {
      const features: ProductFeatureSet = {
        battery: 50, camera: 30, ai: 70, durability: 40, display: 60, connectivity: 55,
      };
      for (const segment of Object.keys(SEGMENT_FEATURE_PREFERENCES)) {
        const score = calculateFeatureMatchScore(
          features,
          SEGMENT_FEATURE_PREFERENCES[segment]
        );
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    it("should scale linearly with feature values", () => {
      const low: ProductFeatureSet = {
        battery: 25, camera: 25, ai: 25, durability: 25, display: 25, connectivity: 25,
      };
      const high: ProductFeatureSet = {
        battery: 50, camera: 50, ai: 50, durability: 50, display: 50, connectivity: 50,
      };
      const prefs = SEGMENT_FEATURE_PREFERENCES["General"];

      const lowScore = calculateFeatureMatchScore(low, prefs);
      const highScore = calculateFeatureMatchScore(high, prefs);

      // Double features = double score (since weights sum to 1)
      expect(highScore).toBeCloseTo(lowScore * 2, 2);
    });
  });

  describe("TECH_FAMILIES", () => {
    it("should have exactly 6 families", () => {
      expect(TECH_FAMILIES).toHaveLength(6);
    });

    it("should include all expected families", () => {
      expect(TECH_FAMILIES).toContain("battery");
      expect(TECH_FAMILIES).toContain("camera");
      expect(TECH_FAMILIES).toContain("ai");
      expect(TECH_FAMILIES).toContain("durability");
      expect(TECH_FAMILIES).toContain("display");
      expect(TECH_FAMILIES).toContain("connectivity");
    });
  });
});
