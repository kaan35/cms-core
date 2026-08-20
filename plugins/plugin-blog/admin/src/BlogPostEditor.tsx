"use client";

import {
  cn,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  slugify,
  Textarea,
} from "@cms/admin-shell";
import { MediaPicker } from "@cms/plugin-media-admin";
import { Sparkles } from "lucide-react";
import * as React from "react";
import type { BlogPostDoc } from "./BlogPostVersionHistory";

export interface BlogPostFormData {
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverMediaId?: string | undefined;
  status: "draft" | "published";
  metaTitle?: string | undefined;
  metaDescription?: string | undefined;
}

export interface BlogPostEditorProps {
  initialData?: Partial<BlogPostDoc> | undefined;
  onSave: (data: BlogPostFormData) => Promise<void>;
  className?: string | undefined;
}

export function BlogPostEditor({ initialData, onSave, className }: BlogPostEditorProps) {
  const [inputData, setInputData] = React.useState<BlogPostFormData>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    summary: initialData?.summary || "",
    content: initialData?.content || "",
    coverMediaId: initialData?.coverMediaId,
    status: initialData?.status || "draft",
    metaTitle: initialData?.metaTitle || "",
    metaDescription: initialData?.metaDescription || "",
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(
    Boolean(initialData?.slug),
  );

  // Update form when initialData changes (e.g. version restore)
  React.useEffect(() => {
    if (initialData) {
      setInputData({
        title: initialData.title || "",
        slug: initialData.slug || "",
        summary: initialData.summary || "",
        content: initialData.content || "",
        coverMediaId: initialData.coverMediaId || undefined,
        status: initialData.status || "draft",
        metaTitle: initialData.metaTitle || "",
        metaDescription: initialData.metaDescription || "",
      });
      if (initialData.slug) {
        setIsSlugManuallyEdited(true);
      }
    }
  }, [initialData]);

  const handleTitleChange = (val: string) => {
    setInputData((prev) => ({
      ...prev,
      title: val,
      slug: isSlugManuallyEdited ? prev.slug : slugify(val),
    }));
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setInputData((prev) => ({
      ...prev,
      slug: slugify(val),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      title: inputData.title.trim(),
      slug: inputData.slug.trim() || slugify(inputData.title),
      summary: inputData.summary.trim(),
      content: inputData.content.trim(),
      coverMediaId: inputData.coverMediaId || undefined,
      status: inputData.status,
      metaTitle: inputData.metaTitle?.trim() || undefined,
      metaDescription: inputData.metaDescription?.trim() || undefined,
    });
  };

  return (
    <form id="blog-post-form" onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Main Article Content (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="post-title">Article Title *</Label>
              <Input
                id="post-title"
                placeholder="e.g. Deep Dive into Distributed Cache Invalidation"
                value={inputData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-slug">URL Slug</Label>
              <div className="flex items-center">
                <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-xs font-mono text-muted-foreground">
                  /blog/
                </span>
                <Input
                  id="post-slug"
                  className="rounded-l-none font-mono text-xs"
                  placeholder="deep-dive-into-distributed-cache"
                  value={inputData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="post-summary">Summary / Excerpt *</Label>
                <span className="text-[11px] text-muted-foreground">
                  {inputData.summary.length} characters
                </span>
              </div>
              <Textarea
                id="post-summary"
                rows={2}
                placeholder="A compelling synopsis for card previews and social meta tags..."
                value={inputData.summary}
                onChange={(e) => setInputData((prev) => ({ ...prev, summary: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="post-content">Article Content (Markdown / Text) *</Label>
                <span className="text-[11px] text-muted-foreground">
                  {inputData.content.length} characters
                </span>
              </div>
              <Textarea
                id="post-content"
                rows={16}
                placeholder="Write your article body here in Markdown..."
                className="font-mono text-xs leading-relaxed"
                value={inputData.content}
                onChange={(e) => setInputData((prev) => ({ ...prev, content: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* SEO Metadata Box */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Search Engine Optimization (SEO)
              </h3>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-meta-title">SEO Meta Title</Label>
              <Input
                id="post-meta-title"
                placeholder="Defaults to article title if empty"
                value={inputData.metaTitle || ""}
                onChange={(e) => setInputData((prev) => ({ ...prev, metaTitle: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-meta-desc">SEO Meta Description</Label>
              <Textarea
                id="post-meta-desc"
                rows={2}
                placeholder="Defaults to summary excerpt if empty"
                value={inputData.metaDescription || ""}
                onChange={(e) =>
                  setInputData((prev) => ({ ...prev, metaDescription: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar Publishing & Cover Image (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Publishing Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Publishing Options
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="post-status">Status</Label>
              <Select
                value={inputData.status}
                onValueChange={(val) =>
                  setInputData((prev) => ({ ...prev, status: val as "draft" | "published" }))
                }
              >
                <SelectTrigger id="post-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-muted-foreground" />
                      Draft
                    </span>
                  </SelectItem>
                  <SelectItem value="published">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Published
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cover Media Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cover Image
            </h3>
            <MediaPicker
              value={inputData.coverMediaId}
              onChange={(media) =>
                setInputData((prev) => ({
                  ...prev,
                  coverMediaId: media?.url || media?.id || undefined,
                }))
              }
              dialogTitle="Select Blog Cover Image"
              aspectRatio="video"
              description="Header banner image for article header and social share preview"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
