/**
 * Simulation Engine - Main orchestrator for processing rounds
 *
 * This is the core engine that coordinates all modules to simulate a round
 * of the business simulation. It processes decisions, updates team states,
 * runs market simulation, and generates results.
 *
 * DETERMINISM GUARANTEE:
 * - All randomness comes from seeded RNG via EngineContext
 * - Same seed + same decisions = identical outputs
 * - Each team gets its own context to prevent cross-contamination
 */

import {
  TeamState,
  MarketState,
  AllDecisions,
  RoundResults,
  ModuleResult,
  CONSTANTS,
  Employee,
  EmployeeStats,
  EngineerStats,
  SupervisorStats,
  EmployeeRole,
} from "../types";
import { FactoryModule } from "../modules/FactoryModule";
import { HRModule } from "../modules/HRModule";
import { FinanceModule } from "../modules/FinanceModule";
import { MarketingModule } from "../modules/MarketingModule";
import { RDModule } from "../modules/RDModule";
import { MarketSimulator } from "../market/MarketSimulator";
import { cloneTeamState, cloneDecisions } from "../utils/stateUtils";
import {
  createEngineContext,
  deriveSeedBundle,
  hashState,
  CURRENT_ENGINE_VERSION,
  type EngineContext,
  type SeedBundle,
} from "./EngineContext";
import { MaterialEngine } from "../materials/MaterialEngine";
import { TariffEngine } from "../tariffs/TariffEngine";
import { FinancialStatementsEngine } from "../finance";

export interface TeamInput {
  id: string;
  state: TeamState;
  decisions: AllDecisions;
}

export interface SimulationInput {
  roundNumber: number;
  teams: TeamInput[];
  marketState: MarketState;
  /** Master seed for deterministic simulation (required for production) */
  matchSeed?: string;
  events?: Array<{
    type: string;
    title: string;
    description: string;
    effects: Array<{ target: string; modifier: number }>;
    targetTeams: string[] | "all";
  }>;
}

export interface SimulationOutput {
  roundNumber: number;
  results: RoundResults[];
  newMarketState: MarketState;
  rankings: Array<{ teamId: string; rank: number; epsRank: number; shareRank: number }>;
  summaryMessages: string[];
  /** Audit trail for verification and replay */
  auditTrail: {
    /** Seed bundle used for this round */
    seedBundle: SeedBundle;
    /** Hash of final state for verification */
    finalStateHashes: Record<string, string>;
    /** Engine version that produced this output */
    engineVersion: string;
    /** Schema version of the state */
    schemaVersion: string;
  };
}

