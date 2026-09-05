"use client";

import { apiClient, Button, Skeleton, toast, useApi, useSaveShortcut } from "@cms/admin-shell";
import { Compass, Globe, Palette, Save } from "lucide-react";
import * as React from "react";
import { NavigationManager } from "./NavigationManager";
import { GeneralSettingsTab } from "./settings/GeneralSettingsTab";
import type { SettingsFormData, SystemSettingsData } from "./settings/settingsTypes";
import { ThemeSettingsTab } from "./settings/ThemeSettingsTab";

export type { SettingsFormData, SystemSettingsData } from "./settings/settingsTypes";

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

  const [inputData, setInputData] = React.useState<SettingsFormData>({
    siteTitle: "",
    siteDescription: "",
    primaryColor: "#3b82f6",
    fontFamily: "Inter",
    defaultTheme: "dark",
    footerText: "",
    allowRegistration: true,
    sessionTimeoutMinutes: 60,
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const handleInputChange = (patch: Partial<SettingsFormData>) => {
    setInputData((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

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
      setIsSubmitting(false);
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
            loading={isSubmitting}
            iconStart={<Save />}
            shortcut="save"
          >
            {isSubmitting ? "Saving..." : "Save Settings"}
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
        <GeneralSettingsTab
          inputData={inputData}
          onChange={handleInputChange}
          onSubmit={handleSave}
        />
      )}

      {/* Tab 2: Theme & Appearance */}
      {activeTab === "theme" && (
        <ThemeSettingsTab
          inputData={inputData}
          onChange={handleInputChange}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
