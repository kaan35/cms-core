export const PERMISSIONS = {
  AUTH: {
    AUTH_SETTINGS_WRITE: "auth:settings:write",
    USERS_READ: "users:read",
    USERS_WRITE: "users:write",
    ROLES_READ: "roles:read",
    ROLES_WRITE: "roles:write",
    AUTH_REVOKE_ALL_SESSIONS: "auth:sessions:revoke_all",
    TOKENS_READ: "tokens:read",
    TOKENS_WRITE: "tokens:write",
  },
  USERS: {
    READ: "users:read",
    WRITE: "users:write",
  },
  ROLES: {
    READ: "roles:read",
    WRITE: "roles:write",
  },
  SYSTEM: {
    PLUGINS_READ: "system:plugins:read",
    PLUGINS_WRITE: "system:plugins:write",
    SETTINGS_READ: "system:settings:read",
    SETTINGS_WRITE: "system:settings:write",
    AUDIT_LOG_READ: "system:audit-log:read",
  },
  MEDIA: {
    READ: "media:read",
    WRITE: "media:write",
  },
  PAGES: {
    READ: "pages:read",
    READ_DRAFT: "pages:read:draft",
    WRITE: "pages:write",
  },
  NAVIGATION: {
    READ: "navigation:read",
    WRITE: "navigation:write",
  },
  BLOG: {
    READ: "blog:read",
    READ_DRAFT: "blog:read:draft",
    WRITE: "blog:write",
  },
  FORMS: {
    READ: "forms:read",
    WRITE: "forms:write",
  },
  VAULT: {
    READ: "vault:read",
    WRITE: "vault:write",
  },
  MCP: {
    READ: "mcp:read",
    WRITE: "mcp:write",
  },
} as const;

export type PermissionKey =
  | (typeof PERMISSIONS.AUTH)[keyof typeof PERMISSIONS.AUTH]
  | (typeof PERMISSIONS.USERS)[keyof typeof PERMISSIONS.USERS]
  | (typeof PERMISSIONS.ROLES)[keyof typeof PERMISSIONS.ROLES]
  | (typeof PERMISSIONS.SYSTEM)[keyof typeof PERMISSIONS.SYSTEM]
  | (typeof PERMISSIONS.MEDIA)[keyof typeof PERMISSIONS.MEDIA]
  | (typeof PERMISSIONS.PAGES)[keyof typeof PERMISSIONS.PAGES]
  | (typeof PERMISSIONS.NAVIGATION)[keyof typeof PERMISSIONS.NAVIGATION]
  | (typeof PERMISSIONS.BLOG)[keyof typeof PERMISSIONS.BLOG]
  | (typeof PERMISSIONS.FORMS)[keyof typeof PERMISSIONS.FORMS]
  | (typeof PERMISSIONS.VAULT)[keyof typeof PERMISSIONS.VAULT]
  | (typeof PERMISSIONS.MCP)[keyof typeof PERMISSIONS.MCP];
