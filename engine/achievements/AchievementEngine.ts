/**
 * Achievement Engine
 *
 * Tracks player progress and awards achievements for reaching milestones.
 * Supports unlocks, bonuses, and cosmetic rewards.
 *
 * Phase 15: Achievement System
 */

import type { Segment } from "../types/factory";
import type { TeamState } from "../types/state";
import type { DifficultyLevel } from "../config/schema";

// ============================================
// TYPES
// ============================================

export type AchievementCategory =
  | "financial"
  | "operational"
  | "innovation"
  | "growth"
  | "sustainability"
  | "challenge";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  requirements: AchievementRequirement[];
  reward: AchievementReward;
  hidden: boolean;
  difficultyMultiplier?: Record<DifficultyLevel, number>;
}

export interface AchievementRequirement {
  type:
    | "revenue"
    | "profit"
    | "market_share"
    | "brand_value"
    | "esg"
    | "employees"
    | "products"
    | "rounds_profitable"
    | "cash"
    | "market_cap"
    | "quality_avg"
    | "segment_leader"
    | "no_bankruptcy"
    | "difficulty"
    | "crises_resolved"
    | "rounds_completed";
  operator?: ">=" | ">" | "<=" | "<" | "==" | "any";
  value: number | string | boolean;
  segment?: Segment;
  sustained?: number; // Number of rounds requirement must be met
}

export interface AchievementReward {
  type: "unlock" | "bonus" | "cosmetic" | "multiplier";
  value: string | number | Record<string, number>;
  description: string;
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  percentComplete: number;
  sustainedRounds?: number;
}

export interface EarnedAchievement {
  achievementId: string;
  earnedRound: number;
  earnedAt: Date;
  difficultyAtEarn: DifficultyLevel;
}

export interface AchievementState {
  earned: EarnedAchievement[];
  progress: AchievementProgress[];
  totalPoints: number;
  unlockedRewards: string[];
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetRound: number;
  requirements: AchievementRequirement[];
  bonusIfMet: MilestoneBonus;
  penaltyIfMissed: MilestonePenalty;
}

export interface MilestoneBonus {
  type: "sentiment" | "cash" | "brand" | "efficiency";
  value: number;
  description: string;
}

export interface MilestonePenalty {
  type: "sentiment" | "brand" | "morale";
  value: number;
  description: string;
}

export interface MilestoneResult {
  milestone: Milestone;
  met: boolean;
  effect: MilestoneBonus | MilestonePenalty;
}

export interface AchievementResult {
  state: AchievementState;
  newAchievements: Achievement[];
  milestoneResults: MilestoneResult[];
  messages: string[];
  totalPointsEarned: number;
}

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

