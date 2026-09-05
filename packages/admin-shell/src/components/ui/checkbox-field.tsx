"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

export interface InputCheckboxFieldProps {
  label: React.ReactNode;
  description?: React.ReactNode | undefined;
  checked?: boolean | undefined;
  onCheckedChange?: ((checked: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
  bordered?: boolean | undefined;
  error?: string | undefined;
}

/**
 * Standardized Checkbox field with label, description, and optional card container.
 * Follows the Input*Field naming convention.
 */
export function InputCheckboxField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  bordered = false,
  error,
}: InputCheckboxFieldProps) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;

  if (bordered) {
    return (
      <div
        className={cn(
          "flex items-start justify-between gap-4 p-4 rounded-xl border border-border/70 bg-card/40",
          className,
        )}
      >
        <div className="space-y-0.5 select-none">
          <Label
            htmlFor={fieldId}
            className="text-xs font-semibold text-foreground block cursor-pointer"
          >
            {label}
          </Label>
          {description && (
            <p className="text-[11px] text-muted-foreground leading-normal">{description}</p>
          )}
          {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
        </div>
        <Checkbox
          id={fieldId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2 select-none">
        <Checkbox
          id={fieldId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
        <Label
          htmlFor={fieldId}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          {label}
        </Label>
      </div>
      {description && (
        <p className="text-[11px] text-muted-foreground leading-normal pl-6">{description}</p>
      )}
      {error && <p className="text-[11px] text-destructive font-medium pl-6">{error}</p>}
    </div>
  );
}
