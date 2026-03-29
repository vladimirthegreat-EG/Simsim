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
        includeProducts: gamePreset.starterProducts === "all" || gamePreset.startingSegments > 0,
        startingSegments: gamePreset.startingSegments,
        brandValue: gamePreset.startingBrandValue,
        starterMachines: gamePreset.starterMachines,
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
                marketShare: result.marketShareBySegment, // Per-segment Record
                marketShareOverall: (() => { // Weighted average for display
                  const shares = result.marketShareBySegment;
                  if (!shares || typeof shares !== 'object') return 0;
                  const values = Object.values(shares as Record<string, number>).filter(v => typeof v === 'number' && isFinite(v));
                  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                })(),
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

      return { success: true, status: GameStatus.COMPLETED };
    }),

  /**
   * Get market news/events for a game
   * Reads facilitator-injected events from Round.events field in database
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

      // Read real events from database (Round.events field — injected by facilitator)
      const rounds = await ctx.prisma.round.findMany({
        where: { gameId: input.gameId },
        select: { roundNumber: true, events: true },
        orderBy: { roundNumber: "desc" },
        take: 5, // Last 5 rounds of events
      });

      const allEvents: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        timestamp: Date;
        round: number;
        severity: string;
        effects: Record<string, number>;
      }> = [];

      for (const round of rounds) {
        try {
          const events = typeof round.events === "string"
            ? JSON.parse(round.events)
            : round.events;
          if (Array.isArray(events)) {
            for (let i = 0; i < events.length; i++) {
              const evt = events[i];
              // Normalize effects: array of {target, modifier} → Record<string, number>
              const effects: Record<string, number> = {};
              if (Array.isArray(evt.effects)) {
                for (const eff of evt.effects) {
                  effects[eff.target ?? eff.key ?? "unknown"] = eff.modifier ?? eff.value ?? 0;
                }
              } else if (evt.effects && typeof evt.effects === "object") {
                Object.assign(effects, evt.effects);
              }

              allEvents.push({
                id: evt.id ?? `round-${round.roundNumber}-evt-${i}`,
                type: evt.type ?? "market_event",
                title: evt.title ?? evt.name ?? "Market Event",
                description: evt.description ?? "",
                timestamp: evt.timestamp ? new Date(evt.timestamp) : new Date(),
                round: round.roundNumber,
                severity: evt.severity ?? "medium",
                effects,
              });
            }
          }
        } catch {
          // Skip rounds with unparseable events
        }
      }

      return {
        news: allEvents,
        totalCount: allEvents.length,
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
        return null;
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
});
