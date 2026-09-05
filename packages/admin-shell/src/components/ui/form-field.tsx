"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Input, type InputProps } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
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

export interface InputTextareaFieldProps extends TextareaProps {
  label?: string | undefined;
  required?: boolean | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  containerClassName?: string | undefined;
}

export type TextareaFieldProps = InputTextareaFieldProps;

/**
 * All-in-one textarea field with auto-generated id, label, hint, and error handling.
 */
export function InputTextareaField({
  label,
  required,
  hint,
  error,
  containerClassName,
  id,
  className,
  ...textareaProps
}: InputTextareaFieldProps) {
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

export const TextareaField = InputTextareaField;

export interface InputSelectFieldOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode | undefined;
  disabled?: boolean | undefined;
}

export type SelectFieldOption = InputSelectFieldOption;

export interface InputSelectFieldProps {
  label?: string | undefined;
  required?: boolean | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  placeholder?: string | undefined;
  iconStart?: React.ReactNode | undefined;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  options?: InputSelectFieldOption[] | undefined;
  children?: React.ReactNode | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
  containerClassName?: string | undefined;
}

export type SelectFieldProps = InputSelectFieldProps;

/**
 * All-in-one select field with auto-generated id, label, icon, options mapping, and error handling.
 */
export function InputSelectField({
  label,
  required,
  hint,
  error,
  placeholder,
  iconStart,
  value,
  defaultValue,
  onValueChange,
  options,
  children,
  disabled,
  id,
  className,
  containerClassName,
}: InputSelectFieldProps) {
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
      <Select
        value={value}
        defaultValue={defaultValue}
        onValueChange={(val) => {
          if (val !== null && onValueChange) {
            onValueChange(val);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger id={fieldId} className={className}>
          {iconStart && (
            <span className="text-muted-foreground shrink-0 [&>svg]:size-3.5 mr-1.5">
              {iconStart}
            </span>
          )}
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options
            ? options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.icon ? (
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 [&>svg]:size-3.5 text-primary">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </div>
                  ) : (
                    opt.label
                  )}
                </SelectItem>
              ))
            : children}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export const SelectField = InputSelectField;
