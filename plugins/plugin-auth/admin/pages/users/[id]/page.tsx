"use client";

import { UserForm } from "@/components/forms/UserForm";
import { Loading } from "@/components/ui/Loading";
import { useApiQuery } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";

interface RoleTemplate {
  id: string;
  name: string;
  permissions: string[];
}

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

function findMatchingTemplate(roles: RoleTemplate[], permissions: string[]) {
  const sorted = [...permissions].sort();
  return roles.find((r) => {
    const tmpl = [...r.permissions].sort();
    return tmpl.length === sorted.length && tmpl.every((p, i) => p === sorted[i]);
  });
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<RoleTemplate[]>([]);

  const { data: rolesData, isLoading: rolesLoading } = useApiQuery<any>("/auth/roles");
  const {
    data: userData,
    error: userError,
    isLoading: userLoading,
  } = useApiQuery<any>(`/auth/users/${userId}`);

  useEffect(() => {
    if (rolesData?.roles) {
      const mappedRoles: RoleTemplate[] =
        rolesData.roles.map((r: any) => ({
          id: r._id?.toString() || r.id,
          name: r.name,
          permissions: r.permissions || [],
        })) || [];
      setRoles(mappedRoles);
    }
  }, [rolesData]);

  useEffect(() => {
    if (userData?.user) {
      setUser(userData.user);
    }
  }, [userData]);

  useEffect(() => {
    if (userError) {
      if (userError instanceof ApiError && userError.status === 404) {
        showToast({ message: "User not found", type: "error" });
      } else if (userError instanceof ApiError && userError.status === 400) {
        showToast({ message: userError.message || "Invalid user ID", type: "error" });
      } else {
        showToast({ message: "Failed to load user", type: "error" });
      }
      router.push("/users");
    }
  }, [userError, router, showToast]);

  const isLoading = rolesLoading || userLoading;

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  if (!user) return null;

  const matchedTemplate = findMatchingTemplate(roles, user.permissions);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Users & RBAC", href: "/users" }, { label: user.email || "Edit User" }]}
      />
      <PageHeader
        title="Manage User"
        description="Configure role templates and granular access control."
      />

      <UserForm
        mode="update"
        userId={user.id}
        initialEmail={user.email}
        initialSelectedTemplate={matchedTemplate?.id ?? ""}
        initialPermissions={user.permissions}
        roles={roles}
      />
    </div>
  );
}
