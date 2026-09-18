"use client";

import { BookOpen, ClipboardList, FileText, Plug, Users } from "lucide-react";
import * as React from "react";
import { DashboardQuickActions } from "../components/dashboard/DashboardQuickActions";
import { DashboardShortcuts } from "../components/dashboard/DashboardShortcuts";
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

  const activePlugins = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of plugins) {
      if (p.enabled !== false) {
        set.add(p.name);
      }
    }
    return set;
  }, [plugins]);

  const isPagesEnabled = activePlugins.has("plugin-pages");
  const isBlogEnabled = activePlugins.has("plugin-blog");
  const isFormsEnabled = activePlugins.has("plugin-forms");
  const isMediaEnabled = activePlugins.has("plugin-media");
  const isAuthEnabled = activePlugins.has("plugin-auth");

  const pagesCount = statsData?.pagesCount ?? 0;
  const postsCount = statsData?.postsCount ?? 0;
  const formsCount = statsData?.formsCount ?? 0;
  const usersCount = statsData?.usersCount ?? 0;
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
        {isAuthEnabled && (
          <StatCard
            title="USERS"
            value={usersCount}
            description="Active accounts & roles"
            icon={Users}
            iconColor="teal"
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
        <DashboardQuickActions
          isPagesEnabled={isPagesEnabled}
          isBlogEnabled={isBlogEnabled}
          isFormsEnabled={isFormsEnabled}
          isAuthEnabled={isAuthEnabled}
        />
        <DashboardShortcuts
          isPagesEnabled={isPagesEnabled}
          isBlogEnabled={isBlogEnabled}
          isFormsEnabled={isFormsEnabled}
          isMediaEnabled={isMediaEnabled}
        />
      </div>
    </div>
  );
}
