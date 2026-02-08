/**
 * Balance Harness - Monte Carlo simulation framework for balance testing
 *
 * This module provides tools for:
 * - Running thousands of deterministic simulations
 * - Comparing strategy outcomes
 * - Measuring balance and fairness
 * - Detecting dominant strategies
 *
 * NON-NEGOTIABLE: All balance changes must be validated through this harness.
 */

import { SimulationEngine, type SimulationInput, type SimulationOutput } from "../core/SimulationEngine";
import type { TeamState, MarketState, AllDecisions } from "../types";
import { deriveSeedBundle } from "../core/EngineContext";
import type { StrategyArchetype, StrategyDecisionMaker, StrategyResult } from "./strategies";
import type { BalanceMetrics, DiversityIndex } from "./metrics";

// ============================================
// HARNESS CONFIGURATION
// ============================================

export interface HarnessConfig {
  /** Number of simulations to run (500-10000 recommended) */
  simulations: number;
  /** Number of rounds per simulation */
  rounds: number;
  /** Number of teams per simulation */
  teamCount: number;
  /** Fixed seed for reproducibility (null = random seeds) */
  baseSeed?: string;
  /** Whether to apply rubber-banding */
  rubberBanding: boolean;
  /** Market volatility level (0-1) */
  marketVolatility: number;
  /** Enable verbose logging */
  verbose: boolean;
}

export const DEFAULT_HARNESS_CONFIG: HarnessConfig = {
  simulations: 500,
  rounds: 8,
  teamCount: 4,
  baseSeed: "balance-test",
  rubberBanding: true,
  marketVolatility: 0.5,
  verbose: false,
};

// ============================================
// SIMULATION RESULT TYPES
// ============================================

export interface SimulationRun {
  /** Seed used for this run */
  seed: string;
  /** Results for each team */
  teamResults: TeamRunResult[];
  /** Winner of this run */
  winnerId: string;
  /** Winner's strategy archetype */
  winnerArchetype: StrategyArchetype;
  /** Round-by-round data */
  roundData: RoundData[];
  /** Final rankings */
  rankings: Array<{ teamId: string; rank: number; archetype: StrategyArchetype }>;
}

export interface TeamRunResult {
  teamId: string;
  archetype: StrategyArchetype;
  finalState: TeamState;
  finalRank: number;
  /** Metrics across all rounds */
  metrics: {
    totalRevenue: number;
    totalNetIncome: number;
    averageMarketShare: number;
    peakCash: number;
    minCash: number;
    wentBankrupt: boolean;
    bankruptcyRound?: number;
  };
}

export interface RoundData {
  roundNumber: number;
  teamStates: Record<string, TeamState>;
  marketState: MarketState;
}

// ============================================
// HARNESS OUTPUT
// ============================================

export interface HarnessOutput {
  /** Configuration used */
  config: HarnessConfig;
  /** All simulation runs */
  runs: SimulationRun[];
  /** Aggregated metrics */
  metrics: BalanceMetrics;
  /** Strategy diversity analysis */
  diversity: DiversityIndex;
  /** Summary statistics */
  summary: {
    totalSimulations: number;
    totalRounds: number;
    winsByArchetype: Record<StrategyArchetype, number>;
    winRateByArchetype: Record<StrategyArchetype, number>;
    averageRevenueByArchetype: Record<StrategyArchetype, number>;
    bankruptcyRateByArchetype: Record<StrategyArchetype, number>;
  };
  /** Warnings and issues detected */
  warnings: string[];
}

// ============================================
// BALANCE HARNESS
// ============================================

export class BalanceHarness {
  private config: HarnessConfig;
  private strategies: Map<string, StrategyDecisionMaker>;

  constructor(config: Partial<HarnessConfig> = {}) {
    this.config = { ...DEFAULT_HARNESS_CONFIG, ...config };
    this.strategies = new Map();
  }

  /**
   * Register a strategy for testing
   */
  registerStrategy(id: string, strategy: StrategyDecisionMaker): void {
    this.strategies.set(id, strategy);
  }

