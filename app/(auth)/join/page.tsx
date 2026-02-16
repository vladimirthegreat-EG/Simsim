"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/api/trpc";
import { toast } from "sonner";

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<"code" | "team">("code");
  const [joinCode, setJoinCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [gameInfo, setGameInfo] = useState<{
    id: string;
    name: string;
    teams: { id: string; name: string; color: string }[];
  } | null>(null);

  const utils = trpc.useUtils();

  const joinTeam = trpc.team.join.useMutation({
    onSuccess: (data) => {
      toast.success(`Joined ${data.gameName} as ${data.teamName}!`);
      router.push(`/game/${data.gameId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 6) {
      toast.error("Please enter a 6-character join code");
      return;
    }
    setIsCheckingCode(true);
    try {
      const data = await utils.game.getByJoinCode.fetch({ joinCode: joinCode.toUpperCase() });
      setGameInfo(data);
      setStep("team");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Game not found";
      toast.error(message);
    } finally {
      setIsCheckingCode(false);
    }
  };

  const handleTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }
    joinTeam.mutate({ joinCode: joinCode.toUpperCase(), teamName: teamName.trim() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">
            {step === "code" ? "Join a Game" : "Enter Team Name"}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {step === "code"
              ? "Enter the 6-character code provided by your facilitator"
              : `Joining: ${gameInfo?.name}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "code" ? (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-slate-300">
                  Join Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  className="text-center text-2xl tracking-widest font-mono bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={joinCode.length !== 6 || isCheckingCode}
              >
                {isCheckingCode ? "Checking..." : "Find Game"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTeamSubmit} className="space-y-4">
              {/* Show existing teams */}
              {gameInfo && gameInfo.teams.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Teams Already Joined</Label>
                  <div className="flex flex-wrap gap-2">
                    {gameInfo.teams.map((team) => (
                      <span
                        key={team.id}
                        className="px-3 py-1 rounded-full text-sm text-white"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="teamName" className="text-slate-300">
                  Your Team Name
                </Label>
                <Input
                  id="teamName"
                  type="text"
                  placeholder="e.g., Team Alpha"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    setStep("code");
                    setGameInfo(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!teamName.trim() || joinTeam.isPending}
                >
                  {joinTeam.isPending ? "Joining..." : "Join Game"}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-300">
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
