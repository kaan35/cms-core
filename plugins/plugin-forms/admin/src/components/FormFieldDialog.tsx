"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  toSnakeCase,
} from "@cms/admin-shell";
import * as React from "react";
import type { FormField, FormFieldType } from "./useFormBuilder";

interface FormFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  field: FormField;
  onFieldChange: React.Dispatch<React.SetStateAction<FormField>>;
  rawOptions: string;
  onRawOptionsChange: (val: string) => void;
  onSave: () => void;
}

export function FormFieldDialog({
  open,
  onOpenChange,
  isEditing,
  field,
  onFieldChange,
  rawOptions,
  onRawOptionsChange,
  onSave,
}: FormFieldDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-md p-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Field" : "Add Form Field"}</DialogTitle>
          <DialogDescription className="text-xs">
            Configure field label, input type, and validation rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="modal-field-label">Field Label *</Label>
            <Input
              id="modal-field-label"
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
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="modal-field-name">Identifier Key *</Label>
              <Input
                id="modal-field-name"
                placeholder="phone_number"
                className="font-mono text-xs"
                value={field.name}
                onChange={(e) =>
                  onFieldChange((prev) => ({
                    ...prev,
                    name: toSnakeCase(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modal-field-type">Field Type</Label>
              <Select
                value={field.type}
                onValueChange={(val) =>
                  onFieldChange((prev) => ({ ...prev, type: val as FormFieldType }))
                }
              >
                <SelectTrigger id="modal-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Single-line Text</SelectItem>
                  <SelectItem value="email">Email Address</SelectItem>
                  <SelectItem value="textarea">Multi-line Textarea</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="select">Dropdown Select</SelectItem>
                  <SelectItem value="checkbox">Checkbox (Boolean)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="modal-field-placeholder">Placeholder (Optional)</Label>
            <Input
              id="modal-field-placeholder"
              placeholder="Enter placeholder text..."
              value={field.placeholder || ""}
              onChange={(e) => onFieldChange((prev) => ({ ...prev, placeholder: e.target.value }))}
            />
          </div>

          {field.type === "select" && (
            <div className="space-y-1.5">
              <Label htmlFor="modal-field-options">Select Options (One per line)</Label>
              <Textarea
                id="modal-field-options"
                rows={3}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                value={rawOptions}
                onChange={(e) => onRawOptionsChange(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-3">
            <div>
              <Label className="text-xs font-semibold">Required Field</Label>
              <p className="text-[11px] text-muted-foreground">
                User cannot submit the form without filling this field.
              </p>
            </div>
            <Switch
              checked={field.required}
              onCheckedChange={(checked) =>
                onFieldChange((prev) => ({ ...prev, required: checked }))
              }
            />
          </div>
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
