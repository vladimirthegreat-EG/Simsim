/**
 * Secret / Hidden Achievements
 *
 * 21 secret achievements that are never shown until unlocked.
 * Descriptions are revealed upon earning them.
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const SECRET_ACHIEVEMENTS: ExtendedAchievement[] = [
  defineAchievement({
    id: "zen_ceo",
    name: "Zen CEO",
    description: "You did nothing. Absolutely nothing. And somehow that was a choice.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Coffee",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "zero_spend" }], // $0 in every category
  }),

  defineAchievement({
    id: "all_in",
    name: "ALL IN",
    description: "You pushed every lever to maximum. Either you're a genius or you're about to learn what bankruptcy tastes like.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Maximize",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "max_everything" }], // Max all sliders/budgets
  }),

  defineAchievement({
    id: "robbing_peter_to_pay_paul",
    name: "Robbing Peter to Pay Paul",
    description: "You borrowed money to pay your shareholders. The finance textbook just burst into flames.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "CreditCard",
    hidden: true,
    requirements: [
      { type: "custom", operator: ">", value: 0 }, // Took loan
      thresholdReq("dividend_paid", 0, ">"), // Same round dividend
    ],
  }),

  defineAchievement({
    id: "greenwash_king",
    name: "Greenwash King",
    description: "The planet loves you. Your employees do not.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Leaf",
    hidden: true,
    requirements: [
      { type: "esg_score", operator: "==", value: -1 }, // Best ESG
      { type: "morale", operator: "==", value: -2 }, // Worst satisfaction
    ],
  }),

  defineAchievement({
    id: "logistical_chaos",
    name: "Logistical Chaos",
    description: "Sea, air, land, and rail - all going to the same place. Your logistics team is having a group existential crisis.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Shuffle",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "all_methods_same_region" }],
  }),

  defineAchievement({
    id: "shelf_scientist",
    name: "Shelf Scientist",
    description: "You patented something nobody will ever use. You and the patent for a motorized ice cream cone have a lot in common.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "FileQuestion",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "patent_no_launch" }],
  }),

  defineAchievement({
    id: "icarus",
    name: "Icarus",
    description: "You flew too close to the sun. And then you flew directly into the ground.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Sun",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "first_to_last" }], // #1 to last in one round
  }),

  defineAchievement({
    id: "the_comeback_kid",
    name: "The Comeback Kid",
    description: "Written off. Counted out. And now? Standing on top. This is the stuff movies are made of.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Rocket",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "last_to_first" }], // Last to #1 in one round
  }),

  defineAchievement({
    id: "party_of_one",
    name: "Party of One",
    description: "You built a loyalty program. Nobody came. The cake is untouched.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Cake",
    hidden: true,
    requirements: [
      { type: "custom", operator: ">", value: 0 }, // Loyalty program active
      { type: "custom", operator: "==", value: 0 }, // Zero enrollments
    ],
  }),

  defineAchievement({
    id: "famous_for_nothing",
    name: "Famous for Nothing",
    description: "Everyone knows your name. Nobody buys your product. You're the business equivalent of a one-hit wonder.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Star",
    hidden: true,
    requirements: [
      { type: "brand_value", operator: "==", value: -1 }, // Best brand
      { type: "market_share_total", operator: "==", value: -2 }, // Worst market share
    ],
  }),

  defineAchievement({
    id: "build_it_and_they_wont_come",
    name: "Build It and They Won't Come",
    description: "You made the world's greatest product. Then told absolutely no one about it.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Package",
    hidden: true,
    requirements: [
      thresholdReq("total_rd_spent", 5_000_000), // Max R&D
      thresholdReq("total_marketing_spent", 0, "=="), // $0 marketing
    ],
  }),

  defineAchievement({
    id: "all_sizzle_no_steak",
    name: "All Sizzle, No Steak",
    description: "Your ads are INCREDIBLE. Your product is… present. Technically.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Tv",
    hidden: true,
    requirements: [
      thresholdReq("total_marketing_spent", 5_000_000), // Max marketing
      thresholdReq("total_rd_spent", 0, "=="), // $0 R&D
    ],
  }),

  defineAchievement({
    id: "seen_it_all",
    name: "Seen It All",
    description: "Recession, boom, crisis, disruption - you've lived through every headline and came out the other side with stories.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "BookOpen",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "all_event_types" }],
  }),

  defineAchievement({
    id: "razors_edge",
    name: "Razor's Edge",
    description: "Not a penny more, not a penny less. You either planned this or the universe has a wicked sense of humor.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Scissors",
    hidden: true,
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      thresholdReq("cash", 0, "=="), // Exactly $0
    ],
  }),

  defineAchievement({
    id: "robots_before_people",
    name: "Robots Before People",
    description: "You automated the factory before hiring anyone qualified to run it. Bold. Terrifying. But bold.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Bot",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "upgrades_before_exec" }],
  }),

  defineAchievement({
    id: "the_minimalist",
    name: "The Minimalist",
    description: "Less is more. You proved it. With math.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Minimize",
    hidden: true,
    requirements: [
      thresholdReq("final_ranking", 1, "=="), // #1 rank
      { type: "custom", operator: "==", value: "lowest_spend" }, // Lowest total spend
    ],
  }),

  defineAchievement({
    id: "office_space",
    name: "Office Space",
    description: "You hired a full workforce and produced absolutely nothing. Somewhere, Milton is stapling something.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Building2",
    hidden: true,
    requirements: [
      { type: "employee_count", operator: ">=", value: 100 }, // Full workforce
      thresholdReq("production_volume", 0, "=="), // Zero production
    ],
  }),

  defineAchievement({
    id: "gut_feeling",
    name: "Gut Feeling",
    description: "You never checked a route. Never ran a calculation. And still won. Either you're a savant or the luckiest person alive.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Compass",
    hidden: true,
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      thresholdReq("final_ranking", 1, "=="),
      { type: "custom", operator: "==", value: "no_logistics_tools" },
    ],
  }),

  defineAchievement({
    id: "living_on_the_edge",
    name: "Living on the Edge",
    description: "You make a fortune. You keep nothing. Your CFO has aged 30 years.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Banknote",
    hidden: true,
    requirements: [
      { type: "revenue", operator: "==", value: -1 }, // Best revenue
      { type: "cash", operator: "==", value: -2 }, // Lowest cash
    ],
  }),

  defineAchievement({
    id: "currency_casualty",
    name: "Currency Casualty",
    description: "Your biggest expense wasn't employees, factories, or marketing - it was the yen. Let that sink in.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Globe",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "fx_largest_expense" }],
  }),

  defineAchievement({
    id: "perfectly_terrible",
    name: "Perfectly Terrible",
    description: "You collected every infamy badge. This wasn't an accident. This was *art*.",
    hiddenDescription: "???",
    category: "secret",
    tier: "secret",
    icon: "Skull",
    hidden: true,
    requirements: [{ type: "custom", operator: "==", value: "all_infamy" }], // All infamy achievements
  }),
];

export default SECRET_ACHIEVEMENTS;
