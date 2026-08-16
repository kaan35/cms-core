"use client";

import {
  apiClient,
  Badge,
  Button,
  Input,
  Label,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  useAuth,
} from "@cms/admin-shell";
import { CheckCircle2, Copy, Key, Lock, Mail, Save, Shield, User } from "lucide-react";
import * as React from "react";
import { SessionsList } from "./SessionsList";

export function AccountPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState("profile");

  const [passwordData, setPasswordData] = React.useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      toast.success("User ID copied to clipboard");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleChangePassword = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!passwordData.newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!user?.id) {
      toast.error("User profile is not loaded");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await apiClient(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: passwordData.newPassword }),
      });
      toast.success("Password updated successfully!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      toast.error(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const email = user?.email || "admin@cms.com";
  const roleName = user?.role || "Administrator";

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Account"
        description="Manage your personal profile, credentials, and active login sessions"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-fit">
          <TabsTrigger value="profile" className="flex items-center gap-2 px-3.5 py-1.5 text-xs">
            <User className="size-4" />
            <span>Profile & Security</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2 px-3.5 py-1.5 text-xs">
            <Shield className="size-4" />
            <span>Active Sessions</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile & Security */}
        <TabsContent value="profile" className="space-y-6">
          {/* Card 1: Personal Info */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <User className="size-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
                <p className="text-xs text-muted-foreground">
                  Your identity and account role in this workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary font-bold text-lg uppercase">
                {email[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{email}</span>
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {roleName}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">Active Member</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded-lg bg-muted/40 border border-border/60 text-xs font-mono text-foreground truncate">
                    {user?.id || "f252a031-0563-49db-9ebc-e32a15d6df64"}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyId}
                    className="shrink-0 text-xs gap-1"
                  >
                    <Copy className="size-3.5" />
                    <span>{copiedId ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  iconStart={<Mail />}
                  className="text-xs bg-muted/30 opacity-80 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Security & Password */}
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
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Minimum 6 characters"
                    iconStart={<Lock />}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    iconStart={<Lock />}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isUpdatingPassword}
                  loading={isUpdatingPassword}
                  iconStart={<Save />}
                  className="text-xs h-8"
                >
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* Tab 2: Active Sessions */}
        <TabsContent value="sessions">
          <SessionsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
