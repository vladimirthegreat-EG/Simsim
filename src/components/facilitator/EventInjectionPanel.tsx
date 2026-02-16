"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    borderColor: "border-red-500/20",
    glowColor: "shadow-red-500/10",
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
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    glowColor: "shadow-emerald-500/10",
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
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    glowColor: "shadow-amber-500/10",
    effects: [
      { target: "inflation", modifier: 3 },
    ],
  },
  {
    type: "tech_breakthrough",
    title: "Tech Breakthrough",
    description: "A major tech advancement increases demand for premium devices.",
    icon: Zap,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    glowColor: "shadow-blue-500/10",
    effects: [
      { target: "demand_enthusiast", modifier: 0.25 },
      { target: "demand_professional", modifier: 0.20 },
    ],
  },
  {
    type: "sustainability_regulation",
    title: "Green Regulation",
    description: "New environmental regulations increase ESG importance.",
    icon: Leaf,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    glowColor: "shadow-emerald-500/10",
    effects: [
      { target: "sustainabilityPremium", modifier: 0.15 },
    ],
  },
  {
    type: "supply_chain_crisis",
    title: "Supply Crisis",
    description: "Global supply chain disruption affects all manufacturers.",
    icon: Package,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    glowColor: "shadow-orange-500/10",
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
    borderColor: "border-purple-500/20",
    glowColor: "shadow-purple-500/10",
    effects: [],
  },
  {
    type: "price_war",
    title: "Price War",
    description: "Competitors slash prices, intensifying market competition.",
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    glowColor: "shadow-amber-500/10",
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Event Injection
        </h3>
        <p className="text-slate-500 text-sm mt-0.5">
          Inject market events to add challenges and opportunities for teams
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Preset Events Grid */}
        <div>
          <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2.5 block">Preset Events</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PRESET_EVENTS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset === preset.type;
              return (
                <button
                  key={preset.type}
                  onClick={() => handlePresetClick(preset)}
                  disabled={disabled}
                  className={`group p-3 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? `${preset.borderColor} ${preset.bgColor} shadow-lg ${preset.glowColor}`
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className={`flex items-center gap-2 ${isSelected ? preset.color : "text-slate-500 group-hover:text-slate-300"} transition-colors`}>
                    <div className={`rounded-lg p-1.5 ${isSelected ? preset.bgColor : "bg-slate-800"} transition-colors`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium leading-tight">{preset.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Preset Details */}
        {selectedPreset && (
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            {(() => {
              const preset = PRESET_EVENTS.find((p) => p.type === selectedPreset);
              if (!preset) return null;
              const Icon = preset.icon;
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${preset.color}`}>
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold text-white">{preset.title}</span>
                    </div>
                    <button
                      onClick={() => setSelectedPreset(null)}
                      className="text-slate-600 hover:text-slate-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-slate-400 text-sm">{preset.description}</p>
                  {preset.effects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {preset.effects.map((effect, idx) => (
                        <Badge
                          key={idx}
                          className={`text-xs border-0 ${
                            effect.modifier > 0
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowCustomForm(!showCustomForm);
            setSelectedPreset(null);
          }}
          disabled={disabled}
          className="border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-slate-800 hover:border-slate-600 gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Custom Event
        </Button>

        {/* Custom Event Form */}
        {showCustomForm && (
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-white font-medium">Custom Event</Label>
              <button
                onClick={() => setShowCustomForm(false)}
                className="text-slate-600 hover:text-slate-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input
              placeholder="Event Title"
              value={customEvent.title}
              onChange={(e) =>
                setCustomEvent({ ...customEvent, title: e.target.value })
              }
              className="bg-slate-800 border-slate-700 text-white focus:border-purple-500 focus:ring-purple-500/20"
            />
            <Textarea
              placeholder="Event Description"
              value={customEvent.description}
              onChange={(e) =>
                setCustomEvent({ ...customEvent, description: e.target.value })
              }
              className="bg-slate-800 border-slate-700 text-white focus:border-purple-500 focus:ring-purple-500/20"
              rows={2}
            />
          </div>
        )}

        {/* Target Teams Selector */}
        {(selectedPreset || showCustomForm) && (
          <div>
            <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2.5 block">Target Teams</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setTargetTeams("all")}
                className={`transition-all duration-200 ${
                  targetTeams === "all"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300"
                }`}
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
                    onClick={() => toggleTeamTarget(team.id)}
                    className={`transition-all duration-200 gap-1.5 ${
                      isSelected
                        ? "border text-white"
                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300"
                    }`}
                    style={isSelected ? { backgroundColor: `${team.color}20`, borderColor: `${team.color}40`, color: team.color } : {}}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
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
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-500/20 gap-2 transition-all duration-300"
          >
            <Zap className="w-4 h-4" />
            Inject Event for Next Round
          </Button>
        )}
      </div>
    </div>
  );
}
