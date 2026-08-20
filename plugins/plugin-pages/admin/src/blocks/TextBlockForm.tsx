"use client";

import { Label, Textarea } from "@cms/admin-shell";

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
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="text-content">Content (Markdown / HTML supported) *</Label>
          <span className="text-[11px] text-muted-foreground">
            {(data.content || "").length} characters
          </span>
        </div>
        <Textarea
          id="text-content"
          placeholder="Write rich paragraph content, headers (#, ##), lists, or embed HTML..."
          rows={8}
          className="font-mono text-xs leading-relaxed"
          value={data.content || ""}
          onChange={(e) => onChange({ ...data, content: e.target.value })}
        />
      </div>
    </div>
  );
}
