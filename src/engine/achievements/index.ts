/**
 * Achievement Module Exports
 *
 * Achievement tracking, milestones, and rewards.
 *
 * Includes the base AchievementEngine (30 achievements)
 * and the LedgerEngine (221 achievements - "Ledger of Legends & Losers").
 */

// Original Achievement Engine
export { AchievementEngine } from "./AchievementEngine";
export type {
  AchievementCategory,
  AchievementTier,
  Achievement,
  AchievementRequirement,
  AchievementReward,
  AchievementProgress,
  EarnedAchievement,
  AchievementState,
  Milestone,
  MilestoneBonus,
  MilestonePenalty,
  MilestoneResult,
  AchievementResult,
} from "./AchievementEngine";

// Ledger Engine - "Ledger of Legends & Losers" (221 achievements)
export { ExtendedAchievementEngine, ExtendedAchievementEngine as LedgerEngine } from "./LedgerEngine";
export type { AchievementContext } from "./LedgerEngine";

// Extended Types
export type {
  ExtendedAchievementTier,
  ExtendedAchievementCategory,
  ExtendedAchievement,
  ExtendedAchievementRequirement,
  ExtendedAchievementReward,
  ExtendedAchievementProgress,
  ExtendedEarnedAchievement,
  ExtendedAchievementState,
  ExtendedAchievementResult,
  ExtendedMilestone,
  AchievementMessage,
  TierConfig,
  CategoryConfig,
  ExtendedRequirementType,
} from "./types";

export {
  EXTENDED_TIER_CONFIG,
  CATEGORY_CONFIG,
  getTierPoints,
  calculateAchievementPoints,
  isInfamyAchievement,
  isSecretAchievement,
  isPositiveAchievement,
  defineAchievement,
  thresholdReq,
  sustainedReq,
} from "./types";

// Achievement Definitions
export {
  ALL_ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  ACHIEVEMENTS_BY_CATEGORY,
  getAchievement,
  getAchievementsByCategory,
  getAchievementsByTier,
  getPositiveAchievements,
  getInfamyAchievements,
  getSecretAchievements,
  getVisibleAchievements,
  getTotalPossiblePoints,
  getMaximumInfamyPoints,
  TOTAL_ACHIEVEMENT_COUNT,
  ACHIEVEMENT_COUNTS_BY_TIER,
  ACHIEVEMENT_COUNTS_BY_CATEGORY,
} from "./definitions";

// Integration utilities for SimulationEngine
export {
  initializeAccumulatedContext,
  updateAccumulatedContext,
  checkTeamAchievements,
  processRoundAchievements,
  serializeAccumulatedContext,
  deserializeAccumulatedContext,
} from "./integration";
export type { AccumulatedAchievementContext } from "./integration";
