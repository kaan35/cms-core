"use client";

import { Input, Label } from "@cms/admin-shell";
import { MediaPicker } from "@cms/plugin-media-admin";

export interface HeroBlockData {
  type: "hero";
  title: string;
  subtitle?: string | undefined;
  mediaId?: string | undefined;
  primaryCta?: { label: string; url: string } | undefined;
  secondaryCta?: { label: string; url: string } | undefined;
}

export interface HeroBlockFormProps {
  data: HeroBlockData;
  onChange: (data: HeroBlockData) => void;
}

export function HeroBlockForm({ data, onChange }: HeroBlockFormProps) {
  const updateField = <K extends keyof HeroBlockData>(field: K, val: HeroBlockData[K]) => {
    onChange({ ...data, [field]: val });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="hero-title">Hero Title *</Label>
        <Input
          id="hero-title"
          placeholder="e.g. Next-Generation Digital Experiences"
          value={data.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hero-subtitle">Subtitle</Label>
        <Input
          id="hero-subtitle"
          placeholder="e.g. Empower your brand with our cutting-edge headless CMS platform."
          value={data.subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Background / Hero Media</Label>
        <MediaPicker
          value={data.mediaId}
          onChange={(media) => updateField("mediaId", media?.url || media?.id || undefined)}
          dialogTitle="Select Hero Background Image"
          aspectRatio="video"
          description="High-resolution image for hero section background or graphic"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-border/60">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">
            Primary Action Button
          </Label>
          <div className="space-y-1.5">
            <Input
              placeholder="Button Label (e.g. Get Started)"
              value={data.primaryCta?.label || ""}
              onChange={(e) =>
                updateField("primaryCta", {
                  label: e.target.value,
                  url: data.primaryCta?.url || "",
                })
              }
            />
            <Input
              placeholder="Target URL (e.g. /contact or https://...)"
              value={data.primaryCta?.url || ""}
              onChange={(e) =>
                updateField("primaryCta", {
                  label: data.primaryCta?.label || "",
                  url: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">
            Secondary Action Button
          </Label>
          <div className="space-y-1.5">
            <Input
              placeholder="Button Label (e.g. Learn More)"
              value={data.secondaryCta?.label || ""}
              onChange={(e) =>
                updateField("secondaryCta", {
                  label: e.target.value,
                  url: data.secondaryCta?.url || "",
                })
              }
            />
            <Input
              placeholder="Target URL (e.g. /about)"
              value={data.secondaryCta?.url || ""}
              onChange={(e) =>
                updateField("secondaryCta", {
                  label: data.secondaryCta?.label || "",
                  url: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
