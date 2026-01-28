/**
 * Economic Cycle Engine
 *
 * Models macroeconomic conditions including GDP growth, inflation,
 * consumer confidence, and interest rates. Cycles through expansion,
 * peak, contraction, and trough phases.
 *
 * Phase 12: Economic Cycle System
 */

import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig, EconomicPhase } from "../config/schema";

// ============================================
// TYPES
// ============================================

export interface EconomicState {
  cyclePhase: EconomicPhase;
  roundsInPhase: number;
  gdpGrowth: number; // % annual growth
  inflation: number; // % annual
  unemployment: number; // %
  consumerConfidence: number; // 0-100
  interestRates: {
    federal: number;
    corporate: number;
    consumer: number;
  };
  currencyStrength: number; // 0-2, 1 = baseline
  commodityPrices: {
    electronics: number; // Multiplier
    metals: number;
    energy: number;
    logistics: number;
  };
}

export interface EconomicImpact {
  demandMultiplier: number;
  costMultiplier: number;
  financingCostMultiplier: number;
  laborCostMultiplier: number;
  investorSentimentModifier: number;
  messages: string[];
}

export interface EconomicForecast {
  nextPhase: EconomicPhase;
  transitionProbability: number;
  gdpForecast: { low: number; mid: number; high: number };
  inflationForecast: { low: number; mid: number; high: number };
  riskFactors: string[];
}

// ============================================
// CONSTANTS
// ============================================

const BASE_ECONOMIC_CONDITIONS: Record<EconomicPhase, Partial<EconomicState>> = {
  expansion: {
    gdpGrowth: 3.0,
    inflation: 2.5,
    unemployment: 4.5,
    consumerConfidence: 75,
    interestRates: { federal: 2.5, corporate: 4.5, consumer: 7.0 },
  },
  peak: {
    gdpGrowth: 2.0,
    inflation: 4.0,
    unemployment: 3.5,
    consumerConfidence: 80,
    interestRates: { federal: 4.0, corporate: 6.0, consumer: 9.0 },
  },
  contraction: {
    gdpGrowth: -1.0,
    inflation: 1.5,
    unemployment: 6.5,
    consumerConfidence: 45,
    interestRates: { federal: 2.0, corporate: 5.0, consumer: 8.0 },
  },
  trough: {
    gdpGrowth: -2.0,
    inflation: 0.5,
    unemployment: 8.0,
    consumerConfidence: 35,
    interestRates: { federal: 0.5, corporate: 3.5, consumer: 6.0 },
  },
};

const CYCLE_TRANSITION_PROBABILITIES: Record<EconomicPhase, Record<EconomicPhase, number>> = {
  expansion: { expansion: 0.7, peak: 0.3, contraction: 0, trough: 0 },
  peak: { expansion: 0.1, peak: 0.3, contraction: 0.6, trough: 0 },
  contraction: { expansion: 0, peak: 0, contraction: 0.5, trough: 0.5 },
  trough: { expansion: 0.6, peak: 0, contraction: 0.2, trough: 0.2 },
};

const MIN_ROUNDS_IN_PHASE: Record<EconomicPhase, number> = {
  expansion: 4,
  peak: 2,
  contraction: 3,
  trough: 2,
};

// ============================================
// ENGINE
// ============================================

export class EconomicCycleEngine {
  /**
   * Process economic cycle for a round
   */
  static processEconomicCycle(
    previousState: EconomicState | null,
    config: EngineConfig,
    ctx: EngineContext
  ): { state: EconomicState; impact: EconomicImpact; forecast: EconomicForecast } {
    // Check if economic cycles are enabled
    if (!config.difficulty.complexity.economicCycles) {
      return {
        state: this.getStableEconomy(),
        impact: this.getStableImpact(),
        forecast: this.getStableForecast(),
      };
    }

    // Initialize or transition state
    const state = previousState
      ? this.transitionState(previousState, config, ctx)
      : this.initializeState(config, ctx);

    // Apply volatility from difficulty
    this.applyVolatility(state, config, ctx);

    // Calculate business impact
    const impact = this.calculateImpact(state, config);

    // Generate forecast
    const forecast = this.generateForecast(state, config);

    return { state, impact, forecast };
  }

  /**
   * Initialize economic state
   */
  static initializeState(config: EngineConfig, ctx: EngineContext): EconomicState {
    const phase: EconomicPhase = "expansion"; // Start in expansion
    const baseConditions = BASE_ECONOMIC_CONDITIONS[phase];

    return {
      cyclePhase: phase,
      roundsInPhase: 0,
      gdpGrowth: baseConditions.gdpGrowth ?? 3.0,
      inflation: baseConditions.inflation ?? 2.5,
      unemployment: baseConditions.unemployment ?? 4.5,
      consumerConfidence: baseConditions.consumerConfidence ?? 75,
      interestRates: baseConditions.interestRates ?? { federal: 2.5, corporate: 4.5, consumer: 7.0 },
      currencyStrength: 1.0,
      commodityPrices: {
        electronics: 1.0,
        metals: 1.0,
        energy: 1.0,
        logistics: 1.0,
      },
    };
  }

