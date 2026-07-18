import { useState } from "react";
import type { ApiQueryOptions } from "./types";
import { useApiQuery } from "./useApi";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

interface UseApiPaginationOptions extends Omit<ApiQueryOptions, "onSuccess"> {
  initialPage?: number;
  initialLimit?: number;
}

interface UseApiPaginationResult<T> {
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  items: T[];
  limit: number;
  meta: PaginationMeta | null;
  nextPage: () => void;
  page: number;
  prevPage: () => void;
  refetch: () => void;
  setLimit: (limit: number) => void;
  setPage: (page: number) => void;
}

/**
 * Hook for paginated API queries with built-in pagination controls
 *
 * @example
 * const { items, meta, page, setPage, nextPage, prevPage } = useApiPagination<User>(
 *   "/users",
 *   { initialPage: 1, initialLimit: 10 }
 * );
 *
 * @example
 * // With filters
 * const [status, setStatus] = useState("active");
 * const { items, isLoading } = useApiPagination<Post>(
 *   `/blog?status=${status}`,
 *   { initialLimit: 20 }
 * );
 */
export function useApiPagination<T>(
  basePath: string,
  options: UseApiPaginationOptions = {},
): UseApiPaginationResult<T> {
  const {
    initialPage = 1,
    initialLimit = 10,
    enabled = true,
    revalidateOnFocus = false,
    ...queryOptions
  } = options;

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  // Build URL with pagination params
  const separator = basePath.includes("?") ? "&" : "?";
  const url = `${basePath}${separator}page=${page}&limit=${limit}`;

  const { data, isLoading, isRefreshing, error, refetch } = useApiQuery<
    PaginatedResponse<T>
  >(url, {
    enabled,
    revalidateOnFocus,
    ...queryOptions,
  });

  const items = data?.items || [];
  const meta = data?.meta || null;

  const nextPage = () => {
    if (meta && page < meta.totalPages) {
      setPage(page + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  return {
    error,
    isLoading,
    isRefreshing,
    items,
    limit,
    meta,
    nextPage,
    page,
    prevPage,
    refetch,
    setLimit,
    setPage,
  };
}
