"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CONSTANTS, type Segment } from "@/engine/types";
import { Target } from "lucide-react";

const SEGMENTS: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
const FACTORS = ["price", "quality", "brand", "esg", "features"] as const;
const FACTOR_LABELS: Record<string, string> = {
  price: "Price",
  quality: "Quality",
  brand: "Brand",
  esg: "ESG",
  features: "Features",
};
const FACTOR_COLORS: Record<string, string> = {
  price: "bg-green-500",
  quality: "bg-blue-500",
  brand: "bg-pink-500",
  esg: "bg-emerald-500",
  features: "bg-purple-500",
};

export function WinConditionMatrix() {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-white font-semibold text-base">Scoring Weight Matrix</h3>
            <p className="text-slate-400 text-sm">How each segment scores products (out of 100)</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 pb-2 pr-4">Segment</th>
                {FACTORS.map((f) => (
                  <th key={f} className="text-center text-slate-400 pb-2 px-2 min-w-[80px]">
                    {FACTOR_LABELS[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEGMENTS.map((segment) => {
                const weights = CONSTANTS.SEGMENT_WEIGHTS[segment];
                const maxFactor = FACTORS.reduce((max, f) =>
                  weights[f] > weights[max] ? f : max, FACTORS[0]
                );

                return (
                  <tr key={segment} className="border-b border-slate-700/50">
                    <td className="py-2.5 pr-4 text-white font-medium whitespace-nowrap">{segment}</td>
                    {FACTORS.map((f) => {
                      const val = weights[f];
                      const isMax = f === maxFactor;

                      return (
                        <td key={f} className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${FACTOR_COLORS[f]} ${isMax ? "opacity-100" : "opacity-60"}`}
                                style={{ width: `${val}%` }}
                              />
                            </div>
                            <span className={`text-xs tabular-nums w-6 text-right ${isMax ? "text-white font-bold" : "text-slate-400"}`}>
                              {val}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
