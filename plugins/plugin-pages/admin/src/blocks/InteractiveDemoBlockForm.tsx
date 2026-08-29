"use client";

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@cms/admin-shell";
import { Shield, Sparkles } from "lucide-react";

export interface InteractiveDemoBlockData {
  type: "interactive_demo";
  title?: string | undefined;
  description?: string | undefined;
  widgetType?: "turnstile" | "counter" | "pricing_calculator" | undefined;
}

export interface InteractiveDemoBlockFormProps {
  data: InteractiveDemoBlockData;
  onChange: (data: InteractiveDemoBlockData) => void;
}

export function InteractiveDemoBlockForm({ data, onChange }: InteractiveDemoBlockFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="demo-title">Widget Headline</Label>
          <Input
            id="demo-title"
            placeholder="e.g. Security Verification"
            value={data.title || ""}
            onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="demo-type">Interactive Demo Type</Label>
          <Select
            value={data.widgetType || "turnstile"}
            onValueChange={(val) =>
              onChange({
                ...data,
                widgetType: val as "turnstile" | "counter" | "pricing_calculator",
              })
            }
          >
            <SelectTrigger id="demo-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="turnstile">
                <div className="flex items-center gap-2">
                  <Shield className="size-3.5 text-primary" />
                  <span>Security Human Verification (Math Challenge)</span>
                </div>
              </SelectItem>
              <SelectItem value="counter">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-primary" />
                  <span>Interactive Metric Counter</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="demo-desc">Description / Subtitle</Label>
        <Textarea
          id="demo-desc"
          rows={2}
          placeholder="e.g. Interactive challenge demo widget showcasing client-side validation."
          value={data.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
