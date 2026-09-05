"use client";

import { apiClient, Button, Skeleton, toast, useApi, useSaveShortcut } from "@cms/admin-shell";
import { ArrowLeft, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  ALL_FLAT_PERMISSIONS,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_TEMPLATES,
} from "../constants/permissions";
import { PermissionMatrixCard } from "./permissions/PermissionMatrixCard";
import { computeInitialPermissions, type UserDetailResponse } from "./permissions/permissionsUtils";
import { UserProfileCard } from "./permissions/UserProfileCard";

export function UserPermissionsEditor({ userId }: { userId: string }) {
  const router = useRouter();
  const isNew = userId === "new";

  const {
    data: rawUserData,
    isLoading: isUserLoading,
    mutate: mutateUser,
  } = useApi<UserDetailResponse>(isNew ? null : `/api/users/${userId}`);

  const { data: rawRolesData, isLoading: isRolesLoading } = useApi<
    | { roles: Array<{ id: string; name: string; permissions: string[] }> }
    | Array<{ id: string; name: string; permissions: string[] }>
  >("/api/roles");

  const rolesData = Array.isArray(rawRolesData)
    ? rawRolesData
    : Array.isArray(rawRolesData?.roles)
      ? rawRolesData.roles
      : [];

  const userData = rawUserData?.user || (rawUserData?.id ? rawUserData : undefined);

  const [inputData, setInputData] = React.useState({
    email: "",
    name: "",
    password: "",
    role: "user",
    permissions: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (userData && !isNew) {
      const initialPerms = computeInitialPermissions(userData, rolesData);
      setInputData({
        email: userData.email || "",
        name: userData.name || "",
        password: "",
        role: userData.role || "user",
        permissions: initialPerms,
      });
    }
  }, [userData, rolesData, isNew]);

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
    const groupPerms = ALL_PERMISSIONS[category] || [];
    setInputData((prev) => {
      const withoutGroup = prev.permissions.filter((p) => !groupPerms.includes(p));
      return {
        ...prev,
        permissions: selectAll ? [...withoutGroup, ...groupPerms] : withoutGroup,
      };
    });
  };

  const handleRoleTemplateChange = (roleName: string) => {
    let perms: string[] = [];
    const matched = rolesData.find((r) => r.name === roleName);
    if (matched) {
      perms = matched.permissions.includes("*")
        ? [...ALL_FLAT_PERMISSIONS]
        : [...matched.permissions];
    } else if (DEFAULT_ROLE_TEMPLATES[roleName]) {
      perms = [...(DEFAULT_ROLE_TEMPLATES[roleName] || [])];
    }

    setInputData((prev) => ({
      ...prev,
      role: roleName,
      permissions: perms,
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!inputData.email.trim()) {
      toast.error("Email address is required");
      return;
    }

    if (isNew && !inputData.password.trim()) {
      toast.error("Password is required for new user");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isNew) {
        await apiClient("/api/users", {
          method: "POST",
          body: {
            email: inputData.email,
            name: inputData.name || undefined,
            password: inputData.password,
            role: inputData.role,
            permissions: inputData.permissions,
          },
        });
        toast.success("User created successfully!");
        router.push("/dashboard/users");
      } else {
        const payload: Record<string, unknown> = {
          email: inputData.email,
          name: inputData.name,
          role: inputData.role,
          permissions: inputData.permissions,
        };
        if (inputData.password && inputData.password.trim().length > 0) {
          payload["password"] = inputData.password;
        }

        await apiClient(`/api/users/${userId}`, {
          method: "PUT",
          body: payload,
        });
        toast.success("User updated successfully!");
        mutateUser();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save user";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  useSaveShortcut(() => handleSave());

  const isLoading = (!isNew && isUserLoading) || isRolesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <User className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isNew ? "Create New User" : "Edit User"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure user credentials, role template, and granular permission matrices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            iconStart={<ArrowLeft />}
            onClick={() => router.push("/dashboard/users")}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} iconStart={<Save />} shortcut="save">
            {isNew ? "Create User" : "Save Changes"}
          </Button>
        </div>
      </div>

      <UserProfileCard
        isNew={isNew}
        email={inputData.email}
        name={inputData.name}
        password={inputData.password}
        role={inputData.role}
        rolesData={rolesData}
        onEmailChange={(email) => setInputData((prev) => ({ ...prev, email }))}
        onNameChange={(name) => setInputData((prev) => ({ ...prev, name }))}
        onPasswordChange={(password) => setInputData((prev) => ({ ...prev, password }))}
        onRoleChange={handleRoleTemplateChange}
      />

      <PermissionMatrixCard
        permissions={inputData.permissions}
        onTogglePermission={togglePermission}
        onGroupSelectAll={handleGroupSelectAll}
      />
    </form>
  );
}
