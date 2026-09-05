"use client";

import { ArrowRight, BookOpen, ClipboardList, FileText, Plug, Settings } from "lucide-react";
import Link from "next/link";

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
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Shortcuts</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Quick navigation to key modules</p>
      </div>

      <div className="space-y-2">
        {isPagesEnabled && (
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

        {isBlogEnabled && (
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

        {isFormsEnabled && (
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

        {isMediaEnabled && (
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
      </div>
    </div>
  );
}
