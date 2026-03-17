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
  FACTORY_TIERS,
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
import { MarketSimulator, type TeamMarketPosition } from "../market/MarketSimulator";
import { cloneTeamState, cloneDecisions } from "../utils/stateUtils";
import { safeNumber } from "../utils";
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
import { FXEngine } from "../fx/FXEngine";
import { updateESGSubscores, calculateESGBonuses } from "../modules/ESGSubscoreCalculator";
import { calculateStorageCosts, ensureWarehouseState } from "../modules/WarehouseManager";
import { EconomyEngine } from "../economy/EconomyEngine";
import { CashEnforcement } from "../finance/CashEnforcement";
import { AchievementEngine } from "../modules/AchievementEngine";
import type { AchievementCheckContext } from "../modules/AchievementEngine";
import { FacilitatorReportEngine } from "../modules/FacilitatorReportEngine";

// Phase 1: Feature modules
import { ExperienceCurveEngine } from "../experience/ExperienceCurve";
import { EventEngine } from "../events/EventEngine";
import { CompetitiveIntelligenceEngine } from "../intelligence/CompetitiveIntelligence";

// Phase 5: Expansion modules
import { FactoryExpansions } from "../modules/FactoryExpansions";
import { HRExpansions } from "../modules/HRExpansions";
import { RDExpansions } from "../modules/RDExpansions";
import { MarketingExpansions } from "../modules/MarketingExpansions";
import { FinanceExpansions } from "../modules/FinanceExpansions";

// Phase 2: Economic Cycle
import { EconomicCycleEngine } from "../economy/EconomicCycle";

// Config
import { loadConfig } from "../config/loader";
import type { EngineConfig } from "../config/schema";

export interface TeamInput {
  id: string;
  state: TeamState;
  decisions: AllDecisions;
}

export interface SimulationInput {
  roundNumber: number;
  teams: TeamInput[];
  marketState: MarketState;
  /** Engine configuration — controls feature gates, difficulty, etc. */
  config?: EngineConfig;
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
  /** Market positions per team per segment from MarketSimulator */
  marketPositions: TeamMarketPosition[];
  /** Facilitator brief for this round (narrative summary for game facilitators) */
  facilitatorBrief?: import("../types/facilitator").FacilitatorBrief;
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
    const config = input.config ?? loadConfig();
    const results: RoundResults[] = [];
    const summaryMessages: string[] = [];

    // Generate seed bundle for audit trail (use provided seed or generate one)
    const effectiveSeed = matchSeed || `auto-${Date.now()}`;
    const seedBundle = deriveSeedBundle(effectiveSeed, roundNumber);

    summaryMessages.push(`=== Processing Round ${roundNumber} ===`);
    summaryMessages.push(`Seed: ${seedBundle.matchSeed}, Round seed: ${seedBundle.roundSeed}`);

    // Step 0 (v6.0.0): Calculate rubber-banding factors from previous round's market shares
    // INTEG-01: Uses input states (previous round end-state) — NOT post-processing states
    // Must happen BEFORE module processing so brand decay (Marketing) and hiring costs (HR) use them
    const rbFactors = MarketSimulator.calculateRubberBandingFactors(
      teams.map(t => ({ id: t.id, state: t.state })),
      roundNumber
    );
    const rbActive = Object.values(rbFactors).some(f =>
      f.costReliefFactor > 0 || f.perceptionBonus > 0 || f.brandDecayMultiplier > 1.0
    );
    if (rbActive) {
      summaryMessages.push("Rubber-banding factors calculated (continuous system active).");
    }

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

      // v6.0.0: Store rubber-banding factors on state for use by modules
      currentState.rubberBanding = rbFactors[team.id] || {
        position: 0, costReliefFactor: 0, perceptionBonus: 0,
        brandDecayMultiplier: 1.0, qualityExpectationBoost: 0,
      };

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

      // Wire: FactoryModule.calculateStaffingPenalty() — apply as workforce efficiency drag
      // Does NOT mutate factory.efficiency (which reflects capital investment)
      let totalStaffingPenalty = 0;
      for (const factory of currentState.factories) {
        const actualStaff = {
          workers: factory.workers,
          engineers: factory.engineers || 0,
          supervisors: factory.supervisors || 0,
        };
        totalStaffingPenalty += FactoryModule.calculateStaffingPenalty(factory, actualStaff);
      }
      if (totalStaffingPenalty > 0 && currentState.factories.length > 0) {
        const avgPenalty = totalStaffingPenalty / currentState.factories.length;
        currentState.workforce.averageEfficiency = Math.max(10,
          currentState.workforce.averageEfficiency * (1 - avgPenalty)
        );
      }

      // FIX-016: Recalculate unit costs after FactoryModule so automation/TQM/efficiency
      // reductions are reflected in product costs before market simulation
      for (const product of currentState.products) {
        if (product.developmentStatus === "launched") {
          product.unitCost = EconomyEngine.calculateUnitCost(product, currentState, config);
        }
      }

