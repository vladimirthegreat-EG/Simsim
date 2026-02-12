/**
 * Comprehensive Parameter Sweep — Finds optimal balance across ALL engine variables
 *
 * Attacks 3 variables at a time across 16 phases, ordered by impact.
 * Each phase locks in its best values before proceeding.
 * Cross-validation phases catch inter-phase interactions.
 * Global recheck at the end tests top-3 from each critical phase.
 *
 * Features:
 *   - 47 sweepable parameters across all engine systems
 *   - Smooth continuous scoring (no cliff edges)
 *   - Checkpoint/resume for crash recovery
 *   - Segment weight renormalization
 *   - 30 sims × 7 matchups = 210 games per combo
 *   - 10% viability threshold (not 3%)
 *   - Global recheck phase after all phases complete
 *
 * Usage: npx tsx tools/balance/comprehensive-sweep.ts [--resume]
 */

import { SimulationEngine } from "../../src/engine/core/SimulationEngine";
import type { SimulationInput } from "../../src/engine/core/SimulationEngine";
import type { TeamState, MarketState, Segment } from "../../src/engine/types";
import { CONSTANTS } from "../../src/engine/types";
import {
  STRATEGIES,
  type StrategyArchetype,
  type StrategyDecisionMaker,
} from "./strategies";
import * as fs from "fs";
import * as path from "path";

// ============================================
// TYPES
// ============================================

interface SweepParameter {
  name: string;
  constantsKey: string;
  defaultValue: number;
  range: { min: number; max: number };
  steps: number;
  category: string;
  description: string;
  /** For segment weights: segment and dimension to modify */
  segmentWeight?: { segment: Segment; dimension: string };
}

interface SweepPhase {
  id: number;
  name: string;
  description: string;
  parameters: string[]; // constantsKey references
  rationale: string;
}

interface ComboResult {
  params: Record<string, number>;
  winRates: Record<string, number>;
  maxWinRate: number;
  viableStrategies: number;
  snowballRate: number;
  revenueSpread: number;
  closeGameRate: number;
  balanceScore: number;
}

interface PhaseResult {
  phaseId: number;
  phaseName: string;
  bestCombo: Record<string, number>;
  bestScore: number;
  top3: ComboResult[];
  totalCombos: number;
  duration: number;
}

interface SweepCheckpoint {
  startedAt: string;
  lastSavedAt: string;
  completedPhases: PhaseResult[];
  lockedValues: Record<string, number>;
  currentPhase: number | null;
  currentComboIndex: number;
  currentPhaseResults: ComboResult[];
}

// ============================================
// PARAMETER CATALOG (47 parameters)
// ============================================

