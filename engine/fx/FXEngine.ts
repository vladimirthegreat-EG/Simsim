/**
 * FX Engine — Applies exchange rate effects to material costs, shipping,
 * and factory operations based on actual source/destination regions.
 *
 * All costs in the engine are denominated in USD (home currency).
 * When sourcing materials or operating factories in foreign regions,
 * the local currency cost is converted to USD via the FX rate.
 *
 * FX rate convention (from MarketState.fxRates):
 *   EUR/USD = 1.10 means €1 = $1.10
 *   CNY/USD = 0.14 means ¥1 = $0.14
 *
 * A rising foreign currency (rate goes up) makes imports MORE expensive.
 * A falling foreign currency (rate goes down) makes imports CHEAPER.
 *
 * The FX multiplier is: currentRate / baselineRate
 *   > 1.0 → foreign currency strengthened → costs up
 *   < 1.0 → foreign currency weakened → costs down
 */

import type { MarketState } from "../types/market";
import { CONSTANTS } from "../types";

// Baseline FX rates — sourced from CONSTANTS for single-source-of-truth
const BASELINE_RATES: Record<string, number> = CONSTANTS.FX_BASELINE_RATES;

// Map supplier/factory regions to their primary currency pair
const REGION_CURRENCY_MAP: Record<string, keyof typeof BASELINE_RATES> = {
  "Europe":        "EUR/USD",
  "Asia":          "CNY/USD",   // Proxy: most Asian manufacturing is CNY-denominated
  "North America": "EUR/USD",   // Home region — no FX effect (handled separately)
  "MENA":          "EUR/USD",   // MENA often transacts in EUR or USD-pegged
  "Middle East":   "EUR/USD",
  "South America": "CNY/USD",   // Proxy: commodity-linked, use CNY as approximation
  "Africa":        "EUR/USD",   // Proxy: many African nations peg to EUR or USD
  "Oceania":       "GBP/USD",   // Proxy: AUD correlates with GBP
};

// Home region where the company is headquartered — no FX effect on domestic costs
const HOME_REGION = "North America";

export class FXEngine {
  /**
   * Get the FX cost multiplier for a source region relative to baseline.
   * Returns 1.0 for home region (no FX effect).
   *
   * Example: If EUR/USD was 1.10 at start and is now 1.21,
   *   multiplier = 1.21 / 1.10 = 1.10 → costs from Europe are 10% higher.
   */
  static getCostMultiplier(sourceRegion: string, marketState: MarketState): number {
    if (sourceRegion === HOME_REGION) return 1.0;

    const pair = REGION_CURRENCY_MAP[sourceRegion];
    if (!pair) return 1.0;

    const currentRate = this.getRate(pair, marketState);
    const baselineRate = BASELINE_RATES[pair];
    if (!baselineRate || baselineRate === 0) return 1.0;

    // Ratio of current to baseline: >1 means foreign currency strengthened (more expensive)
    return currentRate / baselineRate;
  }

  /**
   * Apply FX adjustment to a USD cost based on the source region.
   * Costs originally priced in USD at baseline FX rates get scaled.
   */
  static adjustCost(baseCostUSD: number, sourceRegion: string, marketState: MarketState): number {
    return baseCostUSD * this.getCostMultiplier(sourceRegion, marketState);
  }

