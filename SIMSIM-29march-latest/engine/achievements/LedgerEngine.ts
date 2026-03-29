/**
 * Extended Achievement Engine
 *
 * Processes the 221-achievement "Ledger of Legends & Losers" system.
 * Handles all tiers including Infamy and Secret achievements.
 */

import type { TeamState } from "../types/state";
import type { DifficultyLevel } from "../config/schema";
import {
  ExtendedAchievement,
  ExtendedAchievementCategory,
  ExtendedAchievementTier,
  ExtendedAchievementRequirement,
  ExtendedAchievementState,
  ExtendedAchievementResult,
  ExtendedAchievementProgress,
  ExtendedEarnedAchievement,
  AchievementMessage,
  MilestoneResult,
  EXTENDED_TIER_CONFIG,
  getTierPoints,
  isInfamyAchievement,
  isSecretAchievement,
} from "./types";
import {
  ALL_ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  getAchievement,
  getAchievementsByCategory,
  TOTAL_ACHIEVEMENT_COUNT,
  ACHIEVEMENT_COUNTS_BY_CATEGORY,
} from "./definitions";

// ============================================
// CONTEXT FOR ACHIEVEMENT CHECKING
// ============================================

export interface AchievementContext {
  state: TeamState;
  previousState?: TeamState;
  roundNumber: number;
  difficulty: DifficultyLevel;
  teamRanking?: number;
  totalTeams?: number;
  teamRankings?: {
    revenue?: number;
    netIncome?: number;
    marketShare?: number;
    brandValue?: number;
    esg?: number;
    morale?: number;
    quality?: number;
    shippingCost?: number;
    deliveryRate?: number;
  };
  // Additional tracking for complex achievements
  dashboardViews?: number;
  routeComparisons?: number;
  costCalculatorUses?: number;
  newsEventsRead?: number;
  tabsViewed?: Set<string>;
  // Historical data
  roundsWithProfit?: number;
  roundsWithLoss?: number;
  consecutiveGrowthRounds?: number;
  eventsWeathered?: string[];
  productsLaunched?: number;
  productsCancelled?: number;
  patentsFiled?: number;
  upgradesPurchased?: string[];
  // Game completion
  gameCompleted?: boolean;
  finalRanking?: number;
}

// ============================================
// ENGINE
// ============================================

export class ExtendedAchievementEngine {
  /**
   * Check all achievements for a round
   */
  static checkAchievements(
    context: AchievementContext,
    previousAchievementState: ExtendedAchievementState | null
  ): ExtendedAchievementResult {
    const messages: AchievementMessage[] = [];
    const achievementState = previousAchievementState
      ? this.cloneState(previousAchievementState)
      : this.initializeState();

    const newAchievements: ExtendedAchievement[] = [];
    const newInfamyAchievements: ExtendedAchievement[] = [];
    const newSecretAchievements: ExtendedAchievement[] = [];

    let positivePointsEarned = 0;
    let negativePointsEarned = 0;

    // Check each achievement
    for (const achievement of ALL_ACHIEVEMENTS) {
      // Skip if already earned (unless repeatable)
      if (
        !achievement.repeatable &&
        achievementState.earned.some((e) => e.achievementId === achievement.id)
      ) {
        continue;
      }

      // Check requirements
      const { met, progress } = this.checkRequirements(achievement, context);

      // Update or create progress tracking
      this.updateProgress(achievementState, achievement.id, progress);

      // Award achievement if met
      if (met) {
        const points = this.calculatePoints(achievement, context.difficulty);
        const earnedAchievement: ExtendedEarnedAchievement = {
          achievementId: achievement.id,
          earnedRound: context.roundNumber,
          earnedAt: new Date(),
          pointsAwarded: points,
          difficultyAtEarn: context.difficulty,
          wasHidden: achievement.hidden,
        };

        achievementState.earned.push(earnedAchievement);
        achievementState.totalPoints += points;

        // Track points by type
        if (points >= 0) {
          achievementState.positivePoints += points;
          positivePointsEarned += points;
        } else {
          achievementState.negativePoints += Math.abs(points);
          negativePointsEarned += Math.abs(points);
        }

        // Update tier counts
        this.updateTierCount(achievementState, achievement.tier);

        // Categorize the achievement
        if (isInfamyAchievement(achievement)) {
          newInfamyAchievements.push(achievement);
        } else if (isSecretAchievement(achievement)) {
          newSecretAchievements.push(achievement);
        } else {
          newAchievements.push(achievement);
        }

        // Track rewards
        if (achievement.reward) {
          if (achievement.reward.type === "unlock") {
            achievementState.unlockedRewards.push(achievement.reward.value as string);
          } else if (achievement.reward.type === "title") {
            achievementState.unlockedTitles.push(achievement.reward.value as string);
          }
        }

        // Create message
        messages.push(this.createMessage(achievement, points));
      }
    }

    // Update category progress
    this.updateCategoryProgress(achievementState);

    // Update total earned
    achievementState.totalEarned = achievementState.earned.length;

    return {
      state: achievementState,
      newAchievements,
      newInfamyAchievements,
      newSecretAchievements,
      milestoneResults: [], // Milestones handled separately
      messages,
      totalPointsEarned: positivePointsEarned - negativePointsEarned,
      pointsBreakdown: {
        positive: positivePointsEarned,
        negative: negativePointsEarned,
        net: positivePointsEarned - negativePointsEarned,
      },
    };
  }

