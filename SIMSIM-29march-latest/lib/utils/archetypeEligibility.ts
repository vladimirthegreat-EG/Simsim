import { getArchetype, type PhoneArchetype } from "@/engine/types/archetypes";
import { getMissingMachinery } from "@/engine/types/machineryRequirements";
import { getRdLevel, getOwnedMachineTypes, getMaterialQualityTier } from "./stateHelpers";
import { MaterialEngine } from "@/engine/materials/MaterialEngine";
import type { TeamState } from "@/engine/types";
import type { MachineType } from "@/engine/machinery/types";

export interface ArchetypeBlocker {
  type: "rd_tech" | "machinery" | "material" | "cash";
  description: string;
  resolution: string;
  severity: "blocking" | "warning";
}

export interface ArchetypeEligibility {
  archetype: PhoneArchetype;
  canBuild: boolean;
  blockers: ArchetypeBlocker[];
}

export function checkArchetypeEligibility(
  archetypeId: string,
  state: TeamState
): ArchetypeEligibility | null {
  const archetype = getArchetype(archetypeId);
  if (!archetype) return null;

  const blockers: ArchetypeBlocker[] = [];
  const unlockedTechs = state.unlockedTechnologies ?? [];
  const ownedMachines = getOwnedMachineTypes(state) as MachineType[];

  // 1. R&D Tech check
  for (const tech of archetype.requiredTech) {
    if (!unlockedTechs.includes(tech)) {
      blockers.push({
        type: "rd_tech",
        description: `Requires technology: ${tech}`,
        resolution: "Visit R&D to research this technology",
        severity: "blocking",
      });
    }
  }

  // 2. Machinery check (existing tier-based requirements)
  const missingMachines = getMissingMachinery(archetype.tier, ownedMachines);
  for (const missing of missingMachines) {
    blockers.push({
      type: "machinery",
      description: `Missing: ${missing.machineType} — ${missing.reason}`,
      resolution: "Visit Factory to purchase this machine",
      severity: "blocking",
    });
  }

  // 3. Material tier check
  const segmentMaterials = MaterialEngine.SEGMENT_MATERIAL_REQUIREMENTS[archetype.primarySegment];
  if (segmentMaterials) {
    const currentTier = getMaterialQualityTier(state);
    if (currentTier < segmentMaterials.qualityTier) {
      blockers.push({
        type: "material",
        description: `Needs material tier ${segmentMaterials.qualityTier} (current: ${currentTier})`,
        resolution: "Upgrade material suppliers for this segment",
        severity: "warning",
      });
    }
  }

  // 4. Cash check
  if (state.cash < archetype.baseCost) {
    blockers.push({
      type: "cash",
      description: `Costs $${(archetype.baseCost / 1_000_000).toFixed(0)}M (have: $${(state.cash / 1_000_000).toFixed(0)}M)`,
      resolution: "Visit Finance to raise capital",
      severity: "blocking",
    });
  }

  return {
    archetype,
    canBuild: blockers.filter((b) => b.severity === "blocking").length === 0,
    blockers,
  };
}
