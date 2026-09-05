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
