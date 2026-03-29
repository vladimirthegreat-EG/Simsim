/**
 * Phone archetype definitions for the Business Simulation Engine
 *
 * Instead of "pick a segment + quality slider," players build specific phone types.
 * Each archetype requires certain technologies and emphasizes certain feature families.
 * 25 archetypes spanning all segments, from starter phones to endgame flagships.
 */

import type { Segment } from "./factory";
import type { TechFamily } from "../modules/RDExpansions";

// ============================================
// PHONE ARCHETYPE
// ============================================

export interface PhoneArchetype {
  id: string;
  name: string;
  description: string;
  primarySegment: Segment;
  secondarySegments: Segment[];
  /** Tech IDs required (AND logic - all must be unlocked) */
  requiredTech: string[];
  /** OR groups - need at least one complete group (optional) */
  requiredTechOr?: string[][];
  /** Multipliers on base tech scores per family (1.0 = normal) */
  featureEmphasis: Partial<Record<TechFamily, number>>;
  /** Base development cost ($) */
  baseCost: number;
  /** Rounds to develop */
  developmentRounds: number;
  /** Base quality floor for this archetype */
  baseQuality: number;
  /** Suggested retail price range */
  suggestedPriceRange: { min: number; max: number };
  /** Which tier of tech is needed (for UI grouping) */
  tier: 0 | 1 | 2 | 3 | 4 | 5;
}

// ============================================
// STARTER ARCHETYPES (No tech required - Round 1)
// ============================================

const STARTER_ARCHETYPES: PhoneArchetype[] = [
  {
    id: "basic_phone",
    name: "Basic Phone",
    description: "Reliable, affordable, long battery life. The people's phone.",
    primarySegment: "Budget",
    secondarySegments: ["General"],
    requiredTech: [],
    featureEmphasis: { battery: 1.3, durability: 1.2 },
    baseCost: 5_000_000,
    developmentRounds: 1,
    baseQuality: 45,
    suggestedPriceRange: { min: 100, max: 200 },
    tier: 0,
  },
  {
    id: "standard_phone",
    name: "Standard Phone",
    description: "Well-rounded phone for the mass market. Does everything okay.",
    primarySegment: "General",
    secondarySegments: ["Budget"],
    requiredTech: [],
    featureEmphasis: {},
    baseCost: 10_000_000,
    developmentRounds: 1,
    baseQuality: 50,
    suggestedPriceRange: { min: 250, max: 450 },
    tier: 0,
  },
  {
    id: "entry_smartphone",
    name: "Entry Smartphone",
    description: "Affordable smart features with a decent screen and camera.",
    primarySegment: "General",
    secondarySegments: ["Budget"],
    requiredTech: [],
    featureEmphasis: { display: 1.1, camera: 1.1 },
    baseCost: 12_000_000,
    developmentRounds: 2,
    baseQuality: 55,
    suggestedPriceRange: { min: 300, max: 500 },
    tier: 0,
  },
];

// ============================================
// TIER 1 ARCHETYPES (Require 1 Tier-1 tech)
// ============================================

