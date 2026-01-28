# Dev Quickstart Guide

## Starting the Dev Server

### Windows
```bash
# Double-click or run:
start-dev.bat

# Or manually:
cd src
npm run dev
```

### Mac/Linux
```bash
./start-dev.sh

# Or manually:
cd src
npm run dev
```

The server will start on **http://localhost:3000** (or 3001 if 3000 is in use).

---

## Quick Login (No Auth Required)

### Option 1: Dev Login Page (Recommended)
1. Go to **http://localhost:3000/dev-login**
2. Click "Login as Facilitator" or "Login as Team Player"
3. You'll be redirected automatically

### Option 2: Direct URLs
After using the dev-login page once, you can go directly to:

| Role | URL |
|------|-----|
| Facilitator (Admin) | http://localhost:3000/admin |
| Team Player | http://localhost:3000/game/test-game-001 |
| Join Page | http://localhost:3000/join |

---

## Test Data

The database is pre-seeded with:

| Item | Value |
|------|-------|
| **Facilitator Email** | admin@test.com |
| **Facilitator ID** | test-facilitator-001 |
| **Game Name** | Demo Business Simulation |
| **Join Code** | TEST01 |
| **Team Name** | Test Team Alpha |
| **Team Session** | test-team-token-001 |

---

## Re-seeding the Database

If you need to reset the test data:

```bash
cd src
npx tsx prisma/seed.ts
```

---

## Game Flow

1. **As Facilitator:**
   - Go to /admin
   - Click on the game "Demo Business Simulation"
   - Click "Start Game" to begin Round 1
   - Monitor team submissions
   - Click "Advance Round" when ready

2. **As Team Player:**
   - Go to /game/test-game-001
   - Navigate through the 5 modules (Factory, Finance, HR, Marketing, R&D)
   - Make decisions and submit
   - View results after facilitator advances the round

---

## Useful Commands

```bash
# Run tests
cd src
npm run test:run

# Run specific test
npm run test:run -- __tests__/e2e/game-flow.test.ts

# Build for production
npm run build

# Reset database
rm prisma/dev.db
npx prisma@5.22.0 db push
npx tsx prisma/seed.ts
```
