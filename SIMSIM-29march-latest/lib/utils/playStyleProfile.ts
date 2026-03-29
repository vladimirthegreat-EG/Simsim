import type { PlayStyle } from "@/lib/stores/tutorialStore";

export interface PlayStyleProfile {
  style: PlayStyle;
  name: string;
  icon: "gear" | "rocket" | "chart";
  tagline: string;
  description: string;
  strengths: string[];
  risks: string[];
  strategyTip: string;
}

const PROFILES: Record<PlayStyle, PlayStyleProfile> = {
  optimizer: {
    style: "optimizer",
    name: "The Optimizer",
    icon: "gear",
    tagline: "Focused on margin and efficiency upgrades. High ROIC.",
    description:
      "You instinctively seek the most efficient path. Your decisions prioritise reducing costs, " +
      "improving margins, and maximising return on every dollar invested. In business terms, " +
      "you have a high Return on Invested Capital (ROIC) mindset.",
    strengths: [
      "Strong cost discipline - your COGS will be lower than competitors",
      "High margins create a cash buffer for downturns",
      "Research investments are targeted and high-ROI",
    ],
    risks: [
      "May miss market expansion opportunities by playing it safe",
      "Competitors who grow faster may outscale you in later rounds",
      "Over-optimising one product can leave you vulnerable to segment shifts",
    ],
    strategyTip:
      "Your efficiency advantage compounds over time. Use your cost edge to either undercut competitors on price " +
      "or reinvest the extra margin into R&D for a technology moat. Consider expanding to a second segment by Round 8-10.",
  },
  expansionist: {
    style: "expansionist",
    name: "The Expansionist",
    icon: "rocket",
    tagline: "Chose new products and markets. High revenue ceiling, higher risk.",
    description:
      "You are drawn to growth and new opportunities. Your decisions prioritise expanding into " +
      "new markets, launching new products, and capturing territory before competitors. " +
      "You accept higher risk for higher potential reward.",
    strengths: [
      "First-mover advantage in new segments",
      "Diversified revenue streams reduce single-market risk",
      "More products mean more achievement opportunities",
    ],
    risks: [
      "Stretched resources across too many fronts",
      "Higher cash burn rate in early rounds",
      "Quality may suffer if R&D budget is split across too many products",
    ],
    strategyTip:
      "Your growth instinct is powerful but needs discipline. Ensure each new product has adequate " +
      "marketing budget and factory capacity before launching the next one. Target 2-3 segments by Round 10, " +
      "not all 5. Use Bonds to fund expansion if Cash runs low.",
  },
  analyst: {
    style: "analyst",
    name: "The Analyst",
    icon: "chart",
    tagline: "Balanced decisions, steady cycle performance. Balanced growth.",
    description:
      "You weigh options carefully and prefer balanced approaches. Your decisions show a " +
      "methodical mind that avoids extremes and manages risk through diversification. " +
      "In business terms, you are a steady-growth CEO.",
    strengths: [
      "Balanced resource allocation reduces catastrophic failures",
      "Consistent performance earns achievements across all categories",
      "Adaptable - can pivot strategy based on market conditions",
    ],
    risks: [
      "May not build a dominant advantage in any single area",
      "Aggressive competitors may outpace you in specific segments",
      "Analysis paralysis - sometimes the best move is a bold one",
    ],
    strategyTip:
      "Your balanced approach is ideal for the achievement system, which rewards breadth. " +
      "However, identify one segment where you can become dominant by Round 15 - having at least one " +
      "stronghold gives you a reliable revenue base while you build across other departments.",
  },
};

export function getPlayStyleProfile(style: PlayStyle): PlayStyleProfile {
  return PROFILES[style];
}

/** Map decision choices to which play style they indicate */
export const CHOICE_STYLE_MAP: Record<string, Record<string, PlayStyle>> = {
  "full-s2-recipe-choice": {
    budget: "optimizer",
    balanced: "analyst",
    quality: "optimizer",
  },
  "full-s3-pricing-dilemma": {
    low: "expansionist",
    market: "analyst",
    high: "optimizer",
  },
  "full-s4-efficiency-choice": {
    efficiency: "optimizer",
    expansion: "expansionist",
  },
};
