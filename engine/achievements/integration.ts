/**
 * Achievement System Integration
 *
 * Bridges the SimulationEngine with the LedgerEngine (Ledger of Legends & Losers).
 * Provides utilities for checking achievements after round processing.
 */

import type { TeamState } from "../types/state";
import type { RoundResults } from "../types/results";
import type { DifficultyLevel } from "../config/schema";
import {
  ExtendedAchievementEngine,
  AchievementContext,
} from "./LedgerEngine";
import type {
  ExtendedAchievementState,
  ExtendedAchievementResult,
} from "./types";

/**
 * Context accumulated across rounds for achievement tracking
 */
export interface AccumulatedAchievementContext {
  roundsWithProfit: number;
  roundsWithLoss: number;
  consecutiveGrowthRounds: number;
  consecutiveProfitRounds: number;
  eventsWeathered: string[];
  productsLaunched: number;
  productsCancelled: number;
  patentsFiled: number;
  upgradesPurchased: string[];
  dashboardViews: number;
  routeComparisons: number;
  costCalculatorUses: number;
  newsEventsRead: number;
  tabsViewed: Set<string>;
  previousRevenue: number;
  previousRanking: number;
  neverBankrupt: boolean;
}

/**
 * Initialize accumulated context for a new game
 */
export function initializeAccumulatedContext(): AccumulatedAchievementContext {
  return {
    roundsWithProfit: 0,
    roundsWithLoss: 0,
    consecutiveGrowthRounds: 0,
    consecutiveProfitRounds: 0,
    eventsWeathered: [],
    productsLaunched: 0,
    productsCancelled: 0,
    patentsFiled: 0,
    upgradesPurchased: [],
    dashboardViews: 0,
    routeComparisons: 0,
    costCalculatorUses: 0,
    newsEventsRead: 0,
    tabsViewed: new Set(),
    previousRevenue: 0,
    previousRanking: 999,
    neverBankrupt: true,
  };
}

/**
 * Update accumulated context after a round
 */
export function updateAccumulatedContext(
  context: AccumulatedAchievementContext,
  currentState: TeamState,
  previousState: TeamState | undefined,
  roundResult: RoundResults
): AccumulatedAchievementContext {
  const updated = { ...context };

  // Track profit/loss rounds
  if ((currentState.netIncome ?? 0) > 0) {
    updated.roundsWithProfit++;
    updated.consecutiveProfitRounds++;
    updated.roundsWithLoss = 0; // Reset consecutive losses
  } else {
    updated.roundsWithLoss++;
    updated.consecutiveProfitRounds = 0; // Reset consecutive profits
  }

  // Track revenue growth
  if (previousState && currentState.revenue > (previousState.revenue ?? 0)) {
    updated.consecutiveGrowthRounds++;
  } else {
    updated.consecutiveGrowthRounds = 0;
  }

  // Track bankruptcy
  if (currentState.cash < 0) {
    updated.neverBankrupt = false;
  }

  // Track previous values for next round
  updated.previousRevenue = currentState.revenue;
  updated.previousRanking = roundResult.rank;

  return updated;
}

/**
 * Check achievements for a team after round processing
 */
