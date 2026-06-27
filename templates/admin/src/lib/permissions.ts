export const PERMISSION_GROUPS: Record<string, string[]> = {
  Pages: ["pages:read", "pages:write", "pages:delete"],
  Blog: ["blog:read", "blog:write", "blog:delete"],
  Forms: ["forms:read", "forms:write", "forms:delete"],
  Users: ["users:read", "users:write", "users:delete"],
  Settings: ["settings:read", "settings:write"],
  Webhooks: ["webhooks:read", "webhooks:write", "webhooks:delete"],
  Backups: ["backups:read", "backups:write"],
};

export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flat();