const ACHIEVEMENTS: Achievement[] = [
  // FINANCIAL
  {
    id: "first_profit",
    name: "In the Black",
    description: "Achieve positive net income for the first time",
    category: "financial",
    tier: "bronze",
    requirements: [{ type: "profit", operator: ">", value: 0 }],
    reward: { type: "cosmetic", value: "profit_badge", description: "Profit milestone badge" },
    hidden: false,
  },
  {
    id: "hundred_million",
    name: "Hundred Million Club",
    description: "Reach $100M in revenue",
    category: "financial",
    tier: "silver",
    requirements: [{ type: "revenue", operator: ">=", value: 100_000_000 }],
    reward: { type: "bonus", value: { investor_sentiment: 5 }, description: "+5 investor sentiment" },
    hidden: false,
  },
  {
    id: "billionaire",
    name: "Billionaire",
    description: "Reach $1B in revenue",
    category: "financial",
    tier: "gold",
    requirements: [{ type: "revenue", operator: ">=", value: 1_000_000_000 }],
    reward: { type: "unlock", value: "premium_sponsorships", description: "Unlock premium sponsorships" },
    hidden: false,
  },
  {
    id: "cash_king",
    name: "Cash King",
    description: "Accumulate $500M in cash reserves",
    category: "financial",
    tier: "gold",
    requirements: [{ type: "cash", operator: ">=", value: 500_000_000 }],
    reward: { type: "bonus", value: { credit_rating_bonus: 1 }, description: "+1 credit rating level" },
    hidden: false,
  },
  {
    id: "market_titan",
    name: "Market Titan",
    description: "Reach $5B market capitalization",
    category: "financial",
    tier: "platinum",
    requirements: [{ type: "market_cap", operator: ">=", value: 5_000_000_000 }],
    reward: { type: "cosmetic", value: "titan_badge", description: "Titan status badge" },
    hidden: false,
  },
  {
    id: "consistent_profits",
    name: "Steady as She Goes",
    description: "Maintain profitability for 8 consecutive rounds",
    category: "financial",
    tier: "gold",
    requirements: [{ type: "rounds_profitable", operator: ">=", value: 8 }],
    reward: { type: "bonus", value: { brand_stability: 0.05 }, description: "+5% brand stability" },
    hidden: false,
  },

  // GROWTH
  {
    id: "market_leader",
    name: "Market Leader",
    description: "Achieve #1 market share in any segment",
    category: "growth",
    tier: "silver",
    requirements: [{ type: "segment_leader", operator: "any", value: true }],
    reward: { type: "bonus", value: { market_share_bonus: 0.02 }, description: "+2% market share retention" },
    hidden: false,
  },
  {
    id: "domination",
    name: "Market Dominator",
    description: "Achieve 50% market share in any segment",
    category: "growth",
    tier: "gold",
    requirements: [{ type: "market_share", operator: ">=", value: 0.5 }],
    reward: { type: "bonus", value: { pricing_power: 0.1 }, description: "+10% pricing power" },
    hidden: false,
  },
  {
    id: "diversified",
    name: "Diversified Portfolio",
    description: "Have products in all 5 market segments",
    category: "growth",
    tier: "silver",
    requirements: [{ type: "products", operator: ">=", value: 5 }],
    reward: { type: "bonus", value: { risk_reduction: 0.1 }, description: "10% revenue volatility reduction" },
    hidden: false,
  },
  {
    id: "global_player",
    name: "Global Player",
    description: "Have factories in 3 or more regions",
    category: "growth",
    tier: "gold",
    requirements: [{ type: "products", operator: ">=", value: 3 }], // Simplified for now
    reward: { type: "unlock", value: "global_supply_chain", description: "Unlock global supply chain options" },
    hidden: false,
  },

  // INNOVATION
  {
    id: "quality_excellence",
    name: "Quality Excellence",
    description: "Achieve average product quality of 85+",
    category: "innovation",
    tier: "silver",
    requirements: [{ type: "quality_avg", operator: ">=", value: 85 }],
    reward: { type: "bonus", value: { quality_premium: 0.05 }, description: "5% quality price premium" },
    hidden: false,
  },
  {
    id: "innovation_leader",
    name: "Innovation Leader",
    description: "Achieve product quality of 95+ in Professional segment",
    category: "innovation",
    tier: "gold",
    requirements: [{ type: "quality_avg", operator: ">=", value: 95, segment: "Professional" }],
    reward: { type: "bonus", value: { rd_efficiency: 0.1 }, description: "+10% R&D efficiency" },
    hidden: false,
  },

  // SUSTAINABILITY
  {
    id: "green_starter",
    name: "Going Green",
    description: "Achieve ESG score of 500+",
    category: "sustainability",
    tier: "bronze",
    requirements: [{ type: "esg", operator: ">=", value: 500 }],
    reward: { type: "bonus", value: { esg_momentum: 10 }, description: "+10 ESG momentum" },
    hidden: false,
  },
  {
    id: "sustainability_leader",
    name: "Sustainability Champion",
    description: "Achieve ESG score of 800+",
    category: "sustainability",
    tier: "gold",
    requirements: [{ type: "esg", operator: ">=", value: 800 }],
    reward: { type: "unlock", value: "impact_investors", description: "Unlock impact investor access" },
    hidden: false,
  },
  {
    id: "carbon_neutral",
    name: "Carbon Neutral",
    description: "Achieve ESG score of 950+ (near carbon neutral)",
    category: "sustainability",
    tier: "platinum",
    requirements: [{ type: "esg", operator: ">=", value: 950 }],
    reward: { type: "bonus", value: { brand_value: 0.1 }, description: "+10% brand value" },
    hidden: false,
  },

  // OPERATIONAL
  {
    id: "big_employer",
    name: "Major Employer",
    description: "Employ 500+ workers",
    category: "operational",
    tier: "silver",
    requirements: [{ type: "employees", operator: ">=", value: 500 }],
    reward: { type: "bonus", value: { hiring_efficiency: 0.1 }, description: "10% faster hiring" },
    hidden: false,
  },
  {
    id: "dream_team",
    name: "Dream Team",
    description: "Employ 50+ engineers",
    category: "operational",
    tier: "gold",
    requirements: [{ type: "employees", operator: ">=", value: 50 }], // Simplified - would check engineers
    reward: { type: "bonus", value: { rd_bonus: 100 }, description: "+100 R&D points per round" },
    hidden: false,
  },

  // CHALLENGE
  {
    id: "survivor",
    name: "Survivor",
    description: "Complete a game without going bankrupt",
    category: "challenge",
    tier: "silver",
    requirements: [
      { type: "no_bankruptcy", operator: "==", value: true },
      { type: "rounds_completed", operator: ">=", value: 12 },
    ],
    reward: { type: "cosmetic", value: "survivor_badge", description: "Survivor badge" },
    hidden: false,
  },
  {
    id: "hard_mode_winner",
    name: "Challenge Accepted",
    description: "Complete a game on Hard difficulty with positive profit",
    category: "challenge",
    tier: "gold",
    requirements: [
      { type: "difficulty", operator: ">=", value: "hard" },
      { type: "profit", operator: ">", value: 0 },
      { type: "rounds_completed", operator: ">=", value: 12 },
    ],
    reward: { type: "unlock", value: "hard_strategies", description: "Unlock advanced strategies guide" },
    hidden: false,
    difficultyMultiplier: { sandbox: 0, easy: 0, normal: 0, hard: 1, expert: 1.5, nightmare: 2 },
  },
  {
    id: "nightmare_survivor",
    name: "Nightmare Survivor",
    description: "Complete a game on Nightmare difficulty without going bankrupt",
    category: "challenge",
    tier: "platinum",
    requirements: [
      { type: "difficulty", operator: "==", value: "nightmare" },
      { type: "no_bankruptcy", operator: "==", value: true },
      { type: "rounds_completed", operator: ">=", value: 12 },
    ],
    reward: { type: "cosmetic", value: "nightmare_badge", description: "Nightmare mastery badge" },
    hidden: true,
  },
  {
    id: "crisis_master",
    name: "Crisis Master",
    description: "Successfully resolve 10 crises on Hard or higher",
    category: "challenge",
    tier: "gold",
    requirements: [
      { type: "crises_resolved", operator: ">=", value: 10 },
      { type: "difficulty", operator: ">=", value: "hard" },
    ],
    reward: { type: "bonus", value: { crisis_resistance: 0.1 }, description: "10% crisis impact reduction" },
    hidden: false,
  },
];

