/**
 * State Cloning Utilities
 *
 * This module provides utilities for cloning state objects.
 * Currently uses structuredClone, but can be swapped for Immer
 * if performance optimization is needed.
 *
 * Usage pattern:
 *   import { cloneState } from "../utils/stateUtils";
 *   const newState = cloneState(state);
 *
 * Future optimization:
 *   If profiling shows cloning is a bottleneck, install Immer
 *   and update this module to use produce() instead.
 */

import type { TeamState } from "../types/state";
import type { MarketState } from "../types/market";
import type { AllDecisions } from "../types/decisions";

/**
 * Clone a TeamState object
 * Creates a deep copy that can be safely mutated
 */
export function cloneTeamState(state: TeamState): TeamState {
  return structuredClone(state);
}

/**
 * Clone a MarketState object
 */
export function cloneMarketState(state: MarketState): MarketState {
  return structuredClone(state);
}

/**
 * Clone an AllDecisions object
 */
export function cloneDecisions(decisions: AllDecisions): AllDecisions {
  return structuredClone(decisions);
}

/**
 * Generic deep clone - use for any object
 * Prefer type-specific functions above when available
 */
export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

/**
 * Shallow merge with new values
 * More efficient than deep clone when only top-level properties change
 */
export function shallowMerge<T extends object>(base: T, updates: Partial<T>): T {
  return { ...base, ...updates };
}
