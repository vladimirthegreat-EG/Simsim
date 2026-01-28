/**
 * Explainability Types - Score breakdowns, delta explanations, driver trees
 *
 * Phase 3: Explainability Layer
 */

import type { Segment } from "../types/factory";

// ============================================
// SCORE BREAKDOWN
// ============================================

export interface SegmentScoreBreakdown {
  segment: Segment;

  // Individual scores (0-100 scale)
  scores: {
    price: number;
    quality: number;
    brand: number;
    esg: number;
    features: number;
  };

  // Weights used (should sum to 100)
  weights: {
    price: number;
    quality: number;
    brand: number;
    esg: number;
    features: number;
  };

  // Weighted contributions to total score
  contributions: {
    price: number;
    quality: number;
    brand: number;
    esg: number;
    features: number;
  };

  // Total weighted score
  totalScore: number;

  // Relative performance
  percentileVsCompetitors: Record<string, number>;
  competitorComparison: CompetitorScore[];

  // Market outcomes
  marketShare: number;
  rank: number;
  revenue: number;
}

export interface CompetitorScore {
  teamId: string;
  teamName: string;
  score: number;
  rank: number;
  marketShare: number;
}

// ============================================
// DELTA EXPLANATIONS
// ============================================

export interface DeltaExplanation {
  segment: Segment;
  metric: "marketShare" | "revenue" | "profit" | "brand" | "satisfaction";

  // Values
  previousValue: number;
  currentValue: number;
  change: number;
  changePercent: number;

  // What caused the change
  drivers: DeltaDriver[];

  // Human-readable explanation
  explanation: string;

  // Actionable recommendations
  recommendations: string[];
}

export interface DeltaDriver {
  factor: string;
  contribution: number;
  direction: "positive" | "negative" | "neutral";
  description: string;
  actionable: boolean;
  suggestedAction?: string;
}

// ============================================
// DRIVER TREE
// ============================================

export interface DriverTree {
  rootOutcome: string;
  rootValue: number;
  nodes: DriverTreeNode[];
  waterfallSteps: WaterfallStep[];
}

export interface DriverTreeNode {
  id: string;
  label: string;
  value: number;
  children: DriverTreeNode[];
  isLeaf: boolean;
  contributionPercent: number;
}

export interface WaterfallStep {
  label: string;
  value: number;
  cumulative: number;
  type: "increase" | "decrease" | "subtotal" | "total";
  color?: string;
  breakdown?: WaterfallStep[];
}

// ============================================
// ROUND NARRATIVE
// ============================================

export interface RoundNarrative {
  round: number;
  headline: string;
  summary: string;
  keyHighlights: NarrativePoint[];
  concerns: NarrativePoint[];
  opportunities: NarrativePoint[];
  competitorInsights: NarrativePoint[];
  recommendations: NarrativePoint[];
}

export interface NarrativePoint {
  title: string;
  description: string;
  metric?: string;
  value?: number;
  change?: number;
  severity?: "info" | "success" | "warning" | "critical";
  actionRequired?: boolean;
}

// ============================================
// DECISION IMPACT PREVIEW
// ============================================

export interface DecisionImpactPreview {
  decisionType: string;
  estimatedCost: number;
  estimatedBenefit: number;
  netImpact: number;
  confidenceLevel: "high" | "medium" | "low";
  timeToImpact: number;
  risks: string[];
  assumptions: string[];
}

// ============================================
// WHAT-IF ANALYSIS
// ============================================

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  changes: WhatIfChange[];
  projectedOutcomes: WhatIfOutcome[];
  comparisonToBaseline: WhatIfComparison;
}

export interface WhatIfChange {
  parameter: string;
  currentValue: number;
  proposedValue: number;
  changePercent: number;
}

export interface WhatIfOutcome {
  metric: string;
  baselineValue: number;
  projectedValue: number;
  change: number;
  confidence: number;
}

export interface WhatIfComparison {
  betterMetrics: string[];
  worseMetrics: string[];
  neutralMetrics: string[];
  overallAssessment: "positive" | "negative" | "mixed";
  recommendation: string;
}

// ============================================
// FULL EXPLAINABILITY RESULT
// ============================================

export interface ExplainabilityResult {
  teamId: string;
  round: number;

  // Segment-level breakdowns
  segmentBreakdowns: SegmentScoreBreakdown[];

  // Changes from last round
  deltaExplanations: DeltaExplanation[];

  // Revenue driver tree
  revenueDriverTree: DriverTree;

  // Profit driver tree
  profitDriverTree: DriverTree;

  // Natural language summary
  narrative: RoundNarrative;

  // Raw data for custom analysis
  rawMetrics: Record<string, number>;
}
