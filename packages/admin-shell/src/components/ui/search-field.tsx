"use client";

import { Search, X } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { FormField } from "./form-field";
import { Input, type InputProps } from "./input";

export interface InputSearchFieldProps extends Omit<InputProps, "value" | "onChange"> {
  value: string;
  onSearchChange: (value: string) => void;
  onChange?: ((e: React.ChangeEvent<HTMLInputElement>) => void) | undefined;
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  containerClassName?: string | undefined;
}

/**
 * Standardized search field with search icon, clear button, and optional form label/hint.
 */
export function InputSearchField({
  value,
  onSearchChange,
  onChange,
  label,
  hint,
  error,
  placeholder = "Search...",
  className,
  containerClassName,
  id,
  ...props
}: InputSearchFieldProps) {
  const generatedId = React.useId();
  const fieldId = id || (label ? generatedId : undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
    onChange?.(e);
  };

  const handleClear = () => {
    onSearchChange("");
  };

  const searchElement = (
    <div className={cn("relative flex-1 max-w-sm", !label && containerClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        id={fieldId}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("pl-9 pr-8 text-xs", className)}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-0.5"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );

  if (label || hint || error) {
    return (
      <FormField
        label={label}
        htmlFor={fieldId}
        hint={hint}
        error={error}
        className={containerClassName}
      >
        {searchElement}
      </FormField>
    );
  }

  return searchElement;
}
