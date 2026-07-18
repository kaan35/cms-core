import { cn, cva, type VariantProps } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import React from "react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium cursor-pointer select-none transition duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "md",
      variant: "primary",
    },
    variants: {
      size: {
        default: "px-4 py-2 text-sm",
        icon: "p-2 text-sm",
        lg: "px-6 py-2.5 text-base",
        md: "px-4 py-2 text-sm",
        sm: "px-3 py-1.5 text-xs",
      },
      variant: {
        danger:
          "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
        default:
          "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
        destructive:
          "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        primary:
          "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-accent",
      },
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  isDisabled?: boolean;
  icon?: React.ElementType;
  href?: string;
}

export function Button({
  children,
  className,
  variant,
  size,
  isLoading = false,
  isDisabled = false,
  disabled = false,
  icon: Icon,
  type = "button",
  href,
  onClick,
  ...props
}: ButtonProps) {
  const isButtonDisabled = isDisabled || disabled || isLoading;

  const iconElement = isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  ) : Icon ? (
    <Icon
      className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}
      aria-hidden="true"
    />
  ) : null;

  const resolvedClass = cn(buttonVariants({ size, variant }), className);

  if (href && !isButtonDisabled) {
    return (
      <Link
        href={href}
        className={resolvedClass}
        aria-busy={isLoading ? "true" : undefined}
      >
        {iconElement}
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={isButtonDisabled}
      aria-busy={isLoading ? "true" : undefined}
      className={resolvedClass}
      onClick={onClick}
      {...props}
    >
      {iconElement}
      {children}
    </button>
  );
}
