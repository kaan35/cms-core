/**
 * Resolves localized strings or objects from MongoDB document schemas.
 * Supports string fields directly, or objects with locale keys like { tr: "...", en: "..." }.
 */
export function translate(field: unknown, locale: string = "tr"): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && field !== null) {
    const obj = field as Record<string, unknown>;
    const val = obj[locale] || obj["tr"] || obj["en"] || Object.values(obj)[0];
    return val ? String(val) : "";
  }
  return String(field);
}
