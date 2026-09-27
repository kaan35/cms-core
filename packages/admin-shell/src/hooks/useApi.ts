"use client";

import useSWR, { mutate as swrMutate, type SWRConfiguration, type SWRResponse } from "swr";
import { api, resolveRequestUrl, type RequestOptions } from "../lib/api-client";

function normalizeKey(
  key: string | null | (() => string | null),
): string | null | (() => string | null) {
  if (typeof key === "function") {
    return () => {
      const res = key();
      return typeof res === "string" ? resolveRequestUrl(res).url : res;
    };
  }
  if (typeof key === "string") {
    return resolveRequestUrl(key).url;
  }
  return key;
}

/**
 * Global cache mutation and invalidation utility (SWR).
 * Automatically normalizes endpoint paths (e.g. `/users` -> `/api/users`) so mutations match queries.
 *
 * @example
 * ```ts
 * import { mutate } from "@cms/admin-shell";
 *
 * // 1. Invalidate a single endpoint (exact key match, automatically resolves prefix)
 * mutate("/users");
 *
 * // 2. Invalidate all paginated or filtered queries under a path (prefix matcher)
 * mutate((key) => typeof key === "string" && key.includes("/users"));
 * ```
 */
export const mutate: typeof swrMutate = (key, data, opts) => {
  if (typeof key === "string") {
    return swrMutate(resolveRequestUrl(key).url, data, opts);
  }
  return swrMutate(key, data, opts);
};

/**
 * Standard data fetching hook with automated caching and SWR capabilities.
 *
 * @param url Target API endpoint (e.g. `/users` or `/api/users`), null to skip fetching, or a conditional function.
 * @param options Optional fetch configuration (headers, credentials, timeout).
 * @param config SWR configuration overrides.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, mutate } = useApi<{ users: UserItem[] }>("/users");
 *
 * const handleSave = async () => {
 *   await api.put("/users/1", { name: "Alice" });
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
  const normalizedKey = normalizeKey(url);

  const fetcher = async (targetUrl: string): Promise<T> => {
    return api.get<T>(targetUrl, options);
  };

  return useSWR<T, Error>(normalizedKey, fetcher, {
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
