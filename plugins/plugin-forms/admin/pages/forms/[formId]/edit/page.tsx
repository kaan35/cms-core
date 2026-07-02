"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { Select } from "@/components/ui/Select";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function FormEditPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.formId as string;
  const { showToast } = useToast();

  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);

  const { data, isLoading } = useApiQuery<{ form: any }>(`/forms/${formId}`);

  useEffect(() => {
    if (data?.form) {
      setFormName(data.form.name);
      setFields(data.form.fields || []);
    }
  }, [data]);

  const { trigger: updateForm, isMutating } = useApiMutation({
    path: `/forms/${formId}`,
    method: "PUT",
    onSuccess: () => {
      showToast({ message: "Form updated successfully", type: "success" });
      router.push(`/forms/${formId}`);
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to update form", type: "error" });
    },
  });

  const addField = () => setFields((prev) => [...prev, emptyField()]);

  const removeField = (index: number) => setFields((prev) => prev.filter((_, i) => i !== index));

  const updateField = (index: number, patch: Partial<FormField>) =>
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate field names are unique and non-empty
    const names = fields.map((f) => f.name.trim());
    if (names.some((n) => !n)) {
      showToast({ message: "All field names are required", type: "warning" });
      return;
    }
    if (new Set(names).size !== names.length) {
      showToast({ message: "Field names must be unique", type: "warning" });
      return;
    }

    await updateForm({
      name: formName.trim(),
      fields: fields.map((f) => ({
        ...f,
        name: f.name.trim(),
        label: f.label.trim() || f.name.trim(),
        placeholder: f.placeholder?.trim() || "",
      })),
    });
  };

  if (isLoading) return <Loading isFullScreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Form</h1>
          <p className="text-sm text-zinc-400">
            Form ID: <span className="font-mono text-zinc-300">{formId}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/forms")}>
            Back to Forms
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/forms/${formId}`)}>
            View Submissions
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Settings */}
        <Card title="Form Settings" description="Update the display name of this form">
          <Input
            label="Form Name"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Contact Us"
          />
        </Card>

        {/* Fields */}
        <Card
          title="Form Fields"
          description="Add, remove, or reorder the fields users will fill out"
        >
          <div className="space-y-4">
            {fields.length === 0 && (
              <p className="text-sm text-zinc-500 py-4 text-center">
                No fields yet. Add one below.
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
          <Button type="submit" isLoading={isMutating} icon={Save}>
            Save Changes
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push(`/forms/${formId}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
