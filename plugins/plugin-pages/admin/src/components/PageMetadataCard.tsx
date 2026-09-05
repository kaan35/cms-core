"use client";

import { Badge, InputField, InputSelectField, InputTextareaField } from "@cms/admin-shell";
import * as React from "react";
import type { PageEditorState } from "./usePageEditor";

interface PageMetadataCardProps {
  inputData: PageEditorState;
  onTitleChange: (val: string) => void;
  onSlugChange: (val: string) => void;
  onDataChange: React.Dispatch<React.SetStateAction<PageEditorState>>;
}

export function PageMetadataCard({
  inputData,
  onTitleChange,
  onSlugChange,
  onDataChange,
}: PageMetadataCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h2 className="text-sm font-semibold text-foreground">Page Details & Routing</h2>
        <div className="flex items-center gap-2">
          {inputData.pageType === "home" && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
              Root Home Page
            </Badge>
          )}
          <Badge
            variant={inputData.status === "published" ? "default" : "secondary"}
            className="text-[10px] capitalize"
          >
            {inputData.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <InputField
            label="Page Title"
            placeholder="e.g. About Us, Products, Pricing"
            value={inputData.title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
          />
        </div>

        <div className="sm:col-span-6">
          <InputField
            label="URL Slug"
            placeholder="about-us"
            className="font-mono text-xs"
            value={inputData.slug}
            onChange={(e) => onSlugChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputSelectField
          label="Publication Status"
          value={inputData.status}
          onValueChange={(val) =>
            onDataChange((prev) => ({
              ...prev,
              status: val as "draft" | "published",
            }))
          }
          options={[
            { value: "draft", label: "Draft (Private)" },
            { value: "published", label: "Published (Live to Public)" },
          ]}
        />

        <InputSelectField
          label="Page Type"
          value={inputData.pageType}
          onValueChange={(val) =>
            onDataChange((prev) => ({
              ...prev,
              pageType: val as "standard" | "home",
            }))
          }
          options={[
            { value: "standard", label: "Standard Route" },
            { value: "home", label: "Root Home Page (/)" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-border/60">
        <InputField
          label="SEO Meta Title (Optional)"
          placeholder="Custom title for browser tab & search engines"
          value={inputData.metaTitle}
          onChange={(e) => onDataChange((prev) => ({ ...prev, metaTitle: e.target.value }))}
        />

        <InputTextareaField
          label="SEO Meta Description (Optional)"
          rows={2}
          placeholder="Brief summary for search engine snippet..."
          value={inputData.metaDescription}
          onChange={(e) => onDataChange((prev) => ({ ...prev, metaDescription: e.target.value }))}
          className="min-h-[64px]"
        />
      </div>
    </div>
  );
}
