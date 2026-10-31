import { ValidationError } from "../errors/AppError.js";

export type PaginatedResult<T, S = unknown> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: S;
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function parsePaginationQuery(query: unknown): { page: number; limit: number } {
  const raw = typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};

  const rawPage = raw["page"];
  const rawLimit = raw["limit"];

  const page = rawPage !== undefined ? Number(rawPage) : DEFAULT_PAGE;
  const limit = rawLimit !== undefined ? Number(rawLimit) : DEFAULT_LIMIT;

  if (!Number.isInteger(page) || page < 1) {
    throw new ValidationError("page must be a positive integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ValidationError(`limit must be between 1 and ${MAX_LIMIT}`);
  }

  return { page, limit };
}

export function buildPaginatedResult<T, S = unknown>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  stats?: S,
): PaginatedResult<T, S> {
  const result: PaginatedResult<T, S> = {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
  if (stats !== undefined) {
    result.stats = stats;
  }
  return result;
}
