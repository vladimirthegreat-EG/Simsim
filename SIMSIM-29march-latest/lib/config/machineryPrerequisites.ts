import type { MachineType } from "@/engine/machinery/types";
import type { Segment } from "@/engine/types";

export interface SegmentMachineryProfile {
  segment: Segment;
  required: MachineType[];
  recommended: MachineType[];
  optional: MachineType[];
  totalRequiredCost: number;
  totalRecommendedCost: number;
}

export const SEGMENT_MACHINERY: Record<Segment, SegmentMachineryProfile> = {
  Budget: {
    segment: "Budget",
    required: ["assembly_line", "injection_molder", "packaging_system"],
    recommended: ["conveyor_system"],
    optional: ["forklift_fleet"],
    totalRequiredCost: 14_500_000,
    totalRecommendedCost: 17_500_000,
  },
  General: {
    segment: "General",
    required: ["assembly_line", "pcb_assembler", "packaging_system"],
    recommended: ["welding_station", "quality_scanner"],
    optional: ["conveyor_system"],
    totalRequiredCost: 17_500_000,
    totalRecommendedCost: 27_500_000,
  },
  Enthusiast: {
    segment: "Enthusiast",
    required: ["assembly_line", "cnc_machine", "pcb_assembler", "laser_cutter", "quality_scanner", "packaging_system"],
    recommended: ["testing_rig", "paint_booth"],
    optional: ["robotic_arm"],
    totalRequiredCost: 37_500_000,
    totalRecommendedCost: 44_500_000,
  },
  Professional: {
    segment: "Professional",
    required: ["assembly_line", "cnc_machine", "pcb_assembler", "laser_cutter", "clean_room_unit", "quality_scanner", "testing_rig", "packaging_system"],
    recommended: ["robotic_arm", "3d_printer"],
    optional: [],
    totalRequiredCost: 56_500_000,
    totalRecommendedCost: 70_500_000,
  },
  "Active Lifestyle": {
    segment: "Active Lifestyle",
    required: ["assembly_line", "pcb_assembler", "welding_station", "testing_rig", "packaging_system"],
    recommended: ["quality_scanner", "paint_booth"],
    optional: ["injection_molder"],
    totalRequiredCost: 25_500_000,
    totalRecommendedCost: 34_500_000,
  },
};

/** R&D level required to purchase each machine */
export const MACHINE_RD_REQUIREMENTS: Record<MachineType, number> = {
  // Tier 0 - No prerequisites (R&D Level 0)
  assembly_line: 0,
  injection_molder: 0,
  conveyor_system: 0,
  packaging_system: 0,
  forklift_fleet: 0,
  welding_station: 0,
  // Tier 1 - R&D Level 1 (Process Optimization)
  pcb_assembler: 1,
  quality_scanner: 1,
  cnc_machine: 1,
  paint_booth: 1,
  testing_rig: 1,
  "3d_printer": 1,
  // Tier 2 - R&D Level 2 (Advanced Manufacturing)
  laser_cutter: 2,
  robotic_arm: 2,
  // Tier 3 - R&D Level 3 (Industry 4.0)
  clean_room_unit: 3,
};

/** Additional prerequisites beyond R&D level */
export const MACHINE_EXTRA_PREREQS: Partial<
  Record<
    MachineType,
    {
      factoryUpgrade?: string;
      materialTierMin?: number;
    }
  >
> = {
  clean_room_unit: {
    factoryUpgrade: "cleanRoom",
    materialTierMin: 5,
  },
};
