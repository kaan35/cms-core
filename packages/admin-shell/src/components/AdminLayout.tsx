"use client";

import { ChevronRight, Home, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useAuth, type AuthUser } from "../hooks/useAuth";
import { AuthProvider } from "./AuthProvider";
import { Sidebar, type NavSection } from "./Sidebar";
import { Skeleton } from "./ui/skeleton";

export interface AdminLayoutProps {
  initialUser?: AuthUser | null | undefined;
  navSections?: NavSection[] | undefined;
  children: React.ReactNode;
}

export function AdminLayout({ initialUser, navSections, children }: AdminLayoutProps) {
  const content = <AdminLayoutInner navSections={navSections}>{children}</AdminLayoutInner>;

  if (initialUser) {
    return <AuthProvider initialUser={initialUser}>{content}</AuthProvider>;
  }

  return content;
}

function AdminLayoutInner({
  navSections,
  children,
}: {
  navSections?: NavSection[] | undefined;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Generate clean breadcrumbs from path
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const url = "/" + pathSegments.slice(0, index + 1).join("/");
    const prevSegment = index > 0 ? pathSegments[index - 1] : "";
    let label = segment.charAt(0).toUpperCase() + segment.slice(1);

    if (segment === "dashboard") label = "Overview";
    else if (segment === "users") label = "Users & RBAC";
    else if (segment === "roles") label = "Role Templates";
    else if (segment === "account") label = "My Account";
    else if (segment === "sessions") label = "Active Sessions";
    else if (segment === "forms") label = "Forms";
    else if (segment === "submissions") label = "Submissions";
    else if (segment === "blog") label = "Blog Posts";
    else if (segment === "pages") label = "Pages";
    else if (segment === "navigation") label = "Navigation Menu";
    else if (segment === "settings") label = "Settings";
    else if (segment === "plugins") label = "Plugins";
    else if (segment === "media") label = "Media Library";
    else if (segment === "audit-log") label = "Audit Log";
    else if (segment === "new") {
      if (prevSegment === "users") label = "New User";
      else if (prevSegment === "roles") label = "New Role";
      else if (prevSegment === "blog") label = "New Post";
      else if (prevSegment === "pages") label = "New Page";
      else if (prevSegment === "forms") label = "New Form";
      else label = "Create New";
    } else if (/^[0-9a-fA-F-]{20,}$/.test(segment) || /^[0-9]+$/.test(segment)) {
      if (prevSegment === "users") label = "User Details";
      else if (prevSegment === "roles") label = "Role Details";
      else if (prevSegment === "blog") label = "Edit Post";
      else if (prevSegment === "pages") label = "Edit Page";
      else if (prevSegment === "forms") label = "Form Builder";
      else label = "Details";
    }

    return { url, label, isLast: index === pathSegments.length - 1 };
  });

  return (
    <div className="flex h-screen w-screen p-2 md:p-3 gap-2 md:gap-3 bg-background text-foreground overflow-hidden">
      {/* Desktop Persistent Sidebar */}
      <Sidebar className="hidden md:flex h-full" sections={navSections} />

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 h-full flex-col bg-sidebar p-3 border-r border-border shadow-2xl">
            <Sidebar className="h-full w-full border-0 shadow-none p-0" sections={navSections} />
          </div>
        </div>
      )}

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full rounded-xl md:rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {/* Top Header Bar */}
        <header className="h-12 shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-border/60 bg-card/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
            >
              <Menu className="size-4" />
            </button>

            {/* Central Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link
                href="/dashboard"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Home className="size-3.5" />
              </Link>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.url}>
                  <ChevronRight className="size-3 shrink-0 opacity-40" />
                  {crumb.isLast ? (
                    <span className="font-semibold text-foreground">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.url} className="hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
        </header>

        {/* Scrollable Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl w-full mx-auto">
            {isLoading ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-48 rounded-lg" />
                    <Skeleton className="h-4 w-72 rounded-md" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Skeleton className="h-28 rounded-xl" />
                  <Skeleton className="h-28 rounded-xl" />
                  <Skeleton className="h-28 rounded-xl" />
                  <Skeleton className="h-28 rounded-xl" />
                </div>
                <Skeleton className="h-64 rounded-xl" />
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
