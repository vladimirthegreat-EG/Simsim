/**
 * R&D Module Expansions
 *
 * Additional R&D systems for tech trees, platform strategy,
 * risk mechanics, and research spillover.
 *
 * Phase 8: R&D Module Expansions
 */

import type { Segment } from "../types/factory";
import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export type TechFamily = "battery" | "camera" | "ai" | "durability" | "display" | "connectivity";
export type TechTier = 1 | 2 | 3 | 4 | 5;
export type RiskLevel = "conservative" | "moderate" | "aggressive";

export type TechEffectType =
  | "quality_bonus"
  | "feature_unlock"
  | "cost_reduction"
  | "dev_speed"
  | "segment_bonus"
  | "family_bonus"; // Cross-family: grants points in another tech family

export interface TechNode {
  id: string;
  name: string;
  family: TechFamily;
  tier: TechTier;
  /** AND prerequisites - all must be met */
  prerequisites: string[];
  /** OR prerequisite groups - any ONE group must be fully met (optional) */
  prerequisitesOr?: string[][];
  researchCost: number;
  researchRounds: number;
  effects: TechEffect[];
  description: string;
  /** Phone archetypes this node helps unlock */
  unlocksArchetypes?: string[];
  /** Segments that benefit most from this tech */
  bestSegments?: Segment[];
}

export interface TechEffect {
  type: TechEffectType;
  segment?: Segment;
  /** For family_bonus: which family receives the bonus */
  targetFamily?: TechFamily;
  value: number;
}

export interface TechTreeState {
  unlockedTechs: string[];
  activeResearch: ActiveResearch[];
  completedResearch: CompletedResearch[];
  researchPoints: number;
  techLevel: number; // Overall tech level 1-10
}

export interface ActiveResearch {
  techId: string;
  roundsRemaining: number;
  investmentSoFar: number;
  riskLevel: RiskLevel;
  delayedRounds: number;
  costOverrun: number;
}

export interface CompletedResearch {
  techId: string;
  roundCompleted: number;
  totalCost: number;
  hadDelay: boolean;
  hadOverrun: boolean;
}

export interface Platform {
  id: string;
  name: string;
  investmentCost: number;
  developedSegments: Segment[];
  costReduction: number;
  devSpeedBonus: number;
  qualityFloor: number;
  roundCreated: number;
}

export interface PlatformState {
  platforms: Platform[];
  activePlatformId: string | null;
  platformInvestment: number;
}

export interface RDRiskEvent {
  type: "delay" | "cost_overrun" | "breakthrough" | "failure";
  projectId: string;
  magnitude: number;
  message: string;
}

export interface ResearchSpillover {
  sourceProjectId: string;
  targetSegments: Segment[];
  qualityBonus: number;
  featureBonus: number;
}

export interface RDExpansionResult {
  techTree: TechTreeState;
  platforms: PlatformState;
  newTechsUnlocked: TechNode[];
  riskEvents: RDRiskEvent[];
  spillovers: ResearchSpillover[];
  totalRDBonus: number;
  qualityBonusBySegment: Record<Segment, number>;
  messages: string[];
  warnings: string[];
}

export interface RDExpansionDecisions {
  newResearchProjects: { techId: string; riskLevel: RiskLevel }[];
  platformInvestment: number;
  newPlatformSegments: Segment[];
  riskTolerance: RiskLevel;
}

// ============================================
// TECH TREE DEFINITIONS - 54 nodes (9 per family × 6 families, 5 tiers)
// Source: Simsim_Complete_Design_Document.docx Section 2.3
// ============================================

