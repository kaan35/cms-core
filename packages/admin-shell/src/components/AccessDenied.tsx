"use client";

import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

export interface AccessDeniedProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function AccessDenied({
  title = "Access Denied",
  description = "You do not have the required permissions to access this page or resource. Please contact your system administrator if you believe this is an error.",
  backHref = "/dashboard",
  backLabel = "Back to Overview",
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center animate-in fade-in duration-300">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mb-4 shadow-2xs">
        <ShieldAlert className="size-7" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-[11px] font-semibold text-destructive uppercase tracking-wider mb-2">
        403 Forbidden
      </div>

      <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>

      <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="outline" size="sm" iconStart={<ArrowLeft className="size-4" />}>
            {backLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
