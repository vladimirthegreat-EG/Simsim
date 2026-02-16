/**
 * Logistics Engine
 * Handles shipping route calculations, lead times, and logistics costs
 */

import type { Region } from "../materials/types";
import type {
  ShippingMethod,
  ShippingRoute,
  LogisticsCalculation,
  ShipmentTracking,
  ShipmentDelay,
  LogisticsStrategy,
  LogisticsDisruption
} from "./types";
import {
  SHIPPING_ROUTES,
  SHIPPING_METHODS,
  MAJOR_PORTS,
  CLEARANCE_REQUIREMENTS,
  findRoute,
  calculateShippingCost as calcShipCost,
  calculateLeadTime as calcLeadTime
} from "./routes";

export class LogisticsEngine {
  /**
   * Calculate complete logistics for a shipment
   */
  static calculateLogistics(
    fromRegion: Region,
    toRegion: Region,
    shippingMethod: ShippingMethod,
    weight: number, // in tons
    volume: number, // in cubic meters
    productionTime: number // days already spent in production
  ): LogisticsCalculation {
    const route = findRoute(fromRegion, toRegion);

    if (!route) {
      throw new Error(`No route found from ${fromRegion} to ${toRegion}`);
    }

    const methodDetails = SHIPPING_METHODS[shippingMethod];

    // Validate shipping method is available for this route
    if (!route.availableMethods.includes(shippingMethod)) {
      throw new Error(
        `Shipping method ${shippingMethod} not available for route ${fromRegion} to ${toRegion}`
      );
    }

    // Calculate shipping time
    const baseShippingTime = route.baseLeadTime;
    const shippingTime = Math.ceil(baseShippingTime * methodDetails.timeMultiplier);

    // Calculate clearance time
    const clearanceReq = CLEARANCE_REQUIREMENTS.find(
      cr => cr.fromRegion === fromRegion && cr.toRegion === toRegion
    );
    const baseClearanceTime = clearanceReq?.baseProcessingTime ?? 3;
    const inspectionProbability = clearanceReq?.inspectionProbability ?? 0.15;
    const inspectionTime = Math.random() < inspectionProbability ? 2 : 0;
    const clearanceTime = baseClearanceTime + inspectionTime;

    // Total lead time
    const totalLeadTime = productionTime + shippingTime + clearanceTime + inspectionTime;

    // Calculate costs
    const shippingCost = this.calculateShippingCost(route, shippingMethod, weight, volume);
    const clearanceCost = clearanceReq?.baseCost ?? 600;
    const insuranceCost = this.calculateInsuranceCost(shippingCost, shippingMethod);
    const handlingCost = this.calculateHandlingCost(weight, volume, shippingMethod);
    const totalLogisticsCost = shippingCost + clearanceCost + insuranceCost + handlingCost;

    // Calculate risk
    const onTimeProbability = methodDetails.reliability * route.customsEfficiency * (1 - route.congestionLevel * 0.3);
    const delayRisk = Math.ceil((1 - onTimeProbability) * shippingTime * 0.3);
    const lossRisk = (1 - methodDetails.reliability) * 0.05; // 5% max loss risk

    return {
      route,
      shippingMethod,
      weight,
      volume,
      productionTime,
      shippingTime,
      clearanceTime,
      inspectionTime,
      totalLeadTime,
      shippingCost,
      clearanceCost,
      insuranceCost,
      handlingCost,
      totalLogisticsCost,
      onTimeProbability,
      delayRisk,
      lossRisk
    };
  }

  /**
   * Calculate shipping cost based on weight, volume, and method
   */
  private static calculateShippingCost(
    route: ShippingRoute,
    method: ShippingMethod,
    weight: number,
    volume: number
  ): number {
    const methodDetails = SHIPPING_METHODS[method];
    const baseCost = route.baseCost;

    // Use chargeable weight (greater of actual weight or volumetric weight)
    const volumetricWeight = method === "air" ? volume / 6 : volume / 3;
    const chargeableWeight = Math.max(weight, volumetricWeight);

    // Base calculation
    let cost = baseCost * methodDetails.costMultiplier * chargeableWeight;

    // Distance factor
    const distanceFactor = 1 + (route.distance / 10000) * 0.2;
    cost *= distanceFactor;

    // Infrastructure quality affects cost
    cost *= (2 - route.infrastructureQuality);

    // Congestion surcharge
    if (route.congestionLevel > 0.5) {
      cost *= 1 + (route.congestionLevel - 0.5);
    }

    return Math.round(cost);
  }

  /**
   * Calculate insurance cost
   */
  private static calculateInsuranceCost(shippingCost: number, method: ShippingMethod): number {
    const rates = {
      sea: 0.015, // 1.5%
      air: 0.008, // 0.8%
      land: 0.012, // 1.2%
      rail: 0.010 // 1.0%
    };

    return Math.round(shippingCost * rates[method]);
  }

