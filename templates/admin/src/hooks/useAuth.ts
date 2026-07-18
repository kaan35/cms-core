import { useApiQuery } from "@/hooks/useApi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface User {
  id: string;
  email: string;
  role: string;
  permissions?: string[];
}

interface UseAuthOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
}

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useAuth(options: UseAuthOptions = {}): UseAuthResult {
  const { redirectTo = "/login", redirectIfFound = false } = options;
  const router = useRouter();

  const {
    data: authData,
    isLoading,
    error,
  } = useApiQuery<{ user: User }>("/auth/me", {});

  const user = authData?.user ?? null;

  // Handle redirects
  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    // Redirect to login if auth check failed
    if (error && !redirectIfFound) {
      router.push(redirectTo);
    }

    // Redirect to dashboard if already logged in (for login page)
    if (user && redirectIfFound) {
      router.push(redirectTo);
    }
  }, [user, error, isLoading, redirectTo, redirectIfFound, router]);

  return {
    error: error ?? null,
    isError: !!error,
    isLoading,
    user,
  };
}