// ============================================
// MILESTONE DEFINITIONS
// ============================================

const MILESTONES: Milestone[] = [
  {
    id: "profitability_milestone",
    name: "Path to Profitability",
    description: "Achieve positive net income by round 4",
    targetRound: 4,
    requirements: [{ type: "profit", operator: ">", value: 0 }],
    bonusIfMet: { type: "sentiment", value: 10, description: "+10 investor sentiment" },
    penaltyIfMissed: { type: "sentiment", value: -15, description: "-15 investor sentiment" },
  },
  {
    id: "market_presence",
    name: "Market Presence",
    description: "Achieve 10% market share in any segment by round 6",
    targetRound: 6,
    requirements: [{ type: "market_share", operator: ">=", value: 0.1 }],
    bonusIfMet: { type: "brand", value: 0.05, description: "+5% brand value" },
    penaltyIfMissed: { type: "brand", value: -0.03, description: "-3% brand value" },
  },
  {
    id: "scale_operations",
    name: "Scale Operations",
    description: "Reach 200 employees by round 8",
    targetRound: 8,
    requirements: [{ type: "employees", operator: ">=", value: 200 }],
    bonusIfMet: { type: "efficiency", value: 0.05, description: "+5% operational efficiency" },
    penaltyIfMissed: { type: "morale", value: -10, description: "-10 workforce morale" },
  },
  {
    id: "revenue_target",
    name: "Revenue Milestone",
    description: "Reach $500M in revenue by round 10",
    targetRound: 10,
    requirements: [{ type: "revenue", operator: ">=", value: 500_000_000 }],
    bonusIfMet: { type: "sentiment", value: 15, description: "+15 investor sentiment" },
    penaltyIfMissed: { type: "sentiment", value: -20, description: "-20 investor sentiment" },
  },
];

// ============================================
// ACHIEVEMENT POINTS
// ============================================

const TIER_POINTS: Record<AchievementTier, number> = {
  bronze: 10,
  silver: 25,
  gold: 50,
  platinum: 100,
};

// ============================================
// ENGINE
// ============================================

