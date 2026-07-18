import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { Button } from "./Button";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  meta: PaginationMeta | null | undefined;
  page: number;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
  /** Label for the item being counted, e.g. "submissions", "users" */
  itemLabel?: string;
}

/**
 * Reusable pagination control — page-count summary + prev/next + numbered
 * page buttons (windowed around the current page, max 5 visible).
 *
 * @example
 * <Pagination meta={meta} page={page} onPageChange={setPage} onNext={nextPage} onPrev={prevPage} itemLabel="users" />
 */
export function Pagination({
  meta,
  page,
  onPageChange,
  onNext,
  onPrev,
  itemLabel = "items",
  className,
  ...props
}: PaginationProps) {
  if (!meta || meta.totalPages <= 1) return null;

  // Window of up to 5 page numbers, centered around the current page
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(meta.totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pageNumbers = Array.from(
    { length: end - start + 1 },
    (_, i) => start + i,
  );

  const rangeStart = (meta.page - 1) * meta.limit + 1;
  const rangeEnd = Math.min(meta.page * meta.limit, meta.total);

  return (
    <nav
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4",
        className,
      )}
      aria-label="Pagination Navigation"
      {...props}
    >
      <span className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="text-foreground font-semibold">
          {rangeStart}–{rangeEnd}
        </span>{" "}
        of <span className="text-foreground font-semibold">{meta.total}</span>{" "}
        {itemLabel}
      </span>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onPrev}
          isDisabled={page === 1}
          icon={ChevronLeft}
          aria-label="Go to previous page"
        >
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="flex items-center gap-1">
          {start > 1 && (
            <span
              className="px-1.5 text-muted-foreground text-xs"
              aria-hidden="true"
            >
              …
            </span>
          )}
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === page ? "primary" : "secondary"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              aria-current={pageNum === page ? "page" : undefined}
              aria-label={`Go to page ${pageNum}`}
              className="min-w-[32px] px-0 py-1.5 text-xs font-semibold"
            >
              {pageNum}
            </Button>
          ))}
          {end < meta.totalPages && (
            <span
              className="px-1.5 text-muted-foreground text-xs"
              aria-hidden="true"
            >
              …
            </span>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onNext}
          isDisabled={page === meta.totalPages}
          icon={ChevronRight}
          aria-label="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
        </Button>
      </div>
    </nav>
  );
}
