"use client";

import useSWR, { mutate, type SWRConfiguration, type SWRResponse } from "swr";
import { api, type ApiRequestOptions } from "./api";

export { mutate };

/**
 * React Hook for client-side data fetching with SWR caching and automatic revalidation.
 */
export function useApi<T = unknown>(
  endpoint: string | null | (() => string | null),
  options?: ApiRequestOptions,
  config?: SWRConfiguration<T>,
): SWRResponse<T, Error> {
  const fetcher = async (url: string): Promise<T> => {
    return api.get<T>(url, options);
  };

  return useSWR<T, Error>(endpoint, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    ...config,
  });
}
