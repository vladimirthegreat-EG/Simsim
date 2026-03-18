"use client";

import { useState } from "react";
import { trpc } from "@/lib/api/trpc";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  Plus,
  Play,
  SkipForward,
  Pause,
  Square,
  Zap,
  MessageSquare,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AuditLogPanelProps {
  gameId: string;
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  GAME_CREATED: Plus,
  GAME_STARTED: Play,
  ROUND_ADVANCED: SkipForward,
  GAME_PAUSED: Pause,
  GAME_RESUMED: Play,
  GAME_ENDED: Square,
  EVENT_INJECTED: Zap,
  MESSAGE_SENT: MessageSquare,
  ROUND_SCHEDULED: Clock,
  SCHEDULE_CANCELLED: XCircle,
};

const ACTION_COLORS: Record<string, string> = {
  GAME_CREATED: "text-green-400 bg-green-500/10",
  GAME_STARTED: "text-blue-400 bg-blue-500/10",
  ROUND_ADVANCED: "text-purple-400 bg-purple-500/10",
  GAME_PAUSED: "text-yellow-400 bg-yellow-500/10",
  GAME_RESUMED: "text-blue-400 bg-blue-500/10",
  GAME_ENDED: "text-red-400 bg-red-500/10",
  EVENT_INJECTED: "text-amber-400 bg-amber-500/10",
  MESSAGE_SENT: "text-sky-400 bg-sky-500/10",
  ROUND_SCHEDULED: "text-indigo-400 bg-indigo-500/10",
  SCHEDULE_CANCELLED: "text-rose-400 bg-rose-500/10",
};

function formatActionName(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function parseDetails(details: any): Record<string, string> | null {
  if (!details) return null;
  try {
    const parsed = typeof details === "string" ? JSON.parse(details) : details;
    if (typeof parsed !== "object" || parsed === null) return null;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

function AuditLogEntry({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);
  const action = entry.action ?? entry.type ?? "UNKNOWN";
  const Icon = ACTION_ICONS[action] ?? Activity;
  const colorClasses = ACTION_COLORS[action] ?? "text-muted-foreground bg-muted";
  const details = parseDetails(entry.details ?? entry.metadata);
  const hasDetails = details !== null;

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />

      {/* Icon dot */}
      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClasses}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {formatActionName(action)}
            </span>
            <Badge variant="outline" className="text-xs">
              {formatRelativeTime(entry.createdAt ?? entry.timestamp)}
            </Badge>
          </div>
          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(entry.createdAt ?? entry.timestamp).toLocaleString(
            undefined,
            {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }
          )}
        </p>

        {expanded && details && (
          <div className="mt-2 rounded-md border bg-muted/30 p-3 space-y-1">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="font-medium text-muted-foreground min-w-[100px]">
                  {key}:
                </span>
                <span className="text-foreground break-all">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLogPanel({ gameId }: AuditLogPanelProps) {
  const auditLogQuery = trpc.game.getAuditLog.useQuery({ gameId });
  const entries = auditLogQuery.data ?? [];

  const sortedEntries = [...entries].sort((a: any, b: any) => {
    const dateA = new Date(a.createdAt ?? a.timestamp).getTime();
    const dateB = new Date(b.createdAt ?? b.timestamp).getTime();
    return dateB - dateA;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Shield className="h-5 w-5 text-amber-400" />
        <CardTitle>Audit Log</CardTitle>
        {entries.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {sortedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Shield className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No audit log entries yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="pr-4">
              {sortedEntries.map((entry: any, index: number) => (
                <AuditLogEntry key={entry.id ?? index} entry={entry} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
