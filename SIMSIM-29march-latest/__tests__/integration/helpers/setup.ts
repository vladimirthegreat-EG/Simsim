/**
 * Integration Test Infrastructure
 *
 * Provides isolated SQLite test databases, tRPC caller factories,
 * and seed helpers for all integration tests.
 *
 * PREREQUISITE: Run via `npm run test:integration` which handles
 * schema swap to SQLite before running tests.
 */

import { existsSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { createCallerFactory } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";

const ROOT = resolve(import.meta.dirname, "../../..");
const TEST_DB_DIR = join(ROOT, "prisma");

// ============================================
// DATABASE SETUP
// ============================================

function getTestDbPath(testId: string): string {
  return join(TEST_DB_DIR, `test-${testId}.db`);
}

/**
 * SQL to create all tables matching the SQLite Prisma schema.
 * Uses raw SQL to avoid prisma db push locking issues.
 */
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "Facilitator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "maxRounds" INTEGER NOT NULL DEFAULT 8,
    "config" TEXT NOT NULL DEFAULT '{}',
    "facilitatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    CONSTRAINT "Game_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "Facilitator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "currentState" TEXT NOT NULL DEFAULT '{}',
    "gameId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "marketState" TEXT NOT NULL DEFAULT '{}',
    "events" TEXT NOT NULL DEFAULT '[]',
    "simulationLog" TEXT,
    "gameId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submissionDeadline" DATETIME,
    "processedAt" DATETIME,
    CONSTRAINT "Round_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TeamDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "decisions" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    CONSTRAINT "TeamDecision_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamDecision_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RoundResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stateAfter" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "factoryResults" TEXT,
    "financeResults" TEXT,
    "hrResults" TEXT,
    "marketingResults" TEXT,
    "rdResults" TEXT,
    "rank" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoundResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoundResult_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Facilitator_email_key" ON "Facilitator"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Game_joinCode_key" ON "Game"("joinCode");
CREATE INDEX IF NOT EXISTS "Game_joinCode_idx" ON "Game"("joinCode");
CREATE INDEX IF NOT EXISTS "Game_facilitatorId_idx" ON "Game"("facilitatorId");
CREATE UNIQUE INDEX IF NOT EXISTS "Team_sessionToken_key" ON "Team"("sessionToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Team_gameId_name_key" ON "Team"("gameId", "name");
CREATE INDEX IF NOT EXISTS "Team_sessionToken_idx" ON "Team"("sessionToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Round_gameId_roundNumber_key" ON "Round"("gameId", "roundNumber");
CREATE INDEX IF NOT EXISTS "Round_gameId_status_idx" ON "Round"("gameId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "TeamDecision_teamId_roundId_module_key" ON "TeamDecision"("teamId", "roundId", "module");
CREATE INDEX IF NOT EXISTS "TeamDecision_roundId_module_idx" ON "TeamDecision"("roundId", "module");
CREATE UNIQUE INDEX IF NOT EXISTS "RoundResult_teamId_roundId_key" ON "RoundResult"("teamId", "roundId");
CREATE INDEX IF NOT EXISTS "RoundResult_roundId_idx" ON "RoundResult"("roundId");
`;

/**
 * Create an isolated PrismaClient with initialized schema.
 */
export function createTestPrisma(testId: string): PrismaClient {
  const dbPath = getTestDbPath(testId);
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const p = dbPath + suffix;
    if (existsSync(p)) unlinkSync(p);
  }
  return new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
    log: [],
  });
}

/**
 * Create all tables in the test database using raw SQL.
 */
export async function pushTestSchema(prisma: PrismaClient): Promise<void> {
  const statements = CREATE_TABLES_SQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
}

/**
 * Disconnect prisma and delete the test database file.
 */
export async function cleanupTestDb(
  prisma: PrismaClient,
  testId: string,
): Promise<void> {
  await prisma.$disconnect();
  const dbPath = getTestDbPath(testId);
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const p = dbPath + suffix;
    if (existsSync(p)) unlinkSync(p);
  }
}

// ============================================
// TRPC CONTEXT + CALLER
// ============================================

export interface TestContextOptions {
  prisma: PrismaClient;
  sessionToken?: string;
  facilitatorId?: string;
}

export function createTestContext(opts: TestContextOptions) {
  return {
    prisma: opts.prisma,
    sessionToken: opts.sessionToken,
    facilitatorId: opts.facilitatorId,
    headers: undefined,
  };
}

const callerFactory = createCallerFactory(appRouter);

export function createTestCaller(opts: TestContextOptions) {
  return callerFactory(createTestContext(opts));
}

// ============================================
// SEED HELPERS
// ============================================

export async function seedFacilitator(
  prisma: PrismaClient,
  overrides: Partial<{ email: string; name: string; passwordHash: string }> = {},
) {
  return prisma.facilitator.create({
    data: {
      email: overrides.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      name: overrides.name ?? "Test Facilitator",
      passwordHash: overrides.passwordHash ?? "test-hash-not-real",
    },
  });
}

export async function seedGame(
  prisma: PrismaClient,
  facilitatorId: string,
  overrides: Partial<{
    name: string;
    joinCode: string;
    status: string;
    maxRounds: number;
    currentRound: number;
    config: string;
  }> = {},
) {
  return prisma.game.create({
    data: {
      name: overrides.name ?? "Test Game",
      joinCode: overrides.joinCode ?? generateTestJoinCode(),
      status: overrides.status ?? "LOBBY",
      maxRounds: overrides.maxRounds ?? 8,
      currentRound: overrides.currentRound ?? 0,
      config: overrides.config ?? "{}",
      facilitatorId,
    },
  });
}

export async function seedTeam(
  prisma: PrismaClient,
  gameId: string,
  overrides: Partial<{
    name: string;
    color: string;
    sessionToken: string;
    currentState: string;
  }> = {},
) {
  return prisma.team.create({
    data: {
      name: overrides.name ?? `Team-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      color: overrides.color ?? "#3B82F6",
      gameId,
      ...(overrides.sessionToken && { sessionToken: overrides.sessionToken }),
      ...(overrides.currentState && { currentState: overrides.currentState }),
    },
  });
}

