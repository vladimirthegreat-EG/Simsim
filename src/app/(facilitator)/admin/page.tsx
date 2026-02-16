"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/api/trpc";
import { toast } from "sonner";
import { ComplexitySelector } from "@/components/facilitator/ComplexitySelector";
import { GameComplexitySettings, getComplexitySettings } from "@/engine/types";
import { PRESET_LIST, GAME_PRESETS, type GamePreset } from "@/engine/config/gamePresets";
import { Zap, Settings, Rocket, Users, Factory, ShoppingBag, TrendingUp, GraduationCap, Check, X } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [newGameName, setNewGameName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [complexitySettings, setComplexitySettings] = useState<GameComplexitySettings>(
    getComplexitySettings("standard")
  );
  const [selectedPreset, setSelectedPreset] = useState<GamePreset | null>(GAME_PRESETS.standard);

  const { data: session, isLoading: sessionLoading } = trpc.facilitator.checkSession.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.facilitator.getDashboardStats.useQuery(
    undefined,
    { enabled: session?.hasSession }
  );

  const createGame = trpc.game.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Game created! Join code: ${data.joinCode}`);
      setIsCreateDialogOpen(false);
      setNewGameName("");
      setComplexitySettings(getComplexitySettings("standard")); // Reset
      setSelectedPreset(null);
      router.push(`/admin/games/${data.game.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const logout = trpc.facilitator.logout.useMutation({
    onSuccess: () => {
      router.push("/");
    },
  });

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.hasSession) {
    router.push("/login");
    return null;
  }

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim()) {
      toast.error("Please enter a game name");
      return;
    }
    createGame.mutate({
      name: newGameName.trim(),
      complexitySettings: complexitySettings,
      ...(selectedPreset && {
        gamePresetId: selectedPreset.id,
        maxRounds: selectedPreset.rounds,
      }),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LOBBY":
        return "bg-yellow-500";
      case "IN_PROGRESS":
        return "bg-green-500";
      case "PAUSED":
        return "bg-orange-500";
      case "COMPLETED":
        return "bg-slate-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Facilitator Dashboard</h1>
            <p className="text-slate-400">Welcome, {session.facilitator?.name}</p>
          </div>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => logout.mutate()}
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Games</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.totalGames || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Active Games</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{stats?.activeGames || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-400">{stats?.completedGames || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">Total Teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{stats?.totalTeams || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Create Game Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Your Games</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                + Create New Game
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-5xl max-h-[90vh] overflow-y-auto p-8">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-white text-2xl">Create New Game</DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">
                  Configure your business simulation session — choose a game mode, feature level, and name.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGame} className="space-y-8">
                <div className="space-y-2">
                  <Label htmlFor="gameName" className="text-slate-300 text-base">
                    Game Name
                  </Label>
                  <Input
                    id="gameName"
                    placeholder="e.g., MBA Strategy Workshop"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white h-11 text-base"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300 text-base">Game Mode</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Choose how long the game runs and what teams start with</p>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                    {PRESET_LIST.map((preset) => {
                      const isSelected = selectedPreset?.id === preset.id;
                      const Icon = preset.id === "quick" ? Zap : preset.id === "full" ? Rocket : Settings;
                      const colors = {
                        quick: { border: "border-green-500", icon: "text-green-400", bg: "bg-green-500/10", badge: "bg-green-500/20 text-green-400" },
                        standard: { border: "border-blue-500", icon: "text-blue-400", bg: "bg-blue-500/10", badge: "bg-blue-500/20 text-blue-400" },
                        full: { border: "border-purple-500", icon: "text-purple-400", bg: "bg-purple-500/10", badge: "bg-purple-500/20 text-purple-400" },
                      }[preset.id];
                      const segments = preset.startingSegments === 5 ? "All 5 segments" : preset.startingSegments === 0 ? "None (build from scratch)" : `${preset.startingSegments} segments`;
                      const totalStaff = preset.startingWorkers + preset.startingEngineers + preset.startingSupervisors;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPreset(isSelected ? null : preset)}
                          className={`p-5 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? `${colors.border} bg-slate-700 ring-1 ring-white/10`
                              : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <Icon className={`w-6 h-6 ${colors.icon}`} />
                            <span className="text-white font-bold text-lg">{preset.name}</span>
                            <Badge className={`${colors.badge} text-xs px-2 py-0.5 ml-auto`}>{preset.rounds} rounds</Badge>
                          </div>
                          <p className="text-slate-400 text-sm mb-4 leading-relaxed">{preset.description}</p>

                          <div className="space-y-2.5 text-sm border-t border-slate-600/50 pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Starting Staff</span>
                              <span className="text-slate-300 font-medium">{totalStaff > 0 ? `${totalStaff} employees` : "None"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Market Segments</span>
                              <span className="text-slate-300 font-medium">{segments}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Products Ready</span>
                              <span className="text-slate-300 font-medium">
                                {preset.startingSegments > 0 ? (
                                  <span className="flex items-center gap-1"><Check className="w-4 h-4 text-green-400" /> Yes</span>
                                ) : (
                                  <span className="flex items-center gap-1"><X className="w-4 h-4 text-red-400" /> No</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Starting Brand</span>
                              <span className="text-slate-300 font-medium">{preset.startingBrandValue > 0 ? `${Math.round(preset.startingBrandValue * 100)}%` : "None"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Tutorial</span>
                              <span className="text-slate-300 font-medium capitalize">{preset.tutorialDepth} guide</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedPreset && (
                    <div className="p-4 rounded-xl bg-slate-700/50 text-sm text-slate-400 space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span><strong className="text-slate-300">{selectedPreset.startingWorkers}</strong> workers, <strong className="text-slate-300">{selectedPreset.startingEngineers}</strong> engineers, <strong className="text-slate-300">{selectedPreset.startingSupervisors}</strong> supervisors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-slate-500" />
                        <span>
                          {selectedPreset.startingSegments === 5 ? "All segments: Budget, General, Enthusiast, Professional, Active Lifestyle"
                            : selectedPreset.startingSegments === 2 ? "Starter segments: General & Budget — expand into others during the game"
                            : "No starting segments — hire staff, develop products & build production lines from scratch"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-slate-300 text-base">Feature Level</Label>
                    <p className="text-sm text-slate-500 mt-0.5">Controls which modules and features are enabled during gameplay</p>
                  </div>
                  <ComplexitySelector
                    value={complexitySettings}
                    onChange={setComplexitySettings}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-base font-semibold"
                  disabled={createGame.isPending}
                >
                  {createGame.isPending ? "Creating..." : "Create Game"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Games List */}
        <div className="grid gap-4">
          {stats?.recentGames && stats.recentGames.length > 0 ? (
            stats.recentGames.map((game: {
              id: string;
              name: string;
              status: string;
              teamCount: number;
              currentRound: number;
              maxRounds: number;
              createdAt: Date;
            }) => (
              <Card
                key={game.id}
                className="bg-slate-800 border-slate-700 hover:border-slate-600 cursor-pointer transition-colors"
                onClick={() => router.push(`/admin/games/${game.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{game.name}</h3>
                        <p className="text-slate-400 text-sm">
                          {game.teamCount} teams • Round {game.currentRound}/{game.maxRounds}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(game.status)} text-white`}>
                        {game.status.replace("_", " ")}
                      </Badge>
                      <span className="text-slate-500 text-sm">
                        {new Date(game.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center">
                <p className="text-slate-400">No games yet. Create your first game to get started!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
