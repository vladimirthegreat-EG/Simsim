/**
 * Machinery Requirements per Archetype Tier
 *
 * Defines which machines are needed to produce each tier of phone.
 * Higher-tier phones need more sophisticated factory equipment.
 */

import type { MachineType } from "@/engine/machinery/types";

export interface MachineryRequirement {
  machineType: MachineType;
  /** Why this machine is needed */
  reason: string;
}

/**
 * Tier 0 - Starter phones (Basic Phone, Standard Phone, Entry Smartphone)
 * Simple assembly only.
 */
const TIER_0_REQUIREMENTS: MachineryRequirement[] = [
  { machineType: "assembly_line", reason: "Basic phone assembly" },
  { machineType: "packaging_system", reason: "Product packaging" },
];

/**
 * Tier 1 - Entry upgrades (Long-Life Phone, Snapshot Phone, etc.)
 * Need basic electronics assembly.
 */
const TIER_1_REQUIREMENTS: MachineryRequirement[] = [
  { machineType: "assembly_line", reason: "Core assembly" },
  { machineType: "pcb_assembler", reason: "Electronics assembly" },
  { machineType: "packaging_system", reason: "Product packaging" },
];

/**
 * Tier 2 - Mid-tier (Camera Phone, Gaming Phone, Business Phone, etc.)
 * Precision manufacturing + quality control.
 */
const TIER_2_REQUIREMENTS: MachineryRequirement[] = [
  { machineType: "assembly_line", reason: "Core assembly" },
  { machineType: "pcb_assembler", reason: "Advanced electronics" },
  { machineType: "cnc_machine", reason: "Precision metal components" },
  { machineType: "injection_molder", reason: "Custom casings & parts" },
  { machineType: "quality_scanner", reason: "Quality inspection" },
  { machineType: "packaging_system", reason: "Product packaging" },
];

/**
 * Tier 3 - High-end (Photo Flagship, AI Powerhouse, Adventure Phone, Foldable)
 * Full precision manufacturing + extensive QA.
 */
const TIER_3_REQUIREMENTS: MachineryRequirement[] = [
  { machineType: "assembly_line", reason: "Core assembly" },
  { machineType: "pcb_assembler", reason: "High-density electronics" },
  { machineType: "cnc_machine", reason: "Precision machining" },
  { machineType: "injection_molder", reason: "Premium casings" },
  { machineType: "laser_cutter", reason: "Precision component cutting" },
  { machineType: "quality_scanner", reason: "Advanced quality inspection" },
  { machineType: "testing_rig", reason: "Stress & reliability testing" },
  { machineType: "packaging_system", reason: "Premium packaging" },
];

/**
 * Tier 4-5 - Flagship & Quantum (Creator Phone, Ultimate Flagship, Quantum Phone)
 * Full automated precision line with clean room.
 */
const TIER_4_5_REQUIREMENTS: MachineryRequirement[] = [
  { machineType: "assembly_line", reason: "Core assembly" },
  { machineType: "pcb_assembler", reason: "Ultra-dense electronics" },
  { machineType: "cnc_machine", reason: "Precision metal work" },
  { machineType: "injection_molder", reason: "Advanced material molding" },
  { machineType: "laser_cutter", reason: "Micro-precision cutting" },
  { machineType: "clean_room_unit", reason: "High-purity assembly" },
  { machineType: "robotic_arm", reason: "Automated precision assembly" },
  { machineType: "quality_scanner", reason: "AI quality inspection" },
  { machineType: "testing_rig", reason: "Comprehensive QA testing" },
  { machineType: "packaging_system", reason: "Premium packaging" },
];

/**
 * Get required machinery for a given archetype tier.
 */
export function getMachineryRequirements(tier: number): MachineryRequirement[] {
  if (tier <= 0) return TIER_0_REQUIREMENTS;
  if (tier === 1) return TIER_1_REQUIREMENTS;
  if (tier === 2) return TIER_2_REQUIREMENTS;
  if (tier === 3) return TIER_3_REQUIREMENTS;
  return TIER_4_5_REQUIREMENTS;
}

/**
 * Get required machine types (just the type IDs) for a tier.
 */
export function getRequiredMachineTypes(tier: number): MachineType[] {
  return getMachineryRequirements(tier).map((r) => r.machineType);
}

/**
 * Check which required machines are missing given owned machine types.
 */
export function getMissingMachinery(
  tier: number,
  ownedMachineTypes: MachineType[]
): MachineryRequirement[] {
  const requirements = getMachineryRequirements(tier);
  const ownedSet = new Set(ownedMachineTypes);
  return requirements.filter((r) => !ownedSet.has(r.machineType));
}
