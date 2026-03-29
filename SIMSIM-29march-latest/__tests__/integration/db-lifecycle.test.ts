/**
 * Database Lifecycle Integration Tests
 *
 * Tests database operations through the tRPC layer with real SQLite.
 * Covers game lifecycle, cascade deletes, unique constraints, and edge cases.
 */

import "./helpers/next-headers-mock";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createTestPrisma,
  pushTestSchema,
  cleanupTestDb,
  createTestCaller,
  seedFacilitator,
  seedGame,
  seedTeam,
  seedRound,
  VALID_DECISIONS,
} from "./helpers/setup";

const TEST_ID = "db-lifecycle";

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = createTestPrisma(TEST_ID);
  await pushTestSchema(prisma);
});

afterAll(async () => {
  await cleanupTestDb(prisma, TEST_ID);
});

// ============================================
// COMPLEXITY SETTINGS (reused across tests)
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
// GAME LIFECYCLE (tests 1-12)
// ============================================

describe("Game Lifecycle", () => {
  const email = "lifecycle@test.com";
  const password = "securepassword123";
  const name = "Lifecycle Facilitator";

  let facilitatorId: string;
  let gameId: string;
  let joinCode: string;
  let team1Id: string;
  let team1SessionToken: string;
  let team2Id: string;

  it("1. should register a facilitator", async () => {
    const publicCaller = createTestCaller({ prisma });

    const result = await publicCaller.facilitator.register({
      email,
      password,
      name,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.email).toBe(email);
    expect(result.name).toBe(name);

    facilitatorId = result.id;
  });

  it("2. should login as facilitator", async () => {
    const publicCaller = createTestCaller({ prisma });

    const result = await publicCaller.facilitator.login({
      email,
      password,
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(facilitatorId);
    expect(result.email).toBe(email);
    expect(result.name).toBe(name);
  });

  it("3. should create a game", async () => {
    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId,
    });

    const result = await facilitatorCaller.game.create({
      name: "Lifecycle Test Game",
      maxRounds: 4,
      complexitySettings: COMPLEXITY_SETTINGS,
    });

    expect(result).toBeDefined();
    expect(result.game).toBeDefined();
    expect(result.game.name).toBe("Lifecycle Test Game");
    expect(result.game.maxRounds).toBe(4);
    expect(result.joinCode).toBeDefined();
    expect(result.joinCode).toHaveLength(6);

    gameId = result.game.id;
    joinCode = result.joinCode;
  });

  it("4. should retrieve game by join code", async () => {
    const publicCaller = createTestCaller({ prisma });

    const result = await publicCaller.game.getByJoinCode({ joinCode });

    expect(result).toBeDefined();
    expect(result.name).toBe("Lifecycle Test Game");
    expect(result.status).toBe("LOBBY");
    expect(result.teamCount).toBe(0);
  });

  it("5. should allow first team to join", async () => {
    const publicCaller = createTestCaller({ prisma });

    const result = await publicCaller.team.join({
      joinCode,
      teamName: "Alpha",
    });

    expect(result).toBeDefined();
    expect(result.teamId).toBeDefined();
    expect(result.gameId).toBe(gameId);
    expect(result.teamName).toBe("Alpha");

    team1Id = result.teamId;

    // Look up the session token from the database
    const team = await prisma.team.findFirst({
      where: { id: team1Id },
    });
    expect(team).not.toBeNull();
    team1SessionToken = team!.sessionToken;
  });

  it("6. should allow second team to join and both are visible", async () => {
    const publicCaller = createTestCaller({ prisma });

    const result = await publicCaller.team.join({
      joinCode,
      teamName: "Beta",
    });

    expect(result).toBeDefined();
    expect(result.teamId).toBeDefined();
    team2Id = result.teamId;

    // Verify both teams are visible via getByJoinCode
    const gameInfo = await publicCaller.game.getByJoinCode({ joinCode });
    expect(gameInfo.teamCount).toBe(2);
    expect(gameInfo.teams).toHaveLength(2);

    const teamNames = gameInfo.teams.map((t) => t.name);
    expect(teamNames).toContain("Alpha");
    expect(teamNames).toContain("Beta");
  });

  it("7. should start the game", async () => {
    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId,
    });

    const result = await facilitatorCaller.game.start({ gameId });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.roundId).toBeDefined();
  });

  it("8. should have round 1 created with ACCEPTING_DECISIONS status", async () => {
    const round = await prisma.round.findFirst({
      where: { gameId, roundNumber: 1 },
    });

    expect(round).not.toBeNull();
    expect(round!.status).toBe("ACCEPTING_DECISIONS");
    expect(round!.roundNumber).toBe(1);
  });

  it("9. should have initialized team states", async () => {
    const teams = await prisma.team.findMany({
      where: { gameId },
    });

    expect(teams).toHaveLength(2);

    for (const team of teams) {
      expect(team.currentState).not.toBe("{}");
      const state = JSON.parse(team.currentState);
      expect(state.cash).toBeDefined();
      expect(state.cash).toBeGreaterThan(0);
    }
  });

  it("10. should submit factory decisions for team 1", async () => {
    const teamCaller = createTestCaller({
      prisma,
      sessionToken: team1SessionToken,
    });

    const result = await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: VALID_DECISIONS.FACTORY,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.module).toBe("FACTORY");
  });

  it("11. should submit all 5 modules for team 1 then lock", async () => {
    const teamCaller = createTestCaller({
      prisma,
      sessionToken: team1SessionToken,
    });

    // Submit remaining 4 modules (FACTORY already submitted in test 10)
    await teamCaller.decision.submit({
      module: "FINANCE",
      decisions: VALID_DECISIONS.FINANCE,
    });
    await teamCaller.decision.submit({
      module: "HR",
      decisions: VALID_DECISIONS.HR,
    });
    await teamCaller.decision.submit({
      module: "MARKETING",
      decisions: VALID_DECISIONS.MARKETING,
    });
    await teamCaller.decision.submit({
      module: "RD",
      decisions: VALID_DECISIONS.RD,
    });

    // Lock all decisions
    const lockResult = await teamCaller.decision.lockAll();

    expect(lockResult).toBeDefined();
    expect(lockResult.success).toBe(true);
    expect(lockResult.lockedCount).toBe(5);
  });

  it("12. should verify all decisions are locked", async () => {
    const round = await prisma.round.findFirst({
      where: { gameId, roundNumber: 1 },
    });
    expect(round).not.toBeNull();

    const decisions = await prisma.teamDecision.findMany({
      where: {
        teamId: team1Id,
        roundId: round!.id,
      },
    });

    expect(decisions).toHaveLength(5);
    for (const decision of decisions) {
      expect(decision.isLocked).toBe(true);
    }
  });
});

