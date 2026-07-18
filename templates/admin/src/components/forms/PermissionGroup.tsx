"use client";

import { Button } from "@/components/ui/Button";
import { Check, Minus, Zap } from "lucide-react";

type PermState = "override" | "removed" | undefined;

interface PermissionGroupProps {
  group: string;
  permissions: string[];
  selected: string[];
  onTogglePermission: (perm: string) => void;
  onToggleGroup: (perms: string[]) => void;
  /**
   * Optional per-permission visual state, used by UserForm to highlight where
   * a user's permissions diverge from the role template they applied.
   */
  getState?: (perm: string, isChecked: boolean) => PermState;
}

/** Read/write/delete-style suffix gets a subtle color hint, e.g. "blog:delete" reads as more destructive than "blog:read". */
function actionTint(perm: string) {
  const action = perm.split(":")[1];
  if (action === "delete") return "text-destructive/80";
  if (action === "write") return "text-warning/80";
  return "";
}

/**
 * One collapsible-free permission group: header (name + select-all toggle)
 * plus a checkbox grid. Shared between RoleForm and UserForm, which
 * previously hand-rolled nearly identical ~90-line blocks each.
 */
export function PermissionGroup({
  group,
  permissions,
  selected,
  onTogglePermission,
  onToggleGroup,
  getState,
}: PermissionGroupProps) {
  const allSelected = permissions.every((p) => selected.includes(p));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">
          {group}
        </span>
        <Button
          type="button"
          size="sm"
          variant={allSelected ? "primary" : "ghost"}
          onClick={() => onToggleGroup(permissions)}
        >
          {allSelected ? "Deselect All" : "Select All"}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
        {permissions.map((perm) => {
          const isChecked = selected.includes(perm);
          const state = getState?.(perm, isChecked);

          const checkboxClasses = `
            flex-shrink-0 h-4 w-4 rounded-sm border flex items-center justify-center transition-colors
            ${
              isChecked
                ? state === "override"
                  ? "bg-warning border-warning"
                  : "bg-primary border-primary"
                : state === "removed"
                  ? "bg-muted border-destructive/50"
                  : "bg-muted border-border group-hover:border-muted-foreground/50"
            }
          `
            .replace(/\s+/g, " ")
            .trim();

          const textClasses = `
            text-xs font-mono truncate transition-colors
            ${
              isChecked
                ? state === "override"
                  ? "text-warning"
                  : "text-foreground"
                : state === "removed"
                  ? "text-destructive/70"
                  : `text-muted-foreground group-hover:text-foreground/70 ${actionTint(perm)}`
            }
          `
            .replace(/\s+/g, " ")
            .trim();

          return (
            <label
              key={perm}
              className="flex items-center gap-2.5 py-1 cursor-pointer group select-none"
            >
              <span className={checkboxClasses}>
                {isChecked && (
                  <Check
                    className="h-3 w-3 text-primary-foreground"
                    strokeWidth={3}
                  />
                )}
              </span>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onTogglePermission(perm)}
                className="sr-only"
              />
              <span className={textClasses}>{perm}</span>
              {state === "override" && (
                <span title="Extra beyond template" className="shrink-0">
                  <Zap className="h-3 w-3 text-warning" />
                </span>
              )}
              {state === "removed" && (
                <span title="Removed from template" className="shrink-0">
                  <Minus className="h-3 w-3 text-destructive" />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
