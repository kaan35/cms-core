import { ValidationError } from "./errors/AppError.js";
import type { ICollection } from "./types/IDatabase.js";
import type { PaginatedResult } from "./utils/pagination.js";
import { buildPaginatedResult, parsePaginationQuery } from "./utils/pagination.js";

const TR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

export function generateSlug(text: string): string {
  if (!text || typeof text !== "string") {
    return "untitled";
  }

  // 1. Replace Turkish characters
  let str = text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => TR_MAP[char] ?? char);

  // 2. Normalize unicode diacritics
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 3. Lowercase & strip non-alphanumeric characters (except spaces and dashes)
  str = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return str || "untitled";
}

export async function assertUniqueSlug(
  collection: ICollection<Record<string, unknown>>,
  slug: string,
  excludeId?: string,
): Promise<void> {
  const existing = await collection.findOne({ slug });
  if (existing && existing["id"] !== excludeId) {
    throw new ValidationError(`Slug '${slug}' is already in use`);
  }
}

export async function searchPaginated<T extends Record<string, unknown>>(
  collection: ICollection<T>,
  query: string,
  paginationQuery?: unknown,
  extraFilter: Record<string, unknown> = {},
): Promise<PaginatedResult<T>> {
  const { page, limit } = parsePaginationQuery(paginationQuery ?? {});
  const skip = (page - 1) * limit;

  const trimmed = (query ?? "").trim();
  const filter: Record<string, unknown> = { ...extraFilter };

  if (trimmed) {
    // Uses $text query for MongoDB or flexible search
    filter["$text"] = { $search: trimmed };
  }

  const [data, total] = await Promise.all([
    collection.find(filter, { skip, limit, sort: { createdAt: -1 } }),
    collection.countDocuments(filter),
  ]);

  return buildPaginatedResult(data, total, page, limit);
}
