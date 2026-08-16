import * as React from "react";
import { cn } from "../lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: "blue" | "teal" | "purple" | "amber" | "default";
}

const colorMap = {
  blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  teal: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  default: "bg-primary/10 text-primary border-primary/20",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "default",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-border transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          {title}
        </span>
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-lg border",
            colorMap[iconColor] || colorMap.default,
          )}
        >
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
