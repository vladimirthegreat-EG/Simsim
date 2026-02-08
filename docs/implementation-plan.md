# Business Simulation - Implementation Plan

## Executive Summary

This plan addresses four major areas:
1. **Feature Audit** - Compare design documents vs. implementation
2. **Formula & Game Balancing** - Testing and validation
3. **UI Audit & Improvements** - Comprehensive UI review
4. **Game Complexity Toggles** - Simplified vs. complex game modes

---

## Phase 1: Feature Audit - Design Documents vs. Implementation

### Summary of Implemented Features

Based on my audit of the codebase, here is what is **currently implemented** in the simulation engine:

#### Factory Module (FactoryModule.ts)
- [x] Factory creation ($50M cost)
- [x] Efficiency investments (workers, supervisors, engineers, machinery, factory)
- [x] Diminishing returns after $10M threshold
- [x] Green energy investments (CO2 reduction)
- [x] Factory upgrades (Six Sigma, Automation, Material Refinement, Supply Chain, Warehousing)
- [x] ESG initiatives (charitable donation, community investment, health & safety, code of ethics, fair wage, supplier ethics)
- [x] Regional cost modifiers (NA/Europe 100%, Asia 85%, MENA 90%)
- [x] Production calculations with worker efficiency and speed
- [x] Staffing recommendations and penalties

#### HR Module (HRModule.ts)
- [x] Employee hiring with stats generation
- [x] Employee firing with severance
- [x] Training programs (worker $50K, engineer $75K, supervisor $100K)
- [x] Turnover processing with morale/loyalty adjustments
- [x] Three recruitment tiers (Basic $5K, Premium $15K, Executive $50K)
- [x] Comprehensive employee stats (efficiency, accuracy, speed, stamina, discipline, loyalty, team compatibility, health)
- [x] Role-specific stats (Engineer: innovation, problem solving; Supervisor: leadership, tactical planning)
- [x] Salary calculation based on stats (0.8x to 2.2x multiplier)
- [x] Workforce summary calculations

#### Finance Module (FinanceModule.ts)
- [x] Treasury Bills issuance
- [x] Corporate Bonds issuance
- [x] Bank loans with interest
- [x] Stock issuance (IPO/secondary offerings)
- [x] Share buybacks
- [x] Dividends
- [x] Financial ratios (current, quick, cash, debt-to-equity, ROE, ROA, profit margin)
- [x] Board proposal probability calculations
- [x] Board vote simulation
- [x] FX impact calculations
- [x] Cash flow statement generation
- [x] Economic forecast accuracy tracking

#### Marketing Module (MarketingModule.ts)
- [x] Advertising budget by segment
- [x] Branding investment
- [x] Promotions with discount percentages
- [x] Sponsorships with brand impact
- [x] Brand decay (2% per round)
- [x] Diminishing returns on advertising
- [x] Price elasticity by segment
- [x] Brand awareness calculations

#### R&D Module (RDModule.ts)
- [x] R&D budget allocation
- [x] New product development with segment targeting
- [x] Product improvements (quality, features)
- [x] Patent generation from R&D progress
- [x] Engineer R&D output calculation
- [x] Development cost calculation by segment
- [x] Product competitiveness scoring

#### Market Simulator (MarketSimulator.ts)
- [x] Market share calculation using softmax
- [x] Demand calculation with economic adjustments (GDP, inflation, consumer confidence)
- [x] Price, quality, brand, ESG, and feature scoring
- [x] Rubber-banding for trailing teams
- [x] Market events (recession, boom, inflation spike, tech breakthrough, etc.)
- [x] Competitive rankings (revenue, EPS, market share)

---

### Features from Design Documents - Gap Analysis

Based on the README documentation (README_FACTORY.md, README_FINANCE.md, README_HR.md), the following features are **documented but may have implementation gaps**:

#### Factory Module Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Production Lines Management UI | Partial | Engine supports it, UI needs verification |
| Multi-factory ESG tracking | Implemented | Per-factory ESG expenses tracked |
| Green Energy Tiers | Not Implemented | Multi-stage initiatives with compounding benefits |
| Carbon Credit Trading | Not Implemented | Trade CO2e surplus at market price |
| ESG Dashboard with traffic lights | Not Implemented | Visual indicators for CO2e, worker well-being, compliance |
| ESG Event Triggers | Not Implemented | Bonus for ESG > 800, penalty for < 300 |
| Product Lifecycle/EOL impact | Not Implemented | End-of-life product handling, recyclability |

#### HR Module Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Unionization Risk mechanics | Partial | Stats exist, events not triggered |
| Corruption Risk events | Not Implemented | Audit/ethics scandals not triggering |
| Behavioral trait effects (hidden) | Partial | Stats tracked but not fully utilized |
| Training fatigue (diminishing returns) | Not Implemented | 3rd+ program should have -20% effectiveness |
| Performance bonus system | Not Implemented | Efficiency/quality/safety/innovation bonuses |
| Benefits system | Not Implemented | Healthcare, retirement, etc. affecting morale |

