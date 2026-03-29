// ============================================
// SHARED DEMO DATA - Single source of truth
// ============================================

// --- Utilities ---

export const fmt = (amount: number): string => {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
};

// --- Game Meta ---

export const DEMO_GAME = {
  gameId: "demo" as const,
  gameName: "Business Simulation 2024",
  teamName: "Team Alpha",
  teamColor: "#22c55e",
  currentRound: 3,
  maxRounds: 8,
  gameStatus: "IN_PROGRESS" as const,
  complexityPreset: "standard" as const,
};

// --- Company Financials ---

export const FINANCIALS = {
  cash: 175_000_000,
  revenue: 89_500_000,
  cogs: 52_800_000,
  grossProfit: 36_700_000,
  operatingExpenses: 18_200_000,
  netIncome: 12_300_000,
  totalAssets: 245_000_000,
  currentAssets: 185_000_000,
  totalLiabilities: 32_000_000,
  currentLiabilities: 12_000_000,
  equity: 213_000_000,
  eps: 1.23,
  sharesOutstanding: 10_000_000,
  dividendPerShare: 0.50,
};

export const FINANCIAL_RATIOS = {
  currentRatio: 15.42,
  quickRatio: 14.58,
  debtToEquity: 0.15,
  profitMargin: 0.137,
  roe: 0.058,
  roa: 0.050,
};

// --- Workforce (company-wide totals) ---
// Note: Factory has a subset (50 workers, 10 engineers, 5 supervisors = 65).
// The remaining 13 are in corporate/HQ roles.

export const WORKFORCE = {
  totalHeadcount: 78,
  workers: 55,
  engineers: 15,
  supervisors: 8,
  averageMorale: 72,
  averageEfficiency: 74,
  turnoverRate: 0.08,
  laborCost: 4_200_000,
};

// --- Factory ---

export const FACTORY = {
  id: "factory-1",
  name: "Main Factory",
  region: "North America" as const,
  efficiency: 0.82,
  workers: 50,
  engineers: 10,
  supervisors: 5,
  defectRate: 0.032,
  co2Emissions: 420,
  utilization: 0.75,
  productionLines: [
    { id: "line-1", segment: "General", productId: "p1", capacity: 50000, efficiency: 0.82 },
    { id: "line-2", segment: "Budget", productId: "p2", capacity: 75000, efficiency: 0.78 },
  ],
};

export const LOGISTICS_ROUTES = [
  { from: "North America", to: "Europe", method: "sea" as const, cost: 4.5, transitDays: 18, reliability: 0.92 },
  { from: "North America", to: "Asia", method: "sea" as const, cost: 6.2, transitDays: 25, reliability: 0.88 },
  { from: "North America", to: "Europe", method: "air" as const, cost: 12.0, transitDays: 3, reliability: 0.98 },
  { from: "North America", to: "Latin America", method: "land" as const, cost: 2.8, transitDays: 5, reliability: 0.95 },
];

export const MATERIALS = [
  { type: "display", name: "OLED Display Panel", quantity: 12000, cost: 45, supplier: "Samsung Display" },
  { type: "processor", name: "Snapdragon 8 Gen 3", quantity: 8500, cost: 120, supplier: "Qualcomm" },
  { type: "memory", name: "8GB LPDDR5X", quantity: 15000, cost: 28, supplier: "SK Hynix" },
  { type: "battery", name: "5000mAh Li-Po", quantity: 20000, cost: 12, supplier: "LG Energy" },
  { type: "chassis", name: "Aluminum Frame", quantity: 18000, cost: 8, supplier: "Foxconn" },
];

export const FACTORY_UPGRADES = [
  { id: "sixSigma", name: "Six Sigma Quality", cost: 75_000_000, owned: false, tier: 1, description: "Advanced quality management", benefits: ["40% defect reduction", "50% warranty cost reduction"] },
  { id: "leanManufacturing", name: "Lean Manufacturing", cost: 40_000_000, owned: true, tier: 1, description: "Toyota Production System", benefits: ["+15% efficiency", "-10% operating costs"] },
  { id: "automation", name: "Full Automation", cost: 120_000_000, owned: false, tier: 2, description: "Robotic assembly lines", benefits: ["+25% capacity", "-30% labor costs"] },
  { id: "warehousing", name: "Advanced Warehousing", cost: 100_000_000, owned: false, tier: 1, description: "Smart warehouse automation", benefits: ["90% storage cost reduction", "Optimized inventory"] },
];

