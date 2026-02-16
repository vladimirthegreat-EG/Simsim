/**
 * Configuration Loader
 *
 * Handles loading, merging, and validating engine configuration.
 * Supports config overrides for A/B testing, difficulty presets, and custom games.
 */

import type { EngineConfig, ConfigOverrides, DifficultyLevel } from "./schema";
import { DEFAULT_ENGINE_CONFIG } from "./defaults";
import { DIFFICULTY_PRESETS } from "./presets";

// ============================================
// CONFIGURATION LOADING
// ============================================

/**
 * Load engine configuration with optional overrides
 *
 * @param overrides - Partial config to merge with defaults
 * @returns Complete engine configuration
 */
export function loadConfig(overrides?: ConfigOverrides): EngineConfig {
  if (!overrides) {
    return structuredClone(DEFAULT_ENGINE_CONFIG);
  }

  return deepMerge(structuredClone(DEFAULT_ENGINE_CONFIG), overrides);
}

/**
 * Load configuration for a specific difficulty level
 *
 * @param difficulty - Difficulty level to load
 * @param overrides - Additional overrides to apply
 * @returns Complete engine configuration
 */
export function loadConfigForDifficulty(
  difficulty: DifficultyLevel,
  overrides?: ConfigOverrides
): EngineConfig {
  const preset = DIFFICULTY_PRESETS[difficulty];
  if (!preset) {
    throw new Error(`Unknown difficulty level: ${difficulty}`);
  }

  // Start with default config
  let config = structuredClone(DEFAULT_ENGINE_CONFIG);

  // Apply difficulty preset
  config.difficulty = structuredClone(preset);

  // Apply difficulty-specific adjustments to other configs
  config = applyDifficultyAdjustments(config, preset);

  // Apply any additional overrides
  if (overrides) {
    config = deepMerge(config, overrides);
  }

  return config;
}

/**
 * Apply difficulty adjustments to non-difficulty config sections
 */
