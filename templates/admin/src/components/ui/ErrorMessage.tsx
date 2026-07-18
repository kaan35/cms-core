import { cn } from "@/lib/utils";
import React from "react";

export interface ErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The error object or message string to display */
  error: Error | string | null | undefined;
  /** Fallback message when error has no message field */
  fallback?: string;
}

/**
 * Reusable inline error alert component.
 *
 * @example
 * <ErrorMessage error={error} fallback="Failed to load plugins" />
 */
export function ErrorMessage({
  error,
  fallback = "An unexpected error occurred.",
  className,
  ...props
}: ErrorMessageProps) {
  if (!error) return null;

  const message =
    typeof error === "string" ? error : error?.message || fallback;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive",
        className,
      )}
      {...props}
    >
      {message}
    </div>
  );
}
