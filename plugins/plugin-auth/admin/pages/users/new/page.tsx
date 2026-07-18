"use client";

import { UserForm } from "@/components/forms/UserForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiQuery } from "@/hooks/useApi";
import { useEffect, useState } from "react";

interface RoleTemplate {
  id: string;
  name: string;
  permissions: string[];
}

export default function UserNewPage() {
  const [roles, setRoles] = useState<RoleTemplate[]>([]);

  const { data: rolesData, isLoading } = useApiQuery<any>("/auth/roles");

  useEffect(() => {
    if (rolesData?.roles) {
      setRoles(
        rolesData.roles.map((r: any) => ({
          id: r._id?.toString() || r.id,
          name: r.name,
          permissions: r.permissions || [],
        })),
      );
    }
  }, [rolesData]);

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Users & RBAC", href: "/users" }, { label: "New User" }]} />
      <PageHeader
        title="New User"
        description="Create a new user account with custom permissions"
      />

      <UserForm mode="create" roles={roles} />
    </div>
  );
}
