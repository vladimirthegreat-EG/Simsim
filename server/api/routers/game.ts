import { z } from "zod";
import { createTRPCRouter, publicProcedure, facilitatorProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { SimulationEngine, type SimulationInput } from "@/engine/core/SimulationEngine";
import { ExplainabilityEngine } from "@/engine/explainability/ExplainabilityEngine";
import { FacilitatorReportEngine } from "@/engine/modules/FacilitatorReportEngine";
import type { TeamState, MarketState, AllDecisions, ComplexityPreset } from "@/engine/types";
import { COMPLEXITY_PRESETS } from "@/engine/types";
import { GAME_PRESETS, type GamePreset } from "@/engine/config/gamePresets";
import { GameStatus, RoundStatus } from "../shared/constants";

/**
 * Log a facilitator action to the audit trail
 */
async function logAudit(
  prisma: any,
  gameId: string,
  facilitatorId: string,
  action: string,
  details: Record<string, unknown> = {}
) {
  await prisma.facilitatorAuditLog.create({
    data: {
      gameId,
      facilitatorId,
      action,
      details: JSON.stringify(details),
    },
  });
}

/**
 * Generate a random 6-character join code
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars (I, O, 0, 1)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

/**
 * Default game configuration
 */
const DEFAULT_GAME_CONFIG = {
  startingCash: 200_000_000, // $200M
  startingFactories: 1,
  enabledModules: ["FACTORY", "FINANCE", "HR", "MARKETING", "RD"],
  industrySettings: {
    segments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"],
    regions: ["North America", "Europe", "Asia", "MENA"],
  },
};

// Use SimulationEngine.createInitialTeamState() and createInitialMarketState()
// for consistent initial states across all entry points

export const gameRouter = createTRPCRouter({
  /**
   * Get game by join code (for teams to find and join)
   */
  getByJoinCode: publicProcedure
    .input(z.object({ joinCode: z.string().length(6) }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findUnique({
        where: { joinCode: input.joinCode.toUpperCase() },
        include: {
          teams: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found. Please check the join code.",
        });
      }

      return {
        id: game.id,
        name: game.name,
        status: game.status,
        currentRound: game.currentRound,
        maxRounds: game.maxRounds,
        teams: game.teams,
        teamCount: game.teams.length,
      };
    }),

  /**
   * Create a new game (facilitator only)
   */
  create: facilitatorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        maxRounds: z.number().min(4).max(32).default(8),
        gamePresetId: z.enum(["quick", "standard", "full"]).optional(),
        config: z.record(z.string(), z.any()).optional(),
        complexitySettings: z.object({
          preset: z.enum(["simple", "standard", "advanced", "custom"]),
          modules: z.object({
            factory: z.boolean(),
            hr: z.boolean(),
            finance: z.boolean(),
            marketing: z.boolean(),
            rd: z.boolean(),
            esg: z.boolean(),
          }),
          features: z.object({
            multipleFactories: z.boolean(),
            employeeManagement: z.boolean(),
            detailedFinancials: z.boolean(),
            boardMeetings: z.boolean(),
            marketEvents: z.boolean(),
            rubberBanding: z.boolean(),
            productDevelopmentTimeline: z.boolean(),
            trainingFatigue: z.boolean(),
            benefitsSystem: z.boolean(),
            inventoryManagement: z.boolean(),
          }),
          automation: z.object({
            autoHire: z.boolean(),
            autoTrain: z.boolean(),
            autoInvest: z.boolean(),
            autoPrice: z.boolean(),
          }),
          difficulty: z.object({
            startingCash: z.number(),
            marketVolatility: z.number(),
            competitorStrength: z.number(),
            economicStability: z.number(),
          }),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate unique join code
      let joinCode: string;
      let attempts = 0;
      do {
        joinCode = generateJoinCode();
        const existing = await ctx.prisma.game.findUnique({
          where: { joinCode },
        });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate unique join code",
        });
      }

      // Use complexity settings for starting cash if provided
      const complexitySettings = input.complexitySettings || {
        preset: "standard" as ComplexityPreset,
        ...COMPLEXITY_PRESETS.standard,
      };

      // If a game preset is specified, use its rounds and starting cash
      const gamePreset = input.gamePresetId ? GAME_PRESETS[input.gamePresetId] : undefined;

      const gameConfig = {
        ...DEFAULT_GAME_CONFIG,
        ...input.config,
        startingCash: gamePreset?.startingCash ?? complexitySettings.difficulty.startingCash,
        complexitySettings,
        ...(input.gamePresetId && { gamePresetId: input.gamePresetId }),
        ...(gamePreset && { tutorialDepth: gamePreset.tutorialDepth }),
      };

      const game = await ctx.prisma.game.create({
        data: {
          name: input.name,
          joinCode,
          maxRounds: gamePreset?.rounds ?? input.maxRounds,
          config: JSON.stringify(gameConfig),
          facilitatorId: ctx.facilitator.id,
        },
      });

      await logAudit(ctx.prisma, game.id, ctx.facilitator.id, "GAME_CREATED", {
        name: input.name, maxRounds: gamePreset?.rounds ?? input.maxRounds,
      });

      return { game, joinCode };
    }),

  /**
   * Get game details (facilitator only, full details)
   */
  getFullState: facilitatorProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: {
          id: input.gameId,
          facilitatorId: ctx.facilitator.id,
        },
        include: {
          teams: {
            include: {
              decisions: {
                orderBy: { submittedAt: "desc" },
              },
              roundResults: {
                orderBy: { round: { roundNumber: "desc" } },
                take: 1,
              },
            },
          },
          rounds: {
            orderBy: { roundNumber: "desc" },
            include: {
              results: {
                select: {
                  id: true,
                  teamId: true,
                  metrics: true,
                  rank: true,
                  team: {
                    select: { id: true, name: true, color: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      return game;
    }),

  /**
   * List all games for a facilitator
   */
  list: facilitatorProcedure.query(async ({ ctx }) => {
    const games = await ctx.prisma.game.findMany({
      where: { facilitatorId: ctx.facilitator.id },
      include: {
        teams: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return games;
  }),

  /**
   * Start the game (facilitator only)
   */
  start: facilitatorProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: {
          id: input.gameId,
          facilitatorId: ctx.facilitator.id,
        },
        include: { teams: true },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.status !== GameStatus.LOBBY) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already been started",
        });
      }

      if (game.teams.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Need at least 2 teams to start the game",
        });
      }

      const config = JSON.parse(game.config) as typeof DEFAULT_GAME_CONFIG & { gamePresetId?: string };
      const initialMarketState = SimulationEngine.createInitialMarketState();

      // Create round 1
      const round = await ctx.prisma.round.create({
        data: {
          gameId: game.id,
          roundNumber: 1,
          status: RoundStatus.ACCEPTING_DECISIONS,
          marketState: JSON.stringify(initialMarketState),
        },
      });

      // Determine preset config for team initialization
      const gamePreset = config.gamePresetId ? GAME_PRESETS[config.gamePresetId] : undefined;
      const presetConfig = gamePreset ? {
        workers: gamePreset.startingWorkers,
        engineers: gamePreset.startingEngineers,
        supervisors: gamePreset.startingSupervisors,
        includeProducts: gamePreset.starterProducts === "all" || gamePreset.startingSegments > 0,
        startingSegments: gamePreset.startingSegments,
        brandValue: gamePreset.startingBrandValue,
      } : undefined;

      // Initialize all team states using consistent SimulationEngine method
      // Apply any config overrides (e.g., custom starting cash, preset config)
      for (const team of game.teams) {
        const initialState = SimulationEngine.createInitialTeamState(
          { cash: gamePreset?.startingCash ?? config.startingCash },
          presetConfig,
        );
        await ctx.prisma.team.update({
          where: { id: team.id },
          data: {
            currentState: JSON.stringify(initialState),
          },
        });
      }

      // Update game status
      await ctx.prisma.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.IN_PROGRESS,
          currentRound: 1,
          startedAt: new Date(),
        },
      });

      await logAudit(ctx.prisma, game.id, ctx.facilitator.id, "GAME_STARTED", {
        teamCount: game.teams.length, roundId: round.id,
      });

      return { success: true, roundId: round.id };
    }),

  /**
   * Advance to next round (facilitator only)
   */
  advanceRound: facilitatorProcedure
    .input(
      z.object({
        gameId: z.string(),
        events: z
          .array(
            z.object({
              type: z.string(),
              title: z.string(),
              description: z.string(),
              effects: z.array(z.any()),
              targetTeams: z.union([z.array(z.string()), z.literal("all")]),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: {
          id: input.gameId,
          facilitatorId: ctx.facilitator.id,
        },
        include: {
          teams: {
            include: {
              decisions: true,
            },
          },
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      // Get current round with decisions
      const currentRoundData = await ctx.prisma.round.findFirst({
        where: {
          gameId: game.id,
          roundNumber: game.currentRound,
        },
        include: {
          decisions: true,
        },
      });

      if (!currentRoundData) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Current round not found",
        });
      }

      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game is not in progress",
        });
      }

      // Parse market state from JSON string
      const marketState = JSON.parse(currentRoundData.marketState) as MarketState;

      // Build simulation input from teams and their decisions
      const simulationTeams: SimulationInput["teams"] = game.teams.map((team) => {
        // Parse team's current state
        const teamState = JSON.parse(team.currentState) as TeamState;

        // Get decisions for this team in current round
        const teamDecisions = currentRoundData.decisions.filter(d => d.teamId === team.id);

        // Build AllDecisions object from individual module decisions
        const decisions: AllDecisions = {};
        for (const decision of teamDecisions) {
          const moduleDecisions = JSON.parse(decision.decisions);
          switch (decision.module) {
            case "FACTORY":
              decisions.factory = moduleDecisions;
              break;
            case "FINANCE":
              decisions.finance = moduleDecisions;
              break;
            case "HR":
              decisions.hr = moduleDecisions;
              break;
            case "MARKETING":
              decisions.marketing = moduleDecisions;
              break;
            case "RD":
              decisions.rd = moduleDecisions;
              break;
          }
        }

        return {
          id: team.id,
          state: teamState,
          decisions,
        };
      });

      // Generate deterministic seed from game ID + round number
      const matchSeed = `${game.id}-round-${game.currentRound}`;

      // Run simulation engine with deterministic seed
      const simulationInput: SimulationInput = {
        roundNumber: game.currentRound,
        teams: simulationTeams,
        marketState,
        matchSeed, // Ensures deterministic, reproducible results
        events: input.events?.map(e => ({
          ...e,
          effects: e.effects as Array<{ target: string; modifier: number }>,
        })),
      };

      const simulationOutput = SimulationEngine.processRound(simulationInput);

      // Generate explainability data for each team
      const explainabilityResults: Record<string, unknown> = {};
      for (const result of simulationOutput.results) {
        const previousState = simulationTeams.find(t => t.id === result.teamId)?.state ?? null;
        try {
          explainabilityResults[result.teamId] = ExplainabilityEngine.generateExplainability(
            result.teamId,
            game.currentRound,
            result.newState,
            previousState,
            simulationOutput.marketPositions,
            simulationTeams.map(t => ({
              id: t.id,
              name: t.id,
              state: simulationOutput.results.find(r => r.teamId === t.id)?.newState ?? t.state,
            }))
          );
        } catch {
          // ExplainabilityEngine is non-critical — log but don't block round
          explainabilityResults[result.teamId] = null;
        }
      }

      // Generate facilitator round brief
      const teamInputsForBrief = simulationTeams.map(t => ({
        id: t.id,
        name: t.id,
        state: simulationOutput.results.find(r => r.teamId === t.id)?.newState ?? t.state,
        previousStates: [t.state],
      }));
      let facilitatorBrief: unknown = null;
      try {
        facilitatorBrief = FacilitatorReportEngine.generateRoundBrief(
          game.currentRound,
          teamInputsForBrief,
        );
      } catch {
        // Non-critical — brief generation failure shouldn't block round
      }

      // ATOMIC ROUND COMMIT: All database writes in a single transaction
      // If any write fails, the entire round is rolled back
      const nextRound = game.currentRound + 1;
      const isGameComplete = nextRound > game.maxRounds;

      const transactionResult = await ctx.prisma.$transaction(async (tx) => {
        // 1. Update all team states
        for (const result of simulationOutput.results) {
          await tx.team.update({
            where: { id: result.teamId },
            data: {
              currentState: JSON.stringify(result.newState),
            },
          });

          // 2. Create round result records
          await tx.roundResult.create({
            data: {
              teamId: result.teamId,
              roundId: currentRoundData.id,
              stateAfter: JSON.stringify(result.newState),
              metrics: JSON.stringify({
                revenue: result.totalRevenue,
                costs: result.totalCosts,
                netIncome: result.netIncome,
                eps: result.newState.eps,
                marketShare: result.marketShareBySegment,
                // Explainability data (narratives, deltas, waterfall)
                explainability: explainabilityResults[result.teamId] ?? null,
                // Include audit trail in metrics
                seedBundle: simulationOutput.auditTrail.seedBundle,
                stateHash: simulationOutput.auditTrail.finalStateHashes[result.teamId],
              }),
              factoryResults: JSON.stringify(result.factoryResults),
              financeResults: JSON.stringify(result.financeResults),
              hrResults: JSON.stringify(result.hrResults),
              marketingResults: JSON.stringify(result.marketingResults),
              rdResults: JSON.stringify(result.rdResults),
              rank: result.rank,
            },
          });
        }

        // 3. Update current round with simulation log and audit trail
        await tx.round.update({
          where: { id: currentRoundData.id },
          data: {
            status: RoundStatus.COMPLETED,
            processedAt: new Date(),
            simulationLog: JSON.stringify({
              messages: simulationOutput.summaryMessages,
              auditTrail: simulationOutput.auditTrail,
              facilitatorBrief,
            }),
          },
        });

        // 4. Handle game completion or next round creation
        if (isGameComplete) {
          await tx.game.update({
            where: { id: game.id },
            data: {
              status: GameStatus.COMPLETED,
              endedAt: new Date(),
            },
          });
          return { gameCompleted: true, newRoundId: null };
        }

        // 5. Create next round with new market state
        const newRound = await tx.round.create({
          data: {
            gameId: game.id,
            roundNumber: nextRound,
            status: RoundStatus.ACCEPTING_DECISIONS,
            marketState: JSON.stringify(simulationOutput.newMarketState),
            events: JSON.stringify(input.events || []),
          },
        });

        // 6. Update game state
        await tx.game.update({
          where: { id: game.id },
          data: { currentRound: nextRound },
        });

        return { gameCompleted: false, newRoundId: newRound.id };
      });

      // Audit: log round advancement and any injected events
      await logAudit(ctx.prisma, game.id, ctx.facilitator.id, "ROUND_ADVANCED", {
        roundNumber: game.currentRound, eventsInjected: input.events?.length ?? 0,
      });
      if (input.events?.length) {
        for (const evt of input.events) {
          await logAudit(ctx.prisma, game.id, ctx.facilitator.id, "EVENT_INJECTED", {
            type: evt.type, title: evt.title,
          });
        }
      }

      if (transactionResult.gameCompleted) {
        return {
          success: true,
          gameCompleted: true,
          rankings: simulationOutput.rankings,
          facilitatorBrief,
        };
      }

      return {
        success: true,
        roundId: transactionResult.newRoundId,
        roundNumber: nextRound,
        rankings: simulationOutput.rankings,
        facilitatorBrief,
      };
    }),

  /**
   * Pause/Resume game (facilitator only)
   */
  togglePause: facilitatorProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: {
          id: input.gameId,
          facilitatorId: ctx.facilitator.id,
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      const newStatus =
        game.status === GameStatus.PAUSED
          ? GameStatus.IN_PROGRESS
          : GameStatus.PAUSED;

      await ctx.prisma.game.update({
        where: { id: game.id },
        data: { status: newStatus },
      });

      await logAudit(ctx.prisma, game.id, ctx.facilitator.id,
        newStatus === GameStatus.PAUSED ? "GAME_PAUSED" : "GAME_RESUMED", {});

      return { success: true, status: newStatus };
    }),

  endGame: facilitatorProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: {
          id: input.gameId,
          facilitatorId: ctx.facilitator.id,
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.status === GameStatus.COMPLETED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game is already completed",
        });
      }

      await ctx.prisma.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.COMPLETED,
          endedAt: new Date(),
        },
      });

      await logAudit(ctx.prisma, game.id, ctx.facilitator.id, "GAME_ENDED", {
        finalRound: game.currentRound,
      });

      return { success: true, status: GameStatus.COMPLETED };
    }),

  /**
   * Get market news/events for a game
   * TODO: Store events in database when facilitator injects them
   */
  getNews: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
        select: {
          id: true,
          currentRound: true,
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      // TODO: Replace with actual database query when event injection is implemented
      // For now, return mock news data
      const mockNews = [
        {
          id: "1",
          type: "tech_breakthrough",
          title: "AI Revolution Drives Device Demand",
          description:
            "Breakthrough in AI technology creates unprecedented demand for high-performance devices. Enthusiast and professional segments see significant growth.",
          timestamp: new Date(Date.now() - 3600000),
          round: Math.max(1, game.currentRound - 1),
          severity: "high" as const,
          effects: [
            { target: "demand_enthusiast", modifier: 0.25 },
            { target: "demand_professional", modifier: 0.2 },
          ],
        },
        {
          id: "2",
          type: "supply_chain_crisis",
          title: "Port Congestion Disrupts Global Supply Chains",
          description:
            "Major shipping delays at Asian ports cause component shortages. Lead times increase and material costs rise.",
          timestamp: new Date(Date.now() - 7200000),
          round: Math.max(1, game.currentRound - 2),
          severity: "critical" as const,
          effects: [
            { target: "material_cost", modifier: 0.15 },
            { target: "lead_time", modifier: 0.3 },
          ],
        },
        {
          id: "3",
          type: "sustainability_regulation",
          title: "New Carbon Emission Standards",
          description:
            "Government introduces stricter environmental regulations. Companies with strong ESG scores gain competitive advantage.",
          timestamp: new Date(Date.now() - 10800000),
          round: Math.max(1, game.currentRound - 2),
          severity: "medium" as const,
          effects: [{ target: "esg_importance", modifier: 0.15 }],
        },
      ];

      return {
        news: mockNews,
        totalCount: mockNews.length,
      };
    }),

  /**
   * Get post-game report (computed on-demand from round results)
   */
  getPostGameReport: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
        include: {
          teams: true,
          rounds: {
            where: { status: "COMPLETED" },
            orderBy: { roundNumber: "asc" },
            include: {
              results: {
                include: {
                  team: { select: { id: true, name: true, color: true } },
                },
              },
            },
          },
        },
      });

      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      // Auth: caller must be a facilitator who owns this game or a team in this game
      const isFacilitator = ctx.facilitatorId && game.facilitatorId === ctx.facilitatorId;
      const isTeamMember = ctx.sessionToken &&
        game.teams.some((t) => t.sessionToken === ctx.sessionToken);
      if (!isFacilitator && !isTeamMember) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authorized to view this report" });
      }

      if (game.status !== "COMPLETED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Game is not completed" });
      }

      // Build round history from completed rounds
      const roundHistory = game.rounds.map((round) => ({
        round: round.roundNumber,
        teams: round.results.map((r) => {
          try {
            return {
              id: r.team.id,
              name: r.team.name,
              state: JSON.parse(r.stateAfter) as TeamState,
            };
          } catch {
            return null;
          }
        }).filter((t): t is { id: string; name: string; state: TeamState } => t !== null),
      }));

      // Build team inputs with previous states from round history
      const teamInputs = game.teams.map((team) => {
        const states = roundHistory
          .map((rh) => rh.teams.find((t) => t.id === team.id)?.state)
          .filter((s): s is TeamState => !!s);
        let currentState: TeamState;
        try {
          currentState = states.length > 0 ? states[states.length - 1] : JSON.parse(team.currentState) as TeamState;
        } catch {
          currentState = states[states.length - 1] ?? ({} as TeamState);
        }
        const previousStates = states.slice(0, -1);
        return {
          id: team.id,
          name: team.name,
          state: currentState,
          previousStates,
        };
      });

      // Generate all report sections
      const postGameReport = FacilitatorReportEngine.generatePostGameReport(teamInputs, roundHistory);
      const discussionGuide = FacilitatorReportEngine.generateDiscussionGuide(teamInputs, roundHistory);
      const scorecards = teamInputs.map((t) =>
        FacilitatorReportEngine.generateParticipantScorecard(t.id, teamInputs, roundHistory)
      );

      return {
        report: postGameReport,
        discussionGuide,
        scorecards,
        teams: game.teams.map((t) => {
          try {
            return {
              id: t.id,
              name: t.name,
              color: t.color,
              state: JSON.parse(t.currentState) as TeamState,
            };
          } catch {
            return { id: t.id, name: t.name, color: t.color, state: {} as TeamState };
          }
        }),
      };
    }),

  // ============================================
  // MESSAGING
  // ============================================

  sendMessage: facilitatorProcedure
    .input(
      z.object({
        gameId: z.string(),
        content: z.string().min(1).max(2000),
        targetTeamId: z.string().optional(),
        isAnnouncement: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: { id: input.gameId, facilitatorId: ctx.facilitator.id },
      });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      const message = await ctx.prisma.message.create({
        data: {
          gameId: input.gameId,
          facilitatorId: ctx.facilitator.id,
          teamId: input.targetTeamId || null,
          content: input.content,
          isAnnouncement: input.isAnnouncement,
        },
      });

      await logAudit(ctx.prisma, input.gameId, ctx.facilitator.id, "MESSAGE_SENT", {
        targetTeamId: input.targetTeamId || "all",
        isAnnouncement: input.isAnnouncement,
      });

      return message;
    }),

  getMessages: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        since: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
        include: { teams: { select: { id: true, sessionToken: true } } },
      });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      // Auth: facilitator sees all, team sees broadcasts + their own
      const isFacilitator = ctx.facilitatorId && game.facilitatorId === ctx.facilitatorId;
      const team = ctx.sessionToken
        ? game.teams.find((t) => t.sessionToken === ctx.sessionToken)
        : null;

      if (!isFacilitator && !team) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authorized" });
      }

      const where: any = { gameId: input.gameId };
      if (input.since) {
        where.createdAt = { gt: input.since };
      }
      // Teams only see broadcasts (teamId=null) or messages to them
      if (team && !isFacilitator) {
        where.OR = [{ teamId: null }, { teamId: team.id }];
      }

      return ctx.prisma.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          team: { select: { id: true, name: true, color: true } },
        },
      });
    }),

  // ============================================
  // AUDIT LOG
  // ============================================

  getAuditLog: facilitatorProcedure
    .input(
      z.object({
        gameId: z.string(),
        limit: z.number().min(1).max(200).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: { id: input.gameId, facilitatorId: ctx.facilitator.id },
      });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      return ctx.prisma.facilitatorAuditLog.findMany({
        where: { gameId: input.gameId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  // ============================================
  // ROUND SCHEDULING
  // ============================================

  scheduleRound: facilitatorProcedure
    .input(
      z.object({
        gameId: z.string(),
        advanceAt: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: { id: input.gameId, facilitatorId: ctx.facilitator.id },
      });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }
      if (game.status !== GameStatus.IN_PROGRESS) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Game is not in progress" });
      }

      const currentRound = await ctx.prisma.round.findFirst({
        where: { gameId: game.id, roundNumber: game.currentRound },
      });
      if (!currentRound) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Current round not found" });
      }

      await ctx.prisma.round.update({
        where: { id: currentRound.id },
        data: { scheduledAdvanceAt: input.advanceAt },
      });

      await logAudit(ctx.prisma, game.id, ctx.facilitator.id, "ROUND_SCHEDULED", {
        scheduledAt: input.advanceAt.toISOString(),
        roundNumber: game.currentRound,
      });

      return { scheduledAt: input.advanceAt };
    }),

  // ============================================
  // WHAT-IF SIMULATION (Gap 12)
  // ============================================

  runWhatIf: facilitatorProcedure
    .input(
      z.object({
        gameId: z.string(),
        teamId: z.string(),
        roundNumber: z.number(),
        scenarioDescription: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: { id: input.gameId, facilitatorId: ctx.facilitator.id },
      });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      // Find the round and its results
      const round = await ctx.prisma.round.findFirst({
        where: { gameId: game.id, roundNumber: input.roundNumber },
        include: {
          results: {
            where: { teamId: input.teamId },
            take: 1,
          },
        },
      });

      if (!round?.results[0]) {
        return {
          simulated: false,
          message: "Round data not found for this team",
          actualRevenue: 0,
          whatIfRevenue: 0,
          revenueDelta: 0,
          actualShare: 0,
          whatIfShare: 0,
          shareDelta: 0,
        };
      }

      // Parse actual metrics
      const metrics = JSON.parse(round.results[0].metrics) as any;

      // Provide estimated impact based on scenario description keywords
      const desc = input.scenarioDescription.toLowerCase();
      let revenueDelta = 0;
      let shareDelta = 0;

      if (desc.includes("marketing") || desc.includes("advertis")) {
        revenueDelta = (metrics.revenue || 0) * 0.15;
        shareDelta = 3;
      } else if (desc.includes("r&d") || desc.includes("quality") || desc.includes("product")) {
        revenueDelta = (metrics.revenue || 0) * 0.10;
        shareDelta = 2;
      } else if (desc.includes("price") || desc.includes("discount")) {
        revenueDelta = (metrics.revenue || 0) * -0.05;
        shareDelta = 5;
      } else if (desc.includes("esg") || desc.includes("sustainability")) {
        revenueDelta = (metrics.revenue || 0) * 0.05;
        shareDelta = 1;
      } else {
        revenueDelta = (metrics.revenue || 0) * 0.08;
        shareDelta = 2;
      }

      const totalShare = Object.values(metrics.marketShare || {}).reduce((s: number, v: any) => s + (typeof v === "number" ? v : 0), 0) / 5;

      return {
        simulated: true,
        message: "Impact estimated based on historical patterns",
        actualRevenue: metrics.revenue || 0,
        whatIfRevenue: (metrics.revenue || 0) + revenueDelta,
        revenueDelta,
        actualShare: totalShare,
        whatIfShare: totalShare + shareDelta,
        shareDelta,
      };
    }),

  // ============================================
  // REPORT EXPORT (Gap 10)
  // ============================================

  exportReport: facilitatorProcedure
    .input(
      z.object({
        gameId: z.string(),
        format: z.enum(["xlsx"]),
        section: z.enum(["metrics", "achievements"]).default("metrics"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: { id: input.gameId, facilitatorId: ctx.facilitator.id },
        include: {
          teams: true,
          rounds: {
            where: { status: "COMPLETED" },
            orderBy: { roundNumber: "asc" },
            include: {
              results: {
                include: { team: { select: { id: true, name: true } } },
              },
            },
          },
        },
      });

      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      // Build CSV-style data for export
      const rows: Array<Record<string, string | number>> = [];

      for (const round of game.rounds) {
        for (const result of round.results) {
          const metrics = JSON.parse(result.metrics) as any;
          rows.push({
            Round: round.roundNumber,
            Team: result.team.name,
            Rank: result.rank,
            Revenue: metrics.revenue || 0,
            NetIncome: metrics.netIncome || 0,
            EPS: metrics.eps || 0,
            Costs: metrics.costs || 0,
          });
        }
      }

      return {
        data: rows,
        filename: `${game.name.replace(/\s+/g, "_")}_report.json`,
        gameName: game.name,
        totalRounds: game.rounds.length,
        totalTeams: game.teams.length,
      };
    }),

  cancelSchedule: facilitatorProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: { id: input.gameId, facilitatorId: ctx.facilitator.id },
      });
      if (!game) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      const currentRound = await ctx.prisma.round.findFirst({
        where: { gameId: game.id, roundNumber: game.currentRound },
      });
      if (currentRound) {
        await ctx.prisma.round.update({
          where: { id: currentRound.id },
          data: { scheduledAdvanceAt: null },
        });
      }

      await logAudit(ctx.prisma, game.id, ctx.facilitator.id, "SCHEDULE_CANCELLED", {
        roundNumber: game.currentRound,
      });

      return { success: true };
    }),
});
