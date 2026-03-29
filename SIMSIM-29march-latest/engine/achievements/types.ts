/**
 * Extended Achievement Types
 *
 * Extends the base achievement system to support 221 achievements
 * across 12 categories and 6 tiers including Infamy and Secret.
 *
 * "Ledger of Legends & Losers" Achievement System
 */

import type { Segment } from "../types/factory";
import type { DifficultyLevel } from "../config/schema";

// ============================================
// EXTENDED TIERS (6 total)
// ============================================

export type ExtendedAchievementTier =
  | "bronze"    // 🟤 10 points - Entry-level achievements
  | "silver"    // ⚪ 25 points - Intermediate achievements
  | "gold"      // 🟡 50 points - Advanced achievements
  | "platinum"  // 🔵 100 points - Elite achievements
  | "infamy"    // 🔴 -25 points - Negative/failure achievements
  | "secret";   // 🟣 75 points - Hidden achievements

// ============================================
// EXTENDED CATEGORIES (12 total)
// ============================================

export type ExtendedAchievementCategory =
  | "overview"      // General company performance
  | "factory"       // Manufacturing & production
  | "finance"       // Financial management
  | "hr"            // Human resources & workforce
  | "marketing"     // Marketing & brand
  | "rd"            // Research & development
  | "supply_chain"  // Supply chain management
  | "logistics"     // Logistics & distribution
  | "news"          // Event response & news
  | "results"       // Round/game results
  | "secret"        // Hidden achievements
  | "mega";         // Cross-department achievements

// ============================================
// TIER METADATA
// ============================================

