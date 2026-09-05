"use client";

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cms/admin-shell";
import { Palette } from "lucide-react";
import type { SettingsFormData } from "./settingsTypes";

interface ThemeSettingsTabProps {
  inputData: SettingsFormData;
  onChange: (patch: Partial<SettingsFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ThemeSettingsTab({ inputData, onChange, onSubmit }: ThemeSettingsTabProps) {
  return (
    <form id="settings-form" onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
          <Palette className="size-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Appearance & Brand Palette</h2>
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
              onValueChange={(val) => onChange({ defaultTheme: val || "dark" })}
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
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="size-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
              />
              <Input
                value={inputData.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Default Font Family</Label>
            <Select
              value={inputData.fontFamily}
              onValueChange={(val) => onChange({ fontFamily: val || "Inter" })}
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
  );
}
