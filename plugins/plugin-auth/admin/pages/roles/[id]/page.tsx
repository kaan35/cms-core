"use client";

import { RoleForm } from "@/components/forms/RoleForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiQuery } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RoleEditPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const roleId = params.id as string;

  const [roleData, setRoleData] = useState<{
    name: string;
    description: string;
    permissions: string[];
  } | null>(null);

  const { data, error, isLoading } = useApiQuery<any>(`/auth/roles/${roleId}`);

  useEffect(() => {
    if (data?.role) {
      const role = data.role;
      setRoleData({
        name: role.name,
        description: role.description || "",
        permissions: role.permissions || [],
      });
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      if (error instanceof ApiError && error.status === 404) {
        showToast({ message: "Role not found", type: "error" });
      } else if (error instanceof ApiError && error.status === 400) {
        showToast({ message: error.message || "Invalid role ID", type: "error" });
      } else {
        showToast({ message: "Failed to load role", type: "error" });
      }
      router.push("/roles");
    }
  }, [error, router, showToast]);

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  if (!roleData) return null;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Role Templates", href: "/roles" },
          { label: roleData.name || "Edit Role" },
        ]}
      />
      <PageHeader
        title="Edit Role"
        description="Update permission template and role configuration"
      />

      <RoleForm mode="update" roleId={roleId} initialData={roleData} />
    </div>
  );
}
