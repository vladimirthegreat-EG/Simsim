"use client";

import { HelpCircle } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface PlainEnglishTooltipProps {
  /** What is this metric/element? */
  what: string;
  /** Why is it this value? */
  why?: string;
  /** What can the player do about it? */
  action?: string;
  /** The element to wrap with the tooltip trigger (optional - renders standalone help icon if omitted) */
  children?: ReactNode;
  /** If true, shows `what` as a single-line tooltip (ignores why/action) */
  compact?: boolean;
}

export function PlainEnglishTooltip({
  what,
  why,
  action,
  children,
  compact = false,
}: PlainEnglishTooltipProps) {
  const [open, setOpen] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: "left" | "center" | "right"; y: "top" | "bottom" }>({
    x: "center",
    y: "top",
  });

  // Reposition tooltip so it stays within the viewport
  const reposition = useCallback(() => {
    if (!tipRef.current || !triggerRef.current) return;
    const tip = tipRef.current.getBoundingClientRect();
    const trigger = triggerRef.current.getBoundingClientRect();

    let y: "top" | "bottom" = "top";
    let x: "left" | "center" | "right" = "center";

    // Vertical: prefer above, fall back to below
    if (trigger.top - tip.height - 8 < 0) {
      y = "bottom";
    }

    // Horizontal: keep within viewport
    const tipHalf = tip.width / 2;
    const triggerCenter = trigger.left + trigger.width / 2;
    if (triggerCenter - tipHalf < 8) {
      x = "left";
    } else if (triggerCenter + tipHalf > window.innerWidth - 8) {
      x = "right";
    }

    setPos({ x, y });
  }, []);

  useEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  // Close on outside click (for mobile tap-to-open)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tipRef.current &&
        !tipRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const yClass = pos.y === "top" ? "bottom-full mb-2" : "top-full mt-2";
  const xClass =
    pos.x === "left"
      ? "left-0"
      : pos.x === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="text-slate-500 hover:text-slate-300 cursor-help bg-transparent border-none p-0 flex-shrink-0"
        aria-label="More info"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          ref={tipRef}
          role="tooltip"
          className={`absolute z-50 ${yClass} ${xClass} ${
            compact ? "w-48" : "w-72"
          } rounded-lg bg-slate-800 border border-slate-600 shadow-xl text-xs leading-relaxed text-slate-200 p-3`}
        >
          {compact ? (
            <p>{what}</p>
          ) : (
            <div className="space-y-1.5">
              <div>
                <span className="font-semibold text-white">What: </span>
                <span>{what}</span>
              </div>
              {why && (
                <div>
                  <span className="font-semibold text-emerald-400">Why: </span>
                  <span>{why}</span>
                </div>
              )}
              {action && (
                <div>
                  <span className="font-semibold text-sky-400">Action: </span>
                  <span>{action}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