      // Phase 1A: Experience Curve — learning curves reduce production costs
      {
        const productionThisRound: Record<string, number> = {} as Record<string, number>;
        for (const product of currentState.products) {
          const seg = product.segment;
          productionThisRound[seg] = (productionThisRound[seg] ?? 0) +
            ((product as unknown as Record<string, unknown>).unitsSold as number ?? 0);
        }
        const expResult = ExperienceCurveEngine.calculateExperienceCurve(
          currentState,
          currentState.experienceCurve ?? null,
          productionThisRound as Record<import("../types/factory").Segment, number>,
          config
        );
        // Apply cost multipliers to products
        for (const product of currentState.products) {
          const mult = expResult.costMultipliers[product.segment as import("../types/factory").Segment];
          if (mult !== undefined && mult < 1) {
            product.unitCost = safeNumber(product.unitCost * mult);
          }
        }
        currentState.experienceCurve = expResult.state;
        if (expResult.messages.length > 0) {
          summaryMessages.push(...expResult.messages.map(m => `  ${team.id}: ${m}`));
        }
      }

      // Phase 5A: Factory Expansions — maintenance, burnout, breakdowns
      for (const factory of currentState.factories) {
        try {
          const totalUnits = currentState.products.reduce((sum, p) => {
            return sum + ((p as unknown as Record<string, unknown>).unitsSold as number ?? 0);
          }, 0);
          const healthResult = FactoryExpansions.processFactoryHealth(
            factory,
            currentState,
            decisions.maintenance ?? { preventiveMaintenance: 0, emergencyReserve: 0, upgradeInvestment: 0, majorServiceScheduled: false },
            currentState.factoryUtilization?.[factory.id] ?? null,
            currentState.factoryMaintenance?.[factory.id] ?? null,
            (currentState.factoryBreakdowns ?? []).filter(b => b.factoryId === factory.id),
            totalUnits,
            config,
            ctx
          );
          // Store results
          currentState.factoryUtilization = { ...currentState.factoryUtilization, [factory.id]: healthResult.utilization };
          currentState.factoryMaintenance = { ...currentState.factoryMaintenance, [factory.id]: healthResult.maintenance };
          currentState.factoryBreakdowns = [
            ...(currentState.factoryBreakdowns ?? []).filter(b => b.factoryId !== factory.id),
            ...healthResult.activeBreakdowns,
          ];
          // Apply cost impact
          if (healthResult.costImpact > 0) {
            currentState.cash = safeNumber(currentState.cash - healthResult.costImpact);
          }
          if (healthResult.messages.length > 0) {
            summaryMessages.push(...healthResult.messages.map(m => `  ${team.id}: ${m}`));
          }
        } catch {
          // FactoryExpansions graceful degradation — skip if module errors
        }
      }

      // Process HR Module (with context for deterministic hiring/turnover)
      const hrResult = HRModule.process(currentState, decisions.hr || {}, ctx);
      currentState = hrResult.newState;

      // Phase 5B: HR Expansions — career paths, team dynamics, ramp-up
      try {
        const hrExpResult = HRExpansions.processHRExpansions(
          currentState,
          decisions.hrExpansion ?? { hiringBudget: 0, recruitmentFocus: null, trainingPrograms: [], promotionDecisions: [], retentionBonuses: [], teamBuildingInvestment: 0 },
          currentState.teamDynamics ?? null,
          currentState.hiringPipeline ?? null,
          roundNumber,
          config,
          ctx
        );
        currentState.teamDynamics = hrExpResult.teamDynamics;
        currentState.hiringPipeline = hrExpResult.hiringPipeline;
        // Apply productivity and R&D multipliers
        if (hrExpResult.productivityMultiplier !== 1.0) {
          currentState.workforce.averageEfficiency = safeNumber(
            currentState.workforce.averageEfficiency * hrExpResult.productivityMultiplier
          );
        }
        if (hrExpResult.messages.length > 0) {
          summaryMessages.push(...hrExpResult.messages.map(m => `  ${team.id}: ${m}`));
        }
      } catch {
        // HRExpansions graceful degradation
      }

      // Process R&D Module (with context for deterministic product IDs)
      const rdResult = RDModule.process(currentState, decisions.rd || {}, ctx);
      currentState = rdResult.newState;

      // Phase 5C: R&D Expansions — 54-node tech tree, platforms, spillovers
      try {
        const rdExpResult = RDExpansions.processRDExpansions(
          currentState,
          decisions.rdExpansion ?? { newResearchProjects: [], platformInvestment: 0, newPlatformSegments: [], riskTolerance: "moderate" },
          currentState.techTree ?? null,
          currentState.rdPlatforms ?? null,
          roundNumber,
          config,
          ctx
        );
        currentState.techTree = rdExpResult.techTree;
        currentState.rdPlatforms = rdExpResult.platforms;
        // Apply quality bonuses from tech tree to products
        for (const product of currentState.products) {
          const segBonus = rdExpResult.qualityBonusBySegment[product.segment as import("../types/factory").Segment];
          if (segBonus && segBonus > 0) {
            product.quality = Math.min(100, product.quality + segBonus);
          }
        }
        if (rdExpResult.messages.length > 0) {
          summaryMessages.push(...rdExpResult.messages.map(m => `  ${team.id}: ${m}`));
        }
      } catch {
        // RDExpansions graceful degradation
      }

      // Process Marketing Module (no randomness currently)
      const marketingResult = MarketingModule.process(
        currentState,
        decisions.marketing || {}
      );
      currentState = marketingResult.newState;

