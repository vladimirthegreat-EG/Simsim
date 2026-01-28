/**
 * Business Simulation Engine
 *
 * This module exports all simulation components for use in the application.
 *
 * DETERMINISM GUARANTEE:
 * - All engine functions are deterministic when EngineContext is provided
 * - Same seed + same decisions = identical outputs
 * - Use createEngineContext() to create contexts for simulation
 *
 * CONFIGURATION SYSTEM (v3.0.0):
 * - All balance parameters are externalized to config/
 * - Use loadConfig() or loadConfigForDifficulty() to get config
 * - Legacy CONSTANTS object maintained for backward compatibility
 *
 * EXPANDED SYSTEMS (v4.0.0):
 * - Economy integrity (unit economics, capacity, inventory)
 * - Explainability layer (score breakdowns, delta explanations)
 * - Customer satisfaction loop
 * - Experience/learning curves
 * - Supply chain with disruptions
 * - Economic cycles (GDP, inflation, consumer confidence)
 * - Crisis & events system
 * - Competitive intelligence
 * - Achievement system
 * - Module expansions (Factory, HR, R&D, Marketing, Finance)
 */

// Types
export * from "./types";

// Configuration system
export {
  // Loading
  loadConfig,
  loadConfigForDifficulty,
  validateConfig,
  getConfigValue,
  setConfigValue,
  diffConfigs,
  serializeConfig,
  parseConfig,
  // Defaults
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_FACTORY_CONFIG,
  DEFAULT_HR_CONFIG,
  DEFAULT_MARKETING_CONFIG,
  DEFAULT_RD_CONFIG,
  DEFAULT_FINANCE_CONFIG,
  DEFAULT_MARKET_CONFIG,
  DEFAULT_ESG_CONFIG,
  DEFAULT_ECONOMY_CONFIG,
  DEFAULT_BALANCE_CONFIG,
  DEFAULT_DIFFICULTY_CONFIG,
  DEFAULT_INITIAL_STATE_CONFIG,
  // Presets
  DIFFICULTY_PRESETS,
  DIFFICULTY_METADATA,
  getPreset,
  getDifficultyLevels,
} from "./config";
export type {
  EngineConfig,
  FactoryConfig,
  HRConfig,
  MarketingConfig,
  RDConfig,
  FinanceConfig,
  MarketConfig,
  ESGConfig,
  EconomyConfig,
  BalanceConfig,
  DifficultyConfig,
  InitialStateConfig,
  ConfigOverrides,
  DifficultyLevel,
  CreditRating,
  EconomicPhase,
  RecruitmentTier,
  SegmentWeights,
  SponsorshipConfig,
  ValidationResult,
  DifficultyMetadata,
} from "./config";

// Core engine
export { SimulationEngine } from "./core/SimulationEngine";
export type { TeamInput, SimulationInput, SimulationOutput } from "./core/SimulationEngine";

// Engine context (for deterministic simulations)
export {
  createEngineContext,
  createTestContext,
  deriveSeedBundle,
  hashState,
  hashString,
  SeededRNG,
  CURRENT_ENGINE_VERSION,
} from "./core/EngineContext";
export type {
  EngineContext,
  SeedBundle,
  RNGProvider,
  EngineVersion,
  DeterministicIDGenerator,
} from "./core/EngineContext";

// Modules - Core
export { FactoryModule } from "./modules/FactoryModule";
export { HRModule } from "./modules/HRModule";
export { FinanceModule } from "./modules/FinanceModule";
export type { FinancialRatios, RatioHealth, BoardProposalResult } from "./modules/FinanceModule";
export { MarketingModule } from "./modules/MarketingModule";
export { RDModule } from "./modules/RDModule";
export type { ProductDevelopmentProgress } from "./modules/RDModule";

// Modules - Expansions
export { FactoryExpansions } from "./modules/FactoryExpansions";
export type {
  UtilizationState,
  MaintenanceState,
  MaintenanceDecisions,
  BreakdownEvent,
  DefectImpact,
  FactoryHealthResult,
} from "./modules/FactoryExpansions";

