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
