import { cn } from "@/lib/utils";
import React from "react";

// Shared accent color map — also used in StatCard so both stay in sync
export type AccentColor =
  "primary" | "teal" | "violet" | "amber" | "rose" | "neutral";

export const accentClasses: Record<AccentColor, string> = {
  amber: "bg-amber-500/10 text-amber-500",
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  rose: "bg-rose-500/10 text-rose-500",
  teal: "bg-teal-500/10 text-teal-500",
  violet: "bg-violet-500/10 text-violet-500",
};

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  /** Icon badge shown next to the title — gives every section its own visual identity, matching its sidebar icon. */
  icon?: React.ElementType;
  accent?: AccentColor;
  actions?: React.ReactNode;
}

/**
 * Standard list/detail page header: icon badge + title + description on the
 * left, action buttons (New, filters...) on the right.
 *
 * @example
 * <PageHeader
 *   icon={BookOpen}
 *   accent="teal"
 *   title="Blog Posts"
 *   description="Create, publish, and manage website articles"
 *   actions={<Button icon={Plus}>New Post</Button>}
 * />
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  accent = "primary",
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap justify-between items-center gap-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-4 min-w-0">
        {Icon && (
          <div
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
              accentClasses[accent],
            )}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
