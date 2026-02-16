/**
 * Tariff Engine
 * Handles dynamic tariffs, trade policies, and geopolitical events
 */

import type { Region, MaterialType } from "../materials/types";
import type {
  Tariff,
  TariffEvent,
  GeopoliticalEvent,
  TariffCalculation,
  TariffState,
  TradeAgreement,
  TariffScenario,
  TariffForecast,
  TradePolicy
} from "./types";
import {
  BASELINE_TARIFFS,
  TRADE_AGREEMENTS,
  TARIFF_EVENTS,
  GEOPOLITICAL_EVENTS,
  TARIFF_SCENARIOS,
  TRADE_POLICIES,
  shouldTriggerEvent
} from "./scenarios";

export class TariffEngine {
  /**
   * Calculate tariff for a specific shipment
   */
  static calculateTariff(
    fromRegion: Region,
    toRegion: Region,
    materialType: MaterialType,
    materialCost: number,
    currentRound: number,
    state: TariffState
  ): TariffCalculation {
    const applicableTariffs: Tariff[] = [];
    const tradeAgreements: TradeAgreement[] = [];
    const exemptions: string[] = [];
    const warnings: string[] = [];

    // Find all applicable tariffs
    for (const tariff of state.activeTariffs) {
      if (
        tariff.fromRegion === fromRegion &&
        tariff.toRegion === toRegion &&
        (!tariff.materialTypes || tariff.materialTypes.includes(materialType)) &&
        tariff.effectiveRound <= currentRound &&
        (!tariff.expiryRound || tariff.expiryRound >= currentRound)
      ) {
        applicableTariffs.push(tariff);
      }
    }

    // Find applicable trade agreements
    for (const agreement of state.tradeAgreements) {
      if (
        agreement.regions.includes(fromRegion) &&
        agreement.regions.includes(toRegion) &&
        agreement.effectiveRound <= currentRound &&
        (!agreement.expiryRound || agreement.expiryRound >= currentRound)
      ) {
        tradeAgreements.push(agreement);
        exemptions.push(agreement.name);
      }
    }

    // Calculate base tariff rate
    let baseTariffRate = 0;
    for (const tariff of applicableTariffs) {
      baseTariffRate += tariff.tariffRate;

      if (tariff.volatility > 0.7) {
        warnings.push(`High tariff volatility on ${tariff.name} - rate may change`);
      }
    }

    // Apply trade agreement reductions
    let adjustedTariffRate = baseTariffRate;
    for (const agreement of tradeAgreements) {
      adjustedTariffRate *= (1 - agreement.tariffReduction);
    }

    // Calculate tariff amount
    const tariffAmount = Math.round(materialCost * adjustedTariffRate);

    // Check for upcoming events
    for (const event of state.activeEvents) {
      if (event.type === "tariff_increase") {
        for (const route of event.affectedRoutes) {
          if (route.from === fromRegion && route.to === toRegion) {
            warnings.push(`Upcoming tariff increase: ${event.name}`);
          }
        }
      }
    }

    return {
      materialCost,
      applicableTariffs,
      tradeAgreements,
      baseTariffRate,
      adjustedTariffRate,
      tariffAmount,
      exemptions,
      warnings
    };
  }

