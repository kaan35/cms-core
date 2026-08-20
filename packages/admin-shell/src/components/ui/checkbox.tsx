"use client";

import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function Checkbox({
  id,
  checked = false,
  onCheckedChange,
  className,
  disabled = false,
}: CheckboxProps) {
  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled && onCheckedChange) {
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        "peer inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer",
        checked
          ? "border-primary bg-primary text-white shadow-2xs"
          : "border-border/80 bg-muted/40 hover:bg-muted/80 text-transparent",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <Check
        className={cn(
          "size-3 stroke-[3] transition-transform",
          checked ? "opacity-100 scale-100" : "opacity-0 scale-75",
        )}
      />
    </button>
  );
}
