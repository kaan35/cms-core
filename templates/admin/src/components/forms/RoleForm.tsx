"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useApiMutation } from "@/hooks/useApi";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { useToast } from "@/lib/toast";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PermissionGroup } from "./PermissionGroup";

interface RoleFormProps {
  mode: "create" | "update";
  roleId?: string;
  initialData?: {
    name: string;
    description: string;
    permissions: string[];
  };
}

export function RoleForm({ mode, roleId, initialData }: RoleFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    description: initialData?.description || "",
    name: initialData?.name || "",
    permissions: initialData?.permissions || [],
  });

  const { trigger: saveRole, isMutating } = useApiMutation({
    method: mode === "create" ? "POST" : "PUT",
    onError: (err: Error) => {
      showToast({
        message: err.message || "Failed to save role",
        type: "error",
      });
    },
    onSuccess: () => {
      showToast({
        message: `Role ${mode === "create" ? "created" : "updated"} successfully`,
        type: "success",
      });
      router.push("/roles");
      router.refresh();
    },
    path: mode === "create" ? "/auth/roles" : `/auth/roles/${roleId}`,
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
    if (!formData.name) {
      showToast({ message: "Role name is required", type: "warning" });
      return;
    }

    await saveRole(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card
        title="Role Identity"
        description="Name and describe this permission template"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Role Name"
            required
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g. Content Editor"
          />
          <Input
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="e.g. Can create and edit content"
          />
        </div>
      </Card>

      <Card
        title="Permission Set"
        description="Select permissions that belong to this role template"
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
          {mode === "create" ? "Create Role" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => router.push("/roles")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
