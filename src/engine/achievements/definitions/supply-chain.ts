/**
 * Supply Chain Achievements
 *
 * 19 achievements total:
 * - 11 positive (Bronze: 2, Silver: 4, Gold: 3, Platinum: 2)
 * - 8 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const SUPPLY_CHAIN_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "procurement_rookie",
    name: "Procurement Rookie",
    description: "Place your first material order.",
    flavor: "You've entered the supply chain. There's no going back. Only lead times.",
    category: "supply_chain",
    tier: "bronze",
    icon: "ShoppingCart",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Any order placed
  }),

  defineAchievement({
    id: "globe_trotter",
    name: "Globe Trotter",
    description: "Source materials from 2+ different regions.",
    flavor: "Your supply chain has more stamps in its passport than you do.",
    category: "supply_chain",
    tier: "bronze",
    icon: "Globe",
    requirements: [{ type: "custom", operator: ">=", value: 2 }], // 2+ regions
  }),

  // Silver
  defineAchievement({
    id: "the_captain",
    name: "The Captain",
    description: "Ship an order via sea freight.",
    flavor: "Slow, steady, and suspiciously affordable. Like a cruise, but for circuit boards.",
    category: "supply_chain",
    tier: "silver",
    icon: "Ship",
    requirements: [{ type: "custom", operator: "==", value: "sea" }],
  }),

  defineAchievement({
    id: "need_for_speed",
    name: "Need for Speed",
    description: "Ship an order via air freight.",
    flavor: "Your materials arrive before your purchase order does.",
    category: "supply_chain",
    tier: "silver",
    icon: "Plane",
    requirements: [{ type: "custom", operator: "==", value: "air" }],
  }),

  defineAchievement({
    id: "multimodal_maestro",
    name: "Multimodal Maestro",
    description: "Use all 4 shipping methods - sea, air, land, and rail.",
    flavor: "Your logistics team doesn't have a preference - they have a *portfolio*.",
    category: "supply_chain",
    tier: "silver",
    icon: "Network",
    requirements: [{ type: "custom", operator: "==", value: 4 }], // 4 methods used
  }),

  defineAchievement({
    id: "savvy_shopper",
    name: "Savvy Shopper",
    description: "Switch suppliers to get a lower price on the same material without sacrificing quality.",
    flavor: "Negotiation is an art. You're Picasso.",
    category: "supply_chain",
    tier: "silver",
    icon: "BadgeDollarSign",
    requirements: [{ type: "custom", operator: "==", value: true }], // Successful switch
  }),

  // Gold
  defineAchievement({
    id: "just_in_time",
    name: "Just In Time",
    description: "Maintain optimal inventory levels for 3 consecutive quarters.",
    flavor: "Toyota just sent you a respectful nod.",
    category: "supply_chain",
    tier: "gold",
    icon: "Clock",
    requirements: [sustainedReq("custom", 1, 3)], // Optimal inventory 3 rounds
  }),

  defineAchievement({
    id: "supplier_rolodex",
    name: "Supplier Rolodex",
    description: "Have active orders from 4+ different suppliers.",
    flavor: "If one supplier sneezes, your supply chain says 'bless you' and keeps moving.",
    category: "supply_chain",
    tier: "gold",
    icon: "BookOpen",
    requirements: [thresholdReq("supplier_count", 4)],
  }),

  defineAchievement({
    id: "silk_road",
    name: "Silk Road",
    description: "Source materials from every available region at least once.",
    flavor: "Marco Polo would be jealous.",
    category: "supply_chain",
    tier: "gold",
    icon: "Map",
    requirements: [{ type: "custom", operator: "==", value: "all_regions" }],
  }),

  // Platinum
  defineAchievement({
    id: "supply_chain_ninja",
    name: "Supply Chain Ninja",
    description: "Achieve lowest supply chain cost per unit among all teams.",
    flavor: "Your logistics are so lean they make a marathon runner look bloated.",
    category: "supply_chain",
    tier: "platinum",
    icon: "Swords",
    requirements: [{ type: "shipping_cost", operator: "==", value: -1 }], // -1 = best
  }),

  defineAchievement({
    id: "zero_stockouts",
    name: "Zero Stockouts",
    description: "Never run out of inventory for 6 consecutive quarters.",
    flavor: "Your warehouse is a temple of preparedness.",
    category: "supply_chain",
    tier: "platinum",
    icon: "CheckCircle",
    requirements: [sustainedReq("inventory_level", 1, 6, ">")], // >0 inventory for 6 rounds
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "empty_shelves",
    name: "Empty Shelves",
    description: "Run out of inventory causing production to halt.",
    flavor: "Your factory is running beautifully. There's just... nothing to build with.",
    category: "supply_chain",
    tier: "infamy",
    icon: "PackageX",
    requirements: [thresholdReq("inventory_level", 0, "==")],
  }),

  defineAchievement({
    id: "single_point_of_failure",
    name: "Single Point of Failure",
    description: "Source 100% of materials from a single supplier for 3+ quarters.",
    flavor: "When they sneeze, you get hospitalized.",
    category: "supply_chain",
    tier: "infamy",
    icon: "AlertTriangle",
    requirements: [sustainedReq("supplier_count", 1, 3, "==")],
  }),

  defineAchievement({
    id: "hoarder",
    name: "Hoarder",
    description: "Accumulate 3x more inventory than needed, incurring massive holding costs.",
    flavor: "Your warehouse has its own zip code now.",
    category: "supply_chain",
    tier: "infamy",
    icon: "Warehouse",
    requirements: [{ type: "inventory_level", operator: ">=", value: 300, percentage: true }], // 300% of need
  }),

  defineAchievement({
    id: "air_freight_addict",
    name: "Air Freight Addict",
    description: "Ship everything via air freight for 4 consecutive quarters.",
    flavor: "Your shipping costs have their own line item on the income statement. It's the biggest line.",
    category: "supply_chain",
    tier: "infamy",
    icon: "Plane",
    requirements: [sustainedReq("custom", 100, 4)], // 100% air freight 4 rounds
  }),

  defineAchievement({
    id: "the_bottleneck",
    name: "The Bottleneck",
    description: "Have 3+ orders delayed simultaneously.",
    flavor: "Your supply chain isn't a chain - it's a knot.",
    category: "supply_chain",
    tier: "infamy",
    icon: "Timer",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3+ delayed orders
  }),

  defineAchievement({
    id: "forgot_to_order",
    name: "Forgot to Order",
    description: "Go an entire quarter without placing any material orders while production needs were critical.",
    flavor: "Your factory called. It's hungry.",
    category: "supply_chain",
    tier: "infamy",
    icon: "Bell",
    requirements: [
      { type: "custom", operator: "==", value: 0 }, // 0 orders
      thresholdReq("inventory_level", 20, "<"), // Critical inventory
    ],
  }),

  defineAchievement({
    id: "wrong_everything",
    name: "Wrong Everything",
    description: "Order the wrong materials, from the wrong region, with the wrong shipping method.",
    flavor: "The supply chain Triple Crown of Failure. Your procurement team should be studied.",
    category: "supply_chain",
    tier: "infamy",
    icon: "XOctagon",
    requirements: [{ type: "custom", operator: "==", value: "triple_fail" }],
  }),

  defineAchievement({
    id: "spoilage_king",
    name: "Spoilage King",
    description: "Let inventory expire or become obsolete due to overstocking.",
    flavor: "You didn't just waste money - you wasted money *and* warehouse space. Impressive.",
    category: "supply_chain",
    tier: "infamy",
    icon: "Trash",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Any spoilage
  }),
];

export default SUPPLY_CHAIN_ACHIEVEMENTS;
