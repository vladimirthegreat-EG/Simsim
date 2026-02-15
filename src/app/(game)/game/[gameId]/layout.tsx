"use client";

import { use, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameLayout } from "@/components/game/GameLayout";
import { trpc } from "@/lib/api/trpc";
import { toast } from "sonner";
import { ComplexityProvider } from "@/lib/contexts/ComplexityContext";
import { getComplexitySettings, GameComplexitySettings } from "@/engine/types";
import { useDecisionStore, type GameModule } from "@/lib/stores/decisionStore";
import { useTutorialStore } from "@/lib/stores/tutorialStore";
import {
  Users,
  Clock,
  Pause,
  Trophy,
  LogOut,
  Loader2,
  Gamepad2,
  Factory,
  DollarSign,
  Megaphone,
  Lightbulb,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}

export default function GamePageLayout({ children, params }: LayoutProps) {
  const { gameId } = use(params);
  const router = useRouter();

  const { data: session, isLoading: sessionLoading } = trpc.team.checkSession.useQuery();
  const { data: teamState, isLoading: stateLoading } = trpc.team.getMyState.useQuery(
    undefined,
    {
      enabled: session?.hasSession,
      refetchInterval: 3000, // Poll every 3 seconds for game state changes
    }
  );

  // Fetch submitted decisions for current round
  const { data: submittedDecisions } = trpc.decision.getSubmitted.useQuery(
    undefined,
    {
      enabled: session?.hasSession && teamState?.game?.status === "IN_PROGRESS",
    }
  );

  // Load submitted decisions into store
  const loadFromServer = useDecisionStore((s) => s.loadFromServer);
  const decisionsLoadedRef = useRef<string | null>(null); // Track which round's decisions we've loaded

  useEffect(() => {
    if (!submittedDecisions?.decisions || submittedDecisions.decisions.length === 0) return;

    // Create a key for this round's decisions to avoid reloading
    const roundKey = `round-${submittedDecisions.roundNumber}`;
    if (decisionsLoadedRef.current === roundKey) return;

    // Parse and load decisions into store
    const parsed = submittedDecisions.decisions.map((d) => ({
      module: d.module as GameModule,
      decisions: typeof d.decisions === "string" ? JSON.parse(d.decisions) : d.decisions,
      submittedAt: new Date(d.submittedAt),
      isLocked: d.isLocked,
    }));

    loadFromServer(parsed);
    decisionsLoadedRef.current = roundKey;
  }, [submittedDecisions, loadFromServer]);

  const leaveMutation = trpc.team.leave.useMutation({
    onSuccess: () => {
      toast.success("Left the game");
      router.push("/join");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Extract complexity settings from game config - must be called before any early returns
  const complexitySettings = useMemo(() => {
    if (!teamState?.game?.config) {
      return getComplexitySettings("standard");
    }
    try {
      const config = typeof teamState.game.config === 'string'
        ? JSON.parse(teamState.game.config)
        : teamState.game.config;
      if (config?.complexitySettings) {
        return config.complexitySettings as GameComplexitySettings;
      }
    } catch {
      // Ignore parse errors
    }
    // Default to standard complexity
    return getComplexitySettings("standard");
  }, [teamState?.game?.config]);

  // Auto-start tutorial on first load if game config includes a tutorial depth
  const tutorialStarted = useRef(false);
  useEffect(() => {
    if (tutorialStarted.current) return;
    if (!teamState?.game?.config) return;
    if (teamState.game.currentRound !== 1) return; // Only on round 1

    try {
      const config = typeof teamState.game.config === 'string'
        ? JSON.parse(teamState.game.config)
        : teamState.game.config;
      const depth = config?.tutorialDepth;
      if (depth === "medium" || depth === "full") {
        tutorialStarted.current = true;
        useTutorialStore.getState().startTutorial(depth);
      }
    } catch {
      // Ignore parse errors
    }
  }, [teamState?.game?.config, teamState?.game?.currentRound]);

  if (sessionLoading || stateLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!session?.hasSession) {
    router.push("/join");
    return null;
  }

  // Verify team is in the correct game
  if (teamState?.game.id !== gameId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">You are not part of this game</div>
          <Link href="/join">
            <Button>Join a Game</Button>
          </Link>
        </div>
      </div>
    );
  }

  const game = teamState.game;
  const team = teamState.team;

  // Show lobby view if game hasn't started
  if (game.status === "LOBBY") {
    const otherTeams = game.teams?.filter((t: { id: string }) => t.id !== team.id) || [];

    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-2xl mx-auto pt-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <Badge className="bg-yellow-500/20 text-yellow-400 mb-4">
              <Clock className="w-3 h-3 mr-1" />
              Waiting to Start
            </Badge>
            <h1 className="text-3xl font-bold text-white mb-2">{game.name}</h1>
            <p className="text-slate-400">Round {game.currentRound} of {game.maxRounds}</p>
          </div>

          {/* Your Team Card */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" />
                Your Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-white text-lg font-medium">{team.name}</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400">You</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Other Teams */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teams in Game ({(game.teams?.length || 0)}/5)
              </CardTitle>
              <CardDescription className="text-slate-400">
                Waiting for all teams to join...
              </CardDescription>
            </CardHeader>
            <CardContent>
              {otherTeams.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No other teams have joined yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {otherTeams.map((t: { id: string; name: string; color: string }) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-slate-300">{t.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* What to Expect */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">What to Expect</CardTitle>
              <CardDescription className="text-slate-400">
                Once the game starts, you&apos;ll manage these departments:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-orange-500/10 rounded-lg text-center">
                  <Factory className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                  <p className="text-orange-400 text-sm">Factory</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg text-center">
                  <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <p className="text-green-400 text-sm">Finance</p>
                </div>
                <div className="p-3 bg-pink-500/10 rounded-lg text-center">
                  <Megaphone className="w-6 h-6 text-pink-400 mx-auto mb-1" />
                  <p className="text-pink-400 text-sm">Marketing</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                  <Lightbulb className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                  <p className="text-purple-400 text-sm">R&D</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Waiting Animation */}
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Waiting for facilitator to start the game...</span>
            </div>
          </div>

          {/* Leave Button */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {leaveMutation.isPending ? "Leaving..." : "Leave Game"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show paused view
  if (game.status === "PAUSED") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 max-w-lg w-full">
          <CardHeader className="text-center">
            <Badge className="bg-orange-500/20 text-orange-400 mb-4 mx-auto">
              <Pause className="w-3 h-3 mr-1" />
              Paused
            </Badge>
            <CardTitle className="text-white text-2xl">Game Paused</CardTitle>
            <CardDescription className="text-slate-400">
              {game.name} - Round {game.currentRound}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-4">
                <Pause className="w-8 h-8 text-orange-400" />
              </div>
              <p className="text-slate-300">The facilitator has paused the game.</p>
              <p className="text-slate-400 text-sm mt-2">Decision submissions are temporarily disabled.</p>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-white">{team.name}</span>
                </div>
                <Badge className="bg-slate-600">Round {game.currentRound}</Badge>
              </div>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Waiting for game to resume...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show completed view
  if (game.status === "COMPLETED") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 max-w-lg w-full">
          <CardHeader className="text-center">
            <Badge className="bg-blue-500/20 text-blue-400 mb-4 mx-auto">
              <Trophy className="w-3 h-3 mr-1" />
              Complete
            </Badge>
            <CardTitle className="text-white text-2xl">Game Completed!</CardTitle>
            <CardDescription className="text-slate-400">
              {game.name} - {game.maxRounds} Rounds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 mb-4">
                <Trophy className="w-10 h-10 text-blue-400" />
              </div>
              <p className="text-slate-300">The simulation has ended.</p>
              <p className="text-slate-400 text-sm mt-2">Thank you for participating!</p>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="text-white">{team.name}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Link href="/">
                <Button variant="outline" className="border-slate-600">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Game is in progress - show full layout with complexity context
  return (
    <ComplexityProvider settings={complexitySettings}>
      <GameLayout
        gameId={gameId}
        gameName={game.name}
        teamName={team.name}
        teamColor={team.color}
        currentRound={game.currentRound}
        maxRounds={game.maxRounds}
        gameStatus={game.status}
        complexityPreset={complexitySettings.preset}
      >
        {children}
      </GameLayout>
    </ComplexityProvider>
  );
}
