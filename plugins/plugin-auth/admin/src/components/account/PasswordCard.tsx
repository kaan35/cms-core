"use client";

import { apiClient, Button, InputField, toast, type AuthUser } from "@cms/admin-shell";
import { Key, Lock, Save } from "lucide-react";
import * as React from "react";

interface PasswordCardProps {
  user: AuthUser | null;
}

export function PasswordCard({ user }: PasswordCardProps) {
  const [inputData, setInputData] = React.useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleChangePassword = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!inputData.newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (inputData.newPassword !== inputData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (inputData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!user?.id) {
      toast.error("User profile is not loaded");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient(`/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          password: inputData.newPassword,
        }),
      });
      toast.success("Password updated successfully");
      setInputData({ newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
        <Key className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Security & Password</h2>
          <p className="text-xs text-muted-foreground">
            Update your account credentials and password
          </p>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="New Password"
            type="password"
            placeholder="Minimum 6 characters"
            iconStart={<Lock />}
            value={inputData.newPassword}
            onChange={(e) => setInputData((prev) => ({ ...prev, newPassword: e.target.value }))}
            required
          />

          <InputField
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            iconStart={<Lock />}
            value={inputData.confirmPassword}
            onChange={(e) => setInputData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            required
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting} iconStart={<Save />}>
            Update Password
          </Button>
        </div>
      </form>
    </div>
  );
}