// --- Products (canonical list -- all 5) ---

export const PRODUCTS = [
  { id: "p1", name: "Standard Phone", segment: "General" as const, quality: 72, features: 58, price: 450, unitCost: 180, status: "launched" as const, developmentProgress: 100, roundsRemaining: 0 },
  { id: "p2", name: "Budget Phone", segment: "Budget" as const, quality: 55, features: 35, price: 200, unitCost: 95, status: "launched" as const, developmentProgress: 100, roundsRemaining: 0 },
  { id: "p3", name: "Pro Phone", segment: "Enthusiast" as const, quality: 85, features: 75, price: 800, unitCost: 320, status: "launched" as const, developmentProgress: 100, roundsRemaining: 0 },
  { id: "p4", name: "Next Gen Phone", segment: "Professional" as const, quality: 92, features: 88, price: 1250, unitCost: 480, status: "development" as const, developmentProgress: 65, roundsRemaining: 2 },
  { id: "p5", name: "Active Watch", segment: "Active Lifestyle" as const, quality: 68, features: 62, price: 550, unitCost: 210, status: "development" as const, developmentProgress: 30, roundsRemaining: 3 },
];

export const LAUNCHED_PRODUCTS = PRODUCTS.filter(p => p.status === "launched");
export const IN_DEV_PRODUCTS = PRODUCTS.filter(p => p.status === "development");

// --- Market Share (by segment, decimals 0-1) ---

export const MARKET_SHARE: Record<string, number> = {
  Budget: 0.22,
  General: 0.28,
  Enthusiast: 0.15,
  Professional: 0.10,
  "Active Lifestyle": 0.18,
};

export const AVERAGE_MARKET_SHARE =
  Object.values(MARKET_SHARE).reduce((a, b) => a + b, 0) / Object.keys(MARKET_SHARE).length;

// --- ESG & Brand ---

export const ESG_BRAND = {
  esgScore: 340,
  brandValue: 0.62,
  brandAwareness: 58,
  customerSatisfaction: 74,
};

// --- R&D ---

export const RD_STATE = {
  rdBudget: 15_000_000,
  activeProjects: 2,
  patents: 3,
  techLevel: 2,
};

export const TECH_UPGRADES = [
  { id: "miniaturization", name: "Miniaturization Tech", cost: 25_000_000, effect: "Reduce unit costs by 10%", unlocked: true },
  { id: "battery", name: "Advanced Battery Tech", cost: 30_000_000, effect: "+15 quality for all products", unlocked: true },
  { id: "display", name: "Next-Gen Display", cost: 40_000_000, effect: "+20 quality, +10 features", unlocked: false },
  { id: "ai", name: "AI Integration", cost: 50_000_000, effect: "+25 features for all products", unlocked: false },
];

export const SEGMENT_INFO = [
  { id: "Budget", name: "Budget", priceRange: "$100 - $300", qualityExpectation: 50, features: "Basic", devCost: 5_000_000, devTime: 1 },
  { id: "General", name: "General", priceRange: "$300 - $600", qualityExpectation: 65, features: "Standard", devCost: 10_000_000, devTime: 2 },
  { id: "Enthusiast", name: "Enthusiast", priceRange: "$600 - $1,000", qualityExpectation: 80, features: "Advanced", devCost: 20_000_000, devTime: 2 },
  { id: "Professional", name: "Professional", priceRange: "$1,000 - $1,500", qualityExpectation: 90, features: "Premium", devCost: 35_000_000, devTime: 3 },
  { id: "Active Lifestyle", name: "Active Lifestyle", priceRange: "$400 - $800", qualityExpectation: 70, features: "Specialized", devCost: 15_000_000, devTime: 2 },
];

// --- Marketing ---

export const MARKETING = {
  advertisingBudget: 8_500_000,
};

