"use client";

import { BookOpen, ClipboardList, FileText, Plus, Shield, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useAuth } from "../../hooks/useAuth";

interface DashboardQuickActionsProps {
  isPagesEnabled: boolean;
  isBlogEnabled: boolean;
  isFormsEnabled: boolean;
  isAuthEnabled: boolean;
}

export function DashboardQuickActions({
  isPagesEnabled,
  isBlogEnabled,
  isFormsEnabled,
  isAuthEnabled,
}: DashboardQuickActionsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const userPerms = React.useMemo(() => user?.permissions || [], [user?.permissions]);

  const canCreatePage = isPagesEnabled && (isAdmin || userPerms.includes("pages:write"));
  const canCreateBlog = isBlogEnabled && (isAdmin || userPerms.includes("blog:write"));
  const canCreateForm = isFormsEnabled && (isAdmin || userPerms.includes("forms:write"));
  const canCreateUser = isAuthEnabled && (isAdmin || userPerms.includes("users:write"));
  const canCreateRole = isAuthEnabled && (isAdmin || userPerms.includes("roles:write"));

  const hasAnyAction =
    canCreatePage || canCreateBlog || canCreateForm || canCreateUser || canCreateRole;

  return (
    <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Jump straight into creating content and managing resources
          </p>
        </div>
      </div>

      {hasAnyAction ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {canCreatePage && (
            <Link
              href="/dashboard/pages/new"
              className="flex flex-col justify-between p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="size-8 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <FileText className="size-4" />
                </div>
                <Plus className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">New Page</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Build a landing page or content layout
                </p>
              </div>
            </Link>
          )}

          {canCreateBlog && (
            <Link
              href="/dashboard/blog/new"
              className="flex flex-col justify-between p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="size-8 flex items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 border border-teal-500/20 group-hover:scale-105 transition-transform">
                  <BookOpen className="size-4" />
                </div>
                <Plus className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">New Blog Post</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Write and publish news or blog articles
                </p>
              </div>
            </Link>
          )}

          {canCreateForm && (
            <Link
              href="/dashboard/forms/new"
              className="flex flex-col justify-between p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="size-8 flex items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 group-hover:scale-105 transition-transform">
                  <ClipboardList className="size-4" />
                </div>
                <Plus className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">New Form</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Create lead capture or contact form
                </p>
              </div>
            </Link>
          )}

          {canCreateUser && (
            <Link
              href="/dashboard/users/new"
              className="flex flex-col justify-between p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="size-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <UserPlus className="size-4" />
                </div>
                <Plus className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">New User</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Add team member with customized role access
                </p>
              </div>
            </Link>
          )}

          {canCreateRole && (
            <Link
              href="/dashboard/roles/new"
              className="flex flex-col justify-between p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="size-8 flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Shield className="size-4" />
                </div>
                <Plus className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">New Role</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Define custom access and permission profiles
                </p>
              </div>
            </Link>
          )}
        </div>
      ) : (
        <div className="py-8 text-center border border-dashed border-border/60 rounded-xl bg-muted/10">
          <p className="text-xs text-muted-foreground">
            No quick action triggers available for your current permission profile.
          </p>
        </div>
      )}
    </div>
  );
}