export class SimulationEngine {
  /**
   * Process a complete round of the simulation
   *
   * DETERMINISM: This method is deterministic when matchSeed is provided.
   * Same seed + same decisions = identical outputs every time.
   */
  static processRound(input: SimulationInput): SimulationOutput {
    const { roundNumber, teams, marketState, events, matchSeed } = input;
    const results: RoundResults[] = [];
    const summaryMessages: string[] = [];

    // Generate seed bundle for audit trail (use provided seed or generate one)
    const effectiveSeed = matchSeed || `auto-${Date.now()}`;
    const seedBundle = deriveSeedBundle(effectiveSeed, roundNumber);

    summaryMessages.push(`=== Processing Round ${roundNumber} ===`);
    summaryMessages.push(`Seed: ${seedBundle.matchSeed}, Round seed: ${seedBundle.roundSeed}`);

    // Step 1: Process each team's decisions through all modules
    const processedTeams: Array<{
      id: string;
      state: TeamState;
      ctx: EngineContext;
      moduleResults: {
        factory: ModuleResult;
        hr: ModuleResult;
        finance: ModuleResult;
        marketing: ModuleResult;
        rd: ModuleResult;
      };
    }> = [];

    for (const team of teams) {
      summaryMessages.push(`Processing team: ${team.id}`);

      // Create context for this team (each team gets its own RNG instances)
      const ctx = createEngineContext(effectiveSeed, roundNumber, team.id);

      let currentState = cloneTeamState(team.state);

      // Add version to state if not present
      if (!currentState.version) {
        currentState.version = CURRENT_ENGINE_VERSION;
      }

      const decisions = team.decisions || {};

      // Process Materials & Tariffs (before production)
      if (currentState.materials) {
        // Process material orders (check for arrivals)
        const { arrivedOrders, updatedInventory, messages } = MaterialEngine.processOrders(
          currentState.materials,
          roundNumber
        );

        currentState.materials.inventory = updatedInventory;
        currentState.materials.totalInventoryValue = updatedInventory.reduce(
          (sum, inv) => sum + inv.quantity * inv.averageCost,
          0
        );
        currentState.materials.holdingCosts = MaterialEngine.calculateHoldingCosts(updatedInventory);

        // Update accounts payable (remove delivered orders)
        const deliveredCost = arrivedOrders.reduce((sum, order) => sum + order.totalCost, 0);
        currentState.accountsPayable = Math.max(0, currentState.accountsPayable - deliveredCost);

        // Log material arrival messages
        if (messages.length > 0) {
          summaryMessages.push(...messages.map(msg => `  ${team.id}: ${msg}`));
        }

        // Process tariff events
        if (currentState.tariffs) {
          const tariffResult = TariffEngine.processRoundEvents(
            currentState.tariffs,
            roundNumber,
            currentState
          );

          if (tariffResult.messages.length > 0) {
            summaryMessages.push(...tariffResult.messages.map(msg => `  ${team.id}: ${msg}`));
          }
        }
      }

      // Process Factory Module (with context for deterministic ID generation)
      const factoryResult = FactoryModule.process(
        currentState,
        decisions.factory || {},
        ctx
      );
      currentState = factoryResult.newState;

      // Process HR Module (with context for deterministic hiring/turnover)
      const hrResult = HRModule.process(currentState, decisions.hr || {}, ctx);
      currentState = hrResult.newState;

      // Process R&D Module (with context for deterministic product IDs)
      const rdResult = RDModule.process(currentState, decisions.rd || {}, ctx);
      currentState = rdResult.newState;

      // Process Marketing Module (no randomness currently)
      const marketingResult = MarketingModule.process(
        currentState,
        decisions.marketing || {}
      );
      currentState = marketingResult.newState;

      // Process Finance Module (needs market state for interest rates)
      const financeResult = FinanceModule.process(
        currentState,
        decisions.finance || {},
        marketState
      );
      currentState = financeResult.newState;

      // Apply any events targeting this team
      if (events) {
        currentState = this.applyEvents(currentState, team.id, events);
      }

      processedTeams.push({
        id: team.id,
        state: currentState,
        ctx,
        moduleResults: {
          factory: factoryResult.result,
          hr: hrResult.result,
          finance: financeResult.result,
          marketing: marketingResult.result,
          rd: rdResult.result,
        },
      });
    }

    // Step 2: Run market simulation (competition between all teams)
    // Use the first team's context for market simulation (all contexts share same market seed)
    summaryMessages.push("Running market simulation...");
    const marketCtx = processedTeams.length > 0 ? processedTeams[0].ctx : undefined;
    const marketResult = MarketSimulator.simulate(
      processedTeams.map(t => ({ id: t.id, state: t.state })),
      marketState,
      { applyRubberBanding: roundNumber >= 3 },
      marketCtx
    );

    if (marketResult.rubberBandingApplied) {
      summaryMessages.push("Rubber-banding adjustments applied to balance competition.");
    }

    // Step 3: Update team states with market results and generate final results
    for (const team of processedTeams) {
      const teamMarketShares = marketResult.marketShares[team.id];
      const teamSales = marketResult.salesByTeam[team.id];
      const teamRevenue = marketResult.revenueByTeam[team.id];

      // Update state with market results
      team.state.marketShare = teamMarketShares;
      team.state.revenue = teamRevenue;

      // Calculate costs
      const totalCosts = this.calculateTotalCosts(team.state, team.moduleResults);

      // Calculate net income
      team.state.netIncome = teamRevenue - totalCosts;

      // Update EPS
      team.state.eps = team.state.sharesIssued > 0
        ? team.state.netIncome / team.state.sharesIssued
        : 0;

      // Generate complete financial statements (Income, Cash Flow, Balance Sheet)
      try {
        const previousStatements = team.state.previousFinancialStatements || null;
        const financialStatements = FinancialStatementsEngine.generate(
          team.state,
          previousStatements
        );

        // Store previous statements for next round
        team.state.previousFinancialStatements = team.state.financialStatements;
        team.state.financialStatements = financialStatements;

        // Log validation issues if any
        if (!financialStatements.validation.valid) {
          summaryMessages.push(
            `  ${team.id}: Financial statement warnings: ${financialStatements.validation.errors.join(", ")}`
          );
        }
      } catch (error) {
        // Financial statements are optional - don't break the simulation if they fail
        summaryMessages.push(
          `  ${team.id}: Warning - Could not generate financial statements: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Update total assets
      team.state.totalAssets = team.state.cash +
        team.state.factories.length * CONSTANTS.NEW_FACTORY_COST;

      // Update shareholders equity
      team.state.shareholdersEquity = team.state.totalAssets - team.state.totalLiabilities;

      // Update market cap
      team.state.marketCap = FinanceModule.updateMarketCap(
        team.state,
        0, // EPS growth (would need previous state)
        50 // Market sentiment (neutral)
      );

      // Update share price
      team.state.sharePrice = team.state.sharesIssued > 0
        ? team.state.marketCap / team.state.sharesIssued
        : 0;

      // Create round result
      const result: RoundResults = {
        roundNumber,
        teamId: team.id,
        newState: team.state,
        factoryResults: team.moduleResults.factory,
        hrResults: team.moduleResults.hr,
        financeResults: team.moduleResults.finance,
        marketingResults: team.moduleResults.marketing,
        rdResults: team.moduleResults.rd,
        salesBySegment: teamSales,
        marketShareBySegment: teamMarketShares,
        competitorActions: this.generateCompetitorSummary(processedTeams, team.id),
        totalRevenue: teamRevenue,
        totalCosts,
        netIncome: team.state.netIncome,
        rank: 0, // Set after rankings calculated
        epsRank: 0,
        marketShareRank: 0,
      };

      results.push(result);
    }

    // Step 4: Calculate rankings
    const rankings = MarketSimulator.calculateRankings(
      processedTeams.map(t => ({ id: t.id, state: t.state })),
      marketResult
    );

    // Update results with rankings (using Map for O(1) lookup)
    const rankingMap = new Map(rankings.map(r => [r.teamId, r]));
    for (const result of results) {
      const ranking = rankingMap.get(result.teamId);
      if (ranking) {
        result.rank = ranking.rank;
        result.epsRank = ranking.epsRank;
        result.marketShareRank = ranking.shareRank;
      }
    }

    // Step 5: Generate next market state (with context for deterministic fluctuations)
    const newMarketState = MarketSimulator.generateNextMarketState(marketState, events, marketCtx);

    summaryMessages.push(`Round ${roundNumber} complete. Leader: Team ${rankings[0]?.teamId}`);

    // Generate final state hashes for audit trail
    const finalStateHashes: Record<string, string> = {};
    for (const result of results) {
      finalStateHashes[result.teamId] = hashState(result.newState);
    }

    return {
      roundNumber,
      results,
      newMarketState,
      rankings,
      summaryMessages,
      auditTrail: {
        seedBundle,
        finalStateHashes,
        engineVersion: CURRENT_ENGINE_VERSION.engineVersion,
        schemaVersion: CURRENT_ENGINE_VERSION.schemaVersion,
      },
    };
  }

  /**
   * Calculate total costs for a team
   */
  private static calculateTotalCosts(
    state: TeamState,
    moduleResults: {
      factory: ModuleResult;
      hr: ModuleResult;
      finance: ModuleResult;
      marketing: ModuleResult;
      rd: ModuleResult;
    }
  ): number {
    return (
      moduleResults.factory.costs +
      moduleResults.hr.costs +
      moduleResults.finance.costs +
      moduleResults.marketing.costs +
      moduleResults.rd.costs
    );
  }

  /**
   * Apply events to a team's state
   */
  private static applyEvents(
    state: TeamState,
    teamId: string,
    events: NonNullable<SimulationInput["events"]>
  ): TeamState {
    const newState = cloneTeamState(state);

    for (const event of events) {
      // Check if event targets this team
      if (event.targetTeams !== "all" && !event.targetTeams.includes(teamId)) {
        continue;
      }

      // Apply effects
      for (const effect of event.effects) {
        switch (effect.target) {
          case "efficiency":
            for (const factory of newState.factories) {
              factory.efficiency *= (1 + effect.modifier);
              factory.efficiency = Math.max(0.1, Math.min(1, factory.efficiency));
            }
            break;
          case "morale":
            for (const employee of newState.employees) {
              employee.morale *= (1 + effect.modifier);
              employee.morale = Math.max(0, Math.min(100, employee.morale));
            }
            break;
          case "brandValue":
            newState.brandValue *= (1 + effect.modifier);
            newState.brandValue = Math.max(0, Math.min(1, newState.brandValue));
            break;
          case "cash":
            newState.cash *= (1 + effect.modifier);
            break;
          case "esgScore":
            newState.esgScore += effect.modifier;
            newState.esgScore = Math.max(0, newState.esgScore);
            break;
        }
      }
    }

    return newState;
  }

  /**
   * Generate summary of competitor actions
   */
  private static generateCompetitorSummary(
    teams: Array<{ id: string; state: TeamState; moduleResults: { factory: ModuleResult; hr: ModuleResult; finance: ModuleResult; marketing: ModuleResult; rd: ModuleResult } }>,
    currentTeamId: string
  ): string[] {
    const summary: string[] = [];

    for (const team of teams) {
      if (team.id === currentTeamId) continue;

      // Summarize notable actions (without revealing specific numbers)
      const factory = team.moduleResults.factory;
      const marketing = team.moduleResults.marketing;
      const rd = team.moduleResults.rd;

      if ((factory.changes as Record<string, unknown>).newFactoriesBuilt) {
        summary.push(`A competitor expanded their manufacturing capacity`);
      }
      if ((marketing.changes as Record<string, unknown>).brandValueChange as number > 0.05) {
        summary.push(`A competitor invested heavily in branding`);
      }
      if ((rd.changes as Record<string, unknown>).newProductsStarted) {
        summary.push(`A competitor is developing new products`);
      }
    }

    if (summary.length === 0) {
      summary.push("Competitors maintained steady operations");
    }

    return summary;
  }

  /**
   * Validate team decisions before processing
   */
  static validateDecisions(
    state: TeamState,
    decisions: AllDecisions
  ): { valid: boolean; errors: string[]; correctedDecisions: AllDecisions } {
    const errors: string[] = [];
    const correctedDecisions = cloneDecisions(decisions);

    // Check cash constraints
    let projectedCash = state.cash;

    // Factory costs
    if (decisions.factory?.newFactories) {
      const factoryCost = decisions.factory.newFactories.length * CONSTANTS.NEW_FACTORY_COST;
      if (factoryCost > projectedCash) {
        errors.push("Insufficient funds for new factories");
        correctedDecisions.factory!.newFactories = [];
      } else {
        projectedCash -= factoryCost;
      }
    }

    // HR costs (hiring)
    if (decisions.hr?.hires) {
      const estimatedHiringCost = decisions.hr.hires.length * 10000; // Rough estimate
      if (estimatedHiringCost > projectedCash) {
        errors.push("Insufficient funds for all planned hires");
        correctedDecisions.hr!.hires = decisions.hr.hires.slice(0, Math.floor(projectedCash / 10000));
      }
    }

    // Validate finance decisions
    if (decisions.finance?.sharesBuyback) {
      if (decisions.finance.sharesBuyback > projectedCash) {
        errors.push("Insufficient funds for share buyback");
        correctedDecisions.finance!.sharesBuyback = 0;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      correctedDecisions,
    };
  }

  /**
   * Initialize a new team state with default values
   *
   * @param config - Optional partial TeamState overrides (e.g. custom starting cash)
   * @param presetConfig - Optional preset configuration for different game modes:
   *   - workers/engineers/supervisors: Starting headcount (0 for clean-slate)
   *   - includeProducts: Whether to include starter products (false for clean-slate)
   *   - brandValue: Starting brand value (0 for clean-slate, 0.5 for pre-built)
   */
  static createInitialTeamState(
    config?: Partial<TeamState>,
    presetConfig?: {
      workers?: number;
      engineers?: number;
      supervisors?: number;
      includeProducts?: boolean;
      brandValue?: number;
    },
  ): TeamState {
    const workers = presetConfig?.workers ?? 50;
    const engineers = presetConfig?.engineers ?? 8;
    const supervisors = presetConfig?.supervisors ?? 5;
    const includeProducts = presetConfig?.includeProducts ?? true;
    const brandVal = presetConfig?.brandValue ?? 0.5;

    const defaultFactory = FactoryModule.createNewFactory("Main Factory", "North America", 0);
    defaultFactory.workers = workers;
    defaultFactory.supervisors = supervisors;
    defaultFactory.engineers = engineers;

    // Add initial production line only if we have workers
    defaultFactory.productionLines = workers > 0 ? [{
      id: "line-1",
      segment: "General",
      productId: "initial-product",
      capacity: 50000,  // 50K units per round
      efficiency: 0.7,
    }] : [];

    // Create initial products for each segment so teams can compete in all markets
    // All start as "launched" since they're starter products
    const initialProducts = [
      {
        id: "initial-product",
        name: "Standard Phone",
        segment: "General" as const,
        price: 450,
        quality: 65,
        features: 50,
        reliability: 70,
        developmentRound: 0,
        developmentStatus: "launched" as const,
        developmentProgress: 100,
        targetQuality: 65,
        targetFeatures: 50,
        roundsRemaining: 0,
        unitCost: CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["General"] + CONSTANTS.LABOR_COST_PER_UNIT + CONSTANTS.OVERHEAD_COST_PER_UNIT,
      },
      {
        id: "budget-product",
        name: "Budget Phone",
        segment: "Budget" as const,
        price: 200,
        quality: 50,
        features: 30,
        reliability: 60,
        developmentRound: 0,
        developmentStatus: "launched" as const,
        developmentProgress: 100,
        targetQuality: 50,
        targetFeatures: 30,
        roundsRemaining: 0,
        unitCost: CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["Budget"] + CONSTANTS.LABOR_COST_PER_UNIT + CONSTANTS.OVERHEAD_COST_PER_UNIT,
      },
      {
        id: "enthusiast-product",
        name: "Pro Phone",
        segment: "Enthusiast" as const,
        price: 800,
        quality: 80,
        features: 70,
        reliability: 75,
        developmentRound: 0,
        developmentStatus: "launched" as const,
        developmentProgress: 100,
        targetQuality: 80,
        targetFeatures: 70,
        roundsRemaining: 0,
        unitCost: CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["Enthusiast"] + CONSTANTS.LABOR_COST_PER_UNIT + CONSTANTS.OVERHEAD_COST_PER_UNIT,
      },
      {
        id: "professional-product",
        name: "Enterprise Phone",
        segment: "Professional" as const,
        price: 1250,
        quality: 90,
        features: 85,
        reliability: 90,
        developmentRound: 0,
        developmentStatus: "launched" as const,
        developmentProgress: 100,
        targetQuality: 90,
        targetFeatures: 85,
        roundsRemaining: 0,
        unitCost: CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["Professional"] + CONSTANTS.LABOR_COST_PER_UNIT + CONSTANTS.OVERHEAD_COST_PER_UNIT,
      },
      {
        id: "active-product",
        name: "Active Phone",
        segment: "Active Lifestyle" as const,
        price: 600,
        quality: 70,
        features: 60,
        reliability: 80,
        developmentRound: 0,
        developmentStatus: "launched" as const,
        developmentProgress: 100,
        targetQuality: 70,
        targetFeatures: 60,
        roundsRemaining: 0,
        unitCost: CONSTANTS.RAW_MATERIAL_COST_PER_UNIT["Active Lifestyle"] + CONSTANTS.LABOR_COST_PER_UNIT + CONSTANTS.OVERHEAD_COST_PER_UNIT,
      },
    ];

    // Default benefits package
    const defaultBenefits = {
      package: {
        healthInsurance: 50,
        retirementMatch: 30,
        paidTimeOff: 15,
        parentalLeave: 6,
        stockOptions: false,
        flexibleWork: false,
        professionalDevelopment: 1000,
      },
      totalAnnualCost: 0,
      moraleImpact: 0,
      turnoverReduction: 0,
      esgContribution: 0,
    };

    // Initialize empty inventory
    const emptyInventory = {
      finishedGoods: {
        "Budget": 0,
        "General": 0,
        "Enthusiast": 0,
        "Professional": 0,
        "Active Lifestyle": 0,
      } as Record<string, number>,
      rawMaterials: CONSTANTS.DEFAULT_RAW_MATERIALS,
      workInProgress: 0,
    };

    // Generate initial employees matching factory workforce
    const initialEmployees: Employee[] = [];
    const factoryId = defaultFactory.id;

    const createInitialEmployee = (role: EmployeeRole, index: number): Employee => {
      const baseStats: EmployeeStats = {
        efficiency: 65, accuracy: 65, speed: 65, stamina: 65,
        discipline: 65, loyalty: 65, teamCompatibility: 65, health: 65,
      };
      let stats: EmployeeStats | EngineerStats | SupervisorStats = baseStats;
      if (role === "engineer") {
        stats = { ...baseStats, innovation: 65, problemSolving: 65 };
      } else if (role === "supervisor") {
        stats = { ...baseStats, leadership: 65, tacticalPlanning: 65 };
      }
      // Salary with avgStat=65: multiplier = 0.8 + 0.65 * 1.4 = 1.71
      const baseSalaries: Record<EmployeeRole, number> = { worker: 45_000, engineer: 85_000, supervisor: 75_000 };
      const multiplier = CONSTANTS.SALARY_MULTIPLIER_MIN +
        (65 / 100) * (CONSTANTS.SALARY_MULTIPLIER_MAX - CONSTANTS.SALARY_MULTIPLIER_MIN);
      const salary = Math.min(CONSTANTS.MAX_SALARY, Math.round(baseSalaries[role] * multiplier));

      return {
        id: `initial-${role}-${index}`,
        role,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} ${index + 1}`,
        stats,
        salary,
        hiredRound: 0,
        factoryId,
        morale: 75,
        burnout: 0,
        trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
      };
    };

    for (let i = 0; i < workers; i++) initialEmployees.push(createInitialEmployee("worker", i));
    for (let i = 0; i < engineers; i++) initialEmployees.push(createInitialEmployee("engineer", i));
    for (let i = 0; i < supervisors; i++) initialEmployees.push(createInitialEmployee("supervisor", i));

    const startingCash = config?.cash ?? CONSTANTS.DEFAULT_STARTING_CASH;

    return {
      // State versioning for compatibility checks
      version: CURRENT_ENGINE_VERSION,

      cash: startingCash,
      revenue: 0,
      netIncome: 0,
      totalAssets: startingCash + CONSTANTS.NEW_FACTORY_COST,
      totalLiabilities: 0,
      shortTermDebt: 0,      // PATCH 1: Treasury bills, credit lines, short-term loans
      longTermDebt: 0,       // PATCH 1: Corporate bonds, long-term bank loans
      shareholdersEquity: startingCash + CONSTANTS.NEW_FACTORY_COST,
      marketCap: CONSTANTS.DEFAULT_MARKET_CAP,
      sharesIssued: CONSTANTS.DEFAULT_SHARES_ISSUED,
      sharePrice: 50,
      eps: 0,
      inventory: emptyInventory,
      cogs: 0,
      accountsReceivable: 0,
      accountsPayable: 0,
      // Initialize materials & supply chain state
      materials: {
        inventory: [],
        activeOrders: [],
        totalInventoryValue: 0,
        holdingCosts: 0,
        region: "North America" as const,
      },
      // Initialize tariff state
      tariffs: TariffEngine.initializeTariffState(),
      factories: [defaultFactory],
      products: config?.products ?? (includeProducts ? initialProducts : []),
      employees: initialEmployees,
      workforce: {
        totalHeadcount: workers + engineers + supervisors,
        averageMorale: (workers + engineers + supervisors) > 0 ? 75 : 0,
        averageEfficiency: (workers + engineers + supervisors) > 0 ? 70 : 0,
        laborCost: (workers + engineers + supervisors) > 0 ? CONSTANTS.DEFAULT_LABOR_COST : 0,
        turnoverRate: (workers + engineers + supervisors) > 0 ? CONSTANTS.BASE_TURNOVER_RATE : 0,
      },
      brandValue: brandVal,
      marketShare: {} as Record<string, number>,
      rdBudget: 0,
      rdProgress: 0,
      patents: 0,
      esgScore: 100,
      co2Emissions: 1000,
      benefits: defaultBenefits,
    };
  }

  /**
   * Create initial market state for a new game
   */
  static createInitialMarketState(): MarketState {
    return {
      roundNumber: 1,
      economicConditions: {
        gdp: 2.5,
        inflation: 2.0,
        consumerConfidence: 75,
        unemploymentRate: 4.5,
      },
      fxRates: {
        "EUR/USD": 1.10,
        "GBP/USD": 1.27,
        "JPY/USD": 0.0067,
        "CNY/USD": 0.14,
      },
      fxVolatility: 0.15,
      interestRates: {
        federalRate: 5.0,
        tenYearBond: 4.5,
        corporateBond: 6.0,
      },
      demandBySegment: {
        Budget: { totalDemand: 500000, priceRange: { min: 100, max: 300 }, growthRate: 0.02 },
        General: { totalDemand: 400000, priceRange: { min: 300, max: 600 }, growthRate: 0.03 },
        Enthusiast: { totalDemand: 200000, priceRange: { min: 600, max: 1000 }, growthRate: 0.04 },
        Professional: { totalDemand: 100000, priceRange: { min: 1000, max: 1500 }, growthRate: 0.02 },
        "Active Lifestyle": { totalDemand: 150000, priceRange: { min: 400, max: 800 }, growthRate: 0.05 },
      },
      marketPressures: {
        priceCompetition: 0.5,
        qualityExpectations: 0.6,
        sustainabilityPremium: 0.3,
      },
    };
  }

  /**
   * Generate a summary report for a round
   */
  static generateRoundReport(result: RoundResults): string {
    const lines: string[] = [];

    lines.push(`=== Round ${result.roundNumber} Results ===`);
    lines.push(`Overall Rank: ${result.rank}`);
    lines.push("");
    lines.push("Financial Performance:");
    lines.push(`  Revenue: $${(result.totalRevenue / 1_000_000).toFixed(1)}M`);
    lines.push(`  Costs: $${(result.totalCosts / 1_000_000).toFixed(1)}M`);
    lines.push(`  Net Income: $${(result.netIncome / 1_000_000).toFixed(1)}M`);
    lines.push(`  EPS: $${result.newState.eps.toFixed(2)} (Rank: ${result.epsRank})`);
    lines.push("");
    lines.push("Market Position:");
    for (const [segment, share] of Object.entries(result.marketShareBySegment)) {
      if (share > 0) {
        lines.push(`  ${segment}: ${(share * 100).toFixed(1)}% share`);
      }
    }
    lines.push("");
    lines.push("Module Summaries:");
    lines.push(`  Factory: ${result.factoryResults.messages.join(", ") || "No changes"}`);
    lines.push(`  HR: ${result.hrResults.messages.join(", ") || "No changes"}`);
    lines.push(`  Finance: ${result.financeResults.messages.join(", ") || "No changes"}`);
    lines.push(`  Marketing: ${result.marketingResults.messages.join(", ") || "No changes"}`);
    lines.push(`  R&D: ${result.rdResults.messages.join(", ") || "No changes"}`);

    return lines.join("\n");
  }
}