const PARAMETER_CATALOG: SweepParameter[] = [
  // === MARKET CORE (impact: 5/5) ===
  { name: "Softmax Temperature", constantsKey: "SOFTMAX_TEMPERATURE", defaultValue: 10, range: { min: 3, max: 15 }, steps: 5, category: "Market Core", description: "Market share distribution sharpness" },
  { name: "Brand Decay Rate", constantsKey: "BRAND_DECAY_RATE", defaultValue: 0.025, range: { min: 0.01, max: 0.06 }, steps: 5, category: "Market Core", description: "Per-round proportional brand value decay" },
  { name: "Brand Max Growth/Round", constantsKey: "BRAND_MAX_GROWTH_PER_ROUND", defaultValue: 0.06, range: { min: 0.02, max: 0.10 }, steps: 5, category: "Market Core", description: "Cap on per-round brand value increase" },
  { name: "Price Floor Penalty Threshold", constantsKey: "PRICE_FLOOR_PENALTY_THRESHOLD", defaultValue: 0.15, range: { min: 0.08, max: 0.25 }, steps: 5, category: "Market Core", description: "How far below min before penalty" },
  { name: "Price Floor Penalty Max", constantsKey: "PRICE_FLOOR_PENALTY_MAX", defaultValue: 0.30, range: { min: 0.10, max: 0.50 }, steps: 5, category: "Market Core", description: "Max score reduction from low pricing" },

  // === BRAND SCORING (impact: 4/5) ===
  { name: "Brand Critical Mass High", constantsKey: "BRAND_CRITICAL_MASS_HIGH", defaultValue: 0.55, range: { min: 0.4, max: 0.7 }, steps: 5, category: "Brand Scoring", description: "Brand threshold for bonus" },
  { name: "Brand Critical Mass Low", constantsKey: "BRAND_CRITICAL_MASS_LOW", defaultValue: 0.3, range: { min: 0.15, max: 0.4 }, steps: 5, category: "Brand Scoring", description: "Brand threshold for penalty" },
  { name: "Brand High Multiplier", constantsKey: "BRAND_HIGH_MULTIPLIER", defaultValue: 1.1, range: { min: 1.0, max: 1.2 }, steps: 5, category: "Brand Scoring", description: "Bonus multiplier for strong brands" },
  { name: "Brand Low Multiplier", constantsKey: "BRAND_LOW_MULTIPLIER", defaultValue: 0.9, range: { min: 0.7, max: 0.95 }, steps: 5, category: "Brand Scoring", description: "Penalty multiplier for weak brands" },

  // === BALANCE MECHANICS (impact: 4/5) ===
  { name: "Rubber Band Trailing Boost", constantsKey: "RUBBER_BAND_TRAILING_BOOST", defaultValue: 1.15, range: { min: 1.0, max: 1.3 }, steps: 5, category: "Balance", description: "Share multiplier for trailing teams" },
  { name: "Rubber Band Leading Penalty", constantsKey: "RUBBER_BAND_LEADING_PENALTY", defaultValue: 0.92, range: { min: 0.80, max: 1.0 }, steps: 5, category: "Balance", description: "Share multiplier for leading teams" },
  { name: "Rubber Band Threshold", constantsKey: "RUBBER_BAND_THRESHOLD", defaultValue: 0.5, range: { min: 0.3, max: 0.7 }, steps: 5, category: "Balance", description: "Share threshold triggering catch-up" },
  { name: "Flexibility Bonus Full", constantsKey: "FLEXIBILITY_BONUS_FULL", defaultValue: 0.04, range: { min: 0.02, max: 0.10 }, steps: 5, category: "Balance", description: "Score bonus for 4/4 diversification" },
  { name: "Flexibility Bonus Partial", constantsKey: "FLEXIBILITY_BONUS_PARTIAL", defaultValue: 0.015, range: { min: 0.005, max: 0.03 }, steps: 5, category: "Balance", description: "Score bonus for 3/4 diversification" },
  { name: "Flexibility Min R&D", constantsKey: "FLEXIBILITY_MIN_RD", defaultValue: 3_000_000, range: { min: 1_000_000, max: 5_000_000 }, steps: 5, category: "Balance", description: "Min R&D budget for flex check" },
  { name: "Flexibility Min Brand", constantsKey: "FLEXIBILITY_MIN_BRAND", defaultValue: 0.45, range: { min: 0.3, max: 0.6 }, steps: 5, category: "Balance", description: "Min brand value for flex check" },

  // === QUALITY/FEATURE SYSTEM (impact: 4/5) ===
  { name: "Quality/Feature Bonus Cap", constantsKey: "QUALITY_FEATURE_BONUS_CAP", defaultValue: 1.2, range: { min: 1.1, max: 1.4 }, steps: 5, category: "Quality", description: "Max Q/F multiplier above expectation" },
  { name: "Quality Market Share Bonus", constantsKey: "QUALITY_MARKET_SHARE_BONUS", defaultValue: 0.001, range: { min: 0.0005, max: 0.003 }, steps: 5, category: "Quality", description: "Per-quality-point share bonus" },

  // === R&D (impact: 4/5) ===
  { name: "R&D Budget to Points Ratio", constantsKey: "RD_BUDGET_TO_POINTS_RATIO", defaultValue: 200_000, range: { min: 100_000, max: 400_000 }, steps: 5, category: "R&D", description: "Dollars per R&D progress point" },
  { name: "Base R&D Points/Engineer", constantsKey: "BASE_RD_POINTS_PER_ENGINEER", defaultValue: 10, range: { min: 5, max: 20 }, steps: 4, category: "R&D", description: "Engineer R&D output per round" },
  { name: "Product Dev Base Rounds", constantsKey: "PRODUCT_DEV_BASE_ROUNDS", defaultValue: 2, range: { min: 1, max: 4 }, steps: 4, category: "R&D", description: "Base rounds to develop product" },
  { name: "Product Dev Quality Factor", constantsKey: "PRODUCT_DEV_QUALITY_FACTOR", defaultValue: 0.02, range: { min: 0.01, max: 0.05 }, steps: 5, category: "R&D", description: "Extra rounds per quality above 50" },
  { name: "Product Dev Engineer Speedup", constantsKey: "PRODUCT_DEV_ENGINEER_SPEEDUP", defaultValue: 0.05, range: { min: 0.02, max: 0.10 }, steps: 5, category: "R&D", description: "Per-engineer dev speedup" },

  // === HR (impact: 3/5) ===
  { name: "Base Turnover Rate", constantsKey: "BASE_TURNOVER_RATE", defaultValue: 0.12, range: { min: 0.05, max: 0.20 }, steps: 5, category: "HR", description: "Annual employee turnover base" },
  { name: "Base Worker Output", constantsKey: "BASE_WORKER_OUTPUT", defaultValue: 100, range: { min: 50, max: 200 }, steps: 4, category: "HR", description: "Units per worker per round" },
  { name: "Hiring Cost Multiplier", constantsKey: "HIRING_COST_MULTIPLIER", defaultValue: 0.15, range: { min: 0.05, max: 0.25 }, steps: 5, category: "HR", description: "Fraction of salary as hiring cost" },
  { name: "Workers Per Machine", constantsKey: "WORKERS_PER_MACHINE", defaultValue: 2.5, range: { min: 1.5, max: 4.0 }, steps: 5, category: "HR", description: "Workers needed per production machine" },
  { name: "Training Fatigue Threshold", constantsKey: "TRAINING_FATIGUE_THRESHOLD", defaultValue: 2, range: { min: 1, max: 4 }, steps: 4, category: "HR", description: "Programs before diminishing returns" },
  { name: "Training Fatigue Penalty", constantsKey: "TRAINING_FATIGUE_PENALTY", defaultValue: 0.2, range: { min: 0.1, max: 0.4 }, steps: 4, category: "HR", description: "Effectiveness reduction per excess" },

  // === FACTORY (impact: 3/5) ===
  { name: "Efficiency Per Million", constantsKey: "EFFICIENCY_PER_MILLION", defaultValue: 0.01, range: { min: 0.005, max: 0.02 }, steps: 4, category: "Factory", description: "Efficiency gain per $1M invested" },
  { name: "Efficiency Diminish Threshold", constantsKey: "EFFICIENCY_DIMINISH_THRESHOLD", defaultValue: 10_000_000, range: { min: 5_000_000, max: 20_000_000 }, steps: 4, category: "Factory", description: "Investment before diminishing returns" },
  { name: "Base Defect Rate", constantsKey: "BASE_DEFECT_RATE", defaultValue: 0.05, range: { min: 0.02, max: 0.10 }, steps: 5, category: "Factory", description: "Initial factory defect rate" },
  { name: "Max Efficiency", constantsKey: "MAX_EFFICIENCY", defaultValue: 1.0, range: { min: 0.85, max: 1.0 }, steps: 4, category: "Factory", description: "Cap on factory efficiency" },

  // === MARKETING (impact: 4/5) ===
  { name: "Advertising Base Impact", constantsKey: "ADVERTISING_BASE_IMPACT", defaultValue: 0.0015, range: { min: 0.0005, max: 0.003 }, steps: 5, category: "Marketing", description: "Brand % per $1M advertising" },
  { name: "Advertising Chunk Size", constantsKey: "ADVERTISING_CHUNK_SIZE", defaultValue: 3_000_000, range: { min: 1_000_000, max: 5_000_000 }, steps: 5, category: "Marketing", description: "Chunk size for diminishing returns" },
  { name: "Advertising Decay", constantsKey: "ADVERTISING_DECAY", defaultValue: 0.4, range: { min: 0.2, max: 0.6 }, steps: 5, category: "Marketing", description: "Effectiveness drop per chunk" },
  { name: "Branding Base Impact", constantsKey: "BRANDING_BASE_IMPACT", defaultValue: 0.0025, range: { min: 0.001, max: 0.005 }, steps: 5, category: "Marketing", description: "Brand % per $1M branding" },
  { name: "Branding Linear Threshold", constantsKey: "BRANDING_LINEAR_THRESHOLD", defaultValue: 5_000_000, range: { min: 2_000_000, max: 8_000_000 }, steps: 5, category: "Marketing", description: "Linear benefit ceiling" },
  { name: "Branding Log Multiplier", constantsKey: "BRANDING_LOG_MULTIPLIER", defaultValue: 2.5, range: { min: 1.5, max: 4.0 }, steps: 5, category: "Marketing", description: "Log scaling above threshold" },

  // === ESG (impact: 3/5) ===
  { name: "ESG Penalty Threshold", constantsKey: "ESG_PENALTY_THRESHOLD", defaultValue: 300, range: { min: 200, max: 400 }, steps: 5, category: "ESG", description: "Score below which penalty applies" },
  { name: "ESG Penalty Max", constantsKey: "ESG_PENALTY_MAX", defaultValue: 0.08, range: { min: 0.03, max: 0.15 }, steps: 5, category: "ESG", description: "Max penalty at score 0" },
  { name: "ESG Penalty Min", constantsKey: "ESG_PENALTY_MIN", defaultValue: 0.01, range: { min: 0.005, max: 0.03 }, steps: 4, category: "ESG", description: "Min penalty near threshold" },

  // === FINANCE (impact: 2/5) ===
  { name: "Default Starting Cash", constantsKey: "DEFAULT_STARTING_CASH", defaultValue: 200_000_000, range: { min: 100_000_000, max: 400_000_000 }, steps: 5, category: "Finance", description: "Initial cash for all teams" },
  { name: "FX Volatility Min", constantsKey: "FX_VOLATILITY_MIN", defaultValue: 0.15, range: { min: 0.05, max: 0.25 }, steps: 5, category: "Finance", description: "Minimum FX volatility" },
  { name: "FX Volatility Max", constantsKey: "FX_VOLATILITY_MAX", defaultValue: 0.25, range: { min: 0.15, max: 0.40 }, steps: 5, category: "Finance", description: "Maximum FX volatility" },

  // === SEGMENT WEIGHTS (impact: 4/5) — Active Lifestyle tuning ===
  { name: "AL Brand Weight", constantsKey: "SEGMENT_WEIGHT_AL_BRAND", defaultValue: 16, range: { min: 10, max: 22 }, steps: 5, category: "Segment Weights", description: "Active Lifestyle brand weight", segmentWeight: { segment: "Active Lifestyle", dimension: "brand" } },
  { name: "AL Quality Weight", constantsKey: "SEGMENT_WEIGHT_AL_QUALITY", defaultValue: 28, range: { min: 22, max: 34 }, steps: 5, category: "Segment Weights", description: "Active Lifestyle quality weight", segmentWeight: { segment: "Active Lifestyle", dimension: "quality" } },
];

