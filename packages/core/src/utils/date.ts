/**
 * Shared date formatting and search utilities for @cms/core.
 * Provides timezone-aware, locale-aware date formatting and multi-format search matchers.
 */

export interface DateFormatOptions {
  timeZone?: string | undefined;
  hour12?: boolean | undefined;
  locale?: string | undefined;
}

/**
 * Formats a date into a localized date string (e.g. "Oct 19, 2026").
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  options?: DateFormatOptions,
): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";

  const locale = options?.locale || "en-US";
  const fmtOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(options?.timeZone ? { timeZone: options.timeZone } : {}),
  };

  return new Intl.DateTimeFormat(locale, fmtOptions).format(d);
}

/**
 * Formats a date and time into a localized string (e.g. "Oct 19, 2026, 12:44 AM").
 */
export function formatDateTime(
  date: string | number | Date | null | undefined,
  options?: DateFormatOptions,
): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";

  const locale = options?.locale || "en-US";
  const fmtOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(options?.hour12 !== undefined ? { hour12: options.hour12 } : {}),
    ...(options?.timeZone ? { timeZone: options.timeZone } : {}),
  };

  return new Intl.DateTimeFormat(locale, fmtOptions).format(d);
}

/**
 * Pre-instantiates a collection of DateTimeFormat instances for fast query matching.
 * Covers client timezone (12h and 24h) and UTC fallback.
 */
export function createDateSearchFormatters(
  timeZone?: string | undefined,
  locale = "en-US",
): Intl.DateTimeFormat[] {
  const formatters: Intl.DateTimeFormat[] = [];
  const timeZones: string[] = [];

  if (timeZone) {
    timeZones.push(timeZone);
  }
  timeZones.push("UTC");

  for (const tz of timeZones) {
    try {
      // 12-hour AM/PM format (e.g. "Oct 19, 2026, 12:44 AM")
      formatters.push(
        new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: tz,
        }),
      );
      // 24-hour format (e.g. "Oct 19, 2026, 00:44")
      formatters.push(
        new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: tz,
        }),
      );
    } catch {
      // Ignore invalid timezone gracefully
    }
  }

  return formatters;
}

/**
 * Checks whether a given date matches a search query across ISO and localized representations.
 */
export function matchesDateSearch(
  date: string | number | Date | null | undefined,
  query: string,
  formatters?: Intl.DateTimeFormat[] | undefined,
): boolean {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return false;

  const q = query.trim().toLowerCase();
  if (!q) return false;

  // 1. ISO string match (e.g. "2026-10-18")
  if (d.toISOString().toLowerCase().includes(q)) return true;

  // 2. Pre-computed localized formatters (12h, 24h, client timezone, UTC)
  if (formatters && formatters.length > 0) {
    for (const fmt of formatters) {
      if (fmt.format(d).toLowerCase().includes(q)) return true;
    }
  }

  return false;
}
