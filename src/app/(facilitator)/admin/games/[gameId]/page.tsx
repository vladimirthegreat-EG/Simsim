"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
      refetchInterval: 5000, // Auto-refresh every 5 seconds
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading...
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Game not found</div>
          <Link href="/admin">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LOBBY": return "bg-yellow-500";
      case "IN_PROGRESS": return "bg-green-500";
      case "PAUSED": return "bg-orange-500";
      case "COMPLETED": return "bg-blue-500";
      default: return "bg-slate-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "LOBBY": return <Clock className="w-4 h-4" />;
      case "IN_PROGRESS": return <Play className="w-4 h-4" />;
      case "PAUSED": return <Pause className="w-4 h-4" />;
      case "COMPLETED": return <Trophy className="w-4 h-4" />;
      default: return null;
    }
  };

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
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-400 hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{game.name}</h1>
              <div className="flex items-center gap-2 text-slate-400">
                <span>Join Code:</span>
                <button
                  onClick={copyJoinCode}
                  className="font-mono text-white bg-slate-700 px-2 py-0.5 rounded hover:bg-slate-600 flex items-center gap-1"
                >
                  {game.joinCode}
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <Badge className={`${getStatusColor(game.status)} text-white text-sm px-3 py-1 flex items-center gap-1`}>
            {getStatusIcon(game.status)}
            {game.status.replace("_", " ")}
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-slate-400 text-sm">Teams</p>
                <p className="text-2xl font-bold text-white">{game.teams.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-slate-400 text-sm">Round</p>
                <p className="text-2xl font-bold text-white">{game.currentRound} / {game.maxRounds}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-slate-400 text-sm">Submissions</p>
                <p className="text-2xl font-bold text-white">{totalSubmissions} / {maxSubmissions}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-slate-400 text-sm mb-2">Progress</p>
              <Progress value={overallProgress} className="h-2" />
              <p className="text-white text-sm mt-1">{Math.round(overallProgress)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Controls */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              Game Controls
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription className="text-slate-400">
              {game.status === "LOBBY" && "Waiting for teams to join..."}
              {game.status === "IN_PROGRESS" && "Teams are making decisions for this round."}
              {game.status === "PAUSED" && "Game is paused. Teams cannot submit decisions."}
              {game.status === "COMPLETED" && "This game has ended."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {game.status === "LOBBY" && (
                <Button
                  onClick={() => startGame.mutate({ gameId })}
                  disabled={startGame.isPending || game.teams.length < 2}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {startGame.isPending ? "Starting..." : "Start Game"}
                </Button>
              )}

              {game.status === "IN_PROGRESS" && (
                <>
                  <Button
                    onClick={handleAdvanceWithEvents}
                    disabled={advanceRound.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    {advanceRound.isPending ? "Processing..." : "Advance Round"}
                    {pendingEvents.length > 0 && (
                      <Badge className="ml-2 bg-yellow-500 text-black">
                        +{pendingEvents.length} events
                      </Badge>
                    )}
                  </Button>
                  <Button
                    onClick={() => togglePause.mutate({ gameId })}
                    disabled={togglePause.isPending}
                    variant="outline"
                    className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Game
                  </Button>
                </>
              )}

              {game.status === "PAUSED" && (
                <Button
                  onClick={() => togglePause.mutate({ gameId })}
                  disabled={togglePause.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume Game
                </Button>
              )}

              {game.status === "COMPLETED" && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Trophy className="w-5 h-5" />
                  Game Complete - View final results
                </div>
              )}
            </div>

            {/* Pending Events Display */}
            {pendingEvents.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="text-yellow-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Queued Events for Next Round
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingEvents.map((event, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-yellow-500 text-yellow-400 cursor-pointer hover:bg-yellow-500/20"
                      onClick={() => removeEvent(idx)}
                    >
                      {event.title} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {game.status === "LOBBY" && game.teams.length < 2 && (
              <p className="text-yellow-400 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Need at least 2 teams to start the game
              </p>
            )}

            {game.status === "IN_PROGRESS" && allTeamsFullySubmitted && (
              <p className="text-green-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                All teams have submitted their decisions. Ready to advance!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="teams" className="data-[state=active]:bg-slate-700">
              <Users className="w-4 h-4 mr-2" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-slate-700">
              <Zap className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-slate-700">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Teams ({game.teams.length}/5)
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {game.status === "LOBBY"
                    ? "Share the join code with participants"
                    : "Click on a team to view detailed information"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {game.teams.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No teams have joined yet</p>
                    <p className="text-sm mt-2">
                      Share join code: <span className="font-mono text-white">{game.joinCode}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamSubmissions.map((team) => (
                      <div key={team.id}>
                        <div
                          className="p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                          onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: team.color }}
                              />
                              <span className="text-white font-medium">{team.name}</span>
                              {expandedTeamId === team.id ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            {game.status === "IN_PROGRESS" && (
                              <span className={`text-sm ${
                                team.submittedCount === totalModules
                                  ? "text-green-400"
                                  : "text-slate-400"
                              }`}>
                                {team.submittedCount}/{totalModules} modules
                              </span>
                            )}
                          </div>

                          {game.status === "IN_PROGRESS" && (
                            <>
                              <Progress value={team.progress} className="h-2 mb-2" />
                              <div className="flex gap-2 flex-wrap">
                                {MODULES.map((module) => {
                                  const hasSubmitted = team.decisions.some(
                                    (d) => d.module === module
                                  );
                                  return (
                                    <span
                                      key={module}
                                      className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                        hasSubmitted
                                          ? "bg-green-500/20 text-green-400"
                                          : "bg-slate-600 text-slate-400"
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
                          <div className="mt-2 ml-4 border-l-2 border-slate-600 pl-4">
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
              </CardContent>
            </Card>
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
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Round History
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {roundHistory.length > 0
                    ? `${roundHistory.length} completed round${roundHistory.length !== 1 ? "s" : ""}`
                    : "No rounds have been completed yet"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roundHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Round results will appear here after advancing rounds</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roundHistory
                      .sort((a, b) => b.roundNumber - a.roundNumber)
                      .map((round) => (
                        <div
                          key={round.roundNumber}
                          className="p-4 bg-slate-700/50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-purple-600 text-white">
                                Round {round.roundNumber}
                              </Badge>
                              {round.roundNumber === game.currentRound - 1 && (
                                <Badge variant="outline" className="border-green-500 text-green-400">
                                  Latest
                                </Badge>
                              )}
                            </div>
                            {round.processedAt && (
                              <span className="text-xs text-slate-500">
                                {new Date(round.processedAt).toLocaleString()}
                              </span>
                            )}
                          </div>

                          {round.events && round.events.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1">
                              {round.events.map((event, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs border-yellow-500 text-yellow-400"
                                >
                                  {event.title}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="space-y-2">
                            {round.rankings
                              .sort((a, b) => a.rank - b.rank)
                              .map((team) => (
                                <div
                                  key={team.teamId}
                                  className="flex items-center justify-between p-2 bg-slate-800/50 rounded"
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge
                                      className={`${
                                        team.rank === 1
                                          ? "bg-yellow-500"
                                          : team.rank === 2
                                          ? "bg-slate-400"
                                          : team.rank === 3
                                          ? "bg-amber-600"
                                          : "bg-slate-600"
                                      } text-white w-6 h-6 flex items-center justify-center p-0`}
                                    >
                                      {team.rank}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: team.teamColor }}
                                      />
                                      <span className="text-white font-medium">
                                        {team.teamName}
                                      </span>
                                    </div>
                                    {team.rank === 1 && (
                                      <Trophy className="w-4 h-4 text-yellow-400" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <div className="text-right">
                                      <div className="text-slate-400 text-xs">Revenue</div>
                                      <div className="text-white font-medium">
                                        ${(team.revenue / 1_000_000).toFixed(1)}M
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-slate-400 text-xs">Market Share</div>
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Round Info */}
        {game.rounds && game.rounds.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Current Round Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm">Round Number</p>
                  <p className="text-xl font-bold text-white">{game.rounds[0]?.roundNumber}</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm">Status</p>
                  <p className="text-xl font-bold text-white">{game.rounds[0]?.status.replace("_", " ")}</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm">Rounds Remaining</p>
                  <p className="text-xl font-bold text-white">{game.maxRounds - game.currentRound}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
