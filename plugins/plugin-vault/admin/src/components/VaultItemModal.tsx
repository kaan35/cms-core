"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  api,
  generateSecurePassword,
  toast,
  useSaveShortcut,
} from "@cms/admin-shell";
import { Eye, EyeOff, KeyRound, Loader2, Save, Sparkles, X } from "lucide-react";
import * as React from "react";

export interface VaultItem {
  id?: string;
  title: string;
  username: string;
  password?: string;
  url: string;
  category: string;
  notes: string;
}

interface VaultItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VaultItem | null;
  onSuccess: () => void;
}

export function VaultItemModal({ open, onOpenChange, item, onSuccess }: VaultItemModalProps) {
  const [inputData, setInputData] = React.useState({
    title: "",
    username: "",
    password: "",
    url: "",
    category: "General",
    notes: "",
  });
  const [formState, setFormState] = React.useState({
    showPassword: false,
    isSubmitting: false,
    isRevealing: false,
  });

  React.useEffect(() => {
    setInputData({
      title: item?.title || "",
      username: item?.username || "",
      password: "",
      url: item?.url || "",
      category: item?.category || "General",
      notes: item?.notes || "",
    });
    setFormState({ showPassword: false, isSubmitting: false, isRevealing: false });
  }, [item, open]);

  const handleGeneratePassword = async () => {
    try {
      const res = await api.post<{ password: string }>("/vault/generate-password", {
        length: 18,
      });
      if (res?.password) {
        setInputData((p) => ({ ...p, password: res.password }));
        setFormState((p) => ({ ...p, showPassword: true }));
        toast.success("Secure password generated!");
        return;
      }
    } catch {
      setInputData((p) => ({ ...p, password: generateSecurePassword(18) }));
      setFormState((p) => ({ ...p, showPassword: true }));
      toast.success("Generated local secure password");
    }
  };

  const handleTogglePassword = async () => {
    if (formState.showPassword) {
      setFormState((p) => ({ ...p, showPassword: false }));
      return;
    }

    if (!inputData.password && item?.id) {
      setFormState((p) => ({ ...p, isRevealing: true }));
      try {
        const res = await api.post<{ password: string }>(`/vault/items/${item.id}/reveal`);
        if (res?.password) {
          setInputData((p) => ({ ...p, password: res.password }));
          setFormState((p) => ({ ...p, showPassword: true }));
          toast.success("Password revealed");
          return;
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to reveal password");
        return;
      } finally {
        setFormState((p) => ({ ...p, isRevealing: false }));
      }
    }

    setFormState((p) => ({ ...p, showPassword: true }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputData.title.trim()) return toast.error("Title is required");
    if (!item && !inputData.password.trim()) {
      return toast.error("Password is required for new items");
    }

    setFormState((p) => ({ ...p, isSubmitting: true }));
    try {
      const payload: Record<string, unknown> = {
        title: inputData.title.trim(),
        username: inputData.username.trim(),
        url: inputData.url.trim(),
        category: inputData.category.trim() || "General",
        notes: inputData.notes.trim(),
      };
      if (inputData.password) payload["password"] = inputData.password;

      if (item?.id) {
        await api.put(`/vault/items/${item.id}`, payload);
        toast.success("Vault credential updated");
      } else {
        await api.post("/vault/items", payload);
        toast.success("Vault credential saved");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save credential");
    } finally {
      setFormState((p) => ({ ...p, isSubmitting: false }));
    }
  };

  useSaveShortcut(() => {
    if (open && !formState.isSubmitting) void handleSubmit();
  }, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {item ? "Edit Vault Credential" : "New Vault Credential"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="vault-title">Title *</Label>
            <Input
              id="vault-title"
              placeholder="e.g. GitHub Account, AWS Production"
              value={inputData.title}
              onChange={(e) => setInputData((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="vault-username">Username / Email</Label>
              <Input
                id="vault-username"
                placeholder="user@example.com"
                value={inputData.username}
                onChange={(e) => setInputData((p) => ({ ...p, username: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vault-category">Category</Label>
              <Input
                id="vault-category"
                placeholder="e.g. Development, Servers"
                value={inputData.category}
                onChange={(e) => setInputData((p) => ({ ...p, category: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="vault-password">
                {item ? "Password (leave blank or reveal to edit)" : "Password *"}
              </Label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
              >
                <Sparkles className="h-3 w-3" /> Generate Secure
              </button>
            </div>
            <div className="relative">
              <Input
                id="vault-password"
                type={formState.showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={inputData.password}
                onChange={(e) => setInputData((p) => ({ ...p, password: e.target.value }))}
                maxLength={500}
                className="pr-10"
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                disabled={formState.isRevealing}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                title={formState.showPassword ? "Hide password" : "Show password"}
              >
                {formState.isRevealing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : formState.showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="vault-url">Website URL</Label>
            <Input
              id="vault-url"
              placeholder="https://..."
              value={inputData.url}
              onChange={(e) => setInputData((p) => ({ ...p, url: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="vault-notes">Notes</Label>
            <Textarea
              id="vault-notes"
              placeholder="Additional security notes, 2FA backup codes, etc."
              rows={3}
              value={inputData.notes}
              onChange={(e) => setInputData((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              iconStart={<X className="size-4" />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={formState.isSubmitting}
              iconStart={<Save className="size-4" />}
              shortcut="save"
            >
              {formState.isSubmitting ? "Saving..." : item ? "Update" : "Save Credential"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
