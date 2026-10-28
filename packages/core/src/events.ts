export const EVENTS = {
  AUTH: {
    USER_CREATED: "user.created",
    USER_UPDATED: "user.updated",
    USER_DELETED: "user.deleted",
    ROLE_CREATED: "role.created",
    ROLE_UPDATED: "role.updated",
    ROLE_DELETED: "role.deleted",
    SESSION_REFRESHED: "auth.session.refreshed",
    SESSION_REVOKED: "auth.session.revoked",
    USER_SUSPENDED: "auth.user.suspended",
    USER_ACTIVATED: "auth.user.activated",
  },
  SYSTEM: {
    PLUGIN_TOGGLED: "plugin.toggled",
    SETTINGS_UPDATED: "settings.updated",
  },
  MEDIA: {
    FILE_UPLOADED: "media.uploaded",
    FILE_DELETED: "media.deleted",
  },
  PAGE: {
    CREATED: "page.created",
    UPDATED: "page.updated",
    DELETED: "page.deleted",
  },
  BLOG: {
    CREATED: "blog.created",
    UPDATED: "blog.updated",
    DELETED: "blog.deleted",
  },
  FORMS: {
    SUBMITTED: "forms.submitted",
    CREATED: "forms.created",
    UPDATED: "forms.updated",
    DELETED: "forms.deleted",
  },
  VAULT: {
    CREATED: "vault.item.created",
    UPDATED: "vault.item.updated",
    DELETED: "vault.item.deleted",
    REVEALED: "vault.secret.revealed",
  },
  MCP: {
    TOOL_EXECUTED: "mcp.tool_executed",
  },
} as const;

export type EventKey =
  | (typeof EVENTS.AUTH)[keyof typeof EVENTS.AUTH]
  | (typeof EVENTS.SYSTEM)[keyof typeof EVENTS.SYSTEM]
  | (typeof EVENTS.MEDIA)[keyof typeof EVENTS.MEDIA]
  | (typeof EVENTS.PAGE)[keyof typeof EVENTS.PAGE]
  | (typeof EVENTS.BLOG)[keyof typeof EVENTS.BLOG]
  | (typeof EVENTS.FORMS)[keyof typeof EVENTS.FORMS]
  | (typeof EVENTS.VAULT)[keyof typeof EVENTS.VAULT]
  | (typeof EVENTS.MCP)[keyof typeof EVENTS.MCP];