// ============================================
// PHASE DEFINITIONS (16 phases + global recheck)
// ============================================

const PHASES: SweepPhase[] = [
  // Tier 1: Market Core
  { id: 1, name: "Market Share Distribution", description: "Core market allocation", parameters: ["SOFTMAX_TEMPERATURE", "BRAND_DECAY_RATE", "BRAND_MAX_GROWTH_PER_ROUND"], rationale: "Foundational — controls how score differences map to market share." },
  { id: 2, name: "Price Floor & Quality Cap", description: "Anti-dumping + quality scoring", parameters: ["PRICE_FLOOR_PENALTY_THRESHOLD", "PRICE_FLOOR_PENALTY_MAX", "QUALITY_FEATURE_BONUS_CAP"], rationale: "Affects volume/cost-cutter vs premium/R&D viability." },
  { id: 3, name: "Brand Critical Mass", description: "Brand scoring thresholds", parameters: ["BRAND_CRITICAL_MASS_HIGH", "BRAND_CRITICAL_MASS_LOW", "BRAND_HIGH_MULTIPLIER"], rationale: "Determines when brand investment pays off." },

  // Tier 2: Balance Mechanics
  { id: 4, name: "Rubber-Banding", description: "Catch-up mechanics", parameters: ["RUBBER_BAND_TRAILING_BOOST", "RUBBER_BAND_LEADING_PENALTY", "RUBBER_BAND_THRESHOLD"], rationale: "Prevents snowball. Must tune after market core." },
  { id: 5, name: "Flexibility & Diversity", description: "Diversification rewards", parameters: ["FLEXIBILITY_BONUS_FULL", "FLEXIBILITY_BONUS_PARTIAL", "FLEXIBILITY_MIN_RD"], rationale: "Rewards diversified play. Balanced strategy viability." },

  // Tier 3: Marketing System
  { id: 6, name: "Advertising Effectiveness", description: "Ad spend → brand conversion", parameters: ["ADVERTISING_BASE_IMPACT", "ADVERTISING_DECAY", "ADVERTISING_CHUNK_SIZE"], rationale: "Core brand strategy lever." },
  { id: 7, name: "Branding Investment", description: "Long-term brand building", parameters: ["BRANDING_BASE_IMPACT", "BRANDING_LINEAR_THRESHOLD", "BRANDING_LOG_MULTIPLIER"], rationale: "Complements advertising tuning." },

  // Tier 4: R&D System
  { id: 8, name: "R&D Investment Returns", description: "R&D budget efficiency", parameters: ["RD_BUDGET_TO_POINTS_RATIO", "BASE_RD_POINTS_PER_ENGINEER", "PRODUCT_DEV_ENGINEER_SPEEDUP"], rationale: "Core R&D viability. R&D-focused strategy depends on this." },
  { id: 9, name: "Product Development", description: "Dev speed + quality rewards", parameters: ["PRODUCT_DEV_BASE_ROUNDS", "PRODUCT_DEV_QUALITY_FACTOR", "QUALITY_MARKET_SHARE_BONUS"], rationale: "Time-to-market for R&D strategy." },

  // Tier 5: HR + Factory
  { id: 10, name: "Workforce Economics", description: "Worker productivity + staffing", parameters: ["BASE_WORKER_OUTPUT", "WORKERS_PER_MACHINE", "BASE_TURNOVER_RATE"], rationale: "Production capacity. Affects automation and volume." },
  { id: 11, name: "HR Costs & Training", description: "Hiring/training economics", parameters: ["HIRING_COST_MULTIPLIER", "TRAINING_FATIGUE_THRESHOLD", "TRAINING_FATIGUE_PENALTY"], rationale: "Workforce investment cost fine-tuning." },
  { id: 12, name: "Factory Efficiency", description: "Efficiency curve + defects", parameters: ["EFFICIENCY_PER_MILLION", "EFFICIENCY_DIMINISH_THRESHOLD", "BASE_DEFECT_RATE"], rationale: "Efficiency investment curve + defect baseline." },

  // Tier 6: ESG + Finance
  { id: 13, name: "ESG System", description: "ESG penalty curve", parameters: ["ESG_PENALTY_THRESHOLD", "ESG_PENALTY_MAX", "ESG_PENALTY_MIN"], rationale: "Determines if ignoring ESG is viable." },
  { id: 14, name: "Financial Environment", description: "Starting capital + FX", parameters: ["DEFAULT_STARTING_CASH", "FX_VOLATILITY_MIN", "FX_VOLATILITY_MAX"], rationale: "Affects which strategies are affordable." },

  // Tier 7: Cross-Validation
  { id: 15, name: "Cross-Validate Core", description: "Re-verify highest-impact params", parameters: ["SOFTMAX_TEMPERATURE", "BRAND_DECAY_RATE", "RD_BUDGET_TO_POINTS_RATIO"], rationale: "After all locked, re-check most impactful triple." },
  { id: 16, name: "Cross-Validate Balance", description: "Re-verify safety net", parameters: ["RUBBER_BAND_TRAILING_BOOST", "PRICE_FLOOR_PENALTY_MAX", "BRAND_LOW_MULTIPLIER"], rationale: "Final safety-net check." },
];

