export const EVENTS = {
  AUTH: {
    USER_CREATED: "user.created",
    USER_UPDATED: "user.updated",
    USER_DELETED: "user.deleted",
    ROLE_CREATED: "role.created",
    ROLE_UPDATED: "role.updated",
    ROLE_DELETED: "role.deleted",
    SESSION_REVOKED: "session.revoked",
  },
  SYSTEM: {
    PLUGIN_TOGGLED: "plugin.toggled",
    SETTINGS_UPDATED: "settings.updated",
    FEATURE_FLAG_CREATED: "feature-flag.created",
    FEATURE_FLAG_UPDATED: "feature-flag.updated",
    FEATURE_FLAG_DELETED: "feature-flag.deleted",
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
} as const;

export type EventKey =
  | (typeof EVENTS.AUTH)[keyof typeof EVENTS.AUTH]
  | (typeof EVENTS.SYSTEM)[keyof typeof EVENTS.SYSTEM]
  | (typeof EVENTS.MEDIA)[keyof typeof EVENTS.MEDIA]
  | (typeof EVENTS.PAGE)[keyof typeof EVENTS.PAGE]
  | (typeof EVENTS.BLOG)[keyof typeof EVENTS.BLOG]
  | (typeof EVENTS.FORMS)[keyof typeof EVENTS.FORMS];
