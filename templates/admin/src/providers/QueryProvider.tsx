"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for TanStack Query (React Query)
 *
 * Features:
 * - Automatic background refetch
 * - Smart caching and deduplication
 * - DevTools in development mode
 * - Configurable retry and stale time
 *
 * Note: Using useState ensures each request gets a fresh QueryClient
 * to prevent sharing state between different users in SSR.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create a new QueryClient instance for each request (SSR-safe)
  // This prevents sharing state between different users
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Refetch on window focus
            refetchOnWindowFocus: "always",
            // Don't retry failed requests by default
            retry: false,
            // Consider data stale after 5 seconds
            staleTime: 5000,
            // Keep unused data in cache for 5 minutes
            gcTime: 1000 * 60 * 5,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
