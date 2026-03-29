# Advanced Features Integration Guide

This guide covers the five advanced gameplay systems: Supply Chain Disruptions, Economic Cycles, Crisis & Events, Competitive Intelligence, and Achievements.

---

## Table of Contents
1. [Supply Chain Disruptions](#supply-chain-disruptions)
2. [Economic Cycles](#economic-cycles)
3. [Crisis & Events System](#crisis--events-system)
4. [Competitive Intelligence](#competitive-intelligence)
5. [Achievement System](#achievement-system)
6. [Integration Examples](#integration-examples)

---

## Supply Chain Disruptions

### Overview

The Supply Chain system adds strategic risk management through realistic disruption events.

### Disruption Types

| Type | Probability | Duration | Typical Impact | Warning |
|------|-------------|----------|----------------|---------|
| Natural Disaster | 2% per round | 2-4 rounds | 40-80% severity | 0-1 round |
| Supplier Failure | 3% per round | 3-5 rounds | 30-60% severity | None |
| Logistics Delays | 5% per round | 2-3 rounds | 20-50% severity | 1 round |
| Geopolitical | 1% per round | 4-9 rounds | 30-80% severity | 2 rounds |
| Pandemic | 0.5% per round | 6-13 rounds | 50-90% severity | 1 round |
| Cyberattack | 2% per round | 1-2 rounds | 30-70% severity | None |

### Regional Vulnerability

Different regions have different risk profiles:

```typescript
Asia:
  ✗ Natural Disasters: 1.5x (typhoons, earthquakes)
  ✗ Logistics: 1.3x (port congestion)
  ✗ Geopolitical: 1.4x (trade tensions)

MENA:
  ✗ Geopolitical: 2.0x (highest risk)
  ✗ Logistics: 1.2x

Europe:
  ✗ Geopolitical: 1.3x (trade sensitivity)

North America:
  ✗ Cyberattack: 1.2x (tech infrastructure)
  ✓ Most stable overall
```

### Mitigation Strategies

**Supply Chain Upgrade ($200M)**
- 30% reduction in disruption severity
- +15% supply availability during disruptions
- Best for: Multi-region operations

**Warehousing Upgrade ($100M)**
- +20% supply buffer from inventory
- Prevents lost sales during short disruptions
- Best for: High-demand products

**Geographic Diversification**
```typescript
Resilience Score = Geographic Diversity (0-30)
                 + Supply Chain Upgrades (0-20)
                 + Warehousing Upgrades (0-20)
                 + Financial Cushion (0-30)

Target Score: 70+ for high resilience
```

### Integration

```typescript
import { SupplyChainEngine } from "./engine/supplychain";

// Check for new disruptions
const newDisruptions = SupplyChainEngine.checkForDisruptions(
  state.factories,
  roundNumber,
  ctx
);

// Apply effects of active disruptions
const { costIncrease, productionReduction, messages } =
  SupplyChainEngine.applyDisruptionEffects(state, activeDisruptions);

// Update state
state.cash -= costIncrease;
state.revenue -= productionReduction;

// Update disruption durations
activeDisruptions = SupplyChainEngine.updateDisruptions(activeDisruptions);

// Calculate resilience score for display
const { score, factors } = SupplyChainEngine.calculateResilienceScore(state);
```

### Player Messaging

```
Round 5: Severe natural disaster affecting Asia.
  Impact: +$4.2M costs, -$8.5M production (mitigated by upgrades)

Your supply chain resilience: 75/100
  ✓ Geographic diversity: 30/30 (4 regions)
  ✓ Supply chain upgrades: 15/20 (75% coverage)
  ⚠ Warehousing upgrades: 10/20 (50% coverage)
  ✓ Financial cushion: 20/30 (good liquidity)
```

---

## Economic Cycles

### Overview

The Economic Cycle system models macroeconomic conditions affecting demand, costs, and financing.

### Cycle Phases

```typescript
Expansion:
  GDP Growth: 2-4%
  Inflation: 1-3%
  Consumer Confidence: 70-90
  Demand Multiplier: 1.1-1.3x
  Transition: 70% expansion, 30% peak

Peak:
  GDP Growth: 0-2%
  Inflation: 3-5%
  Consumer Confidence: 60-75
  Demand Multiplier: 1.0-1.1x
  Transition: 10% expansion, 30% peak, 60% contraction

Contraction:
  GDP Growth: -2-0%
  Inflation: 1-2%
  Consumer Confidence: 30-50
  Demand Multiplier: 0.7-0.9x
  Transition: 50% contraction, 50% trough

Trough:
  GDP Growth: -3-(-1)%
  Inflation: 0-1%
  Consumer Confidence: 20-40
  Demand Multiplier: 0.6-0.8x
  Transition: 60% expansion, 20% contraction, 20% trough
```

### Economic Impact

**Demand Adjustment**
```typescript
Base Demand × (0.8 + (Consumer Confidence / 100) × 0.4)

Example:
  Expansion (confidence 80): 1.12x demand
  Recession (confidence 30): 0.92x demand
```

**Cost Adjustment**
```typescript
Base Costs × (1 + Inflation / 100)

Example:
  Low inflation (2%): 1.02x costs
  High inflation (5%): 1.05x costs
```

**Financing Cost**
```typescript
Base Rate + Corporate Spread

Interest Rate Range: 2-7%
  Expansion: 2-3%
  Peak: 3-4%
  Contraction: 4-5%
  Trough: 3-4% (stimulus)
```

### Strategic Implications

**Expansion Phase**
- ✓ Invest in growth
- ✓ Issue debt (low rates)
- ✓ Hire aggressively
- ✗ Don't over-leverage

**Peak Phase**
- ⚠ Prepare for downturn
- ✓ Build cash reserves
- ✓ Lock in long-term debt
- ✗ Avoid major capex

**Contraction Phase**
- ⚠ Preserve cash
- ✗ Don't panic-sell assets
- ✓ Maintain quality
- ✓ Focus on efficiency

**Trough Phase**
- ✓ Position for recovery
- ✓ Opportunistic investments
- ✓ Hire top talent (cheaper)
- ⚠ Wait for clear signals

### Integration

```typescript
import { EconomicCycle } from "./engine/economy";

// Update economic state each round
const newEconomicState = EconomicCycle.updateCycle(
  currentEconomicState,
  roundNumber,
  ctx
);

// Apply economic effects to game state
const demandMultiplier = 0.8 + (newEconomicState.consumerConfidence / 100) * 0.4;
const costMultiplier = 1 + (newEconomicState.inflation / 100);

// Adjust market demand
for (const segment of segments) {
  adjustedDemand[segment] = baseDemand[segment] * demandMultiplier;
}

// Adjust financing costs
corporateBondRate = newEconomicState.interestRates.corporate;
```

### Player Messaging

```
Economic Update - Round 6

Phase: Peak → Contraction
  GDP Growth: 0.8% (slowing)
  Inflation: 4.2% (elevated)
  Consumer Confidence: 52 (declining)
  Interest Rates: 5.5% corporate (rising)

Market Impact:
  ⚠ Demand -8% vs last round
  ⚠ Costs +4.2% (inflation)
  ⚠ Financing costs up 1.2%

Recommendation: Build cash reserves, prepare for downturn
```

---

## Crisis & Events System

### Overview

The Crisis & Events system introduces dynamic, unpredictable situations that require player decisions. Events can be opportunities (positive), crises (negative), market shifts, regulatory changes, or competitive actions.

### Event Types

**Opportunities (5-8% chance/round)**
- Research Breakthrough - R&D discovery requiring strategic choice
- Market Expansion - Retailer partnership opportunities
- Talent Acquisition - Hiring opportunities from competitor downsizing

**Crises (3-4% chance/round, higher if trigger conditions met)**
- Product Recall - Safety defects requiring damage control
- Labor Dispute - Worker strike threat due to low morale
- Cybersecurity Breach - Data breach with brand implications

**Market Shifts (10% chance/round)**
- Consumer Trend Shift - Changing preferences (e.g., sustainability)
- Technology Disruption - New technologies changing market dynamics

**Regulatory (6% chance/round)**
- New Industry Regulation - Compliance costs and opportunities
- Trade Policy Changes - Import/export restrictions

**Competitive (4% chance/round)**
- Competitor Exit - Competitor leaving market segment
- Merger Activity - Industry consolidation

### Event Mechanics

**Trigger Conditions**
```typescript
// Random events: Fire based on probability alone
baseProbability = 0.05  // 5% per round

// Conditional events: Require specific conditions
{
  type: "crisis",
  triggerConditions: [
    { type: "metric", metric: "defectRate", operator: ">", value: 0.08 }
  ],
  baseProbability: 0.3  // 30% when defect rate > 8%
}
```

**Player Choices**
Each event presents 2-4 strategic options:

```typescript
Example: Product Recall Event

Choice A: Full Product Recall
  Cost: $25M
  Effect: +5% brand recovery over 2 rounds

Choice B: Limited Recall
  Cost: $10M
  Effect: -3% brand damage

Choice C: Issue Advisory Only
  Cost: $0
  Effect: -8% brand damage, $5M lawsuit risk
  Success Probability: 40%
```

**Risky Choices**
Some choices have success probability < 100%:
```typescript
successProbability: 0.7  // 70% chance of positive outcome
// If fails: negative effects or no benefit
```

### Event Effects

**Direct Effects**
- Cash changes (+/- immediate money)
- Brand modifiers (+/- brand value)
- Demand modifiers (×1.1-1.5 for opportunities, ×0.5-0.9 for crises)
- Cost modifiers (×1.02-1.1 for regulations)

**Duration Effects**
- Short-term (1-2 rounds): Most opportunities/crises
- Medium-term (3-4 rounds): Market shifts
- Permanent (0 rounds): Regulatory changes

**Compounding Effects**
Multiple active events stack multiplicatively:
```typescript
demandMultiplier = event1.demand × event2.demand × event3.demand
Example: 1.15 × 1.2 × 0.9 = 1.242 (24.2% net increase)
```

### Crisis Level Tracking

**Crisis Accumulation**
```typescript
crisisLevel: 0-100

When crisis triggers:
  Critical: +30
  Major: +20
  Moderate: +10
  Minor: +5

Decay: -5 per round
```

**Crisis Level Effects**
- High crisis level (>70) increases future crisis probability
- Players under stress are more vulnerable
- Recovery periods between crises provide breathing room

### Example Events in Detail

#### Tech Breakthrough (Opportunity)
```
Trigger: Random (5% base probability)
Duration: 1 round

Choices:
1. Patent Discovery ($1M)
   → +200 R&D points, +2% brand for 4 rounds

2. Publish Research ($0)
   → +3% brand, +10 morale

3. Fast-Track Commercialization ($5M, 70% success)
   → +5 quality to all products for 3 rounds
```

#### Labor Dispute (Crisis)
```
Trigger: Morale < 40 (40% probability when triggered)
Duration: 2 rounds
Base Effect: -30% capacity, -10 morale

Choices:
1. Negotiate Settlement ($5M)
   → +20 morale, restore capacity

2. Take Hard Line ($0, 30% success)
   → -50% capacity for 3 rounds, -15 morale if fails

3. Third-Party Mediation ($1M)
   → +10 morale, -10% capacity for 1 round
```

#### Consumer Trend Shift (Market Shift)
```
Trigger: Random (10% base probability)
Duration: 4 rounds
Base Effect: +100 ESG importance

Choices:
1. Embrace Sustainability ($10M)
   → +200 ESG, +5% brand, +10% demand for 4 rounds

2. Gradual Transition ($3M)
   → +100 ESG

3. Stay the Course ($0)
   → -5% demand for 4 rounds (missed trend)
```

### Integration

```typescript
import { EventEngine } from "./engine/events";

// Process events each round
const eventResult = EventEngine.processEvents(
  state,
  previousEventState,
  roundNumber,
  config,
  ctx
);

// Check for pending player choices
if (eventResult.pendingChoices.length > 0) {
  // Present choices to player via UI
  for (const pending of eventResult.pendingChoices) {
    showEventChoiceDialog(pending.event, pending.choices);
  }
}

// Apply event effects to game state
state.cash += eventResult.totalEffects.cashChange;
state.brandValue += eventResult.totalEffects.brandModifier;
demandMultiplier *= eventResult.totalEffects.demandMultiplier;
costMultiplier *= eventResult.totalEffects.costModifier;

// When player makes choice
const choiceResult = EventEngine.applyChoice(
  eventState,
  eventId,
  choiceId,
  roundNumber,
  ctx
);

if (choiceResult.success) {
  // Apply effects from successful choice
  applyEffects(choiceResult.effects);
} else {
  // Handle failure (if risky choice)
  showMessage(`${choiceResult.message} - outcome not as expected`);
}
```

### Player Messaging

```
🎯 Event: Research Breakthrough

Your R&D team has made a significant discovery that could
accelerate product development.

Choose your response:

1. Patent the Discovery ($1M)
   Secure intellectual property rights for long-term advantage
   → +200 R&D points, +2% brand for 4 rounds

2. Publish Research (Free)
   Gain industry recognition and attract talent
   → +3% brand, +10 morale

3. Fast-Track Commercialization ($5M, 70% success)
   Rush the discovery to market
   → +5 quality to all products for 3 rounds
```

**Event History Tracking**
```typescript
eventHistory: [
  { eventId: "tech_breakthrough", round: 5, choice: "patent", outcome: "positive" },
  { eventId: "labor_dispute", round: 7, choice: "negotiate", outcome: "positive" },
  { eventId: "product_recall", round: 9, choice: "full_recall", outcome: "positive" }
]
```

---

## Competitive Intelligence

### Overview

Competitive Intelligence provides market signals, competitor analysis, and strategic insights based on intelligence investment. Information quality and quantity scale with budget.

### Intelligence Budget

**Investment Levels**
```typescript
No Investment ($0): 30% intelligence quality
  - 1 signal per round
  - Low confidence (30-40%)
  - No insights
  - Basic competitor profiles

Basic ($1-2M): 45-55% quality
  - 2 signals per round
  - Moderate confidence (45-55%)
  - Rare insights

Standard ($3-5M): 60-75% quality
  - 3 signals per round
  - Good confidence (60-75%)
  - Regular insights
  - Improved competitor tracking

Premium ($6-10M): 80-90% quality
  - 4 signals per round
  - High confidence (80-90%)
  - Frequent insights
  - Detailed competitor analysis

Elite ($11M+): 90-95% quality
  - 5 signals per round
  - Very high confidence (90-95%)
  - Comprehensive insights
  - Predictive analysis
```

**Intelligence Quality Formula**
```typescript
quality = 30 + Math.min(65, (budget / 1_000_000) × 13)
quality = Math.min(95, quality)  // Cap at 95%

Examples:
  $0 → 30%
  $2M → 56%
  $5M → 95%
  $10M+ → 95% (max)
```

### Market Signals

**Signal Types**
```typescript
1. Price Change
   - Competitor planning price increase/decrease
   - Magnitude: -50% to +50%
   - Confidence varies by intelligence quality

2. Product Launch
   - New product development detected
   - Target segment identified
   - Launch timing estimated

3. Marketing Campaign
   - Increased advertising spend observed
   - Channel mix changes
   - Target segment focus

4. Expansion
   - Competitor entering new segment
   - Factory construction/acquisition
   - Distribution expansion

5. Contraction
   - Competitor exiting segment
   - Factory closures
   - Market share decline

6. R&D Investment
   - Research spending increases
   - Technology focus areas
   - Patent activity
```

**Signal Confidence**
```typescript
baseConfidence = intelligenceQuality / 100

// Bonus if competitor is focused target
if (focusedCompetitor) {
  confidence = min(0.95, baseConfidence + 0.15)
}

// Add noise
confidence = max(0.2, confidence + gaussian(0, 0.1))
```

**Example Signals**
```
Signal: Price Change (Confidence: 78%)
  TechGiant Corp appears to be planning significant price
  increase in Professional segment
  Magnitude: +30%

Signal: Product Launch (Confidence: 85%)
  InnovateTech may be preparing new product launch
  targeting Active Lifestyle segment

Signal: Marketing Campaign (Confidence: 65%)
  ValueTech Inc ramping up marketing efforts in Budget segment
```

### Competitor Profiles

**Default Competitors**
```typescript
1. TechGiant Corp (Quality Leader)
   Strength: 85/100
   Threat Level: 75/100
   Market Share: 30% Professional, 25% Enthusiast
   Strengths: Brand, R&D, Distribution
   Weaknesses: High costs, Slow to market

2. ValueTech Inc (Cost Leader)
   Strength: 70/100
   Threat Level: 60/100
   Market Share: 35% Budget, 20% General
   Strengths: Low costs, High volume
   Weaknesses: Quality perception, Limited innovation

3. InnovateTech (Niche Player)
   Strength: 65/100
   Threat Level: 55/100
   Market Share: 25% Active Lifestyle, 20% Enthusiast
   Strengths: Innovation, Design, Brand loyalty
   Weaknesses: Limited scale, High R&D costs

4. GlobalElectronics (Balanced)
   Strength: 72/100
   Threat Level: 65/100
   Market Share: 18% General, 15% Budget
   Strengths: Diversified, Global presence
   Weaknesses: No clear differentiation
```

**Competitor Tracking**
```typescript
interface CompetitorProfile {
  strategy: "cost_leader" | "quality_leader" | "niche" | "balanced" | "aggressive";
  estimatedStrength: 30-95;  // Fluctuates over time
  threatLevel: 0-100;        // Based on recent activity
  recentActions: CompetitorAction[];  // Last 5 actions
  predictedNextMove: string;  // AI prediction
}
```

**Threat Level Calculation**
```typescript
// Increase for high-impact actions
if (highImpactAction) threatLevel += 5

// Decay over time
threatLevel -= 2 per round

// Range: 20-100
threatLevel = clamp(threatLevel, 20, 100)
```

### Market Insights

**Insight Categories**

**1. Trend Insights**
- Detect patterns across multiple signals
- Price war risk detection
- Market consolidation signals

```typescript
Example Trend:
  Title: "Price War Risk"
  Description: "Multiple competitors signaling price decreases"
  Confidence: 82%
  Action: "Prepare for potential price competition"
```

**2. Opportunity Insights**
- Competitor pullbacks
- Market gaps
- Strategic openings

```typescript
Example Opportunity:
  Title: "Market Opportunity in Professional"
  Description: "Competitor pullback detected in Professional segment"
  Confidence: 75%
  Action: "Consider increasing presence in this segment"
```

**3. Threat Insights**
- Aggressive competitor activity
- Competitive attacks
- Market disruption

```typescript
Example Threat:
  Title: "Competitive Threat Alert"
  Description: "TechGiant Corp, InnovateTech showing increased activity"
  Confidence: 88%
  Action: "Review competitive positioning and defensive strategies"
```

**4. Benchmark Insights**
- Industry strength comparisons
- Market share analysis
- Performance gaps

```typescript
Example Benchmark:
  Title: "Competitive Landscape Analysis"
  Description: "Average competitor strength: 73/100"
  Confidence: 90%
  (Generated every 4 rounds with quality ≥ 70%)
```

### Competitor Focus

**Focus Benefits**
```typescript
focusedCompetitors: ["comp_alpha", "comp_beta"]

Benefits:
- +15% confidence on signals from focused competitors
- More frequent signals
- Better predictions
- Deeper profile analysis
```

**Focus Strategy**
- Focus on 1-2 key threats
- Rotate focus based on threat level
- Premium intelligence on focused targets

### Strategic Recommendations

**Auto-Generated Recommendations**
```typescript
1. Budget-Based:
   "Increase intelligence budget to improve market visibility"
   (when quality < 50%)

2. Threat-Based:
   "Monitor TechGiant Corp closely - elevated threat level"
   (when threatLevel > 75%)

3. Strategy-Based:
   "Cost leader competitors active - consider value differentiation"
   "Quality leaders competitive - invest in R&D to maintain edge"
```

### Integration

```typescript
import { CompetitiveIntelligenceEngine } from "./engine/intelligence";

// Gather intelligence each round
const intelDecisions: IntelligenceDecisions = {
  budget: 5_000_000,  // $5M investment
  focusAreas: ["Professional", "Enthusiast"],
  competitorFocus: ["comp_alpha", "comp_beta"]
};

const intelResult = CompetitiveIntelligenceEngine.gatherIntelligence(
  previousIntelState,
  intelDecisions,
  roundNumber,
  config,
  ctx
);

// Display new signals
for (const signal of intelResult.newSignals) {
  console.log(`${signal.type}: ${signal.description}`);
  console.log(`Confidence: ${(signal.confidence * 100).toFixed(0)}%`);
}

// Display insights
for (const insight of intelResult.newInsights) {
  console.log(`💡 ${insight.title}`);
  console.log(insight.description);
  if (insight.actionable) {
    console.log(`→ ${insight.suggestedAction}`);
  }
}

// Display recommendations
for (const rec of intelResult.recommendations) {
  console.log(`📊 ${rec}`);
}

// Access competitor profiles
const topThreat = intelResult.state.competitors
  .sort((a, b) => b.threatLevel - a.threatLevel)[0];
console.log(`Top Threat: ${topThreat.name} (${topThreat.threatLevel}/100)`);
```

### Player Messaging

```
🔍 Intelligence Report - Round 8

Budget: $5M (Quality: 95%)

NEW SIGNALS (4):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📉 TechGiant Corp: Price Change (85% confidence)
   Significant price increase in Professional segment (+30%)

🚀 InnovateTech: Product Launch (78% confidence)
   New product targeting Active Lifestyle segment

📢 ValueTech Inc: Marketing Campaign (82% confidence)
   Ramping up marketing in Budget segment

🏭 GlobalElectronics: Expansion (71% confidence)
   Signs of General market expansion

INSIGHTS (2):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Price Opportunity in Professional
   TechGiant Corp raising prices - potential to capture
   price-sensitive customers
   → Consider competitive pricing strategy

⚠️ Marketing Pressure in Budget
   ValueTech Inc increasing spend - defend market share
   → Review Budget segment marketing allocation

COMPETITOR PROFILES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 TechGiant Corp: Threat 78/100 (↑)
   Predicted: Price increase to improve Professional margins
   Recent: 2 high-impact actions last 2 rounds

🟡 ValueTech Inc: Threat 65/100 (↑)
   Predicted: Aggressive marketing push in Budget
   Recent: Marketing ramp-up detected

🟢 InnovateTech: Threat 58/100 (→)
   Predicted: New product launch in Active Lifestyle
   Recent: R&D investment increase

RECOMMENDATIONS (3):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Monitor TechGiant Corp closely - elevated threat level
📊 Quality leaders competitive - invest in R&D to maintain edge
📊 Consider focused intelligence on Budget segment competitors
```

---

## Achievement System

### Overview

Achievements provide progression goals and unlock special bonuses.

### Achievement Categories

1. **Financial** - Revenue, profit, market cap milestones
2. **Operational** - Efficiency, quality, production excellence
3. **Innovation** - R&D, patents, technology leadership
4. **Growth** - Market share, expansion, scaling
5. **Sustainability** - ESG, environmental, social impact
6. **Challenge** - Difficult scenario completions

### Achievement Tiers

```typescript
Bronze: Entry-level achievements
  Reward: Minor bonuses (1-2%)

Silver: Intermediate achievements
  Reward: Moderate bonuses (3-5%)

Gold: Advanced achievements
  Reward: Significant bonuses (5-10%)

Platinum: Elite achievements
  Reward: Major unlocks, special features
```

### Example Achievements

#### Financial
```typescript
"First Billion"
  Requirement: $1B revenue
  Tier: Gold
  Reward: Unlock premium sponsorships

"Profitable Quarter"
  Requirement: Net income > 0
  Tier: Bronze
  Reward: +2% investor sentiment

"Market Leader"
  Requirement: Market cap > $5B
  Tier: Platinum
  Reward: Unlock strategic consulting
```

#### Operational
```typescript
"Quality Master"
  Requirement: 100 quality score
  Tier: Gold
  Reward: +10% brand bonus

"Zero Defects"
  Requirement: <1% defect rate for 3 rounds
  Tier: Silver
  Reward: +5% quality perception

"Efficiency Expert"
  Requirement: 95%+ efficiency all factories
  Tier: Silver
  Reward: -10% training costs
```

#### Innovation
```typescript
"Patent Portfolio"
  Requirement: 10+ patents
  Tier: Silver
  Reward: +10% R&D efficiency

"Innovation Leader"
  Requirement: Lead industry in R&D spend
  Tier: Gold
  Reward: Unlock advanced tech tree

"First Mover"
  Requirement: Launch product before competitors
  Tier: Bronze
  Reward: +15% early market share
```

#### Sustainability
```typescript
"Carbon Neutral"
  Requirement: Net-zero CO2 emissions
  Tier: Platinum
  Reward: Unlock impact investor access

"ESG Excellence"
  Requirement: ESG score 800+
  Tier: Gold
  Reward: +15% board approval

"Fair Trade Certified"
  Requirement: Supplier ethics program
  Tier: Bronze
  Reward: +2% brand value
```

### Integration

```typescript
import { AchievementEngine } from "./engine/achievements";

// Check for new achievements
const newAchievements = AchievementEngine.checkAchievements(
  state,
  previousState
);

// Apply achievement rewards
for (const achievement of newAchievements) {
  if (achievement.reward.type === "unlock") {
    unlockFeature(achievement.reward.value);
  } else if (achievement.reward.type === "bonus") {
    applyBonus(achievement.reward.value);
  }

  // Show notification
  showNotification({
    title: `Achievement Unlocked: ${achievement.name}`,
    description: achievement.description,
    tier: achievement.tier,
    reward: achievement.reward.description
  });
}

// Track progress for hidden achievements
const progress = AchievementEngine.getProgress(state);
```

### Player Messaging

```
🏆 Achievement Unlocked!

"Quality Master" (Gold)

You've achieved a perfect quality score of 100!

Reward: +10% brand value bonus
Progress: 15/50 achievements unlocked
```

---

## Integration Examples

### Complete Round Processing

```typescript
import { SupplyChainEngine } from "./engine/supplychain";
import { EconomicCycle } from "./engine/economy";
import { EventEngine } from "./engine/events";
import { CompetitiveIntelligenceEngine } from "./engine/intelligence";
import { AchievementEngine } from "./engine/achievements";

function processRound(state: TeamState, decisions: AllDecisions): RoundResults {
  const roundNumber = state.roundNumber + 1;
  let demandMultiplier = 1.0;
  let costMultiplier = 1.0;

  // 1. Update economic conditions
  const economicState = EconomicCycle.updateCycle(
    state.economicState,
    roundNumber,
    ctx
  );

  // Apply economic demand/cost effects
  demandMultiplier *= 0.8 + (economicState.consumerConfidence / 100) * 0.4;
  costMultiplier *= 1 + (economicState.inflation / 100);

  // 2. Gather competitive intelligence
  const intelResult = CompetitiveIntelligenceEngine.gatherIntelligence(
    state.intelligenceState,
    decisions.intelligence,
    roundNumber,
    config,
    ctx
  );

  // 3. Process events
  const eventResult = EventEngine.processEvents(
    state,
    state.eventState,
    roundNumber,
    config,
    ctx
  );

  // Apply event effects
  state.cash += eventResult.totalEffects.cashChange;
  state.brandValue += eventResult.totalEffects.brandModifier;
  demandMultiplier *= eventResult.totalEffects.demandMultiplier;
  costMultiplier *= eventResult.totalEffects.costModifier;

  // 4. Check for supply chain disruptions
  const newDisruptions = SupplyChainEngine.checkForDisruptions(
    state.factories,
    roundNumber,
    ctx
  );

  state.activeDisruptions = [
    ...state.activeDisruptions,
    ...newDisruptions
  ];

  // 5. Process core game logic (production, marketing, finance, etc.)
  const moduleResults = processModules(state, decisions, {
    demandMultiplier,
    costMultiplier,
    interestRate: economicState.interestRates.corporate
  });

  // 6. Apply supply chain disruption effects
  const disruptionEffects = SupplyChainEngine.applyDisruptionEffects(
    state,
    state.activeDisruptions
  );

  state.cash -= disruptionEffects.costIncrease;
  state.revenue -= disruptionEffects.productionReduction;

  // 7. Update disruptions (decrement duration)
  state.activeDisruptions = SupplyChainEngine.updateDisruptions(
    state.activeDisruptions
  );

  // 8. Check achievements
  const newAchievements = AchievementEngine.checkAchievements(
    state,
    previousState
  );

  // 9. Apply achievement rewards
  for (const achievement of newAchievements) {
    applyAchievementReward(state, achievement);
  }

  // 10. Calculate metrics for display
  const resilience = SupplyChainEngine.calculateResilienceScore(state);

  return {
    newState: state,
    economicState,
    eventState: eventResult.state,
    intelligenceState: intelResult.state,
    disruptions: disruptionEffects.messages,
    events: eventResult.newEvents,
    pendingEventChoices: eventResult.pendingChoices,
    marketSignals: intelResult.newSignals,
    marketInsights: intelResult.newInsights,
    achievements: newAchievements,
    resilience: resilience.score,
    messages: [
      ...moduleResults.messages,
      ...economicMessages(economicState),
      ...disruptionEffects.messages,
      ...eventResult.messages,
      ...intelResult.messages
    ],
    recommendations: [
      ...intelResult.recommendations
    ]
  };
}
```

### Event Choice Handling

```typescript
// When player makes an event choice
function handleEventChoice(
  eventId: string,
  choiceId: string,
  eventState: EventState,
  ctx: EngineContext
): void {
  const result = EventEngine.applyChoice(
    eventState,
    eventId,
    choiceId,
    currentRound,
    ctx
  );

  if (result.success) {
    showNotification({
      type: "success",
      title: "Event Choice Success",
      message: result.message
    });

    // Apply effects immediately
    for (const effect of result.effects) {
      applyEventEffect(state, effect);
    }
  } else {
    showNotification({
      type: "warning",
      title: "Unexpected Outcome",
      message: result.message
    });
  }
}
```

### Dashboard Display

```typescript
interface GameDashboard {
  // Core metrics
  financial: FinancialMetrics;
  operations: OperationalMetrics;
  market: MarketMetrics;

  // Advanced features
  economicPhase: {
    current: "expansion" | "peak" | "contraction" | "trough";
    gdpGrowth: number;
    inflation: number;
    consumerConfidence: number;
    trend: "improving" | "stable" | "declining";
  };

  supplyChainRisk: {
    resilienceScore: number;  // 0-100
    activeDisruptions: number;
    geographicDiversity: number;
    upgradeCoverage: number;
  };

  events: {
    activeEvents: number;
    crisisLevel: number;  // 0-100
    pendingChoices: number;
    recentEvents: GameEvent[];
  };

  competitiveIntelligence: {
    quality: number;  // 0-100
    signalCount: number;
    insightCount: number;
    topThreat: {
      name: string;
      threatLevel: number;
    };
    marketTrend: "positive" | "neutral" | "negative";
  };

  achievementProgress: {
    total: number;
    unlocked: number;
    nextMilestone: Achievement | null;
    recentUnlocks: Achievement[];
  };
}
```

---

## Configuration Options

### Enable/Disable Features

```typescript
interface GameConfig {
  advancedFeatures: {
    supplyChainDisruptions: boolean;    // Default: true
    economicCycles: boolean;            // Default: true
    crisisEvents: boolean;              // Default: true
    competitiveIntelligence: boolean;   // Default: true
    achievements: boolean;              // Default: true
  };

  disruptionSettings: {
    frequencyMultiplier: number;        // 0.5-2.0, default: 1.0
    severityMultiplier: number;         // 0.5-2.0, default: 1.0
    warningRounds: number;              // 0-3, default: 1
  };

  economicSettings: {
    cycleSpeed: number;                 // Rounds per cycle, default: 8-12
    volatility: number;                 // 0.5-2.0, default: 1.0
  };

  eventSettings: {
    crisisFrequency: number;            // Multiplier, 0.5-3.0, default: 1.0
    opportunityFrequency: number;       // Multiplier, 0.5-3.0, default: 1.0
    crisisSeverity: number;             // Multiplier, 0.5-2.0, default: 1.0
    opportunityValue: number;           // Multiplier, 0.5-2.0, default: 1.0
  };

  intelligenceSettings: {
    maxIntelligenceQuality: number;     // 50-95, default: 95
    baseCost: number;                   // Per signal, default: $200k
    focusBonus: number;                 // Confidence bonus, 0.1-0.3, default: 0.15
  };

  achievementSettings: {
    showProgress: boolean;              // Show progress bars, default: true
    notifications: boolean;             // Show unlock notifications, default: true
  };
}
```

### Balancing Considerations

**Supply Chain:**
- Disruptions should be meaningful but not game-breaking
- Target: 10-20% of rounds have active disruption
- Mitigation should reduce impact 50-70%

**Economic Cycles:**
- Full cycle should be 20-40 rounds
- Demand swings: ±20% from baseline
- Cost swings: ±5% from baseline

**Crisis & Events:**
- Total event rate: 20-30% per round
- Crisis/opportunity ratio: 40/60 (more opportunities than crises)
- Crises should be recoverable with good choices
- Event choices should present meaningful trade-offs

**Competitive Intelligence:**
- Base intelligence (no investment) should provide minimal value
- Premium investment ($5M+) should provide significant strategic advantage
- Signal accuracy should scale smoothly with investment
- Intelligence should inform but not dictate strategy

**Achievements:**
- 30-50 total achievements
- Bronze: 50% players should unlock
- Gold: 20% players should unlock
- Platinum: 5% players should unlock

---

## Testing Recommendations

1. **Supply Chain**
   - Verify disruptions fire at expected rates
   - Test mitigation reduces impact correctly
   - Ensure geographic diversity reduces risk

2. **Economic Cycles**
   - Verify phase transitions follow probabilities
   - Test demand/cost impacts are reasonable
   - Ensure cycles aren't too predictable

3. **Crisis & Events**
   - Test all event trigger conditions
   - Verify event choices produce expected effects
   - Test risky choices have appropriate success rates
   - Ensure crisis level accumulates and decays correctly
   - Check that event effects stack properly

4. **Competitive Intelligence**
   - Verify signal generation scales with investment
   - Test confidence calculations
   - Ensure focused competitors provide bonuses
   - Check insight generation logic
   - Validate competitor profile updates

5. **Achievements**
   - Test all achievement conditions
   - Verify rewards apply correctly
   - Check progress tracking accuracy

---

## Conclusion

These advanced features add strategic depth while maintaining game balance:

✅ **Supply Chain** - Risk management decisions matter
✅ **Economic Cycles** - Timing and adaptation rewarded
✅ **Crisis & Events** - Dynamic situations require strategic choices
✅ **Competitive Intelligence** - Information is a competitive advantage
✅ **Achievements** - Clear progression goals

All systems are modular and can be enabled/disabled independently!
