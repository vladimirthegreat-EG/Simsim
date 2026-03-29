/**
 * Decision Save Pipeline Tests (DS-15 through DS-20)
 *
 * Extends the api-contract pattern to verify decision persistence:
 * submit saves to DB, upsert replaces, all 5 modules, lockAll guards,
 * lockAll success, and getSubmitted read-back.
 */

import "../../../__tests__/integration/helpers/next-headers-mock";

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
} from "../../../__tests__/integration/helpers/setup";

const TEST_ID = "decision-save-apple";

let prisma: PrismaClient;
let gameId: string;
let teamId: string;
let teamCaller: ReturnType<typeof createTestCaller>;

beforeAll(async () => {
  prisma = createTestPrisma(TEST_ID);
  await pushTestSchema(prisma);

  const facilitator = await seedFacilitator(prisma);
  const game = await seedGame(prisma, facilitator.id, {
    status: "IN_PROGRESS",
    currentRound: 1,
  });
  gameId = game.id;

  const team = await seedTeam(prisma, game.id, {
    sessionToken: "apple-test-token",
  });
  teamId = team.id;

  await seedRound(prisma, game.id, 1, { status: "ACCEPTING_DECISIONS" });

  teamCaller = createTestCaller({ prisma, sessionToken: "apple-test-token" });
});

afterAll(async () => {
  await cleanupTestDb(prisma, TEST_ID);
});

// ============================================
// DECISION SAVE PIPELINE (DS-15 through DS-20)
// ============================================
describe("Decision Save Pipeline", () => {
  // DS-15: submit saves to DB
  it("DS-15: submit saves factory decisions to DB", async () => {
    const result = await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: VALID_DECISIONS.FACTORY,
    });

    expect(result.success).toBe(true);

    const record = await prisma.teamDecision.findFirst({
      where: { teamId, module: "FACTORY" },
    });
    expect(record).not.toBeNull();
    expect(record!.module).toBe("FACTORY");
  });

  // DS-16: upsert replaces previous submission
  it("DS-16: submit upserts — second submission replaces first", async () => {
    // First submission
    await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: VALID_DECISIONS.FACTORY,
    });

    // Second submission with different values
    const updatedDecisions = {
      investments: {
        workerEfficiency: 2_000_000,
        supervisorEfficiency: 100_000,
        engineerEfficiency: 100_000,
        machineryEfficiency: 100_000,
        factoryEfficiency: 100_000,
      },
    };
    await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: updatedDecisions,
    });

    // Only 1 record should exist for FACTORY
    const records = await prisma.teamDecision.findMany({
      where: { teamId, module: "FACTORY" },
    });
    expect(records).toHaveLength(1);

    // Verify the record contains the second submission's data
    const stored = JSON.parse(records[0]!.decisions as string);
    expect(stored.investments.workerEfficiency).toBe(2_000_000);
  });

  // DS-17: all 5 modules saved as separate records
  it("DS-17: all 5 modules saved as separate records", async () => {
    for (const module of ["FACTORY", "HR", "RD", "MARKETING", "FINANCE"] as const) {
      await teamCaller.decision.submit({
        module,
        decisions: VALID_DECISIONS[module],
      });
    }

    const records = await prisma.teamDecision.findMany({
      where: { teamId },
    });

    const modules = records.map((r: { module: string }) => r.module);
    expect(modules).toContain("FACTORY");
    expect(modules).toContain("HR");
    expect(modules).toContain("RD");
    expect(modules).toContain("MARKETING");
    expect(modules).toContain("FINANCE");
    expect(records).toHaveLength(5);
  });

  // DS-18: lockAll blocks when a module is missing
  it("DS-18: lockAll blocks when any module is missing", async () => {
    // Create a fresh team that will only submit 4 modules
    const lockTeam = await seedTeam(prisma, gameId, {
      sessionToken: "apple-lock-missing-token",
    });
    const lockCaller = createTestCaller({
      prisma,
      sessionToken: "apple-lock-missing-token",
    });

    // Submit only 4 of 5 modules (skip FINANCE)
    for (const module of ["FACTORY", "HR", "RD", "MARKETING"] as const) {
      await lockCaller.decision.submit({
        module,
        decisions: VALID_DECISIONS[module],
      });
    }

    // lockAll should fail with BAD_REQUEST mentioning FINANCE
    try {
      await lockCaller.decision.lockAll();
      expect.fail("Should have thrown — FINANCE module missing");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
      expect(trpcError.message.toUpperCase()).toContain("FINANCE");
    }
  });

  // DS-19: lockAll succeeds when all 5 modules submitted
  it("DS-19: lockAll succeeds when all 5 modules submitted", async () => {
    const allTeam = await seedTeam(prisma, gameId, {
      sessionToken: "apple-lockall-success-token",
    });
    const allCaller = createTestCaller({
      prisma,
      sessionToken: "apple-lockall-success-token",
    });

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
    expect(records).toHaveLength(5);
    for (const record of records) {
      expect(record.isLocked).toBe(true);
    }
  });

  // DS-20: getSubmitted returns saved decisions with correct shape
  it("DS-20: getSubmitted returns saved decisions with module, submittedAt, isLocked", async () => {
    const getTeam = await seedTeam(prisma, gameId, {
      sessionToken: "apple-get-submitted-token",
    });
    const getCaller = createTestCaller({
      prisma,
      sessionToken: "apple-get-submitted-token",
    });

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
      expect(decision).toHaveProperty("isLocked");
      expect(["FACTORY", "HR"]).toContain(decision.module);
    }
  });
});
