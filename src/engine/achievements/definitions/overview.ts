/**
 * Overview / General Achievements
 *
 * 19 achievements total:
 * - 12 positive (Bronze: 2, Silver: 3, Gold: 3, Platinum: 4)
 * - 7 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const OVERVIEW_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "babys_first_quarter",
    name: "Baby's First Quarter",
    description: "Complete your first quarter without going bankrupt.",
    flavor: "The bar is underground and you still barely cleared it.",
    category: "overview",
    tier: "bronze",
    icon: "Baby",
    requirements: [
      thresholdReq("rounds_completed", 1),
      thresholdReq("no_bankruptcy", 1, "=="),
    ],
  }),

  defineAchievement({
    id: "in_the_black",
    name: "In the Black",
    description: "Post a positive net income for the first time.",
    flavor: "Your accountant just shed a single tear of joy.",
    category: "overview",
    tier: "bronze",
    icon: "TrendingUp",
    requirements: [thresholdReq("net_income", 0, ">")],
  }),

  // Silver
  defineAchievement({
    id: "dashboard_addict",
    name: "Dashboard Addict",
    description: "Check the Overview dashboard 50 times in a single quarter.",
    flavor: "You're not anxious, you're *thorough*.",
    category: "overview",
    tier: "silver",
    icon: "LayoutDashboard",
    requirements: [{ type: "custom", operator: ">=", value: 50 }], // Track dashboard views
  }),

  defineAchievement({
    id: "balanced_diet",
    name: "Balanced Diet",
    description: "Have positive metrics across cash, revenue, net income, ESG, and brand value simultaneously.",
    flavor: "The mythical pentathlon of capitalism.",
    category: "overview",
    tier: "silver",
    icon: "Scale",
    requirements: [
      thresholdReq("cash", 0, ">"),
      thresholdReq("revenue", 0, ">"),
      thresholdReq("net_income", 0, ">"),
      thresholdReq("esg_score", 500, ">="),
      thresholdReq("brand_value", 50, ">="),
    ],
  }),

  defineAchievement({
    id: "sophomore_surge",
    name: "Sophomore Surge",
    description: "Double your revenue between Q1 and Q2.",
    flavor: "Most people peak later - you peaked early and kept going.",
    category: "overview",
    tier: "silver",
    icon: "Rocket",
    requirements: [{ type: "custom", operator: ">=", value: 100, percentage: true }], // 100% revenue growth Q1-Q2
  }),

  // Gold
  defineAchievement({
    id: "the_podium",
    name: "The Podium",
    description: "Reach a top-3 team ranking.",
    flavor: "Bronze medal energy, but at least you're on the stage.",
    category: "overview",
    tier: "gold",
    icon: "Medal",
    requirements: [thresholdReq("final_ranking", 3, "<=")],
  }),

  defineAchievement({
    id: "market_monarch",
    name: "Market Monarch",
    description: "Claim #1 market share.",
    flavor: "Heavy is the head that wears the pie chart's biggest slice.",
    category: "overview",
    tier: "gold",
    icon: "Crown",
    requirements: [thresholdReq("final_ranking", 1, "==")],
  }),

  defineAchievement({
    id: "steady_hand",
    name: "Steady Hand",
    description: "Maintain the same ranking for 4 consecutive quarters.",
    flavor: "Consistency isn't boring - it's *strategic*.",
    category: "overview",
    tier: "gold",
    icon: "Anchor",
    requirements: [{ type: "custom", operator: ">=", value: 4, sustained: 4 }], // Same rank for 4 rounds
  }),

  // Platinum
  defineAchievement({
    id: "triple_crown",
    name: "Triple Crown",
    description: "Lead in revenue, net income, AND brand value in the same quarter.",
    flavor: "You didn't just win - you made everyone else look unemployed.",
    category: "overview",
    tier: "platinum",
    icon: "Trophy",
    requirements: [
      { type: "custom", operator: "==", value: 1 }, // #1 in revenue
      { type: "custom", operator: "==", value: 1 }, // #1 in net income
      { type: "custom", operator: "==", value: 1 }, // #1 in brand value
    ],
  }),

  defineAchievement({
    id: "dynasty",
    name: "Dynasty",
    description: "Hold #1 overall ranking for 4 consecutive quarters.",
    flavor: "At this point, rename the leaderboard after yourself.",
    category: "overview",
    tier: "platinum",
    icon: "Castle",
    requirements: [sustainedReq("final_ranking", 1, 4, "==")],
  }),

  defineAchievement({
    id: "centurion",
    name: "Centurion",
    description: "Accumulate $100M in total revenue.",
    flavor: "When your CFO faints, you know you've made it.",
    category: "overview",
    tier: "platinum",
    icon: "Banknote",
    requirements: [thresholdReq("total_revenue", 100_000_000)],
  }),

  defineAchievement({
    id: "the_untouchable",
    name: "The Untouchable",
    description: "Win a quarter where no other team is within 15% of your score.",
    flavor: "You didn't just win the race - you lapped everyone.",
    category: "overview",
    tier: "platinum",
    icon: "Shield",
    requirements: [{ type: "custom", operator: ">=", value: 15, percentage: true }], // 15% lead
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "sinking_ship",
    name: "Sinking Ship",
    description: "Rank last place overall.",
    flavor: "Somewhere, a business school professor is using you as a case study in 'what not to do.'",
    category: "overview",
    tier: "infamy",
    icon: "Ship",
    requirements: [{ type: "final_ranking", operator: "==", value: -1 }], // -1 = last place
  }),

  defineAchievement({
    id: "red_wedding",
    name: "Red Wedding",
    description: "Have negative net income for 4 consecutive quarters.",
    flavor: "The shareholders send their regards.",
    category: "overview",
    tier: "infamy",
    icon: "Skull",
    requirements: [sustainedReq("net_income", 0, 4, "<")],
  }),

  defineAchievement({
    id: "dashboard_of_despair",
    name: "Dashboard of Despair",
    description: "Have every single KPI in the red at once.",
    flavor: "You didn't just drop the ball - you lost the ball, the court, and the stadium.",
    category: "overview",
    tier: "infamy",
    icon: "AlertTriangle",
    requirements: [
      thresholdReq("cash", 0, "<"),
      thresholdReq("revenue", 0, "<="),
      thresholdReq("net_income", 0, "<"),
      thresholdReq("esg_score", 300, "<"),
      thresholdReq("brand_value", 30, "<"),
    ],
  }),

  defineAchievement({
    id: "freefall_specialist",
    name: "Freefall Specialist",
    description: "Drop 3+ ranking positions in a single quarter.",
    flavor: "Gravity is a cruel mistress.",
    category: "overview",
    tier: "infamy",
    icon: "ArrowDown",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // Dropped 3+ positions
  }),

  defineAchievement({
    id: "the_bermuda_triangle",
    name: "The Bermuda Triangle",
    description: "Cash, revenue, and net income all declining simultaneously.",
    flavor: "Everything that enters your company disappears.",
    category: "overview",
    tier: "infamy",
    icon: "Triangle",
    requirements: [
      { type: "custom", operator: "<", value: 0 }, // Cash declining
      { type: "custom", operator: "<", value: 0 }, // Revenue declining
      { type: "custom", operator: "<", value: 0 }, // Net income declining
    ],
  }),

  defineAchievement({
    id: "denial_stage",
    name: "Denial Stage",
    description: "Check the Overview dashboard 20+ times during a quarter where every KPI is negative.",
    flavor: "Looking at it again won't change the numbers.",
    category: "overview",
    tier: "infamy",
    icon: "Eye",
    requirements: [{ type: "custom", operator: ">=", value: 20 }], // Dashboard checks while in red
  }),

  defineAchievement({
    id: "speed_run_to_bottom",
    name: "Speed Run to the Bottom",
    description: "Reach last place within the first 3 quarters.",
    flavor: "Failing this fast usually requires *effort*.",
    category: "overview",
    tier: "infamy",
    icon: "Timer",
    requirements: [
      thresholdReq("rounds_completed", 3, "<="),
      { type: "final_ranking", operator: "==", value: -1 }, // -1 = last
    ],
  }),

  // ============================================
  // ESG ACHIEVEMENTS (15 new)
  // ============================================

  // Bronze - Getting Started
  defineAchievement({
    id: "esg_beginner",
    name: "ESG Beginner",
    description: "Activate your first ESG initiative.",
    flavor: "Every sustainable journey begins with a single step.",
    category: "overview",
    tier: "bronze",
    icon: "Leaf",
    requirements: [thresholdReq("esg_initiatives_active", 1)],
  }),

  defineAchievement({
    id: "carbon_conscious",
    name: "Carbon Conscious",
    description: "Enroll in the Carbon Offset Program.",
    flavor: "Your carbon footprint is getting smaller. So is your competitors' excuses.",
    category: "overview",
    tier: "bronze",
    icon: "Cloud",
    requirements: [{ type: "custom", operator: "==", value: "carbonOffsetProgram" }],
  }),

  // Silver - Growing Commitment
  defineAchievement({
    id: "social_leader",
    name: "Social Leader",
    description: "Activate all 5 social initiatives.",
    flavor: "Your employees actually like coming to work. Weird.",
    category: "overview",
    tier: "silver",
    icon: "Users",
    requirements: [
      { type: "custom", operator: "==", value: "diversityInclusion" },
      { type: "custom", operator: "==", value: "employeeWellness" },
      { type: "custom", operator: "==", value: "communityEducation" },
      { type: "custom", operator: "==", value: "affordableHousing" },
      { type: "custom", operator: "==", value: "humanRightsAudit" },
    ],
  }),

  defineAchievement({
    id: "governance_star",
    name: "Governance Star",
    description: "Activate all 3 governance initiatives.",
    flavor: "Your board meetings are actually productive. First time for everything.",
    category: "overview",
    tier: "silver",
    icon: "Scale",
    requirements: [
      { type: "custom", operator: "==", value: "transparencyReport" },
      { type: "custom", operator: "==", value: "whistleblowerProtection" },
      { type: "custom", operator: "==", value: "executivePayRatio" },
    ],
  }),

  defineAchievement({
    id: "environmental_guardian",
    name: "Environmental Guardian",
    description: "Activate all 6 environmental initiatives.",
    flavor: "Mother Nature sends her thanks.",
    category: "overview",
    tier: "silver",
    icon: "TreeDeciduous",
    requirements: [
      { type: "custom", operator: "==", value: "carbonOffsetProgram" },
      { type: "custom", operator: "==", value: "renewableEnergyCertificates" },
      { type: "custom", operator: "==", value: "waterConservation" },
      { type: "custom", operator: "==", value: "zeroWasteCommitment" },
      { type: "custom", operator: "==", value: "circularEconomy" },
      { type: "custom", operator: "==", value: "biodiversityProtection" },
    ],
  }),

  // Gold - Excellence
  defineAchievement({
    id: "esg_champion",
    name: "ESG Champion",
    description: "Achieve an ESG score above 1000.",
    flavor: "You're basically saving the planet while making money. Legend.",
    category: "overview",
    tier: "gold",
    icon: "Award",
    requirements: [thresholdReq("esg_score", 1000)],
  }),

  defineAchievement({
    id: "carbon_neutral",
    name: "Carbon Neutral",
    description: "Achieve net-zero CO2 emissions.",
    flavor: "The atmosphere breathes a sigh of relief.",
    category: "overview",
    tier: "gold",
    icon: "Cloud",
    requirements: [thresholdReq("co2_emissions", 0, "==")],
  }),

  defineAchievement({
    id: "transparency_pioneer",
    name: "Transparency Pioneer",
    description: "Publish transparency reports for 4 consecutive rounds.",
    flavor: "You have nothing to hide and you're proud of it.",
    category: "overview",
    tier: "gold",
    icon: "FileText",
    requirements: [sustainedReq("transparency_report_active", 1, 4, "==")],
  }),

  // Platinum - Mastery
  defineAchievement({
    id: "triple_bottom_line",
    name: "Triple Bottom Line",
    description: "Achieve top 3 in ESG, profit, AND growth simultaneously.",
    flavor: "People, planet, profit - you mastered all three.",
    category: "overview",
    tier: "platinum",
    icon: "Crown",
    requirements: [
      thresholdReq("esg_ranking", 3, "<="),
      thresholdReq("profit_ranking", 3, "<="),
      thresholdReq("growth_ranking", 3, "<="),
    ],
  }),

  defineAchievement({
    id: "full_esg_commitment",
    name: "Full ESG Commitment",
    description: "Activate all 20 ESG initiatives simultaneously.",
    flavor: "You didn't just drink the Kool-Aid, you made the Kool-Aid organic.",
    category: "overview",
    tier: "platinum",
    icon: "Globe",
    requirements: [thresholdReq("esg_initiatives_active", 20)],
  }),

  // Infamy - Failures
  defineAchievement({
    id: "esg_pretender",
    name: "ESG Pretender",
    description: "Spend $10M+ on ESG but have a score below 200.",
    flavor: "All hat, no cattle. All talk, no walk.",
    category: "overview",
    tier: "infamy",
    icon: "Mask",
    requirements: [
      { type: "custom", operator: ">=", value: 10_000_000 },
      thresholdReq("esg_score", 200, "<"),
    ],
  }),

  defineAchievement({
    id: "greenwasher",
    name: "Greenwasher",
    description: "Heavily market ESG commitment without any active initiatives.",
    flavor: "Your marketing says 'green', your operations say 'brown'.",
    category: "overview",
    tier: "infamy",
    icon: "AlertTriangle",
    requirements: [
      { type: "custom", operator: ">=", value: 5_000_000 }, // ESG marketing spend
      thresholdReq("esg_initiatives_active", 0, "=="),
    ],
  }),

  defineAchievement({
    id: "scandal_magnet",
    name: "Scandal Magnet",
    description: "Have 3+ ESG scandals in a single game.",
    flavor: "At this point, your PR team has given up.",
    category: "overview",
    tier: "infamy",
    icon: "Newspaper",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3+ scandals
  }),

  defineAchievement({
    id: "pay_ratio_outrage",
    name: "Pay Ratio Outrage",
    description: "Have executive pay exceed 200x average worker pay.",
    flavor: "Marie Antoinette called - she thinks you're overdoing it.",
    category: "overview",
    tier: "infamy",
    icon: "DollarSign",
    requirements: [{ type: "custom", operator: ">=", value: 200 }], // 200x pay ratio
  }),
];

export default OVERVIEW_ACHIEVEMENTS;
