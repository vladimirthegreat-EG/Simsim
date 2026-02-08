/**
 * Marketing Achievements
 *
 * 20 achievements total:
 * - 12 positive (Bronze: 2, Silver: 3, Gold: 4, Platinum: 3)
 * - 8 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const MARKETING_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "first_impression",
    name: "First Impression",
    description: "Allocate budget to your first advertising channel.",
    flavor: "The world now knows you exist. Whether they care is another matter.",
    category: "marketing",
    tier: "bronze",
    icon: "Megaphone",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Any ad spend
  }),

  defineAchievement({
    id: "digital_native",
    name: "Digital Native",
    description: "Invest in both Digital and Social media advertising.",
    flavor: "Welcome to the 21st century. Your banner ads are *chef's kiss*.",
    category: "marketing",
    tier: "bronze",
    icon: "Smartphone",
    requirements: [
      { type: "custom", operator: ">", value: 0 }, // Digital spend
      { type: "custom", operator: ">", value: 0 }, // Social spend
    ],
  }),

  // Silver
  defineAchievement({
    id: "full_spectrum",
    name: "Full Spectrum",
    description: "Run ads across all 4 channels — TV, Digital, Social, and Print.",
    flavor: "You're everywhere. Bathroom stalls are next.",
    category: "marketing",
    tier: "silver",
    icon: "Tv",
    requirements: [{ type: "custom", operator: "==", value: 4 }], // 4 channels active
  }),

  defineAchievement({
    id: "segment_sniper",
    name: "Segment Sniper",
    description: "Target all 5 market segments with active campaigns.",
    flavor: "No demographic is safe from your marketing department.",
    category: "marketing",
    tier: "silver",
    icon: "Target",
    requirements: [{ type: "custom", operator: "==", value: 5 }], // 5 segments targeted
  }),

  defineAchievement({
    id: "promo_overload",
    name: "Promo Overload",
    description: "Run discounts, bundles, AND loyalty programs simultaneously.",
    flavor: "Your customers are drowning in deals and they love it.",
    category: "marketing",
    tier: "silver",
    icon: "Percent",
    requirements: [
      { type: "custom", operator: ">", value: 0 }, // Discounts active
      { type: "custom", operator: ">", value: 0 }, // Bundles active
      { type: "custom", operator: ">", value: 0 }, // Loyalty active
    ],
  }),

  // Gold
  defineAchievement({
    id: "brand_titan",
    name: "Brand Titan",
    description: "Reach a brand value score of 80+.",
    flavor: "People don't buy your product — they buy your *vibe*.",
    category: "marketing",
    tier: "gold",
    icon: "Award",
    requirements: [thresholdReq("brand_value", 80)],
  }),

  defineAchievement({
    id: "loyalty_empire",
    name: "Loyalty Empire",
    description: "Enroll 10,000+ customers in your loyalty program.",
    flavor: "You've built an army. An army that collects points.",
    category: "marketing",
    tier: "gold",
    icon: "Users",
    requirements: [{ type: "custom", operator: ">=", value: 10000 }], // 10K loyalty members
  }),

  defineAchievement({
    id: "viral_moment",
    name: "Viral Moment",
    description: "Achieve highest brand awareness among all teams.",
    flavor: "Your marketing team doesn't run campaigns — they run *cultural events*.",
    category: "marketing",
    tier: "gold",
    icon: "Share2",
    requirements: [{ type: "brand_awareness", operator: "==", value: -1 }], // -1 = best
  }),

  defineAchievement({
    id: "roi_royalty",
    name: "ROI Royalty",
    description: "Achieve highest market share gain per dollar spent on marketing.",
    flavor: "Your ad budget doesn't spend — it *invests*.",
    category: "marketing",
    tier: "gold",
    icon: "TrendingUp",
    requirements: [{ type: "custom", operator: "==", value: -1 }], // Best ROI
  }),

  // Platinum
  defineAchievement({
    id: "iconic",
    name: "Iconic",
    description: "Reach brand value of 95+.",
    flavor: "You're not a company anymore. You're a *religion*.",
    category: "marketing",
    tier: "platinum",
    icon: "Star",
    requirements: [thresholdReq("brand_value", 95)],
  }),

  defineAchievement({
    id: "total_market_domination",
    name: "Total Market Domination",
    description: "Lead market share in 4+ segments simultaneously.",
    flavor: "The other teams aren't competitors — they're spectators.",
    category: "marketing",
    tier: "platinum",
    icon: "Crown",
    requirements: [thresholdReq("segments_led", 4)],
  }),

  defineAchievement({
    id: "segment_sweep",
    name: "Segment Sweep",
    description: "Hold #1 market share in ALL 5 segments at once.",
    flavor: "Every slice of the pie chart is yours. There is no pie. Only you.",
    category: "marketing",
    tier: "platinum",
    icon: "PieChart",
    requirements: [thresholdReq("segments_led", 5)],
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "who_are_you_again",
    name: "Who Are You Again?",
    description: "Have the lowest brand awareness among all teams.",
    flavor: "People don't dislike your brand — they genuinely don't know it exists. That's worse.",
    category: "marketing",
    tier: "infamy",
    icon: "HelpCircle",
    requirements: [{ type: "brand_awareness", operator: "==", value: -2 }], // -2 = worst
  }),

  defineAchievement({
    id: "money_bonfire",
    name: "Money Bonfire",
    description: "Spend $5M+ on marketing with zero measurable market share gain.",
    flavor: "You didn't advertise — you just made the ad industry richer.",
    category: "marketing",
    tier: "infamy",
    icon: "Flame",
    requirements: [
      { type: "total_marketing_spent", operator: ">=", value: 5_000_000 },
      { type: "custom", operator: "==", value: 0 }, // Zero share gain
    ],
  }),

  defineAchievement({
    id: "one_trick_pony",
    name: "One-Trick Pony",
    description: "Put your entire marketing budget into a single channel for 3+ quarters.",
    flavor: "Diversification is a word. Look it up.",
    category: "marketing",
    tier: "infamy",
    icon: "MinusCircle",
    requirements: [sustainedReq("custom", 1, 3, "==")], // 1 channel for 3 rounds
  }),

  defineAchievement({
    id: "discount_desperado",
    name: "Discount Desperado",
    description: "Run maximum discounts for 4 consecutive quarters.",
    flavor: "Your brand doesn't mean 'quality' anymore — it means 'clearance aisle.'",
    category: "marketing",
    tier: "infamy",
    icon: "Tag",
    requirements: [sustainedReq("custom", 100, 4)], // Max discount 4 rounds
  }),

  defineAchievement({
    id: "print_in_2026",
    name: "Print in 2026",
    description: "Allocate 80%+ of your ad budget to Print while competitors dominate Digital and Social.",
    flavor: "Bold strategy. The newspaper industry thanks you for keeping them alive.",
    category: "marketing",
    tier: "infamy",
    icon: "Newspaper",
    requirements: [{ type: "custom", operator: ">=", value: 80, percentage: true }], // 80% print
  }),

  defineAchievement({
    id: "the_invisible_man",
    name: "The Invisible Man",
    description: "Go 2+ quarters without any marketing spend whatsoever.",
    flavor: "Your products exist in a void. A dark, silent, unprofitable void.",
    category: "marketing",
    tier: "infamy",
    icon: "EyeOff",
    requirements: [sustainedReq("total_marketing_spent", 0, 2, "==")],
  }),

  defineAchievement({
    id: "loyalty_to_nobody",
    name: "Loyalty to Nobody",
    description: "Run a loyalty program for 3+ quarters with enrollment below 100 customers.",
    flavor: "It's not a loyalty program — it's a private club that nobody asked to join.",
    category: "marketing",
    tier: "infamy",
    icon: "UserMinus",
    requirements: [
      sustainedReq("custom", 1, 3), // Loyalty active 3 rounds
      { type: "custom", operator: "<", value: 100 }, // <100 members
    ],
  }),

  defineAchievement({
    id: "brand_erosion",
    name: "Brand Erosion",
    description: "Lose 20+ brand value points in a single quarter.",
    flavor: "Your brand didn't decline — it performed a controlled demolition.",
    category: "marketing",
    tier: "infamy",
    icon: "TrendingDown",
    requirements: [{ type: "custom", operator: ">=", value: 20 }], // 20 point drop
  }),
];

export default MARKETING_ACHIEVEMENTS;
