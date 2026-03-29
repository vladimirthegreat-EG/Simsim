# Business Simulation - Architecture & Interaction Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Sections](#core-sections)
3. [Data Flow](#data-flow)
4. [Section Interactions](#section-interactions)
5. [Game Flow Sequence](#game-flow-sequence)
6. [Key Interaction Patterns](#key-interaction-patterns)

---

## System Overview

The business simulation is built with a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Next.js App Router Pages + React Components + UI Library   │
└─────────────────┬───────────────────────────────────────────┘
                  │ tRPC (Type-safe API calls)
┌─────────────────▼───────────────────────────────────────────┐
│                      API LAYER                               │
│    tRPC Routers (game, team, decision, facilitator)         │
└─────────────────┬───────────────────────────────────────────┘
                  │ Orchestrates
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐
│Database│   │ Engine │   │Business│
│ Layer  │   │ Core   │   │ Logic  │
│(Prisma)│   │(Sim)   │   │(Modules)│
└────────┘   └────────┘   └────────┘
```

---

## Core Sections

### 1. **DATABASE LAYER** (`/prisma/`)

**Purpose**: Persistent storage for game state, decisions, and results

**Key Models**:
- `Facilitator` - Instructors who create/manage games
- `Game` - Game sessions with configuration
- `Team` - Player teams with current state (JSON)
- `Round` - Round metadata and market conditions
- `TeamDecision` - Submitted decisions per module
- `RoundResult` - Performance metrics after simulation

**Schema Files**:
- `schema.prisma` - Active schema (symlink)
- `schema.sqlite.prisma` - Development database
- `schema.postgresql.prisma` - Production database

**Database Client**:
- `server/db/index.ts` - Singleton Prisma client instance

**Key Design Decisions**:
- JSON columns for complex state (TeamState, MarketState)
- Dual-database support (SQLite for dev, PostgreSQL for prod)
- Denormalized `Team.currentState` for fast reads
- Session tokens for team authentication (no user accounts)

---

### 2. **ENGINE CORE** (`/engine/`)

**Purpose**: Pure business logic for simulating company operations

**Main Components**:

#### `core/SimulationEngine.ts`
The **orchestrator** that processes each round:
```typescript
SimulationEngine.processRound(teams, marketState, config)
  → Returns RoundResults for all teams
```

**Process Flow**:
1. For each team, process modules sequentially:
   - FactoryModule → Production & ESG
   - HRModule → Workforce management
   - RDModule → Product development
   - MarketingModule → Brand building
   - FinanceModule → Financial calculations
2. Run MarketSimulator to allocate market shares
3. Apply rubber-banding (boost trailing teams)
4. Calculate rankings

#### `market/MarketSimulator.ts`
Calculates **market share** using softmax algorithm:
- Inputs: All teams' products, prices, brand values, ESG scores
- Outputs: Market share per team per segment
- Uses temperature=0.5 for smooth distribution

#### `modules/` (5 Business Modules)
Each module implements:
```typescript
static process(state: TeamState, decisions: Decisions)
  → { newState: TeamState; result: ModuleResult }
```

**Modules**:
- `FactoryModule.ts` - Production lines, efficiency, ESG initiatives
- `HRModule.ts` - Hiring, training, turnover, morale
- `RDModule.ts` - Product development, features, patents
- `MarketingModule.ts` - Advertising, brand value, campaigns
- `FinanceModule.ts` - Cash flow, fundraising, board votes

**Design Principles**:
- **Stateless**: No side effects, pure functions
- **Immutable**: Clone state, never mutate
- **Composable**: Modules are independent
- **Testable**: Deterministic inputs → outputs

#### `types/`
TypeScript interfaces for:
- `state.ts` - TeamState, MarketState, GameConfig
- `decisions.ts` - Decision types per module
- `results.ts` - Result types per module
- `product.ts`, `employee.ts`, `factory.ts` - Domain types

---

### 3. **API LAYER** (`/server/api/`)

**Purpose**: Type-safe API connecting frontend to backend

**Technology**: tRPC (Remote Procedure Calls with TypeScript)

**Router Structure**:
```
server/api/
├── root.ts                    # Combines all routers
├── trpc.ts                    # tRPC context & middleware
├── shared/constants.ts        # Shared constants
└── routers/
    ├── game.ts               # Game management
    ├── team.ts               # Team operations
    ├── decision.ts           # Decision submission
    └── facilitator.ts        # Admin operations
```

#### **game.ts** (Game Management)
```typescript
create         # Create new game session
start          # Move game from LOBBY → IN_PROGRESS
pause          # Pause active game
advanceRound   # Process simulation & move to next round
getById        # Fetch game details
getByJoinCode  # Find game by 6-char code
```

**Key Interaction**: `advanceRound` calls `SimulationEngine.processRound()`

#### **team.ts** (Team Operations)
```typescript
join           # Join game with join code, get session token
getState       # Get current team state
getRoundResult # Get results for specific round
getHistory     # Get all past round results
```

#### **decision.ts** (Decision Submission)
```typescript
submitFactory   # Submit factory decisions
submitFinance   # Submit finance decisions
submitHR        # Submit HR decisions
submitMarketing # Submit marketing decisions
submitRD        # Submit R&D decisions
lockDecision    # Mark decision as final
```

**Validation**: Each procedure validates decisions against game rules

#### **facilitator.ts** (Admin Operations)
```typescript
getDashboard    # Get overview of all games
getGameDetails  # Get detailed game state
injectEvent     # Add market event to round
getRoundHistory # View past rounds
```

**Context & Middleware**:
- `trpc.ts` - Creates context with database client
- Session-based authentication for teams
- Facilitator authentication for admin routes

---

### 4. **PRESENTATION LAYER** (`/app/`)

**Purpose**: User interfaces for players and facilitators

**Technology**: Next.js 15 App Router with React Server Components

#### **Route Groups**:

##### `(auth)/` - Authentication
```
/login          # Facilitator login
/join           # Team join with code
/dev-login      # Development bypass
```

##### `(facilitator)/admin/` - Facilitator Interface
```
/admin                    # Dashboard (create games)
/admin/games/[gameId]     # Game control panel
```

**Game Control Panel Features**:
- Start/pause game
- Advance rounds (triggers simulation)
- View team performance
- Inject market events
- Monitor decision submissions

##### `(game)/game/[gameId]/` - Player Interface
```
/game/[gameId]            # Overview dashboard
/game/[gameId]/factory    # Factory management
/game/[gameId]/finance    # Financial decisions
/game/[gameId]/hr         # HR management
/game/[gameId]/marketing  # Marketing campaigns
/game/[gameId]/rnd        # R&D projects
/game/[gameId]/results    # Round results
```

**Shared Layout**: `layout.tsx` provides navigation sidebar with:
- Module status indicators (complete/pending)
- Round number
- Cash balance
- Team name/color

---

### 5. **COMPONENT LIBRARY** (`/components/`)

**Purpose**: Reusable React components

#### **ui/** - Design System (shadcn/ui + custom)
Base components:
- `button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`
- `dialog.tsx`, `dropdown-menu.tsx`, `table.tsx`, `tabs.tsx`
- Custom: `stat-card.tsx`, `enhanced-progress.tsx`, `skeleton-card.tsx`

#### **game/** - Game-Specific Components
```
DecisionSubmitBar.tsx      # Sticky footer with submit button
GameLayout.tsx             # Sidebar navigation wrapper
RoundResultsCard.tsx       # Performance summary after round
TeamRankingsCard.tsx       # Leaderboard display
PerformanceHistoryChart.tsx # Historical trend visualization
ESGNotification.tsx        # ESG threshold alerts
```

#### **charts/** - Data Visualization
```
MetricLineChart.tsx        # Time-series trends (Recharts)
MetricBarChart.tsx         # Comparative bar charts
MarketSharePieChart.tsx    # Market distribution pie chart
```

#### **facilitator/** - Admin Components
```
EventInjectionPanel.tsx    # Create market events
RoundHistoryPanel.tsx      # View past rounds
TeamDetailPanel.tsx        # Deep dive into team performance
```

#### **admin/** - Setup Components
```
ComplexitySelector.tsx     # Choose difficulty preset
```

---

### 6. **STATE MANAGEMENT** (`/lib/`)

#### **stores/decisionStore.ts** (Zustand)
Client-side state for pending decisions:
```typescript
{
  decisions: Record<Module, Decisions>  # Pending decisions
  submitDecision(module, data)          # Submit via tRPC
  lockDecision(module)                  # Mark as final
  resetDecisions()                      # Clear on round advance
}
```

#### **contexts/ComplexityContext.tsx** (React Context)
Provides game complexity settings:
```typescript
{
  complexity: "SIMPLE" | "STANDARD" | "ADVANCED"
  features: Record<string, boolean>
  useFeatureFlag(feature): boolean
}
```

Used to conditionally render features:
```typescript
const showESGTrading = useFeatureFlag("ESG_TRADING")  # Advanced only
const autoHR = useFeatureFlag("AUTO_HR")              # Simple only
```

#### **api/trpc.ts** (tRPC Client)
React hooks for API calls:
```typescript
api.game.getById.useQuery({ gameId })
api.decision.submitFactory.useMutation()
api.team.getState.useQuery({ teamId })
```

---

## Data Flow

### 1. **Game Creation Flow**

```
┌──────────────┐
│ Facilitator  │
└──────┬───────┘
       │ Fills form (name, max rounds, complexity)
       ▼
┌──────────────────────┐
│ /admin               │ (UI)
└──────┬───────────────┘
       │ api.game.create.mutate()
       ▼
┌──────────────────────┐
│ game.ts router       │ (API)
│ - Generate join code │
│ - Create Game record │
│ - Create Rounds (0-8)│
└──────┬───────────────┘
       │ Prisma insert
       ▼
┌──────────────────────┐
│ Database             │
│ Game + Rounds created│
└──────────────────────┘
```

### 2. **Team Join Flow**

```
┌──────────────┐
│ Player       │
└──────┬───────┘
       │ Enters join code + team name
       ▼
┌──────────────────────┐
│ /join                │ (UI)
└──────┬───────────────┘
       │ api.team.join.mutate()
       ▼
┌──────────────────────┐
│ team.ts router       │ (API)
│ - Validate join code │
│ - Generate session   │
│ - Create Team record │
│ - Init TeamState JSON│
└──────┬───────────────┘
       │ Prisma insert + set cookie
       ▼
┌──────────────────────┐
│ Database             │
│ Team created         │
└──────┬───────────────┘
       │ Redirect to game
       ▼
┌──────────────────────┐
│ /game/[gameId]       │ (UI)
└──────────────────────┘
```

### 3. **Decision Submission Flow**

```
┌──────────────┐
│ Player       │
└──────┬───────┘
       │ Fills form (e.g., factory decisions)
       ▼
┌──────────────────────┐
│ /game/.../factory    │ (UI)
│ - React Hook Form    │
│ - Zod validation     │
└──────┬───────────────┘
       │ api.decision.submitFactory.mutate()
       ▼
┌──────────────────────┐
│ decision.ts router   │ (API)
│ - Validate decisions │
│ - Check constraints  │
└──────┬───────────────┘
       │ Upsert TeamDecision (unique: teamId+roundId+module)
       ▼
┌──────────────────────┐
│ Database             │
│ TeamDecision saved   │
└──────┬───────────────┘
       │ Return success
       ▼
┌──────────────────────┐
│ UI updates           │
│ - Show checkmark     │
│ - Enable lock button │
└──────────────────────┘
```

### 4. **Round Processing Flow** (Most Complex)

```
┌──────────────┐
│ Facilitator  │
└──────┬───────┘
       │ Clicks "Advance Round"
       ▼
┌──────────────────────────────┐
│ /admin/games/[gameId]        │ (UI)
└──────┬───────────────────────┘
       │ api.game.advanceRound.mutate()
       ▼
┌──────────────────────────────┐
│ game.ts router               │ (API)
│ 1. Load all teams from DB    │
│ 2. Load all decisions from DB│
│ 3. Load current market state │
└──────┬───────────────────────┘
       │ Call simulation engine
       ▼
┌───────────────────────────────────────┐
│ SimulationEngine.processRound()       │ (Engine)
│                                       │
│ For each team:                        │
│   ┌────────────────────────────────┐ │
│   │ 1. FactoryModule.process()     │ │
│   │    - Update production         │ │
│   │    - Apply efficiency          │ │
│   │    - Calculate ESG score       │ │
│   └────────┬───────────────────────┘ │
│            ▼                          │
│   ┌────────────────────────────────┐ │
│   │ 2. HRModule.process()          │ │
│   │    - Hire/fire employees       │ │
│   │    - Apply training            │ │
│   │    - Calculate turnover        │ │
│   └────────┬───────────────────────┘ │
│            ▼                          │
│   ┌────────────────────────────────┐ │
│   │ 3. RDModule.process()          │ │
│   │    - Update product quality    │ │
│   │    - Apply research progress   │ │
│   │    - Grant patents             │ │
│   └────────┬───────────────────────┘ │
│            ▼                          │
│   ┌────────────────────────────────┐ │
│   │ 4. MarketingModule.process()   │ │
│   │    - Apply ad spending         │ │
│   │    - Update brand value        │ │
│   │    - Calculate awareness       │ │
│   └────────┬───────────────────────┘ │
│            ▼                          │
│   ┌────────────────────────────────┐ │
│   │ 5. FinanceModule.process()     │ │
│   │    - Calculate costs           │ │
│   │    - Process fundraising       │ │
│   │    - Update cash flow          │ │
│   └────────────────────────────────┘ │
│                                       │
│ After all teams processed:           │
│   ┌────────────────────────────────┐ │
│   │ MarketSimulator.simulate()     │ │
│   │ - Calculate competitiveness    │ │
│   │ - Apply softmax allocation     │ │
│   │ - Distribute demand            │ │
│   │ - Calculate revenue            │ │
│   └────────┬───────────────────────┘ │
│            ▼                          │
│   ┌────────────────────────────────┐ │
│   │ Apply rubber-banding           │ │
│   │ - Boost trailing teams         │ │
│   │ - Penalize leaders             │ │
│   └────────┬───────────────────────┘ │
│            ▼                          │
│   ┌────────────────────────────────┐ │
│   │ Calculate rankings             │ │
│   │ - By revenue                   │ │
│   │ - By market share              │ │
│   │ - By EPS                       │ │
│   └────────────────────────────────┘ │
│                                       │
│ Return: RoundResults[]                │
└───────┬───────────────────────────────┘
        │ Results for all teams
        ▼
┌──────────────────────────────┐
│ game.ts router (continued)   │
│ 4. Save results to DB        │
│ 5. Update team.currentState  │
│ 6. Update round.marketState  │
│ 7. Increment game.round      │
└──────┬───────────────────────┘
       │ Database transaction
       ▼
┌──────────────────────────────┐
│ Database                     │
│ - RoundResult records created│
│ - Team states updated        │
│ - Round incremented          │
└──────┬───────────────────────┘
       │ Return success
       ▼
┌──────────────────────────────┐
│ UI updates                   │
│ - Facilitator sees new round │
│ - Teams can view results     │
└──────────────────────────────┘
```

### 5. **Results Viewing Flow**

```
┌──────────────┐
│ Player       │
└──────┬───────┘
       │ Navigates to /game/.../results
       ▼
┌──────────────────────┐
│ results/page.tsx     │ (UI)
└──────┬───────────────┘
       │ api.team.getRoundResult.useQuery()
       ▼
┌──────────────────────┐
│ team.ts router       │ (API)
└──────┬───────────────┘
       │ Fetch RoundResult from DB
       ▼
┌──────────────────────┐
│ Database             │
│ RoundResult fetched  │
└──────┬───────────────┘
       │ Return results JSON
       ▼
┌──────────────────────────────┐
│ RoundResultsCard.tsx         │ (Component)
│ - Show revenue, costs, profit│
│ - Show market share changes  │
│ - Show rankings              │
│ - Show module-specific data  │
└──────────────────────────────┘
```

---

## Section Interactions

### **Frontend ↔ API Layer**

**Technology**: tRPC with React Query

**Pattern**:
```typescript
// In React component
const mutation = api.decision.submitFactory.useMutation({
  onSuccess: () => toast.success("Decisions saved!")
})

mutation.mutate({
  teamId: "...",
  roundId: "...",
  decisions: { ... }
})
```

**Benefits**:
- End-to-end type safety (TypeScript types flow from server to client)
- Automatic request deduplication
- Built-in loading/error states
- Optimistic updates

**When it happens**:
- Every user interaction (form submit, button click, page load)
- Real-time queries (auto-refetch every N seconds for live updates)

---

### **API Layer ↔ Engine Core**

**Interaction Point**: `game.ts` router's `advanceRound` procedure

**Code**:
```typescript
// In game.ts router
advanceRound: protectedProcedure
  .input(z.object({ gameId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // 1. Load data from DB
    const teams = await ctx.db.team.findMany(...)
    const decisions = await ctx.db.teamDecision.findMany(...)
    const round = await ctx.db.round.findUnique(...)

    // 2. Call engine (pure function)
    const results = SimulationEngine.processRound(
      teams.map(t => JSON.parse(t.currentState)),
      JSON.parse(round.marketState),
      game.config
    )

    // 3. Save results back to DB
    await ctx.db.$transaction([
      ctx.db.roundResult.createMany({ data: results }),
      ctx.db.team.updateMany(...),
      ctx.db.game.update({ data: { currentRound: round + 1 } })
    ])
  })
```

**Key Design**:
- Engine is **stateless** - doesn't know about database
- API layer handles **orchestration** - load data, call engine, save results
- Engine returns **immutable results** - API layer persists them

---

### **Engine Core ↔ Modules**

**Interaction Pattern**: Sequential module processing

**Code Flow**:
```typescript
// In SimulationEngine.ts
static processRound(teams, marketState, config) {
  const results = teams.map(team => {
    let state = team.currentState
    const decisions = team.decisions

    // Process modules in order
    const factoryResult = FactoryModule.process(state, decisions.factory)
    state = factoryResult.newState

    const hrResult = HRModule.process(state, decisions.hr)
    state = hrResult.newState

    const rdResult = RDModule.process(state, decisions.rd)
    state = rdResult.newState

    const marketingResult = MarketingModule.process(state, decisions.marketing)
    state = marketingResult.newState

    const financeResult = FinanceModule.process(state, decisions.finance)
    state = financeResult.newState

    return {
      teamId: team.id,
      stateAfter: state,
      factoryResult,
      hrResult,
      rdResult,
      marketingResult,
      financeResult
    }
  })

  // Then run market simulation
  const marketResults = MarketSimulator.simulate(
    results.map(r => r.stateAfter),
    marketState
  )

  return this.mergeResults(results, marketResults)
}
```

**Why Sequential?**:
- Factory produces units → affects inventory
- HR changes workforce → affects productivity
- R&D improves product → affects quality
- Marketing builds brand → affects demand
- Finance calculates final P&L → depends on all above

**State Mutation**:
```typescript
// Each module returns NEW state
{ newState: TeamState; result: ModuleResult }

// NOT mutating:
state.cash -= cost  // ❌ BAD

// Cloning:
return {
  newState: {
    ...state,
    cash: state.cash - cost  // ✅ GOOD
  }
}
```

---

### **API Layer ↔ Database**

**Technology**: Prisma ORM

**Interaction Pattern**: CRUD operations

**Example - Complex Transaction**:
```typescript
// In game.ts router
await ctx.db.$transaction(async (tx) => {
  // 1. Create round results
  await tx.roundResult.createMany({
    data: results.map(r => ({
      teamId: r.teamId,
      roundId: roundId,
      stateAfter: JSON.stringify(r.stateAfter),
      metrics: JSON.stringify(r.metrics),
      factoryResults: JSON.stringify(r.factoryResult),
      // ... other results
      rank: r.rank
    }))
  })

  // 2. Update team states
  for (const result of results) {
    await tx.team.update({
      where: { id: result.teamId },
      data: { currentState: JSON.stringify(result.stateAfter) }
    })
  }

  // 3. Increment round
  await tx.game.update({
    where: { id: gameId },
    data: { currentRound: { increment: 1 } }
  })
})
```

**Key Patterns**:
- **Transactions** for atomic operations (all succeed or all fail)
- **JSON serialization** for complex state objects
- **Upserts** for idempotent decision updates
- **Cascading deletes** for cleanup

---

### **Components ↔ State Management**

**Two Patterns**:

#### 1. **Server State** (via tRPC + React Query)
```typescript
// In component
const { data: teamState, isLoading } = api.team.getState.useQuery({
  teamId: session.teamId
})

// Automatic:
// - Fetches on mount
// - Caches result
// - Re-fetches on window focus
// - Shows loading state
```

#### 2. **Client State** (via Zustand store)
```typescript
// In component
const { decisions, submitDecision } = useDecisionStore()

// Manual control:
const handleSubmit = () => {
  submitDecision('FACTORY', formData)  // Updates local state
  mutation.mutate(formData)             // Syncs to server
}
```

**When to use which**:
- **Server state**: Team state, game state, round results (source of truth is DB)
- **Client state**: Form drafts, pending decisions, UI state (temporary, local)

---

## Game Flow Sequence

### Complete Game Lifecycle

```
1. SETUP PHASE
   ┌─────────────────────────────────────┐
   │ Facilitator creates game            │
   │ - Sets name, rounds, complexity     │
   │ - Receives join code (e.g., ABC123) │
   └────────────┬────────────────────────┘
                │
   ┌────────────▼────────────────────────┐
   │ Teams join game                     │
   │ - Enter join code + team name       │
   │ - Choose team color                 │
   │ - Receive session token             │
   └────────────┬────────────────────────┘
                │
   ┌────────────▼────────────────────────┐
   │ Facilitator starts game             │
   │ - Status: LOBBY → IN_PROGRESS       │
   │ - Round 0 → Round 1                 │
   └────────────┬────────────────────────┘
                │
                ▼

2. ROUND LOOP (Repeat 8 times)
   ┌─────────────────────────────────────┐
   │ DECISION PHASE                      │
   │ Teams make decisions:               │
   │ - Factory (production, efficiency)  │
   │ - HR (hiring, training)             │
   │ - R&D (product improvements)        │
   │ - Marketing (advertising, branding) │
   │ - Finance (fundraising, dividends)  │
   │                                     │
   │ Each decision saved to DB           │
   │ Teams can modify until locked       │
   └────────────┬────────────────────────┘
                │
   ┌────────────▼────────────────────────┐
   │ FACILITATOR MONITORING              │
   │ - Views decision submission status  │
   │ - Can inject market events          │
   │ - Waits for all teams (or timeout)  │
   └────────────┬────────────────────────┘
                │
   ┌────────────▼────────────────────────┐
   │ PROCESSING PHASE                    │
   │ Facilitator clicks "Advance Round"  │
   │                                     │
   │ Backend executes:                   │
   │ 1. Load all team states             │
   │ 2. Load all decisions               │
   │ 3. Call SimulationEngine            │
   │    - Process 5 modules per team     │
   │    - Run market simulation          │
   │    - Apply rubber-banding           │
   │    - Calculate rankings             │
   │ 4. Save results to DB               │
   │ 5. Update team states               │
   │ 6. Increment round number           │
   └────────────┬────────────────────────┘
                │
   ┌────────────▼────────────────────────┐
   │ RESULTS PHASE                       │
   │ Teams view results:                 │
   │ - Revenue, costs, profit            │
   │ - Market share changes              │
   │ - Rankings (revenue, EPS, share)    │
   │ - Module-specific metrics           │
   │ - Competitor performance            │
   │                                     │
   │ Teams analyze & strategize          │
   └────────────┬────────────────────────┘
                │
                │ If round < 8: Loop back to DECISION PHASE
                │ If round = 8: ▼
                │
   ┌────────────▼────────────────────────┐
   │ GAME COMPLETE                       │
   │ - Status: IN_PROGRESS → COMPLETED   │
   │ - Final rankings displayed          │
   │ - Historical data available         │
   │ - Teams can export results          │
   └─────────────────────────────────────┘
```

---

## Key Interaction Patterns

### Pattern 1: **Optimistic UI Updates**

**Scenario**: Submitting a decision

```typescript
// In component
const mutation = api.decision.submitFactory.useMutation({
  onMutate: async (newDecision) => {
    // Cancel in-flight queries
    await utils.decision.getByTeam.cancel()

    // Snapshot current data
    const previous = utils.decision.getByTeam.getData()

    // Optimistically update UI
    utils.decision.getByTeam.setData(newDecision)

    return { previous }  // For rollback
  },
  onError: (err, newDecision, context) => {
    // Rollback on error
    utils.decision.getByTeam.setData(context.previous)
    toast.error("Failed to save decision")
  },
  onSuccess: () => {
    toast.success("Decision saved!")
  }
})
```

**Benefits**:
- Instant feedback (no waiting for server)
- Automatic rollback on error
- Improved perceived performance

---

### Pattern 2: **Polling for Real-Time Updates**

**Scenario**: Facilitator dashboard monitoring team submissions

```typescript
// In admin page
const { data: gameState } = api.game.getById.useQuery(
  { gameId },
  {
    refetchInterval: 3000,  // Poll every 3 seconds
    refetchIntervalInBackground: true
  }
)

// Displays live updates:
// - How many teams submitted decisions
// - Current round status
// - Time elapsed
```

---

### Pattern 3: **Lazy Loading with Suspense**

**Scenario**: Loading round results (large data)

```typescript
// In results page
<Suspense fallback={<LoadingState />}>
  <RoundResults roundId={roundId} />
</Suspense>

// RoundResults component
const { data } = api.team.getRoundResult.useQuery({ roundId })

// React automatically shows fallback while loading
// Then smoothly transitions to content
```

---

### Pattern 4: **Conditional Rendering by Complexity**

**Scenario**: Show ESG trading only in Advanced mode

```typescript
// In finance page
const { useFeatureFlag } = useComplexity()
const showESGTrading = useFeatureFlag("ESG_TRADING")

return (
  <div>
    <FundraisingSection />
    <DividendSection />
    {showESGTrading && <ESGTradingSection />}  {/* Advanced only */}
  </div>
)
```

**Complexity Matrix**:
| Feature | Simple | Standard | Advanced |
|---------|--------|----------|----------|
| Factory Management | ✅ | ✅ | ✅ |
| HR Decisions | ❌ (Auto) | ✅ | ✅ |
| R&D Projects | ✅ | ✅ | ✅ |
| ESG Trading | ❌ | ❌ | ✅ |
| Board Voting | ❌ | ✅ | ✅ |
| Multiple Factories | ❌ | ✅ | ✅ |

---

### Pattern 5: **Event-Driven Architecture**

**Scenario**: Facilitator injects recession event

```
┌──────────────────┐
│ Facilitator UI   │
│ Injects "RECESSION"
└────────┬─────────┘
         │ api.facilitator.injectEvent()
         ▼
┌──────────────────┐
│ facilitator.ts   │
│ Saves to Round   │
└────────┬─────────┘
         │ Update round.events: ["RECESSION"]
         ▼
┌──────────────────┐
│ Database         │
└────────┬─────────┘
         │ Next round advancement
         ▼
┌──────────────────┐
│ SimulationEngine │
│ Reads events     │
│ Applies effects: │
│ - Demand -30%    │
│ - Price pressure │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ All teams        │
│ See reduced sales│
└──────────────────┘
```

---

## Summary of Key Interactions

| Interaction | Technology | Direction | Purpose |
|-------------|-----------|-----------|---------|
| **UI → API** | tRPC + React Query | Bi-directional | User actions, data fetching |
| **API → Engine** | Function calls | Uni-directional | Business logic processing |
| **API → Database** | Prisma ORM | Bi-directional | Data persistence |
| **Engine → Modules** | Function calls | Uni-directional | Sequential processing |
| **Components → Store** | Zustand hooks | Bi-directional | Client state management |
| **Context → Components** | React Context | Uni-directional | Feature flags, config |

---

## Quick Reference: "Where is X handled?"

| What | Where | File |
|------|-------|------|
| **Create game** | API Router | `server/api/routers/game.ts` |
| **Join game** | API Router | `server/api/routers/team.ts` |
| **Submit decisions** | API Router | `server/api/routers/decision.ts` |
| **Process round** | Engine Core | `engine/core/SimulationEngine.ts` |
| **Calculate market share** | Market Sim | `engine/market/MarketSimulator.ts` |
| **Production logic** | Factory Module | `engine/modules/FactoryModule.ts` |
| **Workforce logic** | HR Module | `engine/modules/HRModule.ts` |
| **Product development** | R&D Module | `engine/modules/RDModule.ts` |
| **Brand building** | Marketing Module | `engine/modules/MarketingModule.ts` |
| **Financial calcs** | Finance Module | `engine/modules/FinanceModule.ts` |
| **Game UI** | Next.js Pages | `app/(game)/game/[gameId]/` |
| **Admin UI** | Next.js Pages | `app/(facilitator)/admin/` |
| **Charts** | Components | `components/charts/` |
| **Game components** | Components | `components/game/` |
| **Database schema** | Prisma | `prisma/schema.prisma` |
| **Type definitions** | Engine Types | `engine/types/` |

---

**This architecture enables**:
- Clear separation of concerns
- Type safety end-to-end
- Testable business logic
- Scalable multiplayer gameplay
- Real-time updates
- Complex strategy simulation
