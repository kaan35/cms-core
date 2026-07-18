"use client";

import { RoleForm } from "@/components/forms/RoleForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";

export default function RoleNewPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Role Templates", href: "/roles" }, { label: "New Role Template" }]}
      />
      <PageHeader
        title="New Role Template"
        description="Define a reusable permission set that can be assigned to users"
      />

      <RoleForm mode="create" />
    </div>
  );
}
