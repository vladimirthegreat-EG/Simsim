/**
 * Product-related types for the Business Simulation Engine
 */

import type { Segment } from "./factory";
import type { ProductFeatureSet } from "./features";

// ============================================
// PRODUCT
// ============================================

/** Quality grade determines pricing multiplier, production time, and market segment access */
export type QualityGrade = "standard" | "premium" | "artisan";

/** Quality grade configuration */
export const QUALITY_GRADE_CONFIG: Record<QualityGrade, {
  label: string;
  priceMultiplier: number;
  productionTimeMultiplier: number;
  minMaterialTier: number;
  description: string;
}> = {
  standard: {
    label: "Standard",
    priceMultiplier: 1.0,
    productionTimeMultiplier: 1.0,
    minMaterialTier: 1,
    description: "Base quality production. Fastest output, standard pricing.",
  },
  premium: {
    label: "Premium",
    priceMultiplier: 1.3,
    productionTimeMultiplier: 1.5,
    minMaterialTier: 3,
    description: "Enhanced materials and QC. 30% price premium, 50% slower production.",
  },
  artisan: {
    label: "Artisan",
    priceMultiplier: 1.6,
    productionTimeMultiplier: 2.0,
    minMaterialTier: 5,
    description: "Hand-finished, top-tier materials. 60% price premium, 2x production time.",
  },
};

export interface Product {
  id: string;
  name: string;
  segment: Segment;
  secondarySegments?: Segment[];  // Segments this product also competes in (at reduced effectiveness)
  price: number;
  quality: number;       // 0-100
  features: number;      // 0-100 (backward-compat: computed from featureSet if present)
  reliability: number;   // 0-100
  developmentRound: number;

  // Development timeline
  developmentStatus: "in_development" | "ready" | "launched" | "discontinued";
  developmentProgress: number;  // 0-100
  discontinued?: boolean;
  discontinuedRound?: number;
  launchRound?: number;  // Round when product was launched (for aging)
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

  // === Quality Grade System ===
  /** Quality grade: standard (default), premium, or artisan */
  qualityGrade?: QualityGrade;
}
