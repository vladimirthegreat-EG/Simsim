/**
 * Achievement Definitions Index
 *
 * Aggregates all 221 achievements from the "Ledger of Legends & Losers" system.
 *
 * Categories:
 * - Overview: 19 achievements
 * - Factory: 21 achievements
 * - Finance: 22 achievements
 * - HR: 21 achievements
 * - Marketing: 20 achievements
 * - R&D: 21 achievements
 * - Supply Chain: 19 achievements
 * - Logistics: 13 achievements
 * - News: 13 achievements
 * - Results: 16 achievements
 * - Secret: 21 achievements
 * - Mega: 15 achievements
 *
 * Total: 221 achievements
 */

import { ExtendedAchievement, ExtendedAchievementCategory, ExtendedAchievementTier, EXTENDED_TIER_CONFIG } from "../types";

// Import all achievement definitions
import { OVERVIEW_ACHIEVEMENTS } from "./overview";
import { FACTORY_ACHIEVEMENTS } from "./factory";
import { FINANCE_ACHIEVEMENTS } from "./finance";
import { HR_ACHIEVEMENTS } from "./hr";
import { MARKETING_ACHIEVEMENTS } from "./marketing";
import { RD_ACHIEVEMENTS } from "./rd";
import { SUPPLY_CHAIN_ACHIEVEMENTS } from "./supply-chain";
import { LOGISTICS_ACHIEVEMENTS } from "./logistics";
import { NEWS_ACHIEVEMENTS } from "./news";
import { RESULTS_ACHIEVEMENTS } from "./results";
import { SECRET_ACHIEVEMENTS } from "./secret";
import { MEGA_ACHIEVEMENTS } from "./mega";

// ============================================
// AGGREGATED EXPORTS
// ============================================

/**
 * All achievements organized by category
 */
export const ACHIEVEMENTS_BY_CATEGORY: Record<ExtendedAchievementCategory, ExtendedAchievement[]> = {
  overview: OVERVIEW_ACHIEVEMENTS,
  factory: FACTORY_ACHIEVEMENTS,
  finance: FINANCE_ACHIEVEMENTS,
  hr: HR_ACHIEVEMENTS,
  marketing: MARKETING_ACHIEVEMENTS,
  rd: RD_ACHIEVEMENTS,
  supply_chain: SUPPLY_CHAIN_ACHIEVEMENTS,
  logistics: LOGISTICS_ACHIEVEMENTS,
  news: NEWS_ACHIEVEMENTS,
  results: RESULTS_ACHIEVEMENTS,
  secret: SECRET_ACHIEVEMENTS,
  mega: MEGA_ACHIEVEMENTS,
};

/**
 * All achievements in a single flat array
 */
export const ALL_ACHIEVEMENTS: ExtendedAchievement[] = [
  ...OVERVIEW_ACHIEVEMENTS,
  ...FACTORY_ACHIEVEMENTS,
  ...FINANCE_ACHIEVEMENTS,
  ...HR_ACHIEVEMENTS,
  ...MARKETING_ACHIEVEMENTS,
  ...RD_ACHIEVEMENTS,
  ...SUPPLY_CHAIN_ACHIEVEMENTS,
  ...LOGISTICS_ACHIEVEMENTS,
  ...NEWS_ACHIEVEMENTS,
  ...RESULTS_ACHIEVEMENTS,
  ...SECRET_ACHIEVEMENTS,
  ...MEGA_ACHIEVEMENTS,
];

/**
 * Map of achievement ID to achievement definition
 */
