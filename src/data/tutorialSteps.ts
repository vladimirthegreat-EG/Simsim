import type { TutorialStep } from "@/lib/stores/tutorialStore";

/**
 * Light Tutorial (16-round "Quick Game" mode)
 * 4 fast steps for experienced players — company is fully operational
 */
export const TUTORIAL_STEPS_LIGHT: TutorialStep[] = [
  {
    id: "welcome-quick",
    title: "Welcome to SimCorp!",
    description:
      "You're CEO of a fully operational phone company with $175M in cash, 63 staff, and 5 product lines covering every market segment. Your goal: maximize Earnings Per Share (EPS) over 16 rounds to finish #1 on the leaderboard.",
    targetPath: "",
    position: "center",
    objective: "Highest EPS at the end of the game wins.",
    tip: "Each round = 1 quarter. You compete against other teams in real time.",
  },
  {
    id: "key-decisions",
    title: "Your Key Decisions",
    description:
      "Each round you manage 5 modules: Factory (production volume & upgrades), HR (hiring & training), Marketing (ad budgets & brand), Finance (debt, stock, cash flow), and R&D (quality & new products). Submit each module independently when ready.",
    targetPath: "",
    position: "center",
    tip: "Focus on the modules that matter most for your strategy — you don't have to change everything every round.",
  },
  {
    id: "factory-quick",
    title: "Production & Sales",
    description:
      "In Factory, set how many units to produce per segment. Your production is limited by machine capacity and workforce. Units are sold automatically based on your price, quality, brand value, and advertising — check Results after each round to see your market share.",
    targetPath: "/factory",
    targetTab: "production",
    position: "top-right",
    tip: "Don't overproduce — unsold inventory ties up cash. Match production to demand.",
  },
  {
    id: "workflow-quick",
    title: "Ready to Compete!",
    description:
      "Use the Round Checklist in the sidebar to track which modules you've submitted. Once all teams submit, the facilitator advances the round. After each round, check Results to see your revenue, EPS, and market position. Good luck!",
    targetPath: "",
    position: "bottom-center",
    tip: "Watch your cash flow — if you run out of cash, your options become very limited.",
  },
];

/**
 * Medium Tutorial (24-round "Standard" mode)
 * 8 guided steps — company starts with 2 segments (General & Budget), 26 staff
 */
