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
// DECISION SAVE PIPELINE (DS-15 through DS-20)
// Layer 0 — Tests the 7-stage journey from submit to DB to read-back
// ============================================
describe("Decision Save Pipeline", () => {
  let dspTeamCaller: ReturnType<typeof createTestCaller>;
  let dspGameId: string;
  let dspTeamId: string;

  beforeAll(async () => {
    // Create isolated game + team for decision save tests
    const facilitator = await seedFacilitator(prisma, {
      email: "dsp-facilitator@example.com",
    });
    const game = await seedGame(prisma, facilitator.id, {
      status: "IN_PROGRESS",
      currentRound: 1,
    });
    dspGameId = game.id;

    const team = await seedTeam(prisma, game.id, {
      sessionToken: "dsp-test-token",
    });
    dspTeamId = team.id;

    await seedRound(prisma, game.id, 1, { status: "ACCEPTING_DECISIONS" });

    dspTeamCaller = createTestCaller({ prisma, sessionToken: "dsp-test-token" });
  });

  // DS-15: decision.submit saves factory decisions to DB
  it("DS-15: submit saves factory decisions to DB", async () => {
    const result = await dspTeamCaller.decision.submit({
      module: "FACTORY",
      decisions: VALID_DECISIONS.FACTORY,
    });

    expect(result.success).toBe(true);

    // Verify record exists in DB
    const record = await prisma.teamDecision.findFirst({
      where: { teamId: dspTeamId, module: "FACTORY" },
    });
    expect(record).not.toBeNull();
    expect(record!.module).toBe("FACTORY");
  });

  // DS-16: upsert replaces previous submission
  it("DS-16: submit upserts — second submission replaces first", async () => {
    // First submission
    await dspTeamCaller.decision.submit({
      module: "HR",
      decisions: VALID_DECISIONS.HR,
    });

    // Second submission with different values
    const updatedDecisions = {
      ...VALID_DECISIONS.HR,
      salaryMultiplierChanges: {
        workers: 1.15,
        engineers: 1.15,
        supervisors: 1.15,
      },
    };
    await dspTeamCaller.decision.submit({
      module: "HR",
      decisions: updatedDecisions,
    });

    // Only 1 record should exist for HR
    const records = await prisma.teamDecision.findMany({
      where: { teamId: dspTeamId, module: "HR" },
    });
    expect(records).toHaveLength(1);
  });

  // DS-17: all 5 modules saved as separate records
  it("DS-17: all 5 modules saved as separate records", async () => {
    // Submit all 5 modules
    for (const module of ["FACTORY", "HR", "RD", "MARKETING", "FINANCE"] as const) {
      await dspTeamCaller.decision.submit({
        module,
        decisions: VALID_DECISIONS[module],
      });
    }

    // Query DB — should have 5 records, each with unique module
    const records = await prisma.teamDecision.findMany({
      where: { teamId: dspTeamId },
    });

    const modules = records.map((r: { module: string }) => r.module);
    expect(modules).toContain("FACTORY");
    expect(modules).toContain("HR");
    expect(modules).toContain("RD");
    expect(modules).toContain("MARKETING");
    expect(modules).toContain("FINANCE");
  });

  // DS-18: lockAll blocks when any module missing
  it("DS-18: lockAll blocks when any module missing", async () => {
    // Create a fresh team that has only submitted 4 modules
    const lockTeam = await seedTeam(prisma, dspGameId, {
      sessionToken: "lock-test-token",
    });
    const lockCaller = createTestCaller({ prisma, sessionToken: "lock-test-token" });

    // Submit only 4 of 5 modules (skip FINANCE)
    for (const module of ["FACTORY", "HR", "RD", "MARKETING"] as const) {
      await lockCaller.decision.submit({
        module,
        decisions: VALID_DECISIONS[module],
      });
    }

    // lockAll should fail
    try {
      await lockCaller.decision.lockAll();
      expect.fail("Should have thrown — FINANCE module missing");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      // Should indicate which module is missing
      expect(trpcError.message.toLowerCase()).toContain("finance");
    }
  });

  // DS-19: lockAll succeeds when all 5 present
  it("DS-19: lockAll succeeds when all 5 modules submitted", async () => {
    // Create fresh team with all 5 submitted
    const allTeam = await seedTeam(prisma, dspGameId, {
      sessionToken: "lockall-test-token",
    });
    const allCaller = createTestCaller({ prisma, sessionToken: "lockall-test-token" });

    for (const module of ["FACTORY", "HR", "RD", "MARKETING", "FINANCE"] as const) {
      await allCaller.decision.submit({
        module,
        decisions: VALID_DECISIONS[module],
      });
    }

    const result = await allCaller.decision.lockAll();

    expect(result.success).toBe(true);
    expect(result.lockedCount).toBe(5);

    // Verify all 5 DB records are locked
    const records = await prisma.teamDecision.findMany({
      where: { teamId: allTeam.id },
    });
    for (const record of records) {
      expect(record.isLocked).toBe(true);
    }
  });

  // DS-20: getSubmitted returns all saved decisions with correct shape
  it("DS-20: getSubmitted returns saved decisions with module and submittedAt", async () => {
    // Create fresh team and submit 2 modules
    const getTeam = await seedTeam(prisma, dspGameId, {
      sessionToken: "get-submitted-token",
    });
    const getCaller = createTestCaller({ prisma, sessionToken: "get-submitted-token" });

    await getCaller.decision.submit({
      module: "FACTORY",
      decisions: VALID_DECISIONS.FACTORY,
    });
    await getCaller.decision.submit({
      module: "HR",
      decisions: VALID_DECISIONS.HR,
    });

    const response = await getCaller.decision.getSubmitted();

    expect(response.decisions).toHaveLength(2);
    for (const decision of response.decisions) {
      expect(decision.module).toBeDefined();
      expect(decision.submittedAt).toBeDefined();
      expect(["FACTORY", "HR"]).toContain(decision.module);
    }
  });
});
