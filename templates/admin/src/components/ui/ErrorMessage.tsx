import React from "react";

interface ErrorMessageProps {
  /** The error object or message string to display */
  error: Error | string | null | undefined;
  /** Fallback message when error has no message field */
  fallback?: string;
  className?: string;
}

/**
 * Reusable inline error alert component.
 *
 * @example
 * <ErrorMessage error={error} fallback="Failed to load plugins" />
 */
export function ErrorMessage({ error, fallback = "An unexpected error occurred.", className = "" }: ErrorMessageProps) {
  if (!error) return null;

  const message = typeof error === "string"
    ? error
    : error?.message || fallback;

  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 ${className}`}
    >
      {message}
    </div>
  );
}
