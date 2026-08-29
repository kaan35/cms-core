"use client";

import {
  apiClient,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  toast,
  useApi,
  useSaveShortcut,
} from "@cms/admin-shell";
import { Compass, Globe, Palette, Save, Shield } from "lucide-react";
import * as React from "react";
import { NavigationManager } from "./NavigationManager";

interface SystemSettingsData {
  siteTitle?: string;
  siteDescription?: string;
  primaryColor?: string;
  fontFamily?: string;
  defaultTheme?: string;
  footerText?: string;
  allowRegistration?: boolean;
  sessionTimeoutMinutes?: number;
}

export function SettingsEditor() {
  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ settings: SystemSettingsData } | SystemSettingsData>("/api/settings");

  const settings: SystemSettingsData =
    rawData && "settings" in rawData
      ? (rawData.settings as SystemSettingsData)
      : (rawData as SystemSettingsData) || {};

  const [activeTab, setActiveTab] = React.useState<"general" | "theme" | "navigation">("general");

  const [inputData, setInputData] = React.useState<{
    siteTitle: string;
    siteDescription: string;
    primaryColor: string;
    fontFamily: string;
    defaultTheme: string;
    footerText: string;
    allowRegistration: boolean;
    sessionTimeoutMinutes: number;
  }>({
    siteTitle: "",
    siteDescription: "",
    primaryColor: "#3b82f6",
    fontFamily: "Inter",
    defaultTheme: "dark",
    footerText: "",
    allowRegistration: true,
    sessionTimeoutMinutes: 60,
  });

  const [formState, setFormState] = React.useState({
    isSubmitting: false,
  });

  React.useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setInputData({
        siteTitle: settings.siteTitle || "CMS Core",
        siteDescription: settings.siteDescription || "Headless CMS Engine",
        primaryColor: settings.primaryColor || "#3b82f6",
        fontFamily: settings.fontFamily || "Inter",
        defaultTheme: settings.defaultTheme || "dark",
        footerText: settings.footerText || "",
        allowRegistration: settings.allowRegistration ?? true,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 60,
      });
    }
  }, [settings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormState({ isSubmitting: true });

    try {
      const payload = {
        siteTitle: inputData.siteTitle.trim(),
        siteDescription: inputData.siteDescription.trim(),
        primaryColor: inputData.primaryColor,
        brandColor: inputData.primaryColor,
        fontFamily: inputData.fontFamily,
        brandFont: inputData.fontFamily,
        defaultTheme: inputData.defaultTheme,
        footerText: inputData.footerText.trim(),
        allowRegistration: inputData.allowRegistration,
        sessionTimeoutMinutes: inputData.sessionTimeoutMinutes,
      };

      const updated = await apiClient<{ settings: SystemSettingsData }>("/api/settings", {
        method: "PUT",
        body: payload,
      });

      toast.success("Settings saved successfully");
      mutate(updated, false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setFormState({ isSubmitting: false });
    }
  };

  useSaveShortcut(handleSave, activeTab !== "navigation");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">System Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage global site branding, themes, security defaults, and navigation.
          </p>
        </div>

        {activeTab !== "navigation" && (
          <Button
            type="submit"
            form="settings-form"
            loading={formState.isSubmitting}
            iconStart={<Save />}
            shortcut="save"
          >
            {formState.isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl border border-border/80 bg-muted/40 max-w-lg">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "general"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="size-3.5" />
          <span>General & Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("theme")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "theme"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Palette className="size-3.5" />
          <span>Theme & Branding</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("navigation")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "navigation"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="size-3.5" />
          <span>Navigation Menu</span>
        </button>
      </div>

      {/* Tab 3: Navigation Menu */}
      {activeTab === "navigation" && <NavigationManager />}

      {/* Tab 1: General & Security Settings */}
      {activeTab === "general" && (
        <form id="settings-form" onSubmit={handleSave} className="space-y-6">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <Globe className="size-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Website Identity</h2>
                <p className="text-xs text-muted-foreground">
                  General site details and footer information
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="siteTitle">Site Title</Label>
                <Input
                  id="siteTitle"
                  placeholder="e.g. My Website"
                  value={inputData.siteTitle}
                  onChange={(e) => setInputData((prev) => ({ ...prev, siteTitle: e.target.value }))}
                  className="max-w-md"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="siteDescription">Site Description / Tagline</Label>
                <Input
                  id="siteDescription"
                  placeholder="A short description of your website for SEO and search results"
                  value={inputData.siteDescription}
                  onChange={(e) =>
                    setInputData((prev) => ({ ...prev, siteDescription: e.target.value }))
                  }
                  className="max-w-md"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="footerText">Footer Copyright Text</Label>
              <Input
                id="footerText"
                placeholder="e.g. © 2026 My Website. All rights reserved."
                value={inputData.footerText}
                onChange={(e) => setInputData((prev) => ({ ...prev, footerText: e.target.value }))}
                className="max-w-md"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <Shield className="size-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Authentication & Session Policy
                </h2>
                <p className="text-xs text-muted-foreground">
                  Control registration gates and idle session timeouts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/40">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground block">
                    Public Self-Registration
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Allow new visitors to register from the login screen
                  </p>
                </div>
                <Switch
                  checked={inputData.allowRegistration}
                  onCheckedChange={(val) =>
                    setInputData((prev) => ({ ...prev, allowRegistration: val }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-timeout">Session Lifetime (Minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  min={5}
                  max={10080}
                  value={inputData.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setInputData((prev) => ({
                      ...prev,
                      sessionTimeoutMinutes: parseInt(e.target.value, 10) || 60,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Theme & Appearance */}
      {activeTab === "theme" && (
        <form id="settings-form" onSubmit={handleSave} className="space-y-6">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
              <Palette className="size-4 text-primary" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Appearance & Brand Palette
                </h2>
                <p className="text-xs text-muted-foreground">
                  Select default color schemes, accents, and typography
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label>Default Client Theme</Label>
                <Select
                  value={inputData.defaultTheme}
                  onValueChange={(val) =>
                    setInputData((prev) => ({ ...prev, defaultTheme: val || "dark" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark Theme (Default)</SelectItem>
                    <SelectItem value="light">Light Theme</SelectItem>
                    <SelectItem value="system">System Synchronized</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Primary Brand Accent Color</Label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={inputData.primaryColor}
                    onChange={(e) =>
                      setInputData((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="size-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                  />
                  <Input
                    value={inputData.primaryColor}
                    onChange={(e) =>
                      setInputData((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Default Font Family</Label>
                <Select
                  value={inputData.fontFamily}
                  onValueChange={(val) =>
                    setInputData((prev) => ({ ...prev, fontFamily: val || "Inter" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter (Sans-Serif)</SelectItem>
                    <SelectItem value="Geist">Geist (Modern Sans)</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Fira Code">Fira Code (Monospace)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
