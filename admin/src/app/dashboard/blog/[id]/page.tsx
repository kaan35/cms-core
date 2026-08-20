"use client";

import { BlogEditorPage } from "@cms/plugin-blog-admin";
import { use } from "react";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BlogEditorPage id={id} />;
}
