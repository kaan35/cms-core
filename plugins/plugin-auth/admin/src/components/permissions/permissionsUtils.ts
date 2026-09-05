import { ALL_FLAT_PERMISSIONS, DEFAULT_ROLE_TEMPLATES } from "../../constants/permissions";

export interface UserDetailResponse {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  permissions?: string[];
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
    permissions?: string[];
  };
}

export function computeInitialPermissions(
  userData: { role?: string; permissions?: string[] } | undefined,
  rolesData: Array<{ id: string; name: string; permissions: string[] }>,
): string[] {
  if (!userData) return [];

  const isSuperAdmin =
    userData.role === "admin" ||
    userData.permissions?.includes("*") ||
    (Array.isArray(userData.permissions) && userData.permissions.includes("*"));

  if (isSuperAdmin) {
    return [...ALL_FLAT_PERMISSIONS];
  }
  if (userData.permissions && userData.permissions.length > 0) {
    return userData.permissions;
  }
  if (userData.role) {
    const matched = rolesData.find((r) => r.name === userData.role);
    if (matched) {
      return matched.permissions.includes("*")
        ? [...ALL_FLAT_PERMISSIONS]
        : [...matched.permissions];
    }
    if (DEFAULT_ROLE_TEMPLATES[userData.role]) {
      return [...(DEFAULT_ROLE_TEMPLATES[userData.role] || [])];
    }
  }
  return [];
}
