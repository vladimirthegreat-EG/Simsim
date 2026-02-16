import { z } from "zod";
import { createTRPCRouter, publicProcedure, teamProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { GameStatus } from "../shared/constants";

/**
 * Assign a color to a team based on their index
 */
const TEAM_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
];

function getTeamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

export const teamRouter = createTRPCRouter({
  /**
   * Join a game with a join code
   */
  join: publicProcedure
    .input(
      z.object({
        joinCode: z.string().length(6),
        teamName: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findUnique({
        where: { joinCode: input.joinCode.toUpperCase() },
        include: { teams: true },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid join code. Please check and try again.",
        });
      }

      if (game.status !== GameStatus.LOBBY) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This game has already started. You cannot join now.",
        });
      }

      if (game.teams.length >= 5) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This game is full (maximum 5 teams).",
        });
      }

      // Check if team name already exists
      const existingTeam = game.teams.find(
        (t) => t.name.toLowerCase() === input.teamName.toLowerCase()
      );
      if (existingTeam) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A team with this name already exists. Please choose a different name.",
        });
      }

      // Create the team with initial state
      const team = await ctx.prisma.team.create({
        data: {
          gameId: game.id,
          name: input.teamName,
          color: getTeamColor(game.teams.length),
          currentState: JSON.stringify(SimulationEngine.createInitialTeamState()),
        },
      });

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set("session_token", team.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return {
        teamId: team.id,
        teamName: team.name,
        gameId: game.id,
        gameName: game.name,
      };
    }),

  /**
   * Get current team's state and game info
   */
  getMyState: teamProcedure.query(async ({ ctx }) => {
    const team = await ctx.prisma.team.findUnique({
      where: { id: ctx.team.id },
      include: {
        game: {
          include: {
            rounds: {
              where: { roundNumber: ctx.game.currentRound },
              take: 1,
            },
            teams: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        decisions: {
          where: {
            round: { roundNumber: ctx.game.currentRound },
          },
        },
        roundResults: {
          orderBy: { round: { roundNumber: "desc" } },
          take: 5,
          include: {
            round: {
              select: { roundNumber: true },
            },
          },
        },
      },
    });

    if (!team) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team not found",
      });
    }

    const currentRound = team.game.rounds[0];
    const submittedModules = team.decisions.map((d) => d.module);

    return {
      team: {
        id: team.id,
        name: team.name,
        color: team.color,
      },
      game: {
        id: team.game.id,
        name: team.game.name,
        status: team.game.status,
        currentRound: team.game.currentRound,
        maxRounds: team.game.maxRounds,
        teams: team.game.teams,
        config: team.game.config,
      },
      state: team.currentState,
      marketState: currentRound?.marketState || {},
      submittedModules,
      recentResults: team.roundResults.map((r) => ({
        roundNumber: r.round.roundNumber,
        rank: r.rank,
        metrics: r.metrics,
      })),
    };
  }),

  /**
   * Leave the current game (only in lobby)
   */
  leave: teamProcedure.mutation(async ({ ctx }) => {
    if (ctx.game.status !== GameStatus.LOBBY) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You cannot leave a game that has already started.",
      });
    }

    await ctx.prisma.team.delete({
      where: { id: ctx.team.id },
    });

    // Clear session cookie
    const cookieStore = await cookies();
    cookieStore.delete("session_token");

    return { success: true };
  }),

  /**
   * Check if user has an active session
   */
  checkSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.sessionToken) {
      return { hasSession: false };
    }

    const team = await ctx.prisma.team.findUnique({
      where: { sessionToken: ctx.sessionToken },
      include: {
        game: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!team) {
      return { hasSession: false };
    }

    return {
      hasSession: true,
      team: {
        id: team.id,
        name: team.name,
        color: team.color,
      },
      game: team.game,
    };
  }),

  /**
   * Clear session (logout)
   */
  logout: publicProcedure.mutation(async () => {
    const cookieStore = await cookies();
    cookieStore.delete("session_token");
    return { success: true };
  }),

  /**
   * Get full performance history for charts
   */
  getPerformanceHistory: teamProcedure.query(async ({ ctx }) => {
    const roundResults = await ctx.prisma.roundResult.findMany({
      where: { teamId: ctx.team.id },
      orderBy: { round: { roundNumber: "asc" } },
      include: {
        round: {
          select: { roundNumber: true, marketState: true },
        },
      },
    });

    // Get all teams' results from the last completed round for rankings
    // After processing round N, currentRound becomes N+1, so we look at N
    const lastCompletedRound = Math.max(1, ctx.game.currentRound - 1);
    const allTeamsResults = await ctx.prisma.roundResult.findMany({
      where: {
        round: { roundNumber: lastCompletedRound, gameId: ctx.game.id },
      },
      include: {
        team: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { rank: "asc" },
    });

    return {
      history: roundResults.map((r) => ({
        round: r.round.roundNumber,
        ...(JSON.parse(r.metrics) as Record<string, number>),
        stateAfter: r.stateAfter,
        rank: r.rank,
      })),
      currentRankings: allTeamsResults.map((r) => ({
        teamId: r.team.id,
        teamName: r.team.name,
        teamColor: r.team.color,
        rank: r.rank,
        metrics: JSON.parse(r.metrics) as Record<string, number>,
      })),
    };
  }),
});
