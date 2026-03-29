"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  DollarSign,
  Gavel,
  Clock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OwnPatent {
  id: string;
  techId: string;
  family: string;
  tier: number;
  status: string;
  expiresRound: number;
  licensedTo: string[];
  licenseFeePerRound: number;
  exclusiveBonus: number;
  blockingPower: number;
}

interface BlockingPatent {
  id: string;
  techId: string;
  family: string;
  ownerId: string;
  blockingPower: number;
  licenseFeePerRound: number;
}

interface PatentPanelProps {
  ownPatents: OwnPatent[];
  blockingPatents: BlockingPatent[];
  patentableTechs: string[];
  currentRound: number;
  cash: number;
  onFilePatent: (techId: string) => void;
  onLicensePatent: (patentId: string) => void;
  onChallengePatent: (patentId: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FILING_COSTS: Record<number, number> = {
  2: 5_000_000,
  3: 8_000_000,
  4: 12_000_000,
  5: 15_000_000,
};

const CHALLENGE_COST = 10_000_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-600/20 text-green-400 border-green-500/30";
    case "pending":
      return "bg-yellow-600/20 text-yellow-400 border-yellow-500/30";
    case "expired":
      return "bg-slate-600/20 text-slate-400 border-slate-500/30";
    case "challenged":
      return "bg-red-600/20 text-red-400 border-red-500/30";
    default:
      return "bg-slate-600/20 text-slate-400 border-slate-500/30";
  }
}

function getTierColor(tier: number): string {
  switch (tier) {
    case 2:
      return "bg-blue-600/20 text-blue-400 border-blue-500/30";
    case 3:
      return "bg-purple-600/20 text-purple-400 border-purple-500/30";
    case 4:
      return "bg-orange-600/20 text-orange-400 border-orange-500/30";
    case 5:
      return "bg-red-600/20 text-red-400 border-red-500/30";
    default:
      return "bg-slate-600/20 text-slate-400 border-slate-500/30";
  }
}

