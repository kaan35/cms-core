"use client";

import { InputField, InputSelectField, InputTextareaField } from "@cms/admin-shell";
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
        <InputField
          label="Widget Headline"
          placeholder="e.g. Security Verification"
          value={data.title || ""}
          onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
        />

        <InputSelectField
          label="Interactive Demo Type"
          value={data.widgetType || "turnstile"}
          onValueChange={(val) =>
            onChange({
              ...data,
              widgetType: val as "turnstile" | "counter" | "pricing_calculator",
            })
          }
          options={[
            {
              value: "turnstile",
              label: "Security Human Verification (Math Challenge)",
              icon: <Shield className="size-3.5" />,
            },
            {
              value: "counter",
              label: "Interactive Metric Counter",
              icon: <Sparkles className="size-3.5" />,
            },
          ]}
        />
      </div>

      <InputTextareaField
        label="Description / Subtitle"
        rows={2}
        placeholder="e.g. Interactive challenge demo widget showcasing client-side validation."
        value={data.description || ""}
        onChange={(e) => onChange({ ...data, description: e.target.value || undefined })}
      />
    </div>
  );
}