      // Phase 5D: Marketing Expansions — performance/brand split, channels
      try {
        const mktExpResult = MarketingExpansions.processMarketingExpansions(
          currentState,
          decisions.marketingExpansion ?? { performanceBudget: {} as Record<string, number>, brandBudget: {} as Record<string, number>, channelAllocation: {} as Record<string, number>, promotions: [] },
          currentState.performanceMarketing ?? null,
          currentState.brandMarketing ?? null,
          currentState.activeCompetitorActions ?? [],
          roundNumber,
          config,
          ctx
        );
        currentState.performanceMarketing = mktExpResult.performance;
        currentState.brandMarketing = mktExpResult.brand;
        currentState.channelMix = mktExpResult.channelMix;
        currentState.activeCompetitorActions = mktExpResult.competitorActions;
        // Apply brand impact
        if (mktExpResult.totalBrandImpact !== 0) {
          currentState.brandValue = Math.max(0, Math.min(1,
            currentState.brandValue + mktExpResult.totalBrandImpact
          ));
        }
        if (mktExpResult.messages.length > 0) {
          summaryMessages.push(...mktExpResult.messages.map(m => `  ${team.id}: ${m}`));
        }
      } catch {
        // MarketingExpansions graceful degradation
      }

      // Process Finance Module (needs market state for interest rates, ctx for board votes)
      const financeResult = FinanceModule.process(
        currentState,
        decisions.finance || {},
        marketState,
        ctx
      );
      currentState = financeResult.newState;

      // Phase 5E: Finance Expansions — debt covenants, credit ratings, investor sentiment
      try {
        const finExpResult = FinanceExpansions.processFinanceExpansions(
          currentState,
          decisions.financeExpansion ?? { newDebt: [], debtRepayments: [], creditLineDrawdown: 0, dividendAmount: 0, stockBuybackAmount: 0 },
          currentState.debtState ?? null,
          currentState.creditRating ?? null,
          currentState.investorSentimentState ?? null,
          roundNumber,
          config,
          ctx
        );
        currentState.debtState = finExpResult.debt;
        currentState.creditRating = finExpResult.creditRating;
        currentState.investorSentimentState = finExpResult.investorSentiment;
        // Apply interest expense
        if (finExpResult.interestExpense > 0) {
          currentState.cash = safeNumber(currentState.cash - finExpResult.interestExpense);
        }
        if (finExpResult.messages.length > 0) {
          summaryMessages.push(...finExpResult.messages.map(m => `  ${team.id}: ${m}`));
        }
      } catch {
        // FinanceExpansions graceful degradation
      }

      // Phase 1B: EventEngine — replaces legacy applyEvents stub
      // Handles 30+ event templates with triggers, player choices, crisis levels
      {
        const eventResult = EventEngine.processEvents(
          currentState,
          currentState.eventState ?? null,
          roundNumber,
          config,
          ctx
        );
        // Apply event effects to state
        const fx = eventResult.totalEffects;
        if (fx.cashChange !== 0) {
          currentState.cash = safeNumber(currentState.cash + fx.cashChange);
        }
        if (fx.brandModifier !== 0) {
          currentState.brandValue = Math.max(0, Math.min(1, currentState.brandValue + fx.brandModifier));
        }
        // Revenue and cost modifiers are applied during market sim (stored for use)
        currentState.eventState = eventResult.state;
        if (eventResult.messages.length > 0) {
          summaryMessages.push(...eventResult.messages.map(m => `  ${team.id}: ${m}`));
        }
      }

      // Legacy events passthrough (for backward-compatible SimulationInput.events)
      if (events) {
        currentState = this.applyEvents(currentState, team.id, events);
      }

      // Step 1.5: Cash enforcement — auto-fund if below floor
      const cashFloor = CashEnforcement.getCashFloor(currentState);
      if (currentState.cash < cashFloor) {
        const funding = CashEnforcement.enforce(currentState, marketState, ctx);
        if (funding) {
          if (funding.messages.length > 0) {
            summaryMessages.push(...funding.messages.map(m => `  ${team.id}: ${m}`));
          }
          // Add auto-funding costs to finance result for reporting
          financeResult.result.messages.push(...funding.messages);
        }
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
      {},
      marketCtx
    );

    if (marketResult.rubberBandingApplied) {
      summaryMessages.push("Rubber-banding mechanisms active this round.");
    }

    // Phase 1C: Competitive Intelligence — gather signals, update competitor profiles
    for (const team of processedTeams) {
      try {
        const decisions = teams.find(t => t.id === team.id)?.decisions ?? {};
        const intelResult = CompetitiveIntelligenceEngine.gatherIntelligence(
          team.state.intelligenceState ?? null,
          decisions.intelligence ?? { budget: 0, focusAreas: [], competitorFocus: [] },
          roundNumber,
          config,
          team.ctx
        );
        team.state.intelligenceState = intelResult.state;
        if (intelResult.messages.length > 0) {
          summaryMessages.push(...intelResult.messages.map(m => `  ${team.id}: ${m}`));
        }
      } catch {
        // CompetitiveIntelligence graceful degradation
      }
    }

