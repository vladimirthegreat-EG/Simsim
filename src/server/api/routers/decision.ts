import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { GameStatus, RoundStatus, GameModule, type GameModuleType } from "../shared/constants";

/**
 * Factory decisions schema
 */
const factoryDecisionsSchema = z.object({
  investments: z.object({
    workerEfficiency: z.number().min(0).default(0),
    supervisorEfficiency: z.number().min(0).default(0),
    engineerEfficiency: z.number().min(0).default(0),
    machineryEfficiency: z.number().min(0).default(0),
    factoryEfficiency: z.number().min(0).default(0),
  }).optional(),
  greenEnergyInvestments: z.array(z.object({
    factoryId: z.string(),
    amount: z.number().min(0),
  })).optional(),
  upgradePurchases: z.array(z.object({
    factoryId: z.string(),
    upgradeName: z.string(),
  })).optional(),
  newFactories: z.array(z.object({
    region: z.string(),
    segment: z.string(),
    name: z.string(),
  })).optional(),
  esgChanges: z.array(z.object({
    factoryId: z.string(),
    initiative: z.string(),
    activate: z.boolean(),
  })).optional(),
  productionAllocation: z.array(z.object({
    factoryId: z.string(),
    lineId: z.string(),
    targetUnits: z.number().min(0),
  })).optional(),
});

/**
 * Finance decisions schema
 */
const financeDecisionsSchema = z.object({
  issueTBills: z.number().min(0).default(0),
  issueBonds: z.number().min(0).default(0),
  issueShares: z.object({
    count: z.number().min(0),
    pricePerShare: z.number().min(0),
  }).nullable().optional(),
  sharesBuyback: z.number().min(0).default(0),
  dividendPerShare: z.number().min(0).default(0),
  boardProposals: z.array(z.string()).optional(),
  economicForecast: z.object({
    gdpForecast: z.number(),
    inflationForecast: z.number(),
    fxForecasts: z.record(z.string(), z.number()),
  }).optional(),
});

/**
 * HR decisions schema
 */
const hrDecisionsSchema = z.object({
  hires: z.array(z.object({
    factoryId: z.string().default("default"),
    role: z.enum(["worker", "engineer", "supervisor"]),
    candidateId: z.string(),
  })).optional(),
  fires: z.array(z.object({
    employeeId: z.string(),
  })).optional(),
  recruitmentSearches: z.array(z.object({
    role: z.enum(["worker", "engineer", "supervisor"]),
    tier: z.enum(["basic", "premium", "executive"]),
    factoryId: z.string().default("default"),
  })).optional(),
  salaryMultiplierChanges: z.object({
    workers: z.number().min(0.6).max(3.0),
    engineers: z.number().min(0.6).max(3.0),
    supervisors: z.number().min(0.6).max(3.0),
  }).optional(),
  salaryAdjustment: z.number().min(-20).max(20).optional(),
  benefitChanges: z.record(z.string(), z.union([z.number(), z.boolean()])).optional(),
  trainingPrograms: z.array(z.object({
    role: z.enum(["worker", "engineer", "supervisor"]),
    programType: z.string(),
  })).optional(),
});

/**
 * Marketing decisions schema
 */
const marketingDecisionsSchema = z.object({
  pricing: z.array(z.object({
    productId: z.string(),
    segment: z.string(),
    price: z.number().min(0),
  })).optional(),
  marketingBudget: z.array(z.object({
    segment: z.string(),
    region: z.string(),
    spend: z.number().min(0),
    campaignType: z.string(),
  })).optional(),
  positioningStrategy: z.string().optional(),
});

/**
 * R&D decisions schema
 */
const rdDecisionsSchema = z.object({
  rdBudgetAllocation: z.array(z.object({
    productId: z.string(),
    budget: z.number().min(0),
    focus: z.enum(["innovation", "quality", "cost_reduction"]),
  })).optional(),
  newProductProjects: z.array(z.object({
    name: z.string(),
    segment: z.string(),
    targetFeatures: z.array(z.string()),
  })).optional(),
});

/**
 * Map module to schema
 */
const moduleSchemas: Record<GameModuleType, z.ZodTypeAny> = {
  FACTORY: factoryDecisionsSchema,
  FINANCE: financeDecisionsSchema,
  HR: hrDecisionsSchema,
  MARKETING: marketingDecisionsSchema,
  RD: rdDecisionsSchema,
};

