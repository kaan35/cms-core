"use client";

import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/Input";
import { useApiMutation } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { Flame, Lock, LogIn, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { mutate } from "swr";

interface LoginCredentials {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const { isLoading: isCheckingAuth } = useAuth({
    redirectIfFound: true,
    redirectTo: "/",
  });

  const { trigger: login, isMutating } = useApiMutation<
    { status: string },
    LoginCredentials
  >({
    method: "POST",
    onError: (err: Error) => {
      setError(err.message || "Invalid credentials");
    },
    onSuccess: async () => {
      await mutate("/auth/me");
      router.push("/");
    },
    path: "/auth/login",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    await login(formData);
  };

  if (isCheckingAuth) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />
      </div>

      {/* Brand header — outside the card */}
      <div className="relative mb-6 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-lg shadow-primary/10">
          <Flame className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            CMS Core
          </h1>
        </div>
      </div>

      {/* Island card */}
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card/90 p-8 backdrop-blur-xl shadow-xl">
          {error && (
            <ErrorMessage
              error={error}
              fallback="Invalid credentials"
              className="mb-5"
            />
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              required
              label="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="admin@cms.com"
              leftIcon={Mail}
            />

            <Input
              type="password"
              required
              label="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="••••••••"
              leftIcon={Lock}
            />

            <Button
              icon={LogIn}
              type="submit"
              isLoading={isMutating}
              className="mt-2 w-full justify-center py-2.5"
            >
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
