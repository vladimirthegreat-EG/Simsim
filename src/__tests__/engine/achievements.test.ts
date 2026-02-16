/**
 * Achievement Engine Tests
 *
 * Tests achievement conditions, scoring, and victory resolution.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ALL_ACHIEVEMENTS,
  calculateAchievementScore,
} from "../../engine/types/achievements";
import type { AchievementDefinition, UnlockedAchievement } from "../../engine/types/achievements";
import { AchievementEngine } from "../../engine/modules/AchievementEngine";
import type { AchievementCheckContext } from "../../engine/modules/AchievementEngine";
import { SimulationEngine } from "../../engine/core/SimulationEngine";
import { setRandomSeed } from "../../engine/utils";

beforeEach(() => {
  setRandomSeed("test-seed-achievements");
});

function createBaseContext(overrides: Partial<AchievementCheckContext> = {}): AchievementCheckContext {
  const state = SimulationEngine.createInitialTeamState();
  return {
    teamId: "team1",
    state,
    round: 1,
    ...overrides,
  };
}

describe("Achievement Definitions", () => {
  it("should have ~40+ achievements", () => {
    expect(ALL_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(38);
  });

  it("should have unique IDs", () => {
    const ids = ALL_ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have all 7 categories represented", () => {
    const categories = new Set(ALL_ACHIEVEMENTS.map((a) => a.category));
    expect(categories.has("Innovation")).toBe(true);
    expect(categories.has("Market")).toBe(true);
    expect(categories.has("Financial")).toBe(true);
    expect(categories.has("Strategic")).toBe(true);
    expect(categories.has("Milestone")).toBe(true);
    expect(categories.has("Infamy")).toBe(true);
    expect(categories.has("Bad")).toBe(true);
  });

  it("Bad achievements should have 0 points", () => {
    const bad = ALL_ACHIEVEMENTS.filter((a) => a.category === "Bad");
    for (const a of bad) {
      expect(a.points).toBe(0);
    }
  });

  it("Infamy achievements should have 0 points", () => {
    const infamy = ALL_ACHIEVEMENTS.filter((a) => a.category === "Infamy");
    for (const a of infamy) {
      expect(a.points).toBe(0);
    }
  });

  it("Innovation achievements should have positive points", () => {
    const innovation = ALL_ACHIEVEMENTS.filter((a) => a.category === "Innovation");
    for (const a of innovation) {
      expect(a.points).toBeGreaterThan(0);
    }
  });

  it("should have point ranges matching design doc", () => {
    const innovation = ALL_ACHIEVEMENTS.filter((a) => a.category === "Innovation");
    for (const a of innovation) {
      expect(a.points).toBeGreaterThanOrEqual(5);
      expect(a.points).toBeLessThanOrEqual(50);
    }

    const market = ALL_ACHIEVEMENTS.filter((a) => a.category === "Market");
    for (const a of market) {
      expect(a.points).toBeGreaterThanOrEqual(5);
      expect(a.points).toBeLessThanOrEqual(40);
    }
  });
});

describe("calculateAchievementScore", () => {
  it("should return 0 for empty achievements", () => {
    expect(calculateAchievementScore([])).toBe(0);
  });

  it("should sum achievement points", () => {
    const achievements: UnlockedAchievement[] = [
      { id: "tech_first_t1", roundUnlocked: 1, points: 5 },
      { id: "arch_first_phone", roundUnlocked: 2, points: 5 },
    ];
    expect(calculateAchievementScore(achievements)).toBe(10);
  });

  it("should not add negative points", () => {
    const achievements: UnlockedAchievement[] = [
      { id: "tech_first_t1", roundUnlocked: 1, points: 5 },
      { id: "bad_cash_negative", roundUnlocked: 3, points: 0 },
    ];
    expect(calculateAchievementScore(achievements)).toBe(5);
  });
});

describe("AchievementEngine.evaluate", () => {
  it("should return empty for initial state with no progress", () => {
    const ctx = createBaseContext();
    const result = AchievementEngine.evaluate(ctx);
    // Initial state might trigger some (e.g., having products launched)
    // but should not trigger tech achievements
    const techAchievements = result.filter((a) => a.id.startsWith("tech_"));
    expect(techAchievements.length).toBe(0);
  });

  it("should detect tech_first_t1 when tier 1 tech is unlocked", () => {
    const ctx = createBaseContext();
    ctx.state.unlockedTechnologies = ["bat_1a"];
    const result = AchievementEngine.evaluate(ctx);
    const firstT1 = result.find((a) => a.id === "tech_first_t1");
    expect(firstT1).toBeDefined();
    expect(firstT1!.points).toBe(5);
  });

  it("should detect arch_first_phone when a product has an archetypeId", () => {
    const ctx = createBaseContext();
    ctx.state.products[0].archetypeId = "basic_phone";
    const result = AchievementEngine.evaluate(ctx);
    const arch = result.find((a) => a.id === "arch_first_phone");
    expect(arch).toBeDefined();
  });

  it("should not re-unlock already unlocked achievements", () => {
    const ctx = createBaseContext();
    ctx.state.unlockedTechnologies = ["bat_1a"];
    ctx.state.achievements = [
      { id: "tech_first_t1", roundUnlocked: 1, points: 5 },
    ];
    const result = AchievementEngine.evaluate(ctx);
    const firstT1 = result.find((a) => a.id === "tech_first_t1");
    expect(firstT1).toBeUndefined();
  });

  it("should detect bad_cash_negative when cash < 0", () => {
    const ctx = createBaseContext();
    ctx.state.cash = -1_000_000;
    const result = AchievementEngine.evaluate(ctx);
    const badCash = result.find((a) => a.id === "bad_cash_negative");
    expect(badCash).toBeDefined();
    expect(badCash!.points).toBe(0);
  });

  it("should detect bad_no_product at round 5 with no launched products", () => {
    const ctx = createBaseContext();
    ctx.round = 5;
    ctx.state.products = ctx.state.products.map((p) => ({
      ...p,
      developmentStatus: "developing" as const,
    }));
    const result = AchievementEngine.evaluate(ctx);
    const noProd = result.find((a) => a.id === "bad_no_product");
    expect(noProd).toBeDefined();
  });

  it("should detect pvp_monopoly when >50% share in any segment", () => {
    const ctx = createBaseContext();
    ctx.state.marketShare = {
      Budget: 0.55,
      General: 0.1,
      Enthusiast: 0.05,
      Professional: 0.03,
      "Active Lifestyle": 0.02,
    } as any;
    const result = AchievementEngine.evaluate(ctx);
    const monopoly = result.find((a) => a.id === "pvp_monopoly");
    expect(monopoly).toBeDefined();
  });

  it("should detect pvp_diversified when >15% in 4+ segments", () => {
    const ctx = createBaseContext();
    ctx.state.marketShare = {
      Budget: 0.20,
      General: 0.18,
      Enthusiast: 0.16,
      Professional: 0.17,
      "Active Lifestyle": 0.05,
    } as any;
    const result = AchievementEngine.evaluate(ctx);
    const diversified = result.find((a) => a.id === "pvp_diversified");
    expect(diversified).toBeDefined();
  });

  it("should detect pat_first_filed when patents array has entries", () => {
    const ctx = createBaseContext();
    ctx.state.patents = [
      {
        id: "pat1",
        techId: "bat_2a",
        family: "battery" as any,
        tier: 2 as any,
        ownerId: "team1",
        roundFiled: 3,
        expiresRound: 11,
        status: "active" as any,
        licensedTo: [],
        licenseFeePerRound: 1_000_000,
        exclusiveBonus: 0.05,
        blockingPower: 0.05,
      },
    ];
    const result = AchievementEngine.evaluate(ctx);
    const firstFiled = result.find((a) => a.id === "pat_first_filed");
    expect(firstFiled).toBeDefined();
  });

  it("should detect bad_overspend when rdBudget > 60% of revenue", () => {
    const ctx = createBaseContext();
    ctx.state.revenue = 100_000_000;
    ctx.state.rdBudget = 70_000_000;
    const result = AchievementEngine.evaluate(ctx);
    const overspend = result.find((a) => a.id === "bad_overspend");
    expect(overspend).toBeDefined();
  });

  it("should detect tech_tier5 when tier 5 tech is unlocked", () => {
    const ctx = createBaseContext();
    ctx.state.unlockedTechnologies = ["bat_5"];
    const result = AchievementEngine.evaluate(ctx);
    const tier5 = result.find((a) => a.id === "tech_tier5");
    expect(tier5).toBeDefined();
  });
});

describe("AchievementEngine.resolveVictory", () => {
  it("should rank teams by achievement score", () => {
    const teams = [
      {
        id: "team1",
        name: "Alpha",
        state: {
          ...SimulationEngine.createInitialTeamState(),
          achievements: [{ id: "tech_first_t1", roundUnlocked: 1, points: 5 }],
        },
        cumulativeRevenue: 100_000_000,
      },
      {
        id: "team2",
        name: "Beta",
        state: {
          ...SimulationEngine.createInitialTeamState(),
          achievements: [
            { id: "tech_first_t1", roundUnlocked: 1, points: 5 },
            { id: "tech_tier5", roundUnlocked: 5, points: 25 },
          ],
        },
        cumulativeRevenue: 80_000_000,
      },
    ];

    const result = AchievementEngine.resolveVictory(teams);
    expect(result.rankings[0].teamId).toBe("team2");
    expect(result.rankings[0].rank).toBe(1);
    expect(result.rankings[1].teamId).toBe("team1");
    expect(result.rankings[1].rank).toBe(2);
  });

  it("should break ties with cumulative revenue", () => {
    const baseState = SimulationEngine.createInitialTeamState();
    const teams = [
      {
        id: "team1",
        name: "Alpha",
        state: { ...baseState, achievements: [{ id: "tech_first_t1", roundUnlocked: 1, points: 5 }] },
        cumulativeRevenue: 200_000_000,
      },
      {
        id: "team2",
        name: "Beta",
        state: { ...baseState, achievements: [{ id: "arch_first_phone", roundUnlocked: 1, points: 5 }] },
        cumulativeRevenue: 100_000_000,
      },
    ];

    const result = AchievementEngine.resolveVictory(teams);
    // Same score (5), higher revenue wins
    expect(result.rankings[0].teamId).toBe("team1");
  });

  it("should assign correct ranks to all teams", () => {
    const baseState = SimulationEngine.createInitialTeamState();
    const teams = [
      { id: "t1", name: "A", state: { ...baseState, achievements: [] as UnlockedAchievement[] }, cumulativeRevenue: 50 },
      { id: "t2", name: "B", state: { ...baseState, achievements: [{ id: "x", roundUnlocked: 1, points: 10 }] }, cumulativeRevenue: 100 },
      { id: "t3", name: "C", state: { ...baseState, achievements: [{ id: "y", roundUnlocked: 1, points: 5 }] }, cumulativeRevenue: 75 },
    ];

    const result = AchievementEngine.resolveVictory(teams);
    expect(result.rankings).toHaveLength(3);
    expect(result.rankings[0].rank).toBe(1);
    expect(result.rankings[1].rank).toBe(2);
    expect(result.rankings[2].rank).toBe(3);
  });
});
