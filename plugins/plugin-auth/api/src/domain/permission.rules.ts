import { PERMISSIONS } from "@cms/core";

export const AUTH_PERMISSIONS = {
  USERS_READ: PERMISSIONS.AUTH.USERS_READ,
  USERS_WRITE: PERMISSIONS.AUTH.USERS_WRITE,
  ROLES_READ: PERMISSIONS.AUTH.ROLES_READ,
  ROLES_WRITE: PERMISSIONS.AUTH.ROLES_WRITE,
  AUTH_SETTINGS_WRITE: PERMISSIONS.AUTH.AUTH_SETTINGS_WRITE,
  AUTH_REVOKE_ALL_SESSIONS: PERMISSIONS.AUTH.AUTH_REVOKE_ALL_SESSIONS,
} as const;

export const ADMIN_ROLE_NAME = "admin";

export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: string,
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  if (userPermissions.includes("*")) {
    return true;
  }
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check namespace wildcard e.g. "users:*" matches "users:read"
  const [requiredNamespace] = requiredPermission.split(":");
  if (requiredNamespace && userPermissions.includes(`${requiredNamespace}:*`)) {
    return true;
  }

  return false;
}
