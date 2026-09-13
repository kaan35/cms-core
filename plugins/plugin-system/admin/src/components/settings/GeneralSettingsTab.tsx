"use client";

import { InputField, InputSwitchField } from "@cms/admin-shell";
import { Globe, Shield } from "lucide-react";
import type { SettingsFormData } from "./settingsTypes";

interface GeneralSettingsTabProps {
  inputData: SettingsFormData;
  onChange: (patch: Partial<SettingsFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  hasPagesPlugin?: boolean | undefined;
}

export function GeneralSettingsTab({
  inputData,
  onChange,
  onSubmit,
  hasPagesPlugin = true,
}: GeneralSettingsTabProps) {
  return (
    <form id="settings-form" onSubmit={onSubmit} className="space-y-6">
      {/* Application Identity (Admin Panel & Platform) */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <Shield className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Application Identity</h2>
            <p className="text-xs text-muted-foreground">
              Admin panel application name, sidebar brand, and system title
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <InputField
            label="Application / Admin Name"
            placeholder="e.g. Password Manager or CMS Core"
            value={inputData.adminTitle}
            onChange={(e) => onChange({ adminTitle: e.target.value })}
            className="max-w-md"
          />
        </div>
      </div>

      {/* Website Identity (Public Client Site - only if pages plugin is active) */}
      {hasPagesPlugin && (
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
            <Globe className="size-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Website Identity (Public Site)
              </h2>
              <p className="text-xs text-muted-foreground">
                Public website title, search engine meta descriptions, and copyright text
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputField
              label="Site Title"
              placeholder="e.g. My Website"
              value={inputData.siteTitle}
              onChange={(e) => onChange({ siteTitle: e.target.value })}
              className="max-w-md"
            />

            <InputField
              label="Site Description / Tagline"
              placeholder="A short description of your website for SEO and search results"
              value={inputData.siteDescription}
              onChange={(e) => onChange({ siteDescription: e.target.value })}
              className="max-w-md"
            />
          </div>

          <InputField
            label="Footer Copyright Text"
            placeholder="e.g. © 2026 My Website. All rights reserved."
            value={inputData.footerText}
            onChange={(e) => onChange({ footerText: e.target.value })}
            className="max-w-md"
          />
        </div>
      )}

      {/* Authentication & Session Policy */}
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
          <InputSwitchField
            label="Public Self-Registration"
            description="Allow new visitors to register from the login screen"
            checked={inputData.allowRegistration}
            onCheckedChange={(val) => onChange({ allowRegistration: val })}
          />

          <InputField
            label="Session Lifetime (Minutes)"
            type="number"
            min={5}
            max={10080}
            value={inputData.sessionTimeoutMinutes}
            onChange={(e) =>
              onChange({
                sessionTimeoutMinutes: parseInt(e.target.value, 10) || 60,
              })
            }
          />
        </div>
      </div>
    </form>
  );
}
