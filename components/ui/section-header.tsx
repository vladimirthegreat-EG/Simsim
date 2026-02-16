"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconColor?: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger";
  action?: ReactNode;
  className?: string;
}

const badgeStyles = {
  default: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  danger: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function SectionHeader({
  title,
  description,
  icon,
  iconColor = "text-slate-400",
  badge,
  badgeVariant = "default",
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={cn("flex-shrink-0", iconColor)}>
              {icon}
            </div>
          )}
          <h2 className="text-xl font-semibold text-white tracking-tight">{title}</h2>
          {badge && (
            <Badge className={cn("border", badgeStyles[badgeVariant])}>
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-slate-400 text-sm max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconColor?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  iconColor = "text-white",
  badge,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          {icon && <span className={iconColor}>{icon}</span>}
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-400">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {badge}
        {action}
      </div>
    </div>
  );
}
