"use client";

import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  FileText,
  Plug,
  Plus,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { StatCard } from "../components/StatCard";
import { useApi } from "../hooks/useApi";

export function DashboardHomePage() {
  const { data: statsData } = useApi<{
    pagesCount?: number;
    postsCount?: number;
    formsCount?: number;
    pluginsCount?: number;
    totalPlugins?: number;
    usersCount?: number;
  }>("/api/system/stats");

  const { data: rawPlugins } = useApi<
    | { plugins: Array<{ name: string; enabled: boolean }> }
    | Array<{ name: string; enabled: boolean }>
  >("/api/plugins");

  const plugins = Array.isArray(rawPlugins)
    ? rawPlugins
    : Array.isArray(rawPlugins?.plugins)
      ? rawPlugins.plugins
      : [];

  const disabledPlugins = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of plugins) {
      if (p.enabled === false) {
        set.add(p.name);
      }
    }
    return set;
  }, [plugins]);

  const isPagesEnabled = !disabledPlugins.has("plugin-pages");
  const isBlogEnabled = !disabledPlugins.has("plugin-blog");
  const isFormsEnabled = !disabledPlugins.has("plugin-forms");
  const isMediaEnabled = !disabledPlugins.has("plugin-media");
  const isAuthEnabled = !disabledPlugins.has("plugin-auth");

  const pagesCount = statsData?.pagesCount ?? 0;
  const postsCount = statsData?.postsCount ?? 0;
  const formsCount = statsData?.formsCount ?? 0;
  const pluginsCount = statsData?.pluginsCount ?? (plugins.filter((p) => p.enabled).length || 0);
  const totalPlugins = statsData?.totalPlugins ?? (plugins.length || 0);

  return (
    <div className="space-y-6">
      {/* Top Stat Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isPagesEnabled && (
          <StatCard
            title="PAGES"
            value={pagesCount}
            description="Published site pages"
            icon={FileText}
            iconColor="blue"
          />
        )}
        {isBlogEnabled && (
          <StatCard
            title="BLOG POSTS"
            value={postsCount}
            description="Articles & blog updates"
            icon={BookOpen}
            iconColor="teal"
          />
        )}
        {isFormsEnabled && (
          <StatCard
            title="FORMS"
            value={formsCount}
            description="Active contact & lead forms"
            icon={ClipboardList}
            iconColor="purple"
          />
        )}
        <StatCard
          title="PLUGINS"
          value={`${pluginsCount} / ${totalPlugins}`}
          description="Installed system extensions"
          icon={Plug}
          iconColor="amber"
        />
      </div>

      {/* Grid: Quick Actions & Management Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions (2 Columns) */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isPagesEnabled && (
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

            {isBlogEnabled && (
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

            {isFormsEnabled && (
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

            {isAuthEnabled && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Content & Management Shortcuts (1 Column) */}
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
      </div>
    </div>
  );
}
