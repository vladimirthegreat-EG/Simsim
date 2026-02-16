"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  Info,
  X,
  Bell,
  ChevronDown,
} from "lucide-react";

interface Notification {
  id: string;
  type: "threat" | "opportunity" | "success" | "info";
  title: string;
  message: string;
  round: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationPanelProps {
  notifications: Notification[];
  maxVisible?: number;
}

const TYPE_CONFIG: Record<
  Notification["type"],
  {
    icon: typeof AlertTriangle;
    cardBg: string;
    borderColor: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    label: string;
  }
> = {
  threat: {
    icon: AlertTriangle,
    cardBg: "bg-red-900/20",
    borderColor: "border-red-700/50",
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    titleColor: "text-red-400",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-400",
    badgeBorder: "border-red-500/30",
    label: "Threat",
  },
  opportunity: {
    icon: Lightbulb,
    cardBg: "bg-amber-900/20",
    borderColor: "border-amber-700/50",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    titleColor: "text-amber-400",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-400",
    badgeBorder: "border-amber-500/30",
    label: "Opportunity",
  },
  success: {
    icon: CheckCircle,
    cardBg: "bg-green-900/20",
    borderColor: "border-green-700/50",
    iconBg: "bg-green-500/20",
    iconColor: "text-green-400",
    titleColor: "text-green-400",
    badgeBg: "bg-green-500/20",
    badgeText: "text-green-400",
    badgeBorder: "border-green-500/30",
    label: "Success",
  },
  info: {
    icon: Info,
    cardBg: "bg-blue-900/20",
    borderColor: "border-blue-700/50",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    titleColor: "text-blue-400",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-400",
    badgeBorder: "border-blue-500/30",
    label: "Info",
  },
};

export function NotificationPanel({
  notifications: initialNotifications,
  maxVisible = 5,
}: NotificationPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const activeNotifications = initialNotifications.filter(
    (n) => !dismissedIds.has(n.id)
  );

  const visibleNotifications = showAll
    ? activeNotifications
    : activeNotifications.slice(0, maxVisible);

  const hiddenCount = activeNotifications.length - maxVisible;

  if (activeNotifications.length === 0) {
    return null;
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-400" />
            Notifications
          </div>
          {activeNotifications.length > 0 && (
            <Badge className="bg-slate-700 text-slate-300 border-slate-600">
              {activeNotifications.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visibleNotifications.map((notification) => {
            const config = TYPE_CONFIG[notification.type];
            const Icon = config.icon;

            return (
              <div
                key={notification.id}
                className={cn(
                  "relative rounded-lg border p-3 transition-all",
                  config.cardBg,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Type icon */}
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      config.iconBg
                    )}
                  >
                    <Icon className={cn("w-5 h-5", config.iconColor)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("font-medium text-sm", config.titleColor)}>
                        {notification.title}
                      </span>
                      <Badge
                        className={cn(
                          "text-xs border",
                          config.badgeBg,
                          config.badgeText,
                          config.badgeBorder
                        )}
                      >
                        {config.label}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Round {notification.round}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      {notification.message}
                    </p>

                    {/* Action button */}
                    {notification.actionLabel && notification.onAction && (
                      <button
                        type="button"
                        onClick={notification.onAction}
                        className={cn(
                          "mt-2 px-3 py-1 rounded text-xs font-medium transition-colors",
                          config.iconBg,
                          config.iconColor,
                          "hover:opacity-80"
                        )}
                      >
                        {notification.actionLabel}
                      </button>
                    )}
                  </div>

                  {/* Dismiss button */}
                  <button
                    type="button"
                    onClick={() => dismiss(notification.id)}
                    className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 p-0.5 rounded hover:bg-slate-700/50"
                    aria-label={`Dismiss notification: ${notification.title}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Show more / show less button */}
          {hiddenCount > 0 && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full flex items-center justify-center gap-1 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-300 bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              Show {hiddenCount} more notification{hiddenCount !== 1 ? "s" : ""}
            </button>
          )}

          {showAll && activeNotifications.length > maxVisible && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="w-full flex items-center justify-center gap-1 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-300 bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
            >
              Show less
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationPanel;
