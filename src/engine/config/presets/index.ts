/**
 * Difficulty Presets
 *
 * Complete difficulty configurations for all 6 difficulty levels.
 * Each preset defines starting conditions, modifiers, and feature toggles.
 */

import type { DifficultyConfig, DifficultyLevel } from "../schema";

// ============================================
// SANDBOX - Learning Mode
// ============================================

const SANDBOX_PRESET: DifficultyConfig = {
  level: "sandbox",
  starting: {
    cash: 500_000_000,              // $500M - plenty to experiment
    creditLine: 200_000_000,        // $200M credit available
    brandValue: 0.5,                // 50% brand value
    marketShare: 0.2,               // 20% starting share
    employees: { workers: 200, engineers: 30, supervisors: 20 },
  },
  economy: {
    volatility: 0.3,                // Very stable
    recessionProbability: 0,        // No recessions
    inflationRange: [1, 2],         // Minimal inflation
    demandGrowthMultiplier: 1.5,    // Growing market
  },
  competition: {
    aiAggressiveness: 0.2,          // Passive competitors
    competitorStrength: 0.5,        // Weak competitors
    newEntrantProbability: 0,       // No new competitors
    priceWarProbability: 0,         // No price wars
  },
  disruptions: {
    enabled: false,                 // No disruptions
    frequencyMultiplier: 0,
    severityMultiplier: 0,
    recoveryTimeMultiplier: 0.5,
    warningTime: 4,                 // Lots of warning if enabled
  },
  events: {
    crisisFrequency: 0,             // No crises
    crisisSeverity: 0,
    opportunityFrequency: 2.0,      // Lots of opportunities
    opportunityValue: 2.0,          // Valuable opportunities
  },
  forgiveness: {
    rubberBanding: true,
    rubberBandStrength: 0.8,        // Strong catch-up
    bankruptcyProtection: 4,        // 4 rounds grace
    catchUpMechanics: true,
    hintSystem: true,               // Hints available
  },
  complexity: {
    supplyChain: false,             // Simplified
    economicCycles: false,
    creditRatings: false,
    techTrees: false,
    customerSatisfaction: false,
    competitiveIntelligence: false,
  },
  scoring: {
    winConditionMultiplier: 0.5,    // Easier win
    penaltyMultiplier: 0.25,        // Minimal penalties
    bonusMultiplier: 2.0,           // Big bonuses
  },
};

// ============================================
// EASY - Casual Mode
// ============================================

const EASY_PRESET: DifficultyConfig = {
  level: "easy",
  starting: {
    cash: 300_000_000,              // $300M
    creditLine: 150_000_000,        // $150M credit
    brandValue: 0.35,               // 35% brand
    marketShare: 0.15,              // 15% share
    employees: { workers: 150, engineers: 20, supervisors: 15 },
  },
  economy: {
    volatility: 0.5,                // Mild volatility
    recessionProbability: 0.05,     // 5% chance
    inflationRange: [1, 3],
    demandGrowthMultiplier: 1.2,    // Slight growth
  },
  competition: {
    aiAggressiveness: 0.4,
    competitorStrength: 0.7,
    newEntrantProbability: 0.02,
    priceWarProbability: 0.05,
  },
  disruptions: {
    enabled: true,
    frequencyMultiplier: 0.5,       // Half as often
    severityMultiplier: 0.5,        // Half as bad
    recoveryTimeMultiplier: 0.7,    // Faster recovery
    warningTime: 3,
  },
  events: {
    crisisFrequency: 0.5,
    crisisSeverity: 0.5,
    opportunityFrequency: 1.5,
    opportunityValue: 1.5,
  },
  forgiveness: {
    rubberBanding: true,
    rubberBandStrength: 0.5,
    bankruptcyProtection: 3,
    catchUpMechanics: true,
    hintSystem: true,
  },
  complexity: {
    supplyChain: false,
    economicCycles: false,
    creditRatings: true,
    techTrees: false,
    customerSatisfaction: true,
    competitiveIntelligence: false,
  },
  scoring: {
    winConditionMultiplier: 0.75,
    penaltyMultiplier: 0.5,
    bonusMultiplier: 1.5,
  },
};

// ============================================
// NORMAL - Balanced Mode
// ============================================

