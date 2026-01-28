/**
 * Engine Utilities
 *
 * Shared utilities for the simulation engine including:
 * - Error handling wrappers
 * - Module result builders
 * - DEPRECATED: Global RNG functions (use EngineContext.rng instead)
 *
 * IMPORTANT: For new code, use EngineContext for all randomness.
 * The global RNG functions here are kept for backward compatibility
 * during migration but will throw if seed is not set.
 */

import { ModuleResult, TeamState } from "../types";
import { SeededRNG } from "../core/EngineContext";

/**
 * Standard error result for module failures
 */
export function createErrorResult(
  moduleName: string,
  error: unknown,
  state: TeamState
): { newState: TeamState; result: ModuleResult } {
  const errorMessage = error instanceof Error ? error.message : String(error);

  console.error(`[${moduleName}] Processing error:`, error);

  return {
    newState: state, // Return unchanged state on error
    result: {
      success: false,
      changes: {},
      costs: 0,
      revenue: 0,
      messages: [`Error in ${moduleName}: ${errorMessage}`],
    },
  };
}

/**
 * Build a successful module result
 */
export function buildModuleResult(
  changes: Record<string, unknown>,
  costs: number,
  revenue: number,
  messages: string[]
): ModuleResult {
  return {
    success: true,
    changes,
    costs,
    revenue,
    messages,
  };
}

// ============================================
// DEPRECATED GLOBAL RNG
// These functions are kept for backward compatibility
// during migration. New code should use EngineContext.
// ============================================

/**
 * Global random instance - MUST be seeded before use
 * @deprecated Use EngineContext.rng instead
 */
let globalRandom: SeededRNG | null = null;

/**
 * Set the global random seed for deterministic simulations
 * @deprecated Use EngineContext instead
 */
export function setRandomSeed(seed: number | string): void {
  // Convert string seeds to numeric hash
  const numericSeed = typeof seed === 'string'
    ? seed.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0) >>> 0
    : seed;
  globalRandom = new SeededRNG(numericSeed);
}

/**
 * Clear the global random seed
 * @deprecated Use EngineContext instead
 */
export function clearRandomSeed(): void {
  globalRandom = null;
}

/**
 * Check if global RNG is seeded
 */
export function isSeeded(): boolean {
  return globalRandom !== null;
}

/**
 * Get a random number between 0 and 1
 * THROWS if seed is not set - no fallback to Math.random()
 * @deprecated Use EngineContext.rng instead
 */
export function random(): number {
  if (!globalRandom) {
    throw new Error(
      "DETERMINISM VIOLATION: random() called without seed. " +
      "Use setRandomSeed() or migrate to EngineContext.rng"
    );
  }
  return globalRandom.next();
}

/**
 * Get a random number in range [min, max)
 * @deprecated Use EngineContext.rng instead
 */
export function randomRange(min: number, max: number): number {
  return min + random() * (max - min);
}

/**
 * Get a random integer in range [min, max]
 * @deprecated Use EngineContext.rng instead
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

// ============================================
// GENERAL UTILITIES
// ============================================

/**
 * Validate that a number is finite and not NaN
 */
export function validateNumber(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${name}: ${value} (must be a finite number)`);
  }
  return value;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Deep clone an object (JSON-safe)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Re-export SeededRNG for convenience
export { SeededRNG } from "../core/EngineContext";