  /**
   * Get stable economy for when cycles are disabled
   */
  private static getStableEconomy(): EconomicState {
    return {
      cyclePhase: "expansion",
      roundsInPhase: 0,
      gdpGrowth: 2.5,
      inflation: 2.0,
      unemployment: 5.0,
      consumerConfidence: 70,
      interestRates: { federal: 2.0, corporate: 4.0, consumer: 6.5 },
      currencyStrength: 1.0,
      commodityPrices: {
        electronics: 1.0,
        metals: 1.0,
        energy: 1.0,
        logistics: 1.0,
      },
    };
  }

  /**
   * Get stable impact for when cycles are disabled
   */
  private static getStableImpact(): EconomicImpact {
    return {
      demandMultiplier: 1.0,
      costMultiplier: 1.0,
      financingCostMultiplier: 1.0,
      laborCostMultiplier: 1.0,
      investorSentimentModifier: 0,
      messages: [],
    };
  }

  /**
   * Get stable forecast for when cycles are disabled
   */
  private static getStableForecast(): EconomicForecast {
    return {
      nextPhase: "expansion",
      transitionProbability: 0,
      gdpForecast: { low: 2.0, mid: 2.5, high: 3.0 },
      inflationForecast: { low: 1.5, mid: 2.0, high: 2.5 },
      riskFactors: [],
    };
  }

  /**
   * Transition to potentially new phase
   */
  private static transitionState(
    previousState: EconomicState,
    config: EngineConfig,
    ctx: EngineContext
  ): EconomicState {
    const state = { ...previousState };
    state.roundsInPhase++;

    // Check for phase transition
    const minRounds = MIN_ROUNDS_IN_PHASE[state.cyclePhase];
    if (state.roundsInPhase >= minRounds) {
      const transitionProbs = CYCLE_TRANSITION_PROBABILITIES[state.cyclePhase];

      // Adjust for recession probability from difficulty
      const adjustedProbs = { ...transitionProbs };
      if (state.cyclePhase === "expansion" || state.cyclePhase === "peak") {
        const recessionBoost = config.difficulty.economy.recessionProbability;
        adjustedProbs.contraction = (adjustedProbs.contraction ?? 0) + recessionBoost;
        adjustedProbs[state.cyclePhase] -= recessionBoost;
      }

      // Determine new phase
      const roll = ctx.rng.general.next();
      let cumulative = 0;
      for (const [phase, prob] of Object.entries(adjustedProbs)) {
        cumulative += prob;
        if (roll < cumulative) {
          if (phase !== state.cyclePhase) {
            state.cyclePhase = phase as EconomicPhase;
            state.roundsInPhase = 0;
          }
          break;
        }
      }
    }

    // Update base conditions for new phase
    const baseConditions = BASE_ECONOMIC_CONDITIONS[state.cyclePhase];
    state.gdpGrowth = baseConditions.gdpGrowth ?? state.gdpGrowth;
    state.inflation = baseConditions.inflation ?? state.inflation;
    state.unemployment = baseConditions.unemployment ?? state.unemployment;
    state.consumerConfidence = baseConditions.consumerConfidence ?? state.consumerConfidence;
    state.interestRates = baseConditions.interestRates ?? state.interestRates;

    return state;
  }

  /**
   * Apply volatility based on difficulty settings
   */
  private static applyVolatility(
    state: EconomicState,
    config: EngineConfig,
    ctx: EngineContext
  ): void {
    const volatility = config.difficulty.economy.volatility;

    // GDP volatility
    state.gdpGrowth += ctx.rng.general.gaussian(0, volatility * 0.5);

    // Inflation from difficulty settings
    const [minInflation, maxInflation] = config.difficulty.economy.inflationRange;
    state.inflation = ctx.rng.general.range(minInflation, maxInflation);

    // Consumer confidence volatility
    state.consumerConfidence += ctx.rng.general.gaussian(0, volatility * 5);
    state.consumerConfidence = Math.max(10, Math.min(100, state.consumerConfidence));

    // Commodity price volatility
    const commodityVolatility = volatility * 0.1;
    state.commodityPrices.electronics *= 1 + ctx.rng.general.gaussian(0, commodityVolatility);
    state.commodityPrices.metals *= 1 + ctx.rng.general.gaussian(0, commodityVolatility);
    state.commodityPrices.energy *= 1 + ctx.rng.general.gaussian(0, commodityVolatility);
    state.commodityPrices.logistics *= 1 + ctx.rng.general.gaussian(0, commodityVolatility);

    // Clamp commodity prices
    for (const key of Object.keys(state.commodityPrices) as (keyof typeof state.commodityPrices)[]) {
      state.commodityPrices[key] = Math.max(0.5, Math.min(2.0, state.commodityPrices[key]));
    }

    // Currency strength
    state.currencyStrength += ctx.rng.general.gaussian(0, volatility * 0.05);
    state.currencyStrength = Math.max(0.7, Math.min(1.3, state.currencyStrength));
  }

