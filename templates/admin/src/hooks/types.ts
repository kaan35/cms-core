/**
 * Library-agnostic query options.
 * These map to SWR or TanStack Query options under the hood.
 *
 * SWR mapping:
 *   enabled          → key (null disables fetching)
 *   revalidateOnFocus → revalidateOnFocus
 *   retryOnError     → shouldRetryOnError
 *   staleTime        → dedupingInterval
 *
 * TanStack Query mapping:
 *   enabled          → enabled
 *   revalidateOnFocus → refetchOnWindowFocus
 *   retryOnError     → retry
 *   staleTime        → staleTime
 */
export interface ApiQueryOptions<T = unknown> {
  /** Disable fetching entirely (e.g. while auth is pending). Default: true */
  enabled?: boolean;
  /** Revalidate when the browser window regains focus. Default: true */
  revalidateOnFocus?: boolean;
  /** Retry failed requests. Default: false */
  retryOnError?: boolean;
  /** How long (ms) to consider cached data fresh before revalidating. Default: 0 */
  staleTime?: number;
  /** Called with the successful response data */
  onSuccess?: (data: T) => void;
  /** Called when a request fails */
  onError?: (error: unknown) => void;
}

/**
 * Uniform return shape for useApiQuery regardless of underlying library.
 */
export interface ApiQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  /** True on the initial fetch (no cached data yet) */
  isLoading: boolean;
  /** True while a background revalidation is running */
  isRefreshing: boolean;
  /** Manually trigger a revalidation / refetch */
  refetch: () => void;
}

/**
 * Library-agnostic mutation options.
 *
 * `path` accepts two forms:
 *   - string  → used as the URL directly; `trigger(arg)` sends `arg` as JSON body.
 *   - function → called with the trigger argument to build the URL; no body is sent.
 *               Use this pattern to avoid stale-closure issues with dynamic path segments.
 *
 * @example
 *   // Static path (body mutation) — same as before
 *   path: "/settings"
 *   trigger(formData)  // formData sent as body
 *
 *   // Dynamic path (no body) — analogous to trigger(formData) but for path params
 *   path: (id: string) => `/plugins/${id}/toggle`
 *   trigger(plugin._id)
 */
export interface ApiMutationOptions<T = unknown, Arg = unknown> {
  path: string | ((arg: Arg) => string);
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Uniform return shape for useApiMutation regardless of underlying library.
 */
export interface ApiMutationResult<T, Arg> {
  /** Call this to fire the request. Pass the request body or path arg as the argument. */
  trigger: (arg?: Arg) => Promise<T | undefined>;
  data: T | undefined;
  error: Error | null;
  isMutating: boolean;
}
