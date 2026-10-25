export const CURRENT_CMS_VERSION = "0.1.0";
export const DEFAULT_DOCKER_TAG = "latest";
export const DEFAULT_CMS_REGISTRY = "ghcr.io/kaan35";

export const PINNED_CORE_DEPENDENCIES: Record<string, string> = {
  "@cms/core": CURRENT_CMS_VERSION,
  "@cms/db": CURRENT_CMS_VERSION,
  "@cms/admin-shell": CURRENT_CMS_VERSION,
  "@cms/client-sdk": CURRENT_CMS_VERSION,
};

export const MANDATORY_PLUGINS = ["plugin-auth", "plugin-system"] as const;
export const OPTIONAL_CONTENT_PLUGINS = [
  "plugin-media",
  "plugin-pages",
  "plugin-blog",
  "plugin-forms",
  "plugin-vault",
  "plugin-mcp",
] as const;

export type PluginSelection = "minimal" | "full" | (string & {});
