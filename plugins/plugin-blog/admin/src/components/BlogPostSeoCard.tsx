"use client";

import { InputField, InputTextareaField } from "@cms/admin-shell";
import { Sparkles } from "lucide-react";

interface BlogPostSeoCardProps {
  metaTitle?: string | undefined;
  metaDescription?: string | undefined;
  onMetaTitleChange: (val: string) => void;
  onMetaDescriptionChange: (val: string) => void;
}

export function BlogPostSeoCard({
  metaTitle,
  metaDescription,
  onMetaTitleChange,
  onMetaDescriptionChange,
}: BlogPostSeoCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Search Engine Optimization (SEO)</h3>
      </div>

      <InputField
        label="SEO Meta Title"
        placeholder="Defaults to article title if empty"
        value={metaTitle || ""}
        onChange={(e) => onMetaTitleChange(e.target.value)}
      />

      <InputTextareaField
        label="SEO Meta Description"
        rows={2}
        placeholder="Defaults to summary excerpt if empty"
        value={metaDescription || ""}
        onChange={(e) => onMetaDescriptionChange(e.target.value)}
      />
    </div>
  );
}
