/**
 * TanStack Query adapter for useApiQuery and useApiMutation.
 * 
 * Setup required:
 *   1. Install: npm install @tanstack/react-query
 *   2. Wrap app with QueryClientProvider in admin/src/app/layout.tsx:
 *
 *      import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 *      const queryClient = new QueryClient();
 *      export default function RootLayout({ children }) {
 *        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
 *      }
 *
 * To switch to this adapter:
 *   In hooks/useApi.ts, change:
 *     import { useApiQuery, useApiMutation } from "./adapters/swr";
 *   to:
 *     import { useApiQuery, useApiMutation } from "./adapters/tanstack";
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  ApiQueryOptions,
  ApiQueryResult,
  ApiMutationOptions,
  ApiMutationResult,
} from "../types";

export function useApiQuery<T = any>(
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

  // TanStack Query doesn't expose onSuccess/onError in useQuery options
  // in v5+, so we handle them manually here if provided
  if (data && onSuccess) onSuccess(data);
  if (error && onError) onError(error);

  const queryClient = useQueryClient();

  return {
    data,
    error,
    isLoading,
    isRefreshing: isFetching && !isLoading,
    refetch: () => { queryClient.invalidateQueries({ queryKey: [path] }); },
  };
}

export function useApiMutation<T = any, Arg = any>(
  options: {
    path: string;
    method?: "POST" | "PUT" | "DELETE" | "PATCH";
  } & ApiMutationOptions<T>
): ApiMutationResult<T, Arg> {
  const { path, method = "POST", onSuccess, onError } = options;

  const mutation = useMutation<T, unknown, Arg>({
    mutationFn: (arg: Arg) =>
      apiFetch(path, {
        method,
        body: arg !== undefined ? JSON.stringify(arg) : undefined,
      }),
    onSuccess,
    onError,
  });

  return {
    trigger: async (arg?: Arg) => mutation.mutateAsync(arg as Arg),
    data: mutation.data,
    error: mutation.error,
    isMutating: mutation.isPending,
  };
}
