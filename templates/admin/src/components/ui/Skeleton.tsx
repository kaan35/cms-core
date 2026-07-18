import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/** Base pulsing placeholder block. Compose with utility classes for shape/size. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

/**
 * Skeleton placeholder for `<Table>` contents — shown while a list request
 * is loading, instead of blocking the whole page behind a full-screen
 * spinner (`<Loading isFullScreen />`). Keeps the table chrome (header,
 * borders) visible so the layout doesn't jump once data arrives.
 *
 * @example
 * {isLoading ? <SkeletonTable rows={5} columns={4} /> : <Table>...</Table>}
 */
export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden"
      aria-hidden="true"
    >
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-6 px-6 py-4">
            {Array.from({ length: columns }, (_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn(
                  "h-4",
                  colIndex === 0 ? "w-1/4" : "flex-1 max-w-48",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton placeholder for a row of `<StatCard>`s. */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-${count} gap-4`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5 space-y-3"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}
