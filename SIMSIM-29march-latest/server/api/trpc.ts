import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { prisma } from "../db";
import { cookies } from "next/headers";

/**
 * Context options for tRPC
 */
interface CreateContextOptions {
  req?: Request;
  resHeaders?: Headers;
}

/**
 * Context creation for tRPC
 */
export const createTRPCContext = async (opts: CreateContextOptions) => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  const facilitatorId = cookieStore.get("facilitator_id")?.value;

  return {
    prisma,
    sessionToken,
    facilitatorId,
    headers: opts.req?.headers,
  };
};

/**
 * Initialize tRPC
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * Export router and procedure helpers
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires team session token
 */
export const teamProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.sessionToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in as a team to perform this action",
    });
  }

  const team = await ctx.prisma.team.findUnique({
    where: { sessionToken: ctx.sessionToken },
    include: { game: true },
  });

  if (!team) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid session token",
    });
  }

  return next({
    ctx: {
      ...ctx,
      team,
      game: team.game,
    },
  });
});

/**
 * Facilitator procedure - requires facilitator authentication
 */
export const facilitatorProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.facilitatorId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in as a facilitator to perform this action",
    });
  }

  const facilitator = await ctx.prisma.facilitator.findUnique({
    where: { id: ctx.facilitatorId },
  });

  if (!facilitator) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid facilitator session",
    });
  }

  return next({
    ctx: {
      ...ctx,
      facilitator,
    },
  });
});
