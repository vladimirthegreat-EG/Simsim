import type { Segment } from "@/engine/types";

interface PathwayPhase {
  name: string;
  rounds: string;
  archetypeId: string | null;
  archetypeName: string | null;
  rdTarget: string;
  machineryToAdd: string[];
  achievementTargets: string[];
  note?: string;
}

export interface SegmentPathway {
  segment: Segment;
  phases: PathwayPhase[];
}

export const SEGMENT_PATHWAYS: Record<Segment, SegmentPathway> = {
  Budget: {
    segment: "Budget",
    phases: [
      {
        name: "Foundation",
        rounds: "1-3",
        archetypeId: "basic_phone",
        archetypeName: "Basic Phone",
        rdTarget: "None needed (Tier 0)",
        machineryToAdd: ["assembly_line", "injection_molder", "packaging_system"],
        achievementTargets: ["arch_first_phone"],
      },
      {
        name: "Battery Advantage",
        rounds: "3-5",
        archetypeId: "long_life_phone",
        archetypeName: "Long-Life Phone",
        rdTarget: "bat_1 (battery Tier 1)",
        machineryToAdd: ["pcb_assembler", "conveyor_system"],
        achievementTargets: ["tech_first_t1"],
      },
      {
        name: "People's Champion",
        rounds: "7-10",
        archetypeId: "peoples_phone",
        archetypeName: "People's Phone",
        rdTarget: "bat_4 + con_4 (Tier 4 — requires massive R&D)",
        machineryToAdd: ["clean_room_unit", "robotic_arm", "quality_scanner", "testing_rig"],
        achievementTargets: ["arch_peoples_champ"],
        note: "Tier 4 needs 1000 R&D pts. At $15M/round budget (~150 pts/round) that's ~7 rounds. Fund via General segment profits. May not fully unlock in 10 rounds.",
      },
    ],
  },
  General: {
    segment: "General",
    phases: [
      {
        name: "Mass Market Entry",
        rounds: "1-2",
        archetypeId: "standard_phone",
        archetypeName: "Standard Phone",
        rdTarget: "None (Tier 0)",
        machineryToAdd: ["assembly_line", "pcb_assembler", "packaging_system"],
        achievementTargets: ["arch_first_phone"],
      },
      {
        name: "Differentiation",
        rounds: "3-5",
        archetypeId: "snapshot_phone",
        archetypeName: "Snapshot Phone (or Smart Companion / Cinema Screen)",
        rdTarget: "Any Tier 1: cam_1, ai_1, or dsp_1",
        machineryToAdd: ["welding_station", "quality_scanner"],
        achievementTargets: ["tech_first_t1", "feat_perfect_match"],
      },
      {
        name: "Feature Leadership",
        rounds: "5-8",
        archetypeId: "ai_assistant_phone",
        archetypeName: "AI Assistant Phone",
        rdTarget: "ai_2 (Tier 2)",
        machineryToAdd: ["cnc_machine"],
        achievementTargets: ["arch_5_types"],
      },
    ],
  },
  Enthusiast: {
    segment: "Enthusiast",
    phases: [
      {
        name: "R&D Investment Phase",
        rounds: "1-4",
        archetypeId: null,
        archetypeName: null,
        rdTarget: "Rush to Tier 2: 300 pts + cam_2 or dsp_2",
        machineryToAdd: [],
        achievementTargets: ["tech_first_t1"],
        note: "You WILL NOT compete in Enthusiast rounds 1-3. Build Budget/General first to fund R&D.",
      },
      {
        name: "Breakout",
        rounds: "4-6",
        archetypeId: "camera_phone",
        archetypeName: "Camera Phone",
        rdTarget: "cam_2",
        machineryToAdd: ["cnc_machine", "laser_cutter", "quality_scanner", "paint_booth"],
        achievementTargets: ["arch_flagship", "feat_dominate_family"],
      },
      {
        name: "Dominance",
        rounds: "7-10",
        archetypeId: "photo_flagship",
        archetypeName: "Photo Flagship (or Ultimate Flagship)",
        rdTarget: "cam_3 + dsp_2 (Tier 3)",
        machineryToAdd: ["testing_rig", "robotic_arm"],
        achievementTargets: ["pvp_monopoly", "tech_full_family"],
      },
    ],
  },
  Professional: {
    segment: "Professional",
    phases: [
      {
        name: "Long Build — Fund from Other Segments",
        rounds: "1-5",
        archetypeId: null,
        archetypeName: null,
        rdTarget: "Rush Tier 1->2->3: need con_2 + ai_1 minimum for Business Phone",
        machineryToAdd: [],
        achievementTargets: ["tech_first_t1", "tech_speed_t3"],
        note: "Professional is the long game. Quality < 90 is severely penalized via soft curve. Do NOT enter before Tier 3 machinery.",
      },
      {
        name: "Market Entry",
        rounds: "5-7",
        archetypeId: "business_phone",
        archetypeName: "Business Phone",
        rdTarget: "con_2 + ai_1 (Tier 2)",
        machineryToAdd: ["cnc_machine", "pcb_assembler", "laser_cutter", "quality_scanner", "testing_rig"],
        achievementTargets: ["price_premium"],
        note: "Quality 75 vs expectation 90 = soft penalty (~69% quality score). First-mover bonus may compensate.",
      },
      {
        name: "Flagship",
        rounds: "7-10",
        archetypeId: "ai_powerhouse",
        archetypeName: "AI Powerhouse",
        rdTarget: "ai_3 + con_2 (Tier 3)",
        machineryToAdd: ["clean_room_unit", "robotic_arm", "3d_printer"],
        achievementTargets: ["arch_quantum", "pvp_monopoly"],
        note: "Quantum Phone (Tier 5) likely unreachable in 10 rounds. AI Powerhouse at quality 85 is the realistic ceiling.",
      },
    ],
  },
  "Active Lifestyle": {
    segment: "Active Lifestyle",
    phases: [
      {
        name: "Fast Entry",
        rounds: "1-3",
        archetypeId: "outdoor_basic",
        archetypeName: "Outdoor Basic",
        rdTarget: "dur_1 (durability Tier 1)",
        machineryToAdd: ["assembly_line", "pcb_assembler", "welding_station", "testing_rig", "packaging_system"],
        achievementTargets: ["arch_first_phone", "price_opportunist"],
        note: "Active has LOWEST barriers and HIGHEST growth (5%/yr). Enter early for first-mover bonus.",
      },
      {
        name: "Feature Leadership",
        rounds: "3-6",
        archetypeId: "action_camera_phone",
        archetypeName: "Action Camera Phone",
        rdTarget: "dur_2 (Tier 2)",
        machineryToAdd: ["quality_scanner", "paint_booth"],
        achievementTargets: ["feat_perfect_match"],
      },
      {
        name: "Demand Capture",
        rounds: "6-10",
        archetypeId: "adventure_phone",
        archetypeName: "Adventure Phone",
        rdTarget: "dur_3 + con_3 (Tier 3)",
        machineryToAdd: ["laser_cutter", "robotic_arm"],
        achievementTargets: ["pvp_diversified", "feat_multi_match"],
        note: "5% growth compounds: 150K -> ~195K units by round 10. Patience rewarded.",
      },
    ],
  },
};
