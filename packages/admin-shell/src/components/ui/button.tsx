import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { resolveShortcut, type ShortcutParam } from "../../hooks/useShortcut";
import { cn } from "../../lib/utils";
import { Kbd } from "./kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs",
        outline:
          "border-border bg-card text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-border dark:bg-card dark:hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-3 text-xs font-medium [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-2.5 text-xs font-medium [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-7 gap-1 rounded-md px-2 text-[11px] font-medium [&_svg:not([class*='size-'])]:size-3",
        lg: "h-9 gap-2 px-3.5 text-xs font-medium [&_svg:not([class*='size-'])]:size-4",
        icon: "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs":
          "size-6 rounded-md in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-9 [&_svg:not([class*='size-'])]:size-4.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
  loading?: boolean;
  shortcut?: ShortcutParam | undefined;
  /**
   * Tooltip text or control flag.
   * - If string: Displays custom text with shortcut badge.
   * - If true: Automatically generates tooltip with shortcut key.
   * - If false: Disables tooltip even when shortcut is provided.
   * @default true when shortcut is provided, false otherwise
   */
  tooltip?: string | boolean | React.ReactNode | undefined;
}

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  iconStart,
  iconEnd,
  shortcut,
  tooltip,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const resolvedShortcut = shortcut ? resolveShortcut(shortcut) : null;
  const showTooltip = tooltip !== false && (tooltip !== undefined || resolvedShortcut !== null);

  const buttonElement = (
    <ButtonPrimitive
      type={type}
      data-slot="button"
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin size-3.5 shrink-0" />
      ) : (
        iconStart && (
          <span className="inline-flex shrink-0 items-center justify-center">{iconStart}</span>
        )
      )}
      {children}
      {!loading && resolvedShortcut && (
        <Kbd
          className={cn(
            "text-[9px] py-0 px-1 ml-0.5 shrink-0 select-none",
            variant === "default"
              ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
              : "bg-muted text-muted-foreground border-border/80",
          )}
        >
          {resolvedShortcut.symbol}
        </Kbd>
      )}
      {!loading && iconEnd && (
        <span className="inline-flex shrink-0 items-center justify-center">{iconEnd}</span>
      )}
    </ButtonPrimitive>
  );

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger>{buttonElement}</TooltipTrigger>
        <TooltipContent>
          {typeof tooltip === "string" ? (
            <>
              <span>{tooltip}</span>
              {resolvedShortcut && <Kbd>{resolvedShortcut.label}</Kbd>}
            </>
          ) : React.isValidElement(tooltip) ? (
            tooltip
          ) : (
            <>
              <span>
                {typeof children === "string" ? children : resolvedShortcut?.label || "Action"}
              </span>
              {resolvedShortcut && <Kbd>{resolvedShortcut.label}</Kbd>}
            </>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonElement;
}

export { Button, buttonVariants };
