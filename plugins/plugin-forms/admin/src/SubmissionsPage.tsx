"use client";

import { Button, Skeleton, useApi } from "@cms/admin-shell";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { FormListItem } from "./FormList";
import { FormSubmissionsTable } from "./FormSubmissionsTable";

export function SubmissionsPage({ formId }: { formId: string }) {
  const { data: rawData, isLoading } = useApi<{ form?: FormListItem } | FormListItem>(
    `/api/forms/${formId}`,
  );

  const form: FormListItem | null = React.useMemo(() => {
    if (!rawData) return null;
    return "form" in rawData && rawData.form ? rawData.form : (rawData as FormListItem);
  }, [rawData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/forms">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              title="Back to forms list"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {form ? `${form.title} — Submissions` : "Form Submissions"}
              </h1>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {form ? (
                <span>
                  Public endpoint:{" "}
                  <code className="text-primary font-mono bg-muted/60 px-1 py-0.5 rounded text-[11px]">
                    /forms/{form.slug}
                  </code>
                </span>
              ) : (
                "Review incoming form entries and export to Excel or CSV"
              )}
            </p>
          </div>
        </div>

        {form && (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/forms/${form.id}`}>
              <Button variant="outline" size="sm" iconStart={<Pencil />}>
                Edit Form
              </Button>
            </Link>
          </div>
        )}
      </div>

      <FormSubmissionsTable formId={formId} formTitle={form?.title} />
    </div>
  );
}
