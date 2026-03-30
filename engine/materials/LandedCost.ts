/**
 * Landed Cost Calculator
 *
 * Pure utility function that calculates the complete landed cost for a material order,
 * combining: base material cost, regional multiplier, FX adjustment, contract discount,
 * shipping (via LogisticsEngine), tariffs (via TariffEngine), and round-based delays.
 */

import { LogisticsEngine } from "../logistics/LogisticsEngine";
import { TariffEngine } from "../tariffs/TariffEngine";
import { FXEngine } from "../fx/FXEngine";
import { REGIONAL_CAPABILITIES } from "./suppliers";
import { SHIPPING_METHOD_ROUND_DELAYS, getRouteDelay } from "../logistics/routes";
import type { Region, MaterialType } from "./types";
import type { MarketState } from "../types/market";

export interface LandedCostBreakdown {
  baseCostPerUnit: number;
  regionalMultiplier: number;
  fxMultiplier: number;
  materialCostAdjusted: number;
  shippingPerUnit: number;
  tariffRate: number;
  tariffPerUnit: number;
  landedCostPerUnit: number;
  totalOrderCost: number;
  roundDelay: number;
}

export function calculateLandedCost(params: {
  baseCostPerUnit: number;
  supplierRegion: Region;
  teamRegion: Region;
  materialType: MaterialType;
  quantity: number;
  shippingMethod: "sea" | "air" | "land" | "rail";
  currentRound: number;
  tariffState: any;
  marketState: MarketState;
  contractDiscount?: number;
}): LandedCostBreakdown {
  const {
    baseCostPerUnit,
    supplierRegion,
    teamRegion,
    materialType,
    quantity,
    shippingMethod,
    currentRound,
    tariffState,
    marketState,
    contractDiscount = 0,
  } = params;

  // Regional cost multiplier
  const regionalMultiplier = REGIONAL_CAPABILITIES[supplierRegion]?.costMultiplier ?? 1.0;

  // FX multiplier
  let fxMultiplier = 1.0;
  try {
    fxMultiplier = FXEngine.getCostMultiplier(supplierRegion, marketState);
  } catch {
    fxMultiplier = 1.0;
  }

  // Material cost after region + FX + contract discount
  const materialCostAdjusted =
    baseCostPerUnit * regionalMultiplier * fxMultiplier * (1 - contractDiscount);

  // Shipping cost per unit
  let shippingPerUnit = 0;
  let roundDelay = 1;
  try {
    const weight = Math.max(quantity * 0.0002, 0.1);
    const volume = Math.max(quantity * 0.001, 0.1);
    const logistics = LogisticsEngine.calculateLogistics(
      supplierRegion,
      teamRegion,
      shippingMethod,
      weight,
      volume,
      0,
    );
    shippingPerUnit = quantity > 0 ? logistics.totalLogisticsCost / quantity : 0;
    // Import round delays
    roundDelay =
      typeof getRouteDelay === "function"
        ? getRouteDelay(supplierRegion, teamRegion, shippingMethod)
        : (SHIPPING_METHOD_ROUND_DELAYS?.[shippingMethod] ?? 1);
  } catch {
    shippingPerUnit = materialCostAdjusted * 0.05; // 5% fallback
  }

  // Tariff (calculated on POST-FX material value, not base)
  let tariffRate = 0;
  let tariffPerUnit = 0;
  if (tariffState) {
    try {
      const tariffCalc = TariffEngine.calculateTariff(
        supplierRegion,
        teamRegion,
        materialType,
        materialCostAdjusted * Math.max(quantity, 1),
        currentRound,
        tariffState,
      );
      tariffRate = tariffCalc.adjustedTariffRate;
      tariffPerUnit = quantity > 0 ? tariffCalc.tariffAmount / quantity : 0;
    } catch {
      tariffRate = 0;
    }
  }

  const landedCostPerUnit = materialCostAdjusted + shippingPerUnit + tariffPerUnit;

  return {
    baseCostPerUnit,
    regionalMultiplier,
    fxMultiplier,
    materialCostAdjusted,
    shippingPerUnit,
    tariffRate,
    tariffPerUnit,
    landedCostPerUnit,
    totalOrderCost: landedCostPerUnit * quantity,
    roundDelay,
  };
}
