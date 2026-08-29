"use client";

import {
  apiClient,
  Badge,
  Button,
  cn,
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
import {
  Check,
  CheckCircle2,
  Copy,
  Key,
  Laptop,
  Lock,
  Mail,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  User,
} from "lucide-react";
import * as React from "react";
import { SessionsList } from "./SessionsList";

export function AccountPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState("profile");
  const [theme, setTheme] = React.useState<"light" | "dark" | "system">("dark");

  React.useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark" | "system") || "dark";
    setTheme(saved);
  }, []);

  const changeTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (newTheme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(systemDark ? "dark" : "light");
    } else {
      root.classList.add(newTheme);
    }
    toast.success(`Theme switched to ${newTheme}`);
  };

  const [inputData, setInputData] = React.useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [formState, setFormState] = React.useState({
    isSubmitting: false,
  });
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

    setFormState({ isSubmitting: true });
    try {
      await apiClient(`/api/users/${user.id}`, {
        method: "PATCH",
        body: { password: inputData.newPassword },
      });
      toast.success("Password updated successfully!");
      setInputData({ newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      toast.error(msg);
    } finally {
      setFormState({ isSubmitting: false });
    }
  };

  const email = user?.email || "admin@cms.com";
  const roleName = user?.role || "Administrator";

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Account"
        description="Manage your personal profile, credentials, appearance preferences, and active sessions."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-fit">
          <TabsTrigger value="profile" className="flex items-center gap-2 px-3.5 py-1.5 text-xs">
            <User className="size-4" />
            <span>Profile & Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2 px-3.5 py-1.5 text-xs">
            <Shield className="size-4" />
            <span>Active Sessions</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile & Preferences */}
        <TabsContent value="profile" className="space-y-6">
          {/* Card 1: Personal Info */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <User className="size-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
                <p className="text-xs text-muted-foreground">
                  Your identity and account details in this workspace
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
                    onClick={handleCopyId}
                    iconStart={<Copy />}
                  >
                    {copiedId ? "Copied" : "Copy"}
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

          {/* Card 2: Appearance & Theme Preference */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <Palette className="size-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Appearance & Theme</h2>
                <p className="text-xs text-muted-foreground">
                  Customize the interface theme and visual mode for your account
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Dark Theme Option */}
              <button
                type="button"
                onClick={() => changeTheme("dark")}
                className={cn(
                  "group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer",
                  theme === "dark"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/80 bg-card hover:bg-muted/40 hover:border-border",
                )}
              >
                <div className="flex w-full items-center justify-between mb-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-700">
                    <Moon className="size-4" />
                  </div>
                  {theme === "dark" && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-xs text-foreground">Dark Theme</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Deep black canvas with sleek contrast and glass highlights.
                </p>
              </button>

              {/* Light Theme Option */}
              <button
                type="button"
                onClick={() => changeTheme("light")}
                className={cn(
                  "group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer",
                  theme === "light"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/80 bg-card hover:bg-muted/40 hover:border-border",
                )}
              >
                <div className="flex w-full items-center justify-between mb-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-300">
                    <Sun className="size-4" />
                  </div>
                  {theme === "light" && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-xs text-foreground">Light Theme</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Crisp white canvas with high legibility and light borders.
                </p>
              </button>

              {/* System Theme Option */}
              <button
                type="button"
                onClick={() => changeTheme("system")}
                className={cn(
                  "group relative flex flex-col items-start rounded-xl border p-4 text-left transition-all cursor-pointer",
                  theme === "system"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/80 bg-card hover:bg-muted/40 hover:border-border",
                )}
              >
                <div className="flex w-full items-center justify-between mb-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border/80">
                    <Laptop className="size-4" />
                  </div>
                  {theme === "system" && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-xs text-foreground">System Default</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Automatically synchronize with your operating system theme.
                </p>
              </button>
            </div>
          </div>

          {/* Card 3: Security & Password */}
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
                    value={inputData.newPassword}
                    onChange={(e) =>
                      setInputData((prev) => ({ ...prev, newPassword: e.target.value }))
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
                    value={inputData.confirmPassword}
                    onChange={(e) =>
                      setInputData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={formState.isSubmitting}
                  loading={formState.isSubmitting}
                  iconStart={<Save />}
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