  /**
   * Calculate handling cost
   */
  private static calculateHandlingCost(
    weight: number,
    volume: number,
    method: ShippingMethod
  ): number {
    const handlingRates = {
      sea: 50, // per ton
      air: 120,
      land: 80,
      rail: 60
    };

    return Math.round(weight * handlingRates[method]);
  }

  /**
   * Get optimal shipping method based on strategy
   */
  static getOptimalShippingMethod(
    fromRegion: Region,
    toRegion: Region,
    weight: number,
    volume: number,
    strategy: LogisticsStrategy,
    urgent: boolean = false
  ): ShippingMethod {
    const route = findRoute(fromRegion, toRegion);
    if (!route) return "sea"; // Default

    if (urgent) {
      return strategy.rushOrderMethod;
    }

    // Calculate cost and time for each available method
    const evaluations = route.availableMethods.map(method => {
      const calc = this.calculateLogistics(fromRegion, toRegion, method, weight, volume, 0);
      return {
        method,
        cost: calc.totalLogisticsCost,
        time: calc.totalLeadTime,
        reliability: calc.onTimeProbability
      };
    });

    // Apply strategy thresholds
    const costOptions = evaluations.filter(e => e.cost <= strategy.costThreshold);
    const timeOptions = evaluations.filter(e => e.time <= strategy.timeThreshold);

    // If both constraints can be met, choose the one with best reliability
    const viable = costOptions.filter(c => timeOptions.some(t => t.method === c.method));
    if (viable.length > 0) {
      return viable.reduce((best, current) =>
        current.reliability > best.reliability ? current : best
      ).method;
    }

    // Otherwise, use default strategy
    return strategy.defaultShippingMethod;
  }

  /**
   * Track shipment status
   */
  static trackShipment(
    orderId: string,
    currentRound: number,
    orderRound: number,
    estimatedArrivalRound: number,
    fromRegion: Region,
    toRegion: Region,
    delays: ShipmentDelay[]
  ): ShipmentTracking {
    const roundsElapsed = currentRound - orderRound;
    const totalRounds = estimatedArrivalRound - orderRound;
    const progress = totalRounds > 0 ? roundsElapsed / totalRounds : 0;

    let currentStatus: ShipmentTracking["currentStatus"];
    let currentLocation: string;

    if (progress < 0.2) {
      currentStatus = "origin";
      currentLocation = `Departing ${fromRegion}`;
    } else if (progress < 0.7) {
      currentStatus = "in_transit";
      currentLocation = `En route to ${toRegion}`;
    } else if (progress < 0.9) {
      currentStatus = "customs";
      currentLocation = `Customs clearance in ${toRegion}`;
    } else if (progress < 1.0) {
      currentStatus = "inspection";
      currentLocation = `Final inspection in ${toRegion}`;
    } else {
      currentStatus = "delivery";
      currentLocation = `Delivered to ${toRegion}`;
    }

    // Generate tracking events
    const events = [
      {
        round: orderRound,
        type: "departed" as const,
        location: fromRegion,
        description: `Shipment departed from ${fromRegion}`
      }
    ];

    if (progress >= 0.2) {
      events.push({
        round: orderRound + Math.ceil(totalRounds * 0.2),
        type: "arrived_port" as const,
        location: `Port in ${fromRegion}`,
        description: `Arrived at departure port`
      });
    }

    if (progress >= 0.7) {
      events.push({
        round: orderRound + Math.ceil(totalRounds * 0.7),
        type: "arrived_port" as const,
        location: `Port in ${toRegion}`,
        description: `Arrived at destination port`
      });
    }

    if (progress >= 0.85) {
      events.push({
        round: orderRound + Math.ceil(totalRounds * 0.85),
        type: "cleared_customs" as const,
        location: `${toRegion}`,
        description: `Cleared customs in ${toRegion}`
      });
    }

    // Add delay events
    for (const delay of delays) {
      events.push({
        round: delay.round,
        type: "delayed" as const,
        location: currentLocation,
        description: `Delayed due to ${delay.reason}: +${delay.delayDays} days`
      });
    }

    return {
      orderId,
      currentStatus,
      currentLocation,
      estimatedArrivalRound,
      delays,
      events: events.sort((a, b) => a.round - b.round)
    };
  }

  /**
   * Apply logistics disruption
   */
  static applyDisruption(
    calculation: LogisticsCalculation,
    disruption: LogisticsDisruption
  ): LogisticsCalculation {
    // Check if route is affected
    const routeId = calculation.route.id;
    if (!disruption.affectedRoutes.includes(routeId)) {
      return calculation;
    }

    // Check if method is affected
    if (!disruption.affectedMethods.includes(calculation.shippingMethod)) {
      return calculation;
    }

    // Apply disruption effects
    return {
      ...calculation,
      shippingTime: Math.ceil(calculation.shippingTime * disruption.delayMultiplier),
      totalLeadTime: Math.ceil(calculation.totalLeadTime * disruption.delayMultiplier),
      shippingCost: Math.ceil(calculation.shippingCost * disruption.costMultiplier),
      totalLogisticsCost: Math.ceil(calculation.totalLogisticsCost * disruption.costMultiplier),
      onTimeProbability: calculation.onTimeProbability * 0.5, // Disruption reduces reliability
      delayRisk: calculation.delayRisk + Math.ceil(calculation.shippingTime * (disruption.delayMultiplier - 1))
    };
  }

