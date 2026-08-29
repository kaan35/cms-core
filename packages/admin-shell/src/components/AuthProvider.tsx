"use client";

import * as React from "react";
import { SWRConfig } from "swr";
import type { AuthUser } from "../hooks/useAuth";

export interface AuthProviderProps {
  initialUser?: AuthUser | null;
  children: React.ReactNode;
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  if (!initialUser) {
    return <>{children}</>;
  }

  return (
    <SWRConfig
      value={{
        fallback: {
          "/api/auth/me": { user: initialUser },
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
