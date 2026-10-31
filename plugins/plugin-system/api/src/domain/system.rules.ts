import {
  IdParamSchema,
  PERMISSIONS,
  SearchPaginationQuerySchema,
  createPaginatedResponseSchema,
  validateWithSchema,
} from "@cms/core";
import { z } from "zod";

export const SYSTEM_PERMISSIONS = {
  PLUGINS_READ: PERMISSIONS.SYSTEM.PLUGINS_READ,
  PLUGINS_WRITE: PERMISSIONS.SYSTEM.PLUGINS_WRITE,
  SETTINGS_READ: PERMISSIONS.SYSTEM.SETTINGS_READ,
  SETTINGS_WRITE: PERMISSIONS.SYSTEM.SETTINGS_WRITE,
  AUDIT_LOG_READ: PERMISSIONS.SYSTEM.AUDIT_LOG_READ,
} as const;

export const PluginNameParamSchema = z.object({
  name: z.string().min(1, "Plugin name is required").max(128),
});
export type PluginNameParam = z.infer<typeof PluginNameParamSchema>;

export const AuditLogQuerySchema = SearchPaginationQuerySchema.extend({
  entity: z.string().trim().max(128).optional(),
  action: z.string().trim().max(128).optional(),
  actorId: z.string().trim().max(128).optional(),
  actorType: z.enum(["user", "agent", "system"]).optional(),
  status: z.enum(["success", "access_denied", "error"]).optional(),
  tokenId: z.string().trim().max(256).optional(),
  toolName: z.string().trim().max(128).optional(),
  event: z.string().trim().max(128).optional(),
  tz: z.string().trim().max(64).optional(),
});
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export { IdParamSchema };
export type IdParam = z.infer<typeof IdParamSchema>;

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type SiteTheme = "dark" | "light" | "system";

export function validateHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color.trim());
}

export function validateTheme(theme: string): boolean {
  return ["dark", "light", "system"].includes(theme.trim().toLowerCase());
}

export interface NavigationMenuItem {
  id: string;
  label: string;
  url: string;
  type?: "page" | "custom" | "blog" | undefined;
  pageId?: string | undefined;
  customLabel?: boolean | undefined;
  external?: boolean | undefined;
  style?: "link" | "button" | undefined;
  badge?: string | undefined;
  icon?: string | undefined;
}

// 1. Zod Ingress Schemas
export const NavigationMenuItemSchema = z.object({
  id: z.string().max(128),
  label: z.string().min(1, "Menu label is required").max(80),
  url: z.string().min(1, "Menu URL is required").max(500),
  type: z.enum(["page", "custom", "blog"]).optional(),
  pageId: z.string().max(128).optional(),
  customLabel: z.boolean().optional(),
  external: z.boolean().optional(),
  style: z.enum(["link", "button"]).optional(),
  badge: z.string().max(30).optional(),
  icon: z.string().max(64).optional(),
});

export const UpdateSettingsSchema = z.object({
  adminTitle: z.string().trim().min(1, "Admin title cannot be empty").max(120).optional(),
  siteTitle: z.string().trim().min(1, "Site title cannot be empty").max(120).optional(),
  siteDescription: z.string().trim().max(500).optional(),
  brandColor: z
    .string()
    .regex(HEX_COLOR_REGEX, "Invalid hex color format (e.g. #3b82f6)")
    .optional(),
  brandFont: z.string().trim().max(80).optional(),
  primaryColor: z.string().regex(HEX_COLOR_REGEX, "Invalid hex color format").optional(),
  fontFamily: z.string().trim().max(80).optional(),
  defaultTheme: z.enum(["dark", "light", "system"]).optional(),
  footerText: z.string().trim().max(500).optional(),
  headerMenu: z.array(NavigationMenuItemSchema).max(30).optional(),
  footerMenu: z.array(NavigationMenuItemSchema).max(30).optional(),
  allowRegistration: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().positive().optional(),
});

export const TogglePluginSchema = z.object({
  enabled: z.boolean(),
});

export const SettingsResponseSchema = z.object({
  settings: UpdateSettingsSchema,
});

export const PluginStateSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  priority: z.number().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
});

export const PluginsListResponseSchema = z.object({
  plugins: z.array(PluginStateSchema),
});

export const TogglePluginResponseSchema = z.object({
  plugin: PluginStateSchema,
});

export const AuditLogItemSchema = z.object({
  id: z.string(),
  event: z.string(),
  actorId: z.string().optional(),
  actorType: z.enum(["user", "agent", "system"]).optional(),
  actorEmail: z.string().optional(),
  tokenId: z.string().optional(),
  tokenName: z.string().optional(),
  toolName: z.string().optional(),
  status: z.enum(["success", "access_denied", "error"]).optional(),
  durationMs: z.number().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

export const AuditLogListResponseSchema = createPaginatedResponseSchema(AuditLogItemSchema);

export const SystemStatsResponseSchema = z.object({
  pages: z.number(),
  posts: z.number(),
  forms: z.number(),
  users: z.number(),
  plugins: z.number(),
});

// Inferred TypeScript Types
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type TogglePluginInput = z.infer<typeof TogglePluginSchema>;

export interface SystemSettingsDoc {
  adminTitle?: string | undefined;
  siteTitle?: string | undefined;
  siteDescription?: string | undefined;
  defaultTheme?: SiteTheme | string | undefined;
  brandColor?: string | undefined;
  primaryColor?: string | undefined;
  brandFont?: string | undefined;
  fontFamily?: string | undefined;
  footerText?: string | undefined;
  headerMenu?: NavigationMenuItem[] | undefined;
  footerMenu?: NavigationMenuItem[] | undefined;
  allowRegistration?: boolean | undefined;
  sessionTimeoutMinutes?: number | undefined;
}

export type SettingsDoc = SystemSettingsDoc;

// Validation Helpers
export function validateUpdateSettings(input: unknown): UpdateSettingsInput {
  return validateWithSchema(UpdateSettingsSchema, input, "Invalid system settings payload");
}

export function validateTogglePlugin(input: unknown): TogglePluginInput {
  return validateWithSchema(TogglePluginSchema, input, "Invalid plugin toggle payload");
}
