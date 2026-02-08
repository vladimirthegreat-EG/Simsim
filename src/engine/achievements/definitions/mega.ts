/**
 * Mega Achievements (Cross-Department)
 *
 * 15 achievements total that require mastery (or disaster) across multiple departments.
 * - 8 positive (Gold: 3, Platinum: 5)
 * - 7 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const MEGA_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Gold
  defineAchievement({
    id: "vertical_integration",
    name: "Vertical Integration",
    description: "Gold achievement in Factory + Supply Chain + Logistics simultaneously.",
    flavor: "From raw material to customer doorstep, your pipeline is tighter than a drum solo.",
    category: "mega",
    tier: "gold",
    icon: "Link",
    requirements: [
      { type: "custom", operator: "==", value: "factory_gold" },
      { type: "custom", operator: "==", value: "supply_chain_gold" },
      { type: "custom", operator: "==", value: "logistics_gold" },
    ],
  }),

  defineAchievement({
    id: "people_and_profit",
    name: "People & Profit",
    description: "Top employee satisfaction + top net profit margin.",
    flavor: "You proved that treating workers well and making money aren't mutually exclusive. Revolutionary.",
    category: "mega",
    tier: "gold",
    icon: "Heart",
    requirements: [
      { type: "morale", operator: "==", value: -1 }, // Best satisfaction
      { type: "profit_margin", operator: "==", value: -1 }, // Best margin
    ],
  }),

  defineAchievement({
    id: "the_innovators_dream",
    name: "The Innovator's Dream",
    description: "Gold in R&D + Marketing + Results simultaneously.",
    flavor: "You built the product, told the world, and the world listened. This is the formula.",
    category: "mega",
    tier: "gold",
    icon: "Lightbulb",
    requirements: [
      { type: "custom", operator: "==", value: "rd_gold" },
      { type: "custom", operator: "==", value: "marketing_gold" },
      { type: "custom", operator: "==", value: "results_gold" },
    ],
  }),

  // Platinum
  defineAchievement({
    id: "the_conglomerate",
    name: "The Conglomerate",
    description: "Gold achievement in every single department.",
    flavor: "You didn't build a company — you built an *ecosystem*. MBA programs are updating their curriculum to include your playthrough.",
    category: "mega",
    tier: "platinum",
    icon: "Building",
    requirements: [{ type: "custom", operator: "==", value: "all_golds" }], // Gold in all departments
  }),

  defineAchievement({
    id: "sustainable_titan",
    name: "Sustainable Titan",
    description: "#1 market share + perfect ESG + highest employee satisfaction.",
    flavor: "Proof that you can win AND be a decent corporate citizen. Nobel Peace Prize pending.",
    category: "mega",
    tier: "platinum",
    icon: "Leaf",
    requirements: [
      thresholdReq("market_share_total", 1, "=="), // #1 share
      thresholdReq("esg_score", 1000), // Perfect ESG
      { type: "morale", operator: "==", value: -1 }, // Best satisfaction
    ],
  }),

  defineAchievement({
    id: "efficiency_paradox",
    name: "Efficiency Paradox",
    description: "Lowest total spending among all teams while maintaining top-3 ranking.",
    flavor: "You spent less than everyone and still beat them. Your competitors are checking you for cheat codes.",
    category: "mega",
    tier: "platinum",
    icon: "TrendingUp",
    requirements: [
      { type: "custom", operator: "==", value: "lowest_spend" },
      thresholdReq("final_ranking", 3, "<="),
    ],
  }),

  defineAchievement({
    id: "flawless_victory",
    name: "Flawless Victory",
    description: "Complete the simulation without earning a single Infamy achievement.",
    flavor: "You played the entire game without a single major mistake. Perfection isn't just a goal — it's your permanent address.",
    category: "mega",
    tier: "platinum",
    icon: "Shield",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      { type: "custom", operator: "==", value: 0 }, // 0 infamy achievements
    ],
  }),

  defineAchievement({
    id: "the_polymath",
    name: "The Polymath",
    description: "Earn at least one Silver+ achievement in every single category.",
    flavor: "There's no department you haven't touched. No metric you haven't improved. You're not a specialist — you're *everything*.",
    category: "mega",
    tier: "platinum",
    icon: "Sparkles",
    requirements: [{ type: "custom", operator: "==", value: "silver_all_categories" }],
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "corporate_villain",
    name: "Corporate Villain",
    description: "Lowest ESG + lowest employee satisfaction + highest profit margin.",
    flavor: "You made money. At what cost? *Gestures broadly at everything.* Congratulations, you're the final boss in a documentary.",
    category: "mega",
    tier: "infamy",
    icon: "Skull",
    requirements: [
      { type: "esg_score", operator: "==", value: -2 }, // Worst ESG
      { type: "morale", operator: "==", value: -2 }, // Worst satisfaction
      { type: "profit_margin", operator: "==", value: -1 }, // Best margin
    ],
  }),

  defineAchievement({
    id: "total_collapse",
    name: "Total Collapse",
    description: "Infamy achievements in 5+ departments simultaneously.",
    flavor: "Every department is on fire. Not metaphorically. HR is crying. Finance changed the locks. R&D left a resignation letter written in equations.",
    category: "mega",
    tier: "infamy",
    icon: "Flame",
    requirements: [{ type: "custom", operator: ">=", value: 5 }], // 5+ department infamy
  }),

  defineAchievement({
    id: "the_enron",
    name: "The Enron",
    description: "Highest revenue but negative net income for 3+ quarters.",
    flavor: "Revenue is vanity. Profit is sanity. You chose vanity. Aggressively.",
    category: "mega",
    tier: "infamy",
    icon: "DollarSign",
    requirements: [
      { type: "revenue", operator: "==", value: -1 }, // Best revenue
      sustainedReq("net_income", 0, 3, "<"), // Negative income 3 rounds
    ],
  }),

  defineAchievement({
    id: "beautiful_disaster",
    name: "Beautiful Disaster",
    description: "Highest brand value + lowest product quality.",
    flavor: "Your marketing team deserves a raise. Your R&D team deserves... a conversation.",
    category: "mega",
    tier: "infamy",
    icon: "Sparkle",
    requirements: [
      { type: "brand_value", operator: "==", value: -1 }, // Best brand
      { type: "quality_avg", operator: "==", value: -2 }, // Worst quality
    ],
  }),

  defineAchievement({
    id: "the_micromanager",
    name: "The Micromanager",
    description: "Check every single subtab in every single department in a single quarter.",
    flavor: "You looked at everything. Touched everything. Fixed nothing. But you were *very* busy.",
    category: "mega",
    tier: "infamy",
    icon: "Eye",
    requirements: [{ type: "custom", operator: "==", value: "all_tabs_viewed" }],
  }),

  defineAchievement({
    id: "the_bermuda_company",
    name: "The Bermuda Company",
    description: "Lose employees, inventory, AND cash simultaneously in one quarter.",
    flavor: "Things aren't just disappearing — they're *evaporating*. Your company is a black hole in a suit.",
    category: "mega",
    tier: "infamy",
    icon: "Triangle",
    requirements: [
      { type: "custom", operator: "<", value: 0 }, // Lost employees
      { type: "custom", operator: "<", value: 0 }, // Lost inventory
      { type: "custom", operator: "<", value: 0 }, // Lost cash
    ],
  }),

  defineAchievement({
    id: "anti_midas",
    name: "Anti-Midas",
    description: "Touch every department and make each one worse than it was before.",
    flavor: "Everything you touch turns to... the opposite of gold. Impressively consistent.",
    category: "mega",
    tier: "infamy",
    icon: "Hand",
    requirements: [{ type: "custom", operator: "==", value: "all_declining" }],
  }),

  defineAchievement({
    id: "trophy_collector_of_shame",
    name: "Trophy Collector of Shame",
    description: "Earn 10+ Infamy achievements in a single playthrough.",
    flavor: "You didn't just fail — you assembled a *museum* of failure. Guided tours available on request.",
    category: "mega",
    tier: "infamy",
    icon: "Trophy",
    requirements: [{ type: "custom", operator: ">=", value: 10 }], // 10+ infamy achievements
  }),
];

export default MEGA_ACHIEVEMENTS;
