"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import React, { createContext, useContext, useEffect, useState } from "react";

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be wrapped in <Dialog />");
  }
  return context;
}

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function Dialog({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (value: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(value);
    }
    onOpenChange?.(value);
  };

  const generatedId = React.useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-desc`;

  return (
    <DialogContext.Provider value={{ descriptionId, open, setOpen, titleId }}>
      {children}
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps {
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
  asChild?: boolean;
}

export function DialogTrigger({
  children,
  asChild = false,
}: DialogTriggerProps) {
  const { setOpen } = useDialog();

  if (asChild) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e);
        setOpen(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

/**
 * DialogPortal now simply renders its children inline (no createPortal),
 * matching the legacy ConfirmModal structure. This prevents SSR/hydration
 * issues and avoids any double-rendering or useEffect state-setting warnings.
 */
export function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function DialogOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = useDialog();
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] animate-in fade-in duration-150",
        className,
      )}
      onClick={() => setOpen(false)}
      {...props}
    />
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  const { open, setOpen, titleId, descriptionId } = useDialog();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on Escape, lock body scroll when open, focus management
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto focus first focusable element
    if (containerRef.current) {
      const focusable = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) as HTMLElement;
      if (focusable) {
        focusable.focus();
      } else {
        containerRef.current.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <DialogPortal>
      <DialogOverlay />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={cn(
            "relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg pointer-events-auto animate-in fade-in zoom-in-95 duration-150 space-y-4 focus:outline-none",
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </DialogPortal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className,
      )}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2.5 border-t border-border pt-4 mt-4",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialog();
  return (
    <h3
      id={titleId}
      className={cn(
        "text-lg font-semibold text-foreground leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialog();
  return (
    <p
      id={descriptionId}
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
}
