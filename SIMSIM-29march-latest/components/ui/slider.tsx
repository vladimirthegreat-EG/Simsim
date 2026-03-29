"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "orange" | "purple";
  showValue?: boolean;
  formatValue?: (value: number) => string;
  label?: string;
}

const variantStyles = {
  default: {
    track: "bg-slate-700",
    range: "bg-slate-400",
    thumb: "border-slate-400 bg-white",
  },
  success: {
    track: "bg-emerald-900/50",
    range: "bg-gradient-to-r from-emerald-600 to-emerald-400",
    thumb: "border-emerald-400 bg-white shadow-emerald-500/30",
  },
  warning: {
    track: "bg-amber-900/50",
    range: "bg-gradient-to-r from-amber-600 to-amber-400",
    thumb: "border-amber-400 bg-white shadow-amber-500/30",
  },
  danger: {
    track: "bg-red-900/50",
    range: "bg-gradient-to-r from-red-600 to-red-400",
    thumb: "border-red-400 bg-white shadow-red-500/30",
  },
  info: {
    track: "bg-blue-900/50",
    range: "bg-gradient-to-r from-blue-600 to-blue-400",
    thumb: "border-blue-400 bg-white shadow-blue-500/30",
  },
  orange: {
    track: "bg-orange-900/50",
    range: "bg-gradient-to-r from-orange-600 to-orange-400",
    thumb: "border-orange-400 bg-white shadow-orange-500/30",
  },
  purple: {
    track: "bg-purple-900/50",
    range: "bg-gradient-to-r from-purple-600 to-purple-400",
    thumb: "border-purple-400 bg-white shadow-purple-500/30",
  },
};

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant = "default", showValue, formatValue, label, ...props }, ref) => {
  const styles = variantStyles[variant];
  const currentValue = props.value?.[0] ?? props.defaultValue?.[0] ?? 0;

  // Extract data-testid for the thumb element (which has role="slider" for keyboard interaction)
  const dataTestId = props["data-testid" as keyof typeof props] as string | undefined;

  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm text-slate-300">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium text-white">
              {formatValue ? formatValue(currentValue) : currentValue}
            </span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track
          className={cn(
            "relative h-2 w-full grow overflow-hidden rounded-full",
            styles.track
          )}
        >
          <SliderPrimitive.Range
            className={cn("absolute h-full", styles.range)}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-testid={dataTestId}
          className={cn(
            "block h-5 w-5 rounded-full border-2 shadow-lg transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            "hover:scale-110 active:scale-95",
            "disabled:pointer-events-none disabled:opacity-50",
            styles.thumb
          )}
        />
      </SliderPrimitive.Root>
    </div>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
