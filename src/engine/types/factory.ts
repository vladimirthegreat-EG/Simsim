/**
 * Factory-related types for the Business Simulation Engine
 */

// ============================================
// REGIONS & SEGMENTS
// ============================================

export type Region = "North America" | "Europe" | "Asia" | "MENA";
export type Segment = "Budget" | "General" | "Enthusiast" | "Professional" | "Active Lifestyle";

// ============================================
// PRODUCTION
// ============================================

export interface ProductionLine {
  id: string;
  segment: Segment;
  productId: string;
  capacity: number;      // Units per round
  efficiency: number;    // 0-1 multiplier
}

export type FactoryUpgrade =
  // === EXISTING (5) ===
  | "sixSigma"           // $75M, 40% defect reduction
  | "automation"         // $75M, 80% worker reduction
  | "materialRefinement" // $100M, +1 material level
  | "supplyChain"        // $200M, 70% shipping cost reduction
  | "warehousing"        // $100M, 90% storage cost reduction

  // === QUALITY & EFFICIENCY (5 new) ===
  | "leanManufacturing"  // $40M, 15% efficiency boost, 10% cost reduction
  | "digitalTwin"        // $60M, 20% maintenance cost reduction, predictive alerts
  | "iotIntegration"     // $50M, Real-time monitoring, 15% breakdown reduction
  | "modularLines"       // $80M, 50% changeover time reduction
  | "continuousImprovement" // $30M, +1% efficiency per round (caps at 10%)

  // === SUSTAINABILITY (5 new) ===
  | "solarPanels"        // $45M, 40% energy cost reduction, +100 ESG
  | "waterRecycling"     // $25M, 30% water cost reduction, +50 ESG
  | "wasteToEnergy"      // $35M, 20% waste disposal savings, +75 ESG
  | "smartGrid"          // $55M, 25% energy efficiency, +80 ESG
  | "carbonCapture"      // $70M, 50% CO2 reduction, +150 ESG

  // === CAPACITY & SPECIALIZATION (5 new) ===
  | "cleanRoom"          // $120M, Enables high-purity production (+20% price)
  | "rapidPrototyping"   // $40M, 50% faster R&D prototypes
  | "advancedRobotics"   // $100M, 50% capacity increase
  | "qualityLab"         // $60M, -50% defect rate, +30% QA speed
  | "flexibleManufacturing"; // $90M, Can produce all segments efficiently

// ============================================
// FACTORY
// ============================================

export interface Factory {
  id: string;
  name: string;
  region: Region;
  productionLines: ProductionLine[];

  // Staffing
  workers: number;
  engineers: number;
  supervisors: number;

  // Efficiency & Quality
  efficiency: number;    // 0-1 (worker/machine effectiveness)
  utilization: number;   // 0-1 (PATCH 3: actual demand / max capacity)
  defectRate: number;    // 0-1
  materialLevel: number; // 1-5

  // PATCH 3: Utilization impact tracking
  burnoutRisk: number;           // Accumulates when utilization > 95%
  maintenanceBacklog: number;    // Deferred maintenance hours

  // Costs
  shippingCost: number;
  storageCost: number;

  // Investments
  efficiencyInvestment: {
    workers: number;
    supervisors: number;
    engineers: number;
    machinery: number;
    factory: number;
  };

  // Upgrades
  upgrades: FactoryUpgrade[];

  // PATCH 7: Upgrade economic benefits
  warrantyReduction: number;      // Six Sigma reduces warranty costs
  recallProbability: number;      // Six Sigma reduces recall risk
  stockoutReduction: number;      // Supply Chain captures more demand
  demandSpikeCapture: number;     // Warehousing handles demand spikes
  costVolatility: number;         // Automation reduces cost variance

  // Environmental
  co2Emissions: number;
  greenInvestment: number;

  // === EXTENDED UPGRADE PROPERTIES (for new upgrades) ===
  // Quality & Efficiency
  operatingCostReduction?: number;
  maintenanceCostReduction?: number;
  breakdownReduction?: number;
  realTimeMonitoringEnabled?: boolean;
  predictiveMaintenanceEnabled?: boolean;
  changeoverTimeReduction?: number;
  continuousImprovementEnabled?: boolean;
  continuousImprovementBonus?: number;

  // Sustainability
  energyCostReduction?: number;
  waterCostReduction?: number;
  wasteCostReduction?: number;
  esgFromUpgrades?: number;

  // Capacity & Specialization
  cleanRoomEnabled?: boolean;
  professionalPriceBonus?: number;
  rdSpeedBonus?: number;
  capacityMultiplier?: number;
  laborReduction?: number;
  qaSpeedBonus?: number;
  flexibleManufacturingEnabled?: boolean;
}
