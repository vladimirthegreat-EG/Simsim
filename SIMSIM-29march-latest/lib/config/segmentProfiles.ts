import { CONSTANTS, type Segment } from "@/engine/types";

export interface SegmentProfile {
  id: Segment;
  label: string;
  icon: string;
  demandUnits: number;
  demandGrowthRate: number;
  priceRange: { min: number; max: number };
  qualityExpectation: number;
  materialQualityTier: 1 | 2 | 3 | 4 | 5;
  scoringWeights: { price: number; quality: number; brand: number; esg: number; features: number };
  relatedAchievements: string[];
}

export const SEGMENT_PROFILES: Record<Segment, SegmentProfile> = {
  Budget: {
    id: "Budget",
    label: "Budget",
    icon: "DollarSign",
    demandUnits: 500_000,
    demandGrowthRate: 0.02,
    priceRange: { min: 100, max: 300 },
    qualityExpectation: 50,
    materialQualityTier: 1,
    scoringWeights: CONSTANTS.SEGMENT_WEIGHTS["Budget"],
    relatedAchievements: ["arch_peoples_champ", "price_undercut"],
  },
  General: {
    id: "General",
    label: "General",
    icon: "Smartphone",
    demandUnits: 400_000,
    demandGrowthRate: 0.03,
    priceRange: { min: 300, max: 600 },
    qualityExpectation: 65,
    materialQualityTier: 2,
    scoringWeights: CONSTANTS.SEGMENT_WEIGHTS["General"],
    relatedAchievements: ["feat_perfect_match", "pvp_steal_share"],
  },
  Enthusiast: {
    id: "Enthusiast",
    label: "Enthusiast",
    icon: "Gamepad2",
    demandUnits: 200_000,
    demandGrowthRate: 0.04,
    priceRange: { min: 600, max: 1000 },
    qualityExpectation: 80,
    materialQualityTier: 4,
    scoringWeights: CONSTANTS.SEGMENT_WEIGHTS["Enthusiast"],
    relatedAchievements: ["feat_dominate_family", "arch_flagship"],
  },
  Professional: {
    id: "Professional",
    label: "Professional",
    icon: "Briefcase",
    demandUnits: 100_000,
    demandGrowthRate: 0.02,
    priceRange: { min: 1000, max: 1500 },
    qualityExpectation: 90,
    materialQualityTier: 5,
    scoringWeights: CONSTANTS.SEGMENT_WEIGHTS["Professional"],
    relatedAchievements: ["arch_quantum", "price_premium", "pvp_monopoly"],
  },
  "Active Lifestyle": {
    id: "Active Lifestyle",
    label: "Active Lifestyle",
    icon: "Activity",
    demandUnits: 150_000,
    demandGrowthRate: 0.05,
    priceRange: { min: 400, max: 800 },
    qualityExpectation: 70,
    materialQualityTier: 3,
    scoringWeights: CONSTANTS.SEGMENT_WEIGHTS["Active Lifestyle"],
    relatedAchievements: ["price_opportunist", "feat_perfect_match"],
  },
};

/** Get the top scoring factor for a segment */
export function getTopScoringFactor(segment: Segment): string {
  const w = SEGMENT_PROFILES[segment].scoringWeights;
  const entries = Object.entries(w) as [string, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}
