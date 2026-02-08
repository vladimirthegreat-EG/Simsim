/**
 * Results & Performance Achievements
 *
 * 16 achievements total:
 * - 10 positive (Bronze: 1, Silver: 3, Gold: 3, Platinum: 3)
 * - 6 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const RESULTS_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "report_card",
    name: "Report Card",
    description: "View your first quarterly results.",
    flavor: "Whether you celebrate or cry is between you and your spreadsheet.",
    category: "results",
    tier: "bronze",
    icon: "FileText",
    requirements: [thresholdReq("rounds_completed", 1)],
  }),

  // Silver
  defineAchievement({
    id: "growth_streak",
    name: "Growth Streak",
    description: "Increase revenue for 3 consecutive quarters.",
    flavor: "Up, up, and up. Your revenue chart is a stairway to heaven.",
    category: "results",
    tier: "silver",
    icon: "TrendingUp",
    requirements: [sustainedReq("consecutive_growth", 3, 3)],
  }),

  defineAchievement({
    id: "profit_machine",
    name: "Profit Machine",
    description: "Achieve 15%+ net profit margin.",
    flavor: "Your revenue doesn't just arrive — it *stays*.",
    category: "results",
    tier: "silver",
    icon: "DollarSign",
    requirements: [thresholdReq("profit_margin", 15)],
  }),

  defineAchievement({
    id: "mover_and_shaker",
    name: "Mover and Shaker",
    description: "Gain 5+ market share points in a single quarter.",
    flavor: "You didn't enter the market — you *invaded* it.",
    category: "results",
    tier: "silver",
    icon: "Zap",
    requirements: [{ type: "custom", operator: ">=", value: 5 }], // 5+ share points gained
  }),

  // Gold
  defineAchievement({
    id: "thirty_percent_club",
    name: "30% Club",
    description: "Hold 30%+ total market share.",
    flavor: "Almost a third of the entire market is yours. That's not competition — that's *occupation*.",
    category: "results",
    tier: "gold",
    icon: "PieChart",
    requirements: [thresholdReq("market_share_total", 30)],
  }),

  defineAchievement({
    id: "beat_the_street",
    name: "Beat the Street",
    description: "Outperform projected results 4 quarters in a row.",
    flavor: "Analysts hate this one simple trick. (The trick is being good.)",
    category: "results",
    tier: "gold",
    icon: "Award",
    requirements: [sustainedReq("custom", 1, 4)], // Beat projections 4 rounds
  }),

  defineAchievement({
    id: "comeback_trail",
    name: "Comeback Trail",
    description: "Recover from last place to top 3 within 3 quarters.",
    flavor: "Rocky Balboa called. He wants his storyline back.",
    category: "results",
    tier: "gold",
    icon: "RefreshCw",
    requirements: [{ type: "custom", operator: "==", value: "comeback" }], // Last to top 3
  }),

  // Platinum
  defineAchievement({
    id: "perfect_quarter",
    name: "Perfect Quarter",
    description: "Lead in revenue, market share, brand value, AND ESG in one quarter.",
    flavor: "This isn't a quarter — it's a *masterclass*. Frame it.",
    category: "results",
    tier: "platinum",
    icon: "Star",
    requirements: [
      { type: "custom", operator: "==", value: 1 }, // #1 revenue
      { type: "custom", operator: "==", value: 1 }, // #1 market share
      { type: "custom", operator: "==", value: 1 }, // #1 brand value
      { type: "custom", operator: "==", value: 1 }, // #1 ESG
    ],
  }),

  defineAchievement({
    id: "hall_of_fame",
    name: "Hall of Fame",
    description: "Finish the entire simulation ranked #1.",
    flavor: "History is written by the winners. You're holding the pen.",
    category: "results",
    tier: "platinum",
    icon: "Trophy",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      thresholdReq("final_ranking", 1, "=="),
    ],
  }),

  defineAchievement({
    id: "undefeated",
    name: "Undefeated",
    description: "Maintain #1 ranking for the entire game.",
    flavor: "They tried to take the throne. They failed. Every. Single. Time.",
    category: "results",
    tier: "platinum",
    icon: "Crown",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      { type: "custom", operator: "==", value: "always_first" },
    ],
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "participation_trophy",
    name: "Participation Trophy",
    description: "Finish the simulation in last place.",
    flavor: "You showed up. That's... something.",
    category: "results",
    tier: "infamy",
    icon: "Meh",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      { type: "final_ranking", operator: "==", value: -1 }, // -1 = last
    ],
  }),

  defineAchievement({
    id: "death_spiral",
    name: "Death Spiral",
    description: "Have revenue decline for 4 consecutive quarters.",
    flavor: "Your revenue chart isn't a line anymore — it's a farewell letter.",
    category: "results",
    tier: "infamy",
    icon: "TrendingDown",
    requirements: [sustainedReq("custom", -1, 4)], // Declining revenue 4 rounds
  }),

  defineAchievement({
    id: "comparison_is_the_thief_of_joy",
    name: "Comparison is the Thief of Joy",
    description: "Check the comparison tab while ranked last.",
    flavor: "You looked. You shouldn't have looked.",
    category: "results",
    tier: "infamy",
    icon: "Eye",
    requirements: [
      { type: "final_ranking", operator: "==", value: -1 }, // Last place
      { type: "custom", operator: ">=", value: 1 }, // Checked comparison
    ],
  }),

  defineAchievement({
    id: "consistently_terrible",
    name: "Consistently Terrible",
    description: "Rank last in 3+ different metrics simultaneously.",
    flavor: "You're not just losing — you're *comprehensively* losing.",
    category: "results",
    tier: "infamy",
    icon: "XCircle",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // Last in 3+ metrics
  }),

  defineAchievement({
    id: "the_flatline",
    name: "The Flatline",
    description: "Have zero revenue growth for 3 consecutive quarters.",
    flavor: "Your business isn't dying — it's just *frozen in time*, which is arguably worse.",
    category: "results",
    tier: "infamy",
    icon: "Minus",
    requirements: [sustainedReq("custom", 0, 3, "==")], // 0% growth 3 rounds
  }),

  defineAchievement({
    id: "margin_call",
    name: "Margin Call",
    description: "Have profit margins go negative while revenue is actually increasing.",
    flavor: "You're selling more and earning less. Somewhere, an economist is writing a paper about you.",
    category: "results",
    tier: "infamy",
    icon: "AlertTriangle",
    requirements: [
      { type: "custom", operator: ">", value: 0 }, // Revenue growth
      thresholdReq("profit_margin", 0, "<"), // Negative margin
    ],
  }),
];

export default RESULTS_ACHIEVEMENTS;
