"use client";

import { ReactNode, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Factory,
  DollarSign,
  Users,
  Megaphone,
  Lightbulb,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Menu,
  CheckCircle2,
  AlertCircle,
  Lock,
  BarChart3,
  X,
  Zap,
  Settings,
  Rocket,
  Radio,
  Trophy,
  GraduationCap,
} from "lucide-react";
import { useDecisionStore, GameModule } from "@/lib/stores/decisionStore";
import { useComplexity } from "@/lib/contexts/ComplexityContext";
import { ComplexityPreset } from "@/engine/types";
import { NewsTicker } from "@/components/game/NewsTicker";
import { TutorialGuide } from "@/components/game/TutorialGuide";
import { WorkflowGuide } from "@/components/game/WorkflowGuide";
import { useTutorialStore } from "@/lib/stores/tutorialStore";
import { GlossaryPanel, GlossaryButton } from "@/components/game/GlossaryPanel";

// Map module IDs to store keys
const moduleToStoreKey: Record<string, GameModule> = {
  factory: "FACTORY",
  finance: "FINANCE",
  hr: "HR",
  marketing: "MARKETING",
  rnd: "RD",
};

interface GameLayoutProps {
  children: ReactNode;
  gameId: string;
  gameName: string;
  teamName: string;
  teamColor: string;
  currentRound: number;
  maxRounds: number;
  gameStatus: string;
  complexityPreset?: ComplexityPreset;
}

// Map module IDs to complexity module keys
const moduleToComplexityKey: Record<string, keyof ReturnType<typeof useComplexity>["settings"]["modules"] | null> = {
  overview: null, // Always visible
  factory: "factory",
  finance: "finance",
  hr: "hr",
  marketing: "marketing",
  rnd: "rd",
  news: null, // Always visible
  results: null, // Always visible
  achievements: null, // Always visible
};

const modules = [
  {
    id: "overview",
    name: "Overview",
    icon: LayoutDashboard,
    path: "",
    color: "text-slate-400",
  },
  {
    id: "factory",
    name: "Factory",
    icon: Factory,
    path: "/factory",
    color: "text-orange-400",
  },
  {
    id: "finance",
    name: "Finance",
    icon: DollarSign,
    path: "/finance",
    color: "text-green-400",
  },
  {
    id: "hr",
    name: "HR",
    icon: Users,
    path: "/hr",
    color: "text-blue-400",
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Megaphone,
    path: "/marketing",
    color: "text-pink-400",
  },
  {
    id: "rnd",
    name: "R&D",
    icon: Lightbulb,
    path: "/rnd",
    color: "text-purple-400",
  },
  {
    id: "news",
    name: "News",
    icon: Radio,
    path: "/news",
    color: "text-red-400",
  },
  {
    id: "results",
    name: "Results",
    icon: BarChart3,
    path: "/results",
    color: "text-cyan-400",
  },
  {
    id: "achievements",
    name: "Achievements",
    icon: Trophy,
    path: "/achievements",
    color: "text-yellow-400",
  },
];

