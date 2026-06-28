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
    name: initialData?.name || "",
    description: initialData?.description || "",
    permissions: initialData?.permissions || [],
  });

  const { trigger: saveRole, isMutating } = useApiMutation({
    path: mode === "create" ? "/auth/roles" : `/auth/roles/${roleId}`,
    method: mode === "create" ? "POST" : "PUT",
    onSuccess: () => {
      showToast({
        message: `Role ${mode === "create" ? "created" : "updated"} successfully`,
        type: "success",
      });
      router.push("/roles");
      router.refresh();
    },
    onError: (err: Error) => {
      showToast({ message: err.message || "Failed to save role", type: "error" });
    },
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
      <Card title="Role Identity" description="Name and describe this permission template">
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
          {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
            const allSelected = perms.every((p) => formData.permissions.includes(p));
            const someSelected = perms.some((p) => formData.permissions.includes(p));
            return (
              <div key={group}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-wider text-zinc-300">{group}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={allSelected ? "primary" : "ghost"}
                    onClick={() => toggleGroup(perms)}
                  >
                    {allSelected ? "Deselect All" : someSelected ? "Select All" : "Select All"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {perms.map((perm) => {
                    const checked = formData.permissions.includes(perm);
                    const action = perm.split(":")[1];
                    return (
                      <label
                        key={perm}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition select-none ${
                          checked
                            ? "bg-blue-600/15 border-blue-500/30 text-blue-300"
                            : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(perm)}
                          className="rounded border-white/10 bg-zinc-950 text-blue-600 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span
                          className={`capitalize ${
                            action === "delete"
                              ? "text-red-400/70"
                              : action === "write"
                                ? "text-amber-400/70"
                                : ""
                          }`}
                        >
                          {perm}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-white/5 text-xs text-zinc-500">
          {formData.permissions.length} permission
          {formData.permissions.length !== 1 ? "s" : ""} selected
        </div>
      </Card>

      <div className="flex gap-4 border-t border-white/5 pt-6">
        <Button type="submit" isLoading={isMutating} icon={mode === "create" ? Plus : Save}>
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
