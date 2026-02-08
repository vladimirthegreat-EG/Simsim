/**
 * Balance Metrics - Measurement and analysis tools for game balance
 *
 * This module defines the metrics that must be tracked for balance validation:
 * - Strategy diversity index
 * - Win rate distribution
 * - Revenue spread
 * - Bankruptcy rates
 * - Competitiveness scores
 */

import type { StrategyArchetype } from "./strategies";

// ============================================
// CORE METRICS
// ============================================

export interface BalanceMetrics {
  /** Average revenue across all teams/simulations */
  averageRevenue: number;
  /** Ratio of highest to lowest revenue (target: 1.5-3.0) */
  revenueSpread: number;
  /** Percentage of games with bankruptcies (target: <5%) */
  bankruptcyRate: number;
  /** Percentage of close games (winner within 20% of runner-up) */
  competitiveness: number;
}

// ============================================
// DIVERSITY INDEX
// ============================================

export interface DiversityIndex {
  /** Number of unique archetypes that have won at least once */
  uniqueWinners: number;
  /** Win rate for each archetype (target: none >60%) */
  winDistribution: Record<string, number>;
  /** Whether any strategy wins >60% of the time */
  hasDominantStrategy: boolean;
  /** The dominant strategy if one exists */
  dominantStrategy?: StrategyArchetype;
  /** Entropy-based diversity score (0-1, target: >0.7) */
  diversityScore: number;
}

// ============================================
// PER-ROUND METRICS
// ============================================

export interface RoundMetrics {
  roundNumber: number;
  /** Market demand by segment (base vs adjusted) */
  demandBySegment: Record<string, { base: number; adjusted: number }>;
  /** Market share per team per segment */
  sharesByTeam: Record<string, Record<string, number>>;
  /** Softmax input scores per team */
  softmaxScores: Record<string, {
    price: number;
    quality: number;
    brand: number;
    esg: number;
    features: number;
    total: number;
  }>;
  /** Financial metrics per team */
  financials: Record<string, {
    revenue: number;
    cogs: number;
    operatingProfit: number;
    netIncome: number;
    cash: number;
    burnRate: number;
    marketCap: number;
  }>;
  /** Operational metrics per team */
  operations: Record<string, {
    output: number;
    defects: number;
    netOutput: number;
    staffUtilization: number;
    automationMultiplier: number;
  }>;
  /** HR metrics per team */
  hr: Record<string, {
    turnoverRate: number;
    trainingFatigue: number;
    averageMorale: number;
    averageLoyalty: number;
    averageBurnout: number;
  }>;
}

// ============================================
// STRATEGIC HEALTH INDICATORS
// ============================================

export interface StrategicHealth {
  /** Whether strategy variety exists (min 3 winning archetypes) */
  hasStrategyVariety: boolean;
  /** Snowball risk: likelihood of early leader maintaining lead */
  snowballRisk: number;
  /** Comeback potential: likelihood of trailing team recovering */
  comebackPotential: number;
  /** Decision impact: how much decisions matter vs RNG */
  decisionImpact: number;
}

// ============================================
// BALANCE THRESHOLDS
// ============================================

export const BALANCE_THRESHOLDS = {
  /** Maximum acceptable win rate for any single strategy */
  MAX_WIN_RATE: 0.6,
  /** Minimum number of strategies that must be viable (can win) */
  MIN_VIABLE_STRATEGIES: 3,
  /** Maximum acceptable bankruptcy rate */
  MAX_BANKRUPTCY_RATE: 0.05,
  /** Target revenue spread range */
  REVENUE_SPREAD: { min: 1.5, max: 3.0 },
  /** Minimum diversity score */
  MIN_DIVERSITY_SCORE: 0.7,
  /** Minimum competitiveness (close games percentage) */
  MIN_COMPETITIVENESS: 0.3,
  /** Maximum snowball risk */
  MAX_SNOWBALL_RISK: 0.4,
};

// ============================================
// METRICS CALCULATOR
// ============================================

export class MetricsCalculator {
  /**
   * Check if metrics pass balance thresholds
   */
  static passesBalanceCheck(
    metrics: BalanceMetrics,
    diversity: DiversityIndex
  ): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    // Check for dominant strategy
    if (diversity.hasDominantStrategy) {
      failures.push(
        `Dominant strategy detected: ${diversity.dominantStrategy} (>${BALANCE_THRESHOLDS.MAX_WIN_RATE * 100}% win rate)`
      );
    }

    // Check viable strategies
    if (diversity.uniqueWinners < BALANCE_THRESHOLDS.MIN_VIABLE_STRATEGIES) {
      failures.push(
        `Insufficient strategy variety: only ${diversity.uniqueWinners} viable strategies (min: ${BALANCE_THRESHOLDS.MIN_VIABLE_STRATEGIES})`
      );
    }

    // Check bankruptcy rate
    if (metrics.bankruptcyRate > BALANCE_THRESHOLDS.MAX_BANKRUPTCY_RATE) {
      failures.push(
        `Bankruptcy rate too high: ${(metrics.bankruptcyRate * 100).toFixed(1)}% (max: ${BALANCE_THRESHOLDS.MAX_BANKRUPTCY_RATE * 100}%)`
      );
    }

