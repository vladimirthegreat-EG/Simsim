/**
 * Achievement API Router
 *
 * Handles all achievement-related API endpoints for the
 * "Ledger of Legends & Losers" achievement system.
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  ALL_ACHIEVEMENTS,
  getAchievement,
  getAchievementsByCategory,
  getAchievementsByTier,
  getVisibleAchievements,
  getPositiveAchievements,
  getInfamyAchievements,
  getSecretAchievements,
  TOTAL_ACHIEVEMENT_COUNT,
  ACHIEVEMENT_COUNTS_BY_TIER,
  ACHIEVEMENT_COUNTS_BY_CATEGORY,
  getTotalPossiblePoints,
  getMaximumInfamyPoints,
  EXTENDED_TIER_CONFIG,
  CATEGORY_CONFIG,
  ExtendedAchievementCategory,
  ExtendedAchievementTier,
} from "@/engine/achievements";

export const achievementRouter = createTRPCRouter({
  /**
   * Get all achievement definitions
   */
  getAllDefinitions: publicProcedure.query(() => {
    return {
      achievements: ALL_ACHIEVEMENTS,
      totalCount: TOTAL_ACHIEVEMENT_COUNT,
      countsByTier: ACHIEVEMENT_COUNTS_BY_TIER,
      countsByCategory: ACHIEVEMENT_COUNTS_BY_CATEGORY,
      totalPossiblePoints: getTotalPossiblePoints(),
      maxInfamyPoints: getMaximumInfamyPoints(),
      tierConfig: EXTENDED_TIER_CONFIG,
      categoryConfig: CATEGORY_CONFIG,
    };
  }),

  /**
   * Get achievement by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const achievement = getAchievement(input.id);
      if (!achievement) {
        return null;
      }
      return achievement;
    }),

  /**
   * Get achievements by category
   */
  getByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(({ input }) => {
      return getAchievementsByCategory(input.category as ExtendedAchievementCategory);
    }),

  /**
   * Get achievements by tier
   */
  getByTier: publicProcedure
    .input(z.object({ tier: z.string() }))
    .query(({ input }) => {
      return getAchievementsByTier(input.tier as ExtendedAchievementTier);
    }),

  /**
   * Get team's earned achievements
   */
  getTeamAchievements: publicProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
      const team = await (ctx.prisma.team as any).findUnique({
        where: { id: input.teamId },
        include: {
          achievements: {
            orderBy: { earnedAt: "desc" },
          },
          achievementProgress: true,
        },
      }) as any;

      if (!team) {
        return null;
      }

      // Parse achievement state
      const achievementState = JSON.parse(team.achievementState || "{}");

      // Get earned achievement IDs
      const earnedIds = new Set(team.achievements.map((a: any) => a.achievementId));

      // Get visible achievements (includes secrets if earned)
      const visibleAchievements = getVisibleAchievements(earnedIds as Set<string>);

      // Map earned achievements to full definitions
      const earnedAchievements = team.achievements.map((earned: any) => {
        const definition = getAchievement(earned.achievementId);
        return {
          ...earned,
          definition,
        };
      });

      return {
        team: {
          id: team.id,
          name: team.name,
          achievementPoints: team.achievementPoints,
        },
        earned: earnedAchievements,
        progress: team.achievementProgress,
        state: achievementState,
        visibleAchievements,
        stats: {
          totalEarned: team.achievements.length,
          totalAvailable: TOTAL_ACHIEVEMENT_COUNT,
          percentComplete: (team.achievements.length / TOTAL_ACHIEVEMENT_COUNT) * 100,
          positiveCount: team.achievements.filter((a: any) => (a.pointsAwarded ?? 0) > 0).length,
          infamyCount: team.achievements.filter((a: any) => (a.pointsAwarded ?? 0) < 0).length,
          secretCount: team.achievements.filter((a: any) => a.wasHidden).length,
        },
      };
      } catch {
        // Achievement tables may not exist in schema yet — return safe fallback
        return { earned: [], progress: [], state: {}, visibleAchievements: [], stats: { totalEarned: 0, totalAvailable: 0, percentComplete: 0, positiveCount: 0, infamyCount: 0, secretCount: 0 } };
      }
    }),

  /**
   * Get achievement leaderboard
   */
  getLeaderboard: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
      const teams = await (ctx.prisma.team as any).findMany({
        where: { gameId: input.gameId },
        include: {
          achievements: true,
        },
        orderBy: { achievementPoints: "desc" },
      }) as any[];

      return teams.map((team: any, index: number) => ({
        rank: index + 1,
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        achievementPoints: team.achievementPoints,
        totalEarned: team.achievements.length,
        positiveCount: team.achievements.filter((a: any) => (a.pointsAwarded ?? 0) > 0).length,
        infamyCount: team.achievements.filter((a: any) => (a.pointsAwarded ?? 0) < 0).length,
        secretCount: team.achievements.filter((a: any) => a.wasHidden).length,
      }));
      } catch {
        return [];
      }
    }),

  /**
   * Get recent achievements across all teams in a game
   */
  getRecentInGame: publicProcedure
    .input(z.object({ gameId: z.string(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const teams = await ctx.prisma.team.findMany({
        where: { gameId: input.gameId },
        select: { id: true },
      });

      const teamIds = teams.map((t: any) => t.id);

      const recentAchievements = await (ctx.prisma as any).teamAchievement.findMany({
        where: { teamId: { in: teamIds } },
        orderBy: { earnedAt: "desc" },
        take: input.limit,
        include: {
          team: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      return recentAchievements.map((earned: any) => {
        const definition = getAchievement(earned.achievementId);
        return {
          ...earned,
          definition,
        };
      });
    }),

  /**
   * Get achievement statistics
   */
  getStats: publicProcedure.query(() => {
    return {
      totalCount: TOTAL_ACHIEVEMENT_COUNT,
      countsByTier: ACHIEVEMENT_COUNTS_BY_TIER,
      countsByCategory: ACHIEVEMENT_COUNTS_BY_CATEGORY,
      positiveCount: getPositiveAchievements().length,
      infamyCount: getInfamyAchievements().length,
      secretCount: getSecretAchievements().length,
      totalPossiblePoints: getTotalPossiblePoints(),
      maxInfamyPoints: getMaximumInfamyPoints(),
    };
  }),

  /**
   * Get tier configuration
   */
  getTierConfig: publicProcedure.query(() => {
    return EXTENDED_TIER_CONFIG;
  }),

  /**
   * Get category configuration
   */
  getCategoryConfig: publicProcedure.query(() => {
    return CATEGORY_CONFIG;
  }),
});

export default achievementRouter;
