/**
 * Decision Save Pipeline — API Persistence Tests (DS-15 through DS-20)
 *
 * Standalone test file with its own DB lifecycle.
 * Validates that decision.submit persists to DB, upsert replaces,
 * all 5 modules save, lockAll guards, and getSubmitted reads back.
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

const TEST_ID = "api-persistence-final";

let prisma: PrismaClient;
let teamCaller: ReturnType<typeof createTestCaller>;
let teamId: string;
let gameId: string;

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
    sessionToken: "persist-test-token",
  });
  teamId = team.id;

  await seedRound(prisma, game.id, 1, { status: "ACCEPTING_DECISIONS" });

  teamCaller = createTestCaller({ prisma, sessionToken: "persist-test-token" });
});

afterAll(async () => {
  await cleanupTestDb(prisma, TEST_ID);
});

describe("Decision Save Pipeline", () => {
  // DS-15: submit saves to DB
  it("DS-15: submit saves factory decisions to DB", async () => {
    await teamCaller.decision.submit({
      module: "FACTORY",
      decisions: VALID_DECISIONS.FACTORY,
    });

    const record = await prisma.teamDecision.findFirst({
      where: { teamId, module: "FACTORY" },
    });
    expect(record).not.toBeNull();
    expect(record!.module).toBe("FACTORY");
  });

  // DS-16: upsert replaces previous submission
  it("DS-16: upsert replaces — second submission overwrites first", async () => {
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

    // Expect exactly 1 record matching second submission
    const records = await prisma.teamDecision.findMany({
      where: { teamId, module: "FACTORY" },
    });
    expect(records).toHaveLength(1);

    const saved = JSON.parse(records[0]!.decisions as string);
    expect(saved.investments.workerEfficiency).toBe(2_000_000);
  });

  // DS-17: all 5 modules saved as separate records
  it("DS-17: all 5 modules saved as separate records", async () => {
    for (const mod of ["FACTORY", "HR", "RD", "MARKETING", "FINANCE"] as const) {
      await teamCaller.decision.submit({
        module: mod,
        decisions: VALID_DECISIONS[mod],
      });
    }

    const records = await prisma.teamDecision.findMany({
      where: { teamId },
    });
    expect(records).toHaveLength(5);

    const modules = records.map((r: { module: string }) => r.module).sort();
    expect(modules).toEqual(["FACTORY", "FINANCE", "HR", "MARKETING", "RD"]);
  });

  // DS-18: lockAll blocks on missing module
  it("DS-18: lockAll blocks when a module is missing", async () => {
    // Fresh team with only 4 modules
    const partialTeam = await seedTeam(prisma, gameId, {
      sessionToken: "partial-lock-token",
    });
    const partialCaller = createTestCaller({
      prisma,
      sessionToken: "partial-lock-token",
    });

    for (const mod of ["FACTORY", "HR", "RD", "MARKETING"] as const) {
      await partialCaller.decision.submit({
        module: mod,
        decisions: VALID_DECISIONS[mod],
      });
    }

    try {
      await partialCaller.decision.lockAll();
      expect.fail("Should have thrown — FINANCE module missing");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      const trpcError = error as TRPCError;
      expect(trpcError.code).toBe("BAD_REQUEST");
      expect(trpcError.message.toLowerCase()).toContain("finance");
    }
  });

  // DS-19: lockAll succeeds when all 5 present
  it("DS-19: lockAll succeeds when all 5 modules submitted", async () => {
    const fullTeam = await seedTeam(prisma, gameId, {
      sessionToken: "full-lock-token",
    });
    const fullCaller = createTestCaller({
      prisma,
      sessionToken: "full-lock-token",
    });

    for (const mod of ["FACTORY", "HR", "RD", "MARKETING", "FINANCE"] as const) {
      await fullCaller.decision.submit({
        module: mod,
        decisions: VALID_DECISIONS[mod],
      });
    }

    const result = await fullCaller.decision.lockAll();
    expect(result).toEqual({ success: true, lockedCount: 5 });

    // Verify DB records are locked
    const records = await prisma.teamDecision.findMany({
      where: { teamId: fullTeam.id },
    });
    for (const record of records) {
      expect(record.isLocked).toBe(true);
    }
  });

  // DS-20: getSubmitted returns saved decisions
  it("DS-20: getSubmitted returns saved decisions", async () => {
    const getTeam = await seedTeam(prisma, gameId, {
      sessionToken: "get-sub-token",
    });
    const getCaller = createTestCaller({
      prisma,
      sessionToken: "get-sub-token",
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

    const modules = response.decisions.map((d: { module: string }) => d.module).sort();
    expect(modules).toEqual(["FACTORY", "HR"]);
  });
});
