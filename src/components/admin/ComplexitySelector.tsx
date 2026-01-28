"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GameComplexitySettings,
  ComplexityPreset,
  COMPLEXITY_PRESETS,
  getComplexitySettings,
} from "@/engine/types";
import {
  Zap,
  Settings,
  Rocket,
  Sliders,
  Factory,
  Users,
  DollarSign,
  Megaphone,
  Beaker,
  Leaf,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

interface ComplexitySelectorProps {
  value: GameComplexitySettings;
  onChange: (settings: GameComplexitySettings) => void;
}

const PRESET_INFO: Record<ComplexityPreset, {
  name: string;
  description: string;
  icon: typeof Zap;
  color: string;
  recommended?: string;
}> = {
  simple: {
    name: "Simple",
    description: "Perfect for beginners or short sessions. Core mechanics only.",
    icon: Zap,
    color: "text-green-400",
    recommended: "1-2 hour sessions",
  },
  standard: {
    name: "Standard",
    description: "Full simulation experience with all features enabled.",
    icon: Settings,
    color: "text-blue-400",
    recommended: "Full workshops",
  },
  advanced: {
    name: "Advanced",
    description: "Maximum complexity with increased difficulty.",
    icon: Rocket,
    color: "text-purple-400",
    recommended: "Experienced players",
  },
  custom: {
    name: "Custom",
    description: "Fine-tune every setting to your needs.",
    icon: Sliders,
    color: "text-orange-400",
  },
};

const MODULE_INFO: Record<keyof GameComplexitySettings["modules"], {
  name: string;
  description: string;
  icon: typeof Factory;
}> = {
  factory: { name: "Factory", description: "Production management and upgrades", icon: Factory },
  hr: { name: "HR", description: "Employee hiring, training, and management", icon: Users },
  finance: { name: "Finance", description: "Funding, investments, and board relations", icon: DollarSign },
  marketing: { name: "Marketing", description: "Advertising, branding, and promotions", icon: Megaphone },
  rd: { name: "R&D", description: "Product development and innovation", icon: Beaker },
  esg: { name: "ESG", description: "Environmental and social responsibility", icon: Leaf },
};

const FEATURE_INFO: Record<keyof GameComplexitySettings["features"], {
  name: string;
  description: string;
}> = {
  multipleFactories: { name: "Multiple Factories", description: "Build factories in different regions" },
  employeeManagement: { name: "Employee Management", description: "Individual employee tracking and management" },
  detailedFinancials: { name: "Detailed Financials", description: "Full financial statements and ratios" },
  boardMeetings: { name: "Board Meetings", description: "Proposals and board approval mechanics" },
  marketEvents: { name: "Market Events", description: "Random economic events and disruptions" },
  rubberBanding: { name: "Catch-up Mechanics", description: "Help trailing teams stay competitive" },
  productDevelopmentTimeline: { name: "Development Timeline", description: "Products take time to develop" },
  trainingFatigue: { name: "Training Fatigue", description: "Diminishing returns on repeated training" },
  benefitsSystem: { name: "Benefits System", description: "Employee benefits affecting morale" },
  inventoryManagement: { name: "Inventory Management", description: "Track inventory and COGS" },
};

export function ComplexitySelector({ value, onChange }: ComplexitySelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(value.preset === "custom");

  const handlePresetChange = (preset: ComplexityPreset) => {
    if (preset === "custom") {
      // Keep current settings but mark as custom
      onChange({ ...value, preset: "custom" });
      setShowAdvanced(true);
    } else {
      onChange(getComplexitySettings(preset));
      setShowAdvanced(false);
    }
  };

  const handleModuleToggle = (module: keyof GameComplexitySettings["modules"]) => {
    onChange({
      ...value,
      preset: "custom",
      modules: { ...value.modules, [module]: !value.modules[module] },
    });
  };

  const handleFeatureToggle = (feature: keyof GameComplexitySettings["features"]) => {
    onChange({
      ...value,
      preset: "custom",
      features: { ...value.features, [feature]: !value.features[feature] },
    });
  };

  return (
    <div className="space-y-4">
      {/* Preset Selection */}
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(PRESET_INFO) as ComplexityPreset[]).map((preset) => {
          const info = PRESET_INFO[preset];
          const Icon = info.icon;
          const isSelected = value.preset === preset;

          return (
            <Card
              key={preset}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "bg-slate-700 border-purple-500 ring-2 ring-purple-500/20"
                  : "bg-slate-800 border-slate-700 hover:border-slate-600"
              }`}
              onClick={() => handlePresetChange(preset)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? info.color : "text-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isSelected ? "text-white" : "text-slate-300"}`}>
                        {info.name}
                      </span>
                      {info.recommended && (
                        <Badge className="text-xs bg-slate-600 hidden sm:inline-flex">
                          {info.recommended}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{info.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preset Summary */}
      {value.preset !== "custom" && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {Object.entries(value.modules).map(([key, enabled]) => {
                  const info = MODULE_INFO[key as keyof typeof MODULE_INFO];
                  return (
                    <Badge
                      key={key}
                      className={enabled ? "bg-green-600/20 text-green-400 border border-green-600/30" : "bg-slate-700 text-slate-500"}
                    >
                      {info.name}
                    </Badge>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
              >
                Customize
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Custom Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="modules" className="w-full">
              <TabsList className="bg-slate-700 w-full">
                <TabsTrigger value="modules" className="flex-1 data-[state=active]:bg-slate-600">
                  Modules
                </TabsTrigger>
                <TabsTrigger value="features" className="flex-1 data-[state=active]:bg-slate-600">
                  Features
                </TabsTrigger>
              </TabsList>

              <TabsContent value="modules" className="mt-3 space-y-3">
                {Object.entries(MODULE_INFO).map(([key, info]) => {
                  const Icon = info.icon;
                  const enabled = value.modules[key as keyof typeof value.modules];
                  return (
                    <div key={key} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${enabled ? "text-green-400" : "text-slate-500"}`} />
                        <div>
                          <Label className="text-slate-200 text-sm">{info.name}</Label>
                          <p className="text-xs text-slate-400">{info.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => handleModuleToggle(key as keyof typeof value.modules)}
                      />
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="features" className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(FEATURE_INFO).map(([key, info]) => {
                  const enabled = value.features[key as keyof typeof value.features];
                  return (
                    <div key={key} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <div className="flex-1 min-w-0 pr-2">
                        <Label className="text-slate-200 text-sm">{info.name}</Label>
                        <p className="text-xs text-slate-400 truncate">{info.description}</p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => handleFeatureToggle(key as keyof typeof value.features)}
                      />
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>

            {/* Difficulty Info */}
            <div className="mt-4 p-2 bg-slate-700/30 rounded flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-400">
                <p>Starting Cash: ${(value.difficulty.startingCash / 1_000_000).toFixed(0)}M</p>
                <p>Market Volatility: {(value.difficulty.marketVolatility * 100).toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Compact version for display only
export function ComplexityBadge({ preset }: { preset: ComplexityPreset }) {
  const info = PRESET_INFO[preset];
  const Icon = info.icon;

  return (
    <Badge className={`gap-1 ${
      preset === "simple" ? "bg-green-600/20 text-green-400 border border-green-600/30" :
      preset === "standard" ? "bg-blue-600/20 text-blue-400 border border-blue-600/30" :
      preset === "advanced" ? "bg-purple-600/20 text-purple-400 border border-purple-600/30" :
      "bg-orange-600/20 text-orange-400 border border-orange-600/30"
    }`}>
      <Icon className="w-3 h-3" />
      {info.name}
    </Badge>
  );
}
