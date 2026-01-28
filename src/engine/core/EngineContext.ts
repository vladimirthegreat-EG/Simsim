/**
 * Engine Context - Dependency injection for deterministic simulation
 *
 * This module provides the context object that must be passed to all engine
 * functions. It contains seeded RNG instances for each module, ensuring
 * deterministic and reproducible simulations.
 *
 * NON-NEGOTIABLE RULES:
 * - All randomness MUST come from context.rng
 * - No Math.random() allowed in engine code
 * - No Date.now() for ID generation
 * - Context is immutable during a round
 */

// ============================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================

/**
 * Mulberry32 - Fast, high-quality 32-bit PRNG
 * Provides deterministic random numbers from a seed
 */
export class SeededRNG {
  private state: number;
  private initialSeed: number;

  constructor(seed: number) {
    this.initialSeed = seed;
    this.state = seed;
  }

  /**
   * Get the initial seed (for audit trail)
   */
  getSeed(): number {
    return this.initialSeed;
  }

  /**
   * Get next random number in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Get random number in range [min, max)
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Get random integer in range [min, max] (inclusive)
   */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot pick from empty array");
    }
    return array[this.int(0, array.length - 1)];
  }

  /**
   * Return true with given probability (0-1)
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Shuffle array in place (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Generate a normally distributed random number (Box-Muller)
   */
  gaussian(mean: number = 0, stddev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stddev + mean;
  }

  /**
   * Clone the RNG at its current state
   */
  clone(): SeededRNG {
    const clone = new SeededRNG(this.initialSeed);
    clone.state = this.state;
    return clone;
  }
}

// ============================================
// SEED BUNDLE
// ============================================

/**
 * Seeds for each module - changing one module doesn't affect others
 */
export interface SeedBundle {
  matchSeed: string;      // Master seed for the entire match
  roundSeed: number;      // Derived seed for current round
  marketSeed: number;
  factorySeed: number;
  hrSeed: number;
  marketingSeed: number;
  rdSeed: number;
  financeSeed: number;
}

/**
 * Generate a numeric seed from a string (djb2 hash)
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Ensure unsigned 32-bit
}

/**
 * Derive module seeds from master seed + round number
 * Each module gets a unique, reproducible seed
 */
export function deriveSeedBundle(matchSeed: string, roundNumber: number): SeedBundle {
  const baseSeed = hashString(matchSeed);

  return {
    matchSeed,
    roundSeed: hashString(`${matchSeed}-round-${roundNumber}`),
    marketSeed: hashString(`${matchSeed}-market-${roundNumber}`),
    factorySeed: hashString(`${matchSeed}-factory-${roundNumber}`),
    hrSeed: hashString(`${matchSeed}-hr-${roundNumber}`),
    marketingSeed: hashString(`${matchSeed}-marketing-${roundNumber}`),
    rdSeed: hashString(`${matchSeed}-rd-${roundNumber}`),
    financeSeed: hashString(`${matchSeed}-finance-${roundNumber}`),
  };
}

// ============================================
// RNG PROVIDER
// ============================================

/**
 * Provides isolated RNG instances for each module
 */
export interface RNGProvider {
  market: SeededRNG;
  factory: SeededRNG;
  hr: SeededRNG;
  marketing: SeededRNG;
  rd: SeededRNG;
  finance: SeededRNG;
  /** General purpose RNG for non-module-specific randomness */
  general: SeededRNG;
}

/**
 * Create RNG provider from seed bundle
 */
export function createRNGProvider(seeds: SeedBundle): RNGProvider {
  return {
    market: new SeededRNG(seeds.marketSeed),
    factory: new SeededRNG(seeds.factorySeed),
    hr: new SeededRNG(seeds.hrSeed),
    marketing: new SeededRNG(seeds.marketingSeed),
    rd: new SeededRNG(seeds.rdSeed),
    finance: new SeededRNG(seeds.financeSeed),
    general: new SeededRNG(seeds.roundSeed),
  };
}

// ============================================
// DETERMINISTIC ID GENERATOR
// ============================================

/**
 * Counter-based ID generator that's deterministic within a round
 */
export class DeterministicIDGenerator {
  private counters: Map<string, number> = new Map();
  private roundNumber: number;
  private teamId: string;

  constructor(roundNumber: number, teamId: string) {
    this.roundNumber = roundNumber;
    this.teamId = teamId;
  }

  /**
   * Generate a deterministic ID for an entity type
   * Format: {type}-{teamId}-r{round}-{counter}
   */
  next(type: "factory" | "product" | "employee"): string {
    const key = type;
    const counter = (this.counters.get(key) || 0) + 1;
    this.counters.set(key, counter);
    return `${type}-${this.teamId}-r${this.roundNumber}-${counter}`;
  }

  /**
   * Reset counters (for testing)
   */
  reset(): void {
    this.counters.clear();
  }
}

// ============================================
// ENGINE CONTEXT
// ============================================

/**
 * Version information for state compatibility
 */
export interface EngineVersion {
  engineVersion: string;   // Semantic version of the engine
  schemaVersion: string;   // Version of the state schema
}

export const CURRENT_ENGINE_VERSION: EngineVersion = {
  engineVersion: "2.0.0",  // Round 2 changes
  schemaVersion: "2.0.0",
};

/**
 * The context object passed to all engine functions
 * Contains everything needed for deterministic simulation
 */
export interface EngineContext {
  /** Seed bundle for audit trail */
  seeds: SeedBundle;

  /** RNG instances for each module */
  rng: RNGProvider;

  /** ID generator for this round */
  idGenerator: DeterministicIDGenerator;

  /** Current round number */
  roundNumber: number;

  /** Version information */
  version: EngineVersion;

  /** Team ID being processed (for ID generation) */
  teamId: string;
}

/**
 * Create an engine context for a round
 */
export function createEngineContext(
  matchSeed: string,
  roundNumber: number,
  teamId: string
): EngineContext {
  const seeds = deriveSeedBundle(matchSeed, roundNumber);

  return {
    seeds,
    rng: createRNGProvider(seeds),
    idGenerator: new DeterministicIDGenerator(roundNumber, teamId),
    roundNumber,
    version: CURRENT_ENGINE_VERSION,
    teamId,
  };
}

/**
 * Create a context for testing with a specific seed
 */
export function createTestContext(
  seed: number = 12345,
  roundNumber: number = 1,
  teamId: string = "test-team"
): EngineContext {
  return createEngineContext(seed.toString(), roundNumber, teamId);
}

// ============================================
// STATE HASHING (for audit trail)
// ============================================

/**
 * Create a hash of a state object for verification
 * Uses a deterministic JSON stringification
 */
export function hashState(state: unknown): string {
  const json = JSON.stringify(state, Object.keys(state as object).sort());
  const hash = hashString(json);
  return hash.toString(16).padStart(8, "0");
}
