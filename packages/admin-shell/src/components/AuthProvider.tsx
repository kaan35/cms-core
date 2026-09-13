"use client";

import * as React from "react";
import { SWRConfig } from "swr";
import type { AuthUser } from "../hooks/useAuth";

export interface AuthProviderProps {
  initialUser?: AuthUser | null | undefined;
  initialPlugins?: unknown | null | undefined;
  children: React.ReactNode;
}

export function AuthProvider({ initialUser, initialPlugins, children }: AuthProviderProps) {
  const fallback: Record<string, unknown> = {};

  if (initialUser) {
    fallback["/api/auth/me"] = { user: initialUser };
  }
  if (initialPlugins) {
    fallback["/api/plugins"] = initialPlugins;
  }

  return (
    <SWRConfig
      value={{
        fallback,
      }}
    >
      {children}
    </SWRConfig>
  );
}