export class AchievementEngine {
  /**
   * Check achievements and milestones for a round
   */
  static checkAchievements(
    state: TeamState,
    previousAchievementState: AchievementState | null,
    round: number,
    difficulty: DifficultyLevel,
    additionalContext: {
      crisesResolved?: number;
      neverBankrupt?: boolean;
      roundsProfitable?: number;
      roundsCompleted?: number;
    } = {}
  ): AchievementResult {
    const messages: string[] = [];
    const achievementState: AchievementState = previousAchievementState
      ? { ...previousAchievementState }
      : this.initializeState();

    const newAchievements: Achievement[] = [];
    let totalPointsEarned = 0;

    // Check each achievement
    for (const achievement of ACHIEVEMENTS) {
      // Skip if already earned
      if (achievementState.earned.some((e) => e.achievementId === achievement.id)) {
        continue;
      }

      // Check requirements
      const { met, progress } = this.checkRequirements(
        achievement.requirements,
        state,
        difficulty,
        additionalContext
      );

      // Update progress
      const existingProgress = achievementState.progress.find(
        (p) => p.achievementId === achievement.id
      );
      if (existingProgress) {
        existingProgress.currentValue = progress.currentValue;
        existingProgress.percentComplete = progress.percentComplete;
      } else {
        achievementState.progress.push({
          achievementId: achievement.id,
          ...progress,
        });
      }

      // Award achievement if met
      if (met) {
        newAchievements.push(achievement);
        achievementState.earned.push({
          achievementId: achievement.id,
          earnedRound: round,
          earnedAt: new Date(),
          difficultyAtEarn: difficulty,
        });

        // Calculate points with difficulty multiplier
        let points = TIER_POINTS[achievement.tier];
        if (achievement.difficultyMultiplier) {
          points *= achievement.difficultyMultiplier[difficulty] ?? 1;
        }
        totalPointsEarned += points;
        achievementState.totalPoints += points;

        // Track unlocked rewards
        if (achievement.reward.type === "unlock") {
          achievementState.unlockedRewards.push(achievement.reward.value as string);
        }

        messages.push(`Achievement Unlocked: ${achievement.name}! (+${points} points)`);
      }
    }

    // Check milestones
    const milestoneResults = this.checkMilestones(state, round, difficulty, additionalContext);
    for (const result of milestoneResults) {
      if (result.met) {
        messages.push(`Milestone achieved: ${result.milestone.name} - ${result.effect.description}`);
      } else {
        messages.push(`Milestone missed: ${result.milestone.name} - ${result.effect.description}`);
      }
    }

    return {
      state: achievementState,
      newAchievements,
      milestoneResults,
      messages,
      totalPointsEarned,
    };
  }

  /**
   * Initialize achievement state
   */
  static initializeState(): AchievementState {
    return {
      earned: [],
      progress: [],
      totalPoints: 0,
      unlockedRewards: [],
    };
  }

  /**
   * Check if requirements are met
   */
  private static checkRequirements(
    requirements: AchievementRequirement[],
    state: TeamState,
    difficulty: DifficultyLevel,
    context: {
      crisesResolved?: number;
      neverBankrupt?: boolean;
      roundsProfitable?: number;
      roundsCompleted?: number;
    }
  ): { met: boolean; progress: { currentValue: number; targetValue: number; percentComplete: number } } {
    let allMet = true;
    let totalProgress = 0;
    let totalTargets = 0;

    for (const req of requirements) {
      const value = this.getRequirementValue(req, state, difficulty, context);
      const target = typeof req.value === "number" ? req.value : 1;
      const met = this.evaluateRequirement(value, req.operator ?? ">=", req.value);

      if (!met) {
        allMet = false;
      }

      if (typeof value === "number" && typeof target === "number") {
        totalProgress += Math.min(value, target);
        totalTargets += target;
      }
    }

    const percentComplete = totalTargets > 0 ? (totalProgress / totalTargets) * 100 : 0;

    return {
      met: allMet,
      progress: {
        currentValue: totalProgress,
        targetValue: totalTargets,
        percentComplete: Math.min(100, percentComplete),
      },
    };
  }

