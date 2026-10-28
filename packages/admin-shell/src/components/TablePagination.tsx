"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function TablePagination({
  page,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50],
  className,
}: TablePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const from = totalCount === 0 ? 0 : Math.min((page - 1) * limit + 1, totalCount);
  const to = Math.min(Math.max(from, page * limit), totalCount);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Showing <strong className="font-semibold text-foreground">{from}</strong> to{" "}
          <strong className="font-semibold text-foreground">{to}</strong> of{" "}
          <strong className="font-semibold text-foreground">{totalCount}</strong> entries
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1 border-l border-border/60 pl-3">
            <span className="text-[11px]">Per page:</span>
            {pageSizeOptions.map((size) => (
              <Button
                key={size}
                variant={limit === size ? "secondary" : "ghost"}
                size="xs"
                className={cn(
                  "h-6 px-2 text-[11px]",
                  limit === size &&
                    "font-semibold text-foreground bg-muted border border-border/80 shadow-2xs",
                )}
                onClick={() => onLimitChange(size)}
                aria-label={`${size} entries per page`}
              >
                {size}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs mr-1">
          Page {page} of {safeTotalPages}
        </span>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          title="First Page"
          aria-label="First page"
        >
          <ChevronsLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          title="Previous Page"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          disabled={page >= safeTotalPages}
          title="Next Page"
          aria-label="Next page"
        >
          <ChevronRight className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={page >= safeTotalPages}
          title="Last Page"
          aria-label="Last page"
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
