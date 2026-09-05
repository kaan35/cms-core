"use client";

import { Button, Checkbox } from "@cms/admin-shell";
import { Shield } from "lucide-react";
import { ALL_PERMISSIONS } from "../../constants/permissions";

interface PermissionMatrixCardProps {
  permissions: string[];
  onTogglePermission: (permission: string) => void;
  onGroupSelectAll: (category: string, select: boolean) => void;
}

export function PermissionMatrixCard({
  permissions,
  onTogglePermission,
  onGroupSelectAll,
}: PermissionMatrixCardProps) {
  return (
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
          {permissions.length} selected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(ALL_PERMISSIONS).map(([category, perms]) => {
          const allSelected = perms.every((p) => permissions.includes(p));

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
                  onClick={() => onGroupSelectAll(category, !allSelected)}
                  className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="space-y-2">
                {perms.map((perm) => {
                  const isChecked = permissions.includes(perm);
                  return (
                    <div
                      key={perm}
                      onClick={() => onTogglePermission(perm)}
                      className={`flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer select-none text-xs transition-colors ${
                        isChecked
                          ? "border-primary/50 bg-primary/10 text-foreground font-medium shadow-2xs"
                          : "border-border/60 bg-card/60 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <Checkbox
                        id={`perm-${perm}`}
                        checked={isChecked}
                        onCheckedChange={() => onTogglePermission(perm)}
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
  );
}
