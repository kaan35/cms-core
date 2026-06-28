"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApiMutation } from "@/hooks/useApi";
import { Lock, Mail, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LoginCredentials {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: "admin@cms.com",
    password: "admin123",
  });
  const [error, setError] = useState("");

  // Use mutation hook for login
  const { trigger: login, isMutating } = useApiMutation<{ status: string }, LoginCredentials>({
    path: "/auth/login",
    method: "POST",
    onSuccess: () => {
      router.push("/pages");
    },
    onError: (err: Error) => {
      setError(err.message || "Invalid credentials");
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    await login(formData);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
      {/* Background Neon Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-[128px]"></div>
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[128px]"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Glass Card */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-8 backdrop-blur-xl shadow-2xl">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Antigravity CMS</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Sign in to administer your headless content
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              type="email"
              required
              label="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@cms.com"
              leftIcon={Mail}
            />

            <Input
              type="password"
              required
              label="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              leftIcon={Lock}
            />

            <Button
              type="submit"
              isLoading={isMutating}
              className="w-full py-3 justify-center active:scale-[0.98]"
            >
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
