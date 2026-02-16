"use client";

import { useState, useMemo } from "react";
import { X, Search, BookOpen } from "lucide-react";
import { GAME_GLOSSARY, type GlossaryEntry } from "@/data/gameGlossary";

/**
 * GlossaryPanel - Always-accessible searchable glossary panel.
 * Lives in the game sidebar. Players can open it anytime to look up
 * any game term with a plain-English definition.
 */

// Group terms by category for browsing
const CATEGORY_MAP: Record<string, string[]> = {
  "Financial": ["cash", "revenue", "net income", "profit margin", "balance sheet", "dividends", "t-bills", "bonds", "stock issuance", "share buyback", "stock price", "board proposals"],
  "Market & Brand": ["brand value", "brand decay", "market share", "segments", "customer satisfaction", "cpm"],
  "Factory": ["efficiency", "capacity utilization", "production allocation", "defect rate", "factory upgrades", "supply chain"],
  "ESG": ["esg score", "esg initiatives"],
  "Workforce": ["morale", "turnover rate", "workers", "engineers", "supervisors", "salary slider", "recruitment tiers"],
  "R&D & Products": ["r&d budget", "quality", "features", "tech upgrades", "archetypes", "feature radar chart", "patents"],
  "Achievements": ["achievement points", "infamy", "secret achievements"],
  "Game": ["round checklist", "round processing"],
};

export function GlossaryPanel({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState("");

  const allEntries = useMemo(() => Object.values(GAME_GLOSSARY), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return null; // Show categories when no search
    const q = search.toLowerCase();
    return allEntries.filter(
      (e) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q)
    );
  }, [search, allEntries]);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white text-sm">Game Glossary</span>
          <span className="text-[10px] text-slate-500">{allEntries.length} terms</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filtered ? (
          /* Search results */
          <div className="p-3 space-y-1">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">No terms match "{search}"</p>
            ) : (
              filtered.map((entry) => (
                <TermCard key={entry.term} entry={entry} />
              ))
            )}
          </div>
        ) : (
          /* Category browsing */
          <div className="p-3 space-y-4">
            {Object.entries(CATEGORY_MAP).map(([category, keys]) => (
              <div key={category}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 px-1">
                  {category}
                </h3>
                <div className="space-y-1">
                  {keys.map((key) => {
                    const entry = GAME_GLOSSARY[key];
                    if (!entry) return null;
                    return <TermCard key={key} entry={entry} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-slate-800">
        <p className="text-[10px] text-slate-600 text-center">
          Cyan underlined terms in tutorials and game pages are glossary terms. Hover them for definitions.
        </p>
      </div>
    </div>
  );
}

function TermCard({ entry }: { entry: GlossaryEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left px-2.5 py-2 rounded-lg transition-colors bg-transparent border-none cursor-pointer hover:bg-slate-800/80"
    >
      <span className="text-[12px] font-medium text-cyan-400 border-b border-dotted border-cyan-400/40">
        {entry.term}
      </span>
      {open && (
        <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
          {entry.definition}
        </p>
      )}
    </button>
  );
}

/**
 * GlossaryButton - Small button for the sidebar that opens the panel.
 */
export function GlossaryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mx-2 mt-2 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-slate-500 hover:text-cyan-400 bg-transparent border-none cursor-pointer rounded hover:bg-slate-700/50 transition-colors w-[calc(100%-1rem)]"
      type="button"
    >
      <BookOpen className="w-3.5 h-3.5" />
      Game Glossary
    </button>
  );
}
