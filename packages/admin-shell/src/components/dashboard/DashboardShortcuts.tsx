"use client";

import { ArrowRight, BookOpen, ClipboardList, FileText, Plug, Settings } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useAuth } from "../../hooks/useAuth";

interface DashboardShortcutsProps {
  isPagesEnabled: boolean;
  isBlogEnabled: boolean;
  isFormsEnabled: boolean;
  isMediaEnabled: boolean;
}

export function DashboardShortcuts({
  isPagesEnabled,
  isBlogEnabled,
  isFormsEnabled,
  isMediaEnabled,
}: DashboardShortcutsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const userPerms = React.useMemo(() => user?.permissions || [], [user?.permissions]);

  const hasPerm = React.useCallback(
    (candidates: string[]) => {
      if (isAdmin) return true;
      return candidates.some((c) => userPerms.includes(c));
    },
    [isAdmin, userPerms],
  );

  const canAccessPages = isPagesEnabled && hasPerm(["pages:read:draft", "pages:write"]);
  const canAccessBlog = isBlogEnabled && hasPerm(["blog:read:draft", "blog:write"]);
  const canAccessForms = isFormsEnabled && hasPerm(["forms:read", "forms:write"]);
  const canAccessMedia = isMediaEnabled && hasPerm(["media:read", "media:write"]);
  const canAccessSettings =
    isAdmin ||
    userPerms.includes("system:settings:write") ||
    userPerms.includes("system:settings:read");

  const hasAnyShortcut =
    canAccessPages || canAccessBlog || canAccessForms || canAccessMedia || canAccessSettings;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Shortcuts</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Quick navigation to key modules</p>
      </div>

      <div className="space-y-2">
        {canAccessPages && (
          <Link
            href="/dashboard/pages"
            className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="size-4 text-blue-500" />
              <span className="text-xs font-medium text-foreground">Pages Manager</span>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        )}

        {canAccessBlog && (
          <Link
            href="/dashboard/blog"
            className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="size-4 text-teal-500" />
              <span className="text-xs font-medium text-foreground">Blog Articles</span>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        )}

        {canAccessForms && (
          <Link
            href="/dashboard/forms"
            className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <ClipboardList className="size-4 text-purple-500" />
              <span className="text-xs font-medium text-foreground">Forms & Leads</span>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        )}

        {canAccessMedia && (
          <Link
            href="/dashboard/media"
            className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Plug className="size-4 text-amber-500" />
              <span className="text-xs font-medium text-foreground">Media Library</span>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        )}

        {canAccessSettings && (
          <Link
            href="/dashboard/settings"
            className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">System Settings</span>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        )}

        {!hasAnyShortcut && (
          <div className="py-6 text-center">
            <p className="text-xs text-muted-foreground">
              No navigation shortcuts available for your account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
