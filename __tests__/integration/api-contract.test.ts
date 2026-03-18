/**
 * API Contract Tests
 *
 * Validates Zod schema enforcement for all 5 decision modules and
 * input contracts for facilitator registration, game creation, and team joining.
 *
 * Schemas are tested via the tRPC caller — invalid payloads should throw
 * TRPCError with zodError data.
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

const TEST_ID = "api-contract";

let prisma: PrismaClient;
let teamCaller: ReturnType<typeof createTestCaller>;
let facilitatorCaller: ReturnType<typeof createTestCaller>;
let publicCaller: ReturnType<typeof createTestCaller>;

beforeAll(async () => {
  prisma = createTestPrisma(TEST_ID);
  await pushTestSchema(prisma);

  // Seed a facilitator, an in-progress game, a team, and a round
  const facilitator = await seedFacilitator(prisma);
  const game = await seedGame(prisma, facilitator.id, {
    status: "IN_PROGRESS",
    currentRound: 1,
  });
  await seedTeam(prisma, game.id, { sessionToken: "test-token" });
  await seedRound(prisma, game.id, 1, { status: "ACCEPTING_DECISIONS" });

  teamCaller = createTestCaller({ prisma, sessionToken: "test-token" });
  facilitatorCaller = createTestCaller({ prisma, facilitatorId: facilitator.id });
  publicCaller = createTestCaller({ prisma });
});

afterAll(async () => {
  await cleanupTestDb(prisma, TEST_ID);
});

// ============================================
// FACTORY MODULE
// ============================================
describe("FACTORY decision schema", () => {
  it("accepts valid factory input", async () => {
    const result = await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: VALID_DECISIONS.FACTORY,
    });

    expect(result.success).toBe(true);
    expect(result.module).toBe("FACTORY");
  });

  it("applies investment defaults (0) when fields are omitted", async () => {
    // Omit optional investment fields — defaults should apply
    const result = await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: {
        investments: {
          workerEfficiency: 500_000,
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("strips unknown fields from factory decisions", async () => {
    const result = await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: {
        ...VALID_DECISIONS.FACTORY,
        unknownField: "should be stripped",
        anotherUnknown: 42,
      },
    });

    expect(result.success).toBe(true);
  });
});

// ============================================
// FINANCE MODULE
// ============================================
describe("FINANCE decision schema", () => {
  it("accepts valid finance input", async () => {
    const result = await teamCaller.decision.submit({
      module: "FINANCE",
      decisions: VALID_DECISIONS.FINANCE,
    });

    expect(result.success).toBe(true);
    expect(result.module).toBe("FINANCE");
  });

  it("rejects negative issueTBills (min: 0)", async () => {
    try {
      await teamCaller.decision.submit({
        module: "FINANCE",
        decisions: {
          ...VALID_DECISIONS.FINANCE,
          issueTBills: -1000,
        },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      // DEFECT: schema.parse() inside handler throws raw ZodError → INTERNAL_SERVER_ERROR
      expect(trpcError.code).toBe("INTERNAL_SERVER_ERROR");
    }
  });

  it("applies defaults when optional fields are omitted", async () => {
    const result = await teamCaller.decision.submit({
      module: "FINANCE",
      decisions: {
        dividendPerShare: 0.1,
      },
    });

    expect(result.success).toBe(true);
  });
});

// ============================================
// HR MODULE
// ============================================
describe("HR decision schema", () => {
  it("accepts valid HR input", async () => {
    const result = await teamCaller.decision.submit({
      module: "HR",
      decisions: VALID_DECISIONS.HR,
    });

    expect(result.success).toBe(true);
    expect(result.module).toBe("HR");
  });

  it("rejects salary multiplier below 0.6", async () => {
    try {
      await teamCaller.decision.submit({
        module: "HR",
        decisions: {
          salaryMultiplierChanges: {
            workers: 0.3, // below 0.6 minimum
            engineers: 1.0,
            supervisors: 1.0,
          },
        },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      // DEFECT: schema.parse() inside handler throws raw ZodError → INTERNAL_SERVER_ERROR
      expect(trpcError.code).toBe("INTERNAL_SERVER_ERROR");
    }
  });

  it("rejects salary multiplier above 3.0", async () => {
    try {
      await teamCaller.decision.submit({
        module: "HR",
        decisions: {
          salaryMultiplierChanges: {
            workers: 1.0,
            engineers: 4.0, // above 3.0 maximum
            supervisors: 1.0,
          },
        },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      // DEFECT: schema.parse() inside handler throws raw ZodError → INTERNAL_SERVER_ERROR
      expect(trpcError.code).toBe("INTERNAL_SERVER_ERROR");
    }
  });

  it("rejects invalid role enum in hires", async () => {
    try {
      await teamCaller.decision.submit({
        module: "HR",
        decisions: {
          hires: [
            {
              factoryId: "default",
              role: "janitor", // not in enum
              candidateId: "cand-1",
            },
          ],
        },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      // DEFECT: schema.parse() inside handler throws raw ZodError → INTERNAL_SERVER_ERROR
      expect(trpcError.code).toBe("INTERNAL_SERVER_ERROR");
    }
  });
});

// ============================================
// MARKETING MODULE
// ============================================
describe("MARKETING decision schema", () => {
  it("accepts valid marketing input", async () => {
    const result = await teamCaller.decision.submit({
      module: "MARKETING",
      decisions: VALID_DECISIONS.MARKETING,
    });

    expect(result.success).toBe(true);
    expect(result.module).toBe("MARKETING");
  });

  it("rejects negative price in pricing array", async () => {
    try {
      await teamCaller.decision.submit({
        module: "MARKETING",
        decisions: {
          pricing: [
            {
              productId: "prod-1",
              segment: "General",
              price: -50, // negative price
            },
          ],
        },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      // DEFECT: schema.parse() inside handler throws raw ZodError → INTERNAL_SERVER_ERROR
      expect(trpcError.code).toBe("INTERNAL_SERVER_ERROR");
    }
  });
});

// ============================================
// RD MODULE
// ============================================
describe("RD decision schema", () => {
  it("accepts valid R&D input", async () => {
    const result = await teamCaller.decision.submit({
      module: "RD",
      decisions: VALID_DECISIONS.RD,
    });

    expect(result.success).toBe(true);
    expect(result.module).toBe("RD");
  });

  it("rejects invalid focus enum value", async () => {
    try {
      await teamCaller.decision.submit({
        module: "RD",
        decisions: {
          rdBudgetAllocation: [
            {
              productId: "main-product",
              budget: 2_000_000,
              focus: "magic", // not in enum
            },
          ],
        },
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      // DEFECT: schema.parse() inside handler throws raw ZodError → INTERNAL_SERVER_ERROR
      expect(trpcError.code).toBe("INTERNAL_SERVER_ERROR");
    }
  });
});

// ============================================
// FACILITATOR REGISTER
// ============================================
describe("Facilitator register input contract", () => {
  it("rejects invalid email format", async () => {
    try {
      await publicCaller.facilitator.register({
        email: "not-an-email",
        password: "password123",
        name: "Test User",
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
    }
  });

  it("rejects password shorter than 8 characters", async () => {
    try {
      await publicCaller.facilitator.register({
        email: "valid@example.com",
        password: "short",
        name: "Test User",
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
    }
  });

  it("accepts valid registration input", async () => {
    const result = await publicCaller.facilitator.register({
      email: "contract-test@example.com",
      password: "validpass123",
      name: "Contract Test",
    });

    expect(result.id).toBeDefined();
    expect(result.email).toBe("contract-test@example.com");
    expect(result.name).toBe("Contract Test");
  });
});

// ============================================
// GAME CREATE
// ============================================
describe("Game create input contract", () => {
  it("rejects empty name", async () => {
    try {
      await facilitatorCaller.game.create({
        name: "",
        maxRounds: 8,
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
    }
  });

  it("rejects maxRounds less than 4", async () => {
    try {
      await facilitatorCaller.game.create({
        name: "Test Game",
        maxRounds: 2,
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
    }
  });

  it("rejects maxRounds greater than 32", async () => {
    try {
      await facilitatorCaller.game.create({
        name: "Test Game",
        maxRounds: 50,
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
    }
  });
});

// ============================================
// TEAM JOIN
// ============================================
describe("Team join input contract", () => {
  let lobbyJoinCode: string;

  beforeAll(async () => {
    // Create a game in LOBBY status for team join tests
    const facilitator = await seedFacilitator(prisma, {
      email: "join-test-facilitator@example.com",
    });
    const lobbyGame = await seedGame(prisma, facilitator.id, {
      status: "LOBBY",
      joinCode: "TSTABC",
    });
    lobbyJoinCode = lobbyGame.joinCode;
  });

  it("rejects joinCode not exactly 6 characters", async () => {
    try {
      await publicCaller.team.join({
        joinCode: "ABC",
        teamName: "Test Team",
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
    }
  });

  it("rejects empty teamName", async () => {
    try {
      await publicCaller.team.join({
        joinCode: lobbyJoinCode,
        teamName: "",
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
    }
  });

  it("rejects teamName longer than 50 characters", async () => {
    try {
      await publicCaller.team.join({
        joinCode: lobbyJoinCode,
        teamName: "A".repeat(51),
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
    }
  });
});

// ============================================
// LAYER 0 — DECISION SAVE PIPELINE (DS-15 through DS-20)
// ============================================
describe("Decision Save Pipeline", () => {
  it("DS-15: submit saves factory decisions to DB", async () => {
    await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: VALID_DECISIONS.FACTORY,
    });

    const record = await prisma.teamDecision.findFirst({
      where: { module: "FACTORY" },
    });
    expect(record).not.toBeNull();
    expect(record!.module).toBe("FACTORY");
  });

  it("DS-16: upsert replaces previous submission", async () => {
    // First submission
    await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: VALID_DECISIONS.FACTORY,
    });

    // Second submission with different values
    await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: { ...VALID_DECISIONS.FACTORY, investments: { workerEfficiency: 999 } },
    });

    // Should be exactly 1 record, not 2
    const records = await prisma.teamDecision.findMany({
      where: { module: "FACTORY" },
    });
    expect(records.length).toBe(1);
  });

  it("DS-17: all 5 modules saved as separate records", async () => {
    // Submit all 5 modules
    for (const [module, decisions] of Object.entries(VALID_DECISIONS)) {
      await teamCaller.decision.submit({
        module: module as "FACTORY" | "FINANCE" | "HR" | "MARKETING" | "RD",
        decisions,
      });
    }

    const records = await prisma.teamDecision.findMany({});
    const modules = new Set(records.map(r => r.module));
    expect(modules.size).toBeGreaterThanOrEqual(5);
  });

  it("DS-18: lockAll blocks when module missing", async () => {
    // Create a fresh game/team with only 4 modules submitted
    const fac2 = await seedFacilitator(prisma);
    const game2 = await seedGame(prisma, fac2.id, { status: "IN_PROGRESS", currentRound: 1 });
    const team2 = await seedTeam(prisma, game2.id, { sessionToken: "lock-test-token" });
    await seedRound(prisma, game2.id, 1, { status: "ACCEPTING_DECISIONS" });
    const caller2 = createTestCaller({ prisma, sessionToken: "lock-test-token" });

    // Submit only 4 modules (missing RD)
    for (const module of ["FACTORY", "FINANCE", "HR", "MARKETING"] as const) {
      await caller2.decision.submit({ module, decisions: VALID_DECISIONS[module] });
    }

    try {
      await caller2.decision.lockAll();
      expect.fail("Should have thrown for missing module");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
    }
  });

  it("DS-19: lockAll succeeds when all 5 present", async () => {
    const fac3 = await seedFacilitator(prisma);
    const game3 = await seedGame(prisma, fac3.id, { status: "IN_PROGRESS", currentRound: 1 });
    const team3 = await seedTeam(prisma, game3.id, { sessionToken: "lock-all-token" });
    await seedRound(prisma, game3.id, 1, { status: "ACCEPTING_DECISIONS" });
    const caller3 = createTestCaller({ prisma, sessionToken: "lock-all-token" });

    // Submit all 5 modules
    for (const [module, decisions] of Object.entries(VALID_DECISIONS)) {
      await caller3.decision.submit({
        module: module as "FACTORY" | "FINANCE" | "HR" | "MARKETING" | "RD",
        decisions,
      });
    }

    const result = await caller3.decision.lockAll();
    expect(result.success).toBe(true);
    expect(result.lockedCount).toBe(5);

    // Verify DB state
    const locked = await prisma.teamDecision.findMany({
      where: { teamId: team3.id, isLocked: true },
    });
    expect(locked.length).toBe(5);
  });

  it("DS-20: getSubmitted returns saved decisions", async () => {
    const fac4 = await seedFacilitator(prisma);
    const game4 = await seedGame(prisma, fac4.id, { status: "IN_PROGRESS", currentRound: 1 });
    await seedTeam(prisma, game4.id, { sessionToken: "get-sub-token" });
    await seedRound(prisma, game4.id, 1, { status: "ACCEPTING_DECISIONS" });
    const caller4 = createTestCaller({ prisma, sessionToken: "get-sub-token" });

    await caller4.decision.submit({ module: "FACTORY", decisions: VALID_DECISIONS.FACTORY });
    await caller4.decision.submit({ module: "HR", decisions: VALID_DECISIONS.HR });

    const submitted = await caller4.decision.getSubmitted();
    expect(submitted.length).toBeGreaterThanOrEqual(2);
    const modules = submitted.map((s: { module: string }) => s.module);
    expect(modules).toContain("FACTORY");
    expect(modules).toContain("HR");
  });
});
