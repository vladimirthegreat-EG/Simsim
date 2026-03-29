/**
 * Mini-Tournament Integration Tests
 *
 * Full pipeline test: tRPC -> Prisma -> SimulationEngine -> Prisma write-back.
 * Exercises game.advanceRound which internally runs SimulationEngine.processRound().
 *
 * 3 teams compete over 3 rounds in a 4-round game.
 */

import "./helpers/next-headers-mock";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createTestPrisma,
  pushTestSchema,
  cleanupTestDb,
  createTestCaller,
  VALID_DECISIONS,
} from "./helpers/setup";

const TEST_ID = "mini-tournament";

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = createTestPrisma(TEST_ID);
  await pushTestSchema(prisma);
});

afterAll(async () => {
  await cleanupTestDb(prisma, TEST_ID);
});

// ============================================
// COMPLEXITY SETTINGS
// ============================================

const COMPLEXITY_SETTINGS = {
  preset: "standard" as const,
  modules: {
    factory: true,
    hr: true,
    finance: true,
    marketing: true,
    rd: true,
    esg: false,
  },
  features: {
    multipleFactories: false,
    employeeManagement: true,
    detailedFinancials: true,
    boardMeetings: false,
    marketEvents: true,
    rubberBanding: true,
    productDevelopmentTimeline: false,
    trainingFatigue: false,
    benefitsSystem: false,
    inventoryManagement: false,
  },
  automation: {
    autoHire: false,
    autoTrain: false,
    autoInvest: false,
    autoPrice: false,
  },
  difficulty: {
    startingCash: 200_000_000,
    marketVolatility: 0.5,
    competitorStrength: 0.5,
    economicStability: 0.7,
  },
};

// ============================================
// VARIED DECISIONS (slightly different per team)
// ============================================

function makeTeamDecisions(variant: "alpha" | "beta" | "gamma") {
  const multipliers = {
    alpha: { factory: 1.0, marketing: 1.0, rd: 1.0, salary: 1.1 },
    beta: { factory: 1.3, marketing: 0.8, rd: 1.2, salary: 1.15 },
    gamma: { factory: 0.7, marketing: 1.5, rd: 0.9, salary: 1.05 },
  };
  const m = multipliers[variant];

  return {
    FACTORY: {
      investments: {
        workerEfficiency: Math.round(1_000_000 * m.factory),
        supervisorEfficiency: Math.round(500_000 * m.factory),
        engineerEfficiency: Math.round(500_000 * m.factory),
        machineryEfficiency: Math.round(500_000 * m.factory),
        factoryEfficiency: Math.round(1_000_000 * m.factory),
      },
    },
    FINANCE: VALID_DECISIONS.FINANCE,
    HR: {
      salaryMultiplierChanges: {
        workers: m.salary,
        engineers: m.salary + 0.05,
        supervisors: m.salary,
      },
    },
    MARKETING: {
      marketingBudget: [
        {
          segment: "General",
          region: "North America",
          spend: Math.round(2_000_000 * m.marketing),
          campaignType: "awareness",
        },
      ],
      positioningStrategy: "balanced",
    },
    RD: {
      rdBudgetAllocation: [
        {
          productId: "main-product",
          budget: Math.round(4_000_000 * m.rd),
          focus: "innovation" as const,
        },
      ],
    },
  };
}

// ============================================
// MINI-TOURNAMENT TESTS
// ============================================

