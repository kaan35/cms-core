/**
 * Resolves localized strings or objects from MongoDB document schemas.
 * Supports string fields directly, or objects with locale keys like { tr: "...", en: "..." }.
 */
export function translate(field: any, locale: string = "tr"): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object") {
    return field[locale] || field["tr"] || field["en"] || Object.values(field)[0] || "";
  }
  return String(field);
}