  /**
   * Compare shipping options
   */
  static compareShippingOptions(
    fromRegion: Region,
    toRegion: Region,
    weight: number,
    volume: number,
    productionTime: number
  ): {
    method: ShippingMethod;
    logistics: LogisticsCalculation;
    costEfficiency: number;
    timeEfficiency: number;
    overallScore: number;
  }[] {
    const route = findRoute(fromRegion, toRegion);
    if (!route) return [];

    const comparisons = route.availableMethods.map(method => {
      const logistics = this.calculateLogistics(
        fromRegion,
        toRegion,
        method,
        weight,
        volume,
        productionTime
      );

      // Calculate efficiency scores (0-100)
      const allCalculations = route.availableMethods.map(m =>
        this.calculateLogistics(fromRegion, toRegion, m, weight, volume, productionTime)
      );

      const minCost = Math.min(...allCalculations.map(c => c.totalLogisticsCost));
      const maxCost = Math.max(...allCalculations.map(c => c.totalLogisticsCost));
      const minTime = Math.min(...allCalculations.map(c => c.totalLeadTime));
      const maxTime = Math.max(...allCalculations.map(c => c.totalLeadTime));

      const costEfficiency = maxCost > minCost
        ? ((maxCost - logistics.totalLogisticsCost) / (maxCost - minCost)) * 100
        : 100;

      const timeEfficiency = maxTime > minTime
        ? ((maxTime - logistics.totalLeadTime) / (maxTime - minTime)) * 100
        : 100;

      // Overall score: weighted average (60% cost, 40% time)
      const overallScore = costEfficiency * 0.6 + timeEfficiency * 0.4;

      return {
        method,
        logistics,
        costEfficiency,
        timeEfficiency,
        overallScore
      };
    });

    return comparisons.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Get logistics recommendations
   */
  static getRecommendations(
    fromRegion: Region,
    toRegion: Region,
    weight: number,
    volume: number,
    budget: number,
    maxLeadTime: number
  ): {
    recommended: ShippingMethod;
    alternatives: ShippingMethod[];
    reasoning: string;
    warnings: string[];
  } {
    const comparisons = this.compareShippingOptions(fromRegion, toRegion, weight, volume, 0);
    const warnings: string[] = [];

    // Filter by budget and time constraints
    const viable = comparisons.filter(c =>
      c.logistics.totalLogisticsCost <= budget &&
      c.logistics.totalLeadTime <= maxLeadTime
    );

    if (viable.length === 0) {
      warnings.push("No shipping methods meet both budget and time constraints");

      // Relax constraints
      const budgetViable = comparisons.filter(c => c.logistics.totalLogisticsCost <= budget);
      const timeViable = comparisons.filter(c => c.logistics.totalLeadTime <= maxLeadTime);

      if (budgetViable.length > 0) {
        const best = budgetViable[0];
        return {
          recommended: best.method,
          alternatives: budgetViable.slice(1, 3).map(v => v.method),
          reasoning: `Budget constraint met, but delivery will take ${best.logistics.totalLeadTime} days (${best.logistics.totalLeadTime - maxLeadTime} days over target)`,
          warnings
        };
      }

      if (timeViable.length > 0) {
        const best = timeViable[0];
        return {
          recommended: best.method,
          alternatives: timeViable.slice(1, 3).map(v => v.method),
          reasoning: `Time constraint met, but cost is $${best.logistics.totalLogisticsCost.toLocaleString()} ($${(best.logistics.totalLogisticsCost - budget).toLocaleString()} over budget)`,
          warnings
        };
      }

      // Neither constraint can be met
      const best = comparisons[0];
      return {
        recommended: best.method,
        alternatives: comparisons.slice(1, 3).map(c => c.method),
        reasoning: `Best overall option despite exceeding both constraints`,
        warnings: [
          ...warnings,
          `Cost exceeds budget by $${(best.logistics.totalLogisticsCost - budget).toLocaleString()}`,
          `Delivery time exceeds limit by ${best.logistics.totalLeadTime - maxLeadTime} days`
        ]
      };
    }

    // Multiple viable options
    const best = viable[0];
    return {
      recommended: best.method,
      alternatives: viable.slice(1, 3).map(v => v.method),
      reasoning: `Best balance of cost ($${best.logistics.totalLogisticsCost.toLocaleString()}) and time (${best.logistics.totalLeadTime} days) with ${Math.round(best.logistics.onTimeProbability * 100)}% on-time probability`,
      warnings
    };
  }
}
