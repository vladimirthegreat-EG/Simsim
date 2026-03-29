"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContractOrder {
  id: string;
  buyerName: string;
  segment: "Budget" | "General" | "Enthusiast" | "Professional" | "Active Lifestyle";
  volumeRequired: number;
  pricePerUnit: number;
  deadlineRound: number;
  status: "active" | "fulfilled" | "expired";
}

interface ContractOrderPanelProps {
  activeContracts: ContractOrder[];
  currentRound: number;
  onAcceptContract?: (contractId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return volume.toLocaleString();
}

function getStatusBadgeStyle(status: ContractOrder["status"]): string {
  switch (status) {
    case "active":
      return "bg-blue-600/20 text-blue-400 border-blue-500/30";
    case "fulfilled":
      return "bg-green-600/20 text-green-400 border-green-500/30";
    case "expired":
      return "bg-red-600/20 text-red-400 border-red-500/30";
    default:
      return "bg-slate-600/20 text-slate-400 border-slate-500/30";
  }
}

function getSegmentBadgeStyle(segment: ContractOrder["segment"]): string {
  switch (segment) {
    case "Budget":
      return "bg-emerald-600/20 text-emerald-400 border-emerald-500/30";
    case "General":
      return "bg-cyan-600/20 text-cyan-400 border-cyan-500/30";
    case "Enthusiast":
      return "bg-purple-600/20 text-purple-400 border-purple-500/30";
    case "Professional":
      return "bg-orange-600/20 text-orange-400 border-orange-500/30";
    case "Active Lifestyle":
      return "bg-pink-600/20 text-pink-400 border-pink-500/30";
    default:
      return "bg-slate-600/20 text-slate-400 border-slate-500/30";
  }
}

function getStatusIcon(status: ContractOrder["status"]) {
  switch (status) {
    case "active":
      return <Clock className="w-3.5 h-3.5 text-blue-400" />;
    case "fulfilled":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
    case "expired":
      return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    default:
      return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ContractOrderPanel({
  activeContracts,
  currentRound,
  onAcceptContract,
}: ContractOrderPanelProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Contract Orders
          <Badge variant="secondary" className="ml-auto">
            {activeContracts.filter((c) => c.status === "active").length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeContracts.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              No contract orders available at this time.
            </p>
            <p className="text-slate-500 text-xs mt-1">
              NPC buyers will post bulk purchase contracts as the game progresses.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeContracts.map((contract) => {
              const roundsRemaining = contract.deadlineRound - currentRound;
              const isUrgent = contract.status === "active" && roundsRemaining <= 1;
              const totalValue = contract.volumeRequired * contract.pricePerUnit;

              return (
                <div
                  key={contract.id}
                  className={`p-4 bg-slate-700/50 rounded-lg border ${
                    isUrgent
                      ? "border-amber-500/40"
                      : "border-slate-600"
                  }`}
                >
                  {/* Urgency warning banner */}
                  {isUrgent && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-500/10 rounded-md border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-amber-400 text-xs font-medium">
                        {roundsRemaining <= 0
                          ? "Deadline has passed!"
                          : "Deadline is this round!"}
                      </span>
                    </div>
                  )}

                  {/* Top row: buyer name + segment + status badges */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">
                        {contract.buyerName}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs border ${getSegmentBadgeStyle(contract.segment)}`}
                      >
                        {contract.segment}
                      </Badge>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs border flex items-center gap-1 ${getStatusBadgeStyle(contract.status)}`}
                    >
                      {getStatusIcon(contract.status)}
                      {contract.status}
                    </Badge>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {/* Volume required */}
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {formatVolume(contract.volumeRequired)} units
                      </span>
                    </div>

                    {/* Price per unit */}
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
                      <span>
                        {formatCurrency(contract.pricePerUnit)}/unit
                      </span>
                    </div>

                    {/* Deadline / rounds remaining */}
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {roundsRemaining > 0 ? (
                          <>
                            <span
                              className={
                                roundsRemaining <= 1
                                  ? "text-amber-400 font-medium"
                                  : roundsRemaining <= 2
                                    ? "text-yellow-400 font-medium"
                                    : ""
                              }
                            >
                              {roundsRemaining}
                            </span>{" "}
                            {roundsRemaining === 1 ? "round left" : "rounds left"}
                          </>
                        ) : (
                          <span className="text-red-400 font-medium">Overdue</span>
                        )}
                      </span>
                    </div>

                    {/* Total contract value */}
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <DollarSign className="w-3.5 h-3.5 text-green-400" />
                      <span>
                        Total:{" "}
                        <span className="text-green-400 font-medium">
                          {formatCurrency(totalValue)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Accept button for active contracts */}
                  {onAcceptContract && contract.status === "active" && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <button
                        onClick={() => onAcceptContract(contract.id)}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        Accept Contract
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