export const TUTORIAL_STEPS_MEDIUM: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to SimCorp!",
    description:
      "You're CEO of a small phone company with $175M in cash, 26 staff, and 2 product lines (General and Budget phones). Over 24 rounds, grow your company by expanding into new segments, hiring more staff, and outperforming the competition.",
    targetPath: "",
    position: "center",
    objective: "Highest Earnings Per Share (EPS) at the end wins. Revenue and market share also matter.",
    tip: "You start small — but you have the cash and time to grow into all 5 segments.",
  },
  {
    id: "overview-dashboard",
    title: "Your Company Dashboard",
    description:
      "This is your Overview page. It shows your cash, revenue, net income, workforce, factory capacity, and market position at a glance. Check here each round to see how your company is performing before making decisions.",
    targetPath: "",
    position: "top-right",
    tip: "The key numbers to watch: Cash (don't run out!), Revenue (growing?), and EPS (your ranking metric).",
  },
  {
    id: "factory-overview",
    title: "Your Factory",
    description:
      "The Factory manages production. You currently have 2 production lines (General & Budget). Use the Production tab to set how many units to build, Equipment to buy more machines, and Upgrades to improve efficiency. To sell in new segments, you'll need to develop products in R&D first.",
    targetPath: "/factory",
    targetTab: "overview",
    position: "top-right",
    tip: "Your production capacity is limited by machines and workers. Check Total Capacity before allocating.",
  },
  {
    id: "hr-overview",
    title: "Human Resources",
    description:
      "Manage your 26 staff through hiring, training, and benefits. Workers operate machines (you'll need more as you expand), Engineers drive R&D, and Supervisors boost team performance. Keep morale high with training and fair benefits — unhappy workers quit.",
    targetPath: "/hr",
    targetTab: "overview",
    position: "top-right",
    tip: "Premium recruitment finds better candidates. Training improves existing staff.",
  },
  {
    id: "marketing-strategy",
    title: "Marketing & Brand",
    description:
      "Set advertising budgets per market segment to build brand value. Higher brand = more market share = more sales. Brand value decays 2% per round without investment, so keep spending! Focus budget on segments you're actively selling in.",
    targetPath: "/marketing",
    targetTab: "advertising",
    position: "top-right",
    tip: "Start with $500K-$1M per active segment. Diminishing returns kick in above $3M.",
  },
  {
    id: "rd-innovation",
    title: "R&D & New Products",
    description:
      "R&D lets you improve existing product quality, develop new products for other segments, and unlock technologies. To expand beyond General and Budget, start developing products for Enthusiast, Professional, or Active Lifestyle segments here.",
    targetPath: "/rnd",
    position: "top-right",
    tip: "Development takes 1-4 rounds. Plan ahead — start R&D early to enter new segments on time.",
  },
  {
    id: "finance-overview",
    title: "Finance & Cash Flow",
    description:
      "Monitor your financial health: cash, revenue, net income, and EPS. If you need more capital to fund expansion, you can issue corporate bonds (debt) or stock (dilutes EPS). Balance growth investment with profitability.",
    targetPath: "/finance",
    position: "top-right",
    tip: "EPS = Net Income / Shares Outstanding. Issuing stock lowers EPS — use debt strategically instead.",
  },
  {
    id: "submit",
    title: "Start Growing!",
    description:
      "Use the Round Checklist in the sidebar to track which modules you've submitted. Once all teams submit, the facilitator advances the round. Check Results to see your revenue, market share, and ranking against other teams.",
    targetPath: "",
    position: "bottom-center",
    objective: "Expand from 2 segments to 5, grow your workforce, and maximize EPS to win!",
    tip: "Each round = 1 quarter. Think long-term — invest now, profit later!",
  },
];

/**
 * Full Tutorial (32-round "Full Simulation" mode)
 * 12 detailed steps — building everything from scratch
 */
