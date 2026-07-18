"use client";

import { PageForm } from "@/components/forms/PageForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";

export default function PageNewPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Pages", href: "/pages" }, { label: "New Page" }]} />
      <PageHeader title="Create Page" description="Design page structure using modular blocks" />

      <PageForm mode="create" />
    </div>
  );
}
