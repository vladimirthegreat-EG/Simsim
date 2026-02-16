/**
 * Seed script to create test data for development
 * Run with: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create test facilitator
  const facilitator = await prisma.facilitator.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      id: "test-facilitator-001",
      email: "admin@test.com",
      name: "Test Admin",
      passwordHash: "test123", // Not a real hash, just for testing
    },
  });
  console.log("✅ Created facilitator:", facilitator.email);
  console.log("   ID:", facilitator.id);

  // Create a test game
  const game = await prisma.game.upsert({
    where: { joinCode: "TEST01" },
    update: {},
    create: {
      id: "test-game-001",
      name: "Demo Business Simulation",
      joinCode: "TEST01",
      status: "LOBBY",
      maxRounds: 8,
      facilitatorId: facilitator.id,
      config: JSON.stringify({
        startingCash: 200_000_000,
        startingFactories: 1,
        enabledModules: ["FACTORY", "FINANCE", "HR", "MARKETING", "RD"],
      }),
    },
  });
  console.log("✅ Created game:", game.name);
  console.log("   Join Code:", game.joinCode);

  // Create a test team
  const team = await prisma.team.upsert({
    where: { sessionToken: "test-team-token-001" },
    update: {},
    create: {
      id: "test-team-001",
      name: "Test Team Alpha",
      color: "#3B82F6",
      sessionToken: "test-team-token-001",
      gameId: game.id,
      currentState: JSON.stringify({
        cash: 200_000_000,
        revenue: 0,
        netIncome: 0,
        totalAssets: 250_000_000,
        totalLiabilities: 0,
        shareholdersEquity: 250_000_000,
        marketCap: 500_000_000,
        sharesIssued: 10_000_000,
        sharePrice: 50,
        eps: 0,
        factories: [{
          id: "factory-1",
          name: "Main Factory",
          region: "North America",
          segment: "General",
          productionLines: [{
            id: "line-1",
            segment: "General",
            productId: "initial-product",
            capacity: 50000,
            efficiency: 0.7,
          }],
          efficiency: 0.7,
          machines: 10,
          workers: 50,
          supervisors: 5,
          engineers: 8,
          defectRate: 0.05,
          shippingCost: 100000,
          storageCost: 50000,
          materialLevel: 1,
          upgrades: [],
          co2: 1000,
          greenInvestment: 0,
        }],
        workforce: {
          totalHeadcount: 63,
          averageMorale: 75,
          averageEfficiency: 0.7,
          laborCost: 5_000_000,
          turnoverRate: 0.12,
        },
        brandValue: 0.5,
        marketShare: {},
        products: [
          { id: "initial-product", name: "Standard Phone", segment: "General", price: 450, quality: 65, features: 50, reliability: 70, developmentRound: 0 },
          { id: "budget-product", name: "Budget Phone", segment: "Budget", price: 200, quality: 50, features: 30, reliability: 60, developmentRound: 0 },
          { id: "enthusiast-product", name: "Pro Phone", segment: "Enthusiast", price: 800, quality: 80, features: 70, reliability: 75, developmentRound: 0 },
          { id: "professional-product", name: "Enterprise Phone", segment: "Professional", price: 1250, quality: 90, features: 85, reliability: 90, developmentRound: 0 },
          { id: "active-product", name: "Active Phone", segment: "Active Lifestyle", price: 600, quality: 70, features: 60, reliability: 80, developmentRound: 0 },
        ],
        rdBudget: 0,
        patents: 0,
        esgScore: 100,
        co2Emissions: 1000,
      }),
    },
  });
  console.log("✅ Created team:", team.name);
  console.log("   Session Token:", team.sessionToken);

  console.log("\n========================================");
  console.log("🎮 ACCESS CREDENTIALS");
  console.log("========================================");
  console.log("\n📋 FACILITATOR (Admin Dashboard):");
  console.log("   URL: http://localhost:3000/admin");
  console.log("   Cookie: facilitator_id = test-facilitator-001");
  console.log("\n👥 TEAM PLAYER (Game Interface):");
  console.log("   URL: http://localhost:3000/game/test-game-001");
  console.log("   Cookie: session_token = test-team-token-001");
  console.log("\n🎯 JOIN A GAME:");
  console.log("   URL: http://localhost:3000/join");
  console.log("   Join Code: TEST01");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
