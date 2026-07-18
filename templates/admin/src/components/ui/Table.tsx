import { cn } from "@/lib/utils";
import React from "react";

export function Table({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table
          className={cn("w-full text-left border-collapse text-sm", className)}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "border-b border-border text-xs tracking-wide text-muted-foreground font-normal bg-muted/40",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border", className)} {...props} />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "hover:bg-accent/40 transition-colors duration-100",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 px-5 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  isHeader?: boolean;
}

export function TableCell({
  className,
  isHeader = false,
  ...props
}: TableCellProps) {
  if (isHeader) {
    return (
      <th
        className={cn(
          "px-5 py-3 text-left align-middle font-medium text-muted-foreground text-xs",
          className,
        )}
        {...(props as React.ThHTMLAttributes<HTMLTableCellElement>)}
      />
    );
  }
  return (
    <td
      className={cn(
        "px-5 py-4 text-sm text-foreground/80 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}
