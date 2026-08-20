"use client";

import { SubmissionsPage } from "@cms/plugin-forms-admin";
import { use } from "react";

export default function FormSubmissionsPageRoute({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  return <SubmissionsPage formId={formId} />;
}
