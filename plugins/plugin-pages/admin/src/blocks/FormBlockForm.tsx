"use client";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useApi,
} from "@cms/admin-shell";
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
      <div className="space-y-1.5">
        <Label htmlFor="form-select">Select Embedded Form *</Label>
        {isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : forms.length === 0 ? (
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            <span>No forms found in system. Please create a form in the Forms manager first.</span>
          </div>
        ) : (
          <Select
            value={data.formId || ""}
            onValueChange={(val) => {
              if (val) onChange({ ...data, formId: val });
            }}
          >
            <SelectTrigger id="form-select">
              <SelectValue placeholder="Choose a form..." />
            </SelectTrigger>
            <SelectContent>
              {forms.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.title} ({f.slug})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-[11px] text-muted-foreground">
          Renders the interactive form widget with client-side validation and captcha handling.
        </p>
      </div>
    </div>
  );
}
