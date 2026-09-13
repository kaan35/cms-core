"use client";

import { ArrowLeft, Plug } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useApi } from "../hooks/useApi";
import { Skeleton } from "./ui/skeleton";

export interface PluginGuardProps {
  pluginId: string;
  moduleName?: string;
  children: React.ReactNode;
}

export function PluginGuard({ pluginId, moduleName, children }: PluginGuardProps) {
  const { data: rawPlugins, isLoading } = useApi<
    | { plugins: Array<{ name: string; enabled: boolean }> }
    | Array<{ name: string; enabled: boolean }>
  >("/api/plugins");

  const plugins = Array.isArray(rawPlugins)
    ? rawPlugins
    : Array.isArray(rawPlugins?.plugins)
      ? rawPlugins.plugins
      : [];

  const isEnabled = React.useMemo(() => {
    return plugins.some((p) => p.name === pluginId && p.enabled !== false);
  }, [plugins, pluginId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!isEnabled) {
    const displayName = moduleName ?? pluginId.replace(/^plugin-/, "").toUpperCase();
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4">
        <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xs">
          <Plug className="size-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {displayName} Module Not Active
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            This project was scaffolded without the{" "}
            <code className="text-primary font-mono">{pluginId}</code> extension. Its routes and
            database models are not available.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-2xs"
        >
          <ArrowLeft className="size-3.5" />
          Back to Overview
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