    // Step 3: Update team states with market results and generate final results
    for (const team of processedTeams) {
      const teamMarketShares = marketResult.marketShares[team.id];
      const teamSales = marketResult.salesByTeam[team.id];
      const teamRevenue = marketResult.revenueByTeam[team.id];

      // Update state with market results
      team.state.marketShare = teamMarketShares;
      team.state.revenue = teamRevenue;

      // INTEG-02: Sync products' unitsSold from market results (cappedUnits)
      // Must happen BEFORE COGS calculation so we use actual sold quantities
      for (const product of team.state.products || []) {
        const segmentSales = teamSales[product.segment as keyof typeof teamSales];
        if (segmentSales !== undefined) {
          (product as unknown as Record<string, unknown>).unitsSold = segmentSales;
        }
      }

      // v5.1.0 Audit F-08: Compute actual COGS from unitCost × unitsSold
      // v6.0.0: Rubber-banding Mechanism A — trailing teams get reduced COGS
      const cogsCostRelief = team.state.rubberBanding?.costReliefFactor ?? 0;
      team.state.cogs = safeNumber((team.state.products || []).reduce((sum, p) => {
        return sum + (((p as unknown as Record<string, unknown>).unitsSold as number || 0) * (p.unitCost || 0));
      }, 0) * (1 - cogsCostRelief));

      // FIX-032: Deduct warranty costs (calculated by MarketSimulator from defect rates)
      const teamWarrantyCost = marketResult.positions
        .filter(p => p.teamId === team.id)
        .reduce((sum, p) => sum + (p.warrantyCost || 0), 0);
      if (teamWarrantyCost > 0) {
        team.state.cash = safeNumber(team.state.cash - teamWarrantyCost);
        team.state.cogs = safeNumber(team.state.cogs + teamWarrantyCost); // Include in COGS
      }

      // FX impact on costs: materials from foreign regions and factory labor
      // Material costs are adjusted per-product based on segment material source regions
      let fxCostImpact = 0;
      for (const product of team.state.products || []) {
        const segmentMaterials = MaterialEngine.SEGMENT_MATERIAL_REQUIREMENTS[product.segment as keyof typeof MaterialEngine.SEGMENT_MATERIAL_REQUIREMENTS];
        if (segmentMaterials) {
          const unitsSold = ((product as unknown as Record<string, unknown>).unitsSold as number) || 0;
          if (unitsSold > 0) {
            // Build per-material FX-adjusted cost
            for (const mat of segmentMaterials.materials) {
              const baseCost = mat.costPerUnit * unitsSold;
              const fxAdjusted = FXEngine.adjustCost(baseCost, mat.source, marketState);
              fxCostImpact += fxAdjusted - baseCost;
            }
          }
        }
      }

      // Factory labor FX: workers in foreign regions paid in local currency
      for (const factory of team.state.factories) {
        if (factory.region !== "North America") {
          const factoryLabor = factory.workers * 45_000 / 12; // Monthly labor cost estimate
          const { fxImpact: laborFX } = FXEngine.calculateFactoryFXImpact(
            factory.region, factoryLabor, marketState
          );
          fxCostImpact += laborFX;
        }
      }

      // Apply FX cost impact to COGS and cash
      if (fxCostImpact !== 0) {
        team.state.cogs = safeNumber(team.state.cogs + fxCostImpact);
        team.state.cash = safeNumber(team.state.cash - fxCostImpact);
        if (Math.abs(fxCostImpact) > 100_000) {
          const direction = fxCostImpact > 0 ? "increased" : "decreased";
          summaryMessages.push(
            `  ${team.id}: FX ${direction} costs by $${(Math.abs(fxCostImpact) / 1_000_000).toFixed(2)}M`
          );
        }
      }

      // Add revenue to cash — modules already deducted their costs from cash,
      // so adding revenue ensures cash accumulates correctly across rounds
      team.state.cash = safeNumber(team.state.cash + teamRevenue);

      // FIX-015: Deduct COGS from cash — variable production costs for goods sold
      team.state.cash = safeNumber(team.state.cash - team.state.cogs);

      // Calculate costs (for net income reporting only — already deducted from cash by modules)
      const totalCosts = this.calculateTotalCosts(team.state, team.moduleResults);

      // Calculate net income (revenue minus COGS minus operating expenses)
      const pretaxIncome = teamRevenue - team.state.cogs - totalCosts;

      // FIX-031: Deduct corporate taxes from positive income (21% federal + 5% state)
      const TAX_RATE = 0.26;
      const taxExpense = pretaxIncome > 0 ? safeNumber(pretaxIncome * TAX_RATE) : 0;
      team.state.cash = safeNumber(team.state.cash - taxExpense);
      team.state.netIncome = safeNumber(pretaxIncome - taxExpense);

      // Update EPS
      team.state.eps = safeNumber(team.state.sharesIssued > 0
        ? team.state.netIncome / team.state.sharesIssued
        : 0);

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

      // VAL-02: Guard all critical financial state writes against NaN/Infinity
      // Update total assets
      // F0 FIX: Use actual balance sheet totalAssets instead of hardcoded approximation
      const balanceSheetAssets = (team.state as Record<string, unknown>).financialStatements &&
        ((team.state as Record<string, unknown>).financialStatements as Record<string, unknown>)?.balanceSheet &&
        (((team.state as Record<string, unknown>).financialStatements as Record<string, unknown>)?.balanceSheet as Record<string, unknown>)?.assets &&
        ((((team.state as Record<string, unknown>).financialStatements as Record<string, unknown>)?.balanceSheet as Record<string, unknown>)?.assets as Record<string, unknown>)?.total as number | undefined;
      const factoryAssetValue = team.state.factories.reduce((sum, f) => {
        const tierCost = FACTORY_TIERS[f.tier || "medium"]?.cost ?? CONSTANTS.NEW_FACTORY_COST;
        return sum + tierCost;
      }, 0);
      team.state.totalAssets = safeNumber(
        (balanceSheetAssets && Number.isFinite(balanceSheetAssets) && balanceSheetAssets > 0)
          ? balanceSheetAssets
          : team.state.cash + factoryAssetValue
      );

      // Update shareholders equity
      team.state.shareholdersEquity = safeNumber(team.state.totalAssets - team.state.totalLiabilities);

      // Wire: FinanceModule.calculateInvestorSentiment() — replaces hardcoded 50
      const investorSentiment = FinanceModule.calculateInvestorSentiment(team.state);

      // Update market cap
      team.state.marketCap = safeNumber(FinanceModule.updateMarketCap(
        team.state,
        0, // EPS growth (would need previous state)
        investorSentiment
      ));

      // Update share price
      team.state.sharePrice = safeNumber(team.state.sharesIssued > 0
        ? team.state.marketCap / team.state.sharesIssued
        : 0);

      // Step 3.5: Second cash enforcement — after revenue, COGS, and FX are applied
      // The first checkpoint (Step 1.5) catches pre-revenue shortfalls.
      // This one catches cases where COGS + FX costs exceed revenue.
      const postRevenueCashFloor = CashEnforcement.getCashFloor(team.state);
      if (team.state.cash < postRevenueCashFloor) {
        const postFunding = CashEnforcement.enforce(team.state, marketState, team.ctx);
        if (postFunding && postFunding.messages.length > 0) {
          summaryMessages.push(...postFunding.messages.map(m => `  ${team.id}: ${m}`));
          team.moduleResults.finance.messages.push(...postFunding.messages);
        }
        // F0 FIX: Re-sync using balance sheet total if available
        const bsTotal = balanceSheetAssets;
        if (bsTotal && Number.isFinite(bsTotal)) {
          team.state.totalAssets = safeNumber(bsTotal);
        } else {
          const factoryAssetValueResync = team.state.factories.reduce((sum, f) => {
            const tierCost = FACTORY_TIERS[f.tier || "medium"]?.cost ?? CONSTANTS.NEW_FACTORY_COST;
            return sum + tierCost;
          }, 0);
          team.state.totalAssets = safeNumber(team.state.cash + factoryAssetValueResync);
        }
        team.state.shareholdersEquity = safeNumber(team.state.totalAssets - team.state.totalLiabilities);
        team.state.marketCap = safeNumber(FinanceModule.updateMarketCap(
          team.state, 0, investorSentiment
        ));
        team.state.sharePrice = safeNumber(team.state.sharesIssued > 0
          ? team.state.marketCap / team.state.sharesIssued : 0);
      }

      // Step 3.55: ESG subscores and warehouse storage costs
      const esgSubscores = updateESGSubscores(team.state);
      const esgBonuses = calculateESGBonuses(esgSubscores);

      // Warehouse: calculate storage costs and apply obsolescence
      ensureWarehouseState(team.state);
      const storageCostResult = calculateStorageCosts(team.state, roundNumber);
      if (storageCostResult.totalStorageCost > 0) {
        team.state.cash -= storageCostResult.totalStorageCost;
        summaryMessages.push(`  ${team.id}: Storage costs: $${(storageCostResult.totalStorageCost / 1_000).toFixed(0)}K`);
      }
      if (storageCostResult.totalWriteOffValue > 0) {
        team.state.cash -= storageCostResult.totalWriteOffValue;
        summaryMessages.push(`  ${team.id}: Inventory write-offs: $${(storageCostResult.totalWriteOffValue / 1_000).toFixed(0)}K (${storageCostResult.writeOffs.length} products)`);
      }

      // Step 3.6: Wire factory utilization and burnout — update after market demand is known
      for (const factory of team.state.factories) {
        // Total units sold = actual demand served by this team
        const totalUnitsSold = Object.values(teamSales).reduce((sum, v) => sum + v, 0);
        // Max capacity = workers × base output × efficiency
        const maxCapacity = factory.workers * CONSTANTS.BASE_WORKER_OUTPUT * factory.efficiency;
        FactoryModule.updateUtilizationAndBurnout(factory, totalUnitsSold, maxCapacity);
      }

      // Step 3.7: Wire AchievementEngine — evaluate achievements and milestones
      const achievementCtx: AchievementCheckContext = {
        teamId: team.id,
        state: team.state,
        round: roundNumber,
        marketResult: marketResult,
        allTeams: processedTeams.map(t => ({ id: t.id, state: t.state })),
      };
      const newAchievements = AchievementEngine.evaluate(achievementCtx);
      if (newAchievements.length > 0) {
        // Append to existing achievements
        team.state.achievements = [...(team.state.achievements || []), ...newAchievements];
        team.state.achievementScore = (team.state.achievements || []).reduce((sum, a) => sum + a.points, 0);
        for (const ach of newAchievements) {
          summaryMessages.push(`  ${team.id}: Achievement unlocked: ${ach.id} (+${ach.points} pts)`);
        }
      }

      // Check milestones (time-gated bonuses/penalties)
      const milestoneResults = AchievementEngine.checkMilestones(team.state, roundNumber);
      for (const ms of milestoneResults) {
        summaryMessages.push(`  ${team.id}: ${ms.message}`);
        // Apply milestone effects
        if (ms.effect.type === "brand") {
          team.state.brandValue = Math.max(0, Math.min(1, team.state.brandValue + ms.effect.value));
        } else if (ms.effect.type === "morale") {
          for (const emp of team.state.employees) {
            emp.morale = Math.max(0, Math.min(100, emp.morale + ms.effect.value));
          }
        }
        // sentiment effects stored for next round's market cap (logged only for now)
      }

      // Step 3.8: Wire RDModule.calculatePatentValue() — apply patent bonuses to products
      const patentCount = Array.isArray(team.state.patents) ? team.state.patents.length : (team.state.patents || 0);
      if (patentCount > 0) {
        const totalUnitsSold = Object.values(teamSales).reduce((sum, v) => sum + v, 0);
        const patentBonus = RDModule.calculatePatentValue(patentCount, totalUnitsSold);
        // Apply quality bonus to launched products
        for (const product of team.state.products) {
          if (product.developmentStatus === "launched") {
            product.quality = Math.min(100, product.quality + patentBonus.qualityBonus);
          }
        }
      }

      // Step 3.9: Wire HRModule.calculateEmployeeValue() into workforce stats
      if (team.state.employees.length > 0) {
        const avgValue = team.state.employees.reduce(
          (sum, e) => sum + HRModule.calculateEmployeeValue(e.stats), 0
        ) / team.state.employees.length;
        // Feed into workforce efficiency (blend with existing)
        team.state.workforce.averageEfficiency = safeNumber(
          team.state.workforce.averageEfficiency * 0.7 + avgValue * 0.3
        );
      }

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

    // Wire: FinanceModule.calculateEPSRanking() — compute EPS percentile for each team
    const allEps = processedTeams.map(t => t.state.eps);
    for (const team of processedTeams) {
      const peerEps = allEps.filter((_, i) => processedTeams[i].id !== team.id);
      const epsPercentile = FinanceModule.calculateEPSRanking(team.state.eps, peerEps);
      // Store on state for reporting (optional field)
      (team.state as Record<string, unknown>)._epsPercentile = epsPercentile;
    }

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

    // Phase 2: Economic Cycle — process phase-based macro conditions before market state update
    // EconomicCycleEngine has built-in feature gate (config.difficulty.complexity.economicCycles)
    let economicImpactMessages: string[] = [];
    try {
      const economicCtx = processedTeams.length > 0 ? processedTeams[0].ctx : undefined;
      if (economicCtx) {
        const econResult = EconomicCycleEngine.processEconomicCycle(
          marketState.economicCycleState ?? null,
          config,
          economicCtx
        );
        // Sync EconomicCycleEngine outputs into MarketState's economic conditions
        // This feeds better macro data to generateNextMarketState
        marketState.economicCycleState = econResult.state;
        marketState.economicConditions.gdp = econResult.state.gdpGrowth;
        marketState.economicConditions.inflation = econResult.state.inflation;
        marketState.economicConditions.consumerConfidence = econResult.state.consumerConfidence;
        marketState.economicConditions.unemploymentRate = econResult.state.unemployment;
        marketState.interestRates.federalRate = econResult.state.interestRates.federal;
        marketState.interestRates.corporateBond = econResult.state.interestRates.corporate;
        economicImpactMessages = econResult.impact.messages;
      }
    } catch {
      // EconomicCycleEngine graceful degradation — MarketSimulator's inline logic handles fallback
    }

    // Step 5: Generate next market state (with context for deterministic fluctuations)
    // Pass team data for dynamic pricing updates
    const newMarketState = MarketSimulator.generateNextMarketState(
      marketState,
      events,
      marketCtx,
      processedTeams.map(t => ({ id: t.id, state: t.state }))
    );
    // Carry forward economic cycle state to next round
    newMarketState.economicCycleState = marketState.economicCycleState;

    if (economicImpactMessages.length > 0) {
      summaryMessages.push(...economicImpactMessages);
    }
    summaryMessages.push(`Round ${roundNumber} complete. Leader: Team ${rankings[0]?.teamId}`);

    // Step 6: Wire FacilitatorReportEngine — generate round brief for facilitators
    let facilitatorBrief: import("../types/facilitator").FacilitatorBrief | undefined;
    try {
      const facilitatorTeams = processedTeams.map(t => ({
        id: t.id,
        name: t.id, // Team ID as name fallback
        state: t.state,
      }));
      facilitatorBrief = FacilitatorReportEngine.generateRoundBrief(
        roundNumber,
        facilitatorTeams,
        marketResult
      );
    } catch {
      // Facilitator reports are optional — don't break simulation
    }

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
      marketPositions: marketResult.positions,
      facilitatorBrief,
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

    // Factory costs (tier-based)
    if (decisions.factory?.newFactories) {
      const factoryCost = decisions.factory.newFactories.reduce((sum, nf) => {
        const tier = nf.tier || "medium";
        return sum + (FACTORY_TIERS[tier]?.cost ?? CONSTANTS.NEW_FACTORY_COST);
      }, 0);
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

    // EXPLOIT-06: Validate product pricing — reject negative/zero prices
    if (decisions.marketing?.productPricing) {
      for (const pricing of decisions.marketing.productPricing) {
        if (pricing.newPrice <= 0) {
          errors.push(`Invalid price: $${pricing.newPrice} — price must be positive`);
          pricing.newPrice = Math.max(1, pricing.newPrice);
        }
      }
    }

    // VAL-01: Validate material tier choices are in valid range [1, 5]
    if (decisions.factory?.materialTierChoices) {
      for (const [segment, tier] of Object.entries(decisions.factory.materialTierChoices)) {
        if (typeof tier !== "number" || !isFinite(tier) || tier < 1 || tier > 5) {
          errors.push(`Invalid material tier for ${segment}: ${tier} — must be 1-5`);
          (decisions.factory.materialTierChoices as Record<string, number>)[segment] = Math.max(1, Math.min(5, Math.round(tier) || 2));
        }
      }
    }

    // VAL-01: Validate R&D budget is non-negative
    if (decisions.rd?.rdBudget !== undefined && decisions.rd.rdBudget < 0) {
      errors.push("R&D budget cannot be negative");
      correctedDecisions.rd!.rdBudget = 0;
    }

    // VAL-01: Validate dividend is non-negative
    if (decisions.finance?.dividendPerShare !== undefined && decisions.finance.dividendPerShare < 0) {
      errors.push("Dividend per share cannot be negative");
      correctedDecisions.finance!.dividendPerShare = 0;
    }

    // VAL-01: Validate fire targets exist
    if (decisions.hr?.fires) {
      const employeeIds = new Set(state.employees.map(e => e.id));
      correctedDecisions.hr!.fires = decisions.hr.fires.filter(f => {
        if (!employeeIds.has(f.employeeId)) {
          errors.push(`Cannot fire non-existent employee: ${f.employeeId}`);
          return false;
        }
        return true;
      });
    }

    // VAL-01: Detect duplicate sponsorships
    if (decisions.marketing?.sponsorships) {
      const seen = new Set<string>();
      correctedDecisions.marketing!.sponsorships = decisions.marketing.sponsorships.filter(s => {
        if (seen.has(s.name)) {
          errors.push(`Duplicate sponsorship: ${s.name}`);
          return false;
        }
        seen.add(s.name);
        return true;
      });
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
      startingSegments?: number;
      brandValue?: number;
    },
  ): TeamState {
    const workers = presetConfig?.workers ?? 50;
    const engineers = presetConfig?.engineers ?? 8;
    const supervisors = presetConfig?.supervisors ?? 5;
    const includeProducts = presetConfig?.includeProducts ?? true;
    const numSegments = presetConfig?.startingSegments ?? 5;
    const brandVal = presetConfig?.brandValue ?? 0.5;

    // All 5 segments in priority order (General & Budget first as entry-level)
    // Product specs sourced from CONSTANTS.INITIAL_PRODUCT_SPECS
    const specs = CONSTANTS.INITIAL_PRODUCT_SPECS;
    const ALL_SEGMENT_DEFS = [
      { segment: "General" as const, id: "initial-product", name: "Standard Phone", ...specs["General"] },
      { segment: "Budget" as const, id: "budget-product", name: "Budget Phone", ...specs["Budget"] },
      { segment: "Enthusiast" as const, id: "enthusiast-product", name: "Pro Phone", ...specs["Enthusiast"] },
      { segment: "Professional" as const, id: "professional-product", name: "Enterprise Phone", ...specs["Professional"] },
      { segment: "Active Lifestyle" as const, id: "active-product", name: "Active Phone", ...specs["Active Lifestyle"] },
    ];

    // Pick segments based on startingSegments count
    const activeSegments = ALL_SEGMENT_DEFS.slice(0, numSegments);

    const defaultFactory = FactoryModule.createNewFactory("Main Factory", "North America", 0, undefined, "medium");
    defaultFactory.workers = workers;
    defaultFactory.supervisors = supervisors;
    defaultFactory.engineers = engineers;

    // Create one production line per active segment
    defaultFactory.productionLines = activeSegments.map((seg, i) => ({
      id: `line-${i + 1}`,
      segment: seg.segment,
      productId: seg.id,
      capacity: CONSTANTS.DEFAULT_PRODUCT_CAPACITY,
      efficiency: CONSTANTS.BASE_FACTORY_EFFICIENCY,
    }));

    // Create products only for active segments
    const initialProducts = activeSegments.map((seg) => ({
      id: seg.id,
      name: seg.name,
      segment: seg.segment,
      price: seg.price,
      quality: seg.quality,
      features: seg.features,
      reliability: seg.reliability,
      developmentRound: 0,
      developmentStatus: "launched" as const,
      developmentProgress: 100,
      targetQuality: seg.quality,
      targetFeatures: seg.features,
      roundsRemaining: 0,
      unitCost: CONSTANTS.RAW_MATERIAL_COST_PER_UNIT[seg.segment] + CONSTANTS.LABOR_COST_PER_UNIT + CONSTANTS.OVERHEAD_COST_PER_UNIT,
    }));

    // Default benefits package
    const bp = CONSTANTS.DEFAULT_BENEFITS_PACKAGE;
    const defaultBenefits = {
      package: {
        healthInsurance: bp.healthInsurance,
        retirementMatch: bp.retirementMatch,
        paidTimeOff: bp.paidTimeOff,
        parentalLeave: bp.parentalLeave,
        stockOptions: false,
        flexibleWork: false,
        professionalDevelopment: bp.professionalDevelopment,
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
      const s = CONSTANTS.BASE_EMPLOYEE_STAT;
      const baseStats: EmployeeStats = {
        efficiency: s, accuracy: s, speed: s, stamina: s,
        discipline: s, loyalty: s, teamCompatibility: s, health: s,
      };
      let stats: EmployeeStats | EngineerStats | SupervisorStats = baseStats;
      if (role === "engineer") {
        stats = { ...baseStats, innovation: s, problemSolving: s };
      } else if (role === "supervisor") {
        stats = { ...baseStats, leadership: s, tacticalPlanning: s };
      }
      const baseSalaries: Record<EmployeeRole, number> = { worker: 45_000, engineer: 85_000, supervisor: 75_000 };
      const multiplier = CONSTANTS.SALARY_MULTIPLIER_MIN +
        (s / 100) * (CONSTANTS.SALARY_MULTIPLIER_MAX - CONSTANTS.SALARY_MULTIPLIER_MIN);
      const salary = Math.min(CONSTANTS.MAX_SALARY, Math.round(baseSalaries[role] * multiplier));

      return {
        id: `initial-${role}-${index}`,
        role,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} ${index + 1}`,
        stats,
        salary,
        hiredRound: 0,
        factoryId,
        morale: CONSTANTS.BASE_EMPLOYEE_MORALE,
        burnout: 0,
        trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
      };
    };

    for (let i = 0; i < workers; i++) initialEmployees.push(createInitialEmployee("worker", i));
    for (let i = 0; i < engineers; i++) initialEmployees.push(createInitialEmployee("engineer", i));
    for (let i = 0; i < supervisors; i++) initialEmployees.push(createInitialEmployee("supervisor", i));

    const startingCash = config?.cash ?? CONSTANTS.DEFAULT_STARTING_CASH;

    const baseState: TeamState = {
      // State versioning for compatibility checks
      version: CURRENT_ENGINE_VERSION,

      cash: startingCash,
      revenue: 0,
      netIncome: 0,
      totalAssets: startingCash + FACTORY_TIERS.medium.cost,
      totalLiabilities: 0,
      shortTermDebt: 0,      // PATCH 1: Treasury bills, credit lines, short-term loans
      longTermDebt: 0,       // PATCH 1: Corporate bonds, long-term bank loans
      shareholdersEquity: startingCash + FACTORY_TIERS.medium.cost,
      marketCap: CONSTANTS.DEFAULT_MARKET_CAP,
      sharesIssued: CONSTANTS.DEFAULT_SHARES_ISSUED,
      sharePrice: CONSTANTS.DEFAULT_SHARE_PRICE,
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
      products: includeProducts ? initialProducts : [],
      employees: initialEmployees,
      workforce: {
        totalHeadcount: workers + engineers + supervisors,
        averageMorale: (workers + engineers + supervisors) > 0 ? CONSTANTS.BASE_EMPLOYEE_MORALE : 0,
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

    // Apply any config overrides (cash, rdProgress, products, etc.)
    if (config) {
      return { ...baseState, ...config };
    }
    return baseState;
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
      fxRates: { ...CONSTANTS.FX_BASELINE_RATES },
      fxVolatility: 0.15,
      interestRates: {
        federalRate: 5.0,
        tenYearBond: 4.5,
        corporateBond: 6.0,
      },
      // Demand rebalanced: Budget highest (mass market), Professional/Enthusiast lower (niche)
      // This ensures volume strategies can compete via higher unit sales despite lower margins
      demandBySegment: {
        Budget: { totalDemand: 700000, priceRange: { min: 100, max: 300 }, growthRate: 0.03 },
        General: { totalDemand: 450000, priceRange: { min: 300, max: 600 }, growthRate: 0.03 },
        Enthusiast: { totalDemand: 150000, priceRange: { min: 600, max: 1000 }, growthRate: 0.04 },
        Professional: { totalDemand: 80000, priceRange: { min: 1000, max: 1500 }, growthRate: 0.02 },
        "Active Lifestyle": { totalDemand: 200000, priceRange: { min: 400, max: 800 }, growthRate: 0.05 },
      },
      marketPressures: {
        priceCompetition: 0.5,
        qualityExpectations: 0.6,
        sustainabilityPremium: 0.3,
      },
      // v5.1.0 Audit F-13: Initialize dynamic pricing from CONSTANTS.INITIAL_PRODUCT_SPECS
      dynamicPricing: Object.fromEntries(
        CONSTANTS.SEGMENTS.map(seg => {
          const p = CONSTANTS.INITIAL_PRODUCT_SPECS[seg].price;
          return [seg, {
            expectedPrice: p,
            underservedFactor: 0.5,
            competitorCount: 0,
            priceFloor: Math.round(p * 0.5),
            priceCeiling: Math.round(p * 1.5),
          }];
        })
      ),
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