#### Finance Module Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Inventory tracking | Not Implemented | Only cash tracked, not receivables/inventory |
| Full Balance Sheet | Partial | Simplified - missing detailed line items |
| Income Statement breakdown | Not Implemented | No COGS, SG&A, R&D expense tracking |
| FX Forecasting with accuracy rewards | Partial | Economic forecasting exists, FX forecasting incomplete |
| Investor Sentiment tracking | Not Implemented | Referenced but not tracked as state |
| Cost of Capital tracking | Not Implemented | Referenced in formulas but not implemented |

#### Marketing Module Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Campaign types | Not Implemented | Different campaign strategies |
| Regional advertising | Not Implemented | Only segment-based, not region-based |
| Market research purchasing | Not Implemented | Buy competitor/market data |
| Product positioning strategy | Not Implemented | Premium vs. value positioning |

#### R&D Module Gaps
| Feature | Status | Notes |
|---------|--------|-------|
| Product development timeline tracking | Partial | Products created immediately at 80% quality |
| Technology tree/dependencies | Not Implemented | No tech prerequisites |
| R&D project queue | Not Implemented | Can start unlimited products simultaneously |
| Innovation breakthroughs | Not Implemented | Random breakthrough events from high innovation |

---

### Missing Features Priority List

#### HIGH Priority (Core Gameplay Impact)
1. **Inventory & COGS Tracking** - Essential for realistic financial statements
2. **Product Development Timeline** - Products should take rounds to develop
3. **Training Fatigue** - Prevent training exploitation
4. **Benefits System** - Core HR feature affecting morale

#### MEDIUM Priority (Enhanced Gameplay)
5. **ESG Event Triggers** - Rewards/penalties for ESG performance
6. **Unionization Events** - Consequence for low morale/pay
7. **Carbon Credit Trading** - ESG monetization
8. **Market Research Purchasing** - Strategic information gathering

#### LOW Priority (Polish)
9. **Green Energy Tiers** - Multi-stage progression
10. **Corruption/Ethics Events** - Random event triggers
11. **Product Lifecycle** - End-of-life management
12. **Technology Tree** - R&D prerequisites

---

## Phase 2: Formula & Game Balancing Testing

### Testing Strategy

#### 2.1 Economic Balance Testing
- [ ] Simulate 20-round games with different strategies
- [ ] Verify no single dominant strategy wins every time
- [ ] Test edge cases (all factories, no factories, all R&D, etc.)
- [ ] Ensure trailing teams can catch up (rubber-banding effectiveness)

#### 2.2 Formula Validation Checklist

**Factory Module:**
- [ ] Efficiency investments: 1% per $1M actually applies
- [ ] Diminishing returns kick in at $10M threshold
- [ ] CO2 reduction: 10 tons per $100K invested
- [ ] Upgrade effects match documented values

**HR Module:**
- [ ] Salary calculation: stats 0-100 map to 0.8x-2.2x multiplier
- [ ] Turnover rate: 12% annual base, adjusted by morale/loyalty
- [ ] Training improvement: 5-15% efficiency gain
- [ ] Staffing ratios: 2.5 workers/machine, 1:15 supervisor ratio

**Finance Module:**
- [ ] EPS calculation: netIncome / sharesIssued
- [ ] Market cap formula validation
- [ ] Board approval probabilities match documented thresholds
- [ ] Interest rate calculations

**Marketing Module:**
- [ ] Brand decay: 2% per round
- [ ] Advertising impact: $1M = 0.5% brand increase
- [ ] Promotion elasticity by segment

**Market Simulator:**
- [ ] Softmax temperature (0.5) creates appropriate competition
- [ ] Rubber-banding: 15% boost for trailing, 8% penalty for leading
- [ ] Price/quality/brand weighting is balanced

#### 2.3 Balance Concerns to Address

1. **Potential Exploits:**
   - Unlimited product development (no queue/timeline)
   - Training spam (no fatigue mechanism)
   - ESG score farming without drawbacks

2. **Potential Imbalances:**
   - Premium/Executive segment dominance (higher margins)
   - First-mover advantages too strong
   - Cash accumulation without reinvestment penalty

3. **Rubber-banding Tuning:**
   - Current: 15% boost / 8% penalty
   - May need adjustment based on playtesting

---

## Phase 3: UI Audit & Improvements

### 3.1 UI Components Inventory

Need to audit:
- [ ] Game dashboard
- [ ] Factory management screens
- [ ] HR management screens
- [ ] Finance dashboard and tabs
- [ ] Marketing interface
- [ ] R&D interface
- [ ] Team/game management
- [ ] Facilitator admin panel

### 3.2 UI Improvement Categories