export function checkTeamAchievements(
  currentState: TeamState,
  previousState: TeamState | undefined,
  roundResult: RoundResults,
  previousAchievementState: ExtendedAchievementState | null,
  accumulatedContext: AccumulatedAchievementContext,
  options: {
    roundNumber: number;
    difficulty: DifficultyLevel;
    teamRanking: number;
    totalTeams: number;
    teamRankings?: AchievementContext["teamRankings"];
    gameCompleted?: boolean;
  }
): ExtendedAchievementResult {
  const context: AchievementContext = {
    state: currentState,
    previousState,
    roundNumber: options.roundNumber,
    difficulty: options.difficulty,
    teamRanking: options.teamRanking,
    totalTeams: options.totalTeams,
    teamRankings: options.teamRankings,

    // Accumulated context
    roundsWithProfit: accumulatedContext.roundsWithProfit,
    roundsWithLoss: accumulatedContext.roundsWithLoss,
    consecutiveGrowthRounds: accumulatedContext.consecutiveGrowthRounds,
    eventsWeathered: accumulatedContext.eventsWeathered,
    productsLaunched: accumulatedContext.productsLaunched,
    productsCancelled: accumulatedContext.productsCancelled,
    patentsFiled: accumulatedContext.patentsFiled,
    upgradesPurchased: accumulatedContext.upgradesPurchased,

    // UI interaction tracking (optional)
    dashboardViews: accumulatedContext.dashboardViews,
    routeComparisons: accumulatedContext.routeComparisons,
    costCalculatorUses: accumulatedContext.costCalculatorUses,
    newsEventsRead: accumulatedContext.newsEventsRead,
    tabsViewed: accumulatedContext.tabsViewed,

    // Game state
    gameCompleted: options.gameCompleted,
    finalRanking: options.gameCompleted ? options.teamRanking : undefined,
  };

  return ExtendedAchievementEngine.checkAchievements(context, previousAchievementState);
}

/**
 * Process achievements for all teams after a round
 */
export function processRoundAchievements(
  roundResults: RoundResults[],
  previousStates: Map<string, TeamState>,
  previousAchievementStates: Map<string, ExtendedAchievementState>,
  accumulatedContexts: Map<string, AccumulatedAchievementContext>,
  options: {
    roundNumber: number;
    difficulty: DifficultyLevel;
    gameCompleted?: boolean;
  }
): Map<string, { result: ExtendedAchievementResult; updatedContext: AccumulatedAchievementContext }> {
  const results = new Map<string, { result: ExtendedAchievementResult; updatedContext: AccumulatedAchievementContext }>();
  const totalTeams = roundResults.length;

  // Calculate team rankings for comparison achievements
  const teamRankings = new Map<string, AchievementContext["teamRankings"]>();

  for (const roundResult of roundResults) {
    const rankings: AchievementContext["teamRankings"] = {
      revenue: roundResult.rank, // Simplified - would need actual revenue ranking
      netIncome: roundResult.rank,
      marketShare: roundResult.marketShareRank,
    };
    teamRankings.set(roundResult.teamId, rankings);
  }

  // Process each team
  for (const roundResult of roundResults) {
    const teamId = roundResult.teamId;
    const currentState = roundResult.newState;
    const previousState = previousStates.get(teamId);
    const previousAchievementState = previousAchievementStates.get(teamId) ?? null;
    let accumulatedContext = accumulatedContexts.get(teamId) ?? initializeAccumulatedContext();

    // Update accumulated context
    accumulatedContext = updateAccumulatedContext(
      accumulatedContext,
      currentState,
      previousState,
      roundResult
    );

    // Check achievements
    const achievementResult = checkTeamAchievements(
      currentState,
      previousState,
      roundResult,
      previousAchievementState,
      accumulatedContext,
      {
        roundNumber: options.roundNumber,
        difficulty: options.difficulty,
        teamRanking: roundResult.rank,
        totalTeams,
        teamRankings: teamRankings.get(teamId),
        gameCompleted: options.gameCompleted,
      }
    );

    results.set(teamId, {
      result: achievementResult,
      updatedContext: accumulatedContext,
    });
  }

  return results;
}

/**
 * Serialize accumulated context for storage
 */
export function serializeAccumulatedContext(context: AccumulatedAchievementContext): string {
  return JSON.stringify({
    ...context,
    tabsViewed: Array.from(context.tabsViewed),
  });
}

/**
 * Deserialize accumulated context from storage
 */
export function deserializeAccumulatedContext(json: string): AccumulatedAchievementContext {
  const parsed = JSON.parse(json);
  return {
    ...parsed,
    tabsViewed: new Set(parsed.tabsViewed || []),
  };
}

export default {
  initializeAccumulatedContext,
  updateAccumulatedContext,
  checkTeamAchievements,
  processRoundAchievements,
  serializeAccumulatedContext,
  deserializeAccumulatedContext,
};
