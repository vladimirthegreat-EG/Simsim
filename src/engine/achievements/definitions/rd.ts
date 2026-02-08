/**
 * R&D Achievements
 *
 * 21 achievements total:
 * - 13 positive (Bronze: 2, Silver: 4, Gold: 4, Platinum: 3)
 * - 8 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const RD_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "eureka",
    name: "Eureka!",
    description: "Begin developing your first product.",
    flavor: "The whiteboard has diagrams. The engineers have coffee. Science is happening.",
    category: "rd",
    tier: "bronze",
    icon: "Lightbulb",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Product in development
  }),

  defineAchievement({
    id: "patent_pending",
    name: "Patent Pending",
    description: "File your first patent.",
    flavor: "You've officially told the world, \"This idea? *Mine.*\"",
    category: "rd",
    tier: "bronze",
    icon: "FileCheck",
    requirements: [{ type: "custom", operator: ">=", value: 1 }], // 1+ patents
  }),

  // Silver
  defineAchievement({
    id: "battery_breakthrough",
    name: "Battery Breakthrough",
    description: "Complete the Battery tech upgrade.",
    flavor: "Your products now last longer than your competitors' entire business plans.",
    category: "rd",
    tier: "silver",
    icon: "Battery",
    requirements: [{ type: "custom", operator: "==", value: "battery" }],
  }),

  defineAchievement({
    id: "pixel_perfect",
    name: "Pixel Perfect",
    description: "Complete the Display tech upgrade.",
    flavor: "Your screens are so sharp they make people question their own eyesight.",
    category: "rd",
    tier: "silver",
    icon: "Monitor",
    requirements: [{ type: "custom", operator: "==", value: "display" }],
  }),

  defineAchievement({
    id: "sentient_products",
    name: "Sentient Products",
    description: "Complete the AI tech upgrade.",
    flavor: "Your products are smart enough to give TED Talks.",
    category: "rd",
    tier: "silver",
    icon: "Brain",
    requirements: [{ type: "custom", operator: "==", value: "ai" }],
  }),

  defineAchievement({
    id: "speed_to_market",
    name: "Speed to Market",
    description: "Develop and launch a product in the shortest possible time.",
    flavor: "Your R&D team doesn't do research — they do speedruns.",
    category: "rd",
    tier: "silver",
    icon: "Zap",
    requirements: [{ type: "custom", operator: "==", value: "fastest" }], // Fastest development
  }),

  // Gold
  defineAchievement({
    id: "product_empire",
    name: "Product Empire",
    description: "Have 5+ products in your active lineup.",
    flavor: "You don't have a product line — you have a product *continent*.",
    category: "rd",
    tier: "gold",
    icon: "Package",
    requirements: [thresholdReq("products", 5)],
  }),

  defineAchievement({
    id: "patent_fortress",
    name: "Patent Fortress",
    description: "Hold 10+ active patents.",
    flavor: "Competitors don't just compete with you — they navigate your legal minefield.",
    category: "rd",
    tier: "gold",
    icon: "Shield",
    requirements: [{ type: "custom", operator: ">=", value: 10 }], // 10+ patents
  }),

  defineAchievement({
    id: "masterpiece",
    name: "Masterpiece",
    description: "Launch a product with a 90+ quality score.",
    flavor: "This isn't a product — it's a *manifesto*.",
    category: "rd",
    tier: "gold",
    icon: "Award",
    requirements: [thresholdReq("quality_max", 90)],
  }),

  defineAchievement({
    id: "segment_specialist",
    name: "Segment Specialist",
    description: "Launch a top-rated product in 3 different segments.",
    flavor: "Your R&D team doesn't have a specialty — they have a *spectrum*.",
    category: "rd",
    tier: "gold",
    icon: "BarChart3",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3 segments with top products
  }),

  // Platinum
  defineAchievement({
    id: "tech_singularity",
    name: "Tech Singularity",
    description: "Complete ALL 3 technology upgrades (Battery, Display, AI).",
    flavor: "You've unlocked the tech tree. The final boss is innovation itself.",
    category: "rd",
    tier: "platinum",
    icon: "Atom",
    requirements: [
      { type: "custom", operator: "==", value: "battery" },
      { type: "custom", operator: "==", value: "display" },
      { type: "custom", operator: "==", value: "ai" },
    ],
  }),

  defineAchievement({
    id: "innovation_engine",
    name: "Innovation Engine",
    description: "Launch 3 products with 90+ quality scores in different segments.",
    flavor: "Your R&D lab doesn't develop products — it generates *legacies*.",
    category: "rd",
    tier: "platinum",
    icon: "Sparkles",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3 products at 90+ quality
  }),

  defineAchievement({
    id: "the_full_package",
    name: "The Full Package",
    description: "Launch a product that maxes out quality, features, AND hits its price target.",
    flavor: "The trifecta. The unicorn. Your engineers wept with pride.",
    category: "rd",
    tier: "platinum",
    icon: "Trophy",
    requirements: [
      thresholdReq("quality_max", 95),
      { type: "product_features", operator: ">=", value: 95 },
      { type: "custom", operator: "==", value: true }, // Hit price target
    ],
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "intellectual_desert",
    name: "Intellectual Desert",
    description: "Reach the final quarter with zero patents filed.",
    flavor: "Your R&D department is just an R department. Actually, not even that.",
    category: "rd",
    tier: "infamy",
    icon: "FileX",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      { type: "custom", operator: "==", value: 0 }, // 0 patents
    ],
  }),

  defineAchievement({
    id: "copycat_inc",
    name: "Copycat Inc.",
    description: "Launch 3+ products with below-50 quality scores.",
    flavor: "You're not innovating — you're just rearranging existing disappointment.",
    category: "rd",
    tier: "infamy",
    icon: "Copy",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3 products <50 quality
  }),

  defineAchievement({
    id: "one_hit_blunder",
    name: "One-Hit Blunder",
    description: "Only ever launch a single product and have it fail.",
    flavor: "You swung once. You missed. The crowd went home.",
    category: "rd",
    tier: "infamy",
    icon: "XCircle",
    requirements: [
      thresholdReq("products_launched", 1, "=="),
      { type: "custom", operator: "==", value: "failed" }, // Product failed
    ],
  }),

  defineAchievement({
    id: "stone_age_tech",
    name: "Stone Age Tech",
    description: "Never purchase a single technology upgrade.",
    flavor: "Your competitors have AI-powered displays with all-day batteries and you're out here with a calculator and a dream.",
    category: "rd",
    tier: "infamy",
    icon: "Archive",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      { type: "tech_level", operator: "==", value: 0 },
    ],
  }),

  defineAchievement({
    id: "feature_creep_victim",
    name: "Feature Creep Victim",
    description: "Set maximum feature targets with minimum quality, resulting in a product nobody wants.",
    flavor: "You built a Swiss Army knife that can't cut butter.",
    category: "rd",
    tier: "infamy",
    icon: "Layers",
    requirements: [
      { type: "product_features", operator: ">=", value: 90 },
      thresholdReq("quality_min", 40, "<"),
    ],
  }),

  defineAchievement({
    id: "rd_budget_went_where",
    name: "The R&D Budget Went Where?",
    description: "Spend $10M+ on R&D with no successful product launches to show for it.",
    flavor: "Your lab discovered exactly one thing: how to waste money.",
    category: "rd",
    tier: "infamy",
    icon: "DollarSign",
    requirements: [
      thresholdReq("total_rd_spent", 10_000_000),
      thresholdReq("products_launched", 0, "=="),
    ],
  }),

  defineAchievement({
    id: "vaporware",
    name: "Vaporware",
    description: "Announce 3+ products that never finish development.",
    flavor: "You sell promises, not products. Silicon Valley would be proud.",
    category: "rd",
    tier: "infamy",
    icon: "Cloud",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3 cancelled products
  }),

  defineAchievement({
    id: "abandoned_lab",
    name: "Abandoned Lab",
    description: "Start product development and cancel it before completion 3+ times.",
    flavor: "Your R&D team has commitment issues.",
    category: "rd",
    tier: "infamy",
    icon: "Trash2",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3 cancellations
  }),
];

export default RD_ACHIEVEMENTS;