// ============================================
// SIMULATION CONFIG
// ============================================

const CONFIG = {
  SIMS_PER_COMBO: 30,    // 30 sims (up from 20 for tighter confidence)
  ROUNDS: 8,
  VIABILITY_THRESHOLD: 0.10,  // 10% win rate = viable

  // 7 matchups — each strategy appears in exactly 4 (equal opportunity)
  MATCHUPS: [
    ["volume", "premium", "brand", "balanced"] as StrategyArchetype[],
    ["brand", "automation", "balanced", "cost-cutter"] as StrategyArchetype[],
    ["volume", "brand", "rd-focused", "cost-cutter"] as StrategyArchetype[],
    ["premium", "automation", "balanced", "rd-focused"] as StrategyArchetype[],
    ["volume", "automation", "rd-focused", "premium"] as StrategyArchetype[],
    ["volume", "cost-cutter", "balanced", "premium"] as StrategyArchetype[],
    ["automation", "brand", "cost-cutter", "rd-focused"] as StrategyArchetype[],
  ],

  CHECKPOINT_FILE: "comprehensive-sweep-checkpoint.json",
  RESULTS_FILE: "comprehensive-sweep-results.json",
};

// ============================================
// PARAMETER MUTATION
// ============================================

/** Store original values for reset */
const ORIGINAL_VALUES: Record<string, any> = {};

function captureOriginals(): void {
  for (const param of PARAMETER_CATALOG) {
    if (param.segmentWeight) {
      const w = (CONSTANTS as any).SEGMENT_WEIGHTS[param.segmentWeight.segment];
      ORIGINAL_VALUES[param.constantsKey] = w[param.segmentWeight.dimension];
    } else {
      ORIGINAL_VALUES[param.constantsKey] = (CONSTANTS as any)[param.constantsKey];
    }
  }
}

function applyParameter(key: string, value: number): void {
  const param = PARAMETER_CATALOG.find(p => p.constantsKey === key);
  if (param?.segmentWeight) {
    // Segment weight — apply and renormalize to sum=100
    const seg = param.segmentWeight.segment;
    const dim = param.segmentWeight.dimension;
    const weights = { ...(CONSTANTS as any).SEGMENT_WEIGHTS[seg] };
    const oldValue = weights[dim];
    const delta = value - oldValue;
    weights[dim] = value;

    // Renormalize: distribute delta proportionally across OTHER dimensions
    const otherDims = Object.keys(weights).filter(d => d !== dim);
    const otherSum = otherDims.reduce((s, d) => s + weights[d], 0);
    if (otherSum > 0 && delta !== 0) {
      for (const d of otherDims) {
        weights[d] = Math.max(1, weights[d] - (delta * weights[d] / otherSum));
      }
      // Ensure exact sum of 100
      const currentSum = Object.values(weights).reduce((s: number, v) => s + (v as number), 0);
      const correction = 100 - currentSum;
      // Apply correction to the largest other dimension
      const largestOther = otherDims.reduce((a, b) => weights[a] > weights[b] ? a : b);
      weights[largestOther] += correction;
    }

    (CONSTANTS as any).SEGMENT_WEIGHTS[seg] = weights;
  } else {
    (CONSTANTS as any)[key] = value;
  }
}

function applyParameters(params: Record<string, number>): void {
  for (const [key, value] of Object.entries(params)) {
    applyParameter(key, value);
  }
}

function resetAllParameters(): void {
  for (const [key, value] of Object.entries(ORIGINAL_VALUES)) {
    const param = PARAMETER_CATALOG.find(p => p.constantsKey === key);
    if (param?.segmentWeight) {
      const seg = param.segmentWeight.segment;
      const dim = param.segmentWeight.dimension;
      (CONSTANTS as any).SEGMENT_WEIGHTS[seg][dim] = value;
    } else {
      (CONSTANTS as any)[key] = value;
    }
  }
}

// ============================================
// GENERATE STEP VALUES
// ============================================

function generateSteps(param: SweepParameter): number[] {
  const values: number[] = [];
  for (let i = 0; i < param.steps; i++) {
    const t = param.steps === 1 ? 0 : i / (param.steps - 1);
    let value = param.range.min + t * (param.range.max - param.range.min);

    // Round to sensible precision
    if (value >= 1_000_000) {
      value = Math.round(value / 100_000) * 100_000;
    } else if (value >= 1000) {
      value = Math.round(value);
    } else if (value >= 1) {
      value = Math.round(value * 100) / 100;
    } else {
      value = Math.round(value * 10000) / 10000;
    }
    values.push(value);
  }
  return values;
}

