/**
 * Regional Capabilities and Supplier Data
 * Defines what each region can produce and supplier details
 */

import type { Region, RegionalCapabilities, Supplier, MaterialType } from "./types";

export const REGIONAL_CAPABILITIES: Record<Region, RegionalCapabilities> = {
  "North America": {
    region: "North America",
    materials: ["processor", "memory", "storage", "display"],
    costMultiplier: 1.2,
    qualityRange: [95, 100],
    leadTimeRange: [35, 45],
    specialties: [
      "Advanced SoCs",
      "AI chips",
      "High-performance processors",
      "Premium assembly",
      "R&D innovation"
    ],
    reliability: 0.95,
    politicalStability: 0.92,
    infrastructureQuality: 0.95,
    laborCost: 1.4,
    tariffFriendly: ["Europe", "Oceania"]
  },

  "South America": {
    region: "South America",
    materials: ["battery", "chassis", "other"],
    costMultiplier: 0.9,
    qualityRange: [70, 85],
    leadTimeRange: [40, 55],
    specialties: [
      "Lithium extraction",
      "Raw material processing",
      "Basic assembly",
      "Battery components"
    ],
    reliability: 0.75,
    politicalStability: 0.70,
    infrastructureQuality: 0.65,
    laborCost: 0.6,
    tariffFriendly: ["North America"]
  },

  "Europe": {
    region: "Europe",
    materials: ["display", "camera", "processor", "chassis"],
    costMultiplier: 1.1,
    qualityRange: [90, 98],
    leadTimeRange: [30, 40],
    specialties: [
      "Precision engineering",
      "Premium camera optics",
      "Advanced displays",
      "Quality control systems",
      "Eco-friendly manufacturing"
    ],
    reliability: 0.93,
    politicalStability: 0.88,
    infrastructureQuality: 0.92,
    laborCost: 1.2,
    tariffFriendly: ["North America", "Middle East"]
  },

  "Africa": {
    region: "Africa",
    materials: ["battery", "chassis", "other"],
    costMultiplier: 0.7,
    qualityRange: [60, 80],
    leadTimeRange: [45, 60],
    specialties: [
      "Rare earth minerals",
      "Cobalt extraction",
      "Basic manufacturing",
      "Raw material supply"
    ],
    reliability: 0.68,
    politicalStability: 0.62,
    infrastructureQuality: 0.55,
    laborCost: 0.4,
    tariffFriendly: ["Europe", "Middle East"]
  },

  "Asia": {
    region: "Asia",
    materials: ["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"],
    costMultiplier: 0.7,
    qualityRange: [85, 95],
    leadTimeRange: [20, 35],
    specialties: [
      "Complete component ecosystem",
      "High-volume manufacturing",
      "OLED/AMOLED displays",
      "Memory chips",
      "Full assembly services",
      "Rapid scaling capability"
    ],
    reliability: 0.85,
    politicalStability: 0.80,
    infrastructureQuality: 0.88,
    laborCost: 0.5,
    tariffFriendly: ["Oceania", "Middle East"]
  },

  "Oceania": {
    region: "Oceania",
    materials: ["processor", "memory", "camera"],
    costMultiplier: 1.15,
    qualityRange: [88, 95],
    leadTimeRange: [38, 48],
    specialties: [
      "Quality assurance",
      "Testing and certification",
      "Specialized components",
      "Research partnerships"
    ],
    reliability: 0.90,
    politicalStability: 0.95,
    infrastructureQuality: 0.88,
    laborCost: 1.3,
    tariffFriendly: ["Asia", "North America"]
  },

  "Middle East": {
    region: "Middle East",
    materials: ["chassis", "battery", "other"],
    costMultiplier: 1.0,
    qualityRange: [75, 90],
    leadTimeRange: [32, 42],
    specialties: [
      "Strategic logistics hub",
      "Fast shipping routes",
      "Assembly operations",
      "Regional distribution"
    ],
    reliability: 0.78,
    politicalStability: 0.72,
    infrastructureQuality: 0.82,
    laborCost: 0.8,
    tariffFriendly: ["Europe", "Asia", "Africa"]
  }
};

