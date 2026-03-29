/**
 * Shipping Routes and Logistics Network Data
 * Defines all possible shipping routes between regions
 */

import type { Region } from "../materials/types";
import type { ShippingRoute, ShippingMethodDetails, Port, ClearanceRequirement } from "./types";

export const SHIPPING_METHODS: Record<string, ShippingMethodDetails> = {
  sea: {
    method: "sea",
    costMultiplier: 1.0,
    timeMultiplier: 1.0,
    reliability: 0.85,
    carbonEmissions: 10,
    minimumVolume: 100, // cubic meters
    description: "Most economical for large shipments, slowest delivery"
  },
  air: {
    method: "air",
    costMultiplier: 5.0,
    timeMultiplier: 0.2,
    reliability: 0.95,
    carbonEmissions: 500,
    minimumVolume: 1,
    description: "Fastest delivery, highest cost, best for urgent orders"
  },
  land: {
    method: "land",
    costMultiplier: 2.0,
    timeMultiplier: 0.6,
    reliability: 0.90,
    carbonEmissions: 60,
    minimumVolume: 10,
    description: "Good for regional shipments, moderate cost and speed"
  },
  rail: {
    method: "rail",
    costMultiplier: 1.3,
    timeMultiplier: 0.7,
    reliability: 0.88,
    carbonEmissions: 30,
    minimumVolume: 50,
    description: "Eco-friendly option, good balance of cost and time"
  }
};

export const MAJOR_PORTS: Port[] = [
  // North America
  { name: "Los Angeles", region: "North America", country: "USA", efficiency: 0.88, capacity: 9500000, avgProcessingTime: 3, fees: 2500 },
  { name: "New York", region: "North America", country: "USA", efficiency: 0.85, capacity: 7000000, avgProcessingTime: 4, fees: 2800 },
  { name: "Vancouver", region: "North America", country: "Canada", efficiency: 0.90, capacity: 3500000, avgProcessingTime: 2, fees: 2200 },

  // South America
  { name: "Santos", region: "South America", country: "Brazil", efficiency: 0.70, capacity: 4300000, avgProcessingTime: 6, fees: 1800 },
  { name: "Buenos Aires", region: "South America", country: "Argentina", efficiency: 0.68, capacity: 1500000, avgProcessingTime: 7, fees: 1600 },
  { name: "Callao", region: "South America", country: "Peru", efficiency: 0.65, capacity: 2200000, avgProcessingTime: 8, fees: 1400 },

  // Europe
  { name: "Rotterdam", region: "Europe", country: "Netherlands", efficiency: 0.95, capacity: 14500000, avgProcessingTime: 2, fees: 3000 },
  { name: "Hamburg", region: "Europe", country: "Germany", efficiency: 0.93, capacity: 8800000, avgProcessingTime: 2, fees: 2900 },
  { name: "Antwerp", region: "Europe", country: "Belgium", efficiency: 0.92, capacity: 11000000, avgProcessingTime: 3, fees: 2700 },

  // Africa
  { name: "Durban", region: "Africa", country: "South Africa", efficiency: 0.65, capacity: 2800000, avgProcessingTime: 9, fees: 1500 },
  { name: "Lagos", region: "Africa", country: "Nigeria", efficiency: 0.55, capacity: 1200000, avgProcessingTime: 12, fees: 1200 },
  { name: "Port Said", region: "Africa", country: "Egypt", efficiency: 0.72, capacity: 3500000, avgProcessingTime: 7, fees: 1700 },

  // Asia
  { name: "Shanghai", region: "Asia", country: "China", efficiency: 0.92, capacity: 43000000, avgProcessingTime: 2, fees: 2000 },
  { name: "Singapore", region: "Asia", country: "Singapore", efficiency: 0.98, capacity: 37000000, avgProcessingTime: 1, fees: 2500 },
  { name: "Busan", region: "Asia", country: "South Korea", efficiency: 0.90, capacity: 21000000, avgProcessingTime: 2, fees: 2200 },
  { name: "Tokyo", region: "Asia", country: "Japan", efficiency: 0.94, capacity: 7600000, avgProcessingTime: 2, fees: 3200 },

  // Oceania
  { name: "Sydney", region: "Oceania", country: "Australia", efficiency: 0.88, capacity: 2600000, avgProcessingTime: 3, fees: 2400 },
  { name: "Melbourne", region: "Oceania", country: "Australia", efficiency: 0.87, capacity: 2800000, avgProcessingTime: 3, fees: 2300 },
  { name: "Auckland", region: "Oceania", country: "New Zealand", efficiency: 0.85, capacity: 900000, avgProcessingTime: 4, fees: 2100 },

  // Middle East
  { name: "Dubai", region: "Middle East", country: "UAE", efficiency: 0.90, capacity: 15000000, avgProcessingTime: 2, fees: 2600 },
  { name: "Jeddah", region: "Middle East", country: "Saudi Arabia", efficiency: 0.78, capacity: 4000000, avgProcessingTime: 5, fees: 2000 },
  { name: "Doha", region: "Middle East", country: "Qatar", efficiency: 0.82, capacity: 2000000, avgProcessingTime: 4, fees: 2200 }
];

