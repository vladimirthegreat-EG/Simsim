"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { HiringRequirement } from "@/lib/hooks/calculateHiringRequirements";

interface HiringRequirementsPanelProps {
  requirements: HiringRequirement[];
}

const URGENCY_STYLES = {
  critical: "bg-red-500/10 border-red-500/30 text-red-400",
  recommended: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  optional: "bg-slate-500/10 border-slate-600 text-slate-400",
};

const URGENCY_LABELS = {
  critical: "Critical",
  recommended: "Recommended",
  optional: "Sufficient",
};

export function HiringRequirementsPanel({ requirements }: HiringRequirementsPanelProps) {
  const hasShortfall = requirements.some(r => r.shortfall > 0);
  if (!hasShortfall) return null;

  return (
    <Card className="bg-slate-800 border-slate-700 border-amber-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-white font-semibold text-sm">Staffing Requirements</h3>
            <p className="text-slate-400 text-xs">Based on your current operations</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {requirements.filter(r => r.shortfall > 0).map((req) => (
            <div
              key={req.role}
              className={`flex items-center justify-between p-3 rounded-lg border ${URGENCY_STYLES[req.urgency]}`}
            >
              <div className="flex items-center gap-3">
                {req.urgency === "critical" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <div>
                  <span className="text-white font-medium text-sm capitalize">{req.role}s</span>
                  <p className="text-slate-400 text-xs">
                    {req.currentCount}/{req.requiredCount} — need {req.shortfall} more
                  </p>
                  {req.reason.length > 0 && (
                    <p className="text-slate-500 text-xs">{req.reason[0]}</p>
                  )}
                </div>
              </div>
              <Badge className={URGENCY_STYLES[req.urgency]}>
                {URGENCY_LABELS[req.urgency]}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
