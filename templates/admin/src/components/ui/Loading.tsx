import { cn, cva, type VariantProps } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import React from "react";

const spinnerSizes = cva("animate-spin text-primary", {
  defaultVariants: { size: "md" },
  variants: {
    size: {
      lg: "h-12 w-12",
      md: "h-8 w-8",
      sm: "h-4 w-4",
    },
  },
});

export interface LoadingProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerSizes> {
  text?: string;
  isFullScreen?: boolean;
}

export function Loading({
  size = "md",
  text,
  isFullScreen = false,
  className,
  ...props
}: LoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        isFullScreen && "h-64",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={text ?? "Loading"}
      {...props}
    >
      <Loader2 className={spinnerSizes({ size })} aria-hidden="true" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
