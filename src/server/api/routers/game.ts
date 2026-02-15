import { z } from "zod";
import { createTRPCRouter, publicProcedure, facilitatorProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { SimulationEngine, type SimulationInput } from "@/engine/core/SimulationEngine";
import type { TeamState, MarketState, AllDecisions, ComplexityPreset } from "@/engine/types";
import { COMPLEXITY_PRESETS } from "@/engine/types";
import { GAME_PRESETS, type GamePreset } from "@/engine/config/gamePresets";
import { GameStatus, RoundStatus } from "../shared/constants";

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
        includeProducts: gamePreset.starterProducts === "all",
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

      if (transactionResult.gameCompleted) {
        return {
          success: true,
          gameCompleted: true,
          rankings: simulationOutput.rankings,
        };
      }

      return {
        success: true,
        roundId: transactionResult.newRoundId,
        roundNumber: nextRound,
        rankings: simulationOutput.rankings,
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

      return { success: true, status: newStatus };
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
});