export const ADVERTISING_CHANNELS = [
  { id: "tv", name: "Television", cpm: 25, reach: "High" as const, budget: 3_200_000, effectiveness: 0.78 },
  { id: "digital", name: "Digital Ads", cpm: 8, reach: "Targeted" as const, budget: 2_800_000, effectiveness: 0.85 },
  { id: "social", name: "Social Media", cpm: 5, reach: "Viral" as const, budget: 1_500_000, effectiveness: 0.82 },
  { id: "print", name: "Print Media", cpm: 15, reach: "Niche" as const, budget: 1_000_000, effectiveness: 0.55 },
];

export const PROMOTION_TYPES = [
  { id: "discount", name: "Price Discount", description: "Temporary price reduction", effect: "Increases sales volume, may reduce brand value" },
  { id: "bundle", name: "Product Bundle", description: "Combine products at special price", effect: "Increases average order value" },
  { id: "loyalty", name: "Loyalty Program", description: "Reward repeat customers", effect: "Increases customer retention" },
];

export const SPONSORSHIPS = [
  { name: "Tech Conference Platinum", cost: 5_000_000, brandImpact: "+3%", awareness: "+8%", status: "active" as const },
  { name: "Sports League Partnership", cost: 8_000_000, brandImpact: "+5%", awareness: "+12%", status: "available" as const },
  { name: "Environmental Initiative", cost: 2_000_000, brandImpact: "+2%", awareness: "+4%", esg: "+10", status: "available" as const },
];

// --- Finance-specific ---

export const FX_POSITIONS = [
  { pair: "EUR/USD", rate: 1.10, exposure: 12_500_000, hedged: 0.6 },
  { pair: "GBP/USD", rate: 1.27, exposure: 8_200_000, hedged: 0.4 },
  { pair: "JPY/USD", rate: 0.0067, exposure: 15_800_000, hedged: 0.3 },
  { pair: "CNY/USD", rate: 0.14, exposure: 22_100_000, hedged: 0.5 },
];

export const FUNDING_OPTIONS = [
  { type: "loan" as const, name: "Bank Loan", rate: 7.5, term: 5, description: "Traditional bank financing with fixed interest rate" },
  { type: "bond" as const, name: "Corporate Bond", rate: 6.0, term: 10, description: "Long-term debt financing through bond issuance" },
  { type: "equity" as const, name: "Stock Issuance", rate: 0, term: 0, description: "Raise capital by issuing new shares (dilutes ownership)" },
];

export const BOARD_PROPOSALS = [
  { id: "dividend", name: "Dividend Payment", description: "Distribute profits to shareholders", approvalChance: 75, category: "financial" as const },
  { id: "stock_buyback", name: "Stock Buyback", description: "Repurchase company shares from the market", approvalChance: 60, category: "financial" as const },
  { id: "expansion", name: "Major Expansion", description: "Approve large capital expenditure for growth", approvalChance: 55, category: "strategic" as const },
  { id: "acquisition", name: "Company Acquisition", description: "Acquire another company to expand capabilities", approvalChance: 45, category: "strategic" as const },
  { id: "debt_refinancing", name: "Debt Refinancing", description: "Restructure existing debt for better terms", approvalChance: 70, category: "financial" as const },
  { id: "esg_policy", name: "ESG Policy Adoption", description: "Formal commitment to environmental and social governance", approvalChance: 65, category: "corporate" as const },
];

// --- HR-specific ---

export const HR_CANDIDATES = [
  { id: "c1", type: "worker" as const, name: "John Smith", salary: 45000, overall: 72, stats: { efficiency: 72, accuracy: 68, speed: 75, stamina: 80 } },
  { id: "c2", type: "worker" as const, name: "Maria Garcia", salary: 48000, overall: 81, stats: { efficiency: 78, accuracy: 82, speed: 70, stamina: 75 } },
  { id: "c3", type: "engineer" as const, name: "David Chen", salary: 95000, overall: 85, stats: { efficiency: 85, accuracy: 90, speed: 72, stamina: 70 } },
  { id: "c4", type: "supervisor" as const, name: "Sarah Johnson", salary: 120000, overall: 88, stats: { efficiency: 88, accuracy: 85, speed: 78, stamina: 82 } },
];

