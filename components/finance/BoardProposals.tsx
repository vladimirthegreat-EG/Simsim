"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, DollarSign, Users, Leaf, Factory, Lightbulb } from "lucide-react";
import type { TeamState } from "@/engine/types";
import { generateBoardProposals, type BoardProposal } from "@/engine/modules/BoardProposalEngine";

interface BoardProposalsProps {
  state: TeamState | null;
  currentRound: number;
  boardDecisions: Record<string, boolean>; // proposalId → accepted
  onDecision: (proposalId: string, accepted: boolean) => void;
}

const PROPOSAL_ICONS: Record<string, React.ElementType> = {
  emergency: AlertTriangle,
  debtrepay: DollarSign,
  dividend: DollarSign,
  buyback: TrendingUp,
  morale: Users,
  esg: Leaf,
  expand: Factory,
  rd: Lightbulb,
  brand: TrendingUp,
};

function getProposalIcon(proposalId: string): React.ElementType {
  for (const [key, icon] of Object.entries(PROPOSAL_ICONS)) {
    if (proposalId.includes(key)) return icon;
  }
  return DollarSign;
}

export function BoardProposals({ state, currentRound, boardDecisions, onDecision }: BoardProposalsProps) {
  const proposals = useMemo(() => {
    if (!state) return [];
    return generateBoardProposals(state, currentRound);
  }, [state, currentRound]);

  if (proposals.length === 0) return null;

  return (
    <Card className="bg-slate-800/80 border-amber-700/30 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Board Meeting — Round {currentRound}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposals.map((proposal) => {
          const Icon = getProposalIcon(proposal.id);
          const decision = boardDecisions[proposal.id];
          const hasDecided = decision !== undefined;

          return (
            <div
              key={proposal.id}
              className={`p-4 rounded-lg border transition-all ${
                hasDecided
                  ? decision
                    ? "border-green-600/30 bg-green-900/10"
                    : "border-slate-600/30 bg-slate-800/50"
                  : "border-amber-600/30 bg-amber-900/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                  proposal.type === "financial" ? "bg-green-500/10" : "bg-blue-500/10"
                }`}>
                  <Icon className={`w-5 h-5 ${
                    proposal.type === "financial" ? "text-green-400" : "text-blue-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{proposal.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${
                      proposal.type === "financial"
                        ? "text-green-400 border-green-500/30"
                        : "text-blue-400 border-blue-500/30"
                    }`}>
                      {proposal.type}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-sm mb-1">{proposal.description}</p>
                  <p className="text-slate-500 text-xs mb-3">Trigger: {proposal.trigger}</p>

                  {hasDecided ? (
                    <div className="flex items-center gap-2">
                      <Badge className={decision ? "bg-green-600" : "bg-slate-600"}>
                        {decision ? "Accepted" : "Declined"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-500 h-6 text-xs"
                        onClick={() => onDecision(proposal.id, !decision)}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => onDecision(proposal.id, true)}
                      >
                        {proposal.acceptLabel}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-500 text-slate-300"
                        onClick={() => onDecision(proposal.id, false)}
                      >
                        {proposal.declineLabel}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