  /**
   * Process round events and update tariff state
   */
  static processRoundEvents(
    state: TariffState,
    currentRound: number,
    playerState?: any
  ): {
    newTariffs: Tariff[];
    expiredTariffs: Tariff[];
    newEvents: TariffEvent[];
    newGeopoliticalEvents: GeopoliticalEvent[];
    messages: string[];
  } {
    const newTariffs: Tariff[] = [];
    const expiredTariffs: Tariff[] = [];
    const newEvents: TariffEvent[] = [];
    const newGeopoliticalEvents: GeopoliticalEvent[] = [];
    const messages: string[] = [];

    // Check for tariff expirations
    for (const tariff of state.activeTariffs) {
      if (tariff.expiryRound && tariff.expiryRound === currentRound) {
        expiredTariffs.push(tariff);
        messages.push(`📉 Tariff expired: ${tariff.name} (${tariff.fromRegion} → ${tariff.toRegion})`);
      }
    }

    // Remove expired tariffs
    state.activeTariffs = state.activeTariffs.filter(t =>
      !t.expiryRound || t.expiryRound > currentRound
    );

    // Check for new tariff events
    for (const eventTemplate of TARIFF_EVENTS) {
      if (shouldTriggerEvent(eventTemplate, currentRound, playerState)) {
        const eventWithRound = { ...eventTemplate, triggeredRound: currentRound };
        newEvents.push(eventTemplate);
        state.activeEvents.push(eventWithRound as any);

        // Apply event effects
        if (eventTemplate.type === "tariff_increase" || eventTemplate.type === "new_tariff") {
          for (const route of eventTemplate.affectedRoutes) {
            const tariffId = `event_${eventTemplate.id}_${route.from}_${route.to}_${currentRound}`;
            const newTariff: Tariff = {
              id: tariffId,
              name: `${eventTemplate.name} Tariff`,
              fromRegion: route.from,
              toRegion: route.to,
              materialTypes: eventTemplate.materials,
              tariffRate: route.increase ?? 0,
              effectiveRound: currentRound,
              expiryRound: eventTemplate.duration ? currentRound + eventTemplate.duration : undefined,
              reason: this.getReasonFromEventType(eventTemplate.type),
              volatility: eventTemplate.severity,
              description: eventTemplate.description
            };

            state.activeTariffs.push(newTariff);
            newTariffs.push(newTariff);
            messages.push(
              `🚨 New tariff: ${eventTemplate.name} - ${Math.round(newTariff.tariffRate * 100)}% on ${route.from} → ${route.to} ${eventTemplate.materials ? `(${eventTemplate.materials.join(", ")})` : ""}`
            );
          }
        }

        if (eventTemplate.type === "tariff_decrease" || eventTemplate.type === "trade_agreement") {
          for (const route of eventTemplate.affectedRoutes) {
            messages.push(
              `✅ Tariff reduction: ${eventTemplate.name} - ${Math.round((route.decrease ?? 0) * 100)}% reduction on ${route.from} → ${route.to}`
            );

            // Apply reduction to existing tariffs
            for (const tariff of state.activeTariffs) {
              if (tariff.fromRegion === route.from && tariff.toRegion === route.to) {
                tariff.tariffRate *= (1 - (route.decrease ?? 0));
              }
            }
          }
        }

        if (eventTemplate.type === "sanctions" || eventTemplate.type === "embargo") {
          messages.push(
            `⚠️ ${eventTemplate.name}: ${eventTemplate.description}`
          );
        }
      }
    }

    // Check for geopolitical events
    for (const geoEvent of GEOPOLITICAL_EVENTS) {
      if (Math.random() < 0.01) { // 1% chance per round
        newGeopoliticalEvents.push(geoEvent);
        state.geopoliticalEvents.push(geoEvent);
        messages.push(
          `🌍 Geopolitical event: ${geoEvent.name} - ${geoEvent.description}`
        );
      }
    }

    // Check for scenarios (combinations of events)
    for (const scenario of TARIFF_SCENARIOS) {
      if (Math.random() < scenario.probability) {
        messages.push(
          `⚠️ SCENARIO ACTIVE: ${scenario.name} - ${scenario.description}`
        );

        // Trigger all events in scenario
        for (const event of scenario.events) {
          if (!state.activeEvents.some(e => e.id === event.id)) {
            state.activeEvents.push(event);
            newEvents.push(event);
          }
        }

        for (const geoEvent of scenario.geopoliticalEvents) {
          if (!state.geopoliticalEvents.some(e => e.id === geoEvent.id)) {
            state.geopoliticalEvents.push(geoEvent);
            newGeopoliticalEvents.push(geoEvent);
          }
        }
      }
    }

    // Clean up expired events
    state.activeEvents = state.activeEvents.filter((e: any) => {
      if (!e.triggeredRound) {
        // Events without triggeredRound are assumed to be old/expired
        return false;
      }
      const expiryRound = e.triggeredRound + e.duration;
      return currentRound < expiryRound;
    });

    state.geopoliticalEvents = state.geopoliticalEvents.filter(e => {
      const endRound = e.round + e.duration;
      return endRound >= currentRound;
    });

    return {
      newTariffs,
      expiredTariffs,
      newEvents,
      newGeopoliticalEvents,
      messages
    };
  }

