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
} from "@cms/admin-shell";
import { Globe, Palette, Save, Shield } from "lucide-react";
import * as React from "react";

interface SystemSettingsData {
  siteTitle?: string;
  siteDescription?: string;
  primaryColor?: string;
  fontFamily?: string;
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

  const [inputData, setInputData] = React.useState({
    siteTitle: "",
    siteDescription: "",
    primaryColor: "#3b82f6",
    fontFamily: "Inter",
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
        allowRegistration: settings.allowRegistration ?? true,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 60,
      });
    }
  }, [settings]);

  const handleSave = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setFormState({ isSubmitting: true });

    try {
      await apiClient("/api/settings", {
        method: "PUT",
        body: inputData,
      });
      toast.success("System settings saved successfully!");
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update settings";
      toast.error(msg);
    } finally {
      setFormState({ isSubmitting: false });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 w-full pb-16">
      {/* Subheader / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Global Parameters & Policies</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adjust system metadata, color branding, and registration rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            loading={formState.isSubmitting}
            iconStart={<Save className="size-3.5" />}
            className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
          >
            {formState.isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Card 1: General Info */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <Globe className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">General Configuration</h2>
            <p className="text-xs text-muted-foreground">Public site metadata and identification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="siteTitle" className="text-xs">
              Site Title
            </Label>
            <Input
              id="siteTitle"
              value={inputData.siteTitle}
              onChange={(e) => setInputData((prev) => ({ ...prev, siteTitle: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="siteDescription" className="text-xs">
              Site Description
            </Label>
            <Input
              id="siteDescription"
              value={inputData.siteDescription}
              onChange={(e) =>
                setInputData((prev) => ({ ...prev, siteDescription: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* Card 2: Branding & Appearance */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <Palette className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Branding & Theme</h2>
            <p className="text-xs text-muted-foreground">Accent colors and typography styling</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="primaryColor" className="text-xs">
              Brand Primary Accent
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={inputData.primaryColor}
                onChange={(e) =>
                  setInputData((prev) => ({ ...prev, primaryColor: e.target.value }))
                }
                className="size-9 rounded-lg border border-border cursor-pointer bg-transparent"
              />
              <Input
                id="primaryColor"
                value={inputData.primaryColor}
                onChange={(e) =>
                  setInputData((prev) => ({ ...prev, primaryColor: e.target.value }))
                }
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fontFamily" className="text-xs">
              Font Family
            </Label>
            <Select
              value={inputData.fontFamily}
              onValueChange={(val) => {
                if (val) setInputData((prev) => ({ ...prev, fontFamily: val }));
              }}
            >
              <SelectTrigger id="fontFamily">
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Geist">Geist Sans</SelectItem>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Outfit">Outfit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Card 3: Security & Access */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <Shield className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Security & Access</h2>
            <p className="text-xs text-muted-foreground">
              User sign-up and session lifespan controls
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
            <div>
              <Label className="text-xs font-medium">Allow Self Registration</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">Let new users sign up</p>
            </div>
            <Switch
              checked={inputData.allowRegistration}
              onCheckedChange={(val) =>
                setInputData((prev) => ({ ...prev, allowRegistration: val }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sessionTimeout" className="text-xs">
              Session Timeout (Minutes)
            </Label>
            <Input
              id="sessionTimeout"
              type="number"
              min="5"
              max="10080"
              value={inputData.sessionTimeoutMinutes}
              onChange={(e) =>
                setInputData((prev) => ({ ...prev, sessionTimeoutMinutes: Number(e.target.value) }))
              }
            />
          </div>
        </div>
      </div>
    </form>
  );
}