export interface TierConfig {
  name: string;
  icon: string;
  points: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const EXTENDED_TIER_CONFIG: Record<ExtendedAchievementTier, TierConfig> = {
  bronze: {
    name: "Bronze",
    icon: "🟤",
    points: 10,
    color: "text-amber-600",
    bgColor: "bg-amber-600/20",
    borderColor: "border-amber-600/50",
  },
  silver: {
    name: "Silver",
    icon: "⚪",
    points: 25,
    color: "text-slate-300",
    bgColor: "bg-slate-300/20",
    borderColor: "border-slate-300/50",
  },
  gold: {
    name: "Gold",
    icon: "🟡",
    points: 50,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/20",
    borderColor: "border-yellow-400/50",
  },
  platinum: {
    name: "Platinum",
    icon: "🔵",
    points: 100,
    color: "text-blue-400",
    bgColor: "bg-blue-400/20",
    borderColor: "border-blue-400/50",
  },
  infamy: {
    name: "Infamy",
    icon: "🔴",
    points: -25,
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/50",
  },
  secret: {
    name: "Secret",
    icon: "🟣",
    points: 75,
    color: "text-purple-400",
    bgColor: "bg-purple-400/20",
    borderColor: "border-purple-400/50",
  },
};

// ============================================
// CATEGORY METADATA
// ============================================

export interface CategoryConfig {
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const CATEGORY_CONFIG: Record<ExtendedAchievementCategory, CategoryConfig> = {
  overview: {
    name: "Overview",
    icon: "LayoutDashboard",
    description: "General company performance and milestones",
    color: "text-purple-400",
  },
  factory: {
    name: "Factory",
    icon: "Factory",
    description: "Manufacturing and production achievements",
    color: "text-orange-400",
  },
  finance: {
    name: "Finance",
    icon: "DollarSign",
    description: "Financial management and profitability",
    color: "text-emerald-400",
  },
  hr: {
    name: "HR",
    icon: "Users",
    description: "Human resources and workforce management",
    color: "text-blue-400",
  },
  marketing: {
    name: "Marketing",
    icon: "Megaphone",
    description: "Marketing, brand, and market presence",
    color: "text-pink-400",
  },
  rd: {
    name: "R&D",
    icon: "Lightbulb",
    description: "Research, development, and innovation",
    color: "text-cyan-400",
  },
  supply_chain: {
    name: "Supply Chain",
    icon: "Link",
    description: "Supply chain and materials management",
    color: "text-amber-400",
  },
  logistics: {
    name: "Logistics",
    icon: "Truck",
    description: "Distribution and logistics operations",
    color: "text-indigo-400",
  },
  news: {
    name: "News & Events",
    icon: "Radio",
    description: "Response to market events and news",
    color: "text-red-400",
  },
  results: {
    name: "Results",
    icon: "Trophy",
    description: "Round and game completion achievements",
    color: "text-yellow-400",
  },
  secret: {
    name: "Secret",
    icon: "Eye",
    description: "Hidden achievements revealed upon unlock",
    color: "text-purple-500",
  },
  mega: {
    name: "Mega",
    icon: "Crown",
    description: "Cross-department legendary achievements",
    color: "text-gradient",
  },
};

// ============================================
// EXTENDED REQUIREMENT TYPES
// ============================================

export type ExtendedRequirementType =
  // Financial
  | "revenue"
  | "profit"
  | "net_income"
  | "cash"
  | "cash_flow"
  | "market_cap"
  | "roi"
  | "profit_margin"
  | "gross_margin"
  | "debt"
  | "debt_ratio"
  | "credit_rating"
  | "dividend_paid"
  | "stock_price"
  | "investor_sentiment"
  // Market
  | "market_share"
  | "market_share_total"
  | "market_share_segment"
  | "segment_leader"
  | "segments_led"
  | "brand_value"
  | "brand_awareness"
  | "customer_satisfaction"
  // Production
  | "production_volume"
  | "production_capacity"
  | "capacity_utilization"
  | "factory_count"
  | "automation_level"
  | "defect_rate"
  | "yield_rate"
  | "production_efficiency"
  | "units_produced"
  | "units_sold"
  // Quality & Products
  | "quality_avg"
  | "quality_min"
  | "quality_max"
  | "products"
  | "products_launched"
  | "product_features"
  | "innovation_score"
  | "tech_level"
  // Workforce
  | "employees"
  | "employee_count"
  | "engineers"
  | "sales_staff"
  | "factory_workers"
  | "morale"
  | "productivity"
  | "turnover_rate"
  | "training_level"
  | "salary_level"
  | "benefits_level"
  // ESG & Sustainability
  | "esg"
  | "esg_score"
  | "environmental_score"
  | "social_score"
  | "governance_score"
  | "carbon_footprint"
  | "sustainability_rating"
  // Supply Chain & Logistics
  | "supplier_count"
  | "supplier_reliability"
  | "inventory_level"
  | "inventory_turnover"
  | "lead_time"
  | "delivery_rate"
  | "logistics_efficiency"
  | "distribution_coverage"
  | "shipping_cost"
  | "warehouses"
  | "routes"
  // Events & News
  | "events_weathered"
  | "crises_resolved"
  | "opportunities_seized"
  | "news_events"
  | "market_events"
  // Game State
  | "rounds_completed"
  | "rounds_profitable"
  | "rounds_unprofitable"
  | "no_bankruptcy"
  | "difficulty"
  | "game_completed"
  | "final_ranking"
  | "teams_beaten"
  // Cumulative/Historical
  | "total_revenue"
  | "total_profit"
  | "total_units_sold"
  | "total_employees_hired"
  | "total_rd_spent"
  | "total_marketing_spent"
  // Compound/Complex
  | "consecutive_growth"
  | "consecutive_profit"
  | "never_negative_cash"
  | "all_segments_positive"
  | "dominated_market"
  // Custom for specific achievements
  | "custom";

// ============================================
// EXTENDED REQUIREMENT INTERFACE
// ============================================

export interface ExtendedAchievementRequirement {
  type: ExtendedRequirementType;
  operator?: ">=" | ">" | "<=" | "<" | "==" | "!=" | "any" | "between";
  value: number | string | boolean;
  valueMax?: number; // For "between" operator
  segment?: Segment;
  region?: string;
  sustained?: number; // Number of consecutive rounds requirement must be met
  cumulative?: boolean; // Track cumulative value across rounds
  percentage?: boolean; // Value is a percentage (0-100 or 0-1)
  invert?: boolean; // Achievement triggers when requirement is NOT met (for infamy)
}

// ============================================
// EXTENDED ACHIEVEMENT INTERFACE
// ============================================

export interface ExtendedAchievement {
  id: string;
  name: string;
  description: string;

  // Categorization
  category: ExtendedAchievementCategory;
  tier: ExtendedAchievementTier;

  // Requirements
  requirements: ExtendedAchievementRequirement[];

  // Display
  icon?: string; // Lucide icon name
  flavor?: string; // Flavor text or quote

  // Behavior
  hidden: boolean; // Hidden until earned
  hiddenDescription?: string; // Shown before unlock (e.g., "???")
  isNegative: boolean; // Infamy achievement
  repeatable?: boolean; // Can be earned multiple times

  // Rewards
  reward?: ExtendedAchievementReward;

  // Difficulty scaling
  difficultyMultiplier?: Partial<Record<DifficultyLevel, number>>;

  // Metadata
  tags?: string[];
  relatedAchievements?: string[]; // IDs of related achievements
}

// ============================================
// EXTENDED REWARD INTERFACE
// ============================================

export interface ExtendedAchievementReward {
  type: "unlock" | "bonus" | "cosmetic" | "multiplier" | "title";
  value: string | number | Record<string, number>;
  description: string;
  permanent?: boolean; // Reward persists across games
}

// ============================================
// PROGRESS TRACKING
// ============================================

export interface ExtendedAchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  percentComplete: number;
  sustainedRounds?: number; // For sustained requirements
  history?: number[]; // Historical values per round
  unlocked: boolean;
  unlockedAt?: Date;
  unlockedRound?: number;
}

// ============================================
// EARNED ACHIEVEMENT
// ============================================

export interface ExtendedEarnedAchievement {
  achievementId: string;
  earnedRound: number;
  earnedAt: Date;
  pointsAwarded: number;
  difficultyAtEarn: DifficultyLevel;
  wasHidden: boolean;
}

// ============================================
// ACHIEVEMENT STATE
// ============================================

export interface ExtendedAchievementState {
  // Earned achievements
  earned: ExtendedEarnedAchievement[];

