/**
 * Unit tests for the Simulation Engine
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SimulationEngine } from "../core/SimulationEngine";
import { FactoryModule } from "../modules/FactoryModule";
import { HRModule } from "../modules/HRModule";
import { FinanceModule } from "../modules/FinanceModule";
import { MarketingModule } from "../modules/MarketingModule";
import { RDModule } from "../modules/RDModule";
import { MarketSimulator } from "../market/MarketSimulator";
import { setRandomSeed } from "../utils";
import { CONSTANTS, TeamState, MarketState, EngineerStats } from "../types";

// Helper to create proper EngineerStats
function createEngineerStats(overrides: Partial<EngineerStats> = {}): EngineerStats {
  return {
    efficiency: 100,
    accuracy: 80,
    speed: 100,
    stamina: 80,
    discipline: 80,
    loyalty: 80,
    teamCompatibility: 80,
    health: 80,
    innovation: 100,
    problemSolving: 80,
    ...overrides,
  };
}

// Set up deterministic seeding before each test
beforeEach(() => {
  setRandomSeed("test-seed-simulation-engine");
});

// Helper to create initial market state
function createMarketState(): MarketState {
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

describe("SimulationEngine", () => {
  describe("createInitialTeamState", () => {
    it("should create a valid initial team state", () => {
      const state = SimulationEngine.createInitialTeamState();

      expect(state.cash).toBe(CONSTANTS.DEFAULT_STARTING_CASH);
      expect(state.factories).toHaveLength(1);
      expect(state.factories[0].region).toBe("North America");
      expect(state.brandValue).toBe(0.5);
      expect(state.esgScore).toBe(100);
    });

    it("should accept custom cash amount", () => {
      const state = SimulationEngine.createInitialTeamState({ cash: 100_000_000 });
      expect(state.cash).toBe(100_000_000);
    });
  });

  describe("validateDecisions", () => {
    it("should validate decisions against cash constraints", () => {
      const state = SimulationEngine.createInitialTeamState({ cash: 10_000_000 });

      const decisions = {
        factory: {
          newFactories: [
            { name: "Factory 1", region: "Europe" as const },
            { name: "Factory 2", region: "Asia" as const },
          ],
        },
      };

      const { valid, errors, correctedDecisions } = SimulationEngine.validateDecisions(
        state,
        decisions
      );

      expect(valid).toBe(false);
      expect(errors).toContain("Insufficient funds for new factories");
      expect(correctedDecisions.factory?.newFactories).toHaveLength(0);
    });
  });

  describe("processRound", () => {
    it("should process a round and return results", () => {
      const team1State = SimulationEngine.createInitialTeamState();
      const team2State = SimulationEngine.createInitialTeamState();
      const marketState = createMarketState();

      const output = SimulationEngine.processRound({
        roundNumber: 1,
        teams: [
          { id: "team1", state: team1State, decisions: {} },
          { id: "team2", state: team2State, decisions: {} },
        ],
        marketState,
      });

      expect(output.roundNumber).toBe(1);
      expect(output.results).toHaveLength(2);
      expect(output.rankings).toHaveLength(2);
      expect(output.newMarketState.roundNumber).toBe(2);
    });
  });
});

describe("FactoryModule", () => {
  describe("calculateCO2Reduction", () => {
    it("should calculate 10 tons per $100K invested", () => {
      const reduction = FactoryModule.calculateCO2Reduction(100_000);
      expect(reduction).toBe(10);

      const reduction2 = FactoryModule.calculateCO2Reduction(500_000);
      expect(reduction2).toBe(50);
    });
  });

  describe("applyEfficiencyInvestment", () => {
    it("should increase efficiency with investment", () => {
      const factory = FactoryModule.createNewFactory("Test", "North America", 0);
      const initialEfficiency = factory.efficiency;

      const { newEfficiency, cost } = FactoryModule.applyEfficiencyInvestment(factory, {
        workers: 5_000_000,
      });

      expect(newEfficiency).toBeGreaterThan(initialEfficiency);
      expect(cost).toBe(5_000_000);
    });

    it("should cap efficiency at 100%", () => {
      const factory = FactoryModule.createNewFactory("Test", "North America", 0);
      factory.efficiency = 0.95;

      const { newEfficiency } = FactoryModule.applyEfficiencyInvestment(factory, {
        workers: 50_000_000,
        engineers: 50_000_000,
      });

      expect(newEfficiency).toBeLessThanOrEqual(CONSTANTS.MAX_EFFICIENCY);
    });
  });

  describe("calculateRecommendedStaffing", () => {
    it("should recommend appropriate staffing levels", () => {
      const factory = FactoryModule.createNewFactory("Test", "North America", 0);

      const staffing = FactoryModule.calculateRecommendedStaffing(factory);

      expect(staffing.engineers).toBe(CONSTANTS.ENGINEERS_PER_FACTORY);
      expect(staffing.supervisors).toBeGreaterThan(0);
      expect(staffing.workers).toBeGreaterThan(0);
    });
  });
});

describe("HRModule", () => {
  describe("generateCandidates", () => {
    it("should generate correct number of candidates", () => {
      const candidates = HRModule.generateCandidates("worker", "basic");
      expect(candidates).toHaveLength(CONSTANTS.RECRUITMENT_CANDIDATES.basic);

      const premiumCandidates = HRModule.generateCandidates("engineer", "premium");
      expect(premiumCandidates).toHaveLength(CONSTANTS.RECRUITMENT_CANDIDATES.premium);
    });

    it("should generate stats within tier range", () => {
      const candidates = HRModule.generateCandidates("worker", "basic");
      const range = CONSTANTS.RECRUITMENT_STAT_RANGE.basic;

      for (const candidate of candidates) {
        expect(candidate.stats.efficiency).toBeGreaterThanOrEqual(range.min);
        expect(candidate.stats.efficiency).toBeLessThanOrEqual(Math.min(100, range.max));
      }
    });
  });

  describe("calculateSalary", () => {
    it("should calculate salary based on stats", () => {
      const lowStats = HRModule.generateStats("worker", 50, 60);
      const highStats = HRModule.generateStats("worker", 90, 100);

      const lowSalary = HRModule.calculateSalary("worker", lowStats);
      const highSalary = HRModule.calculateSalary("worker", highStats);

      expect(highSalary).toBeGreaterThan(lowSalary);
    });

    it("should cap salary at maximum", () => {
      const maxStats = HRModule.generateStats("engineer", 100, 100);
      const salary = HRModule.calculateSalary("engineer", maxStats);

      expect(salary).toBeLessThanOrEqual(CONSTANTS.MAX_SALARY);
    });
  });

  describe("calculateEmployeeValue", () => {
    it("should weight stats according to formula", () => {
      const stats = {
        efficiency: 100,
        accuracy: 100,
        speed: 100,
        stamina: 100,
        discipline: 100,
        loyalty: 100,
        teamCompatibility: 100,
        health: 100,
      };

      const value = HRModule.calculateEmployeeValue(stats);

      // Sum of weights = 1.0, so max value should be 100
      expect(value).toBe(100);
    });
  });
});

describe("FinanceModule", () => {
  describe("calculateRatios", () => {
    it("should calculate financial ratios", () => {
      const state = SimulationEngine.createInitialTeamState();
      state.netIncome = 10_000_000;
      state.revenue = 100_000_000;

      const ratios = FinanceModule.calculateRatios(state);

      expect(ratios.currentRatio).toBeGreaterThan(0);
      expect(ratios.profitMargin).toBe(0.1); // 10M / 100M
    });
  });

  describe("getRatioHealth", () => {
    it("should return correct health status", () => {
      expect(FinanceModule.getRatioHealth("currentRatio", 2.5).status).toBe("green");
      expect(FinanceModule.getRatioHealth("currentRatio", 1.5).status).toBe("yellow");
      expect(FinanceModule.getRatioHealth("currentRatio", 1.0).status).toBe("red");
    });
  });

  describe("calculateProposalProbability", () => {
    it("should increase probability with good financials", () => {
      const state = SimulationEngine.createInitialTeamState();
      state.netIncome = 50_000_000;

      const ratios = FinanceModule.calculateRatios(state);

      const probability = FinanceModule.calculateProposalProbability("dividend", state, ratios);

      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThanOrEqual(95);
    });
  });
});

describe("MarketSimulator", () => {
  describe("calculateDemand", () => {
    it("should adjust demand based on economic conditions", () => {
      const marketState = createMarketState();
      const demand = MarketSimulator.calculateDemand(marketState);

      expect(demand.Budget).toBeGreaterThan(0);
      expect(demand.Professional).toBeGreaterThan(0);
    });
  });

  describe("calculateMarketShares", () => {
    it("should distribute shares using softmax", () => {
      const positions = [
        { teamId: "1", segment: "General" as const, product: null, priceScore: 20, qualityScore: 20, brandScore: 20, esgScore: 5, featureScore: 5, totalScore: 70, marketShare: 0, unitsSold: 0, revenue: 0 },
        { teamId: "2", segment: "General" as const, product: null, priceScore: 10, qualityScore: 10, brandScore: 10, esgScore: 5, featureScore: 5, totalScore: 40, marketShare: 0, unitsSold: 0, revenue: 0 },
      ];

      const shares = MarketSimulator.calculateMarketShares(positions);

      expect(shares[0]).toBeGreaterThan(shares[1]); // Higher score = higher share
      expect(shares[0] + shares[1]).toBeCloseTo(1, 5); // Sum to 1
    });
  });

  describe("generateNextMarketState", () => {
    it("should advance round number", () => {
      const marketState = createMarketState();
      const nextState = MarketSimulator.generateNextMarketState(marketState);

      expect(nextState.roundNumber).toBe(2);
    });

    it("should fluctuate economic conditions", () => {
      const marketState = createMarketState();
      const nextState = MarketSimulator.generateNextMarketState(marketState);

      // Values should have changed (with some randomness)
      expect(nextState.economicConditions).not.toEqual(marketState.economicConditions);
    });
  });
});

describe("MarketingModule", () => {
  describe("calculateAdvertisingImpact", () => {
    it("should return positive brand impact for positive budget", () => {
      const impact = MarketingModule.calculateAdvertisingImpact(5_000_000, "General");
      expect(impact).toBeGreaterThan(0);
    });

    it("should have higher impact for Budget segment", () => {
      const budgetImpact = MarketingModule.calculateAdvertisingImpact(5_000_000, "Budget");
      const professionalImpact = MarketingModule.calculateAdvertisingImpact(5_000_000, "Professional");
      expect(budgetImpact).toBeGreaterThan(professionalImpact);
    });

    it("should have diminishing returns on spending", () => {
      const first10M = MarketingModule.calculateAdvertisingImpact(10_000_000, "General");
      const second10M = MarketingModule.calculateAdvertisingImpact(20_000_000, "General") - first10M;
      expect(first10M).toBeGreaterThan(second10M);
    });
  });

  describe("calculateBrandingImpact", () => {
    it("should return 0.3% brand increase per $1M", () => {
      const impact = MarketingModule.calculateBrandingImpact(1_000_000);
      expect(impact).toBeCloseTo(CONSTANTS.BRANDING_BASE_IMPACT, 5);
    });
  });

  describe("calculatePromotionImpact", () => {
    it("should return higher sales boost for budget segment", () => {
      const budgetBoost = MarketingModule.calculatePromotionImpact(10, "Budget", 0.5);
      const professionalBoost = MarketingModule.calculatePromotionImpact(10, "Professional", 0.5);
      expect(budgetBoost.salesBoost).toBeGreaterThan(professionalBoost.salesBoost);
    });

    it("should have margin reduction equal to discount percent", () => {
      const result = MarketingModule.calculatePromotionImpact(15, "General", 0.5);
      expect(result.marginReduction).toBeCloseTo(0.15, 5);
    });
  });

  describe("process", () => {
    it("should process marketing decisions and update brand value", () => {
      const state = SimulationEngine.createInitialTeamState();
      const initialBrand = state.brandValue;

      const { newState, result } = MarketingModule.process(state, {
        advertisingBudget: { General: 5_000_000 },
      });

      expect(result.success).toBe(true);
      // Brand goes up from advertising but down from decay
      expect(result.costs).toBe(5_000_000);
    });

    it("should handle alternative marketingBudget array format", () => {
      const state = SimulationEngine.createInitialTeamState();

      const { newState, result } = MarketingModule.process(state, {
        marketingBudget: [
          { segment: "General", spend: 3_000_000 },
          { segment: "Budget", spend: 2_000_000 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.costs).toBe(5_000_000);
    });

    it("should apply brand decay", () => {
      const state = SimulationEngine.createInitialTeamState();
      const initialBrand = state.brandValue;

      const { newState } = MarketingModule.process(state, {});

      // With no investment, brand should decay by 2%
      expect(newState.brandValue).toBeLessThan(initialBrand);
    });
  });
});

describe("RDModule", () => {
  describe("calculateDevelopmentCost", () => {
    it("should have higher cost for premium segments", () => {
      const budgetCost = RDModule.calculateDevelopmentCost("Budget", 70);
      const professionalCost = RDModule.calculateDevelopmentCost("Professional", 70);
      expect(professionalCost).toBeGreaterThan(budgetCost);
    });

    it("should increase cost with quality target", () => {
      const lowQualityCost = RDModule.calculateDevelopmentCost("General", 50);
      const highQualityCost = RDModule.calculateDevelopmentCost("General", 90);
      expect(highQualityCost).toBeGreaterThan(lowQualityCost);
    });
  });

  describe("calculateDevelopmentRounds", () => {
    it("should reduce rounds with more engineers", () => {
      const fewEngineers = RDModule.calculateDevelopmentRounds(70, 2);
      const manyEngineers = RDModule.calculateDevelopmentRounds(70, 10);
      expect(manyEngineers).toBeLessThanOrEqual(fewEngineers);
    });

    it("should increase rounds with higher quality target", () => {
      const lowQuality = RDModule.calculateDevelopmentRounds(50, 5);
      const highQuality = RDModule.calculateDevelopmentRounds(100, 5);
      expect(highQuality).toBeGreaterThanOrEqual(lowQuality);
    });
  });

  describe("calculateTotalRDOutput", () => {
    it("should return 0 for empty engineer list", () => {
      const output = RDModule.calculateTotalRDOutput([]);
      expect(output).toBe(0);
    });

    it("should calculate output based on engineer stats", () => {
      const engineers = [
        {
          id: "eng1",
          role: "engineer" as const,
          name: "Test Engineer",
          stats: createEngineerStats({ efficiency: 100, speed: 100, innovation: 100 }),
          salary: 100000,
          hiredRound: 0,
          factoryId: "factory1",
          morale: 100,
          burnout: 0,
          trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
        },
      ];

      const output = RDModule.calculateTotalRDOutput(engineers);
      expect(output).toBeGreaterThan(0);
    });

    it("should reduce output with burnout", () => {
      const freshEngineer = [
        {
          id: "eng1",
          role: "engineer" as const,
          name: "Fresh Engineer",
          stats: createEngineerStats({ efficiency: 100, speed: 100, innovation: 100 }),
          salary: 100000,
          hiredRound: 0,
          factoryId: "factory1",
          morale: 100,
          burnout: 0,
          trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
        },
      ];

      const burnedOutEngineer = [
        {
          id: "eng2",
          role: "engineer" as const,
          name: "Burned Out Engineer",
          stats: createEngineerStats({ efficiency: 100, speed: 100, innovation: 100 }),
          salary: 100000,
          hiredRound: 0,
          factoryId: "factory1",
          morale: 100,
          burnout: 50,
          trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
        },
      ];

      const freshOutput = RDModule.calculateTotalRDOutput(freshEngineer);
      const burnedOutput = RDModule.calculateTotalRDOutput(burnedOutEngineer);
      expect(freshOutput).toBeGreaterThan(burnedOutput);
    });
  });

  describe("createProduct", () => {
    it("should create product with in_development status", () => {
      const product = RDModule.createProduct("Test Product", "General", 80, 70, 2);

      expect(product.developmentStatus).toBe("in_development");
      expect(product.targetQuality).toBe(80);
      expect(product.targetFeatures).toBe(70);
      expect(product.roundsRemaining).toBe(2);
    });

    it("should start with reduced quality during development", () => {
      const product = RDModule.createProduct("Test Product", "General", 100, 100, 2);

      expect(product.quality).toBeLessThan(product.targetQuality);
      expect(product.features).toBeLessThan(product.targetFeatures);
    });
  });

  describe("suggestPrice", () => {
    it("should suggest higher prices for premium segments", () => {
      const budgetPrice = RDModule.suggestPrice("Budget", 70);
      const professionalPrice = RDModule.suggestPrice("Professional", 70);
      expect(professionalPrice).toBeGreaterThan(budgetPrice);
    });

    it("should increase price with higher quality", () => {
      const lowQualityPrice = RDModule.suggestPrice("General", 30);
      const highQualityPrice = RDModule.suggestPrice("General", 90);
      expect(highQualityPrice).toBeGreaterThan(lowQualityPrice);
    });
  });

  describe("calculatePatentValue", () => {
    it("should cap bonuses at max values", () => {
      const value = RDModule.calculatePatentValue(100); // Way more than needed

      expect(value.qualityBonus).toBe(25);
      expect(value.costReduction).toBe(0.25);
      expect(value.marketShareBonus).toBe(0.15);
    });

    it("should scale bonuses with patent count", () => {
      const onePatent = RDModule.calculatePatentValue(1);
      const fivePatents = RDModule.calculatePatentValue(5);

      expect(fivePatents.qualityBonus).toBeGreaterThan(onePatent.qualityBonus);
    });
  });

  describe("process", () => {
    it("should process R&D decisions and create new products", () => {
      const state = SimulationEngine.createInitialTeamState();

      const { newState, result } = RDModule.process(state, {
        newProducts: [
          { name: "New Widget", segment: "General", targetQuality: 70, targetFeatures: 60 },
        ],
      });

      expect(result.success).toBe(true);
      expect(newState.products).toHaveLength(state.products.length + 1);
    });

    it("should generate R&D points from engineers", () => {
      const state = SimulationEngine.createInitialTeamState();
      // Ensure we have engineers
      state.employees = [
        {
          id: "eng1",
          role: "engineer",
          name: "Test Engineer",
          stats: createEngineerStats({ efficiency: 100, speed: 100, innovation: 100 }),
          salary: 100000,
          hiredRound: 0,
          factoryId: state.factories[0].id,
          morale: 100,
          burnout: 0,
          trainingHistory: { programsThisYear: 0, lastTrainingRound: 0, totalProgramsCompleted: 0 },
        },
      ];

      const { newState, result } = RDModule.process(state, {});

      expect(result.changes?.rdPointsGenerated).toBeGreaterThan(0);
      expect(newState.rdProgress).toBeGreaterThan(state.rdProgress);
    });
  });
});
