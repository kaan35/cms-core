"use client";

import {
  apiClient,
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
  useApi,
  useSaveShortcut,
} from "@cms/admin-shell";
import { ArrowLeft, Lock, Mail, Save, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
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

const DEFAULT_ROLE_TEMPLATES: Record<string, string[]> = {
  admin: [...ALL_FLAT_PERMISSIONS],
  editor: [
    "pages:read",
    "pages:read:draft",
    "pages:write",
    "blog:read",
    "blog:read:draft",
    "blog:write",
    "forms:read",
    "forms:write",
    "media:read",
    "media:write",
  ],
  user: ["pages:read", "blog:read"],
};

export function UserPermissionsEditor({ userId }: { userId: string }) {
  const router = useRouter();
  const isNew = userId === "new";

  const {
    data: rawUserData,
    isLoading: isUserLoading,
    mutate: mutateUser,
  } = useApi<{
    user?: {
      id: string;
      email: string;
      name?: string;
      role: string;
      permissions?: string[];
    };
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    permissions?: string[];
  }>(isNew ? null : `/api/users/${userId}`);

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

  const [formState, setFormState] = React.useState({
    isSubmitting: false,
  });

  React.useEffect(() => {
    if (userData && !isNew) {
      const isSuperAdmin =
        userData.role === "admin" ||
        userData.permissions?.includes("*") ||
        (Array.isArray(userData.permissions) && userData.permissions.includes("*"));

      let initialPerms: string[] = [];
      if (isSuperAdmin) {
        initialPerms = [...ALL_FLAT_PERMISSIONS];
      } else if (userData.permissions && userData.permissions.length > 0) {
        initialPerms = userData.permissions;
      } else if (userData.role) {
        const matched = rolesData.find((r) => r.name === userData.role);
        if (matched) {
          initialPerms = matched.permissions.includes("*")
            ? [...ALL_FLAT_PERMISSIONS]
            : [...matched.permissions];
        } else if (DEFAULT_ROLE_TEMPLATES[userData.role]) {
          initialPerms = [...(DEFAULT_ROLE_TEMPLATES[userData.role] || [])];
        }
      }

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

    setFormState({ isSubmitting: true });

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
      setFormState({ isSubmitting: false });
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
      {/* Top Header Bar with Standardized Action Buttons */}
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
          <Button
            type="submit"
            loading={formState.isSubmitting}
            iconStart={<Save />}
            shortcut="save"
          >
            {isNew ? "Create User" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Card 1: User Credentials & Profile */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
        <div className="pb-3 border-b border-border/60">
          <h2 className="text-sm font-semibold text-foreground">Account Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Basic identity and authentication credentials
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              iconStart={<Mail />}
              value={inputData.email}
              onChange={(e) => setInputData((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              iconStart={<User />}
              value={inputData.name}
              onChange={(e) => setInputData((prev) => ({ ...prev, name: e.target.value }))}
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">
              Password{" "}
              {isNew ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground font-normal">
                  (Leave blank to keep unchanged)
                </span>
              )}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={isNew ? "Enter secure password" : "••••••••"}
              iconStart={<Lock />}
              value={inputData.password}
              onChange={(e) => setInputData((prev) => ({ ...prev, password: e.target.value }))}
              required={isNew}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs font-medium">
              Role Template
            </Label>
            <Select
              value={inputData.role}
              onValueChange={(val) => {
                if (val) handleRoleTemplateChange(val);
              }}
            >
              <SelectTrigger id="role" className="w-full text-xs">
                <SelectValue placeholder="Select a role template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="user">User</SelectItem>
                {rolesData
                  ?.filter((r) => !["admin", "editor", "user"].includes(r.name))
                  .map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Card 2: Permissions Matrix */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Granular Permissions</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select specific capabilities granted to this user
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
            {inputData.permissions.length} selected
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
                          id={`perm-${perm}`}
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
