"use client";

import { PageEditorPage } from "@cms/plugin-pages-admin";
import { use } from "react";

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PageEditorPage id={id} />;
}
