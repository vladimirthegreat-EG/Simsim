"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Users,
  Handshake,
  Swords,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Beaker,
} from "lucide-react";

interface ResearchProposal {
  id: string;
  proposerTeamId: string;
  techId: string;
  costPerTeam: number;
  totalCost: number;
  acceptedTeamIds: string[];
  proposedRound: number;
  deadlineRound: number;
  status: "pending" | "accepted" | "completed" | "expired";
  type: "joint" | "race";
}

interface CollaborativeResearchProps {
  proposals: ResearchProposal[];
  currentTeamId: string;
  currentRound: number;
  onAccept?: (proposalId: string) => void;
  onDecline?: (proposalId: string) => void;
  onPropose?: () => void;
}

function formatCost(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function getStatusStyle(status: ResearchProposal["status"]): string {
  switch (status) {
    case "pending": return "bg-amber-500/20 text-amber-400";
    case "accepted": return "bg-blue-500/20 text-blue-400";
    case "completed": return "bg-green-500/20 text-green-400";
    case "expired": return "bg-slate-500/20 text-slate-400";
  }
}

export function CollaborativeResearch({
  proposals,
  currentTeamId,
  currentRound,
  onAccept,
  onDecline,
  onPropose,
}: CollaborativeResearchProps) {
  const pendingForMe = proposals.filter(
    p => p.status === "pending" && p.proposerTeamId !== currentTeamId && !p.acceptedTeamIds.includes(currentTeamId)
  );
  const myProposals = proposals.filter(p => p.proposerTeamId === currentTeamId);
  const activeCollabs = proposals.filter(
    p => p.status === "accepted" && p.acceptedTeamIds.includes(currentTeamId)
  );

  if (proposals.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Handshake className="w-5 h-5 text-indigo-400" />
            Collaborative Research
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm mb-1">No research proposals yet</p>
            <p className="text-slate-500 text-xs mb-4">
              Propose joint research to split costs with other teams, or race to be first for patent rights.
            </p>
            {onPropose && (
              <button
                onClick={onPropose}
                className="px-4 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors"
              >
                <Beaker className="w-4 h-4 inline mr-1.5" />
                Propose Research
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Handshake className="w-5 h-5 text-indigo-400" />
            Collaborative Research
          </CardTitle>
          {onPropose && (
            <button
              onClick={onPropose}
              className="px-3 py-1.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs hover:bg-indigo-500/30 transition-colors"
            >
              + New Proposal
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Incoming proposals requiring action */}
        {pendingForMe.length > 0 && (
          <div>
            <h4 className="text-amber-400 text-xs font-medium uppercase mb-2">Incoming Proposals</h4>
            {pendingForMe.map((p) => (
              <div key={p.id} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {p.type === "joint" ? (
                      <Handshake className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Swords className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-white text-sm font-medium">{p.techId}</span>
                    <Badge className={cn("text-[10px]", p.type === "joint" ? "bg-indigo-500/20 text-indigo-400" : "bg-red-500/20 text-red-400")}>
                      {p.type === "joint" ? "Joint" : "Race"}
                    </Badge>
                  </div>
                  <Badge className={getStatusStyle(p.status)}>{p.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-slate-500">Your cost</span>
                    <div className="text-green-400 font-medium">{formatCost(p.costPerTeam)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Proposed by</span>
                    <div className="text-slate-300">{p.proposerTeamId}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Deadline</span>
                    <div className="text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      R{p.deadlineRound}
                    </div>
                  </div>
                </div>
                {onAccept && onDecline && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onAccept(p.id)}
                      className="flex-1 px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs hover:bg-green-500/30 transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => onDecline(p.id)}
                      className="flex-1 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Active collaborations */}
        {activeCollabs.length > 0 && (
          <div>
            <h4 className="text-blue-400 text-xs font-medium uppercase mb-2">Active Collaborations</h4>
            {activeCollabs.map((p) => (
              <div key={p.id} className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-blue-400" />
                    <span className="text-white text-sm">{p.techId}</span>
                  </div>
                  <Badge className={getStatusStyle(p.status)}>{p.status}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {p.acceptedTeamIds.length} teams
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> {formatCost(p.costPerTeam)}/team
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My proposals */}
        {myProposals.length > 0 && (
          <div>
            <h4 className="text-slate-400 text-xs font-medium uppercase mb-2">Your Proposals</h4>
            {myProposals.map((p) => (
              <div key={p.id} className="p-2.5 bg-slate-700/30 border border-slate-700 rounded-lg mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">{p.techId}</span>
                  <Badge className={getStatusStyle(p.status)} >{p.status}</Badge>
                </div>
                <span className="text-slate-500 text-xs">{p.acceptedTeamIds.length} accepted</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
