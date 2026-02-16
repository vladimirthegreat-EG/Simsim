"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface TutorialSpotlightProps {
  /** CSS selector of the element to highlight */
  selector: string;
  /** Whether the spotlight is active */
  active: boolean;
  /** Padding around the highlighted element (px) */
  padding?: number;
  /** Click handler for clicking the spotlight backdrop */
  onBackdropClick?: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialSpotlight({
  selector,
  active,
  padding = 8,
  onBackdropClick,
}: TutorialSpotlightProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const elementRef = useRef<Element | null>(null);

  const updateRect = useCallback(() => {
    if (!elementRef.current) return;
    const el = elementRef.current;
    const domRect = el.getBoundingClientRect();
    setRect({
      top: domRect.top,
      left: domRect.left,
      width: domRect.width,
      height: domRect.height,
    });
  }, []);

  useEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }

    const el = document.querySelector(selector);
    if (!el) {
      setRect(null);
      return;
    }

    elementRef.current = el;
    updateRect();

    // Watch for size changes on the target element
    observerRef.current = new ResizeObserver(() => {
      updateRect();
    });
    observerRef.current.observe(el);

    // Also update on scroll and window resize since getBoundingClientRect is viewport-relative
    const handleReposition = () => updateRect();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      elementRef.current = null;
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [selector, active, updateRect]);

  if (!active || !rect) return null;

  const borderRadius = 12;
  const holeTop = rect.top - padding;
  const holeLeft = rect.left - padding;
  const holeWidth = rect.width + padding * 2;
  const holeHeight = rect.height + padding * 2;

  // Build a clip-path polygon that covers the full screen with a rectangular hole cut out.
  // The outer path goes clockwise around the viewport; the inner path goes counter-clockwise
  // around the highlighted element. Using inset() is simpler for rounded rects, but
  // combining two shapes requires the polygon approach or an SVG mask.
  // We use an SVG mask for clean rounded corners.

  const maskId = "tutorial-spotlight-mask";

  return (
    <>
      {/* SVG definition for the mask (hidden) */}
      <svg
        className="fixed inset-0 w-full h-full"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: -1,
          opacity: 0,
        }}
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            {/* White = visible (the dimmed overlay), black = hidden (the hole) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={holeLeft}
              y={holeTop}
              width={holeWidth}
              height={holeHeight}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
      </svg>

      {/* Dark overlay with the hole punched out via the SVG mask */}
      <div
        className="fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ width: "100vw", height: "100vh" }}
        >
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask={`url(#${maskId})`}
          />
        </svg>
      </div>

      {/* Pulsing ring around the highlighted area */}
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          top: holeTop,
          left: holeLeft,
          width: holeWidth,
          height: holeHeight,
          borderRadius: borderRadius,
        }}
      >
        <div
          className="absolute inset-0 rounded-[inherit] animate-[spotlight-pulse_2s_ease-in-out_infinite]"
          style={{
            boxShadow: "0 0 0 2px rgba(99,179,237,0.8), 0 0 16px 4px rgba(99,179,237,0.4)",
            borderRadius: "inherit",
          }}
        />
      </div>

      {/* Invisible clickable backdrop for onBackdropClick - covers everything except the hole */}
      {onBackdropClick && (
        <div
          className="fixed inset-0 z-[9997] cursor-pointer"
          onClick={onBackdropClick}
          aria-label="Close tutorial spotlight"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onBackdropClick();
            }
          }}
        />
      )}

      {/* Style tag for the pulse animation */}
      <style jsx global>{`
        @keyframes spotlight-pulse {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(99, 179, 237, 0.8),
              0 0 16px 4px rgba(99, 179, 237, 0.4);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(99, 179, 237, 1),
              0 0 24px 8px rgba(99, 179, 237, 0.6);
          }
        }
      `}</style>
    </>
  );
}
