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
// 12 steps. You start with nothing - 0 staff, 0 products.
// ============================================

export const TUTORIAL_STEPS_FULL: TutorialStep[] = [
  {
    id: "full-welcome",
    title: "Welcome, Founder",
    description:
      "You are the founder and CEO of SimCorp. You have secured $175M in venture capital, but that is all you have:\n\n" +
      "- $175M in {{Cash}} (your entire runway)\n" +
      "- 0 employees (nobody works here yet)\n" +
      "- 0 products (nothing to sell)\n" +
      "- 0 {{Brand Value}} (nobody knows you exist)\n" +
      "- An empty factory with no equipment\n\n" +
      "Your competitors are starting from the same blank slate. Over 32 rounds, build SimCorp from scratch into a phone industry leader.\n\n" +
      "The winner is the team with the most {{Achievement Points}} - not the most cash or revenue. There are 221 achievements rewarding everything from launching your first product to dominating market segments.\n\n" +
      "This tutorial walks through everything step by step. Let's look at your blank canvas.",
    targetPath: "",
    position: "center",
    objective: "Build SimCorp from zero to market leader over 32 rounds.",
    tip: "Starting from nothing is daunting, but it means every decision is yours. No inherited baggage.",
  },
  {
    id: "full-overview",
    title: "The Blank Canvas",
    description:
      "Your dashboard shows zeros across the board - that is expected when starting from scratch:\n\n" +
      "- {{Cash}}: $175M (your only resource)\n" +
      "- {{Revenue}}: $0 (no products to sell yet)\n" +
      "- Employees: 0 (nobody hired yet)\n" +
      "- {{Market Share}}: 0% (no presence in any segment)\n" +
      "- {{ESG Score}}: 0 (no initiatives yet)\n\n" +
      "The sidebar has 9 sections:\n" +
      "- Overview (this page)\n" +
      "- 5 decision departments: Factory, Finance, HR, Marketing, R&D\n" +
      "- News, Results, Achievements\n\n" +
      "The {{Round Checklist}} tracks the 5 departments you must submit each round. All 5 need a green checkmark before the round processes.\n\n" +
      "First thing: you need products to sell. Let's start with R&D.",
    targetPath: "",
    position: "top-right",
    objective: "Understand the dashboard and sidebar navigation.",
    tip: "The numbers will come alive once you hire people, create products, and start selling in Round 2-3.",
  },
  {
    id: "full-rnd-tech",
    title: "R&D: Technology Research",
    description:
      "R&D is where innovation happens. Let's start with the technology side:\n\n" +
      "- {{R&D Budget}}: Slider from $0-$30M per round. This funds all your research\n" +
      "- {{Tech Upgrades}}: Improvements organized in 5 tiers. Each upgrade makes ALL your phones better\n" +
      "  - Tier 1: Basic improvements ($25-50M each)\n" +
      "  - Tier 2-5: Progressively more powerful (requires previous tier)\n\n" +
      "More {{Engineers}} on your team = faster research progress. But you have 0 engineers right now, so initial progress will be slow.\n\n" +
      "For Round 1: set the {{R&D Budget}} to $5-10M. Even with no engineers, it starts building your tech foundation.\n\n" +
      "Technology is one half of R&D. The other half is designing actual phones.",
    targetPath: "/rnd",
    position: "top-right",
    objective: "Set your {{R&D Budget}} to start research.",
    tip: "Do not skip the R&D budget even in Round 1. Technology compounds - early investment pays dividends later.",
  },
  {
    id: "full-rnd-products",
    title: "R&D: Your First Phone",
    description:
      "Now for the exciting part - creating your first phone product. You have two options:\n\n" +
      "- {{Archetypes}}: Pre-designed phone templates like 'Budget King' or 'Camera Beast'. Great for getting started quickly\n" +
      "- Custom Build: Full control over target {{Quality}}, {{Features}}, and price\n\n" +
      "Every product targets one of 5 market {{Segments}}:\n" +
      "- Budget: Price-sensitive ($100-$300)\n" +
      "- General: Mainstream ($300-$600)\n" +
      "- Enthusiast: Tech-savvy ($600-$900)\n" +
      "- Professional: Business users ($800-$1200)\n" +
      "- Active Lifestyle: Fitness-focused ($400-$800)\n\n" +
      "The {{Feature Radar Chart}} shows how your phone's 6 feature areas (camera, battery, AI, display, durability, connectivity) match what the segment wants.\n\n" +
      "Create your first product now. Budget is the safest starting segment - low development cost, easy to sell.",
    targetPath: "/rnd",
    position: "top-right",
    objective: "Create your first phone product.",
    tip: "Pick one or two {{Segments}} to start. Spreading across all 5 early on stretches your resources too thin.",
    interactive: "action",
    requiresInteraction: true,
  },
  {
    id: "full-hr-hiring",
    title: "HR: Hiring Your First Team",
    description:
      "You have a product design, but nobody to build it. You need employees. There are three roles:\n\n" +
      "- {{Workers}}: Operate production lines. You need 2-3 per machine to run at full capacity\n" +
      "- {{Engineers}}: Drive R&D speed and improve product {{Quality}}. Essential for tech progress\n" +
      "- {{Supervisors}}: Boost team {{Efficiency}} and {{Morale}}. Even 1-2 make a noticeable difference\n\n" +
      "Start recruitment campaigns at different {{Recruitment Tiers}}:\n" +
      "- Basic: Cheapest, finds average candidates\n" +
      "- Premium: Better candidates, higher cost\n" +
      "- Executive: Top talent, most expensive\n\n" +
      "New hires arrive the same round you recruit them. For Round 1: start Basic campaigns for at least 10 {{Workers}} and 2-3 {{Engineers}}.\n\n" +
      "While your team is forming, let's set up compensation.",
    targetPath: "/hr",
    targetTab: "recruitment",
    position: "top-right",
    objective: "Start recruitment campaigns for {{Workers}} and {{Engineers}}.",
    tip: "Basic tier is fine for Round 1. Upgrade to Premium later when you need specialists.",
  },
  {
    id: "full-hr-compensation",
    title: "HR: Keeping Your Team Happy",
    description:
      "Happy employees work harder and stay longer. Here is what affects them:\n\n" +
      "- {{Salary Slider}}: Adjusts company-wide pay from -20% to +20%\n" +
      "  - Higher salary = better {{Morale}} = less {{Turnover Rate}}\n" +
      "  - Lower salary = saves {{Cash}} but risks losing good employees\n" +
      "- Benefits: Health insurance, retirement, training, etc.\n" +
      "  - Each benefit costs money per round but improves {{Morale}}\n" +
      "- Training programs: Improve employee skills without raising base pay\n\n" +
      "The key trade-off: paying more costs {{Cash}} now, but unhappy employees quitting costs even more (recruitment fees, lost productivity, lower {{Quality}}).\n\n" +
      "For Round 1: keep salary at 0% change and skip benefits. You have no employees yet - compensation matters once they arrive.\n\n" +
      "Now let's get the factory ready.",
    targetPath: "/hr",
    targetTab: "compensation",
    position: "top-right",
    objective: "Understand the salary-morale trade-off.",
    tip: "Once you have staff, a small raise (+5%) keeps {{Morale}} stable. Never let it drop below 60%.",
  },
  {
    id: "full-factory",
    title: "Factory: Production Setup",
    description:
      "Your factory exists but it is empty. Here is what you need to know:\n\n" +
      "- {{Production Allocation}}: Set what percentage of output goes to each segment. Match this to where you have products\n" +
      "- {{Factory Upgrades}}: Equipment improvements across 5 tiers\n" +
      "  - Tier 1 (no R&D required): Six Sigma ($75M), Lean Manufacturing ($40M), and more\n" +
      "  - Higher tiers unlock as you research technology\n" +
      "- {{Efficiency}}: How well your factory operates (0-100%). Upgrades and skilled {{Workers}} improve it\n" +
      "- {{Capacity Utilization}}: How much of your max output you are using\n" +
      "- {{Supply Chain}}: Order raw materials (displays, processors, batteries, etc.) from different regions\n\n" +
      "Three things limit production:\n" +
      "- Machine capacity (buy {{Factory Upgrades}})\n" +
      "- {{Workers}} (hire on the HR page)\n" +
      "- Materials (order through {{Supply Chain}})\n\n" +
      "For Round 1: set {{Production Allocation}} for your product's segment. Consider a Tier 1 upgrade if budget allows.\n\n" +
      "Products need customers. Time for marketing.",
    targetPath: "/factory",
    position: "top-right",
    objective: "Set {{Production Allocation}} and review {{Factory Upgrades}}.",
    tip: "Order materials 1-2 rounds before you need them. Running out halts production completely.",
  },
  {
    id: "full-marketing",
    title: "Marketing: Making Your Name",
    description:
      "You have 0% {{Brand Value}}. Nobody knows SimCorp exists. Marketing fixes that:\n\n" +
      "- Advertising matrix: 5 {{Segments}} x 4 channels\n" +
      "  - TV: {{CPM}} $25 (broad reach, expensive)\n" +
      "  - Digital: {{CPM}} $8 (great for Enthusiast and General)\n" +
      "  - Social: {{CPM}} $5 (cheapest, strong with younger segments)\n" +
      "  - Print: {{CPM}} $15 (good for Professional segment)\n" +
      "- Ad spend builds {{Brand Value}} in each segment\n" +
      "- {{Brand Value}} directly drives {{Market Share}}: no brand = no sales, even with great products\n" +
      "- {{Brand Decay}}: Brand drops ~2% per round without advertising\n\n" +
      "For Round 1: put a small budget ($500K-$1M) into your product's target segment using the cheapest channels (Digital/Social).\n\n" +
      "Let's check on the money.",
    targetPath: "/marketing",
    position: "top-right",
    objective: "Allocate your first advertising budget.",
    tip: "Zero {{Brand Value}} means zero sales. Even a small budget in Round 1 starts building awareness.",
  },
  {
    id: "full-finance",
    title: "Finance: Your $175M Runway",
    description:
      "You started with $175M but you have been planning to spend: {{R&D Budget}}, recruitment, equipment, and marketing all cost money. Let's check the numbers:\n\n" +
      "- {{Cash}}: How much you have left after planned spending\n" +
      "- {{Balance Sheet}}: Assets (what you own) vs. liabilities (what you owe)\n" +
      "- {{Net Income}}: Will be negative in early rounds (normal for a startup)\n\n" +
      "Ways to raise more {{Cash}} if needed:\n" +
      "- {{T-Bills}}: Small, quick, low interest\n" +
      "- {{Bonds}}: Larger amounts, longer term\n" +
      "- {{Stock Issuance}}: Sell shares (dilutes ownership)\n\n" +
      "Later tools (once you are profitable):\n" +
      "- {{Dividends}}: Pay shareholders to boost {{Stock Price}}\n" +
      "- {{Share Buyback}}: Repurchase shares to increase value\n" +
      "- {{Board Proposals}}: Major strategic decisions\n\n" +
      "For Round 1: just review. You should have plenty of runway.\n\n" +
      "Now the most important part - how you actually win.",
    targetPath: "/finance",
    position: "top-right",
    objective: "Review your {{Cash}} position and planned expenses.",
    tip: "Negative {{Net Income}} in Rounds 1-3 is normal for a startup. It becomes a problem only if your {{Cash}} runs out.",
  },
  {
    id: "full-achievements",
    title: "The Achievement System",
    description:
      "This is how you win. The team with the most {{Achievement Points}} after 32 rounds takes the crown.\n\n" +
      "221 achievements across 12 categories: Overview, Factory, Finance, HR, Marketing, R&D, Supply Chain, Logistics, News, Results, Secret, and Mega.\n\n" +
      "6 tiers with different point values:\n" +
      "- Bronze: 10 points (entry-level, e.g., 'Baby's First Quarter')\n" +
      "- Silver: 25 points (intermediate, e.g., 'Six Sigma Sensei')\n" +
      "- Gold: 50 points (advanced, e.g., 'Peak Performance')\n" +
      "- Platinum: 100 points (elite, e.g., 'Dynasty')\n" +
      "- Secret: 75 points (hidden until earned - creative and unexpected plays)\n" +
      "- {{Infamy}}: -25 points (failures like going bankrupt or tanking {{Morale}})\n\n" +
      "Achievements reward well-rounded play. You earn more by excelling across ALL departments than by focusing on just one.\n\n" +
      "Browse the grid here to see what is available and plan your strategy.",
    targetPath: "/achievements",
    position: "center",
    objective: "Understand the Achievement system and plan your strategy.",
    tip: "Sort by category to see department-specific achievements. Early Bronze achievements are easy wins in the first few rounds.",
  },
  {
    id: "full-quiz",
    title: "Knowledge Check",
    description:
      "One last question before you start building SimCorp from scratch.",
    targetPath: "",
    position: "center",
    interactive: "quiz",
    requiresInteraction: true,
    quiz: {
      question: "What determines the winner of the game?",
      options: [
        "Highest revenue",
        "Most Achievement Points",
        "Largest market share",
        "Most cash in the bank",
      ],
      correctIndex: 1,
      explanation:
        "Achievement Points determine the winner! 221 achievements across 6 tiers: Bronze (10), Silver (25), Gold (50), Platinum (100), Secret (75), Infamy (-25). Well-rounded strategy across all departments earns the most.",
    },
  },
  {
    id: "full-ready",
    title: "Launch SimCorp!",
    description:
      "You know the game. Here is your round workflow:\n\n" +
      "1. Overview: Check your position\n" +
      "2. R&D: Set {{R&D Budget}}, create products, research {{Tech Upgrades}}\n" +
      "3. Factory: {{Production Allocation}}, {{Factory Upgrades}}, {{Supply Chain}}\n" +
      "4. HR: Recruit {{Workers}}/{{Engineers}}/{{Supervisors}}, manage {{Morale}}\n" +
      "5. Marketing: Build {{Brand Value}} with segment advertising\n" +
      "6. Finance: Manage {{Cash}}, debt, and capital\n\n" +
      "Save all 5 departments using the {{Round Checklist}} in the sidebar. After {{Round Processing}}, check Results.\n\n" +
      "Building from scratch takes patience:\n" +
      "- Rounds 1-5: Hire aggressively, fund R&D, launch first products\n" +
      "- Rounds 6-12: Expand to new {{Segments}}, upgrade factory, build {{Brand Value}}\n" +
      "- Rounds 13-24: Scale production, file {{Patents}}, chase Gold achievements\n" +
      "- Rounds 25-32: Optimize {{Profit Margin}}, aim for Platinum, protect your lead\n\n" +
      "Round 1 will feel slow. By Round 5, you will have a real company. By Round 15, you will be battling for market dominance.\n\n" +
      "Go build something great, CEO!",
    targetPath: "",
    position: "center",
    objective: "Earn the most {{Achievement Points}} over 32 rounds.",
    tip: "Do not panic about early losses. Every company starts in the red. Focus on building the foundation right.",
  },
];