describe("Mini-Tournament", { timeout: 30_000 }, () => {
  const email = "tournament@test.com";
  const password = "securepassword123";
  const name = "Tournament Facilitator";

  let facilitatorId: string;
  let gameId: string;
  let joinCode: string;

  // Team data: { id, sessionToken, name }
  const teams: Array<{
    id: string;
    sessionToken: string;
    name: string;
    variant: "alpha" | "beta" | "gamma";
  }> = [];

  // Track initial cash for verification
  let initialCash: number;

  // ============================================
  // SETUP PHASE (tests 1-4)
  // ============================================

  it("1. should register facilitator", async () => {
    const publicCaller = createTestCaller({ prisma });

    const result = await publicCaller.facilitator.register({
      email,
      password,
      name,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    facilitatorId = result.id;
  });

  it("2. should create a 4-round game", async () => {
    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId,
    });

    const result = await facilitatorCaller.game.create({
      name: "Mini Tournament",
      maxRounds: 4,
      complexitySettings: COMPLEXITY_SETTINGS,
    });

    expect(result).toBeDefined();
    expect(result.game.maxRounds).toBe(4);
    gameId = result.game.id;
    joinCode = result.joinCode;
  });

  it("3. should have three teams join", async () => {
    const publicCaller = createTestCaller({ prisma });
    const teamNames: Array<{ name: string; variant: "alpha" | "beta" | "gamma" }> = [
      { name: "Alpha", variant: "alpha" },
      { name: "Beta", variant: "beta" },
      { name: "Gamma", variant: "gamma" },
    ];

    for (const { name: teamName, variant } of teamNames) {
      const result = await publicCaller.team.join({
        joinCode,
        teamName,
      });

      expect(result).toBeDefined();
      expect(result.teamId).toBeDefined();
      expect(result.gameId).toBe(gameId);

      // Fetch the session token from the database
      const teamRecord = await prisma.team.findFirst({
        where: { name: teamName, gameId },
      });
      expect(teamRecord).not.toBeNull();

      teams.push({
        id: result.teamId,
        sessionToken: teamRecord!.sessionToken,
        name: teamName,
        variant,
      });
    }

    expect(teams).toHaveLength(3);
  });

  it("4. should start the game", async () => {
    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId,
    });

    const result = await facilitatorCaller.game.start({ gameId });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);

    // Record initial cash for later comparison
    const firstTeam = await prisma.team.findFirst({
      where: { gameId },
    });
    expect(firstTeam).not.toBeNull();
    const state = JSON.parse(firstTeam!.currentState);
    initialCash = state.cash;
    expect(initialCash).toBeGreaterThan(0);
  });

  // ============================================
  // ROUND 1 (tests 5-10)
  // ============================================

  it("5. should have all teams submit decisions for round 1", async () => {
    for (const team of teams) {
      const teamCaller = createTestCaller({
        prisma,
        sessionToken: team.sessionToken,
      });

      const decisions = makeTeamDecisions(team.variant);

      const modules = ["FACTORY", "FINANCE", "HR", "MARKETING", "RD"] as const;
      for (const mod of modules) {
        const result = await teamCaller.decision.submit({
          module: mod,
          decisions: decisions[mod],
        });
        expect(result.success).toBe(true);
      }
    }
  });

  it("6. should have all teams lock their decisions", async () => {
    for (const team of teams) {
      const teamCaller = createTestCaller({
        prisma,
        sessionToken: team.sessionToken,
      });

      const lockResult = await teamCaller.decision.lockAll();
      expect(lockResult.success).toBe(true);
      expect(lockResult.lockedCount).toBe(5);
    }
  });

  it("7. should advance round (facilitator triggers simulation)", async () => {
    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId,
    });

    const result = await facilitatorCaller.game.advanceRound({ gameId });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.roundNumber).toBe(2);
  });

  it("8. should have RoundResult records for all 3 teams", async () => {
    const round1 = await prisma.round.findFirst({
      where: { gameId, roundNumber: 1 },
    });
    expect(round1).not.toBeNull();

    const results = await prisma.roundResult.findMany({
      where: { roundId: round1!.id },
    });

    expect(results).toHaveLength(3);

    // All teams should have results
    const resultTeamIds = results.map((r) => r.teamId).sort();
    const expectedTeamIds = teams.map((t) => t.id).sort();
    expect(resultTeamIds).toEqual(expectedTeamIds);
  });

  it("9. should have rankings 1, 2, 3 with no duplicates", async () => {
    const round1 = await prisma.round.findFirst({
      where: { gameId, roundNumber: 1 },
    });
    expect(round1).not.toBeNull();

    const results = await prisma.roundResult.findMany({
      where: { roundId: round1!.id },
      orderBy: { rank: "asc" },
    });

    const ranks = results.map((r) => r.rank);
    expect(ranks).toEqual([1, 2, 3]);
  });

  it("10. should have updated team states (cash changed from initial)", async () => {
    const teamsAfterRound1 = await prisma.team.findMany({
      where: { gameId },
    });

    for (const team of teamsAfterRound1) {
      const state = JSON.parse(team.currentState);
      expect(state.cash).toBeDefined();
      // Cash should have changed (either increased or decreased) due to simulation
      expect(state.cash).not.toBe(initialCash);
    }
  });

  // ============================================
  // ROUND 2 (tests 11-13)
  // ============================================

  it("11. should have all teams submit decisions for round 2", async () => {
    for (const team of teams) {
      const teamCaller = createTestCaller({
        prisma,
        sessionToken: team.sessionToken,
      });

      const decisions = makeTeamDecisions(team.variant);

      const modules = ["FACTORY", "FINANCE", "HR", "MARKETING", "RD"] as const;
      for (const mod of modules) {
        const result = await teamCaller.decision.submit({
          module: mod,
          decisions: decisions[mod],
        });
        expect(result.success).toBe(true);
      }
    }
  });

  it("12. should lock and advance round 2", async () => {
    // Lock all teams
    for (const team of teams) {
      const teamCaller = createTestCaller({
        prisma,
        sessionToken: team.sessionToken,
      });
      const lockResult = await teamCaller.decision.lockAll();
      expect(lockResult.success).toBe(true);
    }

    // Advance round
    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId,
    });
    const result = await facilitatorCaller.game.advanceRound({ gameId });

    expect(result.success).toBe(true);
    expect(result.roundNumber).toBe(3);
  });

  it("13. should have round 2 results that differ from round 1", async () => {
    const round1 = await prisma.round.findFirst({
      where: { gameId, roundNumber: 1 },
    });
    const round2 = await prisma.round.findFirst({
      where: { gameId, roundNumber: 2 },
    });
    expect(round1).not.toBeNull();
    expect(round2).not.toBeNull();

    const round1Results = await prisma.roundResult.findMany({
      where: { roundId: round1!.id },
      orderBy: { teamId: "asc" },
    });
    const round2Results = await prisma.roundResult.findMany({
      where: { roundId: round2!.id },
      orderBy: { teamId: "asc" },
    });

    expect(round2Results).toHaveLength(3);

    // At least one team should have different metrics between rounds
    let foundDifference = false;
    for (let i = 0; i < round1Results.length; i++) {
      const r1Metrics = JSON.parse(round1Results[i].metrics);
      const r2Metrics = JSON.parse(round2Results[i].metrics);

      if (r1Metrics.revenue !== r2Metrics.revenue || r1Metrics.netIncome !== r2Metrics.netIncome) {
        foundDifference = true;
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });

  // ============================================
  // ROUND 3 (tests 14-15)
  // ============================================

  it("14. should submit, lock, and advance round 3", async () => {
    // Submit decisions for all teams
    for (const team of teams) {
      const teamCaller = createTestCaller({
        prisma,
        sessionToken: team.sessionToken,
      });

      const decisions = makeTeamDecisions(team.variant);

      const modules = ["FACTORY", "FINANCE", "HR", "MARKETING", "RD"] as const;
      for (const mod of modules) {
        await teamCaller.decision.submit({
          module: mod,
          decisions: decisions[mod],
        });
      }
    }

    // Lock all teams
    for (const team of teams) {
      const teamCaller = createTestCaller({
        prisma,
        sessionToken: team.sessionToken,
      });
      await teamCaller.decision.lockAll();
    }

    // Advance round
    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId,
    });
    const result = await facilitatorCaller.game.advanceRound({ gameId });

    expect(result.success).toBe(true);
    expect(result.roundNumber).toBe(4);
  });

  it("15. should have 3 rounds of results per team", async () => {
    for (const team of teams) {
      const results = await prisma.roundResult.findMany({
        where: { teamId: team.id },
        orderBy: { round: { roundNumber: "asc" } },
      });

      expect(results).toHaveLength(3);
    }
  });

  // ============================================
  // VERIFICATION (tests 16-18)
  // ============================================

  it("16. should have 9 total round results (3 teams x 3 rounds)", async () => {
    const allResults = await prisma.roundResult.findMany({
      where: {
        round: { gameId },
      },
    });

    expect(allResults).toHaveLength(9);
  });

  it("17. should show market state evolution across rounds", async () => {
    const round1 = await prisma.round.findFirst({
      where: { gameId, roundNumber: 1 },
    });
    const round3 = await prisma.round.findFirst({
      where: { gameId, roundNumber: 3 },
    });
    expect(round1).not.toBeNull();
    expect(round3).not.toBeNull();

    const market1 = JSON.parse(round1!.marketState);
    const market3 = JSON.parse(round3!.marketState);

    // Market states should be different after simulation rounds have processed
    // The new market state from round processing is stored in the next round
    expect(JSON.stringify(market1)).not.toBe(JSON.stringify(market3));
  });

  it("18. should still be IN_PROGRESS (only 3 of 4 rounds completed)", async () => {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    expect(game).not.toBeNull();
    expect(game!.status).toBe("IN_PROGRESS");
    expect(game!.currentRound).toBe(4);
    expect(game!.maxRounds).toBe(4);
  });
});

