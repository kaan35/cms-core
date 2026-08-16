import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
};

function Input({ className, type, iconStart, iconEnd, ...props }: InputProps) {
  if (!iconStart && !iconEnd) {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "flex h-8.5 w-full min-w-0 rounded-lg border border-border/90 bg-muted/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all outline-none hover:border-border hover:bg-muted/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  }

  return (
    <div className="relative flex items-center w-full">
      {iconStart && (
        <span className="absolute left-2.5 flex items-center pointer-events-none text-muted-foreground [&_svg]:size-4">
          {iconStart}
        </span>
      )}
      <input
        type={type}
        data-slot="input"
        className={cn(
          "flex h-8.5 w-full min-w-0 rounded-lg border border-border/90 bg-muted/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all outline-none hover:border-border hover:bg-muted/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
          iconStart && "pl-9",
          iconEnd && "pr-9",
          className,
        )}
        {...props}
      />
      {iconEnd && (
        <span className="absolute right-2.5 flex items-center pointer-events-none text-muted-foreground [&_svg]:size-4">
          {iconEnd}
        </span>
      )}
    </div>
  );
}

export { Input };