function applyDifficultyAdjustments(
  config: EngineConfig,
  difficulty: EngineConfig["difficulty"]
): EngineConfig {
  // Adjust balance based on forgiveness settings
  if (difficulty.forgiveness.rubberBanding) {
    config.balance.rubberBandTrailingBoost =
      1 + (DEFAULT_ENGINE_CONFIG.balance.rubberBandTrailingBoost - 1) *
      difficulty.forgiveness.rubberBandStrength;
    config.balance.rubberBandLeadingPenalty =
      1 - (1 - DEFAULT_ENGINE_CONFIG.balance.rubberBandLeadingPenalty) *
      difficulty.forgiveness.rubberBandStrength;
  } else {
    config.balance.rubberBandTrailingBoost = 1.0;
    config.balance.rubberBandLeadingPenalty = 1.0;
  }

  // Adjust economy based on difficulty economy settings
  config.economy.demandMultiplierRange = {
    min: config.economy.demandMultiplierRange.min * difficulty.economy.demandGrowthMultiplier,
    max: config.economy.demandMultiplierRange.max * difficulty.economy.demandGrowthMultiplier,
  };

  config.economy.inflationRange = {
    min: difficulty.economy.inflationRange[0],
    max: difficulty.economy.inflationRange[1],
  };

  // Adjust initial state based on difficulty starting conditions
  config.initialState.startingCash = difficulty.starting.cash;

  return config;
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a configuration object
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateConfig(config: EngineConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Version check
  if (!config.version) {
    errors.push("Missing config version");
  }

  // Factory validation
  if (config.factory.newFactoryCost <= 0) {
    errors.push("Factory cost must be positive");
  }
  if (config.factory.maxProductionLines <= 0) {
    errors.push("Max production lines must be positive");
  }

  // HR validation
  if (config.hr.baseTurnoverRate < 0 || config.hr.baseTurnoverRate > 1) {
    errors.push("Base turnover rate must be between 0 and 1");
  }
  if (config.hr.trainingFatigueThreshold <= 0) {
    errors.push("Training fatigue threshold must be positive");
  }

  // Marketing validation
  if (config.marketing.brandDecayRate < 0 || config.marketing.brandDecayRate > 1) {
    errors.push("Brand decay rate must be between 0 and 1");
  }
  if (config.marketing.brandMaxGrowthPerRound < 0 || config.marketing.brandMaxGrowthPerRound > 1) {
    errors.push("Brand max growth must be between 0 and 1");
  }

  // Market validation
  for (const segment of config.market.segments) {
    const weights = config.market.segmentWeights[segment];
    if (!weights) {
      errors.push(`Missing weights for segment: ${segment}`);
      continue;
    }

    const total = weights.price + weights.quality + weights.brand + weights.esg + weights.features;
    if (Math.abs(total - 100) > 0.01) {
      warnings.push(`Segment ${segment} weights sum to ${total}, expected 100`);
    }
  }

  // ESG validation
  if (config.esg.highThreshold <= config.esg.midThreshold) {
    errors.push("ESG high threshold must be greater than mid threshold");
  }

  // Balance validation
  if (config.balance.rubberBandTrailingBoost < 1) {
    warnings.push("Trailing boost < 1 means trailing teams are penalized");
  }
  if (config.balance.rubberBandLeadingPenalty > 1) {
    warnings.push("Leading penalty > 1 means leaders are boosted");
  }

  // Difficulty validation
  if (config.difficulty.starting.cash <= 0) {
    errors.push("Starting cash must be positive");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Deep merge two objects, with source overriding target
 * Handles DeepPartial types for nested overrides
 */
function deepMerge<T extends object>(target: T, source: object): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = (source as Record<string, unknown>)[key];
    const targetValue = (target as Record<string, unknown>)[key];

    if (sourceValue === undefined) {
      continue;
    }

    if (
      isPlainObject(sourceValue) &&
      isPlainObject(targetValue)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      );
    } else {
      (result as Record<string, unknown>)[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Check if a value is a plain object (not array, null, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Get a specific config value by path
 *
 * @example
 * getConfigValue(config, 'hr.baseTurnoverRate') // 0.12
 * getConfigValue(config, 'market.segmentWeights.Budget.price') // 50
 */
export function getConfigValue(config: EngineConfig, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = config;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a specific config value by path (returns new config, doesn't mutate)
 */
export function setConfigValue(
  config: EngineConfig,
  path: string,
  value: unknown
): EngineConfig {
  const parts = path.split(".");
  const result = structuredClone(config);

  let current: Record<string, unknown> = result as unknown as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof current[part] !== "object" || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;

  return result;
}

/**
 * Compare two configs and return the differences
 */
export function diffConfigs(
  base: EngineConfig,
  modified: EngineConfig
): ConfigOverrides {
  return diffObjects(base, modified) as ConfigOverrides;
}

function diffObjects(base: object, modified: object): object {
  const diff: Record<string, unknown> = {};

  for (const key of new Set([...Object.keys(base), ...Object.keys(modified)])) {
    const baseValue = (base as Record<string, unknown>)[key];
    const modifiedValue = (modified as Record<string, unknown>)[key];

    if (baseValue === modifiedValue) {
      continue;
    }

    if (
      isPlainObject(baseValue) &&
      isPlainObject(modifiedValue)
    ) {
      const nestedDiff = diffObjects(baseValue, modifiedValue);
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    } else if (baseValue !== modifiedValue) {
      diff[key] = modifiedValue;
    }
  }

  return diff;
}

/**
 * Serialize config to JSON with nice formatting
 */
export function serializeConfig(config: EngineConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Parse config from JSON string
 */
export function parseConfig(json: string): EngineConfig {
  const parsed = JSON.parse(json) as EngineConfig;
  const validation = validateConfig(parsed);

  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
  }

  return parsed;
}