export const ACHIEVEMENT_MAP: Map<string, ExtendedAchievement> = new Map(
  ALL_ACHIEVEMENTS.map((a) => [a.id, a])
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get achievement by ID
 */
export function getAchievement(id: string): ExtendedAchievement | undefined {
  return ACHIEVEMENT_MAP.get(id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: ExtendedAchievementCategory): ExtendedAchievement[] {
  return ACHIEVEMENTS_BY_CATEGORY[category] ?? [];
}

/**
 * Get achievements by tier
 */
export function getAchievementsByTier(tier: ExtendedAchievementTier): ExtendedAchievement[] {
  return ALL_ACHIEVEMENTS.filter((a) => a.tier === tier);
}

/**
 * Get all positive (non-infamy) achievements
 */
export function getPositiveAchievements(): ExtendedAchievement[] {
  return ALL_ACHIEVEMENTS.filter((a) => !a.isNegative && a.tier !== "infamy");
}

/**
 * Get all infamy achievements
 */
export function getInfamyAchievements(): ExtendedAchievement[] {
  return ALL_ACHIEVEMENTS.filter((a) => a.isNegative || a.tier === "infamy");
}

/**
 * Get all secret achievements
 */
export function getSecretAchievements(): ExtendedAchievement[] {
  return ALL_ACHIEVEMENTS.filter((a) => a.hidden || a.tier === "secret");
}

/**
 * Get visible achievements (excludes secrets before they're earned)
 */
export function getVisibleAchievements(earnedIds: Set<string> = new Set()): ExtendedAchievement[] {
  return ALL_ACHIEVEMENTS.filter((a) => {
    // Show if not hidden or if already earned
    return !a.hidden || earnedIds.has(a.id);
  });
}

// ============================================
// STATISTICS
// ============================================

/**
 * Count achievements by tier
 */
export const ACHIEVEMENT_COUNTS_BY_TIER: Record<ExtendedAchievementTier, number> = {
  bronze: ALL_ACHIEVEMENTS.filter((a) => a.tier === "bronze").length,
  silver: ALL_ACHIEVEMENTS.filter((a) => a.tier === "silver").length,
  gold: ALL_ACHIEVEMENTS.filter((a) => a.tier === "gold").length,
  platinum: ALL_ACHIEVEMENTS.filter((a) => a.tier === "platinum").length,
  infamy: ALL_ACHIEVEMENTS.filter((a) => a.tier === "infamy").length,
  secret: ALL_ACHIEVEMENTS.filter((a) => a.tier === "secret").length,
};

/**
 * Count achievements by category
 */
export const ACHIEVEMENT_COUNTS_BY_CATEGORY: Record<ExtendedAchievementCategory, number> = {
  overview: OVERVIEW_ACHIEVEMENTS.length,
  factory: FACTORY_ACHIEVEMENTS.length,
  finance: FINANCE_ACHIEVEMENTS.length,
  hr: HR_ACHIEVEMENTS.length,
  marketing: MARKETING_ACHIEVEMENTS.length,
  rd: RD_ACHIEVEMENTS.length,
  supply_chain: SUPPLY_CHAIN_ACHIEVEMENTS.length,
  logistics: LOGISTICS_ACHIEVEMENTS.length,
  news: NEWS_ACHIEVEMENTS.length,
  results: RESULTS_ACHIEVEMENTS.length,
  secret: SECRET_ACHIEVEMENTS.length,
  mega: MEGA_ACHIEVEMENTS.length,
};

/**
 * Total achievement count
 */
export const TOTAL_ACHIEVEMENT_COUNT = ALL_ACHIEVEMENTS.length;

/**
 * Calculate total possible points (excluding infamy)
 */
export function getTotalPossiblePoints(): number {
  return ALL_ACHIEVEMENTS
    .filter((a) => !a.isNegative && a.tier !== "infamy")
    .reduce((sum, a) => sum + EXTENDED_TIER_CONFIG[a.tier].points, 0);
}

/**
 * Calculate maximum infamy points (negative)
 */
export function getMaximumInfamyPoints(): number {
  return ALL_ACHIEVEMENTS
    .filter((a) => a.isNegative || a.tier === "infamy")
    .reduce((sum, a) => sum + Math.abs(EXTENDED_TIER_CONFIG[a.tier].points), 0);
}

// ============================================
// RE-EXPORT INDIVIDUAL CATEGORIES
// ============================================

export {
  OVERVIEW_ACHIEVEMENTS,
  FACTORY_ACHIEVEMENTS,
  FINANCE_ACHIEVEMENTS,
  HR_ACHIEVEMENTS,
  MARKETING_ACHIEVEMENTS,
  RD_ACHIEVEMENTS,
  SUPPLY_CHAIN_ACHIEVEMENTS,
  LOGISTICS_ACHIEVEMENTS,
  NEWS_ACHIEVEMENTS,
  RESULTS_ACHIEVEMENTS,
  SECRET_ACHIEVEMENTS,
  MEGA_ACHIEVEMENTS,
};
