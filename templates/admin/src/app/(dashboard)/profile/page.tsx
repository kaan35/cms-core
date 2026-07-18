"use client";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { Save, Shield, User } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
  });

  const { data: authData, isLoading } = useApiQuery<{
    user: { id: string; email: string; role: string };
  }>("/auth/me");

  const { trigger: changePassword, isMutating } = useApiMutation({
    method: "POST",
    onError: (err: Error) => {
      showToast({
        message: err.message || "Failed to change password",
        type: "error",
      });
    },
    onSuccess: () => {
      showToast({ message: "Password changed successfully", type: "success" });
      setFormData({
        confirmPassword: "",
        currentPassword: "",
        newPassword: "",
      });
    },
    path: "/auth/change-password",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPassword) {
      showToast({ message: "Current password is required", type: "warning" });
      return;
    }
    if (formData.newPassword.length < 6) {
      showToast({
        message: "New password must be at least 6 characters",
        type: "warning",
      });
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showToast({ message: "New passwords do not match", type: "warning" });
      return;
    }

    await changePassword({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  const user = authData?.user;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Profile" }]} />

      <PageHeader
        icon={User}
        accent="neutral"
        title="Account Profile"
        description="View user details and update account authentication password"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card title="User Account" description="Assigned profile authority">
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border">
                <div className="h-9 w-9 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Logged in as</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border">
                <div className="h-9 w-9 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    Security Group Role
                  </p>
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Change Password Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card
              title="Update Password"
              description="Secure your administrator session details"
            >
              <div className="space-y-4">
                <Input
                  type="password"
                  label="Current Password"
                  value={formData.currentPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="password"
                    label="New Password"
                    value={formData.newPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Min 6 characters"
                    required
                  />
                  <Input
                    type="password"
                    label="Confirm New Password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Match new password"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button type="submit" isLoading={isMutating} icon={Save}>
                  Save
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
