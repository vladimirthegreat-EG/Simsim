/**
 * HR Achievements
 *
 * 21 achievements total:
 * - 11 positive (Bronze: 2, Silver: 3, Gold: 4, Platinum: 2)
 * - 10 infamy
 */

import { ExtendedAchievement, defineAchievement, thresholdReq, sustainedReq } from "../types";

export const HR_ACHIEVEMENTS: ExtendedAchievement[] = [
  // ============================================
  // GOOD PERFORMANCE
  // ============================================

  // Bronze
  defineAchievement({
    id: "first_handshake",
    name: "First Handshake",
    description: "Recruit your first employee.",
    flavor: "You're no longer talking to yourself in the office. Progress!",
    category: "hr",
    tier: "bronze",
    icon: "UserPlus",
    requirements: [thresholdReq("employee_count", 1)],
  }),

  defineAchievement({
    id: "training_montage",
    name: "Training Montage",
    description: "Enroll employees in a training program.",
    flavor: "Eye of the Tiger plays softly in the HR department.",
    category: "hr",
    tier: "bronze",
    icon: "GraduationCap",
    requirements: [{ type: "custom", operator: ">", value: 0 }], // Any training enrollment
  }),

  // Silver
  defineAchievement({
    id: "headhunter",
    name: "Headhunter",
    description: "Hire through the Executive recruitment tier.",
    flavor: "You're not hiring employees anymore — you're *acquiring talent*.",
    category: "hr",
    tier: "silver",
    icon: "UserCheck",
    requirements: [{ type: "custom", operator: "==", value: "executive" }],
  }),

  defineAchievement({
    id: "benefits_buffet",
    name: "Benefits Buffet",
    description: "Activate all available employee benefits.",
    flavor: "Health, dental, gym, therapy — your employees are living better than most kings.",
    category: "hr",
    tier: "silver",
    icon: "Heart",
    requirements: [{ type: "benefits_level", operator: "==", value: 100 }], // All benefits active
  }),

  defineAchievement({
    id: "above_average",
    name: "Above Average",
    description: "Set salary adjustment above industry average.",
    flavor: "Your employees actually *want* to come to work on Monday. Science can't explain it.",
    category: "hr",
    tier: "silver",
    icon: "DollarSign",
    requirements: [thresholdReq("salary_level", 100, ">")], // Above 100% industry average
  }),

  // Gold
  defineAchievement({
    id: "talent_magnet",
    name: "Talent Magnet",
    description: "Have 50+ employees hired through Premium or Executive tiers.",
    flavor: "LinkedIn influencers are writing 'What I learned from trying to get hired at YOUR company.'",
    category: "hr",
    tier: "gold",
    icon: "Magnet",
    requirements: [{ type: "custom", operator: ">=", value: 50 }], // 50+ premium hires
  }),

  defineAchievement({
    id: "alma_mater",
    name: "Alma Mater",
    description: "Have every single employee complete at least one training program.",
    flavor: "Your company is basically a university that also makes money.",
    category: "hr",
    tier: "gold",
    icon: "School",
    requirements: [thresholdReq("training_level", 100)], // 100% trained
  }),

  defineAchievement({
    id: "retention_king",
    name: "Retention King",
    description: "Go 4 consecutive quarters with zero voluntary turnover.",
    flavor: "Nobody leaves. Not because they can't — because they don't *want* to.",
    category: "hr",
    tier: "gold",
    icon: "Crown",
    requirements: [sustainedReq("turnover_rate", 0, 4, "==")],
  }),

  defineAchievement({
    id: "culture_club",
    name: "Culture Club",
    description: "Have workforce satisfaction above 90% while keeping compensation below industry average.",
    flavor: "Your people stay for the vibes, not the paycheck. That's either inspiring or concerning.",
    category: "hr",
    tier: "gold",
    icon: "Music",
    requirements: [
      thresholdReq("morale", 90),
      thresholdReq("salary_level", 100, "<"),
    ],
  }),

  // Platinum
  defineAchievement({
    id: "best_place_to_work",
    name: "Best Place to Work",
    description: "Achieve the highest workforce satisfaction score among all teams.",
    flavor: "Glassdoor rating: 4.9 stars. The 0.1 missing is from the intern who wanted a foosball table.",
    category: "hr",
    tier: "platinum",
    icon: "Star",
    requirements: [{ type: "morale", operator: "==", value: -1 }], // -1 = best among teams
  }),

  defineAchievement({
    id: "dream_factory",
    name: "Dream Factory",
    description: "Max out recruitment tier, all training programs, top compensation, and all benefits simultaneously.",
    flavor: "Your HR department didn't build a team — they built a *civilization*.",
    category: "hr",
    tier: "platinum",
    icon: "Sparkles",
    requirements: [
      { type: "custom", operator: "==", value: "executive" }, // Top recruitment
      thresholdReq("training_level", 100),
      thresholdReq("salary_level", 100),
      thresholdReq("benefits_level", 100),
    ],
  }),

  // ============================================
  // BAD PERFORMANCE (INFAMY)
  // ============================================

  defineAchievement({
    id: "the_tyrant",
    name: "The Tyrant",
    description: "Have the lowest workforce satisfaction among all teams while paying below-average salaries.",
    flavor: "Congratulations, you've speedrun every 'worst boss' article on the internet.",
    category: "hr",
    tier: "infamy",
    icon: "Angry",
    requirements: [
      { type: "morale", operator: "==", value: -2 }, // -2 = worst among teams
      thresholdReq("salary_level", 100, "<"),
    ],
  }),

  defineAchievement({
    id: "revolving_door",
    name: "Revolving Door",
    description: "Lose 30%+ of your workforce in a single quarter due to low satisfaction.",
    flavor: "Your exit interviews need their own filing cabinet.",
    category: "hr",
    tier: "infamy",
    icon: "DoorOpen",
    requirements: [thresholdReq("turnover_rate", 30)],
  }),

  defineAchievement({
    id: "sweatshop_chic",
    name: "Sweatshop Chic",
    description: "Maximum production output with minimum compensation and zero benefits.",
    flavor: "Dickensian, but make it modern.",
    category: "hr",
    tier: "infamy",
    icon: "Frown",
    requirements: [
      thresholdReq("capacity_utilization", 100),
      thresholdReq("salary_level", 70, "<"),
      thresholdReq("benefits_level", 0, "=="),
    ],
  }),

  defineAchievement({
    id: "training_never_heard_of_it",
    name: "Training? Never Heard of It",
    description: "Reach the final quarter without ever enrolling anyone in a training program.",
    flavor: "Your employees are learning through the ancient technique of 'figuring it out, I guess.'",
    category: "hr",
    tier: "infamy",
    icon: "BookX",
    requirements: [
      thresholdReq("game_completed", 1, "=="),
      thresholdReq("training_level", 0, "=="),
    ],
  }),

  defineAchievement({
    id: "bargain_basement_boss",
    name: "Bargain Basement Boss",
    description: "Only ever use Basic tier recruitment while competitors use Executive.",
    flavor: "You get what you pay for. And what you got was... *that*.",
    category: "hr",
    tier: "infamy",
    icon: "BadgeDollarSign",
    requirements: [{ type: "custom", operator: "==", value: "basic_only" }],
  }),

  defineAchievement({
    id: "the_scrooge",
    name: "The Scrooge",
    description: "Cut salaries AND benefits in the same quarter.",
    flavor: "Somewhere, Bob Cratchit is shaking his head in solidarity with your workforce.",
    category: "hr",
    tier: "infamy",
    icon: "Minus",
    requirements: [{ type: "custom", operator: "==", value: true }], // Both cut same quarter
  }),

  defineAchievement({
    id: "skeleton_crew",
    name: "Skeleton Crew",
    description: "Operate with less than half the workforce you need for your production targets.",
    flavor: "Your remaining employees aren't burning the candle at both ends — they ARE the candle.",
    category: "hr",
    tier: "infamy",
    icon: "Skull",
    requirements: [{ type: "custom", operator: "<", value: 50, percentage: true }], // <50% staffing
  }),

  defineAchievement({
    id: "stockholm_syndrome_inc",
    name: "Stockholm Syndrome Inc.",
    description: "Have high employee retention despite bottom-tier satisfaction.",
    flavor: "They're not staying because they like it. They're staying because they've forgotten what happiness feels like.",
    category: "hr",
    tier: "infamy",
    icon: "Lock",
    requirements: [
      thresholdReq("turnover_rate", 5, "<"),
      thresholdReq("morale", 40, "<"),
    ],
  }),

  defineAchievement({
    id: "motivational_massacre",
    name: "The Motivational Massacre",
    description: "Decrease employee satisfaction 3 quarters in a row.",
    flavor: "Your HR department isn't managing people — it's curating a sadness exhibition.",
    category: "hr",
    tier: "infamy",
    icon: "TrendingDown",
    requirements: [sustainedReq("custom", -1, 3)], // Declining morale 3 rounds
  }),

  defineAchievement({
    id: "all_chiefs_no_indians",
    name: "All Chiefs, No Indians",
    description: "Hire exclusively at Executive tier but have fewer than 10 total employees.",
    flavor: "You have a boardroom full of VPs and nobody to do actual work.",
    category: "hr",
    tier: "infamy",
    icon: "UsersSlash",
    requirements: [
      { type: "custom", operator: "==", value: "executive_only" },
      thresholdReq("employee_count", 10, "<"),
    ],
  }),
];

export default HR_ACHIEVEMENTS;
