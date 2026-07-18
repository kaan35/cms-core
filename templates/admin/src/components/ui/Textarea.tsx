import { cn } from "@/lib/utils";
import React from "react";
import { fieldVariants, FieldWrapper } from "./input-shared";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  className = "",
  label,
  error,
  helperText,
  id,
  rows = 4,
  required,
  ...props
}: TextareaProps) {
  const generatedId = React.useId();
  const textareaId = id || generatedId;

  return (
    <FieldWrapper
      label={label}
      error={error}
      helperText={helperText}
      htmlFor={textareaId}
      required={required}
    >
      {(describedBy) => (
        <textarea
          id={textareaId}
          rows={rows}
          required={required}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn(
            fieldVariants({ error: error ? "true" : "false" }),
            "resize-y focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring",
            className,
          )}
          {...props}
        />
      )}
    </FieldWrapper>
  );
}