export async function seedRound(
  prisma: PrismaClient,
  gameId: string,
  roundNumber: number,
  overrides: Partial<{ status: string; marketState: string }> = {},
) {
  return prisma.round.create({
    data: {
      gameId,
      roundNumber,
      status: overrides.status ?? "ACCEPTING_DECISIONS",
      marketState: overrides.marketState ?? "{}",
    },
  });
}

// ============================================
// UTILITIES
// ============================================

let joinCodeCounter = 0;

function generateTestJoinCode(): string {
  joinCodeCounter++;
  const base = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  let n = Date.now() + joinCodeCounter;
  for (let i = 0; i < 6; i++) {
    code += base[n % base.length];
    n = Math.floor(n / base.length);
  }
  return code;
}

export const VALID_DECISIONS = {
  FACTORY: {
    investments: {
      workerEfficiency: 1_000_000,
      supervisorEfficiency: 500_000,
      engineerEfficiency: 500_000,
      machineryEfficiency: 500_000,
      factoryEfficiency: 1_000_000,
    },
  },
  FINANCE: {
    issueTBills: 0,
    issueBonds: 5_000_000,
    dividendPerShare: 0.05,
    sharesBuyback: 0,
  },
  HR: {
    salaryMultiplierChanges: {
      workers: 1.1,
      engineers: 1.15,
      supervisors: 1.1,
    },
  },
  MARKETING: {
    marketingBudget: [
      { segment: "General", region: "North America", spend: 2_000_000, campaignType: "awareness" },
    ],
    positioningStrategy: "balanced",
  },
  RD: {
    rdBudgetAllocation: [
      { productId: "main-product", budget: 4_000_000, focus: "innovation" as const },
    ],
  },
} as const;

export const STANDARD_COMPLEXITY = {
  preset: "standard" as const,
  modules: { factory: true, hr: true, finance: true, marketing: true, rd: true, esg: false },
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
  automation: { autoHire: false, autoTrain: false, autoInvest: false, autoPrice: false },
  difficulty: {
    startingCash: 200_000_000,
    marketVolatility: 0.5,
    competitorStrength: 0.5,
    economicStability: 0.7,
  },
};
