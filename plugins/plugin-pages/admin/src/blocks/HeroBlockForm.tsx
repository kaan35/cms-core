"use client";

import { Input, Label } from "@cms/admin-shell";
import { MediaPicker } from "@cms/plugin-media-admin";
import { Check, Image, Layout, Monitor } from "lucide-react";

export interface HeroBlockData {
  type: "hero";
  title: string;
  subtitle?: string | undefined;
  mediaId?: string | undefined;
  mediaLayout?: "background" | "featured" | "banner" | undefined;
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

  const currentLayout = data.mediaLayout || "background";

  const layoutOptions = [
    {
      id: "background" as const,
      title: "Full Background Backdrop",
      description: "Spreads behind title with gradient overlay & ambient glow",
      icon: Image,
    },
    {
      id: "featured" as const,
      title: "Side-by-Side Featured",
      description: "Headline on left, framed 3D visual card on right",
      icon: Layout,
    },
    {
      id: "banner" as const,
      title: "Showcase Banner Below",
      description: "Centered headline with prominent product preview below",
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-5">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Left Column: Media Picker */}
        <div className="space-y-1.5 flex flex-col">
          <Label>Hero Visual / Image</Label>
          <div className="flex-1">
            <MediaPicker
              value={data.mediaId}
              onChange={(media) => updateField("mediaId", media?.url || media?.id || undefined)}
              dialogTitle="Select Hero Media"
              aspectRatio="video"
              description="Visual graphic, product screenshot, or background photo"
            />
          </div>
        </div>

        {/* Right Column: Visual Layout Cards */}
        <div className="space-y-1.5 flex flex-col">
          <Label>Visual Display Mode</Label>
          <div className="flex-1 grid grid-cols-1 gap-2.5">
            {layoutOptions.map((opt) => {
              const isSelected = currentLayout === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateField("mediaLayout", opt.id)}
                  className={`relative flex items-center gap-3.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                      : "border-border/80 bg-card/60 hover:bg-muted/40 hover:border-border"
                  }`}
                >
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>{opt.title}</span>
                      {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-3 border-t border-border/60">
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
