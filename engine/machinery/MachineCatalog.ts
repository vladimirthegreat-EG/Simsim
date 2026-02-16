/**
 * Machine Catalog
 *
 * Defines all 15 machine types available for purchase.
 */

import type { MachineConfig, MachineType, MachineCategory } from "./types";
import { setMachineConfigs } from "./types";

// ============================================
// MACHINE DEFINITIONS
// ============================================

export const MACHINE_CONFIGS: MachineConfig[] = [
  // ==========================================
  // PRODUCTION MACHINES
  // ==========================================
  {
    type: "assembly_line",
    name: "Assembly Line",
    description: "Standard production line for general manufacturing. Versatile and reliable.",
    baseCost: 5_000_000,
    baseCapacity: 10_000,
    baseMaintenanceCost: 50_000,
    baseOperatingCost: 100_000,
    expectedLifespan: 40,
    maintenanceInterval: 4,
    defectRateReduction: 0,
    laborReduction: 0,
    shippingReduction: 0,
    specialtySegments: ["General", "Budget"],
    category: "production",
    icon: "Factory",
  },
  {
    type: "cnc_machine",
    name: "CNC Machine",
    description: "Computer-controlled precision manufacturing. Essential for professional-grade products.",
    baseCost: 8_000_000,
    baseCapacity: 3_000,
    baseMaintenanceCost: 80_000,
    baseOperatingCost: 120_000,
    expectedLifespan: 50,
    maintenanceInterval: 6,
    defectRateReduction: 0.01, // -1% defect rate
    laborReduction: 0.1,       // -10% labor needs
    shippingReduction: 0,
    specialtySegments: ["Professional", "Enthusiast"],
    category: "production",
    icon: "Cog",
  },
  {
    type: "welding_station",
    name: "Welding Station",
    description: "Automated welding for assembly operations. Improves structural quality.",
    baseCost: 4_000_000,
    baseCapacity: 5_000,
    baseMaintenanceCost: 45_000,
    baseOperatingCost: 80_000,
    expectedLifespan: 45,
    maintenanceInterval: 4,
    defectRateReduction: 0.005,
    laborReduction: 0.05,
    shippingReduction: 0,
    specialtySegments: ["General", "Professional"],
    category: "production",
    icon: "Flame",
  },
  {
    type: "injection_molder",
    name: "Injection Molder",
    description: "High-volume plastic component manufacturing. Great for budget products.",
    baseCost: 7_000_000,
    baseCapacity: 12_000,
    baseMaintenanceCost: 70_000,
    baseOperatingCost: 90_000,
    expectedLifespan: 40,
    maintenanceInterval: 5,
    defectRateReduction: 0,
    laborReduction: 0.05,
    shippingReduction: 0,
    specialtySegments: ["Budget", "General"],
    category: "production",
    icon: "Box",
  },
  {
    type: "pcb_assembler",
    name: "PCB Assembler",
    description: "Surface-mount electronics assembly. Critical for high-tech products.",
    baseCost: 10_000_000,
    baseCapacity: 6_000,
    baseMaintenanceCost: 90_000,
    baseOperatingCost: 150_000,
    expectedLifespan: 35,
    maintenanceInterval: 3,
    defectRateReduction: 0.015,
    laborReduction: 0.15,
    shippingReduction: 0,
    specialtySegments: ["Professional", "Enthusiast"],
    category: "production",
    icon: "Cpu",
  },
  {
    type: "paint_booth",
    name: "Paint Booth",
    description: "Automated finishing and coating system. Improves product appearance.",
    baseCost: 3_000_000,
    baseCapacity: 8_000,
    baseMaintenanceCost: 35_000,
    baseOperatingCost: 60_000,
    expectedLifespan: 30,
    maintenanceInterval: 3,
    defectRateReduction: 0,
    laborReduction: 0,
    shippingReduction: 0,
    specialtySegments: ["Enthusiast", "Active Lifestyle"],
    category: "production",
    icon: "Paintbrush",
  },
  {
    type: "laser_cutter",
    name: "Laser Cutter",
    description: "Precision cutting for complex components. Reduces material waste.",
    baseCost: 6_000_000,
    baseCapacity: 4_000,
    baseMaintenanceCost: 55_000,
    baseOperatingCost: 85_000,
    expectedLifespan: 45,
    maintenanceInterval: 5,
    defectRateReduction: 0.01,
    laborReduction: 0.1,
    shippingReduction: 0,
    specialtySegments: ["Professional", "Enthusiast"],
    category: "production",
    icon: "Zap",
  },

  // ==========================================
  // AUTOMATION MACHINES
  // ==========================================
  {
    type: "robotic_arm",
    name: "Robotic Arm",
    description: "6-axis industrial robot. Dramatically reduces labor requirements.",
    baseCost: 12_000_000,
    baseCapacity: 8_000,
    baseMaintenanceCost: 100_000,
    baseOperatingCost: 60_000, // Low operating cost (no labor)
    expectedLifespan: 60,
    maintenanceInterval: 6,
    defectRateReduction: 0.01,
    laborReduction: 0.2,       // -20% labor needs
    shippingReduction: 0,
    specialtySegments: [],      // Works for all
    category: "automation",
    icon: "Bot",
  },
  {
    type: "conveyor_system",
    name: "Conveyor System",
    description: "Automated material transport. Increases throughput significantly.",
    baseCost: 3_000_000,
    baseCapacity: 15_000,       // High capacity (moves materials)
    baseMaintenanceCost: 30_000,
    baseOperatingCost: 40_000,
    expectedLifespan: 50,
    maintenanceInterval: 6,
    defectRateReduction: 0,
    laborReduction: 0.08,
    shippingReduction: 0,
    specialtySegments: [],
    category: "automation",
    icon: "ArrowRight",
  },

  // ==========================================
  // QUALITY MACHINES
  // ==========================================
  {
    type: "quality_scanner",
    name: "Quality Scanner",
    description: "AI-powered inspection system. Dramatically reduces defect rate.",
    baseCost: 6_000_000,
    baseCapacity: 0,            // No direct production
    baseMaintenanceCost: 60_000,
    baseOperatingCost: 40_000,
    expectedLifespan: 40,
    maintenanceInterval: 4,
    defectRateReduction: 0.03,  // -3% defect rate
    laborReduction: 0.05,
    shippingReduction: 0,
    specialtySegments: [],
    category: "quality",
    icon: "ScanSearch",
  },
  {
    type: "testing_rig",
    name: "Testing Rig",
    description: "Automated quality testing station. Catches defects before shipping.",
    baseCost: 4_000_000,
    baseCapacity: 0,
    baseMaintenanceCost: 40_000,
    baseOperatingCost: 50_000,
    expectedLifespan: 40,
    maintenanceInterval: 4,
    defectRateReduction: 0.02,
    laborReduction: 0.03,
    shippingReduction: 0,
    specialtySegments: [],
    category: "quality",
    icon: "ClipboardCheck",
  },

  // ==========================================
  // SPECIALIZED MACHINES
  // ==========================================
  {
    type: "3d_printer",
    name: "3D Printer",
    description: "Additive manufacturing for prototypes and small batches. Speeds up R&D.",
    baseCost: 2_000_000,
    baseCapacity: 500,          // Low capacity but flexible
    baseMaintenanceCost: 40_000,
    baseOperatingCost: 60_000,
    expectedLifespan: 30,
    maintenanceInterval: 3,
    defectRateReduction: 0,
    laborReduction: 0.05,
    shippingReduction: 0,
    specialtySegments: ["Professional", "Enthusiast"],
    category: "specialized",
    icon: "Printer",
  },
  {
    type: "clean_room_unit",
    name: "Clean Room Unit",
    description: "Controlled environment for high-purity production. Required for medical/precision.",
    baseCost: 15_000_000,
    baseCapacity: 2_000,
    baseMaintenanceCost: 150_000,
    baseOperatingCost: 200_000,
    expectedLifespan: 50,
    maintenanceInterval: 2,     // Needs frequent maintenance
    defectRateReduction: 0.04,  // -4% defect rate
    laborReduction: 0,
    shippingReduction: 0,
    specialtySegments: ["Professional"],
    category: "specialized",
    icon: "Sparkles",
  },
  {
    type: "packaging_system",
    name: "Packaging System",
    description: "Automated packaging line. Handles final stage before shipping.",
    baseCost: 2_500_000,
    baseCapacity: 20_000,       // High throughput
    baseMaintenanceCost: 25_000,
    baseOperatingCost: 35_000,
    expectedLifespan: 35,
    maintenanceInterval: 5,
    defectRateReduction: 0,
    laborReduction: 0.1,
    shippingReduction: 0.05,    // -5% shipping costs (better packaging)
    specialtySegments: [],
    category: "production",
    icon: "Package",
  },

  // ==========================================
  // LOGISTICS MACHINES
  // ==========================================
  {
    type: "forklift_fleet",
    name: "Forklift Fleet",
    description: "Warehouse automation vehicles. Reduces internal logistics costs.",
    baseCost: 1_000_000,
    baseCapacity: 0,
    baseMaintenanceCost: 15_000,
    baseOperatingCost: 25_000,
    expectedLifespan: 25,
    maintenanceInterval: 4,
    defectRateReduction: 0,
    laborReduction: 0.03,
    shippingReduction: 0.1,     // -10% shipping/handling costs
    specialtySegments: [],
    category: "logistics",
    icon: "Truck",
  },
];

