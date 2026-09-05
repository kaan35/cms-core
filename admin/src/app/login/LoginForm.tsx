"use client";

import * as React from "react";
import { Flame, Lock, LogIn, Mail } from "lucide-react";
import { apiClient, Button, InputField, setCsrfToken, toast, useAuth } from "@cms/admin-shell";

export function LoginForm() {
  const { isAuthenticated, isLoading, mutate } = useAuth();

  const [inputData, setInputData] = React.useState({
    email: "",
    password: "",
  });

  const [formState, setFormState] = React.useState({
    isSubmitting: false,
  });

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.href = "/dashboard";
    }
  }, [isLoading, isAuthenticated]);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!inputData.email.trim() || !inputData.password) {
      toast.error("Please enter email and password");
      return;
    }

    setFormState({ isSubmitting: true });

    try {
      const res = await apiClient<{ csrfToken?: string }>("/api/auth/login", {
        method: "POST",
        body: inputData,
      });

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
          <h1 className="text-xl font-bold tracking-tight text-foreground">CMS Core</h1>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Email"
              type="email"
              placeholder="admin@cms.com"
              iconStart={<Mail />}
              value={inputData.email}
              onChange={(e) => setInputData((prev) => ({ ...prev, email: e.target.value }))}
              required
            />

            <InputField
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