const NORMAL_PRESET: DifficultyConfig = {
  level: "normal",
  starting: {
    cash: 200_000_000,              // $200M
    creditLine: 100_000_000,        // $100M credit
    brandValue: 0.25,               // 25% brand
    marketShare: 0.1,               // 10% share
    employees: { workers: 100, engineers: 12, supervisors: 10 },
  },
  economy: {
    volatility: 1.0,                // Normal volatility
    recessionProbability: 0.15,     // 15% chance
    inflationRange: [1, 5],
    demandGrowthMultiplier: 1.0,
  },
  competition: {
    aiAggressiveness: 0.6,
    competitorStrength: 1.0,
    newEntrantProbability: 0.05,
    priceWarProbability: 0.1,
  },
  disruptions: {
    enabled: true,
    frequencyMultiplier: 1.0,
    severityMultiplier: 1.0,
    recoveryTimeMultiplier: 1.0,
    warningTime: 2,
  },
  events: {
    crisisFrequency: 1.0,
    crisisSeverity: 1.0,
    opportunityFrequency: 1.0,
    opportunityValue: 1.0,
  },
  forgiveness: {
    rubberBanding: true,
    rubberBandStrength: 0.3,
    bankruptcyProtection: 2,
    catchUpMechanics: true,
    hintSystem: false,
  },
  complexity: {
    supplyChain: true,
    economicCycles: true,
    creditRatings: true,
    techTrees: true,
    customerSatisfaction: true,
    competitiveIntelligence: true,
  },
  scoring: {
    winConditionMultiplier: 1.0,
    penaltyMultiplier: 1.0,
    bonusMultiplier: 1.0,
  },
};

// ============================================
// HARD - Challenge Mode
// ============================================

const HARD_PRESET: DifficultyConfig = {
  level: "hard",
  starting: {
    cash: 150_000_000,              // $150M
    creditLine: 50_000_000,         // $50M credit only
    brandValue: 0.15,               // 15% brand
    marketShare: 0.05,              // 5% share
    employees: { workers: 75, engineers: 8, supervisors: 6 },
  },
  economy: {
    volatility: 1.3,                // High volatility
    recessionProbability: 0.2,      // 20% chance
    inflationRange: [2, 7],
    demandGrowthMultiplier: 0.9,    // Slight contraction
  },
  competition: {
    aiAggressiveness: 0.75,
    competitorStrength: 1.3,
    newEntrantProbability: 0.08,
    priceWarProbability: 0.15,
  },
  disruptions: {
    enabled: true,
    frequencyMultiplier: 1.5,       // 50% more often
    severityMultiplier: 1.3,
    recoveryTimeMultiplier: 1.2,
    warningTime: 1,                 // Less warning
  },
  events: {
    crisisFrequency: 1.5,
    crisisSeverity: 1.3,
    opportunityFrequency: 0.8,
    opportunityValue: 0.8,
  },
  forgiveness: {
    rubberBanding: true,
    rubberBandStrength: 0.15,       // Weak catch-up
    bankruptcyProtection: 1,
    catchUpMechanics: false,
    hintSystem: false,
  },
  complexity: {
    supplyChain: true,
    economicCycles: true,
    creditRatings: true,
    techTrees: true,
    customerSatisfaction: true,
    competitiveIntelligence: true,
  },
  scoring: {
    winConditionMultiplier: 1.25,
    penaltyMultiplier: 1.5,
    bonusMultiplier: 0.75,
  },
};

// ============================================
// EXPERT - Mastery Mode
// ============================================

const EXPERT_PRESET: DifficultyConfig = {
  level: "expert",
  starting: {
    cash: 100_000_000,              // $100M
    creditLine: 25_000_000,         // $25M credit only
    brandValue: 0.1,                // 10% brand
    marketShare: 0.03,              // 3% share
    employees: { workers: 50, engineers: 5, supervisors: 4 },
  },
  economy: {
    volatility: 1.5,
    recessionProbability: 0.25,
    inflationRange: [2, 10],
    demandGrowthMultiplier: 0.8,
  },
  competition: {
    aiAggressiveness: 0.9,
    competitorStrength: 1.5,
    newEntrantProbability: 0.1,
    priceWarProbability: 0.2,
  },
  disruptions: {
    enabled: true,
    frequencyMultiplier: 2.0,       // Double frequency
    severityMultiplier: 1.5,
    recoveryTimeMultiplier: 1.5,
    warningTime: 1,
  },
  events: {
    crisisFrequency: 2.0,
    crisisSeverity: 1.5,
    opportunityFrequency: 0.5,
    opportunityValue: 0.6,
  },
  forgiveness: {
    rubberBanding: false,           // No catch-up
    rubberBandStrength: 0,
    bankruptcyProtection: 0,        // No protection
    catchUpMechanics: false,
    hintSystem: false,
  },
  complexity: {
    supplyChain: true,
    economicCycles: true,
    creditRatings: true,
    techTrees: true,
    customerSatisfaction: true,
    competitiveIntelligence: true,
  },
  scoring: {
    winConditionMultiplier: 1.5,
    penaltyMultiplier: 2.0,
    bonusMultiplier: 0.5,
  },
};

// ============================================
// NIGHTMARE - Brutal Mode
// ============================================

