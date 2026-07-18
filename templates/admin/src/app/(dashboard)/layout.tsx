"use client";

import { Theme, UserMenu } from "@/components/layout/UserMenu";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Loading } from "@/components/ui/Loading";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { ToastProvider, useToast } from "@/lib/toast";
import {
  BookOpen,
  ClipboardList,
  FileText,
  Flame,
  LayoutDashboard,
  Menu,
  Plug,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ComponentType, Suspense, useEffect, useState } from "react";

interface MenuItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  plugin?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const BREADCRUMB_TITLES: Record<string, string> = {
  blog: "Blog Posts",
  forms: "Forms & Submissions",
  pages: "Pages",
  plugins: "Plugins",
  profile: "My Profile",
  roles: "Role Templates",
  settings: "Settings",
  users: "Users & RBAC",
};

const MENU_GROUPS: MenuGroup[] = [
  {
    items: [{ href: "/", icon: LayoutDashboard, name: "Overview" }],
    title: "",
  },
  {
    items: [
      {
        href: "/pages",
        icon: FileText,
        name: "Pages",
        plugin: "@cms/plugin-pages-api",
      },
      {
        href: "/blog",
        icon: BookOpen,
        name: "Blog Posts",
        plugin: "@cms/plugin-blog-api",
      },
      {
        href: "/forms",
        icon: ClipboardList,
        name: "Forms & Submissions",
        plugin: "@cms/plugin-forms-api",
      },
    ],
    title: "Content",
  },
  {
    items: [
      {
        href: "/users",
        icon: Users,
        name: "Users & RBAC",
        plugin: "@cms/plugin-auth-api",
      },
      {
        href: "/roles",
        icon: Shield,
        name: "Role Templates",
        plugin: "@cms/plugin-auth-api",
      },
    ],
    title: "Administration",
  },
  {
    items: [
      {
        href: "/settings",
        icon: Settings,
        name: "Settings",
        plugin: "@cms/plugin-pages-api",
      },
      {
        href: "/plugins",
        icon: Plug,
        name: "Plugins",
        plugin: "@cms/plugin-system-api",
      },
    ],
    title: "System",
  },
];

/** Small brand mark used in the sidebar, mobile top bar, and login page. */
function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={`rounded-md border border-primary/25 bg-primary/10 flex items-center justify-center text-primary ${
        size === "sm" ? "h-7 w-7" : "h-9 w-9"
      }`.trim()}
    >
      <Flame className={size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} />
    </div>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme | null) ?? "system";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: light)")
        .matches
        ? "light"
        : "dark";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsSidebarOpen(false);
  }

  useEffect(() => {
    if (!isSidebarOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  const { user, isLoading: isAuthLoading, isError } = useAuth();

  const { data: pluginsData } = useApiQuery<{
    plugins: Array<{ name: string; isEnabled: boolean }>;
  }>("/plugins", { enabled: !!user });

  // Logout mutation
  const { trigger: logout } = useApiMutation({
    method: "POST",
    onError: (err: Error) => {
      showToast({ message: err.message || "Logout failed", type: "error" });
    },
    onSuccess: () => {
      router.push("/login");
    },
    path: "/auth/logout",
  });

  if (isError) {
    return null;
  }

  if (isAuthLoading || !user) {
    return (
      <div className="fixed inset-0 flex flex-col md:flex-row text-foreground md:p-4 md:gap-4">
        {/* Mobile top bar skeleton */}
        <div className="md:hidden shrink-0 h-14 flex items-center justify-between px-4 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>

        {/* Sidebar skeleton */}
        <aside className="hidden md:block w-60 bg-background rounded-2xl border border-border h-full p-3">
          <div className="flex items-center gap-2.5 px-2 mb-4">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 min-h-0 bg-background md:rounded-2xl md:border md:border-border flex flex-col overflow-hidden">
          <header className="hidden md:flex h-14 border-b border-border bg-background/60 backdrop-blur-md items-center justify-between px-6 shrink-0">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </header>
          <div className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  const activePlugins: Record<string, boolean> = {};
  if (pluginsData?.plugins) {
    for (const p of pluginsData.plugins) {
      activePlugins[p.name] = p.isEnabled;
    }
  }

  const getBreadcrumbTitle = (path: string) => {
    if (path === "/") return "Overview";
    const segment = path.split("/")[1];
    if (!segment) return "Overview";
    return (
      BREADCRUMB_TITLES[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1)
    );
  };

  const filteredGroups = MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.plugin && activePlugins[item.plugin] !== undefined) {
        return activePlugins[item.plugin];
      }
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row text-foreground md:p-4 md:gap-4">
      {/* Mobile top bar */}
      <div className="md:hidden shrink-0 h-14 flex items-center justify-between px-4 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-semibold tracking-tight text-sm text-foreground">
            Cms Core
          </span>
        </div>

        <div className="flex items-center gap-1">
          <UserMenu
            email={user.email}
            role={user.role}
            theme={theme}
            onThemeChange={setTheme}
            onLogout={logout}
            variant="compact"
          />
          <button
            onClick={() => setIsSidebarOpen((open) => !open)}
            aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={isSidebarOpen}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Backdrop — mobile only */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-[1px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-60 bg-background flex flex-col justify-between fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:relative md:inset-auto md:translate-x-0 md:rounded-2xl md:border md:border-border md:h-full ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`.trim()}
      >
        <div className="min-h-0 overflow-y-auto">
          {/* Brand header */}
          <div className="hidden md:flex h-14 items-center gap-2.5 px-5 border-b border-border">
            <Logo size="sm" />
            <span className="font-semibold tracking-tight text-sm text-foreground">
              Cms Core
            </span>
          </div>

          {/* Nav Items */}
          <nav className="mt-16 md:mt-4 px-3 space-y-5">
            {filteredGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                {group.title && (
                  <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                    {group.title}
                  </h3>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");

                    const linkClasses = `
                      flex items-center gap-3 py-2 px-3 rounded-lg text-sm font-medium cursor-pointer transition duration-150 border
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                      ${
                        isActive
                          ? "bg-accent text-foreground border-border shadow-active"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border-transparent"
                      }
                    `
                      .replace(/\s+/g, " ")
                      .trim();

                    const iconClasses = `h-4 w-4 shrink-0 transition-colors duration-150 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={linkClasses}
                      >
                        <Icon className={iconClasses} />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <div className="p-3 border-t border-border mt-auto shrink-0">
          <UserMenu
            email={user.email}
            role={user.role}
            theme={theme}
            onThemeChange={setTheme}
            onLogout={logout}
            variant="full"
            placement="top-start"
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 bg-background md:rounded-2xl md:border md:border-border flex flex-col overflow-hidden">
        {/* Sticky Desktop Header */}
        <header className="hidden md:flex h-14 border-b border-border bg-background/60 backdrop-blur-md items-center px-6 shrink-0 select-none">
          <Breadcrumb items={[{ label: getBreadcrumbTitle(pathname) }]} />
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <Suspense fallback={<Loading />}>
        <DashboardContent>{children}</DashboardContent>
      </Suspense>
    </ToastProvider>
  );
}
