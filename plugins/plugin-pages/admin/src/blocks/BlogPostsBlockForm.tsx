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

export interface BlogPostsBlockData {
  type: "blog_posts";
  title?: string | undefined;
  subtitle?: string | undefined;
  badge?: string | undefined;
  viewAllLabel?: string | undefined;
  viewAllUrl?: string | undefined;
  readMoreLabel?: string | undefined;
  limit: number;
  layout: "grid" | "list";
}

export interface BlogPostsBlockFormProps {
  data: BlogPostsBlockData;
  onChange: (data: BlogPostsBlockData) => void;
}

export function BlogPostsBlockForm({ data, onChange }: BlogPostsBlockFormProps) {
  return (
    <div className="space-y-4">
      {/* 1. Header & Typography Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="blog-title">Section Title (Optional)</Label>
          <Input
            id="blog-title"
            placeholder="e.g. From Our Blog / Son Yazılar"
            value={data.title || ""}
            onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="blog-badge">Badge Label (Optional)</Label>
          <Input
            id="blog-badge"
            placeholder="e.g. Latest Articles / Güncel Yazılar"
            value={data.badge || ""}
            onChange={(e) => onChange({ ...data, badge: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="blog-subtitle">Section Subtitle (Optional)</Label>
        <Input
          id="blog-subtitle"
          placeholder="e.g. Read our latest engineering patterns and product updates"
          value={data.subtitle || ""}
          onChange={(e) => onChange({ ...data, subtitle: e.target.value || undefined })}
        />
      </div>

      {/* 2. Queries & Layout Configuration */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="blog-limit">Number of Posts</Label>
          <Input
            id="blog-limit"
            type="number"
            min={1}
            max={50}
            value={data.limit || 6}
            onChange={(e) => onChange({ ...data, limit: parseInt(e.target.value, 10) || 6 })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="blog-layout">Display Layout</Label>
          <Select
            value={data.layout || "grid"}
            onValueChange={(val) => onChange({ ...data, layout: val as "grid" | "list" })}
          >
            <SelectTrigger id="blog-layout">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid Card Feed</SelectItem>
              <SelectItem value="list">Vertical List Feed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Call-to-Action & Button Labels */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-border/60 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="blog-viewAllLabel">&quot;View All&quot; Label</Label>
          <Input
            id="blog-viewAllLabel"
            placeholder="e.g. View all articles / Tümünü Gör"
            value={data.viewAllLabel || ""}
            onChange={(e) => onChange({ ...data, viewAllLabel: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="blog-viewAllUrl">&quot;View All&quot; URL</Label>
          <Input
            id="blog-viewAllUrl"
            placeholder="e.g. /blog"
            value={data.viewAllUrl || ""}
            onChange={(e) => onChange({ ...data, viewAllUrl: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="blog-readMoreLabel">&quot;Read Article&quot; Label</Label>
          <Input
            id="blog-readMoreLabel"
            placeholder="e.g. Read article / Yazıyı Oku"
            value={data.readMoreLabel || ""}
            onChange={(e) => onChange({ ...data, readMoreLabel: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  );
}
