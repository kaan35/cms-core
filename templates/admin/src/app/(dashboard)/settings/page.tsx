"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { Flame, RefreshCw, Save, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    brandName: "",
    primaryColor: "#8b5cf6",
    secondaryColor: "#4f46e5",
  });

  const { isLoading, isRefreshing, error, refetch } = useApiQuery<{
    settings: {
      brandName: string;
      primaryColor: string;
      secondaryColor: string;
    };
  }>("/settings", {
    onSuccess: (fetchedData) => {
      if (fetchedData.settings) {
        setFormData({
          brandName: fetchedData.settings.brandName || "ModularCMS",
          primaryColor: fetchedData.settings.primaryColor || "#8b5cf6",
          secondaryColor: fetchedData.settings.secondaryColor || "#4f46e5",
        });
      }
    },
  });

  const { trigger: saveSettings, isMutating } = useApiMutation({
    method: "PUT",
    onError: (err: Error) => {
      const errorMsg = err.message || "Failed to save settings";
      showToast({ message: errorMsg, type: "error" });
    },
    onSuccess: () => {
      showToast({ message: "Settings updated successfully", type: "success" });
      refetch();
    },
    path: "/settings",
  });

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!formData.brandName) {
      showToast({ message: "Brand Name is required", type: "warning" });
      return;
    }
    await saveSettings(formData);
  };

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SettingsIcon}
        accent="neutral"
        title="General Settings"
        description="Configure dynamic portal themes, branding settings and styling variables"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            isDisabled={isRefreshing}
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        }
      />

      {error && (
        <ErrorMessage error={error} fallback="Failed to load settings" />
      )}

      <form onSubmit={handleSubmit}>
        <Card
          title="Branding & Styles Configuration"
          description="Manage your brand assets and theme primary variables applied across headless rendering layouts"
        >
          <div className="space-y-6">
            <div className="max-w-md">
              <Input
                label="Site Brand Name"
                value={formData.brandName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    brandName: e.target.value,
                  }))
                }
                placeholder="e.g. CMS Core Blog"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl border-t border-border pt-6">
              {/* Primary Color */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary Theme Color
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        primaryColor: e.target.value,
                      }))
                    }
                    className="h-12 w-12 rounded-lg border border-border bg-transparent cursor-pointer"
                  />
                  <div className="flex-1">
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          primaryColor: e.target.value,
                        }))
                      }
                      placeholder="#8b5cf6"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Color */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Secondary Theme Color
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        secondaryColor: e.target.value,
                      }))
                    }
                    className="h-12 w-12 rounded-lg border border-border bg-transparent cursor-pointer"
                  />
                  <div className="flex-1">
                    <Input
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          secondaryColor: e.target.value,
                        }))
                      }
                      placeholder="#4f46e5"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Banner */}
            <div className="border-t border-border pt-6 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live Theme Preset Preview
              </label>
              <div className="p-6 rounded-xl border border-border bg-background flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    <Flame className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-foreground text-lg">
                    {formData.brandName || "ModularCMS"}
                  </span>
                </div>
                <div className="flex gap-3">
                  <span
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    Primary Button
                  </span>
                  <span
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm"
                    style={{ backgroundColor: formData.secondaryColor }}
                  >
                    Secondary Button
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border pt-6 flex justify-start">
              <Button type="submit" isLoading={isMutating} icon={Save}>
                Save Settings
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
