/**
 * Pagination utilities for Fastify route handlers.
 *
 * Usage:
 *   const { page, limit, skip } = parsePaginationQuery(request.query);
 *   const total = await col.countDocuments(filter);
 *   const items = await col.find(filter).skip(skip).limit(limit).toArray();
 *   return { status: "success", items, meta: buildPaginationMeta(page, limit, total) };
 */

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Safely parse page/limit from query string with sensible defaults.
 */
export function parsePaginationQuery(
  query: PaginationQuery,
  defaults: { page?: number; limit?: number } = {}
): PaginationParams {
  const page = Math.max(1, parseInt((query.page ?? ""), 10) || (defaults.page ?? 1));
  const limit = Math.min(100, Math.max(1, parseInt((query.limit ?? ""), 10) || (defaults.limit ?? 10)));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Build a standardised pagination metadata object.
 */
export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