  /**
   * Get tariff forecast for a route
   */
  static forecastTariffs(
    fromRegion: Region,
    toRegion: Region,
    materialType: MaterialType,
    currentRound: number,
    state: TariffState,
    forecastRounds: number = 4
  ): TariffForecast {
    const currentTariff = this.calculateTariff(
      fromRegion,
      toRegion,
      materialType,
      100000, // $100k base
      currentRound,
      state
    );

    const forecastedRates = [];
    const trends: string[] = [];

    // Analyze trends
    let increaseProbability = 0;
    let decreaseProbability = 0;

    for (const tariff of currentTariff.applicableTariffs) {
      if (tariff.volatility > 0.7) {
        increaseProbability += 0.2;
        trends.push(`High volatility on ${tariff.name}`);
      }

      if (tariff.reason === "trade_war" || tariff.reason === "retaliatory") {
        increaseProbability += 0.3;
        trends.push(`Ongoing trade tensions`);
      }
    }

    // Check for potential trade agreements
    const policy = state.policies.get(toRegion);
    if (policy?.stance === "free_trade") {
      decreaseProbability += 0.2;
      trends.push(`${toRegion} favors free trade`);
    } else if (policy?.stance === "protectionist") {
      increaseProbability += 0.2;
      trends.push(`${toRegion} has protectionist policies`);
    }

    // Generate forecast
    let forecastRate = currentTariff.adjustedTariffRate;

    for (let round = currentRound + 1; round <= currentRound + forecastRounds; round++) {
      // Apply probabilistic changes
      const change = Math.random();

      if (change < increaseProbability / 10) {
        forecastRate *= 1.05; // 5% increase
      } else if (change < (increaseProbability + decreaseProbability) / 10) {
        forecastRate *= 0.95; // 5% decrease
      }

      const confidence = 1 - ((round - currentRound) / forecastRounds) * 0.5; // Decreasing confidence

      forecastedRates.push({
        round,
        rate: forecastRate,
        confidence,
        factors: this.getForcastFactors(state, fromRegion, toRegion, round)
      });
    }

    const recommendations = this.generateRecommendations(
      currentTariff,
      forecastedRates,
      trends,
      fromRegion,
      toRegion
    );

    return {
      route: { from: fromRegion, to: toRegion },
      currentRate: currentTariff.adjustedTariffRate,
      forecastedRates,
      trends,
      recommendations
    };
  }

  /**
   * Get forecast factors
   */
  private static getForcastFactors(
    state: TariffState,
    fromRegion: Region,
    toRegion: Region,
    round: number
  ): string[] {
    const factors: string[] = [];

    // Check active events
    for (const event of state.activeEvents) {
      if (event.affectedRoutes.some(r => r.from === fromRegion && r.to === toRegion)) {
        factors.push(event.name);
      }
    }

    // Check geopolitical events
    for (const geoEvent of state.geopoliticalEvents) {
      if (
        geoEvent.affectedRegions.includes(fromRegion) ||
        geoEvent.affectedRegions.includes(toRegion)
      ) {
        factors.push(geoEvent.name);
      }
    }

    return factors;
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    current: TariffCalculation,
    forecast: TariffForecast["forecastedRates"],
    trends: string[],
    fromRegion: Region,
    toRegion: Region
  ): string[] {
    const recommendations: string[] = [];

    // Check if tariffs are increasing
    const avgFutureRate = forecast.reduce((sum, f) => sum + f.rate, 0) / forecast.length;

    if (avgFutureRate > current.adjustedTariffRate * 1.1) {
      recommendations.push("⚠️ Tariffs expected to increase - consider stockpiling materials");
      recommendations.push("Consider alternative sourcing regions");
    } else if (avgFutureRate < current.adjustedTariffRate * 0.9) {
      recommendations.push("✅ Tariffs expected to decrease - delay large orders if possible");
    }

    // Check volatility
    const rateStdDev = Math.sqrt(
      forecast.reduce((sum, f) => sum + Math.pow(f.rate - avgFutureRate, 2), 0) / forecast.length
    );

    if (rateStdDev > avgFutureRate * 0.1) {
      recommendations.push("⚠️ High tariff volatility expected - build inventory buffer");
    }

    // Check trade agreements
    if (current.tradeAgreements.length > 0) {
      recommendations.push(`✅ Benefiting from ${current.tradeAgreements[0].name} - maintain this route`);
    }

    // Check for high current tariffs
    if (current.adjustedTariffRate >= 0.25) {
      recommendations.push("⚠️ High current tariffs - explore alternative suppliers");
    }

    return recommendations;
  }

