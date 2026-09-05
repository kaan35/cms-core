export const PERMISSIONS = {
  AUTH: {
    AUTH_SETTINGS_WRITE: "auth:settings:write",
    USERS_READ: "users:read",
    USERS_WRITE: "users:write",
    ROLES_READ: "roles:read",
    ROLES_WRITE: "roles:write",
    AUTH_REVOKE_ALL_SESSIONS: "auth:sessions:revoke_all",
  },
  SYSTEM: {
    PLUGINS_READ: "system:plugins:read",
    PLUGINS_WRITE: "system:plugins:write",
    SETTINGS_READ: "system:settings:read",
    SETTINGS_WRITE: "system:settings:write",
    FEATURE_FLAGS_READ: "system:feature-flags:read",
    FEATURE_FLAGS_WRITE: "system:feature-flags:write",
    AUDIT_LOG_READ: "system:audit-log:read",
  },
  MEDIA: {
    READ: "media:read",
    WRITE: "media:write",
  },
  PAGES: {
    READ_DRAFT: "pages:read:draft",
    WRITE: "pages:write",
  },
  BLOG: {
    READ_DRAFT: "blog:read:draft",
    WRITE: "blog:write",
  },
  FORMS: {
    READ: "forms:read",
    WRITE: "forms:write",
  },
} as const;

export type PermissionKey =
  | (typeof PERMISSIONS.AUTH)[keyof typeof PERMISSIONS.AUTH]
  | (typeof PERMISSIONS.SYSTEM)[keyof typeof PERMISSIONS.SYSTEM]
  | (typeof PERMISSIONS.MEDIA)[keyof typeof PERMISSIONS.MEDIA]
  | (typeof PERMISSIONS.PAGES)[keyof typeof PERMISSIONS.PAGES]
  | (typeof PERMISSIONS.BLOG)[keyof typeof PERMISSIONS.BLOG]
  | (typeof PERMISSIONS.FORMS)[keyof typeof PERMISSIONS.FORMS];
