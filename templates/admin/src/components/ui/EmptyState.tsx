import { cn } from "@/lib/utils";
import React from "react";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Standard "nothing here yet" placeholder for empty tables/lists.
 * Replaces the ad-hoc empty-state markup that was slightly different on
 * every page (plugins table, forms submissions, etc).
 *
 * @example
 * <EmptyState icon={Plug} title="No plugins found" description="Enable a plugin to see it here." />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-12 rounded-lg border border-dashed border-border bg-muted/20",
        className,
      )}
      {...props}
    >
      <div
        className="h-10 w-10 rounded-md border border-border bg-muted flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