// ============================================
// DS-21: FULL ROUND-TRIP — decisions → DB → engine → non-zero results
// Layer 0 gate test — proves the entire pipeline works end-to-end
// ============================================
describe("DS-21: Full Round-Trip — Decisions Flow Through to Results", { timeout: 30_000 }, () => {
  const SEED = "ds-21-round-trip";

  let facilitatorId: string;
  let gameId: string;
  let joinCode: string;

  // Two teams: skilled vs passive
  let skilledTeam: { id: string; sessionToken: string };
  let passiveTeam: { id: string; sessionToken: string };

  it("setup: create game with 2 teams", async () => {
    const publicCaller = createTestCaller({ prisma });

    // Register facilitator
    const facilitator = await publicCaller.facilitator.register({
      email: "ds21-facilitator@test.com",
      password: "securepassword123",
      name: "DS-21 Facilitator",
    });
    facilitatorId = facilitator.id;

    // Create game
    const facilitatorCaller = createTestCaller({ prisma, facilitatorId });
    const gameResult = await facilitatorCaller.game.create({
      name: "DS-21 Round Trip Test",
      maxRounds: 4,
      matchSeed: SEED,
    });
    gameId = gameResult.game.id;
    joinCode = gameResult.joinCode;

    // Team 1: Skilled
    const t1 = await publicCaller.team.join({ joinCode, teamName: "Skilled Team" });
    const t1Record = await prisma.team.findFirst({ where: { name: "Skilled Team", gameId } });
    skilledTeam = { id: t1.teamId, sessionToken: t1Record!.sessionToken };

    // Team 2: Passive
    const t2 = await publicCaller.team.join({ joinCode, teamName: "Passive Team" });
    const t2Record = await prisma.team.findFirst({ where: { name: "Passive Team", gameId } });
    passiveTeam = { id: t2.teamId, sessionToken: t2Record!.sessionToken };

    // Start game
    const startResult = await facilitatorCaller.game.start({ gameId });
    expect(startResult.success).toBe(true);
  });

  it("skilled team submits strong decisions, passive submits minimal", async () => {
    // Skilled team: high R&D, factory efficiency, marketing, salary
    const skilledCaller = createTestCaller({ prisma, sessionToken: skilledTeam.sessionToken });

    await skilledCaller.decision.submit({
      module: "FACTORY",
      decisions: {
        investments: {
          workerEfficiency: 3_000_000,
          supervisorEfficiency: 1_000_000,
          engineerEfficiency: 1_000_000,
          machineryEfficiency: 1_000_000,
          factoryEfficiency: 2_000_000,
        },
      },
    });
    await skilledCaller.decision.submit({
      module: "HR",
      decisions: {
        salaryMultiplierChanges: { workers: 1.10, engineers: 1.10, supervisors: 1.10 },
      },
    });
    await skilledCaller.decision.submit({
      module: "MARKETING",
      decisions: {
        marketingBudget: [
          { segment: "General", region: "North America", spend: 3_000_000, campaignType: "awareness" },
        ],
        positioningStrategy: "balanced",
      },
    });
    await skilledCaller.decision.submit({
      module: "RD",
      decisions: {
        rdBudgetAllocation: [
          { productId: "main-product", budget: 8_000_000, focus: "innovation" as const },
        ],
      },
    });
    await skilledCaller.decision.submit({
      module: "FINANCE",
      decisions: VALID_DECISIONS.FINANCE,
    });

    // Passive team: minimal/default decisions for all modules
    const passiveCaller = createTestCaller({ prisma, sessionToken: passiveTeam.sessionToken });

    for (const mod of ["FACTORY", "HR", "MARKETING", "RD", "FINANCE"] as const) {
      await passiveCaller.decision.submit({
        module: mod,
        decisions: mod === "FINANCE" ? VALID_DECISIONS.FINANCE : {},
      });
    }
  });

  it("both teams lock decisions", async () => {
    const skilledCaller = createTestCaller({ prisma, sessionToken: skilledTeam.sessionToken });
    const passiveCaller = createTestCaller({ prisma, sessionToken: passiveTeam.sessionToken });

    const lock1 = await skilledCaller.decision.lockAll();
    const lock2 = await passiveCaller.decision.lockAll();

    expect(lock1.success).toBe(true);
    expect(lock1.lockedCount).toBe(5);
    expect(lock2.success).toBe(true);
    expect(lock2.lockedCount).toBe(5);
  });

  it("facilitator advances round — results are non-zero with no NaN", async () => {
    const facilitatorCaller = createTestCaller({ prisma, facilitatorId });
    const result = await facilitatorCaller.game.advanceRound({ gameId });

    expect(result.success).toBe(true);
    expect(result.roundNumber).toBe(2);

    // Verify both teams have results
    const round1 = await prisma.round.findFirst({ where: { gameId, roundNumber: 1 } });
    expect(round1).not.toBeNull();
    expect(round1!.status).toBe("COMPLETED");

    const roundResults = await prisma.roundResult.findMany({
      where: { roundId: round1!.id },
    });
    expect(roundResults).toHaveLength(2);

    // Verify each team's results
    for (const rr of roundResults) {
      const metrics = JSON.parse(rr.metrics);

      // Revenue must be > 0 (no $0 revenue bug)
      expect(metrics.revenue).toBeGreaterThan(0);

      // No NaN in any financial field
      expect(isFinite(metrics.revenue)).toBe(true);
      expect(isFinite(metrics.netIncome)).toBe(true);
      if (metrics.eps !== undefined && metrics.eps !== null) {
        expect(isFinite(metrics.eps)).toBe(true);
      }
      if (metrics.cash !== undefined) {
        expect(isFinite(metrics.cash)).toBe(true);
      }
    }

    // Verify team states updated in DB
    for (const team of [skilledTeam, passiveTeam]) {
      const teamRecord = await prisma.team.findUnique({ where: { id: team.id } });
      expect(teamRecord).not.toBeNull();

      const state = JSON.parse(teamRecord!.currentState);
      expect(state.revenue).toBeGreaterThan(0);
      expect(isFinite(state.revenue)).toBe(true);
      expect(isFinite(state.netIncome)).toBe(true);
      expect(isFinite(state.cash)).toBe(true);
    }
  });

  it("skilled team has higher revenue than passive team (decisions matter)", async () => {
    const skilledRecord = await prisma.team.findUnique({ where: { id: skilledTeam.id } });
    const passiveRecord = await prisma.team.findUnique({ where: { id: passiveTeam.id } });

    const skilledState = JSON.parse(skilledRecord!.currentState);
    const passiveState = JSON.parse(passiveRecord!.currentState);

    // Better decisions should produce better outcomes
    // This is the key differentiation test — if this fails, the engine has a P0 bug
    expect(skilledState.revenue).toBeGreaterThan(passiveState.revenue);
  });
});
