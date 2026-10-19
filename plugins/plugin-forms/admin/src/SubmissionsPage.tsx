"use client";

import { Button, PageHeader, StatCard, useApi } from "@cms/admin-shell";
import { ArrowLeft, Inbox, ListChecks, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { FormListItem } from "./FormList";
import { FormSubmissionsTable } from "./FormSubmissionsTable";

export function SubmissionsPage({ formId }: { formId: string }) {
  const { data: rawData } = useApi<{ form?: FormListItem } | FormListItem>(`/api/forms/${formId}`);

  const form: FormListItem | null = React.useMemo(() => {
    if (!rawData) return null;
    return "form" in rawData && rawData.form ? rawData.form : (rawData as FormListItem);
  }, [rawData]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <PageHeader
        title={form ? `${form.title} — Submissions` : "Form Submissions"}
        description={
          form
            ? `Review responses received via public endpoint /forms/${form.slug}`
            : "Review incoming form entries and export to Excel or CSV"
        }
        icon={Inbox}
        action={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/forms">
              <Button variant="outline" size="sm" iconStart={<ArrowLeft className="size-4" />}>
                All Forms
              </Button>
            </Link>
            {form && (
              <Link href={`/dashboard/forms/${form.id}`}>
                <Button variant="outline" size="sm" iconStart={<Pencil className="size-4" />}>
                  Edit Form
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Submissions"
          value={form?.submissionCount ?? 0}
          description="Received form responses"
          icon={Inbox}
        />
        <StatCard
          title="Form Fields"
          value={form?.fields?.length ?? 0}
          description="Configured input fields"
          icon={ListChecks}
        />
        <StatCard
          title="Bot Protection"
          value={form?.captchaProvider === "challenge" ? "Protected" : "Standard"}
          description={
            form?.captchaProvider === "challenge"
              ? "Captcha challenge active"
              : "Standard submission"
          }
          icon={ShieldCheck}
        />
      </div>

      <FormSubmissionsTable formId={formId} formTitle={form?.title} />
    </div>
  );
}