export const RECRUITMENT_TIERS = [
  { id: "basic", name: "Basic Recruitment", cost: 5000, candidates: 3, qualityRange: "50-75", description: "Standard job posting" },
  { id: "premium", name: "Premium Recruitment", cost: 15000, candidates: 5, qualityRange: "60-85", description: "Professional headhunting" },
  { id: "executive", name: "Executive Search", cost: 50000, candidates: 7, qualityRange: "70-95", description: "Top-tier executive search" },
];

export const TRAINING_PROGRAMS = [
  { id: "basic-skills", name: "Basic Skills Training", cost: 500, duration: "1 round", effect: "+5% efficiency", targetType: "worker" as const },
  { id: "advanced-tech", name: "Advanced Technical Training", cost: 2000, duration: "1 round", effect: "+8% efficiency, +5% accuracy", targetType: "engineer" as const },
  { id: "leadership", name: "Leadership Development", cost: 5000, duration: "2 rounds", effect: "+10% team productivity", targetType: "supervisor" as const },
  { id: "safety", name: "Safety & Wellness", cost: 300, duration: "1 round", effect: "+5% health, -2% turnover", targetType: "all" as const },
];

export const BENEFITS = {
  healthInsurance: 50,
  retirementMatch: 3,
  paidTimeOff: 15,
  parentalLeave: 4,
  stockOptions: false,
  flexibleWork: false,
  professionalDevelopment: 500,
};

// --- Results / Rankings ---

export const PERFORMANCE = {
  rank: 2,
  totalTeams: 5,
  sharePrice: 24.50,
};

export const ROUND_HISTORY = [
  { round: 1, revenue: 42_000_000, netIncome: 2_100_000, cash: 192_000_000, marketShare: 12.0, rank: 4 },
  { round: 2, revenue: 65_800_000, netIncome: 7_200_000, cash: 183_000_000, marketShare: 15.2, rank: 3 },
  { round: 3, revenue: FINANCIALS.revenue, netIncome: FINANCIALS.netIncome, cash: FINANCIALS.cash, marketShare: +(AVERAGE_MARKET_SHARE * 100).toFixed(1), rank: 2 },
];

export const TEAM_RANKINGS = [
  { id: "t1", name: "Team Omega", color: "#ef4444", rank: 1, marketShare: 22.5, revenue: 105_000_000, isCurrentTeam: false },
  { id: "t2", name: DEMO_GAME.teamName, color: DEMO_GAME.teamColor, rank: 2, marketShare: +(AVERAGE_MARKET_SHARE * 100).toFixed(1), revenue: FINANCIALS.revenue, isCurrentTeam: true },
  { id: "t3", name: "Team Beta", color: "#3b82f6", rank: 3, marketShare: 16.8, revenue: 78_200_000, isCurrentTeam: false },
  { id: "t4", name: "Team Gamma", color: "#a855f7", rank: 4, marketShare: 14.2, revenue: 62_400_000, isCurrentTeam: false },
  { id: "t5", name: "Team Delta", color: "#f59e0b", rank: 5, marketShare: 11.8, revenue: 51_800_000, isCurrentTeam: false },
];

export const OPERATIONAL_METRICS = {
  totalCapacity: 125000,
  avgEfficiency: Math.round(FACTORY.efficiency * 100),
  avgDefectRate: +(FACTORY.defectRate * 100).toFixed(1),
  totalEmployees: WORKFORCE.totalHeadcount,
  avgMorale: WORKFORCE.averageMorale,
  launchedProducts: LAUNCHED_PRODUCTS.length,
  rdBudget: RD_STATE.rdBudget,
  brandValue: Math.round(ESG_BRAND.brandValue * 100),
};

// --- News Events (timestamps added in page) ---

