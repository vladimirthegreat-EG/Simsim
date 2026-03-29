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
  // PRODUCTION MACHINES (line-locked — add capacity to specific lines)
  // Core phone manufacturing equipment
  // ==========================================
  {
    type: "assembly_line",
    name: "Phone Assembly Line",
    description: "Standard phone assembly. Versatile workhorse — best capacity per dollar for Budget/General phones.",
    baseCost: 10_000_000,
    baseCapacity: 20_000,       // Baseline: $250/unit capacity — best value workhorse
    baseMaintenanceCost: 150_000,   // 3x increase — machines need real upkeep
    baseOperatingCost: 300_000,     // 3x increase — power, consumables, operators
    expectedLifespan: 40,
    maintenanceInterval: 4,
    defectRateReduction: 0,
    laborReduction: 0,          // Manual labor-intensive
    shippingReduction: 0,
    specialtySegments: ["General", "Budget"],
    category: "production",
    icon: "Factory",
  },
  {
    type: "cnc_machine",
    name: "CNC Milling Center",
    description: "Precision metal frame machining. Creates premium aluminum/titanium phone chassis.",
    baseCost: 15_000_000,
    baseCapacity: 8_000,        // Lower volume, premium quality ($1,000/unit)
    baseMaintenanceCost: 240_000,
    baseOperatingCost: 360_000,
    expectedLifespan: 50,
    maintenanceInterval: 6,
    defectRateReduction: 0.01,
    laborReduction: 0.10,
    shippingReduction: 0,
    specialtySegments: ["Professional", "Enthusiast"],
    category: "production",
    icon: "Cog",
  },
  {
    type: "welding_station",
    name: "Micro-Soldering Station",
    description: "Precision soldering for component bonding. Essential for reliable phone assembly.",
    baseCost: 8_000_000,
    baseCapacity: 12_000,       // $333/unit — good mid-tier value
    baseMaintenanceCost: 135_000,
    baseOperatingCost: 240_000,
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
    description: "High-volume plastic casing production. Churns out Budget phone shells at scale.",
    baseCost: 12_000_000,
    baseCapacity: 25_000,       // Highest volume production, $240/unit — budget king
    baseMaintenanceCost: 210_000,
    baseOperatingCost: 270_000,
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
    name: "SMT/PCB Assembler",
    description: "Surface-mount circuit board assembly. Critical for ALL phones — essential for high-tech segments.",
    baseCost: 20_000_000,
    baseCapacity: 15_000,       // $667/unit — essential for all phones, moderate throughput
    baseMaintenanceCost: 270_000,
    baseOperatingCost: 450_000,
    expectedLifespan: 35,
    maintenanceInterval: 3,
    defectRateReduction: 0.015,
    laborReduction: 0.15,       // Highly automated
    shippingReduction: 0,
    specialtySegments: ["Professional", "Enthusiast"],
    category: "production",
    icon: "Cpu",
  },
  {
    type: "paint_booth",
    name: "Surface Treatment Line",
    description: "Anodizing, coating, and finish treatment. Premium look and feel for lifestyle phones.",
    baseCost: 8_000_000,
    baseCapacity: 15_000,       // $267/unit — high throughput finishing
    baseMaintenanceCost: 105_000,
    baseOperatingCost: 180_000,
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
    name: "Laser Cutting System",
    description: "Precision cutting for glass, sapphire screens, and complex components.",
    baseCost: 14_000_000,
    baseCapacity: 8_000,        // $875/unit — precision = lower throughput
    baseMaintenanceCost: 165_000,
    baseOperatingCost: 255_000,
    expectedLifespan: 45,
    maintenanceInterval: 5,
    defectRateReduction: 0.01,
    laborReduction: 0.10,
    shippingReduction: 0,
    specialtySegments: ["Professional", "Enthusiast"],
    category: "production",
    icon: "Zap",
  },

  // ==========================================
  // AUTOMATION MACHINES (line-locked — reduce labor, add some capacity)
  // ==========================================
  {
    type: "robotic_arm",
    name: "Robotic Assembly Arm",
    description: "6-axis industrial robot. Replaces manual assembly — dramatically cuts labor needs.",
    baseCost: 22_000_000,
    baseCapacity: 10_000,       // $1,200/unit — you pay for automation, not raw capacity
    baseMaintenanceCost: 300_000,
    baseOperatingCost: 180_000,
    expectedLifespan: 60,
    maintenanceInterval: 6,
    defectRateReduction: 0.01,
    laborReduction: 0.20,       // -20% labor needs (big!)
    shippingReduction: 0,
    specialtySegments: [],
    category: "automation",
    icon: "Bot",
  },
  {
    type: "conveyor_system",
    name: "Automated Conveyor",
    description: "Moves components between stations. Boosts throughput and reduces handling labor.",
    baseCost: 7_000_000,
    baseCapacity: 0,            // SHARED: no direct line capacity — it's a transport system
    baseMaintenanceCost: 90_000,
    baseOperatingCost: 120_000,
    expectedLifespan: 50,
    maintenanceInterval: 6,
    defectRateReduction: 0,
    laborReduction: 0.08,       // Reduces material handling labor
    shippingReduction: 0,
    specialtySegments: [],
    category: "automation",
    icon: "ArrowRight",
  },

  // ==========================================
  // QUALITY MACHINES (shared — serve all lines)
  // ==========================================
  {
    type: "quality_scanner",
    name: "AI Quality Scanner",
    description: "AI-powered visual inspection. Catches defects before shipping — serves all lines.",
    baseCost: 12_000_000,
    baseCapacity: 0,
    baseMaintenanceCost: 180_000,
    baseOperatingCost: 120_000,
    expectedLifespan: 40,
    maintenanceInterval: 4,
    defectRateReduction: 0.03,
    laborReduction: 0.05,
    shippingReduction: 0,
    specialtySegments: [],
    category: "quality",
    icon: "ScanSearch",
  },
  {
    type: "testing_rig",
    name: "Phone Testing Station",
    description: "Automated drop, water, signal, and battery testing. Catches failures before shipping.",
    baseCost: 8_000_000,
    baseCapacity: 0,
    baseMaintenanceCost: 120_000,
    baseOperatingCost: 150_000,
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
    name: "3D Prototyping Printer",
    description: "Rapid prototyping for new phone designs. Speeds up R&D, tiny production capacity.",
    baseCost: 4_000_000,
    baseCapacity: 500,
    baseMaintenanceCost: 120_000,
    baseOperatingCost: 180_000,
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
    name: "Clean Room Module",
    description: "Dust-free environment for sensitive electronics. Required for professional-grade phones.",
    baseCost: 28_000_000,
    baseCapacity: 5_000,        // $3,000/unit — expensive but essential for Pro segment
    baseMaintenanceCost: 150_000,
    baseOperatingCost: 600_000,
    expectedLifespan: 50,
    maintenanceInterval: 2,
    defectRateReduction: 0.04,
    laborReduction: 0,
    shippingReduction: 0,
    specialtySegments: ["Professional"],
    category: "specialized",
    icon: "Sparkles",
  },
  {
    type: "packaging_system",
    name: "Packaging & Boxing Line",
    description: "Automated phone boxing, labeling, and palletizing. Shared across all lines.",
    baseCost: 5_000_000,
    baseCapacity: 0,            // SHARED: handles packaging for all lines, not direct production
    baseMaintenanceCost: 75_000,
    baseOperatingCost: 105_000,
    expectedLifespan: 35,
    maintenanceInterval: 5,
    defectRateReduction: 0,
    laborReduction: 0.10,       // Reduces packaging labor
    shippingReduction: 0.05,
    specialtySegments: [],
    category: "logistics",      // Reclassified from production to logistics (shared)
    icon: "Package",
  },

  // ==========================================
  // LOGISTICS MACHINES (shared)
  // ==========================================
  {
    type: "forklift_fleet",
    name: "Automated Warehouse Fleet",
    description: "AGV/forklift fleet for warehouse automation. Reduces handling costs across factory.",
    baseCost: 2_000_000,
    baseCapacity: 0,
    baseMaintenanceCost: 45_000,
    baseOperatingCost: 75_000,
    expectedLifespan: 25,
    maintenanceInterval: 4,
    defectRateReduction: 0,
    laborReduction: 0.03,
    shippingReduction: 0.10,
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

/** Get machines grouped by bucket (capacity/automation/quality) — compat with March 25 UI */
export function getMachinesByBucket(): Record<string, MachineConfig[]> {
  return {
    capacity: MACHINE_CONFIGS.filter(m => m.category === "production" || m.category === "specialized"),
    automation: MACHINE_CONFIGS.filter(m => m.category === "automation"),
    quality: MACHINE_CONFIGS.filter(m => m.category === "quality" || m.category === "logistics"),
  };
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
