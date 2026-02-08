/**
 * Finance Achievements
 *
 * 22 achievements total:
 * - 14 positive (Bronze: 2, Silver: 4, Gold: 4, Platinum: 4)
 * - 8 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const FINANCE_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "debut_debt",
    name: "Debut Debt",
    description: "Take out your first bank loan.",
    flavor: "You're officially playing with other people's money. Welcome to capitalism.",
    category: "finance",
    tier: "bronze",
    icon: "Landmark",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Any loan taken
  }),

  defineAchievement({
    id: "bond_corporate_bond",
    name: "Bond, Corporate Bond",
    description: "Issue corporate bonds for the first time.",
    flavor: "You're basically printing your own money, except it's legal and comes with interest payments.",
    category: "finance",
    tier: "bronze",
    icon: "FileText",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Any bonds issued
  }),

  // Silver
  defineAchievement({
    id: "ipo_day",
    name: "IPO Day",
    description: "Issue stock for the first time.",
    flavor: "Somewhere, a Wall Street trader just added your ticker to their watchlist.",
    category: "finance",
    tier: "silver",
    icon: "LineChart",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Stock issued
  }),

  defineAchievement({
    id: "hedgehog",
    name: "Hedgehog",
    description: "Set up FX hedging in all 4 currencies: EUR, GBP, JPY, CNY.",
    flavor: "Your money is wearing armor in every timezone.",
    category: "finance",
    tier: "silver",
    icon: "Shield",
    requirements: [{ type: "custom", operator: "==", value: 4 }], // 4 currencies hedged
  }),

  defineAchievement({
    id: "dividend_darling",
    name: "Dividend Darling",
    description: "Successfully propose and pass a dividend distribution.",
    flavor: "The board loves you. The shareholders love you more.",
    category: "finance",
    tier: "silver",
    icon: "Gift",
    requirements: [{ type: "dividend_paid", operator: ">", value: 0 }],
  }),

  defineAchievement({
    id: "cash_cushion",
    name: "Cash Cushion",
    description: "Maintain at least $5M in cash reserves for 3 consecutive quarters.",
    flavor: "Your balance sheet sleeps soundly at night.",
    category: "finance",
    tier: "silver",
    icon: "Wallet",
    requirements: [sustainedReq("cash", 5_000_000, 3)],
  }),

  // Gold
  defineAchievement({
    id: "buyback_baron",
    name: "Buyback Baron",
    description: "Execute a stock buyback program.",
    flavor: "\"I believe in this company,\" you say, buying your own stock like you're adding items to your Amazon cart.",
    category: "finance",
    tier: "gold",
    icon: "RefreshCw",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Stock buyback executed
  }),

  defineAchievement({
    id: "debt_destroyer",
    name: "Debt Destroyer",
    description: "Pay off ALL outstanding loans and bonds.",
    flavor: "You are a free entity. No chains. No interest. Just vibes.",
    category: "finance",
    tier: "gold",
    icon: "CheckCircle",
    requirements: [thresholdReq("debt", 0, "==")],
  }),

  defineAchievement({
    id: "empire_builder",
    name: "Empire Builder",
    description: "Get board approval for a major expansion proposal.",
    flavor: "The board said yes. The competitors said 'oh no.'",
    category: "finance",
    tier: "gold",
    icon: "Building",
    requirements: [{ type: "custom", operator: ">=", value: 1 }], // Expansion approved
  }),

  defineAchievement({
    id: "revenue_rocket",
    name: "Revenue Rocket",
    description: "Grow revenue 40%+ in a single quarter.",
    flavor: "Your finance team doesn't have a chart — they have a *launch trajectory*.",
    category: "finance",
    tier: "gold",
    icon: "Rocket",
    requirements: [{ type: "custom", operator: ">=", value: 40, percentage: true }], // 40% growth
  }),

  // Platinum
  defineAchievement({
    id: "warren_buffetts_apprentice",
    name: "Warren Buffett's Apprentice",
    description: "Maintain profit margins above 20% for 4 consecutive quarters.",
    flavor: "Value investing isn't a strategy — it's your entire personality now.",
    category: "finance",
    tier: "platinum",
    icon: "Briefcase",
    requirements: [sustainedReq("profit_margin", 20, 4)],
  }),

  defineAchievement({
    id: "fort_knox",
    name: "Fort Knox",
    description: "Accumulate $50M in liquid cash.",
    flavor: "Your treasury department needs a bigger vault. And a smaller ego.",
    category: "finance",
    tier: "platinum",
    icon: "Vault",
    requirements: [thresholdReq("cash", 50_000_000)],
  }),

  defineAchievement({
    id: "financial_architect",
    name: "Financial Architect",
    description: "Use loans, bonds, AND stock issuance strategically while maintaining positive cash flow.",
    flavor: "You didn't just play the finance game — you *composed* it.",
    category: "finance",
    tier: "platinum",
    icon: "PenTool",
    requirements: [
      { type: "custom", operator: ">", value: 0 }, // Used loans
      { type: "custom", operator: ">", value: 0 }, // Used bonds
      { type: "custom", operator: ">", value: 0 }, // Used stock
      thresholdReq("cash_flow", 0, ">"),
    ],
  }),

  defineAchievement({
    id: "the_board_whisperer",
    name: "The Board Whisperer",
    description: "Get 5 consecutive board proposals approved.",
    flavor: "The board doesn't vote on your proposals anymore — they just applaud.",
    category: "finance",
    tier: "platinum",
    icon: "Users",
    requirements: [sustainedReq("custom", 1, 5)], // 5 consecutive approvals
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "drowning_in_debt",
    name: "Drowning in Debt",
    description: "Have total debt exceed 3x your annual revenue.",
    flavor: "Banks are calling. Not to check in. To check out.",
    category: "finance",
    tier: "infamy",
    icon: "Anchor",
    requirements: [thresholdReq("debt_ratio", 300)], // 300% debt ratio
  }),

  defineAchievement({
    id: "junk_bond_status",
    name: "Junk Bond Status",
    description: "Issue bonds while your credit rating is at rock bottom.",
    flavor: "You're basically selling IOUs written on napkins.",
    category: "finance",
    tier: "infamy",
    icon: "FileWarning",
    requirements: [
      { type: "custom", operator: ">", value: 0 }, // Bonds issued
      thresholdReq("credit_rating", 1, "<="), // Lowest rating
    ],
  }),

  defineAchievement({
    id: "forex_roulette",
    name: "Forex Roulette",
    description: "Take massive FX losses from completely unhedged currency exposure.",
    flavor: "The yen moved 2% and your balance sheet moved to the morgue.",
    category: "finance",
    tier: "infamy",
    icon: "Globe",
    requirements: [{ type: "custom", operator: ">=", value: 1_000_000 }], // $1M+ FX loss
  }),

  defineAchievement({
    id: "the_board_revolt",
    name: "The Board Revolt",
    description: "Have 3 consecutive board proposals rejected.",
    flavor: "At this point, the board is just a group chat that leaves you on read.",
    category: "finance",
    tier: "infamy",
    icon: "ThumbsDown",
    requirements: [sustainedReq("custom", 0, 3, "==")], // 3 rejections
  }),

  defineAchievement({
    id: "cash_hemorrhage",
    name: "Cash Hemorrhage",
    description: "Burn through $10M+ in cash in a single quarter with nothing to show for it.",
    flavor: "Somewhere, your money is on a beach, living its best life. Without you.",
    category: "finance",
    tier: "infamy",
    icon: "Droplet",
    requirements: [
      { type: "custom", operator: ">=", value: 10_000_000 }, // $10M+ cash burn
      thresholdReq("revenue", 0, "<="), // No revenue gain
    ],
  }),

  defineAchievement({
    id: "ponzi_vibes",
    name: "Ponzi Vibes",
    description: "Take out new loans specifically to pay off old loans.",
    flavor: "This is a strategy! ...said no successful CFO ever.",
    category: "finance",
    tier: "infamy",
    icon: "RefreshCcw",
    requirements: [{ type: "custom", operator: "==", value: true }], // Debt refinancing spiral
  }),

  defineAchievement({
    id: "interest_rate_victim",
    name: "Interest Rate Victim",
    description: "Pay more in loan interest in a quarter than you earned in net income.",
    flavor: "You're not running a company — you're running a charity for banks.",
    category: "finance",
    tier: "infamy",
    icon: "Percent",
    requirements: [{ type: "custom", operator: ">", value: 100, percentage: true }], // Interest > net income
  }),

  defineAchievement({
    id: "dividend_of_doom",
    name: "Dividend of Doom",
    description: "Pay dividends while posting a net loss.",
    flavor: "You're handing out party favors while the house is on fire. The shareholders are thrilled. The accountants are not.",
    category: "finance",
    tier: "infamy",
    icon: "Flame",
    requirements: [
      thresholdReq("dividend_paid", 0, ">"),
      thresholdReq("net_income", 0, "<"),
    ],
  }),

  // ============================================
  // BOARD ACHIEVEMENTS (10 new)
  // ============================================

  // Bronze - Getting Started
  defineAchievement({
    id: "board_initiator",
    name: "Board Initiator",
    description: "Submit your first board proposal.",
    flavor: "Your first step into corporate politics.",
    category: "finance",
    tier: "bronze",
    icon: "MessageSquare",
    requirements: [thresholdReq("board_proposals_submitted", 1)],
  }),

  defineAchievement({
    id: "first_approval",
    name: "First Approval",
    description: "Get your first board proposal approved.",
    flavor: "The board actually agrees with you. Savor this feeling.",
    category: "finance",
    tier: "bronze",
    icon: "CheckCircle",
    requirements: [thresholdReq("board_proposals_approved", 1)],
  }),

  // Silver - Growing Influence
  defineAchievement({
    id: "boards_favorite",
    name: "Board's Favorite",
    description: "Get 5 consecutive proposals approved.",
    flavor: "The board trusts you implicitly. That's either good leadership or good manipulation.",
    category: "finance",
    tier: "silver",
    icon: "Heart",
    requirements: [sustainedReq("board_proposal_approved", 1, 5, "==")],
  }),

  defineAchievement({
    id: "strategic_visionary",
    name: "Strategic Visionary",
    description: "Get all 5 strategic proposals approved in one game.",
    flavor: "You see the big picture. And the board sees it your way.",
    category: "finance",
    tier: "silver",
    icon: "Eye",
    requirements: [
      { type: "custom", operator: "==", value: "rd_investment_approved" },
      { type: "custom", operator: "==", value: "strategic_partnership_approved" },
      { type: "custom", operator: "==", value: "market_entry_approved" },
      { type: "custom", operator: "==", value: "product_line_discontinue_approved" },
      { type: "custom", operator: "==", value: "vertical_integration_approved" },
    ],
  }),

  defineAchievement({
    id: "shareholder_darling",
    name: "Shareholder Darling",
    description: "Get 3 dividend proposals approved.",
    flavor: "The shareholders love you. Mostly because you keep giving them money.",
    category: "finance",
    tier: "silver",
    icon: "DollarSign",
    requirements: [{ type: "custom", operator: ">=", value: 3 }], // 3+ dividend approvals
  }),

  // Gold - Excellence
  defineAchievement({
    id: "corporate_mastermind",
    name: "Corporate Mastermind",
    description: "Get 10 different proposal types approved.",
    flavor: "You've mastered the art of corporate governance.",
    category: "finance",
    tier: "gold",
    icon: "Brain",
    requirements: [thresholdReq("unique_proposals_approved", 10)],
  }),

  defineAchievement({
    id: "capital_allocator",
    name: "Capital Allocator",
    description: "Successfully pass a capital allocation plan and follow it for 3 rounds.",
    flavor: "You made a plan. You stuck to the plan. You're practically a unicorn.",
    category: "finance",
    tier: "gold",
    icon: "PieChart",
    requirements: [
      { type: "custom", operator: "==", value: "capital_allocation_approved" },
      sustainedReq("capital_plan_followed", 1, 3, "=="),
    ],
  }),

  // Infamy - Failures
  defineAchievement({
    id: "board_enemy",
    name: "Board Enemy",
    description: "Have 3 consecutive proposals rejected.",
    flavor: "The board sees your name on a proposal and sighs collectively.",
    category: "finance",
    tier: "infamy",
    icon: "XCircle",
    requirements: [sustainedReq("board_proposal_rejected", 1, 3, "==")],
  }),

  defineAchievement({
    id: "rogue_ceo",
    name: "Rogue CEO",
    description: "Have 5+ proposals rejected in a single game.",
    flavor: "At this point, the board is considering whether you're even reading their feedback.",
    category: "finance",
    tier: "infamy",
    icon: "AlertOctagon",
    requirements: [thresholdReq("board_proposals_rejected", 5)],
  }),

  defineAchievement({
    id: "proposal_spammer",
    name: "Proposal Spammer",
    description: "Submit 10+ proposals in a single round.",
    flavor: "Quantity over quality is not a board strategy.",
    category: "finance",
    tier: "infamy",
    icon: "Mail",
    requirements: [{ type: "custom", operator: ">=", value: 10 }], // 10+ proposals in round
  }),
];

export default FINANCE_ACHIEVEMENTS;