export const NEWS_EVENTS = [
  {
    id: "1",
    type: "tech_breakthrough" as const,
    title: "AI Revolution Drives Device Demand",
    description: "Breakthrough in AI technology creates unprecedented demand for high-performance devices. Enthusiast and professional segments see 25% demand increase.",
    round: 3,
    severity: "high" as const,
    effects: [
      { target: "demand_enthusiast", modifier: 0.25 },
      { target: "demand_professional", modifier: 0.2 },
    ],
  },
  {
    id: "2",
    type: "supply_chain_crisis" as const,
    title: "Port Congestion Disrupts Global Supply Chains",
    description: "Major shipping delays at Asian ports cause component shortages. Lead times increase by 30% and material costs rise.",
    round: 2,
    severity: "critical" as const,
    effects: [
      { target: "material_cost", modifier: 0.15 },
      { target: "lead_time", modifier: 0.3 },
    ],
  },
  {
    id: "3",
    type: "sustainability_regulation" as const,
    title: "New Carbon Emission Standards",
    description: "Government introduces stricter environmental regulations. Companies with strong ESG scores gain competitive advantage.",
    round: 2,
    severity: "medium" as const,
    effects: [{ target: "esg_importance", modifier: 0.15 }],
  },
  {
    id: "4",
    type: "currency_crisis" as const,
    title: "Dollar Surges Against Asian Currencies",
    description: "Rapid currency fluctuations impact international operations. Manufacturing costs in Asia become more competitive.",
    round: 1,
    severity: "high" as const,
    effects: [{ target: "fx_volatility", modifier: 0.25 }],
  },
  {
    id: "5",
    type: "price_war" as const,
    title: "Major Competitor Slashes Prices",
    description: "Leading market player announces aggressive pricing strategy. Budget segment sees intensified competition.",
    round: 1,
    severity: "medium" as const,
    effects: [
      { target: "price_competition", modifier: 0.2 },
      { target: "demand_budget", modifier: 0.15 },
    ],
  },
];

// --- Achievements ---

export const ACHIEVEMENT_STATS = {
  earned: 12,
  total: 221,
  points: 85,
  positiveCount: 10,
  infamyCount: 2,
  percentComplete: 5.4,
};

export const TIER_BREAKDOWN = [
  { tier: "bronze" as const, earned: 6, total: 55 },
  { tier: "silver" as const, earned: 3, total: 48 },
  { tier: "gold" as const, earned: 2, total: 42 },
  { tier: "platinum" as const, earned: 1, total: 35 },
  { tier: "diamond" as const, earned: 0, total: 25 },
  { tier: "legendary" as const, earned: 0, total: 16 },
];

export const ACHIEVEMENTS = [
  { id: "first_revenue", name: "First Revenue", description: "Generate your first revenue", tier: "bronze" as const, category: "financial", earned: true, points: 5 },
  { id: "profitable", name: "In the Black", description: "Achieve positive net income", tier: "bronze" as const, category: "financial", earned: true, points: 5 },
  { id: "brand_builder", name: "Brand Builder", description: "Reach 50% brand value", tier: "silver" as const, category: "marketing", earned: true, points: 10 },
  { id: "efficiency_expert", name: "Efficiency Expert", description: "Achieve 80% factory efficiency", tier: "silver" as const, category: "operations", earned: true, points: 10 },
  { id: "market_leader", name: "Market Leader", description: "Lead any market segment", tier: "gold" as const, category: "market", earned: true, points: 15 },
  { id: "innovation_pioneer", name: "Innovation Pioneer", description: "Launch 3 products", tier: "gold" as const, category: "rd", earned: true, points: 15 },
  { id: "green_champion", name: "Green Champion", description: "Reach ESG score of 500", tier: "silver" as const, category: "esg", earned: false, points: 10 },
  { id: "workforce_harmony", name: "Workforce Harmony", description: "Achieve 90% average morale", tier: "gold" as const, category: "hr", earned: false, points: 15 },
  { id: "monopolist", name: "Monopolist", description: "Control 50% total market share", tier: "platinum" as const, category: "market", earned: true, points: 25 },
  { id: "penny_pincher", name: "Penny Pincher", description: "Maintain profit margin above 20% for 3 rounds", tier: "platinum" as const, category: "financial", earned: false, points: 25 },
  { id: "bankrupt", name: "Bankrupt!", description: "Run out of cash", tier: "bronze" as const, category: "infamy", earned: true, points: -10 },
  { id: "sweatshop", name: "Sweatshop Owner", description: "Have morale drop below 30%", tier: "bronze" as const, category: "infamy", earned: true, points: -10 },
];
