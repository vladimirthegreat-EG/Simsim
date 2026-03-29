"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import { GlossaryText } from "@/components/game/GlossaryText";

interface EnhancedProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "gradient" | "orange" | "purple" | "pink";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  animated?: boolean;
}

const variantStyles = {
  default: "bg-slate-400",
  success: "bg-gradient-to-r from-emerald-600 to-emerald-400",
  warning: "bg-gradient-to-r from-amber-600 to-amber-400",
  danger: "bg-gradient-to-r from-red-600 to-red-400",
  info: "bg-gradient-to-r from-blue-600 to-blue-400",
  gradient: "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400",
  orange: "bg-gradient-to-r from-orange-600 to-orange-400",
  purple: "bg-gradient-to-r from-purple-600 to-purple-400",
  pink: "bg-gradient-to-r from-pink-600 to-pink-400",
};

const sizeStyles = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

const EnhancedProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  EnhancedProgressProps
>(({
  className,
  value,
  variant = "default",
  size = "md",
  showLabel,
  label,
  showValue,
  formatValue,
  animated = true,
  ...props
}, ref) => {
  const displayValue = formatValue ? formatValue(value ?? 0) : `${value ?? 0}%`;

  return (
    <div className="space-y-2">
      {(showLabel || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {showLabel && (
            <span className="text-slate-300">
              <GlossaryText text={`{{${label}}}`} />
            </span>
          )}
          {showValue && <span className="font-medium text-white">{displayValue}</span>}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-slate-700/50",
          sizeStyles[size],
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 rounded-full transition-all duration-500 ease-out",
            variantStyles[variant],
            animated && "animate-pulse-subtle"
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
});
EnhancedProgress.displayName = ProgressPrimitive.Root.displayName;

export { EnhancedProgress };
