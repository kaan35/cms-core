"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";

interface SelectContextType {
  labels: Record<string, string>;
  registerLabel: (value: string, label: string) => void;
}

const SelectContext = React.createContext<SelectContextType>({
  labels: {},
  registerLabel: () => {},
});

function Select<Value = unknown>({ children, ...props }: SelectPrimitive.Root.Props<Value>) {
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const registerLabel = React.useCallback((val: string, label: string) => {
    setLabels((prev) => (prev[val] === label ? prev : { ...prev, [val]: label }));
  }, []);

  return (
    <SelectContext.Provider value={{ labels, registerLabel }}>
      <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
    </SelectContext.Provider>
  );
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  );
}

function SelectValue({ className, children, placeholder, ...props }: SelectPrimitive.Value.Props) {
  const { labels } = React.useContext(SelectContext);

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex-1 text-left truncate text-xs", className)}
      placeholder={placeholder}
      {...props}
    >
      {typeof children === "function"
        ? children
        : (val: unknown) => {
            if (children && typeof children !== "function") return children;
            if (typeof val === "string" && labels[val]) return labels[val];
            if (typeof val === "string" && val) {
              return val.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            }
            return placeholder || "";
          }}
    </SelectPrimitive.Value>
  );
}

function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-8 w-full min-w-[140px] items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1 text-xs text-foreground shadow-2xs outline-none select-none cursor-pointer transition-colors hover:bg-muted/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="shrink-0 opacity-60">
        <ChevronDownIcon className="size-3.5" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "relative isolate z-50 min-w-[9rem] max-h-72 overflow-y-auto rounded-xl border border-border/80 bg-card p-1 text-card-foreground shadow-2xl outline-none backdrop-blur-md animate-in fade-in-0 zoom-in-95",
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List className="space-y-0.5">{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1 text-[11px] font-semibold text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({ className, children, label, value, ...props }: SelectPrimitive.Item.Props) {
  const { registerLabel } = React.useContext(SelectContext);
  const itemLabel = typeof children === "string" ? children : label;

  React.useEffect(() => {
    if (value !== undefined && itemLabel) {
      registerLabel(String(value), itemLabel);
    }
  }, [value, itemLabel, registerLabel]);

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      value={value}
      label={itemLabel}
      className={cn(
        "relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs outline-none select-none transition-colors hover:bg-muted hover:text-foreground data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 truncate">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="shrink-0 flex items-center justify-center">
        <CheckIcon className="size-3.5 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
