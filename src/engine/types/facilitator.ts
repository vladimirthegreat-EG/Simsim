/**
 * Facilitator report types for the Business Simulation Engine
 *
 * Facilitator tools turn the simulation into a structured learning experience.
 * Reports use template-based narrative generation (not AI) for speed and determinism.
 */

import type { Segment } from "./factory";
import type { AchievementCategory, UnlockedAchievement } from "./achievements";

// ============================================
// POST-ROUND FACILITATOR BRIEF
// ============================================

export interface FacilitatorBrief {
  round: number;
  headline: string; // One-sentence summary of most important event
  winnerOfRound: { teamId: string; teamName: string; reason: string };
  loserOfRound: { teamId: string; teamName: string; reason: string };
  keyDecisions: FacilitatorKeyDecision[];
  conceptSpotlight: ConceptSpotlight;
  lookAhead: string; // What to watch for next round
}

export interface FacilitatorKeyDecision {
  teamId: string;
  teamName: string;
  description: string;
  consequence: string;
}

export interface ConceptSpotlight {
  concept: string; // e.g., "Price War", "First-Mover Advantage"
  explanation: string; // How this round illustrated it
}

// ============================================
// POST-GAME REPORT
// ============================================

export interface PostGameReport {
  executiveSummary: string; // 3-4 sentences: who won, why, key turning points
  teamJourneys: TeamJourney[];
  conceptMap: ConceptMapEntry[];
  achievementAnalysis: TeamAchievementAnalysis[];
  marketTimeline: MarketTimelineEntry[];
  whatIfScenarios: WhatIfScenario[];
}

export interface TeamJourney {
  teamId: string;
  teamName: string;
  strategyArc: string; // Narrative: what they planned vs what happened
  keyDecisions: string; // Narrative: decisions and consequences
  competitiveInteractions: string; // Narrative: interactions with others
  learningSummary: string; // Key takeaways
}

// ============================================
// BUSINESS CONCEPT MAP
// ============================================

export interface ConceptMapEntry {
  concept: string; // e.g., "Competitive Advantage", "Price Elasticity"
  whereAppeared: string; // Which team/segment/round
  whatHappened: string; // Description
}

// ============================================
// ACHIEVEMENT ANALYSIS
// ============================================

export interface TeamAchievementAnalysis {
  teamId: string;
  teamName: string;
  earned: UnlockedAchievement[];
  missed: string[]; // Achievement IDs they were close to but didn't earn
  strategicInsight: string; // What their achievements reveal about their strategy
}

// ============================================
// MARKET TIMELINE
// ============================================

export interface MarketTimelineEntry {
  round: number;
  segment: Segment;
  event: string; // "Team Alpha entered", "Price war began", etc.
  sharesBefore: Record<string, number>;
  sharesAfter: Record<string, number>;
}

// ============================================
// WHAT-IF SCENARIOS
// ============================================

export interface WhatIfScenario {
  teamId: string;
  teamName: string;
  decisionRound: number;
  actualDecision: string;
  alternativeDecision: string;
  estimatedImpact: string; // "Estimated +30 achievement points"
  caveat: string; // Always: "This is an estimate, not a definitive prediction"
}

// ============================================
// DISCUSSION GUIDE
// ============================================

export type DiscussionCategory =
  | "strategic"
  | "competitive"
  | "resource"
  | "market_signals"
  | "ethics"
  | "adaptability"
  | "real_world";

export interface DiscussionQuestion {
  category: DiscussionCategory;
  question: string;
  context: string; // What happened in the game that makes this question relevant
}

export interface DiscussionGuide {
  questions: DiscussionQuestion[];
}

// ============================================
// PARTICIPANT SCORECARD
// ============================================

export interface ParticipantScorecard {
  teamId: string;
  teamName: string;
  strategySummary: string; // Inferred from decisions
  strengths: string[];
  growthAreas: string[];
  keyDecisionsAndConsequences: {
    round: number;
    decision: string;
    consequence: string;
  }[];
  achievements: UnlockedAchievement[];
  achievementsByCategory: Partial<Record<AchievementCategory, number>>;
  learningOutcomes: {
    concept: string;
    demonstrated: boolean;
    evidence?: string;
  }[];
}

// ============================================
// LIVE FACILITATOR DASHBOARD PANELS
// ============================================

export interface TeamHealthSummary {
  teamId: string;
  teamName: string;
  cash: number;
  revenue: number;
  productCount: number;
  techsResearched: number;
  achievementScore: number;
  status: "healthy" | "struggling" | "critical";
}

export interface CompetitiveTension {
  teamA: string;
  teamB: string;
  segment: Segment;
  type: "price_war" | "head_to_head" | "patent_blocking" | "share_battle";
  description: string;
  severity: "low" | "medium" | "high";
}
