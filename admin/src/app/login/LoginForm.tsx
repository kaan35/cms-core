"use client";

import * as React from "react";
import { AlertCircle, Flame, Lock, LogIn, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { api, Button, InputField, setCsrfToken, toast, useApi, useAuth } from "@cms/admin-shell";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const isSuspended = searchParams.get("suspended") === "true";
  const { isAuthenticated, isLoading, mutate } = useAuth();

  const { data: rawSettings } = useApi<
    | { settings?: { adminTitle?: string; siteTitle?: string } }
    | { adminTitle?: string; siteTitle?: string }
  >("/api/settings");

  const brandTitle = React.useMemo(() => {
    const s =
      rawSettings && "settings" in rawSettings && rawSettings.settings
        ? rawSettings.settings
        : (rawSettings as { adminTitle?: string; siteTitle?: string } | undefined);
    return s?.adminTitle || s?.siteTitle || "CMS Core";
  }, [rawSettings]);

  const [inputData, setInputData] = React.useState({
    email: "",
    password: "",
  });

  const [formState, setFormState] = React.useState({
    isSubmitting: false,
  });

  // Automatically restore session if active cookie exists (e.g. after container restart)
  React.useEffect(() => {
    if (isSuspended) return;
    mutate()
      .then((data) => {
        if (data?.user) {
          window.location.href = "/dashboard";
        }
      })
      .catch(() => {});
  }, [mutate, isSuspended]);

  React.useEffect(() => {
    if (isSuspended) return;
    if (!isLoading && isAuthenticated) {
      window.location.href = "/dashboard";
    }
  }, [isLoading, isAuthenticated, isSuspended]);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!inputData.email.trim() || !inputData.password) {
      toast.error("Please enter email and password");
      return;
    }

    setFormState({ isSubmitting: true });

    try {
      const res = await api.post<{ csrfToken?: string }>("/auth/login", inputData);

      if (res?.csrfToken) {
        setCsrfToken(res.csrfToken);
      }

      toast.success("Signed in successfully!");
      await mutate();
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials. Please try again.";
      toast.error(msg);
    } finally {
      setFormState({ isSubmitting: false });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2.5 mb-6">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Flame className="size-6 fill-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{brandTitle}</h1>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-border/80 bg-card p-6 shadow-xl space-y-4">
          {isSuspended && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
              <div className="space-y-0.5">
                <p className="font-semibold">Account Suspended</p>
                <p className="text-destructive/90 leading-relaxed">
                  Your account has been suspended. Please contact an administrator for assistance.
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            action="/api/auth/login"
            method="post"
            autoComplete="on"
            className="space-y-4"
          >
            <InputField
              id="email"
              name="email"
              autoComplete="username email"
              label="Email"
              type="email"
              placeholder="admin@cms.com"
              iconStart={<Mail />}
              value={inputData.email}
              onChange={(e) => setInputData((prev) => ({ ...prev, email: e.target.value }))}
              required
            />

            <InputField
              id="password"
              name="password"
              autoComplete="current-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              iconStart={<Lock />}
              value={inputData.password}
              onChange={(e) => setInputData((prev) => ({ ...prev, password: e.target.value }))}
              required
            />

            <Button
              type="submit"
              loading={formState.isSubmitting}
              iconStart={<LogIn />}
              className="w-full text-xs h-9"
            >
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function LoginForm() {
  return (
    <React.Suspense fallback={null}>
      <LoginFormContent />
    </React.Suspense>
  );
}
