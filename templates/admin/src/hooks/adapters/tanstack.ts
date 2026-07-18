/**
 * TanStack Query adapter for useApiQuery and useApiMutation.
 */
import { apiFetch } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type {
  ApiMutationOptions,
  ApiMutationResult,
  ApiQueryOptions,
  ApiQueryResult,
} from "../types";

export function useApiQuery<T = unknown>(
  path: string | null,
  options: ApiQueryOptions<T> = {},
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
    enabled: enabled && !!path,
    queryFn: () => apiFetch(path!),
    queryKey: [path],
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
  } & ApiMutationOptions<T, Arg>,
): ApiMutationResult<T, Arg> {
  const { path, method = "POST", onSuccess, onError } = options;

  const mutation = useMutation<T, Error, Arg>({
    mutationFn: (arg: Arg) => {
      const resolvedPath = typeof path === "function" ? path(arg) : path;
      return apiFetch(resolvedPath, {
        body:
          typeof path === "string" && arg !== undefined
            ? JSON.stringify(arg)
            : undefined,
        method,
      });
    },
    onError,
    onSuccess,
  });

  return {
    data: mutation.data,
    error: mutation.error as Error | null,
    isMutating: mutation.isPending,
    trigger: async (arg?: Arg) => mutation.mutateAsync(arg as Arg),
  };
}
