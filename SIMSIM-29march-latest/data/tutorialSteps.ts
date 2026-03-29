import type { TutorialStep } from "@/lib/stores/tutorialStore";

/**
 * Tutorial Steps - Three levels matching the three game presets.
 *
 * Terms wrapped in {{double braces}} render as hoverable glossary tooltips.
 * Each level has a unique CEO storyline matching its exact starting conditions.
 *
 * Light  (Quick Game - 16 rounds): Inherit a running company, optimize it
 * Medium (Standard Game - 24 rounds): Lead a small startup, grow it
 * Full   (Full Simulation - 32 rounds): Build from absolute zero
 */

// ============================================
// LIGHT TUTORIAL (Quick Game - 16 rounds)
// 6 steps. You inherit 63 staff, 5 products, all segments.
// ============================================

export const TUTORIAL_STEPS_LIGHT: TutorialStep[] = [
  {
    id: "light-welcome",
    title: "Welcome, New CEO",
    description:
      "The board has just appointed you CEO of an established phone company that has been coasting under previous leadership. Here is what you are inheriting:\n\n" +
      "- $175M in {{Cash}}\n" +
      "- 63 employees: 50 {{Workers}}, 8 {{Engineers}}, 5 {{Supervisors}}\n" +
      "- 5 phone products covering all 5 market {{Segments}}\n" +
      "- 50% {{Brand Value}} across the board\n\n" +
      "Your competitors just got new CEOs too. Over 16 rounds, the team that earns the most {{Achievement Points}} wins.\n\n" +
      "Achievements reward well-rounded strategy across every department - not just profit. There are 221 achievements in 6 tiers: Bronze (10 pts), Silver (25), Gold (50), Platinum (100), Secret (75, hidden until earned), and {{Infamy}} (-25, avoid these!).\n\n" +
      "Let's tour what you have inherited.",
    targetPath: "",
    position: "center",
    objective: "Earn the most {{Achievement Points}} across 16 rounds to win.",
    tip: "Visit the Achievements page early. Knowing what milestones exist helps you plan from day one.",
  },
  {
    id: "light-overview",
    title: "Your Company at a Glance",
    description:
      "This dashboard shows your company's vital signs at a glance:\n\n" +
      "- {{Cash}}: $175M available to invest and operate\n" +
      "- {{Revenue}}: Income from last round's phone sales\n" +
      "- {{Market Share}}: Your slice of each segment's sales\n" +
      "- {{ESG Score}}: Your sustainability rating (0-1000)\n\n" +
      "Below you will see your Product Portfolio (5 phones already in market), Workforce Summary (63 employees), and Factory Capacity.\n\n" +
      "Check the {{Round Checklist}} in the sidebar - it tracks which of the 5 departments you have submitted this round. All 5 must be saved before the round processes.\n\n" +
      "Your products exist, but are they competitive? Let's check R&D.",
    targetPath: "",
    position: "top-right",
    objective: "Familiarize yourself with the dashboard and {{Round Checklist}}.",
    tip: "Start each round here to see your current position before making decisions.",
  },
  {
    id: "light-rnd",
    title: "R&D: Improve & Innovate",
    description:
      "R&D is your innovation engine. Since you already have 5 products, focus on making them better:\n\n" +
      "- {{R&D Budget}} slider ($0-$30M): Funds ongoing research. Higher budget = faster progress\n" +
      "- {{Tech Upgrades}}: Improvements that boost all your phones (organized in tiers 1-5)\n" +
      "- {{Archetypes}}: Pre-designed phone templates for launching new products\n" +
      "- {{Feature Radar Chart}}: Shows how your phone's {{Features}} match what each segment wants\n\n" +
      "Each product has a {{Quality}} score and {{Features}} across 6 areas (camera, battery, AI, display, durability, connectivity). Different {{Segments}} care about different features.\n\n" +
      "You can also file {{Patents}} on technologies you have researched - this blocks competitors or earns licensing fees.\n\n" +
      "Great designs need to be manufactured. Let's look at the other departments.",
    targetPath: "/rnd",
    position: "top-right",
    objective: "Set your {{R&D Budget}} and review your 5 existing products.",
    tip: "Start researching tech upgrades immediately. They compound over time, so early investment pays off by mid-game.",
  },
  {
    id: "light-factory-hr-marketing",
    title: "Factory, HR & Marketing",
    description:
      "Three interconnected departments - more {{Workers}} means more production, which means more phones to advertise:\n\n" +
      "Factory:\n" +
      "- {{Production Allocation}}: Set what percentage of output goes to each segment\n" +
      "- {{Factory Upgrades}}: Buy equipment (tiers 1-5) to improve {{Efficiency}} and reduce {{Defect Rate}}\n" +
      "- {{ESG Initiatives}}: Invest in sustainability for {{ESG Score}} points\n\n" +
      "HR:\n" +
      "- Recruit {{Workers}}, {{Engineers}}, and {{Supervisors}} at different {{Recruitment Tiers}}\n" +
      "- {{Salary Slider}}: Adjust company-wide pay (-20% to +20%) to manage {{Morale}}\n" +
      "- Training programs to improve employee skills\n\n" +
      "Marketing:\n" +
      "- Advertising budget matrix: 5 {{Segments}} x 4 channels (TV, Digital, Social, Print)\n" +
      "- Each channel has a different {{CPM}} and effectiveness per segment\n" +
      "- {{Brand Value}} directly drives {{Market Share}} - and it suffers {{Brand Decay}} without ad spend\n\n" +
      "Visit each page and save your decisions.",
    targetPath: "/factory",
    position: "top-right",
    objective: "Set production, review your workforce, and allocate ad budgets.",
    tip: "Focus marketing budget on segments where your products are strongest. Spreading too thin wastes money.",
  },
  {
    id: "light-finance",
    title: "Finance: Your War Chest",
    description:
      "The Finance page is your capital management center:\n\n" +
      "- {{Balance Sheet}}: Everything you own vs. everything you owe\n" +
      "- {{T-Bills}}: Quick short-term borrowing at low interest\n" +
      "- {{Bonds}}: Larger, longer-term debt at higher interest\n" +
      "- {{Stock Issuance}}: Sell shares to raise cash (dilutes ownership)\n" +
      "- {{Share Buyback}}: Repurchase shares to boost per-share value\n" +
      "- {{Dividends}}: Pay shareholders to boost {{Stock Price}}\n" +
      "- {{Board Proposals}}: Major strategic moves requiring board approval\n\n" +
      "The golden rule: always keep enough {{Cash}} for 2-3 rounds of operating costs. Running out is catastrophic.\n\n" +
      "With $175M starting cash, you likely do not need to raise capital in Round 1. Just review and save.",
    targetPath: "/finance",
    position: "top-right",
    objective: "Review your finances and save.",
    tip: "Prefer {{Bonds}} over {{Stock Issuance}} when raising capital. Selling stock dilutes your ownership.",
  },
  {
    id: "light-ready",
    title: "Time to Compete!",
    description:
      "You know your company. Here is the round workflow:\n\n" +
      "1. Check Overview for your current position\n" +
      "2. R&D: Research tech and improve products\n" +
      "3. Factory: Set {{Production Allocation}} and manage equipment\n" +
      "4. HR: Recruit, train, and manage {{Morale}}\n" +
      "5. Marketing: Build {{Brand Value}} with ad budgets\n" +
      "6. Finance: Manage {{Cash}}, debt, and {{Dividends}}\n\n" +
      "Use the {{Round Checklist}} in the sidebar to confirm all 5 departments are saved. After {{Round Processing}}, check the Results page to see {{Market Share}}, {{Revenue}}, and competitor performance.\n\n" +
      "Win by earning the most {{Achievement Points}}. Achievements span every department:\n" +
      "- Factory: 'Peak Performance' (95% {{Efficiency}}, Gold, 50 pts)\n" +
      "- Marketing: 'Brand Titan' (80+ {{Brand Value}}, Gold, 50 pts)\n" +
      "- Finance: 'In the Black' (first positive {{Net Income}}, Bronze, 10 pts)\n\n" +
      "Visit the Achievements page to plan your strategy. Good luck, CEO!",
    targetPath: "",
    position: "center",
    objective: "Earn the most {{Achievement Points}} to claim victory.",
    tip: "Achievements reward breadth. Exploring all departments earns more points than maxing one area.",
  },
];

