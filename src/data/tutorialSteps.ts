import type { TutorialStep } from "@/lib/stores/tutorialStore";

/**
 * Light Tutorial (16-round "Quick Game" mode)
 * 3 quick overview steps for experienced players
 */
export const TUTORIAL_STEPS_LIGHT: TutorialStep[] = [
  {
    id: "welcome-quick",
    title: "Welcome to SimCorp!",
    description:
      "Your company is already set up with 5 products, equipment, and 63 workers. Focus on strategy: optimize production, marketing, and finances to beat competing teams.",
    targetPath: "",
    position: "center",
    tip: "This is a 16-round quick game. Each round = 1 quarter.",
  },
  {
    id: "key-actions",
    title: "Key Actions Each Round",
    description:
      "Each round: 1) Set production allocations in Factory, 2) Adjust advertising in Marketing, 3) Manage workforce in HR, 4) Monitor finances. Submit each module when ready.",
    targetPath: "/factory",
    position: "top-right",
    tip: "You can submit modules independently — no need to do everything at once.",
  },
  {
    id: "submit-overview",
    title: "Submit & Compete",
    description:
      "Submit your decisions for each module using the button at the bottom of each page. The facilitator advances the round once all teams are ready. Check Results to see how you rank!",
    targetPath: "",
    position: "bottom-center",
    tip: "Watch your cash — running out means limited options. Good luck!",
  },
];

/**
 * Full Tutorial (32-round "Full Simulation" mode)
 * 12 steps walking through every major game mechanic
 */
export const TUTORIAL_STEPS_FULL: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to SimCorp!",
    description:
      "You're the CEO of a brand-new phone manufacturing company. You have $175M in cash and one empty factory in North America. Your goal: build a profitable phone empire by buying equipment, hiring workers, sourcing materials, and competing in 5 market segments.",
    targetPath: "",
    position: "center",
    tip: "Each round represents one quarter. Make decisions, then submit to see results.",
  },
  {
    id: "factory-equipment",
    title: "Step 1: Buy Equipment",
    description:
      "Head to the Factory panel and open the Equipment tab. Purchase production machines to add manufacturing capacity. Assembly Lines are versatile, CNC Machines excel at precision, and Robotic Arms reduce labor costs. Each machine adds production capacity measured in units per round.",
    targetPath: "/factory",
    targetTab: "equipment",
    position: "top-right",
    tip: "Start with an Assembly Line ($5M, 10K units) - it's the best value for beginners.",
  },
  {
    id: "hr-hiring",
    title: "Step 2: Hire Workers",
    description:
      "Switch to HR and use the Recruitment tab. You need workers to operate machines (roughly 2.5 workers per machine). Engineers boost your R&D output, and Supervisors improve team efficiency. Choose a recruitment tier - higher tiers cost more but find better candidates.",
    targetPath: "/hr",
    targetTab: "recruitment",
    position: "top-right",
    tip: "Workers: run machines. Engineers: develop products. Supervisors: boost team performance.",
  },
  {
    id: "rd-products",
    title: "Step 3: Develop Products",
    description:
      "Visit R&D to start developing your first product. Choose a market segment to target - Budget phones are cheap to make but have thin margins, while Professional phones command premium prices but require high quality. Development takes 1-4 rounds depending on complexity.",
    targetPath: "/rnd",
    position: "top-right",
    tip: "The General segment is a good starting point - balanced demand and moderate quality requirements.",
  },
  {
    id: "global-ops-materials",
    title: "Step 4: Source Materials",
    description:
      "Go to the Supply Chain page to order raw materials from suppliers around the world. Each region offers different cost, quality, and reliability trade-offs. Asia is cheapest but less reliable; North America is premium quality but expensive. You need materials before you can produce!",
    targetPath: "/supply-chain",
    position: "top-right",
    tip: "Order enough materials to match your production capacity. Check unit costs per segment.",
  },
  {
    id: "global-ops-shipping",
    title: "Step 5: Choose Shipping",
    description:
      "When ordering materials, pick a shipping method. Sea freight is cheapest but takes the longest (2-3 rounds). Air freight arrives next round but costs 5x more. Land and Rail are good middle-ground options for nearby regions.",
    targetPath: "/supply-chain",
    position: "top-right",
    tip: "For your first order, Air freight ensures materials arrive quickly so you can start producing.",
  },
  {
    id: "factory-production",
    title: "Step 6: Set Production",
    description:
      "Back in Factory, open the Production tab to allocate how many units to produce per market segment. Your total production is limited by machine capacity and workforce size. Balance production across segments based on your materials and market strategy.",
    targetPath: "/factory",
    targetTab: "production",
    position: "top-right",
    tip: "Don't produce more than your capacity allows - check Total Capacity in the overview.",
  },
  {
    id: "marketing-ads",
    title: "Step 7: Marketing & Advertising",
    description:
      "Open the Marketing panel to set advertising budgets per segment. Advertising builds brand value, which is a key factor in winning market share. Brand value grows with investment but decays 2% each round if you stop spending. Focus budget on segments you're actively selling in.",
    targetPath: "/marketing",
    targetTab: "advertising",
    position: "top-right",
    tip: "Start with $500K-$1M per segment you're targeting. Diminishing returns kick in after $3M.",
  },
  {
    id: "esg-sustainability",
    title: "Step 8: ESG & Sustainability",
    description:
      "In the Factory ESG tab, invest in sustainability initiatives. Your ESG score affects revenue: 700+ gives a +5% bonus, while below 300 incurs a -8% penalty. Free initiatives like Code of Ethics are easy wins. Toggle them on to boost your score.",
    targetPath: "/factory",
    targetTab: "esg",
    position: "top-right",
    tip: "Code of Ethics is free and gives +200 ESG. Always enable it!",
  },
  {
    id: "finance-overview",
    title: "Step 9: Monitor Finances",
    description:
      "Check the Finance tab to track your financial health. Watch your cash balance, revenue, net income, and market cap. If you need more capital, you can issue corporate bonds or stocks - but debt costs interest and stock issuance dilutes your shares.",
    targetPath: "/finance",
    position: "top-right",
    tip: "Keep an eye on cash flow - running out of cash means game over!",
  },
  {
    id: "factory-upgrades",
    title: "Step 10: Factory Upgrades",
    description:
      "As your company grows, invest in factory upgrades for permanent bonuses. Six Sigma reduces defects by 40%, Automation cuts worker needs by 80%, and Supply Chain improvements slash shipping costs. Higher-tier upgrades require R&D technology unlocks.",
    targetPath: "/factory",
    targetTab: "upgrades",
    position: "top-right",
    tip: "Upgrades are expensive but pay for themselves over many rounds. Plan ahead!",
  },
  {
    id: "submit-round",
    title: "Ready to Submit!",
    description:
      "You've seen all the key features! Review your decisions in each tab, then submit your decisions for each module using the Submit button at the bottom of each page. The facilitator will advance the round once all teams are ready. Good luck, CEO!",
    targetPath: "",
    position: "bottom-center",
    tip: "You can always revisit any tab to adjust before the round is advanced. Take your time!",
  },
];

