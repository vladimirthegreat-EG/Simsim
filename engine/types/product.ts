/**
 * Product-related types for the Business Simulation Engine
 */

import type { Segment } from "./factory";
import type { ProductFeatureSet } from "./features";

// ============================================
// PRODUCT
// ============================================

export interface Product {
  id: string;
  name: string;
  segment: Segment;
  price: number;
  quality: number;       // 0-100
  features: number;      // 0-100 (backward-compat: computed from featureSet if present)
  reliability: number;   // 0-100
  developmentRound: number;

  // Development timeline
  developmentStatus: "in_development" | "ready" | "launched";
  developmentProgress: number;  // 0-100
  targetQuality: number;        // Final quality when development completes
  targetFeatures: number;       // Final features when development completes
  roundsRemaining: number;      // Rounds until development completes

  // Production costs
  unitCost: number;             // Cost to produce one unit

  // === NEW: Archetype & Feature System ===
  /** Which phone archetype this product is based on (undefined = legacy product) */
  archetypeId?: string;
  /** Detailed 6-axis feature breakdown (undefined = legacy, use features field) */
  featureSet?: ProductFeatureSet;
  /** Which tech IDs were applied when this product was created */
  appliedTechs?: string[];
}