  // Progress tracking
  progress: ExtendedAchievementProgress[];

  // Points
  totalPoints: number;
  positivePoints: number;
  negativePoints: number;

  // Stats
  totalEarned: number;
  bronzeCount: number;
  silverCount: number;
  goldCount: number;
  platinumCount: number;
  infamyCount: number;
  secretCount: number;

  // Unlocks
  unlockedRewards: string[];
  unlockedTitles: string[];

  // Category completion
  categoryProgress: Record<ExtendedAchievementCategory, {
    earned: number;
    total: number;
    percentComplete: number;
  }>;
}

// ============================================
// ACHIEVEMENT CHECK RESULT
// ============================================

export interface ExtendedAchievementResult {
  state: ExtendedAchievementState;
  newAchievements: ExtendedAchievement[];
  newInfamyAchievements: ExtendedAchievement[];
  newSecretAchievements: ExtendedAchievement[];
  milestoneResults: MilestoneResult[];
  messages: AchievementMessage[];
  totalPointsEarned: number;
  pointsBreakdown: {
    positive: number;
    negative: number;
    net: number;
  };
}

// ============================================
// ACHIEVEMENT MESSAGE
// ============================================

export interface AchievementMessage {
  type: "unlock" | "infamy" | "secret" | "milestone" | "progress";
  achievementId?: string;
  title: string;
  description: string;
  points?: number;
  tier?: ExtendedAchievementTier;
  category?: ExtendedAchievementCategory;
  icon?: string;
}

// ============================================
// MILESTONE TYPES (Extended)
// ============================================

export interface ExtendedMilestone {
  id: string;
  name: string;
  description: string;
  targetRound: number;
  requirements: ExtendedAchievementRequirement[];
  bonusIfMet: MilestoneBonus;
  penaltyIfMissed: MilestonePenalty;
  category?: ExtendedAchievementCategory;
}

export interface MilestoneBonus {
  type: "sentiment" | "cash" | "brand" | "efficiency" | "morale" | "custom";
  value: number;
  description: string;
}

export interface MilestonePenalty {
  type: "sentiment" | "brand" | "morale" | "cash" | "custom";
  value: number;
  description: string;
}

export interface MilestoneResult {
  milestone: ExtendedMilestone;
  met: boolean;
  effect: MilestoneBonus | MilestonePenalty;
}

// ============================================
// ACHIEVEMENT DEFINITION HELPER
// ============================================

/**
 * Helper function to create an achievement definition with defaults
 */
export function defineAchievement(
  partial: Partial<ExtendedAchievement> & Pick<ExtendedAchievement, 'id' | 'name' | 'description' | 'category' | 'tier' | 'requirements'>
): ExtendedAchievement {
  return {
    hidden: partial.tier === 'secret',
    isNegative: partial.tier === 'infamy',
    ...partial,
  };
}

/**
 * Helper function to create a simple threshold requirement
 */
export function thresholdReq(
  type: ExtendedRequirementType,
  value: number,
  operator: ">=" | ">" | "<=" | "<" | "==" = ">="
): ExtendedAchievementRequirement {
  return { type, operator, value };
}

/**
 * Helper function to create a sustained requirement
 */
export function sustainedReq(
  type: ExtendedRequirementType,
  value: number,
  rounds: number,
  operator: ">=" | ">" | "<=" | "<" | "==" = ">="
): ExtendedAchievementRequirement {
  return { type, operator, value, sustained: rounds };
}

// ============================================
// POINT CALCULATIONS
// ============================================

export function getTierPoints(tier: ExtendedAchievementTier): number {
  return EXTENDED_TIER_CONFIG[tier].points;
}

export function calculateAchievementPoints(
  achievement: ExtendedAchievement,
  difficulty?: DifficultyLevel
): number {
  let points = getTierPoints(achievement.tier);

  if (difficulty && achievement.difficultyMultiplier?.[difficulty]) {
    points *= achievement.difficultyMultiplier[difficulty]!;
  }

  return Math.round(points);
}

// ============================================
// TYPE GUARDS
// ============================================

export function isInfamyAchievement(achievement: ExtendedAchievement): boolean {
  return achievement.tier === 'infamy' || achievement.isNegative;
}

export function isSecretAchievement(achievement: ExtendedAchievement): boolean {
  return achievement.tier === 'secret' || (achievement.hidden && achievement.category === 'secret');
}

export function isPositiveAchievement(achievement: ExtendedAchievement): boolean {
  return !isInfamyAchievement(achievement);
}
