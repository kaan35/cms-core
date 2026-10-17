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
