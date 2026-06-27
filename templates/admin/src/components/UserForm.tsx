"use client";

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
    selectedTemplate: initialSelectedTemplate,
    permissions: initialPermissions,
  });

  const { trigger: saveUser, isMutating } = useApiMutation({
    path: mode === "create" ? "/auth/users" : `/auth/users/${userId}`,
    method: mode === "create" ? "POST" : "PUT",
    onSuccess: () => {
      showToast({
        message: `User ${mode === "create" ? "created" : "updated"} successfully`,
        type: "success",
      });
      router.push("/users");
      router.refresh();
    },
    onError: (err: any) => {
      showToast({ message: err.message || "Failed to save user", type: "error" });
    },
  });

  const templatePerms = roles.find((r) => r.id === formData.selectedTemplate)?.permissions || [];
  const overridePerms = formData.permissions.filter((p) => !templatePerms.includes(p));
  const removedPerms = templatePerms.filter((p) => !formData.permissions.includes(p));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = roles.find((r) => r.id === templateId);
    setFormData((prev) => ({
      ...prev,
      selectedTemplate: templateId,
      permissions: tmpl ? tmpl.permissions : [],
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
      <Card title="User Credentials" description="Specify account credentials and access policies">
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
            <div className="md:col-span-2 rounded-lg border border-white/5 bg-zinc-950/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                Account
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-zinc-500">Email</dt>
                  <dd className="text-white font-medium">{formData.email}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Active Permissions</dt>
                  <dd className="text-white font-medium">{formData.permissions.length} policies</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Role Template"
        description="Apply a template to auto-populate permissions. You can still customise below."
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
            <div className="flex flex-wrap gap-2">
              {overridePerms.length > 0 && (
                <div className="text-xs text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                  ⚡ {overridePerms.length} extra permission{overridePerms.length !== 1 ? "s" : ""}{" "}
                  added
                </div>
              )}
              {removedPerms.length > 0 && (
                <div className="text-xs text-red-400 flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
                  ✕ {removedPerms.length} template permission{removedPerms.length !== 1 ? "s" : ""}{" "}
                  removed
                </div>
              )}
              {overridePerms.length === 0 && removedPerms.length === 0 && (
                <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  ✓ Matches template exactly
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card title="Permission Set" description="Fine-tune individual access policies">
        <div className="space-y-6">
          {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
            const allSelected = perms.every((p) => formData.permissions.includes(p));
            return (
              <div key={group}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    {group}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(perms)}
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded transition cursor-pointer ${
                      allSelected
                        ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {perms.map((perm) => {
                    const isChecked = formData.permissions.includes(perm);
                    const fromTemplate = templatePerms.includes(perm);
                    const isOverride = isChecked && !fromTemplate && !!formData.selectedTemplate;
                    const isRemoved = !isChecked && fromTemplate && !!formData.selectedTemplate;
                    const action = perm.split(":")[1];
                    return (
                      <label
                        key={perm}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition select-none ${
                          isChecked
                            ? isOverride
                              ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                              : "bg-blue-600/15 border-blue-500/30 text-blue-300"
                            : isRemoved
                              ? "bg-red-500/5 border-red-500/20 text-red-400/70"
                              : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
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
                        {isOverride && (
                          <span
                            title="Extra beyond template"
                            className="text-[10px] text-amber-400"
                          >
                            ⚡
                          </span>
                        )}
                        {isRemoved && (
                          <span title="Removed from template" className="text-[10px] text-red-400">
                            ✕
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 mt-6 border-t border-white/5 text-xs text-zinc-500">
          {formData.permissions.length} permission{formData.permissions.length !== 1 ? "s" : ""}{" "}
          selected
        </div>
      </Card>

      <div className="flex gap-4 pt-2 border-t border-white/5">
        <Button type="submit" isLoading={isMutating} icon={mode === "create" ? Plus : Save}>
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
