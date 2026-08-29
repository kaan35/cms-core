"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, useApi, Button, Skeleton, toast } from "@cms/admin-shell";
import { ArrowLeft, Save } from "lucide-react";
import { FormBuilder, type FormDoc } from "./FormBuilder";

export interface FormEditorPageProps {
  id?: string | undefined;
}

export function FormEditorPage({ id }: FormEditorPageProps) {
  const router = useRouter();
  const isNew = !id || id === "new";

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ form: FormDoc } | FormDoc>(isNew ? null : `/api/forms/${id}`);

  const form: FormDoc | null = React.useMemo(() => {
    if (!rawData) return null;
    if ("form" in rawData && rawData.form) return rawData.form;
    return rawData as FormDoc;
  }, [rawData]);

  const [formState, setFormState] = React.useState({
    isSubmitting: false,
  });

  const handleSave = async (formData: Omit<FormDoc, "id" | "createdAt" | "updatedAt">) => {
    setFormState({ isSubmitting: true });
    try {
      if (isNew) {
        const res = await apiClient<{ form: FormDoc }>("/api/forms", {
          method: "POST",
          body: formData,
        });
        toast.success("Form created successfully!");
        if (res?.form?.id) {
          router.push(`/dashboard/forms/${res.form.id}`);
        } else {
          router.push("/dashboard/forms");
        }
      } else {
        await apiClient(`/api/forms/${id}`, {
          method: "PUT",
          body: formData,
        });
        toast.success("Form definition updated successfully!");
        mutate();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save form definition";
      toast.error(msg);
    } finally {
      setFormState({ isSubmitting: false });
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/forms">
            <Button variant="outline" iconStart={<ArrowLeft />}>
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {isNew ? "New Form Definition" : form?.title || "Edit Form"}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isNew
                ? "Define custom form schema, fields, and anti-spam verification"
                : `Endpoint: POST /api/forms/${form?.slug || "..."}/submissions`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="submit"
            form="form-builder-form"
            loading={formState.isSubmitting}
            iconStart={<Save />}
            shortcut="save"
          >
            {formState.isSubmitting ? "Saving..." : isNew ? "Create Form" : "Save Changes"}
          </Button>
        </div>
      </div>

      <FormBuilder initialData={form || undefined} onSave={handleSave} />
    </div>
  );
}
