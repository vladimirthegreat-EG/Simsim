/**
 * Market-related types for the Business Simulation Engine
 */

import type { Segment } from "./factory";

// ============================================
// ECONOMIC CONDITIONS
// ============================================

export interface MarketConditions {
  gdp: number;                    // % growth
  inflation: number;              // %
  consumerConfidence: number;     // 0-100
  unemploymentRate: number;       // %
}

export interface FxRates {
  "EUR/USD": number;
  "GBP/USD": number;
  "JPY/USD": number;
  "CNY/USD": number;
}

export interface SegmentDemand {
  totalDemand: number;
  priceRange: { min: number; max: number };
  growthRate: number;
}

// ============================================
// MARKET STATE
// ============================================

export interface MarketState {
  roundNumber: number;
  economicConditions: MarketConditions;
  fxRates: FxRates;
  fxVolatility: number;           // 0.15-0.25
  interestRates: {
    federalRate: number;
    tenYearBond: number;
    corporateBond: number;
  };
  demandBySegment: Record<Segment, SegmentDemand>;
  marketPressures: {
    priceCompetition: number;     // 0-1
    qualityExpectations: number;  // 0-1
    sustainabilityPremium: number; // 0-1
  };
}
