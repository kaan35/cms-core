"use client";

import {
  apiClient,
  Button,
  InputField,
  Skeleton,
  toast,
  useApi,
  useSaveShortcut,
} from "@cms/admin-shell";
import { ArrowLeft, Save, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ALL_FLAT_PERMISSIONS, ALL_PERMISSIONS } from "../constants/permissions";
import { PermissionMatrixCard } from "./permissions/PermissionMatrixCard";

interface RoleData {
  id?: string;
  _id?: string;
  name?: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
}

export function RoleEditor({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === "new";

  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ role: RoleData } | RoleData>(isNew ? null : `/api/roles/${id}`);

  const role = rawData && ("role" in rawData ? rawData.role : rawData);

  const [inputData, setInputData] = React.useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  const [formState, setFormState] = React.useState({
    isSubmitting: false,
  });

  React.useEffect(() => {
    if (role) {
      const isSuperAdmin = role.permissions?.includes("*");
      setInputData({
        name: role.name || "",
        description: role.description || "",
        permissions: isSuperAdmin
          ? ALL_FLAT_PERMISSIONS
          : Array.isArray(role.permissions)
            ? role.permissions
            : [],
      });
    }
  }, [role]);

  const togglePermission = (perm: string) => {
    setInputData((prev) => {
      const exists = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== perm)
          : [...prev.permissions, perm],
      };
    });
  };

  const handleGroupSelectAll = (category: string, selectAll: boolean) => {
    const groupPerms = ALL_PERMISSIONS[category as keyof typeof ALL_PERMISSIONS] || [];
    setInputData((prev) => {
      const withoutGroup = prev.permissions.filter((p) => !groupPerms.includes(p));
      return {
        ...prev,
        permissions: selectAll ? [...withoutGroup, ...groupPerms] : withoutGroup,
      };
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputData.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    setFormState({ isSubmitting: true });
    try {
      if (isNew) {
        await apiClient("/api/roles", {
          method: "POST",
          body: inputData,
        });
        toast.success("Role template created successfully!");
        router.push("/dashboard/roles");
      } else {
        const targetId = role?.id || role?._id || id;
        await apiClient(`/api/roles/${targetId}`, {
          method: "PUT",
          body: inputData,
        });
        toast.success("Role template updated successfully!");
        mutate();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save role";
      toast.error(msg);
    } finally {
      setFormState({ isSubmitting: false });
    }
  };

  useSaveShortcut(() => handleSave());

  if (isLoading && !isNew) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-16">
      {/* Top Header Bar with Standardized Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-2xs">
            <Shield className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isNew ? "Create Role Template" : "Edit Role Template"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure permission profile and capability matrices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            iconStart={<ArrowLeft />}
            onClick={() => router.push("/dashboard/roles")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={formState.isSubmitting}
            iconStart={<Save />}
            shortcut="save"
          >
            {isNew ? "Create Role" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Card 1: Role Properties */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
        <div className="pb-3 border-b border-border/60">
          <h2 className="text-sm font-semibold text-foreground">Role Definition</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Basic metadata and descriptive label
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Role Identifier"
            value={inputData.name}
            onChange={(e) => setInputData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. content_moderator"
            className="text-xs"
            required
          />

          <InputField
            label="Description"
            value={inputData.description}
            onChange={(e) => setInputData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Brief summary of permissions..."
            className="text-xs"
          />
        </div>
      </div>

      {/* Card 2: Permissions Matrix */}
      <PermissionMatrixCard
        permissions={inputData.permissions}
        onTogglePermission={togglePermission}
        onGroupSelectAll={handleGroupSelectAll}
      />
    </form>
  );
}