  /**
   * Calculate business impact of economic conditions
   */
  static calculateImpact(state: EconomicState, config: EngineConfig): EconomicImpact {
    const messages: string[] = [];

    // Demand multiplier based on consumer confidence and GDP
    const confidenceEffect = (state.consumerConfidence - 50) / 100;
    const gdpEffect = state.gdpGrowth / 100;
    let demandMultiplier = 1 + confidenceEffect * 0.3 + gdpEffect * 0.2;
    demandMultiplier *= config.difficulty.economy.demandGrowthMultiplier;

    // Cost multiplier based on inflation and commodities
    const inflationEffect = state.inflation / 100;
    const commodityAvg =
      (state.commodityPrices.electronics +
        state.commodityPrices.metals +
        state.commodityPrices.energy +
        state.commodityPrices.logistics) /
      4;
    const costMultiplier = (1 + inflationEffect) * commodityAvg;

    // Financing cost multiplier
    const financingCostMultiplier = state.interestRates.corporate / 4.5; // Relative to baseline

    // Labor cost multiplier based on unemployment
    const laborCostMultiplier = state.unemployment < 5 ? 1.1 : state.unemployment > 7 ? 0.95 : 1.0;

    // Investor sentiment modifier
    let investorSentimentModifier = 0;
    if (state.cyclePhase === "expansion") {
      investorSentimentModifier = 10;
    } else if (state.cyclePhase === "peak") {
      investorSentimentModifier = 5;
    } else if (state.cyclePhase === "contraction") {
      investorSentimentModifier = -15;
    } else if (state.cyclePhase === "trough") {
      investorSentimentModifier = -10;
    }

    // Generate messages
    if (state.cyclePhase === "expansion") {
      messages.push(`Economy expanding: GDP growth at ${state.gdpGrowth.toFixed(1)}%`);
    } else if (state.cyclePhase === "contraction") {
      messages.push(`Economic contraction: GDP at ${state.gdpGrowth.toFixed(1)}%`);
    } else if (state.cyclePhase === "trough") {
      messages.push(`Economy in recession: GDP at ${state.gdpGrowth.toFixed(1)}%`);
    }

    if (state.inflation > 5) {
      messages.push(`High inflation at ${state.inflation.toFixed(1)}% impacting costs`);
    }

    if (state.consumerConfidence < 40) {
      messages.push(`Consumer confidence low at ${state.consumerConfidence.toFixed(0)}, demand weakening`);
    } else if (state.consumerConfidence > 80) {
      messages.push(`Strong consumer confidence at ${state.consumerConfidence.toFixed(0)} boosting demand`);
    }

    return {
      demandMultiplier,
      costMultiplier,
      financingCostMultiplier,
      laborCostMultiplier,
      investorSentimentModifier,
      messages,
    };
  }

  /**
   * Generate economic forecast
   */
  static generateForecast(state: EconomicState, config: EngineConfig): EconomicForecast {
    const transitionProbs = CYCLE_TRANSITION_PROBABILITIES[state.cyclePhase];

    // Find most likely next phase
    let maxProb = 0;
    let nextPhase: EconomicPhase = state.cyclePhase;
    for (const [phase, prob] of Object.entries(transitionProbs)) {
      if (prob > maxProb) {
        maxProb = prob;
        nextPhase = phase as EconomicPhase;
      }
    }

    // GDP forecast ranges
    const nextConditions = BASE_ECONOMIC_CONDITIONS[nextPhase];
    const gdpBase = nextConditions.gdpGrowth ?? state.gdpGrowth;
    const volatility = config.difficulty.economy.volatility;

    const gdpForecast = {
      low: gdpBase - volatility,
      mid: gdpBase,
      high: gdpBase + volatility,
    };

    // Inflation forecast
    const [minInflation, maxInflation] = config.difficulty.economy.inflationRange;
    const inflationForecast = {
      low: minInflation,
      mid: (minInflation + maxInflation) / 2,
      high: maxInflation,
    };

    // Risk factors
    const riskFactors: string[] = [];
    if (transitionProbs.contraction && transitionProbs.contraction > 0.2) {
      riskFactors.push("Elevated recession risk");
    }
    if (state.inflation > 4) {
      riskFactors.push("Inflationary pressure");
    }
    if (state.interestRates.federal > 3.5) {
      riskFactors.push("Tight monetary policy");
    }
    if (state.unemployment > 6) {
      riskFactors.push("Weak labor market");
    }

    return {
      nextPhase,
      transitionProbability: maxProb,
      gdpForecast,
      inflationForecast,
      riskFactors,
    };
  }

  /**
   * Get phase description for UI
   */
  static getPhaseDescription(phase: EconomicPhase): string {
    const descriptions: Record<EconomicPhase, string> = {
      expansion: "Economic growth with rising demand and employment",
      peak: "Economy at full capacity, inflation concerns rising",
      contraction: "Economic slowdown with falling demand",
      trough: "Recession with weak demand and high unemployment",
    };
    return descriptions[phase];
  }
}

// Types are exported with their interface declarations above