// ============================================
// CASCADE DELETES (tests 13-16)
// ============================================

describe("Cascade Deletes", () => {
  let cascadeGameId: string;

  it("13. should create full game state for cascade test", async () => {
    // Create facilitator directly
    const facilitator = await seedFacilitator(prisma, {
      email: "cascade@test.com",
    });

    // Create game
    const game = await seedGame(prisma, facilitator.id, {
      name: "Cascade Test Game",
      status: "IN_PROGRESS",
    });
    cascadeGameId = game.id;

    // Create 2 teams
    const team1 = await seedTeam(prisma, game.id, { name: "Cascade-Alpha" });
    const team2 = await seedTeam(prisma, game.id, { name: "Cascade-Beta" });

    // Create a round
    const round = await seedRound(prisma, game.id, 1, {
      status: "COMPLETED",
    });

    // Create decisions
    await prisma.teamDecision.create({
      data: {
        teamId: team1.id,
        roundId: round.id,
        module: "FACTORY",
        decisions: JSON.stringify(VALID_DECISIONS.FACTORY),
      },
    });
    await prisma.teamDecision.create({
      data: {
        teamId: team2.id,
        roundId: round.id,
        module: "FACTORY",
        decisions: JSON.stringify(VALID_DECISIONS.FACTORY),
      },
    });

    // Create round results
    await prisma.roundResult.create({
      data: {
        teamId: team1.id,
        roundId: round.id,
        stateAfter: "{}",
        metrics: JSON.stringify({ revenue: 100000 }),
        rank: 1,
      },
    });
    await prisma.roundResult.create({
      data: {
        teamId: team2.id,
        roundId: round.id,
        stateAfter: "{}",
        metrics: JSON.stringify({ revenue: 80000 }),
        rank: 2,
      },
    });

    // Verify data is in place
    const teams = await prisma.team.findMany({
      where: { gameId: cascadeGameId },
    });
    expect(teams).toHaveLength(2);
  });

  it("14. should delete game and cascade to children", async () => {
    await prisma.game.delete({
      where: { id: cascadeGameId },
    });

    // Verify game is deleted
    const game = await prisma.game.findUnique({
      where: { id: cascadeGameId },
    });
    expect(game).toBeNull();
  });

  it("15. should have deleted teams via cascade", async () => {
    const teams = await prisma.team.findMany({
      where: { gameId: cascadeGameId },
    });
    expect(teams).toHaveLength(0);
  });

  it("16. should have deleted rounds and decisions via cascade", async () => {
    const rounds = await prisma.round.findMany({
      where: { gameId: cascadeGameId },
    });
    expect(rounds).toHaveLength(0);

    // Decisions are orphaned now - they should also be cascade-deleted
    // via the Round and Team cascade deletes
    // Verify by checking there are no decisions referencing nonexistent rounds
    const allDecisions = await prisma.teamDecision.findMany();
    for (const d of allDecisions) {
      const round = await prisma.round.findUnique({ where: { id: d.roundId } });
      expect(round).not.toBeNull();
    }
  });
});

// ============================================
// UNIQUE CONSTRAINTS (tests 17-20)
// ============================================

