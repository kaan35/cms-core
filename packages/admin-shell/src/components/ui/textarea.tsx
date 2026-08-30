import * as React from "react";
import { cn } from "../../lib/utils";

export type TextareaProps = React.ComponentProps<"textarea">;

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex w-full min-w-0 rounded-xl border border-border/90 bg-muted/40 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors outline-none hover:border-border hover:bg-muted/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
