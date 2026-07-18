/**
 * Public API for data fetching hooks.
 *
 * ─── SWITCHING THE ADAPTER ─────────────────────────────────────────────────
 * To switch from SWR to TanStack Query (or back), change ONE import below.
 *
 *   SWR:
 *     import { useApiQuery, useApiMutation } from "./adapters/swr";
 *
 *   TanStack Query (current):
 *     import { useApiQuery, useApiMutation } from "./adapters/tanstack";
 *     (requires: QueryClientProvider in layout.tsx - ✅ already configured)
 *
 * Components always import from "@/hooks/useApi" and are unaware of the adapter.
 * ───────────────────────────────────────────────────────────────────────────
 */

// ← change only this line to switch adapters
export { useApiMutation, useApiQuery } from "./adapters/swr";

// Export pagination hook
export { useApiPagination } from "./useApiPagination";

// Re-export common types so consumers don't need to import from types.ts directly
export type {
  ApiMutationOptions,
  ApiMutationResult,
  ApiQueryOptions,
  ApiQueryResult,
} from "./types";
