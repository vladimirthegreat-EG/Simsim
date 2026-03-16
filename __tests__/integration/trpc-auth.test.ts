/**
 * tRPC Authentication Middleware Tests
 *
 * Validates that publicProcedure, teamProcedure, and facilitatorProcedure
 * enforce correct authentication requirements across all protected endpoints.
 */

import "./helpers/next-headers-mock";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TRPCError } from "@trpc/server";
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

const TEST_ID = "trpc-auth";

let prisma: PrismaClient;
let facilitatorId: string;
let gameJoinCode: string;

beforeAll(async () => {
  prisma = createTestPrisma(TEST_ID);
  await pushTestSchema(prisma);

  // Seed full environment: facilitator, in-progress game, team, round
  const facilitator = await seedFacilitator(prisma);
  facilitatorId = facilitator.id;

  const game = await seedGame(prisma, facilitator.id, {
    status: "IN_PROGRESS",
    currentRound: 1,
    joinCode: "AUTH01",
  });
  gameJoinCode = game.joinCode;

  await seedTeam(prisma, game.id, { sessionToken: "valid-session-token" });
  await seedRound(prisma, game.id, 1, { status: "ACCEPTING_DECISIONS" });
});

afterAll(async () => {
  await cleanupTestDb(prisma, TEST_ID);
});

// ============================================
// PUBLIC PROCEDURES
// ============================================
describe("publicProcedure", () => {
  it("team.checkSession works without any auth tokens", async () => {
    const caller = createTestCaller({ prisma });
    const result = await caller.team.checkSession();

    expect(result.hasSession).toBe(false);
  });

  it("game.getByJoinCode works without auth", async () => {
    const caller = createTestCaller({ prisma });
    const result = await caller.game.getByJoinCode({ joinCode: gameJoinCode });

    expect(result.id).toBeDefined();
    expect(result.name).toBeDefined();
  });
});

// ============================================
// TEAM PROCEDURES
// ============================================
describe("teamProcedure", () => {
  it("team.getMyState rejects when no sessionToken is provided", async () => {
    const caller = createTestCaller({ prisma });

    try {
      await caller.team.getMyState();
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("team.getMyState rejects when sessionToken is invalid", async () => {
    const caller = createTestCaller({ prisma, sessionToken: "bogus-token-999" });

    try {
      await caller.team.getMyState();
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("team.getMyState succeeds with valid sessionToken", async () => {
    const caller = createTestCaller({ prisma, sessionToken: "valid-session-token" });
    const result = await caller.team.getMyState();

    expect(result.team).toBeDefined();
    expect(result.team.id).toBeDefined();
    expect(result.game).toBeDefined();
  });

  it("decision.submit rejects without auth", async () => {
    const caller = createTestCaller({ prisma });

    try {
      await caller.decision.submit({
        module: "FACTORY",
        decisions: VALID_DECISIONS.FACTORY,
      });
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("decision.getSubmitted rejects without auth", async () => {
    const caller = createTestCaller({ prisma });

    try {
      await caller.decision.getSubmitted();
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("decision.lockAll rejects without auth", async () => {
    const caller = createTestCaller({ prisma });

    try {
      await caller.decision.lockAll();
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});

// ============================================
// FACILITATOR PROCEDURES
// ============================================
describe("facilitatorProcedure", () => {
  it("game.create rejects when no facilitatorId is provided", async () => {
    const caller = createTestCaller({ prisma });

    try {
      await caller.game.create({ name: "Unauthed Game", maxRounds: 8 });
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("game.create rejects when facilitatorId is invalid", async () => {
    const caller = createTestCaller({
      prisma,
      facilitatorId: "nonexistent-facilitator-id",
    });

    try {
      await caller.game.create({ name: "Bad Auth Game", maxRounds: 8 });
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("game.create succeeds with valid facilitatorId", async () => {
    const caller = createTestCaller({ prisma, facilitatorId });
    const result = await caller.game.create({
      name: "Auth Test Game",
      maxRounds: 8,
    });

    expect(result.game).toBeDefined();
    expect(result.joinCode).toBeDefined();
    expect(result.joinCode).toHaveLength(6);
  });

  it("facilitator.me rejects without auth", async () => {
    const caller = createTestCaller({ prisma });

    try {
      await caller.facilitator.me();
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("facilitator.me succeeds with valid facilitatorId", async () => {
    const caller = createTestCaller({ prisma, facilitatorId });
    const result = await caller.facilitator.me();

    expect(result.id).toBe(facilitatorId);
    expect(result.email).toBeDefined();
    expect(result.name).toBeDefined();
  });

  it("facilitator.getDashboardStats rejects without auth", async () => {
    const caller = createTestCaller({ prisma });

    try {
      await caller.facilitator.getDashboardStats();
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("game.getFullState rejects without auth", async () => {
    const caller = createTestCaller({ prisma });

    try {
      await caller.game.getFullState({ gameId: "any-game-id" });
      expect.fail("Should have thrown UNAUTHORIZED");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("game.list succeeds with valid facilitatorId", async () => {
    const caller = createTestCaller({ prisma, facilitatorId });
    const result = await caller.game.list();

    expect(Array.isArray(result)).toBe(true);
    // Should contain at least the game we seeded
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
