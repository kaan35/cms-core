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

        <div className="space-y-1.5">
          <Label htmlFor="submit-text">Submit Button Label</Label>
          <Input
            id="submit-text"
            placeholder="Submit"
            value={data.submitButtonText}
            onChange={(e) =>
              onDataChange((prev) => ({ ...prev, submitButtonText: e.target.value }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="success-msg">Success Message</Label>
          <Textarea
            id="success-msg"
            rows={2}
            placeholder="Thank you for your submission."
            value={data.successMessage}
            onChange={(e) => onDataChange((prev) => ({ ...prev, successMessage: e.target.value }))}
          />
        </div>
      </div>

      {/* Captcha & Bot Protection Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bot Protection
          </h3>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="captcha-provider">Captcha Provider</Label>
          <Select
            value={data.captchaProvider}
            onValueChange={(val) =>
              onDataChange((prev) => ({
                ...prev,
                captchaProvider: val as "none" | "challenge",
              }))
            }
          >
            <SelectTrigger id="captcha-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="challenge">Interactive Challenge</SelectItem>
              <SelectItem value="none">Disabled (No Captcha)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.captchaProvider === "challenge" && (
          <div className="space-y-1.5">
            <Label htmlFor="challenge-type">Challenge Method</Label>
            <Select
              value={data.challengeType}
              onValueChange={(val) =>
                onDataChange((prev) => ({
                  ...prev,
                  challengeType: val as "alphanumeric" | "math",
                }))
              }
            >
              <SelectTrigger id="challenge-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphanumeric">Alphanumeric Code (SVG)</SelectItem>
                <SelectItem value="math">Arithmetic Calculation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
