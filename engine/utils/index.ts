/**
 * Engine Utilities
 *
 * Shared utilities for the simulation engine including:
 * - Error handling wrappers
 * - Numeric safety guards
 * - General utility functions
 *
 * IMPORTANT: All randomness must come from EngineContext.rng.
 */

import { ModuleResult, TeamState } from "../types";

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
 * VAL-02: Safe number write — replaces NaN/Infinity with fallback value
 * Use at state write boundaries to prevent non-finite corruption
 */
export function safeNumber(value: number, fallback: number = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Safe division — returns fallback when denominator is zero or either operand is non-finite.
 * Use for financial ratios and any division where the denominator may be zero.
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (denominator === 0 || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return fallback;
  }
  return numerator / denominator;
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
 * Deep clone an object (JSON-safe)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Re-export SeededRNG for convenience
export { SeededRNG } from "../core/EngineContext";

// ============================================
// TEST-ONLY: Legacy global RNG
// These exist solely for backward compatibility with test files.
// Production code MUST use EngineContext.rng — modules now throw
// if called without EngineContext.
// ============================================

import { SeededRNG as _SeededRNG } from "../core/EngineContext";

let globalRandom: _SeededRNG | null = null;

/** @test-only Set global RNG seed for legacy test compatibility */
export function setRandomSeed(seed: number | string): void {
  const numericSeed = typeof seed === 'string'
    ? seed.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0) >>> 0
    : seed;
  globalRandom = new _SeededRNG(numericSeed);
}

/** @test-only Clear the global random seed */
export function clearRandomSeed(): void {
  globalRandom = null;
}

/** @test-only Check if global RNG is seeded */
export function isSeeded(): boolean {
  return globalRandom !== null;
}

/** @test-only Get random number (throws if not seeded) */
export function random(): number {
  if (!globalRandom) {
    throw new Error("DETERMINISM VIOLATION: random() called without seed. Use EngineContext.rng in production.");
  }
  return globalRandom.next();
}

/** @test-only Get random number in range [min, max) */
export function randomRange(min: number, max: number): number {
  return min + random() * (max - min);
}

/** @test-only Get random integer in range [min, max] */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}
