export const ALL_PERMISSIONS: Record<string, string[]> = {
  USERS: ["users:read", "users:write"],
  ROLES: ["roles:read", "roles:write"],
  AUTH: ["auth:settings:write", "auth:sessions:revoke_all", "tokens:read", "tokens:write"],
  PAGES: ["pages:read:draft", "pages:write"],
  NAVIGATION: ["navigation:read", "navigation:write"],
  BLOG: ["blog:read:draft", "blog:write"],
  FORMS: ["forms:read", "forms:write"],
  MEDIA: ["media:read", "media:write"],
  VAULT: ["vault:read", "vault:write"],
  MCP: ["mcp:read", "mcp:write"],
  SYSTEM: [
    "system:settings:read",
    "system:settings:write",
    "system:plugins:read",
    "system:plugins:write",
    "system:audit-log:read",
  ],
};

export const ALL_FLAT_PERMISSIONS: string[] = Object.values(ALL_PERMISSIONS).flat();

export const DEFAULT_ROLE_TEMPLATES: Record<string, string[]> = {
  admin: [...ALL_FLAT_PERMISSIONS],
  editor: [
    "pages:read:draft",
    "pages:write",
    "blog:read:draft",
    "blog:write",
    "forms:read",
    "forms:write",
    "media:read",
    "media:write",
  ],
  user: [],
};
