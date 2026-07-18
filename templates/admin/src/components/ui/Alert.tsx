import { cn, cva, type VariantProps } from "@/lib/utils";
import React from "react";

export const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*:first-child]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive [&>svg]:text-destructive",
        info: "border-info/30 bg-info/10 text-info [&>svg]:text-info",
        success:
          "border-success/30 bg-success/10 text-success [&>svg]:text-success",
        warning:
          "border-warning/30 bg-warning/10 text-warning [&>svg]:text-warning",
      },
    },
  },
);

export interface AlertProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  const role = variant === "destructive" ? "alert" : "status";
  return (
    <div
      role={role}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn(
        "mb-1 font-medium leading-none tracking-tight text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn(
        "text-xs [&_p]:leading-relaxed leading-normal text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
