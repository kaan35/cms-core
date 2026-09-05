"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InputField,
  InputSelectField,
  InputSwitchField,
  InputTextareaField,
  toSnakeCase,
} from "@cms/admin-shell";
import * as React from "react";
import type { FormField, FormFieldType } from "./useFormBuilder";

interface FormFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FormField;
  onFieldChange: React.Dispatch<React.SetStateAction<FormField>>;
  rawOptions: string;
  onRawOptionsChange: (val: string) => void;
  isEditing: boolean;
  onSave: () => void;
}

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Single-line Text" },
  { value: "email", label: "Email Address" },
  { value: "textarea", label: "Multi-line Textarea" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown Select" },
  { value: "checkbox", label: "Checkbox (Boolean)" },
];

export function FormFieldDialog({
  open,
  onOpenChange,
  field,
  onFieldChange,
  rawOptions,
  onRawOptionsChange,
  isEditing,
  onSave,
}: FormFieldDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-card border-border/80 shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Field" : "Add Form Field"}</DialogTitle>
          <DialogDescription className="text-xs">
            Configure field label, input type, and validation rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <InputField
            label="Field Label"
            placeholder="e.g. Phone Number"
            value={field.label}
            onChange={(e) => {
              const val = e.target.value;
              onFieldChange((prev) => ({
                ...prev,
                label: val,
                name: prev.name || toSnakeCase(val),
              }));
            }}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Identifier Key"
              placeholder="phone_number"
              className="font-mono text-xs"
              value={field.name}
              onChange={(e) =>
                onFieldChange((prev) => ({
                  ...prev,
                  name: toSnakeCase(e.target.value),
                }))
              }
              required
            />

            <InputSelectField
              label="Field Type"
              value={field.type}
              onValueChange={(val) =>
                onFieldChange((prev) => ({ ...prev, type: val as FormFieldType }))
              }
              options={FIELD_TYPE_OPTIONS}
            />
          </div>

          <InputField
            label="Placeholder (Optional)"
            placeholder="Enter placeholder text..."
            value={field.placeholder || ""}
            onChange={(e) => onFieldChange((prev) => ({ ...prev, placeholder: e.target.value }))}
          />

          {field.type === "select" && (
            <InputTextareaField
              label="Select Options (One per line)"
              rows={3}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
              value={rawOptions}
              onChange={(e) => onRawOptionsChange(e.target.value)}
            />
          )}

          <InputSwitchField
            label="Required Field"
            description="User cannot submit the form without filling this field."
            checked={field.required}
            onCheckedChange={(checked) => onFieldChange((prev) => ({ ...prev, required: checked }))}
            className="p-3 bg-muted/20 border-border/80"
          />
        </div>

        <DialogFooter className="border-t border-border/60 pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            Apply Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
