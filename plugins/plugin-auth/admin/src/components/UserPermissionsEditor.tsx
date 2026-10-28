"use client";

import {
  api,
  Button,
  cn,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  useApi,
  useSaveShortcut,
} from "@cms/admin-shell";
import { ArrowLeft, Laptop, Save, ShieldCheck, User } from "lucide-react";
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
import { UserSessionsCard } from "./permissions/UserSessionsCard";

export function UserPermissionsEditor({ userId }: { userId: string }) {
  const router = useRouter();
  const isNew = userId === "new";

  const {
    data: rawUserData,
    isLoading: isUserLoading,
    mutate: mutateUser,
  } = useApi<UserDetailResponse>(isNew ? null : `/users/${userId}`);

  const { data: rawRolesData, isLoading: isRolesLoading } = useApi<
    | { roles: Array<{ id: string; name: string; permissions: string[] }> }
    | Array<{ id: string; name: string; permissions: string[] }>
  >("/roles");

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
    status: "active" as "active" | "suspended",
    permissions: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (userData && !isNew) {
      const initialPerms = computeInitialPermissions(userData, rolesData);
      const userRole =
        userData.role ||
        userData.roles?.[0]?.name ||
        rolesData.find((r) => userData.roleIds?.includes(r.id))?.name ||
        (userData.permissions?.includes("*") ? "admin" : "user");

      setInputData({
        email: userData.email || "",
        name: userData.name || "",
        password: "",
        role: userRole,
        status: (userData.status as "active" | "suspended") || "active",
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

    const finalPermissions =
      inputData.permissions.length === ALL_FLAT_PERMISSIONS.length ? ["*"] : inputData.permissions;

    const targetRole = rolesData.find((r) => r.name === inputData.role || r.id === inputData.role);
    const roleId = targetRole ? targetRole.id : inputData.role;

    try {
      if (isNew) {
        await api.post("/users", {
          email: inputData.email,
          name: inputData.name || undefined,
          password: inputData.password,
          role: inputData.role,
          roleIds: [roleId],
          status: inputData.status,
          permissions: finalPermissions,
        });
        toast.success("User created successfully!");
        router.push("/dashboard/users");
      } else {
        const payload: Record<string, unknown> = {
          email: inputData.email,
          name: inputData.name,
          role: inputData.role,
          roleIds: [roleId],
          status: inputData.status,
          permissions: finalPermissions,
        };
        if (inputData.password && inputData.password.trim().length > 0) {
          payload["password"] = inputData.password;
        }

        await api.put(`/users/${userId}`, payload);
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

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList
          className={cn("grid w-full p-1", isNew ? "max-w-xs grid-cols-2" : "max-w-md grid-cols-3")}
        >
          <TabsTrigger value="profile" className="flex items-center gap-2 px-3.5 py-1.5 text-xs">
            <User className="size-3.5" />
            Profile & Role
          </TabsTrigger>
          <TabsTrigger
            value="permissions"
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs"
          >
            <ShieldCheck className="size-3.5" />
            Permissions
          </TabsTrigger>
          {!isNew && (
            <TabsTrigger value="sessions" className="flex items-center gap-2 px-3.5 py-1.5 text-xs">
              <Laptop className="size-3.5" />
              Devices & Sessions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6 focus-visible:outline-none">
          <UserProfileCard
            isNew={isNew}
            email={inputData.email}
            name={inputData.name}
            password={inputData.password}
            role={inputData.role}
            status={inputData.status}
            rolesData={rolesData}
            onEmailChange={(email) => setInputData((prev) => ({ ...prev, email }))}
            onNameChange={(name) => setInputData((prev) => ({ ...prev, name }))}
            onPasswordChange={(password) => setInputData((prev) => ({ ...prev, password }))}
            onRoleChange={handleRoleTemplateChange}
            onStatusChange={(status) => setInputData((prev) => ({ ...prev, status }))}
          />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6 focus-visible:outline-none">
          <PermissionMatrixCard
            permissions={inputData.permissions}
            onTogglePermission={togglePermission}
            onGroupSelectAll={handleGroupSelectAll}
          />
        </TabsContent>

        {!isNew && (
          <TabsContent value="sessions" className="space-y-6 focus-visible:outline-none">
            <UserSessionsCard userId={userId} userEmail={inputData.email} />
          </TabsContent>
        )}
      </Tabs>
    </form>
  );
}
