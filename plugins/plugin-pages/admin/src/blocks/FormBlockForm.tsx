"use client";

import { InputSelectField, Skeleton, useApi } from "@cms/admin-shell";
import { ClipboardList } from "lucide-react";
import * as React from "react";

export interface FormBlockData {
  type: "form";
  formId: string;
}

export interface FormBlockFormProps {
  data: FormBlockData;
  onChange: (data: FormBlockData) => void;
}

interface FormItem {
  id: string;
  title: string;
  slug: string;
}

export function FormBlockForm({ data, onChange }: FormBlockFormProps) {
  const { data: rawForms, isLoading } = useApi<
    { forms: FormItem[] } | { data: FormItem[] } | FormItem[]
  >("/api/forms");

  const forms: FormItem[] = React.useMemo(() => {
    if (Array.isArray(rawForms)) return rawForms;
    if (rawForms && "forms" in rawForms && Array.isArray(rawForms.forms)) return rawForms.forms;
    if (rawForms && "data" in rawForms && Array.isArray(rawForms.data)) return rawForms.data;
    return [];
  }, [rawForms]);

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : forms.length === 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Select Embedded Form *</p>
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            <span>No forms found in system. Please create a form in the Forms manager first.</span>
          </div>
        </div>
      ) : (
        <InputSelectField
          label="Select Embedded Form"
          required
          hint="Renders the interactive form widget with client-side validation and captcha handling."
          placeholder="Choose a form..."
          value={data.formId || ""}
          onValueChange={(val) => {
            if (val) onChange({ ...data, formId: val });
          }}
          options={forms.map((f) => ({
            value: f.id,
            label: `${f.title} (${f.slug})`,
          }))}
        />
      )}
    </div>
  );
}
