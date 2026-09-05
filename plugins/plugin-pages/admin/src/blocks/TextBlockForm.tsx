"use client";

import { InputTextareaField } from "@cms/admin-shell";

export interface TextBlockData {
  type: "text";
  content: string;
}

export interface TextBlockFormProps {
  data: TextBlockData;
  onChange: (data: TextBlockData) => void;
}

export function TextBlockForm({ data, onChange }: TextBlockFormProps) {
  return (
    <div className="space-y-3">
      <InputTextareaField
        className="font-mono text-xs leading-relaxed"
        hint={`${(data.content || "").length} characters`}
        label="Content (Markdown / HTML supported)"
        onChange={(e) => onChange({ ...data, content: e.target.value })}
        placeholder="Write rich paragraph content, headers (#, ##), lists, or embed HTML..."
        required
        rows={8}
        value={data.content || ""}
      />
    </div>
  );
}
