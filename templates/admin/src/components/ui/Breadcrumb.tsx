import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import React from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

/**
 *
 * @example
 * <Breadcrumb items={[{ label: "Blog Posts", href: "/blog" }, { label: post.title }]} />
 */
export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      <Link
        href="/"
        className="flex items-center hover:text-foreground transition duration-150"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition duration-150 truncate max-w-48"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-foreground font-semibold truncate max-w-64"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
