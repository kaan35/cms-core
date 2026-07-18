export const PERMISSION_GROUPS: Record<string, string[]> = {
  Backups: ["backups:read", "backups:write"],
  Blog: ["blog:read", "blog:read:draft", "blog:write", "blog:delete"],
  Forms: ["forms:read", "forms:write", "forms:delete"],
  Pages: ["pages:read", "pages:write", "pages:delete"],
  Settings: ["settings:read", "settings:write"],
  Users: ["users:read", "users:write", "users:delete"],
  Webhooks: ["webhooks:read", "webhooks:write", "webhooks:delete"],
};

export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flat();
