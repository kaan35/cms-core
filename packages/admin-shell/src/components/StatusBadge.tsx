import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export interface StatusBadgeProps {
  status: "published" | "draft" | string;
  className?: string;
}

/**
 * Standard StatusBadge for consistent content publishing indicators
 * across all CMS admin plugins (Pages, Blog, etc.).
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isPublished = status.toLowerCase() === "published";
  const label = isPublished ? "Published" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] gap-1.5 py-0.5 font-medium tracking-normal",
        isPublished
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          : "bg-muted text-muted-foreground border-border/80",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full shrink-0",
          isPublished ? "bg-emerald-500" : "bg-muted-foreground",
        )}
      />
      <span>{label}</span>
    </Badge>
  );
}