// ============================================
// CATEGORY CONFIGURATIONS
// ============================================

export const CATEGORY_INFO: Record<MachineCategory, { name: string; description: string }> = {
  production: {
    name: "Production",
    description: "Core manufacturing capacity",
  },
  quality: {
    name: "Quality Control",
    description: "Reduce defect rates and improve quality",
  },
  automation: {
    name: "Automation",
    description: "Reduce labor requirements",
  },
  logistics: {
    name: "Logistics",
    description: "Improve internal material handling",
  },
  specialized: {
    name: "Specialized",
    description: "Unique capabilities for specific segments",
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getMachinesByCategory(category: MachineCategory): MachineConfig[] {
  return MACHINE_CONFIGS.filter(c => c.category === category);
}

export function getMachineConfig(type: MachineType): MachineConfig | undefined {
  return MACHINE_CONFIGS.find(c => c.type === type);
}

export function getMachineTypesForSegment(segment: string): MachineType[] {
  return MACHINE_CONFIGS
    .filter(c => c.specialtySegments.length === 0 || c.specialtySegments.includes(segment))
    .map(c => c.type);
}

export function calculateTotalCapacity(machines: MachineType[]): number {
  return machines.reduce((sum, type) => {
    const config = getMachineConfig(type);
    return sum + (config?.baseCapacity ?? 0);
  }, 0);
}

export function getRecommendedMachines(segment: string, targetCapacity: number): MachineConfig[] {
  const relevant = MACHINE_CONFIGS
    .filter(c => c.baseCapacity > 0)
    .filter(c => c.specialtySegments.length === 0 || c.specialtySegments.includes(segment))
    .sort((a, b) => {
      // Sort by cost-effectiveness (capacity per dollar)
      const aEfficiency = a.baseCapacity / a.baseCost;
      const bEfficiency = b.baseCapacity / b.baseCost;
      return bEfficiency - aEfficiency;
    });

  return relevant;
}

export function getMachinePurchaseInfo(type: MachineType): {
  cost: number;
  monthlyMaintenance: number;
  monthlyOperating: number;
  roi: number;
} | null {
  const config = getMachineConfig(type);
  if (!config) return null;

  const monthlyMaintenance = config.baseMaintenanceCost;
  const monthlyOperating = config.baseOperatingCost;

  // Calculate ROI based on capacity and labor savings
  // Assume $100 revenue per unit, labor cost of $50k/worker/year
  const yearlyRevenue = config.baseCapacity * 100 * 4; // 4 rounds/year equivalent
  const laborSavings = config.laborReduction * 50_000 * 10; // Assume 10 workers affected
  const yearlyCosts = (monthlyMaintenance + monthlyOperating) * 4;
  const yearlyProfit = yearlyRevenue + laborSavings - yearlyCosts;

  const roi = config.baseCost > 0 ? yearlyProfit / config.baseCost : 0;

  return {
    cost: config.baseCost,
    monthlyMaintenance,
    monthlyOperating,
    roi,
  };
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize the type module with configs
setMachineConfigs(MACHINE_CONFIGS);

// Export count for reference
export const TOTAL_MACHINE_TYPES = MACHINE_CONFIGS.length;
