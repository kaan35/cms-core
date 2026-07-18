"use client";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { ArrowLeft, Check, ClipboardList, Plus, Save, Trash2 } from "lucide-react";
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
      <Breadcrumb
        items={[
          { label: "Forms & Submissions", href: "/forms" },
          { label: formName || "Form", href: `/forms/${formId}` },
          { label: "Edit Form" },
        ]}
      />

      <PageHeader
        title="Edit Form"
        description={`Form ID: ${formId}`}
        actions={
          <>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/forms")}>
              Back to Forms
            </Button>
            <Button
              variant="secondary"
              icon={ClipboardList}
              onClick={() => router.push(`/forms/${formId}`)}
            >
              View Submissions
            </Button>
          </>
        }
      />

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
              <EmptyState icon={ClipboardList} title="No fields yet" description="Add one below." />
            )}

            {fields.map((field, index) => (
              <div
                key={index}
                className="p-5 rounded-lg bg-muted/40 border border-border space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="w-44">
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
                    </div>

                    <label className="flex items-center gap-2.5 mt-6 cursor-pointer group select-none">
                      <span
                        className={`flex-shrink-0 h-4 w-4 rounded-sm border flex items-center justify-center transition-colors ${
                          field.required
                            ? "bg-primary border-primary"
                            : "bg-background border-border group-hover:border-muted-foreground"
                        }`}
                      >
                        {field.required && <Check className="h-3 w-3 text-primary-foreground" />}
                      </span>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={() => updateField(index, { required: !field.required })}
                        className="sr-only"
                      />
                      <span className="text-xs font-semibold text-muted-foreground">Required</span>
                    </label>
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => removeField(index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="secondary" icon={Plus} onClick={addField}>
              Add Field
            </Button>
          </div>
        </Card>

        {/* Save */}
        <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 bg-background/95 backdrop-blur-sm border-t border-border flex items-center gap-4">
          <Button type="submit" isLoading={isMutating} icon={Save}>
            Save Changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => router.push(`/forms/${formId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