const NIGHTMARE_PRESET: DifficultyConfig = {
  level: "nightmare",
  starting: {
    cash: 75_000_000,               // $75M only
    creditLine: 0,                  // No credit line
    brandValue: 0.05,               // 5% brand
    marketShare: 0.02,              // 2% share
    employees: { workers: 30, engineers: 3, supervisors: 2 },
  },
  economy: {
    volatility: 2.0,                // Extreme volatility
    recessionProbability: 0.35,     // 35% chance
    inflationRange: [3, 15],
    demandGrowthMultiplier: 0.7,    // Shrinking market
  },
  competition: {
    aiAggressiveness: 1.0,          // Maximum aggression
    competitorStrength: 2.0,        // Double strength
    newEntrantProbability: 0.15,
    priceWarProbability: 0.3,
  },
  disruptions: {
    enabled: true,
    frequencyMultiplier: 3.0,       // Triple frequency
    severityMultiplier: 2.0,        // Double severity
    recoveryTimeMultiplier: 2.0,
    warningTime: 0,                 // No warning
  },
  events: {
    crisisFrequency: 3.0,
    crisisSeverity: 2.0,
    opportunityFrequency: 0.3,
    opportunityValue: 0.4,
  },
  forgiveness: {
    rubberBanding: false,
    rubberBandStrength: 0,
    bankruptcyProtection: 0,
    catchUpMechanics: false,
    hintSystem: false,
  },
  complexity: {
    supplyChain: true,
    economicCycles: true,
    creditRatings: true,
    techTrees: true,
    customerSatisfaction: true,
    competitiveIntelligence: true,
  },
  scoring: {
    winConditionMultiplier: 2.0,
    penaltyMultiplier: 3.0,
    bonusMultiplier: 0.25,
  },
};

// ============================================
// EXPORT ALL PRESETS
// ============================================

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyConfig> = {
  sandbox: SANDBOX_PRESET,
  easy: EASY_PRESET,
  normal: NORMAL_PRESET,
  hard: HARD_PRESET,
  expert: EXPERT_PRESET,
  nightmare: NIGHTMARE_PRESET,
};

/**
 * Get preset by difficulty level
 */
export function getPreset(level: DifficultyLevel): DifficultyConfig {
  const preset = DIFFICULTY_PRESETS[level];
  if (!preset) {
    throw new Error(`Unknown difficulty level: ${level}`);
  }
  return structuredClone(preset);
}

/**
 * Get all available difficulty levels
 */
export function getDifficultyLevels(): DifficultyLevel[] {
  return ["sandbox", "easy", "normal", "hard", "expert", "nightmare"];
}

/**
 * Get difficulty metadata for UI display
 */
export interface DifficultyMetadata {
  level: DifficultyLevel;
  name: string;
  description: string;
  warnings: string[];
  recommendations: string[];
  expectedCompletionRate: string;
}

export const DIFFICULTY_METADATA: Record<DifficultyLevel, DifficultyMetadata> = {
  sandbox: {
    level: "sandbox",
    name: "Sandbox",
    description: "Unlimited resources, no competition. Learn the mechanics freely.",
    warnings: [],
    recommendations: ["First-time players", "Experimenting with strategies"],
    expectedCompletionRate: "95%+",
  },
  easy: {
    level: "easy",
    name: "Easy",
    description: "Forgiving market with helpful bonuses. Good for learning.",
    warnings: ["Achievements worth 50% normal value"],
    recommendations: ["New to business simulations", "Casual play"],
    expectedCompletionRate: "80%+",
  },
  normal: {
    level: "normal",
    name: "Normal",
    description: "Balanced challenge with all systems active. The intended experience.",
    warnings: ["Bankruptcies possible", "Recessions occur"],
    recommendations: ["Most players", "Full game experience"],
    expectedCompletionRate: "60%",
  },
  hard: {
    level: "hard",
    name: "Hard",
    description: "Aggressive competition, frequent disruptions. For experienced players.",
    warnings: ["No hints", "Weak catch-up mechanics", "Stronger competitors"],
    recommendations: ["Experienced players", "Looking for challenge"],
    expectedCompletionRate: "40%",
  },
  expert: {
    level: "expert",
    name: "Expert",
    description: "Minimal starting resources, maximum challenge. Every decision matters.",
    warnings: ["No safety nets", "Extremely competitive", "Frequent crises"],
    recommendations: ["Expert players", "Achievement hunters"],
    expectedCompletionRate: "20%",
  },
  nightmare: {
    level: "nightmare",
    name: "Nightmare",
    description: "Brutal conditions designed to break you. For masochists only.",
    warnings: [
      "No credit line",
      "Constant disruptions",
      "No warning on events",
      "2x competitor strength",
      "Most players will fail",
    ],
    recommendations: ["Completionists", "Streamers", "Those who seek pain"],
    expectedCompletionRate: "<10%",
  },
};
