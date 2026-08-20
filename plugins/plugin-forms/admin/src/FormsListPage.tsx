"use client";

import { PageHeader, StatCard, useApi } from "@cms/admin-shell";
import { ClipboardList, ListChecks, ShieldCheck } from "lucide-react";
import * as React from "react";
import { FormList, type FormListItem } from "./FormList";

export function FormsListPage() {
  const { data: rawData } = useApi<
    { forms: FormListItem[] } | { data: FormListItem[] } | FormListItem[]
  >("/api/forms");

  const forms: FormListItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && "forms" in rawData && Array.isArray(rawData.forms)) return rawData.forms;
    if (rawData && "data" in rawData && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const protectedCount = React.useMemo(() => {
    return forms.filter((f) => f.captchaProvider === "challenge").length;
  }, [forms]);

  const totalFields = React.useMemo(() => {
    return forms.reduce((acc, f) => acc + (f.fields?.length || 0), 0);
  }, [forms]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forms & Submissions"
        description="Build custom input forms, configure captcha challenge protection, and review submissions."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Forms"
          value={forms.length}
          description="Active form definitions"
          icon={ClipboardList}
        />
        <StatCard
          title="Protected Forms"
          value={protectedCount}
          description="Captcha / bot protected"
          icon={ShieldCheck}
        />
        <StatCard
          title="Configured Fields"
          value={totalFields}
          description="Across all form templates"
          icon={ListChecks}
        />
      </div>

      <FormList />
    </div>
  );
}
