"use client";

import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { ToastProvider, useToast } from "@/lib/toast";
import {
  BookOpen,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Plug,
  Settings,
  Shield,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  // Auth check — 401 handled in apiFetch (redirects to /login automatically)
  const {
    data: authData,
    error: authError,
    isLoading: isAuthLoading,
  } = useApiQuery<{ user: { id: string; email: string; role: string } }>("/auth/me");

  // Plugins list — revalidateOnFocus keeps the sidebar in sync automatically
  const { data: pluginsData } = useApiQuery<{
    plugins: Array<{ name: string; isEnabled: boolean }>;
  }>("/plugins", { enabled: !!authData });

  // Logout mutation
  const { trigger: logout } = useApiMutation({
    path: "/auth/logout",
    method: "POST",
    onSuccess: () => {
      router.push("/login");
    },
    onError: (err: Error) => {
      showToast({ message: err.message || "Logout failed", type: "error" });
    },
  });

  // Redirect to login if auth fails
  useEffect(() => {
    if (authError) {
      router.push("/login");
    }
  }, [authError, router]);

  const handleLogout = async () => {
    await logout();
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loading text="Verifying session..." />
      </div>
    );
  }

  // Build active plugin state map from SWR data
  const activePlugins: Record<string, boolean> = {};
  if (pluginsData?.plugins) {
    for (const p of pluginsData.plugins) {
      activePlugins[p.name] = p.isEnabled;
    }
  }

  const user = authData?.user;

  const menuItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Pages", href: "/pages", icon: FileText, plugin: "@cms/plugin-pages-api" },
    { name: "Blog Posts", href: "/blog", icon: BookOpen, plugin: "@cms/plugin-blog-api" },
    {
      name: "Forms & Submissions",
      href: "/forms",
      icon: ClipboardList,
      plugin: "@cms/plugin-forms-api",
    },
    { name: "Users & RBAC", href: "/users", icon: Users, plugin: "@cms/plugin-auth-api" },
    { name: "Role Templates", href: "/roles", icon: Shield, plugin: "@cms/plugin-auth-api" },
    { name: "Settings", href: "/settings", icon: Settings, plugin: "@cms/plugin-pages-api" },
    { name: "Plugins", href: "/plugins", icon: Plug, plugin: "@cms/plugin-system-api" },
  ].filter((item) => {
    if (item.plugin && activePlugins[item.plugin] !== undefined) {
      return activePlugins[item.plugin];
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-zinc-900/50 backdrop-blur-md flex flex-col justify-between">
        <div>
          {/* Brand header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight text-lg">Antigravity</span>
          </div>

          {/* Nav Items */}
          <nav className="mt-6 px-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition duration-150 ${
                    isActive
                      ? "border border-blue-500/20 bg-blue-600/20 hover:bg-blue-600/50 text-white shadow-lg shadow-blue-600/10"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-white/5 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center">
                <User className="h-4 w-4 text-zinc-300" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate">{user.email}</p>
                <p className="text-[10px] text-zinc-500 capitalize">{user.role}</p>
              </div>
            </div>
          )}
          <Button
            variant="danger"
            onClick={handleLogout}
            className="w-full justify-start"
            icon={LogOut}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 p-8 max-w-6xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DashboardContent>{children}</DashboardContent>
    </ToastProvider>
  );
}
