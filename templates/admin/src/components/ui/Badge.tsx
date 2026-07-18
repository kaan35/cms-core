import { cva, type VariantProps } from "@/lib/utils";
import React from "react";

export const badgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap transition duration-150",
  {
    defaultVariants: {
      variant: "neutral",
    },
    variants: {
      variant: {
        danger: "bg-destructive/10 text-destructive border-destructive/25",
        default:
          "bg-primary text-primary-foreground border-transparent hover:bg-primary/80",
        destructive:
          "bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/80",
        info: "bg-info/10 text-info border-info/25",
        neutral: "bg-muted text-muted-foreground border-border",
        outline: "text-foreground border-border",
        secondary:
          "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80",
        success: "bg-success/10 text-success border-success/25",
        warning: "bg-warning/10 text-warning border-warning/25",
      },
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={badgeVariants({ className, variant })} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || "";

  const variantMap: Record<string, BadgeProps["variant"]> = {
    active: "success",
    disabled: "neutral",
    draft: "neutral",
    enabled: "success",
    error: "danger",
    failed: "danger",
    inactive: "neutral",
    published: "success",
  };

  const variant = variantMap[normalized] || "info";

  return <Badge variant={variant}>{status}</Badge>;
}
