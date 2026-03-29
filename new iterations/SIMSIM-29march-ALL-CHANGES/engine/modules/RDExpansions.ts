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
// TECH TREE DEFINITIONS - 30 nodes (5 per family × 6 families, 5 tiers)
// Source: Simsim_Complete_Design_Document.docx Section 2.3
// ============================================

const TECH_TREE: TechNode[] = [
  // =============== BATTERY FAMILY ===============
  { id: "bat_1", name: "Advanced Battery", family: "battery", tier: 1, prerequisites: [], researchCost: 4_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }, { type: "cost_reduction", value: 0.03 }], description: "Extended battery life with efficient power management", unlocksArchetypes: ["long_life_phone", "gaming_phone"], bestSegments: ["Budget", "Active Lifestyle"] },
  { id: "bat_2", name: "Fast Charging", family: "battery", tier: 2, prerequisites: ["bat_1"], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 15 }, { type: "feature_unlock", value: 1 }], description: "Rapid and wireless charging technology", unlocksArchetypes: ["fast_charge_pro"], bestSegments: ["General"] },
  { id: "bat_3", name: "Graphene Battery", family: "battery", tier: 3, prerequisites: ["bat_2"], researchCost: 15_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 20 }, { type: "cost_reduction", value: 0.05 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.08 }], description: "Graphene cells with integrated solar charging", bestSegments: ["Budget", "Active Lifestyle"] },
  { id: "bat_4", name: "Solid State Battery", family: "battery", tier: 4, prerequisites: ["bat_3"], researchCost: 25_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Budget", value: 0.10 }], description: "Solid-state battery with ambient energy harvesting", unlocksArchetypes: ["ultimate_flagship", "peoples_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },
  { id: "bat_5", name: "Perpetual Power", family: "battery", tier: 5, prerequisites: ["bat_4"], researchCost: 40_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.08 }, { type: "dev_speed", value: 0.10 }], description: "Near-infinite battery technology", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },

  // =============== CAMERA FAMILY ===============
  { id: "cam_1", name: "Advanced Optics", family: "camera", tier: 1, prerequisites: [], researchCost: 4_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "General", value: 0.05 }], description: "Enhanced optics with ultra-wide angle lens", unlocksArchetypes: ["snapshot_phone"], bestSegments: ["General", "Enthusiast"] },
  { id: "cam_2", name: "Computational Photography", family: "camera", tier: 2, prerequisites: ["cam_1"], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "feature_unlock", value: 1 }], description: "AI-powered imaging with night vision", unlocksArchetypes: ["camera_phone", "budget_cam_pro"], bestSegments: ["Enthusiast"] },
  { id: "cam_3", name: "Cinematic Imaging", family: "camera", tier: 3, prerequisites: ["cam_2"], researchCost: 15_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Enthusiast", value: 0.10 }, { type: "family_bonus", targetFamily: "ai", value: 10 }], description: "8K video with 3D depth sensing", unlocksArchetypes: ["photo_flagship"], bestSegments: ["Enthusiast", "Professional"] },
  { id: "cam_4", name: "Pro Cinema Suite", family: "camera", tier: 4, prerequisites: ["cam_3"], researchCost: 25_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Professional", value: 0.12 }, { type: "family_bonus", targetFamily: "display", value: 10 }], description: "Professional cinema recording with holographic capture", unlocksArchetypes: ["creator_phone", "ultimate_flagship"], bestSegments: ["Professional", "Enthusiast"] },
  { id: "cam_5", name: "Quantum Imaging", family: "camera", tier: 5, prerequisites: ["cam_4"], researchCost: 40_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 15 }], description: "Quantum-enhanced imaging sensor", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },

  // =============== AI FAMILY ===============
  { id: "ai_1", name: "Smart AI", family: "ai", tier: 1, prerequisites: [], researchCost: 5_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "AI assistant with predictive intelligence", unlocksArchetypes: ["smart_companion", "business_phone"], bestSegments: ["General", "Professional"] },
  { id: "ai_2", name: "On-Device Intelligence", family: "ai", tier: 2, prerequisites: ["ai_1"], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "dev_speed", value: 0.05 }, { type: "segment_bonus", segment: "Professional", value: 0.08 }], description: "On-device ML with contextual awareness", unlocksArchetypes: ["ai_assistant_phone"], bestSegments: ["Professional"] },
  { id: "ai_3", name: "Autonomous AI", family: "ai", tier: 3, prerequisites: ["ai_2"], researchCost: 18_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "feature_unlock", value: 1 }, { type: "segment_bonus", segment: "General", value: 0.08 }], description: "Autonomous agent with emotional intelligence", unlocksArchetypes: ["ai_powerhouse", "creator_phone", "fitness_pro"], bestSegments: ["Professional", "General"] },
  { id: "ai_4", name: "Neural Engine", family: "ai", tier: 4, prerequisites: ["ai_3"], researchCost: 28_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.06 }, { type: "dev_speed", value: 0.08 }, { type: "family_bonus", targetFamily: "battery", value: 5 }, { type: "family_bonus", targetFamily: "camera", value: 5 }, { type: "family_bonus", targetFamily: "durability", value: 5 }, { type: "family_bonus", targetFamily: "display", value: 5 }, { type: "family_bonus", targetFamily: "connectivity", value: 5 }], description: "Neural processing with adaptive UX", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },
  { id: "ai_5", name: "Sentient OS", family: "ai", tier: 5, prerequisites: ["ai_4"], researchCost: 45_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Professional", value: 0.15 }], description: "Fully sentient operating system", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Professional"] },

  // =============== DURABILITY FAMILY ===============
  { id: "dur_1", name: "Reinforced Build", family: "durability", tier: 1, prerequisites: [], researchCost: 2_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.05 }], description: "Gorilla glass with shock-absorbing armor", unlocksArchetypes: ["outdoor_basic", "action_camera_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "dur_2", name: "Water & Shock Proof", family: "durability", tier: 2, prerequisites: ["dur_1"], researchCost: 6_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "cost_reduction", value: 0.03 }], description: "IP68 water resistance with advanced shock absorption", unlocksArchetypes: ["action_camera_phone", "fitness_pro"], bestSegments: ["Active Lifestyle", "Budget"] },
  { id: "dur_3", name: "Military Grade", family: "durability", tier: 3, prerequisites: ["dur_2"], researchCost: 14_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.12 }], description: "MIL-STD certified with self-healing materials", unlocksArchetypes: ["adventure_phone"], bestSegments: ["Active Lifestyle"] },
  { id: "dur_4", name: "Extreme Durability", family: "durability", tier: 4, prerequisites: ["dur_3"], researchCost: 20_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.10 }, { type: "segment_bonus", segment: "Professional", value: 0.08 }], description: "Extreme environment resistance with titanium frame", unlocksArchetypes: ["ultimate_flagship"], bestSegments: ["Active Lifestyle", "Professional"] },
  { id: "dur_5", name: "Indestructible", family: "durability", tier: 5, prerequisites: ["dur_4"], researchCost: 35_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.15 }], description: "Virtually indestructible construction", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Active Lifestyle"] },

  // =============== DISPLAY FAMILY ===============
  { id: "dsp_1", name: "Premium Display", family: "display", tier: 1, prerequisites: [], researchCost: 4_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "OLED display with high brightness", unlocksArchetypes: ["cinema_screen", "gaming_phone", "peoples_phone"], bestSegments: ["General", "Enthusiast", "Active Lifestyle"] },
  { id: "dsp_2", name: "ProMotion Display", family: "display", tier: 2, prerequisites: ["dsp_1"], researchCost: 8_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Enthusiast", value: 0.08 }, { type: "family_bonus", targetFamily: "battery", value: -5 }], description: "120Hz refresh with always-on display", unlocksArchetypes: ["gaming_phone", "photo_flagship"], bestSegments: ["Enthusiast"] },
  { id: "dsp_3", name: "Adaptive Display", family: "display", tier: 3, prerequisites: ["dsp_2"], researchCost: 14_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "family_bonus", targetFamily: "battery", value: 5 }, { type: "cost_reduction", value: 0.04 }, { type: "family_bonus", targetFamily: "camera", value: 5 }], description: "Variable refresh rate with under-display camera", bestSegments: ["Enthusiast"] },
  { id: "dsp_4", name: "Next-Gen Display", family: "display", tier: 4, prerequisites: ["dsp_3"], researchCost: 28_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "cost_reduction", value: 0.06 }, { type: "feature_unlock", value: 1 }], description: "Micro-LED with foldable display technology", unlocksArchetypes: ["foldable_phone", "ultimate_flagship"], bestSegments: ["Enthusiast", "Professional"] },
  { id: "dsp_5", name: "Holographic Display", family: "display", tier: 5, prerequisites: ["dsp_4"], researchCost: 45_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }], description: "Holographic 3D display", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] },

  // =============== CONNECTIVITY FAMILY ===============
  { id: "con_1", name: "5G Connected", family: "connectivity", tier: 1, prerequisites: [], researchCost: 5_000_000, researchRounds: 1, effects: [{ type: "quality_bonus", value: 20 }], description: "5G modem with WiFi 6 support", unlocksArchetypes: ["connected_phone", "business_phone"], bestSegments: ["General", "Professional"] },
  { id: "con_2", name: "Ultra-Fast Network", family: "connectivity", tier: 2, prerequisites: ["con_1"], researchCost: 10_000_000, researchRounds: 2, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Professional", value: 0.08 }, { type: "dev_speed", value: 0.03 }], description: "mmWave 5G with WiFi 6E", unlocksArchetypes: ["business_phone", "ai_powerhouse"], bestSegments: ["Professional"] },
  { id: "con_3", name: "Satellite & Precision", family: "connectivity", tier: 3, prerequisites: ["con_2"], researchCost: 18_000_000, researchRounds: 3, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.10 }, { type: "feature_unlock", value: 1 }], description: "Emergency satellite SOS with UWB precision", unlocksArchetypes: ["adventure_phone"], bestSegments: ["Active Lifestyle", "General"] },
  { id: "con_4", name: "Global Network", family: "connectivity", tier: 4, prerequisites: ["con_3"], researchCost: 30_000_000, researchRounds: 4, effects: [{ type: "quality_bonus", value: 15 }, { type: "segment_bonus", segment: "Professional", value: 0.10 }, { type: "segment_bonus", segment: "Active Lifestyle", value: 0.10 }, { type: "segment_bonus", segment: "Budget", value: 0.08 }], description: "LEO satellite broadband with mesh networking", unlocksArchetypes: ["peoples_phone"], bestSegments: ["Professional", "Active Lifestyle", "Budget"] },
  { id: "con_5", name: "Quantum Communication", family: "connectivity", tier: 5, prerequisites: ["con_4"], researchCost: 50_000_000, researchRounds: 5, effects: [{ type: "quality_bonus", value: 20 }, { type: "segment_bonus", segment: "Professional", value: 0.12 }], description: "Quantum-encrypted communication", unlocksArchetypes: ["quantum_phone"], bestSegments: ["Professional"] },
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
    unlockedTechs: string[],
    decayTimers?: Record<string, number>
  ): Record<TechFamily, number> {
    const families: TechFamily[] = ["battery", "camera", "ai", "durability", "display", "connectivity"];
    const features: Record<TechFamily, number> = {
      battery: 0, camera: 0, ai: 0, durability: 0, display: 0, connectivity: 0,
    };

    for (const techId of unlockedTechs) {
      const tech = TECH_TREE.find((t) => t.id === techId);
      if (!tech) continue;

      // Apply research decay: techs unused for 6+ rounds lose effectiveness
      let decayMultiplier = 1.0;
      if (decayTimers?.[techId]) {
        const DECAY_THRESHOLD = 6;
        const MAX_DECAY_ROUNDS = 12;
        const decayRounds = Math.max(0, decayTimers[techId] - DECAY_THRESHOLD);
        if (decayRounds > 0) {
          // Linear decay from 100% to 50% over 12 rounds past threshold
          decayMultiplier = Math.max(0.5, 1 - (decayRounds / MAX_DECAY_ROUNDS) * 0.5);
        }
      }

      // Each unlocked tech contributes to its own family
      // We look at effects for the contribution value
      for (const effect of tech.effects) {
        if (effect.type === "family_bonus" && effect.targetFamily) {
          // Cross-family bonus (with decay applied)
          features[effect.targetFamily] = Math.min(100, features[effect.targetFamily] + effect.value * decayMultiplier);
        }
      }

      // Direct family contribution based on the primary effect value
      // Use the first effect's value or a tier-based default
      const primaryEffect = tech.effects.find(
        (e) => e.type === "quality_bonus" && !e.segment
      );
      const contribution = primaryEffect ? primaryEffect.value * decayMultiplier : 0;

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