const TIER1_ARCHETYPES: PhoneArchetype[] = [
  {
    id: "long_life_phone",
    name: "Long-Life Phone",
    description: "Exceptional battery life for users who hate charging.",
    primarySegment: "Budget",
    secondarySegments: ["General", "Active Lifestyle"],
    requiredTech: ["bat_1a"],
    featureEmphasis: { battery: 1.8 },
    baseCost: 6_000_000,
    developmentRounds: 1,
    baseQuality: 50,
    suggestedPriceRange: { min: 120, max: 250 },
    tier: 1,
  },
  {
    id: "snapshot_phone",
    name: "Snapshot Phone",
    description: "Budget-friendly phone with a surprisingly good camera.",
    primarySegment: "General",
    secondarySegments: ["Enthusiast"],
    requiredTech: ["cam_1a"],
    featureEmphasis: { camera: 1.5 },
    baseCost: 13_000_000,
    developmentRounds: 2,
    baseQuality: 55,
    suggestedPriceRange: { min: 300, max: 500 },
    tier: 1,
  },
  {
    id: "smart_companion",
    name: "Smart Companion",
    description: "AI-powered assistant that learns your habits.",
    primarySegment: "General",
    secondarySegments: ["Professional"],
    requiredTech: ["ai_1a"],
    featureEmphasis: { ai: 1.5 },
    baseCost: 14_000_000,
    developmentRounds: 2,
    baseQuality: 58,
    suggestedPriceRange: { min: 350, max: 550 },
    tier: 1,
  },
  {
    id: "outdoor_basic",
    name: "Outdoor Basic",
    description: "Tough phone for active users. Drop-proof and splash-resistant.",
    primarySegment: "Active Lifestyle",
    secondarySegments: ["Budget"],
    requiredTech: ["dur_1a"],
    featureEmphasis: { durability: 1.6, battery: 1.2 },
    baseCost: 10_000_000,
    developmentRounds: 1,
    baseQuality: 52,
    suggestedPriceRange: { min: 300, max: 500 },
    tier: 1,
  },
  {
    id: "cinema_screen",
    name: "Cinema Screen",
    description: "Gorgeous OLED display for media consumption.",
    primarySegment: "General",
    secondarySegments: ["Enthusiast"],
    requiredTech: ["dsp_1a"],
    featureEmphasis: { display: 1.5 },
    baseCost: 13_000_000,
    developmentRounds: 2,
    baseQuality: 55,
    suggestedPriceRange: { min: 300, max: 500 },
    tier: 1,
  },
  {
    id: "connected_phone",
    name: "Connected Phone",
    description: "Blazing-fast 5G for streaming and downloads.",
    primarySegment: "General",
    secondarySegments: ["Professional"],
    requiredTech: ["con_1a"],
    featureEmphasis: { connectivity: 1.5 },
    baseCost: 12_000_000,
    developmentRounds: 1,
    baseQuality: 54,
    suggestedPriceRange: { min: 300, max: 500 },
    tier: 1,
  },
];

// ============================================
// TIER 2 ARCHETYPES (Require Tier-2 techs)
// ============================================

const TIER2_ARCHETYPES: PhoneArchetype[] = [
  {
    id: "fast_charge_pro",
    name: "Fast Charge Pro",
    description: "Never wait for a charge. 15 minutes to full battery.",
    primarySegment: "General",
    secondarySegments: ["Budget"],
    requiredTech: ["bat_2a"],
    featureEmphasis: { battery: 1.6, display: 1.1 },
    baseCost: 15_000_000,
    developmentRounds: 2,
    baseQuality: 60,
    suggestedPriceRange: { min: 350, max: 550 },
    tier: 2,
  },
  {
    id: "camera_phone",
    name: "Camera Phone",
    description: "Photography powerhouse with computational imaging.",
    primarySegment: "Enthusiast",
    secondarySegments: ["General"],
    requiredTech: ["cam_2b"],
    featureEmphasis: { camera: 1.7, display: 1.2 },
    baseCost: 20_000_000,
    developmentRounds: 2,
    baseQuality: 68,
    suggestedPriceRange: { min: 500, max: 800 },
    tier: 2,
  },
  {
    id: "ai_assistant_phone",
    name: "AI Assistant Phone",
    description: "Your personal AI that manages your digital life.",
    primarySegment: "General",
    secondarySegments: ["Professional"],
    requiredTech: ["ai_2a"],
    featureEmphasis: { ai: 1.7 },
    baseCost: 18_000_000,
    developmentRounds: 2,
    baseQuality: 65,
    suggestedPriceRange: { min: 400, max: 650 },
    tier: 2,
  },
  {
    id: "rugged_phone",
    name: "Rugged Phone",
    description: "IP68 waterproof, drop-tested, built for adventure.",
    primarySegment: "Active Lifestyle",
    secondarySegments: ["Budget"],
    requiredTech: ["dur_2a"],
    featureEmphasis: { durability: 1.8, battery: 1.3 },
    baseCost: 15_000_000,
    developmentRounds: 2,
    baseQuality: 62,
    suggestedPriceRange: { min: 400, max: 650 },
    tier: 2,
  },
  {
    id: "gaming_phone",
    name: "Gaming Phone",
    description: "High refresh display, best-in-class performance for gamers.",
    primarySegment: "Enthusiast",
    secondarySegments: ["General"],
    requiredTech: ["dsp_2a", "bat_1a"],
    featureEmphasis: { display: 1.7, battery: 1.3 },
    baseCost: 22_000_000,
    developmentRounds: 3,
    baseQuality: 72,
    suggestedPriceRange: { min: 550, max: 850 },
    tier: 2,
  },
  {
    id: "business_phone",
    name: "Business Phone",
    description: "Secure, always-connected, AI-powered productivity.",
    primarySegment: "Professional",
    secondarySegments: ["General"],
    requiredTech: ["con_2a", "ai_1a"],
    featureEmphasis: { connectivity: 1.5, ai: 1.4 },
    baseCost: 25_000_000,
    developmentRounds: 3,
    baseQuality: 75,
    suggestedPriceRange: { min: 800, max: 1200 },
    tier: 2,
  },
];

