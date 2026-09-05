"use client";

import { InputField, InputSelectField, InputTextareaField } from "@cms/admin-shell";
import { ShieldAlert } from "lucide-react";
import * as React from "react";
import type { FormBuilderState } from "./useFormBuilder";

interface FormSecurityCardProps {
  data: FormBuilderState;
  onDataChange: React.Dispatch<React.SetStateAction<FormBuilderState>>;
}

export function FormSecurityCard({ data, onDataChange }: FormSecurityCardProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Form Actions & Messages
        </h3>

        <InputField
          label="Submit Button Label"
          placeholder="Submit"
          value={data.submitButtonText}
          onChange={(e) => onDataChange((prev) => ({ ...prev, submitButtonText: e.target.value }))}
        />

        <InputTextareaField
          label="Success Message"
          rows={2}
          placeholder="Thank you for your submission."
          value={data.successMessage}
          onChange={(e) => onDataChange((prev) => ({ ...prev, successMessage: e.target.value }))}
        />
      </div>

      {/* Captcha & Bot Protection Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bot Protection
          </h3>
        </div>

        <InputSelectField
          label="Captcha Provider"
          value={data.captchaProvider}
          onValueChange={(val) =>
            onDataChange((prev) => ({
              ...prev,
              captchaProvider: val as "none" | "challenge",
            }))
          }
          options={[
            { value: "challenge", label: "Interactive Challenge" },
            { value: "none", label: "Disabled (No Captcha)" },
          ]}
        />

        {data.captchaProvider === "challenge" && (
          <InputSelectField
            label="Challenge Method"
            value={data.challengeType}
            onValueChange={(val) =>
              onDataChange((prev) => ({
                ...prev,
                challengeType: val as "alphanumeric" | "math",
              }))
            }
            options={[
              { value: "alphanumeric", label: "Alphanumeric Code (SVG)" },
              { value: "math", label: "Arithmetic Calculation" },
            ]}
          />
        )}
      </div>
    </div>
  );
}
