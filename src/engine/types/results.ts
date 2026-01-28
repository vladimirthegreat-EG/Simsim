/**
 * Simulation result types for the Business Simulation Engine
 */

import type { Segment } from "./factory";
import type { TeamState } from "./state";

// ============================================
// MODULE RESULT
// ============================================

export interface ModuleResult {
  success: boolean;
  changes: Record<string, unknown>;
  costs: number;
  revenue: number;
  messages: string[];
}

// ============================================
// ROUND RESULTS
// ============================================

export interface RoundResults {
  roundNumber: number;
  teamId: string;

  // State after simulation
  newState: TeamState;

  // Per-module results
  factoryResults: ModuleResult;
  hrResults: ModuleResult;
  financeResults: ModuleResult;
  marketingResults: ModuleResult;
  rdResults: ModuleResult;

  // Market results
  salesBySegment: Record<Segment, number>;
  marketShareBySegment: Record<Segment, number>;
  competitorActions: string[];

  // Financial summary
  totalRevenue: number;
  totalCosts: number;
  netIncome: number;

  // Ranking
  rank: number;
  epsRank: number;
  marketShareRank: number;
}
