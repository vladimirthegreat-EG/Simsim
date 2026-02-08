import { createTRPCRouter } from "./trpc";
import { gameRouter } from "./routers/game";
import { teamRouter } from "./routers/team";
import { decisionRouter } from "./routers/decision";
import { facilitatorRouter } from "./routers/facilitator";
import { materialRouter } from "./routers/material";
import { achievementRouter } from "./routers/achievement";

/**
 * This is the primary router for your server.
 *
 * All routers added in /server/api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  game: gameRouter,
  team: teamRouter,
  decision: decisionRouter,
  facilitator: facilitatorRouter,
  material: materialRouter,
  achievement: achievementRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
