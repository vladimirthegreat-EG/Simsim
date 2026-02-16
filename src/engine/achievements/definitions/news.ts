/**
 * News & Events Achievements
 *
 * 13 achievements total:
 * - 8 positive (Bronze: 1, Silver: 3, Gold: 2, Platinum: 2)
 * - 5 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const NEWS_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "informed_citizen",
    name: "Informed Citizen",
    description: "Read your first market news event.",
    flavor: "Knowledge is the first step. Panicking is the second.",
    category: "news",
    tier: "bronze",
    icon: "Newspaper",
    requirements: [{ type: "news_events", operator: ">=", value: 1 }], // Read 1 event
  }),

  // Silver
  defineAchievement({
    id: "storm_chaser",
    name: "Storm Chaser",
    description: "Maintain profitability through a supply crisis event.",
    flavor: "The storm came. You had an umbrella. And a backup umbrella.",
    category: "news",
    tier: "silver",
    icon: "CloudLightning",
    requirements: [
      { type: "custom", operator: "==", value: "supply_crisis" }, // Survived supply crisis
      thresholdReq("net_income", 0, ">"),
    ],
  }),

  defineAchievement({
    id: "riding_the_wave",
    name: "Riding the Wave",
    description: "Grow revenue 25%+ during a market boom.",
    flavor: "You didn't create the wave - but you surfed it like you did.",
    category: "news",
    tier: "silver",
    icon: "Waves",
    requirements: [
      { type: "custom", operator: "==", value: "boom" }, // During boom event
      { type: "custom", operator: ">=", value: 25, percentage: true }, // 25% growth
    ],
  }),

  defineAchievement({
    id: "quick_pivot",
    name: "Quick Pivot",
    description: "Adjust strategy within one quarter of a major market event.",
    flavor: "Adaptability isn't a skill - it's a survival instinct. Yours is sharp.",
    category: "news",
    tier: "silver",
    icon: "RotateCcw",
    requirements: [{ type: "custom", operator: "==", value: true }], // Fast adjustment
  }),

  // Gold
  defineAchievement({
    id: "recession_proof",
    name: "Recession-Proof",
    description: "Stay profitable through an entire recession event.",
    flavor: "While others panic, you profit. It's giving 'main character energy.'",
    category: "news",
    tier: "gold",
    icon: "Shield",
    requirements: [
      { type: "custom", operator: "==", value: "recession" }, // During recession
      sustainedReq("net_income", 0, 3, ">"), // Profitable throughout
    ],
  }),

  defineAchievement({
    id: "weathered_veteran",
    name: "Weathered Veteran",
    description: "Successfully navigate 5+ different market event types.",
    flavor: "Recession, boom, crisis, disruption - you've seen it all and your spreadsheets barely flinched.",
    category: "news",
    tier: "gold",
    icon: "Medal",
    requirements: [thresholdReq("events_weathered", 5)],
  }),

  // Platinum
  defineAchievement({
    id: "antifragile",
    name: "Antifragile",
    description: "GROW market share during a severe negative event.",
    flavor: "Chaos isn't your enemy - it's your business partner. Nassim Taleb just followed you.",
    category: "news",
    tier: "platinum",
    icon: "Flame",
    requirements: [
      { type: "custom", operator: "==", value: "crisis" }, // During crisis
      { type: "market_share", operator: ">", value: 0 }, // Gained share
    ],
  }),

  defineAchievement({
    id: "event_alchemist",
    name: "Event Alchemist",
    description: "Turn 3 negative events into growth opportunities.",
    flavor: "You don't dodge problems - you *monetize* them.",
    category: "news",
    tier: "platinum",
    icon: "Sparkles",
    requirements: [thresholdReq("opportunities_seized", 3)],
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "ostrich_strategy",
    name: "Ostrich Strategy",
    description: "Ignore a market event by making no strategic adjustments.",
    flavor: "You saw the iceberg. You maintained course. You are the captain of the Titanic's business plan.",
    category: "news",
    tier: "infamy",
    icon: "EyeOff",
    requirements: [{ type: "custom", operator: "==", value: true }], // No adjustments during event
  }),

  defineAchievement({
    id: "crisis_magnet",
    name: "Crisis Magnet",
    description: "Lose money during EVERY negative market event.",
    flavor: "At this point, bad news doesn't find you - it has your home address.",
    category: "news",
    tier: "infamy",
    icon: "Target",
    requirements: [{ type: "custom", operator: "==", value: "all_losses" }], // Lost during all crises
  }),

  defineAchievement({
    id: "boom_bust",
    name: "Boom Bust",
    description: "Somehow lose market share during a market boom.",
    flavor: "Everyone's winning except you. That takes a special kind of talent. The wrong kind.",
    category: "news",
    tier: "infamy",
    icon: "TrendingDown",
    requirements: [
      { type: "custom", operator: "==", value: "boom" }, // During boom
      { type: "market_share", operator: "<", value: 0 }, // Lost share
    ],
  }),

  defineAchievement({
    id: "panic_seller",
    name: "Panic Seller",
    description: "Slash all budgets immediately after a negative news event.",
    flavor: "Your strategy isn't 'reactive' - it's 'emotional.'",
    category: "news",
    tier: "infamy",
    icon: "AlertTriangle",
    requirements: [{ type: "custom", operator: "==", value: true }], // Budget slashing after event
  }),

  defineAchievement({
    id: "headline_blind",
    name: "Headline Blind",
    description: "Never filter or read news events by type.",
    flavor: "Your competitors are strategizing. You're *vibing*.",
    category: "news",
    tier: "infamy",
    icon: "Glasses",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      { type: "custom", operator: "==", value: 0 }, // Never filtered news
    ],
  }),
];

export default NEWS_ACHIEVEMENTS;
