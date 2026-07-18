"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useApiMutation } from "@/hooks/useApi";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { useToast } from "@/lib/toast";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PermissionGroup } from "./PermissionGroup";

interface RoleTemplate {
  id: string;
  name: string;
  permissions: string[];
}

interface UserFormProps {
  mode: "create" | "update";
  userId?: string;
  initialEmail?: string;
  initialSelectedTemplate?: string;
  initialPermissions?: string[];
  roles: RoleTemplate[];
}

export function UserForm({
  mode,
  userId,
  initialEmail = "",
  initialSelectedTemplate = "",
  initialPermissions = [],
  roles,
}: UserFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    email: initialEmail,
    password: "",
    permissions: initialPermissions,
    selectedTemplate: initialSelectedTemplate,
  });

  const { trigger: saveUser, isMutating } = useApiMutation({
    method: mode === "create" ? "POST" : "PUT",
    onError: (err: Error) => {
      showToast({
        message: err.message || "Failed to save user",
        type: "error",
      });
    },
    onSuccess: () => {
      showToast({
        message: `User ${mode === "create" ? "created" : "updated"} successfully`,
        type: "success",
      });
      router.push("/users");
      router.refresh();
    },
    path: mode === "create" ? "/auth/users" : `/auth/users/${userId}`,
  });

  const templatePerms =
    roles.find((r) => r.id === formData.selectedTemplate)?.permissions || [];
  const overridePerms = formData.permissions.filter(
    (p) => !templatePerms.includes(p),
  );
  const removedPerms = templatePerms.filter(
    (p) => !formData.permissions.includes(p),
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = roles.find((r) => r.id === templateId);
    setFormData((prev) => ({
      ...prev,
      permissions: tmpl ? tmpl.permissions : [],
      selectedTemplate: templateId,
    }));
  };

  const togglePermission = (perm: string) => {
    setFormData((prev) => {
      const isChecked = prev.permissions.includes(perm);
      const newPerms = isChecked
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm];
      return { ...prev, permissions: newPerms };
    });
  };

  const toggleGroup = (perms: string[]) => {
    setFormData((prev) => {
      const allSelected = perms.every((p) => prev.permissions.includes(p));
      const newPerms = allSelected
        ? prev.permissions.filter((p) => !perms.includes(p))
        : Array.from(new Set([...prev.permissions, ...perms]));
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create" && !formData.password) {
      showToast({ message: "Password is required", type: "warning" });
      return;
    }

    const payload =
      mode === "create"
        ? {
            email: formData.email,
            password: formData.password,
            permissions: formData.permissions,
          }
        : {
            permissions: formData.permissions,
          };

    await saveUser(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card
        title="User Credentials"
        description="Specify account credentials and access policies"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mode === "create" ? (
            <>
              <Input
                name="email"
                type="email"
                required
                label="Email Address"
                value={formData.email}
                onChange={handleChange}
                placeholder="user@domain.com"
              />
              <Input
                name="password"
                type="password"
                required
                label="Password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
              />
            </>
          ) : (
            <div className="md:col-span-2 rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Account
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="text-foreground font-medium">
                    {formData.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Active Permissions</dt>
                  <dd className="text-foreground font-medium">
                    {formData.permissions.length} policies
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Role Template"
        description="Apply a template to auto-populate permissions."
      >
        <div className="space-y-4">
          <Select
            label="Apply Role Template"
            value={formData.selectedTemplate}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            <option value="">— No template (manual) —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.permissions.length} permissions)
              </option>
            ))}
          </Select>

          {formData.selectedTemplate && (
            <div className="flex flex-wrap gap-2 mt-3">
              {overridePerms.length > 0 && (
                <Badge variant="warning">
                  {overridePerms.length} extra permission
                  {overridePerms.length !== 1 ? "s" : ""} added
                </Badge>
              )}
              {removedPerms.length > 0 && (
                <Badge variant="danger">
                  {removedPerms.length} template permission
                  {removedPerms.length !== 1 ? "s" : ""} removed
                </Badge>
              )}
              {overridePerms.length === 0 && removedPerms.length === 0 && (
                <Badge variant="success">Matches template exactly</Badge>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Permission Set"
        description="Fine-tune individual access policies"
      >
        <div className="space-y-6">
          {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
            <PermissionGroup
              key={group}
              group={group}
              permissions={perms}
              selected={formData.permissions}
              onTogglePermission={togglePermission}
              onToggleGroup={toggleGroup}
              getState={(perm, isChecked) => {
                if (!formData.selectedTemplate) return undefined;
                const fromTemplate = templatePerms.includes(perm);
                if (isChecked && !fromTemplate) return "override";
                if (!isChecked && fromTemplate) return "removed";
                return undefined;
              }}
            />
          ))}
        </div>

        <div className="pt-4 mt-6 border-t border-border text-xs text-muted-foreground">
          {formData.permissions.length} permission
          {formData.permissions.length !== 1 ? "s" : ""} selected
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 bg-background/95 backdrop-blur-sm border-t border-border flex items-center gap-4">
        <Button
          type="submit"
          isLoading={isMutating}
          icon={mode === "create" ? Plus : Save}
        >
          {mode === "create" ? "Create Account" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => router.push("/users")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
