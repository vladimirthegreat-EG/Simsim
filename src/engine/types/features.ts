/**
 * Feature-based demand types for the Business Simulation Engine
 *
 * Products have a 6-axis feature profile (one per tech family).
 * Segments have preference profiles that define what they care about.
 * Market scoring uses the dot product of product features × segment preferences.
 */

import type { TechFamily } from "../modules/RDExpansions";

// ============================================
// PRODUCT FEATURE SET
// ============================================

/** A product's concrete capabilities across the 6 tech families (each 0-100). */
export interface ProductFeatureSet {
  battery: number;
  camera: number;
  ai: number;
  durability: number;
  display: number;
  connectivity: number;
}

// ============================================
// SEGMENT FEATURE PREFERENCES
// ============================================

/** How much each segment values each tech family. Weights sum to 1.0 per segment. */
export interface FeaturePreferenceProfile {
  battery: number;
  camera: number;
  ai: number;
  durability: number;
  display: number;
  connectivity: number;
}

/** All 6 tech family keys for iteration. */
export const TECH_FAMILIES: TechFamily[] = [
  "battery",
  "camera",
  "ai",
  "durability",
  "display",
  "connectivity",
];

/**
 * Segment feature preference profiles (from design doc Section 4.2).
 * Each row sums to 1.0.
 */
export const SEGMENT_FEATURE_PREFERENCES: Record<string, FeaturePreferenceProfile> = {
  Budget: {
    battery: 0.35,
    camera: 0.08,
    ai: 0.05,
    durability: 0.25,
    display: 0.15,
    connectivity: 0.12,
  },
  General: {
    battery: 0.18,
    camera: 0.20,
    ai: 0.15,
    durability: 0.12,
    display: 0.20,
    connectivity: 0.15,
  },
  Enthusiast: {
    battery: 0.08,
    camera: 0.30,
    ai: 0.12,
    durability: 0.05,
    display: 0.30,
    connectivity: 0.15,
  },
  Professional: {
    battery: 0.10,
    camera: 0.12,
    ai: 0.30,
    durability: 0.08,
    display: 0.15,
    connectivity: 0.25,
  },
  "Active Lifestyle": {
    battery: 0.20,
    camera: 0.08,
    ai: 0.05,
    durability: 0.40,
    display: 0.10,
    connectivity: 0.17,
  },
};

// ============================================
// UTILITY
// ============================================

/** Create an empty ProductFeatureSet (all zeros). */
export function emptyFeatureSet(): ProductFeatureSet {
  return { battery: 0, camera: 0, ai: 0, durability: 0, display: 0, connectivity: 0 };
}

/**
 * Calculate feature-match score between a product's features and a segment's preferences.
 * Returns 0.0 to 1.0 where 1.0 = perfect match.
 */
export function calculateFeatureMatchScore(
  productFeatures: ProductFeatureSet,
  segmentPreferences: FeaturePreferenceProfile
): number {
  let score = 0;
  for (const family of TECH_FAMILIES) {
    const capability = productFeatures[family] / 100; // 0-1
    const preference = segmentPreferences[family]; // 0-1
    score += capability * preference;
  }
  return score;
}
