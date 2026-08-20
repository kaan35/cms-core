"use client";

import {
  Badge,
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
  cn,
  slugify,
  toSnakeCase,
  toast,
} from "@cms/admin-shell";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Layers,
  Pencil,
  Plus,
  ShieldAlert,
  Sliders,
  Trash2,
} from "lucide-react";
import * as React from "react";

export type FormFieldType = "text" | "email" | "textarea" | "number" | "select" | "checkbox";

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string | undefined;
  options?: string[] | undefined;
}

export interface FormDoc {
  id: string;
  title: string;
  slug: string;
  description?: string | undefined;
  fields: FormField[];
  captchaProvider: "none" | "challenge";
  challengeType: "alphanumeric" | "math";
  submitButtonText: string;
  successMessage: string;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface FormBuilderProps {
  initialData?: Partial<FormDoc> | undefined;
  onSave: (data: Omit<FormDoc, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  className?: string | undefined;
}

export function FormBuilder({ initialData, onSave, className }: FormBuilderProps) {
  const [inputData, setInputData] = React.useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    captchaProvider: (initialData?.captchaProvider || "challenge") as "none" | "challenge",
    challengeType: (initialData?.challengeType || "alphanumeric") as "alphanumeric" | "math",
    submitButtonText: initialData?.submitButtonText || "Submit",
    successMessage: initialData?.successMessage || "Thank you for your submission.",
    fields: (Array.isArray(initialData?.fields) && initialData.fields.length > 0
      ? initialData.fields
      : [
          {
            name: "full_name",
            label: "Full Name",
            type: "text" as FormFieldType,
            required: true,
            placeholder: "Jane Doe",
          },
          {
            name: "email",
            label: "Email Address",
            type: "email" as FormFieldType,
            required: true,
            placeholder: "jane@example.com",
          },
          {
            name: "message",
            label: "Message",
            type: "textarea" as FormFieldType,
            required: false,
            placeholder: "How can we help you today?",
          },
        ]) as FormField[],
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(
    Boolean(initialData?.slug),
  );

  // Field Edit Dialog state
  const [editingFieldIndex, setEditingFieldIndex] = React.useState<number | null>(null);
  const [fieldModalOpen, setFieldModalOpen] = React.useState(false);
  const [tempField, setTempField] = React.useState<FormField>({
    name: "",
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    options: [],
  });
  const [rawOptions, setRawOptions] = React.useState("");

  const handleTitleChange = (val: string) => {
    setInputData((prev) => ({
      ...prev,
      title: val,
      slug: isSlugManuallyEdited ? prev.slug : slugify(val),
    }));
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setInputData((prev) => ({
      ...prev,
      slug: slugify(val),
    }));
  };

  // Field management actions
  const handleOpenAddField = () => {
    setEditingFieldIndex(null);
    setTempField({
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      options: [],
    });
    setRawOptions("");
    setFieldModalOpen(true);
  };

  const handleOpenEditField = (index: number) => {
    const f = inputData.fields[index];
    if (!f) return;
    setEditingFieldIndex(index);
    setTempField({ ...f });
    setRawOptions(Array.isArray(f.options) ? f.options.join("\n") : "");
    setFieldModalOpen(true);
  };

  const handleSaveFieldModal = () => {
    if (!tempField.label.trim()) {
      toast.error("Field label is required");
      return;
    }
    const safeName = tempField.name.trim() || toSnakeCase(tempField.label) || "field_" + Date.now();

    const optionsList =
      tempField.type === "select"
        ? rawOptions
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newField: FormField = {
      name: safeName,
      label: tempField.label.trim(),
      type: tempField.type,
      required: tempField.required,
      placeholder: tempField.placeholder?.trim() || undefined,
      options: optionsList,
    };

    setInputData((prev) => {
      if (editingFieldIndex !== null) {
        const next = [...prev.fields];
        next[editingFieldIndex] = newField;
        return { ...prev, fields: next };
      }
      return { ...prev, fields: [...prev.fields, newField] };
    });

    setFieldModalOpen(false);
  };

  const handleRemoveField = (index: number) => {
    setInputData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= inputData.fields.length) return;
    const item = inputData.fields[index];
    const targetItem = inputData.fields[targetIndex];
    if (!item || !targetItem) return;
    setInputData((prev) => {
      const next = [...prev.fields];
      next[index] = targetItem;
      next[targetIndex] = item;
      return { ...prev, fields: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputData.title.trim()) {
      toast.error("Form title is required");
      return;
    }
    if (inputData.fields.length === 0) {
      toast.error("Form must contain at least one input field");
      return;
    }

    await onSave({
      title: inputData.title.trim(),
      slug: inputData.slug.trim() || slugify(inputData.title),
      description: inputData.description.trim() || undefined,
      fields: inputData.fields,
      captchaProvider: inputData.captchaProvider,
      challengeType: inputData.challengeType,
      submitButtonText: inputData.submitButtonText.trim() || "Submit",
      successMessage: inputData.successMessage.trim() || "Thank you for your submission.",
    });
  };

  return (
    <form id="form-builder-form" onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form Settings & Fields (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Metadata Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Layers className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Form Configuration</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="form-title">Form Title *</Label>
                <Input
                  id="form-title"
                  placeholder="e.g. Contact Sales & Inquiries"
                  value={inputData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-slug">URL Slug</Label>
                <Input
                  id="form-slug"
                  placeholder="contact-sales"
                  className="font-mono text-xs"
                  value={inputData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-desc">Form Description (Optional)</Label>
              <Textarea
                id="form-desc"
                rows={2}
                placeholder="Brief helper text displayed above the form fields..."
                value={inputData.description}
                onChange={(e) => setInputData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          {/* Fields Canvas Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Form Fields ({inputData.fields.length})
                </h2>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAddField}
                className="h-8 text-xs gap-1.5 border-dashed"
              >
                <Plus className="size-3.5" />
                Add Field
              </Button>
            </div>

            {inputData.fields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center">
                <p className="text-xs text-muted-foreground">No fields configured yet.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenAddField}
                  className="mt-3 text-xs gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Add First Field
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {inputData.fields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card/60 hover:bg-card hover:border-border transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-muted-foreground cursor-grab">
                        <GripVertical className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground truncate">
                            {field.label}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                            {field.type}
                          </Badge>
                          {field.required && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 px-1.5">
                              Required
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          name: <code className="text-foreground">{field.name}</code>
                          {field.placeholder && (
                            <span className="text-muted-foreground ml-2">
                              • placeholder: "{field.placeholder}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleMoveField(idx, "up")}
                        disabled={idx === 0}
                        title="Move Up"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleMoveField(idx, "down")}
                        disabled={idx === inputData.fields.length - 1}
                        title="Move Down"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleOpenEditField(idx)}
                        title="Edit Field"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveField(idx)}
                        title="Delete Field"
                        className="hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Security, Captcha, Submissions & Save (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Form Actions & Messages
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="submit-text">Submit Button Label</Label>
              <Input
                id="submit-text"
                placeholder="Submit"
                value={inputData.submitButtonText}
                onChange={(e) =>
                  setInputData((prev) => ({ ...prev, submitButtonText: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="success-msg">Success Message</Label>
              <Textarea
                id="success-msg"
                rows={2}
                placeholder="Thank you for your submission."
                value={inputData.successMessage}
                onChange={(e) =>
                  setInputData((prev) => ({ ...prev, successMessage: e.target.value }))
                }
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
                value={inputData.captchaProvider}
                onValueChange={(val) =>
                  setInputData((prev) => ({
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

            {inputData.captchaProvider === "challenge" && (
              <div className="space-y-1.5">
                <Label htmlFor="challenge-type">Challenge Method</Label>
                <Select
                  value={inputData.challengeType}
                  onValueChange={(val) =>
                    setInputData((prev) => ({
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
      </div>

      {/* Field Configuration Dialog */}
      <Dialog open={fieldModalOpen} onOpenChange={setFieldModalOpen}>
        <DialogContent className="sm:max-w-md max-w-md p-6">
          <DialogHeader>
            <DialogTitle>
              {editingFieldIndex !== null ? "Edit Field" : "Add Form Field"}
            </DialogTitle>
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
                value={tempField.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setTempField((prev) => ({
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
                  value={tempField.name}
                  onChange={(e) =>
                    setTempField((prev) => ({
                      ...prev,
                      name: toSnakeCase(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-field-type">Field Type</Label>
                <Select
                  value={tempField.type}
                  onValueChange={(val) =>
                    setTempField((prev) => ({ ...prev, type: val as FormFieldType }))
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
                value={tempField.placeholder || ""}
                onChange={(e) => setTempField((prev) => ({ ...prev, placeholder: e.target.value }))}
              />
            </div>

            {tempField.type === "select" && (
              <div className="space-y-1.5">
                <Label htmlFor="modal-field-options">Select Options (One per line)</Label>
                <Textarea
                  id="modal-field-options"
                  rows={3}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  value={rawOptions}
                  onChange={(e) => setRawOptions(e.target.value)}
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
                checked={tempField.required}
                onCheckedChange={(checked) =>
                  setTempField((prev) => ({ ...prev, required: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFieldModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveFieldModal}
              className="text-xs font-semibold"
            >
              Apply Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