describe("Unique Constraints", () => {
  let constraintFacilitatorId: string;
  let constraintGameId: string;
  let constraintJoinCode: string;

  beforeAll(async () => {
    // Set up a facilitator and game for constraint tests
    const publicCaller = createTestCaller({ prisma });
    const fac = await publicCaller.facilitator.register({
      email: "constraints@test.com",
      password: "securepassword123",
      name: "Constraint Facilitator",
    });
    constraintFacilitatorId = fac.id;

    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId: constraintFacilitatorId,
    });
    const gameResult = await facilitatorCaller.game.create({
      name: "Constraint Test Game",
      maxRounds: 4,
      complexitySettings: COMPLEXITY_SETTINGS,
    });
    constraintGameId = gameResult.game.id;
    constraintJoinCode = gameResult.joinCode;

    // Join first team
    await publicCaller.team.join({
      joinCode: constraintJoinCode,
      teamName: "UniqueTeam",
    });
  });

  it("17. should reject duplicate team name in same game", async () => {
    const publicCaller = createTestCaller({ prisma });

    await expect(
      publicCaller.team.join({
        joinCode: constraintJoinCode,
        teamName: "UniqueTeam",
      })
    ).rejects.toThrow();
  });

  it("18. should allow same team name in different games", async () => {
    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId: constraintFacilitatorId,
    });

    // Create a second game
    const game2Result = await facilitatorCaller.game.create({
      name: "Second Constraint Game",
      maxRounds: 4,
      complexitySettings: COMPLEXITY_SETTINGS,
    });

    const publicCaller = createTestCaller({ prisma });

    // Same team name "UniqueTeam" in a different game should succeed
    const result = await publicCaller.team.join({
      joinCode: game2Result.joinCode,
      teamName: "UniqueTeam",
    });

    expect(result).toBeDefined();
    expect(result.teamName).toBe("UniqueTeam");
    expect(result.gameId).toBe(game2Result.game.id);
  });

  it("19. should reject joining a game that is not in LOBBY status", async () => {
    // Seed a game directly with IN_PROGRESS status
    const facilitator = await seedFacilitator(prisma, {
      email: "notlobby@test.com",
    });
    const game = await seedGame(prisma, facilitator.id, {
      name: "In-Progress Game",
      status: "IN_PROGRESS",
    });

    const publicCaller = createTestCaller({ prisma });

    await expect(
      publicCaller.team.join({
        joinCode: game.joinCode,
        teamName: "LateTeam",
      })
    ).rejects.toThrow(/already started/);
  });

  it("20. should reject duplicate joinCode at the database level", async () => {
    const facilitator = await seedFacilitator(prisma, {
      email: "dupjoin@test.com",
    });

    // Create a game with a specific join code
    const existingGame = await seedGame(prisma, facilitator.id, {
      joinCode: "AAABBB",
    });
    expect(existingGame.joinCode).toBe("AAABBB");

    // Attempting to create another game with the same join code should throw
    await expect(
      seedGame(prisma, facilitator.id, { joinCode: "AAABBB" })
    ).rejects.toThrow();
  });
});

// ============================================
// EDGE CASES (tests 21-22)
// ============================================

describe("Edge Cases", () => {
  it("21. should reject starting a game with fewer than 2 teams", async () => {
    const publicCaller = createTestCaller({ prisma });

    // Register + create game
    const fac = await publicCaller.facilitator.register({
      email: "edge1@test.com",
      password: "securepassword123",
      name: "Edge Facilitator 1",
    });

    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId: fac.id,
    });

    const gameResult = await facilitatorCaller.game.create({
      name: "Too Few Teams Game",
      maxRounds: 4,
      complexitySettings: COMPLEXITY_SETTINGS,
    });

    // Join only 1 team
    await publicCaller.team.join({
      joinCode: gameResult.joinCode,
      teamName: "SoloTeam",
    });

    // Attempting to start should fail
    await expect(
      facilitatorCaller.game.start({ gameId: gameResult.game.id })
    ).rejects.toThrow(/at least 2 teams/);
  });

  it("22. should reject joining a game at max capacity (5 teams)", async () => {
    const publicCaller = createTestCaller({ prisma });

    const fac = await publicCaller.facilitator.register({
      email: "edge2@test.com",
      password: "securepassword123",
      name: "Edge Facilitator 2",
    });

    const facilitatorCaller = createTestCaller({
      prisma,
      facilitatorId: fac.id,
    });

    const gameResult = await facilitatorCaller.game.create({
      name: "Full Capacity Game",
      maxRounds: 4,
      complexitySettings: COMPLEXITY_SETTINGS,
    });

    // Join 5 teams (maximum)
    for (let i = 1; i <= 5; i++) {
      await publicCaller.team.join({
        joinCode: gameResult.joinCode,
        teamName: `Team-${i}`,
      });
    }

    // The 6th team should be rejected
    await expect(
      publicCaller.team.join({
        joinCode: gameResult.joinCode,
        teamName: "Team-6",
      })
    ).rejects.toThrow(/full/);
  });
});