// ============================================
// SIMULATION RUNNER
// ============================================

function runGame(
  matchup: StrategyArchetype[],
  seed: string,
  rounds: number
): { winner: StrategyArchetype; revenues: Record<string, number>; roundLeaders: StrategyArchetype[]; closeGame: boolean } {
  const teams: { id: string; state: TeamState; archetype: StrategyArchetype; strategy: StrategyDecisionMaker }[] = [];

  for (let i = 0; i < matchup.length; i++) {
    const archetype = matchup[i];
    const state = SimulationEngine.createInitialTeamState();
    teams.push({
      id: `team-${i}-${archetype}`,
      state,
      archetype,
      strategy: STRATEGIES[archetype],
    });
  }

  let marketState = SimulationEngine.createInitialMarketState();
  const roundLeaders: StrategyArchetype[] = [];

  for (let round = 1; round <= rounds; round++) {
    const teamsWithDecisions = teams.map(team => ({
      id: team.id,
      state: team.state,
      decisions: team.strategy(team.state, marketState, round),
    }));

    const input: SimulationInput = {
      roundNumber: round,
      teams: teamsWithDecisions,
      marketState,
      matchSeed: `${seed}-round-${round}`,
    };

    const output = SimulationEngine.processRound(input);

    for (const result of output.results) {
      const team = teams.find(t => t.id === result.teamId);
      if (team) team.state = result.newState;
    }

    const leader = teams.reduce((best, t) =>
      t.state.revenue > best.state.revenue ? t : best
    );
    roundLeaders.push(leader.archetype);
    marketState = output.newMarketState;
  }

  const sorted = [...teams].sort((a, b) => b.state.revenue - a.state.revenue);
  const revenues: Record<string, number> = {};
  for (const t of teams) revenues[t.archetype] = t.state.revenue;

  // Close game: winner within 20% of runner-up
  const closeGame = sorted.length >= 2 && sorted[1].state.revenue > 0
    ? (sorted[0].state.revenue - sorted[1].state.revenue) / sorted[1].state.revenue < 0.2
    : false;

  return { winner: sorted[0].archetype, revenues, roundLeaders, closeGame };
}

function runAllMatchups(seed: string): {
  winRates: Record<string, number>;
  snowballRate: number;
  revenueSpread: number;
  closeGameRate: number;
} {
  const allStrategies = new Set<string>();
  const wins: Record<string, number> = {};
  const totalRevenue: Record<string, number> = {};
  const counts: Record<string, number> = {};
  let totalGames = 0;
  let snowballs = 0;
  let closeGames = 0;

  for (const matchup of CONFIG.MATCHUPS) {
    for (const s of matchup) allStrategies.add(s);

    for (let sim = 0; sim < CONFIG.SIMS_PER_COMBO; sim++) {
      const result = runGame(matchup, `${seed}-m${CONFIG.MATCHUPS.indexOf(matchup)}-s${sim}`, CONFIG.ROUNDS);

      wins[result.winner] = (wins[result.winner] || 0) + 1;
      totalGames++;

      if (result.closeGame) closeGames++;
      if (result.roundLeaders.length >= 3 && result.roundLeaders[2] === result.winner) {
        snowballs++;
      }

      for (const [strat, rev] of Object.entries(result.revenues)) {
        totalRevenue[strat] = (totalRevenue[strat] || 0) + rev;
        counts[strat] = (counts[strat] || 0) + 1;
      }
    }
  }

  const winRates: Record<string, number> = {};
  for (const s of allStrategies) {
    winRates[s] = totalGames > 0 ? (wins[s] || 0) / totalGames : 0;
  }

  const avgRevenues = Object.entries(totalRevenue).map(([s, r]) => r / (counts[s] || 1));
  const maxRev = Math.max(...avgRevenues);
  const minRev = Math.min(...avgRevenues.filter(r => r > 0));
  const revenueSpread = minRev > 0 ? maxRev / minRev : 1;
  const snowballRate = totalGames > 0 ? snowballs / totalGames : 0;
  const closeGameRate = totalGames > 0 ? closeGames / totalGames : 0;

  return { winRates, snowballRate, revenueSpread, closeGameRate };
}

// ============================================
// SMOOTH CONTINUOUS SCORING (no cliff edges)
// ============================================