// ============================================
// MEDIUM TUTORIAL (Standard Game - 24 rounds)
// 9 steps. You start with 26 staff, 2 segments.
// ============================================

export const TUTORIAL_STEPS_MEDIUM: TutorialStep[] = [
  {
    id: "medium-welcome",
    title: "Welcome to SimCorp, CEO",
    description:
      "Congratulations - you have been named CEO of SimCorp, a small phone startup. Your investors have set you up with:\n\n" +
      "- $175M in {{Cash}} (seed capital from your investors)\n" +
      "- 26 employees: 20 {{Workers}}, 4 {{Engineers}}, 2 {{Supervisors}}\n" +
      "- Products in 2 {{Segments}}: Budget and General\n" +
      "- 30% starting {{Brand Value}}\n" +
      "- A small factory with basic equipment\n\n" +
      "Three more segments (Enthusiast, Professional, Active Lifestyle) are wide open - opportunities waiting for whoever gets there first.\n\n" +
      "Over 24 rounds, grow SimCorp into a market leader. The team with the most {{Achievement Points}} wins - not the most cash or the highest stock price.\n\n" +
      "Let's see what your company looks like right now.",
    targetPath: "",
    position: "center",
    objective: "Build SimCorp into the top phone company over 24 rounds.",
    tip: "Visit the Achievements page early. There are 221 achievements across 12 categories guiding your strategy.",
  },
  {
    id: "medium-overview",
    title: "Your Starting Position",
    description:
      "This is your company dashboard. Right now it shows:\n\n" +
      "- {{Cash}}: $175M available\n" +
      "- Employees: 26 total (20 {{Workers}} running production, 4 {{Engineers}} in R&D, 2 {{Supervisors}})\n" +
      "- Products: 2 starter phones in Budget and General\n" +
      "- {{Brand Value}}: 30% (customers barely know you exist)\n" +
      "- {{ESG Score}}: Starting at 0\n\n" +
      "The dashboard also shows {{Revenue}}, {{Net Income}}, and {{Market Share}} - all zero until your phones start selling.\n\n" +
      "Notice the {{Round Checklist}} in the sidebar: 5 departments to submit each round (Factory, HR, Marketing, Finance, R&D). All must be saved before the round advances.\n\n" +
      "To compete, you need better phones. Let's visit R&D.",
    targetPath: "",
    position: "top-right",
    objective: "Understand your starting position and locate the {{Round Checklist}}.",
    tip: "Numbers will be mostly zero on Round 1. They come alive once your phones start selling after the first round processes.",
  },
  {
    id: "medium-rnd",
    title: "R&D: Your Innovation Engine",
    description:
      "R&D is where your products are born. Here is what you control:\n\n" +
      "- {{R&D Budget}}: Slider from $0-$30M per round. Higher budget = faster research and better products\n" +
      "- Create Products: Build new phones via {{Archetypes}} (pre-designed templates) or Custom Build\n" +
      "- {{Tech Upgrades}}: Research improvements that make ALL your phones better\n" +
      "- {{Patents}}: File legal protection on your tech to block competitors\n\n" +
      "Each phone targets a segment and has {{Quality}} and {{Features}} scores. The {{Feature Radar Chart}} shows how your phone's 6 feature areas (camera, battery, AI, display, durability, connectivity) compare to what the segment wants.\n\n" +
      "You already have 2 products. For Round 1: set an {{R&D Budget}} ($5-10M is a good start), and consider designing a phone for a third segment to expand your market.\n\n" +
      "Products need to be manufactured. Let's look at the factory.",
    targetPath: "/rnd",
    position: "top-right",
    objective: "Set your {{R&D Budget}} and consider creating a third product.",
    tip: "More {{Engineers}} on your team = faster research. Consider hiring engineers on the HR page.",
  },
  {
    id: "medium-factory",
    title: "Factory: Your Production Floor",
    description:
      "Your factory turns product designs into physical phones. Key mechanics:\n\n" +
      "- {{Production Allocation}}: Distribute your output across {{Segments}} (match where you have products)\n" +
      "- {{Factory Upgrades}}: Equipment improvements in 5 tiers (Six Sigma, Automation, Robotics, etc.)\n" +
      "- {{Efficiency}}: How well your factory converts materials to phones (higher = less waste, lower costs)\n" +
      "- {{Capacity Utilization}}: How much of your max output you are using (100% = maxed out)\n" +
      "- {{ESG Initiatives}}: Green energy and sustainability investments that boost your {{ESG Score}}\n\n" +
      "Production is limited by 3 things:\n" +
      "- Machine capacity (buy {{Factory Upgrades}} to expand)\n" +
      "- {{Workers}} (hire more on the HR page)\n" +
      "- Materials (order through the {{Supply Chain}} tab)\n\n" +
      "For Round 1: allocate production to Budget and General (your 2 active segments).\n\n" +
      "You need people to run those machines. Let's check HR.",
    targetPath: "/factory",
    position: "top-right",
    objective: "Set {{Production Allocation}} for your active segments.",
    tip: "Start conservative with production. Unsold inventory ties up {{Cash}}. Scale up as you learn demand patterns.",
  },
  {
    id: "medium-hr",
    title: "HR: Building Your Team",
    description:
      "Great phones need great people. Your 26 employees break down as:\n\n" +
      "- {{Workers}} (20): Operate production lines. You need about 2-3 per machine\n" +
      "- {{Engineers}} (4): Speed up R&D and improve product {{Quality}}\n" +
      "- {{Supervisors}} (2): Boost overall team {{Efficiency}} and {{Morale}}\n\n" +
      "What you can do:\n" +
      "- Recruit new staff at different {{Recruitment Tiers}} (Basic/Premium/Executive)\n" +
      "- {{Salary Slider}}: Adjust pay from -20% to +20%. Higher pay improves {{Morale}}\n" +
      "- Training: Improve employee skills without raising base pay\n" +
      "- Benefits: Health insurance, retirement plans, etc.\n\n" +
      "{{Morale}} matters: happy employees work harder and stay longer. The {{Turnover Rate}} climbs when morale drops below 60%, and replacing employees costs time and money.\n\n" +
      "For Round 1: start Basic recruitment for additional {{Workers}} and {{Engineers}}.\n\n" +
      "Now let's tell the world about your products.",
    targetPath: "/hr",
    targetTab: "recruitment",
    position: "top-right",
    objective: "Start recruiting {{Workers}} and {{Engineers}}.",
    tip: "A small salary raise (+5%) in early rounds keeps {{Morale}} stable while you build {{Revenue}}.",
  },
  {
    id: "medium-marketing",
    title: "Marketing: Build Your Brand",
    description:
      "Nobody buys a phone they have never heard of. Here is how marketing works:\n\n" +
      "- Advertising matrix: 5 {{Segments}} x 4 channels (TV, Digital, Social, Print)\n" +
      "- Each channel has a different {{CPM}} (cost per 1,000 impressions)\n" +
      "- Channel effectiveness varies by segment (e.g., Digital works great for Enthusiast, less so for Professional)\n" +
      "- Ad spend builds {{Brand Value}} in each segment\n" +
      "- {{Brand Value}} directly drives {{Market Share}} - stronger brand = more sales\n" +
      "- {{Brand Decay}}: Without investment, brand drops about 2% per round\n\n" +
      "Focus budget on segments where you have products. Spending on empty segments is wasted money.\n\n" +
      "For Round 1: allocate $500K-$1M each to Budget and General.\n\n" +
      "Time to check the money situation.",
    targetPath: "/marketing",
    position: "top-right",
    objective: "Set advertising budgets for Budget and General segments.",
    tip: "Diminishing returns kick in above $3M per segment. Spreading budget is usually better than concentrating it.",
  },
  {
    id: "medium-finance",
    title: "Finance: Cash Is King",
    description:
      "Your financial command center:\n\n" +
      "- {{Balance Sheet}}: Your assets vs. liabilities at a glance\n" +
      "- {{T-Bills}}: Short-term borrowing, low interest, quick cash\n" +
      "- {{Bonds}}: Bigger loans, longer term, higher interest\n" +
      "- {{Stock Issuance}}: Sell shares for cash (dilutes ownership)\n" +
      "- {{Dividends}}: Pay shareholders (costs {{Cash}} but boosts {{Stock Price}})\n" +
      "- {{Share Buyback}}: Buy your own shares to increase per-share value\n\n" +
      "Golden rule: always keep enough {{Cash}} for 2-3 rounds of operating costs. Running out means you cannot pay employees or buy materials.\n\n" +
      "With $175M, you probably do not need to raise capital yet. Review your numbers and save.\n\n" +
      "Before we start, let's make sure you know how to win.",
    targetPath: "/finance",
    position: "top-right",
    objective: "Review your {{Balance Sheet}} and save.",
    tip: "Prefer {{Bonds}} over {{Stock Issuance}} when you need funding. Stock dilution hurts your per-share metrics long-term.",
  },
  {
    id: "medium-quiz",
    title: "Quick Check: How Do You Win?",
    description:
      "Let's make sure you understand the victory condition. This shapes every strategic decision you make.",
    targetPath: "",
    position: "center",
    interactive: "quiz",
    requiresInteraction: true,
    quiz: {
      question: "How is the winner determined?",
      options: [
        "Have the most cash at the end",
        "Earn the most Achievement Points",
        "Sell the most phones",
        "Have the highest stock price",
      ],
      correctIndex: 1,
      explanation:
        "Achievement Points determine the winner! There are 221 achievements across 12 categories and 6 tiers: Bronze (10 pts), Silver (25), Gold (50), Platinum (100), Secret (75, hidden until earned), and Infamy (-25, avoid!). Well-rounded strategy across all departments earns the most points.",
    },
  },
  {
    id: "medium-ready",
    title: "Go Build SimCorp!",
    description:
      "You are ready. Here is your round workflow:\n\n" +
      "1. Overview: Check your position\n" +
      "2. R&D: Set {{R&D Budget}}, develop products, research {{Tech Upgrades}}\n" +
      "3. Factory: Set {{Production Allocation}}, manage equipment\n" +
      "4. HR: Recruit, train, manage {{Morale}} via {{Salary Slider}}\n" +
      "5. Marketing: Build {{Brand Value}} with advertising\n" +
      "6. Finance: Manage {{Cash}}, debt, {{Dividends}}\n\n" +
      "Use the {{Round Checklist}} to confirm all 5 departments are saved. After {{Round Processing}}, check Results to see how you performed.\n\n" +
      "Growth strategy:\n" +
      "- Rounds 1-6: Invest in R&D and hiring. Launch products in new {{Segments}}\n" +
      "- Rounds 7-14: Ramp production, build {{Brand Value}}, upgrade factory\n" +
      "- Rounds 15-24: Optimize {{Profit Margin}}, chase Platinum achievements, protect your lead\n\n" +
      "Some achievement examples to aim for:\n" +
      "- 'Assembly Required' (produce in all 5 segments, Bronze, 10 pts)\n" +
      "- 'Brand Titan' ({{Brand Value}} 80+, Gold, 50 pts)\n" +
      "- 'Dynasty' (hold #1 for 4 rounds, Platinum, 100 pts)\n\n" +
      "Good luck, CEO!",
    targetPath: "",
    position: "center",
    objective: "Earn the most {{Achievement Points}} across 24 rounds.",
    tip: "Check the Achievements page every few rounds to spot new milestones within reach.",
  },
];

