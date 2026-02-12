"use client";

import { GameLayout } from "@/components/game/GameLayout";
import { ComplexityProvider } from "@/lib/contexts/ComplexityContext";
import { getComplexitySettings } from "@/engine/types";
import { DEMO_GAME } from "./mockData";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const complexitySettings = getComplexitySettings(DEMO_GAME.complexityPreset);

  return (
    <ComplexityProvider settings={complexitySettings}>
      <GameLayout
        gameId={DEMO_GAME.gameId}
        gameName={DEMO_GAME.gameName}
        teamName={DEMO_GAME.teamName}
        teamColor={DEMO_GAME.teamColor}
        currentRound={DEMO_GAME.currentRound}
        maxRounds={DEMO_GAME.maxRounds}
        gameStatus={DEMO_GAME.gameStatus}
        complexityPreset={DEMO_GAME.complexityPreset}
      >
        {children}
      </GameLayout>
    </ComplexityProvider>
  );
}
