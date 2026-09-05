"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Input, type InputProps } from "./input";
import { Label } from "./label";
import { Textarea, type TextareaProps } from "./textarea";

export interface FormFieldProps extends React.ComponentProps<"div"> {
  label?: string | undefined;
  htmlFor?: string | undefined;
  required?: boolean | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}

/**
 * Generic FormField wrapper for custom inputs (Select, MediaPicker, Switch, etc.)
 */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {label && (
        <div className="flex items-center justify-between">
          <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {hint && !error && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        </div>
      )}
      {children}
      {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
    </div>
  );
}

export interface InputFieldProps extends InputProps {
  label?: string | undefined;
  required?: boolean | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  containerClassName?: string | undefined;
}

/**
 * All-in-one text input field with auto-generated id, label, hint, and error handling.
 */
export function InputField({
  label,
  required,
  hint,
  error,
  containerClassName,
  id,
  className,
  ...inputProps
}: InputFieldProps) {
  const generatedId = React.useId();
  const fieldId = id || (label ? generatedId : undefined);

  return (
    <FormField
      label={label}
      htmlFor={fieldId}
      required={required}
      hint={hint}
      error={error}
      className={containerClassName}
    >
      <Input id={fieldId} required={required} className={className} {...inputProps} />
    </FormField>
  );
}

export interface TextareaFieldProps extends TextareaProps {
  label?: string | undefined;
  required?: boolean | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  containerClassName?: string | undefined;
}

/**
 * All-in-one textarea field with auto-generated id, label, hint, and error handling.
 */
export function TextareaField({
  label,
  required,
  hint,
  error,
  containerClassName,
  id,
  className,
  ...textareaProps
}: TextareaFieldProps) {
  const generatedId = React.useId();
  const fieldId = id || (label ? generatedId : undefined);

  return (
    <FormField
      label={label}
      htmlFor={fieldId}
      required={required}
      hint={hint}
      error={error}
      className={containerClassName}
    >
      <Textarea id={fieldId} required={required} className={className} {...textareaProps} />
    </FormField>
  );
}