function scoreBalance(
  winRates: Record<string, number>,
  snowballRate: number,
  revenueSpread: number,
  closeGameRate: number
): number {
  let score = 100;

  // === Dominance penalty: continuous quadratic above 25% (smooth, no cliff) ===
  // Ideal: each of 7 strategies = ~14.3%. Penalize deviation.
  // Quadratic: penalty grows smoothly as win rate increases
  for (const rate of Object.values(winRates)) {
    if (rate > 0.25) {
      // Quadratic penalty: (rate - 0.25)^2 * scale
      // At 40%: (0.15)^2 * 400 = 9
      // At 60%: (0.35)^2 * 400 = 49
      // At 80%: (0.55)^2 * 400 = 121 (capped by max score)
      score -= Math.pow(rate - 0.25, 2) * 400;
    }
  }

  // === Non-viability penalty: continuous below 10% ===
  for (const rate of Object.values(winRates)) {
    if (rate === 0) {
      score -= 15; // Dead strategy is bad
    } else if (rate < CONFIG.VIABILITY_THRESHOLD) {
      // Linear penalty: 0% at threshold, -10 at 0%
      score -= 10 * (1 - rate / CONFIG.VIABILITY_THRESHOLD);
    }
  }

  // === Viable strategy count reward ===
  const viable = Object.values(winRates).filter(r => r >= CONFIG.VIABILITY_THRESHOLD).length;
  score += viable * 3;

  // === Snowball penalty: continuous quadratic ===
  if (snowballRate > 0.3) {
    score -= Math.pow(snowballRate - 0.3, 2) * 100;
  }

  // === Revenue spread reward ===
  // Sweet spot: 1.3x-2.0x. Too tight = boring, too wide = imbalanced
  if (revenueSpread >= 1.3 && revenueSpread <= 2.0) {
    score += 5;
  } else if (revenueSpread > 2.0) {
    score -= (revenueSpread - 2.0) * 5; // Penalize wide spread
  } else if (revenueSpread < 1.1) {
    score -= 3; // Too tight
  }

  // === Win distribution entropy reward ===
  const rates = Object.values(winRates).filter(r => r > 0);
  if (rates.length >= 3) {
    // Shannon entropy (normalized to 0-1)
    const entropy = -rates.reduce((sum, r) => {
      return r > 0 ? sum + r * Math.log2(r) : sum;
    }, 0);
    const maxEntropy = Math.log2(rates.length);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

    // Reward high entropy (even distribution)
    score += normalizedEntropy * 10;
  }

  // === Close game rate reward ===
  if (closeGameRate > 0.3) {
    score += 3;
  } else if (closeGameRate < 0.15) {
    score -= 3;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================
// CARTESIAN PRODUCT
// ============================================

function cartesianProduct(arrays: number[][]): number[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);
  return first.flatMap(val => restProduct.map(combo => [val, ...combo]));
}

// ============================================
// CHECKPOINT SYSTEM
// ============================================

function loadCheckpoint(): SweepCheckpoint | null {
  try {
    if (fs.existsSync(CONFIG.CHECKPOINT_FILE)) {
      const data = fs.readFileSync(CONFIG.CHECKPOINT_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    // Corrupted checkpoint, start fresh
  }
  return null;
}

function saveCheckpoint(checkpoint: SweepCheckpoint): void {
  checkpoint.lastSavedAt = new Date().toISOString();
  fs.writeFileSync(CONFIG.CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

function createFreshCheckpoint(): SweepCheckpoint {
  return {
    startedAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
    completedPhases: [],
    lockedValues: {},
    currentPhase: null,
    currentComboIndex: 0,
    currentPhaseResults: [],
  };
}

// ============================================
// PHASE EXECUTOR
// ============================================

function executePhase(
  phase: SweepPhase,
  lockedValues: Record<string, number>,
  checkpoint: SweepCheckpoint,
  startFromCombo: number = 0,
  existingResults: ComboResult[] = []
): { bestParams: Record<string, number>; bestScore: number; top3: ComboResult[]; allResults: ComboResult[] } {
  // Get parameter definitions for this phase
  const phaseParams = phase.parameters.map(key => {
    const param = PARAMETER_CATALOG.find(p => p.constantsKey === key);
    if (!param) throw new Error(`Unknown parameter: ${key}`);
    return param;
  });

  // Generate step values
  const paramValues = phaseParams.map(p => generateSteps(p));
  const combos = cartesianProduct(paramValues);
  const totalCombos = combos.length;

  const results = [...existingResults];

  for (let idx = startFromCombo; idx < totalCombos; idx++) {
    const combo = combos[idx];
    const params: Record<string, number> = {};
    phaseParams.forEach((p, i) => {
      params[p.constantsKey] = combo[i];
    });

    // Reset, apply locked + current
    resetAllParameters();
    applyParameters(lockedValues);
    applyParameters(params);

    // Run simulations
    const seed = `phase-${phase.id}-combo-${idx}`;
    const { winRates, snowballRate, revenueSpread, closeGameRate } = runAllMatchups(seed);

    const maxWinRate = Math.max(...Object.values(winRates));
    const viableStrategies = Object.values(winRates).filter(r => r >= CONFIG.VIABILITY_THRESHOLD).length;
    const balanceScore = scoreBalance(winRates, snowballRate, revenueSpread, closeGameRate);

    results.push({
      params,
      winRates,
      maxWinRate,
      viableStrategies,
      snowballRate,
      revenueSpread,
      closeGameRate,
      balanceScore,
    });

    // Checkpoint every 10 combos
    if ((idx + 1) % 10 === 0) {
      checkpoint.currentComboIndex = idx + 1;
      checkpoint.currentPhaseResults = results;
      saveCheckpoint(checkpoint);
    }

    // Progress
    if ((idx + 1) % 5 === 0 || idx + 1 === totalCombos) {
      const bestSoFar = Math.max(...results.map(r => r.balanceScore));
      process.stdout.write(`\r    Combo ${idx + 1}/${totalCombos} — best: ${bestSoFar.toFixed(1)}/100  `);
    }
  }

  process.stdout.write("\n");

  // Sort by score and return
  results.sort((a, b) => b.balanceScore - a.balanceScore);

  return {
    bestParams: results[0].params,
    bestScore: results[0].balanceScore,
    top3: results.slice(0, 3),
    allResults: results,
  };
}

// ============================================
// GLOBAL RECHECK
// ============================================

function executeGlobalRecheck(
  completedPhases: PhaseResult[],
  lockedValues: Record<string, number>,
): Record<string, number> {
  console.log("\n=== GLOBAL RECHECK ===");
  console.log("  Testing top-3 values from each critical phase...\n");

  // Collect unique critical parameters and their top-3 values
  const criticalPhaseIds = [1, 2, 3, 4, 6, 8]; // Market core, price, brand, rubber-band, advertising, R&D
  const paramAlternatives: Record<string, Set<number>> = {};

  for (const phaseResult of completedPhases) {
    if (!criticalPhaseIds.includes(phaseResult.phaseId)) continue;
    for (const combo of phaseResult.top3) {
      for (const [key, value] of Object.entries(combo.params)) {
        if (!paramAlternatives[key]) paramAlternatives[key] = new Set();
        paramAlternatives[key].add(value);
      }
    }
  }

  // For each critical parameter, test each alternative value while holding others locked
  let bestOverallScore = -1;
  let bestOverallValues = { ...lockedValues };

  const paramKeys = Object.keys(paramAlternatives);
  let tested = 0;
  const totalTests = paramKeys.reduce((s, k) => s + paramAlternatives[k].size, 0);

  for (const key of paramKeys) {
    const alternatives = [...paramAlternatives[key]];
    let bestForParam = lockedValues[key];
    let bestScoreForParam = -1;

    for (const value of alternatives) {
      resetAllParameters();
      const testValues = { ...bestOverallValues, [key]: value };
      applyParameters(testValues);

      const seed = `recheck-${key}-${value}`;
      const { winRates, snowballRate, revenueSpread, closeGameRate } = runAllMatchups(seed);
      const score = scoreBalance(winRates, snowballRate, revenueSpread, closeGameRate);

      if (score > bestScoreForParam) {
        bestScoreForParam = score;
        bestForParam = value;
      }

      tested++;
      process.stdout.write(`\r    Recheck ${tested}/${totalTests} — ${key}=${value} → ${score.toFixed(1)}  `);
    }

    bestOverallValues[key] = bestForParam;
  }

  process.stdout.write("\n");
  return bestOverallValues;
}

// ============================================
// VALIDATION
// ============================================

function runValidation(lockedValues: Record<string, number>, simsPerCombo: number = 100): void {
  console.log(`\n=== FINAL VALIDATION (${simsPerCombo} sims × ${CONFIG.MATCHUPS.length} matchups = ${simsPerCombo * CONFIG.MATCHUPS.length} games) ===\n`);

  resetAllParameters();
  applyParameters(lockedValues);

  const originalSims = CONFIG.SIMS_PER_COMBO;
  CONFIG.SIMS_PER_COMBO = simsPerCombo;

  const { winRates, snowballRate, revenueSpread, closeGameRate } = runAllMatchups("validation-final");
  const score = scoreBalance(winRates, snowballRate, revenueSpread, closeGameRate);

  CONFIG.SIMS_PER_COMBO = originalSims;

  console.log(`  Balance Score: ${score.toFixed(1)}/100`);
  console.log(`  Snowball Rate: ${(snowballRate * 100).toFixed(1)}%`);
  console.log(`  Revenue Spread: ${revenueSpread.toFixed(2)}x`);
  console.log(`  Close Game Rate: ${(closeGameRate * 100).toFixed(1)}%\n`);

  console.log("  Strategy Win Rates:");
  const sortedRates = Object.entries(winRates).sort((a, b) => b[1] - a[1]);
  for (const [strat, rate] of sortedRates) {
    const bar = "█".repeat(Math.round(rate * 50));
    const viable = rate >= CONFIG.VIABILITY_THRESHOLD ? "✓" : "✗";
    console.log(`    ${viable} ${strat.padEnd(14)} ${(rate * 100).toFixed(1).padStart(5)}% ${bar}`);
  }

  const viableCount = Object.values(winRates).filter(r => r >= CONFIG.VIABILITY_THRESHOLD).length;
  console.log(`\n  Viable strategies: ${viableCount}/7 (threshold: ${CONFIG.VIABILITY_THRESHOLD * 100}%)`);

  if (viableCount >= 5) {
    console.log("  ✓ PASSED — Strong balance");
  } else if (viableCount >= 3) {
    console.log("  ~ MARGINAL — Acceptable but could improve");
  } else {
    console.log("  ✗ FAILED — Too few viable strategies");
  }
}

// ============================================
// REPORT
// ============================================

function printPhaseResult(phase: SweepPhase, result: PhaseResult): void {
  console.log(`\n  Best score: ${result.bestScore.toFixed(1)}/100`);
  console.log(`  Locked values:`);
  for (const [key, value] of Object.entries(result.bestCombo)) {
    const param = PARAMETER_CATALOG.find(p => p.constantsKey === key);
    const name = param?.name || key;
    const formatted = value >= 1000 ? `$${(value / 1_000_000).toFixed(1)}M` : value.toString();
    console.log(`    ${name}: ${formatted}`);
  }
  console.log(`  Top-3 win distributions:`);
  for (let i = 0; i < Math.min(3, result.top3.length); i++) {
    const r = result.top3[i];
    const winStr = Object.entries(r.winRates)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k.substring(0, 5)}:${(v * 100).toFixed(0)}%`)
      .join(" ");
    console.log(`    #${i + 1} [${r.balanceScore.toFixed(1)}] ${winStr}`);
  }
}

function printFinalRecommendation(lockedValues: Record<string, number>): void {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  RECOMMENDED CONSTANTS UPDATES                               ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");

  // Group by category
  const byCategory: Record<string, Array<{ name: string; key: string; value: number; default: number }>> = {};
  for (const [key, value] of Object.entries(lockedValues)) {
    const param = PARAMETER_CATALOG.find(p => p.constantsKey === key);
    if (!param) continue;
    const cat = param.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ name: param.name, key, value, default: param.defaultValue });
  }

  for (const [category, params] of Object.entries(byCategory)) {
    console.log(`║  [${category}]`);
    for (const p of params) {
      const changed = Math.abs(p.value - p.default) > 0.0001;
      const marker = changed ? "→" : "=";
      const formatted = p.value >= 1000 ? `$${(p.value / 1_000_000).toFixed(1)}M` : p.value.toString();
      const defaultFormatted = p.default >= 1000 ? `$${(p.default / 1_000_000).toFixed(1)}M` : p.default.toString();
      console.log(`║    ${p.name.padEnd(30)} ${defaultFormatted.padStart(10)} ${marker} ${formatted.padStart(10)}`);
    }
  }

  console.log("╚══════════════════════════════════════════════════════════════╝");
}

// ============================================
// MAIN
// ============================================

async function main() {
  const startTime = Date.now();

  // Capture originals before any mutation
  captureOriginals();

  // Check for resume
  const isResume = process.argv.includes("--resume");
  let checkpoint: SweepCheckpoint;

  if (isResume) {
    const loaded = loadCheckpoint();
    if (loaded) {
      checkpoint = loaded;
      console.log(`Resuming from checkpoint (${loaded.completedPhases.length} phases completed)`);
    } else {
      console.log("No checkpoint found, starting fresh");
      checkpoint = createFreshCheckpoint();
    }
  } else {
    checkpoint = createFreshCheckpoint();
  }

  // Calculate totals
  let totalCombos = 0;
  for (const phase of PHASES) {
    const phaseParams = phase.parameters.map(key => PARAMETER_CATALOG.find(p => p.constantsKey === key)!);
    const combos = phaseParams.reduce((prod, p) => prod * p.steps, 1);
    totalCombos += combos;
  }
  const totalGames = totalCombos * CONFIG.SIMS_PER_COMBO * CONFIG.MATCHUPS.length;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   COMPREHENSIVE PARAMETER SWEEP — Balance Optimizer          ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Parameters:        ${PARAMETER_CATALOG.length}`);
  console.log(`║  Phases:            ${PHASES.length}`);
  console.log(`║  Total combinations: ${totalCombos}`);
  console.log(`║  Sims per combo:    ${CONFIG.SIMS_PER_COMBO} × ${CONFIG.MATCHUPS.length} matchups = ${CONFIG.SIMS_PER_COMBO * CONFIG.MATCHUPS.length} games`);
  console.log(`║  Total games:       ~${totalGames.toLocaleString()}`);
  console.log(`║  Viability:         >${CONFIG.VIABILITY_THRESHOLD * 100}% win rate`);
  console.log(`║  Scoring:           Continuous quadratic (no cliff edges)`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Suppress console output during simulations
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Execute phases
  for (const phase of PHASES) {
    // Skip completed phases
    if (checkpoint.completedPhases.find(p => p.phaseId === phase.id)) {
      originalLog(`Phase ${phase.id}: ${phase.name} — SKIPPED (already completed)`);
      continue;
    }

    const phaseStart = Date.now();
    originalLog(`\n▶ Phase ${phase.id}/${PHASES.length}: ${phase.name}`);
    originalLog(`  ${phase.description}`);
    originalLog(`  Parameters: ${phase.parameters.join(", ")}`);
    originalLog(`  Rationale: ${phase.rationale}`);

    checkpoint.currentPhase = phase.id;

    const startCombo = checkpoint.currentPhase === phase.id && checkpoint.currentComboIndex > 0
      ? checkpoint.currentComboIndex : 0;
    const existingResults = checkpoint.currentPhase === phase.id && checkpoint.currentPhaseResults.length > 0
      ? checkpoint.currentPhaseResults : [];

    // Suppress during simulation
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};

    const result = executePhase(phase, checkpoint.lockedValues, checkpoint, startCombo, existingResults);

    // Restore for reporting
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;

    const duration = Date.now() - phaseStart;

    // Lock in best values
    for (const [key, value] of Object.entries(result.bestParams)) {
      checkpoint.lockedValues[key] = value;
    }

    const phaseResult: PhaseResult = {
      phaseId: phase.id,
      phaseName: phase.name,
      bestCombo: result.bestParams,
      bestScore: result.bestScore,
      top3: result.top3,
      totalCombos: result.allResults.length,
      duration,
    };

    checkpoint.completedPhases.push(phaseResult);
    checkpoint.currentPhase = null;
    checkpoint.currentComboIndex = 0;
    checkpoint.currentPhaseResults = [];
    saveCheckpoint(checkpoint);

    printPhaseResult(phase, phaseResult);
    originalLog(`  Duration: ${(duration / 1000).toFixed(1)}s`);
  }

  // Global recheck
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  const recheckedValues = executeGlobalRecheck(
    checkpoint.completedPhases,
    checkpoint.lockedValues,
  );

  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;

  checkpoint.lockedValues = recheckedValues;
  saveCheckpoint(checkpoint);

  // Final validation
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  // Run validation games with suppressed output, then restore for reporting
  resetAllParameters();
  applyParameters(recheckedValues);
  const valSims = 100;
  const origSims = CONFIG.SIMS_PER_COMBO;
  CONFIG.SIMS_PER_COMBO = valSims;
  const valResults = runAllMatchups("validation-final");
  CONFIG.SIMS_PER_COMBO = origSims;

  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;

  // Print validation results
  const valScore = scoreBalance(valResults.winRates, valResults.snowballRate, valResults.revenueSpread, valResults.closeGameRate);
  console.log(`\n=== FINAL VALIDATION (${valSims} sims × ${CONFIG.MATCHUPS.length} matchups = ${valSims * CONFIG.MATCHUPS.length} games) ===\n`);
  console.log(`  Balance Score: ${valScore.toFixed(1)}/100`);
  console.log(`  Snowball Rate: ${(valResults.snowballRate * 100).toFixed(1)}%`);
  console.log(`  Revenue Spread: ${valResults.revenueSpread.toFixed(2)}x`);
  console.log(`  Close Game Rate: ${(valResults.closeGameRate * 100).toFixed(1)}%\n`);
  console.log("  Strategy Win Rates:");
  const sortedRates = Object.entries(valResults.winRates).sort((a, b) => b[1] - a[1]);
  for (const [strat, rate] of sortedRates) {
    const bar = "█".repeat(Math.round(rate * 50));
    const viable = rate >= CONFIG.VIABILITY_THRESHOLD ? "✓" : "✗";
    console.log(`    ${viable} ${strat.padEnd(14)} ${(rate * 100).toFixed(1).padStart(5)}% ${bar}`);
  }
  const viableCount = Object.values(valResults.winRates).filter(r => r >= CONFIG.VIABILITY_THRESHOLD).length;
  console.log(`\n  Viable strategies: ${viableCount}/7 (threshold: ${CONFIG.VIABILITY_THRESHOLD * 100}%)`);

  // Print final recommendation
  printFinalRecommendation(checkpoint.lockedValues);

  // Save results
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const output = {
    timestamp: new Date().toISOString(),
    config: {
      parameters: PARAMETER_CATALOG.length,
      phases: PHASES.length,
      simsPerCombo: CONFIG.SIMS_PER_COMBO,
      matchups: CONFIG.MATCHUPS.length,
      viabilityThreshold: CONFIG.VIABILITY_THRESHOLD,
    },
    phases: checkpoint.completedPhases,
    finalValues: checkpoint.lockedValues,
    validation: {
      score: valScore,
      winRates: valResults.winRates,
      snowballRate: valResults.snowballRate,
      revenueSpread: valResults.revenueSpread,
      closeGameRate: valResults.closeGameRate,
      viableStrategies: viableCount,
    },
    duration: elapsed,
  };

  fs.writeFileSync(CONFIG.RESULTS_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${CONFIG.RESULTS_FILE}`);
  console.log(`Checkpoint saved to: ${CONFIG.CHECKPOINT_FILE}`);
  console.log(`Total time: ${elapsed}s`);
}

main().catch(err => {
  // Restore console in case of error
  console.error("Comprehensive sweep failed:", err);
  process.exit(2);
});
