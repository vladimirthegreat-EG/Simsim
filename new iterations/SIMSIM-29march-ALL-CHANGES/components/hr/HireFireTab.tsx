"use client";

import { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { formatCurrency } from "@/lib/utils";
import {
  UserPlus,
  UserMinus,
  CheckCircle2,
  Briefcase,
  Award,
  AlertTriangle,
  Brain,
} from "lucide-react";
import type { TeamState, EmployeeRole } from "@/engine/types";
import { HRModule } from "@/engine/modules/HRModule";
import { createEngineContext } from "@/engine/core/EngineContext";

// Quality shown as average + tier label (engine ranges overlap intentionally but display shouldn't confuse)
const recruitmentTiers = [
  {
    id: "basic",
    name: "Basic Recruitment",
    cost: 5000,
    candidates: 4,
    qualityRange: "Avg ~90",
    description: "Standard job posting — average candidates",
  },
  {
    id: "premium",
    name: "Premium Recruitment",
    cost: 15000,
    candidates: 6,
    qualityRange: "Avg ~110",
    description: "Professional headhunting — above-average candidates",
  },
  {
    id: "executive",
    name: "Executive Search",
    cost: 50000,
    candidates: 8,
    qualityRange: "Avg ~140",
    description: "Top-tier search — exceptional candidates",
  },
];

interface Candidate {
  id: string;
  type: "worker" | "engineer" | "supervisor";
  name: string;
  requestedSalary: number;
  stats: Record<string, number>;
  searchId: string;
}

interface RecruitmentSearch {
  id: string;
  role: string;
  tier: string;
  candidates: Candidate[];
}

interface HireFireTabProps {
  selectedPositionType: string;
  setSelectedPositionType: (type: string) => void;
  selectedRecruitmentTier: string | null;
  setSelectedRecruitmentTier: (tier: string | null) => void;
  recruitmentSearches: Array<{ role: string; tier: string }>;
  setRecruitmentSearches: React.Dispatch<React.SetStateAction<Array<{ role: string; tier: string }>>>;
  completedSearches: RecruitmentSearch[];
  setCompletedSearches: React.Dispatch<React.SetStateAction<RecruitmentSearch[]>>;
  selectedCandidates: string[];
  setSelectedCandidates: React.Dispatch<React.SetStateAction<string[]>>;
  workforceBreakdown: { workers: number; engineers: number; supervisors: number; total: number };
  layoffCounts: Record<string, number>;
  setLayoffCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  state: TeamState | null;
  activeSearchId: string | null;
  setActiveSearchId: (id: string | null) => void;
  searchCounterRef: React.MutableRefObject<number>;
  /** FIX #13: Track which tiers have used their free search this round */
  freeSearchUsed: Record<string, boolean>;
  setFreeSearchUsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

function getStatColor(value: number) {
  if (value >= 80) return "text-green-400";
  if (value >= 60) return "text-yellow-400";
  return "text-red-400";
}

function calculateEmployeeValue(stats: Record<string, number>) {
  const weights: Record<string, number> = {
    efficiency: 0.25, accuracy: 0.15, speed: 0.15, stamina: 0.10,
    discipline: 0.10, loyalty: 0.10, teamCompatibility: 0.10, health: 0.05,
  };
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += (stats[key] ?? 0) * weight;
  }
  if (stats.innovation != null) score += stats.innovation * 0.05;
  if (stats.problemSolving != null) score += stats.problemSolving * 0.05;
  if (stats.leadership != null) score += stats.leadership * 0.05;
  if (stats.tacticalPlanning != null) score += stats.tacticalPlanning * 0.05;
  return Math.round(score);
}

export function HireFireTab({
  selectedPositionType,
  setSelectedPositionType,
  selectedRecruitmentTier,
  setSelectedRecruitmentTier,
  recruitmentSearches,
  setRecruitmentSearches,
  completedSearches,
  setCompletedSearches,
  selectedCandidates,
  setSelectedCandidates,
  workforceBreakdown,
  layoffCounts,
  setLayoffCounts,
  state,
  activeSearchId,
  setActiveSearchId,
  searchCounterRef,
  freeSearchUsed,
  setFreeSearchUsed,
}: HireFireTabProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg text-sm text-slate-300">
        How hiring works: {"1\uFE0F\u20E3"} Search for candidates ($5K-$50K per search) → {"2\uFE0F\u20E3"} Review candidates → {"3\uFE0F\u20E3"} Select and hire
      </div>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Recruitment Campaign
            <HelpTooltip text="Higher tiers cost more but find better candidates. Workers run machines (~2.5 per machine), Engineers boost R&D, Supervisors improve team efficiency." />
          </CardTitle>
          <CardDescription className="text-slate-400">
            Select a position type, then a recruitment level to find candidates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Position Type */}
          <div>
            <label className="text-slate-300 text-sm mb-2 block font-medium">Step 1 — Position Type</label>
            <div className="flex gap-2 flex-wrap">
              {["worker", "engineer", "supervisor"].map((type) => (
                <Button
                  key={type}
                  variant={selectedPositionType === type ? "default" : "outline"}
                  className={selectedPositionType === type
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "border-slate-500"
                  }
                  onClick={() => {
                    setSelectedPositionType(type);
                    setSelectedRecruitmentTier(null);
                    setActiveSearchId(null);
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 2: Recruitment Level */}
          <div>
            <label className="text-slate-300 text-sm mb-2 block font-medium">Step 2 — Recruitment Level</label>
            <div className="grid md:grid-cols-3 gap-4">
              {recruitmentTiers.map((tier) => (
                <Card
                  key={tier.id}
                  className={`bg-slate-700 border-slate-600 cursor-pointer transition-all ${
                    selectedRecruitmentTier === tier.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'hover:border-slate-500'
                  }`}
                  onClick={() => {
                    setSelectedRecruitmentTier(tier.id);
                    setActiveSearchId(null);
                  }}
                >
                  <CardContent className="p-4">
                    <h3 className="text-white font-medium mb-2">{tier.name}</h3>
                    <p className="text-slate-400 text-sm mb-3">{tier.description}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cost</span>
                        <span className="text-white">{formatCurrency(tier.cost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Candidates</span>
                        <span className="text-white">{tier.candidates}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Quality Range</span>
                        <span className="text-green-400">{tier.qualityRange}</span>
                      </div>
                    </div>
                    {/* FIX #13: Free search indicator */}
                    <div className={`mt-2 text-xs px-2 py-1 rounded-full text-center ${
                      !freeSearchUsed[tier.id]
                        ? 'bg-green-900/30 text-green-400 border border-green-700/50'
                        : 'bg-red-900/30 text-red-400 border border-red-700/50'
                    }`}>
                      {!freeSearchUsed[tier.id]
                        ? '1 free search remaining'
                        : `Free search used \u2014 next: ${formatCurrency(tier.cost)}`}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Step 3: Search button — FIX #13: 1 free search per tier per round */}
          <div className="flex justify-end">
            {(() => {
              const isFree = selectedRecruitmentTier ? !freeSearchUsed[selectedRecruitmentTier] : false;
              const searchCost = isFree ? 0 : (recruitmentTiers.find(t => t.id === selectedRecruitmentTier)?.cost || 0);
              const canAfford = !state || state.cash >= searchCost;
              return (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedRecruitmentTier || (!isFree && !canAfford)}
                  onClick={() => {
                    if (selectedRecruitmentTier) {
                      const searchId = `search-${searchCounterRef.current++}`;
                      const role = selectedPositionType as EmployeeRole;
                      const tier = selectedRecruitmentTier as "basic" | "premium" | "executive";
                      const round = state?.round ?? 1;

                      const ctx = createEngineContext(
                        `recruit-${round}-${searchId}`,
                        round,
                        "preview"
                      );

                      const tierConfig = recruitmentTiers.find(t => t.id === tier);
                      const generated = HRModule.generateCandidates(role, tier, tierConfig?.candidates, ctx);

                      const candidates: Candidate[] = generated.map((emp, idx) => ({
                        id: `${searchId}-c${idx}`,
                        type: role,
                        name: emp.name,
                        requestedSalary: emp.salary,
                        stats: emp.stats as unknown as Record<string, number>,
                        searchId,
                      }));

                      setCompletedSearches(prev => [...prev, {
                        id: searchId,
                        role: selectedPositionType,
                        tier: selectedRecruitmentTier,
                        candidates,
                      }]);

                      setRecruitmentSearches(prev => [
                        ...prev,
                        { role: selectedPositionType, tier: selectedRecruitmentTier }
                      ]);

                      // FIX #13: Mark this tier's free search as used
                      setFreeSearchUsed(prev => ({ ...prev, [tier]: true }));

                      setActiveSearchId(searchId);
                    }
                  }}
                >
                  {isFree
                    ? 'Search Candidates (FREE)'
                    : `Search Candidates (${formatCurrency(searchCost)})`}
                </Button>
              );
            })()}
          </div>

          {/* Step 4: Candidates for the active search */}
          {(() => {
            const activeSearch = completedSearches.find(s => s.id === activeSearchId);
            if (!activeSearch) return null;

            const tierInfo = recruitmentTiers.find(t => t.id === activeSearch.tier);
            return (
              <div className="border-t border-slate-700 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-white text-sm font-medium capitalize">
                    {activeSearch.role} Candidates — {tierInfo?.name ?? activeSearch.tier}
                  </h4>
                  <Badge className={
                    activeSearch.tier === "executive" ? "bg-amber-500/20 text-amber-400" :
                    activeSearch.tier === "premium" ? "bg-purple-500/20 text-purple-400" :
                    "bg-slate-500/20 text-slate-400"
                  }>
                    {tierInfo?.qualityRange ?? activeSearch.tier}
                  </Badge>
                  <span className="text-slate-500 text-xs">{activeSearch.candidates.length} found</span>
                </div>
                <div className="space-y-3">
                  {activeSearch.candidates.map((candidate) => {
                    const statEntries = Object.entries(candidate.stats);
                    const cols = statEntries.length > 8 ? 5 : 4;
                    return (
                      <Card
                        key={candidate.id}
                        className={`bg-slate-700 border-slate-600 transition-all ${
                          selectedCandidates.includes(candidate.id) ? 'border-green-500 ring-1 ring-green-500/20' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-white font-medium">{candidate.name}</h3>
                                <Badge className="bg-slate-600">
                                  {candidate.type.charAt(0).toUpperCase() + candidate.type.slice(1)}
                                </Badge>
                              </div>
                              <div className="grid gap-3 text-sm" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                                {statEntries.map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-slate-400 text-xs block">
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                    </span>
                                    <span className={`font-medium ${getStatColor(value)}`}>
                                      {Math.round(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="text-right ml-4 shrink-0">
                              <div className="text-slate-400 text-sm mb-1">Salary Request</div>
                              <div className="text-white font-medium mb-2">
                                {formatCurrency(candidate.requestedSalary)}/year
                              </div>
                              <div className="text-slate-400 text-xs mb-2">
                                Value Score: <span className="text-green-400">{calculateEmployeeValue(candidate.stats)}</span>
                              </div>
                              <Button
                                size="sm"
                                className={selectedCandidates.includes(candidate.id)
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "bg-blue-600 hover:bg-blue-700"
                                }
                                onClick={() => {
                                  if (selectedCandidates.includes(candidate.id)) {
                                    setSelectedCandidates(prev => prev.filter(id => id !== candidate.id));
                                  } else {
                                    setSelectedCandidates(prev => [...prev, candidate.id]);
                                  }
                                }}
                              >
                                {selectedCandidates.includes(candidate.id) ? "Selected" : "Hire"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Pending Hires Summary */}
      {selectedCandidates.length > 0 && (
        <Card className="bg-green-900/20 border-green-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Pending Hires ({selectedCandidates.length})
            </CardTitle>
            <CardDescription className="text-slate-400">
              These candidates will be hired when you save your decisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedCandidates.map(candidateId => {
                const allCandidates = completedSearches.flatMap(s => s.candidates);
                const candidate = allCandidates.find(c => c.id === candidateId);
                if (!candidate) return null;
                const hiringCost = candidate.requestedSalary * 0.15;
                return (
                  <div key={candidateId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        candidate.type === 'worker' ? 'bg-blue-600/20' :
                        candidate.type === 'engineer' ? 'bg-purple-600/20' : 'bg-green-600/20'
                      }`}>
                        {candidate.type === 'worker' ? (
                          <Briefcase className="w-4 h-4 text-blue-400" />
                        ) : candidate.type === 'engineer' ? (
                          <Brain className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Award className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{candidate.name}</p>
                        <p className="text-slate-400 text-xs capitalize">{candidate.type} · Value: {calculateEmployeeValue(candidate.stats)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-white text-sm">{formatCurrency(candidate.requestedSalary)}/yr</p>
                        <p className="text-slate-400 text-xs">Hiring cost: {formatCurrency(hiringCost)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 h-8 px-2"
                        onClick={() => setSelectedCandidates(prev => prev.filter(id => id !== candidateId))}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-green-700/50 flex justify-between text-sm">
              <span className="text-slate-400">Total hiring costs</span>
              <span className="text-green-400 font-medium">
                {formatCurrency(
                  selectedCandidates.reduce((total, id) => {
                    const allCandidates = completedSearches.flatMap(s => s.candidates);
                    const candidate = allCandidates.find(c => c.id === id);
                    return total + (candidate ? candidate.requestedSalary * 0.15 : 0);
                  }, 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layoffs */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-red-400" />
            Workforce Reduction
          </CardTitle>
          <CardDescription className="text-slate-400">
            Reduce workforce to cut costs (affects morale)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { type: "Workers", role: "worker", current: workforceBreakdown.workers, min: 20 },
              { type: "Engineers", role: "engineer", current: workforceBreakdown.engineers, min: 3 },
              { type: "Supervisors", role: "supervisor", current: workforceBreakdown.supervisors, min: 1 },
            ].map((r) => {
              const pending = layoffCounts[r.role] || 0;
              const afterLayoff = r.current - pending;
              return (
              <div key={r.type} className="p-4 bg-slate-700/50 rounded-lg">
                <div className="text-slate-400 text-sm mb-2">{r.type}</div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400"
                    disabled={afterLayoff <= r.min}
                    onClick={() => setLayoffCounts(prev => ({ ...prev, [r.role]: prev[r.role] + 1 }))}
                  >
                    -
                  </Button>
                  <span className={`font-medium flex-1 text-center ${pending > 0 ? "text-red-400" : "text-white"}`}>
                    {pending > 0 ? `${r.current} → ${afterLayoff}` : r.current}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-500 text-slate-400"
                    disabled={pending <= 0}
                    onClick={() => setLayoffCounts(prev => ({ ...prev, [r.role]: Math.max(0, prev[r.role] - 1) }))}
                  >
                    +
                  </Button>
                </div>
                <div className="text-xs text-slate-500 mt-2 text-center">
                  Min: {r.min}{pending > 0 && <span className="text-red-400 ml-2">(-{pending} pending)</span>}
                </div>
              </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Layoffs significantly impact morale and may trigger voluntary departures
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