#### Usability
- Clear navigation between modules
- Consistent button styling and placement
- Form validation with helpful error messages
- Loading states for async operations

#### Information Display
- Financial data visualization (charts, graphs)
- Market share visualization
- Competitor comparison views
- Historical trend displays

#### Responsiveness
- Mobile-friendly layouts
- Touch-friendly controls
- Tablet optimization

#### Accessibility
- Color contrast compliance
- Screen reader support
- Keyboard navigation
- Focus indicators

### 3.3 Specific UI Improvements Needed

1. **Dashboard:**
   - Real-time financial health indicators
   - Quick actions for common operations
   - Round summary at a glance

2. **Factory Module:**
   - Production line visualization
   - ESG score breakdown display
   - Upgrade comparison tooltips

3. **HR Module:**
   - Employee roster with filtering/sorting
   - Candidate comparison interface
   - Training program progress

4. **Finance Module:**
   - Interactive financial statements
   - Board meeting scheduling UI
   - Investment wizard

5. **Marketing Module:**
   - Campaign builder
   - Brand analytics dashboard
   - Competitor positioning map

6. **R&D Module:**
   - Product development pipeline
   - Feature comparison matrix
   - Patent portfolio view

---

## Phase 4: Game Complexity Toggle System

### 4.1 Design Approach

Implement a **preset-based system** with optional granular toggles:

```typescript
interface GameComplexitySettings {
  preset: "simple" | "standard" | "advanced" | "custom";

  // Module toggles (for custom preset)
  modules: {
    factory: boolean;
    hr: boolean;
    finance: boolean;
    marketing: boolean;
    rd: boolean;
    esg: boolean;
  };

  // Feature toggles
  features: {
    multipleFactories: boolean;
    employeeManagement: boolean;
    detailedFinancials: boolean;
    boardMeetings: boolean;
    marketEvents: boolean;
    rubberBanding: boolean;
  };

  // Automation toggles
  automation: {
    autoHire: boolean;
    autoTrain: boolean;
    autoInvest: boolean;
  };
}
```

### 4.2 Preset Definitions

#### Simple Mode
- **Target Audience:** Beginners, classroom intro
- **Active Modules:** Factory (basic), Marketing, R&D
- **Disabled:** HR (auto-managed), detailed Finance, ESG, Board meetings
- **Features:** Single factory, simplified products, no market events
- **Automation:** Auto-hire, auto-train enabled

#### Standard Mode
- **Target Audience:** General players, workshops
- **Active Modules:** All modules enabled
- **Features:** Multiple factories, full products, limited events
- **Automation:** Optional auto features

#### Advanced Mode
- **Target Audience:** Business students, executives
- **Active Modules:** All modules with full complexity
- **Features:** All features enabled including:
  - Carbon credit trading
  - Unionization events
  - Detailed financial statements
  - FX hedging
  - Board politics

### 4.3 Implementation Plan

1. **Database Schema Update:**
```sql
ALTER TABLE Game ADD COLUMN complexity_preset VARCHAR(20);
ALTER TABLE Game ADD COLUMN complexity_settings JSON;
```

2. **Game Creation Flow:**
   - Facilitator selects preset during game creation
   - Option to customize individual toggles
   - Settings locked after game starts

3. **UI Adaptations:**
   - Hide disabled module tabs
   - Simplify forms for simple mode
   - Show "Advanced" badges for complex features

4. **Engine Adaptations:**
   - Skip processing for disabled modules
   - Auto-generate decisions for automated features
   - Simplify market simulation for simple mode

### 4.4 Module-by-Module Simplification

| Module | Simple Mode Behavior |
|--------|---------------------|
| Factory | Single factory, no upgrades, no ESG |
| HR | Auto-managed, fixed headcount |
| Finance | Cash only, no debt, no board |
| Marketing | Single budget slider |
| R&D | Pre-built products, quality slider only |
| Market | Fixed demand, no events |

---

## Implementation Roadmap

### Sprint 1: Feature Gaps (High Priority)
- Implement inventory/COGS tracking
- Add product development timelines
- Implement training fatigue
- Add benefits system

### Sprint 2: Balancing & Testing
- Create balance test suite
- Fix formula issues found
- Tune rubber-banding
- Address exploits

### Sprint 3: UI Audit
- Audit all UI components
- Create improvement list
- Implement critical fixes
- Add missing visualizations

### Sprint 4: Complexity System
- Implement preset definitions
- Add game creation settings UI
- Create module toggle system
- Test all preset modes

### Sprint 5: Polish & Documentation
- Final balancing pass
- User documentation
- Facilitator guide
- Release preparation

---

## Next Steps

1. **Confirm priorities** - Which phase to tackle first?
2. **Review gap analysis** - Any features I missed?
3. **Validate presets** - Are Simple/Standard/Advanced definitions correct?
4. **Set testing criteria** - What defines "balanced"?

Ready to proceed with implementation once plan is approved.
