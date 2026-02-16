/**
 * Game Glossary - Plain-English definitions for all game terms.
 *
 * Used by GlossaryText to render hover tooltips in tutorials and UI.
 * Keys are case-insensitive display names; values are short definitions.
 */

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GAME_GLOSSARY: Record<string, GlossaryEntry> = {
  // === FINANCIAL ===
  "cash": {
    term: "Cash",
    definition: "Money available to spend right now. If you run out, you cannot pay employees or buy materials - game over.",
  },
  "revenue": {
    term: "Revenue",
    definition: "Total income from phone sales before subtracting expenses. More sales and higher prices both increase revenue.",
  },
  "net income": {
    term: "Net Income",
    definition: "Revenue minus all expenses (salaries, materials, R&D, marketing, interest). Positive means profit, negative means loss.",
  },
  "profit margin": {
    term: "Profit Margin",
    definition: "Net income divided by revenue, shown as a percentage. Higher margins mean you keep more of each dollar earned.",
  },
  "balance sheet": {
    term: "Balance Sheet",
    definition: "Summary of everything your company owns (assets) and owes (liabilities). Assets minus liabilities equals your net worth.",
  },
  "dividends": {
    term: "Dividends",
    definition: "Cash payments to shareholders each round. Costs money but signals confidence and boosts stock price.",
  },
  "t-bills": {
    term: "T-Bills",
    definition: "Treasury Bills - short-term borrowing at low interest rates. A quick way to raise small amounts of cash when you need it.",
  },
  "bonds": {
    term: "Bonds",
    definition: "Corporate Bonds - longer-term debt for bigger investments. Higher interest rates than T-Bills, but larger amounts available.",
  },
  "stock issuance": {
    term: "Stock Issuance",
    definition: "Selling new shares to investors to raise cash. Brings in money but dilutes your ownership percentage.",
  },
  "share buyback": {
    term: "Share Buyback",
    definition: "Repurchasing your own company's shares on the market. Reduces total shares outstanding, increasing each share's value.",
  },
  "stock price": {
    term: "Stock Price",
    definition: "Current market price of one share of your company. Driven by profitability, growth, dividends, and investor sentiment.",
  },
  "board proposals": {
    term: "Board Proposals",
    definition: "Major strategic decisions requiring board approval - things like acquisitions, major expansions, or debt restructuring.",
  },

  // === MARKET & BRAND ===
  "brand value": {
    term: "Brand Value",
    definition: "How recognizable and trusted your brand is in a segment (0-100%). Higher brand value means more customers choose you. Decays 2% per round without advertising.",
  },
  "brand decay": {
    term: "Brand Decay",
    definition: "Brand value drops about 2% each round without advertising investment. Consistent ad spending is essential to maintain your brand.",
  },
  "market share": {
    term: "Market Share",
    definition: "The percentage of total phone sales in a segment captured by your company. Higher market share = more revenue from that segment.",
  },
  "segments": {
    term: "Segments",
    definition: "Five customer groups with different needs and budgets: Budget ($100-$300), General ($300-$600), Enthusiast ($600-$900), Professional ($800-$1200), Active Lifestyle ($400-$800).",
  },
  "customer satisfaction": {
    term: "Customer Satisfaction",
    definition: "How happy your customers are with your products (0-100%). Driven by product quality, features, price, and brand trust.",
  },
  "cpm": {
    term: "CPM",
    definition: "Cost Per Thousand impressions - how much it costs to show your ad to 1,000 people. Varies by channel: TV ($25), Digital ($8), Social ($5), Print ($15).",
  },

  // === FACTORY & PRODUCTION ===
  "efficiency": {
    term: "Efficiency",
    definition: "How well your factory converts raw materials into finished phones (0-100%). Higher efficiency means less waste and lower production costs.",
  },
  "capacity utilization": {
    term: "Capacity Utilization",
    definition: "Percentage of your factory's maximum output currently being used. At 100% you are maxed out and cannot produce more without expansion.",
  },
  "production allocation": {
    term: "Production Allocation",
    definition: "How you distribute your factory's output across market segments. Match allocation to where you have products and demand.",
  },
  "defect rate": {
    term: "Defect Rate",
    definition: "Percentage of phones that fail quality checks during manufacturing. Lower is better. Improved by factory upgrades and skilled workers.",
  },
  "factory upgrades": {
    term: "Factory Upgrades",
    definition: "Equipment improvements organized in 5 tiers (from Six Sigma to Clean Room). Each tier improves production quality, speed, or cost.",
  },
  "supply chain": {
    term: "Supply Chain",
    definition: "The materials pipeline feeding your factory. Order components (displays, processors, batteries, etc.) from suppliers in different regions.",
  },

  // === ESG ===
  "esg score": {
    term: "ESG Score",
    definition: "Environmental, Social, and Governance rating (0-1000). Measures your sustainability and social responsibility. Affects investor sentiment and unlocks achievements.",
  },
  "esg initiatives": {
    term: "ESG Initiatives",
    definition: "Programs like carbon offsets, diversity programs, and whistleblower protections. Each costs money per round but improves your ESG score.",
  },

  // === WORKFORCE ===
  "morale": {
    term: "Morale",
    definition: "How happy your employees are (0-100%). High morale increases productivity and reduces turnover. Affected by salary, benefits, and working conditions.",
  },
  "turnover rate": {
    term: "Turnover Rate",
    definition: "Percentage of employees quitting per round. High turnover costs money (recruitment fees) and reduces productivity. Keep morale above 60% to minimize it.",
  },
  "workers": {
    term: "Workers",
    definition: "Employees who operate your production lines. You need about 2-3 workers per machine to run at full capacity.",
  },
  "engineers": {
    term: "Engineers",
    definition: "Employees who drive R&D research speed and improve product quality. More engineers means faster technology breakthroughs.",
  },
  "supervisors": {
    term: "Supervisors",
    definition: "Employees who boost overall team efficiency and factory performance. A small number of supervisors makes a big impact.",
  },
  "salary slider": {
    term: "Salary Slider",
    definition: "Company-wide pay adjustment from -20% to +20%. Higher salary improves morale and retention but increases operating costs.",
  },
  "recruitment tiers": {
    term: "Recruitment Tiers",
    definition: "Three hiring quality levels: Basic (cheapest, average candidates), Premium (better candidates), Executive (top talent, most expensive).",
  },

  // === R&D & PRODUCTS ===
  "r&d budget": {
    term: "R&D Budget",
    definition: "Money allocated to technology research each round ($0-$30M). Higher budgets speed up research progress and unlock better phones.",
  },
  "quality": {
    term: "Quality",
    definition: "How well-made your phone is (0-100). Higher quality phones score better in the market and can command higher prices.",
  },
  "features": {
    term: "Features",
    definition: "Technical capabilities of your phone across 6 areas: camera, battery, AI, display, durability, and connectivity. Different segments value different features.",
  },
  "tech upgrades": {
    term: "Tech Upgrades",
    definition: "R&D improvements that make all your phones better. Organized in tiers - each tier requires the previous one to be completed.",
  },
  "archetypes": {
    term: "Archetypes",
    definition: "Pre-designed phone templates with specific feature profiles, like 'Budget King' or 'Camera Beast'. Choose one as a starting point for new products.",
  },
  "feature radar chart": {
    term: "Feature Radar Chart",
    definition: "A 6-axis spider chart showing your phone's scores (battery, camera, AI, durability, display, connectivity) compared to what a segment wants.",
  },
  "patents": {
    term: "Patents",
    definition: "Legal protection for technologies you have researched. Block competitors from using them, or charge licensing fees for passive income.",
  },

  // === ACHIEVEMENTS ===
  "achievement points": {
    term: "Achievement Points",
    definition: "Your score. Each achievement has a point value based on its tier: Bronze (10), Silver (25), Gold (50), Platinum (100), Secret (75), Infamy (-25). Highest total wins.",
  },
  "infamy": {
    term: "Infamy",
    definition: "Negative achievements triggered by poor performance (going bankrupt, tanking morale, etc.). Each one subtracts 25 points from your score. Avoid these!",
  },
  "secret achievements": {
    term: "Secret Achievements",
    definition: "Hidden achievements worth 75 points each. You cannot see their requirements until you earn them. Rewarding unexpected or creative play.",
  },

  // === LABEL ALIASES (for stat cards / progress bars) ===
  "factory efficiency": {
    term: "Factory Efficiency",
    definition: "How well your factory converts raw materials into finished phones (0-100%). Higher efficiency means less waste and lower production costs.",
  },
  "esg rating": {
    term: "ESG Rating",
    definition: "Environmental, Social, and Governance rating (0-1000). Measures your sustainability and social responsibility. Affects investor sentiment and unlocks achievements.",
  },
  "avg morale": {
    term: "Avg Morale",
    definition: "Average happiness across all your employees (0-100%). High morale increases productivity and reduces turnover. Affected by salary, benefits, and working conditions.",
  },

  // === GAME STRUCTURE ===
  "round checklist": {
    term: "Round Checklist",
    definition: "Sidebar widget showing which of the 5 departments (Factory, HR, Marketing, Finance, R&D) you have submitted decisions for this round.",
  },
  "round processing": {
    term: "Round Processing",
    definition: "After all teams submit decisions, the simulation engine calculates production, sales, finances, and market results for that round.",
  },
};

/**
 * Case-insensitive lookup.
 * Supports matching "Brand Value", "brand value", "BRAND VALUE", etc.
 */
export function lookupGlossary(term: string): GlossaryEntry | undefined {
  return GAME_GLOSSARY[term.toLowerCase()];
}
