/**
 * Patent system types for the Business Simulation Engine
 *
 * Patents are filed on specific technologies and create competitive friction:
 * - Exclusive bonuses for the patent holder
 * - Blocking penalties for unlicensed competitors
 * - Licensing revenue streams
 * - Challenges and expiration mechanics
 */

import type { TechFamily, TechTier } from "../modules/RDExpansions";

// ============================================
// PATENT
// ============================================

export type PatentStatus = "active" | "licensed" | "expired" | "challenged";

export interface Patent {
  id: string;
  techId: string; // Which tech this covers
  family: TechFamily;
  tier: TechTier;
  ownerId: string; // Team ID
  roundFiled: number;
  expiresRound: number; // 8-12 rounds after filing

  status: PatentStatus;

  // Licensing
  licensedTo: string[]; // Team IDs that pay for license
  licenseFeePerRound: number; // Revenue per licensee per round

  // Competitive effects
  exclusiveBonus: number; // % bonus to owner's products (5-15%)
  blockingPower: number; // % penalty to unlicensed competitors (5-15%)
}

// ============================================
// PATENT DECISIONS
// ============================================

export interface PatentFilingDecision {
  techId: string;
}

export interface PatentLicenseDecision {
  patentId: string; // Patent to license
  fromTeamId: string; // Owner team
}

export interface PatentChallengeDecision {
  patentId: string; // Patent to challenge
}

export interface PatentDecisions {
  filings?: PatentFilingDecision[];
  licenseRequests?: PatentLicenseDecision[];
  challenges?: PatentChallengeDecision[];
}

// ============================================
// PATENT RESOLUTION RESULTS
// ============================================

export interface PatentResolutionResult {
  /** New patents filed this round */
  newPatents: Patent[];
  /** Patents that expired this round */
  expiredPatents: Patent[];
  /** Patent challenges and their outcomes */
  challengeResults: {
    patentId: string;
    challengerId: string;
    success: boolean;
    cost: number;
  }[];
  /** Licensing revenue per team (positive = earned, negative = paid) */
  licensingRevenue: Record<string, number>;
  /** Blocking penalties applied: teamId → { family → penaltyPercent } */
  blockingPenalties: Record<string, Partial<Record<TechFamily, number>>>;
  /** Human-readable messages */
  messages: string[];
}

// ============================================
// CONSTANTS
// ============================================

/** Cost to file a patent by tier */
export const PATENT_FILING_COST: Record<number, number> = {
  2: 5_000_000,
  3: 8_000_000,
  4: 12_000_000,
  5: 15_000_000,
};

/** Patent duration (rounds) by tier */
export const PATENT_DURATION: Record<number, number> = {
  2: 8,
  3: 10,
  4: 10,
  5: 12,
};

/** Exclusive bonus % by tier */
export const PATENT_EXCLUSIVE_BONUS: Record<number, number> = {
  2: 0.05,
  3: 0.08,
  4: 0.12,
  5: 0.15,
};

/** Blocking power % by tier */
export const PATENT_BLOCKING_POWER: Record<number, number> = {
  2: 0.05,
  3: 0.08,
  4: 0.12,
  5: 0.15,
};

/** Cost to challenge a patent */
export const PATENT_CHALLENGE_COST = 10_000_000;

/** Probability of challenge success */
export const PATENT_CHALLENGE_SUCCESS_RATE = 0.5;

/** Base licensing fee per round by tier */
export const PATENT_LICENSE_FEE: Record<number, number> = {
  2: 1_000_000,
  3: 2_000_000,
  4: 3_000_000,
  5: 4_000_000,
};