export function GameLayout({
  children,
  gameId,
  gameName,
  teamName,
  teamColor,
  currentRound,
  maxRounds,
  gameStatus,
  complexityPreset = "standard",
}: GameLayoutProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const submissionStatus = useDecisionStore((state) => state.submissionStatus);
  const { isModuleEnabled } = useComplexity();
  const tutorialActive = useTutorialStore((s) => s.isActive);

  // Support both /game/[gameId] and /demo routes
  const basePath = gameId === "demo" ? "/demo" : `/game/${gameId}`;

  // Filter modules based on complexity settings
  const visibleModules = useMemo(() => {
    return modules.filter((module) => {
      const complexityKey = moduleToComplexityKey[module.id];
      // Always show modules without complexity mapping (overview, results)
      if (complexityKey === null) return true;
      // Check if module is enabled in complexity settings
      return isModuleEnabled(complexityKey);
    });
  }, [isModuleEnabled]);

  // Complexity badge icon
  const ComplexityIcon = complexityPreset === "simple" ? Zap : complexityPreset === "advanced" ? Rocket : Settings;

  // Get status icon for a module
  const getStatusIcon = (moduleId: string) => {
    const storeKey = moduleToStoreKey[moduleId];
    if (!storeKey) return null;

    const status = submissionStatus[storeKey];
    if (status.isLocked) {
      return <Lock className="w-3 h-3 text-green-400" />;
    }
    if (status.isSubmitted && !status.isDirty) {
      return <CheckCircle2 className="w-3 h-3 text-blue-400" />;
    }
    if (status.isDirty) {
      return <AlertCircle className="w-3 h-3 text-yellow-400" />;
    }
    return null;
  };

  const isActiveModule = (modulePath: string) => {
    if (modulePath === "") {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(`${basePath}${modulePath}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Mobile menu button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg border border-slate-700 shadow-lg"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
      >
        <AnimatePresence mode="wait">
          {mobileMenuOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 bg-slate-800 border-r border-slate-700 transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700">
          {!sidebarCollapsed && (
            <>
              <h2 className="text-white font-bold truncate">{gameName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: teamColor }}
                />
                <span className="text-slate-400 text-sm truncate">{teamName}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  className={cn(
                    "text-xs",
                    gameStatus === "IN_PROGRESS"
                      ? "bg-green-500/20 text-green-400"
                      : gameStatus === "PAUSED"
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-slate-500/20 text-slate-400"
                  )}
                >
                  {gameStatus.replace("_", " ")}
                </Badge>
                <span className="text-slate-500 text-xs">
                  Round {currentRound}/{maxRounds}
                </span>
              </div>
              <div className="mt-2">
                <Badge
                  className={cn(
                    "text-xs gap-1",
                    complexityPreset === "simple"
                      ? "bg-green-500/20 text-green-400"
                      : complexityPreset === "advanced"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-blue-500/20 text-blue-400"
                  )}
                >
                  <ComplexityIcon className="w-3 h-3" />
                  {complexityPreset.charAt(0).toUpperCase() + complexityPreset.slice(1)}
                </Badge>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1">
          {visibleModules.map((module) => {
            const isActive = isActiveModule(module.path);
            const Icon = module.icon;

            return (
              <Link
                key={module.id}
                href={`${basePath}${module.path}`}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && module.color)} />
                {!sidebarCollapsed && (
                  <>
                    <span className="font-medium flex-1">{module.name}</span>
                    {getStatusIcon(module.id)}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Workflow Guide */}
        {!sidebarCollapsed && (
          <WorkflowGuide basePath={basePath} gameStatus={gameStatus} />
        )}

        {/* Replay Tutorial */}
        {!sidebarCollapsed && !tutorialActive && (
          <button
            onClick={() => {
              const depth = useTutorialStore.getState().depth;
              useTutorialStore.getState().startTutorial(depth);
            }}
            className="mx-2 mt-2 mb-1 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer rounded hover:bg-slate-700/50 transition-colors w-[calc(100%-1rem)]"
            type="button"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Replay Tutorial
          </button>
        )}

        {/* Game Glossary */}
        {!sidebarCollapsed && (
          <GlossaryButton onClick={() => setGlossaryOpen(true)} />
        )}

        {/* Collapse button */}
        <button
          className="hidden lg:flex absolute bottom-4 right-0 translate-x-1/2 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full items-center justify-center text-slate-400 hover:text-white"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 pt-16 lg:pt-6 lg:p-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Tutorial Overlay */}
      {tutorialActive && <TutorialGuide gameId={gameId} />}

      {/* Glossary Panel */}
      {glossaryOpen && <GlossaryPanel onClose={() => setGlossaryOpen(false)} />}

      {/* News Ticker */}
      <NewsTicker
        news={[
          {
            id: "1",
            type: "tech_breakthrough",
            title: "AI Revolution Drives Device Demand",
            description:
              "Breakthrough in AI technology creates unprecedented demand for high-performance devices",
            timestamp: new Date(),
            severity: "high",
          },
          {
            id: "2",
            type: "supply_chain_crisis",
            title: "Port Congestion Disrupts Global Supply Chains",
            description: "Major shipping delays at Asian ports cause component shortages",
            timestamp: new Date(Date.now() - 3600000),
            severity: "critical",
          },
          {
            id: "3",
            type: "currency_crisis",
            title: "Dollar Surges Against Asian Currencies",
            description: "Rapid currency fluctuations impact international operations",
            timestamp: new Date(Date.now() - 7200000),
            severity: "high",
          },
        ]}
      />
    </div>
  );
}
