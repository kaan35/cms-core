import { cn } from "@/lib/utils";
import React from "react";
import { fieldLabelClasses } from "./input-shared";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label className={cn(fieldLabelClasses, className)} {...props}>
      {children}
      {required && (
        <span className="text-destructive ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
