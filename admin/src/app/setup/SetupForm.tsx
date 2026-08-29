"use client";

import * as React from "react";
import { Flame, Lock, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { apiClient, Button, Input, Label, setCsrfToken, toast, useAuth } from "@cms/admin-shell";

export function SetupForm() {
  const { isAuthenticated, isLoading, mutate } = useAuth();

  const [inputData, setInputData] = React.useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.href = "/dashboard";
    }
  }, [isLoading, isAuthenticated]);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!inputData.email.trim() || !inputData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (inputData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (inputData.password !== inputData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiClient<{ csrfToken?: string; user?: unknown }>("/api/auth/setup", {
        method: "POST",
        body: {
          email: inputData.email.trim(),
          password: inputData.password,
        },
      });

      if (res?.csrfToken) {
        setCsrfToken(res.csrfToken);
      }

      toast.success("Initial administrator account created successfully!");
      await mutate();
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete initial setup.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2.5 mb-6 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Flame className="size-6 fill-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Welcome to CMS Core</h1>
          <p className="text-xs text-muted-foreground">
            Create your initial administrator account to complete setup.
          </p>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
            <ShieldCheck className="size-4 shrink-0" />
            <span>Setup mode is active. This account will have full admin rights.</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-foreground">
                Admin Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                iconStart={<Mail />}
                value={inputData.email}
                onChange={(e) => setInputData((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-foreground">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                iconStart={<Lock />}
                value={inputData.password}
                onChange={(e) => setInputData((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                iconStart={<Lock />}
                value={inputData.confirmPassword}
                onChange={(e) =>
                  setInputData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                required
              />
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              iconStart={<UserPlus />}
              className="w-full text-xs h-9 mt-2"
            >
              Create Administrator Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
