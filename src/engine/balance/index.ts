/**
 * Balance Module - Game balance testing and analysis tools
 *
 * This module provides:
 * - Strategy archetypes for automated testing
 * - Balance harness for Monte Carlo simulations
 * - Metrics tracking and diversity analysis
 *
 * BALANCE RULES:
 * - No single strategy should win >60% of the time
 * - At least 3 strategies must be viable (can win)
 * - Bankruptcy rate must be <5%
 * - Revenue spread should be 1.5-3.0x
 */

// Strategy bots
export {
  volumeStrategy,
  premiumStrategy,
  brandStrategy,
  automationStrategy,
  balancedStrategy,
  rdFocusedStrategy,
  costCutterStrategy,
  STRATEGIES,
  getAvailableStrategies,
  getStrategy,
} from "./strategies";
export type {
  StrategyArchetype,
  StrategyDecisionMaker,
  StrategyResult,
} from "./strategies";

// Balance harness
export { BalanceHarness, DEFAULT_HARNESS_CONFIG, quickBalanceCheck } from "./harness";
export type {
  HarnessConfig,
  SimulationRun,
  TeamRunResult,
  RoundData,
  HarnessOutput,
} from "./harness";

// Metrics tracking
export { MetricsCalculator, BALANCE_THRESHOLDS } from "./metrics";
export type {
  BalanceMetrics,
  DiversityIndex,
  RoundMetrics,
  StrategicHealth,
  MetricsSummary,
} from "./metrics";
