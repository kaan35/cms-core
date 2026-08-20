"use client";

import { FormEditorPage } from "@cms/plugin-forms-admin";
import { use } from "react";

export default function FormEditorPageRoute({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  return <FormEditorPage id={formId} />;
}
