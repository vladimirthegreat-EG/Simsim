"use client";

import { HelpCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface HelpTooltipProps {
  text: string;
}

export function HelpTooltip({ text }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<"top" | "bottom">("top");

  useEffect(() => {
    if (open && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      if (rect.top < 10) setPosition("bottom");
      else setPosition("top");
    }
  }, [open]);

  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(!open)}
        className="text-slate-500 hover:text-slate-300 cursor-help bg-transparent border-none p-0"
        type="button"
      >
        <HelpCircle className="w-3.5 h-3.5 inline" />
      </button>
      {open && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 left-1/2 -translate-x-1/2 w-64 p-2.5 rounded-lg bg-slate-800 border border-slate-600 text-xs leading-relaxed text-slate-300 shadow-xl ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {text}
        </div>
      )}
    </span>
  );
}
