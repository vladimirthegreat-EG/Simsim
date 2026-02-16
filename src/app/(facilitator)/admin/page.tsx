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
import {
  Zap, Settings, Rocket, Users, ShoppingBag,
  Check, X, Plus, Gamepad2, Trophy, Activity,
  ChevronRight, LogOut, Clock,
} from "lucide-react";

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
      setComplexitySettings(getComplexitySettings("standard"));
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading dashboard...</span>
        </div>
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
      case "LOBBY": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "IN_PROGRESS": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "PAUSED": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "COMPLETED": return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const statCards = [
    {
      label: "Total Games",
      value: stats?.totalGames || 0,
      icon: Gamepad2,
      gradient: "from-purple-500/20 to-purple-500/0",
      iconBg: "bg-purple-500/15",
      iconColor: "text-purple-400",
      valueColor: "text-white",
    },
    {
      label: "Active Games",
      value: stats?.activeGames || 0,
      icon: Activity,
      gradient: "from-emerald-500/20 to-emerald-500/0",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      valueColor: "text-emerald-400",
    },
    {
      label: "Completed",
      value: stats?.completedGames || 0,
      icon: Trophy,
      gradient: "from-amber-500/20 to-amber-500/0",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400",
      valueColor: "text-amber-400",
    },
    {
      label: "Total Teams",
      value: stats?.totalTeams || 0,
      icon: Users,
      gradient: "from-blue-500/20 to-blue-500/0",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
      valueColor: "text-blue-400",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="relative border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Facilitator Dashboard</h1>
              <p className="text-slate-500 text-sm">Welcome back, {session.facilitator?.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 gap-2"
            onClick={() => logout.mutate()}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="relative group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/50"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${stat.valueColor}`}>{stat.value}</p>
                  </div>
                  <div className={`${stat.iconBg} rounded-lg p-2.5`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Your Games</h2>
            <p className="text-slate-500 text-sm mt-0.5">Manage and monitor your simulation sessions</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-500/20 transition-all duration-300 gap-2">
                <Plus className="w-4 h-4" />
                Create Game
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-5xl max-h-[90vh] overflow-y-auto p-8">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-white text-2xl font-bold">Create New Game</DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">
                  Configure your business simulation session - choose a game mode, feature level, and name.
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
                    className="bg-slate-800 border-slate-700 text-white h-11 text-base focus:border-purple-500 focus:ring-purple-500/20"
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
                        quick: { border: "border-emerald-500/60", glow: "shadow-emerald-500/10", icon: "text-emerald-400", bg: "bg-emerald-500/10", badge: "bg-emerald-500/20 text-emerald-400", ring: "ring-emerald-500/20" },
                        standard: { border: "border-blue-500/60", glow: "shadow-blue-500/10", icon: "text-blue-400", bg: "bg-blue-500/10", badge: "bg-blue-500/20 text-blue-400", ring: "ring-blue-500/20" },
                        full: { border: "border-purple-500/60", glow: "shadow-purple-500/10", icon: "text-purple-400", bg: "bg-purple-500/10", badge: "bg-purple-500/20 text-purple-400", ring: "ring-purple-500/20" },
                      }[preset.id]!;
                      const segments = preset.startingSegments === 5 ? "All 5 segments" : preset.startingSegments === 0 ? "None (build from scratch)" : `${preset.startingSegments} segments`;
                      const totalStaff = preset.startingWorkers + preset.startingEngineers + preset.startingSupervisors;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedPreset(isSelected ? null : preset)}
                          className={`p-5 rounded-xl border-2 text-left transition-all duration-300 ${
                            isSelected
                              ? `${colors.border} bg-slate-800 ring-2 ${colors.ring} shadow-lg ${colors.glow}`
                              : "border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className={`${colors.bg} rounded-lg p-1.5`}>
                              <Icon className={`w-5 h-5 ${colors.icon}`} />
                            </div>
                            <span className="text-white font-bold text-lg">{preset.name}</span>
                            <Badge className={`${colors.badge} text-xs px-2 py-0.5 ml-auto border-0`}>{preset.rounds} rounds</Badge>
                          </div>
                          <p className="text-slate-400 text-sm mb-4 leading-relaxed">{preset.description}</p>

                          <div className="space-y-2.5 text-sm border-t border-slate-700/50 pt-3">
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
                                  <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-400" /> Yes</span>
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
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-400 space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span><strong className="text-slate-300">{selectedPreset.startingWorkers}</strong> workers, <strong className="text-slate-300">{selectedPreset.startingEngineers}</strong> engineers, <strong className="text-slate-300">{selectedPreset.startingSupervisors}</strong> supervisors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-slate-500" />
                        <span>
                          {selectedPreset.startingSegments === 5 ? "All segments: Budget, General, Enthusiast, Professional, Active Lifestyle"
                            : selectedPreset.startingSegments === 2 ? "Starter segments: General & Budget - expand into others during the game"
                            : "No starting segments - hire staff, develop products & build production lines from scratch"}
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
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 h-12 text-base font-semibold shadow-lg shadow-purple-500/20 transition-all duration-300"
                  disabled={createGame.isPending}
                >
                  {createGame.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create Game"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Games List */}
        <div className="space-y-3">
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
              <div
                key={game.id}
                className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-5 cursor-pointer transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/50"
                onClick={() => router.push(`/admin/games/${game.id}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-transparent transition-all duration-300" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:border-purple-500/30 transition-colors">
                      <Gamepad2 className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white group-hover:text-purple-100 transition-colors">{game.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {game.teamCount} teams
                        </span>
                        <span className="text-slate-700">|</span>
                        <span>Round {game.currentRound}/{game.maxRounds}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={`${getStatusColor(game.status)} border text-xs px-2.5 py-1`}>
                      {game.status.replace("_", " ")}
                    </Badge>
                    <span className="text-slate-600 text-xs hidden md:block">
                      {new Date(game.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
                {/* Round progress bar */}
                <div className="relative mt-4">
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(game.currentRound / game.maxRounds) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-dashed border-slate-800 bg-slate-900/40 py-16 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                  <Gamepad2 className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400 font-medium">No games yet</p>
                <p className="text-slate-600 text-sm mt-1">Create your first game to get started</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
