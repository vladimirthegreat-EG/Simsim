"use client";

import { createContext, useContext, ReactNode } from "react";
import {
  GameComplexitySettings,
  ComplexityPreset,
  COMPLEXITY_PRESETS,
} from "@/engine/types";

// Default to standard complexity
const defaultSettings: GameComplexitySettings = {
  preset: "standard",
  ...COMPLEXITY_PRESETS.standard,
};

interface ComplexityContextValue {
  settings: GameComplexitySettings;
  preset: ComplexityPreset;
  // Helper functions for checking feature availability
  isModuleEnabled: (module: keyof GameComplexitySettings["modules"]) => boolean;
  isFeatureEnabled: (feature: keyof GameComplexitySettings["features"]) => boolean;
  isAutomationEnabled: (automation: keyof GameComplexitySettings["automation"]) => boolean;
}

const ComplexityContext = createContext<ComplexityContextValue | null>(null);

interface ComplexityProviderProps {
  children: ReactNode;
  settings?: GameComplexitySettings;
}

export function ComplexityProvider({ children, settings = defaultSettings }: ComplexityProviderProps) {
  const value: ComplexityContextValue = {
    settings,
    preset: settings.preset,
    isModuleEnabled: (module) => settings.modules[module],
    isFeatureEnabled: (feature) => settings.features[feature],
    isAutomationEnabled: (automation) => settings.automation[automation],
  };

  return (
    <ComplexityContext.Provider value={value}>
      {children}
    </ComplexityContext.Provider>
  );
}

export function useComplexity() {
  const context = useContext(ComplexityContext);
  if (!context) {
    // Return default values if not in provider (for backwards compatibility)
    return {
      settings: defaultSettings,
      preset: "standard" as ComplexityPreset,
      isModuleEnabled: () => true,
      isFeatureEnabled: () => true,
      isAutomationEnabled: () => false,
    };
  }
  return context;
}

// Helper hook for conditional rendering based on complexity
export function useFeatureFlag(feature: keyof GameComplexitySettings["features"]) {
  const { isFeatureEnabled } = useComplexity();
  return isFeatureEnabled(feature);
}

export function useModuleFlag(module: keyof GameComplexitySettings["modules"]) {
  const { isModuleEnabled } = useComplexity();
  return isModuleEnabled(module);
}
