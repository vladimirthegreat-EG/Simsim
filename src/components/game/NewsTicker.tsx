"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, TrendingUp, TrendingDown, AlertTriangle, Zap, Leaf, Package, Globe, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
}

interface NewsTickerProps {
  news: NewsItem[];
  className?: string;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  recession: TrendingDown,
  boom: TrendingUp,
  inflation_spike: DollarSign,
  tech_breakthrough: Zap,
  sustainability_regulation: Leaf,
  supply_chain_crisis: Package,
  currency_crisis: Globe,
  price_war: AlertTriangle,
  custom: Radio,
};

const SEVERITY_COLORS = {
  low: "text-blue-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export function NewsTicker({ news, className }: NewsTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Only show recent news (last 5 items)
  const recentNews = news.slice(-5);

  useEffect(() => {
    if (recentNews.length === 0 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % recentNews.length);
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, [recentNews.length, isPaused]);

  if (recentNews.length === 0) return null;

  const currentNews = recentNews[currentIndex];
  const Icon = EVENT_ICONS[currentNews.type] || Radio;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-slate-700 backdrop-blur-sm",
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Breaking News Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full shrink-0">
            <Radio className="w-3 h-3 text-white animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-wider">
              Breaking
            </span>
          </div>

          {/* News Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentNews.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <Icon className={cn("w-4 h-4 shrink-0", SEVERITY_COLORS[currentNews.severity])} />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={cn("font-bold text-sm", SEVERITY_COLORS[currentNews.severity])}>
                  {currentNews.title}:
                </span>
                <span className="text-slate-300 text-sm truncate">
                  {currentNews.description}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* News Indicator Dots */}
          <div className="flex items-center gap-1 shrink-0">
            {recentNews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  idx === currentIndex
                    ? "bg-red-500 w-3"
                    : "bg-slate-600 hover:bg-slate-500"
                )}
                aria-label={`View news ${idx + 1}`}
              />
            ))}
          </div>

          {/* Timestamp */}
          <span className="text-slate-500 text-xs shrink-0 hidden md:block">
            {new Date(currentNews.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