const TECH_TREE: TechNode[] = [
  // =============== BATTERY FAMILY ===============
  { id: "bat_1a", name: "Extended Battery", family: "battery", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Improved battery life technology", unlocksArchetypes: ["long_life_phone", "gaming_phone"], bestSegments: ["Budget", "Active Lifestyle"] },
  { id: "bat_1b", name: "Power Management", family: "battery", tier: 1, prerequisites: [], researchCost: 4_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.03 }], description: "Efficient power management chipset", bestSegments: ["Budget"] },
  { id: "bat_2a", name: "Fast Charging", family: "battery", tier: 2, prerequisites: ["bat_1a"], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "feature_unlock", value: 1 }], description: "Rapid charging capability", unlocksArchetypes: ["fast_charge_pro"], bestSegments: ["General"] },
  { id: "bat_2b", name: "Wireless Charging", family: "battery", tier: 2, prerequisites: ["bat_1b"], researchCost: 7_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 10 }], description: "Qi wireless charging support", bestSegments: ["General"] },
  { id: "bat_3a", name: "Graphene Battery", family: "battery", tier: 3, prerequisites: ["bat_2a"], researchCost: 15_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 20 }, { type: "cost_reduction", value: 0.05 }], description: "Graphene-based battery cells", unlocksArchetypes: ["ultra_endurance"], bestSegments: ["Budget", "Active Lifestyle"] },
  { id: "bat_3b", name: "Solar Charging", family: "battery", tier: 3, prerequisites: ["bat_2b"], researchCost: 12_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.08 }], description: "Integrated solar charging panel", bestSegments: ["Active Lifestyle"] },
  { id: "bat_4a", name: "Solid State Battery", family: "battery", tier: 4, prerequisites: ["bat_3a"], researchCost: 25_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }], description: "Revolutionary solid-state battery", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },
  { id: "bat_4b", name: "Energy Harvesting", family: "battery", tier: 4, prerequisites: ["bat_3b"], researchCost: 20_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "segment_bonus", segment: "Budget", value: 0.10 }], description: "Ambient energy harvesting", unlocksArchetypes: ["peoples_phone"], bestSegments: ["Budget"] },
  { id: "bat_5", name: "Perpetual Power", family: "battery", tier: 5, prerequisites: [], prerequisitesOr: [["bat_4a"], ["bat_4b"]], researchCost: 40_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.08 }, { type: "dev_speed", value: 0.10 }], description: "Near-infinite battery technology", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },

  // =============== CAMERA FAMILY ===============
  { id: "cam_1a", name: "Enhanced Optics", family: "camera", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Improved camera optics and sensor", unlocksArchetypes: ["snapshot_phone", "camera_phone"], bestSegments: ["General", "Enthusiast"] },
  { id: "cam_1b", name: "Wide Angle Lens", family: "camera", tier: 1, prerequisites: [], researchCost: 4_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "General", value: 0.05 }], description: "Ultra-wide angle lens system", bestSegments: ["General"] },
  { id: "cam_2a", name: "Night Vision", family: "camera", tier: 2, prerequisites: ["cam_1a"], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }], description: "Low-light photography enhancement", bestSegments: ["Enthusiast"] },
  { id: "cam_2b", name: "Computational Photography", family: "camera", tier: 2, prerequisites: [], prerequisitesOr: [["cam_1a"], ["cam_1b"]], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "feature_unlock", value: 1 }], description: "AI-powered image processing", unlocksArchetypes: ["camera_phone"], bestSegments: ["Enthusiast"] },
  { id: "cam_3a", name: "8K Video", family: "camera", tier: 3, prerequisites: [], prerequisitesOr: [["cam_2a"], ["cam_2b"]], researchCost: 15_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Enthusiast", value: 0.10 }], description: "8K video recording capability", unlocksArchetypes: ["photo_flagship"], bestSegments: ["Enthusiast"] },
  { id: "cam_3b", name: "3D Depth Sensing", family: "camera", tier: 3, prerequisites: ["cam_2b"], researchCost: 12_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "ai", value: 10 }], description: "3D depth mapping for AR and photography", bestSegments: ["Professional"] },
  { id: "cam_4a", name: "Pro Cinema Suite", family: "camera", tier: 4, prerequisites: ["cam_3a"], researchCost: 25_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Professional", value: 0.12 }], description: "Professional-grade cinema recording", unlocksArchetypes: ["creator_phone"], bestSegments: ["Professional"] },
  { id: "cam_4b", name: "Holographic Capture", family: "camera", tier: 4, prerequisites: ["cam_3b"], researchCost: 22_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "display", value: 10 }], description: "Holographic video capture", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Enthusiast", "Professional"] },
  { id: "cam_5", name: "Quantum Imaging", family: "camera", tier: 5, prerequisites: [], prerequisitesOr: [["cam_4a"], ["cam_4b"]], researchCost: 40_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 15 }], description: "Quantum-enhanced imaging sensor", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },

  // =============== AI FAMILY ===============
  { id: "ai_1a", name: "Smart Assistant", family: "ai", tier: 1, prerequisites: [], researchCost: 5_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Basic AI assistant features", unlocksArchetypes: ["smart_companion", "business_phone"], bestSegments: ["General", "Professional"] },
  { id: "ai_1b", name: "Predictive Text", family: "ai", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }], description: "AI-powered text prediction", bestSegments: ["General"] },
  { id: "ai_2a", name: "On-Device ML", family: "ai", tier: 2, prerequisites: ["ai_1a"], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "dev_speed", value: 0.05 }], description: "On-device machine learning", unlocksArchetypes: ["ai_assistant_phone"], bestSegments: ["Professional"] },
  { id: "ai_2b", name: "Context Awareness", family: "ai", tier: 2, prerequisites: [], prerequisitesOr: [["ai_1a"], ["ai_1b"]], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Professional", value: 0.08 }], description: "Contextual user experience", bestSegments: ["Professional"] },
  { id: "ai_3a", name: "Autonomous Agent", family: "ai", tier: 3, prerequisites: ["ai_2a"], researchCost: 18_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "feature_unlock", value: 1 }], description: "AI agent that handles tasks proactively", unlocksArchetypes: ["ai_powerhouse", "creator_phone"], bestSegments: ["Professional"] },
  { id: "ai_3b", name: "Emotion Recognition", family: "ai", tier: 3, prerequisites: ["ai_2b"], researchCost: 14_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "segment_bonus", segment: "General", value: 0.08 }], description: "Emotional intelligence for UX", bestSegments: ["General"] },
  { id: "ai_4a", name: "Neural Processing Unit", family: "ai", tier: 4, prerequisites: ["ai_3a"], researchCost: 28_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.06 }, { type: "dev_speed", value: 0.08 }], description: "Dedicated neural processing hardware", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Professional"] },
  { id: "ai_4b", name: "Adaptive UX", family: "ai", tier: 4, prerequisites: [], prerequisitesOr: [["ai_3a"], ["ai_3b"]], researchCost: 22_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "battery", value: 5 }, { type: "family_bonus", targetFamily: "camera", value: 5 }, { type: "family_bonus", targetFamily: "durability", value: 5 }, { type: "family_bonus", targetFamily: "display", value: 5 }, { type: "family_bonus", targetFamily: "connectivity", value: 5 }], description: "Adaptive UX that boosts all systems", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },
  { id: "ai_5", name: "Sentient OS", family: "ai", tier: 5, prerequisites: [], prerequisitesOr: [["ai_4a"], ["ai_4b"]], researchCost: 45_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Professional", value: 0.15 }], description: "Fully sentient operating system", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Professional"] },

  // =============== DURABILITY FAMILY ===============
  { id: "dur_1a", name: "Gorilla Glass", family: "durability", tier: 1, prerequisites: [], researchCost: 2_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Enhanced screen durability", unlocksArchetypes: ["outdoor_basic", "rugged_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "dur_1b", name: "Rubber Armor", family: "durability", tier: 1, prerequisites: [], researchCost: 2_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.05 }], description: "Shock-absorbing rubber casing", bestSegments: ["Active Lifestyle"] },
  { id: "dur_2a", name: "IP68 Water Resist", family: "durability", tier: 2, prerequisites: [], prerequisitesOr: [["dur_1a"], ["dur_1b"]], researchCost: 6_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }], description: "IP68 water and dust resistance", unlocksArchetypes: ["rugged_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "dur_2b", name: "Shock Absorption", family: "durability", tier: 2, prerequisites: ["dur_1b"], researchCost: 5_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.03 }], description: "Advanced shock absorption system", bestSegments: ["Active Lifestyle", "Budget"] },
  { id: "dur_3a", name: "MIL-STD Certified", family: "durability", tier: 3, prerequisites: ["dur_2a"], researchCost: 12_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.12 }], description: "MIL-STD-810G certification", unlocksArchetypes: ["adventure_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "dur_3b", name: "Self-Healing Materials", family: "durability", tier: 3, prerequisites: [], prerequisitesOr: [["dur_2a"], ["dur_2b"]], researchCost: 14_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }], description: "Self-repairing polymer coating", bestSegments: ["Active Lifestyle"] },
  { id: "dur_4a", name: "Extreme Environment", family: "durability", tier: 4, prerequisites: ["dur_3a"], researchCost: 20_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.10 }, { type: "segment_bonus", segment: "Professional", value: 0.08 }], description: "Extreme temperature and pressure resistance", unlocksArchetypes: ["explorer_phone"], bestSegments: ["Active Lifestyle", "Professional"] },
  { id: "dur_4b", name: "Titanium Frame", family: "durability", tier: 4, prerequisites: ["dur_3b"], researchCost: 18_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }], description: "Aerospace-grade titanium chassis", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Professional"] },
  { id: "dur_5", name: "Indestructible", family: "durability", tier: 5, prerequisites: [], prerequisitesOr: [["dur_4a"], ["dur_4b"]], researchCost: 35_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.15 }], description: "Virtually indestructible construction", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Active Lifestyle"] },

  // =============== DISPLAY FAMILY ===============
  { id: "dsp_1a", name: "OLED Display", family: "display", tier: 1, prerequisites: [], researchCost: 4_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "Premium OLED display", unlocksArchetypes: ["cinema_screen", "gaming_phone"], bestSegments: ["General", "Enthusiast"] },
  { id: "dsp_1b", name: "High Brightness", family: "display", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }], description: "Sunlight-readable high brightness display", bestSegments: ["Active Lifestyle"] },
  { id: "dsp_2a", name: "120Hz Refresh", family: "display", tier: 2, prerequisites: ["dsp_1a"], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Enthusiast", value: 0.08 }], description: "120Hz+ display refresh rate", unlocksArchetypes: ["gaming_phone", "photo_flagship"], bestSegments: ["Enthusiast"] },
  { id: "dsp_2b", name: "Always-On Display", family: "display", tier: 2, prerequisites: [], prerequisitesOr: [["dsp_1a"], ["dsp_1b"]], researchCost: 6_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "battery", value: -5 }], description: "Always-on display (trades battery life)", bestSegments: ["General"] },
  { id: "dsp_3a", name: "Adaptive ProMotion", family: "display", tier: 3, prerequisites: ["dsp_2a"], researchCost: 14_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "family_bonus", targetFamily: "battery", value: 5 }, { type: "cost_reduction", value: 0.04 }], description: "Variable refresh rate display", bestSegments: ["Enthusiast"] },
  { id: "dsp_3b", name: "Under-Display Camera", family: "display", tier: 3, prerequisites: [], prerequisitesOr: [["dsp_2a"], ["dsp_2b"]], researchCost: 12_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 10 }, { type: "family_bonus", targetFamily: "camera", value: 5 }], description: "Camera hidden under the display", bestSegments: ["Enthusiast"] },
  { id: "dsp_4a", name: "Micro-LED", family: "display", tier: 4, prerequisites: ["dsp_3a"], researchCost: 22_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.06 }], description: "Next-generation micro-LED display", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Enthusiast", "Professional"] },
  { id: "dsp_4b", name: "Foldable Display", family: "display", tier: 4, prerequisites: [], prerequisitesOr: [["dsp_3a"], ["dsp_3b"]], researchCost: 28_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "feature_unlock", value: 1 }], description: "Foldable display technology", unlocksArchetypes: ["foldable_phone"], bestSegments: ["Enthusiast"] },
  { id: "dsp_5", name: "Holographic Display", family: "display", tier: 5, prerequisites: [], prerequisitesOr: [["dsp_4a"], ["dsp_4b"]], researchCost: 45_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }], description: "Holographic 3D display", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },

  // =============== CONNECTIVITY FAMILY ===============
  { id: "con_1a", name: "5G Modem", family: "connectivity", tier: 1, prerequisites: [], researchCost: 5_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "5G connectivity", unlocksArchetypes: ["connected_phone", "business_phone"], bestSegments: ["General", "Professional"] },
  { id: "con_1b", name: "WiFi 6", family: "connectivity", tier: 1, prerequisites: [], researchCost: 3_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }], description: "WiFi 6 support", bestSegments: ["General"] },
  { id: "con_2a", name: "mmWave 5G", family: "connectivity", tier: 2, prerequisites: ["con_1a"], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Professional", value: 0.08 }], description: "Millimeter wave 5G for ultra speeds", unlocksArchetypes: ["business_phone", "ai_powerhouse"], bestSegments: ["Professional"] },
  { id: "con_2b", name: "WiFi 6E", family: "connectivity", tier: 2, prerequisites: ["con_1b"], researchCost: 6_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 15 }, { type: "dev_speed", value: 0.03 }], description: "Next-gen WiFi 6E technology", bestSegments: ["General"] },
  { id: "con_3a", name: "Satellite SOS", family: "connectivity", tier: 3, prerequisites: ["con_2a"], researchCost: 18_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.10 }], description: "Emergency satellite connectivity", unlocksArchetypes: ["adventure_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "con_3b", name: "UWB Precision", family: "connectivity", tier: 3, prerequisites: [], prerequisitesOr: [["con_2a"], ["con_2b"]], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 10 }, { type: "feature_unlock", value: 1 }], description: "Ultra-wideband precision location", bestSegments: ["General"] },
  { id: "con_4a", name: "LEO Satellite", family: "connectivity", tier: 4, prerequisites: ["con_3a"], researchCost: 30_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Professional", value: 0.10 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.10 }], description: "Low-earth orbit satellite broadband", unlocksArchetypes: ["explorer_phone"], bestSegments: ["Professional", "Active Lifestyle"] },
  { id: "con_4b", name: "Mesh Networking", family: "connectivity", tier: 4, prerequisites: ["con_3b"], researchCost: 15_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Budget", value: 0.08 }], description: "Peer-to-peer mesh networking", unlocksArchetypes: ["peoples_phone"], bestSegments: ["Budget"] },
  { id: "con_5", name: "Quantum Communication", family: "connectivity", tier: 5, prerequisites: [], prerequisitesOr: [["con_4a"], ["con_4b"]], researchCost: 50_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Professional", value: 0.12 }], description: "Quantum-encrypted communication", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Professional"] },
];

// ============================================
// CONSTANTS
// ============================================

const RISK_DELAY_PROBABILITIES: Record<RiskLevel, number> = {
  conservative: 0.05,
  moderate: 0.15,
  aggressive: 0.30,
};

const RISK_OVERRUN_PROBABILITIES: Record<RiskLevel, number> = {
  conservative: 0.05,
  moderate: 0.20,
  aggressive: 0.40,
};

const PLATFORM_BASE_COST = 50_000_000;
const PLATFORM_COST_REDUCTION = 0.25; // 25% savings for products on platform
const PLATFORM_DEV_SPEED_BONUS = 0.2; // 20% faster development
const SPILLOVER_RATE = 0.2; // 20% of improvements transfer

// ============================================
// ENGINE
// ============================================

export class RDExpansions {
  /**
   * Process R&D expansions for a round
   */
  static processRDExpansions(
    state: TeamState,
    decisions: RDExpansionDecisions,
    previousTechTree: TechTreeState | null,
    previousPlatforms: PlatformState | null,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): RDExpansionResult {
    const messages: string[] = [];
    const warnings: string[] = [];

    // Check if tech trees are enabled
    if (!config.difficulty.complexity.techTrees) {
      return this.getDisabledResult();
    }

    // Process tech tree
    const { techTree, newTechs, riskEvents } = this.processTechTree(
      previousTechTree,
      decisions,
      round,
      config,
      ctx
    );

    // Process platforms
    const platforms = this.processPlatforms(
      previousPlatforms,
      decisions,
      round
    );

    // Calculate spillovers
    const spillovers = this.calculateSpillovers(newTechs, state);

    // Calculate bonuses
    const { totalRDBonus, qualityBonusBySegment } = this.calculateBonuses(
      techTree,
      platforms
    );

    // Generate messages
    for (const tech of newTechs) {
      messages.push(`Research completed: ${tech.name}`);
    }

    for (const event of riskEvents) {
      if (event.type === "delay") {
        warnings.push(event.message);
      } else if (event.type === "cost_overrun") {
        warnings.push(event.message);
      } else if (event.type === "breakthrough") {
        messages.push(event.message);
      }
    }

    if (techTree.activeResearch.length > 0) {
      const projectNames = techTree.activeResearch
        .map((r) => TECH_TREE.find((t) => t.id === r.techId)?.name)
        .filter(Boolean)
        .join(", ");
      messages.push(`Active research: ${projectNames}`);
    }

    return {
      techTree,
      platforms,
      newTechsUnlocked: newTechs,
      riskEvents,
      spillovers,
      totalRDBonus,
      qualityBonusBySegment,
      messages,
      warnings,
    };
  }

  /**
   * Get result when tech trees are disabled
   */
  private static getDisabledResult(): RDExpansionResult {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const qualityBonusBySegment: Record<Segment, number> = {} as Record<Segment, number>;
    for (const segment of segments) {
      qualityBonusBySegment[segment] = 0;
    }

    return {
      techTree: this.initializeTechTree(),
      platforms: this.initializePlatforms(),
      newTechsUnlocked: [],
      riskEvents: [],
      spillovers: [],
      totalRDBonus: 0,
      qualityBonusBySegment,
      messages: [],
      warnings: [],
    };
  }

  /**
   * Process tech tree research
   */
  private static processTechTree(
    previous: TechTreeState | null,
    decisions: RDExpansionDecisions,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): { techTree: TechTreeState; newTechs: TechNode[]; riskEvents: RDRiskEvent[] } {
    const techTree: TechTreeState = previous
      ? {
          ...previous,
          activeResearch: [...previous.activeResearch],
          completedResearch: [...previous.completedResearch],
          unlockedTechs: [...previous.unlockedTechs],
        }
      : this.initializeTechTree();

    const newTechs: TechNode[] = [];
    const riskEvents: RDRiskEvent[] = [];

    // Process active research
    techTree.activeResearch = techTree.activeResearch.filter((research) => {
      research.roundsRemaining--;

      // Check for risk events
      const delayProb = RISK_DELAY_PROBABILITIES[research.riskLevel];
      if (ctx.rng.rd.chance(delayProb)) {
        research.roundsRemaining++;
        research.delayedRounds++;
        riskEvents.push({
          type: "delay",
          projectId: research.techId,
          magnitude: 1,
          message: `Research delayed: ${TECH_TREE.find((t) => t.id === research.techId)?.name}`,
        });
      }

      const overrunProb = RISK_OVERRUN_PROBABILITIES[research.riskLevel];
      if (ctx.rng.rd.chance(overrunProb)) {
        const tech = TECH_TREE.find((t) => t.id === research.techId);
        const overrunAmount = (tech?.researchCost ?? 0) * ctx.rng.rd.range(0.1, 0.3);
        research.costOverrun += overrunAmount;
        riskEvents.push({
          type: "cost_overrun",
          projectId: research.techId,
          magnitude: overrunAmount,
          message: `Cost overrun: ${tech?.name} (+$${(overrunAmount / 1_000_000).toFixed(1)}M)`,
        });
      }

      // Check for completion
      if (research.roundsRemaining <= 0) {
        const tech = TECH_TREE.find((t) => t.id === research.techId);
        if (tech) {
          newTechs.push(tech);
          techTree.unlockedTechs.push(tech.id);
          techTree.completedResearch.push({
            techId: tech.id,
            roundCompleted: round,
            totalCost: research.investmentSoFar + research.costOverrun,
            hadDelay: research.delayedRounds > 0,
            hadOverrun: research.costOverrun > 0,
          });

          // Update tech level
          techTree.techLevel = Math.min(10, techTree.techLevel + tech.tier * 0.3);
        }
        return false;
      }
      return true;
    });

    // Start new research projects
    for (const { techId, riskLevel } of decisions.newResearchProjects) {
      const tech = TECH_TREE.find((t) => t.id === techId);
      if (!tech) continue;

      // Check AND prerequisites
      const andPrereqsMet = tech.prerequisites.every((p) =>
        techTree.unlockedTechs.includes(p)
      );
      if (!andPrereqsMet) continue;

      // Check OR prerequisites (if defined, at least one group must be fully met)
      if (tech.prerequisitesOr && tech.prerequisitesOr.length > 0) {
        const orPrereqsMet = tech.prerequisitesOr.some((group) =>
          group.every((p) => techTree.unlockedTechs.includes(p))
        );
        if (!orPrereqsMet) continue;
      }

      const prereqsMet = true; // Already validated above

      // Check if already researching or completed
      const alreadyActive = techTree.activeResearch.some((r) => r.techId === techId);
      const alreadyCompleted = techTree.unlockedTechs.includes(techId);
      if (alreadyActive || alreadyCompleted) continue;

      techTree.activeResearch.push({
        techId,
        roundsRemaining: tech.researchRounds,
        investmentSoFar: tech.researchCost,
        riskLevel,
        delayedRounds: 0,
        costOverrun: 0,
      });
    }

    return { techTree, newTechs, riskEvents };
  }

  /**
   * Process platform strategy
   */
  private static processPlatforms(
    previous: PlatformState | null,
    decisions: RDExpansionDecisions,
    round: number
  ): PlatformState {
    const platforms: PlatformState = previous
      ? { ...previous, platforms: [...previous.platforms] }
      : this.initializePlatforms();

    platforms.platformInvestment += decisions.platformInvestment;

    // Create new platform if enough investment
    if (
      platforms.platformInvestment >= PLATFORM_BASE_COST &&
      decisions.newPlatformSegments.length > 0
    ) {
      const newPlatform: Platform = {
        id: `platform_${round}`,
        name: `Platform Gen ${platforms.platforms.length + 1}`,
        investmentCost: PLATFORM_BASE_COST,
        developedSegments: decisions.newPlatformSegments,
        costReduction: PLATFORM_COST_REDUCTION,
        devSpeedBonus: PLATFORM_DEV_SPEED_BONUS,
        qualityFloor: 60,
        roundCreated: round,
      };

      platforms.platforms.push(newPlatform);
      platforms.activePlatformId = newPlatform.id;
      platforms.platformInvestment -= PLATFORM_BASE_COST;
    }

    return platforms;
  }

  /**
   * Calculate research spillovers
   */
  private static calculateSpillovers(
    newTechs: TechNode[],
    state: TeamState
  ): ResearchSpillover[] {
    const spillovers: ResearchSpillover[] = [];

    for (const tech of newTechs) {
      // Find segments that benefit from spillover
      const segmentEffects = tech.effects.filter(
        (e) => e.type === "quality_bonus" || e.type === "segment_bonus"
      );

      if (segmentEffects.length > 0) {
        const targetSegments: Segment[] = segmentEffects
          .filter((e) => e.segment)
          .map((e) => e.segment as Segment);

        if (targetSegments.length === 0) {
          // General improvement spills to adjacent segments
          targetSegments.push("General");
        }

        const qualityBonus =
          segmentEffects
            .filter((e) => e.type === "quality_bonus")
            .reduce((sum, e) => sum + e.value, 0) * SPILLOVER_RATE;

        if (qualityBonus > 0) {
          spillovers.push({
            sourceProjectId: tech.id,
            targetSegments,
            qualityBonus,
            featureBonus: 0,
          });
        }
      }
    }

    return spillovers;
  }

  /**
   * Calculate R&D bonuses from tech tree
   */
  private static calculateBonuses(
    techTree: TechTreeState,
    platforms: PlatformState
  ): { totalRDBonus: number; qualityBonusBySegment: Record<Segment, number> } {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const qualityBonusBySegment: Record<Segment, number> = {} as Record<Segment, number>;

    for (const segment of segments) {
      qualityBonusBySegment[segment] = 0;
    }

    let totalRDBonus = 0;

    // Apply unlocked tech effects
    for (const techId of techTree.unlockedTechs) {
      const tech = TECH_TREE.find((t) => t.id === techId);
      if (!tech) continue;

      for (const effect of tech.effects) {
        if (effect.type === "quality_bonus") {
          if (effect.segment) {
            qualityBonusBySegment[effect.segment] += effect.value;
          } else {
            // Apply to all segments
            for (const segment of segments) {
              qualityBonusBySegment[segment] += effect.value;
            }
          }
        }

        if (effect.type === "dev_speed") {
          totalRDBonus += effect.value * 100;
        }
      }
    }

    // Tech level bonus
    totalRDBonus += techTree.techLevel * 20;

    return { totalRDBonus, qualityBonusBySegment };
  }

  /**
   * Initialize tech tree state
   */
  static initializeTechTree(): TechTreeState {
    return {
      unlockedTechs: [],
      activeResearch: [],
      completedResearch: [],
      researchPoints: 0,
      techLevel: 1,
    };
  }

  /**
   * Initialize platform state
   */
  static initializePlatforms(): PlatformState {
    return {
      platforms: [],
      activePlatformId: null,
      platformInvestment: 0,
    };
  }

  /**
   * Get all available tech nodes
   */
  static getTechTree(): TechNode[] {
    return TECH_TREE;
  }

  /**
   * Get available research options (supports AND + OR prerequisites)
   */
  static getAvailableResearch(unlockedTechs: string[]): TechNode[] {
    return TECH_TREE.filter((tech) => {
      // Not already unlocked
      if (unlockedTechs.includes(tech.id)) return false;

      // AND prerequisites met
      if (!tech.prerequisites.every((p) => unlockedTechs.includes(p))) return false;

      // OR prerequisites met (if defined)
      if (tech.prerequisitesOr && tech.prerequisitesOr.length > 0) {
        const orMet = tech.prerequisitesOr.some((group) =>
          group.every((p) => unlockedTechs.includes(p))
        );
        if (!orMet) return false;
      }

      return true;
    });
  }

  /**
   * Calculate a product's feature set from unlocked technologies.
   * Each tech node contributes to its family based on effects.
   * Tier contribution: +20 per node (from family_bonus or quality_bonus effects).
   */
  static calculateProductFeatureSet(
    unlockedTechs: string[]
  ): Record<TechFamily, number> {
    const families: TechFamily[] = ["battery", "camera", "ai", "durability", "display", "connectivity"];
    const features: Record<TechFamily, number> = {
      battery: 0, camera: 0, ai: 0, durability: 0, display: 0, connectivity: 0,
    };

    for (const techId of unlockedTechs) {
      const tech = TECH_TREE.find((t) => t.id === techId);
      if (!tech) continue;

      // Each unlocked tech contributes to its own family
      // We look at effects for the contribution value
      for (const effect of tech.effects) {
        if (effect.type === "family_bonus" && effect.targetFamily) {
          // Cross-family bonus
          features[effect.targetFamily] = Math.min(100, features[effect.targetFamily] + effect.value);
        }
      }

      // Direct family contribution based on the primary effect value
      // Use the first effect's value or a tier-based default
      const primaryEffect = tech.effects.find(
        (e) => e.type === "quality_bonus" && !e.segment
      );
      const contribution = primaryEffect ? primaryEffect.value : 0;

      // Add the main tech contribution to its own family
      // Note: the TECH_TREE nodes' effects encode the contribution values directly
      // For legacy 18-node tree, we use a generic approach
      features[tech.family] = Math.min(100, features[tech.family] + contribution);
    }

    return features;
  }

  /**
   * Get tech node by ID
   */
  static getTechNode(techId: string): TechNode | undefined {
    return TECH_TREE.find((t) => t.id === techId);
  }
}

