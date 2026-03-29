/**
 * Full Round-Trip Test: decisions flow through to differentiated results
 *
 * Standalone integration test following the mini-tournament.test.ts pattern.
 * Two teams (skilled vs passive) submit decisions via tRPC, lock them,
 * and the facilitator advances the round. Asserts that:
 *   - Round status is COMPLETED
 *   - Both teams have revenue > 0 (no $0 revenue bug)
 *   - No NaN in any financial field
 *   - Team 1 (skilled) has higher revenue than Team 2 (passive)
 */

import "../../../__tests__/integration/helpers/next-headers-mock";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  createTestPrisma,
  pushTestSchema,
  cleanupTestDb,
  createTestCaller,
  VALID_DECISIONS,
} from "../../../__tests__/integration/helpers/setup";

const TEST_ID = "round-trip-final";

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = createTestPrisma(TEST_ID);
  await pushTestSchema(prisma);
});

afterAll(async () => {
  await cleanupTestDb(prisma, TEST_ID);
});

describe("Full round-trip: decisions flow through to differentiated results", { timeout: 30_000 }, () => {
  const email = "roundtrip-final@test.com";
  const password = "securepassword123";
  const name = "Round-Trip Facilitator";

  let facilitatorId: string;
  let gameId: string;
  let joinCode: string;

  let skilledTeam: { id: string; sessionToken: string };
  let passiveTeam: { id: string; sessionToken: string };

  // --------------------------------------------------
  // Step 1: Register facilitator, create a game
  // --------------------------------------------------
  it("Step 1: register facilitator and create game", async () => {
    const publicCaller = createTestCaller({ prisma });

    const facilitator = await publicCaller.facilitator.register({
      email,
      password,
      name,
    });
    expect(facilitator).toBeDefined();
    expect(facilitator.id).toBeDefined();
    facilitatorId = facilitator.id;

    const facilitatorCaller = createTestCaller({ prisma, facilitatorId });
    const gameResult = await facilitatorCaller.game.create({
      name: "Round-Trip Final Test",
      maxRounds: 4,
    });

    expect(gameResult).toBeDefined();
    expect(gameResult.game.id).toBeDefined();
    gameId = gameResult.game.id;
    joinCode = gameResult.joinCode;
  });

  // --------------------------------------------------
  // Step 2: Two teams join
  // --------------------------------------------------
  it("Step 2: two teams join the game", async () => {
    const publicCaller = createTestCaller({ prisma });

    // Team 1: Skilled
    const t1 = await publicCaller.team.join({ joinCode, teamName: "Skilled Team" });
    expect(t1).toBeDefined();
    expect(t1.teamId).toBeDefined();
    expect(t1.gameId).toBe(gameId);
    const t1Record = await prisma.team.findFirst({ where: { name: "Skilled Team", gameId } });
    expect(t1Record).not.toBeNull();
    skilledTeam = { id: t1.teamId, sessionToken: t1Record!.sessionToken };

    // Team 2: Passive
    const t2 = await publicCaller.team.join({ joinCode, teamName: "Passive Team" });
    expect(t2).toBeDefined();
    expect(t2.teamId).toBeDefined();
    expect(t2.gameId).toBe(gameId);
    const t2Record = await prisma.team.findFirst({ where: { name: "Passive Team", gameId } });
    expect(t2Record).not.toBeNull();
    passiveTeam = { id: t2.teamId, sessionToken: t2Record!.sessionToken };

    // Start the game
    const facilitatorCaller = createTestCaller({ prisma, facilitatorId });
    const startResult = await facilitatorCaller.game.start({ gameId });
    expect(startResult.success).toBe(true);
  });

  // --------------------------------------------------
  // Step 3: Both teams submit all 5 modules
  // --------------------------------------------------
  it("Step 3: both teams submit all 5 decision modules", async () => {
    // Team 1 (skilled): R&D budget=$8M, factory efficiency=$3M, marketing General=$3M, HR salary=1.1x
    const skilledCaller = createTestCaller({ prisma, sessionToken: skilledTeam.sessionToken });

    await skilledCaller.decision.submit({
      module: "RD",
      decisions: {
        rdBudgetAllocation: [
          { productId: "main-product", budget: 8_000_000, focus: "innovation" as const },
        ],
      },
    });

    await skilledCaller.decision.submit({
      module: "FACTORY",
      decisions: {
        investments: {
          workerEfficiency: 3_000_000,
          supervisorEfficiency: 1_000_000,
          engineerEfficiency: 1_000_000,
          machineryEfficiency: 1_000_000,
          factoryEfficiency: 3_000_000,
        },
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
      module: "HR",
      decisions: {
        salaryMultiplierChanges: { workers: 1.10, engineers: 1.10, supervisors: 1.10 },
      },
    });

    await skilledCaller.decision.submit({
      module: "FINANCE",
      decisions: VALID_DECISIONS.FINANCE,
    });

    // Team 2 (passive): R&D budget=$500K, factory efficiency=$0, marketing=$0, HR salary=1.0x
    const passiveCaller = createTestCaller({ prisma, sessionToken: passiveTeam.sessionToken });

    await passiveCaller.decision.submit({
      module: "RD",
      decisions: {
        rdBudgetAllocation: [
          { productId: "main-product", budget: 500_000, focus: "innovation" as const },
        ],
      },
    });

    await passiveCaller.decision.submit({
      module: "FACTORY",
      decisions: {
        investments: {
          workerEfficiency: 0,
          supervisorEfficiency: 0,
          engineerEfficiency: 0,
          machineryEfficiency: 0,
          factoryEfficiency: 0,
        },
      },
    });

    await passiveCaller.decision.submit({
      module: "MARKETING",
      decisions: {
        marketingBudget: [],
        positioningStrategy: "balanced",
      },
    });

    await passiveCaller.decision.submit({
      module: "HR",
      decisions: {
        salaryMultiplierChanges: { workers: 1.00, engineers: 1.00, supervisors: 1.00 },
      },
    });

    await passiveCaller.decision.submit({
      module: "FINANCE",
      decisions: VALID_DECISIONS.FINANCE,
    });
  });

  // --------------------------------------------------
  // Step 4: Both teams lock all decisions
  // --------------------------------------------------
  it("Step 4: both teams lock all decisions", async () => {
    const skilledCaller = createTestCaller({ prisma, sessionToken: skilledTeam.sessionToken });
    const passiveCaller = createTestCaller({ prisma, sessionToken: passiveTeam.sessionToken });

    const lock1 = await skilledCaller.decision.lockAll();
    expect(lock1.success).toBe(true);
    expect(lock1.lockedCount).toBe(5);

    const lock2 = await passiveCaller.decision.lockAll();
    expect(lock2.success).toBe(true);
    expect(lock2.lockedCount).toBe(5);
  });

  // --------------------------------------------------
  // Step 5: Facilitator advances the round
  // --------------------------------------------------
  it("Step 5: facilitator advances round and results are correct", async () => {
    const facilitatorCaller = createTestCaller({ prisma, facilitatorId });
    const result = await facilitatorCaller.game.advanceRound({ gameId });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.roundNumber).toBe(2);

    // --- Assert: Round status is COMPLETED ---
    const round1 = await prisma.round.findFirst({ where: { gameId, roundNumber: 1 } });
    expect(round1).not.toBeNull();
    expect(round1!.status).toBe("COMPLETED");

    // --- Assert: Both teams have RoundResult records ---
    const roundResults = await prisma.roundResult.findMany({
      where: { roundId: round1!.id },
    });
    expect(roundResults).toHaveLength(2);

    // --- Assert: Both teams have revenue > 0 (no $0 revenue bug) ---
    // --- Assert: No NaN in any financial field ---
    for (const rr of roundResults) {
      const metrics = JSON.parse(rr.metrics);

      // Revenue must be > 0
      expect(metrics.revenue).toBeGreaterThan(0);

      // No NaN in financial fields
      expect(isFinite(metrics.revenue)).toBe(true);
      expect(isFinite(metrics.netIncome)).toBe(true);
      if (metrics.eps !== undefined && metrics.eps !== null) {
        expect(isFinite(metrics.eps)).toBe(true);
      }
      if (metrics.cash !== undefined) {
        expect(isFinite(metrics.cash)).toBe(true);
      }
    }

    // Also verify team states in DB
    for (const team of [skilledTeam, passiveTeam]) {
      const teamRecord = await prisma.team.findUnique({ where: { id: team.id } });
      expect(teamRecord).not.toBeNull();

      const state = JSON.parse(teamRecord!.currentState);
      expect(state.revenue).toBeGreaterThan(0);
      expect(isFinite(state.revenue)).toBe(true);
      expect(isFinite(state.netIncome)).toBe(true);
      if (state.eps !== undefined && state.eps !== null) {
        expect(isFinite(state.eps)).toBe(true);
      }
      expect(isFinite(state.cash)).toBe(true);
    }

    // --- Assert: Team 1 (skilled) has higher revenue than Team 2 (passive) ---
    const skilledRecord = await prisma.team.findUnique({ where: { id: skilledTeam.id } });
    const passiveRecord = await prisma.team.findUnique({ where: { id: passiveTeam.id } });

    const skilledState = JSON.parse(skilledRecord!.currentState);
    const passiveState = JSON.parse(passiveRecord!.currentState);

    expect(skilledState.revenue).toBeGreaterThan(passiveState.revenue);
  });
});
