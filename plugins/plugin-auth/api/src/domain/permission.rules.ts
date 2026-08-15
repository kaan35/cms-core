export const AUTH_PERMISSIONS = {
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  ROLES_READ: "roles:read",
  ROLES_WRITE: "roles:write",
  AUTH_SETTINGS_WRITE: "auth:settings:write",
  AUTH_REVOKE_ALL_SESSIONS: "auth:revoke-all-sessions",
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
