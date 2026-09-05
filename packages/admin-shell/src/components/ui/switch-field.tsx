"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Label } from "./label";
import { Switch } from "./switch";

export interface InputSwitchFieldProps {
  label: React.ReactNode;
  description?: React.ReactNode | undefined;
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  onCheckedChange?: ((checked: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
  bordered?: boolean | undefined;
  error?: string | undefined;
}

export type SwitchFieldProps = InputSwitchFieldProps;

/**
 * Composite switch field with label, description, and card styling.
 */
export function InputSwitchField({
  label,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  id,
  className,
  bordered = true,
  error,
}: InputSwitchFieldProps) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        bordered && "p-4 rounded-xl border border-border/70 bg-card/40",
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
      <Switch
        id={fieldId}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export const SwitchField = InputSwitchField;
