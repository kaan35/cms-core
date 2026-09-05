"use client";

import { InputField, InputTextareaField } from "@cms/admin-shell";
import { Layers } from "lucide-react";
import type { FormBuilderState } from "./useFormBuilder";

interface FormConfigCardProps {
  data: FormBuilderState;
  onTitleChange: (val: string) => void;
  onSlugChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
}

export function FormConfigCard({
  data,
  onTitleChange,
  onSlugChange,
  onDescriptionChange,
}: FormConfigCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Layers className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Form Configuration</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField
          label="Form Title"
          placeholder="e.g. Contact Sales & Inquiries"
          value={data.title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
        />

        <InputField
          label="URL Slug"
          placeholder="contact-sales"
          className="font-mono text-xs"
          value={data.slug}
          onChange={(e) => onSlugChange(e.target.value)}
        />
      </div>

      <InputTextareaField
        label="Form Description (Optional)"
        rows={2}
        placeholder="Brief helper text displayed above the form fields..."
        value={data.description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />
    </div>
  );
}
