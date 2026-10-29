import type { VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge, type badgeVariants } from "./badge";
import { Tooltip } from "./tooltip";

export interface TagListProps {
  tags?: string[] | null | undefined;
  max?: number;
  variant?: VariantProps<typeof badgeVariants>["variant"];
  moreVariant?: VariantProps<typeof badgeVariants>["variant"];
  className?: string;
  tagClassName?: string;
  emptyText?: string;
  tooltipTitle?: string;
  fontMono?: boolean;
}

export function TagList({
  tags,
  max = 2,
  variant = "outline",
  moreVariant = "secondary",
  className,
  tagClassName,
  emptyText,
  tooltipTitle,
  fontMono = true,
}: TagListProps) {
  if (!tags || tags.length === 0) {
    if (!emptyText) return null;
    return <span className="text-xs text-muted-foreground">{emptyText}</span>;
  }

  const visibleTags = tags.slice(0, max);
  const hiddenCount = tags.length - max;
  const title = tooltipTitle ?? `All Items (${tags.length})`;

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          variant={variant}
          className={cn(
            "text-[10px] px-1.5 py-0.5 max-w-28 truncate",
            fontMono && "font-mono text-muted-foreground",
            tagClassName,
          )}
        >
          {tag}
        </Badge>
      ))}

      {hiddenCount > 0 && (
        <Tooltip
          content={
            <div className="space-y-1 p-1 max-w-xs">
              <p className="font-semibold text-xs border-b border-border/40 pb-1">{title}</p>
              <div className="flex flex-wrap gap-1 font-mono text-[10px] pt-0.5">
                {tags.map((t) => (
                  <span key={t} className="px-1 py-0.5 rounded bg-muted text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          }
        >
          <Badge
            variant={moreVariant}
            className="text-[10px] px-1.5 py-0.5 font-medium cursor-pointer hover:bg-muted-foreground/20 transition-colors inline-flex items-center gap-0.5"
          >
            <span>+{hiddenCount} more</span>
            <ChevronDown className="size-2.5 opacity-60 transition-transform duration-200 group-hover/badge:-rotate-180" />
          </Badge>
        </Tooltip>
      )}
    </div>
  );
}
