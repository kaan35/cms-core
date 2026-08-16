"use client";

import useSWR, { mutate, type SWRConfiguration, type SWRResponse } from "swr";
import { apiClient, type RequestOptions } from "../lib/api-client";

/**
 * Global cache mutation and invalidation utility (SWR).
 *
 * Equivalent to TanStack Query's `queryClient.invalidateQueries`.
 *
 * @example
 * ```ts
 * import { mutate } from "@cms/admin-shell";
 *
 * // 1. Invalidate a single endpoint (exact key match)
 * mutate("/api/users");
 *
 * // 2. Invalidate all paginated or filtered queries under a path (prefix matcher)
 * mutate((key) => typeof key === "string" && key.startsWith("/api/users"));
 *
 * // 3. Optimistic update: instantly update cache without immediate network wait
 * mutate("/api/users", updatedUsersList, { revalidate: true });
 * ```
 */
export { mutate };

/**
 * Standard data fetching hook with automated caching and SWR capabilities.
 *
 * @param url Target API endpoint (e.g. `/api/users`), null to skip fetching, or a conditional function.
 * @param options Optional fetch configuration (headers, credentials, timeout).
 * @param config SWR configuration overrides.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, mutate } = useApi<{ users: UserItem[] }>("/api/users");
 *
 * const handleSave = async () => {
 *   await apiClient("/api/users/1", { method: "PUT", body: { name: "Alice" } });
 *   // Revalidate the local query:
 *   mutate();
 * };
 * ```
 */
export function useApi<T = unknown>(
  url: string | null | (() => string | null),
  options?: RequestOptions,
  config?: SWRConfiguration<T>,
): SWRResponse<T, Error> {
  const fetcher = async (targetUrl: string): Promise<T> => {
    return apiClient<T>(targetUrl, options);
  };

  return useSWR<T, Error>(url, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    ...config,
  });
}

export function useApiPagination<T = unknown>(
  baseUrl: string | null,
  page = 1,
  limit = 20,
  extraParams?: Record<string, string | number | boolean | undefined>,
  config?: SWRConfiguration<{ data: T[]; total: number; page: number; limit: number }>,
) {
  const url = baseUrl
    ? `${baseUrl}?page=${page}&limit=${limit}${
        extraParams
          ? "&" +
            Object.entries(extraParams)
              .filter(([, v]) => v !== undefined && v !== "")
              .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
              .join("&")
          : ""
      }`
    : null;

  return useApi<{ data: T[]; total: number; page: number; limit: number }>(url, undefined, config);
}

export interface MinimalQueryState {
  isLoading: boolean;
  isValidating?: boolean;
  error?: unknown;
  mutate: () => Promise<unknown>;
}

export function combineQueries(results: MinimalQueryState[]) {
  const isLoading = results.some((r) => r.isLoading);
  const isFetching = results.some((r) => r.isValidating);
  const isError = results.some((r) => !!r.error);
  const error = results.find((r) => !!r.error)?.error || null;
  const refetch = async () => {
    await Promise.all(results.map((r) => r.mutate()));
  };
  return { isLoading, isFetching, isError, error, refetch };
}
