import { cn } from "@/lib/utils";
import React from "react";
import { Card } from "./Card";
import { accentClasses, type AccentColor } from "./PageHeader";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  icon: React.ElementType;
  accent?: AccentColor;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent = "primary",
  className,
  ...props
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "hover:border-muted-foreground/30 transition-colors duration-150",
        className,
      )}
      {...props}
    >
      <div className="px-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <div
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
              accentClasses[accent],
            )}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-bold text-foreground tracking-tight">
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-1.5">{subtext}</p>
        )}
      </div>
    </Card>
  );
}
