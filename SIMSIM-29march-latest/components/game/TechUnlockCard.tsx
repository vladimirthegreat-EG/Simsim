"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beaker, Sparkles, Zap } from "lucide-react";
import { CONSTANTS } from "@/engine/types";

const TECH_LOOKUP: Record<string, { name: string; description: string; level: number }> = {
  process_optimization: { name: CONSTANTS.RD_TECH_TREE.process_optimization.name, description: CONSTANTS.RD_TECH_TREE.process_optimization.description, level: 1 },
  advanced_manufacturing: { name: CONSTANTS.RD_TECH_TREE.advanced_manufacturing.name, description: CONSTANTS.RD_TECH_TREE.advanced_manufacturing.description, level: 2 },
  industry_4_0: { name: CONSTANTS.RD_TECH_TREE.industry_4_0.name, description: CONSTANTS.RD_TECH_TREE.industry_4_0.description, level: 3 },
  breakthrough_tech: { name: CONSTANTS.RD_TECH_TREE.breakthrough_tech.name, description: CONSTANTS.RD_TECH_TREE.breakthrough_tech.description, level: 4 },
};

interface TechUnlockCardProps {
  messages: string[];
  totalTechsUnlocked: number;
}

function parseTechId(message: string): string | null {
  // Messages are like "Technology unlocked: process optimization!"
  const match = message.match(/Technology unlocked:\s*(.+?)!/i);
  if (!match) return null;
  return match[1].trim().toLowerCase().replace(/\s+/g, "_");
}

export function TechUnlockCard({ messages, totalTechsUnlocked }: TechUnlockCardProps) {
  const techs = messages
    .map((msg) => {
      const techId = parseTechId(msg);
      if (!techId || !TECH_LOOKUP[techId]) return null;
      return { id: techId, ...TECH_LOOKUP[techId] };
    })
    .filter(Boolean) as Array<{ id: string; name: string; description: string; level: number }>;

  if (techs.length === 0) return null;

  return (
    <Card className="bg-slate-800 border-purple-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-white font-semibold text-base">
                {techs.length === 1 ? "Technology Unlocked!" : `${techs.length} Technologies Unlocked!`}
              </h3>
              <p className="text-slate-400 text-sm">
                {totalTechsUnlocked} of 4 tech levels unlocked
              </p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {techs.map((tech) => (
            <div
              key={tech.id}
              className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/20"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-white font-medium text-sm">{tech.name}</span>
                  <p className="text-slate-400 text-xs">{tech.description}</p>
                </div>
              </div>
              <Badge className="bg-purple-500/20 text-purple-400">
                Level {tech.level}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
