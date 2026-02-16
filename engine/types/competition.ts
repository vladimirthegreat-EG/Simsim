/**
 * Competition mechanics types for the Business Simulation Engine
 *
 * Direct player-vs-player competitive friction:
 * - Segment crowding penalties
 * - First-mover advantages
 * - Brand erosion from competition
 * - Technology arms race bonuses
 * - Market events for competitive intelligence
 */

import type { Segment } from "./factory";
import type { TechFamily } from "../modules/RDExpansions";

// ============================================
// MARKET EVENTS (Competitive Intelligence Feed)
// ============================================

export type MarketEventType =
  | "product_launch"
  | "price_change"
  | "share_shift"
  | "patent_filed"
  | "patent_licensed"
  | "segment_underserved"
  | "segment_flooded"
  | "achievement_unlocked"
  | "tech_completed";

export type MarketEventImpact = "positive" | "negative" | "neutral";

export interface MarketEvent {
  type: MarketEventType;
  round: number;
  description: string; // Human-readable
  impact: MarketEventImpact; // From the viewing player's perspective
  teamId?: string; // Which team triggered this (if applicable)
  segment?: Segment;
  details?: Record<string, unknown>;
}

// ============================================
// SEGMENT CROWDING
// ============================================

/**
 * When too many products crowd a segment, each product beyond 3 gets a 5% scoring penalty.
 * crowding_factor = max(0, 1 - (product_count - 3) × 0.05)
 */
export interface CrowdingState {
  segment: Segment;
  productCount: number;
  crowdingFactor: number; // 1.0 = no penalty, 0.85 = 3 extra products
}

/** Products beyond this count start getting penalized. */
export const CROWDING_THRESHOLD = 3;

/** Penalty per extra product beyond threshold. */
export const CROWDING_PENALTY_PER_PRODUCT = 0.05;

/**
 * Calculate crowding factor for a segment.
 */
export function calculateCrowdingFactor(productCount: number): number {
  if (productCount <= CROWDING_THRESHOLD) return 1.0;
  return Math.max(0, 1 - (productCount - CROWDING_THRESHOLD) * CROWDING_PENALTY_PER_PRODUCT);
}

// ============================================
// FIRST-MOVER ADVANTAGE
// ============================================

/**
 * First team to enter an underserved segment gets a temporary bonus.
 * first_mover_bonus = underservedFactor × 0.15 (up to 15%)
 * Decays over 3 rounds.
 */
export interface FirstMoverBonus {
  teamId: string;
  segment: Segment;
  roundEntered: number;
  initialBonus: number; // Up to 0.15
  roundsRemaining: number; // Decays to 0 over 3 rounds
}

/** Maximum first-mover bonus (15%). */
export const FIRST_MOVER_MAX_BONUS = 0.15;

/** Rounds until first-mover bonus fully decays. */
export const FIRST_MOVER_DECAY_ROUNDS = 3;

// ============================================
// BRAND EROSION FROM COMPETITION
// ============================================

/**
 * When a competitor launches a product with significantly higher composite score,
 * the incumbent's brand decays faster.
 * brand_decay = base_decay × (1 + competitor_score_advantage × 0.5)
 */
export interface BrandErosion {
  teamId: string;
  segment: Segment;
  competitorTeamId: string;
  scoreAdvantage: number; // How much better the competitor's composite score is
  erosionMultiplier: number; // Applied to base brand decay rate
  message: string;
}

/** Multiplier applied to score advantage for brand erosion. */
export const BRAND_EROSION_SENSITIVITY = 0.5;

// ============================================
// TECHNOLOGY ARMS RACE
// ============================================

/**
 * First team to complete a tech node gets a one-time +5% segment bonus
 * for the first round they use it in a product.
 */
export interface ArmsRaceBonus {
  teamId: string;
  techId: string;
  family: TechFamily;
  roundCompleted: number;
  bonusUsed: boolean; // One-time bonus, consumed on first product use
}

/** Arms race first-completion bonus. */
export const ARMS_RACE_BONUS = 0.05;

// ============================================
// COMPETITION STATE (tracked per game)
// ============================================

export interface CompetitionState {
  firstMoverBonuses: FirstMoverBonus[];
  armsRaceBonuses: ArmsRaceBonus[];
  /** Track which tech nodes were completed first and by whom */
  firstCompletions: Record<string, string>; // techId → teamId
}

/**
 * Initialize empty competition state.
 */
export function initializeCompetitionState(): CompetitionState {
  return {
    firstMoverBonuses: [],
    armsRaceBonuses: [],
    firstCompletions: {},
  };
}
