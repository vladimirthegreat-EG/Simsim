"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  Leaf,
  DollarSign,
  Package,
  Globe,
  Plus,
  X,
} from "lucide-react";

interface MarketEvent {
  type: string;
  title: string;
  description: string;
  effects: Array<{ target: string; modifier: number }>;
  targetTeams: string[] | "all";
}

interface EventInjectionPanelProps {
  teams: Array<{ id: string; name: string; color: string }>;
  onInjectEvent: (event: MarketEvent) => void;
  disabled?: boolean;
}

const PRESET_EVENTS = [
  {
    type: "recession",
    title: "Economic Recession",
    description: "A major economic downturn reduces consumer spending and confidence.",
    icon: TrendingDown,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    effects: [
      { target: "gdp", modifier: -2 },
      { target: "consumerConfidence", modifier: -15 },
    ],
  },
  {
    type: "boom",
    title: "Economic Boom",
    description: "Strong economic growth boosts consumer confidence and spending.",
    icon: TrendingUp,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    effects: [
      { target: "gdp", modifier: 2 },
      { target: "consumerConfidence", modifier: 10 },
    ],
  },
  {
    type: "inflation_spike",
    title: "Inflation Spike",
    description: "Sudden inflation increase raises costs and interest rates.",
    icon: DollarSign,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    effects: [
      { target: "inflation", modifier: 3 },
    ],
  },
  {
    type: "tech_breakthrough",
    title: "Technology Breakthrough",
    description: "A major tech advancement increases demand for premium devices.",
    icon: Zap,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    effects: [
      { target: "demand_enthusiast", modifier: 0.25 },
      { target: "demand_professional", modifier: 0.20 },
    ],
  },
  {
    type: "sustainability_regulation",
    title: "Sustainability Regulation",
    description: "New environmental regulations increase ESG importance.",
    icon: Leaf,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    effects: [
      { target: "sustainabilityPremium", modifier: 0.15 },
    ],
  },
  {
    type: "supply_chain_crisis",
    title: "Supply Chain Crisis",
    description: "Global supply chain disruption affects all manufacturers.",
    icon: Package,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    effects: [
      { target: "demand_budget", modifier: -0.1 },
      { target: "demand_general", modifier: -0.1 },
    ],
  },
  {
    type: "currency_crisis",
    title: "Currency Crisis",
    description: "Major currency volatility affects international trade.",
    icon: Globe,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    effects: [],
  },
  {
    type: "price_war",
    title: "Price War",
    description: "Competitors slash prices, intensifying market competition.",
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    effects: [
      { target: "priceCompetition", modifier: 0.2 },
      { target: "demand_budget", modifier: 0.15 },
    ],
  },
];

export function EventInjectionPanel({
  teams,
  onInjectEvent,
  disabled = false,
}: EventInjectionPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customEvent, setCustomEvent] = useState({
    title: "",
    description: "",
    type: "custom",
  });
  const [targetTeams, setTargetTeams] = useState<string[] | "all">("all");
  const [showCustomForm, setShowCustomForm] = useState(false);

  const handlePresetClick = (preset: typeof PRESET_EVENTS[0]) => {
    setSelectedPreset(preset.type);
    setShowCustomForm(false);
  };

  const handleInjectPreset = () => {
    if (!selectedPreset) return;
    const preset = PRESET_EVENTS.find((p) => p.type === selectedPreset);
    if (!preset) return;

    onInjectEvent({
      type: preset.type,
      title: preset.title,
      description: preset.description,
      effects: preset.effects,
      targetTeams,
    });

    setSelectedPreset(null);
    setTargetTeams("all");
  };

  const handleInjectCustom = () => {
    if (!customEvent.title.trim()) return;

    onInjectEvent({
      type: "custom",
      title: customEvent.title,
      description: customEvent.description,
      effects: [],
      targetTeams,
    });

    setCustomEvent({ title: "", description: "", type: "custom" });
    setShowCustomForm(false);
    setTargetTeams("all");
  };

  const toggleTeamTarget = (teamId: string) => {
    if (targetTeams === "all") {
      setTargetTeams([teamId]);
    } else if (targetTeams.includes(teamId)) {
      const newTargets = targetTeams.filter((t) => t !== teamId);
      setTargetTeams(newTargets.length === 0 ? "all" : newTargets);
    } else {
      setTargetTeams([...targetTeams, teamId]);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Event Injection
        </CardTitle>
        <CardDescription className="text-slate-400">
          Inject market events to add challenges and opportunities for teams
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset Events Grid */}
        <div>
          <Label className="text-slate-300 mb-2 block">Preset Events</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PRESET_EVENTS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset === preset.type;
              return (
                <button
                  key={preset.type}
                  onClick={() => handlePresetClick(preset)}
                  disabled={disabled}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    isSelected
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className={`flex items-center gap-2 ${preset.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{preset.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Preset Details */}
        {selectedPreset && (
          <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
            {(() => {
              const preset = PRESET_EVENTS.find((p) => p.type === selectedPreset);
              if (!preset) return null;
              const Icon = preset.icon;
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${preset.color}`}>
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-white">{preset.title}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedPreset(null)}
                      className="text-slate-400 hover:text-white h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-slate-400 text-sm">{preset.description}</p>
                  {preset.effects.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {preset.effects.map((effect, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={`text-xs ${
                            effect.modifier > 0
                              ? "border-green-500 text-green-400"
                              : "border-red-500 text-red-400"
                          }`}
                        >
                          {effect.target}: {effect.modifier > 0 ? "+" : ""}
                          {typeof effect.modifier === "number" && effect.modifier < 1 && effect.modifier > -1
                            ? `${(effect.modifier * 100).toFixed(0)}%`
                            : effect.modifier}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Custom Event Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCustomForm(!showCustomForm);
              setSelectedPreset(null);
            }}
            disabled={disabled}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Custom Event
          </Button>
        </div>

        {/* Custom Event Form */}
        {showCustomForm && (
          <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-white">Custom Event</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCustomForm(false)}
                className="text-slate-400 hover:text-white h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Event Title"
              value={customEvent.title}
              onChange={(e) =>
                setCustomEvent({ ...customEvent, title: e.target.value })
              }
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Textarea
              placeholder="Event Description"
              value={customEvent.description}
              onChange={(e) =>
                setCustomEvent({ ...customEvent, description: e.target.value })
              }
              className="bg-slate-700 border-slate-600 text-white"
              rows={2}
            />
          </div>
        )}

        {/* Target Teams Selector */}
        {(selectedPreset || showCustomForm) && (
          <div>
            <Label className="text-slate-300 mb-2 block">Target Teams</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={targetTeams === "all" ? "default" : "outline"}
                onClick={() => setTargetTeams("all")}
                className={
                  targetTeams === "all"
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "border-slate-600 text-slate-300"
                }
              >
                All Teams
              </Button>
              {teams.map((team) => {
                const isSelected =
                  targetTeams !== "all" && targetTeams.includes(team.id);
                return (
                  <Button
                    key={team.id}
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => toggleTeamTarget(team.id)}
                    className={
                      isSelected
                        ? ""
                        : "border-slate-600 text-slate-300 hover:bg-slate-700"
                    }
                    style={isSelected ? { backgroundColor: team.color } : {}}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: team.color }}
                    />
                    {team.name}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Inject Button */}
        {(selectedPreset || (showCustomForm && customEvent.title)) && (
          <Button
            onClick={selectedPreset ? handleInjectPreset : handleInjectCustom}
            disabled={disabled}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            Inject Event for Next Round
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