  /**
   * Get current value for a requirement
   */
  private static getRequirementValue(
    req: AchievementRequirement,
    state: TeamState,
    difficulty: DifficultyLevel,
    context: {
      crisesResolved?: number;
      neverBankrupt?: boolean;
      roundsProfitable?: number;
      roundsCompleted?: number;
    }
  ): number | string | boolean {
    switch (req.type) {
      case "revenue":
        return state.revenue ?? 0;
      case "profit":
        return state.netIncome ?? 0;
      case "market_share":
        // Get max market share across all segments
        const shares = state.marketShare;
        if (!shares || typeof shares !== 'object') return 0;
        return Math.max(...Object.values(shares), 0);
      case "brand_value":
        return state.brandValue;
      case "esg":
        return state.esgScore ?? 0;
      case "employees":
        return state.workforce?.totalHeadcount ?? 0;
      case "products":
        return state.products?.length ?? 0;
      case "cash":
        return state.cash;
      case "market_cap":
        return state.marketCap ?? 0;
      case "quality_avg":
        const products = state.products ?? [];
        if (products.length === 0) return 0;
        if (req.segment) {
          const segmentProducts = products.filter((p) => p.segment === req.segment);
          if (segmentProducts.length === 0) return 0;
          return segmentProducts.reduce((sum, p) => sum + p.quality, 0) / segmentProducts.length;
        }
        return products.reduce((sum, p) => sum + p.quality, 0) / products.length;
      case "segment_leader":
        // Check if we're leading in any segment
        const marketShares = state.marketShare;
        if (!marketShares || typeof marketShares !== 'object') return false;
        return Math.max(...Object.values(marketShares), 0) > 0.2;
      case "difficulty":
        return difficulty;
      case "no_bankruptcy":
        return context.neverBankrupt ?? true;
      case "crises_resolved":
        return context.crisesResolved ?? 0;
      case "rounds_profitable":
        return context.roundsProfitable ?? 0;
      case "rounds_completed":
        return context.roundsCompleted ?? 0;
      default:
        return 0;
    }
  }

  /**
   * Evaluate a requirement condition
   */
  private static evaluateRequirement(
    actual: number | string | boolean,
    operator: string,
    expected: number | string | boolean
  ): boolean {
    // Handle difficulty comparison
    if (typeof actual === "string" && typeof expected === "string") {
      const difficultyOrder = ["sandbox", "easy", "normal", "hard", "expert", "nightmare"];
      const actualIndex = difficultyOrder.indexOf(actual);
      const expectedIndex = difficultyOrder.indexOf(expected);

      switch (operator) {
        case ">=": return actualIndex >= expectedIndex;
        case ">": return actualIndex > expectedIndex;
        case "<=": return actualIndex <= expectedIndex;
        case "<": return actualIndex < expectedIndex;
        case "==": return actualIndex === expectedIndex;
        default: return false;
      }
    }

    // Handle boolean
    if (typeof actual === "boolean") {
      return actual === expected;
    }

    // Handle "any" operator
    if (operator === "any") {
      return !!actual;
    }

    // Handle numeric comparison
    const numActual = Number(actual);
    const numExpected = Number(expected);

    switch (operator) {
      case ">=": return numActual >= numExpected;
      case ">": return numActual > numExpected;
      case "<=": return numActual <= numExpected;
      case "<": return numActual < numExpected;
      case "==": return numActual === numExpected;
      default: return false;
    }
  }

  /**
   * Check milestones for the current round
   */
  private static checkMilestones(
    state: TeamState,
    round: number,
    difficulty: DifficultyLevel,
    context: {
      crisesResolved?: number;
      neverBankrupt?: boolean;
      roundsProfitable?: number;
      roundsCompleted?: number;
    }
  ): MilestoneResult[] {
    const results: MilestoneResult[] = [];

    for (const milestone of MILESTONES) {
      if (round === milestone.targetRound) {
        const { met } = this.checkRequirements(milestone.requirements, state, difficulty, context);

        results.push({
          milestone,
          met,
          effect: met ? milestone.bonusIfMet : milestone.penaltyIfMissed,
        });
      }
    }

    return results;
  }

  /**
   * Get all achievements
   */
  static getAllAchievements(): Achievement[] {
    return ACHIEVEMENTS;
  }

  /**
   * Get all milestones
   */
  static getAllMilestones(): Milestone[] {
    return MILESTONES;
  }

  /**
   * Get achievements by category
   */
  static getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return ACHIEVEMENTS.filter((a) => a.category === category);
  }

  /**
   * Calculate total possible points
   */
  static getTotalPossiblePoints(): number {
    return ACHIEVEMENTS.reduce((sum, a) => sum + TIER_POINTS[a.tier], 0);
  }
}

// Types are exported with their interface declarations above
