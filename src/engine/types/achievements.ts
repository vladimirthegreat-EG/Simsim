/**
 * Achievement system types for the Business Simulation Engine
 *
 * Victory condition: highest Achievement Score wins.
 * Score = sum of unlocked achievement points where category ≠ "Bad" and Infamy = 0 points.
 */

// ============================================
// ACHIEVEMENT CATEGORIES
// ============================================

export type AchievementCategory =
  | "Innovation" // 5-50 pts - R&D and tech mastery
  | "Market" // 5-40 pts - market share and segment dominance
  | "Financial" // 5-30 pts - profitability and efficiency
  | "Strategic" // 10-50 pts - long-term planning, patents, combos
  | "Milestone" // 5-20 pts - reaching thresholds
  | "Infamy" // 0 pts - tracked but neutral
  | "Bad"; // 0 pts (excluded) - shame only

// ============================================
// ACHIEVEMENT DEFINITION
// ============================================

export interface AchievementDefinition {
  id: string;
  name: string;
  category: AchievementCategory;
  points: number; // 0 for Infamy and Bad
  description: string;
  /** Plain-English explanation of what this means in business terms */
  businessMeaning?: string;
}

// ============================================
// UNLOCKED ACHIEVEMENT (on a team)
// ============================================

export interface UnlockedAchievement {
  id: string;
  roundUnlocked: number;
  /** Points contributed to score (0 for Bad/Infamy) */
  points: number;
}

// ============================================
// VICTORY RESOLUTION
// ============================================

export interface VictoryResult {
  rankings: VictoryRanking[];
}

export interface VictoryRanking {
  teamId: string;
  teamName: string;
  rank: number;
  achievementScore: number;
  achievementCount: number;
  tiebreaker_revenue: number;
  tiebreaker_marketShare: number;
}

// ============================================
// ALL ACHIEVEMENT DEFINITIONS (from design doc Section 7.3)
// ============================================