export const decisionRouter = createTRPCRouter({
  /**
   * Submit decisions for a module
   */
  submit: teamProcedure
    .input(
      z.object({
        module: z.enum(["FACTORY", "FINANCE", "HR", "MARKETING", "RD"]),
        decisions: z.any(), // Will be validated based on module
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check game is in progress
      if (ctx.game.status !== GameStatus.IN_PROGRESS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game is not currently accepting decisions",
        });
      }

      // Get current round
      const currentRound = await ctx.prisma.round.findFirst({
        where: {
          gameId: ctx.game.id,
          roundNumber: ctx.game.currentRound,
        },
      });

      if (!currentRound || currentRound.status !== RoundStatus.ACCEPTING_DECISIONS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current round is not accepting decisions",
        });
      }

      // Validate decisions against module schema
      const schema = moduleSchemas[input.module as GameModuleType];
      const validatedDecisions = schema.parse(input.decisions) as Record<string, unknown>;

      // Upsert decision (using JSON string for SQLite)
      const decision = await ctx.prisma.teamDecision.upsert({
        where: {
          teamId_roundId_module: {
            teamId: ctx.team.id,
            roundId: currentRound.id,
            module: input.module,
          },
        },
        create: {
          teamId: ctx.team.id,
          roundId: currentRound.id,
          module: input.module,
          decisions: JSON.stringify(validatedDecisions),
        },
        update: {
          decisions: JSON.stringify(validatedDecisions),
          submittedAt: new Date(),
          isLocked: false,
        },
      });

      return {
        success: true,
        decisionId: decision.id,
        module: decision.module,
        submittedAt: decision.submittedAt,
      };
    }),

  /**
   * Get submitted decisions for current round
   */
  getSubmitted: teamProcedure.query(async ({ ctx }) => {
    const currentRound = await ctx.prisma.round.findFirst({
      where: {
        gameId: ctx.game.id,
        roundNumber: ctx.game.currentRound,
      },
    });

    if (!currentRound) {
      return { decisions: [], roundNumber: ctx.game.currentRound };
    }

    const decisions = await ctx.prisma.teamDecision.findMany({
      where: {
        teamId: ctx.team.id,
        roundId: currentRound.id,
      },
    });

    return {
      decisions: decisions.map((d) => ({
        module: d.module,
        decisions: d.decisions,
        submittedAt: d.submittedAt,
        isLocked: d.isLocked,
      })),
      roundNumber: ctx.game.currentRound,
    };
  }),

  /**
   * Lock all decisions (confirm submission)
   */
  lockAll: teamProcedure.mutation(async ({ ctx }) => {
    const currentRound = await ctx.prisma.round.findFirst({
      where: {
        gameId: ctx.game.id,
        roundNumber: ctx.game.currentRound,
      },
    });

    if (!currentRound || currentRound.status !== RoundStatus.ACCEPTING_DECISIONS) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot lock decisions - round is not accepting decisions",
      });
    }

    // Check that all required modules have decisions
    const decisions = await ctx.prisma.teamDecision.findMany({
      where: {
        teamId: ctx.team.id,
        roundId: currentRound.id,
      },
    });

    const requiredModules: GameModuleType[] = ["FACTORY", "FINANCE", "HR", "MARKETING", "RD"];
    const submittedModules = decisions.map((d) => d.module);
    const missingModules = requiredModules.filter((m) => !submittedModules.includes(m));

    if (missingModules.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Missing decisions for: ${missingModules.join(", ")}`,
      });
    }

    // Lock all decisions
    await ctx.prisma.teamDecision.updateMany({
      where: {
        teamId: ctx.team.id,
        roundId: currentRound.id,
      },
      data: { isLocked: true },
    });

    return { success: true, lockedCount: decisions.length };
  }),

  /**
   * Get decision progress for all teams (for facilitator view)
   */
  getProgress: teamProcedure.query(async ({ ctx }) => {
    const currentRound = await ctx.prisma.round.findFirst({
      where: {
        gameId: ctx.game.id,
        roundNumber: ctx.game.currentRound,
      },
      include: {
        decisions: {
          include: {
            team: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    if (!currentRound) {
      return { progress: [], allReady: false };
    }

    const teams = await ctx.prisma.team.findMany({
      where: { gameId: ctx.game.id },
      select: { id: true, name: true, color: true },
    });

    const requiredModules: GameModuleType[] = ["FACTORY", "FINANCE", "HR", "MARKETING", "RD"];

    const progress = teams.map((team) => {
      const teamDecisions = currentRound.decisions.filter(
        (d) => d.teamId === team.id
      );
      const submittedModules = teamDecisions.map((d) => d.module);
      const lockedCount = teamDecisions.filter((d) => d.isLocked).length;

      return {
        team,
        submitted: submittedModules,
        pending: requiredModules.filter((m) => !submittedModules.includes(m as string)),
        isLocked: lockedCount === requiredModules.length,
        lastUpdate:
          teamDecisions.length > 0
            ? Math.max(...teamDecisions.map((d) => d.submittedAt.getTime()))
            : null,
      };
    });

    const allReady = progress.every((p) => p.isLocked);

    return { progress, allReady };
  }),
});
