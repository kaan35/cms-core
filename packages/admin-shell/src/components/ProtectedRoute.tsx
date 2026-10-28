"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { Skeleton } from "./ui/skeleton";
import { AccessDenied } from "./AccessDenied";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Admin role bypasses granular permission checks
  const isAdmin = user.role === "admin";

  let hasRoleAccess = true;
  if (requiredRole && !isAdmin) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    hasRoleAccess = roles.includes(user.role);
  }

  let hasPermissionAccess = true;
  if (requiredPermission && !isAdmin) {
    const permissions = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];
    const userPerms = user.permissions || [];
    hasPermissionAccess = permissions.some((p) => userPerms.includes(p));
  }

  if (!hasRoleAccess || !hasPermissionAccess) {
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  return <>{children}</>;
}
