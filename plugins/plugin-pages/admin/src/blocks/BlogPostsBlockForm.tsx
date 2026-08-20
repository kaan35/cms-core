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
  limit: number;
  category?: string | undefined;
  layout: "grid" | "list";
}

export interface BlogPostsBlockFormProps {
  data: BlogPostsBlockData;
  onChange: (data: BlogPostsBlockData) => void;
}

export function BlogPostsBlockForm({ data, onChange }: BlogPostsBlockFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Label htmlFor="blog-category">Filter by Category (Optional)</Label>
          <Input
            id="blog-category"
            placeholder="e.g. engineering, news"
            value={data.category || ""}
            onChange={(e) => onChange({ ...data, category: e.target.value || undefined })}
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
    </div>
  );
}
