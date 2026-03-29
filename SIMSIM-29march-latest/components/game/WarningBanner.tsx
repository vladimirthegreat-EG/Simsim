"use client";

import { AlertTriangle, XCircle } from "lucide-react";
import type { ModuleWarning } from "@/lib/hooks/useCrossModuleWarnings";

interface WarningBannerProps {
  warnings: ModuleWarning[];
}

export function WarningBanner({ warnings }: WarningBannerProps) {
  if (warnings.length === 0) return null;

  const criticals = warnings.filter(w => w.severity === "critical");
  const others = warnings.filter(w => w.severity === "warning");

  return (
    <div className="space-y-2">
      {criticals.map((w, i) => (
        <div
          key={`c-${i}`}
          className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-red-300 text-sm">{w.message}</span>
        </div>
      ))}
      {others.map((w, i) => (
        <div
          key={`w-${i}`}
          className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-300 text-sm">{w.message}</span>
        </div>
      ))}
    </div>
  );
}
