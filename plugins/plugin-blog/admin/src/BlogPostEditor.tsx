"use client";

import { cn, Input, Label, slugify, Textarea, useSaveShortcut } from "@cms/admin-shell";
import * as React from "react";
import type { BlogPostDoc } from "./BlogPostVersionHistory";
import { BlogPostSeoCard } from "./components/BlogPostSeoCard";
import { BlogPostSidebar } from "./components/BlogPostSidebar";

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  useSaveShortcut(() => handleSubmit());

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
          <BlogPostSeoCard
            metaTitle={inputData.metaTitle}
            metaDescription={inputData.metaDescription}
            onMetaTitleChange={(val) => setInputData((prev) => ({ ...prev, metaTitle: val }))}
            onMetaDescriptionChange={(val) =>
              setInputData((prev) => ({ ...prev, metaDescription: val }))
            }
          />
        </div>

        {/* Right Sidebar Publishing & Cover Image (4 cols) */}
        <BlogPostSidebar
          status={inputData.status}
          onStatusChange={(val) => setInputData((prev) => ({ ...prev, status: val }))}
          coverMediaId={inputData.coverMediaId}
          onCoverMediaChange={(val) => setInputData((prev) => ({ ...prev, coverMediaId: val }))}
        />
      </div>
    </form>
  );
}
