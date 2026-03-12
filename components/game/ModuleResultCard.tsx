"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Factory,
  Users,
  DollarSign,
  Megaphone,
  Lightbulb,
  Info,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const MODULE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  factory: { label: "Factory", icon: Factory, color: "text-orange-400" },
  hr: { label: "HR", icon: Users, color: "text-blue-400" },
  finance: { label: "Finance", icon: DollarSign, color: "text-green-400" },
  marketing: { label: "Marketing", icon: Megaphone, color: "text-pink-400" },
  rd: { label: "R&D", icon: Lightbulb, color: "text-purple-400" },
};

function getMessageIcon(msg: string) {
  const lower = msg.toLowerCase();
  if (lower.includes("technology unlocked"))
    return <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
  if (lower.includes("warning") || lower.includes("risk") || lower.includes("penalty"))
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (lower.includes("improved") || lower.includes("success") || lower.includes("increased"))
    return <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
}

interface ModuleResultCardProps {
  moduleId: string;
  messages: string[];
  costs?: number;
}

export function ModuleResultCard({ moduleId, messages, costs }: ModuleResultCardProps) {
  const meta = MODULE_META[moduleId] ?? { label: moduleId, icon: Info, color: "text-slate-400" };
  const Icon = meta.icon;

  if (messages.length === 0) return null;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${meta.color}`} />
            <span className="text-white font-medium text-sm">{meta.label}</span>
          </div>
          {costs !== undefined && costs > 0 && (
            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
              ${(costs / 1_000_000).toFixed(1)}M spent
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {messages.map((msg, i) => {
            const isTechUnlock = msg.toLowerCase().includes("technology unlocked");
            return (
              <div key={i} className={`flex items-start gap-2 text-sm ${isTechUnlock ? "text-purple-300" : "text-slate-300"}`}>
                {getMessageIcon(msg)}
                <span className={isTechUnlock ? "font-medium" : ""}>{msg}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