// ============================================
// TIER 3 ARCHETYPES (Require Tier-3 techs)
// ============================================

const TIER3_ARCHETYPES: PhoneArchetype[] = [
  {
    id: "ultra_endurance",
    name: "Ultra Endurance",
    description: "Multi-day battery life with graphene tech. Budget-friendly powerhouse.",
    primarySegment: "Budget",
    secondarySegments: ["Active Lifestyle"],
    requiredTech: ["bat_3a"],
    featureEmphasis: { battery: 2.0 },
    baseCost: 12_000_000,
    developmentRounds: 2,
    baseQuality: 60,
    suggestedPriceRange: { min: 150, max: 300 },
    tier: 3,
  },
  {
    id: "photo_flagship",
    name: "Photo Flagship",
    description: "8K video, computational photography, studio-grade imaging.",
    primarySegment: "Enthusiast",
    secondarySegments: ["Professional"],
    requiredTech: ["cam_3a", "dsp_2a"],
    featureEmphasis: { camera: 1.8, display: 1.4 },
    baseCost: 30_000_000,
    developmentRounds: 3,
    baseQuality: 82,
    suggestedPriceRange: { min: 700, max: 1100 },
    tier: 3,
  },
  {
    id: "ai_powerhouse",
    name: "AI Powerhouse",
    description: "Autonomous AI agent that handles tasks proactively.",
    primarySegment: "Professional",
    secondarySegments: ["Enthusiast"],
    requiredTech: ["ai_3a", "con_2a"],
    featureEmphasis: { ai: 1.8, connectivity: 1.3 },
    baseCost: 35_000_000,
    developmentRounds: 3,
    baseQuality: 85,
    suggestedPriceRange: { min: 900, max: 1400 },
    tier: 3,
  },
  {
    id: "adventure_phone",
    name: "Adventure Phone",
    description: "MIL-SPEC durability with satellite connectivity. Built for anywhere.",
    primarySegment: "Active Lifestyle",
    secondarySegments: ["Professional"],
    requiredTech: ["dur_3a", "con_3a"],
    featureEmphasis: { durability: 1.8, connectivity: 1.5 },
    baseCost: 25_000_000,
    developmentRounds: 3,
    baseQuality: 78,
    suggestedPriceRange: { min: 600, max: 900 },
    tier: 3,
  },
  {
    id: "foldable_phone",
    name: "Foldable Phone",
    description: "Cutting-edge foldable display. Tablet when open, phone when closed.",
    primarySegment: "Enthusiast",
    secondarySegments: ["Professional"],
    requiredTech: ["dsp_4b"],
    featureEmphasis: { display: 2.0, durability: 0.8 },
    baseCost: 40_000_000,
    developmentRounds: 4,
    baseQuality: 80,
    suggestedPriceRange: { min: 900, max: 1500 },
    tier: 4, // Actually Tier 4 tech required
  },
];

// ============================================
// TIER 4-5 ARCHETYPES (Require advanced tech)
// ============================================

