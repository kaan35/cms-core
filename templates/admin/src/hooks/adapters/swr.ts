/**
 * SWR adapter for useApiQuery and useApiMutation.
 * 
 * To switch to TanStack Query:
 *   In hooks/useApi.ts, change:
 *     import { useApiQuery, useApiMutation } from "./adapters/swr";
 *   to:
 *     import { useApiQuery, useApiMutation } from "./adapters/tanstack";
 */
import { apiFetch } from "@/lib/api";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import type {
  ApiMutationOptions,
  ApiMutationResult,
  ApiQueryOptions,
  ApiQueryResult,
} from "../types";

export function useApiQuery<T = unknown>(
  path: string | null,
  options: ApiQueryOptions<T> = {}
): ApiQueryResult<T> {
  const {
    enabled = true,
    revalidateOnFocus = true,
    retryOnError = false,
    staleTime = 0,
    onSuccess,
    onError,
  } = options;

  // Disable fetching by passing null as the key
  const key = enabled && path ? path : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    key,
    () => apiFetch(path!),
    {
      revalidateOnFocus,
      shouldRetryOnError: retryOnError,
      dedupingInterval: staleTime,
      // Only include callbacks when defined — SWR throws if undefined is passed
      ...(onSuccess && { onSuccess }),
      ...(onError && { onError }),
    }
  );

  return {
    data,
    error,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    refetch: () => { mutate(); },
  };
}

export function useApiMutation<T = unknown, Arg = unknown>(
  options: {
    method?: "POST" | "PUT" | "DELETE" | "PATCH";
  } & ApiMutationOptions<T, Arg>
): ApiMutationResult<T, Arg> {
  const { path, method = "POST", onSuccess, onError } = options;

  // When path is a function we need a stable SWR key — the actual URL is computed
  // inside the fetcher from the trigger arg, eliminating the stale-closure bug.
  const swrKey = typeof path === "string" ? path : `__dynamic__:${method}`;

  const fetcher = async (_key: string, { arg }: { arg: Arg }) => {
    const resolvedPath = typeof path === "function" ? path(arg) : path;
    return apiFetch(resolvedPath, {
      method,
      // Only send body when path is static (body mutation). Dynamic path = no body.
      body: typeof path === "string" && arg !== undefined ? JSON.stringify(arg) : undefined,
    });
  };

  const { trigger, data, error, isMutating } = useSWRMutation<T, unknown, string, Arg>(
    swrKey,
    fetcher,
    {
      // Only include callbacks when defined — SWR throws if undefined is passed
      ...(onSuccess && { onSuccess }),
      ...(onError && {
        onError: (err: unknown) => {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }),
    }
  );

  return {
    trigger: async (arg?: Arg) => {
      const result = await (trigger as (extraArgument?: Arg) => Promise<T>)(arg);
      return result;
    },
    data,
    error: (error as Error) || null,
    isMutating,
  };
}
