"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  previousValue?: number;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple" | "pink" | "orange";
  size?: "sm" | "md" | "lg";
  className?: string;
  animate?: boolean;
  suffix?: string;
  prefix?: string;
}

const variantStyles = {
  default: {
    icon: "bg-slate-500/20 text-slate-400",
    value: "text-white",
    gradient: "from-slate-500/10 to-transparent",
  },
  success: {
    icon: "bg-emerald-500/20 text-emerald-400",
    value: "text-emerald-400",
    gradient: "from-emerald-500/10 to-transparent",
  },
  warning: {
    icon: "bg-amber-500/20 text-amber-400",
    value: "text-amber-400",
    gradient: "from-amber-500/10 to-transparent",
  },
  danger: {
    icon: "bg-red-500/20 text-red-400",
    value: "text-red-400",
    gradient: "from-red-500/10 to-transparent",
  },
  info: {
    icon: "bg-blue-500/20 text-blue-400",
    value: "text-blue-400",
    gradient: "from-blue-500/10 to-transparent",
  },
  purple: {
    icon: "bg-purple-500/20 text-purple-400",
    value: "text-purple-400",
    gradient: "from-purple-500/10 to-transparent",
  },
  pink: {
    icon: "bg-pink-500/20 text-pink-400",
    value: "text-pink-400",
    gradient: "from-pink-500/10 to-transparent",
  },
  orange: {
    icon: "bg-orange-500/20 text-orange-400",
    value: "text-orange-400",
    gradient: "from-orange-500/10 to-transparent",
  },
};

const sizeStyles = {
  sm: {
    card: "p-3",
    label: "text-xs",
    value: "text-lg",
    icon: "w-8 h-8",
    iconSize: "w-4 h-4",
  },
  md: {
    card: "p-4",
    label: "text-sm",
    value: "text-2xl",
    icon: "w-10 h-10",
    iconSize: "w-5 h-5",
  },
  lg: {
    card: "p-5",
    label: "text-sm",
    value: "text-3xl",
    icon: "w-12 h-12",
    iconSize: "w-6 h-6",
  },
};

function AnimatedNumber({ value, duration = 500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{displayValue}</>;
}

export function StatCard({
  label,
  value,
  previousValue,
  icon,
  trend,
  trendValue,
  variant = "default",
  size = "md",
  className,
  animate = true,
  suffix,
  prefix,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  // Determine trend from previousValue if not explicitly set
  const actualTrend = trend ?? (previousValue !== undefined
    ? (typeof value === "number" ? (value > previousValue ? "up" : value < previousValue ? "down" : "neutral") : "neutral")
    : undefined);

  const TrendIcon = actualTrend === "up" ? TrendingUp : actualTrend === "down" ? TrendingDown : Minus;
  const trendColor = actualTrend === "up" ? "text-emerald-400" : actualTrend === "down" ? "text-red-400" : "text-slate-400";

  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;
    if (animate) {
      // For animated numbers, we need to format during animation
      return val;
    }
    return val.toLocaleString();
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/80 backdrop-blur-sm transition-all duration-200 hover:border-slate-600/50 hover:shadow-lg hover:shadow-slate-900/20",
        sizes.card,
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none", styles.gradient)} />

      <div className="relative flex items-center justify-between">
        <div className="space-y-1">
          <p className={cn("text-slate-400 font-medium", sizes.label)}>{label}</p>
          <p className={cn("font-bold tracking-tight", sizes.value, styles.value)}>
            {prefix}
            {typeof value === "number" && animate ? (
              <AnimatedNumber value={value} />
            ) : (
              formatValue(value)
            )}
            {suffix}
          </p>

          {/* Trend indicator */}
          {(actualTrend || trendValue) && (
            <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
              {actualTrend && <TrendIcon className="w-3 h-3" />}
              {trendValue && <span>{trendValue}</span>}
            </div>
          )}
        </div>

        {icon && (
          <div className={cn("rounded-full flex items-center justify-center", sizes.icon, styles.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Note: formatCurrency, formatPercent, and formatNumber are available from @/lib/utils
