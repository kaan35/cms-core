"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useApiMutation } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FieldType = "text" | "email" | "textarea" | "number";

interface FormField {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
];

function emptyField(): FormField {
  return { name: "", type: "text", label: "", placeholder: "", required: true };
}

export default function NewFormPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);

  const { trigger: createForm, isMutating } = useApiMutation({
    path: "/forms",
    method: "POST",
    onSuccess: () => {
      showToast({ message: "Form created successfully", type: "success" });
      router.push("/forms");
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to create form", type: "error" });
    },
  });

  const addField = () => setFields((prev) => [...prev, emptyField()]);

  const removeField = (index: number) => setFields((prev) => prev.filter((_, i) => i !== index));

  const updateField = (index: number, patch: Partial<FormField>) =>
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formId.trim()) {
      showToast({ message: "Form ID is required", type: "warning" });
      return;
    }

    if (!formName.trim()) {
      showToast({ message: "Form name is required", type: "warning" });
      return;
    }

    const names = fields.map((f) => f.name.trim());
    if (names.some((n) => !n)) {
      showToast({ message: "All field names are required", type: "warning" });
      return;
    }
    if (new Set(names).size !== names.length) {
      showToast({ message: "Field names must be unique", type: "warning" });
      return;
    }

    await createForm({
      formId: formId.trim().toLowerCase().replace(/\s+/g, "-"),
      name: formName.trim(),
      fields: fields.map((f) => ({
        ...f,
        name: f.name.trim(),
        label: f.label.trim() || f.name.trim(),
        placeholder: f.placeholder?.trim() || "",
      })),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Form</h1>
          <p className="text-sm text-zinc-400">Design a new custom dynamic form</p>
        </div>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/forms")}>
          Back to Forms
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Settings */}
        <Card title="Form Settings" description="Set general attributes for this form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Form ID (unique key)"
              required
              value={formId}
              onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="e.g. contact-form"
            />
            <Input
              label="Form Name"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Contact Us"
            />
          </div>
        </Card>

        {/* Fields */}
        <Card title="Form Fields" description="Define the inputs that users will fill out">
          <div className="space-y-4">
            {fields.length === 0 && (
              <p className="text-sm text-zinc-500 py-4 text-center">
                No fields defined. Add a field to start building the form.
              </p>
            )}

            {fields.map((field, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_120px_auto_auto] gap-3 items-end p-4 rounded-lg bg-zinc-900/40 border border-white/5"
              >
                <Input
                  label="Field Name (key)"
                  value={field.name}
                  onChange={(e) =>
                    updateField(index, {
                      name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    })
                  }
                  placeholder="e.g. email"
                  required
                />
                <Input
                  label="Label (display)"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="e.g. Email Address"
                />
                <Input
                  label="Placeholder"
                  value={field.placeholder || ""}
                  onChange={(e) => updateField(index, { placeholder: e.target.value })}
                  placeholder="e.g. enter your email"
                />
                <Select
                  label="Type"
                  value={field.type}
                  onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>

                {/* Required toggle */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">Required</label>
                  <button
                    type="button"
                    onClick={() => updateField(index, { required: !field.required })}
                    className={`
                      w-10 h-5 rounded-full transition-colors relative
                      ${field.required ? "bg-violet-600" : "bg-zinc-700"}
                    `}
                  >
                    <span
                      className={`
                        absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                        ${field.required ? "translate-x-5" : "translate-x-0.5"}
                      `}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors self-end"
                  aria-label="Remove field"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <Button type="button" variant="secondary" icon={Plus} onClick={addField}>
              Add Field
            </Button>
          </div>
        </Card>

        {/* Save */}
        <div className="border-t border-white/5 pt-6 flex items-center gap-4">
          <Button type="submit" isLoading={isMutating} icon={Plus}>
            Create Form
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/forms")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
