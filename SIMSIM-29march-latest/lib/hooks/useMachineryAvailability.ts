"use client";

import { useMemo } from "react";
import type { TeamState, Segment } from "@/engine/types";
import type { MachineType } from "@/engine/machinery/types";
import { getRdLevel, getActiveSegments, getOwnedMachineTypes, getFactoryUpgrades, getMaterialQualityTier } from "@/lib/utils/stateHelpers";
import { MACHINE_RD_REQUIREMENTS, MACHINE_EXTRA_PREREQS, SEGMENT_MACHINERY } from "@/lib/config/machineryPrerequisites";

export type MachineAvailability =
  | "available"
  | "owned"
  | "locked_rd"
  | "locked_upgrade"
  | "locked_material"
  | "not_relevant";

export interface MachineStatus {
  machineType: string;
  availability: MachineAvailability;
  reason?: string;
}

export function useMachineryAvailability(state: TeamState | null): MachineStatus[] {
  return useMemo(() => {
    if (!state) return [];

    const rdLevel = getRdLevel(state);
    const activeSegments = getActiveSegments(state);
    const ownedMachines = new Set(getOwnedMachineTypes(state));
    const upgrades = new Set(getFactoryUpgrades(state));
    const materialTier = getMaterialQualityTier(state);

    // Collect all relevant machines for active segments
    const relevantMachines = new Set<string>();
    for (const segment of activeSegments) {
      const profile = SEGMENT_MACHINERY[segment];
      if (profile) {
        for (const m of [...profile.required, ...profile.recommended, ...profile.optional]) {
          relevantMachines.add(m);
        }
      }
    }

    // All possible machine types
    const allMachines = Object.keys(MACHINE_RD_REQUIREMENTS);

    return allMachines.map((machineType) => {
      // Already owned
      if (ownedMachines.has(machineType)) {
        return { machineType, availability: "owned" as const };
      }

      // Not relevant to current segments
      if (!relevantMachines.has(machineType) && activeSegments.length > 0) {
        return { machineType, availability: "not_relevant" as const, reason: "Not needed for your segments" };
      }

      // Check R&D requirements
      const requiredRdLevel = MACHINE_RD_REQUIREMENTS[machineType as MachineType] ?? 0;
      if (rdLevel < requiredRdLevel) {
        return {
          machineType,
          availability: "locked_rd" as const,
          reason: `Requires R&D Level ${requiredRdLevel} (you have ${rdLevel})`,
        };
      }

      // Check extra prerequisites
      const extra = (MACHINE_EXTRA_PREREQS as any)[machineType];
      if (extra) {
        if (extra.requiredUpgrade && !upgrades.has(extra.requiredUpgrade)) {
          return {
            machineType,
            availability: "locked_upgrade" as const,
            reason: `Requires ${extra.requiredUpgrade} upgrade`,
          };
        }
        if (extra.materialTierMin && materialTier < extra.materialTierMin) {
          return {
            machineType,
            availability: "locked_material" as const,
            reason: `Requires material tier ${extra.materialTierMin} (you have ${materialTier})`,
          };
        }
      }

      return { machineType, availability: "available" as const };
    });
  }, [state]);
}
