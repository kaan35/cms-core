"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { Loader2 } from "lucide-react";
import { UserForm } from "@/components/UserForm";
import { Loading } from "@/components/ui/Loading";

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const rolesData = await apiFetch("/auth/roles");
        const mappedRoles: RoleTemplate[] =
          rolesData.roles?.map((r: any) => ({
            id: r._id?.toString() || r.id,
            name: r.name,
            permissions: r.permissions || [],
          })) || [];
        setRoles(mappedRoles);

        const userData = await apiFetch(`/auth/users/${userId}`);
        setUser(userData.user);
        setIsLoading(false);
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 404) {
          showToast({ message: "User not found", type: "error" });
        } else if (err instanceof ApiError && err.status === 400) {
          showToast({ message: err.message || "Invalid user ID", type: "error" });
        } else {
          showToast({ message: "Failed to load user", type: "error" });
          console.error("Failed to load user:", err);
        }
        // Redirect after showing error
        router.push("/users");
      }
    }

    loadData();
  }, [userId, router, showToast]);

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  if (!user) return null;

  const matchedTemplate = findMatchingTemplate(roles, user.permissions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage User: {user.email}</h1>
        <p className="text-sm text-zinc-400">
          Configure role templates and granular access control.
        </p>
      </div>

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
