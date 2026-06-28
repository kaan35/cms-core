/**
 * TanStack Query adapter for useApiQuery and useApiMutation.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useEffect } from "react";
import type {
  ApiQueryOptions,
  ApiQueryResult,
  ApiMutationOptions,
  ApiMutationResult,
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

  const { data, error, isLoading, isFetching } = useQuery<T>({
    queryKey: [path],
    queryFn: () => apiFetch(path!),
    enabled: enabled && !!path,
    refetchOnWindowFocus: revalidateOnFocus,
    retry: retryOnError,
    staleTime,
  });

  // Safe useEffect wrappers for success/error callbacks to avoid render-body side effects
  useEffect(() => {
    if (data && onSuccess) {
      onSuccess(data);
    }
  }, [data, onSuccess]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const queryClient = useQueryClient();

  return {
    data,
    error: (error as Error) || null,
    isLoading,
    isRefreshing: isFetching && !isLoading,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: [path] });
    },
  };
}

export function useApiMutation<T = unknown, Arg = unknown>(
  options: {
    method?: "POST" | "PUT" | "DELETE" | "PATCH";
  } & ApiMutationOptions<T, Arg>
): ApiMutationResult<T, Arg> {
  const { path, method = "POST", onSuccess, onError } = options;

  const mutation = useMutation<T, Error, Arg>({
    mutationFn: (arg: Arg) => {
      const resolvedPath = typeof path === "function" ? path(arg) : path;
      return apiFetch(resolvedPath, {
        method,
        body: typeof path === "string" && arg !== undefined ? JSON.stringify(arg) : undefined,
      });
    },
    onSuccess,
    onError,
  });

  return {
    trigger: async (arg?: Arg) => mutation.mutateAsync(arg as Arg),
    data: mutation.data,
    error: mutation.error as Error | null,
    isMutating: mutation.isPending,
  };
}