export { HRExpansions } from "./modules/HRExpansions";
export type {
  EmployeeRole,
  SkillCluster,
  ExtendedEmployee,
  CareerLevel,
  TeamDynamics,
  HiringPipeline,
  CareerProgression,
  HRExpansionResult,
  HRExpansionDecisions,
} from "./modules/HRExpansions";

export { RDExpansions } from "./modules/RDExpansions";
export type {
  TechFamily,
  TechTier,
  RiskLevel,
  TechNode,
  TechEffect,
  TechTreeState,
  Platform,
  PlatformState,
  RDExpansionResult,
  RDExpansionDecisions,
} from "./modules/RDExpansions";

export { MarketingExpansions } from "./modules/MarketingExpansions";
export type {
  MarketingChannel,
  PerformanceMarketing,
  BrandMarketing,
  ChannelMix,
  CompetitorAction,
  MarketingExpansionResult,
  MarketingExpansionDecisions,
} from "./modules/MarketingExpansions";

export { FinanceExpansions } from "./modules/FinanceExpansions";
export type {
  DebtInstrument,
  DebtState,
  CreditRatingState,
  InvestorSentiment,
  CashConstraints,
  FinanceExpansionResult,
  FinanceExpansionDecisions,
} from "./modules/FinanceExpansions";

// Market simulation
export { MarketSimulator } from "./market/MarketSimulator";
export type { TeamMarketPosition, MarketSimulationResult } from "./market/MarketSimulator";

// Economy system
export { EconomyEngine, EconomicCycleEngine } from "./economy";
export type {
  UnitEconomics,
  CapacityState,
  InventoryState,
  WorkingCapitalState,
  EconomyResult,
  EconomicState,
  EconomicImpact,
  EconomicForecast,
} from "./economy";

// Experience curves
export { ExperienceCurveEngine } from "./experience";
export type {
  ExperienceCurveState,
  LearningModifiers,
  ExperienceResult,
} from "./experience";

// Explainability
export { ExplainabilityEngine } from "./explainability";
export type {
  SegmentScoreBreakdown,
  DeltaExplanation,
  DeltaDriver,
  DriverTree,
  WaterfallStep,
  RoundNarrative,
  ExplainabilityResult,
} from "./explainability";

// Customer Satisfaction
export { SatisfactionEngine } from "./satisfaction";
export type {
  CustomerSatisfaction,
  SegmentSatisfaction,
  SatisfactionImpact,
  SatisfactionResult,
} from "./satisfaction";

// Supply Chain
export { SupplyChainEngine } from "./supplychain";
export type {
  Region,
  Supplier,
  SupplyChainState,
  Disruption,
  Vulnerability,
  SupplyChainResult,
  SupplyChainDecisions,
} from "./supplychain";

// Events
export { EventEngine } from "./events";
export type {
  EventType,
  GameEvent,
  EventEffect,
  EventChoice,
  ActiveEvent,
  EventState,
  EventResult,
} from "./events";

// Competitive Intelligence
export { CompetitiveIntelligenceEngine } from "./intelligence";
export type {
  CompetitorStrategy,
  MarketSignal,
  CompetitorProfile,
  IntelligenceState,
  MarketInsight,
  IntelligenceResult,
} from "./intelligence";

// Achievements
export { AchievementEngine } from "./achievements";
export type {
  Achievement,
  AchievementCategory,
  AchievementTier,
  AchievementState,
  Milestone,
  AchievementResult,
} from "./achievements";

// Balance testing
export {
  BalanceHarness,
  DEFAULT_HARNESS_CONFIG,
  quickBalanceCheck,
  STRATEGIES,
  getAvailableStrategies,
  getStrategy,
  MetricsCalculator,
  BALANCE_THRESHOLDS,
} from "./balance";
export type {
  StrategyArchetype,
  StrategyDecisionMaker,
  StrategyResult,
  HarnessConfig,
  SimulationRun,
  TeamRunResult,
  HarnessOutput,
  BalanceMetrics,
  DiversityIndex,
  RoundMetrics,
  StrategicHealth,
  MetricsSummary,
} from "./balance";
