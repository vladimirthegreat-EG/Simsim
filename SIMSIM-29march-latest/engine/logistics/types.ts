/**
 * Logistics System Type Definitions
 * Defines shipping, routes, lead times, and logistics costs
 */

import type { Region } from "../materials/types";

export type ShippingMethod = "sea" | "air" | "land" | "rail";

export interface ShippingMethodDetails {
  method: ShippingMethod;
  costMultiplier: number; // Relative cost
  timeMultiplier: number; // Relative time
  reliability: number; // 0-1, probability of on-time delivery
  carbonEmissions: number; // kg CO2 per ton-km
  minimumVolume: number; // Minimum shipment size
  description: string;
}

export interface ShippingRoute {
  id: string;
  fromRegion: Region;
  toRegion: Region;
  availableMethods: ShippingMethod[];
  baseLeadTime: number; // Days for sea freight
  baseCost: number; // USD per ton
  distance: number; // Kilometers
  majorPorts: string[];
  infrastructureQuality: number; // 0-1
  congestionLevel: number; // 0-1, affects delays
  customsEfficiency: number; // 0-1, affects clearance time
}

export interface LogisticsCalculation {
  route: ShippingRoute;
  shippingMethod: ShippingMethod;
  weight: number; // Tons
  volume: number; // Cubic meters

  // Timeline
  productionTime: number;
  shippingTime: number;
  clearanceTime: number;
  inspectionTime: number;
  totalLeadTime: number;

  // Costs
  shippingCost: number;
  clearanceCost: number;
  insuranceCost: number;
  handlingCost: number;
  totalLogisticsCost: number;

  // Risk
  onTimeProbability: number;
  delayRisk: number; // Expected delay in days
  lossRisk: number; // Probability of loss/damage
}

export interface Port {
  name: string;
  region: Region;
  country: string;
  efficiency: number; // 0-1
  capacity: number; // TEU per year
  avgProcessingTime: number; // Days
  fees: number; // USD
}

export interface ClearanceRequirement {
  fromRegion: Region;
  toRegion: Region;
  materialTypes?: string[];
  requiredDocuments: string[];
  inspectionProbability: number; // 0-1
  baseProcessingTime: number; // Days
  baseCost: number; // USD
  restrictions?: string[];
}

export interface ShipmentTracking {
  orderId: string;
  currentStatus: "origin" | "in_transit" | "customs" | "inspection" | "delivery";
  currentLocation: string;
  estimatedArrivalRound: number;
  delays: ShipmentDelay[];
  events: ShipmentEvent[];
}

export interface ShipmentDelay {
  reason: "weather" | "customs" | "port_congestion" | "mechanical" | "documentation" | "inspection";
  delayDays: number;
  additionalCost: number;
  round: number;
}

export interface ShipmentEvent {
  round: number;
  type: "departed" | "arrived_port" | "cleared_customs" | "inspection" | "delivered" | "delayed";
  location: string;
  description: string;
}

export interface LogisticsNetwork {
  routes: ShippingRoute[];
  ports: Port[];
  clearanceRequirements: ClearanceRequirement[];
  preferredCarriers: Map<string, Carrier>;
}

export interface Carrier {
  id: string;
  name: string;
  methods: ShippingMethod[];
  regions: Region[];
  reliability: number; // 0-1
  costCompetitiveness: number; // 0-1
  speedRating: number; // 0-1
  serviceQuality: number; // 0-1
}

export interface LogisticsStrategy {
  defaultShippingMethod: ShippingMethod;
  rushOrderMethod: ShippingMethod;
  costThreshold: number; // Switch to cheaper method if cost exceeds this
  timeThreshold: number; // Switch to faster method if time exceeds this
  preferredCarriers: string[];
  consolidateShipments: boolean;
  insuranceLevel: "none" | "basic" | "comprehensive";
}

export interface LogisticsDisruption {
  id: string;
  type: "port_strike" | "weather" | "pandemic" | "war" | "sanctions" | "fuel_crisis";
  affectedRoutes: string[];
  affectedMethods: ShippingMethod[];
  duration: number; // Rounds
  delayMultiplier: number;
  costMultiplier: number;
  description: string;
}
