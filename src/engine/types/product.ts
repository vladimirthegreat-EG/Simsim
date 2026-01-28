/**
 * Product-related types for the Business Simulation Engine
 */

import type { Segment } from "./factory";

// ============================================
// PRODUCT
// ============================================

export interface Product {
  id: string;
  name: string;
  segment: Segment;
  price: number;
  quality: number;       // 0-100
  features: number;      // 0-100
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
}
