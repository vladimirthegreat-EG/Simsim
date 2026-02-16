/**
 * Engine Configuration System
 *
 * This module provides externalized configuration for the simulation engine.
 * All game balance parameters can be adjusted without code changes.
 *
 * @example
 * ```typescript
 * import { loadConfig, loadConfigForDifficulty, DEFAULT_ENGINE_CONFIG } from '@/engine/config';
 *
 * // Load default config
 * const config = loadConfig();
 *
 * // Load config for specific difficulty
 * const hardConfig = loadConfigForDifficulty('hard');
 *
 * // Load with custom overrides
 * const customConfig = loadConfig({
 *   hr: { baseTurnoverRate: 0.10 },
 *   marketing: { brandDecayRate: 0.05 },
 * });
 * ```
 */

// Schema types
export type {
  EngineConfig,
  FactoryConfig,
  HRConfig,
  MarketingConfig,
  RDConfig,
  FinanceConfig,
  MarketConfig,
  ESGConfig,
  EconomyConfig,
  BalanceConfig,
  DifficultyConfig,
  InitialStateConfig,
  ConfigOverrides,
  DifficultyLevel,
  CreditRating,
  EconomicPhase,
  RecruitmentTier,
  SegmentWeights,
  SponsorshipConfig,
  FinancialRatioThresholds,
  BenefitsCostConfig,
  BenefitsImpactConfig,
  DeepPartial,
} from "./schema";

// Default values
export {
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_FACTORY_CONFIG,
  DEFAULT_HR_CONFIG,
  DEFAULT_MARKETING_CONFIG,
  DEFAULT_RD_CONFIG,
  DEFAULT_FINANCE_CONFIG,
  DEFAULT_MARKET_CONFIG,
  DEFAULT_ESG_CONFIG,
  DEFAULT_ECONOMY_CONFIG,
  DEFAULT_BALANCE_CONFIG,
  DEFAULT_DIFFICULTY_CONFIG,
  DEFAULT_INITIAL_STATE_CONFIG,
} from "./defaults";

// Loading and validation
export {
  loadConfig,
  loadConfigForDifficulty,
  validateConfig,
  getConfigValue,
  setConfigValue,
  diffConfigs,
  serializeConfig,
  parseConfig,
  type ValidationResult,
} from "./loader";

// Difficulty presets
export {
  DIFFICULTY_PRESETS,
  DIFFICULTY_METADATA,
  getPreset,
  getDifficultyLevels,
  type DifficultyMetadata,
} from "./presets";
