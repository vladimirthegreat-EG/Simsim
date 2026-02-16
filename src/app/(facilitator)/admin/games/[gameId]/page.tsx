"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/api/trpc";
import { toast } from "sonner";
import {
  Users,
  Play,
  Pause,
  SkipForward,
  Copy,
  CheckCircle2,
  Clock,
  Trophy,
  RefreshCw,
  ArrowLeft,
  Zap,
  History,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  BarChart3,
  CircleDot,
} from "lucide-react";
import { EventInjectionPanel } from "@/components/facilitator";
import { TeamDetailPanel } from "@/components/facilitator";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

const MODULES = ["FACTORY", "FINANCE", "HR", "MARKETING", "RD"] as const;

export default function GameControlPage({ params }: PageProps) {
  const { gameId } = use(params);
  const router = useRouter();
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [pendingEvents, setPendingEvents] = useState<Array<{
    type: string;
    title: string;
    description: string;
    effects: Array<{ target: string; modifier: number }>;
    targetTeams: string[] | "all";
  }>>([]);

  const { data: session, isLoading: sessionLoading } = trpc.facilitator.checkSession.useQuery();
  const { data: game, isLoading: gameLoading, refetch } = trpc.game.getFullState.useQuery(
    { gameId },
    {
      enabled: session?.hasSession,
      refetchInterval: 5000,
    }
  );

  const startGame = trpc.game.start.useMutation({
    onSuccess: () => {
      toast.success("Game started! Round 1 is now active.");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const advanceRound = trpc.game.advanceRound.useMutation({
    onSuccess: (data) => {
      if (data.gameCompleted) {
        toast.success("Game completed!");
      } else {
        toast.success(`Advanced to Round ${data.roundNumber}`);
      }
      setPendingEvents([]);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const togglePause = trpc.game.togglePause.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "PAUSED" ? "Game paused" : "Game resumed");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const copyJoinCode = () => {
    if (game?.joinCode) {
      navigator.clipboard.writeText(game.joinCode);
      toast.success("Join code copied to clipboard!");
    }
  };

  const handleInjectEvent = (event: typeof pendingEvents[0]) => {
    setPendingEvents([...pendingEvents, event]);
    toast.success(`Event "${event.title}" queued for next round`);
  };

  const removeEvent = (index: number) => {
    setPendingEvents(pendingEvents.filter((_, i) => i !== index));
  };

  const handleAdvanceWithEvents = () => {
    advanceRound.mutate({
      gameId,
      events: pendingEvents.length > 0 ? pendingEvents : undefined,
    });
  };

  if (sessionLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading game...</span>
        </div>
      </div>
    );
  }

  if (!session?.hasSession) {
    router.push("/login");
    return null;
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-8 h-8 text-slate-600" />
          </div>
          <div className="text-white text-xl font-semibold mb-2">Game not found</div>
          <p className="text-slate-500 text-sm mb-6">This game may have been deleted or the link is invalid.</p>
          <Link href="/admin">
            <Button className="bg-purple-600 hover:bg-purple-500 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { color: string; bg: string; glow: string; gradient: string; icon: React.ReactNode; label: string }> = {
    LOBBY: { color: "text-amber-400", bg: "bg-amber-500/15", glow: "shadow-amber-500/10", gradient: "from-amber-500/10 via-transparent to-transparent", icon: <Clock className="w-4 h-4" />, label: "Lobby" },
    IN_PROGRESS: { color: "text-emerald-400", bg: "bg-emerald-500/15", glow: "shadow-emerald-500/10", gradient: "from-emerald-500/10 via-transparent to-transparent", icon: <Play className="w-4 h-4" />, label: "In Progress" },
    PAUSED: { color: "text-orange-400", bg: "bg-orange-500/15", glow: "shadow-orange-500/10", gradient: "from-orange-500/10 via-transparent to-transparent", icon: <Pause className="w-4 h-4" />, label: "Paused" },
    COMPLETED: { color: "text-blue-400", bg: "bg-blue-500/15", glow: "shadow-blue-500/10", gradient: "from-blue-500/10 via-transparent to-transparent", icon: <Trophy className="w-4 h-4" />, label: "Completed" },
  };
  const status = statusConfig[game.status] || statusConfig.LOBBY;

  // Calculate submission progress
  const totalModules = MODULES.length;

  const teamSubmissions = game.teams.map((team) => {
    const submittedCount = team.decisions.filter((d) =>
      MODULES.includes(d.module as typeof MODULES[number])
    ).length;
    return {
      ...team,
      submittedCount,
      progress: (submittedCount / totalModules) * 100,
    };
  });

  const allTeamsFullySubmitted = teamSubmissions.every(
    (team) => team.submittedCount === totalModules
  );

  const totalSubmissions = teamSubmissions.reduce(
    (sum, team) => sum + team.submittedCount,
    0
  );
  const maxSubmissions = game.teams.length * totalModules;
  const overallProgress = maxSubmissions > 0 ? (totalSubmissions / maxSubmissions) * 100 : 0;

  // Build round history from real RoundResult data
  const roundHistory = (game.rounds ?? [])
    .filter((round) => round.status === "COMPLETED" && round.results.length > 0)
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => ({
      roundNumber: round.roundNumber,
      rankings: round.results
        .map((result) => {
          const metrics = JSON.parse(result.metrics) as Record<string, unknown>;
          const ms = typeof metrics.marketShare === "object" && metrics.marketShare
            ? Object.values(metrics.marketShare as Record<string, number>).reduce((a, b) => a + b, 0) /
              Math.max(1, Object.keys(metrics.marketShare as Record<string, number>).length)
            : (metrics.marketShare as number) || 0;
          return {
            teamId: result.teamId,
            teamName: result.team.name,
            teamColor: result.team.color,
            rank: result.rank,
            revenue: (metrics.revenue as number) || 0,
            netIncome: (metrics.netIncome as number) || 0,
            marketShare: ms,
            eps: (metrics.eps as number) || 0,
          };
        })
        .sort((a, b) => a.rank - b.rank),
      events: JSON.parse(round.events || "[]") as Array<{ type: string; title: string }>,
      processedAt: round.processedAt,
    }));

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="relative border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <div className={`absolute inset-0 bg-gradient-to-r ${status.gradient}`} />
        <div className="relative max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
              <div className="w-px h-6 bg-slate-800" />
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{game.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={copyJoinCode}
                    className="group flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 group-hover:border-slate-600 transition-colors">
                      {game.joinCode}
                    </span>
                    <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <span className="text-slate-700">|</span>
                  <span className="text-slate-500 text-sm">Round {game.currentRound}/{game.maxRounds}</span>
                </div>
              </div>
            </div>
            <Badge className={`${status.bg} ${status.color} border-0 text-sm px-3 py-1.5 flex items-center gap-1.5 shadow-lg ${status.glow}`}>
              {status.icon}
              {status.label}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-50" />
            <div className="relative flex items-center gap-3">
              <div className="bg-blue-500/15 rounded-lg p-2.5">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Teams</p>
                <p className="text-2xl font-bold text-white">{game.teams.length}</p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50" />
            <div className="relative flex items-center gap-3">
              <div className="bg-emerald-500/15 rounded-lg p-2.5">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Round</p>
                <p className="text-2xl font-bold text-white">{game.currentRound} <span className="text-sm font-normal text-slate-500">/ {game.maxRounds}</span></p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-50" />
            <div className="relative flex items-center gap-3">
              <div className="bg-purple-500/15 rounded-lg p-2.5">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Submissions</p>
                <p className="text-2xl font-bold text-white">{totalSubmissions} <span className="text-sm font-normal text-slate-500">/ {maxSubmissions}</span></p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50" />
            <div className="relative">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Progress</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <span className="text-white font-bold text-sm min-w-[3ch]">{Math.round(overallProgress)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                Game Controls
                <button
                  onClick={() => refetch()}
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {game.status === "LOBBY" && "Waiting for teams to join..."}
                {game.status === "IN_PROGRESS" && "Teams are making decisions for this round."}
                {game.status === "PAUSED" && "Game is paused. Teams cannot submit decisions."}
                {game.status === "COMPLETED" && "This game has ended."}
              </p>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              {game.status === "LOBBY" && (
                <Button
                  onClick={() => startGame.mutate({ gameId })}
                  disabled={startGame.isPending || game.teams.length < 2}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20 gap-2 transition-all duration-300"
                >
                  <Play className="w-4 h-4" />
                  {startGame.isPending ? "Starting..." : "Start Game"}
                </Button>
              )}

              {game.status === "IN_PROGRESS" && (
                <>
                  <Button
                    onClick={handleAdvanceWithEvents}
                    disabled={advanceRound.isPending}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/20 gap-2 transition-all duration-300"
                  >
                    <SkipForward className="w-4 h-4" />
                    {advanceRound.isPending ? "Processing..." : "Advance Round"}
                    {pendingEvents.length > 0 && (
                      <Badge className="ml-1 bg-amber-500/90 text-white border-0 text-xs">
                        +{pendingEvents.length}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    onClick={() => togglePause.mutate({ gameId })}
                    disabled={togglePause.isPending}
                    variant="outline"
                    className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60 gap-2 transition-all"
                  >
                    <Pause className="w-4 h-4" />
                    Pause Game
                  </Button>
                </>
              )}

              {game.status === "PAUSED" && (
                <Button
                  onClick={() => togglePause.mutate({ gameId })}
                  disabled={togglePause.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20 gap-2 transition-all duration-300"
                >
                  <Play className="w-4 h-4" />
                  Resume Game
                </Button>
              )}

              {game.status === "COMPLETED" && (
                <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-4 py-2 rounded-lg">
                  <Trophy className="w-5 h-5" />
                  <span className="font-medium">Game Complete</span>
                </div>
              )}
            </div>

            {/* Pending Events Display */}
            {pendingEvents.length > 0 && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <div className="text-amber-400 text-sm font-medium mb-2.5 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Queued Events for Next Round
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingEvents.map((event, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-amber-500/40 text-amber-400 cursor-pointer hover:bg-amber-500/10 transition-colors gap-1"
                      onClick={() => removeEvent(idx)}
                    >
                      {event.title}
                      <span className="text-amber-500/60 ml-0.5">x</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {game.status === "LOBBY" && game.teams.length < 2 && (
              <p className="text-amber-400/80 text-sm flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-4 py-3">
                <Clock className="w-4 h-4 flex-shrink-0" />
                Need at least 2 teams to start the game
              </p>
            )}

            {game.status === "IN_PROGRESS" && allTeamsFullySubmitted && (
              <p className="text-emerald-400/90 text-sm flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                All teams have submitted their decisions. Ready to advance!
              </p>
            )}
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800 rounded-xl p-1 h-auto">
            <TabsTrigger value="teams" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-500 rounded-lg gap-2 px-4 py-2.5 transition-all">
              <Users className="w-4 h-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-500 rounded-lg gap-2 px-4 py-2.5 transition-all">
              <Zap className="w-4 h-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-500 rounded-lg gap-2 px-4 py-2.5 transition-all">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Teams ({game.teams.length}/5)
                </h3>
                <p className="text-slate-500 text-sm mt-0.5">
                  {game.status === "LOBBY"
                    ? "Share the join code with participants"
                    : "Click on a team to view detailed information"
                  }
                </p>
              </div>
              <div className="p-4">
                {game.teams.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-7 h-7 text-slate-600" />
                    </div>
                    <p className="text-slate-400 font-medium">No teams have joined yet</p>
                    <p className="text-slate-600 text-sm mt-1.5">
                      Share join code: <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{game.joinCode}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamSubmissions.map((team) => (
                      <div key={team.id}>
                        <div
                          className="group p-4 rounded-xl border border-slate-800 bg-slate-900/50 cursor-pointer hover:border-slate-700 hover:bg-slate-800/50 transition-all duration-200"
                          onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3.5 h-3.5 rounded-full ring-2 ring-offset-1 ring-offset-slate-900"
                                style={{ backgroundColor: team.color, boxShadow: `0 0 8px ${team.color}40` }}
                              />
                              <span className="text-white font-medium">{team.name}</span>
                              <div className="text-slate-600 transition-transform duration-200" style={{ transform: expandedTeamId === team.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                            {game.status === "IN_PROGRESS" && (
                              <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                                team.submittedCount === totalModules
                                  ? "text-emerald-400 bg-emerald-500/10"
                                  : "text-slate-400 bg-slate-800"
                              }`}>
                                {team.submittedCount}/{totalModules} modules
                              </span>
                            )}
                          </div>

                          {game.status === "IN_PROGRESS" && (
                            <>
                              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                                <div
                                  className="h-full rounded-full transition-all duration-500 ease-out"
                                  style={{
                                    width: `${team.progress}%`,
                                    backgroundColor: team.color,
                                    boxShadow: `0 0 12px ${team.color}40`,
                                  }}
                                />
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {MODULES.map((module) => {
                                  const hasSubmitted = team.decisions.some(
                                    (d) => d.module === module
                                  );
                                  return (
                                    <span
                                      key={module}
                                      className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                                        hasSubmitted
                                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                          : "bg-slate-800 text-slate-500 border border-slate-700/50"
                                      }`}
                                    >
                                      {hasSubmitted && <CheckCircle2 className="w-3 h-3" />}
                                      {module === "RD" ? "R&D" : module.charAt(0) + module.slice(1).toLowerCase()}
                                    </span>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Expanded Team Details */}
                        {expandedTeamId === team.id && team.currentState && (
                          <div className="mt-2 ml-4 pl-4 border-l-2 border-slate-800">
                            <TeamDetailPanel
                              team={{
                                id: team.id,
                                name: team.name,
                                color: team.color,
                                currentState: team.currentState as unknown as Parameters<typeof TeamDetailPanel>[0]["team"]["currentState"],
                                decisions: team.decisions.map((d) => ({
                                  module: d.module,
                                  submittedAt: d.submittedAt,
                                })),
                              }}
                              isExpanded={true}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-4">
            <EventInjectionPanel
              teams={game.teams.map((t) => ({
                id: t.id,
                name: t.name,
                color: t.color,
              }))}
              onInjectEvent={handleInjectEvent}
              disabled={game.status !== "IN_PROGRESS"}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  Round History
                </h3>
                <p className="text-slate-500 text-sm mt-0.5">
                  {roundHistory.length > 0
                    ? `${roundHistory.length} completed round${roundHistory.length !== 1 ? "s" : ""}`
                    : "No rounds have been completed yet"
                  }
                </p>
              </div>
              <div className="p-4">
                {roundHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                      <History className="w-7 h-7 text-slate-600" />
                    </div>
                    <p className="text-slate-400 font-medium">No rounds completed yet</p>
                    <p className="text-slate-600 text-sm mt-1.5">Round results will appear here after advancing</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roundHistory
                      .sort((a, b) => b.roundNumber - a.roundNumber)
                      .map((round) => (
                        <div
                          key={round.roundNumber}
                          className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-purple-500/15 text-purple-400 border-0 font-semibold">
                                Round {round.roundNumber}
                              </Badge>
                              {round.roundNumber === game.currentRound - 1 && (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-xs">
                                  Latest
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {round.events && round.events.length > 0 && (
                                <div className="flex gap-1">
                                  {round.events.map((event, idx) => (
                                    <Badge
                                      key={idx}
                                      className="text-xs bg-amber-500/10 text-amber-400 border-0"
                                    >
                                      {event.title}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {round.processedAt && (
                                <span className="text-xs text-slate-600">
                                  {new Date(round.processedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="divide-y divide-slate-800/50">
                            {round.rankings
                              .sort((a, b) => a.rank - b.rank)
                              .map((team) => (
                                <div
                                  key={team.teamId}
                                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                      team.rank === 1
                                        ? "bg-amber-500/20 text-amber-400"
                                        : team.rank === 2
                                        ? "bg-slate-400/20 text-slate-300"
                                        : team.rank === 3
                                        ? "bg-orange-500/20 text-orange-400"
                                        : "bg-slate-800 text-slate-500"
                                    }`}>
                                      {team.rank}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: team.teamColor }}
                                      />
                                      <span className="text-white font-medium text-sm">
                                        {team.teamName}
                                      </span>
                                    </div>
                                    {team.rank === 1 && (
                                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="text-right">
                                      <div className="text-slate-600 text-xs">Revenue</div>
                                      <div className="text-white font-medium">
                                        ${(team.revenue / 1_000_000).toFixed(1)}M
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-slate-600 text-xs">Market Share</div>
                                      <div className="text-white font-medium">
                                        {(team.marketShare * 100).toFixed(1)}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Round Info */}
        {game.rounds && game.rounds.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h3 className="text-white font-semibold">Current Round Details</h3>
            </div>
            <div className="p-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Round Number</p>
                  <p className="text-xl font-bold text-white mt-1">{game.rounds[0]?.roundNumber}</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Status</p>
                  <p className="text-xl font-bold text-white mt-1">{game.rounds[0]?.status.replace("_", " ")}</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Rounds Remaining</p>
                  <p className="text-xl font-bold text-white mt-1">{game.maxRounds - game.currentRound}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
