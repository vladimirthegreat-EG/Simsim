/**
 * Logistics Achievements
 *
 * 13 achievements total:
 * - 9 positive (Bronze: 2, Silver: 3, Gold: 2, Platinum: 2)
 * - 4 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const LOGISTICS_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "map_nerd",
    name: "Map Nerd",
    description: "Use the route comparison tool for the first time.",
    flavor: "Knowledge is power. Knowing shipping routes is *cost savings*.",
    category: "logistics",
    tier: "bronze",
    icon: "Map",
    requirements: [{ type: "custom", operator: ">=", value: 1 }], // Route comparison used
  }),

  defineAchievement({
    id: "calculator_curious",
    name: "Calculator Curious",
    description: "Use the logistics cost calculator.",
    flavor: "You ran the numbers. The numbers ran back.",
    category: "logistics",
    tier: "bronze",
    icon: "Calculator",
    requirements: [{ type: "custom", operator: ">=", value: 1 }], // Calculator used
  }),

  // Silver
  defineAchievement({
    id: "reliable_shipper",
    name: "Reliable Shipper",
    description: "Maintain 95%+ delivery reliability for 2 quarters.",
    flavor: "Your packages arrive on time. Like a responsible adult.",
    category: "logistics",
    tier: "silver",
    icon: "CheckCircle",
    requirements: [sustainedReq("delivery_rate", 95, 2)],
  }),

  defineAchievement({
    id: "speed_demon",
    name: "Speed Demon",
    description: "Choose the fastest shipping method for 5+ orders.",
    flavor: "Patience is a virtue. But not one your supply chain has.",
    category: "logistics",
    tier: "silver",
    icon: "Zap",
    requirements: [{ type: "custom", operator: ">=", value: 5 }], // 5 fast shipments
  }),

  defineAchievement({
    id: "route_scholar",
    name: "Route Scholar",
    description: "Compare routes for 10+ different shipments.",
    flavor: "You've memorized more shipping lanes than most captains.",
    category: "logistics",
    tier: "silver",
    icon: "GraduationCap",
    requirements: [{ type: "custom", operator: ">=", value: 10 }], // 10 route comparisons
  }),

  // Gold
  defineAchievement({
    id: "cost_whisperer",
    name: "Cost Whisperer",
    description: "Reduce average shipping cost by 30%.",
    flavor: "You negotiated with freight companies like your rent depended on it. It kinda did.",
    category: "logistics",
    tier: "gold",
    icon: "TrendingDown",
    requirements: [{ type: "custom", operator: ">=", value: 30, percentage: true }], // 30% reduction
  }),

  defineAchievement({
    id: "port_collector",
    name: "Port Collector",
    description: "Utilize 5+ different ports.",
    flavor: "You have a favorite port. That's either impressive or deeply concerning.",
    category: "logistics",
    tier: "gold",
    icon: "Anchor",
    requirements: [{ type: "custom", operator: ">=", value: 5 }], // 5 ports used
  }),

  // Platinum
  defineAchievement({
    id: "clockwork_deliveries",
    name: "Clockwork Deliveries",
    description: "Achieve 99%+ delivery reliability for 4 consecutive quarters.",
    flavor: "Your logistics don't have delays. They have *early arrivals*.",
    category: "logistics",
    tier: "platinum",
    icon: "Clock",
    requirements: [sustainedReq("delivery_rate", 99, 4)],
  }),

  defineAchievement({
    id: "logistics_savant",
    name: "Logistics Savant",
    description: "Achieve lowest cost AND highest reliability simultaneously among all teams.",
    flavor: "Other supply chain managers study your routes like ancient texts.",
    category: "logistics",
    tier: "platinum",
    icon: "Brain",
    requirements: [
      { type: "shipping_cost", operator: "==", value: -1 }, // -1 = best (lowest)
      { type: "delivery_rate", operator: "==", value: -1 }, // -1 = best (highest)
    ],
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "the_long_way_around",
    name: "The Long Way Around",
    description: "Consistently choose the most expensive shipping routes.",
    flavor: "Your cargo is on a scenic tour of the world's most expensive freight lanes.",
    category: "logistics",
    tier: "infamy",
    icon: "Route",
    requirements: [{ type: "shipping_cost", operator: "==", value: -2 }], // -2 = worst
  }),

  defineAchievement({
    id: "lost_in_transit",
    name: "Lost in Transit",
    description: "Have delivery reliability drop below 60%.",
    flavor: "Your customers are tracking packages that are currently having an existential crisis somewhere in the Pacific.",
    category: "logistics",
    tier: "infamy",
    icon: "MapPin",
    requirements: [thresholdReq("delivery_rate", 60, "<")],
  }),

  defineAchievement({
    id: "logistics_what_logistics",
    name: "Logistics? What Logistics?",
    description: "Never use the route comparison or cost calculator tools.",
    flavor: "You chose shipping routes the same way you choose restaurants — vibes only.",
    category: "logistics",
    tier: "infamy",
    icon: "HelpCircle",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      { type: "custom", operator: "==", value: 0 }, // Never used tools
    ],
  }),

  defineAchievement({
    id: "port_loyalty",
    name: "Port Loyalty",
    description: "Use the same single port for every single shipment all game.",
    flavor: "You're not optimizing — you're *attached*.",
    category: "logistics",
    tier: "infamy",
    icon: "Heart",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      { type: "custom", operator: "==", value: 1 }, // Only 1 port ever used
    ],
  }),
];

export default LOGISTICS_ACHIEVEMENTS;
