const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: string | number | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";

  return dateFormatter.format(d);
}

export function formatDateTime(date: string | number | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";

  return dateTimeFormatter.format(d);
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

export function formatRelativeTime(date: string | number | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 45) {
    return "just now";
  }
  if (Math.abs(diffMin) < 45) {
    return relativeTimeFormatter.format(-diffMin, "minute");
  }
  if (Math.abs(diffHour) < 22) {
    return relativeTimeFormatter.format(-diffHour, "hour");
  }
  if (Math.abs(diffDay) < 26) {
    return relativeTimeFormatter.format(-diffDay, "day");
  }
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 11) {
    return relativeTimeFormatter.format(-diffMonth, "month");
  }
  const diffYear = Math.round(diffDay / 365);
  return relativeTimeFormatter.format(-diffYear, "year");
}

export type TimeUnit = "milliseconds" | "seconds" | "minutes" | "hours" | "days";

const UNIT_TO_MS: Record<TimeUnit, number> = {
  milliseconds: 1,
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

/**
 * Calculates the difference between two timestamps in the specified time unit.
 * Positive value indicates `to` is in the future relative to `from`.
 */
export function getTimeDifference(
  from: string | number | Date | null | undefined,
  to: string | number | Date = Date.now(),
  unit: TimeUnit = "days",
): number {
  if (!from) return 0;
  const fromMs = typeof from === "object" ? from.getTime() : new Date(from).getTime();
  const toMs = typeof to === "object" ? to.getTime() : new Date(to).getTime();

  if (isNaN(fromMs) || isNaN(toMs)) return 0;
  return (toMs - fromMs) / UNIT_TO_MS[unit];
}

/**
 * Checks whether a given timestamp has exceeded the specified duration threshold.
 * e.g., isPastThreshold(passwordDate, 365, "days") or isPastThreshold(lastActive, 30, "minutes")
 */
export function isPastThreshold(
  date: string | number | Date | null | undefined,
  threshold: number,
  unit: TimeUnit = "days",
): boolean {
  if (!date) return false;
  return getTimeDifference(date, Date.now(), unit) > threshold;
}