  /**
   * Helper: Convert event type to tariff reason
   */
  private static getReasonFromEventType(eventType: TariffEvent["type"]): Tariff["reason"] {
    switch (eventType) {
      case "tariff_increase":
        return "trade_war";
      case "new_tariff":
        return "protectionism";
      case "sanctions":
        return "retaliatory";
      case "embargo":
        return "national_security";
      default:
        return "revenue";
    }
  }

  /**
   * Initialize tariff state
   */
  static initializeTariffState(): TariffState {
    return {
      activeTariffs: [...BASELINE_TARIFFS],
      tradeAgreements: [...TRADE_AGREEMENTS],
      activeEvents: [],
      geopoliticalEvents: [],
      policies: new Map(TRADE_POLICIES),
      forecasts: []
    };
  }

  /**
   * Get total tariff burden for a team
   */
  static calculateTotalTariffBurden(
    orders: Array<{ fromRegion: Region; toRegion: Region; materialType: MaterialType; cost: number }>,
    currentRound: number,
    state: TariffState
  ): {
    totalTariffs: number;
    byRoute: Map<string, number>;
    mostExpensiveRoute: { route: string; cost: number };
  } {
    const byRoute = new Map<string, number>();
    let totalTariffs = 0;

    for (const order of orders) {
      const tariffCalc = this.calculateTariff(
        order.fromRegion,
        order.toRegion,
        order.materialType,
        order.cost,
        currentRound,
        state
      );

      totalTariffs += tariffCalc.tariffAmount;

      const routeKey = `${order.fromRegion} → ${order.toRegion}`;
      byRoute.set(routeKey, (byRoute.get(routeKey) ?? 0) + tariffCalc.tariffAmount);
    }

    const mostExpensive = Array.from(byRoute.entries()).reduce(
      (max, [route, cost]) => (cost > max.cost ? { route, cost } : max),
      { route: "", cost: 0 }
    );

    return {
      totalTariffs,
      byRoute,
      mostExpensiveRoute: mostExpensive
    };
  }

  /**
   * Suggest tariff mitigation strategies
   */
  static suggestMitigationStrategies(
    fromRegion: Region,
    toRegion: Region,
    materialType: MaterialType,
    currentRound: number,
    state: TariffState
  ): {
    strategy: string;
    estimatedSavings: number;
    implementationCost: number;
    feasibility: "easy" | "moderate" | "difficult";
    description: string;
  }[] {
    const strategies = [];
    const current = this.calculateTariff(fromRegion, toRegion, materialType, 1000000, currentRound, state);

    // Strategy 1: Alternative sourcing
    strategies.push({
      strategy: "Source from trade-agreement region",
      estimatedSavings: current.tariffAmount * 0.7,
      implementationCost: 50000,
      feasibility: "moderate" as const,
      description: "Switch to supplier in a region with favorable trade agreements"
    });

    // Strategy 2: Stockpiling
    if (current.warnings.some(w => w.includes("increase"))) {
      strategies.push({
        strategy: "Stockpile before tariff increase",
        estimatedSavings: current.tariffAmount * 0.3,
        implementationCost: 100000,
        feasibility: "easy" as const,
        description: "Build inventory before anticipated tariff increases"
      });
    }

    // Strategy 3: Lobbying for trade agreement
    strategies.push({
      strategy: "Lobby for trade agreement",
      estimatedSavings: current.tariffAmount * 0.5,
      implementationCost: 500000,
      feasibility: "difficult" as const,
      description: "Political effort to establish or expand trade agreements"
    });

    return strategies.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }
}
