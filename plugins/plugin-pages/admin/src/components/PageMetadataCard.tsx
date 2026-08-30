"use client";

import {
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@cms/admin-shell";
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
        <div className="sm:col-span-6 space-y-1.5">
          <Label htmlFor="page-title">Page Title *</Label>
          <Input
            id="page-title"
            placeholder="e.g. About Us, Products, Pricing"
            value={inputData.title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
          />
        </div>

        <div className="sm:col-span-6 space-y-1.5">
          <Label htmlFor="page-slug">URL Slug</Label>
          <Input
            id="page-slug"
            placeholder="about-us"
            className="font-mono text-xs"
            value={inputData.slug}
            onChange={(e) => onSlugChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="page-status">Publication Status</Label>
          <Select
            value={inputData.status}
            onValueChange={(val) =>
              onDataChange((prev) => ({
                ...prev,
                status: val as "draft" | "published",
              }))
            }
          >
            <SelectTrigger id="page-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft (Private)</SelectItem>
              <SelectItem value="published">Published (Live to Public)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="page-type">Page Type</Label>
          <Select
            value={inputData.pageType}
            onValueChange={(val) =>
              onDataChange((prev) => ({
                ...prev,
                pageType: val as "standard" | "home",
              }))
            }
          >
            <SelectTrigger id="page-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard Route</SelectItem>
              <SelectItem value="home">Root Home Page (/)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-border/60">
        <div className="space-y-1.5">
          <Label htmlFor="seo-title">SEO Meta Title (Optional)</Label>
          <Input
            id="seo-title"
            placeholder="Custom title for browser tab & search engines"
            value={inputData.metaTitle}
            onChange={(e) => onDataChange((prev) => ({ ...prev, metaTitle: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="seo-desc">SEO Meta Description (Optional)</Label>
          <Textarea
            id="seo-desc"
            rows={2}
            placeholder="Brief summary for search engine snippet..."
            value={inputData.metaDescription}
            onChange={(e) => onDataChange((prev) => ({ ...prev, metaDescription: e.target.value }))}
            className="min-h-[64px]"
          />
        </div>
      </div>
    </div>
  );
}
