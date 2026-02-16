/**
 * Tariff System Type Definitions
 * Defines tariffs, trade policies, and geopolitical events affecting costs
 */

import type { Region } from "../materials/types";
import type { MaterialType } from "../materials/types";

export type TariffReason =
  | "trade_war"
  | "national_security"
  | "anti_dumping"
  | "environmental"
  | "labor_standards"
  | "retaliatory"
  | "protectionism"
  | "revenue";

export type TradeAgreementType =
  | "free_trade"
  | "customs_union"
  | "preferential"
  | "bilateral"
  | "multilateral";

export interface Tariff {
  id: string;
  name: string;
  fromRegion: Region;
  toRegion: Region;
  materialTypes?: MaterialType[]; // If undefined, applies to all materials
  tariffRate: number; // Percentage (0-1)
  effectiveRound: number;
  expiryRound?: number; // If undefined, permanent
  reason: TariffReason;
  volatility: number; // 0-1, how likely it is to change
  description: string;
}

export interface TradeAgreement {
  id: string;
  name: string;
  type: TradeAgreementType;
  regions: Region[];
  tariffReduction: number; // Percentage reduction (0-1)
  effectiveRound: number;
  expiryRound?: number;
  conditions?: string[];
  benefits: string[];
}

export interface TariffEvent {
  id: string;
  name: string;
  type: "tariff_increase" | "tariff_decrease" | "new_tariff" | "trade_agreement" | "sanctions" | "embargo";
  affectedRoutes: TariffRoute[];
  materials?: MaterialType[];
  duration: number; // Rounds
  probability: number; // 0-1, per round
  severity: number; // 0-1
  triggers?: EventTrigger[];
  effects: TariffEffect[];
  description: string;
}

export interface TariffRoute {
  from: Region;
  to: Region;
  increase?: number; // Tariff rate increase
  decrease?: number; // Tariff rate decrease
  multiplier?: number; // Multiplier on existing tariff
}

export interface TariffEffect {
  type: "cost_increase" | "cost_decrease" | "delay" | "restriction" | "ban";
  value: number;
  duration: number; // Rounds
  description: string;
}

export interface EventTrigger {
  type: "market_share" | "revenue" | "production_volume" | "region_dominance" | "political";
  threshold: number;
  region?: Region;
}

export interface TariffCalculation {
  materialCost: number;
  applicableTariffs: Tariff[];
  tradeAgreements: TradeAgreement[];
  baseTariffRate: number;
  adjustedTariffRate: number;
  tariffAmount: number;
  exemptions: string[];
  warnings: string[];
}

export interface GeopoliticalEvent {
  id: string;
  name: string;
  type: "conflict" | "alliance" | "embargo" | "sanctions" | "treaty" | "dispute";
  affectedRegions: Region[];
  round: number;
  duration: number; // Rounds
  severity: "low" | "medium" | "high" | "critical";
  effects: GeopoliticalEffect[];
  description: string;
}

export interface GeopoliticalEffect {
  type: "tariff_change" | "route_closure" | "cost_increase" | "delay_increase" | "quality_impact";
  regions: Region[];
  magnitude: number;
  description: string;
}

export interface TariffMitigation {
  type: "alternative_source" | "stockpile" | "local_production" | "trade_agreement" | "lobbying";
  cost: number;
  effectiveness: number; // 0-1, how much it reduces tariff impact
  implementationTime: number; // Rounds
  description: string;
}

export interface CustomsClassification {
  materialType: MaterialType;
  hsCode: string; // Harmonized System code
  description: string;
  standardTariffRate: number; // Default rate
  sensitivityLevel: "low" | "medium" | "high"; // How likely to face additional scrutiny
}

export interface TariffForecast {
  route: TariffRoute;
  currentRate: number;
  forecastedRates: {
    round: number;
    rate: number;
    confidence: number; // 0-1
    factors: string[];
  }[];
  trends: string[];
  recommendations: string[];
}

export interface TradePolicy {
  region: Region;
  stance: "protectionist" | "free_trade" | "mixed" | "isolationist";
  priorityIndustries: string[];
  restrictedMaterials: MaterialType[];
  incentivizedMaterials: MaterialType[];
  localContentRequirement?: number; // Percentage
}

export interface TariffScenario {
  id: string;
  name: string;
  description: string;
  probability: number; // Per round
  events: TariffEvent[];
  geopoliticalEvents: GeopoliticalEvent[];
  duration: number;
  playerImpact: {
    affectedRoutes: number;
    estimatedCostIncrease: number;
    estimatedDelay: number;
  };
}

export interface TariffState {
  activeTariffs: Tariff[];
  tradeAgreements: TradeAgreement[];
  activeEvents: TariffEvent[];
  geopoliticalEvents: GeopoliticalEvent[];
  policies: Map<Region, TradePolicy>;
  forecasts: TariffForecast[];
}
