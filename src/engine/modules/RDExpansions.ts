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
export type TechTier = 1 | 2 | 3;
export type RiskLevel = "conservative" | "moderate" | "aggressive";

export interface TechNode {
  id: string;
  name: string;
  family: TechFamily;
  tier: TechTier;
  prerequisites: string[];
  researchCost: number;
  researchRounds: number;
  effects: TechEffect[];
  description: string;
}

export interface TechEffect {
  type: "quality_bonus" | "feature_unlock" | "cost_reduction" | "dev_speed" | "segment_bonus";
  segment?: Segment;
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
// TECH TREE DEFINITIONS
// ============================================

const TECH_TREE: TechNode[] = [
  // Battery Family
  {
    id: "battery_1",
    name: "Extended Battery",
    family: "battery",
    tier: 1,
    prerequisites: [],
    researchCost: 5_000_000,
    researchRounds: 2,
    effects: [{ type: "quality_bonus", value: 5 }],
    description: "Improved battery life technology",
  },
  {
    id: "battery_2",
    name: "Fast Charging",
    family: "battery",
    tier: 2,
    prerequisites: ["battery_1"],
    researchCost: 10_000_000,
    researchRounds: 3,
    effects: [
      { type: "feature_unlock", value: 1 },
      { type: "quality_bonus", value: 8 },
    ],
    description: "Rapid charging capability",
  },
  {
    id: "battery_3",
    name: "Solid State Battery",
    family: "battery",
    tier: 3,
    prerequisites: ["battery_2"],
    researchCost: 25_000_000,
    researchRounds: 4,
    effects: [
      { type: "quality_bonus", value: 15 },
      { type: "cost_reduction", value: 0.1 },
    ],
    description: "Revolutionary solid-state battery technology",
  },

  // Camera Family
  {
    id: "camera_1",
    name: "Enhanced Optics",
    family: "camera",
    tier: 1,
    prerequisites: [],
    researchCost: 4_000_000,
    researchRounds: 2,
    effects: [
      { type: "quality_bonus", value: 4, segment: "Enthusiast" },
      { type: "quality_bonus", value: 3 },
    ],
    description: "Improved camera optics",
  },
  {
    id: "camera_2",
    name: "Computational Photography",
    family: "camera",
    tier: 2,
    prerequisites: ["camera_1"],
    researchCost: 12_000_000,
    researchRounds: 3,
    effects: [
      { type: "quality_bonus", value: 10, segment: "Enthusiast" },
      { type: "feature_unlock", value: 2 },
    ],
    description: "AI-powered image processing",
  },
  {
    id: "camera_3",
    name: "Pro Video Suite",
    family: "camera",
    tier: 3,
    prerequisites: ["camera_2"],
    researchCost: 20_000_000,
    researchRounds: 4,
    effects: [
      { type: "quality_bonus", value: 15, segment: "Professional" },
      { type: "segment_bonus", segment: "Professional", value: 0.1 },
    ],
    description: "Professional-grade video capabilities",
  },

  // AI Family
  {
    id: "ai_1",
    name: "Smart Assistant",
    family: "ai",
    tier: 1,
    prerequisites: [],
    researchCost: 6_000_000,
    researchRounds: 2,
    effects: [
      { type: "feature_unlock", value: 1 },
      { type: "quality_bonus", value: 3 },
    ],
    description: "Basic AI assistant features",
  },
  {
    id: "ai_2",
    name: "Predictive AI",
    family: "ai",
    tier: 2,
    prerequisites: ["ai_1"],
    researchCost: 15_000_000,
    researchRounds: 3,
    effects: [
      { type: "quality_bonus", value: 8 },
      { type: "feature_unlock", value: 2 },
    ],
    description: "Predictive user experience",
  },
  {
    id: "ai_3",
    name: "On-Device AI",
    family: "ai",
    tier: 3,
    prerequisites: ["ai_2"],
    researchCost: 30_000_000,
    researchRounds: 5,
    effects: [
      { type: "quality_bonus", value: 12 },
      { type: "cost_reduction", value: 0.05 },
      { type: "segment_bonus", segment: "Professional", value: 0.15 },
    ],
    description: "Full on-device AI processing",
  },

  // Durability Family
  {
    id: "durability_1",
    name: "Gorilla Glass",
    family: "durability",
    tier: 1,
    prerequisites: [],
    researchCost: 3_000_000,
    researchRounds: 1,
    effects: [
      { type: "quality_bonus", value: 3 },
      { type: "segment_bonus", segment: "Active Lifestyle", value: 0.05 },
    ],
    description: "Enhanced screen durability",
  },
  {
    id: "durability_2",
    name: "Water Resistance",
    family: "durability",
    tier: 2,
    prerequisites: ["durability_1"],
    researchCost: 8_000_000,
    researchRounds: 2,
    effects: [
      { type: "quality_bonus", value: 6 },
      { type: "segment_bonus", segment: "Active Lifestyle", value: 0.1 },
    ],
    description: "IP68 water and dust resistance",
  },
  {
    id: "durability_3",
    name: "Military Grade",
    family: "durability",
    tier: 3,
    prerequisites: ["durability_2"],
    researchCost: 15_000_000,
    researchRounds: 3,
    effects: [
      { type: "quality_bonus", value: 10, segment: "Active Lifestyle" },
      { type: "quality_bonus", value: 8, segment: "Professional" },
      { type: "segment_bonus", segment: "Active Lifestyle", value: 0.2 },
    ],
    description: "MIL-STD-810G certification",
  },

  // Display Family
  {
    id: "display_1",
    name: "OLED Display",
    family: "display",
    tier: 1,
    prerequisites: [],
    researchCost: 5_000_000,
    researchRounds: 2,
    effects: [{ type: "quality_bonus", value: 5 }],
    description: "Premium OLED display",
  },
  {
    id: "display_2",
    name: "High Refresh Rate",
    family: "display",
    tier: 2,
    prerequisites: ["display_1"],
    researchCost: 10_000_000,
    researchRounds: 2,
    effects: [
      { type: "quality_bonus", value: 7 },
      { type: "segment_bonus", segment: "Enthusiast", value: 0.1 },
    ],
    description: "120Hz+ display refresh rate",
  },
  {
    id: "display_3",
    name: "Adaptive Display",
    family: "display",
    tier: 3,
    prerequisites: ["display_2"],
    researchCost: 18_000_000,
    researchRounds: 3,
    effects: [
      { type: "quality_bonus", value: 10 },
      { type: "cost_reduction", value: 0.08 },
    ],
    description: "Adaptive refresh and brightness",
  },

  // Connectivity Family
  {
    id: "connectivity_1",
    name: "5G Modem",
    family: "connectivity",
    tier: 1,
    prerequisites: [],
    researchCost: 8_000_000,
    researchRounds: 2,
    effects: [
      { type: "feature_unlock", value: 1 },
      { type: "quality_bonus", value: 5 },
    ],
    description: "5G connectivity",
  },
  {
    id: "connectivity_2",
    name: "WiFi 6E",
    family: "connectivity",
    tier: 2,
    prerequisites: ["connectivity_1"],
    researchCost: 6_000_000,
    researchRounds: 2,
    effects: [
      { type: "quality_bonus", value: 4 },
      { type: "segment_bonus", segment: "Professional", value: 0.05 },
    ],
    description: "Next-gen WiFi technology",
  },
  {
    id: "connectivity_3",
    name: "Satellite Communication",
    family: "connectivity",
    tier: 3,
    prerequisites: ["connectivity_2"],
    researchCost: 35_000_000,
    researchRounds: 5,
    effects: [
      { type: "quality_bonus", value: 8 },
      { type: "segment_bonus", segment: "Professional", value: 0.15 },
      { type: "segment_bonus", segment: "Active Lifestyle", value: 0.1 },
    ],
    description: "Emergency satellite connectivity",
  },
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

      // Check prerequisites
      const prereqsMet = tech.prerequisites.every((p) =>
        techTree.unlockedTechs.includes(p)
      );
      if (!prereqsMet) continue;

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
   * Get available research options
   */
  static getAvailableResearch(unlockedTechs: string[]): TechNode[] {
    return TECH_TREE.filter((tech) => {
      // Not already unlocked
      if (unlockedTechs.includes(tech.id)) return false;

      // Prerequisites met
      return tech.prerequisites.every((p) => unlockedTechs.includes(p));
    });
  }

  /**
   * Get tech node by ID
   */
  static getTechNode(techId: string): TechNode | undefined {
    return TECH_TREE.find((t) => t.id === techId);
  }
}