export const DEFAULT_SUPPLIERS: Supplier[] = [
  // North America Suppliers
  {
    id: "na_chipmaster",
    name: "ChipMaster Technologies",
    region: "North America",
    materials: ["processor", "memory"],
    qualityRating: 98,
    defectRate: 0.005,
    consistency: 0.95,
    onTimeDeliveryRate: 0.92,
    responsiveness: 0.88,
    costCompetitiveness: 0.30, // Higher cost
    priceVolatility: 0.15,
    monthlyCapacity: 500000,
    minimumOrder: 10000,
    paymentTerms: "net30",
    contractDiscount: 0.08,
    relationshipLevel: 50
  },
  {
    id: "na_displaypro",
    name: "DisplayPro Inc",
    region: "North America",
    materials: ["display"],
    qualityRating: 96,
    defectRate: 0.008,
    consistency: 0.93,
    onTimeDeliveryRate: 0.90,
    responsiveness: 0.85,
    costCompetitiveness: 0.25,
    priceVolatility: 0.18,
    monthlyCapacity: 300000,
    minimumOrder: 5000,
    paymentTerms: "net30",
    contractDiscount: 0.10,
    relationshipLevel: 50
  },

  // Asia Suppliers
  {
    id: "asia_globaltech",
    name: "GlobalTech Manufacturing",
    region: "Asia",
    materials: ["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"],
    qualityRating: 92,
    defectRate: 0.012,
    consistency: 0.88,
    onTimeDeliveryRate: 0.85,
    responsiveness: 0.90,
    costCompetitiveness: 0.85, // Very competitive pricing
    priceVolatility: 0.12,
    monthlyCapacity: 2000000,
    minimumOrder: 50000,
    paymentTerms: "net60",
    contractDiscount: 0.15,
    relationshipLevel: 50
  },
  {
    id: "asia_oledmaster",
    name: "OLED Master Displays",
    region: "Asia",
    materials: ["display"],
    qualityRating: 94,
    defectRate: 0.010,
    consistency: 0.90,
    onTimeDeliveryRate: 0.88,
    responsiveness: 0.92,
    costCompetitiveness: 0.75,
    priceVolatility: 0.20,
    monthlyCapacity: 800000,
    minimumOrder: 20000,
    paymentTerms: "net45",
    contractDiscount: 0.12,
    relationshipLevel: 50
  },
  {
    id: "asia_powertech",
    name: "PowerTech Batteries",
    region: "Asia",
    materials: ["battery"],
    qualityRating: 90,
    defectRate: 0.015,
    consistency: 0.85,
    onTimeDeliveryRate: 0.87,
    responsiveness: 0.88,
    costCompetitiveness: 0.80,
    priceVolatility: 0.25,
    monthlyCapacity: 1500000,
    minimumOrder: 30000,
    paymentTerms: "net60",
    contractDiscount: 0.18,
    relationshipLevel: 50
  },

  // Europe Suppliers
  {
    id: "eu_precisionoptics",
    name: "Precision Optics GmbH",
    region: "Europe",
    materials: ["camera"],
    qualityRating: 97,
    defectRate: 0.006,
    consistency: 0.94,
    onTimeDeliveryRate: 0.93,
    responsiveness: 0.90,
    costCompetitiveness: 0.35,
    priceVolatility: 0.10,
    monthlyCapacity: 400000,
    minimumOrder: 8000,
    paymentTerms: "net30",
    contractDiscount: 0.07,
    relationshipLevel: 50
  },
  {
    id: "eu_premiumdisplay",
    name: "Premium Display Solutions",
    region: "Europe",
    materials: ["display"],
    qualityRating: 95,
    defectRate: 0.007,
    consistency: 0.92,
    onTimeDeliveryRate: 0.91,
    responsiveness: 0.87,
    costCompetitiveness: 0.30,
    priceVolatility: 0.12,
    monthlyCapacity: 350000,
    minimumOrder: 7000,
    paymentTerms: "net30",
    contractDiscount: 0.09,
    relationshipLevel: 50
  },

  // South America Suppliers
  {
    id: "sa_lithiumcorp",
    name: "LithiumCorp SA",
    region: "South America",
    materials: ["battery"],
    qualityRating: 78,
    defectRate: 0.025,
    consistency: 0.75,
    onTimeDeliveryRate: 0.75,
    responsiveness: 0.70,
    costCompetitiveness: 0.90,
    priceVolatility: 0.30,
    monthlyCapacity: 600000,
    minimumOrder: 25000,
    paymentTerms: "net90",
    contractDiscount: 0.20,
    relationshipLevel: 50
  },
  {
    id: "sa_basicmfg",
    name: "Basic Manufacturing Co",
    region: "South America",
    materials: ["chassis", "other"],
    qualityRating: 75,
    defectRate: 0.030,
    consistency: 0.72,
    onTimeDeliveryRate: 0.73,
    responsiveness: 0.68,
    costCompetitiveness: 0.88,
    priceVolatility: 0.28,
    monthlyCapacity: 800000,
    minimumOrder: 30000,
    paymentTerms: "net90",
    contractDiscount: 0.22,
    relationshipLevel: 50
  },

  // Africa Suppliers
  {
    id: "af_mineralextract",
    name: "African Mineral Extractors",
    region: "Africa",
    materials: ["battery", "other"],
    qualityRating: 70,
    defectRate: 0.035,
    consistency: 0.68,
    onTimeDeliveryRate: 0.68,
    responsiveness: 0.65,
    costCompetitiveness: 0.95,
    priceVolatility: 0.35,
    monthlyCapacity: 500000,
    minimumOrder: 40000,
    paymentTerms: "immediate",
    contractDiscount: 0.25,
    relationshipLevel: 50
  },

  // Oceania Suppliers
  {
    id: "oc_qualitytech",
    name: "Quality Tech Australia",
    region: "Oceania",
    materials: ["processor", "memory", "camera"],
    qualityRating: 93,
    defectRate: 0.010,
    consistency: 0.90,
    onTimeDeliveryRate: 0.90,
    responsiveness: 0.88,
    costCompetitiveness: 0.40,
    priceVolatility: 0.15,
    monthlyCapacity: 250000,
    minimumOrder: 6000,
    paymentTerms: "net30",
    contractDiscount: 0.08,
    relationshipLevel: 50
  },

  // Middle East Suppliers
  {
    id: "me_logisticshub",
    name: "Middle East Logistics Hub",
    region: "Middle East",
    materials: ["chassis", "battery", "other"],
    qualityRating: 82,
    defectRate: 0.020,
    consistency: 0.80,
    onTimeDeliveryRate: 0.80,
    responsiveness: 0.85,
    costCompetitiveness: 0.70,
    priceVolatility: 0.22,
    monthlyCapacity: 700000,
    minimumOrder: 15000,
    paymentTerms: "net45",
    contractDiscount: 0.14,
    relationshipLevel: 50
  }
];

/**
 * Get suppliers for a specific material type
 */
export function getSuppliersForMaterial(materialType: MaterialType): Supplier[] {
  return DEFAULT_SUPPLIERS.filter(s => s.materials.includes(materialType));
}

/**
 * Get suppliers in a specific region
 */
export function getSuppliersInRegion(region: Region): Supplier[] {
  return DEFAULT_SUPPLIERS.filter(s => s.region === region);
}

/**
 * Find best supplier based on criteria
 */
export function findBestSupplier(
  materialType: MaterialType,
  prioritize: "cost" | "quality" | "reliability"
): Supplier | undefined {
  const suppliers = getSuppliersForMaterial(materialType);

  if (suppliers.length === 0) return undefined;

  switch (prioritize) {
    case "cost":
      return suppliers.reduce((best, current) =>
        current.costCompetitiveness > best.costCompetitiveness ? current : best
      );
    case "quality":
      return suppliers.reduce((best, current) =>
        current.qualityRating > best.qualityRating ? current : best
      );
    case "reliability":
      return suppliers.reduce((best, current) =>
        current.onTimeDeliveryRate > best.onTimeDeliveryRate ? current : best
      );
  }
}