/**
 * Medium Tutorial (24-round "Standard" mode)
 * 7 condensed steps
 */
export const TUTORIAL_STEPS_MEDIUM: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to SimCorp!",
    description:
      "You're running a phone manufacturing company with $175M in cash, a factory with equipment and workers, and 5 product lines ready to sell. Your goal: maximize profits and market share across 24 rounds.",
    targetPath: "",
    position: "center",
    tip: "Your company is already set up - focus on strategy and optimization!",
  },
  {
    id: "factory-overview",
    title: "Your Factory",
    description:
      "The Factory panel manages production. You have machines, workers, and production lines. Use the Equipment tab to buy more equipment, Production tab to allocate units, and Upgrades to improve efficiency. ESG initiatives boost your sustainability score.",
    targetPath: "/factory",
    targetTab: "equipment",
    position: "top-right",
    tip: "Check your total capacity and worker count to plan production.",
  },
  {
    id: "hr-overview",
    title: "Human Resources",
    description:
      "Manage your workforce through hiring, training, and compensation. Workers operate machines, Engineers drive R&D, and Supervisors boost team performance. Keep morale high and turnover low for maximum efficiency.",
    targetPath: "/hr",
    position: "top-right",
    tip: "Premium recruitment finds better candidates. Training improves existing staff.",
  },
  {
    id: "supply-chain",
    title: "Global Supply Chain",
    description:
      "Source materials from global suppliers in the Supply Chain tab. Balance cost, quality, and delivery time. Order materials in advance - sea freight is cheap but slow, air freight is fast but expensive.",
    targetPath: "/supply-chain",
    position: "top-right",
    tip: "Asia offers the cheapest materials. North America has the highest quality.",
  },
  {
    id: "marketing-strategy",
    title: "Marketing & Sales",
    description:
      "Set advertising budgets per market segment to build brand value. Higher brand value means more market share. Run promotions for short-term boosts and consider sponsorships for maximum reach.",
    targetPath: "/marketing",
    targetTab: "advertising",
    position: "top-right",
    tip: "Brand decays 2% per round - keep investing to maintain your edge.",
  },
  {
    id: "rd-innovation",
    title: "R&D & Innovation",
    description:
      "Invest in R&D to improve product quality, develop new products, and unlock technologies. Technologies gate access to factory upgrades. Patents generate ongoing value.",
    targetPath: "/rnd",
    position: "top-right",
    tip: "Quality improvements get exponentially more expensive above 90.",
  },
  {
    id: "submit",
    title: "Make Your Move!",
    description:
      "Review your decisions across all tabs, then submit your decisions for each module. Once all teams submit, the facilitator advances the round. You'll see a performance report with revenue, market share, and key metrics. Good luck!",
    targetPath: "",
    position: "bottom-center",
    tip: "Each round represents one quarter. Plan ahead for long-term success!",
  },
];