// ============================================
// FULL TUTORIAL (Full Simulation - 32 rounds)
// 29 steps across 6 stages. You start with nothing - 0 staff, 0 products.
//
// Stage 1: Orientation & Business Context (4 steps)
// Stage 2: Production Basics (5 steps)
// Stage 3: Market & Trading (5 steps)
// Stage 4: Research & Upgrade Loop (5 steps)
// Stage 5: Guided Sandbox (6 steps)
// Stage 6: Graduation (4 steps)
// ============================================

export const TUTORIAL_STEPS_FULL: TutorialStep[] = [
  // ── STAGE 1: ORIENTATION & BUSINESS CONTEXT ──────────────────────
  // Zero mechanics. Full context. The player's first 3 minutes.
  {
    id: "full-s1-welcome",
    stage: 1,
    title: "Welcome, Founder",
    description:
      "You have inherited a small manufacturing firm with $175M in venture capital and a blank slate.\n\n" +
      "No employees. No products. No brand. Just capital and ambition.\n\n" +
      "Over 32 rounds, you will build SimCorp from scratch into a phone industry leader. Your competitors start from the same position.\n\n" +
      "The winner is the team with the most {{Achievement Points}} - not the most cash, revenue, or market share. There are 221 achievements rewarding well-rounded strategy across every department.\n\n" +
      "This tutorial teaches you how every system connects to every other system. Business is not a checklist - it is a loop.",
    targetPath: "",
    position: "center",
    objective: "Understand the business scenario and victory condition.",
    tip: "Your goal is always the same: make more than you spend, and grow.",
  },
  {
    id: "full-s1-scenario",
    stage: 1,
    title: "The Three Core Metrics",
    description:
      "Every decision you make will affect three interconnected metrics:\n\n" +
      "1. {{Profit Margin}} - Are you making money on each phone sold? Revenue minus {{COGS}} and expenses.\n\n" +
      "2. {{Capacity Utilization}} - Can your factory keep up with demand? Too little capacity = lost sales. Too much = wasted resources.\n\n" +
      "3. {{Market Share}} - Are customers choosing your phones? Driven by {{Brand Value}}, product {{Quality}}, pricing, and availability.\n\n" +
      "These three metrics form a cycle: higher margins fund factory expansion, which increases capacity, which lets you capture more market share, which generates more revenue for better margins.\n\n" +
      "If any one metric collapses, the others follow. Balance is everything.",
    targetPath: "",
    position: "center",
    objective: "Understand the three core metrics: {{Profit Margin}}, {{Capacity Utilization}}, {{Market Share}}.",
  },
  {
    id: "full-s1-hud-tour",
    stage: 1,
    title: "Your Dashboard",
    description:
      "This is your command center. Right now everything shows zeros - that is expected.\n\n" +
      "Key elements:\n" +
      "- {{Cash}} display: Your available funds ($175M to start)\n" +
      "- Production summary: Factory output and utilization\n" +
      "- Market overview: Sales, revenue, and competitive position\n\n" +
      "The sidebar has 10 sections:\n" +
      "- Overview (this page) and Market Intelligence\n" +
      "- 5 decision departments: Factory, Finance, HR, Marketing, R&D\n" +
      "- News, Results, and Achievements\n\n" +
      "The {{Round Checklist}} in the sidebar tracks which departments you have submitted this round. All 5 must be saved before the round advances.",
    targetPath: "",
    position: "top-right",
    spotlight: "#hud-metrics-grid",
    objective: "Familiarize yourself with the dashboard layout.",
    tip: "Start each round here to see your current position before making decisions.",
  },
  {
    id: "full-s1-begin",
    stage: 1,
    title: "Ready to Begin",
    description:
      "You know the scenario, the metrics, and the dashboard. Time to get your hands dirty.\n\n" +
      "The next stage teaches you Production - how to design a product, understand costs, and run your first manufacturing cycle.\n\n" +
      "Remember: every mechanic you learn connects back to the others. Production feeds the Market. Market revenue funds Research. Research improves Production. This closed loop is the heart of the game.",
    targetPath: "",
    position: "center",
    exitGate: true,
    exitGateLabel: "Begin Operations",
    objective: "Proceed to Production Basics.",
  },

  // ── STAGE 2: PRODUCTION BASICS ───────────────────────────────────
  // Hands-on crafting. COGS introduction. First scripted decision.
  {
    id: "full-s2-intro",
    stage: 2,
    title: "The Production Floor",
    description:
      "Welcome to your factory. This is where phone designs become physical products.\n\n" +
      "Production has three key concepts:\n" +
      "- Input costs: Raw materials (displays, processors, batteries) cost money\n" +
      "- Output value: Finished phones have a sale value based on quality and features\n" +
      "- The difference is your {{Margin}}\n\n" +
      "Your {{COGS}} (Cost of Goods Sold) includes materials, labour, and factory overhead. The lower your COGS, the more profit per phone.\n\n" +
      "But first, you need a product to manufacture. Let's choose your first phone design.",
    targetPath: "/rnd",
    position: "top-right",
    spotlight: "#nav-rnd",
    objective: "Understand input costs vs. output value.",
    tip: "Check the Production tab in the sidebar. The Advisor will highlight the most relevant controls.",
  },
  {
    id: "full-s2-recipe-choice",
    stage: 2,
    title: "The Recipe Choice",
    description:
      "Your first strategic decision. Three starter products are available, each targeting a different strategy:\n\n" +
      "No wrong answer here - but your choice reveals your instincts as a CEO. The tutorial will adapt its advice based on what you pick.",
    targetPath: "/rnd",
    position: "center",
    interactive: "choice",
    requiresInteraction: true,
    choices: [
      {
        id: "budget",
        label: "Budget Phone",
        description: "Low cost ($8M), thin margin, fast production. Safe and cash-efficient. Targets the Budget segment ($100-$300).",
      },
      {
        id: "balanced",
        label: "Balanced Phone",
        description: "Medium cost ($15M), moderate margin, standard production time. Targets the General segment ($300-$600).",
      },
      {
        id: "quality",
        label: "Quality Phone",
        description: "High cost ($25M), high margin potential, slow production. Targets the Enthusiast segment ($600-$900).",
      },
    ],
    mechanicLink: "Your recipe {{Efficiency}} is currently at 60%. Research can improve this - you will learn how in Stage 4.",
  },
  {
    id: "full-s2-cogs",
    stage: 2,
    title: "Understanding COGS",
    description:
      "Every phone you produce has a {{COGS}} - the total cost to manufacture one unit.\n\n" +
      "COGS breaks down into:\n" +
      "- Materials: 40-60% (displays, processors, batteries, etc.)\n" +
      "- Labour: 20-30% ({{Workers}} operating production lines)\n" +
      "- Overhead: 10-20% (factory maintenance, energy, supervision)\n\n" +
      "Your {{Profit Margin}} = Sale Price - COGS - Other Expenses\n\n" +
      "If your COGS is $150 and you sell for $200, your gross margin is $50 per phone (25%). But you still have to pay for R&D, marketing, and salaries out of that margin.\n\n" +
      "The key insight: COGS is not fixed. {{Factory Upgrades}}, better materials, and skilled {{Workers}} all reduce it over time.",
    targetPath: "/rnd",
    position: "top-right",
    objective: "Understand how {{COGS}} determines your {{Profit Margin}}.",
    tip: "Track your COGS per unit on the Factory page. If it is rising, investigate why before it eats your margins.",
  },
  {
    id: "full-s2-production-queue",
    stage: 2,
    title: "The Production Queue",
    description:
      "Now let's set up your factory to actually build phones.\n\n" +
      "On the Factory page, you will find:\n" +
      "- {{Production Allocation}}: What percentage of factory output goes to each segment\n" +
      "- {{Factory Upgrades}}: Equipment that improves quality and speed\n" +
      "- {{Supply Chain}}: Order the raw materials your factory needs\n\n" +
      "Three things limit how many phones you can make:\n" +
      "- Machine capacity (buy {{Factory Upgrades}} to expand)\n" +
      "- {{Workers}} (hire on the HR page - you need 2-3 per machine)\n" +
      "- Materials (order through {{Supply Chain}})\n\n" +
      "Set your {{Production Allocation}} to match where you have products, then submit your Factory decisions.",
    targetPath: "/factory",
    position: "top-right",
    interactive: "action",
    requiresInteraction: true,
    objective: "Set {{Production Allocation}} and review {{Factory Upgrades}}.",
    tip: "Higher complexity = higher potential {{Margin}} but longer craft time. This is the core production trade-off.",
  },
  {
    id: "full-s2-complete",
    stage: 2,
    title: "Production Ready",
    description:
      "You have a product design and a factory configured to build it. Well done.\n\n" +
      "But manufactured phones sitting in a warehouse earn nothing. You need to sell them.\n\n" +
      "The next stage introduces the Market - where your phones meet customers, and where pricing strategy determines whether you thrive or merely survive.",
    targetPath: "/factory",
    position: "center",
    exitGate: true,
    exitGateLabel: "Open Market Board",
    objective: "Proceed to Market & Trading.",
  },

  // ── STAGE 3: MARKET & TRADING ────────────────────────────────────
  // Pricing, demand signals, competitors. Second scripted decision.
  {
    id: "full-s3-intro",
    stage: 3,
    title: "Taking Your Product to Market",
    description:
      "Nobody buys a phone they have never heard of. Marketing creates awareness; the market rewards good products.\n\n" +
      "Key market mechanics:\n" +
      "- {{Brand Value}}: How recognizable your company is in each segment (0-100%). No brand = no sales.\n" +
      "- {{Market Share}}: Your slice of total segment sales. Driven by brand, quality, price, and availability.\n" +
      "- {{Brand Decay}}: Brand drops ~2% per round without advertising investment.\n\n" +
      "The advertising matrix lets you spend across 5 {{Segments}} x 4 channels (TV, Digital, Social, Print). Each channel has a different {{CPM}} and effectiveness per segment.\n\n" +
      "Let's start by setting your first advertising budget.",
    targetPath: "/marketing",
    position: "top-right",
    spotlight: "#nav-marketing",
    objective: "Understand {{Brand Value}} and its role in driving sales.",
    tip: "Zero {{Brand Value}} means zero sales, even with the best product. Marketing is not optional.",
  },
  {
    id: "full-s3-pricing-dilemma",
    stage: 3,
    title: "The Pricing Dilemma",
    description:
      "Your product is ready. But at what price should you sell it?\n\n" +
      "Pricing is not just about maximizing revenue - it is about understanding {{Price Elasticity}} and finding the sweet spot between volume and margin.\n\n" +
      "This decision shapes your early cash flow and competitive positioning:",
    targetPath: "/marketing",
    position: "center",
    interactive: "choice",
    requiresInteraction: true,
    choices: [
      {
        id: "low",
        label: "Price Low",
        description: "Sells instantly. High volume, thin margin. Generates fast cash flow but leaves money on the table.",
      },
      {
        id: "market",
        label: "Price at Market Rate",
        description: "Steady sales. Balanced margin. The recommended starting strategy for most segments.",
      },
      {
        id: "high",
        label: "Price High",
        description: "Slow sales. High margin per unit. Risk of unsold inventory, but maximizes profit if demand holds.",
      },
    ],
    mechanicLink: "Your competitor just upgraded their production {{Efficiency}}. Their costs dropped - and so did their price.",
  },
  {
    id: "full-s3-demand-signals",
    stage: 3,
    title: "Reading Demand Signals",
    description:
      "The market gives you signals if you know where to look:\n\n" +
      "- Items selling fast = price too low (you are leaving margin on the table)\n" +
      "- Items sitting unsold = price too high or poor {{Brand Value}} (cut price or increase marketing)\n" +
      "- Competitor price drops = they improved efficiency or are dumping inventory\n\n" +
      "This is {{Price Elasticity}} in action. Budget customers are very price-sensitive (elastic). Professional buyers care more about quality and features (inelastic).\n\n" +
      "Check the Market tab regularly. The demand indicators show real-time appetite for your products.",
    targetPath: "/market",
    position: "top-right",
    objective: "Learn to read {{Demand Signal}} indicators.",
    tip: "Match the market price on your first listing. Experiment with pricing after you understand demand patterns.",
  },
  {
    id: "full-s3-revenue-vs-profit",
    stage: 3,
    title: "Revenue vs. Profit",
    description:
      "A critical distinction that catches every new CEO:\n\n" +
      "{{Revenue}} = Total income from sales ($500K in phone sales)\n" +
      "{{COGS}} = Cost to produce those phones ($300K)\n" +
      "Gross {{Margin}} = Revenue - COGS ($200K, or 40%)\n" +
      "{{Net Income}} = Gross Margin - All Other Expenses (R&D, marketing, salaries, interest)\n\n" +
      "Making $500K in sales is NOT $500K in profit. After COGS, marketing, salaries, and R&D, you might only keep $50K - or even lose money.\n\n" +
      "The Finance page shows this breakdown. Check it after each round to understand where your money goes.",
    targetPath: "/finance",
    position: "top-right",
    objective: "Understand the difference between {{Revenue}} and {{Net Income}}.",
    tip: "Negative {{Net Income}} in early rounds is normal for a startup. It becomes a problem only if {{Cash}} runs out.",
  },
  {
    id: "full-s3-complete",
    stage: 3,
    title: "Market Foundations Set",
    description:
      "You understand costs, pricing, and the market. But there is a missing piece.\n\n" +
      "Your {{COGS}} is fixed right now. Your production speed is fixed. Your product quality is fixed. To improve any of these, you need Research.\n\n" +
      "The next stage introduces the Research Lab - where you invest today's profits to create tomorrow's {{Competitive Advantage}}.",
    targetPath: "",
    position: "center",
    exitGate: true,
    exitGateLabel: "Unlock Research Lab",
    objective: "Proceed to Research & Upgrades.",
  },

  // ── STAGE 4: RESEARCH & THE UPGRADE LOOP ─────────────────────────
  // Reinvest profits. See immediate impact. Third scripted decision.
  {
    id: "full-s4-intro",
    stage: 4,
    title: "The Research Lab",
    description:
      "Research is where revenue becomes {{Competitive Advantage}}.\n\n" +
      "The R&D page has three key areas:\n" +
      "- {{R&D Budget}}: Slider from $0-$30M per round. Funds all research.\n" +
      "- {{Tech Upgrades}}: Improvements in tiers (Basic, Advanced, Breakthrough). Each makes ALL your phones better.\n" +
      "- {{Archetypes}}: New product designs that unlock as you research.\n\n" +
      "Research is time-locked: you pay now, benefit later. This is the concept of {{Payback Period}} - how many rounds until an investment pays for itself.\n\n" +
      "For Round 1: set {{R&D Budget}} to $5-10M. Even without {{Engineers}}, it starts building your technology foundation.",
    targetPath: "/rnd",
    position: "top-right",
    spotlight: "#nav-rnd",
    objective: "Set your {{R&D Budget}} and explore the tech tree.",
    tip: "Hire {{Engineers}} on the HR page to speed up research. More engineers = faster breakthroughs.",
  },
  {
    id: "full-s4-tech-tree",
    stage: 4,
    title: "The Technology Tree",
    description:
      "The tech tree is organized in tiers:\n\n" +
      "- Tier 1 (Basic): Fundamental improvements. Low cost, immediate benefit.\n" +
      "- Tier 2 (Advanced): Significant upgrades. Requires Tier 1 completion.\n" +
      "- Tier 3 (Breakthrough): Game-changing innovations. Expensive but transformative.\n\n" +
      "Each upgrade has a direct, measurable impact:\n" +
      "- Production cost reduction (lower {{COGS}})\n" +
      "- Quality improvement (higher {{Quality}} scores)\n" +
      "- New product recipes (access to premium {{Segments}})\n\n" +
      "Think of research as a strategic investment. Every dollar spent here generates {{ROI}} through lower costs or higher revenue in future rounds.",
    targetPath: "/rnd",
    position: "top-right",
    objective: "Understand the tech tree structure and {{ROI}} of research.",
  },
  {
    id: "full-s4-efficiency-choice",
    stage: 4,
    title: "Efficiency vs. Expansion",
    description:
      "Time for your third strategic decision. You have earned some revenue. How should you reinvest it?\n\n" +
      "This mirrors a real business strategy dilemma: do you focus on what you have, or expand into new territory?",
    targetPath: "/rnd",
    position: "center",
    interactive: "choice",
    requiresInteraction: true,
    choices: [
      {
        id: "efficiency",
        label: "Reduce Production Costs",
        description: "-15% COGS on your current product. Deepens your competitive position in your existing market. Lower risk, steady returns.",
      },
      {
        id: "expansion",
        label: "Unlock New Product Recipe",
        description: "Opens a new market segment. Higher revenue ceiling, but splits your attention and capital. Higher risk, higher reward.",
      },
    ],
    mechanicLink: "Your cost dropped - consider adjusting your list price for {{Competitive Advantage}}.",
  },
  {
    id: "full-s4-impact",
    stage: 4,
    title: "Seeing the Impact",
    description:
      "Research creates a direct feedback loop:\n\n" +
      "1. You invest in research (costs {{Cash}} now)\n" +
      "2. Research completes (takes 1-3 rounds)\n" +
      "3. Your production costs drop OR quality improves\n" +
      "4. Lower costs mean higher {{Margin}} or lower prices\n" +
      "5. Better margins fund more research\n\n" +
      "This is the closed loop at the heart of the game:\n\n" +
      "PRODUCTION (craft goods, manage costs)\n" +
      "  -> MARKET (sell goods, read demand, optimize pricing)\n" +
      "    -> RESEARCH (invest revenue, unlock upgrades)\n" +
      "      -> back to PRODUCTION (with better recipes and efficiency)\n\n" +
      "Understanding this loop is the single most important thing in the game.",
    targetPath: "/rnd",
    position: "top-right",
    objective: "Understand the Production -> Market -> Research closed loop.",
    tip: "Every department affects every other. A bottleneck anywhere ripples through the entire business.",
  },
  {
    id: "full-s4-complete",
    stage: 4,
    title: "The Loop Closes",
    description:
      "You now understand all three core mechanics and how they connect.\n\n" +
      "But knowing the loop and executing it under pressure are different things. The next stage is a guided sandbox where you will run three full business cycles with all systems active simultaneously.\n\n" +
      "Your advisor will fade from full guidance to silence, letting you build confidence in your own decision-making.",
    targetPath: "",
    position: "center",
    exitGate: true,
    exitGateLabel: "Enter Guided Sandbox",
    objective: "Proceed to the Guided Sandbox.",
  },

  // ── STAGE 5: THE FULL LOOP (GUIDED SANDBOX) ─────────────────────
  // 3 cycles with fading advisor scaffolding. All mechanics active.
  {
    id: "full-s5-intro",
    stage: 5,
    title: "The Full Business Loop",
    description:
      "All systems are now active. You will run 3 business cycles with decreasing advisor guidance:\n\n" +
      "- Cycle 1: Advisor suggests the optimal action - you execute\n" +
      "- Cycle 2: Advisor presents options with tradeoffs - you decide\n" +
      "- Cycle 3: Advisor is silent - you act alone, feedback comes after\n\n" +
      "Each cycle involves: Planning decisions across all 5 departments, submitting them, then reviewing results.\n\n" +
      "Your first real constraint is coming: production cannot keep up with market demand. This is {{Capacity Planning}} in action - and you will need to decide whether to invest in more production capacity or pursue the next research tier.\n\n" +
      "Let's begin Cycle 1.",
    targetPath: "",
    position: "center",
    advisorLevel: 0,
    objective: "Execute 3 business cycles with decreasing guidance.",
  },
  {
    id: "full-s5-cycle1",
    stage: 5,
    title: "Cycle 1: Follow the Advisor",
    description:
      "Your advisor recommends this round's optimal strategy:\n\n" +
      "1. R&D: Set budget to $8-12M. Continue current research. Consider hiring 2-3 more {{Engineers}}.\n" +
      "2. Factory: Increase {{Production Allocation}} to match demand. Order materials if running low.\n" +
      "3. HR: Recruit {{Workers}} to fill any staffing gaps. Check {{Morale}} - a +5% salary raise helps retention.\n" +
      "4. Marketing: Invest $500K-$1.5M in your primary segment. Digital and Social channels are cost-effective.\n" +
      "5. Finance: Review {{Cash}} position. No borrowing needed unless cash drops below $50M.\n\n" +
      "Execute these recommendations across all 5 departments and submit your decisions.",
    targetPath: "",
    position: "top-right",
    advisorLevel: 0,
    interactive: "action",
    requiresInteraction: true,
    objective: "Follow advisor recommendations and submit all 5 departments.",
    tip: "Visit each department in order. Use the {{Round Checklist}} to track which ones you have completed.",
  },
  {
    id: "full-s5-cycle2",
    stage: 5,
    title: "Cycle 2: Choose Your Path",
    description:
      "The advisor presents two strategic paths. The right choice depends on your situation:\n\n" +
      "PATH A - Capacity First:\n" +
      "- Invest heavily in {{Factory Upgrades}} and hire more {{Workers}}\n" +
      "- Benefit: Meet rising demand, avoid stockouts\n" +
      "- Risk: High upfront cost, slow payback\n\n" +
      "PATH B - Research First:\n" +
      "- Boost {{R&D Budget}} and push for next tech tier\n" +
      "- Benefit: Lower future costs, better products\n" +
      "- Risk: Short-term capacity crunch, may lose market share\n\n" +
      "Check your dashboard: if inventory is zero and demand is high, capacity matters more. If competitors are catching up on quality, research matters more.\n\n" +
      "Make your choice and submit all 5 departments.",
    targetPath: "",
    position: "top-right",
    advisorLevel: 1,
    interactive: "action",
    requiresInteraction: true,
    objective: "Evaluate tradeoffs and choose your strategic path.",
    tip: "There is no universally right answer. Read your business report from last round before deciding.",
  },
  {
    id: "full-s5-cycle3",
    stage: 5,
    title: "Cycle 3: On Your Own",
    description:
      "No advisor suggestions this cycle. Review your dashboard, read your business report from last round, and make all decisions independently.\n\n" +
      "Questions to ask yourself:\n" +
      "- Is my {{Cash}} position healthy? (2-3 rounds of operating costs)\n" +
      "- Are my factories running at good {{Capacity Utilization}}?\n" +
      "- Is {{Brand Value}} growing or decaying in my target segments?\n" +
      "- Am I investing enough in R&D to stay competitive?\n" +
      "- Is {{Morale}} above 60%? (Below that, {{Turnover Rate}} spikes)\n\n" +
      "Submit all 5 departments when ready. The advisor will review your decisions afterward.",
    targetPath: "",
    position: "top-right",
    advisorLevel: 2,
    interactive: "action",
    requiresInteraction: true,
    objective: "Make all decisions independently across 5 departments.",
    tip: "This is what supply chain pressure looks like in a real business.",
  },
  {
    id: "full-s5-report",
    stage: 5,
    title: "Reading Your Business Report",
    description:
      "After each round, the Results page shows your performance:\n\n" +
      "- {{Revenue}}: Total income from phone sales\n" +
      "- {{COGS}}: What it cost to produce those phones\n" +
      "- Gross {{Margin}}: Revenue minus COGS\n" +
      "- {{Net Income}}: Bottom line after all expenses\n" +
      "- Reinvestment Rate: How much you are putting back into growth\n\n" +
      "The key question: did you post a profit? If yes, you are on track. If not, identify which costs are too high or which revenue streams are underperforming.\n\n" +
      "Look at the breakdown: where is your money going? Materials? Salaries? Marketing? This tells you where to optimize next.",
    targetPath: "/results",
    position: "top-right",
    objective: "Interpret your business report and identify optimization areas.",
    tip: "A healthy reinvestment rate is 30-50% of net income. Too little stunts growth; too much starves cash reserves.",
  },
  {
    id: "full-s5-complete",
    stage: 5,
    title: "Sandbox Complete",
    description:
      "You have run three full business cycles - first with guidance, then with options, then on your own.\n\n" +
      "Key chain you experienced:\n" +
      "Production bottleneck -> Market stockout -> Lost revenue -> Delayed research -> {{Competitive Advantage}} erosion\n\n" +
      "Every link in that chain is a department decision. Break one link and the whole chain improves.\n\n" +
      "One final stage: a short business review to confirm your understanding, and a personalized strategy report based on your decisions.",
    targetPath: "",
    position: "center",
    exitGate: true,
    exitGateLabel: "Begin Final Review",
    objective: "Proceed to Graduation.",
  },

  // ── STAGE 6: GRADUATION ──────────────────────────────────────────
  // Quiz, play style profile, transition to freeplay.
  {
    id: "full-s6-quiz1",
    stage: 6,
    title: "Business Review: The Loop",
    description:
      "Three quick questions to confirm your understanding. These test comprehension, not memorization.",
    targetPath: "",
    position: "center",
    interactive: "quiz",
    requiresInteraction: true,
    quiz: {
      question: "What is the correct order of the core business loop?",
      options: [
        "Market -> Research -> Production",
        "Production -> Market -> Research",
        "Research -> Market -> Production",
        "Production -> Research -> Market",
      ],
      correctIndex: 1,
      explanation:
        "Production creates goods, Market sells them for revenue, Research uses that revenue to improve Production. The loop then repeats with better efficiency each cycle.",
    },
  },
  {
    id: "full-s6-quiz2",
    stage: 6,
    title: "Business Review: Costs",
    description:
      "Understanding costs is the foundation of profitability.",
    targetPath: "",
    position: "center",
    interactive: "quiz",
    requiresInteraction: true,
    quiz: {
      question: "If your COGS is $200 and you sell a phone for $350, what is your gross margin percentage?",
      options: [
        "57% ($200/$350)",
        "43% ($150/$350)",
        "75% ($200 is 75% of $350 wait no...)",
        "150% ($350/$200 minus something)",
      ],
      correctIndex: 1,
      explanation:
        "Gross margin = (Revenue - COGS) / Revenue = ($350 - $200) / $350 = 43%. This is the profit on each phone before subtracting R&D, marketing, and salaries.",
    },
  },
  {
    id: "full-s6-quiz3",
    stage: 6,
    title: "Business Review: Strategy",
    description:
      "The right investment at the right time makes all the difference.",
    targetPath: "",
    position: "center",
    interactive: "quiz",
    requiresInteraction: true,
    quiz: {
      question: "Your factory is at 95% capacity and customers are buying everything you produce. What should you prioritize?",
      options: [
        "Increase marketing spend to build more brand awareness",
        "Expand production capacity (hire workers, buy equipment)",
        "Raise prices to maximize margin on limited inventory",
        "Cut R&D budget since products are already selling well",
      ],
      correctIndex: 1,
      explanation:
        "When demand exceeds supply, capacity is your bottleneck. Expanding production lets you capture the demand you are already generating. Marketing more when you cannot fulfill orders wastes money.",
    },
  },
  {
    id: "full-s6-graduation",
    stage: 6,
    title: "Your Startup Strategy Report",
    description:
      "Tutorial complete. You have built your first product, found your market, and reinvested your profits.\n\n" +
      "Based on your three strategic decisions, here is your CEO profile:\n\n" +
      "Your play style and recommendations will appear here based on your choices throughout the tutorial.\n\n" +
      "What lies ahead in the full game:\n" +
      "- 5 market segments to conquer\n" +
      "- Advanced research tiers with breakthrough technologies\n" +
      "- Competitor AI that adapts to your strategy\n" +
      "- 221 achievements spanning every department\n" +
      "- Economic events that force real-time adaptation\n\n" +
      "The rest is yours to decide. Good luck, CEO!",
    targetPath: "",
    position: "center",
    exitGate: true,
    exitGateLabel: "Start Playing!",
    objective: "Earn the most {{Achievement Points}} over 32 rounds.",
    tip: "Do not panic about early losses. Every company starts in the red. Focus on building the foundation right.",
  },
];
