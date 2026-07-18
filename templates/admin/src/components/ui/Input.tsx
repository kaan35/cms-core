import { cn } from "@/lib/utils";
import React from "react";
import { fieldVariants, FieldWrapper } from "./input-shared";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ComponentType<{ className?: string }>;
}

export function Input({
  className = "",
  label,
  error,
  helperText,
  leftIcon: LeftIcon,
  id,
  type = "text",
  required,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <FieldWrapper
      label={label}
      error={error}
      helperText={helperText}
      htmlFor={inputId}
      required={required}
    >
      {(describedBy) => (
        <div className="relative">
          {LeftIcon && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <LeftIcon className="h-4 w-4" />
            </span>
          )}
          <input
            id={inputId}
            type={type}
            required={required}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className={cn(
              fieldVariants({ error: error ? "true" : "false" }),
              "focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring",
              LeftIcon && "pl-10",
              className,
            )}
            {...props}
          />
        </div>
      )}
    </FieldWrapper>
  );
}