function getFamilyColor(family: string): string {
  const colors: Record<string, string> = {
    hardware: "bg-cyan-600/20 text-cyan-400 border-cyan-500/30",
    software: "bg-indigo-600/20 text-indigo-400 border-indigo-500/30",
    process: "bg-amber-600/20 text-amber-400 border-amber-500/30",
    materials: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    design: "bg-pink-600/20 text-pink-400 border-pink-500/30",
  };
  return colors[family.toLowerCase()] ?? "bg-slate-600/20 text-slate-400 border-slate-500/30";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PatentPanel({
  ownPatents,
  blockingPatents,
  patentableTechs,
  currentRound,
  cash,
  onFilePatent,
  onLicensePatent,
  onChallengePatent,
}: PatentPanelProps) {
  const [selectedTech, setSelectedTech] = useState<string>("");

  // Assume tier is extracted from the tech name or default to 3 for filing cost display
  // In practice, the filing cost depends on the tier of the tech being patented.
  // We show the full cost table so the player knows what to expect.

  const canAffordChallenge = cash >= CHALLENGE_COST;

  return (
    <div className="space-y-6">
      {/* ── Your Patents ────────────────────────────────────────────────── */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            Your Patents
            <Badge variant="secondary" className="ml-auto">
              {ownPatents.length} held
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ownPatents.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">
              You have not filed any patents yet. File one below to protect your technology.
            </p>
          ) : (
            <div className="space-y-3">
              {ownPatents.map((patent) => {
                const roundsRemaining = patent.expiresRound - currentRound;
                const revenuePerRound =
                  patent.licensedTo.length * patent.licenseFeePerRound;

                return (
                  <div
                    key={patent.id}
                    className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                  >
                    {/* Top row: tech name + badges */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium">
                          {patent.techId}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs border ${getFamilyColor(patent.family)}`}
                        >
                          {patent.family}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs border ${getTierColor(patent.tier)}`}
                        >
                          Tier {patent.tier}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs border ${getStatusColor(patent.status)}`}
                        >
                          {patent.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Bottom row: stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      {/* Expiry countdown */}
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {roundsRemaining > 0 ? (
                            <>
                              <span className={roundsRemaining <= 2 ? "text-red-400 font-medium" : ""}>
                                {roundsRemaining}
                              </span>{" "}
                              {roundsRemaining === 1 ? "round left" : "rounds left"}
                            </>
                          ) : (
                            <span className="text-slate-500">Expired</span>
                          )}
                        </span>
                      </div>

                      {/* Licensees */}
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {patent.licensedTo.length}{" "}
                          {patent.licensedTo.length === 1 ? "licensee" : "licensees"}
                        </span>
                      </div>

                      {/* Revenue per round */}
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
                        <span>
                          {revenuePerRound > 0 ? (
                            <span className="text-green-400 font-medium">
                              {formatCurrency(revenuePerRound)}/rd
                            </span>
                          ) : (
                            <span className="text-slate-500">No revenue</span>
                          )}
                        </span>
                      </div>

                      {/* Blocking power */}
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <span>{(patent.blockingPower * 100).toFixed(0)}% blocking</span>
                      </div>

                      {/* Exclusive bonus */}
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span>+{(patent.exclusiveBonus * 100).toFixed(0)}% exclusive</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Blocking Patents ────────────────────────────────────────────── */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Blocking Patents
            {blockingPatents.length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {blockingPatents.length} blocking you
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blockingPatents.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">
              No competitor patents are currently blocking your operations.
            </p>
          ) : (
            <div className="space-y-3">
              {blockingPatents.map((patent) => (
                <div
                  key={patent.id}
                  className="p-4 bg-slate-700/50 rounded-lg border border-red-500/20"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* Patent info */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div>
                        <span className="text-white font-medium">
                          {patent.techId}
                        </span>
                        <span className="text-slate-400 text-sm ml-2">
                          by {patent.ownerId}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs border ${getFamilyColor(patent.family)}`}
                      >
                        {patent.family}
                      </Badge>
                      <span className="text-red-400 text-sm font-medium">
                        {(patent.blockingPower * 100).toFixed(0)}% blocking
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLicensePatent(patent.id)}
                        disabled={cash < patent.licenseFeePerRound}
                        className="border-blue-500/40 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                      >
                        <DollarSign className="w-3.5 h-3.5 mr-1" />
                        License ({formatCurrency(patent.licenseFeePerRound)}/rd)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onChallengePatent(patent.id)}
                        disabled={!canAffordChallenge}
                        className="border-red-500/40 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      >
                        <Gavel className="w-3.5 h-3.5 mr-1" />
                        Challenge
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Challenge cost warning */}
              <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-600">
                <div className="flex items-start gap-2">
                  <Gavel className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-slate-400">
                    <span className="text-amber-400 font-medium">Challenge cost: $10M</span>{" "}
                    with a 50% success rate. A failed challenge forfeits the fee entirely.
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── File New Patent ─────────────────────────────────────────────── */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            File New Patent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {patentableTechs.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">
              No technologies are available for patenting. Research more technologies
              to unlock patent opportunities.
            </p>
          ) : (
            <>
              {/* Tech selection + file button */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Select value={selectedTech} onValueChange={setSelectedTech}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select technology to patent..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {patentableTechs.map((tech) => (
                        <SelectItem
                          key={tech}
                          value={tech}
                          className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white"
                        >
                          {tech}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => {
                    if (selectedTech) {
                      onFilePatent(selectedTech);
                      setSelectedTech("");
                    }
                  }}
                  disabled={!selectedTech}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  File Patent
                </Button>
              </div>

              {/* Filing cost table */}
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600">
                <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                  Patent Filing Costs
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(FILING_COSTS).map(([tier, cost]) => {
                    const tierNum = Number(tier);
                    const canAfford = cash >= cost;
                    return (
                      <div
                        key={tier}
                        className={`p-3 rounded-lg border text-center ${
                          canAfford
                            ? "bg-slate-700/50 border-slate-600"
                            : "bg-slate-800/50 border-slate-700 opacity-60"
                        }`}
                      >
                        <Badge
                          variant="outline"
                          className={`text-xs border mb-2 ${getTierColor(tierNum)}`}
                        >
                          Tier {tier}
                        </Badge>
                        <div className={`text-lg font-bold ${canAfford ? "text-white" : "text-slate-500"}`}>
                          {formatCurrency(cost)}
                        </div>
                        {!canAfford && (
                          <span className="text-xs text-red-400">Insufficient funds</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Your current cash: {formatCurrency(cash)}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
