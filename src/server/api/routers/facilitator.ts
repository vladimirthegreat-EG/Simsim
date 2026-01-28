import { z } from "zod";
import { createTRPCRouter, publicProcedure, facilitatorProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";

// Note: In production, use proper password hashing with bcrypt
// For now, we'll use a simple comparison (install bcryptjs later)
async function hashPassword(password: string): Promise<string> {
  // Simple hash for development - replace with bcrypt in production
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt_business_sim");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export const facilitatorRouter = createTRPCRouter({
  /**
   * Register a new facilitator
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if email already exists
      const existing = await ctx.prisma.facilitator.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An account with this email already exists",
        });
      }

      // Hash password
      const passwordHash = await hashPassword(input.password);

      // Create facilitator
      const facilitator = await ctx.prisma.facilitator.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash,
        },
      });

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set("facilitator_id", facilitator.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return {
        id: facilitator.id,
        email: facilitator.email,
        name: facilitator.name,
      };
    }),

  /**
   * Login as facilitator
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const facilitator = await ctx.prisma.facilitator.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (!facilitator) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const isValid = await verifyPassword(input.password, facilitator.passwordHash);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set("facilitator_id", facilitator.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return {
        id: facilitator.id,
        email: facilitator.email,
        name: facilitator.name,
      };
    }),

  /**
   * Logout
   */
  logout: publicProcedure.mutation(async () => {
    const cookieStore = await cookies();
    cookieStore.delete("facilitator_id");
    return { success: true };
  }),

  /**
   * Get current facilitator
   */
  me: facilitatorProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.facilitator.id,
      email: ctx.facilitator.email,
      name: ctx.facilitator.name,
    };
  }),

  /**
   * Check if user has a facilitator session
   */
  checkSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.facilitatorId) {
      return { hasSession: false };
    }

    const facilitator = await ctx.prisma.facilitator.findUnique({
      where: { id: ctx.facilitatorId },
      select: { id: true, email: true, name: true },
    });

    if (!facilitator) {
      return { hasSession: false };
    }

    return {
      hasSession: true,
      facilitator,
    };
  }),

  /**
   * Get dashboard stats
   */
  getDashboardStats: facilitatorProcedure.query(async ({ ctx }) => {
    const games = await ctx.prisma.game.findMany({
      where: { facilitatorId: ctx.facilitator.id },
      include: {
        teams: { select: { id: true } },
      },
    });

    const activeGames = games.filter(
      (g) => g.status === "IN_PROGRESS" || g.status === "PAUSED"
    );
    const completedGames = games.filter((g) => g.status === "COMPLETED");
    const totalTeams = games.reduce((sum, g) => sum + g.teams.length, 0);

    return {
      totalGames: games.length,
      activeGames: activeGames.length,
      completedGames: completedGames.length,
      totalTeams,
      recentGames: games.slice(0, 5).map((g) => ({
        id: g.id,
        name: g.name,
        status: g.status,
        teamCount: g.teams.length,
        currentRound: g.currentRound,
        maxRounds: g.maxRounds,
        createdAt: g.createdAt,
      })),
    };
  }),
});