    // Check revenue spread
    if (metrics.revenueSpread < BALANCE_THRESHOLDS.REVENUE_SPREAD.min) {
      failures.push(
        `Revenue spread too low: ${metrics.revenueSpread.toFixed(2)}x (strategies may be too similar)`
      );
    }
    if (metrics.revenueSpread > BALANCE_THRESHOLDS.REVENUE_SPREAD.max) {
      failures.push(
        `Revenue spread too high: ${metrics.revenueSpread.toFixed(2)}x (imbalanced outcomes)`
      );
    }

    // Check diversity score
    if (diversity.diversityScore < BALANCE_THRESHOLDS.MIN_DIVERSITY_SCORE) {
      failures.push(
        `Diversity score too low: ${diversity.diversityScore.toFixed(2)} (min: ${BALANCE_THRESHOLDS.MIN_DIVERSITY_SCORE})`
      );
    }

    // Check competitiveness
    if (metrics.competitiveness < BALANCE_THRESHOLDS.MIN_COMPETITIVENESS) {
      failures.push(
        `Competitiveness too low: ${(metrics.competitiveness * 100).toFixed(1)}% close games (min: ${BALANCE_THRESHOLDS.MIN_COMPETITIVENESS * 100}%)`
      );
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  /**
   * Generate a balance report
   */
  static generateReport(
    metrics: BalanceMetrics,
    diversity: DiversityIndex,
    strategic: StrategicHealth
  ): string {
    const check = this.passesBalanceCheck(metrics, diversity);

    let report = "╔════════════════════════════════════════════════════════════════╗\n";
    report += "║                    BALANCE ANALYSIS REPORT                      ║\n";
    report += "╠════════════════════════════════════════════════════════════════╣\n";

    // Overall status
    report += `║  Status: ${check.passed ? "✅ BALANCED" : "❌ IMBALANCED"}                                        ║\n`;
    report += "╠════════════════════════════════════════════════════════════════╣\n";

    // Core metrics
    report += "║  CORE METRICS                                                  ║\n";
    report += `║  • Average Revenue: $${(metrics.averageRevenue / 1_000_000).toFixed(1)}M                                    ║\n`;
    report += `║  • Revenue Spread: ${metrics.revenueSpread.toFixed(2)}x                                        ║\n`;
    report += `║  • Bankruptcy Rate: ${(metrics.bankruptcyRate * 100).toFixed(1)}%                                      ║\n`;
    report += `║  • Competitiveness: ${(metrics.competitiveness * 100).toFixed(1)}%                                      ║\n`;
    report += "╠════════════════════════════════════════════════════════════════╣\n";

    // Diversity
    report += "║  STRATEGY DIVERSITY                                            ║\n";
    report += `║  • Unique Winners: ${diversity.uniqueWinners}                                           ║\n`;
    report += `║  • Diversity Score: ${diversity.diversityScore.toFixed(2)}                                       ║\n`;
    report += `║  • Dominant Strategy: ${diversity.hasDominantStrategy ? diversity.dominantStrategy : "None"}                                ║\n`;
    report += "╠════════════════════════════════════════════════════════════════╣\n";

    // Win distribution
    report += "║  WIN DISTRIBUTION                                              ║\n";
    for (const [archetype, rate] of Object.entries(diversity.winDistribution)) {
      const bar = "█".repeat(Math.round(rate * 20));
      const padding = " ".repeat(20 - bar.length);
      report += `║  • ${archetype.padEnd(12)} ${bar}${padding} ${(rate * 100).toFixed(1)}%   ║\n`;
    }
    report += "╠════════════════════════════════════════════════════════════════╣\n";

    // Strategic health
    report += "║  STRATEGIC HEALTH                                              ║\n";
    report += `║  • Strategy Variety: ${strategic.hasStrategyVariety ? "✅ Yes" : "❌ No"}                                   ║\n`;
    report += `║  • Snowball Risk: ${(strategic.snowballRisk * 100).toFixed(0)}%                                         ║\n`;
    report += `║  • Comeback Potential: ${(strategic.comebackPotential * 100).toFixed(0)}%                                    ║\n`;
    report += `║  • Decision Impact: ${(strategic.decisionImpact * 100).toFixed(0)}%                                      ║\n`;

    // Failures
    if (!check.passed) {
      report += "╠════════════════════════════════════════════════════════════════╣\n";
      report += "║  ⚠️  ISSUES DETECTED                                           ║\n";
      for (const failure of check.failures) {
        report += `║  • ${failure.substring(0, 58).padEnd(58)} ║\n`;
      }
    }

    report += "╚════════════════════════════════════════════════════════════════╝\n";

    return report;
  }
}

// ============================================
// METRICS SUMMARY
// ============================================

export interface MetricsSummary {
  /** Round-by-round metrics */
  perRound: RoundMetrics[];
  /** Final aggregated metrics */
  final: BalanceMetrics;
  /** Diversity analysis */
  diversity: DiversityIndex;
  /** Strategic health indicators */
  strategic: StrategicHealth;
  /** Human-readable report */
  report: string;
}
