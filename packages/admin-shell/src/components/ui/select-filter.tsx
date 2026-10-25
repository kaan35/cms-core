"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

export interface SelectFilterOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SelectFilterProps<T extends string = string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SelectFilterOption<T>[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export function SelectFilter<T extends string = string>({
  value,
  onValueChange,
  options,
  placeholder,
  className = "w-40 h-8 text-xs",
  ariaLabel,
}: SelectFilterProps<T>) {
  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val !== null && val !== undefined) {
          onValueChange(val as T);
        }
      }}
    >
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder}>
          {(val: unknown) => {
            const opt = options.find((o) => o.value === val);
            return opt ? opt.label : (placeholder ?? "");
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
