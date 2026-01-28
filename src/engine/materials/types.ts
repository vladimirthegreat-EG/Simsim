/**
 * Material System Type Definitions
 * Defines materials, sourcing, inventory, and quality tracking
 */

import type { Segment } from "../types";

export type MaterialType =
  | "display"
  | "processor"
  | "memory"
  | "storage"
  | "camera"
  | "battery"
  | "chassis"
  | "other";

export type Region =
  | "North America"
  | "South America"
  | "Europe"
  | "Africa"
  | "Asia"
  | "Oceania"
  | "Middle East";

export interface Material {
  type: MaterialType;
  spec: string;
  costPerUnit: number;
  source: Region;
  qualityRating: number; // 0-100
  leadTime: number; // Days
  minimumOrderQuantity: number;
  reliability: number; // 0-1, probability of on-time delivery
}

export interface SegmentMaterials {
  segment: Segment;
  materials: Material[];
  totalCost: number;
  leadTime: number; // Maximum lead time across all materials
  qualityTier: 1 | 2 | 3 | 4 | 5; // 1=Budget, 5=Ultra Premium
}

export interface MaterialInventory {
  materialType: MaterialType;
  spec: string;
  quantity: number;
  averageCost: number;
  sourceRegion: Region;
  arrivalRound?: number; // If in transit
  orderId?: string;
}

export interface MaterialOrder {
  id: string;
  materialType: MaterialType;
  spec: string;
  quantity: number;
  sourceRegion: Region;
  destRegion: Region;
  supplierName: string;
  costPerUnit: number;
  shippingMethod: "sea" | "air" | "land" | "rail";

  // Timeline
  orderRound: number;
  productionTime: number; // Days
  shippingTime: number; // Days
  clearanceTime: number; // Days
  inspectionTime: number; // Days
  estimatedArrivalRound: number;

  // Costs
  materialCost: number;
  shippingCost: number;
  clearanceCost: number;
  tariffCost: number;
  totalCost: number;

  // Status
  status: "pending" | "production" | "shipping" | "clearance" | "delivered" | "delayed" | "cancelled";
  currentLocation?: string;
  delayRounds?: number;
}

export interface RegionalCapabilities {
  region: Region;
  materials: MaterialType[];
  costMultiplier: number; // Base cost adjustment
  qualityRange: [number, number]; // Min and max quality ratings
  leadTimeRange: [number, number]; // Min and max lead time in days
  specialties: string[];
  reliability: number; // 0-1, probability of successful delivery
  politicalStability: number; // 0-1, affects disruption probability
  infrastructureQuality: number; // 0-1, affects shipping costs
  laborCost: number; // Relative labor cost
  tariffFriendly: Region[]; // Regions with low/no tariffs
}

export interface Supplier {
  id: string;
  name: string;
  region: Region;
  materials: MaterialType[];

  // Quality metrics
  qualityRating: number; // 0-100
  defectRate: number; // 0-1
  consistency: number; // 0-1, how consistent quality is

  // Reliability metrics
  onTimeDeliveryRate: number; // 0-1
  responsiveness: number; // 0-1

  // Cost metrics
  costCompetitiveness: number; // 0-1, lower is better
  priceVolatility: number; // 0-1, how much prices fluctuate

  // Capacity
  monthlyCapacity: number; // Units per month
  minimumOrder: number;

  // Contract terms
  paymentTerms: "immediate" | "net30" | "net60" | "net90";
  contractDiscount: number; // 0-1, discount for long-term contract

  // Relationship
  relationshipLevel: number; // 0-100, built over time
  contractedUntilRound?: number;
}

export interface MaterialSourcingChoice {
  materialType: MaterialType;
  spec: string;
  supplierId: string;
  region: Region;
  quantity: number;
  shippingMethod: "sea" | "air" | "land" | "rail";
  contractLength?: number; // Rounds, optional long-term contract
}

export interface MaterialRequirement {
  segment: Segment;
  materialType: MaterialType;
  spec: string;
  quantityPerUnit: number; // How many of this material per phone
  substitutes?: string[]; // Alternative specs that can be used
}

export interface MaterialQuality {
  materialType: MaterialType;
  qualityScore: number; // 0-100
  defectRate: number; // 0-1
  contribution: number; // How much this material contributes to overall product quality
}

export interface MaterialsState {
  inventory: MaterialInventory[];
  activeOrders: MaterialOrder[];
  suppliers: Supplier[];
  contracts: MaterialContract[];
  totalInventoryValue: number;
  holdingCosts: number; // Per round
}

export interface MaterialContract {
  id: string;
  supplierId: string;
  materialType: MaterialType;
  spec: string;
  pricePerUnit: number;
  minimumMonthlyQuantity: number;
  startRound: number;
  endRound: number;
  penaltyForBreaking: number;
  discount: number; // 0-1
}

export interface MaterialDisruption {
  id: string;
  type: "supplier_failure" | "quality_issue" | "shortage" | "contamination" | "geopolitical";
  affectedMaterials: MaterialType[];
  affectedRegions: Region[];
  severity: number; // 0-1
  duration: number; // Rounds
  costImpact: number; // Multiplier
  delayImpact: number; // Additional days
  qualityImpact: number; // Quality reduction
  description: string;
}