  /**
   * Run the full balance test suite
   */
  run(strategyAssignments: Array<{ teamId: string; archetype: StrategyArchetype }>): HarnessOutput {
    const runs: SimulationRun[] = [];
    const warnings: string[] = [];

    if (this.config.verbose) {
      console.log(`Starting balance harness: ${this.config.simulations} simulations`);
    }

    // Run simulations
    for (let i = 0; i < this.config.simulations; i++) {
      const seed = this.config.baseSeed
        ? `${this.config.baseSeed}-sim-${i}`
        : `random-${Date.now()}-${i}`;

      const run = this.runSingleSimulation(seed, strategyAssignments);
      runs.push(run);

      if (this.config.verbose && i % 100 === 0) {
        console.log(`Completed ${i + 1}/${this.config.simulations} simulations`);
      }
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(runs);
    const diversity = this.calculateDiversity(runs, strategyAssignments);
    const summary = this.calculateSummary(runs, strategyAssignments);

    // Check for issues
    this.checkForIssues(summary, diversity, warnings);

    return {
      config: this.config,
      runs,
      metrics,
      diversity,
      summary,
      warnings,
    };
  }

  /**
   * Run a single simulation with given seed and strategies
   */
  private runSingleSimulation(
    seed: string,
    strategyAssignments: Array<{ teamId: string; archetype: StrategyArchetype }>
  ): SimulationRun {
    // Initialize teams
    const teams: Array<{
      id: string;
      state: TeamState;
      archetype: StrategyArchetype;
      strategy: StrategyDecisionMaker;
    }> = [];

    for (const assignment of strategyAssignments) {
      const strategy = this.strategies.get(assignment.archetype);
      if (!strategy) {
        throw new Error(`Strategy not registered: ${assignment.archetype}`);
      }

      teams.push({
        id: assignment.teamId,
        state: SimulationEngine.createInitialTeamState(),
        archetype: assignment.archetype,
        strategy,
      });
    }

    // Initialize market
    let marketState = SimulationEngine.createInitialMarketState();
    const roundData: RoundData[] = [];

    // Run rounds
    for (let round = 1; round <= this.config.rounds; round++) {
      // Get decisions from each strategy
      const teamsWithDecisions = teams.map(team => ({
        id: team.id,
        state: team.state,
        decisions: team.strategy(team.state, marketState, round),
      }));

      // Build simulation input
      const input: SimulationInput = {
        roundNumber: round,
        teams: teamsWithDecisions,
        marketState,
        matchSeed: `${seed}-round-${round}`,
      };

      // Run simulation
      const output = SimulationEngine.processRound(input);

      // Update team states
      for (const result of output.results) {
        const team = teams.find(t => t.id === result.teamId);
        if (team) {
          team.state = result.newState;
        }
      }

      // Record round data
      roundData.push({
        roundNumber: round,
        teamStates: Object.fromEntries(teams.map(t => [t.id, { ...t.state }])),
        marketState: { ...output.newMarketState },
      });

      marketState = output.newMarketState;
    }

    // Calculate final results
    const teamResults: TeamRunResult[] = teams.map(team => ({
      teamId: team.id,
      archetype: team.archetype,
      finalState: team.state,
      finalRank: this.calculateRank(teams, team.id),
      metrics: this.calculateTeamMetrics(team.id, roundData),
    }));

    // Determine winner
    const winner = teamResults.reduce((best, current) =>
      current.finalState.revenue > best.finalState.revenue ? current : best
    );

    const rankings = teamResults
      .sort((a, b) => a.finalRank - b.finalRank)
      .map(r => ({ teamId: r.teamId, rank: r.finalRank, archetype: r.archetype }));

    return {
      seed,
      teamResults,
      winnerId: winner.teamId,
      winnerArchetype: winner.archetype,
      roundData,
      rankings,
    };
  }

  /**
   * Calculate rank for a team based on revenue
   */
  private calculateRank(
    teams: Array<{ id: string; state: TeamState }>,
    teamId: string
  ): number {
    const sorted = [...teams].sort((a, b) => b.state.revenue - a.state.revenue);
    return sorted.findIndex(t => t.id === teamId) + 1;
  }

  /**
   * Calculate metrics for a team across all rounds
   */
  private calculateTeamMetrics(
    teamId: string,
    roundData: RoundData[]
  ): TeamRunResult["metrics"] {
    let totalRevenue = 0;
    let totalNetIncome = 0;
    let totalMarketShare = 0;
    let peakCash = 0;
    let minCash = Infinity;
    let wentBankrupt = false;
    let bankruptcyRound: number | undefined;

    for (const round of roundData) {
      const state = round.teamStates[teamId];
      if (!state) continue;

      totalRevenue += state.revenue;
      totalNetIncome += state.netIncome;

      const avgShare = Object.values(state.marketShare).reduce((a, b) => a + b, 0) /
        Math.max(1, Object.keys(state.marketShare).length);
      totalMarketShare += avgShare;

      if (state.cash > peakCash) peakCash = state.cash;
      if (state.cash < minCash) minCash = state.cash;

      if (state.cash < 0 && !wentBankrupt) {
        wentBankrupt = true;
        bankruptcyRound = round.roundNumber;
      }
    }

    return {
      totalRevenue,
      totalNetIncome,
      averageMarketShare: totalMarketShare / roundData.length,
      peakCash,
      minCash,
      wentBankrupt,
      bankruptcyRound,
    };
  }

  /**
   * Calculate aggregate balance metrics
   */
  private calculateMetrics(runs: SimulationRun[]): BalanceMetrics {
    const revenues: number[] = [];
    const shares: number[] = [];
    const bankruptcies = runs.filter(r =>
      r.teamResults.some(t => t.metrics.wentBankrupt)
    ).length;

    for (const run of runs) {
      for (const team of run.teamResults) {
        revenues.push(team.metrics.totalRevenue);
        shares.push(team.metrics.averageMarketShare);
      }
    }

    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const revenueSpread = Math.max(...revenues) / Math.max(1, Math.min(...revenues));

    return {
      averageRevenue: avgRevenue,
      revenueSpread,
      bankruptcyRate: bankruptcies / runs.length,
      competitiveness: this.calculateCompetitiveness(runs),
    };
  }

  /**
   * Calculate competitiveness score (how close games are)
   */
  private calculateCompetitiveness(runs: SimulationRun[]): number {
    let closeGames = 0;

    for (const run of runs) {
      const revenues = run.teamResults.map(t => t.metrics.totalRevenue);
      const max = Math.max(...revenues);
      const secondMax = revenues.sort((a, b) => b - a)[1] || 0;

      // A game is "close" if winner is within 20% of runner-up
      if (max < secondMax * 1.2) {
        closeGames++;
      }
    }

    return closeGames / runs.length;
  }

  /**
   * Calculate strategy diversity index
   */
  private calculateDiversity(
    runs: SimulationRun[],
    assignments: Array<{ teamId: string; archetype: StrategyArchetype }>
  ): DiversityIndex {
    const archetypes = [...new Set(assignments.map(a => a.archetype))];
    const wins: Record<StrategyArchetype, number> = {} as Record<StrategyArchetype, number>;

    for (const archetype of archetypes) {
      wins[archetype] = runs.filter(r => r.winnerArchetype === archetype).length;
    }

    const totalWins = Object.values(wins).reduce((a, b) => a + b, 0);
    const winningArchetypes = archetypes.filter(a => wins[a] > 0);

    // Check for dominant strategy (>60% wins)
    const dominantStrategy = archetypes.find(a => wins[a] / totalWins > 0.6);

    return {
      uniqueWinners: winningArchetypes.length,
      winDistribution: Object.fromEntries(
        archetypes.map(a => [a, wins[a] / totalWins])
      ),
      hasDominantStrategy: !!dominantStrategy,
      dominantStrategy,
      diversityScore: this.calculateDiversityScore(wins, totalWins),
    };
  }

  /**
   * Calculate diversity score (entropy-based)
   */
  private calculateDiversityScore(
    wins: Record<string, number>,
    totalWins: number
  ): number {
    if (totalWins === 0) return 0;

    let entropy = 0;
    for (const count of Object.values(wins)) {
      if (count > 0) {
        const p = count / totalWins;
        entropy -= p * Math.log2(p);
      }
    }

    // Normalize by max possible entropy
    const maxEntropy = Math.log2(Object.keys(wins).length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    runs: SimulationRun[],
    assignments: Array<{ teamId: string; archetype: StrategyArchetype }>
  ): HarnessOutput["summary"] {
    const archetypes = [...new Set(assignments.map(a => a.archetype))];

    const winsByArchetype: Record<StrategyArchetype, number> = {} as Record<StrategyArchetype, number>;
    const totalRevenueByArchetype: Record<StrategyArchetype, number> = {} as Record<StrategyArchetype, number>;
    const bankruptciesByArchetype: Record<StrategyArchetype, number> = {} as Record<StrategyArchetype, number>;
    const countByArchetype: Record<StrategyArchetype, number> = {} as Record<StrategyArchetype, number>;

    // Initialize
    for (const archetype of archetypes) {
      winsByArchetype[archetype] = 0;
      totalRevenueByArchetype[archetype] = 0;
      bankruptciesByArchetype[archetype] = 0;
      countByArchetype[archetype] = 0;
    }

    // Aggregate
    for (const run of runs) {
      winsByArchetype[run.winnerArchetype]++;

      for (const team of run.teamResults) {
        totalRevenueByArchetype[team.archetype] += team.metrics.totalRevenue;
        countByArchetype[team.archetype]++;
        if (team.metrics.wentBankrupt) {
          bankruptciesByArchetype[team.archetype]++;
        }
      }
    }

    // Calculate rates
    const winRateByArchetype: Record<StrategyArchetype, number> = {} as Record<StrategyArchetype, number>;
    const averageRevenueByArchetype: Record<StrategyArchetype, number> = {} as Record<StrategyArchetype, number>;
    const bankruptcyRateByArchetype: Record<StrategyArchetype, number> = {} as Record<StrategyArchetype, number>;

    for (const archetype of archetypes) {
      winRateByArchetype[archetype] = winsByArchetype[archetype] / runs.length;
      averageRevenueByArchetype[archetype] = countByArchetype[archetype] > 0
        ? totalRevenueByArchetype[archetype] / countByArchetype[archetype]
        : 0;
      bankruptcyRateByArchetype[archetype] = countByArchetype[archetype] > 0
        ? bankruptciesByArchetype[archetype] / countByArchetype[archetype]
        : 0;
    }

    return {
      totalSimulations: runs.length,
      totalRounds: runs.length * this.config.rounds,
      winsByArchetype,
      winRateByArchetype,
      averageRevenueByArchetype,
      bankruptcyRateByArchetype,
    };
  }

  /**
   * Check for balance issues and add warnings
   */
  private checkForIssues(
    summary: HarnessOutput["summary"],
    diversity: DiversityIndex,
    warnings: string[]
  ): void {
    // Check for dominant strategy
    if (diversity.hasDominantStrategy) {
      warnings.push(
        `DOMINANT STRATEGY DETECTED: ${diversity.dominantStrategy} wins >60% of games`
      );
    }

    // Check for strategy that never wins
    for (const [archetype, winRate] of Object.entries(summary.winRateByArchetype)) {
      if (winRate === 0) {
        warnings.push(`NON-VIABLE STRATEGY: ${archetype} never wins`);
      }
    }

    // Check for high bankruptcy rates
    for (const [archetype, rate] of Object.entries(summary.bankruptcyRateByArchetype)) {
      if (rate > 0.1) {
        warnings.push(
          `HIGH BANKRUPTCY RATE: ${archetype} goes bankrupt ${(rate * 100).toFixed(1)}% of the time`
        );
      }
    }

    // Check diversity score
    if (diversity.diversityScore < 0.5) {
      warnings.push(
        `LOW DIVERSITY: Only ${diversity.uniqueWinners} archetypes winning (score: ${diversity.diversityScore.toFixed(2)})`
      );
    }
  }
}

/**
 * Quick balance check - runs a minimal test suite
 */
export function quickBalanceCheck(
  strategies: Map<string, StrategyDecisionMaker>,
  simulations: number = 100
): { passed: boolean; warnings: string[] } {
  const harness = new BalanceHarness({ simulations, verbose: false });

  for (const [id, strategy] of strategies) {
    harness.registerStrategy(id, strategy);
  }

  const archetypes = [...strategies.keys()] as StrategyArchetype[];
  const assignments = archetypes.map((archetype, i) => ({
    teamId: `team-${i}`,
    archetype,
  }));

  const output = harness.run(assignments);

  return {
    passed: output.warnings.length === 0,
    warnings: output.warnings,
  };
}