  /**
   * Calculate total FX impact on material costs for a segment's bill of materials.
   * Each material has a source region — FX is applied per-material, not averaged.
   *
   * @param materialSources Array of { costUSD, sourceRegion } per material line
   * @param marketState Current market conditions
   * @returns { adjustedTotal, fxImpact, breakdown }
   */
  static calculateMaterialFXImpact(
    materialSources: Array<{ costUSD: number; sourceRegion: string }>,
    marketState: MarketState
  ): { adjustedTotal: number; fxImpact: number; breakdown: string[] } {
    let adjustedTotal = 0;
    let baseTotal = 0;
    const breakdown: string[] = [];

    for (const mat of materialSources) {
      const multiplier = this.getCostMultiplier(mat.sourceRegion, marketState);
      const adjusted = mat.costUSD * multiplier;
      adjustedTotal += adjusted;
      baseTotal += mat.costUSD;

      if (Math.abs(multiplier - 1.0) > 0.02) {
        const pct = ((multiplier - 1) * 100).toFixed(1);
        breakdown.push(
          `${mat.sourceRegion}: ${multiplier > 1 ? '+' : ''}${pct}% FX on $${(mat.costUSD / 1_000_000).toFixed(2)}M`
        );
      }
    }

    return {
      adjustedTotal,
      fxImpact: adjustedTotal - baseTotal,
      breakdown,
    };
  }

  /**
   * Calculate FX impact on factory operating costs (labor, overhead).
   * Factories in foreign regions pay workers in local currency.
   */
  static calculateFactoryFXImpact(
    factoryRegion: string,
    laborCostUSD: number,
    marketState: MarketState
  ): { adjustedLaborCost: number; fxImpact: number; message: string } {
    const multiplier = this.getCostMultiplier(factoryRegion, marketState);
    const adjustedLaborCost = laborCostUSD * multiplier;
    const impact = adjustedLaborCost - laborCostUSD;

    let message = "";
    if (Math.abs(multiplier - 1.0) > 0.01) {
      const direction = multiplier > 1 ? "increased" : "decreased";
      const pct = Math.abs((multiplier - 1) * 100).toFixed(1);
      message = `FX ${direction} ${factoryRegion} labor costs by ${pct}%: $${(Math.abs(impact) / 1_000).toFixed(0)}K`;
    }

    return { adjustedLaborCost, fxImpact: impact, message };
  }

  /**
   * Calculate FX impact on revenue earned in foreign markets.
   * Revenue earned abroad is converted back to USD at current rates.
   * A weakening foreign currency means less USD revenue.
   */
  static calculateRevenueFXImpact(
    revenueByRegion: Record<string, number>,
    marketState: MarketState
  ): { totalFXImpact: number; messages: string[] } {
    const messages: string[] = [];
    let totalFXImpact = 0;

    for (const [region, revenue] of Object.entries(revenueByRegion)) {
      if (region === HOME_REGION || revenue === 0) continue;

      const multiplier = this.getCostMultiplier(region, marketState);
      // FX impact on foreign revenue: when foreign currency strengthens (multiplier > 1),
      // converting foreign revenue to USD yields more. When it weakens, yields less.
      const impact = revenue * (multiplier - 1.0);
      totalFXImpact += impact;

      if (Math.abs(impact) > 10_000) {
        const direction = impact > 0 ? "gain" : "loss";
        messages.push(
          `FX ${direction} from ${region}: $${(Math.abs(impact) / 1_000_000).toFixed(2)}M ` +
          `(${((impact / revenue) * 100).toFixed(1)}% of ${region} revenue)`
        );
      }
    }

    return { totalFXImpact, messages };
  }

  /**
   * Get current FX rate for a pair from market state.
   * Handles the key name format differences (e.g. EUR/USD vs EUR_USD).
   */
  private static getRate(pair: string, marketState: MarketState): number {
    // MarketState uses both formats in different places
    const fxRates = marketState.fxRates as unknown as Record<string, number>;
    // Try both "EUR/USD" and "EUR_USD" formats
    const rate = fxRates[pair] ?? fxRates[pair.replace("/", "_")];
    if (rate !== undefined) return rate;

    // Fallback: try mapping common pair names
    const pairMap: Record<string, string> = {
      "EUR/USD": "EUR_USD",
      "GBP/USD": "GBP_USD",
      "JPY/USD": "JPY_USD",
      "CNY/USD": "CNY_USD",
    };
    const altKey = pairMap[pair];
    if (altKey && fxRates[altKey] !== undefined) return fxRates[altKey];

    // Return baseline if not found
    return BASELINE_RATES[pair] ?? 1.0;
  }
}
