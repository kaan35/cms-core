import { z } from "zod";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../utils/pagination.js";

export const IdParamSchema = z.object({ id: z.string().min(1).max(128) });
export type IdParam = z.infer<typeof IdParamSchema>;

export const SearchPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  search: z.string().trim().max(200).optional(),
});
export type SearchPaginationQuery = z.infer<typeof SearchPaginationQuerySchema>;

export const PaginatedMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export function createPaginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginatedMetaSchema,
  });
}

export const OkResponseSchema = z.object({
  ok: z.boolean(),
});
