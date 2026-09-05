"use client";

import { InputField, InputSelectField } from "@cms/admin-shell";

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
        <InputField
          label="Section Title (Optional)"
          placeholder="e.g. From Our Blog / Son Yazılar"
          value={data.title || ""}
          onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
        />

        <InputField
          label="Badge Label (Optional)"
          placeholder="e.g. Latest Articles / Güncel Yazılar"
          value={data.badge || ""}
          onChange={(e) => onChange({ ...data, badge: e.target.value || undefined })}
        />
      </div>

      <InputField
        label="Section Subtitle (Optional)"
        placeholder="e.g. Read our latest engineering patterns and product updates"
        value={data.subtitle || ""}
        onChange={(e) => onChange({ ...data, subtitle: e.target.value || undefined })}
      />

      {/* 2. Queries & Layout Configuration */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField
          label="Number of Posts"
          type="number"
          min={1}
          max={50}
          value={data.limit || 6}
          onChange={(e) => onChange({ ...data, limit: parseInt(e.target.value, 10) || 6 })}
        />

        <InputSelectField
          label="Display Layout"
          value={data.layout || "grid"}
          onValueChange={(val) => onChange({ ...data, layout: val as "grid" | "list" })}
          options={[
            { value: "grid", label: "Grid Card Feed" },
            { value: "list", label: "Vertical List Feed" },
          ]}
        />
      </div>

      {/* 3. Call-to-Action & Button Labels */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-border/60 pt-4">
        <InputField
          label={`"View All" Label`}
          placeholder="e.g. View all articles / Tümünü Gör"
          value={data.viewAllLabel || ""}
          onChange={(e) => onChange({ ...data, viewAllLabel: e.target.value || undefined })}
        />

        <InputField
          label={`"View All" URL`}
          placeholder="e.g. /blog"
          value={data.viewAllUrl || ""}
          onChange={(e) => onChange({ ...data, viewAllUrl: e.target.value || undefined })}
        />

        <InputField
          label={`"Read Article" Label`}
          placeholder="e.g. Read article / Yazıyı Oku"
          value={data.readMoreLabel || ""}
          onChange={(e) => onChange({ ...data, readMoreLabel: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
