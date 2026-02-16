/**
 * Factory Achievements
 *
 * 21 achievements total:
 * - 13 positive (Bronze: 2, Silver: 3, Gold: 4, Platinum: 4)
 * - 8 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const FACTORY_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "assembly_required",
    name: "Assembly Required",
    description: "Allocate production across all 5 segments for the first time.",
    flavor: "Diversification - it's not just a fancy word your professor used.",
    category: "factory",
    tier: "bronze",
    icon: "Boxes",
    requirements: [{ type: "custom", operator: ">=", value: 5 }], // 5 segments with production
  }),

  defineAchievement({
    id: "grease_monkey",
    name: "Grease Monkey",
    description: "Invest in maintenance for the first time.",
    flavor: "Your machines will remember this act of kindness.",
    category: "factory",
    tier: "bronze",
    icon: "Wrench",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Any maintenance spending
  }),

  // Silver
  defineAchievement({
    id: "six_sigma_sensei",
    name: "Six Sigma Sensei",
    description: "Purchase the Six Sigma upgrade.",
    flavor: "You now speak fluent 'defects per million opportunities' at parties. Nobody invites you to parties.",
    category: "factory",
    tier: "silver",
    icon: "Target",
    requirements: [{ type: "custom", operator: "==", value: "six_sigma" }], // Six Sigma purchased
  }),

  defineAchievement({
    id: "rise_of_the_machines",
    name: "Rise of the Machines",
    description: "Purchase the Automation upgrade.",
    flavor: "Your factory now has fewer humans than a self-checkout at Walmart.",
    category: "factory",
    tier: "silver",
    icon: "Bot",
    requirements: [{ type: "custom", operator: "==", value: "automation" }], // Automation purchased
  }),

  defineAchievement({
    id: "efficiency_climb",
    name: "Efficiency Climb",
    description: "Improve factory efficiency by 20+ points in a single quarter.",
    flavor: "Your factory went from 'garage startup' to 'German engineering.'",
    category: "factory",
    tier: "silver",
    icon: "TrendingUp",
    requirements: [{ type: "custom", operator: ">=", value: 20 }], // 20 point efficiency gain
  }),

  // Gold
  defineAchievement({
    id: "captain_planet",
    name: "Captain Planet",
    description: "Purchase the Green Energy upgrade and reach zero carbon emissions.",
    flavor: "The polar bears wrote you a thank-you card.",
    category: "factory",
    tier: "gold",
    icon: "Leaf",
    requirements: [
      { type: "custom", operator: "==", value: "green_energy" },
      thresholdReq("carbon_footprint", 0, "=="),
    ],
  }),

  defineAchievement({
    id: "i_robot",
    name: "I, Robot",
    description: "Purchase the Robotics upgrade.",
    flavor: "Skynet called - they want their business strategy back.",
    category: "factory",
    tier: "gold",
    icon: "Cpu",
    requirements: [{ type: "custom", operator: "==", value: "robotics" }],
  }),

  defineAchievement({
    id: "peak_performance",
    name: "Peak Performance",
    description: "Hit 95%+ factory efficiency.",
    flavor: "Your factory runs tighter than a Swiss watch on espresso.",
    category: "factory",
    tier: "gold",
    icon: "Gauge",
    requirements: [thresholdReq("production_efficiency", 95)],
  }),

  defineAchievement({
    id: "carbon_cutter",
    name: "Carbon Cutter",
    description: "Reduce carbon emissions by 50% or more from your starting level.",
    flavor: "The atmosphere sends its regards.",
    category: "factory",
    tier: "gold",
    icon: "Wind",
    requirements: [{ type: "custom", operator: ">=", value: 50, percentage: true }], // 50% reduction
  }),

  // Platinum
  defineAchievement({
    id: "full_metal_factory",
    name: "Full Metal Factory",
    description: "Purchase ALL 4 equipment upgrades: Six Sigma, Automation, Green Energy, and Robotics.",
    flavor: "You didn't just build a factory, you built *the future*.",
    category: "factory",
    tier: "platinum",
    icon: "Factory",
    requirements: [
      { type: "custom", operator: "==", value: "six_sigma" },
      { type: "custom", operator: "==", value: "automation" },
      { type: "custom", operator: "==", value: "green_energy" },
      { type: "custom", operator: "==", value: "robotics" },
    ],
  }),

  defineAchievement({
    id: "redline",
    name: "Redline",
    description: "Operate at maximum production capacity for 3 consecutive quarters without a breakdown.",
    flavor: "The machines fear you. In a respectful way.",
    category: "factory",
    tier: "platinum",
    icon: "Zap",
    requirements: [sustainedReq("capacity_utilization", 100, 3, "==")],
  }),

  defineAchievement({
    id: "esg_darling",
    name: "ESG Darling",
    description: "Achieve a perfect ESG score.",
    flavor: "Greta Thunberg just followed you on LinkedIn.",
    category: "factory",
    tier: "platinum",
    icon: "Award",
    requirements: [thresholdReq("esg_score", 1000)],
  }),

  defineAchievement({
    id: "segment_surgeon",
    name: "Segment Surgeon",
    description: "Allocate production perfectly across segments to match exact market demand with zero waste.",
    flavor: "Your production planner deserves a Michelin star.",
    category: "factory",
    tier: "platinum",
    icon: "Scissors",
    requirements: [{ type: "custom", operator: "==", value: 0 }], // Zero waste/overproduction
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "rust_bucket",
    name: "Rust Bucket",
    description: "Let factory efficiency drop below 40%.",
    flavor: "Your conveyor belts are held together by prayers and duct tape.",
    category: "factory",
    tier: "infamy",
    icon: "CircleSlash",
    requirements: [thresholdReq("production_efficiency", 40, "<")],
  }),

  defineAchievement({
    id: "maintenance_what_maintenance",
    name: "Maintenance? What Maintenance?",
    description: "Go 4 quarters without investing in maintenance.",
    flavor: "Your equipment is filing for emancipation.",
    category: "factory",
    tier: "infamy",
    icon: "AlertOctagon",
    requirements: [sustainedReq("custom", 0, 4, "==")], // 0 maintenance for 4 rounds
  }),

  defineAchievement({
    id: "captain_pollution",
    name: "Captain Pollution",
    description: "Have the highest carbon emissions among all teams.",
    flavor: "The EPA has you on speed dial and it's not for compliments.",
    category: "factory",
    tier: "infamy",
    icon: "Cloud",
    requirements: [{ type: "custom", operator: "==", value: -1 }], // -1 = worst in category
  }),

  defineAchievement({
    id: "the_luddite",
    name: "The Luddite",
    description: "Reach the final quarter without purchasing a single equipment upgrade.",
    flavor: "Welcome to 1847, enjoy your stay.",
    category: "factory",
    tier: "infamy",
    icon: "Ban",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      { type: "custom", operator: "==", value: 0 }, // 0 upgrades
    ],
  }),

  defineAchievement({
    id: "assembly_catastrophe",
    name: "Assembly Catastrophe",
    description: "Allocate 100% of production to a single segment and lose money on it.",
    flavor: "You put all your eggs in one basket and then sat on the basket.",
    category: "factory",
    tier: "infamy",
    icon: "XCircle",
    requirements: [{ type: "custom", operator: "==", value: 1 }], // 1 segment with negative return
  }),

  defineAchievement({
    id: "breakdown_boulevard",
    name: "Breakdown Boulevard",
    description: "Suffer 3+ equipment breakdowns in one quarter from neglected maintenance.",
    flavor: "Your factory sounds like a percussion concert nobody bought tickets to.",
    category: "factory",
    tier: "infamy",
    icon: "Hammer",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3+ breakdowns
  }),

  defineAchievement({
    id: "overproduction_overlord",
    name: "Overproduction Overlord",
    description: "Produce 2x more than you can sell for 2 consecutive quarters.",
    flavor: "Your warehouse is full. Your bank account is empty. Coincidence? No.",
    category: "factory",
    tier: "infamy",
    icon: "Package",
    requirements: [sustainedReq("custom", 200, 2)], // 200% overproduction
  }),

  defineAchievement({
    id: "green_in_name_only",
    name: "Green in Name Only",
    description: "Buy the Green Energy upgrade but still have the worst overall ESG score.",
    flavor: "You installed solar panels and then dumped the old ones in a river. Metaphorically.",
    category: "factory",
    tier: "infamy",
    icon: "LeafyGreen",
    requirements: [
      { type: "custom", operator: "==", value: "green_energy" },
      { type: "esg_score", operator: "==", value: -1 }, // -1 = worst
    ],
  }),

  // ============================================
  // MACHINERY SYSTEM ACHIEVEMENTS (20 new)
  // ============================================

  // Bronze - Getting Started
  defineAchievement({
    id: "machine_collector",
    name: "Machine Collector",
    description: "Own 10+ machines across all factories.",
    flavor: "Your factory floor is starting to look like a proper operation.",
    category: "factory",
    tier: "bronze",
    icon: "Cog",
    requirements: [thresholdReq("total_machines", 10)],
  }),

  defineAchievement({
    id: "first_purchase",
    name: "First Purchase",
    description: "Buy your first machine.",
    flavor: "Every manufacturing empire starts with a single machine.",
    category: "factory",
    tier: "bronze",
    icon: "ShoppingCart",
    requirements: [thresholdReq("total_machines", 1)],
  }),

  // Silver - Growing
  defineAchievement({
    id: "factory_floor_master",
    name: "Factory Floor Master",
    description: "Own 20+ machines across all factories.",
    flavor: "You've got more machines than a pinball arcade.",
    category: "factory",
    tier: "silver",
    icon: "Factory",
    requirements: [thresholdReq("total_machines", 20)],
  }),

  defineAchievement({
    id: "automation_pioneer",
    name: "Automation Pioneer",
    description: "Own 5+ robotic arms.",
    flavor: "The robots have taken over. As planned.",
    category: "factory",
    tier: "silver",
    icon: "Bot",
    requirements: [{ type: "custom", operator: ">=", value: 5 }], // 5+ robotic arms
  }),

  defineAchievement({
    id: "quality_obsessed",
    name: "Quality Obsessed",
    description: "Own 3+ quality scanners.",
    flavor: "Not a single defect escapes your watchful electronic eyes.",
    category: "factory",
    tier: "silver",
    icon: "ScanSearch",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3+ quality scanners
  }),

  // Gold - Excellence
  defineAchievement({
    id: "perfect_maintenance",
    name: "Perfect Maintenance",
    description: "Go 5 rounds without any machine breakdowns.",
    flavor: "Your maintenance team deserves a raise. Or at least a pizza.",
    category: "factory",
    tier: "gold",
    icon: "Wrench",
    requirements: [sustainedReq("breakdowns", 0, 5, "==")],
  }),

  defineAchievement({
    id: "efficiency_expert",
    name: "Efficiency Expert",
    description: "Have all machines above 90% health.",
    flavor: "Your machines purr like well-fed cats.",
    category: "factory",
    tier: "gold",
    icon: "Gauge",
    requirements: [{ type: "custom", operator: ">=", value: 90 }], // 90% min health
  }),

  defineAchievement({
    id: "clean_room_champion",
    name: "Clean Room Champion",
    description: "Own a clean room unit and achieve 0 defects for a round.",
    flavor: "Cleanliness is next to profitability.",
    category: "factory",
    tier: "gold",
    icon: "Sparkles",
    requirements: [
      { type: "custom", operator: "==", value: "clean_room_unit" },
      thresholdReq("defect_rate", 0, "=="),
    ],
  }),

  // Platinum - Mastery
  defineAchievement({
    id: "full_automation",
    name: "Full Automation",
    description: "Have 80%+ production from automated machines.",
    flavor: "The humans are just here to watch now.",
    category: "factory",
    tier: "platinum",
    icon: "Cpu",
    requirements: [{ type: "custom", operator: ">=", value: 80 }], // 80% automated
  }),

  defineAchievement({
    id: "machine_mogul",
    name: "Machine Mogul",
    description: "Own 50+ machines across all factories.",
    flavor: "You've built an industrial empire of steel and circuits.",
    category: "factory",
    tier: "platinum",
    icon: "Crown",
    requirements: [thresholdReq("total_machines", 50)],
  }),

  // Infamy - Failures
  defineAchievement({
    id: "breakdown_king",
    name: "Breakdown King",
    description: "Have 5+ machine breakdowns in one round.",
    flavor: "Your factory sounds like a demolition derby.",
    category: "factory",
    tier: "infamy",
    icon: "AlertOctagon",
    requirements: [{ type: "custom", operator: ">=", value: 5 }], // 5+ breakdowns
  }),

  defineAchievement({
    id: "maintenance_neglector",
    name: "Maintenance Neglector",
    description: "Have 3+ machines below 30% health.",
    flavor: "Your machines are crying out for help.",
    category: "factory",
    tier: "infamy",
    icon: "HeartCrack",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3+ low health
  }),

  defineAchievement({
    id: "scrapyard",
    name: "Scrapyard",
    description: "Sell 5+ machines at a loss.",
    flavor: "One man's trash is... still trash if sold at a loss.",
    category: "factory",
    tier: "infamy",
    icon: "Trash",
    requirements: [{ type: "custom", operator: ">=", value: 5 }], // 5+ machines sold at loss
  }),

  defineAchievement({
    id: "obsolete_fleet",
    name: "Obsolete Fleet",
    description: "Have average machine age exceed expected lifespan.",
    flavor: "These machines belong in a museum. Actually, no museum wants them.",
    category: "factory",
    tier: "infamy",
    icon: "Clock",
    requirements: [{ type: "custom", operator: ">", value: 1 }], // Avg age > lifespan ratio
  }),

  // ============================================
  // UPGRADE ACHIEVEMENTS (15 new)
  // ============================================

  // Bronze
  defineAchievement({
    id: "upgrade_enthusiast",
    name: "Upgrade Enthusiast",
    description: "Purchase 5 different upgrades.",
    flavor: "You've got a taste for improvement.",
    category: "factory",
    tier: "bronze",
    icon: "TrendingUp",
    requirements: [thresholdReq("total_upgrades", 5)],
  }),

  // Silver
  defineAchievement({
    id: "green_factory",
    name: "Green Factory",
    description: "Purchase all 5 sustainability upgrades.",
    flavor: "Your factory runs on sunshine and good vibes.",
    category: "factory",
    tier: "silver",
    icon: "Leaf",
    requirements: [
      { type: "custom", operator: "==", value: "solarPanels" },
      { type: "custom", operator: "==", value: "waterRecycling" },
      { type: "custom", operator: "==", value: "wasteToEnergy" },
      { type: "custom", operator: "==", value: "smartGrid" },
      { type: "custom", operator: "==", value: "carbonCapture" },
    ],
  }),

  defineAchievement({
    id: "quality_focused",
    name: "Quality Focused",
    description: "Purchase both Six Sigma and Quality Lab upgrades.",
    flavor: "Defects fear you.",
    category: "factory",
    tier: "silver",
    icon: "CheckCircle2",
    requirements: [
      { type: "custom", operator: "==", value: "sixSigma" },
      { type: "custom", operator: "==", value: "qualityLab" },
    ],
  }),

  defineAchievement({
    id: "lean_and_mean",
    name: "Lean and Mean",
    description: "Purchase Lean Manufacturing and Continuous Improvement.",
    flavor: "You've read all the Toyota books.",
    category: "factory",
    tier: "silver",
    icon: "Zap",
    requirements: [
      { type: "custom", operator: "==", value: "leanManufacturing" },
      { type: "custom", operator: "==", value: "continuousImprovement" },
    ],
  }),

  // Gold
  defineAchievement({
    id: "tech_pioneer",
    name: "Tech Pioneer",
    description: "Purchase Digital Twin, IoT Integration, and Advanced Robotics.",
    flavor: "Welcome to Industry 4.0.",
    category: "factory",
    tier: "gold",
    icon: "Cpu",
    requirements: [
      { type: "custom", operator: "==", value: "digitalTwin" },
      { type: "custom", operator: "==", value: "iotIntegration" },
      { type: "custom", operator: "==", value: "advancedRobotics" },
    ],
  }),

  defineAchievement({
    id: "specialized_manufacturer",
    name: "Specialized Manufacturer",
    description: "Purchase Clean Room, Rapid Prototyping, and Flexible Manufacturing.",
    flavor: "You can build anything, anywhere, anytime.",
    category: "factory",
    tier: "gold",
    icon: "Boxes",
    requirements: [
      { type: "custom", operator: "==", value: "cleanRoom" },
      { type: "custom", operator: "==", value: "rapidPrototyping" },
      { type: "custom", operator: "==", value: "flexibleManufacturing" },
    ],
  }),

  // Platinum
  defineAchievement({
    id: "fully_upgraded",
    name: "Fully Upgraded",
    description: "Purchase all 20 upgrades on a single factory.",
    flavor: "This isn't a factory anymore, it's a shrine to manufacturing excellence.",
    category: "factory",
    tier: "platinum",
    icon: "Award",
    requirements: [thresholdReq("factory_upgrades", 20)],
  }),

  defineAchievement({
    id: "upgrade_architect",
    name: "Upgrade Architect",
    description: "Have at least one upgrade from every category.",
    flavor: "A balanced approach to greatness.",
    category: "factory",
    tier: "gold",
    icon: "LayoutGrid",
    requirements: [{ type: "custom", operator: ">=", value: 4 }], // 4 categories covered
  }),

  // Infamy
  defineAchievement({
    id: "upgrade_hoarder",
    name: "Upgrade Hoarder",
    description: "Buy 10+ upgrades but show no efficiency improvement.",
    flavor: "You're collecting upgrades like Pokemon cards. Gotta catch 'em all... for no reason.",
    category: "factory",
    tier: "infamy",
    icon: "Package",
    requirements: [
      thresholdReq("total_upgrades", 10),
      { type: "custom", operator: "==", value: 0 }, // No efficiency gain
    ],
  }),

  defineAchievement({
    id: "wasted_investment",
    name: "Wasted Investment",
    description: "Spend $100M+ on upgrades that don't improve performance.",
    flavor: "You spent money like a sailor, with the strategy of a landlubber.",
    category: "factory",
    tier: "infamy",
    icon: "DollarSign",
    requirements: [{ type: "custom", operator: ">=", value: 100_000_000 }], // $100M wasted
  }),
];

export default FACTORY_ACHIEVEMENTS;
