"use client";

import {
  BookOpen,
  ClipboardList,
  Compass,
  FileText,
  Flame,
  Image as ImageIcon,
  LayoutDashboard,
  Plug,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useApi } from "../hooks/useApi";
import { cn } from "../lib/utils";
import { UserMenu } from "./UserMenu";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  pluginId?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const defaultNavSections: NavSection[] = [
  {
    items: [{ name: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "CONTENT",
    items: [
      { name: "Pages", href: "/dashboard/pages", icon: FileText, pluginId: "plugin-pages" },
      { name: "Blog Posts", href: "/dashboard/blog", icon: BookOpen, pluginId: "plugin-blog" },
      {
        name: "Navigation",
        href: "/dashboard/navigation",
        icon: Compass,
        pluginId: "plugin-system",
      },
      {
        name: "Media Library",
        href: "/dashboard/media",
        icon: ImageIcon,
        pluginId: "plugin-media",
      },
      {
        name: "Forms & Submissions",
        href: "/dashboard/forms",
        icon: ClipboardList,
        pluginId: "plugin-forms",
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { name: "Users & RBAC", href: "/dashboard/users", icon: Users, pluginId: "plugin-auth" },
      { name: "Role Templates", href: "/dashboard/roles", icon: Shield, pluginId: "plugin-auth" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings, pluginId: "plugin-system" },
      { name: "Plugins", href: "/dashboard/plugins", icon: Plug, pluginId: "plugin-system" },
    ],
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

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

  const visibleSections = React.useMemo(() => {
    return defaultNavSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.pluginId || !disabledPlugins.has(item.pluginId),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [disabledPlugins]);

  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <aside
      className={cn(
        "flex flex-col w-64 shrink-0 rounded-2xl border border-border/80 bg-sidebar text-sidebar-foreground shadow-xs p-3 select-none",
        className,
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 mb-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Flame className="size-4 fill-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight text-foreground">Cms Core</span>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 py-1">
        {visibleSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && (
              <p className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all group",
                      active
                        ? "bg-sidebar-accent text-foreground font-semibold shadow-2xs border border-sidebar-border"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom User Profile */}
      <div className="pt-2 mt-auto border-t border-border/60">
        <UserMenu />
      </div>
    </aside>
  );
}
