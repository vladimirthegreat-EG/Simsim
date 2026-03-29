"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, CheckCircle2, ChevronDown } from "lucide-react";
import { useGuidanceStore } from "@/lib/stores/guidanceStore";

interface GuidanceBannerProps {
  basePath: string;
}

export function GuidanceBanner({ basePath }: GuidanceBannerProps) {
  const pathname = usePathname();
  const { active, currentStep, steps, dismiss } = useGuidanceStore();

  if (!active || currentStep >= steps.length) return null;

  const current = steps[currentStep];

  // Check if user is currently on the target module's page
  const isOnTargetModule = pathname.includes(`/${current.moduleId}`) ||
    (current.moduleId === "rnd" && pathname.includes("/rnd"));

  // Build completed modules list
  const completedModules = steps.slice(0, currentStep).map(s => s.moduleName);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`guidance-${currentStep}-${isOnTargetModule ? "inside" : "nav"}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-24 right-6 z-40 max-w-sm"
      >
        <div className="bg-slate-800/95 backdrop-blur-md border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                Round 1 Guide
              </span>
              <span className="text-slate-500 text-xs">
                {currentStep + 1}/{steps.length}
              </span>
            </div>
            <button
              onClick={dismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
              aria-label="Dismiss guidance"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 px-4 py-2 bg-slate-900/50">
            {steps.map((step, i) => (
              <div
                key={step.moduleId}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < currentStep
                    ? "bg-emerald-500"
                    : i === currentStep
                    ? "bg-cyan-400"
                    : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            {!isOnTargetModule ? (
              /* Arrow pointing to nav */
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="mt-0.5 flex-shrink-0"
                >
                  <ArrowRight className="w-5 h-5 text-cyan-400" />
                </motion.div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {current.navLabel}
                  </p>
                  {completedModules.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {completedModules.map(name => (
                        <span key={name} className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Hint for inside the module */
              <div className="flex items-start gap-3">
                <ChevronDown className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0 animate-bounce" />
                <div>
                  <p className="text-white text-sm font-medium">
                    {current.insideHint}
                  </p>
                  {completedModules.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {completedModules.map(name => (
                        <span key={name} className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