  /**
   * Initialize a fresh achievement state
   */
  static initializeState(): ExtendedAchievementState {
    const categoryProgress: Record<ExtendedAchievementCategory, { earned: number; total: number; percentComplete: number }> = {
      overview: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.overview, percentComplete: 0 },
      factory: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.factory, percentComplete: 0 },
      finance: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.finance, percentComplete: 0 },
      hr: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.hr, percentComplete: 0 },
      marketing: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.marketing, percentComplete: 0 },
      rd: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.rd, percentComplete: 0 },
      supply_chain: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.supply_chain, percentComplete: 0 },
      logistics: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.logistics, percentComplete: 0 },
      news: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.news, percentComplete: 0 },
      results: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.results, percentComplete: 0 },
      secret: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.secret, percentComplete: 0 },
      mega: { earned: 0, total: ACHIEVEMENT_COUNTS_BY_CATEGORY.mega, percentComplete: 0 },
    };

    return {
      earned: [],
      progress: [],
      totalPoints: 0,
      positivePoints: 0,
      negativePoints: 0,
      totalEarned: 0,
      bronzeCount: 0,
      silverCount: 0,
      goldCount: 0,
      platinumCount: 0,
      infamyCount: 0,
      secretCount: 0,
      unlockedRewards: [],
      unlockedTitles: [],
      categoryProgress,
    };
  }

  /**
   * Clone achievement state for immutability
   */
  private static cloneState(state: ExtendedAchievementState): ExtendedAchievementState {
    return {
      ...state,
      earned: [...state.earned],
      progress: state.progress.map((p) => ({ ...p })),
      unlockedRewards: [...state.unlockedRewards],
      unlockedTitles: [...state.unlockedTitles],
      categoryProgress: Object.fromEntries(
        Object.entries(state.categoryProgress).map(([k, v]) => [k, { ...v }])
      ) as typeof state.categoryProgress,
    };
  }

  /**
   * Check if achievement requirements are met
   */
  private static checkRequirements(
    achievement: ExtendedAchievement,
    context: AchievementContext
  ): { met: boolean; progress: ExtendedAchievementProgress } {
    let allMet = true;
    let totalProgress = 0;
    let totalTargets = 0;
    let sustainedRounds = 0;

    for (const req of achievement.requirements) {
      const { value, target, met } = this.evaluateRequirement(req, context);

      if (!met) {
        allMet = false;
      }

      if (typeof value === "number" && typeof target === "number") {
        totalProgress += Math.min(value, target);
        totalTargets += target;
      }

      // Track sustained rounds
      if (req.sustained && met) {
        // This would need historical tracking
        sustainedRounds = Math.min(sustainedRounds + 1, req.sustained);
        if (sustainedRounds < req.sustained) {
          allMet = false;
        }
      }
    }

    const percentComplete = totalTargets > 0 ? (totalProgress / totalTargets) * 100 : allMet ? 100 : 0;

    return {
      met: allMet,
      progress: {
        achievementId: achievement.id,
        currentValue: totalProgress,
        targetValue: totalTargets,
        percentComplete: Math.min(100, percentComplete),
        sustainedRounds,
        unlocked: allMet,
      },
    };
  }

  /**
   * Evaluate a single requirement
   */
  private static evaluateRequirement(
    req: ExtendedAchievementRequirement,
    context: AchievementContext
  ): { value: number | string | boolean; target: number; met: boolean } {
    const value = this.getRequirementValue(req, context);
    const target = typeof req.value === "number" ? req.value : 1;
    const met = this.compareValues(value, req.operator ?? ">=", req.value);

    return { value, target, met: req.invert ? !met : met };
  }

  /**
   * Get the current value for a requirement
   */
  private static getRequirementValue(
    req: ExtendedAchievementRequirement,
    ctx: AchievementContext
  ): number | string | boolean {
    const state = ctx.state;

    switch (req.type) {
      // Financial
      case "revenue":
        return state.revenue ?? 0;
      case "profit":
      case "net_income":
        return state.netIncome ?? 0;
      case "cash":
        return state.cash ?? 0;
      case "cash_flow":
        return (state.cash ?? 0) - (ctx.previousState?.cash ?? 0);
      case "market_cap":
        return state.marketCap ?? 0;
      case "profit_margin":
        return state.revenue ? ((state.netIncome ?? 0) / state.revenue) * 100 : 0;
      case "debt":
        return state.debt ?? 0;
      case "debt_ratio":
        return state.revenue ? ((state.debt ?? 0) / state.revenue) * 100 : 0;
      case "dividend_paid":
        return state.dividendsPaid ?? 0;

      // Market
      case "market_share":
      case "market_share_total":
        const shares = state.marketShare;
        if (!shares || typeof shares !== "object") return 0;
        return Object.values(shares).reduce((a, b) => a + b, 0) / Object.keys(shares).length * 100;
      case "segment_leader":
        return ctx.teamRankings?.marketShare === 1;
      case "segments_led":
        return 0; // Would need segment-by-segment data
      case "brand_value":
        return state.brandValue ?? 0;

      // Production
      case "production_volume":
      case "units_produced":
        return state.unitsProduced ?? 0;
      case "capacity_utilization":
        return state.capacityUtilization ?? 0;
      case "production_efficiency":
        return state.efficiency ?? 0;

      // Quality
      case "quality_avg":
        const products = state.products ?? [];
        if (products.length === 0) return 0;
        return products.reduce((sum, p) => sum + (p.quality ?? 0), 0) / products.length;
      case "quality_min":
        const prods = state.products ?? [];
        if (prods.length === 0) return 0;
        return Math.min(...prods.map((p) => p.quality ?? 0));
      case "quality_max":
        const ps = state.products ?? [];
        if (ps.length === 0) return 0;
        return Math.max(...ps.map((p) => p.quality ?? 0));
      case "products":
        return state.products?.length ?? 0;
      case "products_launched":
        return ctx.productsLaunched ?? 0;

      // Workforce
      case "employees":
      case "employee_count":
        return state.workforce?.totalHeadcount ?? 0;
      case "morale":
        return state.workforce?.satisfaction ?? 0;
      case "turnover_rate":
        return state.workforce?.turnoverRate ?? 0;
      case "training_level":
        return state.workforce?.trainingLevel ?? 0;
      case "salary_level":
        return state.workforce?.salaryLevel ?? 100;
      case "benefits_level":
        return state.workforce?.benefitsLevel ?? 0;

      // ESG
      case "esg":
      case "esg_score":
        return state.esgScore ?? 0;
      case "carbon_footprint":
        return state.carbonEmissions ?? 0;

      // Supply Chain
      case "supplier_count":
        return state.supplierCount ?? 0;
      case "inventory_level":
        return state.inventoryLevel ?? 0;
      case "delivery_rate":
        return state.deliveryReliability ?? 0;
      case "shipping_cost":
        return state.shippingCost ?? 0;

      // Events
      case "events_weathered":
        return ctx.eventsWeathered?.length ?? 0;
      case "news_events":
        return ctx.newsEventsRead ?? 0;

      // Game state
      case "rounds_completed":
        return ctx.roundNumber;
      case "rounds_profitable":
        return ctx.roundsWithProfit ?? 0;
      case "rounds_unprofitable":
        return ctx.roundsWithLoss ?? 0;
      case "no_bankruptcy":
        return state.cash >= 0;
      case "difficulty":
        return ctx.difficulty;
      case "game_completed":
        return ctx.gameCompleted ? 1 : 0;
      case "final_ranking":
        // -1 = last place in comparisons, positive number = actual rank
        if (ctx.finalRanking === ctx.totalTeams) return -1;
        return ctx.finalRanking ?? ctx.teamRanking ?? 999;

      // Cumulative
      case "total_revenue":
        return state.cumulativeRevenue ?? state.revenue ?? 0;
      case "total_rd_spent":
        return state.cumulativeRDSpend ?? 0;
      case "total_marketing_spent":
        return state.cumulativeMarketingSpend ?? 0;

      // Consecutive
      case "consecutive_growth":
        return ctx.consecutiveGrowthRounds ?? 0;

      // Custom requirements handled by special logic
      case "custom":
      default:
        return 0;
    }
  }

  /**
   * Compare values with an operator
   */
  private static compareValues(
    actual: number | string | boolean,
    operator: string,
    expected: number | string | boolean
  ): boolean {
    // Handle special ranking comparisons (-1 = best, -2 = worst)
    if (expected === -1 || expected === -2) {
      return actual === expected;
    }

    // Handle boolean
    if (typeof actual === "boolean") {
      return actual === expected;
    }

    // Handle "any" operator
    if (operator === "any") {
      return !!actual;
    }

    // Handle string comparison (like difficulty)
    if (typeof actual === "string" && typeof expected === "string") {
      const difficultyOrder = ["sandbox", "easy", "normal", "hard", "expert", "nightmare"];
      const actualIndex = difficultyOrder.indexOf(actual);
      const expectedIndex = difficultyOrder.indexOf(expected);

      if (actualIndex !== -1 && expectedIndex !== -1) {
        switch (operator) {
          case ">=": return actualIndex >= expectedIndex;
          case ">": return actualIndex > expectedIndex;
          case "<=": return actualIndex <= expectedIndex;
          case "<": return actualIndex < expectedIndex;
          case "==": return actualIndex === expectedIndex;
          case "!=": return actualIndex !== expectedIndex;
          default: return false;
        }
      }
      return actual === expected;
    }

    // Handle numeric comparison
    const numActual = Number(actual);
    const numExpected = Number(expected);

    switch (operator) {
      case ">=": return numActual >= numExpected;
      case ">": return numActual > numExpected;
      case "<=": return numActual <= numExpected;
      case "<": return numActual < numExpected;
      case "==": return numActual === numExpected;
      case "!=": return numActual !== numExpected;
      default: return false;
    }
  }

  /**
   * Calculate points for an achievement
   */
  private static calculatePoints(achievement: ExtendedAchievement, difficulty: DifficultyLevel): number {
    let points = getTierPoints(achievement.tier);

    if (achievement.difficultyMultiplier?.[difficulty]) {
      points *= achievement.difficultyMultiplier[difficulty]!;
    }

    return Math.round(points);
  }

  /**
   * Update progress tracking
   */
  private static updateProgress(
    state: ExtendedAchievementState,
    achievementId: string,
    progress: ExtendedAchievementProgress
  ): void {
    const existing = state.progress.find((p) => p.achievementId === achievementId);
    if (existing) {
      Object.assign(existing, progress);
    } else {
      state.progress.push(progress);
    }
  }

  /**
   * Update tier count
   */
  private static updateTierCount(state: ExtendedAchievementState, tier: ExtendedAchievementTier): void {
    switch (tier) {
      case "bronze": state.bronzeCount++; break;
      case "silver": state.silverCount++; break;
      case "gold": state.goldCount++; break;
      case "platinum": state.platinumCount++; break;
      case "infamy": state.infamyCount++; break;
      case "secret": state.secretCount++; break;
    }
  }

  /**
   * Update category progress
   */
  private static updateCategoryProgress(state: ExtendedAchievementState): void {
    for (const earned of state.earned) {
      const achievement = getAchievement(earned.achievementId);
      if (achievement) {
        const category = achievement.category;
        state.categoryProgress[category].earned++;
        state.categoryProgress[category].percentComplete =
          (state.categoryProgress[category].earned / state.categoryProgress[category].total) * 100;
      }
    }
  }

  /**
   * Create an achievement message
   */
  private static createMessage(achievement: ExtendedAchievement, points: number): AchievementMessage {
    const isNegative = isInfamyAchievement(achievement);
    const isSecret = isSecretAchievement(achievement);

    let type: AchievementMessage["type"] = "unlock";
    if (isNegative) type = "infamy";
    if (isSecret) type = "secret";

    return {
      type,
      achievementId: achievement.id,
      title: achievement.name,
      description: achievement.flavor ?? achievement.description,
      points,
      tier: achievement.tier,
      category: achievement.category,
      icon: achievement.icon,
    };
  }

  // ============================================
  // STATIC GETTERS
  // ============================================

  /**
   * Get all achievements
   */
  static getAllAchievements(): ExtendedAchievement[] {
    return ALL_ACHIEVEMENTS;
  }

  /**
   * Get achievement by ID
   */
  static getAchievement(id: string): ExtendedAchievement | undefined {
    return getAchievement(id);
  }

  /**
   * Get achievements by category
   */
  static getAchievementsByCategory(category: ExtendedAchievementCategory): ExtendedAchievement[] {
    return getAchievementsByCategory(category);
  }

  /**
   * Get total achievement count
   */
  static getTotalCount(): number {
    return TOTAL_ACHIEVEMENT_COUNT;
  }
}

export default ExtendedAchievementEngine;