const TIER45_ARCHETYPES: PhoneArchetype[] = [
  {
    id: "creator_phone",
    name: "Creator Phone",
    description: "Pro cinema camera, AI editing, satellite upload. For content creators.",
    primarySegment: "Professional",
    secondarySegments: ["Enthusiast"],
    requiredTech: ["cam_4a", "ai_3a"],
    featureEmphasis: { camera: 1.8, ai: 1.5 },
    baseCost: 40_000_000,
    developmentRounds: 4,
    baseQuality: 88,
    suggestedPriceRange: { min: 1100, max: 1600 },
    tier: 4,
  },
  {
    id: "explorer_phone",
    name: "Explorer Phone",
    description: "LEO satellite + extreme durability. For expeditions and remote work.",
    primarySegment: "Active Lifestyle",
    secondarySegments: ["Professional"],
    requiredTech: ["dur_4a", "con_4a"],
    featureEmphasis: { durability: 1.8, connectivity: 1.8 },
    baseCost: 35_000_000,
    developmentRounds: 4,
    baseQuality: 85,
    suggestedPriceRange: { min: 800, max: 1200 },
    tier: 4,
  },
  {
    id: "ultimate_flagship",
    name: "Ultimate Flagship",
    description: "The best of everything. Requires mastery across multiple tech families.",
    primarySegment: "Enthusiast",
    secondarySegments: ["Professional"],
    requiredTech: [],
    requiredTechOr: [
      // Need any 3 Tier-4 techs (from any families)
      // This is validated specially in the engine - requiredTechOr means
      // the player needs to have unlocked at least 3 nodes at tier 4+
    ],
    featureEmphasis: {
      battery: 1.3,
      camera: 1.3,
      ai: 1.3,
      durability: 1.3,
      display: 1.3,
      connectivity: 1.3,
    },
    baseCost: 50_000_000,
    developmentRounds: 4,
    baseQuality: 90,
    suggestedPriceRange: { min: 1200, max: 1800 },
    tier: 4,
  },
  {
    id: "quantum_phone",
    name: "Quantum Phone",
    description: "Next-generation technology. Requires any Tier 5 breakthrough.",
    primarySegment: "Professional",
    secondarySegments: ["Enthusiast"],
    requiredTech: [],
    requiredTechOr: [
      // Need any 1 Tier-5 tech - validated specially in the engine
    ],
    featureEmphasis: {
      battery: 1.5,
      camera: 1.5,
      ai: 1.5,
      durability: 1.5,
      display: 1.5,
      connectivity: 1.5,
    },
    baseCost: 60_000_000,
    developmentRounds: 5,
    baseQuality: 95,
    suggestedPriceRange: { min: 1500, max: 2500 },
    tier: 5,
  },
  {
    id: "peoples_phone",
    name: "People's Phone",
    description: "Advanced tech at a budget price. Battery + connectivity for the masses.",
    primarySegment: "Budget",
    secondarySegments: ["General"],
    requiredTech: ["bat_4b", "con_4b"],
    featureEmphasis: { battery: 1.5, connectivity: 1.3 },
    baseCost: 8_000_000,
    developmentRounds: 2,
    baseQuality: 65,
    suggestedPriceRange: { min: 100, max: 250 },
    tier: 4,
  },
];

// ============================================
// ALL ARCHETYPES
// ============================================

export const ALL_ARCHETYPES: PhoneArchetype[] = [
  ...STARTER_ARCHETYPES,
  ...TIER1_ARCHETYPES,
  ...TIER2_ARCHETYPES,
  ...TIER3_ARCHETYPES,
  ...TIER45_ARCHETYPES,
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/** Get archetype by ID. */
export function getArchetype(id: string): PhoneArchetype | undefined {
  return ALL_ARCHETYPES.find((a) => a.id === id);
}

/** Get all archetypes available given unlocked techs. */
export function getAvailableArchetypes(
  unlockedTechs: string[],
  allTechNodes?: { id: string; tier: number }[]
): PhoneArchetype[] {
  return ALL_ARCHETYPES.filter((archetype) => {
    // Check AND requirements
    if (!archetype.requiredTech.every((t) => unlockedTechs.includes(t))) {
      return false;
    }

    // Special validation for Ultimate Flagship: need 3+ Tier 4+ techs
    if (archetype.id === "ultimate_flagship" && allTechNodes) {
      const tier4PlusUnlocked = allTechNodes.filter(
        (n) => n.tier >= 4 && unlockedTechs.includes(n.id)
      );
      if (tier4PlusUnlocked.length < 3) return false;
    }

    // Special validation for Quantum Phone: need any Tier 5 tech
    if (archetype.id === "quantum_phone" && allTechNodes) {
      const tier5Unlocked = allTechNodes.filter(
        (n) => n.tier >= 5 && unlockedTechs.includes(n.id)
      );
      if (tier5Unlocked.length < 1) return false;
    }

    return true;
  });
}

/** Get archetypes for a specific segment (primary or secondary). */
export function getArchetypesForSegment(segment: Segment): PhoneArchetype[] {
  return ALL_ARCHETYPES.filter(
    (a) => a.primarySegment === segment || a.secondarySegments.includes(segment)
  );
}
