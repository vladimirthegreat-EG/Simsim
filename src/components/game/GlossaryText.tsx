"use client";

import { useState, Fragment } from "react";
import { lookupGlossary } from "@/data/gameGlossary";

/**
 * GlossaryText - Parses text containing {{term}} markers and renders them
 * as inline-expandable glossary terms.
 *
 * Usage in tutorial descriptions:
 *   "Your {{Brand Value}} drives {{Market Share}} in each segment."
 *
 * Terms always render as cyan dotted-underlined text.
 * On hover, the definition expands inline right after the term.
 */

interface GlossaryTextProps {
  text: string;
  className?: string;
}

// Matches {{term}} patterns - captures the inner term
const GLOSSARY_PATTERN = /\{\{(.+?)\}\}/g;

interface ParsedSegment {
  type: "text" | "term";
  value: string;
}

function parseGlossaryText(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  // Reset regex state
  GLOSSARY_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = GLOSSARY_PATTERN.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    // Add the term
    segments.push({ type: "term", value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

function GlossaryTerm({ term }: { term: string }) {
  const [expanded, setExpanded] = useState(false);
  const entry = lookupGlossary(term);

  if (!entry) {
    return <span>{term}</span>;
  }

  return (
    <span
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="inline text-cyan-400 border-b border-dotted border-cyan-400/60 cursor-help"
    >
      {term}
      {expanded && (
        <span className="text-[10px] text-cyan-300/80 font-normal" style={{ borderBottom: "none" }}>
          {" - "}
          <span className="italic">{entry.definition}</span>
        </span>
      )}
    </span>
  );
}

export function GlossaryText({ text, className }: GlossaryTextProps) {
  // Split by newlines first, then parse each line for glossary terms
  const lines = text.split("\n");

  return (
    <span className={className}>
      {lines.map((line, lineIdx) => (
        <Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {parseGlossaryText(line).map((segment, segIdx) =>
            segment.type === "term" ? (
              <GlossaryTerm key={`${lineIdx}-${segIdx}`} term={segment.value} />
            ) : (
              <Fragment key={`${lineIdx}-${segIdx}`}>{segment.value}</Fragment>
            )
          )}
        </Fragment>
      ))}
    </span>
  );
}