export const SHIPPING_ROUTES: ShippingRoute[] = [
  // North America Routes
  {
    id: "na_to_asia",
    fromRegion: "North America",
    toRegion: "Asia",
    availableMethods: ["sea", "air", "rail"],
    baseLeadTime: 25,
    baseCost: 3500,
    distance: 10000,
    majorPorts: ["Los Angeles", "Vancouver", "Shanghai", "Busan"],
    infrastructureQuality: 0.92,
    congestionLevel: 0.40,
    customsEfficiency: 0.85
  },
  {
    id: "na_to_europe",
    fromRegion: "North America",
    toRegion: "Europe",
    availableMethods: ["sea", "air"],
    baseLeadTime: 20,
    baseCost: 3000,
    distance: 7000,
    majorPorts: ["New York", "Rotterdam", "Hamburg"],
    infrastructureQuality: 0.94,
    congestionLevel: 0.35,
    customsEfficiency: 0.90
  },
  {
    id: "na_to_sa",
    fromRegion: "North America",
    toRegion: "South America",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 18,
    baseCost: 2500,
    distance: 6000,
    majorPorts: ["Los Angeles", "Santos", "Buenos Aires"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.30,
    customsEfficiency: 0.70
  },
  {
    id: "na_to_oceania",
    fromRegion: "North America",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 22,
    baseCost: 3200,
    distance: 12000,
    majorPorts: ["Los Angeles", "Sydney", "Auckland"],
    infrastructureQuality: 0.88,
    congestionLevel: 0.25,
    customsEfficiency: 0.88
  },
  {
    id: "na_to_me",
    fromRegion: "North America",
    toRegion: "Middle East",
    availableMethods: ["sea", "air"],
    baseLeadTime: 28,
    baseCost: 3800,
    distance: 11000,
    majorPorts: ["New York", "Dubai", "Jeddah"],
    infrastructureQuality: 0.85,
    congestionLevel: 0.45,
    customsEfficiency: 0.75
  },
  {
    id: "na_to_africa",
    fromRegion: "North America",
    toRegion: "Africa",
    availableMethods: ["sea", "air"],
    baseLeadTime: 30,
    baseCost: 4000,
    distance: 10500,
    majorPorts: ["New York", "Durban", "Lagos"],
    infrastructureQuality: 0.65,
    congestionLevel: 0.55,
    customsEfficiency: 0.60
  },

  // Asia Routes
  {
    id: "asia_to_europe",
    fromRegion: "Asia",
    toRegion: "Europe",
    availableMethods: ["sea", "air", "rail"],
    baseLeadTime: 30,
    baseCost: 3200,
    distance: 11000,
    majorPorts: ["Shanghai", "Singapore", "Rotterdam", "Hamburg"],
    infrastructureQuality: 0.93,
    congestionLevel: 0.50,
    customsEfficiency: 0.88
  },
  {
    id: "asia_to_oceania",
    fromRegion: "Asia",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 15,
    baseCost: 2200,
    distance: 7000,
    majorPorts: ["Shanghai", "Singapore", "Sydney", "Melbourne"],
    infrastructureQuality: 0.90,
    congestionLevel: 0.35,
    customsEfficiency: 0.90
  },
  {
    id: "asia_to_me",
    fromRegion: "Asia",
    toRegion: "Middle East",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 20,
    baseCost: 2800,
    distance: 7500,
    majorPorts: ["Shanghai", "Singapore", "Dubai"],
    infrastructureQuality: 0.88,
    congestionLevel: 0.40,
    customsEfficiency: 0.80
  },
  {
    id: "asia_to_africa",
    fromRegion: "Asia",
    toRegion: "Africa",
    availableMethods: ["sea", "air"],
    baseLeadTime: 25,
    baseCost: 3000,
    distance: 9000,
    majorPorts: ["Singapore", "Durban", "Port Said"],
    infrastructureQuality: 0.70,
    congestionLevel: 0.50,
    customsEfficiency: 0.65
  },
  {
    id: "asia_to_sa",
    fromRegion: "Asia",
    toRegion: "South America",
    availableMethods: ["sea", "air"],
    baseLeadTime: 35,
    baseCost: 4200,
    distance: 18000,
    majorPorts: ["Shanghai", "Santos", "Callao"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.40,
    customsEfficiency: 0.68
  },

  // Europe Routes
  {
    id: "europe_to_africa",
    fromRegion: "Europe",
    toRegion: "Africa",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 12,
    baseCost: 1800,
    distance: 3500,
    majorPorts: ["Rotterdam", "Durban", "Lagos", "Port Said"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.45,
    customsEfficiency: 0.68
  },
  {
    id: "europe_to_me",
    fromRegion: "Europe",
    toRegion: "Middle East",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 15,
    baseCost: 2000,
    distance: 4500,
    majorPorts: ["Rotterdam", "Hamburg", "Dubai", "Jeddah"],
    infrastructureQuality: 0.88,
    congestionLevel: 0.40,
    customsEfficiency: 0.82
  },
  {
    id: "europe_to_oceania",
    fromRegion: "Europe",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 35,
    baseCost: 4500,
    distance: 17000,
    majorPorts: ["Rotterdam", "Sydney", "Melbourne"],
    infrastructureQuality: 0.90,
    congestionLevel: 0.30,
    customsEfficiency: 0.88
  },
  {
    id: "europe_to_sa",
    fromRegion: "Europe",
    toRegion: "South America",
    availableMethods: ["sea", "air"],
    baseLeadTime: 22,
    baseCost: 3200,
    distance: 9000,
    majorPorts: ["Rotterdam", "Hamburg", "Santos", "Buenos Aires"],
    infrastructureQuality: 0.80,
    congestionLevel: 0.35,
    customsEfficiency: 0.72
  },

  // South America Routes
  {
    id: "sa_to_africa",
    fromRegion: "South America",
    toRegion: "Africa",
    availableMethods: ["sea", "air"],
    baseLeadTime: 20,
    baseCost: 2800,
    distance: 6000,
    majorPorts: ["Santos", "Durban", "Lagos"],
    infrastructureQuality: 0.65,
    congestionLevel: 0.40,
    customsEfficiency: 0.62
  },
  {
    id: "sa_to_oceania",
    fromRegion: "South America",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 28,
    baseCost: 3800,
    distance: 12000,
    majorPorts: ["Santos", "Sydney"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.30,
    customsEfficiency: 0.75
  },
  {
    id: "sa_to_me",
    fromRegion: "South America",
    toRegion: "Middle East",
    availableMethods: ["sea", "air"],
    baseLeadTime: 25,
    baseCost: 3500,
    distance: 11000,
    majorPorts: ["Santos", "Dubai"],
    infrastructureQuality: 0.72,
    congestionLevel: 0.40,
    customsEfficiency: 0.70
  },

  // Africa Routes
  {
    id: "africa_to_me",
    fromRegion: "Africa",
    toRegion: "Middle East",
    availableMethods: ["sea", "air", "land"],
    baseLeadTime: 10,
    baseCost: 1600,
    distance: 4000,
    majorPorts: ["Port Said", "Durban", "Dubai", "Jeddah"],
    infrastructureQuality: 0.72,
    congestionLevel: 0.45,
    customsEfficiency: 0.68
  },
  {
    id: "africa_to_oceania",
    fromRegion: "Africa",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 22,
    baseCost: 3200,
    distance: 10000,
    majorPorts: ["Durban", "Sydney"],
    infrastructureQuality: 0.75,
    congestionLevel: 0.35,
    customsEfficiency: 0.72
  },

  // Middle East Routes
  {
    id: "me_to_oceania",
    fromRegion: "Middle East",
    toRegion: "Oceania",
    availableMethods: ["sea", "air"],
    baseLeadTime: 20,
    baseCost: 3000,
    distance: 9500,
    majorPorts: ["Dubai", "Sydney", "Melbourne"],
    infrastructureQuality: 0.85,
    congestionLevel: 0.35,
    customsEfficiency: 0.80
  },

  // Oceania internal routes (to other regions already covered by reverse)
];

export const CLEARANCE_REQUIREMENTS: ClearanceRequirement[] = [
  // Standard clearance for electronics
  {
    fromRegion: "Asia",
    toRegion: "North America",
    materialTypes: ["processor", "memory", "display"],
    requiredDocuments: ["Commercial Invoice", "Packing List", "Bill of Lading", "Certificate of Origin", "Safety Certification"],
    inspectionProbability: 0.15,
    baseProcessingTime: 3,
    baseCost: 800,
    restrictions: ["Country of origin verification required"]
  },
  {
    fromRegion: "Asia",
    toRegion: "Europe",
    materialTypes: ["processor", "memory", "display"],
    requiredDocuments: ["Commercial Invoice", "Packing List", "Bill of Lading", "CE Certification", "RoHS Compliance"],
    inspectionProbability: 0.20,
    baseProcessingTime: 4,
    baseCost: 900,
    restrictions: ["EU compliance required", "Environmental standards"]
  },
  // Add more clearance requirements for each route and material type combination
  {
    fromRegion: "North America",
    toRegion: "Asia",
    requiredDocuments: ["Commercial Invoice", "Packing List", "Bill of Lading"],
    inspectionProbability: 0.12,
    baseProcessingTime: 2,
    baseCost: 600
  },
  {
    fromRegion: "Europe",
    toRegion: "Africa",
    requiredDocuments: ["Commercial Invoice", "Packing List", "Certificate of Origin"],
    inspectionProbability: 0.25,
    baseProcessingTime: 6,
    baseCost: 500,
    restrictions: ["Import license may be required"]
  },
  {
    fromRegion: "Africa",
    toRegion: "Middle East",
    requiredDocuments: ["Commercial Invoice", "Packing List", "Bill of Lading", "Certificate of Origin"],
    inspectionProbability: 0.30,
    baseProcessingTime: 5,
    baseCost: 450
  }
];

/**
 * Find route between two regions (bidirectional)
 */
export function findRoute(from: Region, to: Region): ShippingRoute | undefined {
  // Try to find route in either direction
  const forwardRoute = SHIPPING_ROUTES.find(r => r.fromRegion === from && r.toRegion === to);
  if (forwardRoute) return forwardRoute;

  // Try reverse direction
  const reverseRoute = SHIPPING_ROUTES.find(r => r.fromRegion === to && r.toRegion === from);
  return reverseRoute;
}

/**
 * Calculate shipping cost for a route
 */
export function calculateShippingCost(
  route: ShippingRoute,
  method: "sea" | "air" | "land" | "rail",
  weight: number
): number {
  const methodDetails = SHIPPING_METHODS[method];
  const baseCost = route.baseCost;
  const methodMultiplier = methodDetails.costMultiplier;
  const weightMultiplier = weight / 1000; // Cost per ton

  return baseCost * methodMultiplier * weightMultiplier;
}

/**
 * Calculate lead time for a shipment
 */
export function calculateLeadTime(
  route: ShippingRoute,
  method: "sea" | "air" | "land" | "rail"
): number {
  const methodDetails = SHIPPING_METHODS[method];
  const baseTime = route.baseLeadTime;
  const methodMultiplier = methodDetails.timeMultiplier;

  return Math.ceil(baseTime * methodMultiplier);
}