export const TUTORIAL_STEPS_FULL: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to SimCorp!",
    description:
      "You're the CEO of a brand-new phone company starting from scratch. You have $175M in cash and one empty factory. Your mission: hire workers, buy equipment, develop products, and build a profitable phone empire over 32 rounds.",
    targetPath: "",
    position: "center",
    objective: "Highest Earnings Per Share (EPS) at the end wins. Revenue and market share are also tracked.",
    tip: "Each round = 1 quarter. Take your time in early rounds to set up your company properly.",
  },
  {
    id: "overview-first",
    title: "Your Starting Position",
    description:
      "This is your Overview dashboard. Right now everything is at zero — no products, no workers, no revenue. That's okay! Over the next few steps, you'll set up your company piece by piece. Follow along and you'll be producing phones in no time.",
    targetPath: "",
    position: "top-right",
    tip: "Check this dashboard each round to track your progress.",
  },
  {
    id: "factory-equipment",
    title: "Step 1: Buy Equipment",
    description:
      "Head to the Factory and open the Equipment tab. Purchase production machines to add manufacturing capacity. Assembly Lines are versatile ($5M, 10K units/round), CNC Machines add precision, and Robotic Arms reduce labor needs. You need machines before you can produce anything.",
    targetPath: "/factory",
    targetTab: "equipment",
    position: "top-right",
    tip: "Start with 1-2 Assembly Lines — they're the best value for beginners.",
  },
  {
    id: "hr-hiring",
    title: "Step 2: Hire Workers",
    description:
      "Go to HR and open the Recruitment tab. You need workers to operate machines (roughly 2-3 workers per machine). Engineers boost R&D output, and Supervisors improve team performance. Choose a recruitment tier — higher tiers cost more but find better candidates.",
    targetPath: "/hr",
    targetTab: "recruitment",
    position: "top-right",
    tip: "Workers run machines, Engineers develop products, Supervisors boost performance. Hire workers first!",
  },
  {
    id: "rd-products",
    title: "Step 3: Develop Your First Product",
    description:
      "Visit R&D to start developing a product. Choose a market segment: Budget phones are cheap to make but thin margins, General is balanced, Professional commands premium prices but needs high quality. Development takes 1-4 rounds depending on complexity.",
    targetPath: "/rnd",
    position: "top-right",
    tip: "Start with General or Budget — they have the most demand and easiest quality requirements.",
  },
  {
    id: "supply-chain",
    title: "Step 4: Source Materials",
    description:
      "Go to Supply Chain to order raw materials. Each region offers different cost, quality, and reliability: Asia is cheapest but less reliable; North America is premium quality but expensive. You need materials in stock before you can produce!",
    targetPath: "/supply-chain",
    position: "top-right",
    tip: "Use Air freight for your first order so materials arrive next round. Sea freight is cheaper but takes 2-3 rounds.",
  },
  {
    id: "factory-production",
    title: "Step 5: Set Production",
    description:
      "Once you have equipment, workers, a product, and materials — go to Factory > Production and allocate how many units to produce. Your output is limited by machine capacity, workforce size, and available materials.",
    targetPath: "/factory",
    targetTab: "production",
    position: "top-right",
    tip: "You can only produce products that have finished development (status: Launched).",
  },
  {
    id: "marketing-ads",
    title: "Step 6: Marketing & Advertising",
    description:
      "Open Marketing to set advertising budgets. Advertising builds brand value, which drives market share. Without advertising, nobody knows your phones exist! Focus budget on segments where you have a launched product.",
    targetPath: "/marketing",
    targetTab: "advertising",
    position: "top-right",
    tip: "Start with $500K-$1M per segment. Brand decays 2% per round without investment.",
  },
  {
    id: "esg-sustainability",
    title: "Step 7: ESG & Sustainability",
    description:
      "In Factory > ESG, invest in sustainability initiatives. Your ESG score affects revenue: scores below 400 incur penalties up to -8%. Free initiatives like Code of Ethics are easy wins — toggle them on now!",
    targetPath: "/factory",
    targetTab: "esg",
    position: "top-right",
    tip: "Code of Ethics is free and gives +200 ESG. Always enable it!",
  },
  {
    id: "finance-overview",
    title: "Step 8: Monitor Finances",
    description:
      "Check Finance to track cash, revenue, net income, and EPS. If you need capital, issue corporate bonds (debt with interest) or stocks (dilutes your EPS). Keep enough cash reserve for 2-3 rounds of operations.",
    targetPath: "/finance",
    position: "top-right",
    tip: "EPS = Net Income / Shares Outstanding. It's the main ranking metric — protect it!",
  },
  {
    id: "results-check",
    title: "Step 9: Check Results",
    description:
      "After each round, visit the Results page to see your performance: revenue, market share per segment, EPS ranking, and operational metrics. Compare yourself against other teams to refine your strategy.",
    targetPath: "/results",
    position: "top-right",
    tip: "Look at which segments are most profitable — focus your expansion there.",
  },
  {
    id: "submit-round",
    title: "You're Ready!",
    description:
      "Use the Round Checklist in the sidebar to submit each module (Factory, HR, Marketing, Finance, R&D). The facilitator advances the round once all teams are ready. Don't worry about getting everything perfect — you have 32 rounds to learn and adapt!",
    targetPath: "",
    position: "bottom-center",
    objective: "Build from scratch, expand into all 5 segments, and finish with the highest EPS.",
    tip: "Early rounds: invest in setup. Mid rounds: expand aggressively. Late rounds: maximize profit. Good luck!",
  },
];
