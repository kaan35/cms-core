"use client";

import {
  apiClient,
  Button,
  Checkbox,
  Input,
  Label,
  Skeleton,
  toast,
  useApi,
} from "@cms/admin-shell";
import { ArrowLeft, Save, Shield } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

const ALL_PERMISSIONS: Record<string, string[]> = {
  USERS: ["users:read", "users:write"],
  ROLES: ["roles:read", "roles:write"],
  AUTH: ["auth:settings:write", "auth:revoke-all-sessions"],
  PAGES: ["pages:read", "pages:read:draft", "pages:write", "pages:delete"],
  BLOG: ["blog:read", "blog:read:draft", "blog:write", "blog:delete"],
  FORMS: ["forms:read", "forms:write", "forms:delete"],
  MEDIA: ["media:read", "media:write", "media:delete"],
  SYSTEM: [
    "system:settings:read",
    "system:settings:write",
    "system:plugins:read",
    "system:plugins:write",
    "system:feature-flags:write",
    "system:audit-log:read",
  ],
  BACKUPS: ["backups:read", "backups:write"],
};

const ALL_FLAT_PERMISSIONS = Object.values(ALL_PERMISSIONS).flat();

interface RoleData {
  id?: string;
  _id?: string;
  name?: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
}

export default function RoleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";
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

  const handleSave = async (e: React.SubmitEvent) => {
    e.preventDefault();
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

  if (isLoading && !isNew) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl pb-16">
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
            size="sm"
            iconStart={<ArrowLeft />}
            onClick={() => router.push("/dashboard/roles")}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={formState.isSubmitting}
            iconStart={<Save />}
            className="text-xs h-8"
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
          <div className="space-y-1.5">
            <Label htmlFor="roleName" className="text-xs font-medium">
              Role Identifier <span className="text-destructive">*</span>
            </Label>
            <Input
              id="roleName"
              value={inputData.name}
              onChange={(e) => setInputData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. content_moderator"
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roleDesc" className="text-xs font-medium">
              Description
            </Label>
            <Input
              id="roleDesc"
              value={inputData.description}
              onChange={(e) => setInputData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief summary of permissions..."
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Card 2: Permissions Matrix */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Permissions Matrix</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Granular feature flags and plugin capability assignments
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
            {inputData.permissions.length} active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(ALL_PERMISSIONS).map(([category, perms]) => {
            const allSelected = perms.every((p) => inputData.permissions.includes(p));

            return (
              <div
                key={category}
                className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-xs font-bold tracking-wider text-foreground uppercase">
                    {category}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleGroupSelectAll(category, !allSelected)}
                    className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <div className="space-y-2">
                  {perms.map((perm) => {
                    const isChecked = inputData.permissions.includes(perm);
                    return (
                      <div
                        key={perm}
                        onClick={() => togglePermission(perm)}
                        className={`flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer select-none text-xs transition-colors ${
                          isChecked
                            ? "border-primary/50 bg-primary/10 text-foreground font-medium shadow-2xs"
                            : "border-border/60 bg-card/60 hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <Checkbox
                          id={`role-perm-${perm}`}
                          checked={isChecked}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <span className="font-mono text-xs truncate">{perm}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </form>
  );
}
