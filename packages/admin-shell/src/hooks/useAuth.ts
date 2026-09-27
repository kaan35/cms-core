"use client";

import useSWR from "swr";
import { api, ApiError } from "../lib/api-client";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  permissions?: string[];
}

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR<{ user: AuthUser } | null>(
    "/api/auth/me",
    async (url: string) => {
      try {
        return await api.get<{ user: AuthUser }>(url);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    {
      revalidateOnMount: false,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      dedupingInterval: 60000,
    },
  );

  const user = data?.user ?? null;
  const isAuthenticated = !!user;

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      await mutate(null, false);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    mutate,
    logout,
  };
}
