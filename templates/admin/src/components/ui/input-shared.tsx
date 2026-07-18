import { cva, type VariantProps } from "@/lib/utils";
import React from "react";

/**
 * Shared visual language for every text-like form control (Input, Select,
 * Textarea). Centralized here so the three components never drift apart.
 */
export const fieldVariants = cva(
  "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition duration-150 placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed aria-invalid:border-destructive/60 aria-invalid:bg-destructive/5 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/50",
  {
    defaultVariants: {
      error: "false",
    },
    variants: {
      error: {
        false: "border-border",
        true: "border-destructive/60 bg-destructive/5 focus:border-destructive focus:ring-destructive/50",
      },
    },
  },
);

export type FieldVariantProps = VariantProps<typeof fieldVariants>;

export const fieldLabelClasses =
  "block text-xs font-semibold text-muted-foreground pl-0.5";
export const fieldHelperClasses = "text-xs text-muted-foreground pl-0.5";
export const fieldErrorClasses = "text-xs font-medium text-destructive pl-0.5";

export interface FieldWrapperProps {
  label?: string;
  error?: string;
  helperText?: string;
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: (describedBy?: string) => React.ReactNode;
}

export function FieldWrapper({
  label,
  error,
  helperText,
  htmlFor,
  required,
  className = "w-full space-y-2",
  children,
}: FieldWrapperProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const helperId = helperText ? `${htmlFor}-helper` : undefined;

  const describedBy =
    [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className={fieldLabelClasses}>
          {label}
          {required && (
            <span className="text-destructive ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children(describedBy)}
      {error ? (
        <p id={errorId} className={fieldErrorClasses}>
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className={fieldHelperClasses}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