export const ALL_ACHIEVEMENTS: AchievementDefinition[] = [
  // --- Tech Tree Achievements (Innovation) ---
  {
    id: "tech_first_t1",
    name: "First Steps",
    category: "Innovation",
    points: 5,
    description: "Complete any Tier 1 research",
  },
  {
    id: "tech_full_family",
    name: "Specialist",
    category: "Innovation",
    points: 20,
    description: "Unlock all 9 nodes in one tech family",
  },
  {
    id: "tech_two_families",
    name: "Dual Specialist",
    category: "Innovation",
    points: 30,
    description: "Unlock all nodes in two tech families",
  },
  {
    id: "tech_tier5",
    name: "Breakthrough",
    category: "Innovation",
    points: 25,
    description: "Unlock any Tier 5 technology",
  },
  {
    id: "tech_all_tier5",
    name: "Visionary",
    category: "Innovation",
    points: 50,
    description: "Unlock all six Tier 5 technologies",
  },
  {
    id: "tech_cross_family",
    name: "Synergist",
    category: "Innovation",
    points: 15,
    description: "Trigger 3+ cross-family bonus effects",
  },
  {
    id: "tech_speed_t3",
    name: "Fast Learner",
    category: "Innovation",
    points: 15,
    description: "Reach any Tier 3 tech by Round 4",
  },
  {
    id: "tech_both_paths",
    name: "Hedged Bets",
    category: "Strategic",
    points: 10,
    description: "Unlock both a/b paths in same family at Tier 2+",
  },
  {
    id: "tech_first_in_game",
    name: "Pioneer",
    category: "Strategic",
    points: 20,
    description: "First team to unlock a specific Tier 4+ tech",
  },

  // --- Archetype Achievements ---
  {
    id: "arch_first_phone",
    name: "Phone Maker",
    category: "Milestone",
    points: 5,
    description: "Create first phone from any archetype",
  },
  {
    id: "arch_5_types",
    name: "Product Line",
    category: "Market",
    points: 15,
    description: "Have 5 different archetypes on market simultaneously",
  },
  {
    id: "arch_flagship",
    name: "Flagship Launch",
    category: "Innovation",
    points: 20,
    description: "Create a Tier 4+ archetype phone",
  },
  {
    id: "arch_quantum",
    name: "Quantum Leap",
    category: "Innovation",
    points: 30,
    description: "Create a Quantum Phone",
  },
  {
    id: "arch_segment_sweep",
    name: "Segment Sweep",
    category: "Market",
    points: 25,
    description: "Have a product in every segment simultaneously",
  },
  {
    id: "arch_peoples_champ",
    name: "People's Champion",
    category: "Market",
    points: 20,
    description: "Create People's Phone with >30% Budget share",
  },
  {
    id: "arch_tradeoff",
    name: "Tradeoff Master",
    category: "Strategic",
    points: 15,
    description: "Product with tradeoff still captures >15% share",
  },

  // --- Feature Demand Achievements ---
  {
    id: "feat_perfect_match",
    name: "Perfect Fit",
    category: "Market",
    points: 20,
    description: "Achieve >90% feature-segment match score",
  },
  {
    id: "feat_multi_match",
    name: "Market Reader",
    category: "Market",
    points: 30,
    description: ">80% feature match across 3+ segments",
  },
  {
    id: "feat_dominate_family",
    name: "Category King",
    category: "Market",
    points: 25,
    description: "Highest score in a tech family across all products in segment",
  },
  {
    id: "feat_balanced",
    name: "Jack of All Trades",
    category: "Strategic",
    points: 15,
    description: "All six features within 15 points of each other",
  },

  // --- Dynamic Pricing Achievements ---
  {
    id: "price_undercut",
    name: "Price War Victor",
    category: "Market",
    points: 15,
    description: "Gain >10% share by underpricing for 3+ rounds",
  },
  {
    id: "price_premium",
    name: "Premium Brand",
    category: "Financial",
    points: 25,
    description: "Price >20% above expected, still hold >15% share",
  },
  {
    id: "price_opportunist",
    name: "Opportunity Knocks",
    category: "Strategic",
    points: 20,
    description: "Enter underserved segment, capture >20% in 2 rounds",
  },
  {
    id: "price_margin_king",
    name: "Margin King",
    category: "Financial",
    points: 20,
    description: ">35% profit margin for 4+ consecutive rounds",
  },
  {
    id: "price_destroyer",
    name: "Price Destroyer",
    category: "Infamy",
    points: 0,
    description: "Crash segment expected price by >25%",
  },

  // --- Patent Achievements ---
  {
    id: "pat_first_filed",
    name: "Intellectual Property",
    category: "Innovation",
    points: 10,
    description: "File your first patent",
  },
  {
    id: "pat_portfolio",
    name: "Patent Portfolio",
    category: "Strategic",
    points: 25,
    description: "Hold 5+ active patents simultaneously",
  },
  {
    id: "pat_licensing_rev",
    name: "Licensing Mogul",
    category: "Financial",
    points: 30,
    description: "Earn >$50M cumulative licensing revenue",
  },
  {
    id: "pat_blocked",
    name: "Patent Troll",
    category: "Infamy",
    points: 0,
    description: "Block 3+ competitors in a single round",
  },
  {
    id: "pat_challenged_won",
    name: "Patent Defender",
    category: "Strategic",
    points: 15,
    description: "Successfully defend against a patent challenge",
  },
  {
    id: "pat_challenged_lost",
    name: "Invalidated",
    category: "Bad",
    points: 0,
    description: "Have a patent invalidated by challenge",
  },
  {
    id: "pat_monopoly",
    name: "Tech Monopolist",
    category: "Strategic",
    points: 35,
    description: "Hold patents in 4+ different tech families",
  },
  {
    id: "pat_generous",
    name: "Open Innovator",
    category: "Strategic",
    points: 20,
    description: "License a patent to every other team",
  },

  // --- Competitive / PvP Achievements ---
  {
    id: "pvp_steal_share",
    name: "Market Raider",
    category: "Market",
    points: 20,
    description: "Take >15% share from a competitor in 2 rounds",
  },
  {
    id: "pvp_displace_leader",
    name: "Dethroned",
    category: "Market",
    points: 30,
    description: "Overtake the #1 team in any segment",
  },
  {
    id: "pvp_monopoly",
    name: "Monopolist",
    category: "Market",
    points: 40,
    description: "Control >50% share in any segment",
  },
  {
    id: "pvp_diversified",
    name: "Diversified Empire",
    category: "Strategic",
    points: 35,
    description: "Hold >15% share in 4+ segments",
  },
  {
    id: "pvp_comeback",
    name: "Comeback Kid",
    category: "Strategic",
    points: 25,
    description: "Go from last place to top 2 within 4 rounds",
  },
  {
    id: "pvp_bankrupt",
    name: "Ruthless",
    category: "Infamy",
    points: 0,
    description: "Primary cause of a competitor going negative on cash",
  },

  // --- Bad Achievements ---
  {
    id: "bad_no_product",
    name: "Empty Shelves",
    category: "Bad",
    points: 0,
    description: "No products on market by Round 5",
  },
  {
    id: "bad_zero_share",
    name: "Invisible",
    category: "Bad",
    points: 0,
    description: "0% share in all segments for 3+ rounds",
  },
  {
    id: "bad_cash_negative",
    name: "In the Red",
    category: "Bad",
    points: 0,
    description: "Go negative on cash",
  },
  {
    id: "bad_no_research",
    name: "Luddite",
    category: "Bad",
    points: 0,
    description: "No research for 6+ consecutive rounds",
  },
  {
    id: "bad_overspend",
    name: "R&D Money Pit",
    category: "Bad",
    points: 0,
    description: "Spend >60% of revenue on R&D in a single round",
  },
  {
    id: "bad_patent_fail",
    name: "Frivolous Filer",
    category: "Bad",
    points: 0,
    description: "File 3+ patents and never license any",
  },
];

/**
 * Calculate achievement score: sum of points excluding Bad, Infamy = 0.
 */
export function calculateAchievementScore(
  unlockedAchievements: UnlockedAchievement[]
): number {
  return unlockedAchievements.reduce((sum, a) => sum + a.points, 0);
}
