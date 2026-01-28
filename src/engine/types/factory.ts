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
  | "sixSigma"           // $75M, 40% defect reduction
  | "automation"         // $75M, 80% worker reduction
  | "materialRefinement" // $100M, +1 material level
  | "supplyChain"        // $200M, 70% shipping cost reduction
  | "warehousing";       // $100M, 90% storage cost reduction

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
}
